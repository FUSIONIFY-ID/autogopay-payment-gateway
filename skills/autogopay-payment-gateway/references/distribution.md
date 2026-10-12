# Distribution through skills.sh

Verified 2026-10-12: https://skills.sh/docs/faq and https://skills.sh/docs

Host this directory in a GitHub repository, for example at `skills/autogopay-payment-gateway/`, preserving `SKILL.md`, `agents/`, and `references/`. Put a usage README at repository root if desired. Do not publish credentials, production payloads, or personal customer data. Describe this as a community integration skill unless the provider has endorsed it.

After the repository exists, replace OWNER/REPO in the following command:

```sh
npx skills add OWNER/REPO --skill autogopay-payment-gateway
```

This is a template, not a working published source. The skills.sh FAQ says leaderboard discovery uses installation telemetry from the skills CLI. Creating a local skill alone does not publish it to GitHub or guarantee a listing. Verify the public repository and actual installation before announcing availability.

Example user prompt:

> Use the autogopay-payment-gateway skill to add GoPay QRIS checkout and a verified, idempotent webhook to my Node.js backend.


## Use with different AI coding agents

Keep the standard frontmatter (`name`, `description`) and Markdown references together. `agents/openai.yaml` is optional host metadata; another agent can use the core without reading that file. Use the skills CLI's supported-agent selection rather than assuming all products share an installation directory. Inspect current CLI help if agent/global flags are needed; do not invent flags or product compatibility.

After installation, a user can ask in plain language:

> Pakai skill autogopay-payment-gateway untuk pasang pembayaran QRIS AutoGoPay di project ini. Ikuti stack yang sudah ada, tambahkan konfigurasi backend dan webhook, lalu jalankan pemeriksaan yang relevan. Beri tahu langkah dashboard yang masih perlu aku isi.

A host supporting named skill invocation may also accept `$autogopay-payment-gateway`. The dollar syntax is host-specific, not a universal requirement.

For an AI chat product without skill installation, provide SKILL.md and the referenced files as context, then give the same request. That supplies guidance but does not give the AI repository access, an HTTP client, deployment capability, or permission to execute payments. Do not claim automatic installation in those products.

## Check installation separately from payment setup

Verify that the target agent discovers the installed skill and can read its provider references. Next verify project integration, server environment configuration, provider readiness, dashboard callback reachability, and an authorized real payment when a suitable environment exists. An installation count, skill validation, or a successful mock is not proof of live gateway integration.
