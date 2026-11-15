'use strict';
/* ====================== yordamchilar ====================== */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)).replace(/ /g, ' ') + " so'm";
const STATUS = { new: 'Yangi', pending_payment: "To'lov tekshirilmoqda", confirmed: 'Tasdiqlandi', shipping: 'Yetkazilmoqda', done: 'Yetkazildi', cancelled: 'Bekor qilindi' };
const PAYST = { unpaid: "To'lanmagan", pending: 'Tekshirilmoqda', paid: "To'langan" };

async function api(url, method = 'GET', body) {
  const r = await fetch(url, {
    method, credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : (method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
    body: body !== undefined ? JSON.stringify(body) : (method !== 'GET' ? '{}' : undefined),
  });
  let d = {}; try { d = await r.json(); } catch (e) { /* bo'sh javob */ }
  if (!r.ok) throw new Error(d.error || 'Xatolik yuz berdi');
  return d;
}
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function fileToDataURL(file, max = 1400) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bu rasm emas'));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function copyText(t) {
  const done = () => toast('Nusxalandi ✓');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, done);
  else { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); done(); }
}

/* ====================== holat ====================== */
const S = { shop: null, products: [], cats: [], me: null, cart: [] };
try { S.cart = JSON.parse(localStorage.getItem('cart') || '[]'); } catch (e) { S.cart = []; }
const saveCart = () => { localStorage.setItem('cart', JSON.stringify(S.cart)); updBadge(); };
const myOrders = () => { try { return JSON.parse(localStorage.getItem('myOrders') || '[]'); } catch (e) { return []; } };
const rememberOrder = (id, token) => { const l = myOrders().filter((o) => o.id !== id); l.unshift({ id, token }); localStorage.setItem('myOrders', JSON.stringify(l.slice(0, 20))); };
const tokenFor = (id) => (myOrders().find((o) => o.id === id) || {}).token || '';
const prod = (id) => S.products.find((p) => p.id === id);
const catName = (id) => (S.cats.find((c) => c.id === id) || {}).name || '';
function updBadge() {
  const n = S.cart.reduce((a, i) => a + i.qty, 0);
  const b = $('#cbadge'); b.textContent = n; b.style.display = n ? 'flex' : 'none';
}

/* ====================== boshlash ====================== */
async function boot() {
  try {
    const [shop, me] = await Promise.all([api('/api/shop'), api('/api/me')]);
    S.shop = shop.settings; S.products = shop.products; S.cats = shop.categories; S.me = me.user;
  } catch (e) { $('#app').innerHTML = '<div class="empty"><h3>Serverga ulanib bo\'lmadi</h3><p>Birozdan so\'ng qayta urinib ko\'ring.</p></div>'; return; }
  // eskirgan savat elementlarini tozalash
  S.cart = S.cart.filter((i) => prod(i.pid)); saveCart();
  const s = S.shop;
  document.title = s.shopName + ' — erkaklar kiyimi';
  const [a, b] = s.shopName.split(' ');
  const logo = a + (b ? ' <span>' + esc(b) + '</span>' : '');
  $('#logo').innerHTML = esc(a) + (b ? ' <span>' + esc(b) + '</span>' : '');
  $('#flogo').innerHTML = $('#logo').innerHTML;
  $('#ftag').textContent = s.tagline;
  $('#fname').textContent = s.shopName;
  $('#yr').textContent = new Date().getFullYear();
  $('#topbar').textContent = `Yetkazib berish: ${money(s.freeDeliveryFrom)} dan yuqori buyurtmalarga BEPUL`;
  $('#fcontact').innerHTML = `<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ''))}">${esc(s.phone)}</a>` +
    (s.telegram ? `<a href="${esc(s.telegram.startsWith('http') ? s.telegram : 'https://t.me/' + s.telegram.replace('@', ''))}" target="_blank" rel="noopener">Telegram</a>` : '') + `<span>${esc(s.address)}</span>`;
  renderNav(); updAcc();
  window.addEventListener('hashchange', route);
  route();
}
function renderNav() {
  $('#nav').innerHTML = `<a href="#/" data-r="home">Bosh sahifa</a><a href="#/catalog" data-r="catalog-all">Barcha mahsulotlar</a>` +
    S.cats.map((c) => `<a href="#/catalog?cat=${encodeURIComponent(c.id)}" data-r="cat-${esc(c.id)}">${esc(c.name)}</a>`).join('');
}
function updAcc() { $('#acclbl').textContent = S.me ? S.me.name.split(' ')[0] : 'Kirish'; }

