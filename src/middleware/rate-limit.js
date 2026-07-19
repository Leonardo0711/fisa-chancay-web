'use strict';

const loginAttempts = {};

// Cleanup old entries every 10 minutes to prevent memory leaks
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const ip in loginAttempts) {
    if (now - loginAttempts[ip].resetTime > 60000) {
      delete loginAttempts[ip];
    }
  }
}, 600000);
if (cleanup.unref) {
  cleanup.unref();
}

/**
 * Custom rate limiter middleware.
 * Limits requests to 5 attempts per minute per IP.
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const now = Date.now();

  if (!loginAttempts[ip]) {
    loginAttempts[ip] = {
      count: 1,
      resetTime: now + 60000 // 1 minute window
    };
    return next();
  }

  const attempt = loginAttempts[ip];

  if (now > attempt.resetTime) {
    attempt.count = 1;
    attempt.resetTime = now + 60000;
    return next();
  }

  attempt.count++;

  if (attempt.count > 5) {
    return res.status(429).json({
      error: 'DEMASIADOS INTENTOS. ESPERE 1 MINUTO E INTENTE NUEVAMENTE.'
    });
  }

  next();
}

module.exports = rateLimiter;
