'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.usucod) {
    // Prevent browser caching of protected views
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Normalize data into req.user for easy downstream access
    req.user = {
      usucod: req.session.usucod.trim(),
      usunom: req.session.usunom,
      usuadm: !!req.session.usuadm,
      empcod: req.session.empcod ? req.session.empcod.trim().toUpperCase() : null,
      talcod: req.session.talcod ? req.session.talcod.trim().toUpperCase() : null,
      permisos: req.session.permisos || {}
    };
    return next();
  }

  // If it's an API request, return 401
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Sesión no iniciada' });
  }

  // If it's a page request, redirect to login
  return res.redirect((res.locals.baseUrl || '/') + 'login');
}

module.exports = {
  requireAuth
};
