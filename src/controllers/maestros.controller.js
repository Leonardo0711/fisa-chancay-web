'use strict';

const maestrosService = require('../services/maestros.service');

// --- VIEWS ---

async function renderUnidades(req, res, next) {
  try {
    res.render('maestros/unidades', {
      title: 'Mantenimiento - Unidades de Medida',
      path: '/maestros/unidades'
    });
  } catch (err) {
    next(err);
  }
}

async function renderUbicaciones(req, res, next) {
  try {
    res.render('maestros/ubicaciones', {
      title: 'Mantenimiento - Ubicaciones',
      path: '/maestros/ubicaciones'
    });
  } catch (err) {
    next(err);
  }
}

async function renderUbicacionesProducto(req, res, next) {
  try {
    res.render('maestros/ubicaciones_producto', {
      title: 'Mantenimiento - Ubicaciones por Producto',
      path: '/maestros/ubicaciones-producto'
    });
  } catch (err) {
    next(err);
  }
}

// --- API UNIDADES ---

async function apiListarUnidades(req, res, next) {
  try {
    const list = await maestrosService.listarUnidades();
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiCrearUnidad(req, res, next) {
  try {
    await maestrosService.crearUnidad(req.body, req.user.usucod);
    return res.json({ success: true, message: 'Unidad de medida creada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function apiEditarUnidad(req, res, next) {
  try {
    const { unicod } = req.params;
    await maestrosService.editarUnidad(unicod, req.body, req.user.usucod);
    return res.json({ success: true, message: 'Unidad de medida modificada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function apiEliminarUnidad(req, res, next) {
  try {
    const { unicod } = req.params;
    await maestrosService.eliminarUnidad(unicod, req.user.usucod);
    return res.json({ success: true, message: 'Unidad de medida desactivada correctamente.' });
  } catch (err) {
    next(err);
  }
}

// --- API UBICACIONES ---

async function apiListarUbicaciones(req, res, next) {
  try {
    const list = await maestrosService.listarUbicaciones();
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiCrearUbicacion(req, res, next) {
  try {
    await maestrosService.crearUbicacion(req.body, req.user.usucod);
    return res.json({ success: true, message: 'Ubicación creada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function apiEditarUbicacion(req, res, next) {
  try {
    const { ubicod } = req.params;
    await maestrosService.editarUbicacion(ubicod, req.body, req.user.usucod);
    return res.json({ success: true, message: 'Ubicación modificada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function apiEliminarUbicacion(req, res, next) {
  try {
    const { ubicod } = req.params;
    await maestrosService.eliminarUbicacion(ubicod, req.user.usucod);
    return res.json({ success: true, message: 'Ubicación desactivada correctamente.' });
  } catch (err) {
    next(err);
  }
}

// --- API UBICACIONES POR PRODUCTO ---

async function apiListarUbicacionesProducto(req, res, next) {
  try {
    const list = await maestrosService.listarUbicacionesProducto();
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

async function apiCrearUbicacionProducto(req, res, next) {
  try {
    await maestrosService.crearUbicacionProducto(req.body, req.user.usucod);
    return res.json({ success: true, message: 'Relación ubicación-producto creada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function apiEditarUbicacionProducto(req, res, next) {
  try {
    const { procod, ubicod } = req.params;
    await maestrosService.editarUbicacionProducto(procod, ubicod, req.body, req.user.usucod);
    return res.json({ success: true, message: 'Relación ubicación-producto modificada correctamente.' });
  } catch (err) {
    next(err);
  }
}

async function apiEliminarUbicacionProducto(req, res, next) {
  try {
    const { procod, ubicod } = req.params;
    await maestrosService.eliminarUbicacionProducto(procod, ubicod);
    return res.json({ success: true, message: 'Relación ubicación-producto eliminada correctamente.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderUnidades,
  renderUbicaciones,
  renderUbicacionesProducto,
  apiListarUnidades,
  apiCrearUnidad,
  apiEditarUnidad,
  apiEliminarUnidad,
  apiListarUbicaciones,
  apiCrearUbicacion,
  apiEditarUbicacion,
  apiEliminarUbicacion,
  apiListarUbicacionesProducto,
  apiCrearUbicacionProducto,
  apiEditarUbicacionProducto,
  apiEliminarUbicacionProducto
};
