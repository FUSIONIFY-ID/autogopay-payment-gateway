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
