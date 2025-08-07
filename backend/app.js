console.log('Starting backend app.js...');
// Set NODE_ENV for development
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log('NODE_ENV:', process.env.NODE_ENV);

// Only load dotenv in development
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

// Add error handling for missing environment variables
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'AZURE_AD_AUDIENCE',
    'AZURE_AD_TENANT_ID', 
    'AZURE_AD_CLIENT_ID',
    'COSMOS_DB_ENDPOINT',
    'COSMOS_DB_KEY',
    'COSMOS_DB_DATABASE'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  } else {
    console.log('✅ All required environment variables are set');
  }
}
const express = require('express');
const cors = require('cors');
const jwtCheck = require('./auth');
const { getUserRole } = require('./roles');
const checkJwt = require('./authMiddleware');
const { getContainer } = require('./cosmosClient');

const app = express();

// Trust proxy for Azure deployment (fixes rate limiting with X-Forwarded-For headers)
app.set('trust proxy', true);

// Security middleware - add helmet for security headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting for API protection - Fixed for Azure deployment
const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' && req.path.startsWith('/api/'), // Skip rate limiting in development for API routes
  // Azure-specific configuration
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (Azure proxy)
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  }
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// CORS configuration - Fixed for Azure deployment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:5173', 'https://localhost:5173', 'http://localhost:3000', 'https://localhost:3000'] // Allow localhost for testing
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Cache-Control'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Increase payload size limit for photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Security: Remove server information
app.disable('x-powered-by');

// Azure-specific configurations
if (process.env.NODE_ENV === 'production') {
  // Trust Azure's proxy headers
  app.set('trust proxy', true);
  
  // Log Azure-specific information
  console.log('[AZURE] Running in Azure production environment');
  console.log('[AZURE] Trust proxy enabled for X-Forwarded-For headers');
}

// Additional security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Remove or obfuscate headers that reveal API structure
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Add obfuscating headers
    res.setHeader('X-API-Version', 'v2');
    res.setHeader('X-Response-Time', Date.now().toString());
    
    // Log minimal information in production
    if (req.path.startsWith('/api/')) {
      console.log(`[API] ${req.method} ${req.path} - ${res.statusCode}`);
    }
    
    next();
  });
}

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', err => {
  console.error('Unhandled Rejection:', err);
});

// Health check endpoint - must be defined before JWT middleware
app.get('/', (req, res) => res.json({ 
  status: 'API is running',
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
}));

// Azure AD JWT authentication for all routes - ENABLED for production and development testing
if (process.env.NODE_ENV === 'production' || process.env.TEST_JWT === 'true') {
  console.log('[SECURITY] ENABLING JWT authentication for production/testing');
  console.log('[DEBUG] Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    TEST_JWT: process.env.TEST_JWT,
    AZURE_AD_AUDIENCE: process.env.AZURE_AD_AUDIENCE,
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID
  });
  
  // Apply JWT authentication to all routes EXCEPT photo routes (public access needed)
  app.use((req, res, next) => {
    // Skip JWT authentication for photo routes (public access needed)
    if (req.path.startsWith('/api/photos/serve/') ||
        req.path.startsWith('/api/photos/upload') ||
        req.path.startsWith('/api/photos/upload-file') ||
        req.path.startsWith('/api/photos/delete')) {
      console.log('[SECURITY] Skipping JWT for photo route:', req.path);
      return next();
    }
    
    // Apply JWT authentication to all other routes
    jwtCheck(req, res, next);
  });
  
  console.log('[SECURITY] JWT Authentication: ENABLED (with photo serve exclusion)');
} else {
  console.log('[DEV] JWT authentication disabled for development');
  console.log('[DEV] JWT Authentication: DISABLED');
  console.log('[DEV] To enable JWT testing, set TEST_JWT=true');
}

