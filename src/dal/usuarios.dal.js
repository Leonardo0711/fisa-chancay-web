'use strict';

const db = require('../config/db');

/**
 * Retrieves a user record by code without exposing credentials.
 */
async function getUsuarioByCode(usucod) {
  if (!usucod) return null;
  const normCode = usucod.trim();
  const res = await db.query(
    `SELECT usucod, usunom, usumail, usuadm, usustd 
     FROM SEG_USUARIO 
     WHERE usucod = @usucod`,
    { usucod: normCode }
  );
  if (res.recordset.length === 0) return null;
  const row = res.recordset[0];
  return {
    usucod: row.usucod.trim(),
    usunom: row.usunom ? row.usunom.trim() : '',
    usumail: row.usumail ? row.usumail.trim() : '',
    usuadm: !!row.usuadm,
    usustd: !!row.usustd
  };
}

/**
 * Retrieves a user record by code including password for authentication.
 */
async function getUsuarioClave(usucod) {
  if (!usucod) return null;
  const normCode = usucod.trim();
  const res = await db.query(
    `SELECT usucod, usunom, usucla, usuadm, usustd 
     FROM SEG_USUARIO 
     WHERE usucod = @usucod`,
    { usucod: normCode }
  );
  if (res.recordset.length === 0) return null;
  const row = res.recordset[0];
  return {
    usucod: row.usucod.trim(),
    usunom: row.usunom ? row.usunom.trim() : '',
    usucla: row.usucla ? row.usucla.trim() : '',
    usuadm: !!row.usuadm,
    usustd: !!row.usustd
  };
}

/**
 * Lists users from the database with search and status filters.
 */
async function listarUsuarios(filters = {}) {
  let sqlText = `SELECT usucod, usunom, usumail, usuadm, usustd FROM SEG_USUARIO WHERE 1=1`;
  const params = {};

  if (filters.search) {
    sqlText += ` AND (usucod LIKE @search OR usunom LIKE @search OR usumail LIKE @search)`;
    params.search = `%${filters.search}%`;
  }
  if (filters.usustd !== undefined && filters.usustd !== '') {
    sqlText += ` AND usustd = @usustd`;
    params.usustd = filters.usustd === 'true' || filters.usustd === '1' || filters.usustd === true ? 1 : 0;
  }
  if (filters.empcod && filters.talcod) {
    sqlText += ` AND (usuadm = 1 OR usucod IN (
      SELECT usucod 
      FROM SEG_ACCESO 
      WHERE empcod = @empcod AND talcod = @talcod AND accstd = 1
    ))`;
    params.empcod = filters.empcod.trim().toUpperCase();
    params.talcod = filters.talcod.trim().toUpperCase();
  }

  const res = await db.query(sqlText, params);
  return res.recordset.map(row => ({
    usucod: row.usucod.trim(),
    usunom: row.usunom ? row.usunom.trim() : '',
    usumail: row.usumail ? row.usumail.trim() : '',
    usuadm: !!row.usuadm,
    usustd: !!row.usustd
  }));
}

/**
 * Creates a new user record.
 */
async function crearUsuario(data, creator) {
  const usucod = data.usucod.trim();
  const usunom = data.usunom.trim();
  const usumail = data.usumail ? data.usumail.trim() : null;
  const usuadm = data.usuadm ? 1 : 0;
  const usucla = data.usucla;
  const usustd = data.usustd !== undefined ? (data.usustd ? 1 : 0) : 1;

  await db.query(
    `INSERT INTO SEG_USUARIO (usucod, usunom, usumail, usuadm, usucla, usustd, codusucre, fecusucre)
     VALUES (@usucod, @usunom, @usumail, @usuadm, @usucla, @usustd, @creator, GETDATE())`,
    { usucod, usunom, usumail, usuadm, usucla, usustd, creator }
  );
  return true;
}

/**
 * Updates an existing user record.
 */
async function editarUsuario(usucod, data, modifier) {
  const normCode = usucod.trim();
  const usunom = data.usunom.trim();
  const usumail = data.usumail ? data.usumail.trim() : null;
  const usuadm = data.usuadm ? 1 : 0;

  await db.query(
    `UPDATE SEG_USUARIO 
     SET usunom = @usunom, 
         usumail = @usumail, 
         usuadm = @usuadm, 
         codusumod = @modifier, 
         fecusumod = GETDATE()
     WHERE usucod = @usucod`,
    { usucod: normCode, usunom, usumail, usuadm, modifier }
  );
  return true;
}

/**
 * Updates a user's password.
 */
async function cambiarPassword(usucod, password, modifier) {
  const normCode = usucod.trim();
  await db.query(
    `UPDATE SEG_USUARIO 
     SET usucla = @password, 
         codusumod = @modifier, 
         fecusumod = GETDATE()
     WHERE usucod = @usucod`,
    { usucod: normCode, password, modifier }
  );
  return true;
}

/**
 * Soft deletes/annuls or activates a user.
 */
async function cambiarEstado(usucod, estado, modifier) {
  const normCode = usucod.trim();
  const usustd = estado ? 1 : 0;

  if (usustd === 0) {
    await db.query(
      `UPDATE SEG_USUARIO 
       SET usustd = 0, 
           codusuanu = @modifier, 
           fecusuanu = GETDATE()
       WHERE usucod = @usucod`,
      { usucod: normCode, modifier }
    );
  } else {
    await db.query(
      `UPDATE SEG_USUARIO 
       SET usustd = 1, 
           codusumod = @modifier, 
           fecusumod = GETDATE()
       WHERE usucod = @usucod`,
      { usucod: normCode, modifier }
    );
  }
  return true;
}

async function eliminarUsuario(usucod) {
  if (!usucod) return false;
  const normCode = usucod.trim();

  // 1. Check in SEG_PERFIL
  const checkPerfil = await db.query(
    `SELECT COUNT(1) AS count FROM SEG_PERFIL WHERE usucod = @usucod`,
    { usucod: normCode }
  );
  if (checkPerfil.recordset[0] && checkPerfil.recordset[0].count > 0) {
    throw new Error('No se puede borrar el Usuario porque está referenciado en la tabla de Perfiles de Seguridad. Debe desasignar sus perfiles primero.');
  }

  // 2. Check in SEG_ACCESO
  const checkAcceso = await db.query(
    `SELECT COUNT(1) AS count FROM SEG_ACCESO WHERE usucod = @usucod`,
    { usucod: normCode }
  );
  if (checkAcceso.recordset[0] && checkAcceso.recordset[0].count > 0) {
    throw new Error('No se puede borrar el Usuario porque está referenciado en la tabla de Accesos de Seguridad. Debe eliminar sus accesos primero.');
  }

  // 3. Physical delete
  await db.query(
    `DELETE FROM SEG_USUARIO WHERE usucod = @usucod`,
    { usucod: normCode }
  );
  return true;
}

module.exports = {
  getUsuarioByCode,
  getUsuarioClave,
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarPassword,
  cambiarEstado,
  eliminarUsuario
};
