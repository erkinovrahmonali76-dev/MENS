'use strict';
/**
 * ELITE MEN — erkaklar kiyim-kechak do'koni
 * Tashqi paketlar kerak emas: faqat Node.js (v18+) yetarli.
 * Ishga tushirish:  node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const RECEIPTS = path.join(DATA, 'receipts');
const DBF = path.join(DATA, 'db.json');
const PORT = Number(process.env.PORT) || 3000;

for (const d of [DATA, UPLOADS, RECEIPTS]) fs.mkdirSync(d, { recursive: true });

/* ---------------------------------------------------------------- helpers */
const rid = (n = 8) => crypto.randomBytes(n).toString('hex');
const now = () => new Date().toISOString();

function hashPw(pw, salt = rid(16)) {
  return { salt, hash: crypto.scryptSync(String(pw), salt, 64).toString('hex') };
}
function checkPw(pw, o) {
  if (!o || !o.salt || !o.hash) return false;
  const h = crypto.scryptSync(String(pw), o.salt, 64);
  const b = Buffer.from(o.hash, 'hex');
  return b.length === h.length && crypto.timingSafeEqual(b, h);
}
const normPhone = (p) => String(p || '').replace(/\D/g, '');
const clean = (s, max = 300) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

/* --------------------------------------------------------------- database */
let db;
function save() {
  const tmp = DBF + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DBF);
}

function seed() {
  const password = process.env.ADMIN_PASSWORD || rid(5) + '-' + rid(3); // masalan: a1b2c3d4e5-f6a7b8
  const p = hashPw(password);
  const t = now();
  db = {
    counter: 1000,
    settings: {
      shopName: 'ELITE MEN',
      tagline: 'Erkaklar uchun premium kiyim va poyabzal',
      phone: '+998 90 000 00 00',
      telegram: '',
      address: "Toshkent, O'zbekiston",
      cardNumber: '6262 5701 3419 2691',
      cardHolder: 'BORATOVA ZARNIGIOR',
      deliveryFee: 30000,
      freeDeliveryFrom: 1000000,
      admin: p,
    },
    categories: [
      { id: 'kostyum', name: 'Sport kostyumlar', order: 1 },
      { id: 'kurtka', name: 'Kurtkalar', order: 2 },
      { id: 'poyabzal', name: 'Poyabzal', order: 3 },
    ],
    products: [
      {
        id: 'p1', name: 'Jun aralash trikotaj kostyum — jigarrang', brand: '', category: 'kostyum',
        price: 1450000, oldPrice: 1750000,
        desc: "Yumshoq, issiq trikotaj mato. Kapyushonli zamok-kofta va erkin shimdan iborat to'plam. Yoqa va manjetlardagi och chiziqlar kostyumga nafis ko'rinish beradi. Uy, sayr va kundalik kiyinish uchun ideal.",
        images: ['/img/p-brown-set.jpg'], sizes: ['M', 'L', 'XL', 'XXL'], colors: [], inStock: true, featured: true, createdAt: t,
      },
      {
        id: 'p2', name: 'Klassik sport kostyum — kulrang / ko\'k', brand: '', category: 'kostyum',
        price: 1150000, oldPrice: 0,
        desc: "Zich paxta-piqué mato, tik yoqali zamok-kofta va jogger shim. Ko'k rangli rezinkalar va cho'ntak chiziqlari bilan. Bahor-kuz fasli uchun qulay va chiroyli to'plam.",
        images: ['/img/p-grey-set.jpg'], sizes: ['M', 'L', 'XL', 'XXL'], colors: [], inStock: true, featured: true, createdAt: t,
      },
      {
        id: 'p3', name: 'Kapyushonli sport kostyum — qizil kamuflyaj', brand: '', category: 'kostyum',
        price: 650000, oldPrice: 790000,
        desc: "Ichi yumshoq flis bilan qoplangan, kamuflyaj naqshli kapyushonli kofta va qora sport shim. Mashg'ulot va kundalik kiyinish uchun qulay, sovuq kunlarda issiq tutadi.",
        images: ['/img/p-red-set.jpg'], sizes: ['M', 'L', 'XL', 'XXL', '3XL'], colors: [], inStock: true, featured: true, createdAt: t,
      },
      {
        id: 'p4', name: 'Premium bomber kurtka — jigarrang', brand: '', category: 'kurtka',
        price: 1350000, oldPrice: 0,
        desc: "Suv o'tkazmaydigan yengil mato va trikotaj yenglardan tikilgan ikki zamokli bomber. Tik yoqa, zamokli cho'ntaklar, ichki qismi yumshoq astar. Ish va kundalik kiyinish uchun universal.",
        images: ['/img/p-bomber.jpg'], sizes: ['M', 'L', 'XL', 'XXL'], colors: [], inStock: true, featured: true, createdAt: t,
      },
      {
        id: 'p5', name: 'Qishki kapyushonli kurtka — kamuflyaj', brand: '', category: 'kurtka',
        price: 780000, oldPrice: 920000,
        desc: "Yengil, lekin issiq to'ldirgichli kapyushonli kurtka. Geometrik kamuflyaj naqsh, zamokli cho'ntaklar, yenglarda qulay manjetlar. Shamol va sovuqdan yaxshi himoya qiladi.",
        images: ['/img/p-navy-jacket.jpg'], sizes: ['M', 'L', 'XL', 'XXL', '3XL'], colors: [], inStock: true, featured: false, createdAt: t,
      },
      {
        id: 'p6', name: 'Slip-on poyabzal — jun va charm', brand: '', category: 'poyabzal',
        price: 890000, oldPrice: 0,
        desc: "Balandroq qalin tagli, bog'ichsiz slip-on poyabzal. Jun \"yolka\" mato va mat charm detallar uyg'unlashgan. Kiyish juda oson, uzoq yurishda ham qulay.",
        images: ['/img/p-shoes.jpg'], sizes: ['40', '41', '42', '43', '44', '45'], colors: [], inStock: true, featured: true, createdAt: t,
      },
      {
        id: 'p7', name: 'Kundalik krossovka (sneaker)', brand: '', category: 'poyabzal',
        price: 720000, oldPrice: 0,
        desc: "Oq tagli, yengil va zamonaviy krossovka. Mato va charm uyg'unligi, tez bog'lanadigan bog'ichlar. Uchta rangda: to'q ko'k, qora va jigarrang.",
        images: ['/img/p-sneakers.jpg'], sizes: ['40', '41', '42', '43', '44', '45'], colors: ["To'q ko'k", 'Qora', 'Jigarrang'], inStock: true, featured: true, createdAt: t,
      },
    ],
    users: [],
    orders: [],
  };
  save();
  return password;
}

