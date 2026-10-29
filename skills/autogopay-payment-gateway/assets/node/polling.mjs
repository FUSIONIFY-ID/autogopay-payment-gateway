// Provider's documented GoPay/ShopeePay monitoring schedule. Does not start a poller.
export function providerPollDelay(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid elapsed time');
  if (elapsedMs >= 900000) return null;
  return elapsedMs < 120000 ? 3000 : elapsedMs < 300000 ? 5000 : 10000;
}

// Classify the COMPLETE Interactive envelope, not a guessed data-only status.
// A paid indicator is still subject to atomic receipt/order/account matching downstream.
export function classifyInteractive(payload, { invoiceId, refNo, amount } = {}) {
  if (typeof invoiceId !== 'string' || !invoiceId || typeof refNo !== 'string' || !refNo ||
      !Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) throw new Error('Invalid expected Interactive attempt');
  const data = payload?.data;
  if (!data || data.invoice_id !== invoiceId || data.ref_no !== refNo) return 'unresolved';
  if (payload.success === false && data.status === 'pending') return 'pending';
  if (payload.success === true && data.status === 'success' && data.amount === amount) return 'paid';
  return 'unresolved';
}
