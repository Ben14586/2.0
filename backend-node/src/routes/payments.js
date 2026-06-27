const express = require('express');
const router = express.Router();

// CRC16-CCITT implementation matching python helper
function crc16Ccitt(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= (byte << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Generate PromptPay EMVCo string payload
function generatePayload(promptpayId, amount = 0.0) {
  let payload = amount > 0 ? "000201010212" : "000201010211";

  // 29: Merchant Account Information
  // 00: AID (A000000677010111)
  let merchantInfo = "0016A000000677010111";

  const sanitizedId = promptpayId.replace(/-/g, "").replace(/ /g, "");
  if (sanitizedId.length === 10) { // Phone number
    const formattedPhone = "0066" + sanitizedId.substring(1);
    const lenStr = formattedPhone.length.toString().padStart(2, '0');
    merchantInfo += `01${lenStr}${formattedPhone}`;
  } else { // Citizen ID or E-Wallet (13-15 digits)
    const lenStr = sanitizedId.length.toString().padStart(2, '0');
    merchantInfo += `02${lenStr}${sanitizedId}`;
  }

  const merchantInfoLenStr = merchantInfo.length.toString().padStart(2, '0');
  payload += `29${merchantInfoLenStr}${merchantInfo}`;

  // 58: Country Code (TH)
  payload += "5802TH";

  // 53: Currency Code (764 for THB)
  payload += "5303764";

  // 54: Transaction Amount
  if (amount > 0) {
    const amtStr = Number(amount).toFixed(2);
    const amtLenStr = amtStr.length.toString().padStart(2, '0');
    payload += `54${amtLenStr}${amtStr}`;
  }

  // 63: CRC (Checksum) appended at the end
  payload += "6304";

  const crc = crc16Ccitt(payload);
  return payload + crc;
}

// POST /api/promptpay/generate
router.post('/promptpay/generate', (req, res) => {
  try {
    const { promptpay_id, amount } = req.body;
    if (!promptpay_id) {
      return res.status(400).json({ success: false, error: 'promptpay_id is required' });
    }

    const payload = generatePayload(promptpay_id, parseFloat(amount || 0));
    return res.status(200).json({ success: true, payload });
  } catch (error) {
    console.error('Generate PromptPay error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/payment/qr
router.post('/payment/qr', (req, res) => {
  try {
    const amountStr = req.query.amount || req.body.amount;
    const amount = parseFloat(amountStr || 0);
    const ppId = process.env.PROMPTPAY_ID || '0812345678';

    const payload = generatePayload(ppId, amount);
    return res.status(200).json({ success: true, payload });
  } catch (error) {
    console.error('Generate payment QR error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
