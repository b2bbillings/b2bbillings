const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_COMPANY_ID = '6845147f3f012c95e10e4323'; // Replace with actual company ID

const headers = {
    'Content-Type': 'application/json',
    'x-company-id': '6845147f3f012c95e10e4323',
    'x-auth-token': 'test-token',
};

// Test purchase data with payment
const purchaseTestData = {
    supplierName: 'Test Auto Supplier',
    supplierMobile: '9876543210',
    supplier: {
        name: 'Test Auto Supplier',
        mobile: '9876543210',
        address: 'Test Address',
        type: 'supplier'
    },
    purchaseNumber: 'PUR-TEST-001',
    purchaseDate: '2024-12-10',
    gstEnabled: true,
    companyId: '6845147f3f012c95e10e4323',
    items: [
        {
            itemName: 'Test Product 1',
            quantity: 10,
            rate: 100,
            unit: 'pcs',
            taxRate: 18,
            amount: 1000,
            cgstAmount: 90,
            sgstAmount: 90,
            igstAmount: 0,
            taxAmount: 180,
            finalAmount: 1180
        },
        {
            itemName: 'Test Product 2',
            quantity: 5,
            rate: 200,
            unit: 'pcs',
            taxRate: 18,
            amount: 1000,
            cgstAmount: 90,
            sgstAmount: 90,
            igstAmount: 0,
            taxAmount: 180,
            finalAmount: 1180
        }
    ],
    payment: {
        method: 'cash',
        paidAmount: 2360,
        dueAmount: 0,
        status: 'paid'
    },
    notes: 'Test purchase with automatic transaction creation',
    // ✅ NEW: Bank transaction settings
    createBankTransaction: true,
    paymentMethod: 'cash',
    status: 'completed'
};

async function testPurchaseWithTransaction() {
    console.log('🛒 Testing Purchase with Automatic Transaction Creation');
    console.log('=====================================================');

    try {
        // Step 1: Create/Get Bank Account
        console.log('\n1️⃣ Setting up Bank Account...');
        const bankAccount = await createTestBankAccount();

        if (bankAccount) {
            purchaseTestData.bankAccountId = bankAccount._id;
            console.log('✅ Using Bank Account:', bankAccount.accountName, '(Balance: ₹' + bankAccount.balance + ')');
        }

        // Step 2: Get initial bank balance
        console.log('\n2️⃣ Checking Initial Bank Balance...');
        const initialBalance = await getBankAccountBalance(bankAccount._id);
        console.log('💰 Initial Balance: ₹' + initialBalance);

        // Step 3: Create Purchase with Payment
        console.log('\n3️⃣ Creating Purchase with Bank Transaction...');
        console.log('📤 Purchase Data:', JSON.stringify({
            ...purchaseTestData,
            items: `${purchaseTestData.items.length} items`,
            totalAmount: purchaseTestData.items.reduce((sum, item) => sum + item.finalAmount, 0)
        }, null, 2));

        const purchaseResponse = await axios.post(
            `${BASE_URL}/companies/${TEST_COMPANY_ID}/purchases`,
            purchaseTestData,
            { headers }
        );

        console.log('✅ Purchase Created Successfully:');
        console.log('   Purchase ID:', purchaseResponse.data.data.purchase._id);
        console.log('   Purchase Number:', purchaseResponse.data.data.purchase.purchaseNumber);
        console.log('   Total Amount: ₹' + purchaseResponse.data.data.purchase.totals.finalTotal);
        console.log('   Payment Status:', purchaseResponse.data.data.purchase.payment.status);

        // Check if bank transaction was created
        if (purchaseResponse.data.data.bankTransaction) {
            const bankTxn = purchaseResponse.data.data.bankTransaction;
            console.log('\n🏦 Bank Transaction Details:');
            console.log('   Created:', bankTxn.created);
            if (bankTxn.created) {
                console.log('   Transaction ID:', bankTxn.transactionId);
                console.log('   Amount: ₹' + bankTxn.amount);
                console.log('   Balance After: ₹' + bankTxn.balanceAfter);
            } else {
                console.log('   Reason:', bankTxn.reason);
            }
        }

        // Step 4: Verify Bank Balance Changed
        console.log('\n4️⃣ Verifying Bank Balance Update...');
        const newBalance = await getBankAccountBalance(bankAccount._id);
        const expectedBalance = initialBalance - purchaseTestData.payment.paidAmount;

        console.log('💰 Balance After Purchase: ₹' + newBalance);
        console.log('💰 Expected Balance: ₹' + expectedBalance);
        console.log('💰 Balance Change: ₹' + (newBalance - initialBalance));

        if (Math.abs(newBalance - expectedBalance) < 0.01) {
            console.log('✅ Bank balance updated correctly!');
        } else {
            console.log('❌ Bank balance mismatch!');
        }

        // Step 5: Check Transaction History
        console.log('\n5️⃣ Checking Transaction History...');
        await checkTransactionHistory(bankAccount._id, purchaseResponse.data.data.purchase._id);

        // Step 6: Get Transaction Summary
        console.log('\n6️⃣ Getting Updated Transaction Summary...');
        await getTransactionSummary();

        return purchaseResponse.data.data;

    } catch (error) {
        console.log('❌ Purchase Transaction Test Failed:');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.message || error.message);
        if (error.response?.data?.debug && process.env.NODE_ENV === 'development') {
            console.log('   Debug Info:', error.response.data.debug);
        }
        return null;
    }
}

