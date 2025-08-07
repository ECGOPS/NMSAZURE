const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

// Azure Cosmos DB connection
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

// All container names
const containers = {
  users: 'users',
  regions: 'regions',
  districts: 'districts',
  op5Faults: 'op5Faults',
  controlSystemOutages: 'controlSystemOutages',
  vitAssets: 'vitAssets',
  vitInspections: 'vitInspections',
  overheadLineInspections: 'overheadLineInspections',
  loadMonitoring: 'loadMonitoring',
  chatMessages: 'chatMessages',
  broadcastMessages: 'broadcastMessages',
  securityEvents: 'securityEvents',
  userLogs: 'userLogs',
  staffIds: 'staffIds',
  permissions: 'permissions',
  musicFiles: 'musicFiles',
  smsLogs: 'smsLogs',
  feeders: 'feeders',
  devices: 'devices',
  systemSettings: 'systemSettings'
};

async function countAllData() {
  console.log('🔍 Counting all data in Azure Cosmos DB...');
  console.log('Database:', databaseId);
  console.log('Endpoint:', endpoint ? 'Connected' : 'Not connected');
  console.log('');

  let totalRecords = 0;
  const results = {};

  for (const [containerName, containerId] of Object.entries(containers)) {
    try {
      const container = database.container(containerId);
      const { resources } = await container.items.readAll().fetchAll();
      const count = resources.length;
      totalRecords += count;
      
      results[containerName] = count;
      
      if (count > 0) {
        console.log(`✅ ${containerName}: ${count} records`);
      } else {
        console.log(`⚪ ${containerName}: ${count} records (empty)`);
      }
    } catch (error) {
      console.log(`❌ ${containerName}: Error - ${error.message}`);
      results[containerName] = 'ERROR';
    }
  }

  console.log('');
  console.log('📊 SUMMARY:');
  console.log('============');
  console.log(`Total Records: ${totalRecords}`);
  console.log('');
  
  // Show collections with data
  const collectionsWithData = Object.entries(results)
    .filter(([name, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]); // Sort by count descending

  if (collectionsWithData.length > 0) {
    console.log('📈 Collections with Data:');
    collectionsWithData.forEach(([name, count]) => {
      console.log(`  • ${name}: ${count} records`);
    });
  }

  // Show empty collections
  const emptyCollections = Object.entries(results)
    .filter(([name, count]) => count === 0);

  if (emptyCollections.length > 0) {
    console.log('');
    console.log('⚪ Empty Collections:');
    emptyCollections.forEach(([name, count]) => {
      console.log(`  • ${name}: ${count} records`);
    });
  }

  // Show error collections
  const errorCollections = Object.entries(results)
    .filter(([name, count]) => count === 'ERROR');

  if (errorCollections.length > 0) {
    console.log('');
    console.log('❌ Collections with Errors:');
    errorCollections.forEach(([name, count]) => {
      console.log(`  • ${name}: ${count}`);
    });
  }

  console.log('');
  console.log('🎯 Migration Status:');
  if (totalRecords > 0) {
    console.log('✅ Data has been migrated to Azure Cosmos DB');
  } else {
    console.log('⚠️  No data found in Azure Cosmos DB');
  }
}

// Run the count
countAllData().catch(console.error); 