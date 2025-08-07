const express = require('express');
const { CosmosClient } = require('@azure/cosmos');
const { requireRole } = require('../roles');

const router = express.Router();
const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = 'substationInspections';
const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

// Log endpoint status only in development
if (process.env.NODE_ENV === 'development') {
  console.log('[SubstationInspections] Endpoint:', endpoint);
}

// GET all with filtering, sorting, pagination, and count
router.get('/', requireRole(['system_admin', 'global_engineer', 'regional_engineer', 'project_engineer', 'district_engineer', 'regional_general_manager', 'district_manager', 'ict', 'technician']), async (req, res) => {
  try {
    console.log('[SubstationInspections] GET request received with query:', req.query);
    console.log('[SubstationInspections] Database:', databaseId);
    console.log('[SubstationInspections] Container:', containerId);
    
    let queryStr = 'SELECT * FROM c';
    const filters = [];
    for (const key in req.query) {
      if (["sort", "order", "limit", "offset", "countOnly"].includes(key)) continue;
      filters.push(`c.${key} = "${req.query[key]}"`);
    }
    if (filters.length) queryStr += ' WHERE ' + filters.join(' AND ');
    if (req.query.sort) {
      queryStr += ` ORDER BY c.${req.query.sort} ${req.query.order === 'desc' ? 'DESC' : 'ASC'}`;
    }
              const limit = parseInt(req.query.limit) || 20; // Reduced default limit for faster loading
    const offset = parseInt(req.query.offset) || 0;
    queryStr += ` OFFSET ${offset} LIMIT ${limit}`;
    if (req.query.countOnly === 'true') {
      const countQuery = queryStr.replace(/SELECT \* FROM c/, 'SELECT VALUE COUNT(1) FROM c');
      console.log('[SubstationInspections] Count query:', countQuery);
      const { resources: countResources } = await container.items.query(countQuery).fetchAll();
      return res.json({ count: countResources[0] });
    }
    console.log('[SubstationInspections] Executing query:', queryStr);
    const { resources } = await container.items.query(queryStr).fetchAll();
    console.log('[SubstationInspections] Query result:', resources.length, 'inspections');
    res.json(resources);
  } catch (err) {
    console.error('Error in substation inspections route:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET by ID
router.get('/:id', requireRole(['system_admin', 'global_engineer', 'regional_engineer', 'project_engineer', 'district_engineer', 'regional_general_manager', 'district_manager', 'ict', 'technician']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resource } = await container.item(id, id).read();
    if (!resource) {
      return res.status(404).json({ error: 'Inspection not found' });
    }
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST (create)
router.post('/', requireRole(['system_admin', 'global_engineer', 'regional_engineer', 'project_engineer', 'district_engineer', 'regional_general_manager', 'district_manager', 'ict', 'technician']), async (req, res) => {
  try {
    const { resource } = await container.items.create(req.body);
    res.status(201).json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT (update)
router.put('/:id', requireRole(['system_admin', 'global_engineer', 'regional_engineer', 'project_engineer', 'district_engineer', 'regional_general_manager', 'district_manager', 'ict', 'technician']), async (req, res) => {
  try {
    const { id } = req.params;
    const { resource } = await container.item(id, id).replace(req.body);
    res.json(resource);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', requireRole(['system_admin', 'global_engineer', 'regional_engineer', 'project_engineer', 'district_engineer', 'regional_general_manager', 'district_manager', 'ict', 'technician']), async (req, res) => {
  try {
    const { id } = req.params;
    await container.item(id, id).delete();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 