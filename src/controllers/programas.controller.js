'use strict';

const programasService = require('../services/programas.service');

/**
 * Renders the programs catalog HTML view.
 */
async function renderProgramas(req, res, next) {
  try {
    res.render('programas', {
      title: 'Administración de Programas - FISA',
      path: '/programas'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to list programs.
 */
async function apiListarProgramas(req, res, next) {
  try {
    const list = await programasService.listarProgramas(req.query);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to create a program.
 */
async function apiCrearPrograma(req, res, next) {
  try {
    await programasService.crearPrograma(req.body, req.user.usucod);
    return res.json({ success: true, message: 'PROGRAMA CREADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to edit a program.
 */
async function apiEditarPrograma(req, res, next) {
  try {
    const { procod } = req.params;
    await programasService.editarPrograma(procod, req.body, req.user.usucod);
    return res.json({ success: true, message: 'PROGRAMA ACTUALIZADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to activate/deactivate a program.
 */
async function apiCambiarEstado(req, res, next) {
  try {
    const { procod } = req.params;
    const { estado } = req.body;
    await programasService.cambiarEstado(procod, estado, req.user.usucod);
    const msg = estado ? 'PROGRAMA ACTIVADO' : 'PROGRAMA DESACTIVADO';
    return res.json({ success: true, message: msg });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to physically delete a program (and associated data).
 */
async function apiEliminarPrograma(req, res, next) {
  try {
    const { procod } = req.params;
    await programasService.eliminarPrograma(procod);
    return res.json({ success: true, message: 'PROGRAMA ELIMINADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

module.exports = {
  renderProgramas,
  apiListarProgramas,
  apiCrearPrograma,
  apiEditarPrograma,
  apiCambiarEstado,
  apiEliminarPrograma
};
