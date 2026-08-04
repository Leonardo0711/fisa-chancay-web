'use strict';

const db = require('../config/db');
const dbEsolver = require('../config/db-esolver');

/**
 * Searches OTs from VIEW_PRD_TALLER_OT view in eSolver database (.222).
 * Uses a strict filter and TOP limit to avoid database overload.
 */
async function buscarOts(queryText) {
  if (!queryText) return [];
  const normQuery = `%${queryText.trim()}%`;
  
  const res = await dbEsolver.query(
    `SELECT TOP 20 
      RTRIM(otcod) AS otcod, 
      RTRIM(procod) AS procod, 
      RTRIM(pronom) AS pronom, 
      RTRIM(clinom) AS clinomcom, 
      canreq, 
      RTRIM(uninom) AS univen
     FROM VIEW_PRD_TALLER_OT 
     WHERE (otcod LIKE @query OR clinom LIKE @query OR procod LIKE @query)
     ORDER BY otcod DESC`,
    { query: normQuery }
  );

  return res.recordset.map(row => ({
    otcod: row.otcod,
    procod: row.procod,
    pronom: row.pronom,
    clinomcom: row.clinomcom || 'SIN CLIENTE',
    canreq: row.canreq,
    univen: row.univen,
    ovcod: 'SIN OV'
  }));
}

/**
 * Retrieves details of a specific OT.
 */
async function obtenerDetallesOt(otcod) {
  if (!otcod) return null;
  const res = await dbEsolver.query(
    `SELECT 
      RTRIM(otcod) AS otcod, 
      RTRIM(procod) AS procod, 
      RTRIM(pronom) AS pronom, 
      RTRIM(clinom) AS clinomcom, 
      canreq, 
      RTRIM(uninom) AS univen
     FROM VIEW_PRD_TALLER_OT 
     WHERE otcod = @otcod`,
    { otcod: otcod.trim() }
  );

  if (res.recordset.length === 0) return null;
  const row = res.recordset[0];
  return {
    otcod: row.otcod,
    procod: row.procod,
    pronom: row.pronom,
    clinomcom: row.clinomcom || 'SIN CLIENTE',
    canreq: row.canreq,
    univen: row.univen,
    ovcod: 'SIN OV'
  };
}

/**
 * Lists lotes for a specific OT.
 */
async function obtenerLotesOt(otcod) {
  if (!otcod) return [];
  const res = await dbEsolver.query(
    `SELECT 
      RTRIM(lotcod) AS lotcod
     FROM VIEW_PRD_TALLER_OT_LOTES 
     WHERE otcod = @otcod
     ORDER BY lotcod`,
    { otcod: otcod.trim() }
  );

  return res.recordset.map(row => ({
    lotcod: row.lotcod
  }));
}

/**
 * Lists active locations from FTALLER.dbo.PAR_UBICACION.
 */
async function listarUbicaciones() {
  const res = await db.query(
    `SELECT 
      RTRIM(ubicod) AS ubicod, 
      RTRIM(ubinom) AS ubinom, 
      RTRIM(tiptra) AS tiptra, 
      ubiuni, 
      RTRIM(unicod) AS unicod 
     FROM FTALLER.dbo.PAR_UBICACION 
     WHERE ubistd = 1 
     ORDER BY ubinom`
  );

  return res.recordset.map(row => ({
    ubicod: row.ubicod,
    ubinom: row.ubinom,
    tiptra: row.tiptra, // 'D' (Destajo), 'J' (Jornal)
    ubiuni: !!row.ubiuni, // true (Universal), false (No Universal)
    unicod: row.unicod
  }));
}

/**
 * Queries database mapping for product-location parameters.
 */
async function obtenerConfigUbicacionProducto(procod) {
  // Check if table exists
  const tableCheck = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PAR_UBICACION_PRODUCTO'`
  );
  if (tableCheck.recordset.length === 0) {
    return null;
  }

  const res = await db.query(
    `SELECT RTRIM(up.ubicod) AS ubicod, RTRIM(u.ubinom) AS ubinom, 
            RTRIM(u.tiptra) AS tiptra, u.ubiuni, up.cantidad, 
            RTRIM(un1.unides) AS unidadCant, up.valor_unitario AS valorUnitario, 
            RTRIM(un2.unides) AS unidadVu, up.tarifa
     FROM FTALLER.dbo.PAR_UBICACION_PRODUCTO up
     INNER JOIN FTALLER.dbo.PAR_UBICACION u ON up.empcod = u.empcod AND up.ubicod = u.ubicod
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un1 ON up.empcod = un1.empcod AND up.unicod_cant = un1.unicod
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un2 ON up.empcod = un2.empcod AND up.unicod_vu = un2.unicod
     WHERE up.empcod = '01' AND up.procod = @procod`,
    { procod: procod.trim() }
  );
  return res.recordset;
}

/**
 * Lists workers from VIEW_PRD_TALLER_TRABAJADORES view in eSolver database (.222).
 */
async function listarOperarios() {
  const res = await dbEsolver.query(
    `SELECT 
      RTRIM(tracod) AS tracod, 
      RTRIM(traraz) AS traraz, 
      RTRIM(ctracod) AS ctracod, 
      RTRIM(ctranom) AS ctranom 
     FROM VIEW_PRD_TALLER_TRABAJADORES 
     ORDER BY traraz`
  );

  return res.recordset.map(row => ({
    usucod: row.tracod,
    usunom: row.traraz,
    usutip: 'O',
    cargo: row.ctranom || 'OPERARIO'
  }));
}

module.exports = {
  buscarOts,
  obtenerDetallesOt,
  obtenerLotesOt,
  listarUbicaciones,
  obtenerConfigUbicacionProducto,
  listarOperarios
};
