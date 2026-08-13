'use strict';

const programasDal = require('../dal/programas.dal');

async function listarProgramas(filters) {
  return programasDal.listarProgramas(filters);
}

async function crearPrograma(data, creator) {
  if (!data.procod || !data.pronom || !data.prodes) {
    throw new Error('CÓDIGO, NOMBRE Y DESCRIPCIÓN DEL PROGRAMA SON OBLIGATORIOS');
  }

  const existing = await programasDal.getPrograma(data.procod);
  if (existing) {
    throw new Error('EL CÓDIGO DE PROGRAMA YA SE ENCUENTRA REGISTRADO');
  }

  return programasDal.crearPrograma(data, creator);
}

async function editarPrograma(procod, data, modifier) {
  if (!data.pronom || !data.prodes) {
    throw new Error('EL NOMBRE Y LA DESCRIPCIÓN DEL PROGRAMA SON OBLIGATORIOS');
  }

  const existing = await programasDal.getPrograma(procod);
  if (!existing) {
    throw new Error('EL PROGRAMA NO EXISTE');
  }

  return programasDal.editarPrograma(procod, data, modifier);
}

async function cambiarEstado(procod, estado, modifier) {
  const existing = await programasDal.getPrograma(procod);
  if (!existing) {
    throw new Error('EL PROGRAMA NO EXISTE');
  }
  return programasDal.cambiarEstado(procod, estado, modifier);
}

async function eliminarPrograma(procod) {
  const existing = await programasDal.getPrograma(procod);
  if (!existing) {
    throw new Error('EL PROGRAMA NO EXISTE');
  }
  return programasDal.eliminarPrograma(procod);
}

async function obtenerNextCode() {
  return programasDal.obtenerNextCode();
}

module.exports = {
  listarProgramas,
  crearPrograma,
  editarPrograma,
  cambiarEstado,
  eliminarPrograma,
  obtenerNextCode
};
