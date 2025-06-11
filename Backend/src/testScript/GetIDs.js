const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';

const headers = {
    'Content-Type': 'application/json',
    'x-auth-token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NDMyNWZiNzY5ZmM5MTkwODQ2NzUwYyIsImVtYWlsIjoiYXRoYXJ2c2pvc2hpMjAwNUBnbWFpbC5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTc0OTM5NzMzNCwiZXhwIjoxNzUwMDAyMTM0LCJhdWQiOiJzaG9wLW1hbmFnZXItdXNlcnMiLCJpc3MiOiJzaG9wLW1hbmFnZXItYXBpIiwic3ViIjoiNjg0MzI1ZmI3NjlmYzkxOTA4NDY3NTBjIn0.c8gVslYltO_ZoskMuPR2ZYf4JUmYTq0MCr_2i92m2Hs'
};

async function getRealIDs() {
    try {
        console.log('🔍 Fetching Real Company and Bank Account IDs...');
        console.log('================================================');

        // Step 1: Get Companies
        console.log('\n1️⃣ Getting Companies...');
        const companiesResponse = await axios.get(`${BASE_URL}/companies`, { headers });

        if (!companiesResponse.data.success || !companiesResponse.data.data || companiesResponse.data.data.length === 0) {
            console.log('❌ No companies found. Create a company first.');
            return;
        }

        const company = companiesResponse.data.data[0]; // Use first company
        console.log('✅ Found Company:');
        console.log('   ID:', company._id);
        console.log('   Name:', company.name);
        console.log('   Email:', company.email);

        // Step 2: Get Bank Accounts for this company
        console.log('\n2️⃣ Getting Bank Accounts...');
        const bankAccountsResponse = await axios.get(
            `${BASE_URL}/companies/${company._id}/bank-accounts`,
            {
                headers: {
                    ...headers,
                    'x-company-id': company._id
                }
            }
        );

        let bankAccount = null;

        if (bankAccountsResponse.data.success && bankAccountsResponse.data.data && bankAccountsResponse.data.data.length > 0) {
            bankAccount = bankAccountsResponse.data.data[0]; // Use first bank account
            console.log('✅ Found Bank Account:');
            console.log('   ID:', bankAccount._id);
            console.log('   Name:', bankAccount.accountName);
            console.log('   Type:', bankAccount.accountType);
            console.log('   Balance: ₹', bankAccount.balance);
        } else {
            console.log('⚠️ No bank accounts found. Creating a test bank account...');

            // Create a test bank account
            const newBankAccountData = {
                accountName: 'Test Cash Account',
                accountType: 'cash',
                type: 'cash',
                openingBalance: 100000, // ₹1,00,000
                companyId: company._id
            };

            const createBankResponse = await axios.post(
                `${BASE_URL}/companies/${company._id}/bank-accounts`,
                newBankAccountData,
                {
                    headers: {
                        ...headers,
                        'x-company-id': company._id
                    }
                }
            );

            if (createBankResponse.data.success) {
                bankAccount = createBankResponse.data.data;
                console.log('✅ Created Bank Account:');
                console.log('   ID:', bankAccount._id);
                console.log('   Name:', bankAccount.accountName);
                console.log('   Balance: ₹', bankAccount.balance);
            } else {
                console.log('❌ Failed to create bank account:', createBankResponse.data.message);
                return;
            }
        }

        // Step 3: Display the updated configuration
        console.log('\n📋 Configuration for TransactionScript.js:');
        console.log('==========================================');
        console.log(`const TEST_COMPANY_ID = '${company._id}';`);
        console.log(`const TEST_BANK_ACCOUNT_ID = '${bankAccount._id}';`);

        console.log('\n🎯 Ready to test transactions!');
        console.log('Company:', company.name);
        console.log('Bank Account:', bankAccount.accountName);
        console.log('Starting Balance: ₹', bankAccount.balance);

        return {
            companyId: company._id,
            companyName: company.name,
            bankAccountId: bankAccount._id,
            bankAccountName: bankAccount.accountName,
            bankBalance: bankAccount.balance
        };

    } catch (error) {
        console.log('❌ Error getting IDs:');
        console.log('   Status:', error.response?.status);
        console.log('   Message:', error.response?.data?.message || error.message);

        if (error.response?.status === 401) {
            console.log('\n🔑 Authentication Issue:');
            console.log('   Your token might be expired. Please check your JWT token.');
            console.log('   Current token starts with:', headers['x-auth-token'].substring(0, 50) + '...');
        }

        return null;
    }
}

// Run the ID fetcher
if (require.main === module) {
    console.log('🏢 Getting Real Company and Bank Account IDs');
    console.log('Base URL:', BASE_URL);

    getRealIDs().catch(error => {
        console.error('❌ Failed to get IDs:', error);
        process.exit(1);
    });
}

module.exports = { getRealIDs };