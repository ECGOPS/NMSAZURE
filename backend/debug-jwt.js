const { auth } = require('express-oauth2-jwt-bearer');
require('dotenv').config();

console.log('=== JWT Debug Configuration ===');
console.log('AZURE_AD_AUDIENCE:', process.env.AZURE_AD_AUDIENCE);
console.log('AZURE_AD_TENANT_ID:', process.env.AZURE_AD_TENANT_ID);
console.log('AZURE_AD_CLIENT_ID:', process.env.AZURE_AD_CLIENT_ID);

const jwtCheck = auth({
  audience: process.env.AZURE_AD_AUDIENCE,
  issuerBaseURL: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
  tokenSigningAlg: 'RS256',
});

console.log('=== JWT Check Configuration ===');
console.log('Audience:', process.env.AZURE_AD_AUDIENCE);
console.log('Issuer Base URL:', `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`);
console.log('Token Signing Alg:', 'RS256');

module.exports = jwtCheck; 