# 🚀 คู่มืออัปแอพขึ้นเว็บ (แบบมี Push จริง — เด้งแม้ปิดแอพ)

แอพนี้มี 2 ส่วนในที่เดียว: **ตัวแอพ (static)** + **เซิร์ฟเวอร์ push (Node)**
เซิร์ฟเวอร์ `server/push-server.js` จะเสิร์ฟตัวแอพให้ด้วย ดังนั้น deploy แค่ที่เดียวจบ

> เป้าหมาย: ได้ลิงก์ `https://...` ที่เปิดบนมือถือ → ติดตั้งเป็นแอพ → เด้งเตือนรอบชำระแม้ปิดแอพ

---

## 🧰 สิ่งที่ต้องมี (ครั้งเดียว)

1. **บัญชี GitHub** — สมัครฟรีที่ https://github.com
2. **บัญชี Render** — สมัครฟรีที่ https://render.com (เข้าด้วย GitHub ได้ ไม่ต้องใช้บัตร)
3. **Git บนเครื่อง** — ติดตั้งจาก https://git-scm.com/download/win (ถัดไปรัวๆ จนจบ)
   ตรวจว่าติดตั้งแล้ว เปิด PowerShell พิมพ์: `git --version`

🔑 **VAPID keys ของคุณ** (สร้างไว้แล้ว — เก็บไว้ดีๆ ใช้ตอนตั้งค่า Render):
```
VAPID_PUBLIC_KEY=BMCMA4RHs2h32Ga0gXQe8CM7sN6Aj5C3yCR_L295dCjtTH25TPaaTtgk93HGlpssklydJQFaOEnI3HU-lZrhorU
VAPID_PRIVATE_KEY=5cOM7WofD_9A4BNROJo7eL1u2fj0F1yvxU1jyTiPQEk
```
> สร้างใหม่ได้เสมอด้วย: `cd server` แล้ว `node -e "console.log(require('web-push').generateVAPIDKeys())"`

---

## ขั้นที่ 1️⃣ เอาโค้ดขึ้น GitHub

### 1.1 สร้าง repo เปล่าบน GitHub
- ไปที่ https://github.com/new
- Repository name: `oommoney` (หรือชื่ออื่น)
- เลือก **Private** ก็ได้ → กด **Create repository**
- จะเห็นลิงก์ เช่น `https://github.com/ชื่อคุณ/oommoney.git` (คัดลอกไว้)

### 1.2 push โค้ดขึ้นไป
เปิด **PowerShell** ในโฟลเดอร์แอพ แล้วรันทีละบรรทัด
(เปลี่ยน URL เป็นของคุณ):

```powershell
cd "C:\Users\Artem\Downloads\my money"
git init
git add .
git commit -m "น้องออม money coach"
git branch -M main
git remote add origin https://github.com/ชื่อคุณ/oommoney.git
git push -u origin main
```

- ครั้งแรก Git จะเด้งหน้าต่างให้ **ล็อกอิน GitHub** → ล็อกอินผ่านเบราว์เซอร์ให้เรียบร้อย
- เสร็จแล้วรีเฟรชหน้า GitHub จะเห็นไฟล์ทั้งหมด (มี `index.html`, โฟลเดอร์ `server/` ฯลฯ)

> ✅ ไฟล์ลับ (`server/data/`) ไม่ถูกอัปขึ้นเพราะมี `.gitignore` คุมไว้แล้ว

---

## ขั้นที่ 2️⃣ Deploy บน Render

### วิธี A — Blueprint (ง่ายสุด มี `render.yaml` ให้แล้ว)
1. ไปที่ https://dashboard.render.com → **New +** → **Blueprint**
2. เลือก repo `oommoney` → Render อ่าน `render.yaml` เอง
3. มันจะถามค่า **Environment Variables** 3 ตัว → กรอก:
   - `VAPID_PUBLIC_KEY` = (ค่า public ด้านบน)
   - `VAPID_PRIVATE_KEY` = (ค่า private ด้านบน)
   - `VAPID_CONTACT` = `mailto:อีเมลคุณ`
4. กด **Apply** → รอ build ~2-3 นาที

### วิธี B — ตั้งเองทีละช่อง (ถ้าวิธี A มีปัญหา)
1. **New +** → **Web Service** → เลือก repo `oommoney`
2. ตั้งค่า:
   | ช่อง | ใส่ |
   |------|-----|
   | Root Directory | `server` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `node push-server.js` |
   | Instance Type | Free |
3. กด **Advanced** → **Add Environment Variable** ใส่ 3 ตัวข้างบน (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_CONTACT)
4. กด **Create Web Service** → รอ build

