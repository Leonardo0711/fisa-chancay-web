'use strict';

const accesosDal = require('../dal/accesos.dal');
const usuariosDal = require('../dal/usuarios.dal');

async function listarAccesos(filters) {
  return accesosDal.listarAccesos(filters);
}

async function crearAcceso(data, creator) {
  if (!data.empcod || !data.talcod || !data.usucod) {
    throw new Error('EMPRESA, TALLER Y USUARIO SON OBLIGATORIOS');
  }

  // Verify that target user exists
  const user = await usuariosDal.getUsuarioByCode(data.usucod);
  if (!user) {
    throw new Error('EL USUARIO ESPECIFICADO NO EXISTE');
  }

  // Verify uniqueness of the composite mapping key
  const existing = await accesosDal.getAcceso(data.empcod, data.talcod, data.usucod);
  if (existing) {
    throw new Error('EL ACCESO YA SE ENCUENTRA REGISTRADO PARA ESTE USUARIO');
  }

  return accesosDal.crearAcceso(data, creator);
}

async function editarAcceso(empcod, talcod, usucod, data, modifier) {
  const existing = await accesosDal.getAcceso(empcod, talcod, usucod);
  if (!existing) {
    throw new Error('EL ACCESO ESPECIFICADO NO EXISTE');
  }
  return accesosDal.editarAcceso(empcod, talcod, usucod, data, modifier);
}

async function cambiarEstado(empcod, talcod, usucod, estado, modifier) {
  const existing = await accesosDal.getAcceso(empcod, talcod, usucod);
  if (!existing) {
    throw new Error('EL ACCESO ESPECIFICADO NO EXISTE');
  }
  return accesosDal.cambiarEstado(empcod, talcod, usucod, estado, modifier);
}

async function marcarPredeterminado(empcod, talcod, usucod, modifier) {
  const existing = await accesosDal.getAcceso(empcod, talcod, usucod);
  if (!existing) {
    throw new Error('EL ACCESO ESPECIFICADO NO EXISTE');
  }
  return accesosDal.marcarAccesoPredeterminado(empcod, talcod, usucod, modifier);
}

async function bulkUpsert(usucod, items, actor) {
  if (!usucod) {
    throw new Error('EL CODIGO DE USUARIO ES OBLIGATORIO');
  }
  if (!Array.isArray(items)) {
    throw new Error('LOS ACCESOS DEBEN SER UNA LISTA');
  }
  return accesosDal.bulkUpsert(usucod, items, actor);
}

module.exports = {
  listarAccesos,
  crearAcceso,
  editarAcceso,
  cambiarEstado,
  marcarPredeterminado,
  bulkUpsert
};