/* ====================== router ====================== */
function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}
async function route() {
  const { parts, q } = parseHash();
  const app = $('#app');
  $('#nav').classList.remove('open');
  window.scrollTo(0, 0);
  const r = parts[0] || 'home';
  let active = r === 'home' ? 'home' : (r === 'catalog' ? (q.get('cat') ? 'cat-' + q.get('cat') : 'catalog-all') : '');
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === active));
  try {
    if (r === 'home') pageHome(app);
    else if (r === 'catalog') pageCatalog(app, q);
    else if (r === 'product') pageProduct(app, parts[1]);
    else if (r === 'cart') pageCart(app);
    else if (r === 'checkout') pageCheckout(app);
    else if (r === 'order') await pageOrder(app, parts[1], q);
    else if (r === 'login') pageAuth(app, 'login');
    else if (r === 'register') pageAuth(app, 'register');
    else if (r === 'profile') await pageProfile(app);
    else pageHome(app);
  } catch (e) { app.innerHTML = `<div class="empty"><h3>Xatolik</h3><p>${esc(e.message)}</p></div>`; }
}

/* ====================== komponentlar ====================== */
function card(p) {
  const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `<a class="pcard" href="#/product/${esc(p.id)}">
    <div class="pimg"><img loading="lazy" src="${esc(p.images[0] || '')}" alt="${esc(p.name)}">
      ${!p.inStock ? '<span class="tag out">Sotuvda yo\'q</span>' : disc ? `<span class="tag">-${disc}%</span>` : ''}</div>
    <div class="pinfo"><span class="cn">${esc(catName(p.category))}</span><h3>${esc(p.name)}</h3>
      <div class="price"><b>${money(p.price)}</b>${p.oldPrice > p.price ? `<s>${money(p.oldPrice)}</s>` : ''}</div></div></a>`;
}

/* ====================== sahifalar ====================== */
function pageHome(app) {
  const feat = S.products.filter((p) => p.featured && p.inStock).slice(0, 8);
  const hi = S.products.slice(0, 3).map((p) => `<img src="${esc(p.images[0] || '')}" alt="">`).join('');
  const cats = S.cats.map((c) => {
    const ps = S.products.filter((p) => p.category === c.id);
    return `<a class="cat" href="#/catalog?cat=${encodeURIComponent(c.id)}"><img loading="lazy" src="${esc((ps[0] || {}).images ? ps[0].images[0] : '')}" alt=""><div><h3>${esc(c.name)}</h3><small>${ps.length} ta mahsulot</small></div></a>`;
  }).join('');
  app.innerHTML = `
  <section class="hero"><div class="wrap">
    <div><span class="kicker">Yangi kolleksiya</span>
      <h1>Erkaklar uchun <em>nafis</em> uslub</h1>
      <p>${esc(S.shop.tagline)}. Sifatli matolar, zamonaviy dizayn va qulay narxlar — buyurtma bering, uyingizgacha yetkazamiz.</p>
      <div class="cta"><a class="btn gold" href="#/catalog">Xarid qilish</a><a class="btn ghost" href="#/profile">Buyurtmalarim</a></div></div>
    <div class="imgs">${hi}</div></div></section>
  <div class="wrap">
    <section class="blk"><div class="shead"><h2>Bo'limlar</h2></div><div class="cats">${cats}</div></section>
    <section class="blk"><div class="shead"><h2>Tanlangan mahsulotlar</h2><a href="#/catalog">Hammasi →</a></div>
      <div class="grid">${feat.map(card).join('') || '<div class="empty">Hozircha mahsulot yo\'q</div>'}</div></section>
    <div class="perks">
      <div class="perk"><b>🚚 Tez yetkazish</b><span>Toshkent bo'ylab 1–2 kun ichida</span></div>
      <div class="perk"><b>💳 Qulay to'lov</b><span>Karta orqali o'tkazma, chek bilan tasdiqlash</span></div>
      <div class="perk"><b>✅ Sifat kafolati</b><span>Har bir mahsulot tekshirib jo'natiladi</span></div>
      <div class="perk"><b>📞 Doimiy aloqa</b><span>${esc(S.shop.phone)}</span></div>
    </div>
  </div>`;
}

