# Contoh integrasi yang bisa dijalankan

Contoh ini memverifikasi alur lokal. Tidak membutuhkan API key asli, tidak membuat QRIS nyata, dan tidak mengirim uang. Dibutuhkan Python 3.12+; helper Node.js diuji dengan Node 22+.

## Demo Python + SQLite

Dari root repository, jalankan:

```bash
python skills/autogopay-payment-gateway/assets/python-demo/server.py --db demo.sqlite3
```

Di terminal kedua:

```bash
python skills/autogopay-payment-gateway/assets/python-demo/simulate.py
```

Callback pertama menghasilkan `paid: true, duplicate: false`. Callback kedua menghasilkan `paid: true, duplicate: true`. Database menyimpan satu efek fulfillment meskipun callback diterima lagi. Port default 8080; gunakan `--port` yang sama di kedua perintah jika menggantinya. Demo memuat satu order `demo-order` senilai 10000 IDR. Untuk mengulang dari awal, gunakan file database baru dan hentikan server sebelumnya.

Server hanya mendengarkan di 127.0.0.1. Kredensial lokal default disediakan untuk simulasi dan bukan API key AutoGoPay. Gunakan DEMO_APP_TOKEN dan DEMO_WEBHOOK_KEY yang sama pada dua terminal jika ingin mengubah fixture lokal.

## Endpoint demo

| Route | Fungsi |
| --- | --- |
| GET `/health` | Menyatakan mode mock tanpa pembayaran nyata |
| POST `/payments` | Membuat attempt lokal dari order yang nominalnya berasal dari database; butuh demo Bearer token |
| GET `/orders/status?order_id=demo-order` | Membaca status lokal; butuh demo Bearer token |
| POST `/webhooks/autogopay` | Memverifikasi HMAC raw body dan mencatat callback GoPay yang cocok |

Endpoint demo bukan endpoint API AutoGoPay. Jangan mengirim data produksi ke demo.

## Mengadaptasi ke aplikasi

Ambil pola verifikasi signature, transaksi database, dan pembatasan order sesuai kebutuhan. Ganti autentikasi akun tunggal dengan autentikasi pengguna dan pemeriksaan kepemilikan order. Gunakan service HTTP proyek untuk request provider, serta simpan intent sebelum pembuatan QRIS nyata. Simpan amount, provider, account, dan ID pembayaran secara persisten.

Tabel effects merupakan ilustrasi outbox. Worker untuk pengiriman produk, notifikasi, dan kredit saldo eksternal belum disediakan; implementasikan consumer deduplication/idempotency. Demo ini bukan server production siap deploy.

## Node.js dan PHP

- [Helper Node.js](../skills/autogopay-payment-gateway/assets/node/autogopay.mjs): client GoPay dengan timeout, tanpa retry otomatis, dan signature verifier. Helper dapat membuat QRIS nyata jika dipanggil dengan API key asli, sehingga pemanggilan live harus sesuai permintaan pengguna.
- [Helper PHP](../skills/autogopay-payment-gateway/assets/php/verify.php): signature verifier untuk raw body. Tetap implementasikan schema validation, pencocokan order, dan transaksi database.

Tes menggunakan fetch mock untuk Node.js. Tidak ada tes yang memanggil domain payment gateway.
