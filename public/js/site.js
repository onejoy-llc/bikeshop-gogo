// 公開サイト用のちょっとした動き
(function () {
  // スマホのメニュー
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('gnav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // 詳細ページの写真切り替え
  var main = document.querySelector('[data-gal-main]');
  var num = document.querySelector('[data-gal-n]');
  document.querySelectorAll('[data-gal]').forEach(function (b) {
    b.addEventListener('click', function () {
      main.src = b.dataset.gal;
      if (num) num.textContent = ('0' + b.dataset.i).slice(-2);
      document.querySelectorAll('[data-gal]').forEach(function (x) { x.removeAttribute('aria-current'); });
      b.setAttribute('aria-current', 'true');
    });
  });

  // 一覧ページの絞り込みと並び替え
  var list = document.querySelector('[data-cards]');
  if (list) {
    var filter = list.dataset.initial || '';
    var sort = 'new';
    var count = document.querySelector('[data-count]');
    var apply = function () {
      var cards = Array.prototype.slice.call(list.children);
      cards.sort(function (a, b) {
        if (sort === 'low') return a.dataset.price - b.dataset.price;
        if (sort === 'high') return b.dataset.price - a.dataset.price;
        return b.dataset.date.localeCompare(a.dataset.date);
      });
      var n = 0;
      cards.forEach(function (c) {
        var show = !filter || c.dataset.type === filter;
        c.hidden = !show;
        if (show) n++;
        list.appendChild(c);
      });
      if (count) count.textContent = n;
    };
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        apply();
      });
    });
    var sel = document.querySelector('[data-sort]');
    if (sel) sel.addEventListener('change', function () { sort = sel.value; apply(); });
    apply();
  }
})();
