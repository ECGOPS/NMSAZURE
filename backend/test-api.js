const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing overhead line inspections API...');
    
    const response = await axios.get('http://localhost:3001/api/overheadLineInspections', {
      params: {
        district: 'SUAME',
        limit: 20,
        offset: 0,
        sort: 'createdAt',
        order: 'desc',
        includeBase64: true
      }
    });
    
    console.log('✅ API call successful');
    console.log('Response status:', response.status);
    console.log('Response data length:', response.data.length);
    
  } catch (error) {
    console.error('❌ API call failed');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error || error.message);
  }
}

testAPI(); 