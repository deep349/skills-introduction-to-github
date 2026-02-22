'use strict';

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.flash('error', 'Please log in to continue.');
  res.redirect('/auth/login');
}

function redirectIfAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

module.exports = { requireAuth, redirectIfAuth };
