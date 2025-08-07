require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function searchAfiifi() {
  try {
    console.log('Searching for afiifi user with different queries...');
    
    // Search by exact email
    console.log('\n1. Searching by exact email:');
    const { resources: exactMatch } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "afiifi@qna336.onmicrosoft.com"`
    ).fetchAll();
    console.log(`Found ${exactMatch.length} users with exact email`);
    exactMatch.forEach(user => {
      console.log('- ID:', user.id, 'UID:', user.uid, 'Email:', user.email);
    });
    
    // Search by partial email
    console.log('\n2. Searching by partial email (afiifi):');
    const { resources: partialMatch } = await container.items.query(
      `SELECT * FROM c WHERE CONTAINS(c.email, "afiifi")`
    ).fetchAll();
    console.log(`Found ${partialMatch.length} users with partial email`);
    partialMatch.forEach(user => {
      console.log('- ID:', user.id, 'UID:', user.uid, 'Email:', user.email);
    });
    
    // Search by domain
    console.log('\n3. Searching by domain (qna336.onmicrosoft.com):');
    const { resources: domainMatch } = await container.items.query(
      `SELECT * FROM c WHERE CONTAINS(c.email, "qna336.onmicrosoft.com")`
    ).fetchAll();
    console.log(`Found ${domainMatch.length} users with domain`);
    domainMatch.forEach(user => {
      console.log('- ID:', user.id, 'UID:', user.uid, 'Email:', user.email);
    });
    
    // Search by specific ID
    console.log('\n4. Searching by specific ID:');
    const specificId = '4743f1e8-6540-47db-83d6-09cf18f9988c';
    try {
      const { resource: userById } = await container.item(specificId, specificId).read();
      if (userById) {
        console.log('Found user by ID:', userById.email, 'UID:', userById.uid);
      } else {
        console.log('User not found by ID');
      }
    } catch (error) {
      console.log('Error reading user by ID:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

searchAfiifi(); 