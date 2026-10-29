import { VERSION, DOCUMENTS } from '../mcp-server/server.mjs';
export default function handler(req,res) {
  res.setHeader('content-type','application/json');
  res.setHeader('cache-control','no-store');
  res.statusCode=200;
  res.end(JSON.stringify({status:'ok',service:'autogopay-payment-gateway',version:VERSION,mode:'public-docs-only',documents:DOCUMENTS.length,endpoint:'/mcp'}));
}