// Production-ready user authentication middleware
app.use(async (req, res, next) => {
  try {
    // Skip authentication for health check endpoint and photo routes
    if (req.path === '/' || 
        req.path.startsWith('/api/photos/serve/') ||
        req.path.startsWith('/api/photos/upload') ||
        req.path.startsWith('/api/photos/upload-file') ||
        req.path.startsWith('/api/photos/delete')) {
      return next();
    }
    
    let userData = null;
    
    if (process.env.NODE_ENV === 'production' || process.env.TEST_JWT === 'true') {
      // Production/Testing: Use JWT token for authentication
      console.log('[AUTH] Checking JWT authentication...');
      console.log('[AUTH] req.auth:', req.auth);
      console.log('[AUTH] req.auth.payload.sub:', req.auth?.payload?.sub);
      console.log('[AUTH] Authorization header:', req.headers.authorization ? 'Present' : 'Missing');
      
      if (req.auth && req.auth.payload && req.auth.payload.sub) {
        try {
          const { CosmosClient } = require('@azure/cosmos');
          const client = new CosmosClient({ 
            endpoint: process.env.COSMOS_DB_ENDPOINT, 
            key: process.env.COSMOS_DB_KEY 
          });
          const database = client.database(process.env.COSMOS_DB_DATABASE);
          const container = database.container('users');
          
          // 1. First try to find user by JWT UID
          let { resources } = await container.items.query(
            `SELECT * FROM c WHERE c.uid = "${req.auth.payload.sub}"`
          ).fetchAll();
          
          if (resources.length > 0) {
            // User found by JWT UID - use existing user
            userData = resources[0];
            if (process.env.NODE_ENV === 'production') {
              console.log(`[AUTH] User authenticated: ${userData.id}`);
            } else {
              console.log(`[AUTH] Found user in database:`, { id: userData.id, role: userData.role });
            }
          } else {
            // 2. Try to find user by email (for existing users)
            const { resources: emailUsers } = await container.items.query(
              `SELECT * FROM c WHERE c.email = "${req.auth.payload.email || req.auth.payload.preferred_username}"`
            ).fetchAll();
            
            if (emailUsers.length > 0) {
              // Found existing user by email - update their UID to match JWT and apply smart name mapping
              const existingUser = emailUsers[0];
              
              // Smart name mapping: use Azure AD name if it's more complete
              const azureName = req.auth.payload.name || req.auth.payload.preferred_username;
              const existingName = existingUser.name || existingUser.displayName;
              
              // Get name mapping strategy from environment (default to 'app_first')
              const nameMappingStrategy = process.env.NAME_MAPPING_STRATEGY || 'app_first';
              let finalName = existingName;
              let nameChanged = false;
              
              if (azureName && existingName) {
                switch (nameMappingStrategy) {
                  case 'app_first':
                    // Always use app name if it exists
                    finalName = existingName;
                    if (azureName !== existingName) {
                      console.log(`[AUTH] Name mismatch: App="${existingName}" vs Azure="${azureName}" - using app name`);
                    }
                    break;
                    
                  case 'azure_first':
                    // Use Azure AD name if different from app name
                    if (azureName !== existingName) {
                      console.log(`[AUTH] Updating name from "${existingName}" to "${azureName}"`);
                      finalName = azureName;
                      nameChanged = true;
                    }
                    break;
                    
                  case 'app_only':
                    // Only use app name, never Azure AD
                    finalName = existingName;
                    break;
                    
                  case 'azure_only':
                    // Only use Azure AD name, never app name
                    if (azureName !== existingName) {
                      console.log(`[AUTH] Forcing name update from "${existingName}" to "${azureName}"`);
                      finalName = azureName;
                      nameChanged = true;
                    }
                    break;
                    
                  default:
                    // Default to app_first
                    finalName = existingName;
                    break;
                }
              } else {
                // Fallback to whichever name is available
                finalName = existingName || azureName;
              }
              
              // For existing users, we need to recreate with new ID since Cosmos DB ID is immutable
              // Only set pre_registered status if user was never logged in before (no updatedAt timestamp)
              // or if user has no status field (undefined/null)
              const needsApproval = !existingUser.updatedAt || existingUser.status === 'pre_registered' || !existingUser.status;
              
              const newUserData = {
                id: req.auth.payload.sub, // New Azure AD ID
                uid: req.auth.payload.sub, // New Azure AD UID
                name: finalName,
                displayName: finalName,
                email: req.auth.payload.email || req.auth.payload.preferred_username,
                role: existingUser.role, // Keep original role
                status: needsApproval ? 'pre_registered' : (existingUser.status || 'active'), // Handle undefined status
                region: existingUser.region || '',
                district: existingUser.district || '',
                staffId: existingUser.staffId || '',
                disabled: existingUser.disabled || false,
                createdAt: existingUser.createdAt, // Keep original creation date
                updatedAt: new Date().toISOString()
              };
              
              // Delete old user and create new one with correct ID
              await container.item(existingUser.id, existingUser.id).delete();
              await container.items.create(newUserData);
              userData = newUserData;
              console.log(`[AUTH] Migrated existing user to new ID: ${existingUser.email} (old ID: ${existingUser.id} → new ID: ${req.auth.payload.sub})`);
            } else {
              // 3. Create new user with pending role and pre_registered status
              userData = {
                id: req.auth.payload.sub,
                uid: req.auth.payload.sub,
                email: req.auth.payload.email || req.auth.payload.preferred_username,
                name: req.auth.payload.name || req.auth.payload.preferred_username,
                displayName: req.auth.payload.name || req.auth.payload.preferred_username,
                role: 'pending', // New users start with pending role
                status: 'pre_registered', // New status for pending approval
                region: '',
                district: '',
                staffId: '',
                disabled: false,
                createdAt: new Date().toISOString(),
              };
              
              // Create new user
              await container.items.create(userData);
              if (process.env.NODE_ENV === 'production') {
                console.log(`[AUTH] Created new user: ${userData.id}`);
              } else {
                console.log(`[AUTH] Created new user from JWT:`, { id: userData.id, email: userData.email, role: userData.role, status: userData.status });
              }
            }
          }
        } catch (error) {
          console.error(`[AUTH] Error fetching/creating user:`, error.message);
          return res.status(500).json({ error: 'Authentication failed' });
        }
      } else {
        // Require valid JWT token in production/testing
        console.log('[AUTH] ❌ No valid JWT token provided - authentication required');
        console.log('[AUTH] req.auth is:', req.auth);
        console.log('[AUTH] req.auth.payload.sub is:', req.auth?.payload?.sub);
        console.log('[AUTH] Authorization header is:', req.headers.authorization);
        return res.status(401).json({ error: 'No valid JWT token provided' });
      }
    } else {
      // Development: Use query parameter authentication (existing logic)
      if (req.query.userId) {
        try {
          const { CosmosClient } = require('@azure/cosmos');
          const client = new CosmosClient({ 
            endpoint: process.env.COSMOS_DB_ENDPOINT, 
            key: process.env.COSMOS_DB_KEY 
          });
          const database = client.database(process.env.COSMOS_DB_DATABASE);
          const container = database.container('users');
          
          const { resources } = await container.items.query(`SELECT * FROM c WHERE c.id = "${req.query.userId}"`).fetchAll();
          if (resources.length > 0) {
            userData = resources[0];
            if (process.env.NODE_ENV === 'production') {
              console.log(`[AUTH] User authenticated: ${userData.id}`);
            } else {
              console.log(`[AUTH] Found user in database:`, userData);
            }
          }
        } catch (error) {
          console.log(`[AUTH] Error fetching user from database:`, error.message);
        }
      }
      
      // If no user found, use default for development
      if (!userData) {
        userData = {
          id: req.query.userId || 'dev-user-id',
          role: 'system_admin', // Default to system admin for development
          region: '',
          district: '',
          email: 'dev@example.com'
        };
        if (process.env.NODE_ENV === 'production') {
          console.log(`[DEV] Using development user: ${userData.id}`);
        } else {
          console.log(`[DEV] Using default user:`, userData);
        }
      }
    }
    
    req.userRole = userData.role;
    req.userId = req.auth?.payload?.sub || userData.id; // Always use JWT sub as userId
    req.user = userData;
    
    next();
  } catch (err) {
    console.error('Error getting user role:', err);
    res.status(500).json({ error: 'Failed to get user role' });
  }
});

