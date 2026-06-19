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
      <div className="glass-card hero-copy">
        <p className="eyebrow">Game Service Commerce Platform</p>
        <h1>
          <span>บริการเกมมือถือครบวงจร</span>
          <span className="nowrap">สั่งซื้อง่าย ดูแลครบ</span>
        </h1>
        <p>
          <span>เลือกเกมและแพ็กเกจที่ต้องการ ดูรายละเอียด ราคา และรายการในแพ็กได้ชัดเจน</span>
          <span>พร้อมระบบติดตามออเดอร์ แจ้งข้อมูลครบถ้วน และหลังบ้านที่พร้อมใช้งานจริง</span>
        </p>
        <div className="hero-badges">
          <span className="section-kicker">บริการครบวงจร</span>
          <span className="section-kicker">รับประกัน 7 วัน</span>
          <span className="section-kicker">ดูแลหลังการขาย</span>
        </div>
        <div className="search-row">
          <input 
            placeholder="ค้นหาเกม เช่น Primitive Brothers, Idle RPG, AFK" 
            aria-label="ค้นหาเกม"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
          />
          <button 
            className="primary-action" 
            type="button"
            onClick={handleSearchClick}
          >
            ค้นหาเกม
          </button>
        </div>
      </div>
    </section>
  );
}
