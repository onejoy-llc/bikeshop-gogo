// ページのHTMLを組み立てる
'use strict';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yen = (n) => '<span class="yen">¥</span>' + Number(n || 0).toLocaleString('ja-JP');
const paras = (t) => String(t || '').split(/\n+/).filter(Boolean).map((l) => `<p>${esc(l)}</p>`).join('');
const telHref = (p) => 'tel:' + String(p || '').replace(/[^\d+]/g, '');
const arrow = '<svg class="arw" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h21M16 1l6 5-6 5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

const NAV = [
  ['/vehicles', '車両在庫リスト', 'VEHICLE'],
  ['/parts', 'パーツ在庫リスト', 'PARTS'],
  ['/option', 'オプション', 'OPTION'],
  ['/rental', 'レンタル', 'RENTAL'],
  ['/shop', '店舗情報', 'SHOP'],
  ['/contact', 'お問い合わせ', 'CONTACT'],
];

function logo(site) {
  const en = site.site.nameEn || '';
  const i = en.lastIndexOf(' ');
  const small = i > 0 ? en.slice(0, i) : '';
  const large = i > 0 ? en.slice(i + 1) : en;
  return `<span class="logo-s">${esc(small)}</span><span class="logo-l">${esc(large)}</span>`;
}

function layout(site, { title, desc, path, body, bodyClass = '' }) {
  const s = site.site, sh = site.shop;
  const full = title ? `${title}｜${s.name}` : `${s.name}｜${s.tagline}`;
  const nav = NAV.map(([href, ja, en]) =>
    `<li><a href="${href}"${path === href || (href !== '/' && path.startsWith(href + '/')) ? ' aria-current="page"' : ''}><span class="nav-en">${en}</span>${ja}</a></li>`).join('');
  const sns = [
    sh.twitter && `<a href="${esc(sh.twitter)}" target="_blank" rel="noopener" aria-label="X (Twitter)"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.6 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.7 3h6.4l4.4 5.9L17.6 3zm-1.1 16.1h1.7L7.2 4.8H5.4l11.1 14.3z"/></svg></a>`,
    sh.instagram && `<a href="${esc(sh.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" d="M7 2.9h10A4.1 4.1 0 0 1 21.1 7v10a4.1 4.1 0 0 1-4.1 4.1H7A4.1 4.1 0 0 1 2.9 17V7A4.1 4.1 0 0 1 7 2.9z"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.4" cy="6.6" r="1.2" fill="currentColor"/></svg></a>`,
  ].filter(Boolean).join('');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc || s.intro.split('\n')[0])}">
<meta name="format-detection" content="telephone=no">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;1,600;1,700;1,800&family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">本文へ移動</a>
<header class="hd">
  <div class="hd-in">
    <a class="logo" href="/" aria-label="${esc(s.name)} トップページ">${logo(site)}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="gnav"><span></span><span></span><span class="menu-tx">MENU</span></button>
    <nav class="gnav" id="gnav" aria-label="メインメニュー"><ul>${nav}</ul>
      ${sh.phone ? `<a class="hd-tel" href="${telHref(sh.phone)}"><span>TEL</span>${esc(sh.phone)}</a>` : ''}
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
${path === '/contact' ? '' : `<section class="cta">
  <div class="cta-in">
    <div>
      <p class="cta-en">CONTACT</p>
      <h2>お問い合わせ</h2>
      <p class="cta-tx">車両・パーツ・オプション取り付けのご相談は、${site._static ? 'お電話' : 'フォームまたはお電話'}でどうぞ。</p>
    </div>
    <div class="cta-btns">
      <a class="btn btn-pink" href="/contact"><span>${site._static ? 'お問い合わせ' : 'お問い合わせフォーム'}</span>${arrow}</a>
      ${sh.phone ? `<a class="cta-tel" href="${telHref(sh.phone)}"><span>TEL</span>${esc(sh.phone)}</a>` : ''}
    </div>
  </div>
</section>`}
<footer class="ft">
  <div class="stripe" aria-hidden="true"></div>
  <div class="ft-in">
    <div class="ft-shop">
      <a class="logo" href="/">${logo(site)}</a>
      <p class="ft-name">${esc(s.name)}</p>
      <address>${esc(sh.address)}<br>営業時間　${esc(sh.hours)}<br>定休日　${esc(sh.closedText)}${sh.phone ? `<br>電話番号　<a href="${telHref(sh.phone)}">${esc(sh.phone)}</a>` : ''}</address>
      ${sns ? `<div class="sns">${sns}</div>` : ''}
    </div>
    <ul class="ft-nav">${NAV.map(([href, ja]) => `<li><a href="${href}">${ja}</a></li>`).join('')}</ul>
  </div>
  <p class="copy">&copy; ${new Date().getFullYear()} ${esc(s.nameEn)}</p>