function pageCatalog(app, q) {
  const cat = q.get('cat') || '', term = (q.get('q') || '').trim().toLowerCase(), sort = q.get('sort') || '';
  let list = S.products.filter((p) => (!cat || p.category === cat) && (!term || (p.name + ' ' + p.brand + ' ' + p.desc).toLowerCase().includes(term)));
  if (sort === 'asc') list.sort((a, b) => a.price - b.price);
  if (sort === 'desc') list.sort((a, b) => b.price - a.price);
  const mk = (c) => '#/catalog?' + new URLSearchParams({ ...(c ? { cat: c } : {}), ...(term ? { q: term } : {}), ...(sort ? { sort } : {}) });
  app.innerHTML = `<div class="wrap"><div class="pagehead"><div class="crumbs"><a href="#/">Bosh sahifa</a> / Katalog</div>
    <h1>${cat ? esc(catName(cat)) : 'Barcha mahsulotlar'}${term ? ` — «${esc(term)}»` : ''}</h1></div>
    <div class="filters"><a class="chip ${!cat ? 'on' : ''}" href="${mk('')}">Hammasi</a>
      ${S.cats.map((c) => `<a class="chip ${cat === c.id ? 'on' : ''}" href="${esc(mk(c.id))}">${esc(c.name)}</a>`).join('')}
      <select id="sortsel" aria-label="Saralash"><option value="">Saralash</option><option value="asc" ${sort === 'asc' ? 'selected' : ''}>Avval arzon</option><option value="desc" ${sort === 'desc' ? 'selected' : ''}>Avval qimmat</option></select></div>
    ${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : '<div class="empty"><h3>Hech narsa topilmadi</h3><p>Boshqa so\'z bilan qidirib ko\'ring.</p></div>'}</div>`;
  $('#sortsel').onchange = (e) => {
    const p = new URLSearchParams({ ...(cat ? { cat } : {}), ...(term ? { q: term } : {}), ...(e.target.value ? { sort: e.target.value } : {}) });
    location.hash = '#/catalog?' + p;
  };
}

