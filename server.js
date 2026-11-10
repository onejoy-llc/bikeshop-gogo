// バイクショップGOGO — サイト本体 + 管理画面サーバー（追加ライブラリなし）
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const render = require('./lib/render');

const PORT = Number(process.env.PORT) || 3210;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(PUBLIC_DIR, 'uploads');
const SITE_FILE = path.join(DATA_DIR, 'site.json');
const INQ_FILE = path.join(DATA_DIR, 'inquiries.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- データの読み書き ----------
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}
const loadSite = () => readJson(SITE_FILE, null);
const loadInquiries = () => readJson(INQ_FILE, []);

// ---------- 入力の整形（管理画面から届いたデータを決まった形にそろえる） ----------
const str = (v, max = 2000) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max).trim();
const text = (v, max = 5000) => (typeof v === 'string' ? v : '').slice(0, max).replace(/\r\n/g, '\n').trim();
const int = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? n : 0; };
const img = (v) => { const s = str(v, 300); return /^\/uploads\/[\w.\-]+$/.test(s) ? s : ''; };
const link = (v) => { const s = str(v, 500); return /^https?:\/\//i.test(s) ? s : ''; };
const slug = (v) => str(v, 60).toLowerCase().replace(/[^a-z0-9\-_]/g, '');
const arr = (v) => (Array.isArray(v) ? v : []);
const newId = () => 'i' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');

function cleanItem(v, kind) {
  const base = {
    id: slug(v.id) || newId(),
    name: str(v.name, 120),
    category: str(v.category, 60),
    price: int(v.price),
    status: ['販売中', '商談中', '売約済'].includes(v.status) ? v.status : '販売中',
    published: v.published !== false,
    createdAt: /^\d{4}-\d{2}-\d{2}$/.test(v.createdAt) ? v.createdAt : new Date().toISOString().slice(0, 10),
    images: arr(v.images).map(img).filter(Boolean).slice(0, 30),
  };
  if (kind === 'vehicle') {
    base.type = v.type === 'minicar' ? 'minicar' : 'bike';
    base.specs = arr(v.specs).map((s) => ({ k: str(s && s.k, 40), v: str(s && s.v, 200) })).filter((s) => s.k || s.v).slice(0, 40);
  } else {
    base.description = text(v.description, 3000);
  }
  return base;
}

function cleanSite(d) {
  const s = d.site || {}, sh = d.shop || {}, r = d.rental || {}, c = d.contact || {};
  const uniq = (items) => { const seen = new Set(); return items.filter((i) => !seen.has(i.id) && seen.add(i.id)); };
  return {
    site: {
      name: str(s.name, 60) || 'バイクショップGOGO',
      nameEn: str(s.nameEn, 60) || 'BIKESHOP GOGO',
      tagline: str(s.tagline, 60),
      intro: text(s.intro, 2000),
      heroImage: img(s.heroImage),
      subImage: img(s.subImage),
    },
    shop: {
      address: str(sh.address, 200),
      mapQuery: str(sh.mapQuery, 200),
      hours: str(sh.hours, 100),
      closedText: str(sh.closedText, 100),
      closedWeekdays: arr(sh.closedWeekdays).map(Number).filter((n) => n >= 0 && n <= 6),
      extraClosedDates: arr(sh.extraClosedDates).map((x) => str(x, 10)).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(0, 200),
      phone: str(sh.phone, 30),
      twitter: link(sh.twitter),
      instagram: link(sh.instagram),
    },
    rental: { text: text(r.text, 2000), linkName: str(r.linkName, 80), url: link(r.url), banner: img(r.banner) },
    contact: { text: text(c.text, 2000) },
    optionIntro: text(d.optionIntro, 1000),
    options: uniq(arr(d.options).slice(0, 100).map((o) => ({
      id: slug(o.id) || newId(), name: str(o.name, 120), price: int(o.price), description: text(o.description, 2000), image: img(o.image),
    }))),
    vehicles: uniq(arr(d.vehicles).slice(0, 500).map((v) => cleanItem(v, 'vehicle'))),
    parts: uniq(arr(d.parts).slice(0, 500).map((v) => cleanItem(v, 'part'))),
  };
}

// ---------- ログイン ----------
const sessions = new Map(); // token -> 有効期限
const SESSION_MS = 1000 * 60 * 60 * 12;
const loginFails = new Map(); // ip -> {count, until}

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function checkPassword(pw) {
  const a = readJson(AUTH_FILE, null);
  if (!a) return false;
  const h = crypto.scryptSync(pw, a.salt, 64);
  const stored = Buffer.from(a.hash, 'hex');
  return h.length === stored.length && crypto.timingSafeEqual(h, stored);
}
const hasPassword = () => !!readJson(AUTH_FILE, null);
function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => { const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim(); });
  return out;
}
function isAuthed(req) {
  const t = cookies(req).gogo_admin;
  const exp = t && sessions.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(t); return false; }
  return true;
}
function startSession(res) {
  const t = crypto.randomBytes(32).toString('hex');
  sessions.set(t, Date.now() + SESSION_MS);
  res.setHeader('Set-Cookie', `gogo_admin=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MS / 1000}`);
}

