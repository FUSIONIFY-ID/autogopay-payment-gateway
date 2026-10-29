# AutoGoPay agent connector

## Value proposition
Give AI coding agents access to the reviewed AutoGoPay integration contracts already maintained in this repository. Users want the same integration workflow in Claude, ChatGPT, Gemini and other MCP-capable agents, without copying documentation into every chat.

## Core actions and flows
- Search the bundled contracts by text and return matching document excerpts.
- Read an allowlisted contract by identifier, including source limitations.
- Get a provider-specific implementation checklist with the main skill workflow.

The LLM adapts the contracts to the user's project. The connector supplies verified repository content; it does not invoke payment APIs or receive credentials. No custom UI is needed for these textual programming flows.

## API and boundaries
Tools: search_autogopay_docs(query), read_autogopay_doc(document), get_autogopay_checklist(provider). Resources expose only bundled Markdown through a fixed catalog. Never accept arbitrary filesystem paths, URLs or runtime API keys. No network fetch in document tools, no shell execution or file mutations. readOnlyHint=true, destructiveHint=false, openWorldHint=false.

Use the official MCP SDK with stdio for local agents and stateless Streamable HTTP for remote clients. HTTP defaults to loopback, validates Host/Origin, bounds JSON input and serves public non-personal documentation. HTTPS and deployment are required for hosted chat connectors. Public docs do not require merchant authentication; if private data/tools are ever added, design OAuth and account isolation before exposure. Do not describe local transport tests as a deployed connector or marketplace approval.

## Distribution
Keep native Claude/Codex catalogs, add Gemini CLI extension metadata and installation instructions, plus host-specific MCP config examples generated from the user's absolute checkout path. Skill files remain the portable agent workflow. No transitive auto-install or credentials embedded in skill instructions.

## Verification
Use official SDK clients for stdio and HTTP initialize, tool listing/calls and resources. Test invalid inputs, arbitrary path rejection, no network-dependent content, pagination/bounds and transport guards. Test Gemini manifest discovery using available native CLI without making model calls. Existing payment/helper/installer checks remain required.
