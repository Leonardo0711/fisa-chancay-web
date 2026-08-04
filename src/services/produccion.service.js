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
  
  // Return lotes with dynamic progress details (e.g. 4/12)
  return lotes.map((l, index) => ({
    lotcod: l.lotcod,
    avance: `${index + 1}/${lotes.length + 3}` // Mocking progress indicator e.g. 4/12
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
    console.error('Error fetching real product-location configurations, using mock fallback:', err.message);
  }
  
  // Fallbacks to mock mapping if table does not exist or has no entries for the product
  return MOCK_UBICACIONES_PRODUCTO;
}

async function listarOperarios() {
  return produccionDal.listarOperarios();
}

async function registrarProduccion(data, actor) {
  const { otcod, ubicod, lote, cantidadIngresar, vuIngresar, workers } = data;

  if (!otcod || !ubicod) {
    throw new Error('DATOS REQUERIDOS FALTANTES: SE REQUIERE OT Y UBICACIÓN');
  }

  if (!workers || !Array.isArray(workers) || workers.length === 0) {
    throw new Error('SE REQUIERE ASIGNAR AL MENOS UN OPERARIO AL REGISTRO');
  }

  // 1. Business Logic Validations
  const totalCantidad = parseFloat(cantidadIngresar || 0);
  const totalVu = parseFloat(vuIngresar || 0);

  let sumQuantities = 0;
  let sumVus = 0;

  workers.forEach(w => {
    sumQuantities += parseFloat(w.cantidad || 0);
    sumVus += parseFloat(w.vu || 0);
  });

  // Verify worker quantity limits
  if (totalCantidad > 0 && sumQuantities > totalCantidad) {
    throw new Error(`LA SUMA DE CANTIDADES DE OPERARIOS (${sumQuantities}) SUPERA LA CANTIDAD CONFIGURADA (${totalCantidad})`);
  }

  // Verify VU limits
  if (totalVu > 0 && sumVus > totalVu) {
    throw new Error(`LA SUMA DE VALORES UNITARIOS DE OPERARIOS (${sumVus}) SUPERA EL VALOR UNITARIO CONFIGURADO (${totalVu})`);
  }

  // 2. Generate a unique correlated operation number
  const nrocorrelativo = crypto.randomUUID().toUpperCase();

  // 3. Write data to log file (Transaction log on file to avoid database table creations)
  const logPayload = {
    nrocorrelativo,
    actor,
    timestamp: new Date().toISOString(),
    data: {
      otcod,
      ubicod,
      lote: lote || null,
      cantidadIngresar: totalCantidad,
      vuIngresar: totalVu,
      workers
    }
  };

  const logsDir = 'C:\\FISA\\industrial-platform\\logs';
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const logFile = path.join(logsDir, 'production-records.json');
  fs.appendFileSync(logFile, JSON.stringify(logPayload) + '\n', 'utf8');

  console.log(`[ProduccionService] Record successfully written to log file. Correlative: ${nrocorrelativo}`);

  return {
    success: true,
    nrocorrelativo
  };
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
