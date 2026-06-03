# 🔔 น้องออม — Push Server (Node + web-push)

เซิร์ฟเวอร์นี้ทำให้แอพ **เด้งแจ้งเตือนได้แม้ปิดแอพสนิท** (Web Push จริง) โดยไม่ต้องเปิดแอพค้างไว้

## ทำงานยังไง

1. เซิร์ฟเวอร์ **เสิร์ฟตัวแอพ** (โฟลเดอร์ `..`) + มี API `/api/*` อยู่ origin เดียวกัน
2. ตอนเปิดแอพ ถ้าเจอ `/api/vapidPublicKey` → แอพจะ **สมัคร push อัตโนมัติ** เมื่อกด "เปิดการแจ้งเตือน"
3. แอพส่งตารางเตือน (ชื่อรายการ + ยอด + วันเวลา) มาเก็บที่เซิร์ฟเวอร์
4. เซิร์ฟเวอร์มีตัวจับเวลา เช็คทุก 1 นาที พอถึงเวลาก็ **ส่ง push** ออกไป → เด้งที่เครื่องผู้ใช้แม้ปิดแอพ

> VAPID keys สร้างอัตโนมัติครั้งแรก เก็บไว้ที่ `data/vapid.json` (อย่าลบ ไม่งั้น subscription เดิมใช้ไม่ได้)

## วิธีรัน

```bash
cd server
npm install
npm start
# เปิด http://localhost:4173  (เสิร์ฟทั้งแอพ + push API)
```

จากนั้นเปิดแอพที่ `http://localhost:4173` → ตั้งค่า → **เปิดการแจ้งเตือน** → อนุญาต
สถานะจะขึ้นว่า **"เปิดอยู่ · Push เซิร์ฟเวอร์ (เด้งแม้ปิดแอพ)"**

## ทดสอบ

```bash
curl http://localhost:4173/api/health
curl http://localhost:4173/api/vapidPublicKey
```

## API

| Method | Path | ใช้ทำอะไร |
|--------|------|-----------|
| GET | `/api/vapidPublicKey` | ส่ง VAPID public key ให้แอพ |
| POST | `/api/subscribe` | บันทึก subscription + ตารางเตือน `{subscription, reminders}` |
| POST | `/api/unsubscribe` | ลบ subscription `{endpoint}` |
| POST | `/api/test` | ส่ง push ทดสอบทันที `{subscription}` |
| GET | `/api/health` | เช็คสถานะ + จำนวนผู้สมัคร |

## เอาขึ้นจริง (production)

- ต้องเป็น **HTTPS** (Web Push / Service Worker บังคับ) — deploy บน VPS, Render, Railway, Fly.io ฯลฯ
- ใช้ฐานข้อมูลจริง (เช่น SQLite/Postgres) แทนไฟล์ JSON ถ้ามีผู้ใช้เยอะ
- บน **iPhone** ต้องติดตั้งแอพเป็น PWA ลงหน้าจอโฮมก่อน (iOS 16.4+) push จึงทำงาน
- ตั้ง cron/long-running process ให้เซิร์ฟเวอร์รันตลอด เพื่อให้ตัวจับเวลาส่ง push ได้ตรงเวลา

## ไฟล์ข้อมูล (ไม่ควร commit ขึ้น git)

```
server/data/vapid.json          ← VAPID keys
server/data/subscriptions.json  ← subscriptions + reminders
```
