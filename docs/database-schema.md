# 4. Database Schema

## Core Tables

### categories

เก็บหมวดหมู่เกม เช่น Idle, RPG, Mobile

### games

เก็บรายชื่อเกมทั้งหมด ราคาเริ่มต้น รูปภาพ ระบบที่รองรับ และข้อความรับประกัน

### packages

เก็บแพ็คเกจของแต่ละเกม เช่น Starter Boost, Auto Pack, Buff Pack

### leads

เก็บข้อมูลลูกค้าที่กดทักแชทจากเว็บ เพื่อให้แอดมินตามต่อได้

## Scale Path

ระบบนี้สามารถต่อยอดเป็น:

- ระบบชำระเงิน
- สถานะออเดอร์
- Dashboard สำหรับแอดมิน
- Coupon / Promotion
- Tracking conversion
- Auto-notification เข้า LINE Notify, Discord, หรือ Slack

