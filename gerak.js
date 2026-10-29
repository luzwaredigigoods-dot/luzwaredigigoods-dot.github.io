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
