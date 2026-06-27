const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const db = require('../db/helpers');
const { verifyAdmin } = require('../middleware/auth');

function maskUsername(username) {
  if (!username) return '';
  const str = String(username);
  if (str.length <= 2) {
    return str[0] + '*';
  }
  if (str.length === 3) {
    return str[0] + '***' + str[2];
  }
  return str.slice(0, 2) + '***' + str.slice(-2);
}

const slipUploadDir = process.env.SLIP_UPLOAD_DIR
  || (process.env.NODE_ENV === 'production' && fs.existsSync('/app/data')
    ? '/app/data/slips'
    : path.join(process.cwd(), 'uploads', 'slips'));

function hasValidImageSignature(filePath) {
  const bytes = fs.readFileSync(filePath).subarray(0, 12);
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return png || jpeg || webp;
}

async function getSecretSetting(envName, settingKey) {
  if (process.env[envName]) return process.env[envName].trim();
  const row = await db.get('SELECT value FROM settings WHERE key = ?', [settingKey]);
  return row && row.value ? String(row.value).trim() : '';
}

async function verifySlip(file, expectedAmount) {
  const buffer = fs.readFileSync(file.path);
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

  if (process.env.NODE_ENV === 'test') {
    return { fileHash, transRef: `TEST-${crypto.randomUUID()}`, amount: expectedAmount };
  }

  const duplicateFile = await db.get('SELECT id FROM slip_checks WHERE file_hash = ?', [fileHash]);
  if (duplicateFile) {
    const error = new Error('สลิปนี้ถูกใช้งานแล้ว');
    error.statusCode = 409;
    throw error;
  }

  const apiKey = await getSecretSetting('SLIPOK_API_KEY', 'slipok_api_key');
  const branchId = await getSecretSetting('SLIPOK_BRANCH_ID', 'slipok_branch_id');
  if (!apiKey || !branchId) {
    const error = new Error('ระบบตรวจสลิปยังไม่พร้อม กรุณาติดต่อผู้ดูแล');
    error.statusCode = 503;
    error.code = 'SLIP_VERIFICATION_NOT_CONFIGURED';
    throw error;
  }

  const form = new FormData();
  form.append('files', new Blob([buffer], { type: file.mimetype }), file.originalname);
  form.append('log', 'true');
  form.append('amount', String(expectedAmount));

  let response;
  try {
    response = await fetch(`https://api.slipok.com/api/line/apikey/${encodeURIComponent(branchId)}`, {
      method: 'POST',
      headers: { 'x-authorization': apiKey },
      body: form,
      signal: AbortSignal.timeout(20000)
    });
  } catch (cause) {
    const error = new Error('เชื่อมต่อระบบตรวจสลิปไม่ได้ กรุณาลองใหม่');
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }

  const payload = await response.json().catch(() => ({}));
  const details = payload.data && payload.data.data ? payload.data.data : payload.data;
  if (!response.ok || payload.success !== true || !details || details.success === false) {
    const error = new Error(payload.message || details?.message || 'สลิปไม่ผ่านการตรวจสอบ');
    error.statusCode = response.status === 409 ? 409 : 422;
    throw error;
  }

  const amount = Number(details.amount);
  const transRef = String(details.transRef || '').trim();
  if (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.009) {
    const error = new Error(`ยอดเงินในสลิปไม่ตรง ต้องชำระ ${expectedAmount} บาท`);
    error.statusCode = 422;
    throw error;
  }
  if (!transRef) {
    const error = new Error('ไม่พบเลขอ้างอิงธุรกรรมในสลิป');
    error.statusCode = 422;
    throw error;
  }

  const duplicateTransaction = await db.get('SELECT id FROM slip_checks WHERE id = ?', [transRef]);
  if (duplicateTransaction) {
    const error = new Error('ธุรกรรมนี้ถูกใช้ยืนยันออเดอร์แล้ว');
    error.statusCode = 409;
    throw error;
  }

  return { fileHash, transRef, amount };
}

// Multer storage setup for slip images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(slipUploadDir, { recursive: true });
    cb(null, slipUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomUUID() + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    return cb(new Error('Only PNG, JPG, JPEG files are allowed!'), false);
  }
});

