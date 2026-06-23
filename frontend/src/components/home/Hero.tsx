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
      <div className="glass-card hero-copy" style={{ textAlign: 'center', padding: '60px 24px', maxWidth: '800px', margin: '0 auto', border: 'none', background: 'transparent', boxShadow: 'none' }}>
        <p className="eyebrow" style={{ fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '16px', fontWeight: 600 }}>Premium Game Services</p>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '24px' }}>
          <span style={{ display: 'block', color: 'var(--text)' }}>ยกระดับการเล่นเกม</span>
          <span style={{ display: 'block', background: 'linear-gradient(135deg, #FF6B6B, #845EC2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ให้เหนือกว่าที่เคย</span>
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--muted)', maxWidth: '600px', margin: '0 auto 40px auto', lineHeight: 1.6 }}>
          บริการเติมเกมและแพ็กเกจมืออาชีพ สะดวก รวดเร็ว และปลอดภัย 
          <br/>พร้อมทีมงานคุณภาพดูแลคุณตลอด 24 ชั่วโมง
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
