# API contracts

Verified from public AutoGoPay documentation on 2026-10-12 (Asia/Jakarta). Re-check before extending these contracts. Request base: `https://v1-gateway.autogopay.site`; authentication: `Authorization: Bearer <AUTOGOPAY_API_KEY>`. Send JSON for POST bodies.

## GoPay QRIS

| Method and path | Input | Relevant output / meaning |
| --- | --- | --- |
| POST `/qris/generate` | JSON `amount`, integer IDR 1–10000000 | `success`, `data.transaction_id`, `order_id`, `amount`, `transaction_status`, `qr_string`, `qr_url`, `checkout_url`, `transaction_time`, `expiry_time` |
| POST `/qris/status` | JSON `transaction_id` | Documented status values: `pending`, `settlement` (paid), `expire`, `cancel`; response envelope not shown on this page |
| POST `/qris/cancel` | JSON `transaction_id` | Cancel pending QRIS; cancellation is not a refund |
| POST `/transactions` | No body documented; Bearer authentication | `success`, `data.transactions[]`: `id`, `time`, `amount`, `currency`, `payment_type`, `status`, `issuer` |

Creation documents automatic status monitoring every 3 seconds for up to 15 minutes. Save both returned transaction and order identifiers. Send the returned checkout URL when a hosted payment page is appropriate.

Cross-check: user supplied all six GoPay documentation pages on 2026-10-12. Transaction history uses POST even though it reads data. Do not invent pagination, filters, or a request body. An API-level `success: true` does not mean all listed transactions are paid; inspect each status and correlate identifiers before reconciling an order.

### Hosted payment link

Use `data.checkout_url` returned by `/qris/generate`; there is no separate payment-link creation endpoint in the supplied documentation. The documented URL format is `https://autogopay.site/pay/<token>`, with a unique generated token per transaction. Do not construct or guess the token. The hosted page displays the QR, expiry countdown, and automatically refreshed payment status. Send the returned link through the application's existing customer messaging flow when requested; fulfill only from verified server-side evidence.

### Request examples

Use the following POSIX shell syntax after configuring `AUTOGOPAY_API_KEY` securely. Keep credentials out of source files and output. Do not paste the documentation's personal API key into reusable examples. Each continuation backslash must be the last character on its line; the flattened `\\  -H` pasted from the webpage is not executable shell syntax.

Read-only history request (POST, no body):

```sh
curl --silent --show-error --max-time 20 \
  --request POST 'https://v1-gateway.autogopay.site/transactions' \
  --header "Authorization: Bearer ${AUTOGOPAY_API_KEY}"
```

Create a real QRIS only when requested. This example creates a 10000 IDR payment attempt, not a completed payment:

```sh
curl --silent --show-error --max-time 20 \
  --request POST 'https://v1-gateway.autogopay.site/qris/generate' \
  --header "Authorization: Bearer ${AUTOGOPAY_API_KEY}" \
  --header 'Content-Type: application/json' \
  --data '{"amount":10000}'
```

For status and cancellation, send POST to `/qris/status` or `/qris/cancel` with JSON `{"transaction_id":"<returned-transaction-id>"}`. Never cancel a customer's unrelated attempt. Read status before cancelling; handle a race with payment completion. Neither status nor cancellation response schemas were supplied, so do not invent their envelope structure.

### Diagnose failures

Distinguish gateway JSON errors from edge/security blocks. A Cloudflare HTTP 403 / error 1010 does not establish API-key validity. Do not repeatedly retry a response that explicitly denies access; report the blocked layer and use an owner-approved client/environment. Never describe a documentation example or a locally mocked response as a successful live API test.

Sources: https://autogopay.site/docs/gopay, https://autogopay.site/docs/gopay/transactions, https://autogopay.site/docs/gopay/qris-generate, https://autogopay.site/docs/gopay/payment-link, https://autogopay.site/docs/gopay/qris-status, https://autogopay.site/docs/gopay/qris-cancel

## ShopeePay

Create with POST `/shopeepay/qris/create`, JSON integer `amount`, maximum 10000000 IDR. Read `data.order_sn`, `amount`, `nmid`, `qr_string`, `qr_url`, `transaction_time`, `expiry_time`; do not invent a GoPay-style `transaction_id` in this response. The QR image expires after 15 minutes; the documented expiry timestamp is WIB.

