import React, { useState, useEffect } from 'react';

const API_BASE_URL = ((window as any).API_BASE_URL || '').replace(/\/$/, '');

const getAdminHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .admin-orders-wrapper {
    min-height: 100vh;
    padding: 40px;
    background: #0b0f19;
    background-image:
      radial-gradient(circle at 15% 50%, rgba(20, 83, 45, 0.15), transparent 25%),
      radial-gradient(circle at 85% 30%, rgba(30, 58, 138, 0.15), transparent 25%);
    color: #f1f5f9;
    font-family: 'Inter', system-ui, sans-serif;
    box-sizing: border-box;
  }

  .admin-header {
    margin-bottom: 2rem;
  }

  .admin-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(to right, #38bdf8, #818cf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .glass-panel {
    background: rgba(30, 41, 59, 0.4);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow-x: auto;
  }

  .glass-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 12px;
    text-align: left;
  }

  .glass-table th {
    padding: 0 24px 12px 24px;
    font-weight: 600;
    color: #94a3b8;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .glass-table td {
    padding: 20px 24px;
    background: rgba(15, 23, 42, 0.4);
    font-size: 0.95rem;
    transition: all 0.3s ease;
  }

  .glass-table tr:hover td {
    background: rgba(30, 41, 59, 0.8);
  }

  .glass-table tr td:first-child {
    border-top-left-radius: 12px;
    border-bottom-left-radius: 12px;
  }

  .glass-table tr td:last-child {
    border-top-right-radius: 12px;
    border-bottom-right-radius: 12px;
  }

  .password-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .password-text {
    font-family: monospace;
    font-size: 1.1em;
    color: #cbd5e1;
    background: rgba(0,0,0,0.2);
    padding: 4px 8px;
    border-radius: 6px;
    letter-spacing: 1px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .icon-btn:hover {
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.1);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .status-pending { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
  .status-processing { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
  .status-completed { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
  .status-cancelled { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

  .actions-cell {
    display: flex;
    gap: 8px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-process {
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
    color: white;
    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
  }

  .btn-process:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
    transform: translateY(-1px);
  }

  .btn-complete {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  }

  .btn-complete:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
    transform: translateY(-1px);
  }

  .slip-img {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .slip-img:hover {
    transform: scale(1.1);
  }

  .slip-link {
    color: #38bdf8;
    text-decoration: none;
    display: inline-block;
  }
  .slip-link:hover {
    text-decoration: underline;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .user-info-label {
    font-size: 0.75rem;
    color: #94a3b8;
    text-transform: uppercase;
    margin-right: 6px;
  }
`;

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin-orders`, {
        headers: getAdminHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        window.location.reload();
        return;
      }
      if (!res.ok) throw new Error('ไม่สามารถโหลดรายการคำสั่งซื้อได้ กรุณาลองใหม่');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const formData = new FormData();
      formData.append('status', status);

      const res = await fetch(`${API_BASE_URL}/api/orders/${id}/status`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: formData,
      });

      if (!res.ok) throw new Error('ไม่สามารถอัปเดตสถานะได้');

      setOrders(orders.map(order =>
        order.id === id ? { ...order, status } : order
      ));
    } catch (err: any) {
      alert(err.message || 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  const togglePassword = (id: number) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const getStatusClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return 'status-completed';
    if (s === 'processing') return 'status-processing';
    if (s === 'cancelled') return 'status-cancelled';
    return 'status-pending';
  };

  return (
    <div className="admin-orders-wrapper">
      <style>{styles}</style>
      <div className="admin-header">
        <h1>Admin Orders Dashboard</h1>
      </div>

      <div className="glass-panel">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading orders...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#fbbf24', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 16 }}>{error}</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No orders found.</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Order Date</th>
                <th>Game Name</th>
                <th>Package Name</th>
                <th>User Info</th>
                <th>Slip</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>{formatDate(order.created_at || order.order_date)}</td>
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {order.game?.name || order.game_name || order.gameName || 'Unknown Game'}
                  </td>
                  <td style={{ color: '#cbd5e1' }}>
                    {order.package?.name || order.package_name || order.packageName || 'Unknown Package'}
                  </td>
                  <td>
                    <div className="user-info">
                      <div><span className="user-info-label">User:</span> {order.username}</div>
                      <div><span className="user-info-label">Login:</span> {order.login_method || order.loginMethod}</div>
                      <div className="password-wrapper">
                        <span className="user-info-label">Pass:</span>
                        <span className="password-text">
                          {visiblePasswords[order.id] ? (order.password || 'N/A') : '••••••••'}
                        </span>
                        {order.password && (
                          <button onClick={() => togglePassword(order.id)} className="icon-btn" title="Toggle Password Visibility">
                            {visiblePasswords[order.id] ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    {(order.slip_url || order.slipImage || order.slip) ? (
                      <a href={order.slip_url || order.slipImage || order.slip} target="_blank" rel="noreferrer" className="slip-link">
                        <img src={order.slip_url || order.slipImage || order.slip} alt="Slip" className="slip-img" />
                      </a>
                    ) : (
                      <span style={{ color: '#64748b' }}>No slip</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {order.status || 'Pending'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => updateStatus(order.id, 'processing')}
                      className="btn btn-process"
                      disabled={order.status?.toLowerCase() === 'processing' || order.status?.toLowerCase() === 'completed'}
                    >
                      Process
                    </button>
                    <button
                      onClick={() => updateStatus(order.id, 'completed')}
                      className="btn btn-complete"
                      disabled={order.status?.toLowerCase() === 'completed'}
                    >
                      Complete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
