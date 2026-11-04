/* Gerakan halus: kartu, tanya-jawab, dan judul bagian muncul saat digulir ke layar.
   Tanpa skrip ini (atau dengan setelan "kurangi gerakan") semua isi tetap tampil seperti biasa. */
(function () {
  if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var el = Array.prototype.filter.call(document.querySelectorAll('main section:not(.hero) h2, main .kartu, main details, main table, main .langkah li'),
    function (x) { return x.getBoundingClientRect().top > window.innerHeight; });
  if (!el.length) return;
  document.documentElement.classList.add('gerak');
  el.forEach(function (x, i) { x.classList.add('muncul'); x.style.transitionDelay = (i % 3) * 0.08 + 's'; });
  var io = new IntersectionObserver(function (isi) {
    isi.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('tampak'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  el.forEach(function (x) { io.observe(x); });
})();

/* Menu atas di HP (lebar ≤ 700px) menjadi daftar turun (dropdown). Tanpa skrip ini, tautan menu tetap tampil berjajar. */
(function () {
  var nav = document.querySelector('header.atas nav.menu'), atas = document.querySelector('header.atas');
  if (!nav || !atas) return;
  nav.id = nav.id || 'menuUtama';
  var t = document.createElement('button');
  t.type = 'button'; t.className = 'tombol-menu';
  t.setAttribute('aria-controls', nav.id); t.setAttribute('aria-expanded', 'false');
  t.innerHTML = '<span>Menu</span><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path class="g1" d="M4 7h16"/><path class="g2" d="M4 12h16"/><path class="g3" d="M4 17h16"/></svg>';
  nav.parentNode.insertBefore(t, nav);
  document.documentElement.classList.add('menu-hp');
  function atur(buka) {
    /* transisi tutup hanya setelah menu pernah dibuka, agar tidak berkedip saat halaman dimuat */
    if (!buka && atas.classList.contains('buka')) atas.classList.add('tutup');
    atas.classList.toggle('buka', buka); t.setAttribute('aria-expanded', String(buka));
  }
  t.addEventListener('click', function (e) { e.stopPropagation(); atur(!atas.classList.contains('buka')); });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) atur(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && atas.classList.contains('buka')) { atur(false); t.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 700) atur(false); });
})();

/* Tur fitur di halaman produk: tab memilih satu panel; panah kiri/kanan berpindah tab.
   Tanpa skrip ini semua panel tetap tampil berurutan. Video: memutar satu video menjeda video lain. */
(function () {
  var tur = document.querySelector('.tur'); if (!tur) return;
  var tab = tur.querySelector('.tur-tab'), b = Array.prototype.slice.call(tab.querySelectorAll('button'));
  document.documentElement.classList.add('tur-js'); tab.hidden = false;
  function pilih(i, fokus) {
    b.forEach(function (x, j) {
      var on = i === j, p = document.getElementById(x.getAttribute('aria-controls'));
      x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; p.classList.toggle('aktif', on);
      if (on) { if (fokus) x.focus(); x.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    });
  }
  b.forEach(function (x, i) {
    x.addEventListener('click', function () { pilih(i); });
    x.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); pilih((i + (e.key === 'ArrowRight' ? 1 : b.length - 1)) % b.length, true); }
    });
  });
  var p0 = tur.querySelector('.tur-panel'); p0.classList.add('aktif');
  b[0].setAttribute('aria-selected', 'true'); b.slice(1).forEach(function (x) { x.tabIndex = -1; });
})();
(function () {
  var v = Array.prototype.slice.call(document.querySelectorAll('.galeri-video video'));
  v.forEach(function (x) { x.addEventListener('play', function () { v.forEach(function (y) { if (y !== x) y.pause(); }); }); });
})();
