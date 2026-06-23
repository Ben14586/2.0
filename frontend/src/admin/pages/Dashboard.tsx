import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function Dashboard() {
  const [stats, setStats] = useState({ total_orders: 0, total_sales: 0, pending_count: 0, completed_count: 0 });
  const [salesData, setSalesData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = (window as any).API_BASE_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin-dashboard`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setStats({
            total_orders: data.data.summary.totalLeads || 0,
            total_sales: 24500, // mock
            pending_count: data.data.summary.newLeads || 0,
            completed_count: (data.data.summary.totalLeads || 0) - (data.data.summary.newLeads || 0)
          });
          
          setSalesData([
            { name: 'จ.', sales: 1200 },
            { name: 'อ.', sales: 2100 },
            { name: 'พ.', sales: 800 },
            { name: 'พฤ.', sales: 1600 },
            { name: 'ศ.', sales: 2400 },
            { name: 'ส.', sales: 3200 },
            { name: 'อา.', sales: 2800 },
          ] as any);

          setCategoryData([
            { name: 'เกมมือถือ', value: 400 },
            { name: 'บัตรเติมเงิน', value: 300 },
            { name: 'เกม PC', value: 300 },
            { name: 'แอปพรีเมียม', value: 200 },
          ] as any);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="card pad text-white">กำลังโหลดข้อมูล...</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="text-white">
      <div className="title">
        <h2 className="text-2xl font-bold">ภาพรวมระบบ (Advanced Analytics)</h2>
        <p className="text-gray-400">สถิติและสถานะการทำงาน</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-paper border border-white/10 p-4 rounded-xl">
          <span className="text-gray-400 text-sm">คำสั่งซื้อทั้งหมด</span>
          <div className="text-2xl font-bold mt-1">{stats.total_orders}</div>
        </div>
        <div className="bg-dark-paper border border-white/10 p-4 rounded-xl">
          <span className="text-gray-400 text-sm">ยอดขายรวม</span>
          <div className="text-2xl font-bold mt-1 text-primary">฿{stats.total_sales.toLocaleString('th-TH')}</div>
        </div>
        <div className="bg-dark-paper border border-white/10 p-4 rounded-xl">
          <span className="text-gray-400 text-sm">รอดำเนินการ</span>
          <div className="text-2xl font-bold mt-1 text-yellow-500">{stats.pending_count}</div>
        </div>
        <div className="bg-dark-paper border border-white/10 p-4 rounded-xl">
          <span className="text-gray-400 text-sm">เสร็จสิ้น</span>
          <div className="text-2xl font-bold mt-1 text-green-500">{stats.completed_count}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-paper border border-white/10 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-4">ยอดขายรายสัปดาห์</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" tickFormatter={(value) => `฿${value}`} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.1)'}} contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }} />
                <Bar dataKey="sales" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-dark-paper border border-white/10 p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-4">สัดส่วนประเภทสินค้าที่ขายดี</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
