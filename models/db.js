'use strict';

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data.json');

const defaultData = {
  users: [],
  videos: [],
  comments: [],
  likes: []
};

function load() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(collection) {
  if (collection.length === 0) return 1;
  return collection.reduce((max, item) => item.id > max ? item.id : max, 0) + 1;
}

// User operations
const users = {
  create(username, email, hashedPassword) {
    const data = load();
    const user = {
      id: nextId(data.users),
      username,
      email,
      password: hashedPassword,
      avatar: null,
      createdAt: new Date().toISOString()
    };
    data.users.push(user);
    save(data);
    return user;
  },
  findByEmail(email) {
    const data = load();
    return data.users.find(u => u.email === email) || null;
  },
  findByUsername(username) {
    const data = load();
    return data.users.find(u => u.username === username) || null;
  },
  findById(id) {
    const data = load();
    return data.users.find(u => u.id === id) || null;
  }
};

// Video operations
const videos = {
  create({ title, description, filename, thumbnail, userId }) {
    const data = load();
    const video = {
      id: nextId(data.videos),
      title,
      description,
      filename,
      thumbnail: thumbnail || null,
      userId,
      views: 0,
      createdAt: new Date().toISOString()
    };
    data.videos.push(video);
    save(data);
    return video;
  },
  findAll(search) {
    const data = load();
    let vids = [...data.videos].reverse();
    if (search) {
      const q = search.toLowerCase();
      vids = vids.filter(v =>
        v.title.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q))
      );
    }
    return vids.map(v => ({
      ...v,
      user: data.users.find(u => u.id === v.userId) || { username: 'Unknown' },
      likesCount: data.likes.filter(l => l.videoId === v.id && l.type === 'like').length,
      dislikesCount: data.likes.filter(l => l.videoId === v.id && l.type === 'dislike').length
    }));
  },
  findById(id) {
    const data = load();
    const video = data.videos.find(v => v.id === id) || null;
    if (!video) return null;
    return {
      ...video,
      user: data.users.find(u => u.id === video.userId) || { username: 'Unknown' },
      likesCount: data.likes.filter(l => l.videoId === id && l.type === 'like').length,
      dislikesCount: data.likes.filter(l => l.videoId === id && l.type === 'dislike').length,
      comments: data.comments
        .filter(c => c.videoId === id)
        .map(c => ({
          ...c,
          user: data.users.find(u => u.id === c.userId) || { username: 'Unknown' }
        }))
        .reverse()
    };
  },
  findByUserId(userId) {
    const data = load();
    return data.videos
      .filter(v => v.userId === userId)
      .reverse()
      .map(v => ({
        ...v,
        likesCount: data.likes.filter(l => l.videoId === v.id && l.type === 'like').length
      }));
  },
  incrementViews(id) {
    const data = load();
    const video = data.videos.find(v => v.id === id);
    if (video) {
      video.views = (video.views || 0) + 1;
      save(data);
    }
  }
};

// Comment operations
const comments = {
  create({ videoId, userId, text }) {
    const data = load();
    const comment = {
      id: nextId(data.comments),
      videoId,
      userId,
      text,
      createdAt: new Date().toISOString()
    };
    data.comments.push(comment);
    save(data);
    return comment;
  }
};

// Like operations
const likes = {
  toggle(videoId, userId, type) {
    const data = load();
    const existing = data.likes.find(l => l.videoId === videoId && l.userId === userId);
    if (existing) {
      if (existing.type === type) {
        data.likes = data.likes.filter(l => !(l.videoId === videoId && l.userId === userId));
      } else {
        existing.type = type;
      }
    } else {
      data.likes.push({ videoId, userId, type });
    }
    save(data);
    return {
      likesCount: data.likes.filter(l => l.videoId === videoId && l.type === 'like').length,
      dislikesCount: data.likes.filter(l => l.videoId === videoId && l.type === 'dislike').length,
      userAction: data.likes.find(l => l.videoId === videoId && l.userId === userId)?.type || null
    };
  },
  getUserAction(videoId, userId) {
    const data = load();
    return data.likes.find(l => l.videoId === videoId && l.userId === userId)?.type || null;
  }
};

module.exports = { users, videos, comments, likes };
