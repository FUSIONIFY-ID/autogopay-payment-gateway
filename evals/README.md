# Behavioral fixtures

cases.json berisi kasus positif, negatif, dan adversarial dengan rubric dan policy anchor. Jalankan python scripts/run_evals.py untuk memvalidasi definisi fixture. Ini tidak memanggil model atau membuktikan agent mengikuti instruksi.

Untuk forward-test, berikan prompt mentah kepada agent dengan skill terpasang. Jangan menambahkan jawaban yang diharapkan pada prompt. Simpan output, versi agent/model, dan hasil tiap rubric; semua item kritis harus lulus. Catat keterbatasan tanpa menandai evaluasi yang belum dijalankan sebagai sukses. Lihat docs/testing.md untuk batas verifikasi.
