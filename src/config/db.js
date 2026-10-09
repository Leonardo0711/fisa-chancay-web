'use strict';

const sql = require('mssql');
const env = require('./env');

const config = {
  server: env.DB_SERVER,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
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
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
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
 * Executes a SQL query with optional input parameters.
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
