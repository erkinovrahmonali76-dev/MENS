'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n || 0)).replace(/ /g, ' ') + " so'm";
const fdate = (s) => new Date(s).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
const STATUS = { new: 'Yangi', pending_payment: "To'lov tekshirilmoqda", confirmed: 'Tasdiqlandi', shipping: 'Yetkazilmoqda', done: 'Yetkazildi', cancelled: 'Bekor qilindi' };
const PAYST = { unpaid: "To'lanmagan", pending: 'Tekshirilmoqda', paid: "To'langan" };

async function api(url, method = 'GET', body) {
  const r = await fetch(url, { method, credentials: 'same-origin', headers: method !== 'GET' ? { 'Content-Type': 'application/json' } : {}, body: method !== 'GET' ? JSON.stringify(body || {}) : undefined });
  let d = {}; try { d = await r.json(); } catch (e) { /* */ }
  if (r.status === 401 && !url.includes('/login')) { renderLogin(); throw new Error(d.error || 'Kirish kerak'); }
  if (!r.ok) throw new Error(d.error || 'Xatolik');
  return d;
}
let tt;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2500); }
function fileToDataURL(file, max = 1400) {
  return new Promise((res, rej) => {
    const fr = new FileReader(); fr.onerror = () => rej(new Error("Faylni o'qib bo'lmadi"));
    fr.onload = () => { const im = new Image(); im.onerror = () => rej(new Error('Bu rasm emas'));
      im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.86)); };
      im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}

const A = { tab: 'dash', orders: [], products: [], cats: [], users: [], settings: null, filter: 'all', q: '', pq: '', uq: '', sse: false };

/* ------------------------------------------------------------ login */
function renderLogin() {
  $('#root').innerHTML = `<div class="login"><form id="lf"><h1>🔐 Admin panel</h1><p>Faqat do'kon egasi uchun</p><div id="le"></div>
    <div class="field"><label>Parol</label><input type="password" id="lp" required autofocus autocomplete="current-password"></div>
    <button class="btn" style="width:100%">Kirish</button></form></div>`;
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/admin/login', 'POST', { password: $('#lp').value }); await start(); }
    catch (err) { $('#le').innerHTML = `<div class="err">${esc(err.message)}</div>`; }
  };
}

/* ------------------------------------------------------------ shell */
const TABS = [['dash', '📊', 'Boshqaruv'], ['orders', '🧾', 'Buyurtmalar'], ['products', '👔', 'Mahsulotlar'], ['cats', '🗂️', "Bo'limlar"], ['users', '👥', 'Mijozlar'], ['settings', '⚙️', 'Sozlamalar']];
function shell() {
  const pend = A.orders.filter((o) => o.status !== 'cancelled' && (o.status === 'new' || o.payment.status === 'pending')).length;
  $('#root').innerHTML = `<div class="app"><aside><div class="brand">ADMIN <span>PANEL</span></div>
    ${TABS.map(([k, i, l]) => `<button class="nav ${A.tab === k ? 'on' : ''}" data-t="${k}">${i} ${l}${k === 'orders' && pend ? `<span class="pill">${pend}</span>` : ''}</button>`).join('')}
    <div class="sp"></div><div class="live ${A.sse ? 'on' : ''}" style="padding:0 12px 10px"><i></i> ${A.sse ? 'Jonli ulangan' : 'Ulanmoqda…'}</div><button class="nav" id="snd">${sndOn() ? '🔔 Tovush: yoqilgan' : '🔕 Tovush: yopiq'}</button><a href="/" target="_blank" class="nav" style="color:#cfc6b0;text-decoration:none;padding:11px 12px">🌐 Saytni ko'rish</a>
    <button class="nav" id="lo">🚪 Chiqish</button></aside><main id="main"></main></div>`;
  document.querySelectorAll('aside button[data-t]').forEach((b) => b.onclick = () => { A.tab = b.dataset.t; render(); });
  $('#snd').onclick = () => { localStorage.setItem('snd', sndOn() ? '0' : '1'); if (sndOn()) beep(); render(); };
  $('#lo').onclick = async () => { await api('/api/admin/logout', 'POST'); if (es) { es.close(); es = null; } renderLogin(); };
}
async function loadAll() {
  const [o, p, c, u, s] = await Promise.all([api('/api/admin/orders'), api('/api/shop'), null, api('/api/admin/users'), api('/api/admin/settings')]);
  A.orders = o.orders; A.products = p.products; A.cats = p.categories; A.users = u.users; A.settings = s.settings;
}
async function start() {
  const me = await fetch('/api/admin/me', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({}));
  if (!me.admin) return renderLogin();
  await loadAll(); render(); connectLive();
}
async function render() {
  shell();
  const m = $('#main');
  ({ dash: viewDash, orders: viewOrders, products: viewProducts, cats: viewCats, users: viewUsers, settings: viewSettings }[A.tab])(m);
}
async function refresh() { await loadAll(); render(); }

