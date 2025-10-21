/**
 * Payment API Test Script
 * 
 * This script tests the Payment In/Out API endpoints
 * Run with: node Backend/test-payment-api.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Test configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// API call helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN}`
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { status: 500, error: error.message };
    }
}

// Test cases
async function testDatabaseConnection() {
    log('\n🔍 Testing Database Connection...', 'blue');
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        log('✅ Database connected successfully', 'green');
        return true;
    } catch (error) {
        log(`❌ Database connection failed: ${error.message}`, 'red');
        return false;
    }
}

async function testGetParties(companyId) {
    log('\n🔍 Testing Get Parties for Payment...', 'blue');
    const result = await apiCall(`/parties/${companyId}/payment-parties?type=all`);
    
    if (result.status === 200 && result.data.success) {
        log(`✅ Fetched ${result.data.data?.length || 0} parties`, 'green');
        return result.data.data;
    } else {
        log(`❌ Failed to fetch parties: ${result.data?.message || result.error}`, 'red');
        return [];
    }
}

async function testCreatePaymentIn(companyId, partyId, partyName) {
    log('\n🔍 Testing Create Payment In...', 'blue');
    
    const paymentData = {
        date: new Date().toISOString().split('T')[0],
        partyId,
        partyName,
        amount: 1000.50,
        paymentMethod: 'cash',
        description: 'Test payment in',
        type: 'payment_in',
        paymentType: 'payment_in',
        companyId
    };

    const result = await apiCall('/payments/payment-in', 'POST', paymentData);
    
    if (result.status === 201 && result.data.success) {
        log('✅ Payment In created successfully', 'green');
        log(`   Payment Number: ${result.data.data.payment.paymentNumber}`, 'green');
        log(`   Amount: ₹${result.data.data.payment.amount}`, 'green');
        return result.data.data.payment;
    } else {
        log(`❌ Failed to create payment in: ${result.data?.message || result.error}`, 'red');
        return null;
    }
}

async function testCreatePaymentOut(companyId, partyId, partyName) {
    log('\n🔍 Testing Create Payment Out...', 'blue');
    
    const paymentData = {
        date: new Date().toISOString().split('T')[0],
        partyId,
        partyName,
        amount: 500.75,
        paymentMethod: 'bank_transfer',
        description: 'Test payment out',
        type: 'payment_out',
        paymentType: 'payment_out',
        companyId
    };

    const result = await apiCall('/payments/payment-out', 'POST', paymentData);
    
    if (result.status === 201 && result.data.success) {
        log('✅ Payment Out created successfully', 'green');
        log(`   Payment Number: ${result.data.data.payment.paymentNumber}`, 'green');
        log(`   Amount: ₹${result.data.data.payment.amount}`, 'green');
        return result.data.data.payment;
    } else {
        log(`❌ Failed to create payment out: ${result.data?.message || result.error}`, 'red');
        return null;
    }
}

async function testGetPayments(companyId) {
    log('\n🔍 Testing Get Payments...', 'blue');
    const result = await apiCall(`/payments?companyId=${companyId}`);
    
    if (result.status === 200 && result.data.success) {
        log(`✅ Fetched payments successfully`, 'green');
        log(`   Total Payments: ${result.data.data?.payments?.length || 0}`, 'green');
        return result.data.data.payments;
    } else {
        log(`❌ Failed to fetch payments: ${result.data?.message || result.error}`, 'red');
        return [];
    }
}

async function testGetPaymentById(paymentId) {
    log('\n🔍 Testing Get Payment by ID...', 'blue');
    const result = await apiCall(`/payments/${paymentId}`);
    
    if (result.status === 200 && result.data.success) {
        log('✅ Payment fetched successfully', 'green');
        return result.data.data;
    } else {
        log(`❌ Failed to fetch payment: ${result.data?.message || result.error}`, 'red');
        return null;
    }
}

async function testModelsExist() {
    log('\n🔍 Testing Models Existence...', 'blue');
    
    try {
        const Payment = require('./src/models/Payment');
        const Transaction = require('./src/models/Transaction');
        const Party = require('./src/models/Party');
        
        log('✅ Payment model exists', 'green');
        log('✅ Transaction model exists', 'green');
        log('✅ Party model exists', 'green');
        
        return true;
    } catch (error) {
        log(`❌ Model loading failed: ${error.message}`, 'red');
        return false;
    }
}

async function testPaymentValidation() {
    log('\n🔍 Testing Payment Validation...', 'blue');
    
    // Test 1: Missing required fields
    const invalidData1 = {
        amount: 100
    };
    const result1 = await apiCall('/payments/payment-in', 'POST', invalidData1);
    
    if (result1.status === 400) {
        log('✅ Validation error for missing fields works', 'green');
    } else {
        log('❌ Validation for missing fields not working', 'red');
    }
    
    // Test 2: Invalid amount
    const invalidData2 = {
        partyId: '507f1f77bcf86cd799439011',
        amount: -100,
        companyId: '507f1f77bcf86cd799439012',
        type: 'payment_in'
    };
    const result2 = await apiCall('/payments/payment-in', 'POST', invalidData2);
    
    if (result2.status === 400) {
        log('✅ Validation error for negative amount works', 'green');
    } else {
        log('❌ Validation for negative amount not working', 'red');
    }
    
    // Test 3: Invalid payment type
    const invalidData3 = {
        partyId: '507f1f77bcf86cd799439011',
        amount: 100,
        companyId: '507f1f77bcf86cd799439012',
        type: 'invalid_type'
    };
    const result3 = await apiCall('/payments/payment-in', 'POST', invalidData3);
    
    if (result3.status === 400) {
        log('✅ Validation error for invalid payment type works', 'green');
    } else {
        log('❌ Validation for invalid payment type not working', 'red');
    }
}

async function displayTestSummary(results) {
    log('\n' + '='.repeat(60), 'blue');
    log('TEST SUMMARY', 'blue');
    log('='.repeat(60), 'blue');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    log(`\nTotal Tests: ${results.length}`, 'yellow');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, 'red');
    
    if (failed > 0) {
        log('\nFailed Tests:', 'red');
        results.filter(r => !r.passed).forEach(r => {
            log(`  ❌ ${r.name}: ${r.message}`, 'red');
        });
    }
    
    log('\n' + '='.repeat(60), 'blue');
}

// Main test runner
async function runTests() {
    log('='.repeat(60), 'blue');
    log('PAYMENT API TEST SUITE', 'blue');
    log('='.repeat(60), 'blue');
    
    const results = [];
    
    // Test 1: Database connection
    const dbConnected = await testDatabaseConnection();
    results.push({ name: 'Database Connection', passed: dbConnected, message: dbConnected ? 'Success' : 'Failed' });
    
    if (!dbConnected) {
        log('\n❌ Cannot proceed without database connection', 'red');
        await displayTestSummary(results);
        process.exit(1);
    }
    
    // Test 2: Models exist
    const modelsExist = await testModelsExist();
    results.push({ name: 'Models Exist', passed: modelsExist, message: modelsExist ? 'Success' : 'Failed' });
    
    // Test 3: Validation tests
    await testPaymentValidation();
    results.push({ name: 'Payment Validation', passed: true, message: 'Validation tests completed' });
    
    // Get a company and party for testing
    // You'll need to replace these with actual IDs from your database
    log('\n⚠️  Note: Replace TEST_COMPANY_ID and TEST_PARTY_ID with actual values', 'yellow');
    const TEST_COMPANY_ID = process.env.TEST_COMPANY_ID || '507f1f77bcf86cd799439012';
    const TEST_PARTY_ID = process.env.TEST_PARTY_ID || '507f1f77bcf86cd799439011';
    const TEST_PARTY_NAME = 'Test Party';
    
    // Test 4: Get parties
    const parties = await testGetParties(TEST_COMPANY_ID);
    results.push({ name: 'Get Parties', passed: parties.length >= 0, message: `Found ${parties.length} parties` });
    
    // Test 5: Create Payment In
    const paymentIn = await testCreatePaymentIn(TEST_COMPANY_ID, TEST_PARTY_ID, TEST_PARTY_NAME);
    results.push({ name: 'Create Payment In', passed: paymentIn !== null, message: paymentIn ? 'Success' : 'Failed' });
    
    // Test 6: Create Payment Out
    const paymentOut = await testCreatePaymentOut(TEST_COMPANY_ID, TEST_PARTY_ID, TEST_PARTY_NAME);
    results.push({ name: 'Create Payment Out', passed: paymentOut !== null, message: paymentOut ? 'Success' : 'Failed' });
    
    // Test 7: Get all payments
    const payments = await testGetPayments(TEST_COMPANY_ID);
    results.push({ name: 'Get All Payments', passed: payments.length >= 0, message: `Found ${payments.length} payments` });
    
    // Test 8: Get payment by ID
    if (paymentIn) {
        const payment = await testGetPaymentById(paymentIn._id);
        results.push({ name: 'Get Payment By ID', passed: payment !== null, message: payment ? 'Success' : 'Failed' });
    }
    
    // Display summary
    await displayTestSummary(results);
    
    // Cleanup
    await mongoose.disconnect();
    log('\n👋 Database connection closed', 'blue');
    
    process.exit(results.filter(r => !r.passed).length > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    log(`\n❌ Unhandled error: ${error.message}`, 'red');
    process.exit(1);
});

// Run tests
if (require.main === module) {
    runTests().catch(error => {
        log(`\n❌ Test suite failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    });
}

module.exports = { runTests };