// Helper function to send LINE Notify
function sendLineNotify(token, message) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({ message });
    const options = {
      hostname: 'notify-api.line.me',
      path: '/api/notify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Helper function to send Telegram Notify
function sendTelegramNotify(botToken, chatId, message) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Thai status mapping
const statusThMap = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังดำเนินการ',
  completed: 'สำเร็จ',
  cancelled: 'ยกเลิก'
};

// POST /api/orders
router.post('/orders', (req, res) => {
  upload.single('slipImage')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    try {
      const { gameId, packageId, gameUsername, gamePassword, loginMethod, price } = req.body;
      if (!gameId || !packageId || !gameUsername || !gamePassword || !loginMethod || price === undefined || !req.file) {
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, error: 'All fields including slipImage are required' });
      }

      // Check if game and package exist
      const game = await db.get('SELECT id, name FROM games WHERE id = ?', [gameId]);
      const pkg = await db.get('SELECT id, name, price FROM packages WHERE id = ?', [packageId]);
      if (!game || !pkg) {
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({ success: false, error: 'Game or Package not found' });
      }

      const orderId = 'ORD-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const slipUrl = `/uploads/slips/${req.file.filename}`;

      const finalPrice = parseFloat(pkg.price);

      if (!hasValidImageSignature(req.file.path)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ success: false, error: 'ไฟล์ที่แนบไม่ใช่รูปสลิปที่รองรับ' });
      }

      let verification;
      try {
        verification = await verifySlip(req.file, finalPrice);
      } catch (verificationError) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        return res.status(verificationError.statusCode || 422).json({
          success: false,
          code: verificationError.code || 'SLIP_VERIFICATION_FAILED',
          error: verificationError.message || 'สลิปไม่ผ่านการตรวจสอบ'
        });
      }

      await db.run('BEGIN IMMEDIATE TRANSACTION');
      try {
        await db.run(
          `INSERT INTO slip_checks (id, file_hash, expected_amount, file_ext, status, note, slip_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [verification.transRef, verification.fileHash, finalPrice, path.extname(req.file.originalname).toLowerCase(), 'verified', 'SlipOK verified', slipUrl]
        );
        await db.run(
          `INSERT INTO orders (id, game_id, package_id, game_username, game_password, login_method, price, slip_image, slip_verified, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, gameId, packageId, gameUsername, gamePassword, loginMethod, finalPrice, slipUrl, 1, 'pending']
        );
        await db.run('COMMIT');
      } catch (transactionError) {
        await db.run('ROLLBACK').catch(() => {});
        throw transactionError;
      }

      const lineToken = process.env.LINE_NOTIFY_TOKEN || process.env.line_notify_token;
      if (lineToken) {
        const message = `\n📦 ออเดอร์ใหม่เข้า!\nเกม: ${game.name}\nแพ็กเกจ: ${pkg.name}\nราคา: ${finalPrice} บาท\nสถานะ: รอดำเนินการ`;
        sendLineNotify(lineToken, message).catch(e => console.error('LINE Notify error:', e.message));
      }
      
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN || process.env.telegram_bot_token;
      const telegramChatId = process.env.TELEGRAM_CHAT_ID || process.env.telegram_chat_id;
      if (telegramToken && telegramChatId) {
        const message = `<b>📦 ออเดอร์ใหม่เข้า!</b>\n\n<b>เกม:</b> ${game.name}\n<b>แพ็กเกจ:</b> ${pkg.name}\n<b>ราคา:</b> ${finalPrice} บาท\n<b>สถานะ:</b> รอดำเนินการ\n<b>Order ID:</b> <code>${orderId}</code>`;
        sendTelegramNotify(telegramToken, telegramChatId, message).catch(e => console.error('Telegram Notify error:', e.message));
      }

      return res.status(201).json({ success: true, orderId, paymentVerified: true, status: 'pending', message: 'Payment verified and order created' });
    } catch (error) {
      console.error('Create order error:', error);
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });
});

