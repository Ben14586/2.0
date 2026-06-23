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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">จัดการผู้ใช้งาน (Users)</h2>
        <input
          type="text"
          placeholder="ค้นหา Username, ชื่อ, เบอร์โทร..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white w-64 focus:border-primary focus:outline-none"
        />
      </div>

      <div className="bg-dark-paper border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left text-white text-sm">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Username</th>
              <th className="p-4">ชื่อที่แสดง</th>
              <th className="p-4">เบอร์โทร</th>
              <th className="p-4">ระดับ VIP</th>
              <th className="p-4">Points</th>
              <th className="p-4">ยอดสะสม</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-gray-400">#{u.id}</td>
                <td className="p-4 font-bold">{u.username}</td>
                <td className="p-4">{u.display_name}</td>
                <td className="p-4">{u.tel || "-"}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    u.vip_level === "Diamond" ? "bg-blue-500/20 text-blue-400" :
                    u.vip_level === "Gold" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-gray-500/20 text-gray-400"
                  }`}>
                    {u.vip_level}
                  </span>
                </td>
                <td className="p-4 text-primary font-bold">{u.points}</td>
                <td className="p-4">฿{u.total_spent?.toLocaleString() || 0}</td>
                <td className="p-4">
                  {u.is_banned ? (
                    <span className="text-red-500 font-bold text-xs bg-red-500/10 px-2 py-1 rounded">ถูกระงับ</span>
                  ) : (
                    <span className="text-green-500 font-bold text-xs bg-green-500/10 px-2 py-1 rounded">ปกติ</span>
                  )}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => setEditingUser(u)} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded">
                    แก้ไข
                  </button>
                  <button onClick={() => setResetPwUser({ ...u, new_password: "" })} className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded">
                    เปลี่ยนรหัส
                  </button>
                  <button onClick={() => setBanUser({ ...u, is_banned: !u.is_banned, ban_reason: u.ban_reason || "" })} className={`text-xs px-2 py-1 rounded ${u.is_banned ? "bg-green-500/10 hover:bg-green-500/20 text-green-500" : "bg-red-500/10 hover:bg-red-500/20 text-red-500"}`}>
                    {u.is_banned ? "ปลดแบน" : "แบน"}
                  </button>
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
    </div>
  );
};
