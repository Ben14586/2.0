import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginModal } from '../auth/LoginModal';
import { Bell, User as UserIcon, LogOut, CheckCircle, Info } from 'lucide-react';

interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchNotifs = () => {
        fetch(`/api/notifications?username=${user.username}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setNotifications(data.notifications);
              setUnreadCount(data.notifications.filter((n: any) => !n.is_read).length);
            }
          })
          .catch(console.error);
      };
      
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 30000); // poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowProfile(false);
    if (!showNotifications && unreadCount > 0) {
      setUnreadCount(0); // mark as read locally
    }
  };

  return (
    <>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark">GS</span>
          <span>Game Services</span>
        </div>
        <nav className="nav" aria-label="Main">
          <a href="#top">หน้าแรก</a>
          <a href="#games">เกมทั้งหมด</a>
          <a href="#faq">คำถามที่พบบ่อย</a>
        </nav>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user ? (
            <>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={handleOpenNotifications}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#6d6077', padding: '8px' }}
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span style={{ 
                      position: 'absolute', top: '4px', right: '4px', background: '#e53935', color: 'white', 
                      width: '16px', height: '16px', borderRadius: '50%', fontSize: '10px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: '-40px', padding: '16px', width: '320px', zIndex: 50, maxHeight: '400px', overflowY: 'auto' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '16px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '8px' }}>การแจ้งเตือน</h3>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#888', padding: '20px 0', fontSize: '14px' }}>ไม่มีการแจ้งเตือน</div>
                    ) : (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {notifications.map(n => (
                          <div key={n.id} style={{ display: 'flex', gap: '12px', background: n.is_read ? 'transparent' : 'rgba(216, 183, 160, 0.1)', padding: '10px', borderRadius: '8px' }}>
                            <div style={{ color: n.message.includes('สำเร็จ') ? '#4caf50' : '#2196f3', marginTop: '2px' }}>
                              {n.message.includes('สำเร็จ') ? <CheckCircle size={16} /> : <Info size={16} />}
                            </div>
                            <div>
                              <div style={{ fontSize: '14px', lineHeight: '1.4', color: '#4d4255' }}>{n.message}</div>
                              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                                {new Date(n.created_at).toLocaleString('th-TH')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(141,110,99,0.15)', padding: '6px 12px', borderRadius: '999px', cursor: 'pointer', fontWeight: 'bold', color: '#4d4255' }}
                >
                  <UserIcon size={16} />
                  <span>{user.display_name}</span>
                  <span style={{ fontSize: '12px', padding: '2px 6px', background: 'linear-gradient(135deg, #d4af37, #f3e5ab)', borderRadius: '4px', color: '#8a6d1c', marginLeft: '4px', fontWeight: 'bold' }}>
                    {user.vip_level}
                  </span>
                </button>
                
                {showProfile && (
                  <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, padding: '16px', minWidth: '220px', zIndex: 50 }}>
                    <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#4d4255' }}>{user.display_name}</div>
                      <div style={{ fontSize: '13px', color: '#888' }}>@{user.username}</div>
                      <div style={{ fontSize: '14px', marginTop: '8px', background: 'rgba(141, 110, 99, 0.1)', padding: '8px', borderRadius: '8px' }}>
                        แต้มสะสม: <strong style={{ color: '#8d6e63', fontSize: '16px' }}>{user.points.toLocaleString()}</strong> <span style={{fontSize: '12px'}}>Pts</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { logout(); setShowProfile(false); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#ffebee', border: '1px solid #ffcdd2', color: '#c62828', cursor: 'pointer', width: '100%', padding: '10px 0', borderRadius: '8px', fontWeight: 'bold' }}
                    >
                      <LogOut size={16} />
                      ออกจากระบบ
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="primary-action" onClick={() => setShowLogin(true)}>เข้าสู่ระบบ</button>
          )}
        </div>
      </header>
      
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
