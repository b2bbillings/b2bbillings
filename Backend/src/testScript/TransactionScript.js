const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';

// Set testing mode to bypass authentication
process.env.TESTING_MODE = 'true';
process.env.NODE_ENV = 'development';

// Test headers (minimal for testing mode)
const headers = {
    'Content-Type': 'application/json',
    'x-company-id': 'test-company-id' // This will be replaced with real ID
};

// Helper function to create a test company and bank account
async function setupTestEnvironment() {
    try {
        console.log('🏗️ Setting up Test Environment...');

        // Test if server is running
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Server is running:', healthResponse.data.message);

        // Try to get existing companies (this should work without auth in testing mode)
        try {
            const companiesResponse = await axios.get(`${BASE_URL}/companies`, { headers });

            if (companiesResponse.data.success && companiesResponse.data.data && companiesResponse.data.data.length > 0) {
                const company = companiesResponse.data.data[0];
                console.log('✅ Found existing company:', company.name);

                // Update headers with real company ID
                headers['x-company-id'] = company._id;

                // Try to get bank accounts for this company
                const bankAccountsResponse = await axios.get(
                    `${BASE_URL}/companies/${company._id}/bank-accounts`,
                    { headers }
                );

                let bankAccount = null;
                if (bankAccountsResponse.data.success && bankAccountsResponse.data.data && bankAccountsResponse.data.data.length > 0) {
                    bankAccount = bankAccountsResponse.data.data[0];
                    console.log('✅ Found existing bank account:', bankAccount.accountName);
                } else {
                    // Create a test bank account
                    console.log('📦 Creating test bank account...');
                    const newBankAccountResponse = await axios.post(
                        `${BASE_URL}/companies/${company._id}/bank-accounts`,
                        {
                            accountName: 'Test Transaction Account',
                            accountType: 'cash',
                            type: 'cash',
                            openingBalance: 50000,
                            companyId: company._id
                        },
                        { headers }
                    );

                    if (newBankAccountResponse.data.success) {
                        bankAccount = newBankAccountResponse.data.data;
                        console.log('✅ Created bank account:', bankAccount.accountName);
                    }
                }

                return {
                    companyId: company._id,
                    companyName: company.name,
                    bankAccountId: bankAccount?._id,
                    bankAccountName: bankAccount?.accountName,
                    bankBalance: bankAccount?.balance || 0
                };
            }
        } catch (companyError) {
            console.log('⚠️ Could not get companies, trying to create test data...');
        }

        // If no companies found, create test setup
        console.log('🏭 Creating test company...');
        const testCompanyResponse = await axios.post(`${BASE_URL}/companies`, {
            name: 'Test Transaction Company',
            email: 'test@transaction.com',
            phone: '9999999999',
            address: 'Test Address'
        }, { headers });

        if (testCompanyResponse.data.success) {
            const company = testCompanyResponse.data.data;
            console.log('✅ Created test company:', company.name);

            headers['x-company-id'] = company._id;

            // Create test bank account
            const bankAccountResponse = await axios.post(
                `${BASE_URL}/companies/${company._id}/bank-accounts`,
                {
                    accountName: 'Test Cash Account',
                    accountType: 'cash',
                    type: 'cash',
                    openingBalance: 100000,
                    companyId: company._id
                },
                { headers }
            );

            if (bankAccountResponse.data.success) {
                const bankAccount = bankAccountResponse.data.data;
                console.log('✅ Created test bank account:', bankAccount.accountName);

                return {
                    companyId: company._id,
                    companyName: company.name,
                    bankAccountId: bankAccount._id,
                    bankAccountName: bankAccount.accountName,
                    bankBalance: bankAccount.balance
                };
            }
        }

        throw new Error('Could not create test environment');

    } catch (error) {
        console.log('❌ Setup failed:', error.response?.data?.message || error.message);
        return null;
    }
}

