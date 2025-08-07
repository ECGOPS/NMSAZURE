const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'overheadLineInspections';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function countSUAMEData() {
  try {
    console.log('Counting SUAME data in overhead line inspections...');
    
    // Count total items in SUAME district
    const { resources: suameItems } = await container.items.query('SELECT * FROM c WHERE c.district = "SUAME"').fetchAll();
    console.log(`\n📊 SUAME Data Summary:`);
    console.log(`Total items in SUAME district: ${suameItems.length}`);
    
    if (suameItems.length > 0) {
      // Group by status
      const statusCount = {};
      suameItems.forEach(item => {
        const status = item.status || 'unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      console.log('\n📈 Status Breakdown:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  - ${status}: ${count} items`);
      });
      
      // Group by feeder
      const feederCount = {};
      suameItems.forEach(item => {
        const feeder = item.feederName || 'unknown';
        feederCount[feeder] = (feederCount[feeder] || 0) + 1;
      });
      
      console.log('\n🔌 Feeder Breakdown:');
      Object.entries(feederCount).forEach(([feeder, count]) => {
        console.log(`  - ${feeder}: ${count} items`);
      });
      
      // Show date range
      const dates = suameItems.map(item => new Date(item.createdAt || item.date)).sort();
      if (dates.length > 0) {
        console.log('\n📅 Date Range:');
        console.log(`  - Earliest: ${dates[0].toISOString().split('T')[0]}`);
        console.log(`  - Latest: ${dates[dates.length - 1].toISOString().split('T')[0]}`);
      }
      
      // Show sample items
      console.log('\n📋 Sample Items (first 3):');
      suameItems.slice(0, 3).forEach((item, index) => {
        console.log(`  ${index + 1}. ID: ${item.id}`);
        console.log(`     Feeder: ${item.feederName || 'N/A'}`);
        console.log(`     Status: ${item.status || 'N/A'}`);
        console.log(`     Date: ${item.date || item.createdAt?.split('T')[0] || 'N/A'}`);
        console.log(`     Reference Pole: ${item.referencePole || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('\n❌ No data found for SUAME district');
    }
    
    // Also check total items in the container for comparison
    const { resources: allItems } = await container.items.query('SELECT * FROM c').fetchAll();
    console.log(`\n📊 Overall Container Summary:`);
    console.log(`Total items in container: ${allItems.length}`);
    console.log(`SUAME percentage: ${((suameItems.length / allItems.length) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Error counting SUAME data:', error.message);
  }
}

countSUAMEData(); 