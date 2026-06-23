import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { setUser } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [tel, setTel] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { username, password, display_name: displayName, tel: tel || undefined }
      : { username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (data.success) {
        setUser(data.user);
        onClose();
      } else {
        setError(data.detail || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ margin: '0 0 24px', fontSize: '24px', textAlign: 'center', color: '#4d4255' }}>
          {isRegister ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </h2>
        
        {error && (
          <div style={{ padding: '12px', background: 'rgba(255, 0, 0, 0.1)', color: 'red', borderRadius: '8px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ชื่อผู้ใช้ (Username)</label>
            <input 
              type="text" 
              className="select-field" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              placeholder="Username ของคุณ"
            />
          </div>
          
          {isRegister && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ชื่อที่แสดง (Display Name)</label>
              <input 
                type="text" 
                className="select-field" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
                required 
                placeholder="ชื่อเล่น หรือ ชื่อในเกม"
              />
            </div>
          )}
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>รหัสผ่าน (Password)</label>
            <input 
              type="password" 
              className="select-field" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              placeholder="รหัสผ่านของคุณ"
            />
          </div>
          
          {isRegister && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                เบอร์โทรศัพท์ <span style={{ color: '#888', fontWeight: 'normal' }}>(ไม่บังคับ)</span>
              </label>
              <input 
                type="tel" 
                className="select-field" 
                value={tel} 
                onChange={e => setTel(e.target.value)} 
                placeholder="08xxxxxxxx"
                pattern="[0-9]{10}"
              />
              <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0' }}>* ใช้เพื่อติดต่อกรณีออเดอร์มีปัญหาหรือจัดส่งล่าช้า</p>
            </div>
          )}
          
          <button 
            type="submit" 
            className="primary-action" 
            style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'กำลังดำเนินการ...' : isRegister ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'}
          </button>
        </form>
        
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          {isRegister ? 'มีบัญชีอยู่แล้ว? ' : 'ยังไม่มีบัญชี? '}
          <button 
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'none', border: 'none', color: '#8d6e63', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
          >
            {isRegister ? 'เข้าสู่ระบบเลย' : 'สมัครสมาชิกฟรี!'}
          </button>
        </div>
      </div>
    </div>
  );
}
