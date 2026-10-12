"""Verify original bytes before parsing or mutating payment state."""
import hashlib
import hmac
import json
import re

class InvalidSignature(ValueError):
    pass

class InvalidPayload(ValueError):
    pass

def verify_signature(raw, signature, key):
    if not isinstance(raw, bytes) or not isinstance(key,str) or not key:
        return False
    if not isinstance(signature,str) or not re.fullmatch(r'[0-9a-fA-F]{64}',signature):
        return False
    expected = hmac.new(key.encode(), raw, hashlib.sha256).digest()
    return hmac.compare_digest(expected, bytes.fromhex(signature))

def _unique_object(pairs):
    result = {}
    for key,value in pairs:
        if key in result:
            raise InvalidPayload('Duplicate JSON field')
        result[key] = value
    return result

def ingest(raw, signature, key, account, store):
    if not verify_signature(raw,signature,key):
        raise InvalidSignature('Invalid signature')
    try:
        payload = json.loads(raw, object_pairs_hook=_unique_object,
                             parse_constant=lambda _: (_ for _ in ()).throw(InvalidPayload('Invalid JSON constant')))
    except (ValueError,UnicodeDecodeError) as exc:
        raise InvalidPayload('Invalid JSON') from exc
    if not isinstance(payload,dict) or payload.get('event') != 'transaction.received':
        raise InvalidPayload('Unsupported event')
    tx = payload.get('transaction')
    if not isinstance(tx,dict) or tx.get('payment_method') != 'QRIS' or tx.get('status') != 'PAID':
        raise InvalidPayload('Unsupported provider or unpaid event')
    if type(tx.get('amount')) is not int or not 1 <= tx['amount'] <= 10_000_000:
        raise InvalidPayload('Invalid integer amount')
    if not all(isinstance(tx.get(k),str) and tx[k] for k in ('transaction_id','order_id')):
        raise InvalidPayload('Missing identifiers')
    return store.apply_paid(account,tx['transaction_id'],tx['order_id'],tx['amount'])
