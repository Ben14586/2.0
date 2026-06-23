import React, { useState } from 'react';

interface TrackingResult {
  order_id: string;
  status: string;
  game_name: string;
  package_name: string;
  final_price: number;
  created_at: string;
}

export function OrderTrackingWidget() {
  const [orderId, setOrderId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');

  const handleTrack = async () => {
    if (!orderId.trim()) return;
    setIsTracking(true);
    setError('');
    
    try {
      const response = await fetch(`/api/orders/track?id=${encodeURIComponent(orderId)}`);
      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'ไม่พบออเดอร์นี้');
        setResult(null);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setResult(null);
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <section className="section glass-card" style={{ padding: '22px', marginBottom: '24px' }}>
      <h2>ติดตามสถานะออเดอร์</h2>
      <p className="muted">ตรวจสอบสถานะการเติมเกมของท่านได้ทันทีแบบ Real-time</p>
      
      <div className="search-row" style={{ marginTop: '14px' }}>
        <input 
          placeholder="กรอกหมายเลขออเดอร์ เช่น ORD-1" 
          aria-label="หมายเลขออเดอร์" 
          value={orderId}
          onChange={e => setOrderId(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleTrack()}
          style={{ boxShadow: 'inset 0 0 8px rgba(0,0,0,0.02)' }}
        />
        <button 
          className="primary-action" 
          type="button" 
          onClick={handleTrack}
          disabled={isTracking}
        >
          {isTracking ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสถานะ'}
        </button>
      </div>

      {error && <p style={{ color: 'red', marginTop: '16px' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '18px' }}>
          <div className="glass-card" style={{ padding: '18px', border: '1px solid rgba(141,110,99,0.18)', background: 'rgba(255,255,255,0.86)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <strong style={{ fontSize: '18px', color: '#4d4255' }}>{result.order_id}</strong>
              <span className={`risk-pill ${result.status === 'completed' ? 'low' : result.status === 'cancelled' ? 'high' : 'medium'}`}>
                {result.status === 'completed' ? 'เสร็จสิ้น' : result.status === 'cancelled' ? 'ยกเลิก' : result.status === 'processing' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
              </span>
            </div>
            <p style={{ margin: '4px 0' }}><strong>เกม:</strong> <span>{result.game_name}</span></p>
            <p style={{ margin: '4px 0' }}><strong>แพ็กเกจ:</strong> <span>{result.package_name}</span></p>
            <p style={{ margin: '4px 0' }}><strong>ราคาสุทธิ:</strong> <span className="price-text" style={{ fontWeight: 700, color: '#8d6e63' }}>{result.final_price} บาท</span></p>
            <p style={{ margin: '4px 0', fontSize: '13px', color: '#6d6077' }}><strong>สร้างเมื่อ:</strong> <span>{new Date(result.created_at).toLocaleString('th-TH')}</span></p>
            
            {result.admin_note && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(216, 183, 160, 0.1)', borderLeft: '3px solid #8d6e63', borderRadius: '4px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#4d4255' }}><strong>หมายเหตุจากแอดมิน:</strong><br/>{result.admin_note}</p>
              </div>
            )}
            
            <div style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6d6077', marginBottom: '8px' }}>
                <span>ได้รับออเดอร์</span>
                <span>กำลังดำเนินการ</span>
                <span>สำเร็จ</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.06)', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ 
                  width: result.status === 'completed' ? '100%' : result.status === 'processing' ? '50%' : '15%', 
                  height: '100%', 
                  background: result.status === 'cancelled' ? '#f44336' : 'linear-gradient(90deg, #d8b7a0, #8d6e63)', 
                  borderRadius: '99px', 
                  transition: 'width 0.6s ease' 
                }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
