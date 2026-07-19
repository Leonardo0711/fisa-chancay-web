'use strict';

const usuariosService = require('../services/usuarios.service');

/**
 * Renders the users management HTML view.
 */
async function renderUsuarios(req, res, next) {
  try {
    res.render('usuarios', {
      title: 'Administración de Usuarios - FISA',
      path: '/usuarios'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to retrieve list of users.
 */
async function apiListarUsuarios(req, res, next) {
  try {
    const list = await usuariosService.listarUsuarios(req.query);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * API JSON Endpoint to register a new user.
 */
async function apiCrearUsuario(req, res, next) {
  try {
    await usuariosService.crearUsuario(req.body, req.user.usucod);
    return res.json({ success: true, message: 'USUARIO CREADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to update a user's details.
 */
async function apiEditarUsuario(req, res, next) {
  try {
    const { usucod } = req.params;
    await usuariosService.editarUsuario(usucod, req.body, req.user.usucod);
    return res.json({ success: true, message: 'USUARIO ACTUALIZADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to update a user's password.
 */
async function apiCambiarPassword(req, res, next) {
  try {
    const { usucod } = req.params;
    const { new_password } = req.body;
    await usuariosService.cambiarPassword(usucod, new_password, req.user.usucod);
    return res.json({ success: true, message: 'CLAVE ACTUALIZADA CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to change user activation status (soft delete/activation).
 */
async function apiCambiarEstado(req, res, next) {
  try {
    const { usucod } = req.params;
    const { estado } = req.body; // true/false or 1/0
    await usuariosService.cambiarEstado(usucod, estado, req.user.usucod);
    const msg = estado ? 'USUARIO ACTIVADO' : 'USUARIO DESACTIVADO';
    return res.json({ success: true, message: msg });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

/**
 * API JSON Endpoint to physically delete a user (and associated data).
 */
async function apiEliminarUsuario(req, res, next) {
  try {
    const { usucod } = req.params;
    await usuariosService.eliminarUsuario(usucod);
    return res.json({ success: true, message: 'USUARIO ELIMINADO CORRECTAMENTE' });
  } catch (err) {
    err.userMessage = err.message;
    next(err);
  }
}

module.exports = {
  renderUsuarios,
  apiListarUsuarios,
  apiCrearUsuario,
  apiEditarUsuario,
  apiCambiarPassword,
  apiCambiarEstado,
  apiEliminarUsuario
};
