import React, { useState, useEffect } from 'react';

export function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders');
      const data = await response.json();
      if (data.success) {
        setOrders(data.data.orders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะเป็น ${status}?`)) return;
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        fetchOrders();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ');
    }
  };

  if (loading) return <div className="card pad">กำลังโหลดข้อมูล...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="title">
        <h2>จัดการออเดอร์</h2>
        <p>ตรวจสอบสลิปและดำเนินการเติมเกม</p>
      </div>

      <div className="card pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3>รายการล่าสุด</h3>
        </div>
        
        <div className="grid-list">
          {orders.map(order => (
            <div key={order.id} className="row" style={{ alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '15px' }}>{order.order_id}</strong>
                <div className="muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                  {order.game_name} - {order.package_name}
                </div>
              </div>
              <div style={{ fontSize: '15px', color: 'var(--accent-2)', fontWeight: 700 }}>
                ฿{order.final_price}
              </div>
              <div>
                <span className={`pill ${order.status === 'completed' ? 'low' : order.status === 'cancelled' ? 'high' : order.status === 'processing' ? 'medium' : ''}`}>
                  {order.status === 'completed' ? 'เสร็จสิ้น' : order.status === 'cancelled' ? 'ยกเลิก' : order.status === 'processing' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <a href={order.slip_url} target="_blank" rel="noreferrer" style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                  ดูสลิป
                </a>
                {order.status === 'pending' && (
                  <button onClick={() => handleUpdateStatus(order.id, 'processing')} style={{ background: 'var(--warn)', color: '#130f18', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    รับงาน
                  </button>
                )}
                {order.status === 'processing' && (
                  <button onClick={() => handleUpdateStatus(order.id, 'completed')} style={{ background: 'var(--good)', color: '#130f18', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    เสร็จสิ้น
                  </button>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: '24px' }}>ไม่มีออเดอร์</div>}
        </div>
      </div>
    </div>
  );
}
