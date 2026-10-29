# BCA Merchant QRIS and reconciliation

Source: the complete AutoGoPay API Markdown supplied on 2026-10-29 (Asia/Jakarta), BCA Merchant sections. These contracts have not been confirmed with a live BCA account.

## Setup and creation

Connect the BCA Merchant account and select the intended outlet in the dashboard. Use backend Bearer authentication at `https://v1-gateway.autogopay.site`. Do not invent a connection-status API. Bind the configured account and outlet identity to every local attempt; changing the dashboard outlet requires reconciling existing attempts first.

POST `/bca/qris/create` accepts JSON `amount`, an integer IDR from 1 through 10000000, paid exactly as requested. It generates a dynamic QR from the selected outlet's static QR.

The successful envelope contains `data.transaction_id` (example `BCA-3F9A1C7E52D04B8A`), `amount`, `qr_string`, `qr_url`, `transaction_time`, `expiry_time`. Check amount and identifiers, persist the local order relationship and original expiry before displaying QR data. Do not invent `order_id`, `bill_number`, `checkout_url` or receipt status fields. The generated `transaction_id` does not appear in BCA mutations/statements.

The documented `expiry_time` is WIB (UTC+07:00). After it, the QR image URL returns HTTP 410. Image expiry is not proof of cancellation or payment failure. Do not claim the QR payload itself becomes unpayable based on an image response. Reconcile late receipts without downgrading paid orders.

Creation errors documented: HTTP 400 invalid nominal, BCA not connected, or outlet not selected; 401 missing/invalid API key; 403 expired subscription. A create timeout is uncertain: investigate instead of retrying blindly. No idempotency header is documented.

## Statements and pagination

GET `/bca/transactions` accepts optional `date` in real YYYY-MM-DD format (WIB, default today) and integer `page` starting at 1. Use explicit WIB dates, not the UTC date of a worker. Query days overlapping attempt windows across WIB midnight.

The envelope is `{"success":true,"data":{"date":"2026-10-16","page":1,"transactions":[...]}}`. Every transaction object is passed through from BCA unchanged. The only supplied item example is `{"...":"data transaksi apa adanya dari BCA"}`. It is a placeholder, not a schema: do not invent `amount`, `reference_id`, `paid`, direction or time field names in a production parser.

Each page has at most 50 items. Fetch the next page when exactly 50 items are returned, including an eventual empty page if the total is a multiple of 50; stop when fewer than 50 arrive. Bound page count and elapsed time. Treat repeated pages, a wrong echoed date/page, oversized pages or a mid-scan failure as incomplete scans. Do not silently claim there are no further receipts. Statement requests are read-only; use bounded retries for transient HTTP 502 only within an application-defined policy, never for QR creation. Deduplicate overlapping runs by a verified stable BCA receipt identifier scoped by account/outlet. Concurrent changes may shift pagination: overlap and rescan rather than assuming snapshot isolation.

Documented errors: HTTP 400 invalid date, disconnected account or no outlet; HTTP 502 BCA unavailable. No maximum query interval, definitive successful-receipt marker, stable item fields or page cursor is documented.

## Payment attribution

BCA has no per-QR status check, auto-poller, or webhook in this API. Never add an imaginary `/bca/qris/status` request or `QRIS_BCA` callback method. `success: true` means an API request succeeded, not that any local order was paid.

The provider recommends matching nominal and time in mutations. Treat those as candidate evidence only for automated fulfillment: two orders may share the same amount and nearby times, and the QR creation transaction ID cannot resolve that ambiguity. Do not choose the newest order, allocate one receipt twice, or invent a verified ID relationship. Before production automation, inspect an authorized redacted real statement and establish its field meanings, success/direction semantics, timestamp timezone and stable receipt reference. Keep parser changes explicit and versioned; unknown fields stay inert data.

Until a reliable attribution rule is established, present candidates for authorized human reconciliation with an audit trail and no automatic credit. Any approved assignment must bind one unique receipt to one order, exact amount and trusted account/outlet, then use the same atomic receipt/order/outbox transition as other providers. A nearby timestamp alone does not guarantee payer identity. If fully automatic checkout is required, prefer a connected provider with reliably correlated payment evidence.

## Bundled helper scope

`assets/node/bca.mjs` validates creation, date/page input and bounded statement pagination with injected HTTP mocks. It does not know BCA item field names, select an order, mark a payment paid, or call live services by itself. Never pass raw statement descriptions into AI instructions or tool selection.
