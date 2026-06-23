import React from 'react';
import { Game } from '../../types';

interface GameCardProps {
  game: Game;
  onSelect: (game: Game) => void;
}

export function GameCard({ game, onSelect }: GameCardProps) {
  const isFeatured = game.is_featured === 1;
  const initial = game.name.substring(0, 2).toUpperCase();

  return (
    <div 
      className="glass-card game-card" 
      onClick={() => onSelect(game)}
      style={{ cursor: 'pointer', transition: 'transform 0.2s', padding: '16px' }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div className="game-thumb" style={{ flexShrink: 0, width: '64px', height: '64px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent) 0%, var(--surface-2) 100%)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {game.play_image || game.playImage ? (
            <img src={game.play_image || game.playImage} alt={game.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          ) : (
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              {initial}
            </span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#4d4255' }}>{game.name}</h3>
            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', alignItems: 'flex-end' }}>
              {(game.isFeatured || game.is_featured === 1) && <span className="risk-pill low">แนะนำ</span>}
              {game.banStatus === 'risk' && <span className="risk-pill medium" style={{ fontSize: '11px', padding: '2px 6px' }}>อัตราโดนแบน {game.banRiskPercentage}%</span>}
              {game.banStatus === 'testing' && <span className="risk-pill low" style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--warning)', color: 'black' }}>ช่วงทดสอบระบบ</span>}
              {game.banStatus === 'banned' && <span className="risk-pill high" style={{ fontSize: '11px', padding: '2px 6px' }}>งดรับบริการชั่วคราว</span>}
            </div>
          </div>
          <span className="muted" style={{ display: 'inline-block', marginBottom: '8px', fontSize: '13px' }}>
            {game.category_name || game.categoryName || game.category?.name}
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {game.supported_ios === 1 && <span className="section-kicker" style={{ fontSize: '11px', padding: '2px 8px' }}>iOS</span>}
            {game.supported_android === 1 && <span className="section-kicker" style={{ fontSize: '11px', padding: '2px 8px' }}>Android</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
