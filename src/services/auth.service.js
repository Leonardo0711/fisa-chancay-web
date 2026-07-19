'use strict';

const usuariosDal = require('../dal/usuarios.dal');
const accesosDal = require('../dal/accesos.dal');
const perfilesDal = require('../dal/perfiles.dal');

/**
 * Validates credentials and sets up session context upon successful login.
 */
async function login(usucod, password, req) {
  const normCode = usucod.trim();
  
  // 1. Fetch user by code
  const user = await usuariosDal.getUsuarioClave(normCode);
  if (!user) {
    throw new Error('USUARIO O CLAVE INCORRECTOS');
  }

  // 2. Verify user status
  if (!user.usustd) {
    throw new Error('USUARIO O CLAVE INCORRECTOS');
  }

  // 3. Compare password (case-insensitive plain text matching)
  if (user.usucla.toLowerCase() !== password.trim().toLowerCase()) {
    throw new Error('USUARIO O CLAVE INCORRECTOS');
  }

  // 4. Retrieve user accesses
  const userAccesses = await accesosDal.listarAccesos({ usucod: normCode, accstd: true });
  
  // Non-admins must have at least one active access mapped to proceed
  if (!user.usuadm && userAccesses.length === 0) {
    throw new Error('EL USUARIO NO TIENE ACCESOS ASIGNADOS ACTIVOS');
  }

  // Default to the access with accflg=1 (default flag), otherwise use the first access
  let selectedEmp = null;
  let selectedTal = null;
  
  if (userAccesses.length > 0) {
    const defaultAccess = userAccesses.find(a => a.accflg === 1 || a.accflg === '1');
    const chosen = defaultAccess || userAccesses[0];
    selectedEmp = chosen.empcod;
    selectedTal = chosen.talcod;
  }

  // 5. Fetch permissions for the active company/workshop
  let permisos = {};
  if (selectedEmp && selectedTal) {
    permisos = await perfilesDal.obtenerPermisosUsuario(normCode, selectedEmp, selectedTal);
    // Update login timestamp
    await accesosDal.actualizarUltimoLogin(selectedEmp, selectedTal, normCode).catch(() => {});
  }

  // 6. Write values to session
  req.session.usucod = user.usucod;
  req.session.usunom = user.usunom;
  req.session.usuadm = user.usuadm;
  req.session.empcod = selectedEmp;
  req.session.talcod = selectedTal;
  req.session.permisos = permisos;

  return {
    usucod: user.usucod,
    usunom: user.usunom,
    usuadm: user.usuadm,
    empcod: selectedEmp,
    talcod: selectedTal,
    accesses: userAccesses
  };
}

/**
 * Switches the active company/workshop context for the logged-in session.
 */
async function changeActiveAccess(empcod, talcod, req) {
  if (!req.session || !req.session.usucod) {
    throw new Error('Sesión no iniciada');
  }

  const usucod = req.session.usucod;
  const isAdm = req.session.usuadm;

  // Non-admins must have access to the target company/workshop
  if (!isAdm) {
    const acc = await accesosDal.getAcceso(empcod, talcod, usucod);
    if (!acc || !acc.accstd) {
      throw new Error('No tiene acceso asignado a esta empresa/taller');
    }
  }

  // Re-fetch and replace session permissions
  const permisos = await perfilesDal.obtenerPermisosUsuario(usucod, empcod, talcod);
  
  req.session.empcod = empcod.trim().toUpperCase();
  req.session.talcod = talcod.trim().toUpperCase();
  req.session.permisos = permisos;
  
  await accesosDal.actualizarUltimoLogin(empcod, talcod, usucod).catch(() => {});

  return {
    empcod: req.session.empcod,
    talcod: req.session.talcod
  };
}

module.exports = {
  login,
  changeActiveAccess
};
