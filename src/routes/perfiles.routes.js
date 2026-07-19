'use strict';

const express = require('express');
const router = express.Router();
const perfilesController = require('../controllers/perfiles.controller');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// UI Route
router.get('/perfiles', requireAuth, requirePermission('PERFILES', 'view'), perfilesController.renderPerfiles);

// API Routes
router.get('/api/perfiles', requireAuth, requirePermission('PERFILES', 'view'), perfilesController.apiListarPerfiles);
router.get('/api/perfiles/permisos', requireAuth, requirePermission('PERFILES', 'view'), perfilesController.apiObtenerPermisosUsuario);
router.post('/api/perfiles/guardar', requireAuth, requirePermission('PERFILES', 'save'), perfilesController.apiGuardarPermisos);
router.delete('/api/perfiles/:empcod/:talcod/:usucod/:procod', requireAuth, requirePermission('PERFILES', 'annul'), perfilesController.apiEliminarPermiso);

module.exports = router;
