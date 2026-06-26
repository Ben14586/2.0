import React, { useState } from 'react';
import { Game } from '../../types';

interface GameCardProps {
  game: Game;
  onSelect: (game: Game) => void;
}

// Generate a unique gradient from game name
function getGameGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40 + Math.abs((hash >> 8) % 30)) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 70%, 55%) 0%, hsl(${h2}, 60%, 40%) 100%)`;
}

// Check if the URL is a generic unsplash placeholder (not a real game icon)
function isGenericPlaceholder(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.includes('unsplash.com')) return true;
  return false;
}

export function GameCard({ game, onSelect }: GameCardProps) {
  const initial = game.name.substring(0, 2).toUpperCase();
  let imageUrl = game.play_image || game.playImage;
  
  // Ensure relative URLs are prefixed with API_BASE_URL if available
  if (imageUrl && imageUrl.startsWith('/')) {
    const baseUrl = (window as any).API_BASE_URL?.replace(/\/$/, '') || '';
    imageUrl = `${baseUrl}${imageUrl}`;
  }

  const hasRealImage = !isGenericPlaceholder(imageUrl);
  const [imgError, setImgError] = useState(false);
  const showPlaceholder = !hasRealImage || imgError;

  return (
    <div
      className="glass-card game-card"
      onClick={() => onSelect(game)}
      style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', padding: '16px' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div className="game-thumb" style={{
          flexShrink: 0, width: '64px', height: '64px', borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: showPlaceholder ? getGameGradient(game.name) : '#f0e6f6',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {!showPlaceholder ? (
            <img
              src={imageUrl!}
              alt={game.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <span style={{
              fontSize: '22px', fontWeight: 800, color: 'white',
              letterSpacing: '1px', textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              userSelect: 'none'
            }}>
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
