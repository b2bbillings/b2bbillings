// Simple test to check partyController structure
const path = require('path');

// Add the src directory to the module path
const srcPath = path.resolve(__dirname, 'src');
process.env.NODE_PATH = srcPath;
require('module').Module._initPaths();

try {
  console.log('🔍 Testing partyController import...');
  
  // Try to require the controller
  const partyController = require('./src/controllers/partyController');
  
  console.log('✅ PartyController imported successfully!');
  console.log('📦 Controller methods:', Object.keys(partyController));
  
  // Check if our methods exist
  const requiredMethods = ['getPartiesForPayment', 'searchPartiesForPayment', 'getPartyDetailsForPayment'];
  
  requiredMethods.forEach(method => {
    if (typeof partyController[method] === 'function') {
      console.log(`✅ ${method}: function found`);
    } else {
      console.error(`❌ ${method}: ${typeof partyController[method]} (expected function)`);
    }
  });
  
} catch (error) {
  console.error('❌ Error importing partyController:', error.message);
  console.error(error.stack);
}