import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';

interface LeaderboardUser {
  username: string;
  display_name: string;
  points: number;
  vip_level: string;
}

export function LeaderboardWidget() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/leaderboard')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLeaders(data.leaderboard);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || leaders.length === 0) return null;

  return (
    <div className="leaderboard-section" style={{ marginTop: '32px' }}>
      <div className="section-title">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy color="#d4af37" />
          <span>Top Spenders (นักเปย์ตัวท็อป)</span>
        </h2>
        <span className="muted" style={{ fontSize: '14px' }}>อัปเดตแบบเรียลไทม์</span>
      </div>

      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden', borderRadius: '16px', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'grid', gap: '12px' }}>
          {leaders.map((user, index) => (
            <div
              key={user.username}
              className="leaderboard-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                borderRadius: '12px',
                background: index === 0 ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(202, 138, 4, 0.05))' :
                            index === 1 ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.15), rgba(100, 116, 139, 0.05))' :
                            index === 2 ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.15), rgba(180, 83, 9, 0.05))' :
                            'rgba(255, 255, 255, 0.02)',
                border: index === 0 ? '1px solid rgba(234, 179, 8, 0.3)' :
                        index === 1 ? '1px solid rgba(148, 163, 184, 0.3)' :
                        index === 2 ? '1px solid rgba(217, 119, 6, 0.3)' :
                        '1px solid rgba(255, 255, 255, 0.05)'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: index === 0 ? 'linear-gradient(135deg, #fef08a, #eab308)' :
                            index === 1 ? 'linear-gradient(135deg, #e2e8f0, #94a3b8)' :
                            index === 2 ? 'linear-gradient(135deg, #fcd34d, #d97706)' :
                            'rgba(255,255,255,0.1)',
                color: index < 3 ? '#1e293b' : '#94a3b8',
                fontWeight: 'bold',
                boxShadow: index < 3 ? '0 4px 10px rgba(0,0,0,0.2)' : 'none'
              }}>
                {index < 3 ? <Medal size={20} /> : index + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: index === 0 ? '#fde047' : 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {user.display_name}
                  {index === 0 && <Star size={14} color="#fde047" fill="#fde047" />}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>@{user.username}</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '900', color: index === 0 ? '#fde047' : '#38bdf8', fontSize: '1.25rem', display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
                  {user.points.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#94a3b8' }}>Pts</span>
                </div>
                <div style={{
                  display: 'inline-block',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: '#e2e8f0',
                  fontWeight: '600',
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {user.vip_level}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .leaderboard-item {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .leaderboard-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
}
