require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function checkAllUsers() {
  try {
    console.log('Checking all users in database...');
    
    // Get all users
    const { resources } = await container.items.query(
      `SELECT * FROM c ORDER BY c.email`
    ).fetchAll();
    
    console.log(`Found ${resources.length} total users:`);
    
    resources.forEach((user, index) => {
      console.log(`\n--- User ${index + 1} ---`);
      console.log('ID:', user.id);
      console.log('UID:', user.uid);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Status:', user.status);
      console.log('Name:', user.name);
      console.log('Created At:', user.createdAt);
      console.log('Updated At:', user.updatedAt);
      
      // Check if ID and UID match
      if (user.id === user.uid) {
        console.log('✅ ID and UID match');
      } else {
        console.log('❌ ID and UID DO NOT MATCH');
      }
    });
    
    // Check for duplicates
    const emailCounts = {};
    resources.forEach(user => {
      emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
    });
    
    console.log('\n=== Email Duplicate Check ===');
    Object.entries(emailCounts).forEach(([email, count]) => {
      if (count > 1) {
        console.log(`❌ Email "${email}" has ${count} users`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllUsers(); 