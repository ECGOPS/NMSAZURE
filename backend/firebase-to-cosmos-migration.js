const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

// Cosmos DB connection
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

// Container names for different collections
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

// Sample data from your JSON files (you can replace this with actual Firebase data)
const sampleData = {
  regions: [
    {
      id: "region-1",
      name: "SUBTRANSMISSION ACCRA",
      code: "STA",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-2",
      name: "SUBTRANSMISSION ASHANTI",
      code: "STASH",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-3",
      name: "ACCRA EAST REGION",
      code: "AER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-4",
      name: "ACCRA WEST REGION",
      code: "AWR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-5",
      name: "ASHANTI EAST REGION",
      code: "ASHER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-6",
      name: "ASHANTI WEST REGION",
      code: "ASHWR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-7",
      name: "ASHANTI SOUTH REGION",
      code: "ASHSR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-8",
      name: "CENTRAL REGION",
      code: "CR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-9",
      name: "EASTERN REGION",
      code: "ER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-10",
      name: "TEMA REGION",
      code: "TR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-11",
      name: "VOLTA REGION",
      code: "VR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "region-12",
      name: "WESTERN REGION",
      code: "WR",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  districts: [
    {
      id: "district-1",
      name: "SUBSTATION MAINTENANCE",
      regionId: "region-1",
      code: "STA-SM",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "district-2",
      name: "CONTROL OPERATIONS",
      regionId: "region-1",
      code: "STA-CO",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  op5Faults: [
    {
      id: "fault-1",
      regionId: "region-1",
      districtId: "district-1",
      faultType: "PROTECTION_TRIP",
      substationNumber: "SS-001",
      faultDescription: "Protection relay trip due to overcurrent",
      outrageDuration: 120,
      mttr: 60,
      status: "resolved",
      affectedPopulation: {
        rural: 5000,
        urban: 25000,
        metro: 100000
      },
      reliabilityIndices: {
        saidi: 0.02,
        saifi: 0.01,
        caidi: 2.0
      },
      createdBy: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  controlSystemOutages: [
    {
      id: "outage-1",
      regionId: "region-1",
      districtId: "district-1",
      faultType: "SCADA_FAILURE",
      substationNumber: "SS-001",
      occurrenceDate: new Date("2024-03-20T08:00:00Z").toISOString(),
      restorationDate: new Date("2024-03-20T12:00:00Z").toISOString(),
      description: "SCADA system communication failure",
      impactDescription: "Loss of remote monitoring and control capabilities",
      status: "resolved",
      loadMW: 25.5,
      unservedEnergyMWh: 102.0,
      customersAffected: {
        rural: 3000,
        urban: 15000,
        metro: 50000
      },
      createdBy: "System",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  vitAssets: [
    {
      id: "asset-1",
      regionId: "region-1",
      districtId: "district-1",
      substationNumber: "SS-001",
      substationName: "Accra Main Substation",
      voltageLevel: "33kV",
      status: "OPERATIONAL",
      lastInspectionDate: new Date("2024-03-15T00:00:00Z").toISOString(),
      nextInspectionDate: new Date("2024-04-15T00:00:00Z").toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  vitInspections: [
    {
      id: "inspection-1",
      assetId: "asset-1",
      date: new Date("2024-03-15T00:00:00Z").toISOString(),
      inspectorId: "user-1",
      rodentTermiteEncroachment: "NO",
      cleanDustFree: "YES",
      protectionButtonEnabled: "YES",
      recloserButtonEnabled: "YES",
      groundEarthButtonEnabled: "YES",
      acPowerOn: "YES",
      batteryPowerLow: "NO",
      handleLockOn: "YES",
      remoteButtonEnabled: "YES",
      gasLevelLow: "NO",
      earthingArrangementAdequate: "YES",
      noFusesBlown: "YES",
      noDamageToBushings: "YES",
      noDamageToHVConnections: "YES",
      insulatorsClean: "YES",
      paintworkAdequate: "YES",
      ptFuseLinkIntact: "YES",
      noCorrosion: "YES",
      silicaGelCondition: "GOOD",
      correctLabelling: "YES",
      remarks: "All systems functioning normally",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  overheadLineInspections: [
    {
      id: "oli-001",
      regionId: "reg-001",
      districtId: "dist-001",
      feederName: "F1-Main",
      voltageLevel: "33kV",
      referencePole: "P001",
      status: "completed",
      latitude: 5.6037,
      longitude: -0.1870,
      poleCondition: {
        leaning: false,
        damaged: false,
        rotted: false,
        notes: "Pole in good condition"
      },
      stayCondition: {
        loose: false,
        damaged: false,
        misaligned: false,
        notes: "Stay wires properly tensioned"
      },
      crossArmCondition: {
        damaged: false,
        rotted: false,
        misaligned: false,
        notes: "Cross arms properly aligned"
      },
      insulatorCondition: {
        broken: false,
        cracked: false,
        contaminated: true,
        notes: "Minor dust contamination, needs cleaning"
      },
      conductorCondition: {
        broken: false,
        looseConnections: false,
        treeTouching: true,
        notes: "Tree branches need trimming"
      },
      additionalNotes: "Overall in good condition, but requires vegetation management",
      images: [
        "overhead-line-001.jpg",
        "overhead-line-002.jpg"
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
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

// Function to migrate data to a specific container
async function migrateDataToContainer(containerName, data) {
  const container = database.container(containers[containerName]);
  
  console.log(`Migrating ${data.length} records to ${containerName}...`);
  
  for (const item of data) {
    try {
      await container.items.upsert(item);
      console.log(`✓ Migrated ${containerName} item: ${item.id}`);
    } catch (error) {
      console.error(`✗ Error migrating ${containerName} item ${item.id}:`, error.message);
    }
  }
}

// Function to migrate all data
async function migrateAllData() {
  console.log('Starting Firebase to Cosmos DB migration...');
  
  // Create containers first
  await createContainers();
  
  // Migrate each collection
  for (const [collectionName, data] of Object.entries(sampleData)) {
    if (data && data.length > 0) {
      await migrateDataToContainer(collectionName, data);
    }
  }
  
  console.log('Migration completed!');
}

// Function to migrate data from Firebase (you'll need to implement this based on your Firebase setup)
async function migrateFromFirebase() {
  console.log('This function should be implemented to connect to your Firebase project');
  console.log('You would need to:');
  console.log('1. Install firebase-admin package');
  console.log('2. Initialize Firebase Admin SDK with your service account');
  console.log('3. Read data from Firebase collections');
  console.log('4. Transform the data to match the Cosmos DB schema');
  console.log('5. Insert the data into Cosmos DB');
  
  // Example implementation (you'll need to customize this):
  /*
  const admin = require('firebase-admin');
  const serviceAccount = require('./path/to/your/serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  const db = admin.firestore();
  
  // Read regions from Firebase
  const regionsSnapshot = await db.collection('regions').get();
  const regions = [];
  regionsSnapshot.forEach(doc => {
    regions.push({
      id: doc.id,
      ...doc.data(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
  
  // Migrate regions to Cosmos DB
  await migrateDataToContainer('regions', regions);
  */
}

// Main execution
async function main() {
  try {
    // For now, we'll use the sample data
    await migrateAllData();
    
    // Uncomment the line below when you're ready to migrate from Firebase
    // await migrateFromFirebase();
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = {
  migrateAllData,
  migrateFromFirebase,
  createContainers,
  migrateDataToContainer
}; 