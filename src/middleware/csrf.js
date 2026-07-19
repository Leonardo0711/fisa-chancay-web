'use strict';

const crypto = require('crypto');

/**
 * Middleware that handles CSRF token generation and validation.
 */
function csrfMiddleware(req, res, next) {
  if (!req.session) {
    return next();
  }

  // Generate token if it doesn't exist for the current session
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }

  // Expose token to EJS templates
  res.locals.csrfToken = req.session.csrfToken;

  // Validate CSRF on mutative methods
  const mutativeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutativeMethods.includes(req.method)) {
    const token = req.headers['x-csrf-token'] || (req.body && req.body._csrf);
    
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'Token CSRF inválido o ausente' });
    }
  }

  next();
}

module.exports = csrfMiddleware;
