'use strict';

const db = require('../config/db');

/**
 * Lists system programs/modules with optional search/status filters.
 */
async function listarProgramas(filters = {}) {
  let sqlText = `SELECT procod, pronom, prodes, prostd FROM SEG_PROGRAMA WHERE 1=1`;
  const params = {};

  if (filters.search) {
    sqlText += ` AND (procod LIKE @search OR pronom LIKE @search OR prodes LIKE @search)`;
    params.search = `%${filters.search}%`;
  }
  if (filters.prostd !== undefined && filters.prostd !== '') {
    sqlText += ` AND prostd = @prostd`;
    params.prostd = filters.prostd === 'true' || filters.prostd === '1' || filters.prostd === true ? 1 : 0;
  }

  const res = await db.query(sqlText, params);
  return res.recordset.map(row => ({
    procod: row.procod.trim(),
    pronom: row.pronom ? row.pronom.trim() : '',
    prodes: row.prodes ? row.prodes.trim() : '',
    prostd: !!row.prostd
  }));
}

/**
 * Retrieves a single program by code.
 */
async function getPrograma(procod) {
  if (!procod) return null;
  const res = await db.query(
    `SELECT procod, pronom, prodes, prostd FROM SEG_PROGRAMA WHERE procod = @procod`,
    { procod: procod.trim().toUpperCase() }
  );
  if (res.recordset.length === 0) return null;
  const row = res.recordset[0];
  return {
    procod: row.procod.trim(),
    pronom: row.pronom ? row.pronom.trim() : '',
    prodes: row.prodes ? row.prodes.trim() : '',
    prostd: !!row.prostd
  };
}

/**
 * Creates a new program record.
 */
async function crearPrograma(data, creator) {
  const pronom = data.pronom.trim();
  const prodes = data.prodes ? data.prodes.trim() : null;
  const prostd = data.prostd !== undefined ? (data.prostd ? 1 : 0) : 1;

  await db.query(
    `DECLARE @next_procod CHAR(4);
     SELECT @next_procod = RIGHT('0000' + CAST(COALESCE(MAX(CAST(procod AS INT)), 0) + 1 AS VARCHAR(4)), 4)
     FROM SEG_PROGRAMA 
     WHERE ISNUMERIC(procod) = 1;

     IF @next_procod IS NULL OR @next_procod = '0000'
       SET @next_procod = '0001';

     INSERT INTO SEG_PROGRAMA (procod, pronom, prodes, prostd, codusucre, fecusucre)
     VALUES (@next_procod, @pronom, @prodes, @prostd, @creator, GETDATE())`,
    { pronom, prodes, prostd, creator }
  );
  return true;
}

/**
 * Updates an existing program record.
 */
async function editarPrograma(procod, data, modifier) {
  const normCode = procod.trim().toUpperCase();
  const pronom = data.pronom.trim();
  const prodes = data.prodes ? data.prodes.trim() : null;

  await db.query(
    `UPDATE SEG_PROGRAMA 
     SET pronom = @pronom, 
         prodes = @prodes, 
         codusumod = @modifier, 
         fecusumod = GETDATE()
     WHERE procod = @procod`,
    { procod: normCode, pronom, prodes, modifier }
  );
  return true;
}

/**
 * Soft deletes/annuls or activates a program.
 */
async function cambiarEstado(procod, estado, modifier) {
  const normCode = procod.trim().toUpperCase();
  const prostd = estado ? 1 : 0;

  if (prostd === 0) {
    await db.query(
      `UPDATE SEG_PROGRAMA 
       SET prostd = 0, 
           codusuanu = @modifier, 
           fecusuanu = GETDATE()
       WHERE procod = @procod`,
      { procod: normCode, modifier }
    );
  } else {
    await db.query(
      `UPDATE SEG_PROGRAMA 
       SET prostd = 1, 
           codusumod = @modifier, 
           fecusumod = GETDATE()
       WHERE procod = @procod`,
      { procod: normCode, modifier }
    );
  }
  return true;
}

async function eliminarPrograma(procod) {
  if (!procod) return false;
  const normCode = procod.trim().toUpperCase();
  
  // Check if referenced in SEG_PERFIL
  const check = await db.query(
    `SELECT COUNT(1) AS count FROM SEG_PERFIL WHERE procod = @procod`,
    { procod: normCode }
  );
  if (check.recordset[0] && check.recordset[0].count > 0) {
    throw new Error('No se puede borrar el Programa porque está asignado a uno o más perfiles de usuarios. Debe desasignar los perfiles primero.');
  }

  await db.query(
    `DELETE FROM SEG_PROGRAMA WHERE procod = @procod`,
    { procod: normCode }
  );
  return true;
}

async function obtenerNextCode() {
  const res = await db.query(
    `SELECT RIGHT('0000' + CAST(COALESCE(MAX(CAST(procod AS INT)), 0) + 1 AS VARCHAR(4)), 4) AS nextCode
     FROM SEG_PROGRAMA 
     WHERE ISNUMERIC(procod) = 1`
  );
  const nextVal = res.recordset[0] ? res.recordset[0].nextCode : null;
  return nextVal || '0001';
}

module.exports = {
  listarProgramas,
  getPrograma,
  crearPrograma,
  editarPrograma,
  cambiarEstado,
  eliminarPrograma,
  obtenerNextCode
};
