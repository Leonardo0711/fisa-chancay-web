'use strict';

const express = require('express');
const router = express.Router();
const maestrosController = require('../controllers/maestros.controller');
const { requireAuth } = require('../middleware/auth');

// Middleware to restrict access to administrators only
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.usuadm) {
    return next();
  }
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  return res.status(403).render('error', {
    title: 'Acceso Denegado',
    message: 'No cuenta con los permisos necesarios para acceder a esta sección de mantenimiento.'
  });
};

// UI Routes
router.get('/maestros/unidades', requireAuth, requireAdmin, maestrosController.renderUnidades);
router.get('/maestros/ubicaciones', requireAuth, requireAdmin, maestrosController.renderUbicaciones);
router.get('/maestros/ubicaciones-producto', requireAuth, requireAdmin, maestrosController.renderUbicacionesProducto);
router.get('/maestros/terceras', requireAuth, requireAdmin, maestrosController.renderTerceras);

// API Unidades
router.get('/api/maestros/unidades', requireAuth, requireAdmin, maestrosController.apiListarUnidades);
router.get('/api/maestros/unidades/next-code', requireAuth, requireAdmin, maestrosController.apiObtenerNextCodeUnidad);
router.post('/api/maestros/unidades', requireAuth, requireAdmin, maestrosController.apiCrearUnidad);
router.put('/api/maestros/unidades/:unicod', requireAuth, requireAdmin, maestrosController.apiEditarUnidad);
router.patch('/api/maestros/unidades/:unicod/status', requireAuth, requireAdmin, maestrosController.apiCambiarEstadoUnidad);
router.delete('/api/maestros/unidades/:unicod', requireAuth, requireAdmin, maestrosController.apiEliminarUnidad);

// API Ubicaciones
router.get('/api/maestros/ubicaciones', requireAuth, requireAdmin, maestrosController.apiListarUbicaciones);
router.get('/api/maestros/ubicaciones/next-code', requireAuth, requireAdmin, maestrosController.apiObtenerNextCodeUbicacion);
router.post('/api/maestros/ubicaciones', requireAuth, requireAdmin, maestrosController.apiCrearUbicacion);
router.put('/api/maestros/ubicaciones/:ubicod', requireAuth, requireAdmin, maestrosController.apiEditarUbicacion);
router.patch('/api/maestros/ubicaciones/:ubicod/status', requireAuth, requireAdmin, maestrosController.apiCambiarEstadoUbicacion);
router.delete('/api/maestros/ubicaciones/:ubicod', requireAuth, requireAdmin, maestrosController.apiEliminarUbicacion);

// API Ubicaciones por Producto
router.get('/api/maestros/ubicaciones-producto', requireAuth, requireAdmin, maestrosController.apiListarUbicacionesProducto);
router.post('/api/maestros/ubicaciones-producto', requireAuth, requireAdmin, maestrosController.apiCrearUbicacionProducto);
router.put('/api/maestros/ubicaciones-producto/:procod/:ubicod', requireAuth, requireAdmin, maestrosController.apiEditarUbicacionProducto);
router.delete('/api/maestros/ubicaciones-producto/:procod/:ubicod', requireAuth, requireAdmin, maestrosController.apiEliminarUbicacionProducto);

// API Empresas Terceras
router.get('/api/maestros/terceras', requireAuth, requireAdmin, maestrosController.apiListarTerceras);
router.get('/api/maestros/terceras/next-code', requireAuth, requireAdmin, maestrosController.apiObtenerNextCodeTercera);
router.post('/api/maestros/terceras', requireAuth, requireAdmin, maestrosController.apiCrearTercera);
router.put('/api/maestros/terceras/:tercod', requireAuth, requireAdmin, maestrosController.apiEditarTercera);
router.patch('/api/maestros/terceras/:tercod/status', requireAuth, requireAdmin, maestrosController.apiCambiarEstadoTercera);
router.delete('/api/maestros/terceras/:tercod', requireAuth, requireAdmin, maestrosController.apiEliminarTercera);

module.exports = router;