</footer>
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

// ---------- 部品 ----------
const visible = (items) => (items || []).filter((i) => i.published !== false)
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

function card(item, kind) {
  const im = item.images && item.images[0];
  const sold = item.status && item.status !== '販売中';
  return `<li class="card" data-type="${esc(item.type || '')}" data-price="${Number(item.price) || 0}" data-date="${esc(item.createdAt)}">
  <a href="/${kind}/${esc(item.id)}">
    <div class="card-ph">${im ? `<img src="${esc(im)}" alt="" loading="lazy" width="600" height="600">` : '<span class="noimg">NO PHOTO</span>'}
      ${sold ? `<span class="badge">${esc(item.status)}</span>` : ''}</div>
    <div class="card-bd">
      <p class="card-cat">${esc(item.category)}</p>
      <h3>${esc(item.name)}</h3>
      <p class="card-pr">${yen(item.price)}</p>
    </div>
  </a>
</li>`;
}

const secHead = (en, ja, more) => `<header class="sec-hd"><div><p class="sec-en">${en}</p><h2>${ja}</h2></div>${more || ''}</header>`;
const pageHead = (en, ja, crumbs = []) => `<div class="pg-hd"><div class="pg-hd-in">
  <nav class="crumb" aria-label="パンくず"><a href="/">ホーム</a>${crumbs.map(([h, t]) => (h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join('')}</nav>
  <p class="pg-en">${en}</p><h1>${esc(ja)}</h1></div><div class="stripe" aria-hidden="true"></div></div>`;

// ---------- 各ページ ----------
function home(site) {
  const s = site.site;
  const vs = visible(site.vehicles).slice(0, 4);
  const ps = visible(site.parts).slice(0, 4);
  const body = `
<section class="hero">
  <div class="hero-in">
    <p class="hero-lb"><span>BUSINESS BIKE</span> SALES / REPAIR / RENTAL</p>
    <h1>${esc(s.tagline).replace(/(専門店)$/, '<span class="nb">$1</span>')}</h1>
    <p class="hero-nm">${esc(s.name)}</p>
    <div class="hero-btns">
      <a class="btn btn-ink" href="/vehicles"><span>車両在庫リスト</span>${arrow}</a>
      <a class="btn btn-line" href="/parts"><span>パーツ在庫リスト</span>${arrow}</a>
    </div>
  </div>
  <p class="hero-bg" aria-hidden="true">${esc((s.nameEn || '').split(' ').pop())}</p>
  ${s.heroImage ? `<div class="hero-ph"><img src="${esc(s.heroImage)}" alt="店頭に並ぶジャイロキャノピー" width="1600" height="592"></div>` : ''}
</section>
<div class="tick" aria-hidden="true"><div class="tick-in">${'<span>SALES</span><span>販売</span><span>REPAIR</span><span>修理</span><span>RENTAL</span><span>レンタル</span><span>OPTION</span><span>オプション取付</span>'.repeat(4)}</div></div>

<section class="sec about">
  <div class="wrap about-in">
    <div class="about-tx">
      <p class="sec-en">ABOUT</p>
      <h2>${esc(s.tagline)}</h2>
      ${paras(s.intro)}
    </div>
    <div class="about-side">
      ${s.subImage ? `<img src="${esc(s.subImage)}" alt="" loading="lazy">` : ''}
      <ul class="svc">
        <li><a href="/vehicles"><b>01</b><span>販売</span><i>SALES</i>${arrow}</a></li>
        <li><a href="/contact"><b>02</b><span>修理</span><i>REPAIR</i>${arrow}</a></li>
        <li><a href="/rental"><b>03</b><span>レンタル</span><i>RENTAL</i>${arrow}</a></li>
        <li><a href="/option"><b>04</b><span>オプション取り付け</span><i>OPTION</i>${arrow}</a></li>
      </ul>
    </div>
  </div>
</section>

<section class="sec sec-pink">
  <div class="wrap">
    ${secHead('NEW ARRIVAL', '新着車両')}
    ${vs.length ? `<ul class="cards">${vs.map((v) => card(v, 'vehicles')).join('')}</ul>` : '<p class="empty">現在掲載中の車両はありません。</p>'}
    <p class="more"><a class="btn btn-ink" href="/vehicles"><span>車両在庫リストを見る</span>${arrow}</a></p>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    ${secHead('NEW PARTS', '新着パーツ')}
    ${ps.length ? `<ul class="cards">${ps.map((v) => card(v, 'parts')).join('')}</ul>` : '<p class="empty">現在掲載中のパーツはありません。</p>'}
    <p class="more"><a class="btn btn-line" href="/parts"><span>パーツ在庫リストを見る</span>${arrow}</a></p>
  </div>
</section>`;
  return layout(site, { path: '/', body, bodyClass: 'is-home' });
}

