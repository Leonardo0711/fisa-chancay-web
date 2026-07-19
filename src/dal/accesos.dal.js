'use strict';

const db = require('../config/db');

/**
 * Lists user accesses with optional search/filter options.
 * Joins SEG_USUARIO, SEG_EMPRESA, and SEG_TALLER.
 */
async function listarAccesos(filters = {}) {
  let sqlText = `
    SELECT 
      A.empcod, 
      A.talcod, 
      A.usucod, 
      A.accstd, 
      A.accflg, 
      A.usutip,
      A.fecultlogin,
      E.empnom, 
      T.talnom, 
      U.usunom
    FROM SEG_ACCESO A
    INNER JOIN SEG_USUARIO U ON A.usucod = U.usucod
    INNER JOIN SEG_EMPRESA E ON A.empcod = E.empcod
    INNER JOIN SEG_TALLER T ON A.empcod = T.empcod AND A.talcod = T.talcod
    WHERE 1=1
  `;
  const params = {};

  if (filters.usucod) {
    sqlText += ` AND A.usucod = @usucod`;
    params.usucod = filters.usucod.trim();
  }
  if (filters.empcod) {
    sqlText += ` AND A.empcod = @empcod`;
    params.empcod = filters.empcod.trim().toUpperCase();
  }
  if (filters.talcod) {
    sqlText += ` AND A.talcod = @talcod`;
    params.talcod = filters.talcod.trim().toUpperCase();
  }
  if (filters.accstd !== undefined && filters.accstd !== '') {
    sqlText += ` AND A.accstd = @accstd`;
    params.accstd = filters.accstd === 'true' || filters.accstd === '1' || filters.accstd === true ? 1 : 0;
  }

  const res = await db.query(sqlText, params);
  return res.recordset.map(row => ({
    empcod: row.empcod.trim(),
    talcod: row.talcod.trim(),
    usucod: row.usucod.trim(),
    accstd: !!row.accstd,
    accflg: row.accflg,
    usutip: row.usutip ? row.usutip.trim() : 'I',
    fecultlogin: row.fecultlogin,
    empnom: row.empnom ? row.empnom.trim() : '',
    talnom: row.talnom ? row.talnom.trim() : '',
    usunom: row.usunom ? row.usunom.trim() : ''
  }));
}

/**
 * Gets a specific user access entry.
 */
async function getAcceso(empcod, talcod, usucod) {
  const res = await db.query(
    `SELECT empcod, talcod, usucod, accstd, accflg, usutip, fecultlogin
     FROM SEG_ACCESO
     WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod`,
    {
      empcod: empcod.trim().toUpperCase(),
      talcod: talcod.trim().toUpperCase(),
      usucod: usucod.trim()
    }
  );
  if (res.recordset.length === 0) return null;
  const row = res.recordset[0];
  return {
    empcod: row.empcod.trim(),
    talcod: row.talcod.trim(),
    usucod: row.usucod.trim(),
    accstd: !!row.accstd,
    accflg: row.accflg,
    usutip: row.usutip ? row.usutip.trim() : 'I',
    fecultlogin: row.fecultlogin
  };
}

/**
 * Creates a new user access entry.
 */
async function crearAcceso(data, creator) {
  const empcod = data.empcod.trim().toUpperCase();
  const talcod = data.talcod.trim().toUpperCase();
  const usucod = data.usucod.trim();
  const accstd = data.accstd !== undefined ? (data.accstd ? 1 : 0) : 1;
  const accflg = data.accflg !== undefined ? parseInt(data.accflg, 10) : 0;
  const usutip = data.usutip ? data.usutip.trim().toUpperCase() : 'I';

  await db.query(
    `INSERT INTO SEG_ACCESO (empcod, talcod, usucod, accstd, accflg, usutip, codusucre, fecusucre)
     VALUES (@empcod, @talcod, @usucod, @accstd, @accflg, @usutip, @creator, GETDATE())`,
    { empcod, talcod, usucod, accstd, accflg, usutip, creator }
  );
  return true;
}

/**
 * Updates an access entry.
 */
async function editarAcceso(empcod, talcod, usucod, data, modifier) {
  const e = empcod.trim().toUpperCase();
  const t = talcod.trim().toUpperCase();
  const u = usucod.trim();
  const accstd = data.accstd ? 1 : 0;
  const accflg = data.accflg !== undefined ? parseInt(data.accflg, 10) : 0;
  const usutip = data.usutip ? data.usutip.trim().toUpperCase() : 'I';

  await db.query(
    `UPDATE SEG_ACCESO 
     SET accstd = @accstd, 
         accflg = @accflg, 
         usutip = @usutip,
         codusumod = @modifier, 
         fecusumod = GETDATE()
     WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod`,
    { empcod: e, talcod: t, usucod: u, accstd, accflg, usutip, modifier }
  );
  return true;
}

/**
 * Activates or deactivates (soft delete) an access entry.
 */
async function cambiarEstado(empcod, talcod, usucod, estado, modifier) {
  const e = empcod.trim().toUpperCase();
  const t = talcod.trim().toUpperCase();
  const u = usucod.trim();
  const accstd = estado ? 1 : 0;

  if (accstd === 0) {
    await db.query(
      `UPDATE SEG_ACCESO 
       SET accstd = 0, 
           codusuanu = @modifier, 
           fecusuanu = GETDATE()
       WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod`,
      { empcod: e, talcod: t, usucod: u, modifier }
    );
  } else {
    await db.query(
      `UPDATE SEG_ACCESO 
       SET accstd = 1, 
           codusumod = @modifier, 
           fecusumod = GETDATE()
       WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod`,
      { empcod: e, talcod: t, usucod: u, modifier }
    );
  }
  return true;
}

