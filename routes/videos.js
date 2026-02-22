'use strict';

const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const db = require('../models/db');
const { requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/security');

const uploadLimiter = createRateLimiter({ windowMs: 60000, max: 10 });
const UPLOAD_BASE = path.join(__dirname, '..', 'public', 'uploads');

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, path.join(__dirname, '..', 'public', 'uploads', 'videos'));
    } else {
      cb(null, path.join(__dirname, '..', 'public', 'uploads', 'thumbnails'));
    }
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed.'));
      }
    } else if (file.fieldname === 'thumbnail') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed for thumbnail.'));
      }
    }
    cb(null, true);
  }
});

// Upload form
router.get('/upload', requireAuth, uploadLimiter, (req, res) => {
  res.render('videos/upload', { error: req.flash('error') });
});

// Handle upload
router.post(
  '/upload',
  requireAuth,
  uploadLimiter,
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  (req, res) => {
    const { title, description } = req.body;
    if (!title) {
      req.flash('error', 'Title is required.');
      return res.redirect('/videos/upload');
    }
    if (!req.files || !req.files.video) {
      req.flash('error', 'Please select a video file.');
      return res.redirect('/videos/upload');
    }
    const filename = req.files.video[0].filename;
    const thumbnail = req.files.thumbnail ? req.files.thumbnail[0].filename : null;
    try {
      const video = db.videos.create({
        title,
        description,
        filename,
        thumbnail,
        userId: req.session.userId
      });
      res.redirect(`/videos/${video.id}`);
    } catch (err) {
      // Clean up uploaded files if DB operation fails
      try { fs.unlinkSync(path.join(UPLOAD_BASE, 'videos', filename)); } catch (_) {}
      if (thumbnail) {
        try { fs.unlinkSync(path.join(UPLOAD_BASE, 'thumbnails', thumbnail)); } catch (_) {}
      }
      req.flash('error', 'Failed to save video. Please try again.');
      res.redirect('/videos/upload');
    }
  }
);

// View a video
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const video = db.videos.findById(id);
  if (!video) {
    return res.status(404).render('404', {});
  }
  db.videos.incrementViews(id);
  const userAction = req.session.userId
    ? db.likes.getUserAction(id, req.session.userId)
    : null;
  const related = db.videos.findAll().filter(v => v.id !== id).slice(0, 8);
  res.render('videos/watch', { video, userAction, related, error: req.flash('error'), success: req.flash('success') });
});

// Post a comment
router.post('/:id/comment', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { text } = req.body;
  if (!text || !text.trim()) {
    req.flash('error', 'Comment cannot be empty.');
    return res.redirect(`/videos/${id}`);
  }
  db.comments.create({ videoId: id, userId: req.session.userId, text: text.trim() });
  res.redirect(`/videos/${id}`);
});

// Like/dislike (JSON API)
router.post('/:id/like', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { type } = req.body;
  if (!['like', 'dislike'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }
  const result = db.likes.toggle(id, req.session.userId, type);
  res.json(result);
});

module.exports = router;
