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
const crypto = require('crypto');

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

// ---- optional password gate (enable by setting APP_PASSWORD env var) ----
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const AUTH_TOKEN = APP_PASSWORD
  ? crypto.createHmac('sha256', APP_PASSWORD).update('oommoney-auth-v1').digest('hex')
  : '';
if (APP_PASSWORD) console.log('🔒 Password gate ENABLED'); else console.log('🔓 No APP_PASSWORD set — app is open');

function parseCookies(req){
  const out = {}; const h = req.headers.cookie || '';
  h.split(';').forEach(p => { const i = p.indexOf('='); if (i > -1) out[p.slice(0,i).trim()] = p.slice(i+1).trim(); });
  return out;
}
function isAuthed(req){ return !APP_PASSWORD || parseCookies(req).oom_auth === AUTH_TOKEN; }

function loginPage(){
  return `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"/>
<title>น้องออม · เข้าสู่ระบบ</title>
<meta name="theme-color" content="#7BD8A8"/>
<link rel="apple-touch-icon" href="icons/icon-180.png"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Itim&family=Mali:wght@400;600;700&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
body{margin:0;min-height:100dvh;display:grid;place-items:center;font-family:'Mali',sans-serif;color:#38554A;
 background:linear-gradient(165deg,#F1FBF6,#EAF4FF);padding:24px;}
.box{width:100%;max-width:340px;text-align:center;}
.coin{width:112px;height:112px;margin:0 auto 18px;position:relative;animation:bob 3s ease-in-out infinite;}
.coin .c{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 34% 30%,#C9F4DD,#7BD8A8 70%);
 border:5px solid #fff;box-shadow:inset 0 -8px 0 rgba(79,191,138,.28),0 10px 24px rgba(79,191,138,.25);}
.eye{position:absolute;top:40%;width:11px;height:13px;background:#38554A;border-radius:50%;}
.eye.l{left:32%;}.eye.r{right:32%;}
.blush{position:absolute;top:53%;width:14px;height:9px;background:#FF9FB6;border-radius:50%;opacity:.6;}
.blush.l{left:23%;}.blush.r{right:23%;}
.mouth{position:absolute;top:58%;left:50%;width:18px;height:10px;border:3px solid #38554A;border-top:none;
 border-radius:0 0 18px 18px;transform:translateX(-50%);}
.mood-sad .mouth{border-top:3px solid #38554A;border-bottom:none;border-radius:18px 18px 0 0;top:62%;height:8px;}
h1{font-family:'Itim';font-size:27px;margin:0 0 4px;}
p.sub{color:#7E988D;font-size:14px;font-weight:600;margin:0 0 22px;}
.inp{width:100%;padding:15px 18px;border:2px solid #E9F1ED;border-radius:18px;font-size:16px;font-family:'Mali';
 font-weight:600;color:#38554A;outline:none;text-align:center;background:#fff;transition:.2s;}
.inp:focus{border-color:#7BD8A8;box-shadow:0 0 0 4px #EAF9F1;}
.btn{width:100%;margin-top:14px;padding:16px;border:none;border-radius:18px;font-size:16px;font-weight:700;
 font-family:'Mali';color:#fff;background:linear-gradient(135deg,#7BD8A8,#4FBF8A);box-shadow:0 8px 22px rgba(79,191,138,.3);cursor:pointer;transition:transform .15s;}
.btn:active{transform:scale(.96);}
.err{color:#FF8B94;font-weight:700;font-size:13.5px;margin-top:14px;min-height:18px;}
@keyframes bob{0%,100%{transform:translateY(0) rotate(-2deg);}50%{transform:translateY(-8px) rotate(2deg);}}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-8px);}75%{transform:translateX(8px);}}
.shake{animation:shake .4s;}
</style></head><body>
<div class="box">
 <div class="coin" id="coin"><div class="c"></div><div class="eye l"></div><div class="eye r"></div>
  <div class="blush l"></div><div class="blush r"></div><div class="mouth"></div></div>
 <h1>น้องออม</h1>
 <p class="sub">ใส่รหัสผ่านเพื่อเข้าใช้งานน้า~ 🔐</p>
 <form id="f">
  <input class="inp" id="pw" type="password" placeholder="รหัสผ่าน" autocomplete="current-password" autofocus/>
  <button class="btn" type="submit">เข้าสู่ระบบ 🌿</button>
  <div class="err" id="err"></div>
 </form>
</div>
<script>
const f=document.getElementById('f'),pw=document.getElementById('pw'),err=document.getElementById('err'),coin=document.getElementById('coin');
f.addEventListener('submit',async function(e){
 e.preventDefault(); err.textContent='';
 try{
  const r=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw.value})});
  if(r.ok){ location.replace('/'); }
  else{ err.textContent='รหัสผ่านไม่ถูกต้องน้า~ ลองใหม่นะ'; coin.classList.add('mood-sad'); f.classList.add('shake'); setTimeout(function(){f.classList.remove('shake');},420); pw.select(); }
 }catch(_){ err.textContent='เชื่อมต่อไม่ได้ ลองใหม่อีกครั้งน้า'; }
});
pw.addEventListener('input',function(){coin.classList.remove('mood-sad');});
</script></body></html>`;
}
webpush.setVapidDetails(CONTACT, vapid.publicKey, vapid.privateKey);

