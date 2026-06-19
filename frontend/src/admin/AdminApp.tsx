import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { OrderManager } from './pages/OrderManager';
import { CatalogManager } from './pages/CatalogManager';
import { CouponManager } from './pages/CouponManager';

export function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">GS</span>
          <div className="title">
            <h1>Admin Portal</h1>
            <p>ระบบจัดการหลังบ้านระดับองค์กร</p>
          </div>
        </div>
        <div className="badge">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--good)' }}></span>
          ระบบทำงานปกติ
        </div>
      </header>

      <div className="layout">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        
        <div className="content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'orders' && <OrderManager />}
          {activeTab === 'catalog' && <CatalogManager />}
          {activeTab === 'coupons' && <CouponManager />}
        </div>
      </div>
    </main>
  );
}