/**
 * Updates the last login timestamp for an access entry.
 */
async function actualizarUltimoLogin(empcod, talcod, usucod) {
  const e = empcod.trim().toUpperCase();
  const t = talcod.trim().toUpperCase();
  const u = usucod.trim();
  
  await db.query(
    `UPDATE SEG_ACCESO 
     SET fecultlogin = GETDATE() 
     WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod`,
    { empcod: e, talcod: t, usucod: u }
  );
}

/**
 * Sets an access entry as default (accflg = 1) for the user, resetting all other accesses to 0.
 */
async function marcarAccesoPredeterminado(empcod, talcod, usucod, modifier) {
  const e = empcod.trim().toUpperCase();
  const t = talcod.trim().toUpperCase();
  const u = usucod.trim();
  
  // 1. Reset all accesses for this user to 0
  await db.query(
    `UPDATE SEG_ACCESO 
     SET accflg = 0, 
         codusumod = @modifier, 
         fecusumod = GETDATE()
     WHERE usucod = @usucod`,
    { usucod: u, modifier }
  );

  // 2. Set the chosen access to 1
  await db.query(
    `UPDATE SEG_ACCESO 
     SET accflg = 1, 
         codusumod = @modifier, 
         fecusumod = GETDATE()
     WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod`,
    { empcod: e, talcod: t, usucod: u, modifier }
  );
  return true;
}

/**
 * Saves user accesses in bulk (transactional).
 */
async function bulkUpsert(usucod, items, actor) {
  const u = usucod.trim();
  const pool = await db.connect();
  const tx = new db.sql.Transaction(pool);
  await tx.begin();

  try {
    // 1. Get current accesses for this user from database
    const curRes = await new db.sql.Request(tx)
      .input('usucod', db.sql.Char(20), u)
      .query(`SELECT RTRIM(empcod) AS empcod, RTRIM(talcod) AS talcod, accstd FROM SEG_ACCESO WHERE usucod = @usucod`);
    
    const curMap = new Map(curRes.recordset.map(r => [`${r.empcod}|${r.talcod}`, r]));
    const selSet = new Set(items.map(i => `${i.empcod.trim().toUpperCase()}|${i.talcod.trim().toUpperCase()}`));

    // 2. Loop and upsert selected items
    for (const it of items) {
      const emp = it.empcod.trim().toUpperCase();
      const tal = it.talcod.trim().toUpperCase();
      const usutip = it.usutip ? it.usutip.trim().toUpperCase() : 'I';
      const accflg = it.accflg ? 1 : 0;
      const key = `${emp}|${tal}`;

      if (curMap.has(key)) {
        await new db.sql.Request(tx)
          .input('usucod', db.sql.Char(20), u)
          .input('empcod', db.sql.Char(2), emp)
          .input('talcod', db.sql.Char(2), tal)
          .input('usutip', db.sql.Char(1), usutip)
          .input('accflg', db.sql.Int, accflg)
          .input('actor', db.sql.VarChar(20), actor)
          .query(`
            UPDATE SEG_ACCESO
            SET accstd = 1,
                accflg = @accflg,
                usutip = @usutip,
                codusumod = @actor,
                fecusumod = GETDATE(),
                codusuanu = NULL,
                fecusuanu = NULL
            WHERE usucod = @usucod AND empcod = @empcod AND talcod = @talcod
          `);
      } else {
        await new db.sql.Request(tx)
          .input('usucod', db.sql.Char(20), u)
          .input('empcod', db.sql.Char(2), emp)
          .input('talcod', db.sql.Char(2), tal)
          .input('usutip', db.sql.Char(1), usutip)
          .input('accflg', db.sql.Int, accflg)
          .input('actor', db.sql.VarChar(20), actor)
          .query(`
            INSERT INTO SEG_ACCESO (empcod, talcod, usucod, usutip, accstd, accflg, codusucre, fecusucre)
            VALUES (@empcod, @talcod, @usucod, @usutip, 1, @accflg, @actor, GETDATE())
          `);
      }
    }

    // 3. Deactivate non-selected accesses
    for (const r of curRes.recordset) {
      const key = `${r.empcod}|${r.talcod}`;
      if (!selSet.has(key)) {
        await new db.sql.Request(tx)
          .input('usucod', db.sql.Char(20), u)
          .input('empcod', db.sql.Char(2), r.empcod)
          .input('talcod', db.sql.Char(2), r.talcod)
          .input('actor', db.sql.VarChar(20), actor)
          .query(`
            UPDATE SEG_ACCESO
            SET accstd = 0,
                accflg = 0,
                codusuanu = @actor,
                fecusuanu = GETDATE()
            WHERE usucod = @usucod AND empcod = @empcod AND talcod = @talcod
          `);
      }
    }

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
  listarAccesos,
  getAcceso,
  crearAcceso,
  editarAcceso,
  cambiarEstado,
  actualizarUltimoLogin,
  marcarAccesoPredeterminado,
  bulkUpsert
};

