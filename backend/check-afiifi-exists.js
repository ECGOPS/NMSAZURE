require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function checkAfiifiExists() {
  try {
    const email = 'afiifi@qna336.onmicrosoft.com';
    console.log(`Checking if user exists: ${email}`);
    
    // Search by email
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "${email}"`
    ).fetchAll();
    
    if (resources.length > 0) {
      console.log('✅ User found in database');
      console.log('ID:', resources[0].id);
      console.log('UID:', resources[0].uid);
      console.log('Email:', resources[0].email);
      console.log('Role:', resources[0].role);
      console.log('Status:', resources[0].status);
    } else {
      console.log('❌ User NOT found in database');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAfiifiExists(); 