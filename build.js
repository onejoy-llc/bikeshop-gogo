// 公開用の静的サイトを dist/ に書き出す（GitHub Pages 用）
'use strict';
const fs = require('fs');
const path = require('path');
const render = require('./lib/render');

const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const OUT = path.join(__dirname, 'dist');
const site = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/site.json'), 'utf8'));
site._static = true; // フォームなど、サーバーが必要な部分を出さない

const withBase = (html) => html.replace(/\b(href|src|action|data-gal)="\/(?!\/)/g, `$1="${BASE}/`);
function write(route, html) {
  const file = path.join(OUT, route === '/' ? 'index.html' : route.endsWith('.html') ? route : route + '/index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, withBase(html));
}

fs.rmSync(OUT, { recursive: true, force: true });
write('/', render.home(site));
write('/vehicles', render.list(site, 'vehicles'));
write('/parts', render.list(site, 'parts'));
write('/option', render.option(site));
write('/rental', render.rental(site));
write('/shop', render.shop(site));
write('/contact', render.contact(site, {}));
write('/404.html', render.notFound(site));
for (const kind of ['vehicles', 'parts']) {
  for (const item of site[kind]) {
    const html = render.detail(site, kind, item.id);
    if (html) write(`/${kind}/${item.id}`, html);
  }
}
for (const dir of ['css', 'js', 'uploads']) fs.cpSync(path.join(__dirname, 'public', dir), path.join(OUT, dir), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'public/favicon.svg'), path.join(OUT, 'favicon.svg'));
console.log('dist/ に書き出しました（BASE_PATH="' + BASE + '"）');
