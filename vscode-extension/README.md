# AutoGoPay Payment Gateway

Pasang skill integrasi AutoGoPay ke proyek dan salin prompt siap pakai untuk AI coding agent.

## Cara pakai

1. Buka folder proyek di VS Code sebagai trusted workspace.
2. Buka Command Palette lalu jalankan **AutoGoPay: Pasang Skill ke Proyek**.
3. Pilih Cursor, Claude Code, Codex, Qoder, OpenCode, atau Kiro.
4. Jalankan **AutoGoPay: Salin Prompt Integrasi AI** lalu tempel prompt ke agent yang sudah kamu gunakan.

Panel **AutoGoPay** pada Explorer menyediakan tombol pemasangan, prompt, dan dokumentasi.

## Yang disediakan

- Bundel skill dan referensi API secara offline, dengan verifikasi checksum.
- Penempatan skill sesuai target AI tanpa menjalankan npm atau shell saat runtime.
- Pemasangan berulang tidak mengubah file yang isinya sama.
- Konfirmasi sebelum menimpa perubahan skill yang sudah ada.
- Pemilihan folder untuk workspace yang memiliki beberapa proyek.

## Batas fungsi

Extension tidak memasang aplikasi AI, tidak menyimpan API key/PIN, tidak memanggil payment API, dan tidak membuat integrasi aplikasi secara otomatis tanpa agent. Pasang aplikasi AI dan konfigurasikan akun merchant secara terpisah. Hanya workspace filesystem yang didukung; virtual/untrusted workspace tidak diaktifkan.

Format direktori yang dipasang mengikuti CLI skills. Keberhasilan menyalin file tidak menjamin semua versi editor langsung menemukan skill; mulai sesi agent baru dan periksa fitur skill versi yang digunakan. ChatGPT/Claude versi chat bukan target copy lokal ini.

## Status publikasi

File VSIX dapat dipasang manual. Publisher ID `fusionify-id` pada paket adalah identitas yang direncanakan dan belum diverifikasi sebagai publisher Microsoft yang terdaftar. Paket ini belum dinyatakan terbit di Visual Studio Marketplace.

[Repository dan panduan](https://github.com/FUSIONIFY-ID/autogopay-payment-gateway) · [Dokumentasi AutoGoPay](https://autogopay.site/docs)
