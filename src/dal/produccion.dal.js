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
 * Lists lotes already recorded in FTALLER for a specific OT (and optionally for a specific location).
 */
async function obtenerLotesProducidosDeOt(otcod, ubicod) {
  if (!otcod) return [];
  const pool = await db.connect();
  const req = pool.request();
  req.input('otcod', db.sql.Char(25), otcod.trim());

  let query = `
    SELECT DISTINCT RTRIM(lotcod) AS lotcod
    FROM TAL_CONTROL_PRODUCCION
    WHERE otcod = @otcod AND lotcod IS NOT NULL AND RTRIM(lotcod) <> ''
  `;

  if (ubicod && String(ubicod).trim()) {
    query += ` AND ubicod = @ubicod`;
    req.input('ubicod', db.sql.Char(5), String(ubicod).trim());
  }

  const res = await req.query(query);
  return res.recordset.map(row => row.lotcod.trim());
}

/**
 * Gets the highest costura number / total costuras already recorded for each lot in a specific OT and location.
 */
async function obtenerAvanceCosturasLotes(otcod, ubicod) {
  if (!otcod || !ubicod) return {};
  const pool = await db.connect();
  const req = pool.request();
  req.input('otcod', db.sql.Char(25), otcod.trim());
  req.input('ubicod', db.sql.Char(5), String(ubicod).trim());

  const query = `
    SELECT 
      RTRIM(cp.lotcod) AS lotcod,
      CAST(ISNULL((
        SELECT MAX(d.cantidad) 
        FROM TAL_CONTROL_PRODUCCION_DETALLE d WITH(NOLOCK)
        JOIN TAL_CONTROL_PRODUCCION cp2 WITH(NOLOCK) ON cp2.empcod = d.empcod AND cp2.cpcod = d.cpcod
        WHERE cp2.otcod = cp.otcod AND cp2.ubicod = cp.ubicod AND RTRIM(cp2.lotcod) = RTRIM(cp.lotcod)
      ), 0) AS INT) AS maxDetCostura,
      (
        SELECT COUNT(d2.cpnum)
        FROM TAL_CONTROL_PRODUCCION_DETALLE d2 WITH(NOLOCK)
        JOIN TAL_CONTROL_PRODUCCION cp3 WITH(NOLOCK) ON cp3.empcod = d2.empcod AND cp3.cpcod = d2.cpcod
        WHERE cp3.otcod = cp.otcod AND cp3.ubicod = cp.ubicod AND RTRIM(cp3.lotcod) = RTRIM(cp.lotcod)
      ) AS countDetalles
    FROM TAL_CONTROL_PRODUCCION cp WITH(NOLOCK)
    WHERE cp.otcod = @otcod 
      AND cp.ubicod = @ubicod 
      AND cp.lotcod IS NOT NULL 
      AND RTRIM(cp.lotcod) <> ''
    GROUP BY cp.otcod, cp.ubicod, cp.lotcod
  `;

  const res = await req.query(query);
  const map = {};
  res.recordset.forEach(r => {
    const key = String(r.lotcod || '').trim();
    if (key) {
      map[key] = (r.maxDetCostura && r.maxDetCostura > 0) ? r.maxDetCostura : (r.countDetalles || 0);
    }
  });
  return map;
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
 * Lists workers from VIEW_PRD_TALLER_TRABAJADORES_D or VIEW_PRD_TALLER_TRABAJADORES_J view in eSolver database (.222),
 * combined via UNION ALL with active third-party companies from FTALLER.dbo.PAR_TERCERA.
 */
async function listarOperarios(tiptra = 'D') {
  const isJornal = String(tiptra).toUpperCase() === 'J';
  const viewName = isJornal ? 'VIEW_PRD_TALLER_TRABAJADORES_J' : 'VIEW_PRD_TALLER_TRABAJADORES_D';

  const res = await dbEsolver.query(
    `SELECT 
      RTRIM(tracod) AS tracod, 
      RTRIM(traraz) AS traraz, 
      RTRIM(ctracod) AS ctracod, 
      RTRIM(ctranom) AS ctranom 
     FROM ${viewName} 
     ORDER BY traraz`
  );

  const operarios = res.recordset.map(row => ({
    usucod: row.tracod,
    usunom: row.traraz,
    usutip: 'O',
    cargo: row.ctranom || 'OPERARIO'
  }));

  // UNION ALL con PAR_TERCERA (Empresas Terceras activas en FTALLER)
  try {
    const resTerceras = await db.query(
      `SELECT RTRIM(tercod) AS tracod, RTRIM(ternom) AS traraz, 'TER' AS ctracod, COALESCE(NULLIF(RTRIM(terdes),''), 'EMPRESA TERCERA') AS ctranom
       FROM FTALLER.dbo.PAR_TERCERA
       WHERE terstd = 1 AND codusuanu IS NULL
       ORDER BY ternom`
    );

    const terceras = resTerceras.recordset.map(row => ({
      usucod: row.tracod,
      usunom: row.traraz,
      usutip: 'T',
      cargo: row.ctranom || 'EMPRESA TERCERA'
    }));

    return [...operarios, ...terceras];
  } catch (err) {
    console.error('Error al listar empresas terceras para operarios:', err.message);
    return operarios;
  }
}

/**
 * Executes stored procedure PA_TAL_CONTROL_PRODUCCION in FTALLER database.
 * @param {Object} params
 */
async function ejecutarControlProduccion(params) {
  const pool = await db.connect();
  const req = pool.request();

  req.input('empcod', db.sql.Char(2), params.empcod || '01');
  req.input('otcod', db.sql.Char(25), (params.otcod || '').trim());
  req.input('tiptra', db.sql.Char(1), (params.tiptra || 'D').trim());
  req.input('ubicod', db.sql.Char(5), (params.ubicod || '').trim());
  req.input('lotcod', db.sql.Char(50), params.lotcod ? params.lotcod.trim() : '');
  req.input('cantidad', db.sql.Decimal(18, 4), Number(params.cantidad || 0));
  req.input('unicod_cant', db.sql.Char(3), params.unicod_cant ? params.unicod_cant.trim() : '001');
  req.input('valor_unitario', db.sql.Decimal(18, 4), Number(params.valor_unitario || 0));

  req.input('sTraCod', db.sql.VarChar(db.sql.MAX), params.sTraCod || '');
  req.input('sCantidad', db.sql.VarChar(db.sql.MAX), params.sCantidad || '');
  req.input('sValor_Unitario', db.sql.VarChar(db.sql.MAX), params.sValor_Unitario || '');

  req.input('usucod', db.sql.Char(20), (params.usucod || 'ADMIN').trim());
  req.input('sTipOpe', db.sql.Char(1), (params.sTipOpe || 'I').trim());

  return req.execute('dbo.PA_TAL_CONTROL_PRODUCCION');
}

let workersCache = null;
let workersCacheTime = 0;

async function getWorkersDictionary() {
  const now = Date.now();
  if (workersCache && (now - workersCacheTime < 10 * 60 * 1000)) {
    return workersCache;
  }
  try {
    const poolEsolver = await dbEsolver.connect();
    const res = await poolEsolver.request().query(`
      SELECT RTRIM(tracod) AS tracod, RTRIM(traraz) AS traraz 
      FROM VIEW_PRD_TALLER_TRABAJADORES_D
      UNION
      SELECT RTRIM(tracod) AS tracod, RTRIM(traraz) AS traraz 
      FROM VIEW_PRD_TALLER_TRABAJADORES_J
    `);
    const map = {};
    res.recordset.forEach(r => {
      map[r.tracod] = r.traraz;
    });

    // Cargar también empresas terceras de FTALLER para mapear tercod -> ternom
    try {
      const resTerceras = await db.query(`
        SELECT RTRIM(tercod) AS tracod, RTRIM(ternom) AS traraz
        FROM FTALLER.dbo.PAR_TERCERA
      `);
      resTerceras.recordset.forEach(r => {
        map[r.tracod] = r.traraz;
      });
    } catch (e) {
      console.error('Error al cargar empresas terceras en diccionario:', e.message);
    }

    workersCache = map;
    workersCacheTime = now;
    return map;
  } catch (err) {
    console.error('Error cargando diccionario de trabajadores:', err.message);
    return workersCache || {};
  }
}

/**
 * Lists all headers from TAL_CONTROL_PRODUCCION with location, unit and operator counts.
 */
async function listarRegistrosProduccion(options = {}) {
  const pool = await db.connect();
  const limite = parseInt(options.limite, 10) || 100;
  const q = (options.busqueda || '').trim();

  let whereClause = '';
  const req = pool.request();

  if (q) {
    whereClause = `WHERE (
      cp.cpcod LIKE @q OR 
      cp.otcod LIKE @q OR 
      cp.lotcod LIKE @q OR 
      u.ubinom LIKE @q OR 
      cp.codusucre LIKE @q
    )`;
    req.input('q', db.sql.VarChar(100), `%${q}%`);
  }

  const query = `
    SELECT TOP (${limite})
      RTRIM(cp.empcod) AS empcod,
      RTRIM(cp.cpcod) AS cpcod,
      RTRIM(cp.otcod) AS otcod,
      RTRIM(cp.tiptra) AS tiptra,
      RTRIM(cp.ubicod) AS ubicod,
      ISNULL(RTRIM(u.ubinom), cp.ubicod) AS ubinom,
      RTRIM(cp.lotcod) AS lotcod,
      cp.cantidad,
      RTRIM(cp.unicod_cant) AS unicod_cant,
      ISNULL(RTRIM(un.unides), cp.unicod_cant) AS unidad,
      cp.valor_unitario,
      ISNULL(cp.tarifa, 0) AS tarifa,
      RTRIM(cp.codusucre) AS codusucre,
      cp.fecusucre,
      ISNULL(d_tot.totalOperarios, 0) AS totalOperarios,
      CASE 
        WHEN d_tot.sumDetalles > 0 THEN d_tot.sumDetalles
        WHEN cp.tiptra = 'D' AND ISNULL(cp.tarifa, 0) > 0 AND ISNULL(d_tot.sumVu, 0) > 0 THEN d_tot.sumVu * cp.tarifa
        WHEN cp.tiptra = 'D' THEN cp.cantidad * cp.valor_unitario * ISNULL(cp.tarifa, 0)
        ELSE 0 
      END AS totalSol
    FROM TAL_CONTROL_PRODUCCION cp
    LEFT JOIN PAR_UBICACION u ON cp.empcod = u.empcod AND cp.ubicod = u.ubicod
    LEFT JOIN PAR_UNIDAD un ON cp.empcod = un.empcod AND cp.unicod_cant = un.unicod
    LEFT JOIN (
      SELECT empcod, cpcod,
             COUNT(1) AS totalOperarios,
             SUM(valor_unitario * COALESCE(NULLIF(tarifa, 0), 0)) AS sumDetalles,
             SUM(valor_unitario) AS sumVu
      FROM TAL_CONTROL_PRODUCCION_DETALLE
      GROUP BY empcod, cpcod
    ) d_tot ON d_tot.empcod = cp.empcod AND d_tot.cpcod = cp.cpcod
    ${whereClause}
    ORDER BY cp.fecusucre DESC, cp.cpcod DESC
  `;

  const res = await req.query(query);

  return res.recordset.map(row => {
    const vu = Number(row.valor_unitario || 0);
    const tar = Number(row.tarifa || 0);
    const totSol = Number(row.totalSol || 0);
    return {
      empcod: row.empcod,
      cpcod: row.cpcod,
      otcod: row.otcod,
      tiptra: row.tiptra,
      tiptraDesc: row.tiptra === 'D' ? 'DESTAJO' : 'JORNAL',
      ubicod: row.ubicod,
      ubinom: row.ubinom,
      lotcod: row.lotcod,
      cantidad: Number(row.cantidad || 0),
      unicod_cant: row.unicod_cant,
      unidad: row.unidad || '---',
      valor_unitario: vu,
      tarifa: tar,
      totalSol: totSol,
      codusucre: row.codusucre,
      fecusucre: row.fecusucre,
      totalOperarios: Number(row.totalOperarios || 0)
    };
  });
}

/**
 * Gets detail workers for a specific production control header cpcod.
 */
async function obtenerDetalleRegistroProduccion(cpcod) {
  const pool = await db.connect();
  const res = await pool.request()
    .input('cpcod', db.sql.Char(10), String(cpcod).trim())
    .query(`
      SELECT 
        RTRIM(d.empcod) AS empcod,
        RTRIM(d.cpcod) AS cpcod,
        d.cpnum,
        RTRIM(d.tracod) AS tracod,
        d.cantidad,
        d.valor_unitario,
        COALESCE(NULLIF(d.tarifa, 0), cp.tarifa, 0) AS tarifa
      FROM TAL_CONTROL_PRODUCCION_DETALLE d
      INNER JOIN TAL_CONTROL_PRODUCCION cp ON d.empcod = cp.empcod AND d.cpcod = cp.cpcod
      WHERE d.cpcod = @cpcod
      ORDER BY d.cpnum ASC
    `);

  const workerMap = await getWorkersDictionary();

  return res.recordset.map(row => {
    const vu = Number(row.valor_unitario || 0);
    const tar = Number(row.tarifa || 0);
    return {
      empcod: row.empcod,
      cpcod: row.cpcod,
      cpnum: row.cpnum,
      tracod: row.tracod,
      traraz: workerMap[row.tracod] || row.tracod,
      cantidad: Number(row.cantidad || 0),
      valor_unitario: vu,
      tarifa: tar,
      total: Number(vu * tar)
    };
  });
}

/**
 * Gets combined header and detail records for Excel export.
 */
async function obtenerRegistrosCompletosParaExportar() {
  const pool = await db.connect();
  const res = await pool.request().query(`
    SELECT 
      RTRIM(cp.empcod) AS empcod,
      RTRIM(cp.cpcod) AS cpcod,
      cp.fecusucre,
      RTRIM(cp.otcod) AS otcod,
      RTRIM(cp.lotcod) AS lotcod,
      RTRIM(cp.tiptra) AS tiptra,
      RTRIM(cp.ubicod) AS ubicod,
      ISNULL(RTRIM(u.ubinom), cp.ubicod) AS ubinom,
      cp.cantidad AS cantidadCabecera,
      ISNULL(RTRIM(un.unides), cp.unicod_cant) AS unidad,
      cp.valor_unitario AS vuCabecera,
      ISNULL(cp.tarifa, 0) AS tarifaCabecera,
      RTRIM(cp.codusucre) AS codusucre,
      d.cpnum,
      RTRIM(d.tracod) AS tracod,
      d.cantidad AS cantidadOperario,
      d.valor_unitario AS vuOperario,
      COALESCE(NULLIF(d.tarifa, 0), cp.tarifa, 0) AS tarifa
    FROM TAL_CONTROL_PRODUCCION cp
    LEFT JOIN PAR_UBICACION u ON cp.empcod = u.empcod AND cp.ubicod = u.ubicod
    LEFT JOIN PAR_UNIDAD un ON cp.empcod = un.empcod AND cp.unicod_cant = un.unicod
    LEFT JOIN TAL_CONTROL_PRODUCCION_DETALLE d ON cp.empcod = d.empcod AND cp.cpcod = d.cpcod
    ORDER BY cp.fecusucre DESC, cp.cpcod DESC, d.cpnum ASC
  `);

  const workerMap = await getWorkersDictionary();

  return res.recordset.map(row => {
    const vuCab = Number(row.vuCabecera || 0);
    const tarCab = Number(row.tarifaCabecera || 0);
    const vuOp = row.vuOperario !== null ? Number(row.vuOperario) : null;
    const tarOp = row.tarifa !== null ? Number(row.tarifa) : null;
    return {
      empcod: row.empcod,
      cpcod: row.cpcod,
      fecusucre: row.fecusucre,
      otcod: row.otcod,
      lotcod: row.lotcod,
      tiptra: row.tiptra,
      tiptraDesc: row.tiptra === 'D' ? 'DESTAJO' : 'JORNAL',
      ubicod: row.ubicod,
      ubinom: row.ubinom,
      cantidadCabecera: Number(row.cantidadCabecera || 0),
      unidad: row.unidad || '---',
      vuCabecera: vuCab,
      tarifaCabecera: tarCab,
      solesCabecera: Number(vuCab * tarCab),
      codusucre: row.codusucre,
      cpnum: row.cpnum || null,
      tracod: row.tracod || '',
      traraz: workerMap[row.tracod] || row.tracod || '',
      cantidadOperario: row.cantidadOperario !== null ? Number(row.cantidadOperario) : null,
      vuOperario: vuOp,
      tarifa: tarOp,
      subtotal: vuOp !== null && tarOp !== null ? Number(vuOp * tarOp) : 0
    };
  });
}

/**
 * Deletes a production control record: first from TAL_CONTROL_PRODUCCION_DETALLE,
 * and then from TAL_CONTROL_PRODUCCION.
 */
async function eliminarRegistroProduccion(cpcod, empcod = '01') {
  const pool = await db.connect();
  const transaction = new db.sql.Transaction(pool);
  await transaction.begin();
  try {
    const reqDet = new db.sql.Request(transaction);
    reqDet.input('cpcod', db.sql.Char(10), String(cpcod).trim());
    reqDet.input('empcod', db.sql.Char(2), String(empcod).trim());
    await reqDet.query(`
      DELETE FROM TAL_CONTROL_PRODUCCION_DETALLE 
      WHERE empcod = @empcod AND cpcod = @cpcod
    `);

    const reqCab = new db.sql.Request(transaction);
    reqCab.input('cpcod', db.sql.Char(10), String(cpcod).trim());
    reqCab.input('empcod', db.sql.Char(2), String(empcod).trim());
    await reqCab.query(`
      DELETE FROM TAL_CONTROL_PRODUCCION 
      WHERE empcod = @empcod AND cpcod = @cpcod
    `);

    await transaction.commit();
    return true;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  buscarOts,
  obtenerDetallesOt,
  obtenerLotesOt,
  obtenerLotesProducidosDeOt,
  obtenerAvanceCosturasLotes,
  listarUbicaciones,
  obtenerConfigUbicacionProducto,
  listarOperarios,
  ejecutarControlProduccion,
  listarRegistrosProduccion,
  obtenerDetalleRegistroProduccion,
  obtenerRegistrosCompletosParaExportar,
  getWorkersDictionary,
  eliminarRegistroProduccion
};



