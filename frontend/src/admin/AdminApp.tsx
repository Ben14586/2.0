import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import AdminOrders from '../components/AdminOrders';
import { CatalogManager } from './pages/CatalogManager';
import { CouponManager } from './pages/CouponManager';
import { SettingsManager } from './pages/SettingsManager';
import { UserManager } from './pages/UserManager';
import { AdminLogin } from './components/AdminLogin';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [checkingSession, setCheckingSession] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }

    const apiBaseUrl = (window as any).API_BASE_URL || '';
    fetch(`${apiBaseUrl}/api/admin-dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((response) => {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('admin_token');
        setToken(null);
      }
    }).catch(() => {
      // Keep the session during transient network failures and let each page show its retry state.
    }).finally(() => setCheckingSession(false));
  }, [token]);

  if (checkingSession) {
    return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text)' }}>กำลังตรวจสอบสิทธิ์...</main>;
  }

  if (!token) {
    return (
      <AdminLogin onLoginSuccess={(newToken) => {
        localStorage.setItem('admin_token', newToken);
        setToken(newToken);
      }} />
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">GS</span>
          <div className="title">
            <h1>Admin Portal</h1>
            <p>ส่วนการจัดการสำหรับผู้ดูแลระบบ</p>
          </div>
        </div>
        <div className="badge">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--good)' }}></span>
          ระบบสถานะปกติ
        </div>
      </header>

      <div className="layout">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        
        <div className="content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'orders' && <AdminOrders />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'catalog' && <CatalogManager />}
          {activeTab === 'coupons' && <CouponManager />}
          {activeTab === 'settings' && <SettingsManager />}
        </div>
      </div>
    </main>
  );
}