// GET /api/orders
router.get('/orders', verifyAdmin, async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
    const result = [];
    for (const o of orders) {
      const game = await db.get('SELECT name FROM games WHERE id = ?', [o.game_id]);
      const pkg = await db.get('SELECT name FROM packages WHERE id = ?', [o.package_id]);
      result.push({
        id: o.id,
        gameName: game ? game.name : 'Unknown Game',
        packageName: pkg ? pkg.name : 'Unknown Package',
        username: o.game_username,
        password: o.game_password,
        loginMethod: o.login_method,
        price: o.price,
        status: o.status,
        slipImage: o.slip_image,
        createdAt: o.created_at
      });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/admin-orders
router.get('/admin-orders', verifyAdmin, async (req, res) => {
  try {
    const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
    const result = [];
    for (const o of orders) {
      const game = await db.get('SELECT name FROM games WHERE id = ?', [o.game_id]);
      const pkg = await db.get('SELECT name FROM packages WHERE id = ?', [o.package_id]);
      result.push({
        id: o.id,
        gameName: game ? game.name : 'Unknown Game',
        packageName: pkg ? pkg.name : 'Unknown Package',
        username: o.game_username,
        password: o.game_password,
        loginMethod: o.login_method,
        price: o.price,
        status: o.status,
        slipImage: o.slip_image,
        createdAt: o.created_at
      });
    }
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Get admin-orders error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// PUT /api/orders/:orderId/status
router.put('/orders/:orderId/status', verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const status = req.body.status || req.query.status;

    if (!status || !statusThMap[status]) {
      return res.status(400).json({ success: false, error: 'Invalid or missing status' });
    }

    const order = await db.get('SELECT id FROM orders WHERE id = ?', [orderId]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    await db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, orderId]);

    const lineToken = process.env.LINE_NOTIFY_TOKEN || process.env.line_notify_token;
    if (lineToken) {
      const statusTh = statusThMap[status];
      const message = `\n🔔 อัปเดตสถานะออเดอร์!\nออเดอร์: ${orderId}\nสถานะใหม่: ${statusTh}`;
      sendLineNotify(lineToken, message).catch(e => console.error('LINE Notify error:', e.message));
    }

    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || process.env.telegram_bot_token;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || process.env.telegram_chat_id;
    if (telegramToken && telegramChatId) {
      const statusTh = statusThMap[status];
      const message = `<b>🔔 อัปเดตสถานะออเดอร์!</b>\n\n<b>ออเดอร์:</b> <code>${orderId}</code>\n<b>สถานะใหม่:</b> ${statusTh}`;
      sendTelegramNotify(telegramToken, telegramChatId, message).catch(e => console.error('Telegram Notify error:', e.message));
    }

    return res.status(200).json({ success: true, message: `Order status updated to ${status}` });
  } catch (error) {
    console.error('Update order status error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// GET /api/orders/track
router.get('/orders/track', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const game = await db.get('SELECT name FROM games WHERE id = ?', [order.game_id]);
    const pkg = await db.get('SELECT name FROM packages WHERE id = ?', [order.package_id]);

    return res.status(200).json({
      success: true,
      data: {
        id: order.id,
        gameName: game ? game.name : 'Unknown Game',
        packageName: pkg ? pkg.name : 'Unknown Package',
        username: maskUsername(order.game_username),
        loginMethod: order.login_method,
        price: order.price,
        status: order.status,
        slipImage: order.slip_image,
        createdAt: order.created_at
      }
    });
  } catch (error) {
    console.error('Track order error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// POST /api/orders/verify-slip
router.post('/orders/verify-slip', verifyAdmin, (req, res) => {
  upload.single('slipImage')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    if (!hasValidImageSignature(req.file.path)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid image signature' });
    }
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }
    try {
      const result = await verifySlip(req.file, amount);
      fs.unlinkSync(req.file.path);
      return res.status(200).json({ success: true, paymentVerified: true, transRef: result.transRef, amount: result.amount });
    } catch (verificationError) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(verificationError.statusCode || 422).json({ success: false, error: verificationError.message });
    }
  });
});

module.exports = router;
