'use strict';

const express = require('express');
const router = express.Router();
const produccionController = require('../controllers/produccion.controller');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// UI Route
router.get('/produccion', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.renderProduccion);

// API Routes
router.get('/api/produccion/ots', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.apiBuscarOts);
router.get('/api/produccion/ots/:otcod/detalles', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.apiObtenerDetallesOt);
router.get('/api/produccion/ots/:otcod/lotes', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.apiObtenerLotesOt);
router.get('/api/produccion/ubicaciones', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.apiListarUbicaciones);
router.get('/api/produccion/ubicaciones/producto/:procod', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.apiObtenerConfigUbicacionProducto);
router.get('/api/produccion/operarios', requireAuth, requirePermission('PRODUCCION', 'view'), produccionController.apiListarOperarios);
router.post('/api/produccion/registrar', requireAuth, requirePermission('PRODUCCION', 'save'), produccionController.apiRegistrarProduccion);

// Monitor & Export Routes
router.get('/api/produccion/registros', requireAuth, produccionController.apiListarRegistrosProduccion);
router.get('/api/produccion/registros/exportar', requireAuth, produccionController.apiExportarRegistrosProduccion);
router.get('/api/produccion/registros/:cpcod/detalle', requireAuth, produccionController.apiObtenerDetalleRegistro);

module.exports = router;