function pageProduct(app, id) {
  const p = prod(id);
  if (!p) { app.innerHTML = '<div class="empty"><h3>Mahsulot topilmadi</h3><a class="btn dark" href="#/catalog">Katalogga qaytish</a></div>'; return; }
  const sel = { size: '', color: '', qty: 1, img: 0 };
  const disc = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  const rel = S.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  app.innerHTML = `<div class="wrap"><div class="pagehead" style="padding-bottom:0"><div class="crumbs"><a href="#/">Bosh sahifa</a> / <a href="#/catalog?cat=${encodeURIComponent(p.category)}">${esc(catName(p.category))}</a></div></div>
  <div class="pdetail">
    <div class="gal"><div class="main"><img id="mainimg" src="${esc(p.images[0] || '')}" alt="${esc(p.name)}"></div>
      ${p.images.length > 1 ? `<div class="thumbs">${p.images.map((u, i) => `<img src="${esc(u)}" data-i="${i}" class="${i === 0 ? 'on' : ''}" alt="">`).join('')}</div>` : ''}</div>
    <div><span class="crumbs">${esc(p.brand || catName(p.category))}</span><h1>${esc(p.name)}</h1>
      <div class="price"><b>${money(p.price)}</b>${p.oldPrice > p.price ? `<s>${money(p.oldPrice)}</s><span class="tag" style="position:static">-${disc}%</span>` : ''}</div>
      <p class="desc">${esc(p.desc)}</p>
      ${p.colors.length ? `<div class="opt"><label>Rang</label><div class="opts" id="colors">${p.colors.map((c) => `<button data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''}
      ${p.sizes.length ? `<div class="opt"><label>O'lcham</label><div class="opts" id="sizes">${p.sizes.map((c) => `<button data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>` : ''}
      ${p.inStock ? `<div class="buyrow"><div class="qty"><button id="qm">−</button><span id="qv">1</span><button id="qp">+</button></div>
        <button class="btn dark" id="add" style="flex:1">Savatga qo'shish</button></div>
        <button class="btn gold block" id="buy" style="margin-top:12px">Hozir sotib olish</button>` : '<div class="err">Hozircha sotuvda yo\'q</div>'}
      <div class="info-list"><div>🚚 <span>${money(S.shop.freeDeliveryFrom)} dan yuqori buyurtmalarda yetkazish bepul</span></div><div>💳 <span>Karta orqali to'lov, chek yuborib tasdiqlanadi</span></div></div>
    </div></div>
  ${rel.length ? `<section class="blk" style="padding-top:20px"><div class="shead"><h2>O'xshash mahsulotlar</h2></div><div class="grid">${rel.map(card).join('')}</div></section>` : ''}</div>`;

  document.querySelectorAll('.thumbs img').forEach((im) => im.onclick = () => {
    $('#mainimg').src = p.images[+im.dataset.i];
    document.querySelectorAll('.thumbs img').forEach((x) => x.classList.toggle('on', x === im));
  });
  const pick = (box, key) => { const el = $(box); if (!el) return; el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; sel[key] = b.dataset.v; el.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }; };
  pick('#sizes', 'size'); pick('#colors', 'color');
  if ($('#qm')) {
    $('#qm').onclick = () => { sel.qty = Math.max(1, sel.qty - 1); $('#qv').textContent = sel.qty; };
    $('#qp').onclick = () => { sel.qty = Math.min(20, sel.qty + 1); $('#qv').textContent = sel.qty; };
    const addIt = () => {
      if (p.colors.length && !sel.color) { toast('Rangni tanlang'); return false; }
      if (p.sizes.length && !sel.size) { toast("O'lchamni tanlang"); return false; }
      const ex = S.cart.find((i) => i.pid === p.id && i.size === sel.size && i.color === sel.color);
      if (ex) ex.qty = Math.min(20, ex.qty + sel.qty); else S.cart.push({ pid: p.id, size: sel.size, color: sel.color, qty: sel.qty });
      saveCart(); return true;
    };
    $('#add').onclick = () => { if (addIt()) toast('Savatga qo\'shildi ✓'); };
    $('#buy').onclick = () => { if (addIt()) location.hash = '#/checkout'; };
  }
}

function cartTotals() {
  const subtotal = S.cart.reduce((a, i) => a + (prod(i.pid) ? prod(i.pid).price * i.qty : 0), 0);
  const delivery = !subtotal ? 0 : (subtotal >= S.shop.freeDeliveryFrom ? 0 : S.shop.deliveryFee);
  return { subtotal, delivery, total: subtotal + delivery };
}
function summary() {
  const t = cartTotals();
  return `<div class="srow"><span>Mahsulotlar</span><b>${money(t.subtotal)}</b></div>
    <div class="srow"><span>Yetkazib berish</span><b>${t.delivery ? money(t.delivery) : 'Bepul'}</b></div>
    <div class="srow t"><span>Jami</span><span>${money(t.total)}</span></div>`;
}

function pageCart(app) {
  if (!S.cart.length) { app.innerHTML = '<div class="wrap"><div class="empty"><h3>Savat bo\'sh</h3><p style="margin-bottom:18px">Yoqqan mahsulotlarni savatga qo\'shing.</p><a class="btn dark" href="#/catalog">Xarid qilishni boshlash</a></div></div>'; return; }
  app.innerHTML = `<div class="wrap"><div class="pagehead"><h1>Savat</h1></div><div class="two">
    <div class="panel" id="clist"></div>
    <div class="panel sticky"><h3>Buyurtma</h3><div id="csum"></div>
      <a class="btn gold block" href="#/checkout" style="margin-top:16px">Rasmiylashtirish</a>
      <a class="btn line block" href="#/catalog" style="margin-top:10px">Xaridni davom ettirish</a></div></div></div>`;
  const draw = () => {
    if (!S.cart.length) return pageCart(app);
    $('#clist').innerHTML = S.cart.map((it, idx) => {
      const p = prod(it.pid);
      return `<div class="citem"><a href="#/product/${esc(p.id)}"><img src="${esc(p.images[0] || '')}" alt=""></a>
        <div><h4>${esc(p.name)}</h4><small>${[it.color, it.size && "O'lcham: " + it.size].filter(Boolean).map(esc).join(' · ')}</small>
          <div class="qty"><button data-a="m" data-i="${idx}">−</button><span>${it.qty}</span><button data-a="p" data-i="${idx}">+</button></div>
          <button class="rm" data-a="r" data-i="${idx}">O'chirish</button></div>
        <div><b>${money(p.price * it.qty)}</b></div></div>`;
    }).join('');
    $('#csum').innerHTML = summary();
  };
  draw();
  $('#clist').onclick = (e) => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const i = +b.dataset.i, it = S.cart[i];
    if (b.dataset.a === 'm') it.qty = Math.max(1, it.qty - 1);
    if (b.dataset.a === 'p') it.qty = Math.min(20, it.qty + 1);
    if (b.dataset.a === 'r') S.cart.splice(i, 1);
    saveCart(); draw();
  };
}

function pageCheckout(app) {
  if (!S.cart.length) { location.hash = '#/cart'; return; }
  const me = S.me || {};
  app.innerHTML = `<div class="wrap"><div class="pagehead"><div class="crumbs"><a href="#/cart">Savat</a> / Buyurtma</div><h1>Buyurtmani rasmiylashtirish</h1></div><div class="two">
    <form class="panel" id="cof"><h3>Yetkazib berish ma'lumotlari</h3><div id="cerr"></div>
      <div class="frow"><div class="field"><label>Ismingiz *</label><input name="name" required maxlength="80" value="${esc(me.name || '')}" autocomplete="name"></div>
      <div class="field"><label>Telefon *</label><input name="phone" required inputmode="tel" placeholder="+998 90 123 45 67" value="${esc(me.phone ? '+' + me.phone : '')}" autocomplete="tel"></div></div>
      <div class="field"><label>Manzil *</label><input name="address" required maxlength="300" placeholder="Shahar, tuman, ko'cha, uy" autocomplete="street-address"></div>
      <div class="field"><label>Izoh (ixtiyoriy)</label><textarea name="note" maxlength="400" placeholder="Qo'shimcha istaklar"></textarea></div>
      ${S.me ? '' : '<p style="font-size:13.5px;color:var(--muted);margin-bottom:14px">💡 <a href="#/register" style="color:var(--gold-d);font-weight:600">Ro\'yxatdan o\'ting</a> — buyurtmalaringiz profilingizda saqlanadi.</p>'}
      <button class="btn gold block" id="cosub">Buyurtma berish va to'lovga o'tish</button></form>
    <div class="panel sticky"><h3>Sizning buyurtmangiz</h3>
      ${S.cart.map((it) => { const p = prod(it.pid); return `<div class="srow" style="gap:10px"><span>${esc(p.name)}<br><small style="color:var(--muted)">${[it.color, it.size].filter(Boolean).map(esc).join(' · ')} × ${it.qty}</small></span><b style="white-space:nowrap">${money(p.price * it.qty)}</b></div>`; }).join('')}
      <div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px">${summary()}</div></div></div></div>`;
  $('#cof').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), btn = $('#cosub');
    btn.disabled = true; $('#cerr').innerHTML = '';
    try {
      const d = await api('/api/orders', 'POST', {
        name: f.get('name'), phone: f.get('phone'), address: f.get('address'), note: f.get('note'),
        items: S.cart.map((i) => ({ pid: i.pid, size: i.size, color: i.color, qty: i.qty })),
      });
      rememberOrder(d.order.id, d.order.token);
      S.cart = []; saveCart();
      location.hash = '#/order/' + d.order.id + '?t=' + d.order.token;
    } catch (err) { $('#cerr').innerHTML = `<div class="err">${esc(err.message)}</div>`; btn.disabled = false; }
  };
}

