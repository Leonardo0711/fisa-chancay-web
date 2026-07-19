MERGE INTO SEG_PROGRAMA AS target
USING (VALUES 
  ('DASHBOARD', 'DASHBOARD', 'Panel de control principal', 1, 'ADMIN', GETDATE()),
  ('USUARIOS', 'USUARIOS', 'Administración de usuarios del sistema', 1, 'ADMIN', GETDATE()),
  ('ACCESOS', 'ACCESOS', 'Gestión de accesos por empresa y taller', 1, 'ADMIN', GETDATE()),
  ('PROGRAMAS', 'PROGRAMAS', 'Catálogo de programas y módulos', 1, 'ADMIN', GETDATE()),
  ('PERFILES', 'PERFILES', 'Gestión de perfiles y permisos de usuario', 1, 'ADMIN', GETDATE()),
  ('PRODUCCION', 'PRODUCCION', 'Módulo de registro productivo (Fase 2)', 1, 'ADMIN', GETDATE())
) AS source (procod, pronom, prodes, prostd, codusucre, fecusucre)
ON target.procod = source.procod
WHEN NOT MATCHED THEN
  INSERT (procod, pronom, prodes, prostd, codusucre, fecusucre)
  VALUES (source.procod, source.pronom, source.prodes, source.prostd, source.codusucre, source.fecusucre)
WHEN MATCHED THEN
  UPDATE SET 
    pronom = source.pronom,
    prodes = source.prodes,
    prostd = source.prostd,
    codusumod = 'ADMIN',
    fecusumod = GETDATE();
