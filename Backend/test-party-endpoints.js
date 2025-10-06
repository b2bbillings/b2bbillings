// Test script to check party endpoints and debugging
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000/api';

// Get token from auth
async function getAuthToken() {
    try {
        // Try to get a token from login (you'll need to update with real credentials)
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@test.com', // Update with real admin email
                password: 'password123' // Update with real password
            })
        });

        const data = await response.json();
        if (data.success && data.token) {
            return data.token;
        }
        console.error('Login failed:', data);
        return null;
    } catch (error) {
        console.error('Login error:', error);
        return null;
    }
}

// Test party endpoints
async function testPartyEndpoints() {
    console.log('🔍 Testing party endpoints...\n');
    
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
        console.error('❌ Could not get auth token. Please check login credentials.');
        return;
    }
    
    console.log('✅ Got auth token:', token.substring(0, 20) + '...\n');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token
    };

    try {
        // Test 1: Get all companies first
        console.log('1. Testing companies endpoint...');
        const companiesResponse = await fetch(`${API_BASE_URL}/companies`, {
            headers
        });
        const companiesData = await companiesResponse.json();
        console.log('Companies response:', {
            success: companiesData.success,
            count: companiesData.data?.length || 0,
            firstCompany: companiesData.data?.[0]?.name || 'None'
        });

        if (!companiesData.success || !companiesData.data?.length) {
            console.error('❌ No companies found. Cannot test party endpoints.');
            return;
        }

        const companyId = companiesData.data[0]._id || companiesData.data[0].id;
        console.log('Using company ID:', companyId, '\n');

        // Test 2: Get parties for payment (with company)
        console.log('2. Testing parties for payment with company...');
        const partiesResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/parties/for-payment?limit=50`, {
            headers
        });
        const partiesData = await partiesResponse.json();
        console.log('Parties for payment response:', {
            success: partiesData.success,
            count: partiesData.data?.length || 0,
            status: partiesResponse.status
        });

        if (partiesData.data?.length > 0) {
            console.log('Sample party:', partiesData.data[0]);
        }

        // Test 3: Get parties for payment (without company - fallback)
        console.log('\n3. Testing parties for payment without company...');
        const fallbackResponse = await fetch(`${API_BASE_URL}/parties/for-payment?limit=50`, {
            headers
        });
        const fallbackData = await fallbackResponse.json();
        console.log('Fallback parties response:', {
            success: fallbackData.success,
            count: fallbackData.data?.length || 0,
            status: fallbackResponse.status
        });

        // Test 4: Get all customers
        console.log('\n4. Testing customers endpoint...');
        const customersResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/customers`, {
            headers
        });
        const customersData = await customersResponse.json();
        console.log('Customers response:', {
            success: customersData.success,
            count: customersData.data?.length || 0,
            status: customersResponse.status
        });

        // Test 5: Get all vendors
        console.log('\n5. Testing vendors endpoint...');
        const vendorsResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/vendors`, {
            headers
        });
        const vendorsData = await vendorsResponse.json();
        console.log('Vendors response:', {
            success: vendorsData.success,
            count: vendorsData.data?.length || 0,
            status: vendorsResponse.status
        });

        // Test 6: Get all parties
        console.log('\n6. Testing all parties endpoint...');
        const allPartiesResponse = await fetch(`${API_BASE_URL}/companies/${companyId}/parties`, {
            headers
        });
        const allPartiesData = await allPartiesResponse.json();
        console.log('All parties response:', {
            success: allPartiesData.success,
            count: allPartiesData.data?.length || 0,
            status: allPartiesResponse.status
        });

        if (allPartiesData.data?.length > 0) {
            console.log('Sample all party:', allPartiesData.data[0]);
        }

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run the tests
testPartyEndpoints().then(() => {
    console.log('\n✅ Party endpoint testing completed!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});