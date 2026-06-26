import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Package {
  id?: string | number;
  name: string;
  price: number;
  [key: string]: any;
}

interface Game {
  id?: string | number;
  name: string;
  [key: string]: any;
}

interface BankTransferInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  note?: string;
}

interface CheckoutModalProps {
  selectedPackage: Package;
  game: Game;
  onClose: () => void;
}

const DEFAULT_BANK_TRANSFER: BankTransferInfo = {
  bankName: 'ธนาคารกสิกรไทย',
  accountNumber: '1341058186',
  accountName: 'ชัยแสงเพชร ธนวุฒิกีรติพร',
  note: 'บัญชีแทน',
};

const loginOptions = [
  'Google / Gmail',
  'Facebook',
  'Username / Password',
  'Apple ID / iOS',
  'Android Account',
];

const normalizePaymentNotice = (message?: string | null) => {
  if (!message) return null;
  if (message.includes('PromptPay is not configured')) {
    return 'ยังไม่ได้ตั้งค่า PromptPay ระบบจะแสดงบัญชีธนาคารสำหรับโอนยอดตรงและอัปโหลดสลิปแทน';
  }
  return message;
};

export default function CheckoutModal({ selectedPackage, game, onClose }: CheckoutModalProps) {
  const [step, setStep] = useState(1);
  const [gameUsername, setGameUsername] = useState('');
  const [gamePassword, setGamePassword] = useState('');
  const [loginMethod, setLoginMethod] = useState('Google / Gmail');
  const [customerContact, setCustomerContact] = useState('');
  const [backupCodes, setBackupCodes] = useState('');
  const [repeatCount, setRepeatCount] = useState(0);

  const [qrString, setQrString] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'promptpay' | 'manual_transfer'>('promptpay');
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [bankTransfer, setBankTransfer] = useState<BankTransferInfo>(DEFAULT_BANK_TRANSFER);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [isFetchingQr, setIsFetchingQr] = useState(false);

  const [slipImage, setSlipImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repeatFee = repeatCount * 5;
  const totalPrice = Math.round(Number(selectedPackage.price || 0)) + repeatFee;
  const needsBackupCode = loginMethod.toLowerCase().includes('google') || loginMethod.toLowerCase().includes('gmail');

  useEffect(() => {
    if (step === 2) {
      fetchQrCode();
    }
  }, [step, totalPrice]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fetchQrCode = async () => {
    setIsFetchingQr(true);
    setError(null);
    setPaymentNotice(null);
    try {
      const baseUrl = (window as any).API_BASE_URL?.replace(/\/$/, '') || '';
      const response = await fetch(`${baseUrl}/api/payment/qr?amount=${encodeURIComponent(totalPrice)}`, { method: 'POST' });
      if (!response.ok) throw new Error('โหลดข้อมูลชำระเงินไม่สำเร็จ');
      const data = await response.json();
      const payload = typeof data === 'string' ? data : data.qrString || data.payload || data.qrCode || data.qr || '';

      setPaymentMode(typeof data !== 'string' && (data.mode === 'manual_transfer' || !payload) ? 'manual_transfer' : 'promptpay');
      setQrString(payload || null);
      setPaymentNotice(typeof data === 'string' ? null : normalizePaymentNotice(data.message));
      if (typeof data !== 'string' && data.bankTransfer) {
        setBankTransfer({ ...DEFAULT_BANK_TRANSFER, ...data.bankTransfer });
      }
    } catch {
      setPaymentMode('manual_transfer');
      setQrString(null);
      setBankTransfer(DEFAULT_BANK_TRANSFER);
      setPaymentNotice('โหลด QR ไม่สำเร็จ สามารถโอนเข้าบัญชีด้านล่างและแนบสลิปเพื่อยืนยันได้');
    } finally {
      setIsFetchingQr(false);
    }
  };

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(bankTransfer.accountNumber.replace(/\D/g, '') || bankTransfer.accountNumber);
      setCopiedAccount(true);
      window.setTimeout(() => setCopiedAccount(false), 1800);
    } catch {
      setPaymentNotice('คัดลอกเลขบัญชีไม่สำเร็จ กรุณาคัดลอกจากหน้าจอโดยตรง');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('รองรับเฉพาะรูปสลิป PNG, JPG หรือ WEBP');
      e.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('ไฟล์สลิปต้องไม่เกิน 3MB เพื่อให้ระบบตรวจได้เร็ว');
      e.target.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError(null);
    setSlipImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const buildCustomerNote = (slipNote?: string) =>
    [
      `Login method: ${loginMethod}`,
      `Account: ${gameUsername}`,
      `Password: ${gamePassword}`,
      customerContact ? `Customer contact/email: ${customerContact}` : '',
      needsBackupCode
        ? `Google 2FA backup codes: ${backupCodes.trim() || 'ลูกค้าไม่ได้กรอกรหัสสำรอง ต้องติดต่อเพื่อกดยืนยัน'}`
        : '2FA: ไม่ต้องใช้ backup code ตามช่องทางล็อกอินที่เลือก',
      repeatCount > 0 ? `Repeat package: ${repeatCount} x 5 THB` : '',
      slipNote ? `Slip check: ${slipNote}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  const handleSubmit = async () => {
    if (!slipImage) {
      setError('กรุณาแนบรูปสลิปก่อนยืนยันการสั่งซื้อ');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const baseUrl = (window as any).API_BASE_URL?.replace(/\/$/, '') || '';
      const formData = new FormData();
      formData.append('gameId', String(game.id || ''));
      formData.append('packageId', String(selectedPackage.id || ''));
      formData.append('gameUsername', gameUsername.trim());
      formData.append('gamePassword', gamePassword);
      formData.append('loginMethod', loginMethod);
      formData.append('price', String(totalPrice));
      formData.append('repeatCount', String(repeatCount));
      formData.append('customerContact', customerContact.trim());
      formData.append('backupCodes', backupCodes.trim());
      formData.append('customerNote', buildCustomerNote());
      formData.append('slipImage', slipImage);

      const orderResponse = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        body: formData,
      });
      const orderData = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok || orderData.success === false) {
        throw new Error(orderData.error || 'สร้างออเดอร์ไม่สำเร็จ กรุณาลองใหม่');
      }

      setOrderId(orderData.data?.orderId || orderData.orderId || orderData.data?.id || null);
      setIsSuccess(true);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'ส่งคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canGoNext = step !== 1 || (gameUsername.trim() && gamePassword.trim());

  const renderStepIndicators = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '100%', height: 4, background: 'rgba(141,110,99,0.1)', borderRadius: 2 }} />
      {[1, 2, 3].map((s) => {
        const isActive = step === s;
        const isPast = step > s;
        return (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              background: isActive ? 'linear-gradient(135deg, #8f6f94, #b89ac0)' : isPast ? '#8d6e63' : '#f0e6f6',
              color: isActive || isPast ? 'white' : '#8d6e63',
              boxShadow: isActive ? '0 0 15px rgba(184,154,192,0.5)' : 'none',
            }}>
              {isPast ? '✓' : s}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: isActive || isPast ? '#8f6f94' : '#b89ac0' }}>
              {s === 1 ? 'ข้อมูล' : s === 2 ? 'ชำระเงิน' : 'สลิป'}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 0, position: 'relative', borderRadius: 24, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(141,110,99,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg, rgba(255,255,255,0.68) 0%, transparent 100%)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#342d3b' }}>Checkout</h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#8f6f94', fontWeight: 600 }}>{game.name} - {selectedPackage.name}</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#675d72' }}>ยอดรวม {totalPrice} บาท {repeatCount > 0 ? `(กดแพ็คซ้ำ ${repeatCount} ครั้ง)` : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(141,110,99,0.1)', border: 'none', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', color: '#675d72', fontSize: 18 }}>
            &times;
          </button>
        </div>

        <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
          {!isSuccess && renderStepIndicators()}

          {error && (
            <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(239,68,68,0.09)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.22)', color: '#991b1b', fontSize: 14, lineHeight: 1.45 }}>
              ⚠ {error}
            </div>
          )}

          {isSuccess ? (
            <div style={{ padding: '34px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 78, height: 78, background: 'rgba(74,222,128,0.18)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, color: '#16a34a', fontSize: 38 }}>✓</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: '#342d3b' }}>สั่งซื้อสำเร็จ</h3>
              {orderId && (
                <div style={{ margin: '6px 0 16px', padding: '10px 14px', borderRadius: 12, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)', color: '#166534', fontSize: 14, fontWeight: 800 }}>
                  เลขออเดอร์: {orderId}
                </div>
              )}
              <p style={{ margin: '0 0 24px', color: '#675d72', maxWidth: 330, lineHeight: 1.55 }}>
                ระบบบันทึกคำสั่งซื้อและสลิปแล้ว กรุณาเก็บเลขออเดอร์ไว้ใช้ติดตามสถานะหรือแจ้งแอดมิน
              </p>
              <button onClick={onClose} className="primary-action" style={{ width: '100%', padding: 14 }}>
                เสร็จสิ้น
              </button>
            </div>
          ) : (
            <div style={{ minHeight: 320 }}>
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <label style={{ display: 'grid', gap: 8, fontSize: 14, fontWeight: 700, color: '#4d4255' }}>
                    ช่องทางล็อกอิน
                    <select value={loginMethod} onChange={(e) => setLoginMethod(e.target.value)} style={inputStyle}>
                      {loginOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>

                  <label style={{ display: 'grid', gap: 8, fontSize: 14, fontWeight: 700, color: '#4d4255' }}>
                    ไอดีเกม / Email ลูกค้า
                    <input type="text" placeholder="เช่น Gmail, username หรือ email ที่ใช้ล็อกอินเกม" value={gameUsername} onChange={(e) => setGameUsername(e.target.value)} style={inputStyle} />
                  </label>

                  <label style={{ display: 'grid', gap: 8, fontSize: 14, fontWeight: 700, color: '#4d4255' }}>
                    รหัสผ่าน
                    <input type="password" placeholder="รหัสผ่านของบัญชีเกม" value={gamePassword} onChange={(e) => setGamePassword(e.target.value)} style={inputStyle} />
                  </label>

                  <label style={{ display: 'grid', gap: 8, fontSize: 14, fontWeight: 700, color: '#4d4255' }}>
                    ช่องทางติดต่อกลับ
                    <input type="text" placeholder="Facebook / LINE / Telegram / เบอร์ / Email" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} style={inputStyle} />
                  </label>

                  {needsBackupCode && (
                    <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.62)', border: '1px solid rgba(141,110,99,0.16)' }}>
                      <label style={{ display: 'grid', gap: 8, fontSize: 14, fontWeight: 800, color: '#4d4255' }}>
                        รหัสสำรอง Google 2FA
                        <textarea
                          placeholder="ใส่ backup code 8 หลัก 1-3 รหัส คั่นด้วยเว้นวรรคหรือจุลภาค เพื่อลดการรอกด Yes/No"
                          value={backupCodes}
                          onChange={(e) => setBackupCodes(e.target.value)}
                          style={{ ...inputStyle, minHeight: 76, resize: 'vertical' }}
                        />
                      </label>
                      <p style={{ margin: '8px 0 0', color: '#7c5b35', fontSize: 12, lineHeight: 1.45 }}>
                        ถ้าไม่มีรหัสสำรอง แอดมินอาจต้องติดต่อให้ลูกค้ากดยืนยัน 2FA ตอนดำเนินงาน
                      </p>
                    </div>
                  )}

                  <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(141,110,99,0.14)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#4d4255' }}>กดแพ็คซ้ำ</div>
                        <div style={{ fontSize: 12, color: '#675d72', marginTop: 3 }}>เพิ่มครั้งละ 5 บาท สำหรับรายการที่ต้องกดแพ็คเพิ่ม</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button type="button" className="secondary-action" style={{ width: 34, height: 34, padding: 0 }} onClick={() => setRepeatCount(Math.max(0, repeatCount - 1))}>-</button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 900, color: '#4d4255' }}>{repeatCount}</span>
                        <button type="button" className="secondary-action" style={{ width: 34, height: 34, padding: 0 }} onClick={() => setRepeatCount(Math.min(20, repeatCount + 1))}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', color: '#675d72', fontSize: 14 }}>ยอดที่ต้องชำระ</p>
                    <div className="price-text" style={{ fontSize: 36 }}>฿{totalPrice}</div>
                    <p style={{ margin: '6px 0 0', color: '#675d72', fontSize: 13 }}>โอนให้ตรงยอดเพื่อให้ตรวจสลิปง่ายที่สุด</p>
                  </div>

                  <div style={{ padding: 24, background: 'white', borderRadius: 24, boxShadow: '0 12px 40px rgba(141,110,99,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240, minWidth: 240 }}>
                    {isFetchingQr ? (
                      <div style={{ color: '#8f6f94', fontSize: 14, fontWeight: 700 }}>กำลังโหลดข้อมูลชำระเงิน...</div>
                    ) : qrString && paymentMode === 'promptpay' ? (
                      <QRCodeSVG value={qrString} size={192} level="H" />
                    ) : (
                      <div style={{ color: '#4d4255', fontSize: 13, textAlign: 'left', lineHeight: 1.55, width: '100%', maxWidth: 235 }}>
                        <div style={{ textAlign: 'center', fontWeight: 900, color: '#342d3b', fontSize: 15, marginBottom: 12 }}>โอนเข้าบัญชีธนาคาร</div>
                        <InfoLine label="ธนาคาร" value={bankTransfer.bankName} />
                        <div style={{ marginTop: 8 }}>
                          <div style={miniLabel}>เลขบัญชี</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 900, letterSpacing: '0.02em', fontSize: 17 }}>{bankTransfer.accountNumber}</span>
                            <button type="button" onClick={copyAccountNumber} style={pillButtonStyle}>
                              {copiedAccount ? 'คัดลอกแล้ว' : 'คัดลอก'}
                            </button>
                          </div>
                        </div>
                        <InfoLine label="ชื่อบัญชี" value={bankTransfer.accountName} note={bankTransfer.note} />
                        <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', color: '#7c5b35', fontSize: 12, fontWeight: 800, textAlign: 'center' }}>
                          โอนยอด ฿{totalPrice} แล้วอัปโหลดสลิปขั้นถัดไป
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ color: '#675d72', fontSize: 14, background: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 20 }}>
                    {paymentMode === 'promptpay' ? 'สแกนด้วยแอปธนาคารใดก็ได้' : 'โอนให้ตรงยอด แล้วอัปโหลดสลิปเพื่อยืนยัน'}
                  </div>
                  {paymentNotice && (
                    <div style={{ color: '#7c5b35', fontSize: 13, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', padding: '10px 14px', borderRadius: 14, textAlign: 'center', lineHeight: 1.5 }}>
                      {paymentNotice}
                    </div>
                  )}
                </div>
              )}

              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#342d3b' }}>อัปโหลดสลิปโอนเงิน</h3>
                    <p style={{ margin: 0, fontSize: 14, color: '#675d72' }}>ระบบจะตรวจว่าเป็นรูปสลิปจริง กันไฟล์ซ้ำ และส่งให้แอดมินยืนยันยอด</p>
                  </div>

                  <label style={{ display: 'block', width: '100%', cursor: 'pointer' }}>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} style={{ display: 'none' }} />
                    <div style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      borderRadius: 20,
                      border: slipImage ? '2px solid rgba(143,111,148,0.5)' : '2px dashed rgba(141,110,99,0.3)',
                      background: slipImage ? 'rgba(143,111,148,0.05)' : 'rgba(255,255,255,0.5)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}>
                      {previewUrl ? (
                        <>
                          <img src={previewUrl} alt="Slip Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <div style={{ position: 'absolute', bottom: 16, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '6px 16px', borderRadius: 100, fontSize: 12, fontWeight: 700 }}>
                            เปลี่ยนรูปสลิป
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8f6f94', gap: 12 }}>
                          <span style={{ fontSize: 32 }}>📤</span>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>คลิกเพื่ออัปโหลดรูป</span>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>รองรับ PNG, JPG, WEBP ขนาดไม่เกิน 3MB</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {!isSuccess && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(141,110,99,0.1)', display: 'flex', gap: 12, background: 'rgba(255,255,255,0.4)' }}>
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} disabled={isSubmitting} className="secondary-action" style={{ width: 56, padding: 0 }}>{'<'}</button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canGoNext || isFetchingQr} className="primary-action" style={{ flex: 1 }}>
                ดำเนินการต่อ {'>'}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={!slipImage || isSubmitting} className="primary-action" style={{ flex: 1 }}>
                {isSubmitting ? 'กำลังตรวจสลิปและสร้างออเดอร์...' : 'ยืนยันการชำระเงิน ✓'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.72)',
  border: '1px solid rgba(141,110,99,0.2)',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 15,
  color: '#342d3b',
  outline: 'none',
};

const miniLabel: React.CSSProperties = {
  color: '#8f6f94',
  fontSize: 11,
  fontWeight: 800,
};

const pillButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(141,110,99,0.2)',
  background: 'rgba(143,111,148,0.08)',
  color: '#6b4f5f',
  borderRadius: 999,
  padding: '5px 9px',
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function InfoLine({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={miniLabel}>{label}</div>
      <div style={{ fontWeight: 850 }}>{value}</div>
      {note && <div style={{ color: '#675d72', fontSize: 12 }}>{note}</div>}
    </div>
  );
}
