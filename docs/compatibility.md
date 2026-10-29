# Instalasi skill dan plugin marketplace

## Skill lintas agent

```bash
npx skills add FUSIONIFY-ID/autogopay-payment-gateway --skill autogopay-payment-gateway --agent cursor claude-code codex qoder opencode kiro-cli --global --yes --copy
```

CLI skills mengelola penempatan file. Ini tidak memasang aplikasi editor, menyetel API key, atau mengaktifkan pembayaran. Jangan memasang skill dan plugin yang sama sekaligus jika duplikasi discovery membingungkan; pilih satu jalur untuk setiap host.

## Marketplace Codex

Untuk versi Codex yang menyediakan perintah plugin:

```bash
codex plugin marketplace add FUSIONIFY-ID/autogopay-payment-gateway
codex plugin add autogopay-payment-gateway@fusionify-autogopay
codex plugin list --json
```

Marketplace disimpan di `.agents/plugins/marketplace.json`, menunjuk plugin lokal di `plugins/autogopay-payment-gateway/`. Paket berisi portable `plugin.json`, compatibility `.codex-plugin/plugin.json`, serta skill beserta referensi dan contoh. Perintah marketplace add mendaftarkan sumber; plugin add memasang plugin. Gunakan versi dengan fitur plugin yang sesuai; periksa `codex plugin --help` bila perintah tidak tersedia.

## Marketplace Claude Code

Jalankan dari terminal Claude Code:

```bash
claude plugin marketplace add FUSIONIFY-ID/autogopay-payment-gateway
claude plugin install autogopay-payment-gateway@fusionify-autogopay
claude plugin list
```

Dari sesi interaktif, `/plugin marketplace add FUSIONIFY-ID/autogopay-payment-gateway` juga dapat digunakan. Marketplace ini memakai `.claude-plugin/marketplace.json`; plugin memiliki `.claude-plugin/plugin.json`. Setelah terpasang, mulai sesi baru dan minta integrasi AutoGoPay. Untuk host dengan skill command namespace, nama skill dapat berawalan nama plugin; periksa komponen plugin pada versi yang digunakan.

Validasi authoring lokal:

```bash
claude plugin validate .
claude plugin validate ./plugins/autogopay-payment-gateway
```

## Editor dan aplikasi chat

| Host | Jalur yang disediakan |
| --- | --- |
| Cursor, Qoder, OpenCode | Instalasi SKILL.md melalui CLI skills; bukan extension di marketplace editor |
| Kiro | CLI skills memasang ke folder skill Kiro; custom agent dapat memerlukan resources |
| Codex CLI / editor dengan Codex yang mendukung plugins | Marketplace Codex atau CLI skills |
| Claude Code CLI / editor dengan Claude Code yang mendukung plugins | Marketplace Claude Code atau CLI skills |
| ChatGPT desktop yang mendukung repo marketplace | Ikuti marketplace/plugin UI yang tersedia; paket tidak otomatis muncul di semua akun |
| AI chat lainnya | Berikan SKILL.md dan referensi sebagai konteks; bukan instalasi editor otomatis |

Repository marketplace tidak berarti plugin telah diterima di direktori publik resmi OpenAI, Anthropic, atau VS Code. VSIX installer terpisah tersedia untuk pemasangan manual melalui artifact CI; belum diterbitkan ke Visual Studio Marketplace. Paket skill/plugin tidak menyertakan MCP server, hooks yang berjalan otomatis, atau kredensial live. Lihat [panduan extension](vscode-extension.md).

## Sumber format

- https://github.com/vercel-labs/skills
- https://developers.openai.com/plugins/build/plugins
- https://learn.chatgpt.com/docs/cli/reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/plugins-reference

## Plugin dan MCP 0.5.0

Lihat [matriks connector](ai-connectors.md) untuk Gemini CLI extension, Claude Desktop stdio, remote ChatGPT/Claude.ai dan generator konfigurasi. Dukungan protokol dibedakan dari publikasi marketplace dan pengujian UI host.
