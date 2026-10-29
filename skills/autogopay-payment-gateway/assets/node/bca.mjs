import { AutoGoPayClient } from './autogopay.mjs';

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validPage(value) { return Number.isSafeInteger(value) && value >= 1; }
function qrURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'v1-gateway.autogopay.site' &&
      !url.username && !url.password && !url.port;
  } catch { return false; }
}

// Backend-only helper. No retry, payout, order attribution or live calls at import time.
export class BCAMerchantClient extends AutoGoPayClient {
  async createBCA(amount) {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) throw new Error('Invalid integer IDR amount');
    const data = await this.request('/bca/qris/create', 'POST', { amount });
    if (!data || typeof data.transaction_id !== 'string' || !data.transaction_id.trim() ||
        data.amount !== amount || typeof data.qr_string !== 'string' || !data.qr_string.trim() ||
        !qrURL(data.qr_url) || typeof data.transaction_time !== 'string' || !data.transaction_time.trim() ||
        typeof data.expiry_time !== 'string' || !data.expiry_time.trim()) {
      throw new Error('AutoGoPay BCA creation invalid; reconcile before retry');
    }
    // Explicit projection excludes arbitrary provider messages from customer-facing checkout data.
    const { transaction_id, qr_string, qr_url, transaction_time, expiry_time } = data;
    return { transaction_id, amount, qr_string, qr_url, transaction_time, expiry_time };
  }
  async bcaTransactions({ date, page = 1 } = {}) {
    // Require an explicit date here to make the worker's WIB day choice deliberate.
    if (!validDate(date) || !validPage(page)) throw new Error('Invalid BCA date/page');
    const query = new URLSearchParams({ date, page: String(page) });
    const data = await this.request(`/bca/transactions?${query}`, 'GET');
    if (!data || data.date !== date || data.page !== page || !Array.isArray(data.transactions) ||
        data.transactions.length > 50 || data.transactions.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error('Invalid BCA statement envelope');
    }
    // Rows are opaque untrusted provider data. Never pass their text into AI instructions.
    return { date, page, transactions: data.transactions };
  }
}

export async function collectBCAStatements(client, { date, maxPages = 20, deadlineMs = 30000, now = Date.now } = {}) {
  if (!validDate(date) || !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 1000 ||
      !Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || typeof now !== 'function') throw new Error('Invalid BCA scan bounds');
  const started = now();
  const rows = [];
  const seenPages = new Set();
  for (let page = 1; page <= maxPages; page++) {
    if (now() - started >= deadlineMs) throw new Error('BCA scan deadline reached; incomplete');
    const result = await client.bcaTransactions({ date, page });
    if (now() - started >= deadlineMs) throw new Error('BCA scan deadline reached; incomplete');
    // The client validates the envelope; duplicate pages indicate an incomplete scan.
    const fingerprint = JSON.stringify(result.transactions);
    if (result.transactions.length && seenPages.has(fingerprint)) throw new Error('BCA repeated page; incomplete');
    seenPages.add(fingerprint);
    rows.push(...result.transactions);
    if (result.transactions.length < 50) return { date, pages: page, transactions: rows };
  }
  throw new Error('BCA page bound reached; incomplete');
}
