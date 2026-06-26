import React, { useState, useEffect } from 'react';
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

interface CheckoutModalProps {
  selectedPackage: Package;
  game: Game;
  onClose: () => void;
}

export default function CheckoutModal({ selectedPackage, game, onClose }: CheckoutModalProps) {
  const [step, setStep] = useState(1);

  // Form State
  const [gameUsername, setGameUsername] = useState('');
  const [gamePassword, setGamePassword] = useState('');
  const [loginMethod, setLoginMethod] = useState('Google / Gmail');
  const [repeatCount, setRepeatCount] = useState(0);

  // Payment State
  const [qrString, setQrString] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'promptpay' | 'manual_transfer'>('promptpay');
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [isFetchingQr, setIsFetchingQr] = useState(false);

  // File State
  const [slipImage, setSlipImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const repeatFee = repeatCount * 5;
  const totalPrice = Math.round(selectedPackage.price) + repeatFee;

  useEffect(() => {
    if (step === 2 && !qrString) {
      fetchQrCode();
    }
  }, [step]);

  const fetchQrCode = async () => {
    setIsFetchingQr(true);
    setError(null);
    setPaymentNotice(null);
    try {
      const baseUrl = (window as any).API_BASE_URL?.replace(/\/$/, '') || '';
      const response = await fetch(`${baseUrl}/api/payment/qr?amount=` + totalPrice, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to fetch payment details');
      const data = await response.json();

      if (typeof data === 'string') {
        setPaymentMode('promptpay');
        setQrString(data);
      } else {
        const payload = data.qrString || data.payload || data.qrCode || data.qr || '';
        setPaymentMode(data.mode === 'manual_transfer' || !payload ? 'manual_transfer' : 'promptpay');
        setQrString(payload || null);
        setPaymentNotice(data.message || null);
      }
    } catch (err: any) {
      setPaymentMode('manual_transfer');
      setQrString(null);
      setPaymentNotice('ไม่สามารถโหลด QR ได้ในตอนนี้ กรุณาโอนยอดตามจำนวนและแนบสลิปเพื่อให้แอดมินตรวจสอบ');
    } finally {
      setIsFetchingQr(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('รองรับเฉพาะไฟล์สลิป PNG, JPG หรือ WEBP');
        e.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('ไฟล์สลิปต้องไม่เกิน 5MB');
        e.target.value = '';
        return;
      }
      setError(null);
      setSlipImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('gameId', String(game.id || ''));
      formData.append('packageId', String(selectedPackage.id || ''));
      formData.append('gameUsername', gameUsername);
      formData.append('gamePassword', gamePassword);
      formData.append('loginMethod', loginMethod);
      formData.append('price', String(totalPrice));
      formData.append('repeatCount', String(repeatCount));
      if (slipImage) {
        formData.append('slipImage', slipImage);
      }

      const baseUrl = (window as any).API_BASE_URL?.replace(/\/$/, '') || '';
      const response = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to submit order. Please try again.');
      }

      const data = await response.json();
      setOrderId(data.orderId || data.data?.id || null);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error submitting order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicators = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: '100%', height: '4px', background: 'rgba(141,110,99,0.1)', zIndex: 0, borderRadius: '2px' }}></div>

      {[1, 2, 3].map((s) => {
        const isActive = step === s;
        const isPast = step > s;
        return (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.3s',
              background: isActive ? 'linear-gradient(135deg, #8f6f94, #b89ac0)' : isPast ? '#8d6e63' : '#f0e6f6',
              color: isActive || isPast ? 'white' : '#8d6e63',
              boxShadow: isActive ? '0 0 15px rgba(184,154,192,0.5)' : 'none',
              transform: isActive ? 'scale(1.1)' : 'scale(1)'
            }}>
              {isPast ? '✓' : s}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: isActive || isPast ? '#8f6f94' : '#b89ac0' }}>
              {s === 1 ? 'ข้อมูล' : s === 2 ? 'ชำระเงิน' : 'สลิป'}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: 0, position: 'relative', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(141,110,99,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#342d3b' }}>Checkout</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#8f6f94', fontWeight: 500 }}>{game.name} - {selectedPackage.name}</p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#675d72' }}>ยอดรวม {totalPrice} บาท {repeatCount > 0 ? `(กดแพ็คซ้ำ ${repeatCount} ครั้ง)` : ''}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(141,110,99,0.1)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#675d72', fontSize: '18px', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(141,110,99,0.2)'; e.currentTarget.style.color = '#342d3b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(141,110,99,0.1)'; e.currentTarget.style.color = '#675d72'; }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          {!isSuccess && renderStepIndicators()}

          {error && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(245,158,11,0.1)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', color: '#7c5b35', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {isSuccess ? (
            <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(74,222,128,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 0 30px rgba(74,222,128,0.3)', color: '#4ade80', fontSize: '40px' }}>
                ✓
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 700, color: '#342d3b' }}>สั่งซื้อสำเร็จ!</h3>
              {orderId && (
                <div style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)', color: '#166534', fontSize: '14px', fontWeight: 700 }}>
                  เลขออเดอร์: {orderId}
                </div>
              )}
              <p style={{ margin: '0 0 32px', color: '#675d72', maxWidth: '280px', lineHeight: 1.5 }}>
                ระบบได้รับคำสั่งซื้อของคุณแล้ว เรากำลังดำเนินการเติมเงินให้คุณ
              </p>
              <button
                onClick={onClose}
                className="primary-action"
                style={{ width: '100%', padding: '14px' }}
              >
                เสร็จสิ้น
              </button>
            </div>
          ) : (
            <div style={{ minHeight: '320px' }}>
              {/* Step 1: Account Info */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#4d4255' }}>ช่องทางล็อกอิน</label>
                    <select
                      value={loginMethod}
                      onChange={(e) => setLoginMethod(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(141,110,99,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', color: '#342d3b', outline: 'none' }}
                    >
                      <option value="Google / Gmail">Google / Gmail</option>
                      <option value="Username / Password">Username / Password</option>
                      <option value="Apple ID / iOS">Apple ID / iOS</option>
                      <option value="Android Account">Android Account</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#4d4255' }}>ไอดีเกม (Username / Email)</label>
                    <input
                      type="text"
                      placeholder="กรอกไอดีเกมของคุณ"
                      value={gameUsername}
                      onChange={(e) => setGameUsername(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(141,110,99,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', color: '#342d3b', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#4d4255' }}>รหัสผ่าน (Password)</label>
                    <input
                      type="password"
                      placeholder="กรอกรหัสผ่านเกมของคุณ"
                      value={gamePassword}
                      onChange={(e) => setGamePassword(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(141,110,99,0.2)', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', color: '#342d3b', outline: 'none' }}
                    />
                  </div>

                  <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(141,110,99,0.14)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#4d4255' }}>กดแพ็คซ้ำ</div>
                        <div style={{ fontSize: '12px', color: '#675d72', marginTop: '3px' }}>เพิ่มครั้งละ 5 บาท สำหรับรายการที่ต้องกดแพ็คเพิ่ม</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button type="button" className="secondary-action" style={{ width: '34px', height: '34px', padding: 0 }} onClick={() => setRepeatCount(Math.max(0, repeatCount - 1))}>-</button>
                        <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 800, color: '#4d4255' }}>{repeatCount}</span>
                        <button type="button" className="secondary-action" style={{ width: '34px', height: '34px', padding: 0 }} onClick={() => setRepeatCount(Math.min(20, repeatCount + 1))}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', color: '#675d72', fontSize: '14px' }}>ยอดที่ต้องชำระ</p>
                    <div className="price-text" style={{ fontSize: '36px' }}>
                      ฿{totalPrice}
                    </div>
                    <p style={{ margin: '6px 0 0', color: '#675d72', fontSize: '13px' }}>แพ็คหลัก {Math.round(selectedPackage.price)} บาท {repeatCount > 0 ? `+ กดแพ็คซ้ำ ${repeatFee} บาท` : ''}</p>
                  </div>

                  <div style={{ padding: '24px', background: 'white', borderRadius: '24px', boxShadow: '0 12px 40px rgba(141,110,99,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px', minWidth: '240px' }}>
                    {isFetchingQr ? (
                      <div style={{ color: '#8f6f94', fontSize: '14px', fontWeight: 500 }}>กำลังโหลด QR Code...</div>
                    ) : qrString && paymentMode === 'promptpay' ? (
                      <QRCodeSVG value={qrString} size={192} level="H" />
                    ) : (
                      <div style={{ color: '#6b4f5f', fontSize: '14px', textAlign: 'center', lineHeight: 1.6, maxWidth: '190px' }}>
                        <strong>โอนยอดตามจำนวน</strong><br />
                        แล้วแนบสลิปในขั้นถัดไป
                      </div>
                    )}
                  </div>

                  <div style={{ color: '#675d72', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: '20px' }}>
                    <span>📱</span> {paymentMode === 'promptpay' ? 'สแกนด้วยแอปธนาคารใดก็ได้' : 'โอนให้ตรงยอด แล้วอัปโหลดสลิปเพื่อยืนยัน'}
                  </div>
                  {paymentNotice && (
                    <div style={{ color: '#7c5b35', fontSize: '13px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', padding: '10px 14px', borderRadius: '14px', textAlign: 'center', lineHeight: 1.5 }}>
                      {paymentNotice}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Upload Slip */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#342d3b' }}>อัปโหลดสลิปโอนเงิน</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#675d72' }}>กรุณาแนบรูปสลิปเพื่อยืนยันการชำระเงิน</p>
                  </div>

                  <label style={{ display: 'block', width: '100%', cursor: 'pointer' }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      width: '100%', aspectRatio: '4/3', borderRadius: '20px',
                      border: slipImage ? '2px solid rgba(143,111,148,0.5)' : '2px dashed rgba(141,110,99,0.3)',
                      background: slipImage ? 'rgba(143,111,148,0.05)' : 'rgba(255,255,255,0.5)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', position: 'relative', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if (!slipImage) { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(141,110,99,0.5)'; } }}
                    onMouseLeave={e => { if (!slipImage) { e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(141,110,99,0.3)'; } }}
                    >
                      {previewUrl ? (
                        <React.Fragment>
                          <img src={previewUrl} alt="Slip Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          <div style={{ position: 'absolute', bottom: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                            เปลี่ยนรูปสลิป
                          </div>
                        </React.Fragment>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8f6f94', gap: '12px' }}>
                          <span style={{ fontSize: '32px' }}>📤</span>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>คลิกเพื่ออัปโหลดรูป</span>
                          <span style={{ fontSize: '12px', opacity: 0.7 }}>รองรับ PNG, JPG ขนาดไม่เกิน 5MB</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isSuccess && (
          <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(141,110,99,0.1)', display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.4)' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
                className="secondary-action"
                style={{ width: '56px', padding: 0 }}
              >
                {'<'}
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!gameUsername || !gamePassword)}
                className="primary-action"
                style={{ flex: 1 }}
              >
                ดำเนินการต่อ {' >'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!slipImage || isSubmitting}
                className="primary-action"
                style={{ flex: 1, position: 'relative' }}
              >
                {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันการสั่งซื้อ ✓'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
