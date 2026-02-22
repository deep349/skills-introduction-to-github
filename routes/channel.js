'use strict';

const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/:username', (req, res) => {
  const user = db.users.findByUsername(req.params.username);
  if (!user) {
    return res.status(404).render('404', {});
  }
  const videos = db.videos.findByUserId(user.id);
  res.render('channel', { channelUser: user, videos });
});

module.exports = router;
