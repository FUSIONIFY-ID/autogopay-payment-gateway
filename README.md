# AutoGoPay Payment Gateway

**Pasang pembayaran AutoGoPay di proyekmu dengan bantuan AI coding agent.**

Skill ini memberikan panduan API, alur pembayaran, dan aturan webhook kepada AI agar integrasi mengikuti stack proyek yang sudah ada. Cocok untuk checkout website, layanan backend, serta bot Telegram atau WhatsApp.

[Mulai cepat](#mulai-cepat) · [Pilihan provider](#pilihan-provider) · [Konfigurasi](#konfigurasi-aplikasi) · [FAQ](#pertanyaan-umum) · [Dokumentasi AutoGoPay](https://autogopay.site/docs)

> Memasang skill memberikan panduan kepada AI. Integrasi aplikasi, konfigurasi akun merchant, dan pengujian pembayaran tetap perlu diselesaikan.

## Mulai cepat

### 1. Pasang skill di proyekmu

Pastikan Node.js dan npm tersedia, lalu buka terminal di folder proyek:

```bash
npx skills add FUSIONIFY-ID/autogopay-payment-gateway --skill autogopay-payment-gateway
```

Ikuti pilihan AI coding agent yang ditampilkan CLI. Tidak perlu mengisi API key ketika memasang skill.

### 2. Minta AI membuat integrasi

Buka proyek di AI coding agent yang menerima instalasi tersebut, lalu kirim:

> Gunakan skill autogopay-payment-gateway untuk memasang pembayaran QRIS AutoGoPay di proyek ini. Ikuti bahasa, framework, dan database yang sudah digunakan. Tambahkan konfigurasi backend, pembuatan QRIS, pengecekan pembayaran, webhook yang terverifikasi, serta pencegahan proses ganda. Jalankan pemeriksaan yang relevan dan jelaskan langkah dashboard yang masih perlu aku isi.

Untuk host yang mendukung pemanggilan skill dengan tanda dolar:

```text
$autogopay-payment-gateway Pasang QRIS AutoGoPay di proyek ini.
```

Jika belum menentukan provider, skill mengarahkan AI untuk memakai GoPay QRIS sebagai asumsi awal. Sebutkan provider yang akun merchant-nya sudah kamu hubungkan jika ingin memakai pilihan lain.

### 3. Isi konfigurasi dan uji aplikasi

AI akan menyesuaikan implementasi dengan proyekmu. Setelah itu:

1. Ambil API key dari dashboard AutoGoPay.
2. Isi key melalui konfigurasi server, bukan melalui chat.
3. Hubungkan akun provider di dashboard.
4. Untuk provider yang mendukung webhook, isi callback URL HTTPS sesuai route yang dibuat di aplikasimu.
5. Jalankan pengujian lokal, lalu uji pembayaran nyata yang memang kamu izinkan sebelum mengaktifkan pengiriman produk atau kredit saldo.

## Pasang otomatis ke beberapa AI sekaligus

Untuk memasang ke **Cursor, Claude Code, Codex, Qoder, OpenCode, dan Kiro CLI** di komputer yang sama, jalankan:

```bash
npx skills add FUSIONIFY-ID/autogopay-payment-gateway --skill autogopay-payment-gateway --agent cursor claude-code codex qoder opencode kiro-cli --global --yes --copy
```

- `--global`: skill tersedia di direktori pengguna untuk berbagai proyek.
- `--yes`: pemasangan berjalan tanpa pertanyaan pemilihan agent.
- `--copy`: menyalin file agar tidak bergantung pada symbolic link.
- Perintah ini memasang **skill**, bukan aplikasi AI, akun, model, atau payment gateway yang sudah aktif.

Untuk pemasangan hanya pada proyek saat ini, buka terminal di folder proyek dan hapus `--global`. Varian proyek ini sudah berhasil diuji untuk keenam target di lingkungan percobaan.

| Produk | Target / cara pemasangan |
| --- | --- |
| Cursor | `--agent cursor` |
| Claude Code | `--agent claude-code` |
| OpenAI Codex | `--agent codex` |
| Qoder | `--agent qoder` |
| OpenCode | `--agent opencode` |
| Kiro CLI | `--agent kiro-cli` |
| Kiro IDE yang mendukung Agent Skills | Membaca folder `.kiro/skills/` atau `~/.kiro/skills/`; CLI memasang ke lokasi tersebut |
| ChatGPT / Claude versi chat | Tidak menjadi target instalasi lokal perintah ini; gunakan fitur skill/import yang tersedia pada akun, atau berikan SKILL.md beserta referensinya sebagai konteks |

Untuk memilih satu target, ganti daftar setelah `--agent` dengan nama target yang diinginkan. Misalnya:

```bash
npx skills add FUSIONIFY-ID/autogopay-payment-gateway --skill autogopay-payment-gateway --agent cursor --global --yes --copy
```

Setelah pemasangan, mulai sesi agent baru atau buka ulang proyek bila skill belum terdeteksi. Verifikasi daftar global:

```bash
npx skills list --global
```

Perbarui skill ketika ada versi baru:

```bash
npx skills update autogopay-payment-gateway --global --yes
```

Kiro dengan custom agent mungkin memerlukan konfigurasi resource skill; ikuti dokumentasi Kiro untuk versi yang digunakan. Aplikasi chat dan coding agent tidak otomatis saling berbagi instalasi. Menyebut "OpenAI" pada installer berarti menargetkan produk Codex, bukan mengubah semua model atau akun OpenAI.

Referensi kompatibilitas: [CLI skills](https://github.com/vercel-labs/skills#supported-agents), [Agent Skills Kiro](https://kiro.dev/docs/skills/), dan [konsep Skills ChatGPT/Codex](https://developers.openai.com/plugins/concepts/skills).

## Pilihan provider

| Provider | Kegunaan | Konfirmasi pembayaran |
| --- | --- | --- |
| GoPay | Membuat QRIS dan payment link, membaca riwayat, mengecek status, membatalkan QRIS pending | Webhook otomatis; status API untuk pemeriksaan |
| ShopeePay | QRIS merchant, riwayat, dan alur pembayaran bot | Webhook otomatis; pengecekan memakai `order_sn` dan `router_id` jika tersedia |
| QRIS Interactive | QRIS dinamis dari merchant Interactive | Polling status; webhook dikirim saat status dicek |
| InstaQRIS | Membuat QRIS dan membaca mutasi berdasarkan tanggal | Rekonsiliasi mutasi setelah pemetaan ID terbukti |
| OVO | Riwayat, membayar QRIS, transfer bank, dan transfer sesama OVO | Preview/inquiry lalu eksekusi untuk transaksi keluar |

**OVO memindahkan dana dari akun yang terhubung.** Pembuatan integrasinya tidak memberi AI izin untuk mengeksekusi transfer atau pembayaran nyata.

## Contoh permintaan

**Checkout website**

> Pasang QRIS AutoGoPay GoPay di checkout proyek ini. Nominal harus dihitung dari order di backend. Gunakan payment link dan webhook agar order diperbarui setelah pembayaran terverifikasi.

**Bot Telegram atau WhatsApp**

> Tambahkan pembayaran ShopeePay AutoGoPay ke bot ini. Simpan order_sn, kirim QR ke pelanggan melalui alur bot yang ada, dan cegah produk terkirim dua kali saat webhook dan polling berjalan bersamaan.

**Proyek dengan stack lain**

> Integrasikan AutoGoPay pada proyek Laravel ini. Gunakan pola service, route, database, dan testing yang sudah ada. Jangan mengganti stack proyek.

**Memperbaiki webhook**

> Periksa webhook AutoGoPay di proyek ini. Pastikan signature dihitung dari raw body, nominal dan ID cocok dengan order, serta callback berulang tidak menghasilkan kredit ganda.

## Konfigurasi aplikasi

Contoh template konfigurasi backend:

```dotenv
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_API_KEY=
```

Isi `AUTOGOPAY_API_KEY` hanya di lingkungan server. Nama konfigurasi dapat disesuaikan dengan framework proyek.

- Request API memakai `Authorization: Bearer <api-key>`.
- Callback masuk memakai `X-Signature`: HMAC-SHA256 dari **raw body**, dengan API key sebagai secret.
- Jangan menaruh key di frontend, URL gambar QR, chat, log, atau repository.
- GoPay dan ShopeePay dipantau otomatis setiap 3 detik, maksimal 15 menit menurut dokumentasi.
- Interactive membutuhkan pengecekan status dari backend.
- Jangan menandai order lunas hanya karena QR berhasil dibuat atau API mengembalikan `success: true`.

## Cara skill membantu AI

AI diarahkan untuk membaca struktur proyek, memilih panduan provider yang relevan, membuat perubahan kode, dan menjalankan pemeriksaan yang sesuai. Skill juga mencakup penyimpanan payment attempt, pencocokan nominal dan identitas transaksi, serta pencegahan proses ganda.

Instruksi inti menggunakan format `SKILL.md` dan referensi Markdown. Integrasi tidak bergantung pada satu bahasa pemrograman atau metadata OpenAI.

## Pertanyaan umum

### Bisa dipakai di semua AI?

Bisa digunakan oleh AI coding agent yang mendukung format skill ini dan didukung CLI. Dukungan otomatis pada setiap produk AI tidak dijamin. Pilih host yang tersedia saat instalasi.

Untuk AI chat tanpa instalasi skill, berikan [SKILL.md](skills/autogopay-payment-gateway/SKILL.md) beserta file referensi yang diperlukan sebagai konteks. AI tersebut tetap membutuhkan akses proyek dan alat eksekusi untuk benar-benar mengubah atau menguji aplikasi.

### Apakah setelah instalasi pembayaran langsung aktif?

Belum. AI perlu membuat integrasi pada proyekmu, lalu kamu mengisi konfigurasi server, menghubungkan provider, dan menyelesaikan pengujian.

### Apakah harus memakai Node.js?

Node.js/npm dipakai untuk menjalankan perintah instalasi CLI. Aplikasi yang diintegrasikan dapat menggunakan stack lain; AI mengikuti proyek yang tersedia.

### Bagaimana memastikan skill ditemukan?

```bash
npx skills add FUSIONIFY-ID/autogopay-payment-gateway --list
```

CLI seharusnya menampilkan `autogopay-payment-gateway`. Perintah ini sudah berhasil diuji pada repository publik ini.

### Apakah ini SDK resmi AutoGoPay?

Ini adalah skill integrasi komunitas yang diterbitkan oleh FUSIONIFY-ID. Repository ini tidak menyatakan dukungan atau endorsement resmi dari AutoGoPay.

## Isi panduan

| Panduan | Isi |
| --- | --- |
| [Skill utama](skills/autogopay-payment-gateway/SKILL.md) | Alur implementasi dan pemilihan referensi |
| [Autentikasi](skills/autogopay-payment-gateway/references/authentication.md) | Konfigurasi backend dan dashboard |
| [API & GoPay](skills/autogopay-payment-gateway/references/api-contracts.md) | Endpoint, status, payment link, dan contoh request |
| [Webhook](skills/autogopay-payment-gateway/references/webhooks.md) | Raw body, HMAC, dan deduplikasi |
| [OVO](skills/autogopay-payment-gateway/references/ovo.md) | Preview, konfirmasi QRIS, inquiry, dan transfer |
| [ShopeePay](skills/autogopay-payment-gateway/references/shopeepay.md) | Koneksi, QRIS, riwayat, status, dan alur bot |
| [Interactive](skills/autogopay-payment-gateway/references/interactive.md) | Invoice/reference, polling, dan callback |
| [InstaQRIS](skills/autogopay-payment-gateway/references/instaqris.md) | QRIS dan rekonsiliasi mutasi |

## Status verifikasi

- Struktur skill dan tautan referensi lolos pemeriksaan.
- Sembilan pengujian lokal verifikasi signature webhook berhasil.
- Repository publik berhasil diambil dan skill ditemukan oleh CLI.
- Pemasangan file skill beserta referensinya ke enam target (Cursor, Claude Code, Codex, Qoder, OpenCode, Kiro CLI) berhasil dalam proyek percobaan. Penggunaan di dalam keenam aplikasi dan pemasangan global pada komputer pengguna belum diuji.
- Pembayaran nyata dan pengiriman callback belum berhasil diverifikasi; tes API sebelumnya terhalang Cloudflare Error 1010.
- Pemetaan ID webhook ShopeePay/Interactive dan hubungan `bill_number` dengan `bill` pada InstaQRIS masih perlu dikonfirmasi. Skill menginstruksikan AI agar tidak menebaknya.

Dokumentasi ditinjau dan dilengkapi dari halaman yang diberikan pengguna pada **12 Oktober 2026**. Untuk kontrak terbaru, periksa [dokumentasi AutoGoPay](https://autogopay.site/docs).
