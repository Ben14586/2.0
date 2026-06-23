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
      
      <div className="glass-card" style={{ padding: '24px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gap: '12px' }}>
          {leaders.map((user, index) => (
            <div 
              key={user.username} 
              className="leaderboard-item"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                padding: '12px 16px', 
                borderRadius: '12px',
                background: index < 3 ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(243, 229, 171, 0.2))' : 'rgba(255, 255, 255, 0.5)',
                border: index < 3 ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(141, 110, 99, 0.1)'
              }}
            >
              <div style={{ 
                width: '32px', 
                height: '32px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                borderRadius: '50%',
                background: index === 0 ? '#d4af37' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f0',
                color: index < 3 ? '#fff' : '#666',
                fontWeight: 'bold'
              }}>
                {index < 3 ? <Medal size={16} /> : index + 1}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#4d4255' }}>
                  {user.display_name}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>@{user.username}</div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: '900', color: '#8d6e63', fontSize: '18px' }}>
                  {user.points.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>Pts</span>
                </div>
                <div style={{ 
                  display: 'inline-block',
                  fontSize: '11px', 
                  padding: '2px 8px', 
                  background: 'linear-gradient(135deg, #d4af37, #f3e5ab)', 
                  borderRadius: '999px', 
                  color: '#8a6d1c', 
                  fontWeight: 'bold',
                  marginTop: '4px'
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
