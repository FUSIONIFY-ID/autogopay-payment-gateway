# Kontribusi

1. Edit sumber utama di skills/autogopay-payment-gateway/. Jangan mengedit salinan plugin secara langsung.
2. Tambahkan regression test untuk bug pada verifier, database, atau client. Tambahkan behavioral fixture untuk kesalahan penalaran AI.
3. Jalankan python scripts/sync_skill.py setelah perubahan sumber skill.
4. Jalankan semua pemeriksaan pada docs/testing.md.
5. Jika format/version berubah, update VERSION, manifest plugin, dan CHANGELOG bersama.
6. Buat PR dengan perubahan perilaku dan hasil pemeriksaan yang benar-benar dijalankan.

Jangan commit API key, PIN, payload customer nyata, file database, atau environment produksi. Gunakan fixture fiktif. Selalu pisahkan dokumentasi provider, rekomendasi implementasi, mock, dan hasil live.
