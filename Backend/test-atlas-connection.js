const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const testAtlasConnection = async () => {
  console.log("🧪 Testing MongoDB Atlas Connection...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // Validate environment
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not found in environment variables");
    }

    console.log("✅ Environment variables loaded");
    console.log(
      `🌐 MongoDB URI: ${
        process.env.MONGODB_URI.includes("mongodb+srv://")
          ? "Atlas (Cloud)"
          : "Local"
      }`
    );

    // Atlas-optimized connection options
    const options = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 20000,
      retryWrites: true,
      w: "majority",
      ssl: true,
      appName: "Shop-Management-Test",
    };

    console.log("🔌 Connecting to Atlas...");
    await mongoose.connect(process.env.MONGODB_URI, options);

    console.log("✅ Atlas connection successful!");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🌍 Host: ${mongoose.connection.host}`);
    console.log(`📶 Ready State: ${mongoose.connection.readyState}`);

    // Test basic operations
    console.log("\n🧪 Testing basic operations...");

    // Test collections
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(`📁 Collections found: ${collections.length}`);

    // Test a simple query
    const adminDb = mongoose.connection.db.admin();
    const dbStats = await adminDb.command({dbStats: 1});
    console.log(
      `💾 Database size: ${(dbStats.dataSize / (1024 * 1024)).toFixed(2)} MB`
    );

    console.log("\n🎉 Atlas connection test completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (error) {
    console.error("❌ Atlas connection test failed:");
    console.error(`📋 Error: ${error.message}`);

    if (error.message.includes("Authentication failed")) {
      console.error("\n🔧 Troubleshooting Authentication:");
      console.error("   1. Check your Atlas username and password");
      console.error("   2. Verify your connection string in .env");
      console.error("   3. Ensure database user has proper permissions");
    }

    if (
      error.message.includes("Network") ||
      error.message.includes("timeout")
    ) {
      console.error("\n🔧 Troubleshooting Network:");
      console.error("   1. Check your internet connection");
      console.error(
        "   2. Verify IP whitelist in Atlas (0.0.0.0/0 for development)"
      );
      console.error("   3. Check firewall settings");
    }

    console.error("\n📚 Atlas Setup Guide:");
    console.error("   1. Login to MongoDB Atlas");
    console.error("   2. Create/Select your cluster");
    console.error("   3. Go to Database Access → Add user");
    console.error("   4. Go to Network Access → Add IP (0.0.0.0/0 for dev)");
    console.error("   5. Go to Database → Connect → Application");
    console.error("   6. Copy connection string to .env file");

    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
    process.exit(0);
  }
};

// Run test if called directly
if (require.main === module) {
  testAtlasConnection();
}

module.exports = testAtlasConnection;
