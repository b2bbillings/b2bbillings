require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const { generateAccessToken } = require('./src/config/jwt');

async function generateTestToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const adminUser = await User.findOne({ email: 'sachinjoshi2525@gmail.com' });
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    const token = generateAccessToken({
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name
    });

    console.log('Generated token:');
    console.log(token);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

generateTestToken();