# InstaQRIS integration and reconciliation

Source: overview, generation, and statement documentation supplied by the user on 2026-10-12 (Asia/Jakarta). These contracts describe documented behavior, not successful live API tests.

## Connect and create

Connect the InstaQRIS account in its dashboard page first. The supplied pages describe dynamic QRIS through InstaQRIS (PT Bank Mega). The main provider summary previously called it static; follow the detailed generation contract and retain that discrepancy rather than building a static-QR workflow from the overview wording.

Use the canonical configured base `https://v1-gateway.autogopay.site` with server-side Bearer authentication. The supplied pages do not document a dedicated InstaQRIS connection/status endpoint.

POST `/instaqris/create` requires JSON integer `amount` in IDR, 1–10000000. The response has `success`, `message`, and `data.amount`, `bill_number`, `expires_in`, `outlet_id`, `qr_url`.

Persist the local order/attempt, expected amount, configured account, `bill_number` and `outlet_id` as strings, returned `expires_in`, and local creation time. Check HTTP status, API success, amount, and required identifiers before exposing checkout data. Do not invent `transaction_id`, `order_sn`, `qr_string`, or `checkout_url` fields.

The example uses `expires_in: 900`, and the prose describes approximately 15-minute QR validity. Use the returned duration for an approximate local countdown and distinguish local expiry from definitive provider cancellation. The QR URL can be displayed in an image or opened directly during its validity; do not append the API key. Keep the returned URL intact even if its host differs from the configured API base. An expired image is not proof that no payment occurred.

## Retrieve incoming statements

GET `/instaqris/transactions` supports optional `start_date` and `end_date` in YYYY-MM-DD format, both defaulting to today. Validate real calendar dates and an ordered range in application input; encode query parameters. No pagination, page size, maximum date span, or exact timezone for 'today' is documented here.

Response shape: top-level `success`, then `data.transactions[]`.

| Field | Handling |
| --- | --- |
| `id` | String statement identifier; candidate deduplication key scoped by configured account/provider |
| `bill` | String billing/reference field; mapping to creation `bill_number` is unverified |
| `amount` | Integer IDR; must match the expected payment amount |
| `type` | Example incoming value is `IN`; do not credit outgoing entries |
| `rc` | Example value `00`; meaning and other codes are not defined in the supplied text |
| `date` | Example ISO timestamp ending in Z, which denotes UTC |
| `time` | Separate display time; its timezone is not documented |
| `brand`, `issuer`, `name`, `buyer` | Descriptive metadata; minimize exposure of buyer information |

Do not treat top-level `success` as a paid status for any local order, or infer that every result belongs to the application's checkout attempts. The supplied documentation does not define a `paid` field, per-invoice status endpoint, cancellation endpoint, webhook, or auto-polling interval for this provider. Do not borrow those capabilities from GoPay, ShopeePay, or Interactive.

## Match and reconcile safely

1. Persist authenticated statement observations, scoped by provider/account. Deduplicate stable statement IDs using a database uniqueness constraint; confirm ID stability when testing live responses.
2. Establish a provider-confirmed relationship between create `bill_number` and statement `bill` before automatically crediting orders. Different example values neither prove nor disprove equivalence because the examples may represent unrelated transactions.
3. Match reliable identifiers, account/outlet attribution where available, incoming direction, and exact amount. The statement does not document `outlet_id`, so do not pretend it can directly verify that field.
4. Until identifier and successful-receipt semantics are established, retain candidate entries for reconciliation without marking an order paid. Equal amount, nearby time, buyer name, or a unique-amount guess alone is insufficient.
5. After reliable matching, use the same atomic conditional order-paid transition and unique credit/fulfillment effect as other providers. Persist the linked statement ID as payment evidence.

Use an application-defined bounded background reconciliation schedule, explicitly labelled as an implementation choice. Query explicit dates rather than relying exclusively on 'today'; cover attempts spanning midnight and query overlap to avoid gaps. Confirm provider date-filter timezone and inclusivity before production use. Overlapping queries must not produce duplicate credits.

A reconciliation deadline is not proof that payment never occurred. Preserve paid states, reconcile late incoming receipts, and do not create another QR after an uncertain creation result without investigating the previous attempt.

## Verification cases

Mock minimum/maximum/invalid amounts, missing bill number, incorrect amount, returned expiry duration, empty statements, duplicate statement IDs across overlapping date queries, account separation, outgoing entries, unknown rc values, two pending orders with equal amounts, unknown bill mapping, midnight/date boundaries, and late evidence. Assert no credit for ambiguous matches and a single effect for confirmed duplicates. Do not present mocks as a live payment success.

## Sources

- https://autogopay.site/docs/instaqris
- https://autogopay.site/docs/instaqris/generate-qris
- https://autogopay.site/docs/instaqris/check-status