function list(site, kind, type) {
  const isV = kind === 'vehicles';
  const items = visible(site[kind]);
  const cur = isV && (type === 'bike' || type === 'minicar') ? type : '';
  const count = (t) => items.filter((i) => !t || i.type === t).length;
  const tabs = isV ? `<div class="tabs" role="group" aria-label="絞り込み">
      ${[['', 'すべて'], ['bike', 'バイク'], ['minicar', 'ミニカー']].map(([t, l]) => `<button type="button" data-filter="${t}" aria-pressed="${cur === t}">${l}<small>${count(t)}</small></button>`).join('')}
    </div>` : '';
  const body = `${pageHead(isV ? 'VEHICLE STOCK' : 'PARTS STOCK', isV ? '車両在庫リスト' : 'パーツ在庫リスト', [[null, isV ? '車両' : 'パーツ']])}
<section class="sec">
  <div class="wrap">
    ${items.length ? `<div class="tools">${tabs}
      <label class="sort"><span>並び替え</span><select data-sort>
        <option value="new">新しい順</option><option value="low">価格順: 安い→高い</option><option value="high">価格順: 高い→安い</option>
      </select></label></div>
    <p class="count"><b data-count>${count(cur)}</b>件を表示</p>
    <ul class="cards" data-cards data-initial="${cur}">${items.map((v) => card(v, kind)).join('')}</ul>`
    : `<p class="empty">現在掲載中の${isV ? '車両' : 'パーツ'}はありません。</p>`}
  </div>
</section>`;
  return layout(site, { title: isV ? '車両在庫リスト' : 'パーツ在庫リスト', path: '/' + kind, body });
}

function detail(site, kind, id) {
  const isV = kind === 'vehicles';
  const item = visible(site[kind]).find((i) => i.id === id);
  if (!item) return null;
  const imgs = item.images || [];
  const sold = item.status && item.status !== '販売中';
  const others = visible(site[kind]).filter((i) => i.id !== id).slice(0, 4);
  const body = `${pageHead(isV ? 'VEHICLE STOCK' : 'PARTS STOCK', item.name, [['/' + kind, isV ? '車両' : 'パーツ'], [null, item.name]])}
<section class="sec">
  <div class="wrap dt">
    <div class="gal">
      <div class="gal-main">${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(item.name)}" data-gal-main>` : '<span class="noimg">NO PHOTO</span>'}
        ${imgs.length > 1 ? `<p class="gal-n"><b data-gal-n>01</b> / ${String(imgs.length).padStart(2, '0')}</p>` : ''}</div>
      ${imgs.length > 1 ? `<ul class="gal-th">${imgs.map((u, i) => `<li><button type="button" data-gal="${esc(u)}" data-i="${i + 1}" aria-label="写真${i + 1}を表示"${i === 0 ? ' aria-current="true"' : ''}><img src="${esc(u)}" alt="" loading="lazy"></button></li>`).join('')}</ul>` : ''}
    </div>
    <div class="dt-info">
      <p class="card-cat">${esc(item.category)}</p>
      <p class="dt-name">${esc(item.name)}${sold ? `<span class="badge badge-in">${esc(item.status)}</span>` : ''}</p>
      <p class="dt-pr">${yen(item.price)}</p>
      ${isV && item.specs && item.specs.length ? `<h2 class="dt-h">車両情報</h2>
      <dl class="spec">${item.specs.map((sp) => `<div><dt>${esc(sp.k)}</dt><dd>${esc(sp.v)}</dd></div>`).join('')}</dl>` : ''}
      ${!isV && item.description ? `<div class="dt-desc">${paras(item.description)}</div>` : ''}
      <a class="btn btn-ink btn-wide" href="/contact?item=${encodeURIComponent(item.name)}"><span>この${isV ? '車両' : 'パーツ'}について問い合わせる</span>${arrow}</a>
      ${site.shop.phone ? `<p class="dt-tel">お電話でのお問い合わせ　<a href="${telHref(site.shop.phone)}">${esc(site.shop.phone)}</a></p>` : ''}
    </div>
  </div>
