# Changelog

## 0.5.1 — 2026-10-29

- Add a Vercel HTTPS serverless adapter with trusted deployment-host validation.
- Handle pre-parsed JSON request bodies without losing MCP protocol messages.
- Add an SDK round-trip test for the serverless adapter and public health endpoint.


## 0.5.0 — 2026-10-29

- Add Gemini CLI extension manifest with native skill discovery.
- Add read-only MCP document search, retrieval and provider checklists over stdio and Streamable HTTP.
- Add absolute-path MCP configuration generator, HTTP guards and Docker deployment template.
- Test MCP with official SDK clients; distinguish transport support from hosted connector or marketplace publication.


## 0.4.0 — 2026-10-29

- Add BCA Merchant creation and bounded statement pagination without guessing receipt schemas or automatic payment attribution.
- Update GoPay/ShopeePay adaptive monitoring and Interactive pending/disconnected contracts.
- Correct unsafe Node webhook sample guidance, remove resolved host discrepancy warnings, and retain unresolved expiry/identifier gaps.
- Add 22 Node regression tests and four behavioral evaluation cases.
- Synchronize portable skill, Codex/Claude plugin packages and offline VS Code bundle.


## 0.3.1

- Move distribution instructions outside the installed payment skill.
- Define explicit trust boundaries for external documentation and callback content.
- Test signed instruction-like payloads, amount overrides and unknown provider claims.


## 0.3.0

- Initial offline project skill installer for six AI coding targets.
- Explorer actions, Command Palette commands, walkthrough and integration prompt.
- Checksum verification, overwrite confirmation, symlink checks and rollback.
- No runtime payment API calls or credential storage.
