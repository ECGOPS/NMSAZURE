require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function debugJWTUserCreation() {
  try {
    console.log('Debugging JWT user creation...');
    
    // Check the afiifi user to see what happened
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "afiifi@qna336.onmicrosoft.com"`
    ).fetchAll();
    
    if (resources.length > 0) {
      const user = resources[0];
      console.log('Current afiifi user:');
      console.log('ID:', user.id);
      console.log('UID:', user.uid);
      console.log('Email:', user.email);
      console.log('Created At:', user.createdAt);
      
      // Check if ID and UID match
      if (user.id === user.uid) {
        console.log('✅ ID and UID match');
      } else {
        console.log('❌ ID and UID DO NOT MATCH');
        console.log('This is the problem!');
      }
    }
    
    // Also check the test user for comparison
    console.log('\n--- Checking test user for comparison ---');
    const { resources: testUsers } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "test@qna336.onmicrosoft.com"`
    ).fetchAll();
    
    if (testUsers.length > 0) {
      const testUser = testUsers[0];
      console.log('Test user:');
      console.log('ID:', testUser.id);
      console.log('UID:', testUser.uid);
      console.log('Email:', testUser.email);
      
      if (testUser.id === testUser.uid) {
        console.log('✅ Test user ID and UID match');
      } else {
        console.log('❌ Test user ID and UID DO NOT MATCH');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugJWTUserCreation(); 