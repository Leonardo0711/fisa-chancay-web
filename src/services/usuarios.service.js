'use strict';

const usuariosDal = require('../dal/usuarios.dal');

async function listarUsuarios(filters) {
  return usuariosDal.listarUsuarios(filters);
}

async function crearUsuario(data, creator) {
  if (!data.usucod || !data.usunom || !data.usucla) {
    throw new Error('CÓDIGO, NOMBRE Y CLAVE SON OBLIGATORIOS');
  }

  const existing = await usuariosDal.getUsuarioByCode(data.usucod);
  if (existing) {
    throw new Error('EL CÓDIGO DE USUARIO YA SE ENCUENTRA REGISTRADO');
  }

  return usuariosDal.crearUsuario(data, creator);
}

async function editarUsuario(usucod, data, modifier) {
  if (!data.usunom) {
    throw new Error('EL NOMBRE DEL USUARIO ES OBLIGATORIO');
  }

  const existing = await usuariosDal.getUsuarioByCode(usucod);
  if (!existing) {
    throw new Error('EL USUARIO NO EXISTE');
  }

  return usuariosDal.editarUsuario(usucod, data, modifier);
}

async function cambiarPassword(usucod, password, modifier) {
  if (!password) {
    throw new Error('LA NUEVA CLAVE ES OBLIGATORIA');
  }
  const existing = await usuariosDal.getUsuarioByCode(usucod);
  if (!existing) {
    throw new Error('EL USUARIO NO EXISTE');
  }
  return usuariosDal.cambiarPassword(usucod, password, modifier);
}

async function cambiarEstado(usucod, estado, modifier) {
  const existing = await usuariosDal.getUsuarioByCode(usucod);
  if (!existing) {
    throw new Error('EL USUARIO NO EXISTE');
  }
  return usuariosDal.cambiarEstado(usucod, estado, modifier);
}

async function eliminarUsuario(usucod) {
  const existing = await usuariosDal.getUsuarioByCode(usucod);
  if (!existing) {
    throw new Error('EL USUARIO NO EXISTE');
  }
  return usuariosDal.eliminarUsuario(usucod);
}

module.exports = {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarPassword,
  cambiarEstado,
  eliminarUsuario
};
