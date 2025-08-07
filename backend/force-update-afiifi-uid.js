require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function forceUpdateUID() {
  try {
    const userId = '4743f1e8-6540-47db-83d6-09cf18f9988c';
    console.log(`Force updating UID for user ID: ${userId}`);
    
    // Get the current user by ID
    const { resource: user } = await container.item(userId, userId).read();
    
    if (user) {
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
      
      // Update the user in database using replace
      const { resource: updatedResource } = await container.item(userId, userId).replace(updatedUser);
      
      console.log('✅ User UID updated successfully!');
      console.log('New UID:', updatedResource.uid);
      console.log('Updated At:', updatedResource.updatedAt);
    } else {
      console.log('User not found by ID');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

forceUpdateUID(); 