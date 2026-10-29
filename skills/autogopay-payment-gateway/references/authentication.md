# Authentication and setup

Source: authentication and webhook documentation supplied by the user on 2026-10-29 (Asia/Jakarta). Canonical API base: `https://v1-gateway.autogopay.site`.

## Configure the application

1. Obtain an API key from the AutoGoPay dashboard/authentication page through the application's intended secure configuration flow. Use `AUTOGOPAY_API_KEY` on the server; never ask for a key to be embedded in a skill or public code.
2. Configure `AUTOGOPAY_BASE_URL` with the canonical base. Use HTTPS and a trusted configured destination, not a customer-supplied URL. Do not send the Bearer key to returned QR image or checkout URLs.
3. Connect the requested provider in the dashboard. API-key authentication and provider-account readiness are separate checks.
4. Set a public HTTPS callback URL in the dashboard for supported incoming QRIS notifications. Keep callback parsing and signature verification compatible with the framework's body middleware.
5. Implement the provider's creation/status/statement workflow and durable payment tracking before enabling fulfillment.

An example environment template contains no credential:

```dotenv
AUTOGOPAY_BASE_URL=https://v1-gateway.autogopay.site
AUTOGOPAY_API_KEY=
```

Fail clearly when the server key is absent. Keep populated environment files out of version control and frontend builds. Do not use public-prefixed environment variables for the key.

## Separate the two authentication directions

| Direction | Documented authentication |
| --- | --- |
| Application to AutoGoPay API | `Authorization: Bearer <api-key>` |
| AutoGoPay to application callback | `X-Signature`: hexadecimal HMAC-SHA256 over raw body with the same API key as secret |

The callback contract does not document an inbound Bearer header. Do not reject valid callbacks solely because it is absent. A provider event header, User-Agent, or a body status is not a substitute for signature verification. See `webhooks.md` for byte preservation, comparisons, and receipt handling.

The API key also serves as the webhook secret. When the owner rotates it, coordinate backend API configuration and webhook verification; do not invent a separate provider webhook secret or undocumented overlapping-key guarantee. A successful API request does not prove callbacks are reachable; test signature handling and callback delivery independently when a suitable live environment is available.

Source links: https://autogopay.site/docs/authentication and https://autogopay.site/docs/webhook
