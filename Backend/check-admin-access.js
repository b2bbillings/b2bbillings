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

// Import User model
const User = require('./src/models/User');

const checkUserAdminAccess = async () => {
  console.log('\n🔍 Checking User Admin Access...\n');

  try {
    // Get all users
    const users = await User.find({}).select('name email isAdmin createdAt');
    
    console.log(`📊 Total Users: ${users.length}`);
    console.log('\n👥 User List:');
    
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      Admin: ${user.isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`      Created: ${user.createdAt.toISOString().substring(0, 10)}`);
      console.log('');
    });

    // Find admin users
    const adminUsers = users.filter(user => user.isAdmin);
    console.log(`🔑 Admin Users: ${adminUsers.length}`);
    
    if (adminUsers.length === 0) {
      console.log('\n⚠️  NO ADMIN USERS FOUND!');
      console.log('🔧 To fix this, you need to grant admin access to at least one user.');
      console.log('💡 You can use the grant-admin-access.js script or update manually.');
      
      // Show how to grant admin access to the first user
      if (users.length > 0) {
        const firstUser = users[0];
        console.log(`\n🛠️  To grant admin access to "${firstUser.name}":`);
        console.log(`   1. Run: node grant-admin-access.js`);
        console.log(`   2. Or manually update in database:`);
        console.log(`      db.users.updateOne({_id: ObjectId("${firstUser._id}")}, {$set: {isAdmin: true}})`);
      }
    } else {
      console.log('\n✅ Admin users found. The 403 error might be due to:');
      console.log('   1. User not logged in with admin credentials');
      console.log('   2. JWT token expired or invalid');
      console.log('   3. Admin middleware not working correctly');
    }

  } catch (error) {
    console.error('❌ Error checking admin access:', error);
  }
};

const runAdminCheck = async () => {
  console.log('🔑 B2B Billing - Admin Access Check');
  console.log('=' .repeat(50));

  const connected = await connectToDatabase();
  if (!connected) return;

  await checkUserAdminAccess();

  await mongoose.connection.close();
  console.log('\n📤 Disconnected from MongoDB');
};

runAdminCheck().catch(console.error);