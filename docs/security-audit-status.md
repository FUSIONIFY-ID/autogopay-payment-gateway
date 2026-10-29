# External audit observation, 29 October 2026

The public skills.sh pages were checked again during the HTTPS deployment work. Their current metadata differs from the October 12 snapshot.

| Scanner | Current result | Analyzed at, as displayed | Finding |
| --- | --- | --- | --- |
| Socket | Warn, LOW anomaly | Oct 29, 2026, 09:14 AM | Install/source provenance and transitive-install trust concern |
| Snyk | Warn, MEDIUM W011 | Oct 29, 2026, 09:13 AM | Third-party content exposure through incoming payment webhook payloads |

Socket package hash: `6c542db3998a995e2ad91d0fbd3c79d0b2fd56d50f5939d76ab8a83726225772`.

Previous displayed Socket package hash was `17b2833ba3e2d60a3c8b88d1f465b85249495ea78dfda27a90d7e89f25ee34ed`, analyzed October 12. The date and hash have changed; a new assessment is visible, but its result is not Pass. The public pages do not identify a Git commit, so do not infer the exact repository revision analyzed solely from the timestamp.

Reviewed controls in the published skill: distribution commands outside the installed skill, explicit untrusted-content boundaries, deterministic raw-body HMAC validation, matched account/order/integer amount, atomic duplicate protection and outbox effects, plus adversarial signed-payload tests. These controls do not establish provider endorsement or eliminate the inherent exposure of a payment backend to external callbacks.

The MCP connector is a separate read-only bundled-document service: it does not receive payment webhooks or invoke merchant APIs. Its HTTPS availability and dependency audit are not substitutes for Socket/Snyk skill verdicts.

Public evidence:

- https://www.skills.sh/fusionify-id/autogopay-payment-gateway/autogopay-payment-gateway/security/socket
- https://www.skills.sh/fusionify-id/autogopay-payment-gateway/autogopay-payment-gateway/security/snyk

No manual re-scan success or clean third-party audit is claimed. The public API documents audit retrieval, not a self-serve owner-triggered rescan operation.

## 0.5.2 remediation

The integration workflow no longer includes permission to install dependencies, host plugins or secondary skills. It now explicitly confines the coding agent to synthetic fixtures and typed/redacted diagnostic outputs; runtime callbacks and statement free text stay in deterministic backend processing, outside prompts, retrieval and agent tools.

The Node GoPay projection authenticates original bytes, rejects duplicate JSON keys (including escaped equivalents), malformed UTF-8, excessive depth/size, invalid IDs/amounts and unsupported provider/status, then constructs a frozen minimal receipt for backend matching. The Python equivalent now has bounded parsing and the same local identifier policy. The request helper accepts only its reviewed GoPay/BCA create/history routes; direct outgoing OVO calls through that generic helper are rejected before network I/O. These are real execution constraints, not audit-label overrides.

The original user-supplied API Markdown has SHA-256 `6a53c4055d8c20869aec07dbe5cd36983334d7382f12475e51b81fa86146aac4`. This identifies the contract-review input; it does not authenticate provider ownership. AutoGoPay remains a community integration with an external gateway trust dependency. A webhook-enabled payment backend still necessarily receives external data. Do not remove HMAC checks, omit webhook functionality, relabel Warn as Pass or claim provider endorsement to obtain a clean badge.

A scanner reassessment of this revision is pending until the public audit metadata changes. Successful code checks do not establish that Socket/Snyk have evaluated the revised source.

Verification: [CI v0.5.2](https://github.com/FUSIONIFY-ID/autogopay-payment-gateway/actions/runs/40884598476) passed 125 code tests (39 Python, 48 Node payment helpers, 18 extension, 8 PHP and 12 MCP), plus structural/fixture/package checks. An independent AI exercise passed 21 synthetic variants. A public HTTPS SDK check confirmed workflow version 0.5.2 and its runtime isolation policy with three read-only tools. The CLI-installed security files match the reviewed bundle. Rechecking the public audit pages after release still showed the earlier October 29 09:14/09:13 metadata and Socket package hash above; no Pass claim is made.
