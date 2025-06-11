/**
 * 📦 ItemsTableWithTotals Module - Clean Exports
 * Provides easy importing for the combined Items Table + Totals component
 */

// Main component export
export { default } from './ItemsTableWithTotals';

// Named exports for flexibility
export { default as ItemsTableWithTotals } from './ItemsTableWithTotals';

// Logic functions export (for advanced usage)
export { default as itemsTableLogic } from './itemsTableLogic';

// CSS is imported automatically in the main component
// but you can import it manually if needed:
// import './itemsTableStyles.css';

/**
 * 🚀 Usage Examples:
 * 
 * // Simple import (recommended)
 * import ItemsTableWithTotals from './itemsTableWithTotals';
 * 
 * // Named import
 * import { ItemsTableWithTotals } from './itemsTableWithTotals';
 * 
 * // Import with logic functions
 * import ItemsTableWithTotals, { itemsTableLogic } from './itemsTableWithTotals';
 */