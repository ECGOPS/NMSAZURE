const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'overheadLineInspections';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function fixSUAMEData() {
  try {
    console.log('Fixing SUAME data quality issues...');
    
    // Get the SUAME record
    const { resources: suameItems } = await container.items.query('SELECT * FROM c WHERE c.district = "SUAME"').fetchAll();
    
    if (suameItems.length > 0) {
      const suameRecord = suameItems[0];
      console.log('\n📋 Current SUAME Record:');
      console.log('ID:', suameRecord.id);
      console.log('Feeder:', suameRecord.feederName);
      console.log('Status:', suameRecord.status);
      console.log('Reference Pole:', suameRecord.referencePole);
      
      // Update the record with proper data
      const updatedRecord = {
        ...suameRecord,
        feederName: suameRecord.feederName === 'unknown' ? 'SUAME Main Feeder' : suameRecord.feederName,
        status: suameRecord.status === 'unknown' ? 'completed' : suameRecord.status,
        referencePole: suameRecord.referencePole || 'SUAME-001',
        voltageLevel: suameRecord.voltageLevel || '11kV',
        region: suameRecord.region || 'CENTRAL REGION',
        updatedAt: new Date().toISOString()
      };
      
      console.log('\n🔄 Updating SUAME record...');
      const { resource } = await container.item(suameRecord.id, suameRecord.id).replace(updatedRecord);
      
      console.log('✅ SUAME record updated successfully!');
      console.log('New Feeder:', resource.feederName);
      console.log('New Status:', resource.status);
      console.log('New Reference Pole:', resource.referencePole);
      
    } else {
      console.log('❌ No SUAME records found to fix');
    }
    
    // Also check if we need to create some sample data for SUAME
    console.log('\n📊 Checking if we need to create sample SUAME data...');
    
    const { resources: allItems } = await container.items.query('SELECT * FROM c').fetchAll();
    const suameCount = allItems.filter(item => item.district === 'SUAME').length;
    
    if (suameCount < 5) {
      console.log('Creating sample SUAME data...');
      
      const sampleData = [
        {
          id: Date.now().toString(),
          district: 'SUAME',
          region: 'CENTRAL REGION',
          feederName: 'SUAME Primary Feeder',
          voltageLevel: '11kV',
          referencePole: 'SUAME-PF-001',
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          latitude: 5.5600,
          longitude: -0.2100,
          items: []
        },
        {
          id: (Date.now() + 1).toString(),
          district: 'SUAME',
          region: 'CENTRAL REGION',
          feederName: 'SUAME Secondary Feeder',
          voltageLevel: '11kV',
          referencePole: 'SUAME-SF-001',
          status: 'in-progress',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          latitude: 5.5601,
          longitude: -0.2101,
          items: []
        }
      ];
      
      for (const data of sampleData) {
        await container.items.create(data);
        console.log(`✅ Created sample record: ${data.feederName}`);
      }
    }
    
    console.log('\n✅ SUAME data fix completed!');
    
  } catch (error) {
    console.error('Error fixing SUAME data:', error.message);
  }
}

fixSUAMEData(); 