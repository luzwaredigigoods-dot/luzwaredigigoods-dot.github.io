/* Pembelian Bedah Dompet lewat Midtrans Snap (dipakai /beli/, /beli/selesai/, dan halaman produk).
   ALAMAT_SERVER = alamat /exec server lisensi; diisi oleh skrip/isi-situs.py --server.
   Selama kosong, atau server masih mode uji (Sandbox), pembeli melihat "Segera dibuka".
   Untuk mencoba Sandbox: buka /beli/?uji=1. Paket yang bisa dibeli (dan harganya) ditentukan server. */
var ALAMAT_SERVER = 'https://script.google.com/macros/s/AKfycbwf1m9xaK5L8L_U4GZcI3FZz5gx-sG6zcG6zHJMsHiA79jZzZL3eDo2xAMCqVyfpRgd/exec';
/* Kunci situs Cloudflare Turnstile (verifikasi "Saya bukan robot"), diisi skrip/isi-situs.py --turnstile.
   Selama kosong, verifikasi dilewati (server juga hanya memeriksa bila TURNSTILE_SECRET diisi). */
var TURNSTILE_SITEKEY = '0x4AAAAAAFyrsoKhYJ6cmrMh';

var NAMA_PAKET = {
  aplikasi: { judul: 'Aplikasi', ket: 'sekali bayar' },
  lengkap: { judul: 'Bedah Dompet Lengkap', ket: 'sekali bayar · aplikasi + Premium 3 tahun sejak diaktifkan' },
  premium_bulan: { judul: 'Premium 1 bulan', ket: 'untuk keluarga yang sudah punya kode lisensi', kode: true },
  premium_tahun: { judul: 'Premium 12 bulan', ket: 'untuk keluarga yang sudah punya kode lisensi', kode: true }
};

