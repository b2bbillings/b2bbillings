const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const validateEnvironment = () => {
  console.log("🔍 Shop Management System - Environment Validation");
  console.log("═══════════════════════════════════════════════════");

  const requiredVars = [
    "MONGODB_URI",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
    "NODE_ENV",
  ];

  const optionalVars = ["PORT", "FRONTEND_URL", "CORS_ORIGIN"];

  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  console.log("\n📋 Required Variables:");
  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      if (varName.includes("SECRET")) {
        console.log(
          `✅ ${varName}: ${"*".repeat(Math.min(value.length, 20))}...`
        );
      } else if (varName === "MONGODB_URI") {
        if (value.includes("mongodb+srv://")) {
          console.log(`✅ ${varName}: MongoDB Atlas (Cloud)`);
        } else {
          console.log(`✅ ${varName}: MongoDB Local`);
        }
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`❌ ${varName}: Missing`);
      hasErrors = true;
    }
  });

  // Check optional variables
  console.log("\n📝 Optional Variables:");
  optionalVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️  ${varName}: Not set (using default)`);
    }
  });

  // MongoDB URI validation
  if (process.env.MONGODB_URI) {
    console.log("\n🗄️  Database Configuration:");

    if (process.env.MONGODB_URI.startsWith("mongodb+srv://")) {
      console.log("✅ Database Type: MongoDB Atlas (Cloud)");
      console.log("✅ Connection: Secure (SSL)");
      console.log("✅ Benefits: Auto-scaling, Managed, Global");

      // Extract cluster name
      const clusterMatch = process.env.MONGODB_URI.match(
        /mongodb\+srv:\/\/[^@]+@([^.]+)/
      );
      if (clusterMatch) {
        console.log(`✅ Cluster: ${clusterMatch[1]}`);
      }
    } else if (process.env.MONGODB_URI.startsWith("mongodb://")) {
      console.log("✅ Database Type: MongoDB (Local/Self-hosted)");
      hasWarnings = true;
    } else {
      console.log("❌ Invalid MONGODB_URI format");
      hasErrors = true;
    }
  }

  // Security validation
  if (process.env.JWT_SECRET) {
    console.log("\n🔐 Security Configuration:");

    if (process.env.JWT_SECRET.length >= 32) {
      console.log("✅ JWT Secret: Strong (32+ characters)");
    } else {
      console.log("⚠️  JWT Secret: Weak (less than 32 characters)");
      if (process.env.NODE_ENV === "production") {
        hasErrors = true;
      } else {
        hasWarnings = true;
      }
    }

    if (
      process.env.JWT_REFRESH_SECRET &&
      process.env.JWT_REFRESH_SECRET !== process.env.JWT_SECRET
    ) {
      console.log("✅ Refresh Secret: Different from main secret");
    } else {
      console.log("⚠️  Refresh Secret: Same as main secret or missing");
      hasWarnings = true;
    }
  }

  // Environment-specific checks
  console.log("\n🌍 Environment Checks:");
  if (process.env.NODE_ENV === "production") {
    console.log("✅ Environment: Production");

    if (!process.env.CORS_ORIGIN) {
      console.log("⚠️  CORS_ORIGIN: Not set for production");
      hasWarnings = true;
    }
  } else {
    console.log("✅ Environment: Development");
    console.log("✅ CORS: Localhost allowed");
  }

  // Atlas-specific checks
  if (process.env.MONGODB_URI?.includes("mongodb+srv://")) {
    console.log("\n🌐 Atlas-Specific Checks:");
    console.log("📋 Ensure the following in Atlas:");
    console.log("   1. Database user created with readWrite permissions");
    console.log("   2. IP whitelist includes your current IP");
    console.log("   3. For development: Add 0.0.0.0/0 to IP whitelist");
    console.log("   4. Cluster is not paused");
    console.log("   5. Connection string includes correct database name");
  }

  // Summary
  console.log("\n📊 Validation Summary:");
  if (hasErrors) {
    console.log("❌ Validation FAILED - Fix required variables above");
    console.log(
      "🔧 Check your .env file and ensure all required variables are set"
    );
    process.exit(1);
  } else if (hasWarnings) {
    console.log("⚠️  Validation PASSED with warnings");
    console.log(
      "💡 Consider addressing the warnings above for better security"
    );
    process.exit(0);
  } else {
    console.log("✅ Validation PASSED - All checks successful");
    console.log("🚀 Your environment is ready for Shop Management System!");
    process.exit(0);
  }
};

// Run validation if called directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = validateEnvironment;