Check with GET `/shopeepay/qris/status?order_sn=<encoded-string>`; optional integer `router_id` defaults to 1. Status response includes `data.order_sn`, `status`, `order_status`, `paid`, `amount`, `paid_at`. Paid is documented as `status=success`, `order_status=1`, `paid=true`; pending uses `order_status=2`. Do not mistake top-level API `success` for payment success.

Connection: GET `/shopeepay/status` exposes `data.connected`, `token_valid`, `store_id`. History: GET `/shopeepay/transactions`, optional `limit` (default 10, max 100), returns `data.transactions[]` with `order_sn`, `amount`, `is_money_in`, `status`, `router_id`, title and date. Preserve known router IDs for status queries. Read [ShopeePay integration](shopeepay.md), also directly linked from SKILL.md, for complete supplied contracts and bot workflow. Automatic monitoring enables callbacks; manual status is optional.

Sources: https://autogopay.site/docs/shopeepay, https://autogopay.site/docs/shopeepay/qris, https://autogopay.site/docs/shopeepay/qris-status

## Interactive

Connect the merchant in the dashboard. POST `/interactive/qris/create` accepts integer `amount`, maximum 10000000 IDR. Persist returned `data.invoice_id`, `ref_no`, `amount`, `qr_string`, `qr_url`, `timestamp`, `expired_date`.

POST `/interactive/qris/status` requires both `invoice_id` and `ref_no` strings. The paid example has `data.status=success`, amount, `tran_id`, `rrn`, and `paid_at`. GET `/interactive/status` exposes `data.connected`, `mid`, `appid`. Read [Interactive integration](interactive.md), also directly linked from SKILL.md, for the complete supplied workflow. Poll status server-side every 3–5 seconds for at most 15 minutes; checking status triggers the documented callback.

Resolve two documentation discrepancies explicitly: the create page says 15 minutes but its sample timestamps span an hour; the status code sample uses `api.autogopay.site` while the canonical base and cURL use `v1-gateway.autogopay.site`. Use the canonical base, record returned expiry, and confirm expiry semantics before making customer-facing guarantees.

Sources: https://autogopay.site/docs/interactive, https://autogopay.site/docs/interactive/generate-qris, https://autogopay.site/docs/interactive/check-status

## InstaQRIS

POST `/instaqris/create` accepts integer `amount`, 1–10000000 IDR. Response fields: `data.amount`, `bill_number`, `expires_in` (example 900 seconds), `outlet_id`, `qr_url`.

GET `/instaqris/transactions` accepts optional `start_date` and `end_date` as YYYY-MM-DD, defaulting to today. Statement entries under `data.transactions` include `id`, `bill`, `amount`, `type`, `rc`, `date`, `time`, buyer and issuer details. The documented sample is not proof that statement `bill` equals creation `bill_number`. Verify this mapping before automated attribution. Do not assume a per-invoice status endpoint or webhook exists. Read [InstaQRIS reconciliation](instaqris.md), also directly linked from SKILL.md, for the complete supplied workflow and statement field limitations.

The overview calls InstaQRIS static while provider pages describe dynamic amount creation. Follow the detailed endpoint contract and disclose the inconsistency if relevant.

Sources: https://autogopay.site/docs, https://autogopay.site/docs/instaqris, https://autogopay.site/docs/instaqris/generate-qris, https://autogopay.site/docs/instaqris/check-status

## OVO

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/ovo/transactions` | History |
| POST | `/ovo/qris/preview` | Inspect a QRIS for outgoing payment |
| POST | `/ovo/qris/confirm` | Execute QRIS payment |
| GET | `/ovo/banks` | Bank destinations |
| POST | `/ovo/transfer/inquiry` | Bank recipient and fee inquiry |
| POST | `/ovo/transfer/execute` | Bank transfer |
| POST | `/ovo/transfer/ovo/inquiry` | OVO recipient inquiry |
| POST | `/ovo/transfer/ovo/execute` | OVO transfer |

Read [OVO contracts](ovo.md) for documented schemas, the two QRIS confirmation branches, history pagination, bank fees, and transfer workflows supplied by the user. This file is also directly linked from SKILL.md. Money-moving endpoints require a six-digit string PIN; three incorrect attempts can lock the account.

Source: https://autogopay.site/docs/ovo
