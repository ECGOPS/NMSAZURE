const express = require('express');
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();

// JWT middleware
const jwtCheck = auth({
  audience: process.env.AZURE_AD_AUDIENCE || 'api://c79b4d39-85ab-43cc-995f-5bea2e4a29b4',
  issuerBaseURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || '4bfec755-4e36-40e5-8d30-57d8cdc6a2fe'}/v2.0`,
  tokenSigningAlg: 'RS256',
});

// Test route with JWT protection
app.use('/test', jwtCheck, (req, res) => {
  res.json({ message: 'JWT protected route', user: req.auth });
});

// Test route without JWT protection
app.use('/public', (req, res) => {
  res.json({ message: 'Public route' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`JWT Test server running on port ${PORT}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Azure AD Audience:', process.env.AZURE_AD_AUDIENCE);
  console.log('Azure AD Tenant ID:', process.env.AZURE_AD_TENANT_ID);
}); 