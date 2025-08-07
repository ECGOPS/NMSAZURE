const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'overheadLineInspections';

console.log('Testing overhead line inspections query...');
console.log('Endpoint:', endpoint);
console.log('Database:', databaseId);
console.log('Container:', containerId);

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function testQuery() {
  try {
    console.log('\nTesting basic query...');
    const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log('✅ Basic query successful, found', resources.length, 'items');

    console.log('\nTesting query with district filter...');
    const { resources: districtResults } = await container.items.query('SELECT * FROM c WHERE c.district = "SUAME"').fetchAll();
    console.log('✅ District filter query successful, found', districtResults.length, 'items for SUAME');

    console.log('\nTesting query with includeBase64 parameter...');
    const { resources: base64Results } = await container.items.query('SELECT * FROM c WHERE c.district = "SUAME"').fetchAll();
    console.log('✅ Base64 query successful, found', base64Results.length, 'items');

    console.log('\nTesting the exact query from the error...');
    const queryStr = 'SELECT * FROM c WHERE c.district = "SUAME" ORDER BY c.createdAt DESC OFFSET 0 LIMIT 20';
    console.log('Query:', queryStr);
    const { resources: exactResults } = await container.items.query(queryStr).fetchAll();
    console.log('✅ Exact query successful, found', exactResults.length, 'items');

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Error details:', error);
  }
}

testQuery(); 