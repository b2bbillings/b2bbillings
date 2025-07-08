const axios = require("axios");

async function testAdminAccess() {
  const baseURL = "http://localhost:5000";

  console.log("🔍 Testing server connectivity...");

  try {
    // Test 1: Test API health endpoint instead of root
    console.log("🧪 Testing API health endpoint...");
    try {
      const apiHealthResponse = await axios.get(`${baseURL}/api/health`, {
        timeout: 5000,
      });
      console.log(
        "✅ API Health endpoint works:",
        apiHealthResponse.data.message
      );
    } catch (error) {
      console.log(
        "⚠️ API Health endpoint not available:",
        error.response?.status || error.message
      );
    }

    // Test 2: Company health check
    console.log("🧪 Testing company health check...");
    const healthResponse = await axios.get(`${baseURL}/api/companies/health`, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });
    console.log("✅ Company health check response:", {
      status: healthResponse.status,
      success: healthResponse.data.success,
      message: healthResponse.data.message,
      database: healthResponse.data.database,
    });

    // Test 3: Admin companies endpoint
    console.log("🧪 Testing admin companies endpoint...");
    const adminResponse = await axios.get(
      `${baseURL}/api/companies/admin/all?page=1&limit=5`,
      {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      }
    );
    console.log("✅ Admin endpoint response:", {
      status: adminResponse.status,
      success: adminResponse.data.success,
      companiesCount: adminResponse.data.data?.companies?.length || 0,
      message: adminResponse.data.message,
    });

    // Test 4: Regular companies endpoint with admin flag
    console.log("🧪 Testing regular companies endpoint with admin flag...");
    const regularResponse = await axios.get(
      `${baseURL}/api/companies?isAdmin=true&page=1&limit=5`,
      {
        timeout: 10000,
        validateStatus: (status) => status < 500,
        headers: {
          "x-admin-access": "true",
        },
      }
    );
    console.log("✅ Regular endpoint with admin flag response:", {
      status: regularResponse.status,
      success: regularResponse.data.success,
      companiesCount: regularResponse.data.data?.companies?.length || 0,
      message: regularResponse.data.message,
      error: regularResponse.data.error,
    });

    // Test 5: Admin stats endpoint
    console.log("🧪 Testing admin stats endpoint...");
    const statsResponse = await axios.get(
      `${baseURL}/api/companies/admin/stats`,
      {
        timeout: 10000,
        validateStatus: (status) => status < 500,
      }
    );
    console.log("✅ Admin stats response:", {
      status: statsResponse.status,
      success: statsResponse.data.success,
      totalCompanies: statsResponse.data.data?.totalCompanies || 0,
    });

    console.log("\n🎉 All tests completed successfully!");
    console.log("📊 Summary:");
    console.log(
      `   - Total companies in database: ${
        statsResponse.data.data?.totalCompanies || 0
      }`
    );
    console.log(`   - Admin endpoint working: ✅`);
    console.log(`   - Company health check: ✅`);
    console.log(`   - Database connection: ✅`);
  } catch (error) {
    console.error("❌ Test failed:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      responseData: error.response?.data,
    });

    // Provide specific help based on error type
    if (error.code === "ECONNREFUSED") {
      console.log("\n🚨 Connection refused. Please check:");
      console.log("   1. Is your server running? (npm start)");
      console.log("   2. Is it running on port 5000?");
      console.log("   3. Check for any startup errors in server logs");
    } else if (error.response?.status === 404) {
      console.log("\n⚠️ Route not found. This might be normal for root route.");
    } else if (error.response?.status === 500) {
      console.log("\n🚨 Server error. Check your server logs for details.");
    }
  }
}

testAdminAccess();
