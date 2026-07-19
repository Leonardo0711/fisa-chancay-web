'use strict';

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// Import sub-routers
const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const accesosRoutes = require('./accesos.routes');
const programasRoutes = require('./programas.routes');
const perfilesRoutes = require('./perfiles.routes');
const catalogosRoutes = require('./catalogos.routes');

// Mount authentication routes first
router.use(authRoutes);

// Public basic healthcheck route
router.get('/healthz', (req, res) => {
  const env = require('../config/env');
  return res.json({
    ok: true,
    app: env.APP_NAME,
    env: env.APP_ENV
  });
});

// Secure protected database healthcheck (requires active session)
router.get('/api/health/db', requireAuth, async (req, res) => {
  try {
    const pool = db.getPool();
    if (pool && pool.connected) {
      return res.json({ ok: true, db: 'connected' });
    }
    await db.connect();
    return res.json({ ok: true, db: 'connected' });
  } catch (err) {
    console.error('[HealthcheckDB] Database error:', err.message);
    // Safe response hiding configuration details and raw query errors
    return res.status(500).json({ ok: false, db: 'unavailable' });
  }
});

// Landing page / Dashboard
router.get('/home', requireAuth, (req, res) => {
  res.render('home', {
    title: 'Panel Principal - FISA',
    path: '/home'
  });
});

// Redirect root to /home
router.get('/', (req, res) => {
  res.redirect((res.locals.baseUrl || '/') + 'home');
});

// Production entry placeholder view (Fase 2)
router.get('/produccion', requireAuth, requirePermission('PRODUCCION', 'view'), (req, res) => {
  res.render('produccion_placeholder', {
    title: 'Registro Productivo - FISA',
    path: '/produccion'
  });
});

// Mount other resource routers
router.use(usuariosRoutes);
router.use(accesosRoutes);
router.use(programasRoutes);
router.use(perfilesRoutes);
router.use(catalogosRoutes);

module.exports = router;