if (process.argv.includes('--init') || !fs.existsSync(DBF)) {
  if (fs.existsSync(DBF) && process.argv.includes('--init')) {
    console.log("data/db.json allaqachon bor. Qayta yaratish uchun uni o'chiring.");
    process.exit(0);
  }
  const pw = seed();
  console.log('\n=========================================================');
  console.log(' Baza yaratildi.');
  console.log(' ADMIN PAROLI :  ' + pw);
  console.log(' (Admin paneldan "Sozlamalar" bo\'limida o\'zgartirishingiz mumkin)');
  console.log('=========================================================\n');
  if (process.argv.includes('--init')) process.exit(0);
} else {
  db = JSON.parse(fs.readFileSync(DBF, 'utf8'));
}

/* --------------------------------------------------------------- sessions */
const sessions = new Map(); // token -> {kind, userId, exp}
const DAY = 24 * 3600 * 1000;
function newSession(kind, userId, ttl) {
  const token = rid(24);
  sessions.set(token, { kind, userId, exp: Date.now() + ttl });
  return token;
}
function getSession(req, cookieName, kind) {
  const c = parseCookies(req)[cookieName];
  if (!c) return null;
  const s = sessions.get(c);
  if (!s || s.kind !== kind || s.exp < Date.now()) { sessions.delete(c); return null; }
  return { token: c, ...s };
}
function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function setCookie(res, name, val, maxAgeSec) {
  const parts = [`${name}=${val}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSec}`];
  if (process.env.COOKIE_SECURE === '1') parts.push('Secure');
  const prev = res.getHeader('Set-Cookie') || [];
  res.setHeader('Set-Cookie', [].concat(prev, parts.join('; ')));
}
setInterval(() => { const n = Date.now(); for (const [k, v] of sessions) if (v.exp < n) sessions.delete(k); }, 600000).unref();

