'use strict';

const db = require('../config/db');

/**
 * Lists profiles (permissions) with optional filters.
 */
async function listarPerfiles(filters = {}) {
  let sqlText = `
    SELECT 
      P.empcod, 
      P.talcod, 
      P.usucod, 
      P.procod, 
      P.flgcon, 
      P.flggra, 
      P.flganu, 
      P.flgeli, 
      P.flgimp,
      P.flgope1,
      P.flgext1,
      P.flgope2,
      P.flgext2,
      P.flgope3,
      P.flgext3,
      P.flgope4,
      P.flgext4,
      U.usunom,
      PR.pronom
    FROM SEG_PERFIL P
    INNER JOIN SEG_USUARIO U ON P.usucod = U.usucod
    INNER JOIN SEG_PROGRAMA PR ON P.procod = PR.procod
    WHERE 1=1
  `;
  const params = {};

  if (filters.usucod) {
    sqlText += ` AND P.usucod = @usucod`;
    params.usucod = filters.usucod.trim();
  }
  if (filters.empcod) {
    sqlText += ` AND P.empcod = @empcod`;
    params.empcod = filters.empcod.trim().toUpperCase();
  }
  if (filters.talcod) {
    sqlText += ` AND P.talcod = @talcod`;
    params.talcod = filters.talcod.trim().toUpperCase();
  }

  const res = await db.query(sqlText, params);
  return res.recordset.map(row => ({
    empcod: row.empcod.trim(),
    talcod: row.talcod.trim(),
    usucod: row.usucod.trim(),
    procod: row.procod.trim(),
    flgcon: !!row.flgcon,
    flggra: !!row.flggra,
    flganu: !!row.flganu,
    flgeli: !!row.flgeli,
    flgimp: !!row.flgimp,
    flgope1: !!row.flgope1,
    flgext1: !!row.flgext1,
    flgope2: !!row.flgope2,
    flgext2: !!row.flgext2,
    flgope3: !!row.flgope3,
    flgext3: !!row.flgext3,
    flgope4: !!row.flgope4,
    flgext4: !!row.flgext4,
    usunom: row.usunom ? row.usunom.trim() : '',
    pronom: row.pronom ? row.pronom.trim() : ''
  }));
}

/**
 * Returns a permissions map by program code for a given user, company and workshop.
 */
async function obtenerPermisosUsuario(usucod, empcod, talcod) {
  const res = await db.query(
    `SELECT procod, flgcon, flggra, flganu, flgeli, flgimp, 
            flgope1, flgext1, flgope2, flgext2, flgope3, flgext3, flgope4, flgext4
     FROM SEG_PERFIL
     WHERE usucod = @usucod AND empcod = @empcod AND talcod = @talcod`,
    {
      usucod: usucod.trim(),
      empcod: empcod.trim().toUpperCase(),
      talcod: talcod.trim().toUpperCase()
    }
  );
  
  const permissionsMap = {};
  res.recordset.forEach(row => {
    const pCode = row.procod.trim().toUpperCase();
    permissionsMap[pCode] = {
      flgcon: !!row.flgcon,
      flggra: !!row.flggra,
      flganu: !!row.flganu,
      flgeli: !!row.flgeli,
      flgimp: !!row.flgimp,
      flgope1: !!row.flgope1,
      flgext1: !!row.flgext1,
      flgope2: !!row.flgope2,
      flgext2: !!row.flgext2,
      flgope3: !!row.flgope3,
      flgext3: !!row.flgext3,
      flgope4: !!row.flgope4,
      flgext4: !!row.flgext4
    };
  });
  return permissionsMap;
}

/**
 * Replaces all permissions for a user within a company and workshop context.
 */
