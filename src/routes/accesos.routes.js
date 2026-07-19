'use strict';

const express = require('express');
const router = express.Router();
const accesosController = require('../controllers/accesos.controller');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// UI Route
router.get('/accesos', requireAuth, requirePermission('ACCESOS', 'view'), accesosController.renderAccesos);

// API Routes
router.get('/api/accesos', requireAuth, requirePermission('ACCESOS', 'view'), accesosController.apiListarAccesos);
router.post('/api/accesos', requireAuth, requirePermission('ACCESOS', 'save'), accesosController.apiCrearAcceso);
router.post('/api/accesos/:usucod/bulk', requireAuth, requirePermission('ACCESOS', 'save'), accesosController.apiBulkUpsert);
router.put('/api/accesos/:empcod/:talcod/:usucod', requireAuth, requirePermission('ACCESOS', 'save'), accesosController.apiEditarAcceso);
router.patch('/api/accesos/:empcod/:talcod/:usucod/status', requireAuth, requirePermission('ACCESOS', 'annul'), accesosController.apiCambiarEstado);
router.patch('/api/accesos/:empcod/:talcod/:usucod/default', requireAuth, requirePermission('ACCESOS', 'save'), accesosController.apiMarcarPredeterminado);

module.exports = router;
