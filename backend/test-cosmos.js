require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE || process.env.COSMOS_DB_DATABASE_NAME;

console.log('Testing Cosmos DB connection...');
console.log('Endpoint:', endpoint);
console.log('Database ID:', databaseId);
console.log('Has Key:', !!key);

const client = new CosmosClient({ endpoint, key });

async function testConnection() {
  try {
    console.log('Connecting to Cosmos DB...');
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log('✅ Database connection successful');
    
    // List all containers
    console.log('\nListing containers...');
    const { resources: containers } = await database.containers.readAll().fetchAll();
    console.log('Available containers:', containers.map(c => c.id));
    
    // Test overheadLineInspections container
    console.log('\nTesting overheadLineInspections container...');
    try {
      const container = database.container('overheadLineInspections');
      const { resources } = await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
      console.log('✅ overheadLineInspections container exists with', resources.length, 'items');
    } catch (err) {
      console.log('❌ overheadLineInspections container error:', err.message);
    }
    
  } catch (err) {
    console.error('❌ Cosmos DB connection failed:', err.message);
  }
}

testConnection(); 