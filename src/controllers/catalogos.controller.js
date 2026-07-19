'use strict';

const catalogosDal = require('../dal/catalogos.dal');

/**
 * Returns JSON array of active companies.
 */
async function getEmpresas(req, res, next) {
  try {
    const list = await catalogosDal.listarEmpresas(true);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * Returns JSON array of active workshops.
 */
async function getTalleres(req, res, next) {
  try {
    const list = await catalogosDal.listarTalleres(true);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * Returns JSON array of active workshops in a company.
 */
async function getTalleresPorEmpresa(req, res, next) {
  try {
    const { empcod } = req.params;
    const list = await catalogosDal.listarTalleresPorEmpresa(empcod, true);
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmpresas,
  getTalleres,
  getTalleresPorEmpresa,
  getUsuariosActivos,
  getProgramasActivos
};

/**
 * Returns JSON array of active users.
 */
async function getUsuariosActivos(req, res, next) {
  try {
    const list = await catalogosDal.listarUsuariosActivos();
    return res.json(list);
  } catch (err) {
    next(err);
  }
}

/**
 * Returns JSON array of active programs.
 */
async function getProgramasActivos(req, res, next) {
  try {
    const list = await catalogosDal.listarProgramasActivos();
    return res.json(list);
  } catch (err) {
    next(err);
  }
}
