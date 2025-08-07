const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const { requireRole } = require('../roles');

const router = express.Router();
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'broadcastMessages';
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// GET all
router.get('/', requireRole(['system_admin', 'global_engineer', 'regional_engineer', 'project_engineer', 'district_engineer', 'regional_general_manager', 'district_manager', 'ict', 'technician']), async (req, res) => {
  try {
    // For development, return empty array if database is not configured
    if (!endpoint || endpoint.includes('dev-cosmos-endpoint')) {
      console.log('Development mode: returning empty broadcast messages array');
      return res.json([]);
    }
    
    const { resources } = await container.items.query('SELECT * FROM c').fetchAll();
    res.json(resources);
  } catch (err) {
    console.error('Error in broadcast messages route:', err);
    // For development, return empty array on error
    if (process.env.NODE_ENV === 'development') {
      return res.json([]);
    }
    res.status(500).json({ error: err.message });
  }
});

// POST (create)
router.post('/', requireRole(['system_admin', 'global_engineer']), async (req, res) => {
  try {
    const { resource } = await container.items.create(req.body);
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (update)
router.put('/:id', requireRole(['system_admin', 'global_engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resource } = await container.item(id, id).replace(req.body);
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', requireRole(['system_admin', 'global_engineer']), async (req, res) => {
  try {
    const { id } = req.params;
    await container.item(id, id).delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 