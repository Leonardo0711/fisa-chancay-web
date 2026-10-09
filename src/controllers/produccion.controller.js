'use strict';

const produccionService = require('../services/produccion.service');

async function renderProduccion(req, res, next) {
  try {
    res.render('produccion', {
      title: 'Registro de Ingreso Productivo - FISA',
      path: '/produccion'
    });
  } catch (err) {
    next(err);
  }
}

async function apiBuscarOts(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: 'INGRESE AL MENOS 3 CARACTERES PARA BUSCAR LA OT' });
    }
    const list = await produccionService.buscarOts(q.trim());
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiObtenerDetallesOt(req, res, next) {
  try {
    const { otcod } = req.params;
    const details = await produccionService.obtenerDetallesOt(otcod);
    if (!details) {
      return res.status(404).json({ error: 'ORDEN DE TRABAJO NO ENCONTRADA' });
    }
    return res.json(details);
  } catch (err) {
    next(err);
  }
}

async function apiObtenerLotesOt(req, res, next) {
  try {
    const { otcod } = req.params;
    const { ubicod } = req.query;
    const list = await produccionService.obtenerLotesOt(otcod, ubicod);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiListarUbicaciones(req, res, next) {
  try {
    const list = await produccionService.listarUbicaciones();
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiObtenerConfigUbicacionProducto(req, res, next) {
  try {
    const { procod } = req.params;
    const config = await produccionService.obtenerConfigUbicacionProducto(procod);
    return res.json(config);
  } catch (err) {
    next(err);
  }
}

async function apiListarOperarios(req, res, next) {
  try {
    const tiptra = (req.query.tipo || req.query.tiptra || 'D').toUpperCase();
    const list = await produccionService.listarOperarios(tiptra);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiRegistrarProduccion(req, res, next) {
  try {
    const userContext = {
      usucod: req.user ? req.user.usucod : 'ADMIN',
      empcod: req.user ? (req.user.empcod || '01') : '01',
      talcod: req.user ? (req.user.talcod || '01') : '01'
    };
    const result = await produccionService.registrarProduccion(req.body, userContext);
    return res.json({ 
      success: true, 
      message: 'EL REGISTRO FUE INGRESADO CORRECTAMENTE',
      data: result.data
    });
  } catch (err) {
    err.userMessage = err.message;
    res.status(400);
    next(err);
  }
}

async function apiListarRegistrosProduccion(req, res, next) {
  try {
    const { q, limite } = req.query;
    const list = await produccionService.listarRegistros({
      busqueda: q,
      limite: limite ? parseInt(limite, 10) : 100
    });
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiObtenerDetalleRegistro(req, res, next) {
  try {
    const { cpcod } = req.params;
    if (!cpcod) {
      return res.status(400).json({ error: 'NÚMERO DE CONTROL REQUERIDO' });
    }
    const details = await produccionService.obtenerDetalleRegistro(cpcod);
    return res.json(details);
  } catch (err) {
    next(err);
  }
}

async function apiExportarRegistrosProduccion(req, res, next) {
  try {
    const csvContent = await produccionService.generarReporteCsv();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Control_Produccion_Chancay_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

async function apiEliminarRegistroProduccion(req, res, next) {
  try {
    const { cpcod } = req.params;
    await produccionService.eliminarRegistroProduccion(cpcod, req.user);
    return res.json({ success: true, message: `Registro #${cpcod} eliminado correctamente.` });
  } catch (err) {
    next(err);
  }
}

async function apiObtenerSaldoJornal(req, res, next) {
  try {
    const { otcod } = req.params;
    const { ubicod, procod } = req.query;
    const data = await produccionService.obtenerSaldoPendienteJornal(otcod, ubicod, procod);
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

async function apiActualizarRegistroProduccion(req, res, next) {
  try {
    const { cpcod } = req.params;
    const result = await produccionService.actualizarRegistroProduccion(cpcod, req.body, req.user);
    return res.json({
      success: true,
      message: `Registro #${cpcod} actualizado correctamente.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderProduccion,
  apiBuscarOts,
  apiObtenerDetallesOt,
  apiObtenerLotesOt,
  apiListarUbicaciones,
  apiObtenerConfigUbicacionProducto,
  apiListarOperarios,
  apiRegistrarProduccion,
  apiListarRegistrosProduccion,
  apiObtenerDetalleRegistro,
  apiExportarRegistrosProduccion,
  apiEliminarRegistroProduccion,
  apiObtenerSaldoJornal,
  apiActualizarRegistroProduccion
};

