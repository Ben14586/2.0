const express = require('express');
const router = express.Router();
const https = require('https');
const db = require('../db/helpers');
const { verifyAdmin } = require('../middleware/auth');

// GET /api/admin-settings
router.get('/admin-settings', verifyAdmin, async (req, res) => {
  try {
    const rows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-settings
router.post('/admin-settings', verifyAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings format. Key "settings" object required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
        [key, String(value), String(value)]
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/admin-test-telegram
router.post('/admin-test-telegram', verifyAdmin, async (req, res) => {
  try {
    const tokenRow = await db.get("SELECT value FROM settings WHERE key = 'telegram_bot_token'");
    const chatRow = await db.get("SELECT value FROM settings WHERE key = 'telegram_chat_id'");

    const token = tokenRow ? tokenRow.value.trim() : '';
    const chatId = chatRow ? chatRow.value.trim() : '';

    if (!token || !chatId) {
      return res.status(200).json({ success: false, error: 'Token or Chat ID missing' });
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text: '✅ <b>ทดสอบระบบ</b>\nการเชื่อมต่อ Telegram Bot สำเร็จแล้ว!',
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 5000
    };

    const request = https.request(options, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        if (response.statusCode === 200) {
          return res.status(200).json({ success: true, telegram: true });
        } else {
          return res.status(200).json({ success: false, error: body });
        }
      });
    });

    request.on('error', (e) => {
      return res.status(200).json({ success: false, error: e.message });
    });

    request.on('timeout', () => {
      request.destroy();
      return res.status(200).json({ success: false, error: 'Request timeout' });
    });

    request.write(payload);
    request.end();
  } catch (error) {
    console.error('Test telegram error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

module.exports = router;
