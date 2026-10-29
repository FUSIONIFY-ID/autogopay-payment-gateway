import { createHttpHandler } from '../mcp-server/http.mjs';
// Trust the deployment hostname injected by Vercel, not forwarded client headers.
export default async function handler(req,res) {
  const domains=[process.env.VERCEL_URL,process.env.VERCEL_PROJECT_PRODUCTION_URL,process.env.MCP_PUBLIC_HOST].filter(Boolean);
  const extras=(process.env.MCP_ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
  const serve=createHttpHandler({allowedHosts:domains,allowedOrigins:[...domains.map(host=>`https://${host}`),...extras]});
  req.url='/mcp';
  return serve(req,res);
}
