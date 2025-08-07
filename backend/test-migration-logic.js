require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container('users');

async function testMigrationLogic() {
  try {
    console.log('Testing migration logic...');
    
    // Simulate existing user with old Firebase ID
    const existingUser = {
      id: 'old-firebase-id-123',
      uid: 'old-firebase-id-123',
      email: 'test-migration@qna336.onmicrosoft.com',
      name: 'Test Migration User',
      role: 'system_admin',
      status: 'active',
      region: 'Test Region',
      district: 'Test District',
      staffId: 'STAFF123',
      disabled: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    };
    
    // Simulate new Azure AD ID from JWT
    const newAzureADId = 'new-azure-ad-id-456';
    
    console.log('1. Creating test user with old Firebase ID...');
    await container.items.create(existingUser);
    console.log('✅ Created test user with old ID:', existingUser.id);
    
    // Simulate the migration logic
    console.log('\n2. Simulating migration logic...');
    
    // Find user by email
    const { resources } = await container.items.query(
      `SELECT * FROM c WHERE c.email = "${existingUser.email}"`
    ).fetchAll();
    
    if (resources.length > 0) {
      const foundUser = resources[0];
      console.log('✅ Found existing user:', foundUser.id);
      
      // Create new user data with new Azure AD ID
      const newUserData = {
        id: newAzureADId, // New Azure AD ID
        uid: newAzureADId, // New Azure AD UID
        name: foundUser.name,
        displayName: foundUser.name,
        email: foundUser.email,
        role: foundUser.role, // Keep existing role
        status: foundUser.status, // Keep existing status
        region: foundUser.region || '',
        district: foundUser.district || '',
        staffId: foundUser.staffId || '',
        disabled: foundUser.disabled || false,
        createdAt: foundUser.createdAt, // Keep original creation date
        updatedAt: new Date().toISOString()
      };
      
      console.log('3. Deleting old user...');
      await container.item(foundUser.id, foundUser.id).delete();
      console.log('✅ Deleted old user with ID:', foundUser.id);
      
      console.log('4. Creating new user with new Azure AD ID...');
      await container.items.create(newUserData);
      console.log('✅ Created new user with ID:', newUserData.id);
      
      // Verify the migration worked
      console.log('\n5. Verifying migration...');
      const { resources: verifyUsers } = await container.items.query(
        `SELECT * FROM c WHERE c.email = "${existingUser.email}"`
      ).fetchAll();
      
      if (verifyUsers.length > 0) {
        const migratedUser = verifyUsers[0];
        console.log('✅ Migration successful!');
        console.log('Old ID:', foundUser.id);
        console.log('New ID:', migratedUser.id);
        console.log('New UID:', migratedUser.uid);
        console.log('Role preserved:', migratedUser.role);
        console.log('Status preserved:', migratedUser.status);
        console.log('Created at preserved:', migratedUser.createdAt);
        
        if (migratedUser.id === migratedUser.uid) {
          console.log('✅ ID and UID match correctly!');
        } else {
          console.log('❌ ID and UID do not match!');
        }
      } else {
        console.log('❌ User not found after migration!');
      }
    } else {
      console.log('❌ User not found!');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testMigrationLogic(); 