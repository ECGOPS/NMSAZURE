const axios = require('axios');

async function testSimple() {
  try {
    console.log('Testing simple overhead line inspections API...');
    
    const response = await axios.get('http://localhost:3001/api/overheadLineInspections');
    
    console.log('✅ API call successful');
    console.log('Response status:', response.status);
    console.log('Response data length:', response.data.length);
    
  } catch (error) {
    console.error('❌ API call failed');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error || error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

testSimple(); 