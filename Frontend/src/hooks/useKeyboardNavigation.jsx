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
      // Check if event and key exist
      if (!e || !e.key) {
        return;
      }

      // Skip if event target is a textarea
      if (e.target && e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Process custom shortcuts first
      if (shortcuts && typeof shortcuts === 'object') {
        for (const [key, handler] of Object.entries(shortcuts)) {
          if (typeof key !== 'string' || typeof handler !== 'function') {
            continue;
          }

          const keyCombo = key.split('+').map(k => k.trim());
          const mainKey = keyCombo.pop()?.toLowerCase();

          if (!mainKey) continue;

          const ctrlRequired = keyCombo.includes('ctrl') || keyCombo.includes('Ctrl');
          const shiftRequired = keyCombo.includes('shift') || keyCombo.includes('Shift');
          const altRequired = keyCombo.includes('alt') || keyCombo.includes('Alt');

          const eventKey = e.key?.toLowerCase();

          if (eventKey === mainKey &&
            !!e.ctrlKey === ctrlRequired &&
            !!e.shiftKey === shiftRequired &&
            !!e.altKey === altRequired) {
            e.preventDefault();
            try {
              handler(e);
            } catch (error) {
              console.error('Error executing keyboard shortcut handler:', error);
            }
            return;
          }
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
          if (onEnter && typeof onEnter === 'function') {
            // Allow form submissions, don't interfere with standard Enter behavior
            const isSubmitButton = e.target && (
              e.target.type === 'submit' ||
              e.target.tagName === 'BUTTON' ||
              e.target.getAttribute('role') === 'button'
            );
            if (!isSubmitButton) {
              try {
                onEnter(e);
              } catch (error) {
                console.error('Error executing onEnter handler:', error);
              }
            }
          }
          break;

        case 'Escape':
          if (onEscape && typeof onEscape === 'function') {
            e.preventDefault();
            try {
              onEscape(e);
            } catch (error) {
              console.error('Error executing onEscape handler:', error);
            }
          }
          break;

        case 'Tab':
          if (onTab && typeof onTab === 'function') {
            // Don't prevent default for Tab, as it's standard behavior
            try {
              onTab(e);
            } catch (error) {
              console.error('Error executing onTab handler:', error);
            }
          }
          break;

        default:
          break;
      }
    };

    // Add event listener with error handling
    try {
      document.addEventListener('keydown', handleKeyDown);
    } catch (error) {
      console.error('Error adding keyboard event listener:', error);
    }

    return () => {
      try {
        document.removeEventListener('keydown', handleKeyDown);
      } catch (error) {
        console.error('Error removing keyboard event listener:', error);
      }
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