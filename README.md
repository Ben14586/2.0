# Game Services Web

เว็บบริการเกมพร้อมระบบสั่งซื้อ ติดตามออเดอร์ ตรวจสลิปเบื้องต้น หน้าแอดมิน และชุด deploy สำหรับ Netlify + Python backend

## โครงสร้างหลัก

- `server.py` - Python backend + SQLite + API + static export
- `index.html` - หน้าเว็บลูกค้าและ order flow หลัก
- `admin.html` - หน้าแอดมินจัดการเกม แพ็ก ออเดอร์ รูป และ backup
- `components/` - React/shadcn-style UI blocks
- `frontend/entry.tsx` - React island สำหรับ section upgrade
- `frontend/styles/theme.css` - stylesheet หลักของเว็บเดิม
- `tools/` - QA, smoke test, export, package, configure backend
- `docs/` - production runbook และ phase checklist

## คำสั่งสำคัญ

```bash
npm install
npm run build
npm run export:static
npm run qa
npm run smoke
```

รัน local:

```bash
python server.py
```

เปิด:

- หน้าเว็บ: `http://127.0.0.1:3000/`
- แอดมิน: `http://127.0.0.1:3000/admin.html`
- Health: `http://127.0.0.1:3000/health`

## Deploy

Frontend Netlify:

```bash
npm run export:static
```

อัปโหลด `netlify-deploy-latest.zip`

Backend:

```bash
npm run package:backend
```

อัปโหลด `backend-deploy-latest.zip` หรือ deploy repo ไป Render/Railway

หลังได้ backend URL:

```bash
npm run configure:backend -- https://your-backend-host.example.com
```

## Production Checks

```bash
npm run phase3:build
npm run phase4:uat
```

สร้างออเดอร์ทดสอบจริง:

```bash
npm run phase4:uat:create
```

## Environment

ดู `.env.example` และ `production.env.example`

ค่าหลัก:

```env
PUBLIC_SITE_URL=https://game-services-hwcy.onrender.com
PUBLIC_API_BASE_URL=https://game-services-hwcy.onrender.com
ALLOWED_ORIGINS=https://game-services-hwcy.onrender.com
COOKIE_SECURE=1
COOKIE_SAMESITE=None
```

## Security Notes

- อย่าอัป `.env`, `database.db`, `uploads/` เข้า public repo
- เปลี่ยน `ADMIN_BOOTSTRAP_PASSWORD` ก่อน deploy จริง
- จำกัด `ALLOWED_ORIGINS` ให้เป็นโดเมนเว็บจริงเท่านั้น
- ดาวน์โหลด backup จากหน้า admin ก่อนเปิดรับลูกค้าจริง