/* ------------------------------------------------------------ jonli aloqa */
function sndOn() { return localStorage.getItem('snd') !== '0'; }
let actx;
function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175, 1480].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = f; o.connect(g); g.connect(actx.destination);
      const t = actx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.start(t); o.stop(t + 0.16);
    });
  } catch (e) { /* */ }
}
let es = null, unread = 0;
const baseTitle = document.title;
window.addEventListener('focus', () => { unread = 0; document.title = baseTitle; });
function paintLive() {
  const l = document.querySelector('.live'); if (!l) return;
  l.classList.toggle('on', A.sse); l.lastChild.textContent = A.sse ? ' Jonli ulangan' : ' Ulanmoqda…';
}
async function refreshQuiet() {
  try {
    await loadAll();
    const ae = document.activeElement;
    if (!(ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.closest('main'))) render();
  } catch (e) { /* */ }
}
function connectLive() {
  if (es) return;
  es = new EventSource('/api/admin/events');
  es.onopen = () => { A.sse = true; paintLive(); };
  es.onerror = () => { A.sse = false; paintLive(); if (es && es.readyState === 2) es = null; };
  const on = (txt) => (e) => {
    let d = {}; try { d = JSON.parse(e.data); } catch (x) { /* */ }
    if (sndOn()) beep();
    toast(txt(d)); unread++; document.title = '(' + unread + ') ' + baseTitle;
    refreshQuiet();
  };
  es.addEventListener('order', on((d) => '🛍 Yangi buyurtma №' + d.id + ' — ' + d.name + ' · ' + money(d.total)));
  es.addEventListener('payment', on((d) => "💳 To'lov keldi №" + d.id + ' — tekshiring'));
}

/* ------------------------------------------------------------ dashboard */
async function viewDash(m) {
  m.innerHTML = '<h1 class="t">Boshqaruv paneli</h1><div id="dc">Yuklanmoqda…</div>';
  const s = await api('/api/admin/stats');
  const mx = Math.max(1, ...s.days.map((d) => d.orders));
  const dn = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
  $('#dc').innerHTML = `<div class="cards">
    <div class="stat"><small>Jami buyurtmalar</small><b>${s.orders}</b></div>
    <div class="stat"><small>Bugungi buyurtmalar</small><b>${s.days[6].orders}</b></div>
    <div class="stat"><small>Yangi buyurtmalar</small><b>${s.newOrders}</b></div>
    <div class="stat"><small>To'lov kutilmoqda</small><b style="color:var(--warn)">${s.pendingPayments}</b></div>
    <div class="stat"><small>Tasdiqlangan tushum</small><b style="color:var(--ok)">${money(s.revenue)}</b></div>
    <div class="stat"><small>Bugungi tushum</small><b>${money(s.todayRevenue)}</b></div>
    <div class="stat"><small>Mijozlar / Mahsulotlar</small><b>${s.customers} / ${s.products}</b></div></div>
    <div class="two2"><div class="box"><h3 style="margin-bottom:10px">So'nggi 7 kun (buyurtmalar soni)</h3>
      <div class="chart">${s.days.map((d) => `<div class="col" title="Tushum: ${esc(money(d.revenue))}"><b style="color:var(--ink);font-size:12px">${d.orders}</b><div class="bar" style="height:${Math.max(3, Math.round(d.orders / mx * 100))}px"></div><span>${dn[new Date(d.date).getUTCDay()]} ${esc(d.date.slice(8))}</span></div>`).join('')}</div></div>
      <div class="box"><h3 style="margin-bottom:10px">Eng ko'p sotilganlar</h3>${s.top.length ? s.top.map((t) => `<div class="top"><img class="thumb" src="${esc(t.image)}" alt=""><span class="nm">${esc(t.name)}</span><b>${t.qty} ta</b></div>`).join('') : '<p style="color:var(--muted)">Hali sotuv yo\'q</p>'}</div></div>
    <div class="box"><h3 style="margin-bottom:10px">So'nggi buyurtmalar</h3>${ordersTable(s.recent)}</div>`;
  bindOrderRows();
}

