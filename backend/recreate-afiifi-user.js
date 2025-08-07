require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function recreateUser() {
  try {
    const email = 'afiifi@qna336.onmicrosoft.com';
    console.log(`Recreating user: ${email}`);
    
    // First, get the current user data
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "${email}"`
    ).fetchAll();
    
    if (resources.length > 0) {
      const oldUser = resources[0];
      console.log('Current user data:');
      console.log('ID:', oldUser.id);
      console.log('UID:', oldUser.uid);
      console.log('Email:', oldUser.email);
      
      // Create new user with correct UID
      const newUser = {
        id: oldUser.id,
        uid: oldUser.id, // Set UID to match ID
        email: oldUser.email,
        name: oldUser.name,
        displayName: oldUser.displayName,
        role: oldUser.role,
        status: oldUser.status,
        region: oldUser.region,
        district: oldUser.district,
        staffId: oldUser.staffId,
        disabled: oldUser.disabled,
        createdAt: oldUser.createdAt,
        updatedAt: new Date().toISOString()
      };
      
      console.log('\nNew user data:');
      console.log('ID:', newUser.id);
      console.log('UID:', newUser.uid);
      
      // Delete the old user
      console.log('\nDeleting old user...');
      await container.item(oldUser.id, oldUser.id).delete();
      
      // Create the new user
      console.log('Creating new user...');
      const { resource: createdUser } = await container.items.create(newUser);
      
      console.log('✅ User recreated successfully!');
      console.log('New UID:', createdUser.uid);
      console.log('Updated At:', createdUser.updatedAt);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

recreateUser(); 