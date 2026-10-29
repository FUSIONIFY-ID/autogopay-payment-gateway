# Webhook contract and implementation

Source: documentation supplied on 2026-10-29; related public pages: https://autogopay.site/docs/webhook and https://autogopay.site/docs/authentication

Cross-checked against the webhook documentation supplied by the user on 2026-10-29.

## Provider contract

Set the callback URL in the dashboard. Notifications are JSON POSTs with `X-Callback-Event: transaction.received` and `X-Signature`, a hexadecimal HMAC-SHA256 of the original body bytes using the API key as secret. The payload has `event`, `timestamp`, and `transaction` containing `transaction_id`, `order_id`, `amount`, `status` (paid example: `PAID`), `payment_method`, and `paid_at`.

| Header | Documented value |
| --- | --- |
| `Content-Type` | `application/json` |
| `User-Agent` | `AutoGopay-Callback/1.0` |
| `X-Callback-Event` | `transaction.received` |
| `X-Signature` | HMAC-SHA256 of raw body, API key secret |

Treat User-Agent and event headers as metadata, not authentication. Verify the signature regardless of their values. The callback contract does not require an inbound Bearer token; do not apply the outgoing API Bearer requirement to this route. The API key itself is the documented HMAC secret.

Documented payload example (illustrative identifiers and timestamps):

```json
{
  "event": "transaction.received",
  "timestamp": "2024-03-29 14:30:45",
  "transaction": {
    "transaction_id": "TRX-001",
    "order_id": "ORDER-001",
    "amount": 50000,
    "status": "PAID",
    "payment_method": "QRIS",
    "paid_at": "2024-03-29 14:30:40"
  }
}
```

The example does not specify a timezone or establish a signature freshness window. Do not infer either from the timestamp strings. Accept payment evidence only after authentication, schema validation, `status === 'PAID'`, and matching the stored payment attempt.

| payment_method | Provider |
| --- | --- |
| `QRIS` | GoPay |
| `QRIS_SHOPEEPAY` | ShopeePay |
| `QRIS_INTERACTIVE` | Interactive |

Use HTTPS in production; return HTTP 200 within 10 seconds. Deduplicate transaction IDs. GoPay/ShopeePay auto-monitor every 3 seconds in the first 2 minutes, every 5 seconds until minute 5, then every 10 seconds, stopping after 15 minutes; Interactive callbacks occur on status checks. Retry delivery schedules, replay timestamp policy, and provider-specific webhook identifier mapping are not documented here.

## Implementation recommendations

Preserve bytes before JSON parsing. Authenticate with constant-time comparison; only then parse and validate the event. In multi-account deployments select the API key using a trusted callback route/account binding, not unverified payload data. Authenticate before any order mutation. Atomically persist an authenticated receipt with its order update and outbox event. Include account/provider in deduplication keys. Return success for authenticated receipts already handled. On persistence failure return an error and provide reconciliation; do not claim undocumented retries will recover it.

Node.js verification helper (adapt to existing backend):

```js
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyAutoGoPaySignature(rawBody, signature, apiKey) {
  if (!Buffer.isBuffer(rawBody) || typeof apiKey !== 'string' || !apiKey) return false;
  if (typeof signature !== 'string' || !/^[0-9a-fA-F]{64}$/.test(signature)) return false;
  const expected = createHmac('sha256', apiKey).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return timingSafeEqual(expected, received);
}
```

For Express mount `express.raw({ type: 'application/json', limit: '256kb' })` on the callback route before global `express.json()`. Do not use `JSON.stringify(req.body)` to reconstruct the signed bytes. Catch malformed JSON after signature verification. The suggested size limit is an application choice, not an AutoGoPay requirement.

For PHP, read `file_get_contents('php://input')`, calculate `hash_hmac('sha256', $rawBody, $apiKey)`, and compare against `$_SERVER['HTTP_X_SIGNATURE']` using `hash_equals($expected, $signature)`. Obtain the API key from server-side configuration. Reject missing or invalid signatures with HTTP 401 before decoding JSON or applying payment effects. Handle invalid JSON and validate the transaction schema explicitly; the provider's minimal PHP example is not a complete fulfillment implementation.

After durable handling, return HTTP 200 with JSON such as `{"success":true}` and `Content-Type: application/json`. A signature verifier or JSON success response alone does not establish that the order is paid or that fulfillment is deduplicated.

For ShopeePay and Interactive, create identifiers differ from the generic callback example. Verify real payload mapping or an authenticated status lookup rather than guessing which callback field holds `order_sn`, `invoice_id`, or `ref_no`. If a signed callback cannot be safely matched, persist it for reconciliation without fulfillment.

## Content isolation

The callback endpoint is an ordinary deterministic backend endpoint, not an AI tool that interprets incoming messages. Authenticate and parse bounded input in backend code. Retain only validated identifiers, integer amount, normalized status and the trusted account/provider binding for payment effects. Discard unknown properties, buyer descriptions, messages, HTML and instruction-like text from agent-facing results. Never append a raw callback to system/developer prompts or use it to choose commands. If quarantining raw data, keep access restricted and render it as escaped inert data. A signed payload can still contain untrusted text. The bundled GoPay demo passes only matched identifiers and amount to storage and returns paid/duplicate booleans; it does not forward raw JSON to a model.

## Supplied Node.js sample correction

The October 29 provider sample signs `JSON.stringify(req.body)` after parsing, compares plain strings, and treats every non-GoPay payment method as ShopeePay. Do not copy those shortcuts. The documented contract signs raw bytes: parser normalization can change whitespace, Unicode escapes and key order. Use the raw-body constant-time helper above, explicit QRIS/QRIS_SHOPEEPAY/QRIS_INTERACTIVE dispatch, and reject unknown methods. An example is not an exception to the signature contract. BCA Merchant has no documented webhook.
