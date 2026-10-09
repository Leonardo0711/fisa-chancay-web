'use strict';

const sql = require('mssql');
const env = require('./env');

const config = {
  server: env.ESOLVER_DB_SERVER,
  port: env.ESOLVER_DB_PORT,
  database: env.ESOLVER_DB_NAME,
  user: env.ESOLVER_DB_USER,
  password: env.ESOLVER_DB_PASSWORD,
  options: {
    encrypt: env.ESOLVER_DB_ENCRYPT,
    trustServerCertificate: env.ESOLVER_DB_TRUST_SERVER_CERTIFICATE,
    useUTC: false
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function connect() {
  if (pool && pool.connected) return pool;
  try {
    // Instantiate a separate ConnectionPool to avoid conflicts with the global mssql pool
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    return pool;
  } catch (err) {
    pool = null;
    throw err;
  }
}

async function close() {
  if (pool) {
    try {
      await pool.close();
    } catch (err) {
      // Ignore errors on close
    }
    pool = null;
  }
}

/**
 * Executes a SQL query with optional input parameters on the eSolver server (.222).
 * @param {string} sqlText - The SQL query text.
 * @param {Object} [params] - Params object { paramName: value } or { paramName: { type, value } }
 * @returns {Promise<Object>} The query result.
 */
async function query(sqlText, params = {}) {
  const p = await connect();
  const req = p.request();
  
  for (const [key, val] of Object.entries(params)) {
    if (val && typeof val === 'object' && 'type' in val && 'value' in val) {
      req.input(key, val.type, val.value);
    } else {
      req.input(key, val);
    }
  }
  
  return req.query(sqlText);
}

module.exports = {
  sql,
  connect,
  close,
  query,
  getPool: () => pool
};
