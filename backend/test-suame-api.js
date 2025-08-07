const axios = require('axios');

async function testSUAMEAPI() {
  try {
    console.log('Testing SUAME district engineer API access...');
    
    // Test the API with SUAME district filter
    const response = await axios.get('http://localhost:3001/api/overheadLineInspections', {
      params: {
        district: 'SUAME',
        limit: 20,
        offset: 0,
        sort: 'createdAt',
        order: 'desc'
      }
    });
    
    console.log('✅ SUAME API call successful');
    console.log('Response status:', response.status);
    console.log('Response data length:', response.data.length);
    
    if (response.data.length > 0) {
      console.log('\n📋 SUAME Data Sample:');
      response.data.slice(0, 2).forEach((item, index) => {
        console.log(`${index + 1}. ${item.feederName} (${item.status})`);
        console.log(`   Reference Pole: ${item.referencePole}`);
        console.log(`   Voltage Level: ${item.voltageLevel}`);
        console.log('');
      });
    }
    
    console.log('🎯 SUAME district engineer should now be able to see data in the application!');
    
  } catch (error) {
    console.error('❌ SUAME API call failed');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error || error.message);
  }
}

testSUAMEAPI(); 