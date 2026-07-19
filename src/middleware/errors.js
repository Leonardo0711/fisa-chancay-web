'use strict';

const env = require('../config/env');

/**
 * Handle 404 Route Not Found.
 */
function notFound(req, res, next) {
  res.status(404);
  const err = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  next(err);
}

/**
 * Global Error Handler.
 * Logs full technical details on server but hides sensitive information from users.
 */
function errorHandler(err, req, res, next) {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log detailed technical message and stack trace on the server
  console.error(`[ErrorHandler] ${req.method} ${req.originalUrl} - Status: ${statusCode} - Error: ${err.message}`, err.stack);
  
  res.status(statusCode);

  const isApi = req.xhr || req.path.startsWith('/api/');
  const userMessage = err.userMessage || 'HA OCURRIDO UN ERROR INTERNO EN EL SERVIDOR. REVISE EL ESTADO DEL SISTEMA.';

  if (isApi) {
    return res.json({
      error: userMessage,
      details: env.APP_ENV === 'development' ? err.message : undefined
    });
  }

  return res.render('error', {
    title: 'Error del Sistema',
    message: userMessage,
    error: env.APP_ENV === 'development' ? err : null
  });
}

module.exports = {
  notFound,
  errorHandler
};
