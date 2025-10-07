const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/b2bbilling')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const Item = require('./src/models/Item');
    
    // Get all items
    const allItems = await Item.find({}).lean();
    console.log('Total items in DB:', allItems.length);
    
    if (allItems.length > 0) {
      console.log('\nSample item structure:');
      console.log(JSON.stringify(allItems[0], null, 2));
      
      console.log('\nAll company IDs in items:');
      const companyIds = [...new Set(allItems.map(item => item.companyId?.toString()))];
      console.log(companyIds);
      
      // Test the specific company ID from frontend
      const testCompanyId = '68e4f4f21883bf1db6dc2c9f';
      console.log('\nTesting company ID:', testCompanyId);
      
      const matchingItems = await Item.find({ 
        companyId: new mongoose.Types.ObjectId(testCompanyId) 
      }).lean();
      console.log('Items matching companyId query:', matchingItems.length);
      
      if (matchingItems.length > 0) {
        console.log('First matching item:');
        console.log(JSON.stringify(matchingItems[0], null, 2));
      }
      
      // Test string comparison
      const stringMatches = allItems.filter(item => 
        item.companyId?.toString() === testCompanyId
      );
      console.log('Items matching string comparison:', stringMatches.length);
      
      // Show all items with their company IDs
      console.log('\nAll items with company IDs:');
      allItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - CompanyID: ${item.companyId?.toString()}`);
      });
    }
    
    mongoose.disconnect();
  })
  .catch(console.error);