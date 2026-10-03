'use strict';

const db = require('../config/db');

// --- UNIDADES ---

async function listarUnidades() {
  const res = await db.query(
    `SELECT RTRIM(unicod) AS unicod, RTRIM(uninom) AS uninom, RTRIM(unides) AS unides, unistd, unidef,
            RTRIM(codusucre) AS codusucre, fecusucre, RTRIM(codusumod) AS codusumod, fecusumod, RTRIM(codusuanu) AS codusuanu, fecusuanu
     FROM FTALLER.dbo.PAR_UNIDAD 
     WHERE (codusuanu IS NULL OR unistd = 1)
     ORDER BY unicod`
  );
  return res.recordset;
}

async function crearUnidad(data, actor) {
  const { uninom, unides, unistd, unidef } = data;
  await db.query(
    `DECLARE @next_unicod CHAR(3);
     SELECT @next_unicod = RIGHT('000' + CAST(COALESCE(MAX(CAST(unicod AS INT)), 0) + 1 AS VARCHAR(3)), 3)
     FROM FTALLER.dbo.PAR_UNIDAD 
     WHERE ISNUMERIC(unicod) = 1;

     IF @next_unicod IS NULL OR @next_unicod = '000'
       SET @next_unicod = '001';

     INSERT INTO FTALLER.dbo.PAR_UNIDAD 
     (empcod, unicod, uninom, unides, unistd, unidef, codusucre, fecusucre)
     VALUES 
     ('01', @next_unicod, @uninom, @unides, @unistd, @unidef, @actor, GETDATE())`,
    {
      uninom: uninom.trim(),
      unides: unides.trim(),
      unistd: unistd ? 1 : 0,
      unidef: unidef ? 1 : 0,
      actor
    }
  );
  return true;
}

async function editarUnidad(unicod, data, actor) {
  const { uninom, unides, unistd, unidef } = data;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UNIDAD 
     SET uninom = @uninom, 
         unides = @unides, 
         unistd = @unistd, 
         unidef = @unidef, 
         codusumod = @actor, 
         fecusumod = GETDATE()
     WHERE empcod = '01' AND unicod = @unicod`,
    {
      unicod: unicod.trim(),
      uninom: uninom.trim(),
      unides: unides.trim(),
      unistd: unistd ? 1 : 0,
      unidef: unidef ? 1 : 0,
      actor
    }
  );
  return true;
}

async function eliminarUnidad(unicod, actor) {
  const normCode = unicod.trim();
  
  // 1. Check in PAR_UBICACION
  const checkUbi = await db.query(
    `SELECT COUNT(1) AS count FROM FTALLER.dbo.PAR_UBICACION WHERE unicod = @unicod AND codusuanu IS NULL`,
    { unicod: normCode }
  );
  if (checkUbi.recordset[0] && checkUbi.recordset[0].count > 0) {
    throw new Error('No se puede borrar la Unidad porque está referenciada en el Maestro de Ubicaciones. Debe eliminar primero las ubicaciones asociadas.');
  }

  // 2. Check in PAR_UBICACION_PRODUCTO (if table exists)
  const checkTable = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PAR_UBICACION_PRODUCTO'`
  );
  if (checkTable.recordset.length > 0) {
    const checkMap = await db.query(
      `SELECT COUNT(1) AS count FROM FTALLER.dbo.PAR_UBICACION_PRODUCTO WHERE unicod_cant = @unicod OR unicod_vu = @unicod`,
      { unicod: normCode }
    );
    if (checkMap.recordset[0] && checkMap.recordset[0].count > 0) {
      throw new Error('No se puede borrar la Unidad porque está referenciada en la Configuración de Ubicaciones por Producto.');
    }
  }

  // 3. Physical delete
  await db.query(
    `DELETE FROM FTALLER.dbo.PAR_UNIDAD WHERE empcod = '01' AND unicod = @unicod`,
    { unicod: normCode }
  );
  return true;
}

// --- UBICACIONES ---

