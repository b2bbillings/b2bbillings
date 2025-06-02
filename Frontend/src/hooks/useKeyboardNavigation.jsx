import { useEffect, useRef } from 'react';

/**
 * Hook for keyboard navigation between form elements
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether keyboard navigation is enabled
 * @param {Array<React.RefObject>} options.refs - Array of refs to navigate between
 * @param {boolean} options.loop - Whether to loop back to the first element after the last
 * @param {Object} options.shortcuts - Custom keyboard shortcuts
 * @returns {Object} - Methods for keyboard navigation
 */
const useKeyboardNavigation = ({ 
  enabled = true, 
  refs = [], 
  loop = true,
  shortcuts = {},
  onEscape = null,
  onEnter = null,
  onTab = null
}) => {
  // Keep track of current focused index
  const currentIndex = useRef(-1);
  
  // Focus a specific element by index
  const focusElementByIndex = (index) => {
    if (!refs || refs.length === 0) return;
    
    // If index is out of bounds and looping is enabled, wrap around
    if (index < 0) {
      index = loop ? refs.length - 1 : 0;
    } else if (index >= refs.length) {
      index = loop ? 0 : refs.length - 1;
    }
    
    // Update current index and focus the element
    currentIndex.current = index;
    const currentRef = refs[index];
    
    if (currentRef && currentRef.current) {
      currentRef.current.focus();
      
      // Optionally select all text if it's an input element
      if (currentRef.current.tagName === 'INPUT' && 
          (currentRef.current.type === 'text' || 
           currentRef.current.type === 'number' || 
           currentRef.current.type === 'email')) {
        currentRef.current.select();
      }
    }
  };
  
  // Move to next element
  const focusNext = () => {
    focusElementByIndex(currentIndex.current + 1);
  };
  
  // Move to previous element
  const focusPrev = () => {
    focusElementByIndex(currentIndex.current - 1);
  };
  
  // Focus first element
  const focusFirst = () => {
    focusElementByIndex(0);
  };
  
  // Focus last element
  const focusLast = () => {
    focusElementByIndex(refs.length - 1);
  };
  
  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (e) => {
      // Skip if event target is a textarea
      if (e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Process custom shortcuts first
      for (const [key, handler] of Object.entries(shortcuts)) {
        const keyCombo = key.split('+');
        const mainKey = keyCombo.pop().toLowerCase();
        
        const ctrlRequired = keyCombo.includes('ctrl');
        const shiftRequired = keyCombo.includes('shift');
        const altRequired = keyCombo.includes('alt');
        
        if (e.key.toLowerCase() === mainKey &&
            e.ctrlKey === ctrlRequired &&
            e.shiftKey === shiftRequired &&
            e.altKey === altRequired) {
          e.preventDefault();
          handler(e);
          return;
        }
      }
      
      // Handle navigation keys
      switch (e.key) {
        case 'ArrowDown':
          if (e.altKey) {
            e.preventDefault();
            focusNext();
          }
          break;
          
        case 'ArrowUp':
          if (e.altKey) {
            e.preventDefault();
            focusPrev();
          }
          break;
          
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            focusFirst();
          }
          break;
          
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            focusLast();
          }
          break;
          
        case 'Enter':
          if (onEnter) {
            // Allow form submissions, don't interfere with standard Enter behavior
            const isSubmitButton = e.target.type === 'submit' || 
                                  e.target.tagName === 'BUTTON' || 
                                  e.target.getAttribute('role') === 'button';
            if (!isSubmitButton) {
              onEnter(e);
            }
          }
          break;
          
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape(e);
          }
          break;
          
        case 'Tab':
          if (onTab) {
            // Don't prevent default for Tab, as it's standard behavior
            onTab(e);
          }
          break;
          
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, refs, loop, shortcuts, onEscape, onEnter, onTab]);
  
  return {
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    focusElementByIndex
  };
};

export default useKeyboardNavigation;