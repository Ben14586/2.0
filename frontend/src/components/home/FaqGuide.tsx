import React, { useState } from 'react';

interface FaqItem {
  question: string;
  answer: string;
  icon: string;
}

const faqItems: FaqItem[] = [
  {
    question: 'สั่งซื้อแพ็กเกจเกมอย่างไร?',
    answer: '1. เลือกเกมที่ต้องการจากหน้าหลัก\n2. เลือกแพ็กเกจที่ต้องการสั่งซื้อ\n3. กรอกข้อมูลสำหรับล็อกอินเข้าเกม (ตามประเภทที่คุณใช้ล็อกอินจริง)\n4. ชำระเงินผ่าน QR PromptPay แล้วอัปโหลดสลิป\n5. แอดมินจะดำเนินการเติมให้ภายใน 15–30 นาที',
    icon: '🛒'
  },
  {
    question: 'ต้องเล่นเกมถึงไหนก่อนสั่งซื้อ?',
    answer: '⚠️ สำคัญมาก! คุณต้องเล่นเกมจนผ่าน "บทสอน (Tutorial)" หรือจนกว่าจะ "ปลดล็อคร้านค้า (Shop)" ภายในเกมก่อน เพราะแอดมินต้องเข้าไปที่ร้านค้าในเกมเพื่อเติมแพ็กเกจให้คุณ ถ้ายังไม่ปลดล็อค แอดมินจะเข้าไปซื้อให้ไม่ได้\n\n📌 เกมแต่ละเกมมีจุดปลดล็อคร้านค้าไม่เหมือนกัน โดยทั่วไปจะอยู่ประมาณ "ด่าน 1-5" หรือ "เลเวล 5–10" ขึ้นอยู่กับตัวเกม',
    icon: '🎮'
  },
  {
    question: 'ประเภทการล็อกอินคืออะไร? ต้องเลือกอย่างไร?',
    answer: 'ให้เลือกตามวิธีที่คุณใช้ล็อกอินเข้าเกมจริงๆ ครับ:\n\n• Gmail (Google) — ถ้าตอนเข้าเกมครั้งแรกกด "ล็อกอินด้วย Google" ให้เลือกอันนี้\n• Facebook — ถ้าใช้ Facebook ล็อกอิน\n• X (Twitter) — ถ้าผูกบัญชี Twitter/X\n• ID/Password ทั่วไป — ถ้าเกมให้สมัครไอดีกับรหัสผ่านเอง\n• UID — ถ้าเกมใช้แค่หมายเลข UID ไม่ต้องใส่รหัสผ่าน (เช่น บางเกมให้เฉพาะรหัส UID + เลือก Server)',
    icon: '🔐'
  },
  {
    question: 'รหัสสำรอง 8 หลัก (Backup Code) คืออะไร? ทำไมต้องใส่?',
    answer: 'ถ้าคุณเลือกล็อกอินด้วย Gmail/Google และเปิดใช้ "การยืนยันแบบ 2 ขั้นตอน (2FA)" ไว้ ทุกครั้งที่ล็อกอินจะต้องกดยืนยันในมือถือของคุณ\n\nปัญหาคือ: เวลาแอดมินล็อกอินเข้าเกมแทนคุณ คุณจะต้องนั่งรอกดยืนยันให้ ซึ่งไม่สะดวกทั้งสองฝ่าย\n\n💡 ทางออก: ใส่ "รหัสสำรอง 8 หลัก" (Backup Code) ไว้ แอดมินจะใช้รหัสนี้ล็อกอินได้ทันทีโดยไม่ต้องรบกวนคุณกดยืนยัน!\n\nรหัสสำรอง 1 ชุดใช้ได้ครั้งเดียว ดังนั้นควรใส่มาอย่างน้อย 2 รหัส (คั่นด้วยจุลภาค)',
    icon: '🛡️'
  },
  {
    question: 'วิธีหารหัสสำรอง 8 หลัก (Backup Code) ทำอย่างไร?',
    answer: '📱 สำหรับ Android:\n1. เปิด "การตั้งค่า (Settings)" ในมือถือ\n2. แตะ "Google"\n3. แตะ "จัดการบัญชี Google"\n4. เลือกแถบ "ความปลอดภัย"\n5. เลื่อนลงหา "การยืนยันแบบ 2 ขั้นตอน" แล้วแตะเข้าไป\n6. เลื่อนลงหา "รหัสสำรอง" แล้วแตะ\n7. คุณจะเห็นรหัส 8 หลัก จำนวน 10 รหัส → คัดลอกมา 2-3 รหัส\n\n🍎 สำหรับ iOS (iPhone/iPad):\n1. เปิดแอป "Gmail" หรือ "Google"\n2. แตะรูปโปรไฟล์มุมขวาบน\n3. แตะ "จัดการบัญชี Google"\n4. เลือกแถบ "ความปลอดภัย"\n5. เลื่อนลงหา "การยืนยันแบบ 2 ขั้นตอน" แล้วแตะเข้าไป\n6. เลื่อนลงหา "รหัสสำรอง" แล้วแตะ\n7. คัดลอกรหัส 8 หลักมา 2-3 รหัส',
    icon: '📲'
  },
  {
    question: 'ชำระเงินช่องทางไหนได้บ้าง?',
    answer: 'ปัจจุบันรองรับการชำระเงินผ่าน QR PromptPay (พร้อมเพย์) เท่านั้นครับ\n\nขั้นตอน:\n1. ระบบจะสร้าง QR Code ให้อัตโนมัติตามยอดเงิน\n2. เปิดแอปธนาคารบนมือถือ → สแกน QR → โอนเงิน\n3. ถ่ายหน้าจอสลิป หรือดาวน์โหลดสลิป\n4. อัปโหลดสลิปในหน้าสั่งซื้อ → ระบบจะตรวจสอบสลิปอัตโนมัติ',
    icon: '💳'
  },
  {
    question: 'ใช้เวลาเติมนานแค่ไหน?',
    answer: 'โดยปกติแอดมินจะดำเนินการเติมให้ภายใน 15–30 นาที (ในเวลาทำการ)\n\nช่วงเวลาทำการ: 09:00 – 24:00 น. ทุกวัน\n\nหากสั่งซื้อนอกเวลาทำการ แอดมินจะดำเนินการให้ในวันถัดไปครับ\n\n📌 สามารถเช็คสถานะออเดอร์ได้ตลอดเวลาที่หน้าเว็บ โดยใส่รหัสออเดอร์ที่ได้รับ',
    icon: '⏱️'
  },
  {
    question: 'ข้อมูลล็อกอิน/รหัสผ่านของผมปลอดภัยไหม?',
    answer: 'เราให้ความสำคัญกับความปลอดภัยของข้อมูลลูกค้าเป็นอย่างยิ่งครับ:\n\n🔒 รหัสผ่านถูกเข้ารหัส (Encrypted) ก่อนส่งและจัดเก็บ\n🔒 ข้อมูลถูกลบออกจากระบบหลังดำเนินการเสร็จสิ้นภายใน 24 ชม.\n🔒 แอดมินจะใช้ข้อมูลเฉพาะเพื่อล็อกอินเข้าเกมเติมแพ็กเกจให้เท่านั้น\n🔒 แนะนำให้เปลี่ยนรหัสผ่านหลังได้รับแพ็กเกจเรียบร้อยแล้ว',
    icon: '🔒'
  },
  {
    question: 'ถ้าเกิดปัญหาหลังเติม ทำอย่างไร?',
    answer: 'ทุกแพ็กเกจมีการรับประกัน 7 วัน หากเกิดปัญหาหลังเติม:\n\n1. ตรวจสอบสถานะออเดอร์ที่หน้าเว็บ หากมีหมายเหตุจากแอดมินให้อ่านก่อน\n2. ติดต่อแอดมินผ่านช่องทาง LINE หรือ Facebook ที่ระบุไว้\n3. แจ้งรหัสออเดอร์และอธิบายปัญหาที่เจอ\n\nแอดมินจะตรวจสอบและแก้ไขให้โดยเร็วที่สุดครับ',
    icon: '🆘'
  },
  {
    question: 'มีคูปองส่วนลดไหม?',
    answer: 'มีครับ! ระบบรองรับคูปองส่วนลดสำหรับลูกค้า\n\n• คูปองจะประกาศแจกเป็นครั้งคราวผ่านทาง Social Media และ LINE\n• ใส่รหัสคูปองในช่อง "คูปองส่วนลด" ตอนสั่งซื้อ ระบบจะคำนวณส่วนลดให้อัตโนมัติ\n• ลูกค้าที่สมัครสมาชิกจะได้รับแต้มสะสมทุกครั้งที่สั่งซื้อ สามารถใช้แลกส่วนลดได้ในอนาคต',
    icon: '🎁'
  }
];

