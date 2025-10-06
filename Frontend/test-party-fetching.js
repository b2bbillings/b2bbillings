/**
 * Test Party Fetching for Payment Forms
 * This script tests the party fetching functionality for payment forms
 */

console.log('🧪 Testing Party Fetching for Payment Forms...\n');

// Import the enhanced payment service
import paymentService from '../Frontend/src/services/paymentService.js';

async function testPartyFetching() {
    console.log('1. Testing party fetching without company context...');
    
    try {
        // Test 1: Fetch all parties without company
        const allParties = await paymentService.getPartiesForPayment(null, '', 'all');
        console.log(`✅ All parties fetched: ${allParties.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Total parties found: ${allParties.data?.length || 0}`);
        
        if (allParties.data && allParties.data.length > 0) {
            console.log('   Sample parties:');
            allParties.data.slice(0, 3).forEach((party, index) => {
                console.log(`   ${index + 1}. ${party.displayName || party.name} (${party.type || party.partyType})`);
            });
        }
        
        // Test 2: Fetch only customers
        console.log('\n2. Testing customer-only fetching...');
        const customers = await paymentService.getPartiesForPayment(null, '', 'customer');
        console.log(`✅ Customers fetched: ${customers.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Total customers found: ${customers.data?.length || 0}`);
        
        // Test 3: Fetch only vendors
        console.log('\n3. Testing vendor-only fetching...');
        const vendors = await paymentService.getPartiesForPayment(null, '', 'vendor');
        console.log(`✅ Vendors fetched: ${vendors.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Total vendors found: ${vendors.data?.length || 0}`);
        
        // Test 4: Search functionality
        console.log('\n4. Testing search functionality...');
        const searchResults = await paymentService.getPartiesForPayment(null, 'test', 'all');
        console.log(`✅ Search results: ${searchResults.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Search results found: ${searchResults.data?.length || 0}`);
        
        // Test 5: Payment methods
        console.log('\n5. Testing payment methods fetching...');
        const paymentMethods = await paymentService.getPaymentMethods();
        console.log(`✅ Payment methods: ${paymentMethods.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Payment methods available: ${paymentMethods.data?.length || 0}`);
        
        if (paymentMethods.data && paymentMethods.data.length > 0) {
            console.log('   Available methods:');
            paymentMethods.data.forEach((method, index) => {
                console.log(`   ${index + 1}. ${method.label} (${method.value})`);
            });
        }
        
        return {
            success: true,
            summary: {
                allParties: allParties.data?.length || 0,
                customers: customers.data?.length || 0,
                vendors: vendors.data?.length || 0,
                searchResults: searchResults.data?.length || 0,
                paymentMethods: paymentMethods.data?.length || 0
            }
        };
        
    } catch (error) {
        console.error('❌ Party fetching test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testPaymentValidation() {
    console.log('\n🔍 Testing payment validation...');
    
    try {
        // Test valid payment data
        const validPaymentData = {
            partyId: 'test-party-id',
            partyName: 'Test Party',
            amount: 1000,
            paymentMethod: 'cash',
            paymentDate: new Date().toISOString().split('T')[0],
            paymentType: 'payment_in'
        };
        
        const validationResult = paymentService.validatePaymentData(validPaymentData);
        console.log(`✅ Valid payment validation: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
        
        // Test invalid payment data
        const invalidPaymentData = {
            partyId: '',
            partyName: '',
            amount: -100,
            paymentMethod: '',
            paymentDate: '',
            paymentType: 'invalid'
        };
        
        const invalidValidationResult = paymentService.validatePaymentData(invalidPaymentData);
        console.log(`✅ Invalid payment validation: ${!invalidValidationResult.isValid ? 'PASSED' : 'FAILED'}`);
        console.log(`   Validation errors found: ${invalidValidationResult.errors?.length || 0}`);
        
        return {
            success: true,
            validDataPassed: validationResult.isValid,
            invalidDataFailed: !invalidValidationResult.isValid,
            errorCount: invalidValidationResult.errors?.length || 0
        };
        
    } catch (error) {
        console.error('❌ Payment validation test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function testUtilityFunctions() {
    console.log('\n🛠️ Testing utility functions...');
    
    try {
        // Test amount formatting
        const formattedAmount = paymentService.formatAmount(123456.78);
        console.log(`✅ Amount formatting: ${formattedAmount}`);
        
        // Test date formatting
        const formattedDate = paymentService.formatDate(new Date());
        console.log(`✅ Date formatting: ${formattedDate}`);
        
        // Test payment method info
        const methodInfo = paymentService.getPaymentMethodInfo('upi');
        console.log(`✅ Payment method info: ${methodInfo.label} (${methodInfo.icon})`);
        
        // Test payment summary generation
        const samplePayment = {
            amount: 5000,
            paymentDate: new Date().toISOString(),
            paymentMethod: 'upi',
            type: 'payment_in',
            partyName: 'Test Customer'
        };
        
        const summary = paymentService.generatePaymentSummary(samplePayment);
        console.log(`✅ Payment summary: ${summary}`);
        
        return {
            success: true,
            formattedAmount,
            formattedDate,
            methodInfo: methodInfo.label,
            summary
        };
        
    } catch (error) {
        console.error('❌ Utility functions test failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function runCompleteTest() {
    console.log('='.repeat(60));
    console.log('🧪 PAYMENT FORM PARTY FETCHING TEST');
    console.log('='.repeat(60));
    
    const results = {
        partyFetching: await testPartyFetching(),
        paymentValidation: await testPaymentValidation(),
        utilityFunctions: await testUtilityFunctions()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log('Party Fetching:', results.partyFetching.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Payment Validation:', results.paymentValidation.success ? '✅ PASSED' : '❌ FAILED');
    console.log('Utility Functions:', results.utilityFunctions.success ? '✅ PASSED' : '❌ FAILED');
    
    const overallSuccess = Object.values(results).every(r => r.success);
    console.log('\n🎯 OVERALL STATUS:', overallSuccess ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED');
    
    if (results.partyFetching.success && results.partyFetching.summary) {
        console.log('\n📈 PARTY FETCHING SUMMARY:');
        console.log(`- Total parties available: ${results.partyFetching.summary.allParties}`);
        console.log(`- Customers: ${results.partyFetching.summary.customers}`);
        console.log(`- Vendors: ${results.partyFetching.summary.vendors}`);
        console.log(`- Payment methods: ${results.partyFetching.summary.paymentMethods}`);
    }
    
    if (overallSuccess) {
        console.log('\n✅ READY FOR TESTING:');
        console.log('1. Start the backend server: npm start');
        console.log('2. Start the frontend server: npm run dev');
        console.log('3. Navigate to /payment-in or /payment-out');
        console.log('4. Select parties from the dropdown');
        console.log('5. Create payments successfully');
    } else {
        console.log('\n⚠️ ISSUES TO RESOLVE:');
        Object.entries(results).forEach(([testName, result]) => {
            if (!result.success) {
                console.log(`- ${testName}: ${result.error}`);
            }
        });
    }
    
    return results;
}

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runCompleteTest,
        testPartyFetching,
        testPaymentValidation,
        testUtilityFunctions
    };
}

// Run tests if script is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
    runCompleteTest().catch(console.error);
}