async function pageOrder(app, id, q) {
  if (!/^\d+$/.test(id || '')) { location.hash = '#/profile'; return; }
  const t = q.get('t') || tokenFor(id);
  app.innerHTML = '<div class="loading">Yuklanmoqda…</div>';
  let o;
  try { o = (await api(`/api/orders/${id}?t=${encodeURIComponent(t)}`)).order; }
  catch (e) { app.innerHTML = '<div class="wrap"><div class="empty"><h3>Buyurtma topilmadi</h3><p>Havola eskirgan yoki noto\'g\'ri.</p></div></div>'; return; }
  if (t) rememberOrder(o.id, t);
  const stepIdx = { new: 0, pending_payment: 1, confirmed: 2, shipping: 3, done: 4 }[o.status];
  const steps = ['Qabul qilindi', "To'lov", 'Tasdiqlandi', 'Yetkazilmoqda', 'Yetkazildi'];
  let payBox = '';
  if (o.status === 'cancelled') payBox = '<div class="err">Bu buyurtma bekor qilingan.</div>';
  else if (o.payment.status === 'paid') payBox = '<div class="ok"><b>✓ To\'lov tasdiqlandi.</b> Buyurtmangiz tayyorlanmoqda, tez orada siz bilan bog\'lanamiz.</div>';
  else {
    const waiting = o.payment.status === 'pending';
    payBox = `<div class="panel" style="margin-bottom:18px"><h3>To'lov</h3>
      ${waiting ? '<div class="ok">✓ Ma\'lumot yuborildi. To\'lovingiz tekshirilmoqda — tasdiqlangach buyurtmangiz yo\'lga chiqadi.</div>' : ''}
      <p style="color:var(--ink2);font-size:14.5px">To'lov summasi:</p><div class="amount">${money(o.total)}</div>
      <div class="paycard"><small>Karta raqami</small>
        <div class="num"><span id="cardnum">${esc(o.payInfo.cardNumber)}</span><button class="copy" id="cpcard">Nusxalash</button></div>
        <small>Karta egasi</small><div class="holder">${esc(o.payInfo.cardHolder)}</div></div>
      <ol class="steps"><li>Yuqoridagi kartaga <b>${money(o.total)}</b> o'tkazing.</li><li>To'lov chekining skrinshotini yuklang.</li><li>«To'lov qildim» tugmasini bosing — admin tekshirib tasdiqlaydi.</li></ol>
      ${waiting && o.payment.hasReceipt ? '' : `<div style="margin-top:14px"><label class="upl" id="uplbox" style="display:block"><input type="file" accept="image/*" id="rcpt" hidden><span id="upltxt">📎 Chek rasmini tanlang (ixtiyoriy, lekin tavsiya etiladi)</span></label></div>`}
      ${waiting ? '' : '<button class="btn gold block" id="paidbtn" style="margin-top:14px">To\'lov qildim</button>'}
      <div id="perr"></div></div>`;
  }
  app.innerHTML = `<div class="wrap"><div class="pagehead"><div class="crumbs"><a href="#/profile">Buyurtmalarim</a> / №${esc(o.id)}</div>
    <h1>Buyurtma №${esc(o.id)} <span class="status st-${esc(o.status)}" style="vertical-align:middle;font-family:var(--sans)">${esc(STATUS[o.status])}</span></h1></div>
    ${o.status !== 'cancelled' ? `<div class="timeline">${steps.map((s, i) => `<div class="${i <= stepIdx ? 'on' : ''}">${s}</div>`).join('')}</div>` : ''}
    <div class="two"><div>${payBox}
      <div class="panel"><h3>Mahsulotlar</h3>${o.items.map((it) => `<div class="citem" style="grid-template-columns:70px 1fr auto"><img src="${esc(it.image)}" alt="" style="width:70px;height:80px"><div><h4>${esc(it.name)}</h4><small>${[it.color, it.size && "O'lcham: " + it.size].filter(Boolean).map(esc).join(' · ')} × ${it.qty}</small></div><b>${money(it.price * it.qty)}</b></div>`).join('')}</div></div>
    <div class="panel sticky"><h3>Ma'lumotlar</h3>
      <div class="srow"><span>Mahsulotlar</span><b>${money(o.subtotal)}</b></div><div class="srow"><span>Yetkazish</span><b>${o.delivery ? money(o.delivery) : 'Bepul'}</b></div>
      <div class="srow t"><span>Jami</span><span>${money(o.total)}</span></div>
      <div class="srow"><span>To'lov</span><b>${esc(PAYST[o.payment.status])}</b></div>
      <hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
      <p style="font-size:14px"><b>${esc(o.name)}</b><br>${esc('+' + o.phone)}<br>${esc(o.address)}</p>${o.note ? `<p style="font-size:13.5px;color:var(--muted);margin-top:8px">Izoh: ${esc(o.note)}</p>` : ''}
      <p style="font-size:12.5px;color:var(--muted);margin-top:10px">Sana: ${esc(new Date(o.createdAt).toLocaleString('uz-UZ'))}</p></div></div></div>`;

  if ($('#cpcard')) $('#cpcard').onclick = () => copyText(o.payInfo.cardNumber.replace(/\s/g, ''));
  let receipt = null;
  if ($('#rcpt')) $('#rcpt').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { receipt = await fileToDataURL(f); $('#upltxt').innerHTML = '✓ Chek tanlandi<br><img src="' + receipt + '" alt="">'; }
    catch (err) { toast(err.message); }
  };
  if ($('#paidbtn')) $('#paidbtn').onclick = async (e) => {
    e.target.disabled = true;
    try { await api(`/api/orders/${o.id}/paid?t=${encodeURIComponent(t)}`, 'POST', { receipt }); toast('Yuborildi ✓'); pageOrder(app, id, q); }
    catch (err) { $('#perr').innerHTML = `<div class="err" style="margin-top:12px">${esc(err.message)}</div>`; e.target.disabled = false; }
  };
}

