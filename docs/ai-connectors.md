# Pakai AutoGoPay di berbagai AI

Ada tiga cara pemasangan. Skill memberi alur kerja ke coding agent, plugin membungkus skill untuk host tertentu, dan MCP menyediakan tool yang bisa dipanggil agent. Pilih satu jalur skill/plugin per host agar konteks tidak terpasang ganda; MCP bersifat tambahan.

| Host | Jalur tersedia | Status dan batas |
| --- | --- | --- |
| Claude Code | Marketplace repo Claude + skill; MCP stdio opsional | Katalog plugin tersedia, tanpa klaim terdaftar di direktori resmi Anthropic |
| OpenAI Codex | Marketplace repo Codex + skill; MCP stdio opsional | Katalog plugin tersedia, tanpa klaim persetujuan direktori OpenAI |
| Gemini CLI | Extension native berisi skill + konteks; MCP stdio opsional | Manifest dan file skill diuji; sesi model Gemini belum diuji |
| Claude Desktop | MCP stdio melalui konfigurasi lokal | Protokol diuji memakai SDK client, bukan UI desktop |
| Claude.ai | Remote MCP Streamable HTTP | Kode transport siap; butuh deployment HTTPS dan penambahan connector di akun |
| ChatGPT | Remote MCP / app kustom jika fitur akun mengizinkan | Butuh endpoint HTTPS yang dapat dijangkau atau mekanisme tunnel resmi; belum menjadi app publik |
| Gemini chat | Bergantung pada kemampuan produk dan akun | Jangan menganggap extension Gemini CLI otomatis berlaku untuk aplikasi chat Gemini |
| Cursor, VS Code, OpenCode, Qoder, Kiro dan agent lain | Skill melalui skills CLI, atau konfigurasi MCP yang didukung host | Verifikasi format konfigurasi dan transport pada versi host masing-masing |

## Claude Code dan Codex

```bash
claude plugin marketplace add FUSIONIFY-ID/autogopay-payment-gateway
claude plugin install autogopay-payment-gateway@fusionify-autogopay
```

```bash
codex plugin marketplace add FUSIONIFY-ID/autogopay-payment-gateway
codex plugin add autogopay-payment-gateway@fusionify-autogopay
```

## Gemini CLI

```bash
gemini extensions install https://github.com/FUSIONIFY-ID/autogopay-payment-gateway
gemini extensions list
```

Manifest `gemini-extension.json` di root mengekspos extension native. Skill di folder `skills/` ditemukan oleh Gemini CLI dan konteks `GEMINI.md` membatasi pemakaian pada tugas AutoGoPay. Extension ini tidak memulai MCP atau menginstal dependency secara diam-diam. Gunakan extension atau instalasi skills CLI pada host yang sama untuk menghindari discovery ganda.

## MCP untuk agent lokal

Clone repo, buka foldernya, lalu:

```bash
npm ci --prefix mcp-server --ignore-scripts
node mcp-server/config.mjs generic
```

Perintah kedua menghasilkan JSON `mcpServers` dengan lokasi Node dan server absolut sesuai komputer, termasuk Windows. Gabungkan entry `autogopay` ke konfigurasi host yang sudah ada; jangan menimpa seluruh file konfigurasi. Untuk VS Code gunakan `node mcp-server/config.mjs vscode`, yang menghasilkan format `servers` untuk `.vscode/mcp.json`.

Target generator lain: `claude`, `gemini`, `cursor`. Bentuk JSON-nya memakai `mcpServers`; lokasi file penyimpanannya mengikuti host. Claude Desktop memakai konfigurasi MCP desktop, Gemini CLI memakai `settings.json` dan Cursor memakai konfigurasi MCP-nya. Agent lain dapat memakai entry generik jika mendukung stdio, atau adaptasikan formatnya mengikuti dokumentasi resmi host.

Tool yang tersedia:

- `search_autogopay_docs`: mencari kontrak dalam bundel.
- `read_autogopay_doc`: membaca dokumen yang masuk katalog tetap.
- `get_autogopay_checklist`: mengambil langkah integrasi untuk provider tertentu.

Server juga menyediakan resource Markdown. Tool hanya membaca panduan repo, tidak memanggil API merchant, tidak menerima API key/PIN, tidak menghasilkan pembayaran, dan tidak mengeksekusi transfer. Tujuannya membantu AI memasang payment gateway ke proyek pengguna. Checkout dan webhook tetap berjalan di backend aplikasi yang dibuat agent.

## ChatGPT dan Claude.ai melalui remote MCP

Kode HTTP dapat dijalankan lokal untuk pengujian:

```bash
node mcp-server/http.mjs
```

Default mendengarkan di `127.0.0.1:8787`, endpoint `/mcp`, health `/healthz`. Ini bukan URL publik yang bisa langsung ditempel ke chat cloud.

Untuk deployment, tersedia Dockerfile dengan build context root repo:

```bash
docker build -f mcp-server/Dockerfile -t autogopay-docs-mcp .
docker run --rm -p 127.0.0.1:8787:8787 -e MCP_PUBLIC_HOST=mcp.example.com autogopay-docs-mcp
```

`mcp.example.com` adalah placeholder milik deployment pengguna, bukan endpoint AutoGoPay yang sudah aktif. Tempatkan reverse proxy HTTPS dengan domain tersebut di depan service; pertahankan Host, batasi request/rate dan jangan mencatat body percakapan. `MCP_PUBLIC_HOST` harus nama host saja, tanpa skema/path. Origin browser yang hadir hanya diterima bila sama dengan origin HTTPS host itu. Jika klien mengirim Origin berbeda, tambahkan origin HTTPS persisnya lewat `MCP_ALLOWED_ORIGINS`, dipisahkan koma; jangan memakai wildcard. Healthcheck lokal juga diterima untuk localhost/127.0.0.1.

Server menyediakan dokumentasi publik tanpa login. Jangan memasukkan secret merchant, data transaksi, atau data pribadi ke bundel. Penambahan tool privat/live di masa depan memerlukan desain autentikasi dan isolasi akun baru, bukan berbagi satu key merchant untuk semua pengguna.

Sesudah deployment dan pengujian HTTPS berhasil, tambahkan URL aktual `https://<host-aktual>/mcp` sebagai custom connector di ChatGPT/Claude. Ketersediaan, peran admin, paket dan pengaturan workspace mengikuti produk saat itu. Pemasangan di akun dan publikasi app/direktori tetap langkah terpisah. Repo ini tidak mengklaim connector sudah aktif di akun pengguna atau diterbitkan ke app store mana pun.

## Pengujian

```bash
npm test --prefix mcp-server
```

SDK client resmi menguji initialize, tool listing/call dan resource lewat stdio serta HTTP. Tes juga memeriksa penolakan path sembarang, batas input, Host/Origin, JSON rusak, konfigurasi absolut dan manifest Gemini. Transport lokal yang lulus belum membuktikan deployment HTTPS atau kompatibilitas UI seluruh AI.

Sumber resmi diperiksa 29 Oktober 2026:

- [Gemini extension reference](https://geminicli.com/docs/extensions/reference/)
- [MCP SDK transports](https://ts.sdk.modelcontextprotocol.io/server)
- [Claude custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [ChatGPT developer mode dan MCP](https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt)