async function listarUbicaciones() {
  const res = await db.query(
    `SELECT RTRIM(u.ubicod) AS ubicod, RTRIM(u.ubinom) AS ubinom, RTRIM(u.ubides) AS ubides, 
            u.ubistd, u.ubidef, RTRIM(u.unicod) AS unicod, RTRIM(un.unides) AS unides, 
            RTRIM(u.tiptra) AS tiptra, u.ubiuni,
            RTRIM(u.codusucre) AS codusucre, u.fecusucre, RTRIM(u.codusumod) AS codusumod, u.fecusumod, RTRIM(u.codusuanu) AS codusuanu, u.fecusuanu
     FROM FTALLER.dbo.PAR_UBICACION u
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un ON u.empcod = un.empcod AND u.unicod = un.unicod
     WHERE u.codusuanu IS NULL
     ORDER BY u.ubicod`
  );
  return res.recordset;
}

async function crearUbicacion(data, actor) {
  const { ubinom, ubides, ubistd, ubidef, unicod, tiptra, ubiuni } = data;
  await db.query(
    `DECLARE @next_ubicod CHAR(5);
     SELECT @next_ubicod = RIGHT('00000' + CAST(COALESCE(MAX(CAST(ubicod AS INT)), 0) + 1 AS VARCHAR(5)), 5)
     FROM FTALLER.dbo.PAR_UBICACION 
     WHERE ISNUMERIC(ubicod) = 1;

     IF @next_ubicod IS NULL OR @next_ubicod = '00000'
       SET @next_ubicod = '00001';

     INSERT INTO FTALLER.dbo.PAR_UBICACION 
     (empcod, ubicod, ubinom, ubides, ubistd, ubidef, unicod, tiptra, ubiuni, codusucre, fecusucre)
     VALUES 
     ('01', @next_ubicod, @ubinom, @ubides, @ubistd, @ubidef, @unicod, @tiptra, @ubiuni, @actor, GETDATE())`,
    {
      ubinom: ubinom.trim(),
      ubides: (ubides || '').trim(),
      ubistd: ubistd ? 1 : 0,
      ubidef: ubidef ? 1 : 0,
      unicod: unicod.trim(),
      tiptra: tiptra.trim(),
      ubiuni: ubiuni ? 1 : 0,
      actor
    }
  );
  return true;
}

async function editarUbicacion(ubicod, data, actor) {
  const { ubinom, ubides, ubistd, ubidef, unicod, tiptra, ubiuni } = data;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UBICACION 
     SET ubinom = @ubinom, 
         ubides = @ubides, 
         ubistd = @ubistd, 
         ubidef = @ubidef, 
         unicod = @unicod, 
         tiptra = @tiptra, 
         ubiuni = @ubiuni, 
         codusumod = @actor, 
         fecusumod = GETDATE()
     WHERE empcod = '01' AND ubicod = @ubicod`,
    {
      ubicod: ubicod.trim(),
      ubinom: ubinom.trim(),
      ubides: (ubides || '').trim(),
      ubistd: ubistd ? 1 : 0,
      ubidef: ubidef ? 1 : 0,
      unicod: unicod.trim(),
      tiptra: tiptra.trim(),
      ubiuni: ubiuni ? 1 : 0,
      actor
    }
  );
  return true;
}

async function eliminarUbicacion(ubicod, actor) {
  const normCode = ubicod.trim();

  // 1. Check in PAR_UBICACION_PRODUCTO (if table exists)
  const checkTable = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PAR_UBICACION_PRODUCTO'`
  );
  if (checkTable.recordset.length > 0) {
    const checkMap = await db.query(
      `SELECT COUNT(1) AS count FROM FTALLER.dbo.PAR_UBICACION_PRODUCTO WHERE ubicod = @ubicod`,
      { ubicod: normCode }
    );
    if (checkMap.recordset[0] && checkMap.recordset[0].count > 0) {
      throw new Error('No se puede borrar la Ubicación porque está referenciada en la Configuración de Ubicaciones por Producto.');
    }
  }

  // 2. Physical delete
  await db.query(
    `DELETE FROM FTALLER.dbo.PAR_UBICACION WHERE empcod = '01' AND ubicod = @ubicod`,
    { ubicod: normCode }
  );
  return true;
}

// --- UBICACIONES POR PRODUCTO ---