</section>
${others.length ? `<section class="sec sec-pink"><div class="wrap">
  ${secHead('OTHER STOCK', isV ? 'ほかの車両' : 'ほかのパーツ')}
  <ul class="cards">${others.map((v) => card(v, kind)).join('')}</ul>
</div></section>` : ''}`;
  return layout(site, { title: item.name, path: '/' + kind + '/' + id, body });
}

function option(site) {
  const body = `${pageHead('OPTION', 'オプション', [[null, 'オプション']])}
<section class="sec">
  <div class="wrap">
    <div class="opt-lead">
      <h2>オプションについて</h2>
      <p class="formula" aria-label="部品代と取り付け工賃を合わせた料金"><span>部品代</span><b>+</b><span>取り付け工賃</span></p>
      ${paras(site.optionIntro)}
    </div>
    <ul class="opts">${(site.options || []).map((o, i) => `<li class="opt">
      <div class="opt-ph">${o.image ? `<img src="${esc(o.image)}" alt="${esc(o.name)}" loading="lazy">` : '<span class="noimg">NO PHOTO</span>'}</div>
      <div class="opt-bd">
        <p class="opt-no">OPTION ${String(i + 1).padStart(2, '0')}</p>
        <h3>${esc(o.name)}</h3>
        <p class="opt-pr">${yen(o.price)}</p>
        ${paras(o.description)}
      </div>
    </li>`).join('')}</ul>
  </div>
</section>`;
  return layout(site, { title: 'オプション', path: '/option', body });
}

function rental(site) {
  const r = site.rental;
  const body = `${pageHead('RENTAL', 'レンタル', [[null, 'レンタル']])}
<section class="sec">
  <div class="wrap narrow rent">
    ${r.banner && r.url ? `<a class="rent-bn" href="${esc(r.url)}" target="_blank" rel="noopener"><img src="${esc(r.banner)}" alt="${esc(r.linkName)}"></a>` : ''}
    <div class="prose">${paras(r.text)}</div>
    ${r.url ? `<a class="btn btn-ink" href="${esc(r.url)}" target="_blank" rel="noopener"><span>${esc(r.linkName || 'レンタルサイト')}を見る</span>${arrow}</a>
    <p class="rent-url">${esc(r.url)}</p>` : ''}
  </div>