// Routers for all collections
const collections = [
  'broadcastMessages', 'chat_messages', 'controlOutages', 'devices', 'districts', 'feeders',
  'loadMonitoring', 'music_files', 'op5Faults', 'overheadLineInspections', 'permissions', 'regions',
  'securityEvents', 'sms_logs', 'staffIds', 'substationInspections', 'system', 'userLogs',
  'users', 'vitAssets', 'vitInspections'
];

collections.forEach(col => {
  app.use(`/api/${col}`, require(`./routes/${col}`));
});

// Production obfuscated endpoint mappings
if (process.env.NODE_ENV === 'production') {
  // Obfuscated routes for production
  app.use('/api/audio', require('./routes/music_files'));
  app.use('/api/employees', require('./routes/staffIds'));
  app.use('/api/accounts', require('./routes/users'));
  app.use('/api/zones', require('./routes/regions'));
  app.use('/api/areas', require('./routes/districts'));
  app.use('/api/inspections', require('./routes/overheadLineInspections'));
  app.use('/api/assets', require('./routes/vitAssets'));
  app.use('/api/checks', require('./routes/vitInspections'));
  app.use('/api/outages', require('./routes/controlOutages'));
  app.use('/api/monitoring', require('./routes/loadMonitoring'));
  app.use('/api/faults', require('./routes/op5Faults'));
  app.use('/api/events', require('./routes/securityEvents'));
  app.use('/api/substations', require('./routes/substationInspections'));
  app.use('/api/logs', require('./routes/userLogs'));
  app.use('/api/core', require('./routes/system'));
  app.use('/api/access', require('./routes/permissions'));
  app.use('/api/broadcasts', require('./routes/broadcastMessages'));
  app.use('/api/messages', require('./routes/chat_messages'));
  app.use('/api/equipment', require('./routes/devices'));
  app.use('/api/powerlines', require('./routes/feeders'));
  app.use('/api/notifications', require('./routes/sms_logs'));
}

// Photo routes (NO AUTH REQUIRED)
app.use('/api/photos', require('./routes/photos'));

// Add a protected test route
app.get('/api/protected', checkJwt, async (req, res) => {
  try {
    const container = getContainer();
    // Fetch a single item as a test (replace with your actual query logic)
    const { resources } = await container.items.query('SELECT TOP 1 * FROM c').fetchAll();
    res.json({
      message: 'Access granted. This is protected data from Cosmos DB!',
      data: resources[0] || null,
      user: req.user
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from Cosmos DB', details: err.message });
  }
});

// Redirect /api/logs to /api/userLogs for compatibility
app.use('/api/logs', require('./routes/userLogs'));

// Development test route - bypass authentication
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Development test route working',
      user: req.user,
      userRole: req.userRole,
      timestamp: new Date().toISOString()
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ Server started successfully`);
    console.log(`🔒 Security: JWT Authentication ENABLED`);
  } else if (process.env.TEST_JWT === 'true') {
    console.log(`Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`JWT Authentication: ENABLED`);
  } else {
    console.log(`Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`JWT Authentication: DISABLED`);
  }
}); 