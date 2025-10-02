// Test script to check advertisement controller exports
const controller = require('./src/controllers/advertisementController');

console.log('Testing advertisement controller exports...');

const functions = [
  'getAdvertisements',
  'getAdsBySection', 
  'getAdvertisementById',
  'createAdvertisement',
  'uploadMedia',
  'updateAdvertisement',
  'deleteAdvertisement',
  'trackImpression',
  'trackClick',
  'getUserAdvertisements',
  'getAdvertisementAnalytics',
  'approveAdvertisement',
  'blockAdvertisement'
];

functions.forEach(funcName => {
  const func = controller[funcName];
  console.log(`${funcName}: ${typeof func} ${func ? '✅' : '❌'}`);
  if (typeof func !== 'function') {
    console.log(`  Value:`, func);
  }
});

console.log('\nController object keys:', Object.keys(controller));