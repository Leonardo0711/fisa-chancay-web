'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from specific file path if defined
const envFile = process.env.ENV_FILE;
if (envFile && fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  // Try default local .env file
  const localEnv = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
  } else {
    // Try default staging secrets path
    const defaultStgEnv = 'C:\\FISA\\industrial-platform\\secrets\\staging\\chancay-web.env';
    if (fs.existsSync(defaultStgEnv)) {
      dotenv.config({ path: defaultStgEnv });
    }
  }
}

module.exports = {
  APP_ENV: process.env.APP_ENV || 'development',
  APP_NAME: process.env.APP_NAME || 'chancay-web',
  PORT: parseInt(process.env.PORT || '6093', 10),
  HOST: process.env.HOST || '127.0.0.1',

  DB_SERVER: process.env.DB_SERVER,
  DB_NAME: process.env.DB_NAME || 'FTALLER',
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_ENCRYPT: process.env.DB_ENCRYPT === 'true',
  DB_TRUST_SERVER_CERTIFICATE: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',

  ESOLVER_DB_SERVER: process.env.ESOLVER_DB_SERVER,
  ESOLVER_DB_NAME: process.env.ESOLVER_DB_NAME || 'eSolver',
  ESOLVER_DB_USER: process.env.ESOLVER_DB_USER,
  ESOLVER_DB_PASSWORD: process.env.ESOLVER_DB_PASSWORD,
  ESOLVER_DB_ENCRYPT: process.env.ESOLVER_DB_ENCRYPT === 'true',
  ESOLVER_DB_TRUST_SERVER_CERTIFICATE: process.env.ESOLVER_DB_TRUST_SERVER_CERTIFICATE === 'true',
  ESOLVER_DB_PORT: parseInt(process.env.ESOLVER_DB_PORT || '1433', 10),

  SESSION_SECRET: process.env.SESSION_SECRET || 'chancay_default_secret_keys',
  COOKIE_NAME: process.env.COOKIE_NAME || 'chancay_session',
  SESSION_TTL_HOURS: parseInt(process.env.SESSION_TTL_HOURS || '12', 10),
  SESSION_REMEMBER_DAYS: parseInt(process.env.SESSION_REMEMBER_DAYS || '7', 10),

  CAPTCHA_ENABLED: process.env.CAPTCHA_ENABLED !== 'false',
  BOOTSTRAP_SEED: process.env.BOOTSTRAP_SEED === 'true'
};
