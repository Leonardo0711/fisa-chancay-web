-- EMPRESA *********************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[SEG_EMPRESA](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[empnom] [varchar](50) NULL,			-- NOMBRE DE EMPRESA
	[empdes] [varchar](100) NOT NULL,		-- DESCRIPCION DE EMPRESA
	[empstd] [bit] NULL,					-- ESTADO DE EMPRESA
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT PK_SEG_EMPRESA PRIMARY KEY CLUSTERED (empcod)
)

SELECT * FROM SEG_EMPRESA
INSERT INTO SEG_EMPRESA (empcod, empnom, empdes, empstd, codusucre, fecusucre)
VALUES ('01','FIBRAS INDUSTRIALES S.A.','FIBRAS INDUSTRIALES S.A.',1,'ADMIN',GETDATE())


GO

-- TALLER **********************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[SEG_TALLER](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[talcod] [char](2) NOT NULL,			-- CODIGO DE TALLER
	[talnom] [varchar](50) NULL,			-- NOMBRE DE TALLER
	[taldes] [varchar](100) NOT NULL,		-- DESCRIPCION DE TALLER
	[talstd] [bit] NOT NULL,				-- ESTADO DE TALLER
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT PK_SEG_TALLER PRIMARY KEY CLUSTERED (empcod, talcod)
)

SELECT * FROM SEG_TALLER
INSERT INTO SEG_TALLER (empcod, talcod, talnom, taldes, talstd, codusucre, fecusucre)
VALUES ('01','01','TALLER DE CHANCAY','TALLER DE CHANCAY',1,'ADMIN',GETDATE())


GO

ALTER TABLE [dbo].[SEG_TALLER] WITH CHECK ADD FOREIGN KEY ([empcod]) 
REFERENCES [dbo].[SEG_EMPRESA] ([empcod])

GO

-- USUARIO *********************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[SEG_USUARIO](
	[usucod] [char](20) NOT NULL,			-- CODIGO DE USUARIO
	[usunom] [varchar](250) NULL,			-- NOMBRE DE USUARIO
	[usumail] [varchar](50) NULL,			-- MAIL DE USUARIO
	[usuadm] [bit] NULL,					-- INDICADOR DE ADMINISTRADOR GENERAL
	[usucla] [varchar](20) NOT NULL,		-- CLAVE
	[usustd] [bit] NOT NULL,				-- ESTADO DE USUARIO
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT PK_SEG_USUARIO PRIMARY KEY CLUSTERED (usucod)
)
GO

SELECT * FROM SEG_USUARIO
INSERT INTO SEG_USUARIO (usucod, usunom, usucla, usustd, codusucre, fecusucre)
VALUES ('ADMIN','ADMINISTRADOR','ADMIN',1,'ADMIN',GETDATE())

-- ACCESO **********************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[SEG_ACCESO](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[talcod] [char](2) NOT NULL,			-- CODIGO DE TALLER
	[usucod] [char](20) NOT NULL,			-- CODIGO DE USUARIO
	[accstd] [bit] NOT NULL,				-- ESTADO DE ACCESO
	[accflg] [int] NOT NULL,				-- ACCESO POR DEFAULT
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	[fecultlogin] [datetime] NULL,			-- FECHA DEL ULTIMO LOGIN
	CONSTRAINT PK_SEG_ACCESO PRIMARY KEY CLUSTERED (empcod,talcod,usucod)
)

GO

SELECT * FROM SEG_ACCESO
INSERT INTO SEG_ACCESO (empcod, talcod, usucod, accstd, accflg, codusucre, fecusucre)
VALUES ('01','01','ADMIN',1,1,'ADMIN',GETDATE())


ALTER TABLE [dbo].[SEG_ACCESO]  WITH CHECK ADD FOREIGN KEY([usucod])
REFERENCES [dbo].[SEG_USUARIO] ([usucod])

GO

ALTER TABLE [dbo].[SEG_ACCESO]  WITH CHECK ADD  FOREIGN KEY([empcod], [talcod])
REFERENCES [dbo].[SEG_TALLER] ([empcod], [talcod])
GO

