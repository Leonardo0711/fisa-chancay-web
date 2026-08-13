'use strict';

const express = require('express');
const router = express.Router();
const programasController = require('../controllers/programas.controller');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// UI Route
router.get('/programas', requireAuth, requirePermission('PROGRAMAS', 'view'), programasController.renderProgramas);

// API Routes
router.get('/api/programas', requireAuth, requirePermission('PROGRAMAS', 'view'), programasController.apiListarProgramas);
router.get('/api/programas/next-code', requireAuth, requirePermission('PROGRAMAS', 'view'), programasController.apiObtenerNextCode);
router.post('/api/programas', requireAuth, requirePermission('PROGRAMAS', 'save'), programasController.apiCrearPrograma);
router.put('/api/programas/:procod', requireAuth, requirePermission('PROGRAMAS', 'save'), programasController.apiEditarPrograma);
router.patch('/api/programas/:procod/status', requireAuth, requirePermission('PROGRAMAS', 'annul'), programasController.apiCambiarEstado);
router.delete('/api/programas/:procod', requireAuth, requirePermission('PROGRAMAS', 'delete'), programasController.apiEliminarPrograma);

module.exports = router;