async function listarUbicacionesProducto() {
  // Check if PAR_UBICACION_PRODUCTO exists first to prevent crashes
  const tableCheck = await db.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PAR_UBICACION_PRODUCTO'`
  );
  if (tableCheck.recordset.length === 0) {
    return [];
  }

  // Ensure pronom column exists
  await db.query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('FTALLER.dbo.PAR_UBICACION_PRODUCTO') AND name = 'pronom')
    BEGIN
      ALTER TABLE FTALLER.dbo.PAR_UBICACION_PRODUCTO ADD pronom VARCHAR(250) NULL;
    END
  `);

  const res = await db.query(
    `SELECT RTRIM(up.procod) AS procod, 
            RTRIM(ISNULL(up.pronom, '')) AS pronom,
            RTRIM(up.ubicod) AS ubicod, 
            RTRIM(u.ubinom) AS ubinom,
            up.cantidad, 
            RTRIM(up.unicod_cant) AS unicod_cant, 
            RTRIM(un1.unides) AS unides_cant,
            up.valor_unitario, 
            RTRIM(up.unicod_vu) AS unicod_vu, 
            RTRIM(un2.unides) AS unides_vu,
            up.tarifa,
            RTRIM(up.codusucre) AS codusucre, up.fecusucre, RTRIM(up.codusumod) AS codusumod, up.fecusumod, RTRIM(up.codusuanu) AS codusuanu, up.fecusuanu
     FROM FTALLER.dbo.PAR_UBICACION_PRODUCTO up
     INNER JOIN FTALLER.dbo.PAR_UBICACION u ON up.empcod = u.empcod AND up.ubicod = u.ubicod
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un1 ON up.empcod = un1.empcod AND up.unicod_cant = un1.unicod
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un2 ON up.empcod = un2.empcod AND up.unicod_vu = un2.unicod
     ORDER BY up.procod, up.ubicod`
  );
  return res.recordset;
}

async function crearUbicacionProducto(data, actor) {
  const { procod, ubicod, cantidad, unicod_cant, valor_unitario, unicod_vu, tarifa, pronom } = data;
  await db.query(
    `IF NOT EXISTS (SELECT * FROM FTALLER.sys.objects WHERE object_id = OBJECT_ID(N'FTALLER.[dbo].[PAR_UBICACION_PRODUCTO]') AND type in (N'U'))
     BEGIN
       CREATE TABLE FTALLER.[dbo].[PAR_UBICACION_PRODUCTO](
         [empcod] [char](2) NOT NULL,
         [procod] [varchar](30) NOT NULL,
         [ubicod] [char](5) NOT NULL,
         [cantidad] [decimal](18, 4) NULL,
         [unicod_cant] [char](3) NULL,
         [valor_unitario] [decimal](18, 4) NULL,
         [unicod_vu] [char](3) NULL,
         [tarifa] [decimal](18, 4) NULL,
         [codusucre] [varchar](20) NOT NULL,
         [fecusucre] [datetime] NOT NULL,
         [pronom] [varchar](250) NULL,
         CONSTRAINT [PK_PAR_UBICACION_PRODUCTO] PRIMARY KEY CLUSTERED ([empcod], [procod], [ubicod])
       );
     END;

     IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('FTALLER.dbo.PAR_UBICACION_PRODUCTO') AND name = 'pronom')
     BEGIN
       ALTER TABLE FTALLER.dbo.PAR_UBICACION_PRODUCTO ADD pronom VARCHAR(250) NULL;
     END;

     INSERT INTO FTALLER.dbo.PAR_UBICACION_PRODUCTO 
     (empcod, procod, ubicod, cantidad, unicod_cant, valor_unitario, unicod_vu, tarifa, codusucre, fecusucre, pronom)
     VALUES 
     ('01', @procod, @ubicod, @cantidad, @unicod_cant, @valor_unitario, @unicod_vu, @tarifa, @actor, GETDATE(), @pronom)`,
    {
      procod: procod.trim(),
      ubicod: ubicod.trim(),
      cantidad: cantidad !== '' && cantidad !== null ? parseFloat(cantidad) : null,
      unicod_cant: unicod_cant ? unicod_cant.trim() : null,
      valor_unitario: valor_unitario !== '' && valor_unitario !== null ? parseFloat(valor_unitario) : null,
      unicod_vu: unicod_vu ? unicod_vu.trim() : null,
      tarifa: tarifa !== '' && tarifa !== null ? parseFloat(tarifa) : null,
      pronom: pronom ? pronom.trim() : null,
      actor
    }
  );
  return true;
}

async function editarUbicacionProducto(procod, ubicod, data, actor) {
  const { cantidad, unicod_cant, valor_unitario, unicod_vu, tarifa, pronom } = data;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UBICACION_PRODUCTO 
     SET cantidad = @cantidad, 
         unicod_cant = @unicod_cant, 
         valor_unitario = @valor_unitario, 
         unicod_vu = @unicod_vu, 
         tarifa = @tarifa,
         pronom = COALESCE(@pronom, pronom),
         codusumod = @actor,
         fecusumod = GETDATE()
     WHERE empcod = '01' AND procod = @procod AND ubicod = @ubicod`,
    {
      procod: procod.trim(),
      ubicod: ubicod.trim(),
      cantidad: cantidad !== '' && cantidad !== null ? parseFloat(cantidad) : null,
      unicod_cant: unicod_cant ? unicod_cant.trim() : null,
      valor_unitario: valor_unitario !== '' && valor_unitario !== null ? parseFloat(valor_unitario) : null,
      unicod_vu: unicod_vu ? unicod_vu.trim() : null,
      tarifa: tarifa !== '' && tarifa !== null ? parseFloat(tarifa) : null,
      pronom: pronom ? pronom.trim() : null,
      actor
    }
  );
  return true;
}

