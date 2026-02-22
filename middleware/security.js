'use strict';

const crypto = require('crypto');

/**
 * Generates a CSRF token for the session and validates it on state-changing requests.
 */
function csrfMiddleware(req, res, next) {
  // Generate token if not present
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  // Validate on mutating methods (skip JSON API like/dislike which uses session auth)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (!safeMethods.includes(req.method)) {
    const bodyToken = req.body && req.body._csrf;
    const headerToken = req.headers['x-csrf-token'];
    const token = bodyToken || headerToken;
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('error', { message: 'Invalid CSRF token. Please go back and try again.' });
    }
  }
  next();
}

/**
 * Simple in-memory rate limiter factory.
 */
function createRateLimiter({ windowMs = 60000, max = 10, keyFn } = {}) {
  const map = new Map();
  return function rateLimiter(req, res, next) {
    const key = keyFn ? keyFn(req) : (req.session && req.session.userId) || req.ip;
    const now = Date.now();
    const requests = (map.get(key) || []).filter(t => now - t < windowMs);
    if (requests.length >= max) {
      if (req.accepts('html')) {
        req.flash('error', 'Too many requests. Please wait a moment and try again.');
        return res.redirect('back');
      }
      return res.status(429).json({ error: 'Too many requests' });
    }
    requests.push(now);
    map.set(key, requests);
    next();
  };
}

module.exports = { csrfMiddleware, createRateLimiter };
