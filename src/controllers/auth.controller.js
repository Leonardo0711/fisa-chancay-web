'use strict';

const authService = require('../services/auth.service');
const captchaService = require('../services/captcha.service');
const env = require('../config/env');

/**
 * Renders the login page with a newly generated captcha.
 */
function renderLogin(req, res) {
  if (req.session && req.session.usucod) {
    return res.redirect((res.locals.baseUrl || '/') + 'home');
  }
  const captcha = captchaService.generateCaptcha(req);
  res.render('login', {
    title: 'Iniciar Sesión - FISA',
    captchaQuestion: captcha.question,
    captchaEnabled: captcha.enabled
  });
}

/**
 * Handles credentials check and math captcha validation.
 */
async function postLogin(req, res, next) {
  try {
    const { usucod, usucla, captcha, remember } = req.body;

    if (!usucod || !usucla) {
      return res.status(400).json({ error: 'USUARIO Y CLAVE SON REQUERIDOS' });
    }

    // 1. Math Captcha validation
    if (env.CAPTCHA_ENABLED) {
      if (!captcha) {
        return res.status(400).json({ error: 'CAPTCHA ES REQUERIDO' });
      }
      const isCaptchaValid = captchaService.validateCaptcha(req, captcha);
      if (!isCaptchaValid) {
        // Regenerate captcha for the next attempt
        captchaService.generateCaptcha(req);
        return res.status(400).json({ error: 'CAPTCHA INCORRECTO' });
      }
    }

    // 2. Perform authentication login logic
    const authResult = await authService.login(usucod, usucla, req);

    // 3. Configure cookie session maximum age
    if (remember === 'true' || remember === 'on' || remember === true) {
      req.session.cookie.maxAge = env.SESSION_REMEMBER_DAYS * 24 * 60 * 60 * 1000;
    } else {
      req.session.cookie.maxAge = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
    }

    req.session.save((err) => {
      if (err) return next(err);
      return res.json({
        success: true,
        message: 'INGRESO CORRECTO',
        redirect: '/home'
      });
    });

  } catch (err) {
    // Regenerate captcha on failure for the next request
    captchaService.generateCaptcha(req);
    
    const errMsg = err.message === 'EL USUARIO NO TIENE ACCESOS ASIGNADOS ACTIVOS'
      ? err.message 
      : 'USUARIO O CLAVE INCORRECTOS';
      
    return res.status(400).json({ error: errMsg });
  }
}

/**
 * Clears the session and cookie upon user sign-out.
 */
async function postLogout(req, res, next) {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return next(err);
      }
      res.clearCookie(env.COOKIE_NAME);
      return res.json({ success: true, redirect: '/login' });
    });
  } else {
    return res.json({ success: true, redirect: '/login' });
  }
}

/**
 * Handles switching active company/workshop context.
 */
async function postChangeAccess(req, res, next) {
  try {
    const { empcod, talcod } = req.body;
    if (!empcod || !talcod) {
      return res.status(400).json({ error: 'EMPRESA Y TALLER SON REQUERIDOS' });
    }

    await authService.changeActiveAccess(empcod, talcod, req);
    return res.json({ success: true, message: 'CONTEXTO DE TALLER ACTUALIZADO' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * JSON Endpoint to get a new math captcha.
 */
function getCaptcha(req, res) {
  const captcha = captchaService.generateCaptcha(req);
  return res.json({ question: captcha.question });
}

const accesosDal = require('../dal/accesos.dal');

/**
 * JSON Endpoint to retrieve current session context.
 */
async function getMe(req, res, next) {
  try {
    if (req.session && req.session.usucod) {
      const accesses = await accesosDal.listarAccesos({ usucod: req.session.usucod, accstd: true });
      return res.json({
        usucod: req.session.usucod,
        usunom: req.session.usunom,
        usuadm: req.session.usuadm,
        empcod: req.session.empcod,
        talcod: req.session.talcod,
        accesses: accesses
      });
    }
    return res.status(401).json({ error: 'No autenticado' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  renderLogin,
  postLogin,
  postLogout,
  postChangeAccess,
  getCaptcha,
  getMe
};
