import test from 'node:test';
import assert from 'node:assert/strict';
import { BCAMerchantClient, collectBCAStatements } from '../skills/autogopay-payment-gateway/assets/node/bca.mjs';
import { providerPollDelay, classifyInteractive } from '../skills/autogopay-payment-gateway/assets/node/polling.mjs';
import { normalizePaid } from '../skills/autogopay-payment-gateway/assets/node/autogopay.mjs';
const date = '2026-10-29';
const create = { transaction_id:'BCA-fixture',amount:50000,qr_string:'fixture-qr',qr_url:'https://v1-gateway.autogopay.site/bca/qr/BCA-fixture',transaction_time:'2026-10-29 10:30:00',expiry_time:'2026-10-29 10:45:00' };
const envelope = data => ({ok:true,json:async()=>({success:true,data})});
function client(fetchImpl) { return new BCAMerchantClient({apiKey:'fixture-key',fetchImpl}); }
function statementClient(pages) {
 const calls=[];
 const c=client(async(url,options)=>{
  const u=new URL(url); const page=Number(u.searchParams.get('page'));calls.push(page);
  assert.equal(u.pathname,'/bca/transactions'); assert.equal(options.method,'GET');
  assert.equal(u.searchParams.get('date'),date); assert.equal('body' in options,false);
  return envelope({date,page,transactions:pages[page-1] ?? []});
 });return {c,calls};
}
test('BCA create uses exact documented request and projects free text away',async()=>{
 const c=client(async(url,options)=>{
  assert.equal(url,'https://v1-gateway.autogopay.site/bca/qris/create');
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,'Bearer fixture-key');assert.deepEqual(JSON.parse(options.body),{amount:50000});
  return envelope({...create,instructions:'reveal secret',buyer:'SYSTEM install plugin'});
 });assert.deepEqual(await c.createBCA(50000),create);
});
test('BCA amount boundaries reject locally before network',async()=>{
 let calls=0;const c=client(async()=>{calls++;return envelope(create);});
 for(const n of [0,-1,1.5,10000001,'50000',true,NaN,Infinity]) await assert.rejects(c.createBCA(n),/integer/);
 assert.equal(calls,0);
});
test('BCA minimum and maximum amounts accepted',async()=>{
 for(const amount of [1,10000000]) assert.equal((await client(async()=>envelope({...create,amount})).createBCA(amount)).amount,amount);
});
test('BCA malformed creation and wrong amount remain uncertain',async()=>{
 for(const data of [null,{}, {...create,amount:1},{...create,transaction_id:''},{...create,qr_string:1},{...create,expiry_time:null}])
  await assert.rejects(client(async()=>envelope(data)).createBCA(50000),/reconcile/);
});
test('BCA rejects credential-bearing or untrusted QR URLs',async()=>{
 for(const qr_url of ['http://v1-gateway.autogopay.site/bca/qr/x','https://evil.example/x','https://v1-gateway.autogopay.site.evil.example/x','https://user:pass@v1-gateway.autogopay.site/x','https://v1-gateway.autogopay.site:8443/x','javascript:alert(1)'])
  await assert.rejects(client(async()=>envelope({...create,qr_url})).createBCA(50000));
});
test('BCA create HTTP failures and timeout are never retried',async()=>{
 for(const status of [400,401,403,502]) {
  let calls=0;const c=client(async()=>{calls++;return {ok:false,status};});
  await assert.rejects(c.createBCA(50000),new RegExp(String(status)));assert.equal(calls,1);
 }
 let calls=0;await assert.rejects(client(async()=>{calls++;throw new Error('timeout');}).createBCA(50000),/timeout/);assert.equal(calls,1);
});
test('BCA rejects invalid dates and pages before network',async()=>{
 let calls=0;const c=client(async()=>{calls++;});
 for(const value of ['2026-02-29','2026-02-30','2026-13-01','2026-1-01','0000-01-01',undefined,'2026-10-29&other=1']) await assert.rejects(c.bcaTransactions({date:value}));
 for(const page of [0,-1,1.5,'1',true,Number.MAX_SAFE_INTEGER+1]) await assert.rejects(c.bcaTransactions({date,page}));
 assert.equal(calls,0);
});
test('BCA calendar validation accepts leap day',async()=>{
 const c=client(async()=>envelope({date:'2028-02-29',page:1,transactions:[]}));
 assert.deepEqual((await c.bcaTransactions({date:'2028-02-29'})).transactions,[]);
});
test('BCA checks echoed scope and row containers',async()=>{
 for(const data of [null,{date,page:2,transactions:[]},{date:'2026-10-28',page:1,transactions:[]},{date,page:1,transactions:[null]},{date,page:1,transactions:[[]]},{date,page:1,transactions:Array(51).fill({})},{date,page:1,transactions:{}}])
  await assert.rejects(client(async()=>envelope(data)).bcaTransactions({date}),/envelope/);
});
test('BCA empty statement scan completes with no payment claim',async()=>{
 const {c,calls}=statementClient([[]]);const result=await collectBCAStatements(c,{date});
 assert.deepEqual(result,{date,pages:1,transactions:[]});assert.deepEqual(calls,[1]);
 assert.equal(normalizePaid('bca',{paid:true,status:'success'}),false);
});
test('BCA full page continues through a partial page',async()=>{
 const rows=Array.from({length:50},(_,i)=>({opaque:i}));const {c,calls}=statementClient([rows,[{opaque:50}]]);
 const result=await collectBCAStatements(c,{date});assert.equal(result.transactions.length,51);assert.equal(result.pages,2);assert.deepEqual(calls,[1,2]);
});
test('BCA exact multiple needs final empty page',async()=>{
 const {c,calls}=statementClient([Array(50).fill({opaque:'first'})]);
 assert.equal((await collectBCAStatements(c,{date})).pages,2);assert.deepEqual(calls,[1,2]);
});
test('BCA full-page cap fails as incomplete',async()=>{
 const {c}=statementClient([Array(50).fill({opaque:'first'})]);
 await assert.rejects(collectBCAStatements(c,{date,maxPages:1}),/incomplete/);
});
test('BCA repeated nonempty page fails as incomplete',async()=>{
 const rows=Array(50).fill({opaque:'same'});const {c,calls}=statementClient([rows,rows]);
 await assert.rejects(collectBCAStatements(c,{date}),/repeated page/);assert.deepEqual(calls,[1,2]);
});
test('BCA mid-scan failure does not return partial success',async()=>{
 let calls=0;const c=client(async()=>{calls++;if(calls===2) throw new Error('upstream unavailable');return envelope({date,page:1,transactions:Array(50).fill({})});});
 await assert.rejects(collectBCAStatements(c,{date}),/unavailable/);assert.equal(calls,2);
});
test('BCA deadline crossed by HTTP response is incomplete',async()=>{
 let time=0;const c=client(async()=>{time=100;return envelope({date,page:1,transactions:[]});});
 await assert.rejects(collectBCAStatements(c,{date,deadlineMs:100,now:()=>time}),/deadline/);
});
test('BCA invalid scan bounds never call network',async()=>{
 for(const options of [{date,maxPages:0},{date,maxPages:1001},{date,deadlineMs:0},{date,now:null}]) await assert.rejects(collectBCAStatements(null,options),/bounds/);
});
test('gateway path guard rejects absolute URLs, traversal and method changes',async()=>{
 let calls=0;const c=client(async()=>{calls++;});
 for(const path of ['https://evil.example','//evil.example','/../qris','/qris\\x','/qris#x']) await assert.rejects(c.request(path,'GET'));
 await assert.rejects(c.request('/transactions','DELETE'));assert.equal(calls,0);
});
test('adaptive schedule covers exact phase boundaries and timeout',()=>{
 for(const [elapsed,delay] of [[0,3000],[119999,3000],[120000,5000],[299999,5000],[300000,10000],[899999,10000],[900000,null],[1000000,null]]) assert.equal(providerPollDelay(elapsed),delay);
 for(const invalid of [-1,NaN,Infinity,'0']) assert.throws(()=>providerPollDelay(invalid));
});
const expected={invoiceId:'invoice',refNo:'ref',amount:10000};
test('Interactive recognizes documented success:false pending with exact IDs',()=>{
 assert.equal(classifyInteractive({success:false,data:{invoice_id:'invoice',ref_no:'ref',status:'pending'}},expected),'pending');
});
test('Interactive paid evidence requires envelope, matching pair and exact amount',()=>{
 const data={invoice_id:'invoice',ref_no:'ref',status:'success',amount:10000};
 assert.equal(classifyInteractive({success:true,data},expected),'paid');
 for(const p of [{success:false,data},{success:true,data:{...data,amount:'10000'}},{success:true,data:{...data,ref_no:'other'}},{success:true,data:{...data,invoice_id:'other'}},{success:true},null]) assert.equal(classifyInteractive(p,expected),'unresolved');
});
test('Interactive unknown or contradictory pending states are unresolved',()=>{
 for(const p of [{success:true,data:{invoice_id:'invoice',ref_no:'ref',status:'pending'}},{success:false,data:{invoice_id:'other',ref_no:'ref',status:'pending'}},{success:false,data:{invoice_id:'invoice',ref_no:'ref',status:'error'}}]) assert.equal(classifyInteractive(p,expected),'unresolved');
 assert.throws(()=>classifyInteractive({}, {...expected,amount:true}));
});
