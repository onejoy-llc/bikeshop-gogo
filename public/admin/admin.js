// 管理画面
(function () {
  'use strict';
  var app = document.getElementById('app');
  var S = { data: null, inquiries: [], view: 'vehicles', edit: null, dirty: false, saving: false };

  // ---------- 小道具 ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'text') el.textContent = v;
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null && x !== false) el.append(x); });
    }
    return el;
  }
  function api(method, url, body, type) {
    var opt = { method: method, headers: { 'X-Requested-With': 'gogo-admin' }, credentials: 'same-origin' };
    if (body !== undefined) {
      opt.body = type ? body : JSON.stringify(body);
      opt.headers['Content-Type'] = type || 'application/json';
    }
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && S.data) { S.data = null; boot(); }
        if (!r.ok) throw new Error(j.error || '通信に失敗しました');
        return j;
      });
    });
  }
  var toastTimer;
  function toast(msg, bad) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.className = 'on' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = ''; }, 2600);
  }
  function touch() { if (!S.dirty) { S.dirty = true; paintSave(); } }
  var yen = function (n) { return '¥' + Number(n || 0).toLocaleString('ja-JP'); };

  // ---------- 入力部品 ----------
  function field(label, obj, key, o) {
    o = o || {};
    var input;
    if (o.type === 'textarea') input = h('textarea', { rows: o.rows || 4, value: obj[key] || '' });
    else if (o.type === 'select') {
      input = h('select', {}, o.options.map(function (op) { return h('option', { value: op[0], text: op[1] }); }));
      input.value = obj[key];
    } else input = h('input', { type: o.type || 'text', value: obj[key] == null ? '' : obj[key], min: o.type === 'number' ? 0 : null, placeholder: o.placeholder });
    input.addEventListener('input', function () {
      obj[key] = o.type === 'number' ? Number(input.value) || 0 : input.value;
      touch();
    });
    return h('label', { className: 'f' + (o.full ? ' full' : '') }, h('span', { text: label }), input, o.hint && h('small', { text: o.hint }));
  }
  function check(label, obj, key) {
    var c = h('input', { type: 'checkbox', checked: obj[key] !== false, onchange: function () { obj[key] = c.checked; touch(); } });
    return h('label', { className: 'chk' }, c, label);
  }

  // 写真は送る前にブラウザ側で長辺1600pxまで縮小する
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('画像を変換できませんでした')); }, 'image/jpeg', 0.86);
      };
      img.onerror = function () { reject(new Error('画像を読み込めませんでした（JPEG・PNG・WebPに対応）')); };
      img.src = URL.createObjectURL(file);
    });
  }
  function upload(files, done) {
    var list = Array.prototype.slice.call(files);
    toast('アップロード中…');
    list.reduce(function (p, f) {
      return p.then(function () { return shrink(f); })
        .then(function (blob) { return api('POST', '/api/admin/upload', blob, 'image/jpeg'); })
        .then(function (r) { done(r.url); });
    }, Promise.resolve()).then(function () { toast('写真を追加しました'); touch(); render(); })
      .catch(function (e) { toast(e.message, true); render(); });
  }
  function dropBox(label, multiple, done) {
    var input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: multiple, onchange: function () { if (input.files.length) upload(input.files, done); } });
    var box = h('label', { className: 'drop' }, input, label);
    box.addEventListener('dragover', function (e) { e.preventDefault(); });
    box.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files.length) upload(e.dataTransfer.files, done); });
    return box;
  }
  function gallery(item) {
    item.images = item.images || [];
    var move = function (i, d) {
      var j = i + d; if (j < 0 || j >= item.images.length) return;
      var t = item.images[i]; item.images[i] = item.images[j]; item.images[j] = t; touch(); render();
    };
    return h('div', { className: 'full' },
      h('span', { className: 'f-lb', text: '写真' }),
      h('div', { className: 'pics' },
        item.images.map(function (u, i) {
          return h('div', { className: 'pic' }, h('img', { src: u, alt: '', loading: 'lazy' }), h('div', {},
            h('button', { type: 'button', text: '←', title: '前へ', onclick: function () { move(i, -1); } }),
            h('button', { type: 'button', text: '→', title: '後ろへ', onclick: function () { move(i, 1); } }),
            h('button', { type: 'button', text: '削除', onclick: function () { item.images.splice(i, 1); touch(); render(); } })));
        }),
        dropBox('＋ 写真を追加\n（複数選択できます）', true, function (u) { item.images.push(u); })),
      h('span', { className: 'hint', text: '1枚目が一覧に表示されるメイン写真です。←→で順番を入れ替えられます。' }));
  }
  function onePic(label, obj, key) {
    return h('div', { className: 'full' }, h('span', { className: 'f-lb', text: label }),
      h('div', { className: 'one-pic' },
        obj[key] ? h('img', { src: obj[key], alt: '' }) : null,
        h('div', {}, dropBox(obj[key] ? '写真を差し替える' : '＋ 写真を選ぶ', false, function (u) { obj[key] = u; }),
          obj[key] && h('button', { type: 'button', className: 'b b-sm b-del', style: 'margin-top:8px', text: '写真を外す', onclick: function () { obj[key] = ''; touch(); render(); } }))));
  }

  // ---------- 画面：車両・パーツ ----------
  var KIND = { vehicles: { ja: '車両', path: 'vehicles' }, parts: { ja: 'パーツ', path: 'parts' } };
  function listView(kind) {
    var items = S.data[kind], k = KIND[kind];
    return [
      h('header', {}, h('h2', { text: k.ja + '在庫' }),
        h('button', { className: 'b b-main', text: '＋ ' + k.ja + 'を追加', onclick: function () {
          var it = { id: '', name: '', category: '', price: 0, status: '販売中', published: true, createdAt: new Date().toISOString().slice(0, 10), images: [] };
          if (kind === 'vehicles') { it.type = 'bike'; it.specs = ['車名/メーカー', '排気量', '車台番号', 'メーター表示', 'エンジン動作', '足回り', 'カラーリング', '外装', 'シート破れ', '登録書類', '付属品'].map(function (x) { return { k: x, v: '' }; }); }
          else it.description = '';
          items.unshift(it); S.edit = { kind: kind, item: it }; touch(); render();
        } })),
      h('p', { className: 'lead', text: '登録日の新しい順にサイトへ表示されます。変更したら画面下の「保存する」を押してください。' }),
      items.length ? h('div', { className: 'rows' }, items.map(function (it, i) {
        return h('div', { className: 'row' },
          it.images && it.images[0] ? h('img', { src: it.images[0], alt: '', loading: 'lazy' }) : h('span', { className: 'ph' }),
          h('div', {}, h('h3', { text: it.name || '（名前未入力）' }),
            h('p', {}, it.published === false ? h('span', { className: 'tag tag-off', text: '非公開' }) : null,
              it.status !== '販売中' ? h('span', { className: 'tag tag-sold', text: it.status }) : null,
              h('span', { className: 'tag', text: it.category || '分類なし' }), yen(it.price) + '　登録日 ' + it.createdAt)),
          h('div', { className: 'acts' },
            h('button', { className: 'b b-sm', text: '編集', onclick: function () { S.edit = { kind: kind, item: it }; render(); } }),
            h('button', { className: 'b b-sm b-del', text: '削除', onclick: function () {
              if (confirm('「' + (it.name || '名前未入力') + '」を削除します。よろしいですか？')) { items.splice(i, 1); touch(); render(); }
            } })));
      })) : h('p', { className: 'none', text: 'まだ登録がありません。「＋ ' + k.ja + 'を追加」から登録できます。' }),
    ];
  }
  function editView() {
    var kind = S.edit.kind, it = S.edit.item, isV = kind === 'vehicles';
    var specs = null;
    if (isV) {
      it.specs = it.specs || [];
      specs = h('div', { className: 'panel' }, h('h3', { text: '車両情報' }),
        h('div', { className: 'specs' }, it.specs.map(function (sp, i) {
          var a = h('input', { type: 'text', value: sp.k, placeholder: '項目（例：排気量）', oninput: function () { sp.k = a.value; touch(); } });
          var b = h('input', { type: 'text', value: sp.v, placeholder: '内容（例：50cc）', oninput: function () { sp.v = b.value; touch(); } });
          return h('div', { className: 'spec-row' }, a, b, h('button', { type: 'button', className: 'b b-sm b-del', text: '削除', onclick: function () { it.specs.splice(i, 1); touch(); render(); } }));
        })),
        h('button', { type: 'button', className: 'b b-sm', style: 'margin-top:10px', text: '＋ 項目を追加', onclick: function () { it.specs.push({ k: '', v: '' }); touch(); render(); } }));
    }
    return [
      h('header', {}, h('h2', { text: (it.name || '新しい' + KIND[kind].ja) + ' の編集' }),
        h('button', { className: 'b', text: '← 一覧へ戻る', onclick: function () { S.edit = null; render(); } })),
      h('div', { className: 'panel' }, h('h3', { text: '基本情報' }), h('div', { className: 'grid' },
        field('名前', it, 'name', { full: true, placeholder: '例：ジャイロキャノピー4ST#6' }),
        field('分類', it, 'category', { placeholder: '例：ジャイロキャノピー' }),
        isV ? field('種類', it, 'type', { type: 'select', options: [['bike', 'バイク'], ['minicar', 'ミニカー']] }) : null,
        field('価格（円）', it, 'price', { type: 'number', hint: '数字だけ入力します（例：469800）' }),
        field('状態', it, 'status', { type: 'select', options: [['販売中', '販売中'], ['商談中', '商談中'], ['売約済', '売約済']] }),
        field('登録日', it, 'createdAt', { type: 'date', hint: '新しい日付ほど上に表示されます' }),
        h('div', { className: 'f', style: 'align-self:center' }, check('サイトに公開する', it, 'published')),
        !isV ? field('説明', it, 'description', { type: 'textarea', full: true, rows: 5 }) : null,
        gallery(it))),
      specs,
    ];
  }

  // ---------- 画面：オプション ----------
  function optionsView() {
    var d = S.data;
    return [
      h('header', {}, h('h2', { text: 'オプション' }),
        h('button', { className: 'b b-main', text: '＋ オプションを追加', onclick: function () { d.options.push({ id: '', name: '', price: 0, description: '', image: '' }); touch(); render(); } })),
      h('div', { className: 'panel' }, h('h3', { text: '説明文' }), field('オプションについて', d, 'optionIntro', { type: 'textarea', rows: 3 })),
      d.options.map(function (o, i) {
        return h('div', { className: 'panel' },
          h('h3', {}, 'オプション ' + (i + 1) + '　',
            h('button', { className: 'b b-sm', text: '↑', title: '上へ', disabled: i === 0, onclick: function () { d.options.splice(i - 1, 0, d.options.splice(i, 1)[0]); touch(); render(); } }), ' ',
            h('button', { className: 'b b-sm', text: '↓', title: '下へ', disabled: i === d.options.length - 1, onclick: function () { d.options.splice(i + 1, 0, d.options.splice(i, 1)[0]); touch(); render(); } }), ' ',
            h('button', { className: 'b b-sm b-del', text: '削除', onclick: function () { if (confirm('「' + (o.name || 'このオプション') + '」を削除します。よろしいですか？')) { d.options.splice(i, 1); touch(); render(); } } })),
          h('div', { className: 'grid' },
            field('名前', o, 'name'), field('料金（円・工賃込み）', o, 'price', { type: 'number' }),
            field('説明', o, 'description', { type: 'textarea', full: true, rows: 3 }),
            onePic('写真', o, 'image')));
      }),
    ];
  }

  // ---------- 画面：サイト・店舗情報 ----------
  function siteView() {
    var d = S.data, sh = d.shop;
    var days = ['日', '月', '火', '水', '木', '金', '土'].map(function (w, i) {
      var c = h('input', { type: 'checkbox', checked: sh.closedWeekdays.indexOf(i) >= 0, onchange: function () {
        sh.closedWeekdays = sh.closedWeekdays.filter(function (x) { return x !== i; });
        if (c.checked) sh.closedWeekdays.push(i);
        touch();
      } });
      return h('label', { className: 'chk' }, c, w);
    });
    var extra = h('textarea', { rows: 3, value: sh.extraClosedDates.join('\n'), placeholder: '2026-12-31\n2027-01-01', oninput: function () {
      sh.extraClosedDates = extra.value.split(/\s+/).filter(function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x); }); touch();
    } });
    return [
      h('header', {}, h('h2', { text: 'サイト・店舗情報' })),
      h('div', { className: 'panel' }, h('h3', { text: 'トップページ' }), h('div', { className: 'grid' },
        field('店名', d.site, 'name'), field('店名（英字ロゴ）', d.site, 'nameEn', { hint: '最後の単語が大きく表示されます' }),
        field('キャッチコピー', d.site, 'tagline', { full: true }),
        field('紹介文', d.site, 'intro', { type: 'textarea', full: true, rows: 6, hint: '改行で段落が分かれます' }),
        onePic('メイン写真（横長）', d.site, 'heroImage'), onePic('紹介文の横の写真', d.site, 'subImage'))),
      h('div', { className: 'panel' }, h('h3', { text: '店舗情報' }), h('div', { className: 'grid' },
        field('住所', sh, 'address', { full: true }),
        field('地図の検索住所', sh, 'mapQuery', { full: true, hint: 'Googleマップで検索する住所。空にすると地図を表示しません' }),
        field('営業時間', sh, 'hours'), field('電話番号', sh, 'phone'),
        field('定休日（表示用の文字）', sh, 'closedText', { placeholder: '例：土日' }),
        h('div', { className: 'f' }, h('span', { className: 'f-lb', text: '定休日（カレンダーの色付け）' }), h('div', { className: 'days' }, days)),
        h('label', { className: 'f full' }, h('span', { text: '臨時休業日' }), extra, h('small', { text: '1行に1日、「2026-12-31」の形で入力します' })),
        field('X (Twitter) のURL', sh, 'twitter', { type: 'url' }), field('InstagramのURL', sh, 'instagram', { type: 'url' }))),
      h('div', { className: 'panel' }, h('h3', { text: 'レンタルページ' }), h('div', { className: 'grid' },
        field('説明文', d.rental, 'text', { type: 'textarea', full: true, rows: 3 }),
        field('提携先の名前', d.rental, 'linkName'), field('提携先のURL', d.rental, 'url', { type: 'url' }),
        onePic('バナー画像', d.rental, 'banner'))),
      h('div', { className: 'panel' }, h('h3', { text: 'お問い合わせページ' }),
        field('説明文', d.contact, 'text', { type: 'textarea', rows: 4 })),
    ];
  }

  // ---------- 画面：お問い合わせ ----------
  function inquiriesView() {
    var act = function (body) {
      api('PUT', '/api/admin/inquiries', body).then(function (r) { S.inquiries = r.inquiries; render(); }).catch(function (e) { toast(e.message, true); });
    };
    return [
      h('header', {}, h('h2', { text: 'お問い合わせ' })),
      h('p', { className: 'lead', text: 'サイトのフォームから届いた内容です。返信はメールソフトから行ってください。' }),
      S.inquiries.length ? S.inquiries.map(function (q) {
        return h('div', { className: 'inq' + (q.done ? ' done' : '') },
          h('header', {}, h('span', {}, h('b', { text: q.name }), '　', h('a', { href: 'mailto:' + q.email, text: q.email })),
            h('time', { text: new Date(q.at).toLocaleString('ja-JP') })),
          h('pre', { text: q.message }),
          h('div', { className: 'acts' },
            h('button', { className: 'b b-sm', text: q.done ? '未対応に戻す' : '対応済みにする', onclick: function () { act({ action: 'done', id: q.id, done: !q.done }); } }),
            h('button', { className: 'b b-sm b-del', text: '削除', onclick: function () { if (confirm(q.name + ' さんのお問い合わせを削除します。元に戻せません。よろしいですか？')) act({ action: 'delete', id: q.id }); } })));
      }) : h('p', { className: 'none', text: 'お問い合わせはまだありません。' }),
    ];
  }

  // ---------- 画面：パスワード ----------
  function passwordView() {
    var cur = h('input', { type: 'password', autocomplete: 'current-password' });
    var nx = h('input', { type: 'password', autocomplete: 'new-password' });
    return [
      h('header', {}, h('h2', { text: 'パスワード変更' })),
      h('form', { className: 'panel', style: 'max-width:440px', onsubmit: function (e) {
        e.preventDefault();
        api('POST', '/api/admin/password', { current: cur.value, next: nx.value })
          .then(function () { cur.value = nx.value = ''; toast('パスワードを変更しました'); })
          .catch(function (er) { toast(er.message, true); });
      } }, h('div', { style: 'display:grid;gap:16px' },
        h('label', { className: 'f' }, h('span', { text: '現在のパスワード' }), cur),
        h('label', { className: 'f' }, h('span', { text: '新しいパスワード（8文字以上）' }), nx),
        h('button', { className: 'b b-main', text: '変更する' }))),
    ];
  }

  // ---------- 全体の描画 ----------
  var VIEWS = [['vehicles', '車両在庫'], ['parts', 'パーツ在庫'], ['options', 'オプション'], ['site', 'サイト・店舗情報'], ['inquiries', 'お問い合わせ'], ['password', 'パスワード変更']];
  function paintSave() {
    var bar = document.querySelector('.savebar'); if (!bar) return;
    bar.querySelector('button').disabled = !S.dirty || S.saving;
    var sp = bar.querySelector('span');
    sp.textContent = S.saving ? '保存中…' : S.dirty ? '保存していない変更があります' : '変更はすべて保存済みです';
    sp.className = S.dirty ? 'dirty' : '';
  }
  function save() {
    S.saving = true; paintSave();
    api('PUT', '/api/admin/data', S.data).then(function (r) {
      var editing = S.edit && S.data[S.edit.kind].indexOf(S.edit.item);
      S.data = r.data; S.dirty = false; S.saving = false;
      if (S.edit) S.edit.item = S.data[S.edit.kind][editing] || null;
      if (S.edit && !S.edit.item) S.edit = null;
      toast('保存しました。サイトに反映されています'); render();
    }).catch(function (e) { S.saving = false; paintSave(); toast(e.message, true); });
  }
  function render() {
    var y = window.scrollY;
    var open = S.inquiries.filter(function (q) { return !q.done; }).length;
    var body = S.edit ? editView() : S.view === 'vehicles' || S.view === 'parts' ? listView(S.view)
      : S.view === 'options' ? optionsView() : S.view === 'site' ? siteView() : S.view === 'inquiries' ? inquiriesView() : passwordView();
    app.replaceChildren(h('div', { className: 'shell' },
      h('aside', { className: 'side' },
        h('h1', {}, h('small', { text: 'ADMIN' }), S.data.site.name),
        h('nav', {}, VIEWS.map(function (v) {
          return h('button', { 'aria-current': S.view === v[0] ? 'page' : null, onclick: function () { S.view = v[0]; S.edit = null; render(); window.scrollTo(0, 0); } },
            v[1], v[0] === 'inquiries' && open ? h('em', { text: open }) : null);
        })),
        h('div', { className: 'side-ft' },
          h('a', { href: '/', target: '_blank', rel: 'noopener', text: 'サイトを見る' }),
          h('button', { text: 'ログアウト', onclick: function () {
            if (S.dirty && !confirm('保存していない変更があります。ログアウトしますか？')) return;
            api('POST', '/api/admin/logout', {}).then(function () { S.data = null; S.dirty = false; boot(); });
          } }))),
      h('div', { className: 'main' }, body),
      h('div', { className: 'savebar' }, h('button', { className: 'b b-main', text: '保存する', onclick: save }), h('span', {}))));
    paintSave();
    window.scrollTo(0, y);
  }

  function gate(needsSetup) {
    var pw = h('input', { type: 'password', autocomplete: needsSetup ? 'new-password' : 'current-password', required: true });
    var err = h('p', { className: 'err' });
    app.replaceChildren(h('div', { className: 'gate' }, h('form', { onsubmit: function (e) {
      e.preventDefault(); err.textContent = '';
      api('POST', needsSetup ? '/api/admin/setup' : '/api/admin/login', { password: pw.value }).then(load).catch(function (er) { err.textContent = er.message; });
    } },
      h('h1', { text: needsSetup ? '管理画面の初期設定' : '管理画面ログイン' }),
      h('p', { text: needsSetup ? 'はじめに、管理画面に入るためのパスワードを決めてください（8文字以上）。' : 'バイクショップGOGO 管理画面' }),
      h('label', { className: 'f' }, h('span', { text: 'パスワード' }), pw),
      h('button', { className: 'b b-main', style: 'margin-top:18px;width:100%', text: needsSetup ? 'パスワードを設定して始める' : 'ログイン' }),
      err)));
    pw.focus();
  }
  function load() {
    return api('GET', '/api/admin/data').then(function (r) { S.data = r.data; S.inquiries = r.inquiries; render(); });
  }
  function boot() {
    api('GET', '/api/admin/state').then(function (st) { st.authed ? load() : gate(st.needsSetup); })
      .catch(function (e) { app.textContent = e.message; });
  }
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
  boot();
})();
