import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature, normalizePaid, AutoGoPayClient } from '../skills/autogopay-payment-gateway/assets/node/autogopay.mjs';
const raw=Buffer.from('{"event":"transaction.received"}');
const key='fixture-only-key';
const sig=createHmac('sha256',key).update(raw).digest('hex');
test('valid original bytes',()=>assert.equal(verifySignature(raw,sig,key),true));
test('uppercase signature',()=>assert.equal(verifySignature(raw,sig.toUpperCase(),key),true));
test('changed bytes',()=>assert.equal(verifySignature(Buffer.concat([raw,Buffer.from(' ')]),sig,key),false));
test('invalid/missing signature',()=>{for(const s of [undefined,'','a','x'.repeat(64)]) assert.equal(verifySignature(raw,s,key),false);});
test('wrong key and non-buffer',()=>{assert.equal(verifySignature(raw,sig,'wrong'),false);assert.equal(verifySignature(raw.toString(),sig,key),false);});
test('API success is not paid',()=>assert.equal(normalizePaid('shopeepay',{success:true}),false));
test('distinct provider paid fields',()=>{
 assert.equal(normalizePaid('shopeepay',JSON.parse(readFileSync(new URL('./fixtures/shopeepay-paid-status.json',import.meta.url))).data),true);
 assert.equal(normalizePaid('shopeepay',{status:'success',order_status:1,paid:'true'}),false);
 assert.equal(normalizePaid('gopay',{transaction_status:'settlement'}),true);
 assert.equal(normalizePaid('interactive',JSON.parse(readFileSync(new URL('./fixtures/interactive-paid-status.json',import.meta.url))).data),true);
 assert.equal(normalizePaid('instaqris',{status:'success'}),false);
});
const client=(response)=>new AutoGoPayClient({apiKey:key,fetchImpl:async()=>response});
test('integer bounds before request',async()=>{
 let calls=0;const c=new AutoGoPayClient({apiKey:key,fetchImpl:async()=>{calls++;}});
 for(const amount of [0,-1,1.5,10000001,'10000',true]) await assert.rejects(c.createGoPay(amount));
 assert.equal(calls,0);
});
test('creation uses documented path and blocks redirects',async()=>{
 const c=new AutoGoPayClient({apiKey:key,fetchImpl:async(url,options)=>{
  assert.equal(url,'https://v1-gateway.autogopay.site/qris/generate');
  assert.equal(options.redirect,'error');assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{amount:10000});
  return {ok:true,json:async()=>({success:true,data:{amount:10000,transaction_id:'tx',order_id:'order'}})};
 }}); assert.equal((await c.createGoPay(10000)).transaction_id,'tx');
});
test('history is POST without invented body',async()=>{
 const c=new AutoGoPayClient({apiKey:key,fetchImpl:async(url,options)=>{
  assert.equal(url.endsWith('/transactions'),true);assert.equal(options.method,'POST');assert.equal('body' in options,false);
  return {ok:true,json:async()=>({success:true,data:{transactions:[]}})};
 }});assert.deepEqual(await c.transactions(),{transactions:[]});
});
test('HTTP errors',async()=>assert.rejects(client({ok:false,status:403}).transactions(),/HTTP 403/));
test('API failure',async()=>assert.rejects(client({ok:true,json:async()=>({success:false})}).transactions(),/rejected/));
test('invalid JSON',async()=>assert.rejects(client({ok:true,json:async()=>{throw new Error();}}).transactions(),/invalid JSON/));
test('amount or ID mismatch rejected',async()=>assert.rejects(client({ok:true,json:async()=>({success:true,data:{amount:1,transaction_id:'x',order_id:'y'}})}).createGoPay(10000),/reconcile/));
test('uncertain timeout not retried',async()=>{
 let calls=0;const c=new AutoGoPayClient({apiKey:key,fetchImpl:async()=>{calls++;throw new Error('timeout');}});
 await assert.rejects(c.createGoPay(10000),/timeout/);assert.equal(calls,1);
});