function pageAuth(app, mode) {
  if (S.me) { location.hash = '#/profile'; return; }
  const reg = mode === 'register';
  app.innerHTML = `<div class="wrap"><div class="authbox panel"><div class="tabs"><a href="#/login" class="${!reg ? 'on' : ''}">Kirish</a><a href="#/register" class="${reg ? 'on' : ''}">Ro'yxatdan o'tish</a></div>
    <form id="af"><div id="aerr"></div>
      ${reg ? '<div class="field"><label>Ismingiz</label><input name="name" required maxlength="80" autocomplete="name"></div>' : ''}
      <div class="field"><label>Telefon raqam</label><input name="phone" required inputmode="tel" placeholder="+998 90 123 45 67" autocomplete="tel"></div>
      <div class="field"><label>Parol</label><input name="password" type="password" required minlength="${reg ? 6 : 1}" autocomplete="${reg ? 'new-password' : 'current-password'}">${reg ? '<small style="color:var(--muted)">Kamida 6 ta belgi</small>' : ''}</div>
      <button class="btn dark block">${reg ? "Ro'yxatdan o'tish" : 'Kirish'}</button></form></div></div>`;
  $('#af').onsubmit = async (e) => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    try { const d = await api(reg ? '/api/register' : '/api/login', 'POST', f); S.me = d.user; updAcc(); toast('Xush kelibsiz, ' + d.user.name + '!'); location.hash = S.cart.length ? '#/checkout' : '#/profile'; }
    catch (err) { $('#aerr').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
  };
}