async function guardarPermisos(usucod, empcod, talcod, permissionsList, creator) {
  const u = usucod.trim();
  const e = empcod.trim().toUpperCase();
  const t = talcod.trim().toUpperCase();

  const pool = await db.connect();
  const transaction = new db.sql.Transaction(pool);
  try {
    await transaction.begin();

    // Remove existing entries first
    const deleteRequest = new db.sql.Request(transaction);
    deleteRequest.input('usucod', db.sql.VarChar, u);
    deleteRequest.input('empcod', db.sql.VarChar, e);
    deleteRequest.input('talcod', db.sql.VarChar, t);
    await deleteRequest.query(
      `DELETE FROM SEG_PERFIL WHERE usucod = @usucod AND empcod = @empcod AND talcod = @talcod`
    );

    // Insert the new permissions
    for (const perm of permissionsList) {
      const procod = perm.procod.trim().toUpperCase();
      const flgcon = perm.flgcon ? 1 : 0;
      const flggra = perm.flggra ? 1 : 0;
      const flganu = perm.flganu ? 1 : 0;
      const flgeli = perm.flgeli ? 1 : 0;
      const flgimp = perm.flgimp ? 1 : 0;
      const flgope1 = perm.flgope1 ? 1 : 0;
      const flgext1 = perm.flgext1 ? 1 : 0;
      const flgope2 = perm.flgope2 ? 1 : 0;
      const flgext2 = perm.flgext2 ? 1 : 0;
      const flgope3 = perm.flgope3 ? 1 : 0;
      const flgext3 = perm.flgext3 ? 1 : 0;
      const flgope4 = perm.flgope4 ? 1 : 0;
      const flgext4 = perm.flgext4 ? 1 : 0;

      const insertRequest = new db.sql.Request(transaction);
      insertRequest.input('empcod', db.sql.VarChar, e);
      insertRequest.input('talcod', db.sql.VarChar, t);
      insertRequest.input('usucod', db.sql.VarChar, u);
      insertRequest.input('procod', db.sql.VarChar, procod);
      insertRequest.input('flgcon', db.sql.Int, flgcon);
      insertRequest.input('flggra', db.sql.Int, flggra);
      insertRequest.input('flganu', db.sql.Int, flganu);
      insertRequest.input('flgeli', db.sql.Int, flgeli);
      insertRequest.input('flgimp', db.sql.Int, flgimp);
      insertRequest.input('flgope1', db.sql.Int, flgope1);
      insertRequest.input('flgext1', db.sql.Int, flgext1);
      insertRequest.input('flgope2', db.sql.Int, flgope2);
      insertRequest.input('flgext2', db.sql.Int, flgext2);
      insertRequest.input('flgope3', db.sql.Int, flgope3);
      insertRequest.input('flgext3', db.sql.Int, flgext3);
      insertRequest.input('flgope4', db.sql.Int, flgope4);
      insertRequest.input('flgext4', db.sql.Int, flgext4);
      insertRequest.input('creator', db.sql.VarChar, creator);

      await insertRequest.query(
        `INSERT INTO SEG_PERFIL (empcod, talcod, usucod, procod, 
                                flgcon, flggra, flganu, flgeli, flgimp, 
                                flgope1, flgext1, flgope2, flgext2, flgope3, flgext3, flgope4, flgext4, 
                                codusucre, fecusucre)
         VALUES (@empcod, @talcod, @usucod, @procod, 
                 @flgcon, @flggra, @flganu, @flgeli, @flgimp, 
                 @flgope1, @flgext1, @flgope2, @flgext2, @flgope3, @flgext3, @flgope4, @flgext4, 
                 @creator, GETDATE())`
      );
    }

    await transaction.commit();
    return true;
  } catch (err) {
    try {
      await transaction.rollback();
    } catch (rollbackErr) {
      // Ignore rollback error
    }
    throw err;
  }
}

/**
 * Deletes a single permission record.
 */
async function eliminarPermiso(empcod, talcod, usucod, procod) {
  await db.query(
    `DELETE FROM SEG_PERFIL 
     WHERE empcod = @empcod AND talcod = @talcod AND usucod = @usucod AND procod = @procod`,
    {
      empcod: empcod.trim().toUpperCase(),
      talcod: talcod.trim().toUpperCase(),
      usucod: usucod.trim(),
      procod: procod.trim().toUpperCase()
    }
  );
  return true;
}

module.exports = {
  listarPerfiles,
  obtenerPermisosUsuario,
  guardarPermisos,
  eliminarPermiso
};
