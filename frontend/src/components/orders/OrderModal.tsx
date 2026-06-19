import React, { useState } from 'react';
import { Game, Package } from '../../types';

interface OrderModalProps {
  game: Game;
  onClose: () => void;
}

export function OrderModal({ game, onClose }: OrderModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [platform, setPlatform] = useState('iOS');
  const [customerNote, setCustomerNote] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSlipFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPackage || !slipFile) {
      alert('กรุณาเลือกแพ็กเกจและอัปโหลดสลิปโอนเงิน');
      return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('game_id', game.id);
    formData.append('package_id', selectedPackage.id);
    formData.append('platform', platform);
    formData.append('customer_note', customerNote);
    formData.append('slip', slipFile);

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
          <h2 style={{ color: '#4caf50', marginBottom: '16px' }}>สั่งซื้อสำเร็จ!</h2>
          <p>หมายเลขออเดอร์ของคุณคือ:</p>
          <h1 style={{ fontSize: '32px', margin: '12px 0' }}>{orderId}</h1>
          <p className="muted" style={{ marginBottom: '24px' }}>โปรดบันทึกหมายเลขนี้ไว้สำหรับติดตามสถานะ</p>
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
        <p className="muted" style={{ marginBottom: '24px' }}>{game.description}</p>

        {!selectedPackage ? (
          <div>
            <h3 style={{ marginBottom: '16px' }}>เลือกแพ็กเกจ</h3>
            <div className="package-grid">
              {game.packages.map(pkg => (
                <div key={pkg.id} className="glass-card" style={{ padding: '16px', border: pkg.is_recommended ? '2px solid #8d6e63' : '1px solid rgba(141,110,99,0.18)' }}>
                  {pkg.badge && <span className="risk-pill" style={{ marginBottom: '8px' }}>{pkg.badge}</span>}
                  <h3>{pkg.name}</h3>
                  <p className="price-text" style={{ fontSize: '20px', margin: '8px 0' }}>{pkg.price} บาท</p>
                  <p className="muted" style={{ fontSize: '13px' }}>{pkg.description}</p>
                  <button className="secondary-action" style={{ width: '100%', marginTop: '16px' }} onClick={() => setSelectedPackage(pkg)}>
                    เลือกแพ็กเกจนี้
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            <div className="order-box">
              <h3 style={{ marginBottom: '16px' }}>ข้อมูลสำหรับสั่งซื้อ</h3>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span className="muted">ระบบมือถือ</span>
                <select className="select-field" value={platform} onChange={e => setPlatform(e.target.value)}>
                  {game.supported_ios === 1 && <option value="iOS">iOS</option>}
                  {game.supported_android === 1 && <option value="Android">Android</option>}
                </select>
              </label>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span className="muted">หมายเหตุถึงแอดมิน</span>
                <textarea 
                  value={customerNote}
                  onChange={e => setCustomerNote(e.target.value)}
                  placeholder="เช่น พร้อมส่งข้อมูลบัญชีหลังแอดมินตอบกลับ"
                  style={{ width: '100%' }}
                />
              </label>
              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span className="muted">อัปโหลดสลิปโอนเงิน</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                  <input type="file" id="slipInput" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  <button type="button" className="secondary-action" onClick={() => document.getElementById('slipInput')?.click()}>เลือกรูปภาพสลิป</button>
                  <span className="muted" style={{ fontSize: '13px' }}>{slipFile ? slipFile.name : 'ยังไม่ได้อัปโหลดสลิป'}</span>
                </div>
              </label>
              <button 
                className="secondary-action" 
                onClick={() => setSelectedPackage(null)}
                style={{ marginTop: '24px' }}
              >
                ← เปลี่ยนแพ็กเกจ
              </button>
            </div>
            <div className="order-box glass-card" style={{ padding: '24px', alignSelf: 'start' }}>
              <h3 style={{ marginBottom: '16px' }}>สรุปรายการสั่งซื้อ</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted">เกม</span>
                <strong>{game.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="muted">แพ็กเกจ</span>
                <strong>{selectedPackage.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '2px solid rgba(141,110,99,0.18)' }}>
                <strong>ยอดชำระสุทธิ</strong>
                <strong className="price-text" style={{ fontSize: '20px' }}>{selectedPackage.price} บาท</strong>
              </div>
              <button 
                className="primary-action" 
                style={{ width: '100%', marginTop: '24px' }}
                onClick={handleSubmit}
                disabled={isSubmitting || !slipFile}
              >
                {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันการสั่งซื้อ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
