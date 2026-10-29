import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySignature(rawBody, signature, key) {
  if (!Buffer.isBuffer(rawBody) || typeof key !== 'string' || !key) return false;
  if (typeof signature !== 'string' || !/^[a-f\d]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', key).update(rawBody).digest(), Buffer.from(signature, 'hex'));
}

export function normalizePaid(provider, data) {
  if (!data || typeof data !== 'object') return false;
  if (provider === 'gopay') return data.transaction_status === 'settlement';
  if (provider === 'shopeepay') return data.status === 'success' && data.order_status === 1 && data.paid === true;
  if (provider === 'interactive') return data.status === 'success';
  return false; // BCA/InstaQRIS need verified statement attribution; OVO is outgoing.
}

export class AutoGoPayClient {
  constructor({ apiKey, fetchImpl = globalThis.fetch, timeoutMs = 10000 } = {}) {
    if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Server API key required');
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('Invalid timeout');
    this.key = apiKey;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }
  async request(path, method, body) {
    if (typeof path !== 'string' || !/^\/[a-z][a-z0-9/?=&_.%+-]*$/i.test(path) || path.includes('..') || path.includes('//') || !['GET', 'POST'].includes(method)) throw new Error('Invalid gateway request path/method');
    const response = await this.fetchImpl(`https://v1-gateway.autogopay.site${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs),
      headers: { Authorization: `Bearer ${this.key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    // Do not log provider bodies, tokens, or buyer details in generic errors.
    if (!response.ok) throw new Error(`AutoGoPay HTTP ${response.status}`);
    let payload;
    try { payload = await response.json(); } catch { throw new Error('AutoGoPay returned invalid JSON'); }
    if (!payload || payload.success !== true) throw new Error('AutoGoPay rejected the request');
    return payload.data;
  }
  transactions() { return this.request('/transactions', 'POST'); }
  async createGoPay(amount) {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) throw new Error('Invalid integer IDR amount');
    const data = await this.request('/qris/generate', 'POST', { amount });
    if (!data || typeof data.transaction_id !== 'string' || !data.transaction_id ||
        typeof data.order_id !== 'string' || !data.order_id || data.amount !== amount) {
      throw new Error('AutoGoPay creation identifiers/amount invalid; reconcile before retry');
    }
    return data;
  }
}
// normalizePaid(gopay) expects the creation/history-style field shown in docs.
// The standalone GoPay status envelope is undocumented: verify it before adapting.
// This client has no automatic retries and no outgoing transfer method.
