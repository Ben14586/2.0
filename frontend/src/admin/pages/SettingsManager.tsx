import React, { useState, useEffect } from "react";

export const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState({
    slipok_api_key: "",
    slipok_branch_id: "",
    telegram_bot_token: "",
    telegram_chat_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:3000/api/admin-settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSettings((prev) => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:3000/api/admin-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("✅ บันทึกการตั้งค่าเรียบร้อยแล้ว");
      } else {
        setMessage("❌ เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      setMessage("❌ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("http://localhost:3000/api/admin-test-telegram", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.telegram) {
        alert("ส่งข้อความทดสอบสำเร็จ!");
      } else {
        alert("ไม่สามารถส่งข้อความได้ โปรดตรวจสอบ Token และ Chat ID");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">ตั้งค่าระบบ (Settings)</h2>

      {message && (
        <div className="mb-6 p-4 rounded-lg bg-white/10 border border-white/20 text-white">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Settings */}
        <div className="bg-dark-paper rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.68-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.41-1.43-.87.03-.24.34-.49.92-.75 3.62-1.58 6.04-2.62 7.25-3.13 3.45-1.45 4.16-1.7 4.63-1.71.1 0 .34.02.48.13.12.09.15.22.16.32-.01.07-.01.19-.02.24z"/></svg>
            ระบบแจ้งเตือน Telegram
          </h3>
          <p className="text-sm text-gray-400 mb-4">รับการแจ้งเตือนทันทีเมื่อมีออเดอร์ใหม่</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bot Token</label>
              <input
                type="text"
                name="telegram_bot_token"
                value={settings.telegram_bot_token}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="123456789:ABCdefGHIjklmNOPqrsTUVwxyz..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Chat ID</label>
              <input
                type="text"
                name="telegram_chat_id"
                value={settings.telegram_chat_id}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="เช่น 123456789"
              />
            </div>
            <button
              onClick={handleTestTelegram}
              className="mt-2 text-sm bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors w-full flex justify-center items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              ทดสอบส่งข้อความเข้ามือถือ
            </button>
          </div>
        </div>

        {/* SlipOK Settings */}
        <div className="bg-dark-paper rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-accent mb-4 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ระบบเช็คสลิป SlipOK
          </h3>
          <p className="text-sm text-gray-400 mb-4">ตรวจสลิปโอนเงินอัตโนมัติป้องกันสลิปปลอม</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
              <input
                type="text"
                name="slipok_api_key"
                value={settings.slipok_api_key}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="ZOP1ZPr+fi+a53p3YfH9PKWTt..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Branch ID</label>
              <input
                type="text"
                name="slipok_branch_id"
                value={settings.slipok_branch_id}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="รหัสสาขา (ถ้ามี)"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-black font-bold py-3 px-8 rounded-full transition-colors flex items-center gap-2"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </div>
    </div>
  );
};