// ---------- 共通の応答 ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', ...extra });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), MIME['.json'], { 'Cache-Control': 'no-store' });
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function serveFile(res, baseDir, rel) {
  const file = path.normalize(path.join(baseDir, rel));
  if (!file.startsWith(baseDir + path.sep)) return false;
  let st; try { st = fs.statSync(file); } catch { return false; }
  if (!st.isFile()) return false;
  const type = MIME[path.extname(file).toLowerCase()];
  if (!type) return false;
  const cache = rel.startsWith('uploads') || baseDir === UPLOAD_DIR ? 'public, max-age=86400' : 'no-cache';
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
  return true;
}
const clientIp = (req) => req.socket.remoteAddress || '';

// ---------- 管理用API ----------
async function adminApi(req, res, url) {
  const p = url.pathname;
  const isWrite = req.method !== 'GET';
  if (isWrite && req.headers['x-requested-with'] !== 'gogo-admin') return json(res, 403, { error: '不正なリクエストです' });

  if (p === '/api/admin/state' && req.method === 'GET') {
    return json(res, 200, { needsSetup: !hasPassword(), authed: isAuthed(req) });
  }
  if (p === '/api/admin/setup' && req.method === 'POST') {
    if (hasPassword()) return json(res, 400, { error: 'パスワードは設定済みです' });
    const b = JSON.parse(await readBody(req, 1e4));
    if (str(b.password, 200).length < 8) return json(res, 400, { error: 'パスワードは8文字以上にしてください' });
    writeJson(AUTH_FILE, hashPassword(b.password));
    startSession(res);
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/login' && req.method === 'POST') {
    const ip = clientIp(req), f = loginFails.get(ip);
    if (f && f.count >= 5 && f.until > Date.now()) return json(res, 429, { error: '試行回数が多すぎます。10分ほど待ってからやり直してください' });
    const b = JSON.parse(await readBody(req, 1e4));
    if (!checkPassword(str(b.password, 200))) {
      loginFails.set(ip, { count: ((f && f.until > Date.now() && f.count) || 0) + 1, until: Date.now() + 600000 });
      return json(res, 401, { error: 'パスワードが違います' });
    }
    loginFails.delete(ip);
    startSession(res);
    return json(res, 200, { ok: true });
  }

  if (!isAuthed(req)) return json(res, 401, { error: 'ログインが必要です' });

  if (p === '/api/admin/logout' && req.method === 'POST') {
    sessions.delete(cookies(req).gogo_admin);
    res.setHeader('Set-Cookie', 'gogo_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }
  if (p === '/api/admin/data' && req.method === 'GET') {
    return json(res, 200, { data: loadSite(), inquiries: loadInquiries() });
  }
  if (p === '/api/admin/data' && req.method === 'PUT') {
    const data = cleanSite(JSON.parse(await readBody(req, 5e6)));
    writeJson(SITE_FILE, data);
    return json(res, 200, { ok: true, data });
  }
  if (p === '/api/admin/upload' && req.method === 'POST') {
    const type = (req.headers['content-type'] || '').split(';')[0];
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[type];
    if (!ext) return json(res, 400, { error: 'JPEG・PNG・WebPの画像だけアップロードできます' });
    const buf = await readBody(req, 12e6);
    const name = Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + ext;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    return json(res, 200, { url: '/uploads/' + name });
  }
  if (p === '/api/admin/inquiries' && req.method === 'PUT') {
    const b = JSON.parse(await readBody(req, 1e5));
    let list = loadInquiries();
    if (b.action === 'delete') list = list.filter((i) => i.id !== b.id);
    if (b.action === 'done') list = list.map((i) => (i.id === b.id ? { ...i, done: !!b.done } : i));
    writeJson(INQ_FILE, list);
    return json(res, 200, { ok: true, inquiries: list });
  }
  if (p === '/api/admin/password' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req, 1e4));
    if (!checkPassword(str(b.current, 200))) return json(res, 400, { error: '現在のパスワードが違います' });
    if (str(b.next, 200).length < 8) return json(res, 400, { error: '新しいパスワードは8文字以上にしてください' });
    writeJson(AUTH_FILE, hashPassword(b.next));
    return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: 'not found' });
}

