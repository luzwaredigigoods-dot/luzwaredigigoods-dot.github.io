/* Pembelian Bedah Dompet lewat Midtrans Snap (dipakai /beli/ dan /beli/selesai/).
   ALAMAT_SERVER = alamat /exec server lisensi; diisi oleh skrip/isi-situs.py --server.
   Selama kosong, atau server masih mode uji (Sandbox), pembeli melihat "Segera dibuka".
   Untuk mencoba Sandbox: buka /beli/?uji=1 */
var ALAMAT_SERVER = '';

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

/* Halaman /beli/ */
function siapkanBeli() {
  var uji = /[?&]uji=1\b/.test(location.search);
  if (!ALAMAT_SERVER) return;
  panggilServer({ aksi: 'info' }).then(function (info) {
    if (!info.buka || (info.sandbox && !uji)) return;
    $('belum').hidden = true;
    $('formBeli').hidden = false;
    $('modeUji').hidden = !info.sandbox;
  }).catch(function () { /* tetap "Segera dibuka" */ });

  $('formBeli').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var tombol = $('tombolBayar'), salah = $('salah');
    salah.hidden = true;
    if (!$('setuju').checked) { salah.textContent = 'Centang persetujuan Syarat & Ketentuan dulu.'; salah.hidden = false; return; }
    tombol.disabled = true; tombol.textContent = 'Menyiapkan pembayaran…';
    panggilServer({ aksi: 'pesan', paket: 'aplikasi', nama: $('nama').value, email: $('email').value })
      .then(function (j) { location.href = j.redirect_url; })
      .catch(function (e) {
        salah.textContent = pesanAwam(e); salah.hidden = false;
        tombol.disabled = false; tombol.textContent = 'Lanjut ke pembayaran';
      });
  });
}

/* Halaman /beli/selesai/: Midtrans menambahkan ?order_id=...&transaction_status=... */
function siapkanSelesai() {
  var q = new URLSearchParams(location.search), id = q.get('order_id') || '';
  if (!/^BDP-\d{8}-[A-Z0-9]{6}$/.test(id)) return;
  $('nomor').textContent = id;
  $('infoPesanan').hidden = false;
  if (!ALAMAT_SERVER) return;
  var coba = 0;
  var teks = {
    lunas: function (j) { return 'Pembayaran berhasil. Kode lisensi dikirim ke ' + j.email + '.'; },
    menunggu: function () { return 'Menunggu pembayaran. Selesaikan pembayaran sesuai petunjuk Midtrans; halaman ini akan diperbarui otomatis.'; },
    ditinjau: function () { return 'Pembayaran sedang ditinjau oleh bank. Kami kabari lewat email setelah selesai.'; },
    kedaluwarsa: function () { return 'Batas waktu pembayaran sudah lewat. Silakan pesan ulang dari halaman Beli.'; },
    batal: function () { return 'Pembayaran dibatalkan atau ditolak. Silakan pesan ulang dari halaman Beli.'; }
  };
  function cek() {
    panggilServer({ aksi: 'status', order_id: id }).then(function (j) {
      var f = teks[j.status];
      $('statusBayar').textContent = f ? f(j) : 'Pesanan sedang kami periksa. Hubungi kami bila ada pertanyaan.';
      $('statusBayar').hidden = false;
      if ((j.status === 'menunggu' || j.status === 'ditinjau') && ++coba < 20) setTimeout(cek, coba < 6 ? 5000 : 30000);
    }).catch(function () { if (++coba < 20) setTimeout(cek, 15000); });
  }
  cek();
}
