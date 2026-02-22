'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../models/db');
const { redirectIfAuth } = require('../middleware/auth');

router.get('/login', redirectIfAuth, (req, res) => {
  res.render('auth/login', { error: req.flash('error'), success: req.flash('success') });
});

router.post('/login', redirectIfAuth, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/login');
  }
  const user = db.users.findByEmail(email);
  if (!user) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    req.flash('error', 'Invalid email or password.');
    return res.redirect('/auth/login');
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/');
});

router.get('/register', redirectIfAuth, (req, res) => {
  res.render('auth/register', { error: req.flash('error') });
});

router.post('/register', redirectIfAuth, async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  if (!username || !email || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/auth/register');
  }
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/auth/register');
  }
  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    return res.redirect('/auth/register');
  }
  if (db.users.findByEmail(email)) {
    req.flash('error', 'Email is already registered.');
    return res.redirect('/auth/register');
  }
  if (db.users.findByUsername(username)) {
    req.flash('error', 'Username is already taken.');
    return res.redirect('/auth/register');
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = db.users.create(username, email, hashed);
  req.session.userId = user.id;
  req.session.username = user.username;
  req.flash('success', 'Account created successfully!');
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