// ---------- お問い合わせ ----------
const contactHits = new Map();
async function handleContact(req, res, site) {
  const form = new URLSearchParams((await readBody(req, 5e4)).toString('utf8'));
  const v = { name: str(form.get('name'), 80), email: str(form.get('email'), 200), message: text(form.get('message') || '', 4000) };
  const errors = [];
  if (!v.name) errors.push('氏名を入力してください。');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.push('メールアドレスを正しく入力してください。');
  if (!v.message) errors.push('お問い合わせ内容を入力してください。');
  const ip = clientIp(req), now = Date.now();
  const hits = (contactHits.get(ip) || []).filter((t) => now - t < 3600000);
  if (!errors.length && hits.length >= 5) errors.push('短時間に送信が続いています。しばらく時間をおいてお試しください。');
  if (errors.length) return send(res, 400, render.contact(site, { values: v, errors }));
  if (!form.get('website')) { // 入力欄「website」は迷惑送信よけ（人には見えない）
    hits.push(now); contactHits.set(ip, hits);
    const list = loadInquiries();
    list.unshift({ id: newId(), at: new Date().toISOString(), ...v, done: false });
    writeJson(INQ_FILE, list.slice(0, 2000));
  }
  res.writeHead(303, { Location: '/contact?sent=1' });
  res.end();
}

// ---------- ルーティング ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);

    if (p.startsWith('/api/admin/')) return await adminApi(req, res, url);
    if (p.startsWith('/uploads/')) { if (serveFile(res, UPLOAD_DIR, p.slice(9))) return; }
    else if (/\.\w+$/.test(p)) { if (serveFile(res, PUBLIC_DIR, p.slice(1))) return; }
    if (p === '/admin') { if (serveFile(res, PUBLIC_DIR, 'admin/index.html')) return; }

    const site = loadSite();
    if (!site) return send(res, 500, 'data/site.json が読み込めません');

    if (p === '/contact' && req.method === 'POST') return await handleContact(req, res, site);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed', 'text/plain');

    let html = null, m;
    if (p === '/') html = render.home(site);
    else if (p === '/vehicles') html = render.list(site, 'vehicles', url.searchParams.get('type'));
    else if ((m = p.match(/^\/vehicles\/([\w\-]+)$/))) html = render.detail(site, 'vehicles', m[1]);
    else if (p === '/parts') html = render.list(site, 'parts');
    else if ((m = p.match(/^\/parts\/([\w\-]+)$/))) html = render.detail(site, 'parts', m[1]);
    else if (p === '/option') html = render.option(site);
    else if (p === '/rental') html = render.rental(site);
    else if (p === '/shop') html = render.shop(site);
    else if (p === '/contact') html = render.contact(site, { sent: url.searchParams.get('sent') === '1', item: str(url.searchParams.get('item'), 120) });

    if (html) return send(res, 200, html);
    return send(res, 404, render.notFound(site));
  } catch (e) {
    if (e instanceof SyntaxError || e.message === 'too large') return json(res, 400, { error: '送信内容を読み取れませんでした' });
    console.error(e);
    if (!res.headersSent) send(res, 500, 'Server Error', 'text/plain');
  }
});

server.listen(PORT, () => {
  console.log(`バイクショップGOGO  http://localhost:${PORT}  （管理画面 http://localhost:${PORT}/admin）`);
});
