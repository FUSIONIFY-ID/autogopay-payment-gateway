# October 29 contract update and migration

Source: AutoGoPay API Markdown supplied by the user on 2026-10-29. Distinguish documentation review, mocked tests, editor installation, external audits and real payments in every report.

| Change or gap | Required handling |
| --- | --- |
| BCA Merchant added | Use BCA reference; creation plus paginated mutations only, no invented webhook/status |
| GoPay/ShopeePay monitoring | Provider checks every 3 seconds during minutes 0–2, 5 seconds until minute 5, then 10 seconds until minute 15; this is provider scheduling, not a requirement to add another client loop |
| Interactive pending example added | `success:false` with matching ID pair and `data.status:pending` is documented non-paid; do not apply generic success-only parsing to discard this state |
| Interactive disconnected example added | `success:true,data.connected:false` means account not ready |
| Sample API/image hosts updated | October sample requests use v1-gateway.autogopay.site consistently; do not keep obsolete host-mismatch warnings as current defects |
| Node webhook example conflicts with contract | It hashes JSON.stringify(req.body), uses ordinary string comparison, and maps every non-GoPay method to ShopeePay. Preserve original bytes, constant-time comparison and explicit three-provider mapping instead |
| Interactive expiry still inconsistent | Prose says 15 minutes while sample timestamps span an hour; preserve returned values and flag timezone/expiry semantics pending confirmation |
| InstaQRIS overview still says static | Detailed create endpoint generates QR with specified nominal; do not infer static checkout behavior from summary wording |
| Standalone GoPay status envelope | Still not supplied; do not guess field paths based on create/history responses |
| Non-GoPay webhook ID mapping | Still unspecified; validate with authorized evidence before automatic order assignment |
| BCA item schema and InstaQRIS bill mapping | Still unspecified; block automated attribution that relies on guessed relationships |

For an existing integration, preserve paid states and old receipt identities, migrate account/provider-scoped attempts without relabelling IDs, and exercise webhook/poll races before rollout. Treat 401/403, upstream 502, malformed JSON, application rejection, pending and timeout as distinct outcomes. Keep unknown evidence unresolved, not paid or conclusively expired. Quote full shell URLs containing `&` to prevent the shell from backgrounding the request and dropping query parameters. Add request deadlines to sample bot code and use elapsed time for polling limits rather than loop count alone.

Use the bundled schedule helper for a client-side optional monitoring display or application-controlled fallback only. It describes intervals, performs no network requests, and must not cause duplicate polling when provider callbacks already suffice.
