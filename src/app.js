'use strict';

const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');

const env = require('./config/env');
const SqlSessionStore = require('./services/session-store.service');
const csrfMiddleware = require('./middleware/csrf');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      upgradeInsecureRequests: null
    }
  }
}));

// 2. Strict CORS Configuration
app.use(cors({
  origin: env.HOST === '127.0.0.1' ? `http://127.0.0.1:${env.PORT}` : true,
  credentials: true
}));

// 6. Static File Server (Placed early to avoid database session lookup for assets)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 3. Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(env.SESSION_SECRET));

// 4. Session Persistence with Custom SQL Server Store
app.use(session({
  name: env.COOKIE_NAME,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new SqlSessionStore(),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.APP_ENV === 'production', // true for production, false for staging
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000
  }
}));

// 5. Template Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 7. Global CSRF Token Middleware
app.use(csrfMiddleware);

// Middleware to inject session data to EJS rendering context
app.use((req, res, next) => {
  let baseUrl = '/';
  const originalUrlHeader = req.headers['x-original-url'];
  if (originalUrlHeader) {
    const parsedOriginal = originalUrlHeader.split('?')[0];
    const parsedCurrent = req.path;
    if (parsedOriginal.endsWith(parsedCurrent)) {
      baseUrl = parsedOriginal.slice(0, parsedOriginal.length - parsedCurrent.length);
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
      }
    } else {
      if (parsedOriginal.includes('/_staging/chancay-web')) {
        baseUrl = '/_staging/chancay-web/';
      } else if (parsedOriginal.includes('/_staging/chancay')) {
        baseUrl = '/_staging/chancay/';
      }
    }
  } else if (env.APP_ENV === 'staging') {
    const host = req.headers.host || '';
    if (host.includes('127.0.0.1') || host.includes('localhost')) {
      baseUrl = '/';
    } else {
      baseUrl = '/_staging/chancay-web/';
    }
  }
  res.locals.baseUrl = baseUrl;

  res.locals.session = req.session;
  res.locals.user = req.session && req.session.usucod ? {
    usucod: req.session.usucod,
    usunom: req.session.usunom,
    usuadm: req.session.usuadm,
    empcod: req.session.empcod,
    talcod: req.session.talcod,
    permisos: req.session.permisos
  } : null;
  next();
});

// 8. Application Routes
app.use(routes);

// 9. Error Handler Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
