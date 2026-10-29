import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DOCUMENTS, readDocument, searchDocuments, getChecklist } from '../server.mjs';
import { createHttpServer } from '../http.mjs';
const client=()=>new Client({name:'autogopay-test',version:'1.0.0'});
async function withHttp(run) {
 const server=createHttpServer();server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 try {await run(base);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
test('catalog only exposes known bundled Markdown',()=>{
 assert.equal(DOCUMENTS.length,11);assert.match(readDocument('bca').text,/does not appear in BCA/);
 for(const id of ['../../.env','https://example.com','assets/node/bca.mjs','constructor'])assert.throws(()=>readDocument(id));
});
test('bounded literal search returns reviewed content',()=>{
 assert.ok(searchDocuments('BCA Merchant',2).results.some(r=>r.document==='bca'));
 assert.equal(searchDocuments('never_present_9384892').results.length,0);
 for(const q of ['', ' '.repeat(5), 'x'.repeat(161)])assert.throws(()=>searchDocuments(q));
 assert.throws(()=>searchDocuments('qris',11));
});
test('checklists preserve BCA attribution and OVO authorization limits',()=>{
 assert.match(getChecklist('bca').steps.join(' '),/no webhook/);
 assert.match(getChecklist('ovo').steps.join(' '),/explicit live authorization/);
 assert.throws(()=>getChecklist('unknown'));
});
test('stdio SDK initialize, tools, resource and invalid input round trip',async()=>{
 const c=client();const transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../stdio.mjs',import.meta.url))],stderr:'pipe'});
 try {
  await c.connect(transport);
  const list=await c.listTools();assert.equal(list.tools.length,3);
  for(const tool of list.tools){assert.equal(tool.annotations.readOnlyHint,true);assert.equal(tool.annotations.openWorldHint,false);}
  assert.equal((await c.callTool({name:'read_autogopay_doc',arguments:{document:'bca'}})).structuredContent.document,'bca');
  assert.equal((await c.callTool({name:'search_autogopay_docs',arguments:{query:'pending',limit:2}})).structuredContent.results.length,2);
  assert.equal((await c.callTool({name:'get_autogopay_checklist',arguments:{provider:'bca'}})).structuredContent.provider,'bca');
  assert.equal((await c.callTool({name:'read_autogopay_doc',arguments:{document:'../../.env'}})).isError,true);
  const resources=await c.listResources();assert.equal(resources.resources.length,11);
  assert.match((await c.readResource({uri:'autogopay://docs/webhooks'})).contents[0].text,/raw body/i);
 }finally{await c.close();}
});
test('Streamable HTTP SDK initialize and tool/resource calls',async()=>withHttp(async base=>{
 const c=client();try{
  await c.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp')));
  assert.equal((await c.listTools()).tools.length,3);
  assert.equal((await c.callTool({name:'get_autogopay_checklist',arguments:{provider:'interactive'}})).structuredContent.provider,'interactive');
  assert.match((await c.readResource({uri:'autogopay://docs/bca'})).contents[0].text,/BCA Merchant/);
 }finally{await c.close();}
}));
test('HTTP rejects foreign Origin and Host',async()=>withHttp(async base=>{
 assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:'{}'})).status,403);
 const foreignHost=await new Promise((resolve,reject)=>{const req=request(base+'/mcp',{method:'POST',headers:{host:'evil.example','content-type':'application/json'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end('{}');});
 assert.equal(foreignHost,403);
}));
test('HTTP rejects unsupported paths, methods and malformed input',async()=>withHttp(async base=>{
 assert.equal((await fetch(base+'/missing')).status,404);
 assert.equal((await fetch(base+'/mcp')).status,405);
 assert.equal((await fetch(base+'/mcp',{method:'POST',body:'{}'})).status,415);
 assert.equal((await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:'{'})).status,400);
}));
test('HTTP body limit prevents oversized JSON',async()=>withHttp(async base=>{
 const result=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'x'.repeat(70000)})});assert.equal(result.status,413);
}));
test('health reports public-docs-only scope',async()=>withHttp(async base=>{
 assert.deepEqual(await(await fetch(base+'/healthz')).json(),{status:'ok',mode:'public-docs-only'});
}));
test('config generator uses absolute paths without secrets or shell interpolation',()=>{
 for(const target of ['generic','claude','gemini','cursor','vscode']){
  const r=spawnSync(process.execPath,[fileURLToPath(new URL('../config.mjs',import.meta.url)),target],{encoding:'utf8'});assert.equal(r.status,0);
  const data=JSON.parse(r.stdout);const entry=(data.mcpServers||data.servers).autogopay;
  assert.equal(entry.command,process.execPath);assert.equal(entry.args[0],fileURLToPath(new URL('../stdio.mjs',import.meta.url)));
  assert.equal('env' in entry,false);
 }
});
test('Gemini manifest version and native skill match the distribution',async()=>{
 const root=new URL('../../',import.meta.url);
 const gemini=JSON.parse(await readFile(new URL('gemini-extension.json',root),'utf8'));
 assert.equal(gemini.version,(await readFile(new URL('VERSION',root),'utf8')).trim());
 assert.equal(gemini.name,'autogopay-payment-gateway');assert.equal('mcpServers' in gemini,false);
 assert.match(await readFile(new URL('skills/autogopay-payment-gateway/SKILL.md',root),'utf8'),/name: autogopay-payment-gateway/);
 assert.ok(await readFile(new URL(gemini.contextFileName,root),'utf8'));
});
