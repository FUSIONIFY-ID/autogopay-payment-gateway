# Extension Visual Studio Code

## Pasang VSIX manual

1. Unduh artifact autogopay-validated-packages dari run GitHub Actions yang berhasil.
2. Ekstrak artifact dan ambil autogopay-payment-gateway-0.3.0.vsix.
3. Di VS Code, buka Extensions, pilih menu titik tiga, lalu Install from VSIX.
4. Pilih file tersebut dan reload editor jika diminta.
5. Buka folder proyek yang dipercaya. Pada Explorer, gunakan panel AutoGoPay atau Command Palette.
6. Pilih Pasang Skill ke Proyek, pilih target AI, kemudian salin prompt integrasi.

Publisher fusionify-id pada paket adalah ID yang direncanakan. File VSIX dapat diuji secara manual, tetapi belum merupakan listing Visual Studio Marketplace atau bukti kepemilikan publisher Microsoft. Pengguna membutuhkan aplikasi AI target sendiri.

## Build dan test lokal

Dari root repository:

```bash
python scripts/sync_vscode.py
node --test vscode-extension/test/*.test.js
```

Lalu dari folder vscode-extension:

```bash
npx @vscode/vsce package --no-dependencies --skip-license --out ../dist/autogopay-payment-gateway-0.3.0.vsix
```

Flag skip-license memungkinkan paket internal tanpa file license; ini bukan pemberian lisensi open-source. Source tetap belum diberi lisensi distribusi umum. Tentukan lisensi sebelum rilis Marketplace publik. File manifest mempunyai license UNLICENSED.

## Alur installer

Installer menyalin bundel skill yang disertakan di extension ke workspace terpilih. Cursor, Codex, dan OpenCode berbagi direktori .agents/skills; Claude Code memakai .claude/skills; Qoder memakai .qoder/skills; Kiro memakai .kiro/skills. File referensi ikut dipasang. Checksum memeriksa konsistensi bundel, bukan identitas publisher atau tanda tangan rilis.

Installer menolak symbolic link pada path target, tidak menimpa perubahan skill tanpa konfirmasi, dan membatalkan perubahan file yang telah dibuat jika penulisan berikutnya gagal. Folder kosong yang sempat dibuat dapat tersisa setelah rollback. Workspace virtual/untrusted tidak didukung. Tidak ada instalasi global, pemanggilan npm/shell saat runtime, penyimpanan API key/PIN, telemetry extension, atau pemanggilan gateway.

Tes Node mencakup command activation melalui VS Code API mock, copy nyata ke filesystem sementara, cancellation, overwrite, stale preview, bundle tampering, symlink, dan rollback. Tes tersebut belum membuktikan rendering panel pada VS Code desktop; jalankan Extension Development Host atau pasang VSIX untuk verifikasi UI dan perilaku agent sebenarnya.

## Publikasi Marketplace

Daftarkan publisher Microsoft yang benar-benar kamu miliki, ganti publisher ID pada manifest bila berbeda, putuskan lisensi, lalu package dan publish melalui vsce atau upload VSIX ke halaman publisher. Jangan kirim token publikasi lewat chat atau commit ke repo. Jangan mengklaim listing aktif sebelum URL Marketplace telah terverifikasi.

Sumber: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
