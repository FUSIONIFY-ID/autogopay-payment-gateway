# Runnable examples

Use bundled assets as small tested starting points, adapting them to the existing project. Do not replace a production database, authorization model, or web framework with the demo server.

- `assets/python-demo/server.py`: loopback-only mock GoPay checkout and webhook server.
- `assets/python-demo/payment_store.py`: SQLite order/attempt/receipt/effect transactions, unique payment identities, conditional paid transitions.
- `assets/python-demo/webhook.py`: raw-body HMAC verification and strict paid-payload validation.
- `assets/python-demo/simulate.py`: signs and delivers a mock receipt twice to localhost; no real gateway call.
- `assets/node/autogopay.mjs`: server-side GoPay request helper with injected fetch for tests, no retries, plus signature verification and provider-specific paid indicators.
- `assets/node/webhook.mjs`: GoPay-only authenticated, bounded JSON projection for deterministic backend receipt handling, with unknown/free-form fields discarded.
- `assets/node/bca.mjs`: validated BCA creation and bounded paginated statements, without automatic payment attribution.
- `assets/node/polling.mjs`: pure adaptive schedule and Interactive status classification, with no network side effects.
- `assets/php/verify.php`: signature helper only; integrate with the project's durable payment store and route validation.

Copy all Python demo files together, then run `python server.py --db demo.sqlite3` and in another terminal run `python simulate.py`. The first callback should report duplicate=false, the second duplicate=true. Orders have a trusted seeded amount of 10000 IDR; the demo ignores customer-supplied amount. Configure DEMO_APP_TOKEN and DEMO_WEBHOOK_KEY for local fixtures; these are mock credentials, not AutoGoPay API keys. The demo always binds to 127.0.0.1, never invokes AutoGoPay, and does not expose outgoing transfers.

The SQLite effects table is an outbox illustration, not an external delivery worker. Delivery must be implemented with consumer deduplication or downstream idempotency. The demo's minimal bearer token maps one local account and must be replaced with real user authentication, order ownership checks, HTTPS deployment, limits, and observability in production. The Node helper can invoke real QR creation when explicitly called with a real key; never run it as a live payment test without the user's authorization. The standalone GoPay status response envelope and non-GoPay webhook mapping remain unresolved.
