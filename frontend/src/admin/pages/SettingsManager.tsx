import React, { useState, useEffect } from "react";

const API_BASE_URL = (window as any).API_BASE_URL || "http://localhost:3000";

export const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState({
    slipok_api_key: "",
    slipok_branch_id: "",
    promptpay_id: "",
    bank_transfer_bank_name: "ธนาคารกสิกรไทย",
    bank_transfer_account_number: "1341058186",
    bank_transfer_account_name: "ชัยแสงเพชร ธนวุฒิกีรติพร",
    bank_transfer_account_note: "บัญชีแทน",
    telegram_bot_token: "",
    telegram_chat_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_BASE_URL}/api/admin-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("admin_token");
        window.location.reload();
        return;
      }
      if (data.success && data.data) {
        setSettings((prev) => ({ ...prev, ...data.data }));
        setSecretConfigured(data.secretConfigured || {});
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
      const res = await fetch(`${API_BASE_URL}/api/admin-settings`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin-test-telegram`, {
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
            <svg style={{ width: 24, height: 24, flex: '0 0 auto' }} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.25-5.58 3.68-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.41-1.43-.87.03-.24.34-.49.92-.75 3.62-1.58 6.04-2.62 7.25-3.13 3.45-1.45 4.16-1.7 4.63-1.71.1 0 .34.02.48.13.12.09.15.22.16.32-.01.07-.01.19-.02.24z"/></svg>
            ระบบแจ้งเตือน Telegram
          </h3>
          <p className="text-sm text-gray-400 mb-4">รับการแจ้งเตือนทันทีเมื่อมีออเดอร์ใหม่</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bot Token</label>
              <input
                type="password"
                name="telegram_bot_token"
                value={settings.telegram_bot_token}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder={secretConfigured.telegram_bot_token ? "ตั้งค่าแล้ว กรอกใหม่เมื่อต้องการเปลี่ยน" : "กรอก Bot Token"}
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
              <svg style={{ width: 16, height: 16, flex: '0 0 auto' }} fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              ทดสอบส่งข้อความเข้ามือถือ
            </button>
          </div>
        </div>

        {/* SlipOK Settings */}
        <div className="bg-dark-paper rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-accent mb-4 flex items-center gap-2">
            <svg style={{ width: 24, height: 24, flex: '0 0 auto' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ระบบเช็คสลิป SlipOK
          </h3>
          <p className="text-sm text-gray-400 mb-4">ตรวจสลิปโอนเงินอัตโนมัติป้องกันสลิปปลอม</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
              <input
                type="password"
                name="slipok_api_key"
                value={settings.slipok_api_key}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder={secretConfigured.slipok_api_key ? "ตั้งค่าแล้ว กรอกใหม่เมื่อต้องการเปลี่ยน" : "กรอก SlipOK API Key"}
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

        {/* Payment Settings */}
        <div className="bg-dark-paper rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-primary mb-4">PromptPay Payment</h3>
          <p className="text-sm text-gray-400 mb-4">ตั้งค่าเลขพร้อมเพย์สำหรับสร้าง QR โอนเงิน หากเว้นว่าง ระบบจะให้ลูกค้าโอนยอดและแนบสลิปแทน</p>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">PromptPay ID</label>
            <input
              type="text"
              name="promptpay_id"
              value={settings.promptpay_id}
              onChange={handleChange}
              className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              placeholder="เบอร์พร้อมเพย์ 10 หลัก หรือเลขประจำตัวผู้เสียภาษี"
            />
          </div>
        </div>

        {/* Bank Transfer Settings */}
        <div className="bg-dark-paper rounded-xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-accent mb-4">บัญชีโอนเงินสำรอง</h3>
          <p className="text-sm text-gray-400 mb-4">ใช้แสดงในหน้า Checkout เมื่อยังไม่ได้ตั้ง PromptPay หรือ QR ไม่พร้อมใช้งาน</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ธนาคาร</label>
              <input
                type="text"
                name="bank_transfer_bank_name"
                value={settings.bank_transfer_bank_name}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="เช่น ธนาคารกสิกรไทย"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">เลขบัญชี</label>
              <input
                type="text"
                name="bank_transfer_account_number"
                value={settings.bank_transfer_account_number}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="เช่น 1341058186"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ชื่อบัญชี</label>
              <input
                type="text"
                name="bank_transfer_account_name"
                value={settings.bank_transfer_account_name}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="ชื่อเจ้าของบัญชี"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">หมายเหตุ</label>
              <input
                type="text"
                name="bank_transfer_account_note"
                value={settings.bank_transfer_account_note}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
                placeholder="เช่น บัญชีแทน"
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
