'use strict';

const actionMap = {
  view: 'flgcon',
  save: 'flggra',
  annul: 'flganu',
  delete: 'flgeli',
  print: 'flgimp'
};

/**
 * Middleware factory to check user permissions for a specific module and action.
 * Must be mounted after requireAuth middleware.
 * @param {string} procod - The program/module code (e.g. 'USUARIOS').
 * @param {string} action - The action type ('view', 'save', 'annul', 'delete', 'print').
 */
function requirePermission(procod, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sesión no iniciada' });
    }

    // General administrator bypasses all permission checks
    if (req.user.usuadm) {
      return next();
    }

    const permissionField = actionMap[action];
    if (!permissionField) {
      return res.status(500).json({ error: `Acción no soportada: ${action}` });
    }

    const userPermissions = req.user.permisos || {};
    const programCode = procod.trim().toUpperCase();
    const programPermissions = userPermissions[programCode] || {};

    if (programPermissions[permissionField] === true) {
      return next();
    }

    // For API requests, return 403 Forbidden JSON
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Sin privilegios para realizar esta acción' });
    }

    // For UI page requests, render permission error page
    return res.status(403).render('error', {
      title: 'Acceso Denegado',
      message: 'No cuenta con los permisos necesarios para acceder a este módulo o realizar esta acción.'
    });
  };
}

module.exports = {
  requirePermission
};