const gameGuides = [
  {
    category: 'Tower Defense (TD)',
    games: [
      { name: 'Idle Hero TD', note: 'เล่นผ่านด่าน 1-3 จะปลดล็อคร้านค้าอัตโนมัติ' },
      { name: 'STICKMAN DEFENSE TD', note: 'จบบทสอน Tutorial → ร้านค้าจะเปิดให้ใช้งาน' },
      { name: 'SLIME CASTLE TD', note: 'ผ่านด่าน 1-5 ร้านค้าจะปลดล็อค' },
      { name: 'DRAGON FEVER TD', note: 'เล่นจนจบ Tutorial แรก → ร้านค้าปลดล็อค' },
      { name: 'TINY WARRIORS RUSH TD', note: 'ผ่านด่าน 1-3 → ร้านค้าปลดล็อคอัตโนมัติ' },
      { name: 'PUNKO.IO TD', note: 'จบ Tutorial → ร้านค้าปลดล็อค' },
      { name: 'SURVIVAL ARENA TD', note: 'ผ่านด่าน 1-5 → ร้านค้าเปิดใช้งาน' },
      { name: 'RAID RUSH : Tower Defense TD', note: 'เล่นผ่าน Tutorial ด่านแรก → ร้านค้าปลดล็อค' },
      { name: 'Samkok Heroes TD', note: 'จบบทสอน → ร้านค้าเปิดให้ใช้งาน' },
    ]
  },
  {
    category: 'Idle RPG',
    games: [
      { name: 'Lighting Princess: Idle RPG', note: 'ผ่านด่านที่ 1-5 หรือถึง Level 10 → ร้านค้าปลดล็อค' },
      { name: 'Shadow Knight : Idle RPG', note: 'เล่นจบ Tutorial → ร้านค้าเปิดอัตโนมัติ' },
      { name: 'Idle Hunter: Eternal Soul RPG', note: 'จบบทสอน → ร้านค้าปลดล็อค' },
      { name: 'Legend of Slime : Idle RPG', note: 'ผ่านด่าน 1-10 → ร้านค้าปลดล็อค' },
      { name: 'Legend of Witch : Idle RPG', note: 'เล่นจบ Tutorial → ร้านค้าเปิดให้ใช้งาน' },
      { name: 'Bullet Heroes RPG', note: 'จบบทสอน → ร้านค้าปลดล็อค' },
    ]
  },
  {
    category: 'อื่นๆ',
    games: [
      { name: 'Claw Master - RogueLike', note: 'เล่นจบ Tutorial → ร้านค้าเปิดใช้งาน' },
    ]
  }
];