/* ------------------------------------------------------------ rate limits */
const hits = new Map();
function limited(key, max, windowMs) {
  const n = Date.now();
  const h = hits.get(key) || { c: 0, reset: n + windowMs };
  if (n > h.reset) { h.c = 0; h.reset = n + windowMs; }
  h.c++;
  hits.set(key, h);
  return h.c > max;
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 600000).unref();


/* ----------------------------------------------- Telegram xabarnoma (ixtiyoriy) */
function notify(text) {
  const tok = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!tok || !chat || typeof fetch !== 'function') return;
  fetch('https://api.telegram.org/bot' + tok + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 3900) }),
  }).catch((e) => console.error('Telegram xatosi:', e.message));
}
/* ---- Jonli aloqa (SSE): admin panelga buyurtma darrov keladi ---- */
const sseClients = new Set();
function broadcast(ev, data) {
  const msg = 'event: ' + ev + '\ndata: ' + JSON.stringify(data) + '\n\n';
  for (const r of sseClients) { try { r.write(msg); } catch { sseClients.delete(r); } }
}
setInterval(() => { for (const r of sseClients) { try { r.write(': ping\n\n'); } catch { sseClients.delete(r); } } }, 25000).unref();
const pubSettings = () => {
  const { admin, ...rest } = db.settings;
  return { ...rest, telegramOn: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) };
};
const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)).replace(/\u00a0/g, ' ') + " so'm";
function orderText(o, head) {
  return head + ' №' + o.id + '\n' + o.name + ' +' + o.phone + '\n' + o.address +
    '\n\n' + o.items.map((i) => '• ' + i.name + (i.size ? ' (' + i.size + ')' : '') + (i.color ? ' ' + i.color : '') + ' × ' + i.qty).join('\n') +
    '\n\nJami: ' + fmt(o.total) + (o.note ? '\nIzoh: ' + o.note : '') + '\nAdmin panel: /admin';
}

/* ------------------------------------------------------------ http utils */
function send(res, code, obj) {
  const b = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(b);
}
const fail = (res, code, msg) => send(res, code, { error: msg });

function readBody(req, limit = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Fayl juda katta'), { code: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error("Noto'g'ri so'rov"), { code: 400 })); }
    });
    req.on('error', reject);
  });
}

function saveImage(dataUrl, dir, maxBytes) {
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw Object.assign(new Error("Rasm formati noto'g'ri (JPG, PNG yoki WEBP)"), { code: 400 });
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > maxBytes) throw Object.assign(new Error('Rasm hajmi juda katta'), { code: 413 });
  let ext = null;
  if (buf[0] === 0xff && buf[1] === 0xd8) ext = 'jpg';
  else if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) ext = 'png';
  else if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') ext = 'webp';
  if (!ext) throw Object.assign(new Error('Fayl rasm emas'), { code: 400 });
  const name = rid(12) + '.' + ext;
  fs.writeFileSync(path.join(dir, name), buf);
  return name;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

function serveFile(req, res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Topilmadi'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache || 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  });
}

/* ------------------------------------------------------------- order logic */
const ORDER_STATUS = ['new', 'pending_payment', 'confirmed', 'shipping', 'done', 'cancelled'];
const publicProduct = (p) => p;

function publicOrder(o, withToken) {
  const s = db.settings;
  const r = {
    id: o.id, name: o.name, phone: o.phone, address: o.address, note: o.note, items: o.items,
    subtotal: o.subtotal, delivery: o.delivery, total: o.total, status: o.status,
    payment: { status: o.payment.status, paidAt: o.payment.paidAt || null, hasReceipt: !!o.payment.receipt },
    createdAt: o.createdAt,
    payInfo: { cardNumber: s.cardNumber, cardHolder: s.cardHolder },
  };
  if (withToken) r.token = o.token;
  return r;
}
function adminOrder(o) {
  const r = publicOrder(o, false);
  r.userId = o.userId || null;
  r.payment.receipt = o.payment.receipt || null;
  r.adminNote = o.adminNote || '';
  return r;
}

function canSeeOrder(req, o, url) {
  const t = url.searchParams.get('t');
  if (t && t.length === o.token.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o.token))) return true;
  const us = getSession(req, 'sid', 'user');
  return !!(us && o.userId && us.userId === o.userId);
}

