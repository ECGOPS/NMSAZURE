const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'overheadLineInspections';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function checkDistricts() {
  try {
    console.log('Checking districts with overhead line inspection data...');
    
    const { resources } = await container.items.query('SELECT c.district, COUNT(1) as count FROM c GROUP BY c.district').fetchAll();
    
    console.log('\nDistricts with data:');
    resources.forEach(item => {
      console.log(`- ${item.district}: ${item.count} inspections`);
    });
    
    console.log(`\nTotal districts: ${resources.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDistricts(); 