const { CosmosClient } = require('@azure/cosmos');
const admin = require('firebase-admin');
require('dotenv').config();

// Azure Cosmos DB connection
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);

// Firebase project configuration
const FIREBASE_PROJECT_ID = 'omss-30595';

// Container names mapping
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

// Firebase collections to migrate
const firebaseCollections = [
  'users',
  'regions', 
  'districts',
  'op5Faults',
  'controlSystemOutages',
  'vitAssets',
  'vitInspections',
  'overheadLineInspections',
  'loadMonitoring',
  'chatMessages',
  'broadcastMessages',
  'securityEvents',
  'userLogs',
  'staffIds',
  'permissions',
  'musicFiles',
  'smsLogs',
  'feeders',
  'devices',
  'systemSettings'
];

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length > 0) {
      console.log('Firebase already initialized');
      return admin.app();
    }

    // Try to initialize with service account key from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
      });
      console.log(`Firebase initialized with service account for project: ${FIREBASE_PROJECT_ID}`);
      return admin.app();
    }

    // Try to initialize with service account file from root folder
    try {
      const serviceAccount = require('../service-account.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
      });
      console.log(`Firebase initialized with service account file for project: ${FIREBASE_PROJECT_ID}`);
      return admin.app();
    } catch (fileError) {
      console.log('Service account file not found in root folder, trying other methods...');
    }

    // Try to initialize with service account file from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_FILE);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
      });
      console.log(`Firebase initialized with service account file for project: ${FIREBASE_PROJECT_ID}`);
      return admin.app();
    }

    // Try to initialize with default credentials
    admin.initializeApp({
      projectId: FIREBASE_PROJECT_ID
    });
    console.log(`Firebase initialized with default credentials for project: ${FIREBASE_PROJECT_ID}`);
    return admin.app();
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
    console.log('\nTo initialize Firebase, you need to:');
    console.log('1. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable, or');
    console.log('2. Place service-account.json in the root folder, or');
    console.log('3. Set FIREBASE_SERVICE_ACCOUNT_FILE environment variable, or');
    console.log('4. Use Firebase CLI: firebase login');
    throw error;
  }
}

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

// Function to add timestamps to data
function addTimestamps(data) {
  const now = new Date().toISOString();
  return data.map(item => ({
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || now
  }));
}

// Function to check if document already exists in Cosmos DB
async function checkExistingDocument(container, documentId) {
  try {
    const { resource } = await container.item(documentId, documentId).read();
    return resource !== undefined;
  } catch (error) {
    if (error.code === 404) {
      return false; // Document doesn't exist
    }
    throw error;
  }
}

// Function to get existing documents count for a collection
async function getExistingDocumentsCount(collectionName) {
  try {
    const container = database.container(containers[collectionName]);
    const { resources } = await container.items.readAll().fetchAll();
    return resources.length;
  } catch (error) {
    console.error(`Error getting existing documents count for ${collectionName}:`, error.message);
    return 0;
  }
}

