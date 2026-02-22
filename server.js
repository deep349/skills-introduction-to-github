'use strict';

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const crypto = require('crypto');
const db = require('./models/db');
const { csrfMiddleware } = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// View engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax'
  }
}));
app.use(flash());
app.use(csrfMiddleware);

// Make user available to all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? db.users.findById(req.session.userId)
    : null;
  next();
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/videos', require('./routes/videos'));
app.use('/channel', require('./routes/channel'));

// Home page
app.get('/', (req, res) => {
  const search = req.query.q || '';
  const videos = db.videos.findAll(search || undefined);
  res.render('index', { videos, search, success: req.flash('success') });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {});
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: err.message });
});

app.listen(PORT, () => {
  console.log(`YouTube Clone running at http://localhost:${PORT}`);
});

module.exports = app;
