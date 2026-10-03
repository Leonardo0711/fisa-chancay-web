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

async function obtenerLotesOt(otcod, ubicod) {
  if (!otcod) return [];

  // 1. Obtener detalles de la OT para conocer canreq (total presupuestado)
  const otDetails = await produccionDal.obtenerDetallesOt(otcod);
  const canreq = otDetails && otDetails.canreq ? parseInt(otDetails.canreq, 10) : 0;

  // 2. Obtener los lotes pendientes desde eSolver
  const rawLotes = await produccionDal.obtenerLotesOt(otcod);
  if (!rawLotes || rawLotes.length === 0) return [];

  // 3. Consultar todos los lotes ya registrados de la OT en TAL_CONTROL_PRODUCCION para conocer la serie completa
  const todosLotesProducidosOt = await produccionDal.obtenerLotesProducidosDeOt(otcod).catch(() => []);

  // 4. Juntar todos los códigos únicos (eSolver + ya producidos) para tener la serie completa de la OT sin duplicar
  const todosLosCodigos = Array.from(new Set([
    ...rawLotes.map(l => String(l.lotcod).trim()),
    ...todosLotesProducidosOt.map(l => String(l).trim())
  ]));

  // Total de lotes de la OT (fijo en canreq si existe, o cantidad total de códigos únicos conocidos)
  const totalLotes = Math.max(canreq || 0, todosLosCodigos.length);

  const todosLosNumeros = todosLosCodigos
    .map(lot => {
      const match = lot.match(/(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null);

  // 5. Calcular el punto de partida (startNum) en base a la serie completa de la OT
  let startNum = null;
  if (todosLosNumeros.length > 0) {
    const minNum = Math.min(...todosLosNumeros);
    const maxNum = Math.max(...todosLosNumeros);
    if (todosLosCodigos.length >= totalLotes) {
      startNum = minNum;
    } else {
      startNum = maxNum - totalLotes + 1;
      if (startNum > minNum) {
        startNum = minNum;
      }
    }
  }

  // 6. Consultar avance de costuras ya registradas por lote para esta ubicación
  let costurasMap = {};
  if (ubicod && String(ubicod).trim()) {
    costurasMap = await produccionDal.obtenerAvanceCosturasLotes(otcod, ubicod).catch(() => ({}));
  }

  // 7. Retornar TODOS los lotes de la OT (sin excluir los ya registrados), cada uno con su posición y costuras previas
  return rawLotes.map((l, idx) => {
    const lot = String(l.lotcod).trim();
    const match = lot.match(/(\d+)$/);
    const num = match ? parseInt(match[1], 10) : null;

    let lotNumber;
    if (num !== null && startNum !== null) {
      lotNumber = num - startNum + 1;
    } else {
      lotNumber = idx + 1;
    }
    return {
      lotcod: lot,
      num: lotNumber,
      total: totalLotes,
      avance: `${lotNumber}/${totalLotes}`,
      costurasRegistradas: costurasMap[lot] || 0
    };
  });
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
    finalCantStr = workers.map(w => String(w.costuraNum || w.cantidad || 1).trim()).join('|');
    finalVuStr = workers.map(w => String(finalTiptra === 'J' ? '0' : Number(w.vu !== undefined ? w.vu : (w.valor_unitario || 0)).toFixed(2)).trim()).join('|');
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

async function listarRegistros(options) {
  return produccionDal.listarRegistrosProduccion(options);
}

async function obtenerDetalleRegistro(cpcod) {
  return produccionDal.obtenerDetalleRegistroProduccion(cpcod);
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function generarReporteCsv() {
  const rows = await produccionDal.obtenerRegistrosCompletosParaExportar();

  const headers = [
    'N° Control',
    'Fecha / Hora',
    'Orden de Trabajo',
    'Lote',
    'Tipo de Trabajo',
    'Código Ubicación',
    'Ubicación',
    'Cant. Total Cabecera',
    'VU Cabecera',
    'Tarifa Cabecera',
    'S/ Cabecera',
    'Usuario Registro',
    'Ítem Operario',
    'Código Operario',
    'Nombre del Trabajador',
    'Cantidad Operario (#)',
    'VU Operario',
    'Tarifa Operario',
    'Total Operario (S/)'
  ];

  const lines = [];
  // UTF-8 BOM
  lines.push('\uFEFF' + headers.map(escapeCsvField).join(';'));

  for (const r of rows) {
    const fecha = r.fecusucre ? new Date(r.fecusucre).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : '';
    const line = [
      escapeCsvField(r.cpcod),
      escapeCsvField(fecha),
      escapeCsvField(r.otcod),
      escapeCsvField(r.lotcod),
      escapeCsvField(r.tiptraDesc),
      escapeCsvField(r.ubicod),
      escapeCsvField(r.ubinom),
      escapeCsvField(r.cantidadCabecera !== null ? Number(r.cantidadCabecera).toFixed(4) : ''),
      escapeCsvField(r.vuCabecera !== null ? Number(r.vuCabecera).toFixed(4) : ''),
      escapeCsvField(r.tarifaCabecera !== null ? Number(r.tarifaCabecera).toFixed(4) : ''),
      escapeCsvField(r.solesCabecera !== null ? Number(r.solesCabecera).toFixed(4) : ''),
      escapeCsvField(r.codusucre),
      escapeCsvField(r.cpnum !== null ? r.cpnum : ''),
      escapeCsvField(r.tracod),
      escapeCsvField(r.traraz),
      escapeCsvField(r.cantidadOperario !== null ? Number(r.cantidadOperario).toFixed(4) : ''),
      escapeCsvField(r.vuOperario !== null ? Number(r.vuOperario).toFixed(4) : ''),
      escapeCsvField(r.tarifa !== null ? Number(r.tarifa).toFixed(4) : ''),
      escapeCsvField(r.subtotal !== null ? Number(r.subtotal).toFixed(4) : '')
    ].join(';');
    lines.push(line);
  }

  return lines.join('\r\n');
}

module.exports = {
  buscarOts,
  obtenerDetallesOt,
  obtenerLotesOt,
  listarUbicaciones,
  obtenerConfigUbicacionProducto,
  listarOperarios,
  registrarProduccion,
  listarRegistros,
  obtenerDetalleRegistro,
  generarReporteCsv
};
