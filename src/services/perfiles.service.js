'use strict';

const perfilesDal = require('../dal/perfiles.dal');
const usuariosDal = require('../dal/usuarios.dal');
const programasDal = require('../dal/programas.dal');

async function listarPerfiles(filters) {
  return perfilesDal.listarPerfiles(filters);
}

async function obtenerPermisosUsuario(usucod, empcod, talcod) {
  if (!usucod || !empcod || !talcod) {
    throw new Error('CÓDIGO DE USUARIO, EMPRESA Y TALLER SON OBLIGATORIOS');
  }
  return perfilesDal.obtenerPermisosUsuario(usucod, empcod, talcod);
}

async function guardarPermisos(usucod, empcod, talcod, permissionsList, creator) {
  if (!usucod || !empcod || !talcod) {
    throw new Error('CÓDIGO DE USUARIO, EMPRESA Y TALLER SON OBLIGATORIOS');
  }

  // Verify user exists
  const user = await usuariosDal.getUsuarioByCode(usucod);
  if (!user) {
    throw new Error('EL USUARIO ESPECIFICADO NO EXISTE');
  }

  // Get active system programs/modules
  const activePrograms = await programasDal.listarProgramas({ prostd: true });
  const activeProgramCodes = new Set(activePrograms.map(p => p.procod));

  // Map and clean input permissions list
  const cleanList = [];
  for (const perm of permissionsList) {
    if (!perm.procod) continue;
    const pCode = perm.procod.trim().toUpperCase();
    if (!activeProgramCodes.has(pCode)) {
      throw new Error(`EL PROGRAMA ${pCode} NO EXISTE O ESTÁ INACTIVO`);
    }

    cleanList.push({
      procod: pCode,
      flgcon: !!perm.flgcon,
      flggra: !!perm.flggra,
      flganu: !!perm.flganu,
      flgeli: !!perm.flgeli,
      flgimp: !!perm.flgimp,
      flgope1: !!perm.flgope1,
      flgext1: !!perm.flgext1,
      flgope2: !!perm.flgope2,
      flgext2: !!perm.flgext2,
      flgope3: !!perm.flgope3,
      flgext3: !!perm.flgext3,
      flgope4: !!perm.flgope4,
      flgext4: !!perm.flgext4
    });
  }

  return perfilesDal.guardarPermisos(usucod, empcod, talcod, cleanList, creator);
}

async function eliminarPermiso(empcod, talcod, usucod, procod) {
  if (!empcod || !talcod || !usucod || !procod) {
    throw new Error('EMPRESA, TALLER, USUARIO Y PROGRAMA SON OBLIGATORIOS');
  }
  return perfilesDal.eliminarPermiso(empcod, talcod, usucod, procod);
}

module.exports = {
  listarPerfiles,
  obtenerPermisosUsuario,
  guardarPermisos,
  eliminarPermiso
};