-- PROGRAMA **********************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[SEG_PROGRAMA](
	[procod] [char](10) NOT NULL,			-- CODIGO DE PROGRAMA
	[pronom] [varchar](30) NULL,			-- NOMBRE DE PROGRAMA
	[prodes] [varchar](100) NOT NULL,		-- DESCRIPCION DE PROGRAMA
	[prostd] [bit] NOT NULL,				-- ESTADO DE PROGRAMA
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT PK_SEG_PROGRAMA PRIMARY KEY CLUSTERED (procod)
)

GO

-- PERFIL **********************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[SEG_PERFIL](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[talcod] [char](2) NOT NULL,			-- CODIGO DE TALLER
	[usucod] [char](20) NOT NULL,			-- CODIGO DE USUARIO
	[procod] [char](10) NOT NULL,			-- NOMBRE DE PROGRAMA
	[flgcon] [bit] NOT NULL,				-- INDICADOR DE CONSULTA
	[flggra] [bit] NOT NULL,				-- INDICADOR DE GRABACIÓN
	[flganu] [bit] NOT NULL,				-- INDICADOR DE ANULACIÓN
	[flgeli] [bit] NOT NULL,				-- INDICADOR DE ELIMINACIÓN
	[flgimp] [bit] NOT NULL,				-- INDICADOR DE IMPRESIÓN
	[flgope1] [bit] NOT NULL,				-- INDICADOR DE OPERACION 1
	[flgext1] [bit] NOT NULL,				-- INDICADOR DE EXTORNO DE OPERACION 1
	[flgope2] [bit] NOT NULL,				-- INDICADOR DE OPERACION 2
	[flgext2] [bit] NOT NULL,				-- INDICADOR DE EXTORNO DE OPERACION 2
	[flgope3] [bit] NOT NULL,				-- INDICADOR DE OPERACION 3
	[flgext3] [bit] NOT NULL,				-- INDICADOR DE EXTORNO DE OPERACION 3
	[flgope4] [bit] NOT NULL,				-- INDICADOR DE OPERACION 4
	[flgext4] [bit] NOT NULL,				-- INDICADOR DE EXTORNO DE OPERACION 4
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	CONSTRAINT [PK_SEG_PERFIL] PRIMARY KEY NONCLUSTERED (empcod,talcod,usucod,procod)
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[SEG_PERFIL]  WITH CHECK ADD FOREIGN KEY([procod])
REFERENCES [dbo].[SEG_PROGRAMA] ([procod])
GO

ALTER TABLE [dbo].[SEG_PERFIL]  WITH CHECK ADD  CONSTRAINT [FK__SEG_PERFIL__34B4968F] FOREIGN KEY([empcod], [talcod], [usucod])
REFERENCES [dbo].[SEG_ACCESO] ([empcod], [talcod], [usucod])
GO



-- UNIDAD DE MEDIDA ************************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[PAR_UNIDAD](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[unicod] [char](3) NOT NULL,			-- CODIGO DE UNIDAD
	[uninom] [char](10) NULL,				-- NOMBRE DE UNIDAD
	[unides] [varchar](30) NULL,			-- DESCRIPCION DE UNIDAD
	[unistd] [bit] NULL,					-- ESTADO DE UNIDAD
	[unidef] [bit] NULL,					-- UNIDAD POR DEFAUT
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT [PK_PAR_UNIDAD] PRIMARY KEY NONCLUSTERED (empcod,unicod)
) ON [PRIMARY]
GO

-- MAESTRO DE UBICACIONES ******************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[PAR_UBICACION](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[ubicod] [char](5) NOT NULL,			-- CODIGO DE UBICACION
	[ubinom] [varchar](100) NULL,			-- NOMBRE DE UBICACION
	[ubides] [varchar](300) NULL,			-- DESCRIPCION DE UBICACION
	[ubistd] [bit] NULL,					-- ESTADO DE UBICACION
	[ubidef] [bit] NULL,					-- UBICACION POR DEFAUT
	[unicod] [char](3) NOT NULL,			-- CODIGO DE UNIDAD
	[tiptra] [char](1) NOT NULL,			-- TIPO DE TRABAJO => D: DESTAJO - J: JORNAL
	[ubiuni] [bit] NULL,					-- INDICACION SI UNA UBICACION ES UNIVERSAL
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT [PK_PAR_UBICACION] PRIMARY KEY NONCLUSTERED (empcod,ubicod)
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[PAR_UBICACION] WITH CHECK ADD FOREIGN KEY ([empcod]) 
REFERENCES [dbo].[SEG_EMPRESA] ([empcod])

ALTER TABLE [dbo].[PAR_UBICACION] WITH CHECK ADD FOREIGN KEY ([empcod],[unicod]) 
REFERENCES [dbo].[PAR_UNIDAD] ([empcod],[unicod])

-- MAESTRO DE UBICACIONES POR PRODUCTO *****************************************
-- *****************************************************************************
CREATE TABLE [dbo].[PAR_UBICACION_PRODUCTO](
	[empcod] [char](2) NOT NULL,			-- CODIGO DE EMPRESA
	[procod] [char](5) NOT NULL,			-- CODIGO DE UBICACION
	[ubicod] [char](5) NOT NULL,			-- CODIGO DE UBICACION
	[ubinom] [varchar](100) NULL,			-- NOMBRE DE UBICACION
	[ubides] [varchar](300) NULL,			-- DESCRIPCION DE UBICACION
	[ubistd] [bit] NULL,					-- ESTADO DE UBICACION
	[ubidef] [bit] NULL,					-- UBICACION POR DEFAUT
	[unicod] [char](3) NOT NULL,			-- CODIGO DE UNIDAD
	[tiptra] [char](1) NOT NULL,			-- TIPO DE TRABAJO => D: DESTAJO - J: JORNAL
	[ubiuni] [bit] NULL,					-- INDICACION SI UNA UBICACION ES UNIVERSAL
	[codusucre] [varchar](20) NOT NULL,		-- USUARIO CREACION
	[fecusucre] [datetime] NOT NULL,		-- FECHA CREACION
	[codusumod] [varchar](20) NULL,			-- USUARIO MODIFICACION
	[fecusumod] [datetime] NULL,			-- FECHA MODIFICACION
	[codusuanu] [varchar](20) NULL,			-- USUARIO ANULACION
	[fecusuanu] [datetime] NULL,			-- FECHA ANULACION
	CONSTRAINT [PK_PAR_UBICACION] PRIMARY KEY NONCLUSTERED (empcod,ubicod)
) ON [PRIMARY]
GO



-- CONTROL DE PRODUCCIÓN *******************************************************
-- *****************************************************************************
CREATE TABLE [dbo].[TAL_CONTROL_PRODUCCION](




-- OBSERVACIONES ***************************************************************
-- *****************************************************************************
/*
- GUARDAR EL empcod en una variable publica
- GUARDAR EL talcod en una variable publica
- GUARDAR EL usucod en una variable publica
- responsive
- que no se cierre sesion
- que levante sesion a través de una cookie

- MENU ADAPTABLE, HORIZONTAL PC Y 3 LINEAS CON MENU EN CELULAR.
- PRIORIDAD RAPIDEZ DE INGRESO. BOTONES GRANDES, POCO TEXTO, ALTO CONTRASTE, NO MUCHAS COLUMNAS, Y CONFIRMACIONES CLARAS (GUARDADO CORRECTAMENTE, FALTA INGRESAR TAL INFORMACION, ETC)
- FLUJO SIMPLE. SE DEBE SELECCIONAR LA INFORMACION QUE SE REPETIRA UNA VEZ EN UNA SOLA PANTALLA, Y LUEGO USARLA EN LAS DEMAS.
- AL INGRESAR, DEBE VER UN RESUMEN DE LA PRODUCCION SEGUN EL PERFIL
- BUSQUEDAS SIMPLES POR TODOS LOS CAMPOS.

SERVIDOR: 34.176.119.74
BASE DE DATOS: FTALLER
USUARIO: taller
CLAVE: b7^2DWpYJn}5
ADMINISTRADOR DE SQL


*/