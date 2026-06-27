import React, { useState } from 'react';

interface HeroProps {
  onSearch: (term: string) => void;
}

export function Hero({ onSearch }: HeroProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchClick = () => {
    onSearch(searchTerm);
    const gamesSection = document.getElementById('games');
    if (gamesSection) gamesSection.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="hero-copy" style={{ textAlign: 'center', padding: '54px 24px', margin: '0 auto' }}>
        <p className="eyebrow" style={{ fontSize: '13px', letterSpacing: 0, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '14px', fontWeight: 800 }}>
          Professional Game Service Platform
        </p>
        <h1 className="hero-title">
          <span>บริการเกมมือถือครบวงจร </span>
          <span className="hero-title-accent">สั่งซื้อง่าย ดูแลครบ</span>
        </h1>
        <p className="hero-subcopy">
          เลือกเกมที่ต้องการ ดูรายละเอียดแพ็ก ราคา ระยะเวลาดำเนินงาน และเงื่อนไขรับประกันในหน้าเดียว พร้อมระบบโอนยอด อัปโหลดสลิป และติดตามออเดอร์หลังสั่งซื้อ
        </p>
        <div className="hero-badges">
          <span className="section-kicker">ตรวจสลิปก่อนรับงาน</span>
          <span className="section-kicker">รับประกัน 7 วัน</span>
          <span className="section-kicker">ลดปัญหา 2FA</span>
        </div>
        <div className="search-row">
          <input
            placeholder="ค้นหาเกม เช่น Primitive Brothers, Idle RPG, Tower Defense"
            aria-label="ค้นหาเกม"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
          />
          <button className="primary-action" type="button" onClick={handleSearchClick}>
            ค้นหาเกม
          </button>
        </div>
      </div>
    </section>
  );
}
