'use strict';

const express = require('express');
const router = express.Router();
const catalogosController = require('../controllers/catalogos.controller');
const { requireAuth } = require('../middleware/auth');

// Protected lookup endpoints (require active session but no specific module permission)
router.get('/api/catalogos/empresas', requireAuth, catalogosController.getEmpresas);
router.get('/api/catalogos/talleres', requireAuth, catalogosController.getTalleres);
router.get('/api/catalogos/talleres/:empcod', requireAuth, catalogosController.getTalleresPorEmpresa);
router.get('/api/catalogos/usuarios-activos', requireAuth, catalogosController.getUsuariosActivos);
router.get('/api/catalogos/programas-activos', requireAuth, catalogosController.getProgramasActivos);

module.exports = router;
