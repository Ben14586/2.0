import React, { useState, useEffect } from "react";

const API_BASE_URL = (window as any).API_BASE_URL || "http://localhost:3000";

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [editingUser, setEditingUser] = useState<any>(null);
  const [resetPwUser, setResetPwUser] = useState<any>(null);
  const [banUser, setBanUser] = useState<any>(null);
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: editingUser.id,
          display_name: editingUser.display_name,
          tel: editingUser.tel,
          points: parseInt(editingUser.points),
          total_spent: parseFloat(editingUser.total_spent),
          vip_level: editingUser.vip_level,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.detail || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banUser) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: banUser.id,
          is_banned: banUser.is_banned,
          ban_reason: banUser.is_banned ? banUser.ban_reason : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBanUser(null);
        fetchUsers();
      } else {
        alert(data.detail || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleHide = async (user: any) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/hide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          is_hidden: !user.is_hidden,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.detail || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteUser) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: deleteUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteUser(null);
        fetchUsers();
      } else {
        alert(data.detail || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwUser) return;
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin/users/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: resetPwUser.id,
          new_password: resetPwUser.new_password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResetPwUser(null);
        alert("รีเซ็ตรหัสผ่านสำเร็จ");
      } else {
        alert(data.detail || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.tel?.includes(q)
    );
  });

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="admin-container">
      <style>{`
        .admin-container {
          padding: 24px;
          color: #e2e8f0;
        }
        .header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .search-input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 8px 16px;
          color: white;
          width: 250px;
          outline: none;
        }
        .search-input:focus {
          border-color: #3b82f6;
        }
        .table-container {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.875rem;
        }
        .admin-table th {
          background: rgba(255,255,255,0.02);
          padding: 16px;
          font-weight: 600;
          color: #cbd5e1;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .admin-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .admin-table tbody tr:hover {
          background: rgba(255,255,255,0.02);
        }
        .vip-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
          display: inline-block;
        }
        .vip-diamond { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .vip-gold { background: rgba(234, 179, 8, 0.2); color: #facc15; }
        .vip-silver { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
        .vip-bronze { background: rgba(120, 113, 108, 0.2); color: #a8a29e; }

        .action-btn {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-edit { background: rgba(255,255,255,0.1); color: white; }
        .btn-edit:hover { background: rgba(255,255,255,0.2); }
        .btn-pw { background: rgba(234, 179, 8, 0.1); color: #eab308; }
        .btn-pw:hover { background: rgba(234, 179, 8, 0.2); }
        .btn-ban { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        .btn-ban:hover { background: rgba(239, 68, 68, 0.2); }
        .btn-unban { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        .btn-unban:hover { background: rgba(34, 197, 94, 0.2); }
        .btn-hide { background: rgba(100, 116, 139, 0.1); color: #94a3b8; }
        .btn-hide:hover { background: rgba(100, 116, 139, 0.2); }
      `}</style>

      <div className="header-flex">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, color: 'white' }}>จัดการผู้ใช้งาน (Users)</h2>
        <input
          type="text"
          placeholder="ค้นหา Username, ชื่อ, เบอร์โทร..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>ชื่อที่แสดง</th>
              <th>เบอร์โทร</th>
              <th>ระดับ VIP</th>
              <th>Points</th>
              <th>ยอดสะสม</th>
              <th>สถานะ</th>
              <th style={{ textAlign: 'right' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td style={{ color: '#94a3b8' }}>#{u.id}</td>
                <td style={{ fontWeight: 'bold', color: 'white' }}>{u.username}</td>
                <td>{u.display_name}</td>
                <td style={{ color: '#94a3b8' }}>{u.tel || "-"}</td>
                <td>
                  <span className={`vip-badge ${
                    u.vip_level === "Diamond" ? "vip-diamond" :
                    u.vip_level === "Gold" ? "vip-gold" :
                    u.vip_level === "Silver" ? "vip-silver" : "vip-bronze"
                  }`}>
                    {u.vip_level || 'Bronze'}
                  </span>
                </td>
                <td style={{ color: '#38bdf8', fontWeight: 'bold' }}>{u.points}</td>
                <td style={{ color: '#10b981', fontWeight: 'bold' }}>฿{u.total_spent?.toLocaleString() || 0}</td>
                <td>
                  {u.is_banned ? (
                    <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ถูกระงับ</span>
                  ) : (
                    <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ปกติ</span>
                  )}
                  {u.is_hidden && (
                    <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '0.75rem', background: 'rgba(148,163,184,0.1)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>ซ่อนจากระบบ</span>
                  )}
                </td>
                <td style={{ textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditingUser(u)} className="action-btn btn-edit">แก้ไข</button>
                  <button onClick={() => setResetPwUser({ ...u, new_password: "" })} className="action-btn btn-pw">เปลี่ยนรหัส</button>
                  <button onClick={() => setBanUser({ ...u, is_banned: !u.is_banned, ban_reason: u.ban_reason || "" })} className={`action-btn ${u.is_banned ? "btn-unban" : "btn-ban"}`}>
                    {u.is_banned ? "ปลดแบน" : "แบน"}
                  </button>
                  <button onClick={() => handleToggleHide(u)} className="action-btn btn-hide">
                    {u.is_hidden ? "เลิกซ่อน" : "ซ่อน"}
                  </button>
                  <button onClick={() => setDeleteUser(u)} className="action-btn btn-ban">ลบ</button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  ไม่พบผู้ใช้งาน
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-paper border border-white/10 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">แก้ไขข้อมูลผู้ใช้ #{editingUser.id}</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">ชื่อที่แสดง</label>
                <input type="text" value={editingUser.display_name} onChange={e => setEditingUser({...editingUser, display_name: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">เบอร์โทร</label>
                <input type="text" value={editingUser.tel || ""} onChange={e => setEditingUser({...editingUser, tel: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Points</label>
                  <input type="number" value={editingUser.points} onChange={e => setEditingUser({...editingUser, points: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">ยอดสะสม (บาท)</label>
                  <input type="number" step="0.01" value={editingUser.total_spent} onChange={e => setEditingUser({...editingUser, total_spent: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white" required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">ระดับ VIP</label>
                <select value={editingUser.vip_level} onChange={e => setEditingUser({...editingUser, vip_level: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white">
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Diamond">Diamond</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-400 hover:text-white">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-primary text-black font-bold rounded">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-paper border border-white/10 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">รีเซ็ตรหัสผ่าน ({resetPwUser.username})</h3>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">รหัสผ่านใหม่</label>
                <input type="text" value={resetPwUser.new_password} onChange={e => setResetPwUser({...resetPwUser, new_password: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white" required minLength={6} placeholder="ระบุรหัสผ่านใหม่" />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setResetPwUser(null)} className="px-4 py-2 text-gray-400 hover:text-white">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-yellow-500 text-black font-bold rounded">เปลี่ยนรหัสผ่าน</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-paper border border-white/10 rounded-xl p-6 w-full max-w-sm">
            <h3 className={`text-xl font-bold mb-4 ${banUser.is_banned ? "text-red-500" : "text-green-500"}`}>
              {banUser.is_banned ? "ระงับบัญชีผู้ใช้" : "ปลดระงับบัญชีผู้ใช้"}
            </h3>
            <p className="text-gray-300 text-sm mb-4">คุณกำลังจะ{banUser.is_banned ? "ระงับ" : "ปลดระงับ"}ผู้ใช้ <strong>{banUser.username}</strong></p>
            <form onSubmit={handleStatusChange} className="space-y-4">
              {banUser.is_banned && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">เหตุผลการแบน</label>
                  <textarea value={banUser.ban_reason} onChange={e => setBanUser({...banUser, ban_reason: e.target.value})} className="w-full bg-dark-bg border border-white/10 rounded px-3 py-2 text-white" required placeholder="เช่น ทุจริต, สแปม" />
                </div>
              )}
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setBanUser(null)} className="px-4 py-2 text-gray-400 hover:text-white">ยกเลิก</button>
                <button type="submit" className={`px-4 py-2 font-bold rounded ${banUser.is_banned ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                  ยืนยัน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-paper border border-red-500/30 rounded-xl p-6 w-full max-w-sm text-center">
            <h3 className="text-2xl font-bold text-red-500 mb-2">ลบผู้ใช้งานถาวร!</h3>
            <p className="text-white mb-6">คุณแน่ใจหรือไม่ว่าจะลบ <strong>{deleteUser.username}</strong> ออกจากระบบ? การกระทำนี้ไม่สามารถกู้คืนได้</p>
            <form onSubmit={handleDeleteUser} className="flex gap-4 justify-center">
              <button type="button" onClick={() => setDeleteUser(null)} className="px-6 py-2 text-gray-400 bg-white/5 hover:bg-white/10 rounded font-bold">ยกเลิก</button>
              <button type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded">
                ยืนยันการลบ
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
