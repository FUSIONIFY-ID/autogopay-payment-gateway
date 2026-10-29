import { readFile } from 'node:fs/promises';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
export const VERSION = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).version;
const root = new URL('../skills/autogopay-payment-gateway/', import.meta.url);
export const DOCUMENTS = Object.freeze(['workflow','authentication','api-contracts','webhooks','ovo','shopeepay','interactive','instaqris','bca','updates','examples']);
export const PROVIDERS = Object.freeze(['gopay','shopeepay','interactive','instaqris','bca','ovo']);
const documentPath = id => id === 'workflow' ? 'SKILL.md' : `references/${id}.md`;
const cache = new Map(await Promise.all(DOCUMENTS.map(async id => [id, await readFile(new URL(documentPath(id),root),'utf8')])));
const annotations = {readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false};
const response = data => ({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});
export function readDocument(id) {
  if (!DOCUMENTS.includes(id)) throw new Error('Unknown bundled document');
  return {document:id,version:VERSION,source:'reviewed repository bundle',text:cache.get(id)};
}
export function searchDocuments(query, limit=5) {
  if (typeof query!=='string' || !query.trim() || query.length>160 || !Number.isInteger(limit) || limit<1 || limit>10) throw new Error('Invalid search input');
  const terms=query.toLowerCase().trim().split(/\s+/);
  const results=[];
  for (const [document,text] of cache) {
    const lower=text.toLowerCase();const positions=terms.map(term=>lower.indexOf(term));
    const score=positions.filter(pos=>pos>=0).length;if(!score)continue;
    const start=Math.max(0,Math.min(...positions.filter(pos=>pos>=0))-100);
    results.push({document,score,excerpt:text.slice(start,start+600)});
  }
  results.sort((a,b)=>b.score-a.score || a.document.localeCompare(b.document));
  return {version:VERSION,results:results.slice(0,limit)};
}
export function getChecklist(provider) {
  if(!PROVIDERS.includes(provider))throw new Error('Unknown provider');
  return {provider,version:VERSION,documents:['workflow','authentication',provider==='gopay'?'api-contracts':provider,'webhooks','updates'],steps:[
    'Inspect and preserve the existing backend, authentication, order model and database.',
    'Calculate integer IDR from the trusted server order; configure secrets on the server only.',
    'Persist local order, account/provider identity and returned provider identifiers before confirmation.',
    provider==='bca'?'BCA has no webhook/status API; paginate WIB statements and keep ambiguous amount/time candidates for authorized reconciliation.':provider==='instaqris'?'Establish create-bill to statement mapping before automatic attribution.':provider==='interactive'?'Poll backend status with both IDs; documented success:false/status:pending is non-paid.':provider==='ovo'?'Preview/inquiry first; money-moving execution requires explicit live authorization and a secret PIN.':'Use HMAC-verified raw-body callbacks; resolve ID mapping and match exact account/order/amount.',
    'Commit receipt, conditional paid transition and unique fulfillment outbox atomically.',
    'Run mocked failures, duplicates and races; report live payment verification separately.'
  ],limitations:['This connector supplies integration guidance only. It has no merchant credentials or payment execution tools.','Review provider-specific missing contracts before production automation.']};
}
export function createServer() {
  const server=new McpServer({name:'autogopay-payment-gateway',version:VERSION},{instructions:'Read-only bundled AutoGoPay integration guidance. Use workflow and provider references. No payment execution or credential collection.'});
  server.registerTool('search_autogopay_docs',{description:'Search reviewed bundled AutoGoPay contracts. Returns document identifiers and excerpts.',inputSchema:{query:z.string().trim().min(1).max(160),limit:z.number().int().min(1).max(10).default(5)},annotations},async({query,limit})=>response(searchDocuments(query,limit)));
  server.registerTool('read_autogopay_doc',{description:'Read one allowlisted AutoGoPay contract or workflow. No arbitrary paths or URLs.',inputSchema:{document:z.enum(DOCUMENTS)},annotations},async({document})=>response(readDocument(document)));
  server.registerTool('get_autogopay_checklist',{description:'Get provider-specific implementation steps and unresolved-contract warnings.',inputSchema:{provider:z.enum(PROVIDERS)},annotations},async({provider})=>response(getChecklist(provider)));
  for(const id of DOCUMENTS)server.registerResource(id,`autogopay://docs/${id}`,{description:`Bundled AutoGoPay ${id}`,mimeType:'text/markdown'},async uri=>({contents:[{uri:uri.href,mimeType:'text/markdown',text:readDocument(id).text}]}));
  return server;
}
