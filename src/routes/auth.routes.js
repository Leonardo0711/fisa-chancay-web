'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const rateLimiter = require('../middleware/rate-limit');

// Public route to render login page
router.get('/login', authController.renderLogin);

// Login and Logout API endpoints (protected with rate limiter and CSRF via global middleware)
router.post('/api/auth/login', rateLimiter, authController.postLogin);
router.post('/api/auth/logout', authController.postLogout);

// Session context API endpoints
router.get('/api/auth/me', authController.getMe);
router.post('/api/auth/change-access', requireAuth, authController.postChangeAccess);
router.get('/api/auth/captcha', authController.getCaptcha);

module.exports = router;