/* ------------------------------------------------------------ orders */
function ordersTable(list) {
  if (!list.length) return '<p style="color:var(--muted);padding:14px 0">Buyurtmalar yo\'q</p>';
  return `<table><tr><th>№</th><th>Mijoz</th><th>Mahsulotlar</th><th>Summa</th><th>To'lov</th><th>Holat</th><th>Sana</th></tr>${list.map((o) => `<tr class="click" data-o="${esc(o.id)}">
    <td><b>${esc(o.id)}</b></td><td>${esc(o.name)}<br><small style="color:var(--muted)">+${esc(o.phone)}</small></td>
    <td><div style="display:flex">${o.items.slice(0, 3).map((i) => `<img class="thumb" style="margin-right:-12px;border:2px solid #fff" src="${esc(i.image)}" alt="">`).join('')}</div></td>
    <td><b>${money(o.total)}</b></td><td><span class="st pp-${esc(o.payment.status)}">${esc(PAYST[o.payment.status])}</span>${o.payment.hasReceipt ? ' 📎' : ''}</td>
    <td><span class="st st-${esc(o.status)}">${esc(STATUS[o.status])}</span></td><td style="white-space:nowrap">${esc(fdate(o.createdAt))}</td></tr>`).join('')}</table>`;
}
function bindOrderRows() { document.querySelectorAll('tr[data-o]').forEach((r) => r.onclick = () => openOrder(r.dataset.o)); }
function orderFilter() {
  const f = A.filter, q = A.q.trim().toLowerCase();
  return A.orders.filter((o) => (f === 'all' || (f === 'payment' ? o.payment.status === 'pending' && o.status !== 'cancelled' : o.status === f)) &&
    (!q || [o.id, o.name, o.phone, o.address].join(' ').toLowerCase().includes(q)));
}
function exportCSV(list) {
  const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['№', 'Sana', 'Mijoz', 'Telefon', 'Manzil', 'Mahsulotlar', 'Yetkazish', 'Jami', "To'lov", 'Holat']]
    .concat(list.map((o) => [o.id, fdate(o.createdAt), o.name, '+' + o.phone, o.address,
      o.items.map((i) => i.name + (i.size ? ' (' + i.size + ')' : '') + ' x' + i.qty).join('; '), o.delivery, o.total, PAYST[o.payment.status], STATUS[o.status]]));
  const csv = '\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const el = document.createElement('a');
  el.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  el.download = 'buyurtmalar-' + new Date().toISOString().slice(0, 10) + '.csv'; el.click();
  setTimeout(() => URL.revokeObjectURL(el.href), 1000);
}
function viewOrders(m) {
  const f = A.filter;
  const chips = [['all', 'Hammasi'], ['payment', "To'lov tekshiruvi"], ...Object.entries(STATUS)];
  m.innerHTML = `<h1 class="t">Buyurtmalar <button class="btn line sm" id="ex" style="margin-left:auto">⬇ Excel (CSV)</button></h1>
    <div class="filters">${chips.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="filters"><input class="search" id="oq" placeholder="Qidirish: №, ism, telefon, manzil…" value="${esc(A.q)}"></div>
    <div class="box" id="ot">${ordersTable(orderFilter())}</div>`;
  m.querySelectorAll('.chip').forEach((c) => c.onclick = () => { A.filter = c.dataset.f; render(); });
  $('#oq').oninput = (e) => { A.q = e.target.value; $('#ot').innerHTML = ordersTable(orderFilter()); bindOrderRows(); };
  $('#ex').onclick = () => exportCSV(orderFilter());
  bindOrderRows();
}
function modal(html) {
  const bg = document.createElement('div'); bg.className = 'modalbg';
  bg.innerHTML = `<div class="modal"><button class="x" aria-label="Yopish">×</button>${html}</div>`;
  bg.onclick = (e) => { if (e.target === bg) bg.remove(); };
  bg.querySelector('.x').onclick = () => bg.remove();
  document.body.appendChild(bg); return bg;
}
async function openOrder(id) {
  const o = A.orders.find((x) => x.id === id); if (!o) return;
  const bg = modal(`<h2>Buyurtma №${esc(o.id)} <span class="st st-${esc(o.status)}">${esc(STATUS[o.status])}</span></h2>
    <div class="kv"><span>Mijoz</span><b>${esc(o.name)}</b><span>Telefon</span><b><a href="tel:+${esc(o.phone)}">+${esc(o.phone)}</a></b><span>Manzil</span><b>${esc(o.address)}</b>
      ${o.note ? `<span>Izoh</span><b>${esc(o.note)}</b>` : ''}<span>Sana</span><b>${esc(fdate(o.createdAt))}</b>
      <span>To'lov</span><b><span class="st pp-${esc(o.payment.status)}">${esc(PAYST[o.payment.status])}</span>${o.payment.paidAt ? ' · ' + esc(fdate(o.payment.paidAt)) : ''}</b></div>
    <table style="min-width:0"><tr><th></th><th>Mahsulot</th><th>Soni</th><th>Summa</th></tr>${o.items.map((i) => `<tr><td><img class="thumb" src="${esc(i.image)}" alt=""></td><td>${esc(i.name)}<br><small style="color:var(--muted)">${[i.color, i.size && "O'lcham: " + i.size].filter(Boolean).map(esc).join(' · ')}</small></td><td>${i.qty}</td><td>${money(i.price * i.qty)}</td></tr>`).join('')}
    <tr><td colspan="3" style="text-align:right">Yetkazish</td><td>${o.delivery ? money(o.delivery) : 'Bepul'}</td></tr>
    <tr><td colspan="3" style="text-align:right"><b>Jami</b></td><td><b>${money(o.total)}</b></td></tr></table>
    ${o.payment.receipt ? `<p style="margin-top:14px"><b>To'lov cheki:</b></p><a href="/api/admin/receipt/${esc(o.payment.receipt)}" target="_blank"><img class="receipt" src="/api/admin/receipt/${esc(o.payment.receipt)}" alt="chek"></a>` : '<p style="margin-top:14px;color:var(--muted)">Chek yuklanmagan.</p>'}
    <div class="field noprint" style="margin-top:16px"><label>Ichki izoh (mijoz ko'rmaydi)</label><textarea id="an" rows="2">${esc(o.adminNote)}</textarea></div>
    <div class="field noprint"><label>Buyurtma holati</label><select id="ss">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
    <div id="me"></div>
    <div class="row noprint">${o.payment.status !== 'paid' ? '<button class="btn ok" id="bpaid">✓ To\'lovni qabul qilish</button>' : '<button class="btn line" id="bunpaid">To\'lovni bekor qilish</button>'}
      <button class="btn line" id="bprint">🖨 Chop etish</button><button class="btn gold" id="bsave">Saqlash</button><button class="btn bad" id="bdel" style="margin-left:auto">O'chirish</button></div>`);
  const put = async (body, msg) => {
    try { await api('/api/admin/orders/' + o.id, 'PUT', body); toast(msg); bg.remove(); await refresh(); }
    catch (e) { $('#me', bg).innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  };
  $('#bsave', bg).onclick = () => put({ status: $('#ss', bg).value, adminNote: $('#an', bg).value }, 'Saqlandi ✓');
  $('#bprint', bg).onclick = () => window.print();
  if ($('#bpaid', bg)) $('#bpaid', bg).onclick = () => put({ paymentStatus: 'paid', adminNote: $('#an', bg).value }, "To'lov tasdiqlandi ✓");
  if ($('#bunpaid', bg)) $('#bunpaid', bg).onclick = () => put({ paymentStatus: 'unpaid' }, "To'lov bekor qilindi");
  $('#bdel', bg).onclick = async () => {
    if (!confirm('Buyurtma №' + o.id + ' butunlay o\'chirilsinmi?')) return;
    try { await api('/api/admin/orders/' + o.id, 'DELETE'); toast("O'chirildi"); bg.remove(); await refresh(); } catch (e) { toast(e.message); }
  };
}

/* ------------------------------------------------------------ products */
function prodTable() {
  const cn = (id) => (A.cats.find((c) => c.id === id) || {}).name || '—';
  const q = A.pq.trim().toLowerCase();
  const list = A.products.filter((p) => !q || (p.name + ' ' + cn(p.category)).toLowerCase().includes(q));
  if (!list.length) return '<p style="color:var(--muted);padding:14px 0">Mahsulot topilmadi</p>';
  return `<table><tr><th></th><th>Nomi</th><th>Bo'lim</th><th>Narx</th><th>Holat</th><th></th></tr>${list.map((p) => `<tr>
    <td><img class="thumb" src="${esc(p.images[0] || '')}" alt=""></td><td><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${esc(p.sizes.join(', '))}</small></td>
    <td>${esc(cn(p.category))}</td><td><b>${money(p.price)}</b>${p.oldPrice ? `<br><s style="color:var(--muted)">${money(p.oldPrice)}</s>` : ''}</td>
    <td><button class="chip" data-s="${esc(p.id)}" title="Bosib almashtiring">${p.inStock ? '✅ Sotuvda' : "⛔ Yo'q"}</button>${p.featured ? ' ⭐' : ''}</td>
    <td style="white-space:nowrap"><button class="btn line sm" data-e="${esc(p.id)}">Tahrirlash</button> <button class="btn line sm" data-c="${esc(p.id)}">Nusxa</button> <button class="btn bad sm" data-d="${esc(p.id)}">O'chirish</button></td></tr>`).join('')}</table>`;
}
function bindProd(m) {
  m.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => productForm(A.products.find((p) => p.id === b.dataset.e)));
  m.querySelectorAll('[data-s]').forEach((b) => b.onclick = async () => {
    const p = A.products.find((x) => x.id === b.dataset.s);
    try { await api('/api/admin/products/' + p.id, 'PUT', { ...p, inStock: !p.inStock }); toast(p.inStock ? 'Sotuvdan olindi' : "Sotuvga qo'yildi"); refresh(); } catch (e) { toast(e.message); }
  });
  m.querySelectorAll('[data-c]').forEach((b) => b.onclick = async () => {
    const p = A.products.find((x) => x.id === b.dataset.c);
    try { await api('/api/admin/products', 'POST', { ...p, name: p.name + ' (nusxa)', featured: false }); toast('Nusxa yaratildi ✓'); refresh(); } catch (e) { toast(e.message); }
  });
  m.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm("Mahsulot o'chirilsinmi?")) return;
    try { await api('/api/admin/products/' + b.dataset.d, 'DELETE'); toast("O'chirildi"); refresh(); } catch (e) { toast(e.message); }
  });
}
function viewProducts(m) {
  m.innerHTML = `<h1 class="t">Mahsulotlar <input class="search" id="pq" placeholder="Qidirish…" value="${esc(A.pq)}"><button class="btn gold" id="np" style="margin-left:auto">+ Yangi mahsulot</button></h1><div class="box" id="pt">${prodTable()}</div>`;
  $('#np').onclick = () => productForm(null);
  $('#pq').oninput = (e) => { A.pq = e.target.value; $('#pt').innerHTML = prodTable(); bindProd(m); };
  bindProd(m);
}
function productForm(p) {
  const d = p || { name: '', brand: '', category: (A.cats[0] || {}).id, price: '', oldPrice: '', desc: '', images: [], sizes: ['M', 'L', 'XL', 'XXL'], colors: [], inStock: true, featured: false };
  let images = d.images.slice();
  const bg = modal(`<h2>${p ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h2><div id="fe"></div>
    <div class="field"><label>Rasmlar (birinchisi asosiy)</label><div class="imgs" id="imgs"></div><input type="file" id="fi" accept="image/*" multiple></div>
    <div class="field"><label>Nomi *</label><input id="fn" value="${esc(d.name)}" maxlength="140"></div>
    <div class="frow"><div class="field"><label>Bo'lim *</label><select id="fc">${A.cats.map((c) => `<option value="${esc(c.id)}" ${d.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Brend (ixtiyoriy)</label><input id="fb" value="${esc(d.brand)}"></div></div>
    <div class="frow"><div class="field"><label>Narxi (so'm) *</label><input id="fp" type="number" min="1000" step="1000" value="${esc(d.price)}"></div>
      <div class="field"><label>Eski narx (chegirma uchun)</label><input id="fo" type="number" min="0" step="1000" value="${esc(d.oldPrice || '')}"></div></div>
    <div class="field"><label>Tavsif</label><textarea id="fd" rows="4">${esc(d.desc)}</textarea></div>
    <div class="frow"><div class="field"><label>O'lchamlar</label><input id="fs" value="${esc(d.sizes.join(', '))}"><small>Vergul bilan: M, L, XL yoki 40, 41, 42</small></div>
      <div class="field"><label>Ranglar</label><input id="fcl" value="${esc(d.colors.join(', '))}"><small>Bo'sh qoldirsangiz, rang tanlanmaydi</small></div></div>
    <div class="row" style="margin-bottom:16px"><label><input type="checkbox" id="fi2" ${d.inStock ? 'checked' : ''}> Sotuvda bor</label><label><input type="checkbox" id="ff" ${d.featured ? 'checked' : ''}> Bosh sahifada ko'rsatish ⭐</label></div>
    <button class="btn gold" id="fsave">Saqlash</button>`);
  const drawImgs = () => {
    $('#imgs', bg).innerHTML = images.map((u, i) => `<div class="im"><img src="${esc(u)}" alt=""><button data-x="${i}" title="O'chirish">×</button></div>`).join('') || '<small style="color:var(--muted)">Rasm yo\'q</small>';
    bg.querySelectorAll('[data-x]').forEach((b) => b.onclick = () => { images.splice(+b.dataset.x, 1); drawImgs(); });
  };
  drawImgs();
  $('#fi', bg).onchange = async (e) => {
    for (const f of e.target.files) {
      try { const data = await fileToDataURL(f); const r = await api('/api/admin/upload', 'POST', { data }); images.push(r.url); drawImgs(); }
      catch (err) { toast(err.message); }
    }
    e.target.value = '';
  };
  $('#fsave', bg).onclick = async (e) => {
    const body = {
      name: $('#fn', bg).value, category: $('#fc', bg).value, brand: $('#fb', bg).value, price: $('#fp', bg).value, oldPrice: $('#fo', bg).value || 0,
      desc: $('#fd', bg).value, sizes: $('#fs', bg).value, colors: $('#fcl', bg).value, images, inStock: $('#fi2', bg).checked, featured: $('#ff', bg).checked,
    };
    e.target.disabled = true;
    try {
      await api(p ? '/api/admin/products/' + p.id : '/api/admin/products', p ? 'PUT' : 'POST', body);
      toast('Saqlandi ✓'); bg.remove(); refresh();
    } catch (err) { $('#fe', bg).innerHTML = `<div class="err">${esc(err.message)}</div>`; e.target.disabled = false; }
  };
}

/* ------------------------------------------------------------ categories */
function viewCats(m) {
  m.innerHTML = `<h1 class="t">Bo'limlar</h1><div class="box"><table><tr><th>Nomi</th><th>Mahsulotlar</th><th></th></tr>${A.cats.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${A.products.filter((p) => p.category === c.id).length}</td>
    <td style="text-align:right;white-space:nowrap"><button class="btn line sm" data-r="${esc(c.id)}">Nomini o'zgartirish</button> <button class="btn bad sm" data-d="${esc(c.id)}">O'chirish</button></td></tr>`).join('')}</table>
    <form id="cf" class="row" style="margin-top:16px"><input id="cn" placeholder="Yangi bo'lim nomi" style="flex:1;min-width:180px;padding:10px 12px;border:1.5px solid var(--line);border-radius:9px" required><button class="btn gold">+ Qo'shish</button></form></div>`;
  $('#cf').onsubmit = async (e) => { e.preventDefault(); try { await api('/api/admin/categories', 'POST', { name: $('#cn').value }); toast("Qo'shildi ✓"); refresh(); } catch (er) { toast(er.message); } };
  m.querySelectorAll('[data-r]').forEach((b) => b.onclick = async () => {
    const c = A.cats.find((x) => x.id === b.dataset.r); const n = prompt('Yangi nom:', c.name); if (!n) return;
    try { await api('/api/admin/categories/' + c.id, 'PUT', { name: n }); toast('Saqlandi ✓'); refresh(); } catch (er) { toast(er.message); }
  });
  m.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm("Bo'lim o'chirilsinmi?")) return;
    try { await api('/api/admin/categories/' + b.dataset.d, 'DELETE'); toast("O'chirildi"); refresh(); } catch (er) { toast(er.message); }
  });
}