export function FaqGuide() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'faq' | 'guide'>('faq');

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="section" style={{ marginTop: '40px', marginBottom: '40px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p className="eyebrow" style={{ fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '12px', fontWeight: 600 }}>Help Center</p>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', marginBottom: '8px' }}>คำถามที่พบบ่อย & คู่มือ</h2>
        <p style={{ fontSize: '1rem', color: 'var(--muted)', maxWidth: '500px', margin: '0 auto' }}>ข้อมูลทุกอย่างที่คุณต้องรู้ก่อนสั่งซื้อ</p>
      </div>

      {/* Tab Switch */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('faq')}
          style={{
            padding: '10px 24px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.3s ease',
            background: activeTab === 'faq' ? 'linear-gradient(135deg, #d8b7a0, #8d6e63)' : 'rgba(255,255,255,0.7)',
            color: activeTab === 'faq' ? 'white' : 'var(--muted)',
            boxShadow: activeTab === 'faq' ? '0 4px 15px rgba(141, 110, 99, 0.3)' : 'none',
          }}
        >
          ❓ คำถามที่พบบ่อย
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          style={{
            padding: '10px 24px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.3s ease',
            background: activeTab === 'guide' ? 'linear-gradient(135deg, #d8b7a0, #8d6e63)' : 'rgba(255,255,255,0.7)',
            color: activeTab === 'guide' ? 'white' : 'var(--muted)',
            boxShadow: activeTab === 'guide' ? '0 4px 15px rgba(141, 110, 99, 0.3)' : 'none',
          }}
        >
          📖 คู่มือเตรียมตัวแต่ละเกม
        </button>
      </div>

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '8px', overflow: 'hidden' }}>
          {faqItems.map((item, index) => (
            <div key={index} style={{ borderBottom: index < faqItems.length - 1 ? '1px solid rgba(141,110,99,0.1)' : 'none' }}>
              <button
                onClick={() => toggle(index)}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  background: openIndex === index ? 'rgba(216, 183, 160, 0.08)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  textAlign: 'left',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={e => { if (openIndex !== index) e.currentTarget.style.background = 'rgba(216, 183, 160, 0.05)'; }}
                onMouseLeave={e => { if (openIndex !== index) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: 'var(--text)', lineHeight: 1.4 }}>{item.question}</span>
                <span style={{
                  fontSize: '18px',
                  color: 'var(--muted)',
                  transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease',
                  flexShrink: 0,
                }}>▼</span>
              </button>

              <div style={{
                maxHeight: openIndex === index ? '600px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.4s ease',
              }}>
                <div style={{ padding: '0 20px 20px 58px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.7 }}>
                  {item.answer.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < item.answer.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game Guide Tab */}
      {activeTab === 'guide' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Important Notice */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid #ffc107', background: 'rgba(255, 193, 7, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text)' }}>สิ่งที่ต้องทำก่อนสั่งซื้อทุกเกม</h3>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  กรุณาเล่นเกมจนจบ <strong>"บทสอน (Tutorial)"</strong> หรือจนกว่าจะ <strong>"ปลดล็อคร้านค้า (Shop)"</strong> ก่อนสั่งซื้อ 
                  เพื่อให้แอดมินสามารถเข้าไปเติมแพ็กเกจให้คุณได้ หากยังไม่ปลดล็อค แอดมินจะเข้าไปซื้อให้ไม่ได้ 
                  และจะต้องส่งคืนเงินกลับซึ่งใช้เวลานานกว่า
                </p>
              </div>
            </div>
          </div>

          {/* Game List by Category */}
          {gameGuides.map((category, catIndex) => (
            <div key={catIndex} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #d8b7a0, #8d6e63)', display: 'inline-block' }}></span>
                {category.category}
              </h3>
              <div className="glass-card" style={{ padding: '4px', overflow: 'hidden' }}>
                {category.games.map((game, gameIndex) => (
                  <div
                    key={gameIndex}
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      borderBottom: gameIndex < category.games.length - 1 ? '1px solid rgba(141,110,99,0.08)' : 'none',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(216, 183, 160, 0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>🎮</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>{game.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                        📌 {game.note}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      background: 'rgba(76, 175, 80, 0.1)',
                      color: '#4caf50',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}>
                      ✓ พร้อมสั่งซื้อ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Login Type Guide */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #d8b7a0, #8d6e63)', display: 'inline-block' }}></span>
              วิธีดูว่าเกมล็อกอินด้วยอะไร
            </h3>
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { type: 'Gmail (Google)', icon: '📧', desc: 'ถ้าตอนเปิดเกมครั้งแรกระบบให้กด "Sign in with Google" หรือ "ล็อกอินด้วย Google" แสดงว่าคุณใช้ Gmail ล็อกอิน', color: '#ea4335' },
                  { type: 'Facebook', icon: '📘', desc: 'ถ้ากด "Login with Facebook" หรือ "ล็อกอินด้วย Facebook" แสดงว่าใช้ Facebook', color: '#1877f2' },
                  { type: 'X (Twitter)', icon: '🐦', desc: 'ถ้าผูกบัญชี X/Twitter ไว้ในเกม', color: '#1da1f2' },
                  { type: 'ID / Password ทั่วไป', icon: '🔑', desc: 'ถ้าเกมให้สมัครไอดีกับรหัสผ่านเอง (ไม่ได้ผ่าน Social Media)', color: '#ff9800' },
                  { type: 'UID เท่านั้น', icon: '🆔', desc: 'บางเกมใช้แค่หมายเลข UID + เลือก Server โดยไม่ต้องใส่รหัสผ่าน (ดูได้จากหน้า Profile ในเกม)', color: '#9c27b0' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px', flexShrink: 0,
                      background: `${item.color}15`,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>{item.type}</div>
                      <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