function panggilServer(isi) {
  /* text/plain agar tidak ada preflight CORS; Apps Script membalas JSON */
  return fetch(ALAMAT_SERVER, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(isi) })
    .then(function (r) { if (!r.ok) throw new Error('jaringan'); return r.json(); })
    .then(function (j) { if (!j.ok) { var e = new Error(j.pesan || 'Terjadi kesalahan.'); e.dariServer = true; throw e; } return j; });
}
function pesanAwam(e) {
  return e && e.dariServer ? e.message : 'Koneksi internet terputus atau server sedang sibuk. Coba lagi sebentar.';
}
function $(id) { return document.getElementById(id); }
function rupiah(n) { return 'Rp' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function parameter(nama) { return new URLSearchParams(location.search).get(nama) || ''; }
/* Tiket pesanan disimpan di browser ini saja; halaman selesai bayar memakainya untuk menampilkan kode lisensi */
function simpanTiket(id, tiket) {
  try {
    var t = JSON.parse(localStorage.getItem('bd_tiket') || '{}');
    t[id] = tiket;
    var k = Object.keys(t); if (k.length > 5) delete t[k[0]];
    localStorage.setItem('bd_tiket', JSON.stringify(t));
  } catch (e) { /* penyimpanan browser mati: kode tetap dikirim lewat email */ }
}
function ambilTiket(id) {
  try { return JSON.parse(localStorage.getItem('bd_tiket') || '{}')[id] || ''; } catch (e) { return ''; }
}
var tokenTurnstile = '', idTurnstile = null;
/* Wadah widget memakai id "wadahTurnstile", BUKAN "turnstile": browser menjadikan elemen ber-id sebagai variabel global,
   sehingga id "turnstile" membuat window.turnstile menunjuk ke <div> itu dan skrip Cloudflare tidak pernah dimuat. */
function apiTurnstile() { return window.turnstile && typeof window.turnstile.render === 'function' ? window.turnstile : null; }
function muatTurnstile(saatSiap) {
  if (!TURNSTILE_SITEKEY) { saatSiap(); return; }
  function render() {
    try {
      idTurnstile = apiTurnstile().render('#wadahTurnstile', {
        sitekey: TURNSTILE_SITEKEY,
        callback: function (t) { tokenTurnstile = t; },
        'expired-callback': function () { tokenTurnstile = ''; }  // token kedaluwarsa (±5 menit): widget memperbarui sendiri
      });
    } catch (e) { /* sudah dirender */ }
    saatSiap();
  }
  if (apiTurnstile()) { render(); return; }
  var sc = document.createElement('script');
  sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  sc.async = true; sc.defer = true;
  sc.onload = render;
  sc.onerror = function () { saatSiap(); };  // bila gagal dimuat, biarkan server yang menolak
  document.head.appendChild(sc);
}
function resetTurnstile() { tokenTurnstile = ''; try { var api = apiTurnstile(); if (api) api.reset(idTurnstile === null ? undefined : idTurnstile); } catch (e) { /* abaikan */ } }
function infoJual() {
  if (!ALAMAT_SERVER) return Promise.reject(new Error('belum'));
  return panggilServer({ aksi: 'info' }).then(function (info) {
    if (!info.buka || (info.sandbox && !/[?&]uji=1\b/.test(location.search))) throw new Error('belum');
    return info;
  });
}

/* Halaman /beli/ */
function siapkanBeli() {
  var paket = 'aplikasi';
  function pilih(p) {
    paket = p;
    Array.prototype.forEach.call(document.querySelectorAll('#pilihPaket input'), function (r) { r.checked = r.value === p; });
    $('kolomKode').hidden = !NAMA_PAKET[p].kode;
    $('labelEmail').textContent = NAMA_PAKET[p].kode ? 'Email untuk menerima rincian pembelian' : 'Email untuk menerima kode lisensi';
  }
  infoJual().then(function (info) {
    var daftar = (info.paket || []).filter(function (x) { return NAMA_PAKET[x.paket]; });
    if (!daftar.length) return;
    $('pilihPaket').innerHTML = daftar.map(function (x) {
      var n = NAMA_PAKET[x.paket];
      return '<label class="opsi"><input type="radio" name="paket" value="' + x.paket + '"><span><b>' + n.judul + '</b> · ' + rupiah(x.harga) +
        '<br><span class="muted tipis">' + n.ket + '</span></span></label>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#pilihPaket input'), function (r) { r.addEventListener('change', function () { pilih(r.value); }); });
    var awal = parameter('paket');
    pilih(daftar.some(function (x) { return x.paket === awal; }) ? awal : daftar[0].paket);
    if (parameter('kode')) $('kode').value = parameter('kode').toUpperCase();
    $('belum').hidden = true;
    $('formBeli').hidden = false;
    $('modeUji').hidden = !info.sandbox;
    muatTurnstile(function () { /* widget siap */ });
  }).catch(function () { /* tetap "Segera dibuka" */ });

  $('formBeli').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var tombol = $('tombolBayar'), salah = $('salah');
    salah.hidden = true;
    if (!$('setuju').checked) { salah.textContent = 'Centang persetujuan Syarat & Ketentuan dulu.'; salah.hidden = false; return; }
    if (TURNSTILE_SITEKEY && !tokenTurnstile) { salah.textContent = 'Selesaikan dulu verifikasi "Saya bukan robot".'; salah.hidden = false; return; }
    var isi = { aksi: 'pesan', paket: paket, nama: $('nama').value, email: $('email').value };
    if (TURNSTILE_SITEKEY) isi.turnstile = tokenTurnstile;
    if (NAMA_PAKET[paket].kode) {
      isi.kode = $('kode').value.trim().toUpperCase();
      if (!/^BD-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(isi.kode)) { salah.textContent = 'Isi kode lisensi keluarga Anda (contoh BD-ABCD-EF23).'; salah.hidden = false; return; }
    }
    tombol.disabled = true; tombol.textContent = 'Menyiapkan pembayaran…';
    panggilServer(isi)
      .then(function (j) { if (j.tiket) simpanTiket(j.order_id, j.tiket); location.href = j.redirect_url; })
      .catch(function (e) {
        salah.textContent = pesanAwam(e); salah.hidden = false;
        tombol.disabled = false; tombol.textContent = 'Lanjut ke pembayaran';
        resetTurnstile();  // token sekali pakai: minta verifikasi baru
      });
  });
}

/* Halaman produk: tombol beli Premium dan Lengkap baru tampil bila server sudah menjualnya */
function siapkanProduk() {
  infoJual().then(function (info) {
    (info.paket || []).forEach(function (x) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-jual="' + x.paket + '"]'), function (el) { el.hidden = false; });
      Array.prototype.forEach.call(document.querySelectorAll('[data-segera="' + x.paket + '"]'), function (el) { el.hidden = true; });
    });
  }).catch(function () { /* tetap "Segera hadir" */ });
}

/* Halaman produk: bagian "Kata pembeli" (aksi publik ulasan_publik di server lisensi, di-cache 1 jam di server).
   Tetap tersembunyi bila server belum diisi, belum mendukung ulasan, atau belum ada ulasan yang boleh tampil.
   Semua teks dimasukkan lewat textContent (bukan innerHTML). */
