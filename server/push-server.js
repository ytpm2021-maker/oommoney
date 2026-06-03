/* =====================================================================
   น้องออม · Money Coach — Web Push backend (Node + web-push)
   - Serves the PWA (../) so app + API share one origin
   - Auto-generates & persists VAPID keys on first run
   - Stores push subscriptions + scheduled reminders (JSON file)
   - A scheduler ticks every minute and sends due reminders as push
     → notifications arrive even when the app is fully CLOSED
   ===================================================================== */
const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const app = express();
const ROOT = path.join(__dirname, '..');         // the PWA folder
const DATA = path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });

const VAPID_FILE = path.join(DATA, 'vapid.json');
const SUBS_FILE = path.join(DATA, 'subscriptions.json');

// ---- VAPID keys ----
// Priority: env vars (best for cloud — survive restarts) > data/vapid.json > auto-generate
let vapid;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  console.log('🔑 Using VAPID keys from environment variables');
} else if (fs.existsSync(VAPID_FILE)) {
  vapid = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
  console.log('🔑 Loaded VAPID keys from data/vapid.json');
} else {
  vapid = webpush.generateVAPIDKeys();
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapid, null, 2));
  console.log('🔑 Generated new VAPID keys → data/vapid.json');
  console.log('   (ตอน deploy ขึ้นคลาวด์ ควรตั้งเป็น env var VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
}
const CONTACT = process.env.VAPID_CONTACT || 'mailto:admin@oommoney.app';
webpush.setVapidDetails(CONTACT, vapid.publicKey, vapid.privateKey);

// ---- storage: { [endpoint]: { subscription, reminders:[{id,title,body,fireAt,sent}] } } ----
let store = {};
if (fs.existsSync(SUBS_FILE)) {
  try { store = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch (_) { store = {}; }
}
const persist = () => fs.writeFileSync(SUBS_FILE, JSON.stringify(store, null, 2));

// ---- middleware ----
app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT, { extensions: ['html'] }));

// ---- API ----
app.get('/api/vapidPublicKey', (req, res) => res.json({ publicKey: vapid.publicKey }));

app.post('/api/subscribe', (req, res) => {
  const { subscription, reminders } = req.body || {};
  if (!subscription || !subscription.endpoint) return res.status(400).json({ error: 'missing subscription' });
  store[subscription.endpoint] = {
    subscription,
    reminders: Array.isArray(reminders) ? reminders.map(r => ({ ...r, sent: false })) : []
  };
  persist();
  res.json({ ok: true, scheduled: store[subscription.endpoint].reminders.length });
});

app.post('/api/unsubscribe', (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint && store[endpoint]) { delete store[endpoint]; persist(); }
  res.json({ ok: true });
});

app.post('/api/test', async (req, res) => {
  const { subscription } = req.body || {};
  if (!subscription) return res.status(400).json({ error: 'missing subscription' });
  try {
    await webpush.sendNotification(subscription, JSON.stringify({
      title: '🌿 น้องออม (จากเซิร์ฟเวอร์)',
      body: 'ทดสอบ Web Push จากเซิร์ฟเวอร์สำเร็จ! แบบนี้เด้งได้แม้ปิดแอพน้า~'
    }));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message, statusCode: e.statusCode });
  }
});

app.get('/api/health', (req, res) =>
  res.json({ ok: true, subscribers: Object.keys(store).length }));

// ---- scheduler: send any reminder whose time has come ----
async function tick() {
  const now = Date.now();
  let changed = false;
  for (const ep of Object.keys(store)) {
    const rec = store[ep];
    for (const r of rec.reminders || []) {
      if (!r.sent && new Date(r.fireAt).getTime() <= now) {
        try {
          await webpush.sendNotification(rec.subscription, JSON.stringify({ title: r.title, body: r.body }));
          console.log('📨 sent:', r.title);
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) { // gone → drop subscription
            delete store[ep]; changed = true; break;
          }
        }
        r.sent = true; changed = true;
      }
    }
  }
  if (changed) persist();
}
setInterval(tick, 60 * 1000);

const PORT = process.env.PORT || 4173;
app.listen(PORT, () => {
  console.log('🌿 น้องออม push server → http://localhost:' + PORT);
  console.log('   เปิดแอพที่ลิงก์นี้ แล้วกด "เปิดการแจ้งเตือน" ในหน้าตั้งค่า');
});
