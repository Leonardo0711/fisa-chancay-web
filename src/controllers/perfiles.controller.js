'use strict';

const perfilesService = require('../services/perfiles.service');

/**
 * Renders the profiles and permissions management HTML view.
 */
async function renderPerfiles(req, res, next) {
  try {
    res.render('perfiles', {
      title: 'Administración de Perfiles - FISA',
      path: '/perfiles'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to list all profile records.
 */
async function apiListarPerfiles(req, res, next) {
  try {
    const list = await perfilesService.listarPerfiles(req.query);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to retrieve a specific user's permissions map in a given company and workshop.
 */
async function apiObtenerPermisosUsuario(req, res, next) {
  try {
    const { usucod, empcod, talcod } = req.query;
    if (!usucod || !empcod || !talcod) {
      return res.status(400).json({ error: 'USUARIO, EMPRESA Y TALLER SON REQUERIDOS' });
    }
    const map = await perfilesService.obtenerPermisosUsuario(usucod, empcod, talcod);
    return res.json(map);
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to update and save permissions.
 */
async function apiGuardarPermisos(req, res, next) {
  try {
    const { usucod, empcod, talcod, permissions } = req.body;
    if (!usucod || !empcod || !talcod || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'DATOS INVÁLIDOS: SE REQUIERE USUARIO, EMPRESA, TALLER Y LISTA DE PERMISOS' });
    }

    await perfilesService.guardarPermisos(usucod, empcod, talcod, permissions, req.user.usucod);
    return res.json({ success: true, message: 'PERMISOS GUARDADOS CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to delete a single permission mapping.
 */
async function apiEliminarPermiso(req, res, next) {
  try {
    const { empcod, talcod, usucod, procod } = req.params;
    await perfilesService.eliminarPermiso(empcod, talcod, usucod, procod);
    return res.json({ success: true, message: 'PERMISO ELIMINADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

module.exports = {
  renderPerfiles,
  apiListarPerfiles,
  apiObtenerPermisosUsuario,
  apiGuardarPermisos,
  apiEliminarPermiso
};
