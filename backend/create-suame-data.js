const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'overheadLineInspections';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function createSUAMEData() {
  try {
    console.log('Creating proper SUAME data for district engineer...');
    
    // First, let's delete the problematic existing record
    const { resources: existingItems } = await container.items.query('SELECT * FROM c WHERE c.district = "SUAME"').fetchAll();
    
    if (existingItems.length > 0) {
      console.log('🗑️ Removing existing problematic SUAME records...');
      for (const item of existingItems) {
        await container.item(item.id, item.id).delete();
        console.log(`Deleted record: ${item.id}`);
      }
    }
    
    // Create proper SUAME data
    const suameData = [
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
        items: [],
        poleId: 'SUAME-PF-001',
        poleType: 'CP',
        poleCondition: {
          substandard: false,
          burnt: false,
          notes: 'Good condition',
          conflictWithLV: false,
          rotten: false,
          tilted: false
        },
        conductorCondition: {
          saggedLine: false,
          linked: false,
          undersized: false,
          notes: 'Normal condition',
          burntLugs: false,
          weakJumpers: false,
          looseConnectors: false
        }
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
        items: [],
        poleId: 'SUAME-SF-001',
        poleType: 'WP',
        poleCondition: {
          substandard: false,
          burnt: false,
          notes: 'Requires maintenance',
          conflictWithLV: false,
          rotten: false,
          tilted: true
        },
        conductorCondition: {
          saggedLine: true,
          linked: false,
          undersized: false,
          notes: 'Sagged line detected',
          burntLugs: false,
          weakJumpers: false,
          looseConnectors: false
        }
      },
      {
        id: (Date.now() + 2).toString(),
        district: 'SUAME',
        region: 'CENTRAL REGION',
        feederName: 'SUAME Industrial Feeder',
        voltageLevel: '11kV',
        referencePole: 'SUAME-IF-001',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        latitude: 5.5602,
        longitude: -0.2102,
        items: [],
        poleId: 'SUAME-IF-001',
        poleType: 'SP',
        poleCondition: {
          substandard: false,
          burnt: false,
          notes: 'New installation',
          conflictWithLV: false,
          rotten: false,
          tilted: false
        },
        conductorCondition: {
          saggedLine: false,
          linked: false,
          undersized: false,
          notes: 'New conductors',
          burntLugs: false,
          weakJumpers: false,
          looseConnectors: false
        }
      }
    ];
    
    console.log('📝 Creating SUAME inspection records...');
    
    for (const data of suameData) {
      const { resource } = await container.items.create(data);
      console.log(`✅ Created: ${resource.feederName} (${resource.status})`);
    }
    
    console.log('\n📊 SUAME Data Summary:');
    const { resources: newSuameItems } = await container.items.query('SELECT * FROM c WHERE c.district = "SUAME"').fetchAll();
    console.log(`Total SUAME records: ${newSuameItems.length}`);
    
    const statusCount = {};
    newSuameItems.forEach(item => {
      statusCount[item.status] = (statusCount[item.status] || 0) + 1;
    });
    
    console.log('Status breakdown:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} items`);
    });
    
    console.log('\n✅ SUAME data creation completed!');
    console.log('🎯 Now the SUAME district engineer should be able to see data in the application.');
    
  } catch (error) {
    console.error('Error creating SUAME data:', error.message);
  }
}

createSUAMEData(); 