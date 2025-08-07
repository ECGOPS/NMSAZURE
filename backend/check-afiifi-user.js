require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function checkUser() {
  try {
    console.log('Checking for user: afiifi@qna336.onmicrosoft.com');
    
    // Search by email
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "afiifi@qna336.onmicrosoft.com"`
    ).fetchAll();
    
    if (resources.length > 0) {
      console.log('Found user:');
      console.log('Full user object:', JSON.stringify(resources[0], null, 2));
      console.log('ID:', resources[0].id);
      console.log('UID:', resources[0].uid);
      console.log('Email:', resources[0].email);
      console.log('Role:', resources[0].role);
      console.log('Status:', resources[0].status);
      console.log('Name:', resources[0].name);
      console.log('Display Name:', resources[0].displayName);
      console.log('Created At:', resources[0].createdAt);
      console.log('Updated At:', resources[0].updatedAt);
    } else {
      console.log('User not found by email');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser(); 