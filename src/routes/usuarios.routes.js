'use strict';

const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// UI Route
router.get('/usuarios', requireAuth, requirePermission('USUARIOS', 'view'), usuariosController.renderUsuarios);

// API Routes
router.get('/api/usuarios', requireAuth, requirePermission('USUARIOS', 'view'), usuariosController.apiListarUsuarios);
router.post('/api/usuarios', requireAuth, requirePermission('USUARIOS', 'save'), usuariosController.apiCrearUsuario);
router.put('/api/usuarios/:usucod', requireAuth, requirePermission('USUARIOS', 'save'), usuariosController.apiEditarUsuario);
router.patch('/api/usuarios/:usucod/password', requireAuth, requirePermission('USUARIOS', 'save'), usuariosController.apiCambiarPassword);
router.patch('/api/usuarios/:usucod/status', requireAuth, requirePermission('USUARIOS', 'annul'), usuariosController.apiCambiarEstado);
router.delete('/api/usuarios/:usucod', requireAuth, requirePermission('USUARIOS', 'delete'), usuariosController.apiEliminarUsuario);

module.exports = router;
