import React, { useState, useRef } from 'react';
import { Game, Package } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { QrCode, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderModalProps {
  game: Game;
  onClose: () => void;
}

export function OrderModal({ game, onClose }: OrderModalProps) {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [platform, setPlatform] = useState('iOS');
  const [loginType, setLoginType] = useState('Gmail');
  const [accountId, setAccountId] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  const [slipImageBase64, setSlipImageBase64] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifiedAmount, setVerifiedAmount] = useState(0);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDiscountedPrice = (price: number) => {
    if (!user) return price;
    let discount = 0;
    switch (user.vip_level) {
      case 'Silver': discount = 0.02; break;
      case 'Gold': discount = 0.05; break;
      case 'Platinum': discount = 0.08; break;
      case 'Diamond': discount = 0.10; break;
      case 'Challenger': discount = 0.15; break;
      default: discount = 0;
    }
    return Math.max(0, price - (price * discount));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipImageBase64(reader.result as string);
        setVerifySuccess(false);
        setVerifyError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifySlip = async () => {
    if (!slipImageBase64 || !selectedPackage) return;
    
    setIsVerifying(true);
    setVerifyError('');
    
    const finalPrice = getDiscountedPrice(selectedPackage.price);
    
    try {
      const res = await fetch('/api/orders/verify-slip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: slipImageBase64,
          price: finalPrice
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setVerifySuccess(true);
        setVerifiedAmount(data.amount);
      } else {
        setVerifyError(data.detail || 'สลิปไม่ถูกต้อง');
      }
    } catch (err) {
      setVerifyError('การตรวจสอบสลิปขัดข้อง กรุณาลองใหม่');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPackage || !verifySuccess) {
      alert('กรุณาตรวจสอบสลิปให้ผ่านก่อนทำรายการ');
      return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('game_id', game.id);
    formData.append('package_id', selectedPackage.id);
    formData.append('platform', platform);
    const formattedNote = `[${loginType}]
ID/Email: ${accountId}
Pass: ${accountPassword}
${backupCode ? 'Backup Code: ' + backupCode : ''}
เพิ่มเติม: ${customerNote}`.trim();
    
    formData.append('customer_note', formattedNote);
    
    // We send a dummy blob since the slip was already verified via base64,
    // but the legacy order creation expects a multipart slip file.
    const byteString = atob(slipImageBase64!.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], {type: 'image/jpeg'});
    formData.append('slip', blob, 'slip.jpg');
    
    if (user) {
      formData.append('username', user.username);
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      
      if (result.success) {
        setOrderId(result.data.order_id);
        setSubmitSuccess(true);
      } else {
        alert(result.error || 'เกิดข้อผิดพลาดในการสั่งซื้อ');
      }
    } catch (error) {
      alert('การเชื่อมต่อมีปัญหา กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
          <CheckCircle size={64} color="#4caf50" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#4caf50', marginBottom: '16px' }}>สั่งซื้อสำเร็จ!</h2>
          <p>หมายเลขออเดอร์ของคุณคือ:</p>
          <h1 style={{ fontSize: '32px', margin: '12px 0', background: 'linear-gradient(90deg, #5a4c62, #8f6f94)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{orderId}</h1>
          <p className="muted" style={{ marginBottom: '24px' }}>คุณจะได้รับการแจ้งเตือนเมื่อการเติมเงินเสร็จสิ้น</p>
          <button className="primary-action" onClick={onClose} style={{ width: '100%' }}>ปิดหน้าต่าง</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6d6077' }}
        >
          &times;
        </button>
        
        <h2>สั่งซื้อแพ็กเกจสำหรับ {game.name}</h2>
        <p className="muted" style={{ marginBottom: '16px' }}>{game.description}</p>

        {/* Screenshots & Video Gallery */}
        {((game as any).screenshots?.length > 0 || (game as any).videoUrl) && (
          <div style={{ marginBottom: '24px' }}>
            {/* Video */}
            {(game as any).videoUrl && (
              <div style={{ marginBottom: '12px' }}>
                {(game as any).videoUrl.includes('youtube') ? (
                  <iframe 
                    width="100%" 
                    height="280" 
                    src={`https://www.youtube.com/embed/${(game as any).videoUrl.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || ''}`}
                    style={{ borderRadius: '12px', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video 
                    src={(game as any).videoUrl} 
                    controls 
                    style={{ width: '100%', borderRadius: '12px', maxHeight: '280px' }}
                    poster={(game as any).screenshots?.[0] || ''}
                  />
                )}
              </div>
            )}
            
            {/* Screenshots */}
            {(game as any).screenshots?.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {(game as any).screenshots.map((url: string, i: number) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt={`${game.name} screenshot ${i + 1}`} 
                    style={{ 
                      height: '120px', 
                      borderRadius: '8px', 
                      objectFit: 'cover', 
                      flexShrink: 0,
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'border-color 0.2s ease, transform 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8d6e63'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedPackage ? (
          <div>
            <h3 style={{ marginBottom: '16px' }}>เลือกแพ็กเกจ</h3>
            <div className="package-grid">
              {game.packages.map(pkg => {
                const finalPrice = getDiscountedPrice(pkg.price);
                const hasDiscount = finalPrice < pkg.price;
                return (
                  <div key={pkg.id} className="glass-card" style={{ padding: '16px', border: pkg.is_recommended ? '2px solid #8d6e63' : '1px solid rgba(141,110,99,0.18)', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelectedPackage(pkg)}>
                    {pkg.badge && <span className="risk-pill" style={{ marginBottom: '8px' }}>{pkg.badge}</span>}
                    <h3>{pkg.name}</h3>
                    <div style={{ margin: '8px 0' }}>
                      {hasDiscount && <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '14px', marginRight: '8px' }}>{pkg.price}฿</span>}
                      <span className="price-text" style={{ fontSize: '20px', color: hasDiscount ? '#e53935' : 'inherit' }}>{finalPrice} บาท</span>
                    </div>
                    <p className="muted" style={{ fontSize: '13px' }}>{pkg.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
            <div className="order-box">
              <h3 style={{ marginBottom: '16px' }}>ข้อมูลสำหรับสั่งซื้อ</h3>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span className="muted">ระบบมือถือ</span>
                <select className="select-field" value={platform} onChange={e => setPlatform(e.target.value)}>
                  {((game as any).supportedIos !== false && game.supported_ios !== 0) && <option value="iOS">iOS</option>}
                  {((game as any).supportedAndroid !== false && game.supported_android !== 0) && <option value="Android">Android</option>}
                </select>
              </label>
              
              <h3 style={{ marginBottom: '16px', marginTop: '16px' }}>ข้อมูลสำหรับล็อกอินเข้าเกม</h3>
              
              <div style={{ padding: '12px', background: 'rgba(255, 193, 7, 0.1)', borderLeft: '3px solid #ffc107', borderRadius: '4px', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#ffd54f' }}>
                  ⚠️ <b>หมายเหตุสำคัญก่อนสั่งซื้อ:</b> กรุณาเล่นเกมจนจบบทสอน (Tutorial) หรือเล่นจนกว่าจะปลดล็อคระบบ "ร้านค้า" ภายในเกม เพื่อให้แอดมินสามารถเข้าไปเติมแพ็กเกจให้คุณได้
                </p>
              </div>

              <label style={{ display: 'block', marginBottom: '12px' }}>
                <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ประเภทการล็อกอิน <span style={{ fontSize: '12px', color: 'var(--accent)' }}>(เลือกตามที่คุณใช้ล็อกอินเข้าเกม)</span>
                </span>
                <select className="select-field" value={loginType} onChange={e => setLoginType(e.target.value)}>
                  <option value="Gmail">Gmail (Google)</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Twitter">X (Twitter)</option>
                  <option value="ID/Password">ID / Password ทั่วไป</option>
                  <option value="UID">ใช้แค่ UID (ไม่ใช้รหัสผ่าน)</option>
                </select>
              </label>

              {loginType !== 'UID' && (
                <>
                  <label style={{ display: 'block', marginBottom: '12px' }}>
                    <span className="muted">อีเมล / ไอดี ({loginType})</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={accountId} 
                      onChange={e => setAccountId(e.target.value)}
                      placeholder="example@gmail.com"
                      style={{ width: '100%' }}
                    />
                  </label>
                  
                  <label style={{ display: 'block', marginBottom: '12px' }}>
                    <span className="muted">รหัสผ่าน</span>
                    <input 
                      type="password" 
                      className="input-field" 
                      value={accountPassword} 
                      onChange={e => setAccountPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ width: '100%' }}
                    />
                  </label>

                  {loginType === 'Gmail' && (
                    <label style={{ display: 'block', marginBottom: '12px' }}>
                      <span className="muted">รหัสสำรอง 8 หลัก (Backup Code) <span style={{color: 'var(--accent)', fontSize: '12px'}}>*แนะนำ</span></span>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={backupCode} 
                        onChange={e => setBackupCode(e.target.value)}
                        placeholder="เช่น 12345678, 87654321"
                        style={{ width: '100%' }}
                      />
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px', lineHeight: '1.5', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                        <div style={{ marginBottom: '8px' }}>👉 <b>วิธีหารหัสสำรอง (Backup Code):</b></div>
                        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <li><b>สำหรับ Android (มือถือแอนดรอยด์):</b> ไปที่ การตั้งค่ามือถือ (Settings) &gt; Google &gt; จัดการบัญชี Google &gt; แถบ "ความปลอดภัย" &gt; การยืนยันแบบ 2 ขั้นตอน &gt; รหัสสำรอง</li>
                          <li><b>สำหรับ iOS (iPhone/iPad):</b> เข้าแอป Gmail &gt; แตะรูปโปรไฟล์มุมขวาบน &gt; จัดการบัญชี Google &gt; แถบ "ความปลอดภัย" &gt; การยืนยันแบบ 2 ขั้นตอน &gt; รหัสสำรอง</li>
                        </ul>
                        <div style={{ marginTop: '8px', color: 'var(--accent)' }}>* การใส่รหัสสำรองช่วยให้แอดมินล็อกอินทำให้คุณได้ทันที โดยไม่ต้องรอคุณกดยืนยันในมือถือ!</div>
                      </div>
                    </label>
                  )}
                </>
              )}

              {loginType === 'UID' && (
                <label style={{ display: 'block', marginBottom: '12px' }}>
                  <span className="muted">หมายเลข UID และ Server</span>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={accountId} 
                    onChange={e => setAccountId(e.target.value)}
                    placeholder="เช่น UID: 123456789 Server: Asia"
                    style={{ width: '100%' }}
                  />
                </label>
              )}
              
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span className="muted">หมายเหตุเพิ่มเติม (ถ้ามี)</span>
                <textarea 
                  value={customerNote}
                  onChange={e => setCustomerNote(e.target.value)}
                  placeholder="เช่น ตัวละครชื่อ... เวล..."
                  style={{ width: '100%', height: '60px', padding: '12px', borderRadius: '12px', border: '1px solid var(--line)', background: 'var(--field)', color: 'var(--text)', outline: 'none' }}
                />
              </label>

              <button 
                className="secondary-action" 
                onClick={() => { setSelectedPackage(null); setSlipImageBase64(null); setVerifySuccess(false); }}
                style={{ marginTop: '12px' }}
              >
                ← เปลี่ยนแพ็กเกจ
              </button>
            </div>
            
            <div className="order-box glass-card" style={{ padding: '24px', alignSelf: 'start', background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 243, 238, 0.9))' }}>
              <h3 style={{ marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '12px' }}>สรุปรายการสั่งซื้อ</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span className="muted">เกม</span>
                <strong>{game.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span className="muted">แพ็กเกจ</span>
                <strong>{selectedPackage.name}</strong>
              </div>
              
              {user && user.vip_level !== 'Bronze' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#e53935' }}>
                  <span>ส่วนลด VIP ({user.vip_level})</span>
                  <strong>-{selectedPackage.price - getDiscountedPrice(selectedPackage.price)}฿</strong>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed rgba(141,110,99,0.3)' }}>
                <strong style={{ fontSize: '18px' }}>ยอดชำระสุทธิ</strong>
                <strong className="price-text" style={{ fontSize: '24px', color: '#8d6e63' }}>{getDiscountedPrice(selectedPackage.price)} บาท</strong>
              </div>
              
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e0e0e0', display: 'inline-block', marginBottom: '16px' }}>
                  <img src={`https://promptpay.io/0838078616/${getDiscountedPrice(selectedPackage.price)}.png`} alt="PromptPay QR Code" style={{ width: '180px', height: '180px' }} />
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#666' }}>ชื่อบัญชี: ชัยแสงเพชร ธนวุฒิกีรติพร</div>
                </div>
                
                {!verifySuccess ? (
                  <>
                    <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    
                    {!slipImageBase64 ? (
                      <button className="primary-action" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => fileInputRef.current?.click()}>
                        <Upload size={18} />
                        อัปโหลดสลิปโอนเงิน
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <img src={slipImageBase64} alt="Slip" style={{ height: '80px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #ddd' }} />
                        <button 
                          className="primary-action" 
                          style={{ width: '100%', background: 'linear-gradient(135deg, #4caf50, #2e7d32)', color: 'white' }} 
                          onClick={handleVerifySlip}
                          disabled={isVerifying}
                        >
                          {isVerifying ? 'กำลังตรวจสอบสลิป...' : 'ตรวจสอบสลิป (SlipOK)'}
                        </button>
                        <button className="secondary-action" style={{ fontSize: '12px', padding: '6px' }} onClick={() => setSlipImageBase64(null)}>อัปโหลดใหม่</button>
                      </div>
                    )}
                    
                    {verifyError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e53935', fontSize: '13px', marginTop: '12px', background: '#ffebee', padding: '8px', borderRadius: '6px' }}>
                        <AlertCircle size={16} />
                        <span>{verifyError}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px', border: '1px solid #c8e6c9', marginTop: '16px' }}>
                    <CheckCircle color="#4caf50" size={32} style={{ margin: '0 auto 8px' }} />
                    <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>ตรวจสอบสลิปสำเร็จ</div>
                    <div style={{ fontSize: '12px', color: '#4caf50' }}>ยอดเงิน: {verifiedAmount} บาท</div>
                  </div>
                )}
              </div>

              <button 
                className="primary-action" 
                style={{ width: '100%', marginTop: '24px', opacity: verifySuccess ? 1 : 0.5, pointerEvents: verifySuccess ? 'auto' : 'none' }}
                onClick={handleSubmit}
                disabled={isSubmitting || !verifySuccess}
              >
                {isSubmitting ? 'กำลังส่งคำสั่งซื้อ...' : 'ยืนยันการสั่งซื้อ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