async function eliminarUbicacionProducto(procod, ubicod) {
  await db.query(
    `DELETE FROM FTALLER.dbo.PAR_UBICACION_PRODUCTO 
     WHERE empcod = '01' AND procod = @procod AND ubicod = @ubicod`,
    { procod: procod.trim(), ubicod: ubicod.trim() }
  );
  return true;
}

async function obtenerNextCodeUnidad() {
  const res = await db.query(
    `SELECT RIGHT('000' + CAST(COALESCE(MAX(CAST(unicod AS INT)), 0) + 1 AS VARCHAR(3)), 3) AS nextCode
     FROM FTALLER.dbo.PAR_UNIDAD 
     WHERE ISNUMERIC(unicod) = 1`
  );
  const nextVal = res.recordset[0] ? res.recordset[0].nextCode : null;
  return nextVal || '001';
}

async function cambiarEstadoUnidad(unicod, estado, actor) {
  const unistd = estado ? 1 : 0;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UNIDAD 
     SET unistd = @unistd, 
         codusumod = @actor, 
         fecusumod = GETDATE()
     WHERE empcod = '01' AND unicod = @unicod`,
    { unicod: unicod.trim(), unistd, actor }
  );
  return true;
}

async function obtenerNextCodeUbicacion() {
  const res = await db.query(
    `SELECT RIGHT('00000' + CAST(COALESCE(MAX(CAST(ubicod AS INT)), 0) + 1 AS VARCHAR(5)), 5) AS nextCode
     FROM FTALLER.dbo.PAR_UBICACION 
     WHERE ISNUMERIC(ubicod) = 1`
  );
  const nextVal = res.recordset[0] ? res.recordset[0].nextCode : null;
  return nextVal || '00001';
}

async function cambiarEstadoUbicacion(ubicod, estado, actor) {
  const ubistd = estado ? 1 : 0;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UBICACION 
     SET ubistd = @ubistd, 
         codusumod = @actor, 
         fecusumod = GETDATE()
     WHERE empcod = '01' AND ubicod = @ubicod`,
    { ubicod: ubicod.trim(), ubistd, actor }
  );
  return true;
}

// --- EMPRESAS TERCERAS ---

async function listarTerceras() {
  const res = await db.query(
    `SELECT RTRIM(tercod) AS tercod, RTRIM(ternom) AS ternom, RTRIM(terdes) AS terdes,
            terstd, terdef,
            RTRIM(codusucre) AS codusucre, fecusucre, 
            RTRIM(codusumod) AS codusumod, fecusumod, 
            RTRIM(codusuanu) AS codusuanu, fecusuanu
     FROM FTALLER.dbo.PAR_TERCERA
     ORDER BY tercod`
  );
  return res.recordset;
}

