import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const [stats, setStats] = useState({ total_orders: 0, total_sales: 0, pending_count: 0, completed_count: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data.summary);
          
          // Generate mock chart data since the backend doesn't provide time-series yet
          // In a real scenario, the backend should return daily sales.
          const mockData = [
            { name: 'จ.', sales: 1200 },
            { name: 'อ.', sales: 2100 },
            { name: 'พ.', sales: 800 },
            { name: 'พฤ.', sales: 1600 },
            { name: 'ศ.', sales: 2400 },
            { name: 'ส.', sales: 3200 },
            { name: 'อา.', sales: 2800 },
          ];
          setChartData(mockData as any);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="card pad">กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="title">
        <h2>แดชบอร์ดสรุปภาพรวม</h2>
        <p>สถิติการขายและสถานะระบบ</p>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="muted">ออเดอร์ทั้งหมด</span>
          <strong>{stats.total_orders}</strong>
        </div>
        <div className="metric">
          <span className="muted">ยอดขายสุทธิ</span>
          <strong style={{ color: 'var(--accent-2)' }}>฿{stats.total_sales.toLocaleString('th-TH')}</strong>
        </div>
        <div className="metric">
          <span className="muted">รอดำเนินการ</span>
          <strong style={{ color: 'var(--warn)' }}>{stats.pending_count}</strong>
        </div>
        <div className="metric">
          <span className="muted">สำเร็จแล้ว</span>
          <strong style={{ color: 'var(--good)' }}>{stats.completed_count}</strong>
        </div>
      </div>

      <div className="card pad">
        <h3 style={{ marginBottom: '16px' }}>ยอดขายสัปดาห์นี้</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} />
              <YAxis stroke="var(--muted)" tick={{ fill: 'var(--muted)' }} tickFormatter={(value) => `฿${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--panel-2)', borderColor: 'var(--line)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--accent-2)' }}
              />
              <Line type="monotone" dataKey="sales" stroke="var(--accent-2)" strokeWidth={3} dot={{ r: 4, fill: 'var(--bg-1)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
