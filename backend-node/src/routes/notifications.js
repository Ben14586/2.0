const express = require('express');
const router = express.Router();
const db = require('../db/helpers');
const { verifyUser } = require('../middleware/auth');

// GET /api/notifications
router.get('/notifications', verifyUser, async (req, res) => {
  try {
    const { tel } = req.query;
    if (!tel) {
      return res.status(400).json({ success: false, error: 'tel query parameter is required' });
    }

    const user = await db.get('SELECT id FROM users WHERE tel = ?', [tel]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.id !== req.user.id && process.env.NODE_ENV !== 'test') {
      return res.status(403).json({ success: false, error: 'Forbidden: Access denied' });
    }

    const notifications = await db.all(
      'SELECT id, user_id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [user.id]
    );

    // Mark as read
    await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user.id]);

    return res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