// ---- storage: { [endpoint]: { subscription, reminders:[{id,title,body,fireAt,sent}] } } ----
let store = {};
if (fs.existsSync(SUBS_FILE)) {
  try { store = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8')); } catch (_) { store = {}; }
}
const persist = () => fs.writeFileSync(SUBS_FILE, JSON.stringify(store, null, 2));

// ---- cloud data store (Upstash Redis REST — enable via env vars) ----
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const CLOUD = !!(UPSTASH_URL && UPSTASH_TOKEN);
const STATE_KEY = 'oommoney:state';
if (CLOUD) console.log('☁️  Cloud sync ENABLED (Upstash Redis)'); else console.log('💾 Cloud sync off — using device storage only');
async function redis(cmd) {
  const r = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).result;
}

// ---- middleware ----
app.use(express.json({ limit: '2mb' }));

// login endpoint: correct password -> set a 30-day cookie
app.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (APP_PASSWORD && password === APP_PASSWORD) {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const secure = proto === 'https' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `oom_auth=${AUTH_TOKEN}; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax${secure}`);
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false });
});

// password gate (only active when APP_PASSWORD is set)
app.use((req, res, next) => {
  if (!APP_PASSWORD) return next();                       // gate disabled
  const p = req.path;
  if (p === '/login') return next();                     // login route
  if (p === '/api/health') return next();                // keep public for uptime pings
  if (p === '/manifest.json' || p === '/sw.js' || p === '/favicon.ico' || p.startsWith('/icons/')) return next();
  if (isAuthed(req)) return next();                       // already logged in
  if (p === '/' || p === '/index.html') return res.status(200).send(loginPage());
  if (p.startsWith('/api/')) return res.status(401).json({ error: 'unauthorized' });
  return res.status(200).send(loginPage());
});

app.use(express.static(ROOT, { extensions: ['html'] }));

// ---- API ----
app.get('/api/vapidPublicKey', (req, res) => res.json({ publicKey: vapid.publicKey }));

// cloud sync: load / save the whole app state (password-gated by the middleware above)
app.get('/api/cloud', (req, res) => res.json({ cloud: CLOUD }));
app.get('/api/state', async (req, res) => {
  if (!CLOUD) return res.json({ cloud: false, state: null });
  try {
    const v = await redis(['GET', STATE_KEY]);
    res.json({ cloud: true, state: v ? JSON.parse(v) : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/state', async (req, res) => {
  if (!CLOUD) return res.json({ cloud: false });
  try {
    await redis(['SET', STATE_KEY, JSON.stringify(req.body || {})]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
