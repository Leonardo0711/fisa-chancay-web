'use strict';

const accesosService = require('../services/accesos.service');

/**
 * Renders the accesses management HTML view.
 */
async function renderAccesos(req, res, next) {
  try {
    res.render('accesos', {
      title: 'Administración de Accesos - FISA',
      path: '/accesos'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to list access maps.
 */
async function apiListarAccesos(req, res, next) {
  try {
    const list = await accesosService.listarAccesos(req.query);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to create an access map.
 */
async function apiCrearAcceso(req, res, next) {
  try {
    await accesosService.crearAcceso(req.body, req.user.usucod);
    return res.json({ success: true, message: 'ACCESO ASIGNADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to edit an access map.
 */
async function apiEditarAcceso(req, res, next) {
  try {
    const { empcod, talcod, usucod } = req.params;
    await accesosService.editarAcceso(empcod, talcod, usucod, req.body, req.user.usucod);
    return res.json({ success: true, message: 'ACCESO ACTUALIZADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to activate or deactivate an access map.
 */
async function apiCambiarEstado(req, res, next) {
  try {
    const { empcod, talcod, usucod } = req.params;
    const { estado } = req.body;
    await accesosService.cambiarEstado(empcod, talcod, usucod, estado, req.user.usucod);
    const msg = estado ? 'ACCESO ACTIVADO' : 'ACCESO DESACTIVADO';
    return res.json({ success: true, message: msg });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to mark an access as default.
 */
async function apiMarcarPredeterminado(req, res, next) {
  try {
    const { empcod, talcod, usucod } = req.params;
    await accesosService.marcarPredeterminado(empcod, talcod, usucod, req.user.usucod);
    return res.json({ success: true, message: 'ACCESO ESTABLECIDO COMO PREDETERMINADO' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

async function apiBulkUpsert(req, res, next) {
  try {
    const { usucod } = req.params;
    const { items } = req.body;
    await accesosService.bulkUpsert(usucod, items, req.user.usucod);
    return res.json({ success: true, message: 'ACCESOS GUARDADOS CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

module.exports = {
  renderAccesos,
  apiListarAccesos,
  apiCrearAcceso,
  apiEditarAcceso,
  apiCambiarEstado,
  apiMarcarPredeterminado,
  apiBulkUpsert
};
