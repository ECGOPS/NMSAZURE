require('dotenv').config();
const { CosmosClient } = require('@azure/cosmos');

const client = new CosmosClient({ 
  endpoint: process.env.COSMOS_DB_ENDPOINT, 
  key: process.env.COSMOS_DB_KEY 
});
const database = client.database(process.env.COSMOS_DB_DATABASE);

async function migratePhotoUrls() {
  try {
    console.log('🔍 Starting photo URL migration...');
    
    // Collections that might contain photo URLs
    const collections = [
      'overheadLineInspections',
      'vitAssets', 
      'vitInspections',
      'substationInspections',
      'loadMonitoring',
      'op5Faults',
      'controlOutages',
      'securityEvents'
    ];
    
    let totalUpdated = 0;
    
    for (const collectionName of collections) {
      console.log(`\n📁 Processing collection: ${collectionName}`);
      
      try {
        const container = database.container(collectionName);
        
        // Get all documents in this collection
        const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
        
        console.log(`Found ${resources.length} documents in ${collectionName}`);
        
        let updatedInCollection = 0;
        
        for (const doc of resources) {
          let updated = false;
          const updatedDoc = { ...doc };
          
          // Check for photo URLs in various fields
          const photoFields = [
            'images', 'photos', 'beforePhotos', 'afterPhotos', 
            'imageUrls', 'photoUrls', 'attachments', 'files'
          ];
          
          for (const field of photoFields) {
            if (updatedDoc[field] && Array.isArray(updatedDoc[field])) {
              for (let i = 0; i < updatedDoc[field].length; i++) {
                const url = updatedDoc[field][i];
                if (typeof url === 'string' && url.includes('/api/photoUpload/serve/')) {
                  // Convert old URL to new URL
                  const newUrl = url.replace('/api/photoUpload/serve/', '/api/photos/serve/');
                  updatedDoc[field][i] = newUrl;
                  updated = true;
                  console.log(`  Updated URL: ${url} → ${newUrl}`);
                }
              }
            }
          }
          
          // Also check for single photo fields
          const singlePhotoFields = ['image', 'photo', 'mainImage', 'thumbnail'];
          for (const field of singlePhotoFields) {
            if (updatedDoc[field] && typeof updatedDoc[field] === 'string') {
              const url = updatedDoc[field];
              if (url.includes('/api/photoUpload/serve/')) {
                const newUrl = url.replace('/api/photoUpload/serve/', '/api/photos/serve/');
                updatedDoc[field] = newUrl;
                updated = true;
                console.log(`  Updated single URL: ${url} → ${newUrl}`);
              }
            }
          }
          
          if (updated) {
            try {
              await container.item(doc.id, doc.id).replace(updatedDoc);
              updatedInCollection++;
              console.log(`  ✅ Updated document: ${doc.id}`);
            } catch (error) {
              console.error(`  ❌ Failed to update document ${doc.id}:`, error.message);
            }
          }
        }
        
        console.log(`📊 Updated ${updatedInCollection} documents in ${collectionName}`);
        totalUpdated += updatedInCollection;
        
      } catch (error) {
        console.error(`❌ Error processing collection ${collectionName}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total documents updated: ${totalUpdated}`);
    
    if (totalUpdated > 0) {
      console.log(`✅ All photo URLs have been migrated to the new system`);
    } else {
      console.log(`ℹ️  No photo URLs found to migrate`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migratePhotoUrls(); 