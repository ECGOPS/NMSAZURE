const express = require('express');
const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config();

const app = express();

// JWT middleware with detailed logging
const jwtCheck = auth({
  audience: process.env.AZURE_AD_AUDIENCE,
  issuerBaseURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
  tokenSigningAlg: 'RS256',
});

// Test route with JWT protection
app.use('/test', (req, res, next) => {
  console.log('=== JWT Test Request ===');
  console.log('Headers:', req.headers);
  console.log('Authorization:', req.headers.authorization);
  
  jwtCheck(req, res, (err) => {
    if (err) {
      console.log('=== JWT Error ===');
      console.log('Error:', err.message);
      console.log('Status:', err.status);
      console.log('Code:', err.code);
      return res.status(401).json({ 
        error: err.message, 
        status: err.status,
        code: err.code 
      });
    }
    
    console.log('=== JWT Success ===');
    console.log('Auth:', req.auth);
    res.json({ 
      message: 'JWT protected route', 
      user: req.auth,
      audience: process.env.AZURE_AD_AUDIENCE
    });
  });
});

// Public route
app.use('/public', (req, res) => {
  res.json({ message: 'Public route' });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`JWT Test server running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('- AZURE_AD_AUDIENCE:', process.env.AZURE_AD_AUDIENCE);
  console.log('- AZURE_AD_TENANT_ID:', process.env.AZURE_AD_TENANT_ID);
  console.log('- AZURE_AD_CLIENT_ID:', process.env.AZURE_AD_CLIENT_ID);
}); 