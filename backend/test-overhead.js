require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'overheadLineInspections';

console.log('Testing overheadLineInspections container...');
console.log('Endpoint:', endpoint);
console.log('Database ID:', databaseId);
console.log('Container ID:', containerId);

const client = new CosmosClient({ endpoint, key });

async function testOverheadContainer() {
  try {
    console.log('Connecting to Cosmos DB...');
    const database = client.database(databaseId);
    const container = database.container(containerId);
    
    console.log('Testing simple query...');
    const { resources } = await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
    console.log('✅ Query successful, found', resources.length, 'items');
    
    if (resources.length > 0) {
      console.log('Sample item:', JSON.stringify(resources[0], null, 2));
    }
    
    console.log('Testing count query...');
    const { resources: countResources } = await container.items.query('SELECT VALUE COUNT(1) FROM c').fetchAll();
    console.log('✅ Count query successful, total items:', countResources[0]);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Error details:', {
      code: err.code,
      statusCode: err.statusCode,
      stack: err.stack
    });
  }
}

testOverheadContainer(); 