/* ---------------------------------------------------------------- API */
async function api(req, res, url) {
  const m = req.method;
  const p = url.pathname;
  const ip = (process.env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || 'x';

  if (m !== 'GET' && m !== 'HEAD') {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.startsWith('application/json')) return fail(res, 415, "Noto'g'ri so'rov turi");
  }

  /* ---- public ---- */
  if (m === 'GET' && p === '/api/shop') {
    const s = db.settings;
    return send(res, 200, {
      settings: { shopName: s.shopName, tagline: s.tagline, phone: s.phone, telegram: s.telegram, address: s.address, announcement: s.announcement || '', deliveryFee: s.deliveryFee, freeDeliveryFrom: s.freeDeliveryFrom },
      categories: db.categories.slice().sort((a, b) => a.order - b.order),
      products: db.products.map(publicProduct),
    });
  }

  /* ---- customer auth ---- */
  if (m === 'POST' && p === '/api/register') {
    if (limited('reg:' + ip, 10, 3600000)) return fail(res, 429, "Juda ko'p urinish. Keyinroq qayta urining");
    const b = await readBody(req);
    const name = clean(b.name, 80), phone = normPhone(b.phone), pw = String(b.password || '');
    if (name.length < 2) return fail(res, 400, 'Ismingizni kiriting');
    if (phone.length < 9) return fail(res, 400, "Telefon raqamni to'g'ri kiriting");
    if (pw.length < 6) return fail(res, 400, "Parol kamida 6 ta belgidan iborat bo'lsin");
    if (db.users.some((u) => u.phone === phone)) return fail(res, 409, "Bu raqam bilan ro'yxatdan o'tilgan");
    const u = { id: 'u' + rid(5), name, phone, pass: hashPw(pw), createdAt: now() };
    db.users.push(u); save();
    setCookie(res, 'sid', newSession('user', u.id, 30 * DAY), 30 * 86400);
    return send(res, 200, { user: { id: u.id, name: u.name, phone: u.phone } });
  }
  if (m === 'POST' && p === '/api/login') {
    if (limited('login:' + ip, 15, 15 * 60000)) return fail(res, 429, "Juda ko'p urinish. 15 daqiqadan so'ng qayta urining");
    const b = await readBody(req);
    const phone = normPhone(b.phone);
    const u = db.users.find((x) => x.phone === phone);
    if (!u || !checkPw(b.password, u.pass)) return fail(res, 401, "Telefon yoki parol noto'g'ri");
    setCookie(res, 'sid', newSession('user', u.id, 30 * DAY), 30 * 86400);
    return send(res, 200, { user: { id: u.id, name: u.name, phone: u.phone } });
  }
  if (m === 'POST' && p === '/api/logout') {
    const s = getSession(req, 'sid', 'user'); if (s) sessions.delete(s.token);
    setCookie(res, 'sid', '', 0);
    return send(res, 200, { ok: true });
  }
  if (m === 'GET' && p === '/api/me') {
    const s = getSession(req, 'sid', 'user');
    const u = s && db.users.find((x) => x.id === s.userId);
    return send(res, 200, { user: u ? { id: u.id, name: u.name, phone: u.phone } : null });
  }
  if (m === 'POST' && p === '/api/me') {
    const s = getSession(req, 'sid', 'user');
    const u = s && db.users.find((x) => x.id === s.userId);
    if (!u) return fail(res, 401, 'Tizimga kiring');
    const b = await readBody(req);
    if (b.name !== undefined) { const n = clean(b.name, 80); if (n.length < 2) return fail(res, 400, 'Ism juda qisqa'); u.name = n; }
    if (b.newPassword) {
      if (!checkPw(b.oldPassword, u.pass)) return fail(res, 400, "Joriy parol noto'g'ri");
      if (String(b.newPassword).length < 6) return fail(res, 400, 'Yangi parol juda qisqa');
      u.pass = hashPw(b.newPassword);
    }
    save();
    return send(res, 200, { user: { id: u.id, name: u.name, phone: u.phone } });
  }

  /* ---- orders (customer) ---- */
  if (m === 'POST' && p === '/api/orders') {
    if (limited('order:' + ip, 20, 3600000)) return fail(res, 429, "Juda ko'p buyurtma. Keyinroq urinib ko'ring");
    const b = await readBody(req);
    const name = clean(b.name, 80), phone = normPhone(b.phone), address = clean(b.address, 300), note = clean(b.note, 400);
    if (name.length < 2) return fail(res, 400, 'Ismingizni kiriting');
    if (phone.length < 9) return fail(res, 400, "Telefon raqamni to'g'ri kiriting");
    if (address.length < 5) return fail(res, 400, 'Yetkazib berish manzilini kiriting');
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) return fail(res, 400, "Savat bo'sh");
    const items = [];
    for (const it of b.items) {
      const pr = db.products.find((x) => x.id === it.pid);
      if (!pr || !pr.inStock) return fail(res, 400, "Mahsulot sotuvda yo'q: " + (pr ? pr.name : ''));
      const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1));
      const size = clean(it.size, 10), color = clean(it.color, 30);
      if (pr.sizes.length && !pr.sizes.includes(size)) return fail(res, 400, "O'lchamni tanlang: " + pr.name);
      if (pr.colors.length && !pr.colors.includes(color)) return fail(res, 400, 'Rangni tanlang: ' + pr.name);
      items.push({ pid: pr.id, name: pr.name, image: pr.images[0] || '', size, color, qty, price: pr.price });
    }
    const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
    const s = db.settings;
    const delivery = subtotal >= s.freeDeliveryFrom ? 0 : s.deliveryFee;
    const us = getSession(req, 'sid', 'user');
    const o = {
      id: String(++db.counter), token: rid(16), userId: us ? us.userId : null,
      name, phone, address, note, items, subtotal, delivery, total: subtotal + delivery,
      status: 'new', payment: { status: 'unpaid', receipt: null, paidAt: null }, adminNote: '', createdAt: now(),
    };
    db.orders.push(o); save();
    notify(orderText(o, '🛍 YANGI BUYURTMA'));
    broadcast('order', { id: o.id, name: o.name, total: o.total });
    return send(res, 200, { order: publicOrder(o, true) });
  }
  if (m === 'GET' && p === '/api/my/orders') {
    const s = getSession(req, 'sid', 'user');
    if (!s) return fail(res, 401, 'Tizimga kiring');
    return send(res, 200, { orders: db.orders.filter((o) => o.userId === s.userId).reverse().map((o) => publicOrder(o, true)) });
  }
  let mm;
  if ((mm = /^\/api\/orders\/(\d+)$/.exec(p)) && m === 'GET') {
    const o = db.orders.find((x) => x.id === mm[1]);
    if (!o || !canSeeOrder(req, o, url)) return fail(res, 404, 'Buyurtma topilmadi');
    return send(res, 200, { order: publicOrder(o, false) });
  }
  if ((mm = /^\/api\/orders\/(\d+)\/paid$/.exec(p)) && m === 'POST') {
    const o = db.orders.find((x) => x.id === mm[1]);
    if (!o || !canSeeOrder(req, o, url)) return fail(res, 404, 'Buyurtma topilmadi');
    if (o.status === 'cancelled') return fail(res, 400, 'Buyurtma bekor qilingan');
    if (o.payment.status === 'paid') return fail(res, 400, "To'lov allaqachon tasdiqlangan");
    const b = await readBody(req);
    if (b.receipt) o.payment.receipt = saveImage(b.receipt, RECEIPTS, 6 * 1024 * 1024);
    o.payment.status = 'pending';
    o.payment.paidAt = now();
    if (o.status === 'new') o.status = 'pending_payment';
    save();
    notify(orderText(o, "💳 TO'LOV QILINDI (tekshiring)"));
    broadcast('payment', { id: o.id, name: o.name, total: o.total });
    return send(res, 200, { order: publicOrder(o, false) });
  }

  /* ---- admin ---- */
  if (m === 'POST' && p === '/api/admin/login') {
    if (limited('alogin:' + ip, 5, 15 * 60000)) return fail(res, 429, "Juda ko'p urinish. 15 daqiqadan so'ng qayta urining");
    const b = await readBody(req);
    if (!checkPw(b.password, db.settings.admin)) return fail(res, 401, "Parol noto'g'ri");
    setCookie(res, 'asid', newSession('admin', 'admin', 12 * 3600000), 12 * 3600);
    return send(res, 200, { ok: true });
  }
  if (p.startsWith('/api/admin/')) {
    const as = getSession(req, 'asid', 'admin');
    if (m === 'GET' && p === '/api/admin/me') return send(res, 200, { admin: !!as });
    if (!as) return fail(res, 401, 'Admin sifatida kiring');

    if (m === 'GET' && p === '/api/admin/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 3000\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }
    if (m === 'GET' && p === '/api/admin/backup') {
      const { admin, ...rest } = db.settings;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="elite-men-zaxira-' + now().slice(0, 10) + '.json"', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ...db, settings: rest }, null, 1));
    }
    if (m === 'POST' && p === '/api/admin/restore') {
      const b = await readBody(req, 30 * 1024 * 1024);
      const d = b.db;
      if (!d || !Array.isArray(d.products) || !Array.isArray(d.orders) || !Array.isArray(d.categories) || !Array.isArray(d.users) || typeof d.settings !== 'object' || !d.settings) return fail(res, 400, "Zaxira fayli noto'g'ri");
      db = { ...d, counter: Math.max(Number(d.counter) || 1000, ...d.orders.map((o) => Number(o.id) || 0)), settings: { ...d.settings, admin: db.settings.admin } };
      save();
      return send(res, 200, { ok: true });
    }
    if (m === 'POST' && p === '/api/admin/telegram-test') {
      const tok = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
      if (!tok || !chat) return fail(res, 400, 'TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID sozlanmagan');
      const r = await fetch('https://api.telegram.org/bot' + tok + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: '✅ Sinov xabari: Telegram bildirishnomasi ishlayapti.' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return fail(res, 400, 'Telegram xatosi: ' + (j.description || r.status));
      return send(res, 200, { ok: true });
    }
    if (m === 'POST' && p === '/api/admin/logout') { sessions.delete(as.token); setCookie(res, 'asid', '', 0); return send(res, 200, { ok: true }); }

    if (m === 'GET' && p === '/api/admin/stats') {
      const paid = db.orders.filter((o) => o.payment.status === 'paid' && o.status !== 'cancelled');
      const dayOf = (iso) => new Date(new Date(iso).getTime() + 5 * 3600000).toISOString().slice(0, 10); // Toshkent vaqti
      const today = dayOf(now());
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = dayOf(new Date(Date.now() - i * 86400000).toISOString());
        const os = db.orders.filter((o) => dayOf(o.createdAt) === d && o.status !== 'cancelled');
        days.push({ date: d, orders: os.length, revenue: os.filter((o) => o.payment.status === 'paid').reduce((a, o) => a + o.total, 0) });
      }
      const tp = {};
      for (const o of db.orders) if (o.status !== 'cancelled') for (const it of o.items) {
        const t = tp[it.pid] || (tp[it.pid] = { name: it.name, image: it.image, qty: 0, sum: 0 });
        t.qty += it.qty; t.sum += it.price * it.qty;
      }
      const top = Object.values(tp).sort((a, b) => b.qty - a.qty).slice(0, 5);
      return send(res, 200, {
        orders: db.orders.length,
        newOrders: db.orders.filter((o) => o.status === 'new').length,
        pendingPayments: db.orders.filter((o) => o.payment.status === 'pending' && o.status !== 'cancelled').length,
        revenue: paid.reduce((a, o) => a + o.total, 0),
        todayRevenue: paid.filter((o) => dayOf(o.payment.confirmedAt || o.createdAt) === today).reduce((a, o) => a + o.total, 0),
        customers: db.users.length, products: db.products.length, days, top,
        recent: db.orders.slice(-6).reverse().map(adminOrder),
      });
    }
    if (m === 'GET' && p === '/api/admin/orders') return send(res, 200, { orders: db.orders.slice().reverse().map(adminOrder) });
    if ((mm = /^\/api\/admin\/orders\/(\d+)$/.exec(p))) {
      const o = db.orders.find((x) => x.id === mm[1]);
      if (!o) return fail(res, 404, 'Topilmadi');
      if (m === 'PUT') {
        const b = await readBody(req);
        if (b.status !== undefined) { if (!ORDER_STATUS.includes(b.status)) return fail(res, 400, 'Status xato'); o.status = b.status; }
        if (b.paymentStatus !== undefined) {
          if (!['unpaid', 'pending', 'paid'].includes(b.paymentStatus)) return fail(res, 400, "To'lov statusi xato");
          o.payment.status = b.paymentStatus;
          if (b.paymentStatus === 'paid') { o.payment.confirmedAt = now(); if (o.status === 'new' || o.status === 'pending_payment') o.status = 'confirmed'; }
        }
        if (b.adminNote !== undefined) o.adminNote = clean(b.adminNote, 500);
        save();
        return send(res, 200, { order: adminOrder(o) });
      }
      if (m === 'DELETE') {
        db.orders = db.orders.filter((x) => x.id !== o.id);
        if (o.payment.receipt) fs.rm(path.join(RECEIPTS, path.basename(o.payment.receipt)), () => {});
        save();
        return send(res, 200, { ok: true });
      }
    }
    if ((mm = /^\/api\/admin\/receipt\/([a-f0-9]+\.(?:jpg|png|webp))$/.exec(p)) && m === 'GET') {
      return serveFile(req, res, path.join(RECEIPTS, mm[1]), 'private, max-age=3600');
    }

    if (m === 'POST' && p === '/api/admin/upload') {
      const b = await readBody(req);
      const name = saveImage(b.data, UPLOADS, 6 * 1024 * 1024);
      return send(res, 200, { url: '/uploads/' + name });
    }

    if (m === 'POST' && p === '/api/admin/products') {
      const b = await readBody(req);
      const pr = productFrom(b, { id: 'p' + rid(4), createdAt: now() });
      if (typeof pr === 'string') return fail(res, 400, pr);
      db.products.push(pr); save();
      return send(res, 200, { product: pr });
    }
    if ((mm = /^\/api\/admin\/products\/([\w-]+)$/.exec(p))) {
      const i = db.products.findIndex((x) => x.id === mm[1]);
      if (i < 0) return fail(res, 404, 'Topilmadi');
      if (m === 'PUT') {
        const pr = productFrom(await readBody(req), db.products[i]);
        if (typeof pr === 'string') return fail(res, 400, pr);
        db.products[i] = pr; save();
        return send(res, 200, { product: pr });
      }
      if (m === 'DELETE') { db.products.splice(i, 1); save(); return send(res, 200, { ok: true }); }
    }

    if (m === 'POST' && p === '/api/admin/categories') {
      const b = await readBody(req);
      const name = clean(b.name, 40); if (!name) return fail(res, 400, 'Nomini kiriting');
      const c = { id: 'c' + rid(3), name, order: db.categories.length + 1 };
      db.categories.push(c); save(); return send(res, 200, { category: c });
    }
    if ((mm = /^\/api\/admin\/categories\/([\w-]+)$/.exec(p))) {
      const c = db.categories.find((x) => x.id === mm[1]);
      if (!c) return fail(res, 404, 'Topilmadi');
      if (m === 'PUT') { const b = await readBody(req); const n = clean(b.name, 40); if (!n) return fail(res, 400, 'Nomini kiriting'); c.name = n; save(); return send(res, 200, { category: c }); }
      if (m === 'DELETE') {
        if (db.products.some((x) => x.category === c.id)) return fail(res, 400, "Bu bo'limda mahsulotlar bor. Avval ularni boshqa bo'limga o'tkazing");
        db.categories = db.categories.filter((x) => x.id !== c.id); save(); return send(res, 200, { ok: true });
      }
    }

    if (m === 'GET' && p === '/api/admin/users') {
      return send(res, 200, {
        users: db.users.map((u) => ({
          id: u.id, name: u.name, phone: u.phone, createdAt: u.createdAt,
          orders: db.orders.filter((o) => o.userId === u.id).length,
          spent: db.orders.filter((o) => o.userId === u.id && o.payment.status === 'paid' && o.status !== 'cancelled').reduce((a, o) => a + o.total, 0),
        })).reverse(),
      });
    }
    if ((mm = /^\/api\/admin\/users\/([\w-]+)$/.exec(p)) && m === 'DELETE') {
      db.users = db.users.filter((u) => u.id !== mm[1]);
      for (const [k, v] of sessions) if (v.kind === 'user' && v.userId === mm[1]) sessions.delete(k);
      save(); return send(res, 200, { ok: true });
    }

    if (m === 'GET' && p === '/api/admin/settings') return send(res, 200, { settings: pubSettings() });
    if (m === 'PUT' && p === '/api/admin/settings') {
      const b = await readBody(req);
      const s = db.settings;
      for (const k of ['shopName', 'tagline', 'phone', 'telegram', 'address', 'cardHolder', 'announcement']) if (b[k] !== undefined) s[k] = clean(b[k], 120);
      if (b.cardNumber !== undefined) {
        const digits = String(b.cardNumber).replace(/\D/g, '');
        if (digits.length < 12 || digits.length > 19) return fail(res, 400, "Karta raqami noto'g'ri");
        s.cardNumber = digits.replace(/(.{4})/g, '$1 ').trim();
      }
      for (const k of ['deliveryFee', 'freeDeliveryFrom']) if (b[k] !== undefined) s[k] = Math.max(0, parseInt(b[k], 10) || 0);
      save();
      return send(res, 200, { settings: pubSettings() });
    }
    if (m === 'POST' && p === '/api/admin/password') {
      const b = await readBody(req);
      if (!checkPw(b.oldPassword, db.settings.admin)) return fail(res, 400, "Joriy parol noto'g'ri");
      if (String(b.newPassword || '').length < 8) return fail(res, 400, "Yangi parol kamida 8 ta belgi bo'lsin");
      db.settings.admin = hashPw(b.newPassword); save();
      for (const [k, v] of sessions) if (v.kind === 'admin' && k !== as.token) sessions.delete(k);
      return send(res, 200, { ok: true });
    }
    return fail(res, 404, 'Topilmadi');
  }
  return fail(res, 404, 'Topilmadi');
}

