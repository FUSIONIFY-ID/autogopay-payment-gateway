# OVO integration contracts

Source: the user supplied the OVO overview and eight endpoint documentation pages on 2026-10-12 (Asia/Jakarta). This reference describes documented contracts, not successful live tests. Use the canonical base URL and Bearer authentication from `api-contracts.md`; POST bodies are JSON.

## Read history and banks

GET `/ovo/transactions` accepts optional integer `page` (default 1) and `limit` (default 10, maximum 50). The response has `success`, `message`, and a **data array**, not `data.transactions`. Each item includes `description`, `source`, integer IDR `amount`, `fee`, `date`, `time`, `status` (`SUCCESS` or `PENDING`), and `type` (`in` or `out`). Do not treat outgoing entries as received payments. The supplied history example has no unique transaction ID, so do not infer a reliable deduplication key or use amount/date alone for automatic credits.

GET `/ovo/banks` returns `success`, `message`, and a **data array** of `{code, name}`. Preserve codes as strings, including leading zeros. Use the current list rather than assuming the sample bank list is exhaustive.

## Preview and confirm QRIS

POST `/ovo/qris/preview` requires string `qr_string`; optional integer `amount` overrides the QR's detected amount. Omit this override unless the user intends it. The dynamic example returns `data.checkout_id`, `scan_id`, `qr_type`, `is_dynamic`, `merchant_name`, `merchant_city`, and `amount`.

Select confirmation fields from the returned preview:

| Preview outcome | POST `/ovo/qris/confirm` JSON |
| --- | --- |
| `checkout_id` present, amount detected | `checkout_id`, `pin`; optional `payment_method` |
| `preview_id` present and `amount_required: true` | `preview_id`, integer `amount`, `pin`; optional `payment_method` |

Send exactly one of `checkout_id` or `preview_id`. Do not invent a preview ID, reuse `scan_id` as a checkout ID, or send both alternatives. Reject an ambiguous/unrecognized preview and resolve it before executing.

Both IDs are documented to expire 10 minutes after preview. For expiration, repeat preview and verify the merchant, amount, and source before execution; do not silently replay an old authorization against changed payment details.

`pin` is a six-digit **string**. `payment_method` allows the exact values `OVO Cash` (default) or `OVO Nabung`. Bind the chosen source and approved amount to the pending operation server-side. The successful example has `success: true`, `data.amount`, `checkout_id`, and `payment_method`; a static-preview success schema is not shown in the supplied text. Insufficient funds are rejected against the selected funding source. Do not invent its error code or body.

Verify the preview merchant and total with the user before executing a payment when that authorization is not already explicit. Preview is not payment; confirm moves money. Do not invoke confirmation merely to test integration.

## Bank transfer

1. GET `/ovo/banks` and select the intended code.
2. POST `/ovo/transfer/inquiry` with string `bank_code`, string `account_number`, and integer `amount`, minimum 10000 IDR.
3. Read `data.bank_code`, `account_number`, `account_name`, `amount`, `admin_fee`, `total_amount`. The documented sample name is masked; do not reconstruct or fabricate its unmasked value.
4. Show the intended destination, returned recipient information, fee, and total to the user. Execute only within the user's authorized transfer scope.
5. POST `/ovo/transfer/execute` with required `bank_code`, `account_number`, `amount` (minimum 10000), and six-digit string `pin`. Optional fields: `bank_name`, `account_name`, `notes`. Documentation says bank and account names populate automatically from inquiry; omit them when unresolved rather than inventing values. Preserve the same destination and amount as the approved inquiry.
6. Store the returned `data.reference_id` and `amount`, `admin_fee`, `total_amount`, bank and recipient details after verified API success. Do not log the PIN.

The supplied documentation states the transfer feature must be enabled by an admin and gives a 2500 IDR bank fee deducted from OVO balance. Treat this as the documented fee, not a promise that future fees cannot change; use fresh inquiry output for the actual total. No bank-transfer maximum or provider idempotency mechanism is documented here.

## OVO-to-OVO transfer

POST `/ovo/transfer/ovo/inquiry` requires string `mobile` in the documented `08...` format and integer `amount`. Return fields: `data.mobile`, `full_name`, `nick_name`, `amount`. Do not apply the bank-transfer minimum to this operation without its own documented rule.

After recipient and amount authorization, POST `/ovo/transfer/ovo/execute` with required string `mobile`, integer `amount`, and six-digit string `pin`; optional string `message`. Use `message` here, whereas bank transfers use `notes`.

The successful example has `success: true`, `data.amount`, `mobile`, `full_name`, `reference_id`. Transfers use **OVO Cash** and must be enabled by an admin. Do not add the QRIS-only `payment_method` selector to this request or invent a transfer fee.

## Reliability and verification

Treat an execution timeout as an uncertain money movement. Persist the operation before sending, serialize execution, and reconcile before retrying; a local deduplication key is not proof of provider idempotency. Do not retry a wrong PIN automatically: three incorrect attempts can lock the OVO account. Keep PINs out of logs, examples, browser bundles, committed files, and chat output. Capture them only through the application's intended secure input flow.

Mock both QRIS branches, missing amount for preview ID, both IDs supplied, expired IDs, leading-zero PINs and bank codes, insufficient balance, disabled transfers, wrong PIN, changed recipient/amount after inquiry, and timeout after execute. Assert that outgoing operations cannot trigger incoming order credit logic. No OVO webhook contract is supplied by these pages; do not assume the incoming QRIS webhook supports outgoing transfers.

## Documentation links

- Overview: https://autogopay.site/docs/ovo
- History: https://autogopay.site/docs/ovo/history
- QRIS preview: https://autogopay.site/docs/ovo/qris-pay
- QRIS confirm: https://autogopay.site/docs/ovo/qris-confirm
- Banks: https://autogopay.site/docs/ovo/banks
- Bank inquiry: https://autogopay.site/docs/ovo/transfer-inquiry
- Bank execute: https://autogopay.site/docs/ovo/transfer-execute
- OVO inquiry: https://autogopay.site/docs/ovo/transfer-ovo-inquiry
- OVO execute: https://autogopay.site/docs/ovo/transfer-ovo-execute
