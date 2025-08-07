const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config({ path: __dirname + '/.env' });

console.log('COSMOS_DB_ENDPOINT:', process.env.COSMOS_DB_ENDPOINT);
console.log('COSMOS_DB_KEY:', process.env.COSMOS_DB_KEY ? 'set' : 'not set');
console.log('COSMOS_DB_DATABASE:', process.env.COSMOS_DB_DATABASE);

// Cosmos DB connection from .env
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const regionsContainerId = 'regions';
const districtsContainerId = 'districts';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const regionsContainer = database.container(regionsContainerId);
const districtsContainer = database.container(districtsContainerId);

// Map old region IDs/names to new IDs and codes (from frontend's regions.json)
const regionMappings = [
  { oldId: 'accra-east', newId: 'region-3', name: 'ACCRA EAST REGION', code: 'AER' },
  { oldId: 'accra-west', newId: 'region-4', name: 'ACCRA WEST REGION', code: 'AWR' },
  { oldId: 'ashanti-east', newId: 'region-5', name: 'ASHANTI EAST REGION', code: 'ASHER' },
  { oldId: 'ashanti-west', newId: 'region-6', name: 'ASHANTI WEST REGION', code: 'ASHWR' },
  { oldId: 'ashanti-south', newId: 'region-7', name: 'ASHANTI SOUTH REGION', code: 'ASHSR' },
  { oldId: 'central', newId: 'region-8', name: 'CENTRAL REGION', code: 'CR' },
  { oldId: 'eastern', newId: 'region-9', name: 'EASTERN REGION', code: 'ER' },
  { oldId: 'tema', newId: 'region-10', name: 'TEMA REGION', code: 'TR' },
  { oldId: 'volta', newId: 'region-11', name: 'VOLTA REGION', code: 'VR' },
  { oldId: 'western', newId: 'region-12', name: 'WESTERN REGION', code: 'WR' },
  { oldId: 'subtransmission-accra', newId: 'region-1', name: 'SUBTRANSMISSION ACCRA', code: 'STA' },
  { oldId: 'subtransmission-ashanti', newId: 'region-2', name: 'SUBTRANSMISSION ASHANTI', code: 'STASH' },
];

async function migrateRegionsAndDistricts() {
  // Migrate regions
  for (const mapping of regionMappings) {
    try {
      const { resource: oldRegion } = await regionsContainer.item(mapping.oldId, mapping.oldId).read();
      if (!oldRegion) {
        console.log(`Region not found: ${mapping.oldId}`);
        continue;
      }
      const newRegion = {
        ...oldRegion,
        id: mapping.newId,
        name: mapping.name,
        code: mapping.code,
      };
      await regionsContainer.items.upsert(newRegion);
      console.log(`Region migrated: ${mapping.oldId} -> ${mapping.newId}`);
    } catch (err) {
      console.error(`Error migrating region ${mapping.oldId}:`, err.message);
    }
  }

  // Migrate districts
  const { resources: districts } = await districtsContainer.items.readAll().fetchAll();
  for (const district of districts) {
    try {
      const regionMapping = regionMappings.find(r => r.oldId === district.regionId || r.newId === district.regionId);
      if (!regionMapping) {
        console.log(`No region mapping for district: ${district.id} (regionId: ${district.regionId})`);
        continue;
      }
      const updatedDistrict = {
        ...district,
        regionId: regionMapping.newId,
        code: district.code || '', // Add logic to set code if needed
      };
      await districtsContainer.items.upsert(updatedDistrict);
      console.log(`District updated: ${district.id} (regionId: ${district.regionId} -> ${regionMapping.newId})`);
    } catch (err) {
      console.error(`Error updating district ${district.id}:`, err.message);
    }
  }
}

migrateRegionsAndDistricts()
  .then(() => console.log('Migration complete!'))
  .catch(err => console.error('Migration failed:', err)); 