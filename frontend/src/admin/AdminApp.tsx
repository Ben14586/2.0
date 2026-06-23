import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { OrderManager } from './pages/OrderManager';
import { CatalogManager } from './pages/CatalogManager';
import { CouponManager } from './pages/CouponManager';
import { SettingsManager } from './pages/SettingsManager';
import { UserManager } from './pages/UserManager';
import { AdminLogin } from './components/AdminLogin';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

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
          {activeTab === 'orders' && <OrderManager />}
          {activeTab === 'users' && <UserManager />}
          {activeTab === 'catalog' && <CatalogManager />}
          {activeTab === 'coupons' && <CouponManager />}
          {activeTab === 'settings' && <SettingsManager />}
        </div>
      </div>
    </main>
  );
}
