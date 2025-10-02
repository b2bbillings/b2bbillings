// Quick test script to check advertisement section filtering
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import models
const Advertisement = require('./src/models/Advertisement');
const User = require('./src/models/User');
const Company = require('./src/models/Company');

async function testSectionFiltering() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all advertisements with their sections
    const allAds = await Advertisement.find({ isBlocked: false })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`\n📊 All Advertisements (${allAds.length} total):`);
    allAds.forEach((ad, index) => {
      console.log(`  ${index + 1}. "${ad.title}" - Section: ${ad.section} - User: ${ad.userId?.name}`);
    });

    // Test section filtering
    const sections = ['banner', 'sidebar', 'whatsapp'];
    
    for (const section of sections) {
      const sectionAds = allAds.filter(ad => ad.section === section);
      console.log(`\n📍 ${section.toUpperCase()} Section (${sectionAds.length} ads):`);
      sectionAds.forEach((ad, index) => {
        console.log(`  ${index + 1}. "${ad.title}" by ${ad.userId?.name}`);
      });
    }

    console.log('\n🎯 Summary by Section:');
    console.log(`  All: ${allAds.length}`);
    console.log(`  Banner: ${allAds.filter(ad => ad.section === 'banner').length}`);
    console.log(`  Sidebar: ${allAds.filter(ad => ad.section === 'sidebar').length}`);
    console.log(`  WhatsApp: ${allAds.filter(ad => ad.section === 'whatsapp').length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

testSectionFiltering();