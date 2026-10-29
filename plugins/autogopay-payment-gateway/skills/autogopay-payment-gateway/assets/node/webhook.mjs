import { verifySignature } from './autogopay.mjs';

export class WebhookError extends Error {
  constructor(code) { super(code); this.name='WebhookError'; this.code=code; }
}

// All input is already bounded. Tokenization detects keys/depth; JSON.parse validates grammar.
function parseStrict(text) {
  const value=JSON.parse(text);
  const tokens=text.match(/"(?:\\.|[^"\\])*"|[{}\[\]:,]/gs) || [];
  const scopes=[];
  for(let i=0;i<tokens.length;i++) {
    const token=tokens[i];
    if(token==='{' || token==='[') {
      scopes.push(token==='{'?new Set():null);
      if(scopes.length>64)throw new WebhookError('INVALID_PAYLOAD');
    } else if(token==='}' || token===']')scopes.pop();
    else if(token.startsWith('"') && tokens[i+1]===':') {
      const keys=scopes.at(-1);const key=JSON.parse(token);
      if(!keys || keys.has(key))throw new WebhookError('INVALID_PAYLOAD');
      keys.add(key);
    }
  }
  return value;
}

// Backend-only GoPay projection; this never marks an order paid or invokes an AI/tool.
export function projectGoPayWebhook(rawBody, signature, apiKey) {
  if(!Buffer.isBuffer(rawBody) || rawBody.length>262144)throw new WebhookError('INVALID_PAYLOAD');
  if(!verifySignature(rawBody,signature,apiKey))throw new WebhookError('INVALID_SIGNATURE');
  let payload;
  try {payload=parseStrict(new TextDecoder('utf-8',{fatal:true}).decode(rawBody));}
  catch {throw new WebhookError('INVALID_PAYLOAD');}
  const tx=payload?.transaction;
  if(payload?.event!=='transaction.received' || !tx || Array.isArray(tx) ||
    tx.payment_method!=='QRIS' || tx.status!=='PAID' ||
    !Number.isSafeInteger(tx.amount) || tx.amount<1 || tx.amount>10000000 ||
    !['transaction_id','order_id'].every(k=>typeof tx[k]==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(tx[k])))throw new WebhookError('INVALID_PAYLOAD');
  return Object.freeze({provider:'gopay',transaction_id:tx.transaction_id,order_id:tx.order_id,amount:tx.amount,status:'PAID'});
}
