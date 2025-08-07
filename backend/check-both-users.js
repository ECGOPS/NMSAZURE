require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function checkUsers() {
  try {
    const usersToCheck = [
      'afiifi@qna336.onmicrosoft.com',
      'test@qna336.onmicrosoft.com'
    ];

    for (const email of usersToCheck) {
      console.log(`\n=== Checking user: ${email} ===`);
      
      // Search by email
      const { resources } = await container.items.query(
        `SELECT * FROM c WHERE c.email = "${email}"`
      ).fetchAll();
      
      if (resources.length > 0) {
        const user = resources[0];
        console.log('Found user:');
        console.log('ID:', user.id);
        console.log('UID:', user.uid);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Status:', user.status);
        console.log('Name:', user.name);
        console.log('Display Name:', user.displayName);
        console.log('Created At:', user.createdAt);
        console.log('Updated At:', user.updatedAt);
      } else {
        console.log('User not found by email');
        
        // Also check by partial email match
        const emailPart = email.split('@')[0];
        const { resources: partialMatch } = await container.items.query(
          `SELECT * FROM c WHERE CONTAINS(c.email, "${emailPart}")`
        ).fetchAll();
        
        if (partialMatch.length > 0) {
          console.log('Found users with similar email:');
          partialMatch.forEach(user => {
            console.log('- Email:', user.email, 'ID:', user.id, 'UID:', user.uid);
          });
        } else {
          console.log('No users found with similar email');
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers(); 