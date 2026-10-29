import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import handler from '../../api/mcp.js';
import health from '../../api/health.js';

test('serverless adapter supports pre-parsed bodies through SDK protocol',async()=>{
 const previous=process.env.VERCEL_URL;process.env.VERCEL_URL='127.0.0.1';
 const server=createServer(async(req,res)=>{
  if(req.url==='/healthz'){health(req,res);return;}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  if(chunks.length)req.body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  await handler(req,res);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`http://127.0.0.1:${server.address().port}`;
 const client=new Client({name:'serverless-adapter-test',version:'1.0.0'});
 try {
  await client.connect(new StreamableHTTPClientTransport(new URL(url+'/mcp')));
  assert.equal((await client.listTools()).tools.length,3);
  assert.equal((await client.callTool({name:'read_autogopay_doc',arguments:{document:'bca'}})).structuredContent.document,'bca');
  const state=await(await fetch(url+'/healthz')).json();assert.equal(state.status,'ok');assert.equal(state.mode,'public-docs-only');
 }finally{
  await client.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  if(previous===undefined)delete process.env.VERCEL_URL;else process.env.VERCEL_URL=previous;
 }
});
