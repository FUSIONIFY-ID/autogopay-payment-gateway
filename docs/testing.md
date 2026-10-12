# Pengujian dan batas klaim

Jalankan dari root repo:

```bash
python scripts/validate_repo.py
python scripts/sync_skill.py --check
python scripts/run_evals.py
python -m unittest discover -s tests -v
node --test tests/node.test.mjs
php tests/php_test.php
python scripts/package_skill.py
```

Python memakai standard library; Node memakai node:test dan node:crypto. PHP CLI diperlukan untuk tes helper PHP. Paket ZIP dibuat lokal di dist/, bukan dipasang atau dipublikasikan otomatis.

## Lapisan verifikasi

| Lapisan | Yang dibuktikan |
| --- | --- |
| Struktur | Frontmatter, link, marketplace paths, versi, scan credential dan sinkronisasi |
| Unit/HTTP mock | Signature, HTTP lokal, amount/ID/account mismatch, duplicate dan database rollback |
| Race/restart | Callback dan status evidence bersamaan menghasilkan satu efek; restart mempertahankan deduplikasi |
| Client mock | Endpoint GoPay, integer bounds, HTTP/API/JSON error, timeout tanpa retry |
| Fixture evaluasi | Prompt, rubric, trigger decision dan policy anchor masih valid; bukan hasil model AI |
| Package | ZIP berurutan dan dapat direproduksi, dengan SHA256SUMS |
| Marketplace | Validasi schema/local installer yang benar-benar tersedia; laporkan hasil CLI secara terpisah |

Pengujian ini tidak membuktikan pembayaran produksi, callback live, akun merchant aktif, atau setiap editor berperilaku sama. Tes live sebelumnya ditolak Cloudflare Error 1010. Pemetaan webhook ShopeePay/Interactive, respons endpoint status GoPay, serta bill InstaQRIS tetap membutuhkan konfirmasi.

## Behavioral eval dengan AI sebenarnya

Gunakan prompt dari evals/cases.json pada agent target dengan skill terpasang. Nilai setiap rubric, catat versi model/agent, waktu, output mentah, dan hasilnya. Kasus negatif harus tidak mengaktifkan skill; semua rubric kritis harus lulus sebelum mengklaim hasil rilis untuk target tersebut. Jangan menyebut scripts/run_evals.py sebagai tes perilaku AI yang sebenarnya.

## CI

Workflow Validate AutoGoPay Skill memeriksa perubahan pada push/PR dan mengunggah ZIP sebagai artifact bila semua pemeriksaan berhasil. CI tidak diberi API key, tidak mengakses akun merchant, dan tidak melakukan pembayaran. Gunakan hasil Actions yang benar-benar selesai sebagai bukti, bukan keberadaan file workflow saja.
