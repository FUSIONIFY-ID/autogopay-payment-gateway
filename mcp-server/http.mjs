import { createServer as nodeServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.mjs';

export function createHttpServer({allowedHosts=['127.0.0.1','localhost'],allowedOrigins=[]}={}) {
  const hosts=new Set(allowedHosts);const origins=new Set(allowedOrigins);
  return nodeServer(async(req,res)=>{
    if(typeof req.headers.host!=='string' || !/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(req.headers.host)) {res.writeHead(403).end();return;}
    let host;
    try {host=new URL(`http://${req.headers.host}`).hostname;} catch {res.writeHead(403).end();return;}
    if(!hosts.has(host) || (req.headers.origin && !origins.has(req.headers.origin))) {res.writeHead(403).end();return;}
    if(req.url==='/healthz' && req.method==='GET') {res.writeHead(200,{'content-type':'application/json'}).end('{"status":"ok","mode":"public-docs-only"}');return;}
    if(req.url!=='/mcp') {res.writeHead(404).end();return;}
    if(req.method!=='POST') {res.writeHead(405,{'allow':'POST'}).end();return;}
    if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')) {res.writeHead(415).end();return;}
    let size=0;const chunks=[];
    try {
      for await (const chunk of req) {size+=chunk.length;if(size>65536){res.writeHead(413).end();return;}chunks.push(chunk);}
      let body;try {body=JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {res.writeHead(400).end();return;}
      const server=createServer();const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
      res.on('close',()=>{void transport.close();void server.close();});
      await server.connect(transport);await transport.handleRequest(req,res,body);
    } catch {
      if(!res.headersSent)res.writeHead(500,{'content-type':'application/json'}).end('{"error":"MCP request failed"}');
      else res.end();
    }
  });
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const host=process.env.HOST||'127.0.0.1';const port=Number(process.env.PORT||8787);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PORT');
  const publicHost=process.env.MCP_PUBLIC_HOST;
  if(host!=='127.0.0.1'&&!publicHost)throw new Error('Set MCP_PUBLIC_HOST before listening beyond loopback');
  const extraOrigins=(process.env.MCP_ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean);
  for(const origin of extraOrigins){const url=new URL(origin);if(url.protocol!=='https:' || url.origin!==origin)throw new Error('MCP_ALLOWED_ORIGINS must contain exact HTTPS origins');}
  const server=createHttpServer({allowedHosts:publicHost?[publicHost,'localhost','127.0.0.1']:undefined,allowedOrigins:[...(publicHost?[`https://${publicHost}`]:[]),...extraOrigins]});
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.listen(port,host,()=>console.error(`AutoGoPay public-docs MCP listening on port ${port}`));
}
