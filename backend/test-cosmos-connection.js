const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

// Cosmos DB connection
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;

console.log('Testing Azure Cosmos DB Connection...');
console.log('Endpoint:', endpoint ? 'Set' : 'Not set');
console.log('Key:', key ? 'Set' : 'Not set');
console.log('Database:', databaseId ? 'Set' : 'Not set');

if (!endpoint || !key || !databaseId) {
  console.error('❌ Missing required environment variables');
  console.log('Please ensure your .env file contains:');
  console.log('COSMOS_DB_ENDPOINT=your_endpoint');
  console.log('COSMOS_DB_KEY=your_key');
  console.log('COSMOS_DB_DATABASE=your_database');
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });

async function testConnection() {
  try {
    console.log('\n🔍 Testing connection...');
    
    // Test database connection
    const database = client.database(databaseId);
    await database.read();
    console.log('✅ Database connection successful');
    
    // Test container creation
    const testContainerId = 'test-container';
    const container = database.container(testContainerId);
    
    try {
      await container.read();
      console.log('✅ Test container already exists');
    } catch (error) {
      if (error.code === 404) {
        console.log('📦 Creating test container...');
        await database.containers.createIfNotExists({
          id: testContainerId,
          partitionKey: '/id'
        });
        console.log('✅ Test container created successfully');
      } else {
        throw error;
      }
    }
    
    // Test data insertion
    const testItem = {
      id: 'test-item-1',
      name: 'Test Item',
      description: 'This is a test item',
      createdAt: new Date().toISOString()
    };
    
    console.log('📝 Testing data insertion...');
    await container.items.upsert(testItem);
    console.log('✅ Data insertion successful');
    
    // Test data retrieval
    console.log('🔍 Testing data retrieval...');
    const { resource } = await container.item(testItem.id, testItem.id).read();
    console.log('✅ Data retrieval successful');
    console.log('Retrieved item:', resource);
    
    // Test data deletion
    console.log('🗑️ Testing data deletion...');
    await container.item(testItem.id, testItem.id).delete();
    console.log('✅ Data deletion successful');
    
    // Clean up test container
    console.log('🧹 Cleaning up test container...');
    await container.delete();
    console.log('✅ Test container deleted');
    
    console.log('\n🎉 All tests passed! Your Azure Cosmos DB connection is working correctly.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testConnection(); 