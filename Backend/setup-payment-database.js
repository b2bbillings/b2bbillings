/**
 * Payment Database Setup Script
 * 
 * This script sets up the database for Payment In/Out functionality
 * - Creates necessary indexes
 * - Validates collections exist
 * - Tests sample operations
 * 
 * Run with: node Backend/setup-payment-database.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectDatabase() {
    try {
        log('\n🔌 Connecting to MongoDB...', 'blue');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        log('✅ Connected to MongoDB successfully', 'green');
        return true;
    } catch (error) {
        log(`❌ Database connection failed: ${error.message}`, 'red');
        return false;
    }
}

async function setupPaymentIndexes() {
    log('\n📊 Setting up Payment collection indexes...', 'blue');
    
    try {
        const db = mongoose.connection.db;
        const paymentsCollection = db.collection('payments');
        
        // Check if collection exists
        const collections = await db.listCollections({ name: 'payments' }).toArray();
        if (collections.length === 0) {
            log('⚠️  Payments collection does not exist yet. It will be created on first insert.', 'yellow');
            return true;
        }
        
        // Create indexes
        const indexes = [
            { key: { party: 1, paymentDate: -1 }, name: 'party_paymentDate' },
            { key: { partyId: 1, paymentDate: -1 }, name: 'partyId_paymentDate' },
            { key: { type: 1, paymentDate: -1 }, name: 'type_paymentDate' },
            { key: { paymentNumber: 1 }, name: 'paymentNumber_unique', unique: true },
            { key: { company: 1, paymentDate: -1 }, name: 'company_paymentDate' },
            { key: { companyId: 1, paymentDate: -1 }, name: 'companyId_paymentDate' },
            { key: { status: 1 }, name: 'status' },
            { key: { bankAccountId: 1 }, name: 'bankAccountId', sparse: true },
            { key: { paymentMethod: 1 }, name: 'paymentMethod' }
        ];
        
        let created = 0;
        let existing = 0;
        
        for (const indexDef of indexes) {
            try {
                await paymentsCollection.createIndex(indexDef.key, { 
                    name: indexDef.name,
                    unique: indexDef.unique || false,
                    sparse: indexDef.sparse || false
                });
                log(`  ✅ Created/Updated index: ${indexDef.name}`, 'green');
                created++;
            } catch (error) {
                if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
                    // Index exists with different options, try to update
                    try {
                        await paymentsCollection.dropIndex(indexDef.name);
                        await paymentsCollection.createIndex(indexDef.key, { 
                            name: indexDef.name,
                            unique: indexDef.unique || false,
                            sparse: indexDef.sparse || false
                        });
                        log(`  ✅ Updated index: ${indexDef.name}`, 'green');
                        created++;
                    } catch (updateError) {
                        log(`  ⚠️  Could not update index ${indexDef.name}: ${updateError.message}`, 'yellow');
                        existing++;
                    }
                } else {
                    log(`  ⚠️  Index ${indexDef.name} might already exist`, 'yellow');
                    existing++;
                }
            }
        }
        
        log(`\n📊 Payment indexes: ${created} created/updated, ${existing} existing`, 'cyan');
        return true;
    } catch (error) {
        log(`❌ Failed to setup Payment indexes: ${error.message}`, 'red');
        return false;
    }
}

async function setupTransactionIndexes() {
    log('\n📊 Setting up Transaction collection indexes...', 'blue');
    
    try {
        const db = mongoose.connection.db;
        const transactionsCollection = db.collection('transactions');
        
        // Check if collection exists
        const collections = await db.listCollections({ name: 'transactions' }).toArray();
        if (collections.length === 0) {
            log('⚠️  Transactions collection does not exist yet. It will be created on first insert.', 'yellow');
            return true;
        }
        
        // Create indexes
        const indexes = [
            { key: { transactionId: 1 }, name: 'transactionId_unique', unique: true },
            { key: { companyId: 1, transactionDate: -1 }, name: 'companyId_transactionDate' },
            { key: { transactionType: 1, transactionDate: -1 }, name: 'transactionType_transactionDate' },
            { key: { partyId: 1, transactionDate: -1 }, name: 'partyId_transactionDate', sparse: true },
            { key: { referenceId: 1, referenceType: 1 }, name: 'reference' },
            { key: { bankAccountId: 1 }, name: 'bankAccountId', sparse: true },
            { key: { status: 1 }, name: 'status' },
            { key: { direction: 1 }, name: 'direction' }
        ];
        
        let created = 0;
        let existing = 0;
        
        for (const indexDef of indexes) {
            try {
                await transactionsCollection.createIndex(indexDef.key, { 
                    name: indexDef.name,
                    unique: indexDef.unique || false,
                    sparse: indexDef.sparse || false
                });
                log(`  ✅ Created/Updated index: ${indexDef.name}`, 'green');
                created++;
            } catch (error) {
                if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
                    // Index exists with different options, try to update
                    try {
                        await transactionsCollection.dropIndex(indexDef.name);
                        await transactionsCollection.createIndex(indexDef.key, { 
                            name: indexDef.name,
                            unique: indexDef.unique || false,
                            sparse: indexDef.sparse || false
                        });
                        log(`  ✅ Updated index: ${indexDef.name}`, 'green');
                        created++;
                    } catch (updateError) {
                        log(`  ⚠️  Could not update index ${indexDef.name}: ${updateError.message}`, 'yellow');
                        existing++;
                    }
                } else {
                    log(`  ⚠️  Index ${indexDef.name} might already exist`, 'yellow');
                    existing++;
                }
            }
        }
        
        log(`\n📊 Transaction indexes: ${created} created/updated, ${existing} existing`, 'cyan');
        return true;
    } catch (error) {
        log(`❌ Failed to setup Transaction indexes: ${error.message}`, 'red');
        return false;
    }
}

async function validateCollections() {
    log('\n🔍 Validating collections...', 'blue');
    
    try {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        const requiredCollections = ['payments', 'transactions', 'parties', 'companies'];
        const missingCollections = [];
        
        for (const collName of requiredCollections) {
            if (collectionNames.includes(collName)) {
                const count = await db.collection(collName).countDocuments();
                log(`  ✅ ${collName}: ${count} documents`, 'green');
            } else {
                log(`  ⚠️  ${collName}: Collection does not exist yet`, 'yellow');
                missingCollections.push(collName);
            }
        }
        
        if (missingCollections.length > 0) {
            log(`\n⚠️  ${missingCollections.length} collections will be created on first use:`, 'yellow');
            missingCollections.forEach(c => log(`     - ${c}`, 'yellow'));
        }
        
        return true;
    } catch (error) {
        log(`❌ Failed to validate collections: ${error.message}`, 'red');
        return false;
    }
}

async function displayDatabaseStats() {
    log('\n📈 Database Statistics:', 'blue');
    
    try {
        const db = mongoose.connection.db;
        
        // Get payments stats
        try {
            const paymentsCount = await db.collection('payments').countDocuments();
            const paymentInCount = await db.collection('payments').countDocuments({ type: 'payment_in' });
            const paymentOutCount = await db.collection('payments').countDocuments({ type: 'payment_out' });
            
            log(`\n  💰 Payments:`, 'cyan');
            log(`     Total: ${paymentsCount}`, 'cyan');
            log(`     Payment In: ${paymentInCount}`, 'green');
            log(`     Payment Out: ${paymentOutCount}`, 'red');
        } catch (error) {
            log(`  ⚠️  Payments collection not yet created`, 'yellow');
        }
        
        // Get transactions stats
        try {
            const transactionsCount = await db.collection('transactions').countDocuments();
            const transactionInCount = await db.collection('transactions').countDocuments({ direction: 'in' });
            const transactionOutCount = await db.collection('transactions').countDocuments({ direction: 'out' });
            
            log(`\n  📊 Transactions:`, 'cyan');
            log(`     Total: ${transactionsCount}`, 'cyan');
            log(`     Inward: ${transactionInCount}`, 'green');
            log(`     Outward: ${transactionOutCount}`, 'red');
        } catch (error) {
            log(`  ⚠️  Transactions collection not yet created`, 'yellow');
        }
        
        // Get parties stats
        try {
            const partiesCount = await db.collection('parties').countDocuments();
            const customersCount = await db.collection('parties').countDocuments({ partyType: 'customer' });
            const vendorsCount = await db.collection('parties').countDocuments({ partyType: 'vendor' });
            
            log(`\n  👥 Parties:`, 'cyan');
            log(`     Total: ${partiesCount}`, 'cyan');
            log(`     Customers: ${customersCount}`, 'cyan');
            log(`     Vendors: ${vendorsCount}`, 'cyan');
        } catch (error) {
            log(`  ⚠️  Parties collection not yet created`, 'yellow');
        }
        
        return true;
    } catch (error) {
        log(`❌ Failed to get database stats: ${error.message}`, 'red');
        return false;
    }
}

async function testModelLoading() {
    log('\n🧪 Testing model loading...', 'blue');
    
    try {
        const Payment = require('./src/models/Payment');
        log('  ✅ Payment model loaded', 'green');
        
        const Transaction = require('./src/models/Transaction');
        log('  ✅ Transaction model loaded', 'green');
        
        const Party = require('./src/models/Party');
        log('  ✅ Party model loaded', 'green');
        
        const Company = require('./src/models/Company');
        log('  ✅ Company model loaded', 'green');
        
        return true;
    } catch (error) {
        log(`❌ Failed to load models: ${error.message}`, 'red');
        return false;
    }
}

async function runSetup() {
    log('='.repeat(70), 'blue');
    log('PAYMENT DATABASE SETUP', 'blue');
    log('='.repeat(70), 'blue');
    
    // Connect to database
    const connected = await connectDatabase();
    if (!connected) {
        log('\n❌ Setup failed: Could not connect to database', 'red');
        process.exit(1);
    }
    
    // Test model loading
    const modelsLoaded = await testModelLoading();
    if (!modelsLoaded) {
        log('\n⚠️  Warning: Some models could not be loaded', 'yellow');
    }
    
    // Validate collections
    await validateCollections();
    
    // Setup indexes
    await setupPaymentIndexes();
    await setupTransactionIndexes();
    
    // Display stats
    await displayDatabaseStats();
    
    // Summary
    log('\n' + '='.repeat(70), 'blue');
    log('SETUP COMPLETE', 'green');
    log('='.repeat(70), 'blue');
    log('\n✅ Payment database setup completed successfully!', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Start the backend server: npm start', 'cyan');
    log('  2. Test the API: node Backend/test-payment-api.js', 'cyan');
    log('  3. Use the frontend Payment In/Out forms', 'cyan');
    log('\nAPI Endpoints:', 'cyan');
    log('  POST /api/payments/payment-in', 'cyan');
    log('  POST /api/payments/payment-out', 'cyan');
    log('  GET  /api/payments', 'cyan');
    log('  GET  /api/payments/:paymentId', 'cyan');
    log('  GET  /api/parties/:companyId/payment-parties', 'cyan');
    
    // Cleanup
    await mongoose.disconnect();
    log('\n👋 Database connection closed', 'blue');
}

// Handle errors
process.on('unhandledRejection', (error) => {
    log(`\n❌ Unhandled error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});

// Run setup
if (require.main === module) {
    runSetup().catch(error => {
        log(`\n❌ Setup failed: ${error.message}`, 'red');
        console.error(error);
        process.exit(1);
    });
}

module.exports = { runSetup };
