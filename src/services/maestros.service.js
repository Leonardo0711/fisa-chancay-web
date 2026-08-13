'use strict';

const maestrosDal = require('../dal/maestros.dal');

// --- UNIDADES ---

async function listarUnidades() {
  return maestrosDal.listarUnidades();
}

async function crearUnidad(data, actor) {
  const { uninom, unides } = data;
  if (!uninom || uninom.trim().length > 10) {
    throw new Error('El nombre corto de la unidad de medida debe tener máximo 10 caracteres.');
  }
  if (!unides || unides.trim().length > 50) {
    throw new Error('La descripción de la unidad de medida debe tener máximo 50 caracteres.');
  }
  return maestrosDal.crearUnidad(data, actor);
}

async function editarUnidad(unicod, data, actor) {
  const { uninom, unides } = data;
  if (!uninom || uninom.trim().length > 10) {
    throw new Error('El nombre corto de la unidad de medida debe tener máximo 10 caracteres.');
  }
  if (!unides || unides.trim().length > 50) {
    throw new Error('La descripción de la unidad de medida debe tener máximo 50 caracteres.');
  }
  return maestrosDal.editarUnidad(unicod, data, actor);
}

async function eliminarUnidad(unicod, actor) {
  if (!unicod) {
    throw new Error('Código de unidad no especificado.');
  }
  return maestrosDal.eliminarUnidad(unicod, actor);
}

// --- UBICACIONES ---

async function listarUbicaciones() {
  return maestrosDal.listarUbicaciones();
}

async function crearUbicacion(data, actor) {
  const { ubinom, unicod, tiptra } = data;
  if (!ubinom || ubinom.trim().length === 0 || ubinom.trim().length > 100) {
    throw new Error('El nombre de la ubicación debe tener máximo 100 caracteres.');
  }
  if (!unicod) {
    throw new Error('Se requiere especificar la unidad de medida asociada a la ubicación.');
  }
  if (tiptra !== 'D' && tiptra !== 'J') {
    throw new Error('El tipo de trabajo debe ser Destajo (D) o Jornal (J).');
  }
  return maestrosDal.crearUbicacion(data, actor);
}

async function editarUbicacion(ubicod, data, actor) {
  const { ubinom, unicod, tiptra } = data;
  if (!ubinom || ubinom.trim().length === 0 || ubinom.trim().length > 100) {
    throw new Error('El nombre de la ubicación debe tener máximo 100 caracteres.');
  }
  if (!unicod) {
    throw new Error('Se requiere especificar la unidad de medida asociada a la ubicación.');
  }
  if (tiptra !== 'D' && tiptra !== 'J') {
    throw new Error('El tipo de trabajo debe ser Destajo (D) o Jornal (J).');
  }
  return maestrosDal.editarUbicacion(ubicod, data, actor);
}

async function eliminarUbicacion(ubicod, actor) {
  if (!ubicod) {
    throw new Error('Código de ubicación no especificado.');
  }
  return maestrosDal.eliminarUbicacion(ubicod, actor);
}

// --- UBICACIONES POR PRODUCTO ---

async function listarUbicacionesProducto() {
  return maestrosDal.listarUbicacionesProducto();
}

async function crearUbicacionProducto(data, actor) {
  const { procod, ubicod } = data;
  if (!procod || procod.trim().length === 0 || procod.trim().length > 30) {
    throw new Error('El código de producto es obligatorio y debe tener máximo 30 caracteres.');
  }
  if (!ubicod) {
    throw new Error('Se requiere especificar la ubicación para la relación.');
  }
  return maestrosDal.crearUbicacionProducto(data, actor);
}

async function editarUbicacionProducto(procod, ubicod, data, actor) {
  return maestrosDal.editarUbicacionProducto(procod, ubicod, data, actor);
}

async function eliminarUbicacionProducto(procod, ubicod) {
  if (!procod || !ubicod) {
    throw new Error('Parámetros incompletos para eliminar relación.');
  }
  return maestrosDal.eliminarUbicacionProducto(procod, ubicod);
}

async function obtenerNextCodeUnidad() {
  return maestrosDal.obtenerNextCodeUnidad();
}

async function cambiarEstadoUnidad(unicod, estado, actor) {
  if (!unicod) {
    throw new Error('Código de unidad no especificado.');
  }
  return maestrosDal.cambiarEstadoUnidad(unicod, estado, actor);
}

async function obtenerNextCodeUbicacion() {
  return maestrosDal.obtenerNextCodeUbicacion();
}

async function cambiarEstadoUbicacion(ubicod, estado, actor) {
  if (!ubicod) {
    throw new Error('Código de ubicación no especificado.');
  }
  return maestrosDal.cambiarEstadoUbicacion(ubicod, estado, actor);
}

module.exports = {
  listarUnidades,
  crearUnidad,
  editarUnidad,
  eliminarUnidad,
  listarUbicaciones,
  crearUbicacion,
  editarUbicacion,
  eliminarUbicacion,
  listarUbicacionesProducto,
  crearUbicacionProducto,
  editarUbicacionProducto,
  eliminarUbicacionProducto,
  obtenerNextCodeUnidad,
  cambiarEstadoUnidad,
  obtenerNextCodeUbicacion,
  cambiarEstadoUbicacion
};
