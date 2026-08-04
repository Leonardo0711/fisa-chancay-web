'use strict';

const db = require('../config/db');

// --- UNIDADES ---

async function listarUnidades() {
  const res = await db.query(
    `SELECT RTRIM(unicod) AS unicod, RTRIM(uninom) AS uninom, RTRIM(unides) AS unides, unistd, unidef 
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
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UNIDAD 
     SET unistd = 0, 
         codusuanu = @actor, 
         fecusuanu = GETDATE() 
     WHERE empcod = '01' AND unicod = @unicod`,
    { unicod: unicod.trim(), actor }
  );
  return true;
}

// --- UBICACIONES ---

async function listarUbicaciones() {
  const res = await db.query(
    `SELECT RTRIM(u.ubicod) AS ubicod, RTRIM(u.ubinom) AS ubinom, RTRIM(u.ubides) AS ubides, 
            u.ubistd, u.ubidef, RTRIM(u.unicod) AS unicod, RTRIM(un.unides) AS unides, 
            RTRIM(u.tiptra) AS tiptra, u.ubiuni
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
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UBICACION 
     SET ubistd = 0, 
         codusuanu = @actor, 
         fecusuanu = GETDATE() 
     WHERE empcod = '01' AND ubicod = @ubicod`,
    { ubicod: ubicod.trim(), actor }
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

  const res = await db.query(
    `SELECT RTRIM(up.procod) AS procod, RTRIM(up.ubicod) AS ubicod, RTRIM(u.ubinom) AS ubinom,
            up.cantidad, RTRIM(up.unicod_cant) AS unicod_cant, RTRIM(un1.unides) AS unides_cant,
            up.valor_unitario, RTRIM(up.unicod_vu) AS unicod_vu, RTRIM(un2.unides) AS unides_vu,
            up.tarifa
     FROM FTALLER.dbo.PAR_UBICACION_PRODUCTO up
     INNER JOIN FTALLER.dbo.PAR_UBICACION u ON up.empcod = u.empcod AND up.ubicod = u.ubicod
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un1 ON up.empcod = un1.empcod AND up.unicod_cant = un1.unicod
     LEFT JOIN FTALLER.dbo.PAR_UNIDAD un2 ON up.empcod = un2.empcod AND up.unicod_vu = un2.unicod
     ORDER BY up.procod, up.ubicod`
  );
  return res.recordset;
}

async function crearUbicacionProducto(data, actor) {
  const { procod, ubicod, cantidad, unicod_cant, valor_unitario, unicod_vu, tarifa } = data;
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
         CONSTRAINT [PK_PAR_UBICACION_PRODUCTO] PRIMARY KEY CLUSTERED ([empcod], [procod], [ubicod])
       );
     END;

     INSERT INTO FTALLER.dbo.PAR_UBICACION_PRODUCTO 
     (empcod, procod, ubicod, cantidad, unicod_cant, valor_unitario, unicod_vu, tarifa, codusucre, fecusucre)
     VALUES 
     ('01', @procod, @ubicod, @cantidad, @unicod_cant, @valor_unitario, @unicod_vu, @tarifa, @actor, GETDATE())`,
    {
      procod: procod.trim(),
      ubicod: ubicod.trim(),
      cantidad: cantidad !== '' && cantidad !== null ? parseFloat(cantidad) : null,
      unicod_cant: unicod_cant ? unicod_cant.trim() : null,
      valor_unitario: valor_unitario !== '' && valor_unitario !== null ? parseFloat(valor_unitario) : null,
      unicod_vu: unicod_vu ? unicod_vu.trim() : null,
      tarifa: tarifa !== '' && tarifa !== null ? parseFloat(tarifa) : null,
      actor
    }
  );
  return true;
}

async function editarUbicacionProducto(procod, ubicod, data, actor) {
  const { cantidad, unicod_cant, valor_unitario, unicod_vu, tarifa } = data;
  await db.query(
    `UPDATE FTALLER.dbo.PAR_UBICACION_PRODUCTO 
     SET cantidad = @cantidad, 
         unicod_cant = @unicod_cant, 
         valor_unitario = @valor_unitario, 
         unicod_vu = @unicod_vu, 
         tarifa = @tarifa
     WHERE empcod = '01' AND procod = @procod AND ubicod = @ubicod`,
    {
      procod: procod.trim(),
      ubicod: ubicod.trim(),
      cantidad: cantidad !== '' && cantidad !== null ? parseFloat(cantidad) : null,
      unicod_cant: unicod_cant ? unicod_cant.trim() : null,
      valor_unitario: valor_unitario !== '' && valor_unitario !== null ? parseFloat(valor_unitario) : null,
      unicod_vu: unicod_vu ? unicod_vu.trim() : null,
      tarifa: tarifa !== '' && tarifa !== null ? parseFloat(tarifa) : null
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
  eliminarUbicacionProducto
};
