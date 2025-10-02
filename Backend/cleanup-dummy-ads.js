const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    return false;
  }
};

// Import Advertisement model
const Advertisement = require('./src/models/Advertisement');

const checkAndRemoveDummyAds = async () => {
  console.log('\n🔍 Checking for dummy advertisements...\n');

  try {
    // Get all advertisements
    const allAds = await Advertisement.find({}).sort({ createdAt: -1 });
    console.log(`📊 Found ${allAds.length} total advertisements`);

    if (allAds.length === 0) {
      console.log('No advertisements found in database.');
      return;
    }

    // Check for potential dummy ads (ads with test/dummy/sample in title or description)
    const dummyPatterns = [
      /test/i,
      /dummy/i,
      /sample/i,
      /example/i,
      /fake/i,
      /demo/i
    ];

    const potentialDummyAds = allAds.filter(ad => {
      const titleMatch = dummyPatterns.some(pattern => pattern.test(ad.title || ''));
      const descMatch = dummyPatterns.some(pattern => pattern.test(ad.description || ''));
      return titleMatch || descMatch;
    });

    console.log(`🎯 Found ${potentialDummyAds.length} potential dummy advertisements:`);
    
    if (potentialDummyAds.length > 0) {
      potentialDummyAds.forEach((ad, index) => {
        console.log(`   ${index + 1}. "${ad.title}" - ${ad.section} - ${ad.createdAt.toISOString()}`);
        console.log(`      Description: ${ad.description || 'No description'}`);
        console.log(`      Status: ${ad.isApproved ? 'Approved' : ad.isRejected ? 'Rejected' : 'Pending'}`);
      });

      // Remove dummy ads
      console.log('\n🗑️  Removing dummy advertisements...');
      const deleteResult = await Advertisement.deleteMany({
        _id: { $in: potentialDummyAds.map(ad => ad._id) }
      });
      
      console.log(`✅ Removed ${deleteResult.deletedCount} dummy advertisements`);
    }

    // Show remaining ads summary
    const remainingAds = await Advertisement.find({}).sort({ createdAt: -1 });
    console.log(`\n📈 Remaining advertisements: ${remainingAds.length}`);
    
    const statusSummary = {
      pending: remainingAds.filter(ad => !ad.isApproved && !ad.isRejected && !ad.hasChangeRequests).length,
      approved: remainingAds.filter(ad => ad.isApproved).length,
      rejected: remainingAds.filter(ad => ad.isRejected).length,
      changeRequested: remainingAds.filter(ad => ad.hasChangeRequests).length
    };

    console.log('\n📊 Status Summary:');
    console.log(`   Pending: ${statusSummary.pending}`);
    console.log(`   Approved: ${statusSummary.approved}`);
    console.log(`   Rejected: ${statusSummary.rejected}`);
    console.log(`   Change Requested: ${statusSummary.changeRequested}`);

    if (remainingAds.length > 0) {
      console.log('\n📋 Remaining advertisements:');
      remainingAds.forEach((ad, index) => {
        const status = ad.isApproved ? 'Approved' : 
                      ad.isRejected ? 'Rejected' : 
                      ad.hasChangeRequests ? 'Changes Requested' : 'Pending';
        console.log(`   ${index + 1}. "${ad.title}" - ${ad.section} - ${status}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking advertisements:', error);
  }
};

const runCleanup = async () => {
  console.log('🧹 B2B Billing - Advertisement Cleanup');
  console.log('=' .repeat(50));

  const connected = await connectToDatabase();
  if (!connected) {
    return;
  }

  await checkAndRemoveDummyAds();

  await mongoose.connection.close();
  console.log('\n📤 Disconnected from MongoDB');
};

runCleanup().catch(console.error);