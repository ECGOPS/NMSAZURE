const { CosmosClient } = require('@azure/cosmos');

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const usersContainerId = 'users';

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const usersContainer = database.container(usersContainerId);

async function getUserRole(userId) {
  // For development (without JWT testing), return system_admin for any user
  if ((process.env.NODE_ENV === 'development' && process.env.TEST_JWT !== 'true') || !userId) {
    return 'system_admin';
  }
  
  try {
    const { resource } = await usersContainer.item(userId, userId).read();
    return resource ? resource.role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

function requireRole(roles) {
  return async (req, res, next) => {
    try {
      // For development (without JWT testing), always allow access
      if (process.env.NODE_ENV === 'development' && process.env.TEST_JWT !== 'true') {
        req.userRole = 'system_admin';
        return next();
      }
      
      // Production: Check user authentication and role
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const role = await getUserRole(userId);
      
      if (!role || (Array.isArray(roles) ? !roles.includes(role) : role !== roles)) {
        console.log(`[AUTH] Access denied for user ${userId} with role ${role}`);
        return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
      }
      
      req.userRole = role;
      next();
    } catch (err) {
      console.error('Role check failed:', err);
      // For development (without JWT testing), allow access on error
      if (process.env.NODE_ENV === 'development' && process.env.TEST_JWT !== 'true') {
        req.userRole = 'system_admin';
        return next();
      }
      res.status(500).json({ error: 'Role check failed' });
    }
  };
}

// Production-ready authorization helper
function requireAuth() {
  return async (req, res, next) => {
    try {
      if (process.env.NODE_ENV === 'development' && process.env.TEST_JWT !== 'true') {
        return next();
      }
      
      // Production/Testing: Check if user is authenticated
      if (!req.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      next();
    } catch (err) {
      console.error('Auth check failed:', err);
      if (process.env.NODE_ENV === 'development' && process.env.TEST_JWT !== 'true') {
        return next();
      }
      res.status(500).json({ error: 'Authentication check failed' });
    }
  };
}

module.exports = { getUserRole, requireRole, requireAuth }; 