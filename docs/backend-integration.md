# 3. Backend & Integration

## Form To Chat / Webhook Flow

เมื่อลูกค้าเลือกแพ็คและกด:

```text
ยืนยันการสั่งซื้อและทักแชท
```

ระบบควรสร้างข้อความอัตโนมัติ:

```text
สนใจบริการเกม
เกม: Primitive Brothers : Idle Game
แพ็คเกจ: Starter Boost
รายละเอียด: เพชร/เงิน/VIP 2,000M B
ราคา: 150 บาท
ระบบ: iOS
รับประกัน: 7 วัน
หมายเหตุ: ลูกค้าส่งข้อมูลจากหน้าเว็บไซต์
```

## Chat Destinations

- LINE Official Account
- Facebook Messenger
- Webhook หลังบ้าน

## API Structure

```text
/api
  GET /games
  GET /games/:slug
  GET /packages?gameId=
  POST /leads
  POST /webhooks/line
  POST /webhooks/facebook
```

## Admin Structure

```text
/admin
  Login
  Manage Games
  Manage Packages
  Manage Categories
  Manage Leads
  Toggle game active/inactive
  Edit price
  Edit warranty text
```

