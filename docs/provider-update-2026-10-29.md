# Pembaruan kontrak AutoGoPay, 29 Oktober 2026

Sumber utama: file Markdown API lengkap yang diberikan pengguna, 34 bagian dan 1.440 baris. SHA-256: `6a53c4055d8c20869aec07dbe5cd36983334d7382f12475e51b81fa86146aac4`. Berkas sumber tidak berisi pola API key asli. Pembaruan ini mengikuti isi berkas tersebut; tidak mengklaim pemanggilan API live atau pengesahan provider.

## Yang berubah

- Provider BCA Merchant: POST `/bca/qris/create`, GET `/bca/transactions`; akun harus tersambung dan outlet dipilih. Nominal integer 1–10.000.000 IDR. QR image kedaluwarsa memberi 410.
- Mutasi BCA: tanggal WIB, halaman mulai 1, maksimal 50 item. Ambil halaman selanjutnya bila tepat 50 item. Helper menolak echo tanggal/halaman yang salah, halaman berulang, scan melewati batas, atau kegagalan di tengah scan. Batas waktu diperiksa sebelum/sesudah tiap request; request aktif tetap dibatasi timeout HTTP client, bukan dibatalkan oleh deadline scan.
- GoPay/ShopeePay: auto-poller provider 3 detik selama dua menit pertama, 5 detik sampai menit kelima, kemudian 10 detik sampai 15 menit. Tidak perlu menambah poller aplikasi jika webhook sudah cukup.
- Interactive: pending terdokumentasi memakai `success:false`, ID invoice/ref yang sama, `status:pending`; akun disconnected memakai `success:true,connected:false`.
- Host request dan URL gambar contoh baru konsisten menggunakan `v1-gateway.autogopay.site`. Peringatan host contoh lama diperbarui sebagai riwayat.

## Koreksi dan batas yang dipertahankan

Contoh webhook Node.js sumber memakai JSON.stringify setelah parsing dan perbandingan signature biasa. Skill mempertahankan HMAC atas raw bytes dan perbandingan constant-time sesuai kontrak, dengan mapping provider eksplisit. Contoh shell URL berisi `&` harus diberi kutip.

BCA tidak mempunyai webhook/status per QR, generated transaction_id tidak muncul di mutasi, dan item mutasi diteruskan dari BCA dengan field yang belum ditentukan. Rekomendasi sumber untuk mencocokkan nominal/waktu dipakai sebagai kandidat rekonsiliasi, bukan jaminan atribusi otomatis. Dua order bernominal sama tidak boleh dipilih sembarangan.

Masih perlu konfirmasi: envelope status GoPay, mapping ID webhook non-GoPay, hubungan bill InstaQRIS, schema/semantik receipt BCA, serta expiry Interactive yang contoh waktunya masih berbeda satu jam meski prosa menyebut 15 menit. Keterbatasan itu tidak disamarkan sebagai fitur yang sudah diuji.

## Verifikasi rilis

Jalankan perintah di [panduan pengujian](testing.md). Tes memakai fixture dan HTTP lokal, tanpa key merchant atau transfer. Pemeriksaan evals memvalidasi definisi dan anchor, bukan menjalankan model AI. Uji AI independen dan hasil CI dilaporkan sesuai hasil yang benar-benar selesai. Status audit pihak ketiga di skills.sh terpisah dari kelulusan kode dan dapat memakai snapshot lama.
