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
    const list = await produccionService.obtenerLotesOt(otcod);
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
    const result = await produccionService.registrarProduccion(req.body, req.user.usucod);
    return res.json({ success: true, message: 'EL REGISTRO FUE INGRESADO CORRECTAMENTE', nrocorrelativo: result.nrocorrelativo });
  } catch (err) {
    err.userMessage = err.message;
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
  apiRegistrarProduccion
};
