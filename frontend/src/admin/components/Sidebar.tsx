import React from 'react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export function Sidebar({ activeTab, onSelectTab }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: '📊 ภาพรวมระบบ' },
    { id: 'orders', label: '📦 รายการคำสั่งซื้อ' },
    { id: 'users', label: '👥 จัดการผู้ใช้งาน' },
    { id: 'catalog', label: '🎮 จัดการข้อมูลสินค้า' },
    { id: 'coupons', label: '🎫 จัดการคูปอง' },
    { id: 'settings', label: '⚙️ ตั้งค่าระบบ' }
  ];

  return (
    <aside>
      <div className="card pad" style={{ position: 'sticky', top: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: 'var(--muted)' }}>เมนูจัดการ</h3>
        <nav style={{ display: 'grid', gap: '8px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                background: activeTab === item.id ? 'var(--accent)' : 'transparent',
                color: activeTab === item.id ? '#ffffff' : 'var(--text)',
                border: 'none',
                padding: '12px 16px',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontWeight: activeTab === item.id ? 700 : 400,
                transition: 'background 0.2s',
                fontSize: '15px'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)' }}>
            <span>← กลับหน้าแรก</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
