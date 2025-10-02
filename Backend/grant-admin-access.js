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

const grantAdminAccess = async () => {
  console.log('\n🔑 Granting Admin Access...\n');

  try {
    // Get all users to choose from
    const users = await User.find({}).select('name email isAdmin');
    
    console.log('👥 Available Users:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email}) - Role: ${user.role || 'user'}`);
    });

    // Grant admin access to the first user (you can modify this logic)
    if (users.length > 0) {
      const userToMakeAdmin = users[0]; // Making first user admin
      
      console.log(`\n🛠️  Granting admin access to: ${userToMakeAdmin.name} (${userToMakeAdmin.email})`);
      
      // Update user role to admin
      const updateResult = await User.updateOne(
        { _id: userToMakeAdmin._id },
        { $set: { role: 'admin' } }
      );

      if (updateResult.modifiedCount > 0) {
        console.log('✅ Admin access granted successfully!');
        
        // Verify the change
        const updatedUser = await User.findById(userToMakeAdmin._id);
        console.log(`✅ Verified: ${updatedUser.name} role is now: ${updatedUser.role}`);
        
        console.log('\n💡 Instructions:');
        console.log('1. Login to the frontend with these credentials:');
        console.log(`   Email: ${updatedUser.email}`);
        console.log('2. Navigate to the Admin section');
        console.log('3. You should now have access to the Ad Review Panel');
        
      } else {
        console.log('❌ Failed to grant admin access');
      }
    } else {
      console.log('❌ No users found in the database');
    }

  } catch (error) {
    console.error('❌ Error granting admin access:', error);
  }
};

const runAdminGrant = async () => {
  console.log('🔑 B2B Billing - Grant Admin Access');
  console.log('=' .repeat(50));

  const connected = await connectToDatabase();
  if (!connected) return;

  await grantAdminAccess();

  await mongoose.connection.close();
  console.log('\n📤 Disconnected from MongoDB');
};

runAdminGrant().catch(console.error);