function siapkanUlasan() {
  var wadah = $('ulasan'), daftar = $('daftarUlasan');
  if (!wadah || !daftar || !ALAMAT_SERVER) return;
  panggilServer({ aksi: 'ulasan_publik' }).then(function (j) {
    var l = Array.isArray(j.daftar) ? j.daftar : [];
    if (!l.length || !(j.jumlah > 0)) return;
    var bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var bintang = function (n) { n = Math.max(0, Math.min(5, Math.round(Number(n) || 0))); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };
    $('ringkasUlasan').textContent = 'Rata-rata ' + String(j.rata).replace('.', ',') + ' dari 5 bintang, dari ' + j.jumlah + ' ulasan pembeli.';
    l.slice(0, 12).forEach(function (x) {
      var k = document.createElement('figure'); k.className = 'kartu'; k.style.margin = '0';
      var b = document.createElement('div'); b.className = 'bintang'; b.textContent = bintang(x.bintang);
      b.setAttribute('aria-label', (Number(x.bintang) || 0) + ' dari 5 bintang'); b.style.color = '#E39B0B'; b.style.fontSize = '20px'; b.style.letterSpacing = '2px';
      k.appendChild(b);
      if (x.ulasan) { var q = document.createElement('blockquote'); q.style.margin = '8px 0'; q.textContent = String(x.ulasan).replace(/^'/, ''); k.appendChild(q); }
      var c = document.createElement('figcaption'); c.className = 'muted';
      var m = /^(\d{4})-(\d{2})$/.exec(String(x.bulan || ''));
      c.textContent = String(x.nama || '') + (m ? ' · ' + bulan[Number(m[2]) - 1] + ' ' + m[1] : '');
      k.appendChild(c); daftar.appendChild(k);
    });
    wadah.hidden = false;
  }).catch(function () { /* tetap tersembunyi */ });
}

/* Halaman /beli/selesai/: Midtrans menambahkan ?order_id=...&transaction_status=... */
function siapkanSelesai() {
  var id = parameter('order_id');
  if (!/^BDP-\d{8}-[A-Z0-9]{6}$/.test(id)) return;
  $('nomor').textContent = id;
  $('infoPesanan').hidden = false;
  if (!ALAMAT_SERVER) return;
  var coba = 0;
  var teks = {
    lunas: function (j) {
      return NAMA_PAKET[j.paket] && NAMA_PAKET[j.paket].kode
        ? 'Pembayaran berhasil. Premium keluarga Anda sudah aktif; buka menu Scan Foto atau Analisis di aplikasi. Rincian dikirim ke ' + j.email + '.'
        : j.kode ? 'Pembayaran berhasil.' : 'Pembayaran berhasil. Kode lisensi dikirim ke ' + j.email + '.';
    },
    menunggu: function () { return 'Menunggu pembayaran. Selesaikan pembayaran sesuai petunjuk Midtrans; halaman ini akan diperbarui otomatis.'; },
    ditinjau: function () { return 'Pembayaran sedang ditinjau oleh bank. Kami kabari lewat email setelah selesai.'; },
    kedaluwarsa: function () { return 'Batas waktu pembayaran sudah lewat. Silakan pesan ulang dari halaman Beli.'; },
    batal: function () { return 'Pembayaran dibatalkan atau ditolak. Silakan pesan ulang dari halaman Beli.'; }
  };
  var tiket = ambilTiket(id);
  function tampilKode(j) {
    $('kodeLisensi').textContent = j.kode;
    if (/^https:\/\//.test(j.aplikasi || '')) $('pasangAplikasi').href = j.aplikasi; else $('pasangAplikasi').hidden = true;
    $('ketEmail').textContent = j.email_terkirim
      ? 'Kode yang sama dan panduan pemasangan sudah dikirim juga ke ' + j.email + '.'
      : 'Kode yang sama dan panduan pemasangan juga akan dikirim ke ' + j.email + '. Bila sedang ramai, email bisa tiba beberapa jam kemudian, jadi simpan kode ini sekarang.';
    $('salinKode').hidden = !navigator.clipboard;
    $('kotakKode').hidden = false;
    /* Kode sudah di layar: petunjuk tidak lagi menyuruh menunggu email */
    $('pembuka').textContent = 'Pembayaran berhasil. Simpan kode lisensi di bawah ini.';
    $('langkah').innerHTML = '<li><b>Ketuk Pasang aplikasi</b> di bawah kode, lalu pasang Bedah Dompet di HP atau laptop.</li>' +
      '<li><b>Masuk</b> dengan akun Google, buat PIN, lalu masukkan kode lisensi.</li>' +
      '<li><b>Simpan email kode lisensi</b> sebagai cadangan (cek juga folder Spam/Promosi).</li>';
    $('bantuanEmail').hidden = true;
  }
  $('salinKode').addEventListener('click', function () {
    var b = this, k = $('kodeLisensi').textContent;
    function selesai() { b.textContent = 'Tersalin'; setTimeout(function () { b.textContent = 'Salin kode'; }, 2000); }
    if (navigator.clipboard) navigator.clipboard.writeText(k).then(selesai, function () {});
  });
  function cek() {
    panggilServer({ aksi: 'status', order_id: id, tiket: tiket }).then(function (j) {
      var f = teks[j.status];
      $('statusBayar').textContent = f ? f(j) : 'Pesanan sedang kami periksa. Hubungi kami bila ada pertanyaan.';
      $('statusBayar').hidden = false;
      if (j.kode) tampilKode(j);
      if ((j.status === 'menunggu' || j.status === 'ditinjau') && ++coba < 20) setTimeout(cek, coba < 6 ? 5000 : 30000);
    }).catch(function () { if (++coba < 20) setTimeout(cek, 15000); });
  }
  cek();
}
