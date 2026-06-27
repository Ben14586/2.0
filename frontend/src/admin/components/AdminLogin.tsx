import React, { useState } from 'react';

interface AdminLoginProps {
  onLoginSuccess: (token: string) => void;
}

export function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${window.RUNTIME_CONFIG?.API_BASE_URL || ''}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        onLoginSuccess(data.token);
      } else {
        setError(response.status === 401 ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : (data.error || 'ไม่สามารถเข้าสู่ระบบได้'));
      }
    } catch (err) {
      setError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg-1)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: 'var(--panel-2)', padding: '32px', borderRadius: '24px', border: '1px solid var(--line)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: 'var(--text)', margin: '0 0 8px 0', fontSize: '24px' }}>แผงควบคุมแอดมิน</h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '14px' }}>เข้าสู่ระบบด้วยบัญชีผู้ดูแลที่กำหนดบนเซิร์ฟเวอร์</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(232, 111, 134, 0.1)', color: 'var(--bad)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(232, 111, 134, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 500 }}>ชื่อผู้ใช้</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1px solid var(--line)', background: 'var(--field)',
                color: 'var(--text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 500 }}>รหัสผ่าน</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '12px',
                border: '1px solid var(--line)', background: 'var(--field)',
                color: 'var(--text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px', padding: '14px', borderRadius: '12px', border: 'none',
              background: loading ? 'var(--line-strong)' : 'linear-gradient(135deg, #9d4edd, #6d28d9)',
              color: '#fff', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
