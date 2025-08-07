const { auth } = require('express-oauth2-jwt-bearer');

// Get values from environment variables
const audience = process.env.AZURE_AD_AUDIENCE;
const tenantId = process.env.AZURE_AD_TENANT_ID;

// Validate required environment variables
if (!audience || !tenantId) {
  console.error('[JWT] ❌ Missing required environment variables:');
  console.error('   AZURE_AD_AUDIENCE:', audience ? 'SET' : 'MISSING');
  console.error('   AZURE_AD_TENANT_ID:', tenantId ? 'SET' : 'MISSING');
  console.error('[JWT] Please set these environment variables for JWT authentication');
  process.exit(1);
}

console.log('[JWT] Configuring JWT with:', {
  audience: audience.replace('api://', ''),
  issuerBaseURL: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  tenantId: tenantId
});

const jwtCheck = auth({
  audience: audience.replace('api://', ''),
  issuerBaseURL: `https://login.microsoftonline.com/${tenantId}/v2.0`,
  tokenSigningAlg: 'RS256',
});

// Add debugging middleware
const jwtCheckWithDebug = (req, res, next) => {
  console.log('[JWT] Processing request:', req.path);
  console.log('[JWT] Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
  console.log('[JWT] All headers:', Object.keys(req.headers));
  
  if (req.headers.authorization) {
    console.log('[JWT] Token starts with:', req.headers.authorization.substring(0, 50) + '...');
    console.log('[JWT] Token format check:', req.headers.authorization.startsWith('Bearer ') ? 'Correct' : 'Incorrect');
  }
  
  jwtCheck(req, res, (err) => {
    if (err) {
      console.log('[JWT] ❌ JWT validation failed:', err.message);
      console.log('[JWT] Error details:', err);
      console.log('[JWT] Error stack:', err.stack);
      return next(err);
    }
    
    console.log('[JWT] ✅ JWT validation passed');
    console.log('[JWT] req.auth:', req.auth);
    console.log('[JWT] req.auth.sub:', req.auth?.sub);
    next();
  });
};

module.exports = jwtCheckWithDebug; 