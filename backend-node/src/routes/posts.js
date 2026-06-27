const express = require('express');
const router = express.Router();
const db = require('../db/helpers');

// GET /api/posts
router.get('/posts', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM posts WHERE is_active = 1 ORDER BY created_at DESC');
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get active posts error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
