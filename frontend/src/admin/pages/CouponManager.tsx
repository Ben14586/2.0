import React from 'react';

export function CouponManager() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="title">
        <h2>ระบบคูปองส่วนลด</h2>
        <p>สร้างและจัดการโค้ดส่วนลดโปรโมชัน</p>
      </div>
      <div className="card pad">
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          <h3>ระบบจัดการคูปอง (เวอร์ชันสาธิต)</h3>
          <p>ฟีเจอร์นี้จะพร้อมให้ใช้งานในรุ่นถัดไป</p>
        </div>
      </div>
    </div>
  );
}