</section>`;
  return layout(site, { title: 'レンタル', path: '/rental', body });
}

function calendar(shop, y, m) { // m: 0-11
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const closedW = new Set(shop.closedWeekdays || []);
  const closedD = new Set(shop.extraClosedDates || []);
  let cells = '<tr>' + '<td></td>'.repeat(first);
  for (let d = 1; d <= days; d++) {
    const w = (first + d - 1) % 7;
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const off = closedW.has(w) || closedD.has(key);
    cells += `<td${off ? ' class="off"' : ''}>${d}${off ? '<span class="vh">（定休日）</span>' : ''}</td>`;
    if (w === 6 && d !== days) cells += '</tr><tr>';
  }
  cells += '</tr>';
  return `<table class="cal"><caption>${y}年 ${m + 1}月</caption>
  <thead><tr>${['日', '月', '火', '水', '木', '金', '土'].map((w) => `<th scope="col">${w}</th>`).join('')}</tr></thead><tbody>${cells}</tbody></table>`;
}

function shop(site) {
  const sh = site.shop;
  const now = new Date(Date.now() + 9 * 3600000); // 日本時間
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const body = `${pageHead('SHOP INFO', '店舗情報', [[null, '店舗情報']])}
<section class="sec">
  <div class="wrap shop">
    <div>
      <h2 class="shop-nm">${esc(site.site.name)}</h2>
      <dl class="spec spec-lg">
        <div><dt>住所</dt><dd>${esc(sh.address)}</dd></div>
        <div><dt>営業時間</dt><dd>${esc(sh.hours)}</dd></div>
        <div><dt>定休日</dt><dd>${esc(sh.closedText)}</dd></div>
        <div><dt>連絡先</dt><dd>電話番号： <a href="${telHref(sh.phone)}">${esc(sh.phone)}</a></dd></div>
      </dl>
      <a class="btn btn-ink" href="/contact"><span>お問い合わせ</span>${arrow}</a>
    </div>
    <div class="cals">
      ${calendar(sh, y, m)}${calendar(sh, m === 11 ? y + 1 : y, (m + 1) % 12)}
      <p class="cal-key"><span></span>定休日</p>
    </div>
  </div>
  ${sh.mapQuery ? `<div class="map"><iframe title="${esc(site.site.name)}の地図" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(sh.mapQuery)}&t=m&z=15&output=embed&iwloc=near"></iframe></div>` : ''}
</section>`;
  return layout(site, { title: '店舗情報', path: '/shop', body });
}

function contact(site, { sent, values = {}, errors = [], item } = {}) {
  const msg = values.message != null ? values.message : item ? `「${item}」について\n` : '';
  const body = `${pageHead('CONTACT', 'お問い合わせ', [[null, 'お問い合わせ']])}
<section class="sec">
  <div class="wrap narrow">
    ${sent ? `<div class="done" role="status"><h2>送信しました</h2><p>お問い合わせありがとうございます。内容を確認のうえ、ご連絡いたします。</p><a class="btn btn-line" href="/"><span>トップページへ</span>${arrow}</a></div>` : `
    ${site._static ? `<div class="done"><h2>お電話でお問い合わせください</h2><p>お問い合わせフォームはただいま準備中です。お手数ですが、お電話にてご連絡ください。</p>${site.shop.phone ? `<p class="dt-tel">電話番号　<a href="${telHref(site.shop.phone)}">${esc(site.shop.phone)}</a></p>` : ''}<p>営業時間　${esc(site.shop.hours)}（定休日：${esc(site.shop.closedText)}）</p></div>` : `
    <div class="prose">${paras(site.contact.text)}</div>
    ${errors.length ? `<ul class="errs" role="alert">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
    <form class="form" method="post" action="/contact">
      <label><span>氏名<em>必須</em></span><input type="text" name="name" required maxlength="80" autocomplete="name" value="${esc(values.name)}"></label>
      <label><span>メールアドレス<em>必須</em></span><input type="email" name="email" required maxlength="200" autocomplete="email" value="${esc(values.email)}"></label>
      <label><span>お問い合わせ内容<em>必須</em></span><textarea name="message" rows="8" required maxlength="4000">${esc(msg)}</textarea></label>
      <label class="hp" aria-hidden="true">Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <button class="btn btn-ink btn-wide" type="submit"><span>送信する</span>${arrow}</button>
    </form>
    ${site.shop.phone ? `<p class="dt-tel">お電話でのお問い合わせ　<a href="${telHref(site.shop.phone)}">${esc(site.shop.phone)}</a></p>` : ''}`}`}
  </div>
</section>`;
  return layout(site, { title: 'お問い合わせ', path: '/contact', body });
}

function notFound(site) {
  const body = `${pageHead('404 NOT FOUND', 'ページが見つかりません')}
<section class="sec"><div class="wrap narrow"><div class="prose"><p>お探しのページは移動または削除された可能性があります。</p></div>
<a class="btn btn-ink" href="/"><span>トップページへ</span>${arrow}</a></div></section>`;
  return layout(site, { title: 'ページが見つかりません', path: '', body });
}

module.exports = { home, list, detail, option, rental, shop, contact, notFound };