async function createTestBankAccount() {
    try {
        const bankAccountData = {
            accountName: 'Test Business Cash',
            accountType: 'cash',
            type: 'cash',
            openingBalance: 100000, // ₹1,00,000 starting balance
            companyId: TEST_COMPANY_ID
        };

        const response = await axios.post(
            `${BASE_URL}/companies/${TEST_COMPANY_ID}/bank-accounts`,
            bankAccountData,
            { headers }
        );

        return response.data.data;
    } catch (error) {
        console.log('⚠️ Bank account might already exist, trying to get existing...');

        try {
            const response = await axios.get(
                `${BASE_URL}/companies/${TEST_COMPANY_ID}/bank-accounts`,
                { headers }
            );

            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0]; // Use first available account
            }
        } catch (getError) {
            console.log('❌ Could not get bank accounts:', getError.message);
        }

        return null;
    }
}

async function getBankAccountBalance(bankAccountId) {
    try {
        const response = await axios.get(
            `${BASE_URL}/companies/${TEST_COMPANY_ID}/bank-accounts/${bankAccountId}`,
            { headers }
        );
        return response.data.data.balance || 0;
    } catch (error) {
        console.log('⚠️ Could not get bank balance:', error.message);
        return 0;
    }
}

async function checkTransactionHistory(bankAccountId, purchaseId) {
    try {
        const response = await axios.get(
            `${BASE_URL}/companies/${TEST_COMPANY_ID}/bank-accounts/${bankAccountId}/transactions`,
            { headers }
        );

        console.log('📊 Recent Transactions for Bank Account:');
        const transactions = response.data.data.transactions || [];

        if (transactions.length === 0) {
            console.log('   No transactions found');
            return;
        }

        transactions.slice(0, 5).forEach((txn, index) => {
            const isRelated = txn.referenceId === purchaseId;
            console.log(`   ${index + 1}. ${txn.transactionId} - ${txn.direction === 'in' ? '+' : '-'}₹${txn.amount}`);
            console.log(`      Type: ${txn.transactionType}, Description: ${txn.description}`);
            console.log(`      Date: ${new Date(txn.transactionDate).toLocaleDateString()}`);
            if (isRelated) {
                console.log('      🎯 Related to our test purchase!');
            }
            console.log('');
        });

        // Look for our specific purchase transaction
        const purchaseTransaction = transactions.find(txn => txn.referenceId === purchaseId);
        if (purchaseTransaction) {
            console.log('✅ Found Purchase Transaction in History:');
            console.log('   Transaction ID:', purchaseTransaction.transactionId);
            console.log('   Amount: ₹' + purchaseTransaction.amount);
            console.log('   Direction:', purchaseTransaction.direction);
            console.log('   Reference:', purchaseTransaction.referenceNumber);
        } else {
            console.log('❌ Purchase transaction not found in history');
        }

    } catch (error) {
        console.log('❌ Error checking transaction history:', error.message);
    }
}

async function getTransactionSummary() {
    try {
        const response = await axios.get(
            `${BASE_URL}/companies/${TEST_COMPANY_ID}/transactions/summary?period=today`,
            { headers }
        );

        const summary = response.data.data.summary;
        console.log('📈 Today\'s Transaction Summary:');
        console.log('   Total Transactions:', summary.totalTransactions);
        console.log('   Money In: ₹' + summary.totalIn);
        console.log('   Money Out: ₹' + summary.totalOut);
        console.log('   Net Flow: ₹' + summary.netAmount);

    } catch (error) {
        console.log('❌ Error getting transaction summary:', error.message);
    }
}

// Run the test
if (require.main === module) {
    process.env.TESTING_MODE = 'true';
    process.env.NODE_ENV = 'development';

    console.log('🧪 Purchase-Transaction Integration Test');
    console.log('Company ID:', TEST_COMPANY_ID);
    console.log('Base URL:', BASE_URL);

    testPurchaseWithTransaction().then(result => {
        if (result) {
            console.log('\n🎉 Purchase Transaction Test Completed Successfully!');
        } else {
            console.log('\n❌ Purchase Transaction Test Failed!');
            process.exit(1);
        }
    }).catch(error => {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testPurchaseWithTransaction,
    purchaseTestData
};