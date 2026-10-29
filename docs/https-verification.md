# HTTPS verification, 29 October 2026

- Production endpoint: https://fusionify-autogopay-mcp.vercel.app/mcp
- Health: https://fusionify-autogopay-mcp.vercel.app/healthz
- Deployment: dpl_EBvrm2tQDgi15iLtCCEgmvi2LSkv, production, READY.
- Source revision: c459fc13cd735780a764c0416427b374b1022f00.
- Host/runtime: Vercel Node.js 22, stateless Streamable HTTP, public bundled documentation only.

The official MCP SDK client connected over public HTTPS with no credentials or protection-bypass token. initialize, tools/list (three read-only tools), a BCA checklist call, webhook contract retrieval, invalid filesystem-path rejection, and resources/list (11 resources) all passed. Independent raw JSON-RPC initialize, listing and checklist requests were also checked. No merchant API was called and no real payment was generated.

A first deployment reached READY but returned FUNCTION_INVOCATION_FAILED. Runtime dependencies were then installed from the project root using a committed lockfile, and the corrected production deployment passed the external checks above. This is why a successful hosting build alone is not sufficient evidence of a working connector.

Project-wide removal of SSO protection was rejected by automatic approval review because its scope was broader than enabling this endpoint. It was not applied. The production alias was already publicly accessible with the existing protection settings, so no protection bypass or replacement setting was needed.

For refreshed external skill audit results, see [audit evidence](security-audit-status.md). Socket/Snyk Warn remains separate from the working HTTPS connector and successful code checks.