function productFrom(b, base) {
  const name = clean(b.name, 140);
  if (name.length < 2) return 'Mahsulot nomini kiriting';
  const price = parseInt(b.price, 10);
  if (!(price > 0)) return "Narxni to'g'ri kiriting";
  const category = db.categories.find((c) => c.id === b.category) ? b.category : null;
  if (!category) return "Bo'limni tanlang";
  const list = (a, max, len) => (Array.isArray(a) ? a : String(a || '').split(',')).map((x) => clean(x, len)).filter(Boolean).slice(0, max);
  const images = (Array.isArray(b.images) ? b.images : []).map((x) => String(x)).filter((x) => /^\/(uploads|img)\/[\w.-]+$/.test(x)).slice(0, 8);
  return {
    ...base, name, brand: clean(b.brand, 60), category, price,
    oldPrice: Math.max(0, parseInt(b.oldPrice, 10) || 0),
    desc: clean(b.desc, 2000), images, sizes: list(b.sizes, 15, 10), colors: list(b.colors, 10, 30),
    inStock: !!b.inStock, featured: !!b.featured,
  };
}

/* --------------------------------------------------------------- server */
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith('/api/')) return await api(req, res, url);

    if (p === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
    if (p.startsWith('/uploads/')) {
      const uf = path.normalize(path.join(UPLOADS, p.slice(9)));
      if (!uf.startsWith(UPLOADS + path.sep)) { res.writeHead(403); return res.end(); }
      return serveFile(req, res, uf, 'public, max-age=86400');
    }
    if (p === '/admin' || p === '/admin/') return serveFile(req, res, path.join(PUB, 'admin.html'));
    if (p === '/') p = '/index.html';
    const file = path.normalize(path.join(PUB, p));
    if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
    const cache = /^\/(img|uploads)\//.test(p) ? 'public, max-age=86400' : 'no-cache';
    if (!fs.existsSync(file)) return serveFile(req, res, path.join(PUB, 'index.html')); // SPA fallback
    return serveFile(req, res, file, cache);
  } catch (e) {
    if (e && e.code === 413) return fail(res, 413, e.message);
    if (e && e.code === 400) return fail(res, 400, e.message);
    console.error(e);
    if (!res.headersSent) fail(res, 500, 'Server xatosi');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Do'kon ishga tushdi:  http://localhost:${PORT}`);
  console.log(`Admin panel:          http://localhost:${PORT}/admin`);
});
