'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const produccionDal = require('../dal/produccion.dal');

// Mock data for location configurations per product (replicating mockups/Excel data)
// Since we are NOT allowed to create database tables, we keep this configuration in code memory.
const MOCK_UBICACIONES_PRODUCTO = {
  // Key: location code (matching the auto-generated 5-digit format)
  '00001': {
    ubicod: '00001',
    ubinom: 'CUCHILLA',
    tiptra: 'D', // Destajo
    ubiuni: false, // No Universal
    cantidad: 16,
    unidadCant: 'COSTURAS',
    valorUnitario: 3.5,
    unidadVu: 'BRAZAS',
    tarifa: 5.56
  },
  '00002': {
    ubicod: '00002',
    ubinom: 'REFUERZO',
    tiptra: 'D', // Destajo
    ubiuni: true, // Universal
    cantidad: null,
    unidadCant: null,
    valorUnitario: 5.5,
    unidadVu: 'BRAZAS',
    tarifa: 4.25
  },
  '00003': {
    ubicod: '00003',
    ubinom: 'GASA SIMPLE',
    tiptra: 'J', // Jornal
    ubiuni: true, // Universal
    cantidad: 400,
    unidadCant: 'COSTURAS',
    valorUnitario: null,
    unidadVu: null,
    tarifa: 6.32
  },
  '00004': {
    ubicod: '00004',
    ubinom: 'ASEGURADA CRUZADA',
    tiptra: 'J', // Jornal
    ubiuni: false, // No Universal
    cantidad: 120,
    unidadCant: 'COSTURAS',
    valorUnitario: null,
    unidadVu: null,
    tarifa: 10.22
  }
};
async function buscarOts(q) {
  return produccionDal.buscarOts(q);
}

async function obtenerDetallesOt(otcod) {
  return produccionDal.obtenerDetallesOt(otcod);
}

async function obtenerLotesOt(otcod) {
  const lotes = await produccionDal.obtenerLotesOt(otcod);
  
  const totalLotes = lotes.length;
  return lotes.map((l, index) => ({
    lotcod: l.lotcod,
    avance: `${index + 1}/${totalLotes}`
  }));
}

async function listarUbicaciones() {
  return produccionDal.listarUbicaciones();
}

async function obtenerConfigUbicacionProducto(procod) {
  try {
    const dbConfig = await produccionDal.obtenerConfigUbicacionProducto(procod);
    if (dbConfig && dbConfig.length > 0) {
      const configMap = {};
      dbConfig.forEach(row => {
        configMap[row.ubicod] = {
          ubicod: row.ubicod,
          ubinom: row.ubinom,
          tiptra: row.tiptra,
          ubiuni: !!row.ubiuni,
          cantidad: row.cantidad,
          unidadCant: row.unidadCant,
          valorUnitario: row.valorUnitario,
          unidadVu: row.unidadVu,
          tarifa: row.tarifa
        };
      });
      return configMap;
    }
  } catch (err) {
    console.error('Error fetching real product-location configurations:', err.message);
  }
  
  return {};
}

async function listarOperarios(tiptra = 'D') {
  return produccionDal.listarOperarios(tiptra);
}

async function registrarProduccion(data, userContext) {
  const {
    empcod,
    otcod,
    tiptra,
    ubicod,
    lote,
    lotcod,
    cantidadIngresar,
    cantidad,
    unicod_cant,
    vuIngresar,
    valor_unitario,
    workers,
    sTraCod,
    sCantidad,
    sValor_Unitario,
    sTipOpe
  } = data;

  if (!otcod) {
    throw new Error('DATOS REQUERIDOS FALTANTES: SE REQUIERE LA ORDEN DE TRABAJO (OT)');
  }
  if (!ubicod) {
    throw new Error('DATOS REQUERIDOS FALTANTES: SE REQUIERE LA UBICACIÓN');
  }

  const finalTiptra = (tiptra || 'D').toUpperCase();
  const finalLotcod = (lotcod || lote || '').trim();
  const finalCantidad = parseFloat(cantidadIngresar || cantidad || 0);
  const finalVu = finalTiptra === 'J' ? 0 : parseFloat(vuIngresar || valor_unitario || 0);

  // Armar cadenas de detalle con palotes '|'
  let finalTraCod = sTraCod || '';
  let finalCantStr = sCantidad || '';
  let finalVuStr = sValor_Unitario || '';

  if (Array.isArray(workers) && workers.length > 0) {
    finalTraCod = workers.map(w => String(w.usucod || w.tracod || '').trim()).join('|');
    finalCantStr = workers.map(w => String(w.cantidad || 0).trim()).join('|');
    finalVuStr = workers.map(w => String(finalTiptra === 'J' ? '0' : Number(w.vu || 0).toFixed(2)).trim()).join('|');
  }

  if (!finalTraCod) {
    throw new Error('SE REQUIERE ASIGNAR AL MENOS UN OPERARIO AL REGISTRO');
  }

  // Identificar usuario y empresa activa
  const actorUsucod = typeof userContext === 'object' ? userContext.usucod : (userContext || 'ADMIN');
  const actorEmpcod = typeof userContext === 'object' ? (userContext.empcod || empcod || '01') : (empcod || '01');

  // Ejecutar el Stored Procedure PA_TAL_CONTROL_PRODUCCION en FTALLER
  const spParams = {
    empcod: actorEmpcod,
    otcod: otcod.trim(),
    tiptra: finalTiptra,
    ubicod: ubicod.trim(),
    lotcod: finalLotcod,
    cantidad: finalCantidad,
    unicod_cant: unicod_cant || '001',
    valor_unitario: finalVu,
    sTraCod: finalTraCod,
    sCantidad: finalCantStr,
    sValor_Unitario: finalVuStr,
    usucod: actorUsucod,
    sTipOpe: sTipOpe || 'I'
  };

  try {
    const result = await produccionDal.ejecutarControlProduccion(spParams);
    return {
      success: true,
      data: result.recordset
    };
  } catch (err) {
    console.error('Error al ejecutar PA_TAL_CONTROL_PRODUCCION:', err.message);
    throw err;
  }
}

module.exports = {
  buscarOts,
  obtenerDetallesOt,
  obtenerLotesOt,
  listarUbicaciones,
  obtenerConfigUbicacionProducto,
  listarOperarios,
  registrarProduccion
};
