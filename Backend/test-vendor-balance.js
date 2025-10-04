const mongoose = require('mongoose');
const Vendor = require('./src/models/Vendor');

// Test script to verify vendor opening balance functionality
async function testVendorBalance() {
  try {
    // Connect to MongoDB (use your connection string)
    console.log('🔌 Connecting to MongoDB...');
    
    // Test vendor data with opening balance and minimum balance
    const testVendorData = {
      name: 'Test Vendor',
      phone: '9999999999',
      email: 'test@vendor.com',
      company: 'Test Vendor Company',
      gstType: 'regular',
      gstin: '29ABCDE1234F1Z5',
      billingAddress: {
        shopAddress: 'Test Address',
        pincode: '123456',
        district: 'Test District',
        state: 'Test State'
      },
      openingBalance: {
        type: 'debit',
        amount: 5000
      },
      minBalance: 1000,
      notes: 'Test vendor for balance functionality'
    };

    console.log('📝 Creating test vendor with opening balance...');
    const vendor = new Vendor(testVendorData);
    await vendor.save();
    
    console.log('✅ Vendor created successfully!');
    console.log('📊 Vendor Details:');
    console.log(`   - Name: ${vendor.name}`);
    console.log(`   - Phone: ${vendor.phone}`);
    console.log(`   - Opening Balance Type: ${vendor.openingBalance.type}`);
    console.log(`   - Opening Balance Amount: ₹${vendor.openingBalance.amount}`);
    console.log(`   - Minimum Balance: ₹${vendor.minBalance}`);
    console.log(`   - Current Balance: ₹${vendor.currentBalance}`);
    console.log(`   - Calculated Balance: ₹${vendor.calculatedBalance}`);
    
    // Test balance warning functionality
    console.log('\\n⚠️  Testing Balance Warning:');
    const balanceStatus = vendor.getBalanceStatus();
    console.log(`   - Is Below Minimum: ${balanceStatus.isBelow}`);
    console.log(`   - Warning Message: ${balanceStatus.warningMessage || 'No warning'}`);
    
    // Test with low balance
    console.log('\\n🔄 Testing with low balance...');
    vendor.openingBalance.amount = 500; // Below minimum of 1000
    await vendor.save();
    
    const lowBalanceStatus = vendor.getBalanceStatus();
    console.log(`   - Is Below Minimum: ${lowBalanceStatus.isBelow}`);
    console.log(`   - Warning Message: ${lowBalanceStatus.warningMessage || 'No warning'}`);
    
    // Test search functionality
    console.log('\\n🔍 Testing search functionality...');
    const searchResults = await Vendor.searchVendors('Test Vendor');
    console.log(`   - Search results count: ${searchResults.length}`);
    if (searchResults.length > 0) {
      console.log(`   - First result: ${searchResults[0].name} (₹${searchResults[0].currentBalance})`);
    }
    
    // Clean up - remove test vendor
    console.log('\\n🧹 Cleaning up test vendor...');
    await Vendor.findByIdAndDelete(vendor._id);
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  // You need to set your MongoDB URI here
  const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-connection-string';
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('🚀 Starting Vendor Balance Test...');
      return testVendorBalance();
    })
    .catch(error => {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    });
}

module.exports = testVendorBalance;