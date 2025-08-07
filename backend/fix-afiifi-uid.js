require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function fixUserUID() {
  try {
    const email = 'afiifi@qna336.onmicrosoft.com';
    console.log(`Fixing UID for user: ${email}`);
    
    // Find the user
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "${email}"`
    ).fetchAll();
    
    if (resources.length > 0) {
      const user = resources[0];
      console.log('Current user data:');
      console.log('ID:', user.id);
      console.log('UID:', user.uid);
      console.log('Email:', user.email);
      
      // Update UID to match ID
      const updatedUser = {
        ...user,
        uid: user.id, // Set UID to match ID
        updatedAt: new Date().toISOString()
      };
      
      console.log('\nUpdating user with new UID:', updatedUser.uid);
      
      // Update the user in database
      await container.item(user.id, user.id).replace(updatedUser);
      
      console.log('✅ User UID updated successfully!');
      console.log('New UID:', updatedUser.uid);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserUID(); 