/* ------------------------------------------------------------ users */
function userTable() {
  const q = A.uq.trim().toLowerCase();
  const list = A.users.filter((u) => !q || (u.name + ' ' + u.phone).toLowerCase().includes(q));
  if (!list.length) return '<p style="color:var(--muted)">Mijoz topilmadi.</p>';
  return `<table><tr><th>Ism</th><th>Telefon</th><th>Buyurtmalar</th><th>Xaridlar</th><th>Ro'yxatdan o'tgan</th><th></th></tr>${list.map((u) => `<tr>
    <td><b>${esc(u.name)}</b></td><td><a href="tel:+${esc(u.phone)}">+${esc(u.phone)}</a></td><td>${u.orders}</td><td>${money(u.spent)}</td><td>${esc(fdate(u.createdAt))}</td>
    <td style="white-space:nowrap"><button class="btn line sm" data-o="${esc(u.phone)}">Buyurtmalari</button> <button class="btn bad sm" data-d="${esc(u.id)}">O'chirish</button></td></tr>`).join('')}</table>`;
}
function bindUsers(m) {
  m.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { A.q = b.dataset.o; A.filter = 'all'; A.tab = 'orders'; render(); });
  m.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm("Mijoz profili o'chirilsinmi? (Buyurtmalari saqlanadi)")) return;
    try { await api('/api/admin/users/' + b.dataset.d, 'DELETE'); toast("O'chirildi"); refresh(); } catch (e) { toast(e.message); }
  });
}
function viewUsers(m) {
  m.innerHTML = `<h1 class="t">Mijozlar (${A.users.length}) <input class="search" id="uq" placeholder="Ism yoki telefon…" value="${esc(A.uq)}"></h1><div class="box" id="ut">${userTable()}</div>`;
  $('#uq').oninput = (e) => { A.uq = e.target.value; $('#ut').innerHTML = userTable(); bindUsers(m); };
  bindUsers(m);
}