async function obtenerNextCodeTercera() {
  const res = await db.query(
    `SELECT RIGHT('00000' + CAST(COALESCE(MAX(CAST(CASE WHEN ISNUMERIC(tercod) = 1 THEN tercod ELSE '0' END AS INT)), 0) + 1 AS VARCHAR(5)), 5) AS nextCode
     FROM FTALLER.dbo.PAR_TERCERA`
  );
  const nextVal = res.recordset[0] ? res.recordset[0].nextCode : null;
  return nextVal || '00001';
}

async function crearTercera(data, actor) {
  const { tercod, ternom, terdes, terstd, terdef } = data;
  let finalCode = (tercod || '').trim();
  if (!finalCode) {
    finalCode = await obtenerNextCodeTercera();
  }

  // Verificar si ya existe
  const existCheck = await db.query(
    `SELECT 1 FROM FTALLER.dbo.PAR_TERCERA WHERE empcod = '01' AND tercod = @tercod`,
    { tercod: finalCode }
  );
  if (existCheck.recordset.length > 0) {
    throw new Error(`Ya existe una empresa tercera con el código ${finalCode}.`);
  }

  await db.query(
    `INSERT INTO FTALLER.dbo.PAR_TERCERA 
     (empcod, tercod, ternom, terdes, terstd, terdef, codusucre, fecusucre)
     VALUES 
     ('01', @tercod, @ternom, @terdes, @terstd, @terdef, @actor, GETDATE())`,
    {
      tercod: finalCode,
      ternom: (ternom || '').trim(),
      terdes: (terdes || '').trim(),
      terstd: terstd ? 1 : 0,
      terdef: terdef ? 1 : 0,
      actor
    }
  );
  return { tercod: finalCode };
}

async function editarTercera(tercod, data, actor) {
  const { ternom, terdes, terstd, terdef } = data;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_TERCERA 
     SET ternom = @ternom, 
         terdes = @terdes, 
         terstd = @terstd, 
         terdef = @terdef, 
         codusumod = @actor, 
         fecusumod = GETDATE()
     WHERE empcod = '01' AND tercod = @tercod`,
    {
      tercod: tercod.trim(),
      ternom: (ternom || '').trim(),
      terdes: (terdes || '').trim(),
      terstd: terstd ? 1 : 0,
      terdef: terdef ? 1 : 0,
      actor
    }
  );
  return true;
}

async function cambiarEstadoTercera(tercod, estado, actor) {
  const terstd = estado ? 1 : 0;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_TERCERA 
     SET terstd = @terstd, 
         codusumod = @actor, 
         fecusumod = GETDATE(),
         codusuanu = CASE WHEN @terstd = 0 THEN @actor ELSE NULL END,
         fecusuanu = CASE WHEN @terstd = 0 THEN GETDATE() ELSE NULL END
     WHERE empcod = '01' AND tercod = @tercod`,
    { tercod: tercod.trim(), terstd, actor }
  );
  return true;
}

async function eliminarTercera(tercod, actor) {
  const normCode = tercod.trim();

  // Validar si está referenciada en TAL_CONTROL_PRODUCCION_DETALLE
  const checkProd = await db.query(
    `SELECT COUNT(1) AS count FROM FTALLER.dbo.TAL_CONTROL_PRODUCCION_DETALLE WHERE tracod = @tercod`,
    { tercod: normCode }
  );
  if (checkProd.recordset[0] && checkProd.recordset[0].count > 0) {
    throw new Error('No se puede borrar la Empresa Tercera porque ya cuenta con registros de producción asociados. En su lugar puede Anularla (Desactivarla).');
  }

  await db.query(
    `DELETE FROM FTALLER.dbo.PAR_TERCERA WHERE empcod = '01' AND tercod = @tercod`,
    { tercod: normCode }
  );
  return true;
}

module.exports = {
  listarUnidades,
  crearUnidad,
  editarUnidad,
  eliminarUnidad,
  listarUbicaciones,
  crearUbicacion,
  editarUbicacion,
  eliminarUbicacion,
  listarUbicacionesProducto,
  crearUbicacionProducto,
  editarUbicacionProducto,
  eliminarUbicacionProducto,
  obtenerNextCodeUnidad,
  cambiarEstadoUnidad,
  obtenerNextCodeUbicacion,
  cambiarEstadoUbicacion,
  listarTerceras,
  obtenerNextCodeTercera,
  crearTercera,
  editarTercera,
  cambiarEstadoTercera,
  eliminarTercera
};

