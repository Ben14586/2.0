import React, { useState } from 'react';
import { Game, Package } from '../../types';
import { useAuth } from '../../context/AuthContext';
import CheckoutModal from '../CheckoutModal';

interface OrderModalProps {
  game: Game;
  onClose: () => void;
}

export function OrderModal({ game, onClose }: OrderModalProps) {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  if (selectedPackage) {
    return (
      <CheckoutModal
        selectedPackage={selectedPackage}
        game={game}
        onClose={() => setSelectedPackage(null)}
      />
    );
  }

  const getDiscountedPrice = (price: number) => {
    if (!user) return Math.round(price);
    let discount = 0;
    switch (user.vip_level) {
      case 'Silver': discount = 0.02; break;
      case 'Gold': discount = 0.05; break;
      case 'Platinum': discount = 0.08; break;
      case 'Diamond': discount = 0.10; break;
      case 'Challenger': discount = 0.15; break;
      default: discount = 0;
    }
    return Math.round(Math.max(0, price - (price * discount)));
  };

  // Generate gradient from game name for header
  const getHeaderGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash % 360);
    return `linear-gradient(135deg, hsl(${h}, 65%, 50%) 0%, hsl(${(h + 30) % 360}, 55%, 35%) 100%)`;
  };

  const gameImage = (game as any).playImage || game.play_image;
  const hasRealImage = gameImage && !gameImage.includes('unsplash.com');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: 0, position: 'relative', borderRadius: '20px', overflow: 'hidden' }}>

        {/* Header with game info */}
        <div style={{
          background: getHeaderGradient(game.name),
          padding: '28px 28px 20px',
          color: 'white',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          >
            &times;
          </button>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {hasRealImage && (
              <img src={gameImage} alt={game.name} style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{game.name}</h2>
              <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '14px', lineHeight: 1.5 }}>{game.description?.substring(0, 120)}{(game.description?.length || 0) > 120 ? '...' : ''}</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px 28px 28px' }}>
          {/* Screenshots & Video Gallery */}
          {((game as any).screenshots?.length > 0 || (game as any).videoUrl) && (
            <div style={{ marginBottom: '24px' }}>
              {(game as any).videoUrl && (
                <div style={{ marginBottom: '12px' }}>
                  {(game as any).videoUrl.includes('youtube') ? (
                    <iframe
                      width="100%"
                      height="280"
                      src={`https://www.youtube.com/embed/${(game as any).videoUrl.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || ''}`}
                      style={{ borderRadius: '12px', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={(game as any).videoUrl}
                      controls
                      style={{ width: '100%', borderRadius: '12px', maxHeight: '280px' }}
                      poster={(game as any).screenshots?.[0] || ''}
                    />
                  )}
                </div>
              )}

              {(game as any).screenshots?.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                  {(game as any).screenshots.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${game.name} screenshot ${i + 1}`}
                      style={{ height: '100px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#8d6e63'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Package selection */}
          <h3 style={{ marginBottom: '16px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📦</span> เลือกแพ็กเกจ
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: game.packages.length === 1 ? 'minmax(280px, 420px)' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {game.packages.map(pkg => {
              const finalPrice = getDiscountedPrice(pkg.price);
              const hasDiscount = finalPrice < Math.round(pkg.price);
              const highlights = typeof pkg.highlights === 'string' ? JSON.parse(pkg.highlights || '[]') : (pkg.highlights || []);

              return (
                <div
                  key={pkg.id}
                  className="glass-card"
                  style={{
                    padding: '22px',
                    border: pkg.is_recommended ? '2px solid #8d6e63' : '1px solid rgba(141,110,99,0.15)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    borderRadius: '14px',
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '220px'
                  }}
                  onClick={() => setSelectedPackage(pkg)}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(141,110,99,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                >
                  {pkg.is_recommended === 1 && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg, #8d6e63, #6d4c41)', color: 'white', fontSize: '11px', padding: '4px 12px', borderBottomLeftRadius: '12px', fontWeight: 600 }}>
                      ⭐ แนะนำ
                    </div>
                  )}

                  {pkg.badge && <span className="risk-pill" style={{ marginBottom: '14px', display: 'inline-block', fontSize: '12px' }}>{pkg.badge}</span>}

                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', lineHeight: 1.4, color: '#4d4255' }}>{pkg.name}</h3>

                  {pkg.subtitle && <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#8d6e63' }}>{pkg.subtitle}</p>}

                  {/* Price */}
                  <div style={{ margin: '14px 0', padding: '12px 0', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {hasDiscount && <span style={{ textDecoration: 'line-through', color: '#aaa', fontSize: '14px', marginRight: '8px' }}>{Math.round(pkg.price)}฿</span>}
                    <span style={{ fontSize: '26px', fontWeight: 800, color: hasDiscount ? '#b45309' : '#8d6e63' }}>{finalPrice}</span>
                    <span style={{ fontSize: '14px', color: '#888', marginLeft: '4px' }}>บาท</span>
                  </div>

                  {/* Highlights */}
                  {highlights.length > 0 && (
                    <ul style={{ margin: '0', padding: '0', listStyle: 'none', fontSize: '13px', color: '#666' }}>
                      {highlights.slice(0, 4).map((h: string, i: number) => (
                        <li key={i} style={{ padding: '3px 0', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                          <span style={{ color: '#4caf50', fontSize: '12px', marginTop: '2px' }}>✓</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {pkg.description && !highlights.length && (
                    <p className="muted" style={{ fontSize: '13px', margin: '8px 0 0', lineHeight: 1.5 }}>{pkg.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Warranty info */}
          {game.warranty_days > 0 && (
            <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(76,175,80,0.08)', borderRadius: '12px', border: '1px solid rgba(76,175,80,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#2e7d32' }}>
              <span style={{ fontSize: '18px' }}>🛡️</span>
              <span>รับประกัน <strong>{game.warranty_days} วัน</strong> {game.warranty_note && `— ${game.warranty_note}`}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
