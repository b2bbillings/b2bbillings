// Test script to verify admin advertisement endpoints
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import models
const Advertisement = require('./src/models/Advertisement');
const User = require('./src/models/User');
const Company = require('./src/models/Company');

async function testAdminAdvertisements() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Get all advertisements
    console.log('\n📊 Testing: Get All Advertisements');
    const allAds = await Advertisement.find({ isBlocked: false })
      .populate('userId', 'name email')
      .populate('companyId', 'name businessName')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${allAds.length} total advertisements`);
    allAds.forEach((ad, index) => {
      console.log(`  ${index + 1}. "${ad.title}" by ${ad.userId?.name || 'Unknown'} - Status: ${
        ad.isApproved ? 'APPROVED' : 
        ad.isRejected ? 'REJECTED' : 
        'PENDING'
      }`);
    });

    // Test 2: Get pending advertisements
    console.log('\n⏳ Testing: Get Pending Advertisements');
    const pendingAds = await Advertisement.find({
      isBlocked: false,
      isApproved: false,
      isRejected: { $ne: true }
    }).populate('userId', 'name email');
    
    console.log(`✅ Found ${pendingAds.length} pending advertisements`);
    pendingAds.forEach((ad, index) => {
      console.log(`  ${index + 1}. "${ad.title}" by ${ad.userId?.name || 'Unknown'}`);
    });

    // Test 3: Get approved advertisements
    console.log('\n✅ Testing: Get Approved Advertisements');
    const approvedAds = await Advertisement.find({
      isBlocked: false,
      isApproved: true
    }).populate('userId', 'name email');
    
    console.log(`✅ Found ${approvedAds.length} approved advertisements`);
    approvedAds.forEach((ad, index) => {
      console.log(`  ${index + 1}. "${ad.title}" by ${ad.userId?.name || 'Unknown'} - Approved: ${ad.approvedAt || 'N/A'}`);
    });

    // Test 4: Get rejected advertisements
    console.log('\n❌ Testing: Get Rejected Advertisements');
    const rejectedAds = await Advertisement.find({
      isBlocked: false,
      isRejected: true
    }).populate('userId', 'name email');
    
    console.log(`✅ Found ${rejectedAds.length} rejected advertisements`);
    rejectedAds.forEach((ad, index) => {
      console.log(`  ${index + 1}. "${ad.title}" by ${ad.userId?.name || 'Unknown'} - Rejected: ${ad.rejectedAt || 'N/A'}`);
    });

    console.log('\n🎯 Summary:');
    console.log(`  Total: ${allAds.length}`);
    console.log(`  Pending: ${pendingAds.length}`);
    console.log(`  Approved: ${approvedAds.length}`);
    console.log(`  Rejected: ${rejectedAds.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testAdminAdvertisements();