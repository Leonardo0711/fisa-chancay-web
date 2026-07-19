'use strict';

const db = require('../config/db');

/**
 * Lists companies/enterprises.
 */
async function listarEmpresas(onlyActive = true) {
  let sqlText = `SELECT empcod, empnom, empdes, empstd FROM SEG_EMPRESA`;
  if (onlyActive) {
    sqlText += ` WHERE empstd = 1`;
  }
  sqlText += ` ORDER BY empcod`;
  const res = await db.query(sqlText);
  return res.recordset.map(row => ({
    empcod: row.empcod.trim(),
    empnom: row.empnom ? row.empnom.trim() : '',
    empdes: row.empdes ? row.empdes.trim() : '',
    empstd: !!row.empstd
  }));
}

/**
 * Lists workshops.
 */
async function listarTalleres(onlyActive = true) {
  let sqlText = `SELECT empcod, talcod, talnom, taldes, talstd FROM SEG_TALLER`;
  if (onlyActive) {
    sqlText += ` WHERE talstd = 1`;
  }
  sqlText += ` ORDER BY empcod, talcod`;
  const res = await db.query(sqlText);
  return res.recordset.map(row => ({
    empcod: row.empcod.trim(),
    talcod: row.talcod.trim(),
    talnom: row.talnom ? row.talnom.trim() : '',
    taldes: row.taldes ? row.taldes.trim() : '',
    talstd: !!row.talstd
  }));
}

/**
 * Lists workshops filtered by company code.
 */
async function listarTalleresPorEmpresa(empcod, onlyActive = true) {
  if (!empcod) return [];
  let sqlText = `SELECT empcod, talcod, talnom, taldes, talstd FROM SEG_TALLER WHERE empcod = @empcod`;
  if (onlyActive) {
    sqlText += ` AND talstd = 1`;
  }
  sqlText += ` ORDER BY talcod`;
  const res = await db.query(sqlText, { empcod: empcod.trim().toUpperCase() });
  return res.recordset.map(row => ({
    empcod: row.empcod.trim(),
    talcod: row.talcod.trim(),
    talnom: row.talnom ? row.talnom.trim() : '',
    taldes: row.taldes ? row.taldes.trim() : '',
    talstd: !!row.talstd
  }));
}

module.exports = {
  listarEmpresas,
  listarTalleres,
  listarTalleresPorEmpresa,
  listarUsuariosActivos,
  listarProgramasActivos
};

/**
 * Lists active users (for dropdowns/selectors).
 */
async function listarUsuariosActivos() {
  const res = await db.query(
    `SELECT usucod, usunom FROM SEG_USUARIO WHERE usustd = 1 ORDER BY usucod`
  );
  return res.recordset.map(row => ({
    usucod: row.usucod.trim(),
    usunom: row.usunom ? row.usunom.trim() : ''
  }));
}

/**
 * Lists active programs (for dropdowns/selectors).
 */
async function listarProgramasActivos() {
  const res = await db.query(
    `SELECT procod, pronom FROM SEG_PROGRAMA WHERE prostd = 1 ORDER BY procod`
  );
  return res.recordset.map(row => ({
    procod: row.procod.trim(),
    pronom: row.pronom ? row.pronom.trim() : ''
  }));
}
