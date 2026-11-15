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

const A = { tab: 'dash', orders: [], products: [], cats: [], users: [], settings: null, filter: 'all' };

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
  const pend = A.orders.filter((o) => o.payment.status === 'pending' && o.status !== 'cancelled').length + A.orders.filter((o) => o.status === 'new' && o.payment.status === 'unpaid').length * 0;
  $('#root').innerHTML = `<div class="app"><aside><div class="brand">ADMIN <span>PANEL</span></div>
    ${TABS.map(([k, i, l]) => `<button class="nav ${A.tab === k ? 'on' : ''}" data-t="${k}">${i} ${l}${k === 'orders' && pend ? `<span class="pill">${pend}</span>` : ''}</button>`).join('')}
    <div class="sp"></div><a href="/" target="_blank" class="nav" style="color:#cfc6b0;text-decoration:none;padding:11px 12px">🌐 Saytni ko'rish</a>
    <button class="nav" id="lo">🚪 Chiqish</button></aside><main id="main"></main></div>`;
  document.querySelectorAll('aside button[data-t]').forEach((b) => b.onclick = () => { A.tab = b.dataset.t; render(); });
  $('#lo').onclick = async () => { await api('/api/admin/logout', 'POST'); renderLogin(); };
}
async function loadAll() {
  const [o, p, c, u, s] = await Promise.all([api('/api/admin/orders'), api('/api/shop'), null, api('/api/admin/users'), api('/api/admin/settings')]);
  A.orders = o.orders; A.products = p.products; A.cats = p.categories; A.users = u.users; A.settings = s.settings;
}
async function start() {
  const me = await fetch('/api/admin/me', { credentials: 'same-origin' }).then((r) => r.json()).catch(() => ({}));
  if (!me.admin) return renderLogin();
  await loadAll(); render();
}
async function render() {
  shell();
  const m = $('#main');
  ({ dash: viewDash, orders: viewOrders, products: viewProducts, cats: viewCats, users: viewUsers, settings: viewSettings }[A.tab])(m);
}
async function refresh() { await loadAll(); render(); }

