require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function checkAllAfiifiUsers() {
  try {
    console.log('Checking ALL users with afiifi in email...');
    
    // Search by partial email match
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE CONTAINS(c.email, "afiifi")`
    ).fetchAll();
    
    console.log(`Found ${resources.length} users with "afiifi" in email:`);
    
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
    });
    
    // Also check by exact email
    console.log('\n=== Checking exact email match ===');
    const { resources: exactMatch } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "afiifi@qna336.onmicrosoft.com"`
    ).fetchAll();
    
    console.log(`Found ${exactMatch.length} users with exact email match:`);
    exactMatch.forEach((user, index) => {
      console.log(`\n--- Exact Match ${index + 1} ---`);
      console.log('ID:', user.id);
      console.log('UID:', user.uid);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Status:', user.status);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllAfiifiUsers(); 