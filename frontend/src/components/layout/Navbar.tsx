import React from 'react';

export function Navbar() {
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark">GS</span>
        <span>Game Services</span>
      </div>
      <nav className="nav" aria-label="Main">
        <a href="#top">หน้าแรก</a>
        <a href="#games">เกมทั้งหมด</a>
        <a href="#creator-reference">ข้อมูลอ้างอิง</a>
        <a href="#trust">รับประกัน</a>
      </nav>
      <a className="primary-action" href="#games">เลือกเกม</a>
    </header>
  );
}