/* ------------------------------------------------------------ dashboard */
async function viewDash(m) {
  m.innerHTML = '<h1 class="t">Boshqaruv paneli</h1><div id="dc">Yuklanmoqda…</div>';
  const s = await api('/api/admin/stats');
  $('#dc').innerHTML = `<div class="cards">
    <div class="stat"><small>Jami buyurtmalar</small><b>${s.orders}</b></div>
    <div class="stat"><small>Yangi buyurtmalar</small><b>${s.newOrders}</b></div>
    <div class="stat"><small>To'lov kutilmoqda</small><b style="color:var(--warn)">${s.pendingPayments}</b></div>
    <div class="stat"><small>Tasdiqlangan tushum</small><b style="color:var(--ok)">${money(s.revenue)}</b></div>
    <div class="stat"><small>Bugungi tushum</small><b>${money(s.todayRevenue)}</b></div>
    <div class="stat"><small>Mijozlar / Mahsulotlar</small><b>${s.customers} / ${s.products}</b></div></div>
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
function viewOrders(m) {
  const f = A.filter;
  const list = A.orders.filter((o) => f === 'all' || (f === 'payment' ? o.payment.status === 'pending' && o.status !== 'cancelled' : o.status === f));
  const chips = [['all', 'Hammasi'], ['payment', "To'lov tekshiruvi"], ...Object.entries(STATUS)];
  m.innerHTML = `<h1 class="t">Buyurtmalar</h1><div class="filters">${chips.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-f="${k}">${esc(l)}</button>`).join('')}</div><div class="box">${ordersTable(list)}</div>`;
  m.querySelectorAll('.chip').forEach((c) => c.onclick = () => { A.filter = c.dataset.f; render(); });
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
    <div class="field" style="margin-top:16px"><label>Ichki izoh (mijoz ko'rmaydi)</label><textarea id="an" rows="2">${esc(o.adminNote)}</textarea></div>
    <div class="field"><label>Buyurtma holati</label><select id="ss">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div>
    <div id="me"></div>
    <div class="row">${o.payment.status !== 'paid' ? '<button class="btn ok" id="bpaid">✓ To\'lovni qabul qilish</button>' : '<button class="btn line" id="bunpaid">To\'lovni bekor qilish</button>'}
      <button class="btn gold" id="bsave">Saqlash</button><button class="btn bad" id="bdel" style="margin-left:auto">O'chirish</button></div>`);
  const put = async (body, msg) => {
    try { await api('/api/admin/orders/' + o.id, 'PUT', body); toast(msg); bg.remove(); await refresh(); }
    catch (e) { $('#me', bg).innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  };
  $('#bsave', bg).onclick = () => put({ status: $('#ss', bg).value, adminNote: $('#an', bg).value }, 'Saqlandi ✓');
  if ($('#bpaid', bg)) $('#bpaid', bg).onclick = () => put({ paymentStatus: 'paid', adminNote: $('#an', bg).value }, "To'lov tasdiqlandi ✓");
  if ($('#bunpaid', bg)) $('#bunpaid', bg).onclick = () => put({ paymentStatus: 'unpaid' }, "To'lov bekor qilindi");
  $('#bdel', bg).onclick = async () => {
    if (!confirm('Buyurtma №' + o.id + ' butunlay o\'chirilsinmi?')) return;
    try { await api('/api/admin/orders/' + o.id, 'DELETE'); toast("O'chirildi"); bg.remove(); await refresh(); } catch (e) { toast(e.message); }
  };
}

/* ------------------------------------------------------------ products */
function viewProducts(m) {
  const cn = (id) => (A.cats.find((c) => c.id === id) || {}).name || '—';
  m.innerHTML = `<h1 class="t">Mahsulotlar <button class="btn gold" id="np" style="margin-left:auto">+ Yangi mahsulot</button></h1>
    <div class="box"><table><tr><th></th><th>Nomi</th><th>Bo'lim</th><th>Narx</th><th>Holat</th><th></th></tr>${A.products.map((p) => `<tr>
      <td><img class="thumb" src="${esc(p.images[0] || '')}" alt=""></td><td><b>${esc(p.name)}</b><br><small style="color:var(--muted)">${esc(p.sizes.join(', '))}</small></td>
      <td>${esc(cn(p.category))}</td><td><b>${money(p.price)}</b>${p.oldPrice ? `<br><s style="color:var(--muted)">${money(p.oldPrice)}</s>` : ''}</td>
      <td>${p.inStock ? '<span class="st st-confirmed">Sotuvda</span>' : '<span class="st st-cancelled">Yo\'q</span>'}${p.featured ? ' ⭐' : ''}</td>
      <td style="white-space:nowrap"><button class="btn line sm" data-e="${esc(p.id)}">Tahrirlash</button> <button class="btn bad sm" data-d="${esc(p.id)}">O'chirish</button></td></tr>`).join('')}</table></div>`;
  $('#np').onclick = () => productForm(null);
  m.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => productForm(A.products.find((p) => p.id === b.dataset.e)));
  m.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm("Mahsulot o'chirilsinmi?")) return;
    try { await api('/api/admin/products/' + b.dataset.d, 'DELETE'); toast("O'chirildi"); refresh(); } catch (e) { toast(e.message); }
  });
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
function viewUsers(m) {
  m.innerHTML = `<h1 class="t">Mijozlar (${A.users.length})</h1><div class="box">${A.users.length ? `<table><tr><th>Ism</th><th>Telefon</th><th>Buyurtmalar</th><th>Xaridlar</th><th>Ro'yxatdan o'tgan</th><th></th></tr>${A.users.map((u) => `<tr>
    <td><b>${esc(u.name)}</b></td><td><a href="tel:+${esc(u.phone)}">+${esc(u.phone)}</a></td><td>${u.orders}</td><td>${money(u.spent)}</td><td>${esc(fdate(u.createdAt))}</td>
    <td><button class="btn bad sm" data-d="${esc(u.id)}">O'chirish</button></td></tr>`).join('')}</table>` : '<p style="color:var(--muted)">Hali ro\'yxatdan o\'tgan mijozlar yo\'q.</p>'}</div>`;
  m.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
    if (!confirm("Mijoz profili o'chirilsinmi? (Buyurtmalari saqlanadi)")) return;
    try { await api('/api/admin/users/' + b.dataset.d, 'DELETE'); toast("O'chirildi"); refresh(); } catch (e) { toast(e.message); }
  });
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
    <div class="field"><label>Manzil</label><input name="address" value="${esc(s.address)}"></div>
    <div class="frow"><div class="field"><label>Yetkazish narxi (so'm)</label><input name="deliveryFee" type="number" min="0" value="${esc(s.deliveryFee)}"></div>
      <div class="field"><label>Bepul yetkazish (shu summadan)</label><input name="freeDeliveryFrom" type="number" min="0" value="${esc(s.freeDeliveryFrom)}"></div></div>
    <button class="btn gold">Saqlash</button></form></div>
  <div class="box"><h3 style="margin-bottom:14px">🔑 Admin parolini o'zgartirish</h3><div id="pe"></div><form id="pf">
    <div class="frow"><div class="field"><label>Joriy parol</label><input type="password" name="oldPassword" required autocomplete="current-password"></div>
      <div class="field"><label>Yangi parol (kamida 8 ta belgi)</label><input type="password" name="newPassword" required minlength="8" autocomplete="new-password"></div></div>
    <button class="btn">Parolni almashtirish</button></form></div>`;
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
