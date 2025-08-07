require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function fixExistingPreRegistered() {
  try {
    console.log('🔍 Finding existing users with pre_registered status...');
    
    // Find users with pre_registered status
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.status = 'pre_registered'`
    ).fetchAll();
    
    console.log(`Found ${resources.length} users with pre_registered status:`);
    
    if (resources.length === 0) {
      console.log('✅ No users with pre_registered status found');
      return;
    }
    
    let updatedCount = 0;
    
    for (const user of resources) {
      console.log(`\n--- User: ${user.email} ---`);
      console.log('Current role:', user.role);
      console.log('Current status:', user.status);
      
      // Check if user will appear in pending list
      if (user.status === 'pre_registered') {
        console.log('✅ User will appear in pending list (status: pre_registered)');
        console.log('   Original role preserved:', user.role);
        updatedCount++;
      } else if (user.role === 'pending') {
        console.log('✅ User will appear in pending list (role: pending)');
        updatedCount++;
      } else {
        console.log('❌ User will NOT appear in pending list');
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`Total users with pre_registered status: ${resources.length}`);
    console.log(`Users that will appear in pending list: ${updatedCount}`);
    console.log(`Users that will NOT appear in pending list: ${resources.length - updatedCount}`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Users will appear in the pending list for admin approval!');
      console.log('   Their original roles are preserved.');
    } else {
      console.log('\n✅ All users have correct status/roles.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixExistingPreRegistered(); 