/* ------------------------------------------------------------ settings */
function viewSettings(m) {
  const s = A.settings;
  m.innerHTML = `<h1 class="t">Sozlamalar</h1>
  <div class="box"><h3 style="margin-bottom:14px">💳 To'lov kartasi</h3><div id="se"></div><form id="sf">
    <div class="frow"><div class="field"><label>Karta raqami</label><input name="cardNumber" value="${esc(s.cardNumber)}" inputmode="numeric"></div>
      <div class="field"><label>Karta egasi</label><input name="cardHolder" value="${esc(s.cardHolder)}"></div></div>
    <h3 style="margin:10px 0 14px">🏪 Do'kon ma'lumotlari</h3>
    <div class="frow"><div class="field"><label>Do'kon nomi</label><input name="shopName" value="${esc(s.shopName)}"></div><div class="field"><label>Shior</label><input name="tagline" value="${esc(s.tagline)}"></div></div>
    <div class="frow"><div class="field"><label>Telefon</label><input name="phone" value="${esc(s.phone)}"></div><div class="field"><label>Telegram (@username yoki havola)</label><input name="telegram" value="${esc(s.telegram)}"></div></div>
    <div class="field"><label>Yuqoridagi e'lon (bo'sh qoldirsangiz — bepul yetkazish matni chiqadi)</label><input name="announcement" value="${esc(s.announcement || '')}" maxlength="120"></div>
    <div class="field"><label>Manzil</label><input name="address" value="${esc(s.address)}"></div>
    <div class="frow"><div class="field"><label>Yetkazish narxi (so'm)</label><input name="deliveryFee" type="number" min="0" value="${esc(s.deliveryFee)}"></div>
      <div class="field"><label>Bepul yetkazish (shu summadan)</label><input name="freeDeliveryFrom" type="number" min="0" value="${esc(s.freeDeliveryFrom)}"></div></div>
    <button class="btn gold">Saqlash</button></form></div>
  <div class="box"><h3 style="margin-bottom:14px">🔑 Admin parolini o'zgartirish</h3><div id="pe"></div><form id="pf">
    <div class="frow"><div class="field"><label>Joriy parol</label><input type="password" name="oldPassword" required autocomplete="current-password"></div>
      <div class="field"><label>Yangi parol (kamida 8 ta belgi)</label><input type="password" name="newPassword" required minlength="8" autocomplete="new-password"></div></div>
    <button class="btn">Parolni almashtirish</button></form></div>
  <div class="box"><h3 style="margin-bottom:10px">🔔 Bildirishnomalar</h3>
    <p style="color:var(--muted);margin-bottom:12px">Yangi buyurtma va to'lov paneldagi ovoz bilan hamda Telegram orqali darrov xabar qilinadi. Telegram: ${s.telegramOn ? '<b style="color:var(--ok)">ulangan ✓</b>' : '<b style="color:var(--bad)">ulanmagan</b> (Render → Environment: TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID)'}</p>
    <div class="row"><button class="btn line" id="tgt">Telegramga sinov xabari</button><button class="btn line" id="snt">🔔 Tovushni tekshirish</button></div></div>
  <div class="box"><h3 style="margin-bottom:10px">💾 Zaxira nusxa</h3>
    <p style="color:var(--muted);margin-bottom:12px">Buyurtmalar, mijozlar va mahsulotlarni faylga yuklab oling (rasmlar va cheklar bu faylga kirmaydi). Fayl maxfiy — begonalarga bermang.</p>
    <div class="row"><a class="btn gold" href="/api/admin/backup">⬇ Zaxirani yuklab olish</a><label class="btn line">⬆ Zaxiradan tiklash<input type="file" id="rst" accept=".json,application/json" hidden></label></div></div>`;
  $('#tgt').onclick = async () => { try { await api('/api/admin/telegram-test', 'POST'); toast('Yuborildi ✓'); } catch (er) { toast(er.message); } };
  $('#snt').onclick = beep;
  $('#rst').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm("Hozirgi barcha ma'lumotlar zaxira bilan almashtiriladi. Davom etasizmi?")) { e.target.value = ''; return; }
    try { await api('/api/admin/restore', 'POST', { db: JSON.parse(await f.text()) }); toast('Tiklandi ✓'); refresh(); } catch (er) { toast(er.message); }
  };
  $('#sf').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('/api/admin/settings', 'PUT', Object.fromEntries(new FormData(e.target))); A.settings = r.settings; toast('Saqlandi ✓'); render(); }
    catch (er) { $('#se').innerHTML = `<div class="err">${esc(er.message)}</div>`; }
  };
  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/admin/password', 'POST', Object.fromEntries(new FormData(e.target))); toast('Parol almashtirildi ✓'); e.target.reset(); $('#pe').innerHTML = ''; }
    catch (er) { $('#pe').innerHTML = `<div class="err">${esc(er.message)}</div>`; }
  };
}

start();
