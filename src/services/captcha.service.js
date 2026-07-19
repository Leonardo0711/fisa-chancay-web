'use strict';

const env = require('../config/env');

/**
 * Generates an SVG string containing distorted alphanumeric characters with background noise.
 * @returns {Object} Object with text and its visual SVG representation.
 */
function generateAlphanumericCaptcha() {
  // Exclude easily confused characters like 0, O, 1, I, l
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const width = 160;
  const height = 44;
  
  // Background line noise
  let lines = '';
  const lineCount = 5;
  for (let i = 0; i < lineCount; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const color = ['#2E618E', '#487397', '#FF422A', '#D7E3EE', '#5B6E86'][Math.floor(Math.random() * 5)];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${Math.random() * 1.5 + 0.8}" opacity="0.65"/>`;
  }
  
  // Background dot noise
  let dots = '';
  const dotCount = 35;
  for (let i = 0; i < dotCount; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = Math.random() * 1.5 + 0.5;
    const color = ['#2E618E', '#FF422A', '#5B6E86'][Math.floor(Math.random() * 3)];
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="0.5"/>`;
  }
  
  // Distorted text characters
  let charElements = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const fontSize = Math.floor(Math.random() * 4) + 24; // 24px to 27px
    const angle = Math.floor(Math.random() * 32) - 16; // -16 to 16 degrees rotation
    const x = 12 + i * (width - 24) / 4.5;
    const y = 31 + (Math.random() * 4 - 2); // Centered vertically with slight jitter
    
    // Choose brand color or neutral color
    const colors = ['#0E3A66', '#2E618E', '#102033', '#FF422A'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    charElements += `<text x="${x}" y="${y}" font-family="Outfit, Inter, sans-serif" font-weight="900" font-size="${fontSize}" fill="${color}" transform="rotate(${angle}, ${x}, ${y})">${char}</text>`;
  }
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: #FAFDFF; display: block; max-width: 100%; height: auto; user-select: none;">
    ${lines}
    ${dots}
    ${charElements}
  </svg>`;
  
  return { text, svg };
}

/**
 * Generates an alphanumeric captcha and stores the answer in session.
 * @param {Object} req - Express request object.
 * @returns {Object} Captcha details.
 */
function generateCaptcha(req) {
  if (!env.CAPTCHA_ENABLED) {
    return { enabled: false };
  }
  
  const { text, svg } = generateAlphanumericCaptcha();
  
  if (!req.session) {
    req.session = {};
  }
  
  req.session.captchaAnswer = text;
  req.session.captchaQuestion = svg;
  
  return {
    enabled: true,
    question: svg
  };
}

/**
 * Validates the user's captcha input against the stored alphanumeric answer.
 * Always invalidates the old captcha after the attempt.
 * @param {Object} req - Express request object.
 * @param {string} userInput - The user's input.
 * @returns {boolean} True if correct, false otherwise.
 */
function validateCaptcha(req, userInput) {
  if (!env.CAPTCHA_ENABLED) {
    return true;
  }
  
  if (!req.session || req.session.captchaAnswer === undefined) {
    return false;
  }
  
  const expected = String(req.session.captchaAnswer).trim().toLowerCase();
  const actual = String(userInput || '').trim().toLowerCase();
  
  // Always invalidate the current captcha immediately after validation
  delete req.session.captchaAnswer;
  delete req.session.captchaQuestion;
  
  return expected === actual;
}

module.exports = {
  generateCaptcha,
  validateCaptcha
};
