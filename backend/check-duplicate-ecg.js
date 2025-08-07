require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function checkDuplicateECG() {
  try {
    console.log('Checking for duplicate users with email: ecgprojectops@gmail.com');
    
    // Search for all users with this email
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "ecgprojectops@gmail.com"`
    ).fetchAll();
    
    console.log(`Found ${resources.length} user(s) with this email:`);
    
    if (resources.length === 0) {
      console.log('❌ No users found with this email');
      return;
    }
    
    if (resources.length === 1) {
      console.log('✅ Only one user found - no duplicates');
      const user = resources[0];
      console.log('\nUser details:');
      console.log('ID:', user.id);
      console.log('UID:', user.uid);
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Role:', user.role);
      console.log('Status:', user.status);
      console.log('Created At:', user.createdAt);
      
      if (user.id === user.uid) {
        console.log('✅ ID and UID match');
      } else {
        console.log('❌ ID and UID DO NOT MATCH');
      }
    } else {
      console.log(`❌ Found ${resources.length} duplicate users!`);
      
      resources.forEach((user, index) => {
        console.log(`\n--- User ${index + 1} ---`);
        console.log('ID:', user.id);
        console.log('UID:', user.uid);
        console.log('Email:', user.email);
        console.log('Name:', user.name);
        console.log('Role:', user.role);
        console.log('Status:', user.status);
        console.log('Created At:', user.createdAt);
        
        if (user.id === user.uid) {
          console.log('✅ ID and UID match');
        } else {
          console.log('❌ ID and UID DO NOT MATCH');
        }
      });
      
      // Check if any have matching ID/UID
      const matchingUsers = resources.filter(user => user.id === user.uid);
      const mismatchedUsers = resources.filter(user => user.id !== user.uid);
      
      console.log(`\n--- Summary ---`);
      console.log(`Total users: ${resources.length}`);
      console.log(`Users with matching ID/UID: ${matchingUsers.length}`);
      console.log(`Users with mismatched ID/UID: ${mismatchedUsers.length}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDuplicateECG(); 