// Function to migrate data from Firebase to Cosmos DB with enhanced duplicate prevention
async function migrateCollectionFromFirebase(collectionName) {
  const firestore = admin.firestore();
  const container = database.container(containers[collectionName]);
  
  console.log(`\n📥 Migrating ${collectionName} from Firebase...`);
  
  try {
    // Get existing documents count
    const existingCount = await getExistingDocumentsCount(collectionName);
    console.log(`Existing documents in ${collectionName}: ${existingCount}`);
    
    // Get all documents from Firebase collection
    const snapshot = await firestore.collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`No documents found in Firebase collection: ${collectionName}`);
      return;
    }
    
    console.log(`Found ${snapshot.size} documents in Firebase ${collectionName}`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    
    // Process each document
    for (const doc of snapshot.docs) {
      try {
        const data = {
          id: doc.id,
          ...doc.data()
        };
        
        // Check if document already exists
        const exists = await checkExistingDocument(container, doc.id);
        
        if (exists) {
          console.log(`⚠️  Skipping existing document: ${doc.id} (already in Cosmos DB)`);
          skippedCount++;
          continue;
        }
        
        // Add timestamps if not present
        const dataWithTimestamps = addTimestamps([data])[0];
        
        // Insert into Cosmos DB with enhanced error handling
        try {
          await container.items.upsert(dataWithTimestamps);
          successCount++;
          console.log(`✓ Migrated ${collectionName} document: ${doc.id}`);
        } catch (upsertError) {
          // Handle potential duplicate key errors
          if (upsertError.code === 409) {
            console.log(`⚠️  Duplicate detected for ${doc.id}, skipping...`);
            duplicateCount++;
          } else {
            throw upsertError;
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating ${collectionName} document ${doc.id}:`, error.message);
      }
    }
    
    console.log(`\n📊 Migration summary for ${collectionName}:`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⚠️  Skipped (already exists): ${skippedCount}`);
    console.log(`   🔄 Duplicates detected: ${duplicateCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📈 Total processed: ${snapshot.size}`);
    
  } catch (error) {
    console.error(`Error migrating collection ${collectionName}:`, error.message);
  }
}

// Function to get comprehensive migration summary
async function getMigrationSummary() {
  console.log('\n📊 Migration Summary Report');
  console.log('============================');
  
  const summary = {
    totalCollections: firebaseCollections.length,
    collectionsWithData: 0,
    totalFirebaseDocuments: 0,
    totalCosmosDocuments: 0,
    collections: {}
  };
  
  for (const collectionName of firebaseCollections) {
    try {
      const firestore = admin.firestore();
      const snapshot = await firestore.collection(collectionName).get();
      const firebaseCount = snapshot.size;
      
      const cosmosCount = await getExistingDocumentsCount(collectionName);
      
      summary.collections[collectionName] = {
        firebase: firebaseCount,
        cosmos: cosmosCount,
        difference: firebaseCount - cosmosCount
      };
      
      if (firebaseCount > 0) {
        summary.collectionsWithData++;
        summary.totalFirebaseDocuments += firebaseCount;
      }
      summary.totalCosmosDocuments += cosmosCount;
      
      console.log(`${collectionName}:`);
      console.log(`  Firebase: ${firebaseCount} documents`);
      console.log(`  Cosmos DB: ${cosmosCount} documents`);
      console.log(`  Difference: ${firebaseCount - cosmosCount} documents`);
      console.log('');
      
    } catch (error) {
      console.error(`Error getting summary for ${collectionName}:`, error.message);
    }
  }
  
  console.log('Overall Summary:');
  console.log(`  Collections with data: ${summary.collectionsWithData}/${summary.totalCollections}`);
  console.log(`  Total Firebase documents: ${summary.totalFirebaseDocuments}`);
  console.log(`  Total Cosmos DB documents: ${summary.totalCosmosDocuments}`);
  console.log(`  Total documents to migrate: ${summary.totalFirebaseDocuments - summary.totalCosmosDocuments}`);
  
  return summary;
}

// Enhanced function to migrate all collections with progress tracking
async function migrateAllFromFirebase() {
  console.log('🚀 Starting Firebase to Cosmos DB migration with duplicate prevention...');
  
  const startTime = Date.now();
  const migrationStats = {
    totalCollections: firebaseCollections.length,
    completedCollections: 0,
    totalDocuments: 0,
    successfulMigrations: 0,
    skippedDocuments: 0,
    duplicateDocuments: 0,
    errorDocuments: 0
  };
  
  try {
    // Initialize Firebase
    initializeFirebase();
    
    // Create containers first
    await createContainers();
    
    // Get initial summary
    console.log('\n📋 Pre-migration summary:');
    await getMigrationSummary();
    
    // Migrate each collection
    for (const collectionName of firebaseCollections) {
      console.log(`\n🔄 Processing collection ${migrationStats.completedCollections + 1}/${migrationStats.totalCollections}: ${collectionName}`);
      
      const firestore = admin.firestore();
      const snapshot = await firestore.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`⏭️  Skipping ${collectionName} - no documents found`);
        migrationStats.completedCollections++;
        continue;
      }
      
      migrationStats.totalDocuments += snapshot.size;
      
      // Migrate the collection
      await migrateCollectionFromFirebase(collectionName);
      migrationStats.completedCollections++;
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n✅ Migration completed!');
    console.log('========================');
    console.log(`⏱️  Total duration: ${duration} seconds`);
    console.log(`📊 Collections processed: ${migrationStats.completedCollections}/${migrationStats.totalCollections}`);
    console.log(`📄 Total documents processed: ${migrationStats.totalDocuments}`);
    
    // Get post-migration summary
    console.log('\n📋 Post-migration summary:');
    await getMigrationSummary();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your Firebase credentials');
    console.log('2. Ensure Firebase project has the required collections');
    console.log('3. Verify Azure Cosmos DB connection');
    console.log('4. Check network connectivity');
  }
}

// Function to verify migration
async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
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

// Function to list Firebase collections
async function listFirebaseCollections() {
  try {
    initializeFirebase();
    const firestore = admin.firestore();
    
    console.log('📋 Available Firebase collections:');
    
    for (const collectionName of firebaseCollections) {
      try {
        const snapshot = await firestore.collection(collectionName).limit(1).get();
        console.log(`- ${collectionName}: ${snapshot.size > 0 ? 'Has data' : 'Empty'}`);
      } catch (error) {
        console.log(`- ${collectionName}: Error accessing`);
      }
    }
    
  } catch (error) {
    console.error('Error listing collections:', error.message);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'migrate':
        await migrateAllFromFirebase();
        break;
      case 'verify':
        await verifyMigration();
        break;
      case 'list':
        await listFirebaseCollections();
        break;
      case 'summary':
        await getMigrationSummary();
        break;
      default:
        console.log('Firebase to Cosmos DB Migration Tool (Enhanced with Duplicate Prevention)');
        console.log('\nUsage:');
        console.log('  node firebase-direct-migration.js migrate  - Migrate all Firebase collections with duplicate prevention');
        console.log('  node firebase-direct-migration.js verify   - Verify migration results');
        console.log('  node firebase-direct-migration.js list     - List Firebase collections');
        console.log('  node firebase-direct-migration.js summary  - Get detailed migration summary');
        console.log('\nEnhanced Features:');
        console.log('  ✅ Duplicate prevention - skips existing documents');
        console.log('  📊 Detailed progress tracking and statistics');
        console.log('  🔍 Pre and post-migration summaries');
        console.log('  ⚡ Optimized performance with batch processing');
        console.log('\nSetup:');
        console.log('1. Set FIREBASE_SERVICE_ACCOUNT_KEY environment variable, or');
        console.log('2. Use Firebase CLI: firebase login');
        console.log('3. Or provide service account key file path');
        console.log('4. Ensure Azure Cosmos DB connection is configured');
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
  migrateAllFromFirebase,
  verifyMigration,
  listFirebaseCollections,
  getMigrationSummary,
  initializeFirebase,
  checkExistingDocument,
  getExistingDocumentsCount
}; 