async function pageProfile(app) {
  const local = myOrders();
  let orders = [];
  if (S.me) { orders = (await api('/api/my/orders')).orders; }
  else if (local.length) {
    const res = await Promise.all(local.map((l) => api(`/api/orders/${l.id}?t=${encodeURIComponent(l.token)}`).then((d) => ({ ...d.order, token: l.token })).catch(() => null)));
    orders = res.filter(Boolean);
  }
  const ol = orders.length ? orders.map((o) => `<a class="ocard" href="#/order/${esc(o.id)}?t=${encodeURIComponent(o.token || '')}">
      <div class="thumbs2">${o.items.slice(0, 4).map((i) => `<img src="${esc(i.image)}" alt="">`).join('')}</div>
      <div><b>Buyurtma №${esc(o.id)}</b><br><small style="color:var(--muted)">${esc(new Date(o.createdAt).toLocaleDateString('uz-UZ'))} · ${o.items.reduce((a, i) => a + i.qty, 0)} dona</small></div>
      <div style="text-align:right"><b>${money(o.total)}</b><br><span class="status st-${esc(o.status)}">${esc(STATUS[o.status])}</span></div></a>`).join('')
    : '<div class="empty" style="padding:30px 0"><p>Hozircha buyurtmalar yo\'q.</p></div>';
  app.innerHTML = `<div class="wrap"><div class="pagehead"><h1>${S.me ? 'Mening profilim' : 'Buyurtmalarim'}</h1></div><div class="two">
    <div class="panel"><h3>Buyurtmalar</h3>${ol}</div>
    <div class="panel">${S.me ? `<h3>${esc(S.me.name)}</h3><p style="color:var(--muted);margin-bottom:16px">+${esc(S.me.phone)}</p>
      <form id="pf"><div id="perr"></div><div class="field"><label>Ism</label><input name="name" value="${esc(S.me.name)}" required maxlength="80"></div>
        <div class="field"><label>Joriy parol (almashtirish uchun)</label><input name="oldPassword" type="password" autocomplete="current-password"></div>
        <div class="field"><label>Yangi parol</label><input name="newPassword" type="password" minlength="6" autocomplete="new-password"></div>
        <button class="btn dark block">Saqlash</button></form>
      <button class="btn line block" id="lo" style="margin-top:12px">Chiqish</button>`
      : `<h3>Profil</h3><p style="color:var(--ink2);margin-bottom:16px">Ro'yxatdan o'tsangiz, barcha buyurtmalaringiz bitta joyda saqlanadi va qayta buyurtma berish osonlashadi.</p>
      <a class="btn dark block" href="#/register">Ro'yxatdan o'tish</a><a class="btn line block" href="#/login" style="margin-top:10px">Kirish</a>`}</div></div></div>`;
  if (S.me) {
    $('#pf').onsubmit = async (e) => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
      if (!f.newPassword) { delete f.newPassword; delete f.oldPassword; }
      try { const d = await api('/api/me', 'POST', f); S.me = d.user; updAcc(); toast('Saqlandi ✓'); }
      catch (err) { $('#perr').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
    };
    $('#lo').onclick = async () => { await api('/api/logout', 'POST'); S.me = null; updAcc(); location.hash = '#/'; };
  }
}

/* ====================== qidiruv, menyu ====================== */
function doSearch(v) { v = v.trim(); location.hash = '#/catalog' + (v ? '?q=' + encodeURIComponent(v) : ''); }
$('#sform').onsubmit = (e) => { e.preventDefault(); doSearch($('#sq').value); };
$('#sform2').onsubmit = (e) => { e.preventDefault(); doSearch($('#sq2').value); };
$('#burger').onclick = () => $('#nav').classList.toggle('open');
updBadge();
boot();
