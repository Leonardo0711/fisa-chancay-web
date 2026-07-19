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
  const procod = data.procod.trim().toUpperCase();
  const pronom = data.pronom.trim();
  const prodes = data.prodes ? data.prodes.trim() : null;
  const prostd = data.prostd !== undefined ? (data.prostd ? 1 : 0) : 1;

  await db.query(
    `INSERT INTO SEG_PROGRAMA (procod, pronom, prodes, prostd, codusucre, fecusucre)
     VALUES (@procod, @pronom, @prodes, @prostd, @creator, GETDATE())`,
    { procod, pronom, prodes, prostd, creator }
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
  const pool = await db.connect();
  const tx = new db.sql.Transaction(pool);
  await tx.begin();
  try {
    const req1 = new db.sql.Request(tx);
    await req1.input('procod', normCode).query('DELETE FROM SEG_PERFIL WHERE procod = @procod');

    const req2 = new db.sql.Request(tx);
    await req2.input('procod', normCode).query('DELETE FROM SEG_PROGRAMA WHERE procod = @procod');

    await tx.commit();
    return true;
  } catch (err) {
    if (tx._aborted !== true) {
      await tx.rollback();
    }
    throw err;
  }
}

module.exports = {
  listarProgramas,
  getPrograma,
  crearPrograma,
  editarPrograma,
  cambiarEstado,
  eliminarPrograma
};