เสร็จแล้วจะได้ลิงก์ เช่น **`https://oommoney.onrender.com`** 🎉
ลองเปิด `https://oommoney.onrender.com/api/health` ต้องเห็น `{"ok":true,...}`

---

## ขั้นที่ 3️⃣ ติดตั้งบนมือถือ + เปิดแจ้งเตือน

1. เปิดลิงก์ Render บน **Safari (iPhone)** หรือ **Chrome (Android)**
2. **ติดตั้งเป็นแอพ:**
   - iPhone: ปุ่ม **แชร์** → **เพิ่มลงในหน้าจอโฮม**
   - Android: เมนู ⋮ → **ติดตั้งแอป / Add to Home screen**
3. เปิดแอพจากไอคอนบนหน้าจอ → **ตั้งค่า** → **เปิดการแจ้งเตือน** → อนุญาต
4. ถ้าขึ้นว่า **"เปิดอยู่ · Push เซิร์ฟเวอร์ (เด้งแม้ปิดแอพ)"** = สำเร็จ! 🥳
5. กด **ทดสอบแจ้งเตือน** ดูได้เลย

> 📱 **iPhone สำคัญ:** ต้อง "เพิ่มลงในหน้าจอโฮม" ก่อน แล้วเปิดจากไอคอนนั้น (ไม่ใช่จาก Safari) push จึงจะทำงาน — รองรับ iOS 16.4 ขึ้นไป

---

## ⚠️ ข้อจำกัดของ Render ฟรี (ต้องรู้)

Render ฟรีจะ **"หลับ" หลังไม่มีคนเข้า 15 นาที** → ตัวจับเวลาส่ง push จะหยุด ทำให้ push อาจ **ดีเลย์/ไม่ตรงเวลา** และข้อมูล subscription อาจรีเซ็ตตอน redeploy

**แก้ให้ใช้งานจริงได้ เลือกทางใดทางหนึ่ง:**

- **ทางฟรี (พอใช้):** ตั้งตัวปิงปลุกทุก ~14 นาที
  - ไปที่ https://cron-job.org (ฟรี) → สร้าง cronjob ยิงไปที่ `https://oommoney.onrender.com/api/health` ทุก 14 นาที → เซิร์ฟเวอร์จะไม่หลับ
  - (VAPID เป็น env var แล้ว key จึงไม่หาย แต่ subscription ยังอาจรีเซ็ตตอน redeploy → แค่กดเปิดแจ้งเตือนใหม่)

- **ทางเสถียรจริง (แนะนำถ้าใช้จริงจัง):**
  - Render: อัปเกรดเป็น **Starter ($7/เดือน)** + เพิ่ม **Disk** mount ที่ `/opt/render/project/src/server/data` → รัน 24/7 + ข้อมูลไม่หาย
  - หรือใช้ **Railway** (ดูด้านล่าง) — always-on + volume ง่ายกว่า

---

## 🚄 ทางเลือก: Railway (always-on, ข้อมูลไม่หาย)

> ต้องผูกบัตร แต่มีเครดิตเริ่มต้นให้ลอง ~$5/เดือนสำหรับ hobby

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → เลือก `oommoney`
2. เข้า service → **Settings**:
   - Root Directory: `server`
   - Start Command: `node push-server.js`
3. **Variables** → เพิ่ม `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`
4. **Volumes** → Add Volume → Mount path: `/app/server/data` (กันข้อมูลหาย)
5. **Settings → Networking → Generate Domain** → ได้ลิงก์ https ใช้งานได้เลย

---

## 🔄 อัปเดตแอพในอนาคต

แก้โค้ดในเครื่องแล้วแค่:
```powershell
cd "C:\Users\Artem\Downloads\my money"
git add .
git commit -m "อัปเดต ..."
git push
```
Render/Railway จะ **deploy ใหม่ให้อัตโนมัติ** ทุกครั้งที่ push 🎉

---

## 🆘 แก้ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|-------|--------|
| `git push` ขึ้น error เรื่อง auth | ล็อกอิน GitHub ในหน้าต่างที่เด้งมา หรือสร้าง Personal Access Token |
| เปิดเว็บแล้วขาว/Not found | เช็คว่า Root Directory = `server` และ build เสร็จไม่มี error ใน Logs |
| ตั้งค่าแล้วไม่ขึ้น "Push เซิร์ฟเวอร์" | ต้องเป็น https + (iPhone) ติดตั้งลงหน้าจอก่อน + เช็ค `/api/vapidPublicKey` ว่ามีค่า |
| Push ไม่เด้งตอนปิดแอพ | Render ฟรีหลับอยู่ → ตั้ง cron-job.org ปลุก หรืออัปเกรด/ย้าย Railway |
| ดูปัญหาเซิร์ฟเวอร์ | Render → service → **Logs** |
