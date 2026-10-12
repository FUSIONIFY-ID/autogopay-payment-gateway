# AutoGoPay Payment Gateway Skill

A community skill for AI coding agents to integrate AutoGoPay into existing web applications, backend services, and Telegram or WhatsApp bots.

## Install

```sh
npx skills add FUSIONIFY-ID/autogopay-payment-gateway --skill autogopay-payment-gateway
```

Select your supported agent using the CLI. Installing this skill provides integration instructions; it does not configure your merchant account or perform a payment.

## Use

Ask your coding agent:

> Pakai skill autogopay-payment-gateway untuk pasang pembayaran AutoGoPay di project ini. Ikuti stack yang sudah ada, buat konfigurasi backend dan webhook, lalu jalankan pemeriksaan yang relevan.

Or, in hosts supporting named invocation:

> Use $autogopay-payment-gateway to integrate AutoGoPay QRIS checkout into this project.

For a chat-only AI, provide SKILL.md and the relevant reference files as context. Repository access and execution capabilities depend on the host product.

## Coverage

- GoPay: QRIS generation, payment links, transaction history, status and cancellation.
- ShopeePay: merchant readiness, QRIS generation, order/router tracking, status and bot workflows.
- Interactive: merchant readiness, invoice/reference tracking, polling and callbacks.
- InstaQRIS: QRIS creation and date-based statement reconciliation.
- OVO: history, QRIS preview/confirmation, bank inquiry/transfer and OVO-to-OVO transfers.
- Backend-only Bearer authentication, HMAC-SHA256 callbacks and durable duplicate prevention.

## Application setup

Obtain the API key from the AutoGoPay dashboard and configure it securely on the server as AUTOGOPAY_API_KEY. The canonical API base is https://v1-gateway.autogopay.site. Connect the selected provider and configure a production HTTPS callback when supported. Never put API keys or OVO PINs in public repositories or frontend code.

## Verification and limitations

Skill structure and reference links have been validated; nine local signature verification fixtures passed. Live API testing was blocked by Cloudflare error 1010, so a completed live payment and callback delivery have not been verified. ShopeePay/Interactive webhook identifier mapping and InstaQRIS bill mapping remain explicit integration questions; agents must not guess them.

Public documentation is the API source: https://autogopay.site/docs. Documentation was reviewed and supplemented with user-provided pages on 2026-10-12. This repository is not represented as an official AutoGoPay SDK or an endorsed provider integration.