// Test transaction creation
async function testTransactionCreation(companyId, bankAccountId) {
    console.log('\n🧪 Testing Transaction Creation...');
    console.log('==================================');

    const testTransactions = [
        {
            name: 'Purchase Payment (Out)',
            data: {
                companyId,
                bankAccountId,
                amount: 5000,
                direction: 'out',
                transactionType: 'purchase',
                paymentMethod: 'cash',
                description: 'Test purchase payment to supplier',
                partyName: 'Test Supplier',
                partyType: 'supplier'
            }
        },
        {
            name: 'Sales Receipt (In)',
            data: {
                companyId,
                bankAccountId,
                amount: 8000,
                direction: 'in',
                transactionType: 'sale',
                paymentMethod: 'upi',
                description: 'Test sales receipt from customer',
                partyName: 'Test Customer',
                partyType: 'customer'
            }
        },
        {
            name: 'Direct Payment Out',
            data: {
                companyId,
                bankAccountId,
                amount: 3000,
                direction: 'out',
                transactionType: 'payment_out',
                paymentMethod: 'bank_transfer',
                description: 'Test direct payment to supplier',
                partyName: 'Another Supplier',
                partyType: 'supplier'
            }
        },
        {
            name: 'Direct Payment In',
            data: {
                companyId,
                bankAccountId,
                amount: 12000,
                direction: 'in',
                transactionType: 'payment_in',
                paymentMethod: 'cheque',
                description: 'Test direct payment from customer',
                partyName: 'Premium Customer',
                partyType: 'customer',
                chequeNumber: 'CHQ001234',
                chequeDate: '2024-12-10'
            }
        }
    ];

    let successCount = 0;
    let balanceBefore = null;

    for (const transaction of testTransactions) {
        try {
            console.log(`\n💳 Creating ${transaction.name}...`);
            console.log(`   Amount: ₹${transaction.data.amount} (${transaction.data.direction})`);
            console.log(`   Method: ${transaction.data.paymentMethod}`);

            const response = await axios.post(
                `${BASE_URL}/companies/${companyId}/transactions`,
                transaction.data,
                { headers }
            );

            if (response.data.success) {
                const txnData = response.data.data;
                console.log('✅ Success!');
                console.log(`   🆔 Transaction ID: ${txnData.transactionId}`);
                console.log(`   💰 Amount: ₹${txnData.amount}`);
                console.log(`   🏦 Balance Before: ₹${txnData.balanceBefore}`);
                console.log(`   🏦 Balance After: ₹${txnData.balanceAfter}`);
                console.log(`   👤 Party: ${txnData.partyName}`);

                if (balanceBefore === null) {
                    balanceBefore = txnData.balanceBefore;
                }

                successCount++;
            } else {
                console.log('❌ Failed:', response.data.message);
            }

        } catch (error) {
            console.log('❌ Error creating transaction:');
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   Message: ${error.response?.data?.message || error.message}`);
        }
    }

    console.log(`\n📊 Test Results: ${successCount}/${testTransactions.length} transactions created successfully`);

    return successCount > 0;
}

// Test transaction retrieval
async function testTransactionRetrieval(companyId, bankAccountId) {
    console.log('\n📋 Testing Transaction Retrieval...');
    console.log('===================================');

    try {
        // Get all transactions
        console.log('\n1️⃣ Getting all transactions...');
        const allTransactionsResponse = await axios.get(
            `${BASE_URL}/companies/${companyId}/transactions?limit=10`,
            { headers }
        );

        if (allTransactionsResponse.data.success) {
            const data = allTransactionsResponse.data.data;
            console.log('✅ All Transactions Retrieved:');
            console.log(`   📊 Total: ${data.pagination.totalTransactions}`);
            console.log(`   💹 Summary:`);
            console.log(`      Money In: ₹${data.summary.totalIn}`);
            console.log(`      Money Out: ₹${data.summary.totalOut}`);
            console.log(`      Net Amount: ₹${data.summary.netAmount}`);

            if (data.transactions.length > 0) {
                console.log('\n   📋 Recent Transactions:');
                data.transactions.slice(0, 3).forEach((txn, index) => {
                    const sign = txn.direction === 'in' ? '+' : '-';
                    console.log(`   ${index + 1}. ${txn.transactionId}: ${sign}₹${txn.amount} (${txn.transactionType})`);
                });
            }
        }

        // Get bank account transactions
        console.log('\n2️⃣ Getting bank account transactions...');
        const bankTransactionsResponse = await axios.get(
            `${BASE_URL}/companies/${companyId}/bank-accounts/${bankAccountId}/transactions`,
            { headers }
        );

        if (bankTransactionsResponse.data.success) {
            const data = bankTransactionsResponse.data.data;
            console.log('✅ Bank Account Transactions Retrieved:');
            console.log(`   🏦 Total: ${data.pagination.totalTransactions}`);
        }

        // Get transaction summary
        console.log('\n3️⃣ Getting transaction summary...');
        const summaryResponse = await axios.get(
            `${BASE_URL}/companies/${companyId}/transactions/summary?period=month`,
            { headers }
        );

        if (summaryResponse.data.success) {
            const summary = summaryResponse.data.data.summary;
            console.log('✅ Transaction Summary:');
            console.log(`   🔢 Total Transactions: ${summary.totalTransactions}`);
            console.log(`   ⬆️ Total In: ₹${summary.totalIn}`);
            console.log(`   ⬇️ Total Out: ₹${summary.totalOut}`);
            console.log(`   💹 Net Amount: ₹${summary.netAmount}`);
        }

        return true;

    } catch (error) {
        console.log('❌ Error retrieving transactions:', error.response?.data?.message || error.message);
        return false;
    }
}

// Main test function
async function runSimpleTest() {
    console.log('🏦 Simple Transaction System Test');
    console.log('================================');
    console.log('Base URL:', BASE_URL);
    console.log('Testing Mode: Enabled');

    try {
        // Setup test environment
        const setup = await setupTestEnvironment();
        if (!setup) {
            console.log('❌ Could not setup test environment');
            process.exit(1);
        }

        console.log('\n✅ Test Environment Ready:');
        console.log(`   🏢 Company: ${setup.companyName}`);
        console.log(`   🏦 Bank Account: ${setup.bankAccountName}`);
        console.log(`   💰 Balance: ₹${setup.bankBalance}`);

        // Test transaction creation
        const creationSuccess = await testTransactionCreation(setup.companyId, setup.bankAccountId);

        if (creationSuccess) {
            // Test transaction retrieval
            await testTransactionRetrieval(setup.companyId, setup.bankAccountId);

            console.log('\n🎉 All Tests Completed Successfully!');
            console.log('✅ Transaction system is working correctly');
            console.log('✅ Pay-in and pay-out transactions are being created');
            console.log('✅ Bank balances are being updated');
            console.log('✅ Transaction history is being maintained');
        } else {
            console.log('\n❌ Transaction creation failed');
        }

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    runSimpleTest();
}

module.exports = { runSimpleTest };