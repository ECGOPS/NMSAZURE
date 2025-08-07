const { CosmosClient } = require('@azure/cosmos');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Cosmos DB connection
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

// Container names mapping
const containers = {
  regions: 'regions',
  districts: 'districts',
  op5Faults: 'op5Faults',
  controlSystemOutages: 'controlSystemOutages',
  vitAssets: 'vitAssets',
  vitInspections: 'vitInspections',
  overheadLineInspections: 'overheadLineInspections'
};

// Function to create containers if they don't exist
async function createContainers() {
  console.log('Creating containers...');
  
  for (const [containerName, containerId] of Object.entries(containers)) {
    try {
      const container = database.container(containerId);
      await container.read();
      console.log(`Container ${containerId} already exists`);
    } catch (error) {
      if (error.code === 404) {
        try {
          await database.containers.createIfNotExists({
            id: containerId,
            partitionKey: '/id'
          });
          console.log(`Created container: ${containerId}`);
        } catch (createError) {
          console.error(`Error creating container ${containerId}:`, createError.message);
        }
      } else {
        console.error(`Error checking container ${containerId}:`, error.message);
      }
    }
  }
}

// Function to read JSON file
async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

// Function to add timestamps to data
function addTimestamps(data) {
  const now = new Date().toISOString();
  return data.map(item => ({
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now
  }));
}

// Function to migrate data to a specific container
async function migrateDataToContainer(containerName, data) {
  if (!data || data.length === 0) {
    console.log(`No data to migrate for ${containerName}`);
    return;
  }

  const container = database.container(containers[containerName]);
  const dataWithTimestamps = addTimestamps(data);
  
  console.log(`Migrating ${dataWithTimestamps.length} records to ${containerName}...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of dataWithTimestamps) {
    try {
      await container.items.upsert(item);
      successCount++;
      console.log(`✓ Migrated ${containerName} item: ${item.id}`);
    } catch (error) {
      errorCount++;
      console.error(`✗ Error migrating ${containerName} item ${item.id}:`, error.message);
    }
  }
  
  console.log(`Migration summary for ${containerName}: ${successCount} successful, ${errorCount} failed`);
}

// Function to migrate all JSON files
async function migrateAllJsonFiles() {
  console.log('Starting JSON to Cosmos DB migration...');
  
  // Create containers first
  await createContainers();
  
  // Define the JSON files to migrate
  const jsonFiles = {
    regions: '../src/data/regions.json',
    districts: '../src/data/districts.json',
    op5Faults: '../src/data/op5-faults.json',
    controlSystemOutages: '../src/data/control-system-outages.json',
    vitAssets: '../src/data/vit-assets.json',
    vitInspections: '../src/data/vit-inspections.json',
    overheadLineInspections: '../src/data/overhead-line-inspections.json'
  };
  
  // Migrate each JSON file
  for (const [containerName, filePath] of Object.entries(jsonFiles)) {
    const fullPath = path.join(__dirname, filePath);
    console.log(`\nProcessing ${containerName} from ${fullPath}...`);
    
    try {
      const data = await readJsonFile(fullPath);
      if (data && data.length > 0) {
        await migrateDataToContainer(containerName, data);
      } else {
        console.log(`No data found in ${filePath}`);
      }
    } catch (error) {
      console.error(`Error processing ${containerName}:`, error.message);
    }
  }
  
  console.log('\nMigration completed!');
}

// Function to verify migration
async function verifyMigration() {
  console.log('\nVerifying migration...');
  
  for (const [containerName, containerId] of Object.entries(containers)) {
    try {
      const container = database.container(containerId);
      const { resources } = await container.items.readAll().fetchAll();
      console.log(`✓ ${containerName}: ${resources.length} records`);
    } catch (error) {
      console.error(`✗ Error verifying ${containerName}:`, error.message);
    }
  }
}

// Function to clear all containers (use with caution!)
async function clearAllContainers() {
  console.log('Clearing all containers...');
  
  for (const [containerName, containerId] of Object.entries(containers)) {
    try {
      const container = database.container(containerId);
      const { resources } = await container.items.readAll().fetchAll();
      
      for (const item of resources) {
        await container.item(item.id, item.id).delete();
      }
      
      console.log(`✓ Cleared ${containerName}: ${resources.length} records deleted`);
    } catch (error) {
      console.error(`✗ Error clearing ${containerName}:`, error.message);
    }
  }
  
  console.log('All containers cleared!');
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'migrate':
        await migrateAllJsonFiles();
        break;
      case 'verify':
        await verifyMigration();
        break;
      case 'clear':
        console.log('Are you sure you want to clear all containers? This will delete all data!');
        console.log('Run with: node migrate-json-to-cosmos.js clear --confirm');
        if (process.argv[3] === '--confirm') {
          await clearAllContainers();
        } else {
          console.log('Migration cancelled. Use --confirm flag to proceed.');
        }
        break;
      default:
        console.log('Usage:');
        console.log('  node migrate-json-to-cosmos.js migrate  - Migrate all JSON files to Cosmos DB');
        console.log('  node migrate-json-to-cosmos.js verify   - Verify migration results');
        console.log('  node migrate-json-to-cosmos.js clear    - Clear all containers (use with caution)');
        break;
    }
  } catch (error) {
    console.error('Operation failed:', error);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  migrateAllJsonFiles,
  verifyMigration,
  clearAllContainers,
  createContainers,
  migrateDataToContainer
}; 