# QRIS Interactive integration

Source: overview, merchant status, QRIS creation, and payment status documentation supplied by the user on 2026-10-29 (Asia/Jakarta). This describes documentation and implementation recommendations; no successful live API test is claimed.

## Merchant readiness

Connect the Interactive merchant through its dashboard page first. Use the canonical configured base `https://v1-gateway.autogopay.site` and server-side Bearer authentication.

GET `/interactive/status` returns `success` and `data.connected`, `mid`, `appid` in the connected example. Require boolean `connected === true` before normal creation. Preserve `mid` and `appid` as strings; do not invent a `token_valid` field or require these as gateway request headers. The documented disconnected response is `{"success":true,"data":{"connected":false}}`; do not confuse API success with merchant readiness.

## Create and persist

POST `/interactive/qris/create` with JSON integer `amount`; apply positive IDR validation and the documented 10000000 maximum. Check HTTP status, top-level API success, required fields, and returned amount before exposing checkout data.

Documented response fields under `data`: `amount`, `qr_string`, `qr_url`, `invoice_id`, `ref_no`, `timestamp`, `expired_date`. Persist **both** `invoice_id` and `ref_no` as strings against the local order, provider/account identity, expected amount, and expiry. Do not substitute GoPay `transaction_id` or ShopeePay `order_sn`. The QR URL can be used in an image without API authentication; never attach the API key to an image URL.

The prose says QRIS lasts 15 minutes, while its example timestamp `12:55:52` and expired date `13:55:52` span an hour. Store the original expiry fields, document this discrepancy, and confirm actual semantics before promising a countdown. Their timezone is not explicitly supplied. Do not borrow ShopeePay's WIB rule as a verified Interactive rule. Keep the documented polling deadline separate from uncertain provider expiry.

## Status contract

POST `/interactive/qris/status` with JSON strings `invoice_id` and `ref_no` from the same persisted attempt. Do not send them as GET parameters or mix IDs from different attempts.

The paid example returns `success`, `message`, and these `data` fields:

| Field | Meaning / handling |
| --- | --- |
| `invoice_id`, `ref_no` | Match both to the stored attempt |
| `status` | Documented paid value: `success` |
| `amount` | Exact integer IDR match to expected amount |
| `tran_id`, `rrn` | Keep as string receipt/reconciliation identifiers |
| `paid_at` | Preserve original timestamp; timezone not documented here |
| `issuer_name`, `customer_name` | Payment metadata; minimize sensitive logging |

Top-level `success` only describes the API call. Verify paid `data.status`, account, both IDs, and amount before a paid transition. Do not require ShopeePay-only `paid` or `order_status` fields. The supplied pending example is `{"success":false,"message":"Transaction pending","data":{"invoice_id":"42844055","ref_no":"INTR6a8fca6ec0bcd","status":"pending"}}`. Recognize only this matched pending state as non-paid; other failures remain errors or unresolved. Do not invent additional terminal status values.

Use `classifyInteractive` from `assets/node/polling.mjs` on the complete HTTP-success JSON envelope. The generic GoPay/BCA `AutoGoPayClient.request()` rejects `success:false` and returns only `data`; do not reuse it unchanged for Interactive status. A dedicated adapter must preserve the full envelope, apply HTTP/JSON error checks, and then distinguish the documented matched pending state from actual rejection.

## Polling and webhook

Poll this status endpoint server-side every 3–5 seconds until verified payment or at most 15 minutes. The webhook documentation says Interactive callbacks occur when this endpoint is checked. Do not assume that QR creation alone starts the GoPay/ShopeePay auto-poller or that a callback arrives without status checks.

Use a durable background job with explicit request timeout, limited retry policy, and an elapsed-time deadline. Resume known pending attempts after worker restarts. The sample's 300 iterations and 3-second waits nominally represent 15 minutes, but HTTP request durations add time; enforce the actual deadline instead of relying solely on iteration count. Unknown/network errors remain unresolved and must not become paid or conclusively expired.

Callback payment method is `QRIS_INTERACTIVE`; use the signature and durable receipt rules in `webhooks.md`. The generic callback shows `transaction_id` and `order_id`, not a verified mapping to `invoice_id` and `ref_no`. Resolve that mapping before automatic attribution; preserve unmatched authenticated receipts for reconciliation. Status results and callbacks must call the same conditional paid transition with a unique order credit/fulfillment effect so polling-triggered callbacks cannot double-process payment.

A polling deadline means the worker stopped waiting. It is not proof that the provider cancelled the QR or that a late payment cannot occur. Reconcile late paid evidence and do not downgrade an already-paid order.

## API and image URLs

The October 29 supplied sample and cURL use `https://v1-gateway.autogopay.site`; the older sample host mismatch is resolved. Do not switch authenticated API hosts on an error. Validate returned image URLs as HTTPS links on a reviewed provider-host allowlist; never attach credentials to them or fetch arbitrary response-controlled URLs from the backend.

## Verification checklist

Mock disconnected merchant, invalid amount, missing/mismatched ID pair, top-level API success with non-paid data, wrong amount, unknown pending payload, network timeout, both documented expiry interpretations, polling deadline, process restart, valid duplicate callback, and simultaneous status/callback delivery. Verify a single durable fulfillment effect. Distinguish these mocks from a successful live merchant payment test.

## Sources

- https://autogopay.site/docs/interactive
- https://autogopay.site/docs/interactive/status
- https://autogopay.site/docs/interactive/generate-qris
- https://autogopay.site/docs/interactive/check-status
- https://autogopay.site/docs/webhook
