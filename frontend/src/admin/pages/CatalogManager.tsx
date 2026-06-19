import React from 'react';

export function CatalogManager() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="title">
        <h2>จัดการแคตตาล็อก</h2>
        <p>เพิ่ม แก้ไข หรือลบ เกมและแพ็กเกจ</p>
      </div>
      <div className="card pad">
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
          <h3>ระบบจัดการแคตตาล็อก (เวอร์ชันสาธิต)</h3>
          <p>ฟีเจอร์นี้จะพร้อมให้ใช้งานในรุ่นถัดไป</p>
        </div>
      </div>
    </div>
  );
}
