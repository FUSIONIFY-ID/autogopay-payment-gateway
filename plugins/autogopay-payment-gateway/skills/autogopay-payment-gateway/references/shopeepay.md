# ShopeePay integration

Source: overview, connection status, transactions, QRIS creation, QRIS status, and bot example supplied by the user on 2026-10-12 (Asia/Jakarta). These are documented contracts, not successful live API tests.

## Configure and check readiness

Use `AUTOGOPAY_API_KEY` server-side with Bearer authentication and `AUTOGOPAY_BASE_URL`, default `https://v1-gateway.autogopay.site`.

GET `/shopeepay/status` returns `success`, `message`, and `data.connected`, `token_valid`, `store_id`. `connected` means token and store ID are stored; `token_valid` means the credentials remain usable. Require both booleans before normal checkout creation. Preserve `store_id` as a string. A successful status API call is not proof of received payment. Do not require callers to add an undocumented `x-store-id` header: the documentation describes the connected store, not a required gateway request header.

## Create a payment attempt

POST `/shopeepay/qris/create` with JSON `{ "amount": 50000 }`, using a trusted positive integer IDR amount; documented maximum 10000000. Check HTTP status, JSON validity, top-level success, expected amount, and required `data.order_sn` before returning checkout data.

Persist `data.order_sn` as a string with local order ID, provider/account identity, expected amount, and expiry. Other documented fields: `nmid`, `qr_string`, `qr_url`, `transaction_time`, `expiry_time`. The response does not document `transaction_id`, a hosted checkout URL, or `router_id`.

Show the returned QR image or render `qr_string` with the project's QR library. Each QR has its own order SN; do not invent a unique-amount surcharge to identify it. QR images expire after 15 minutes; `expiry_time` is WIB (Asia/Jakarta), and image requests return 404 after expiry. Distinguish an expired image from an authentication error. Do not regenerate a payment automatically on a create timeout or image failure without reconciling the existing attempt.

## Read transaction history

GET `/shopeepay/transactions` accepts optional integer `limit`, default 10, maximum 100. The response uses `data.transactions[]`. Each entry includes string `order_sn`, `title`, integer IDR `amount`, boolean `is_money_in`, localized `date`, numeric `status`, and numeric `router_id`.

Only incoming entries can support incoming-payment reconciliation. Preserve `router_id` with `order_sn` when returned and use it in status queries. Do not assume every entry belongs to the application's customer orders or match solely by amount. Localized dates such as `04 Agustus 2026 11:38` are display data, not a reliable sorting/deduplication key or machine-parseable ISO timestamp.

## Verify payment status

GET `/shopeepay/qris/status` requires query string `order_sn`; optional integer `router_id` defaults to 1. Encode parameters with URLSearchParams in Node.js or the HTTP client's `params` argument in Python. When a known history entry has a non-default router, use that returned router rather than silently forcing 1. Do not fabricate a router field in creation output.

The response has `success`, `message`, and `data.order_sn`, `status`, `order_status`, `paid`, `amount`, `paid_at`.

| Payment state | status | order_status | paid |
| --- | --- | --- | --- |
| Pending | `pending` | `2` | Not confirmed |
| Received | `success` | `1` | `true` |

Only accept consistent paid indicators, the expected order SN and integer amount, and the correct configured account. Treat missing or contradictory fields as unresolved; do not credit on top-level `success` or a truthy string such as `"false"`. Status `settlement` belongs to GoPay and is not the documented ShopeePay success value.

## Webhook and bot workflow

Provider auto-polling checks every 3 seconds and delivers incoming-payment callbacks. Configure the callback in the dashboard and follow `webhooks.md`; ShopeePay method is `QRIS_SHOPEEPAY`. The generic webhook example does not prove how its IDs map to `order_sn`. Validate that mapping or use an authenticated status check for a persisted order; preserve unmatched signed receipts without crediting them.

Use webhook confirmation as the primary integration when available. The supplied bot example provides optional polling every 5 seconds for 15 minutes (180 attempts). Implement durable bounded polling as a background worker, with HTTP timeouts and an elapsed-time deadline; request duration means 180 attempts need not equal precisely 15 minutes. Stop polling on verified payment or deadline. A polling timeout is not proof the provider transaction is cancelled or never paid; allow reconciliation of late evidence.

For Node.js use server-side fetch with AbortSignal, check HTTP status before trusting JSON, and encode status query parameters. For Python use the project's HTTP client with explicit request timeout and checked HTTP status. In both languages:

1. Persist the local attempt before create; bind returned order SN to it.
2. Send the QR to the customer's authorized conversation through the existing bot flow.
3. Send verified webhook and polling evidence through the same atomic order-paid transition and unique credit/outbox effect.
4. Stop polling after payment; make bot notifications idempotent where possible.
5. Restart workers from persisted pending attempts after process restarts. Do not rely on in-memory loops as the only payment record.

The provider's bot sample uses `https://api.autogopay.site`, while its cURL examples and main docs use `https://v1-gateway.autogopay.site`. Prefer the canonical configured base. Keep returned QR URLs intact even when their host differs. Do not infer that a response host is a valid alternative authenticated API base.

## Verification cases

Mock disconnected/invalid tokens, creation pending, oversized amount, numeric order SN rejection (precision risk), image expiry, incoming/outgoing history, router 2 queries, valid paid status, top-level success with pending payment, wrong amount/SN, unknown webhook mapping, simultaneous polling/callback, and a restart with pending attempts. Verify only one credit or fulfillment effect. Keep mock success separate from live-provider success in reports.

## Sources

- https://autogopay.site/docs/shopeepay
- https://autogopay.site/docs/shopeepay/status
- https://autogopay.site/docs/shopeepay/transactions
- https://autogopay.site/docs/shopeepay/qris
- https://autogopay.site/docs/shopeepay/qris-status
- https://autogopay.site/docs/shopeepay/bot-example
