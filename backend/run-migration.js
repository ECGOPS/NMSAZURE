#!/usr/bin/env node

require('dotenv').config();
const { migrateAllFromFirebase, getMigrationSummary } = require('./firebase-direct-migration.js');

async function runMigration() {
  console.log('🚀 Starting Enhanced Firebase to Cosmos DB Migration');
  console.log('==================================================');
  
  // Check required environment variables
  const requiredEnvVars = [
    'COSMOS_DB_ENDPOINT',
    'COSMOS_DB_KEY', 
    'COSMOS_DB_DATABASE'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.log('\nPlease set these variables in your .env file or environment.');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
  console.log(`📊 Cosmos DB Endpoint: ${process.env.COSMOS_DB_ENDPOINT}`);
  console.log(`📊 Database: ${process.env.COSMOS_DB_DATABASE}`);
  
  try {
    // Get pre-migration summary
    console.log('\n📋 Pre-migration Summary:');
    await getMigrationSummary();
    
    // Run the migration
    console.log('\n🔄 Starting migration process...');
    await migrateAllFromFirebase();
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your Firebase credentials');
    console.log('2. Verify Azure Cosmos DB connection');
    console.log('3. Ensure all required collections exist in Firebase');
    console.log('4. Check network connectivity');
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration }; 