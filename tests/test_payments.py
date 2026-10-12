import concurrent.futures
import hashlib
import hmac
import json
import sqlite3
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'skills/autogopay-payment-gateway/assets/python-demo'))
from payment_store import PaymentStore, PaymentError
from webhook import verify_signature, ingest, InvalidSignature, InvalidPayload
from server import build_server

KEY='fixture-only-secret'
def raw_event(**changes):
    tx=json.loads((ROOT/'tests/fixtures/gopay-paid.json').read_text())['transaction']
    tx.update(changes)
    return json.dumps({'event':'transaction.received','transaction':tx}).encode()
def sign(raw,key=KEY):
    return hmac.new(key.encode(),raw,hashlib.sha256).hexdigest()

class Payments(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.store=PaymentStore(Path(self.tmp.name)/'payments.sqlite3')
        self.store.seed_order('order-1','merchant-a',10000)
        self.store.bind_attempt('order-1','merchant-a','tx-1','provider-order-1')
    def tearDown(self): self.tmp.cleanup()
    def ingest(self,raw): return ingest(raw,sign(raw),KEY,'merchant-a',self.store)
    def test_signature_valid(self): self.assertTrue(verify_signature(raw_event(),sign(raw_event()),KEY))
    def test_signature_uppercase(self): self.assertTrue(verify_signature(raw_event(),sign(raw_event()).upper(),KEY))
    def test_raw_body_changed(self): self.assertFalse(verify_signature(raw_event()+b' ',sign(raw_event()),KEY))
    def test_wrong_key(self): self.assertFalse(verify_signature(raw_event(),sign(raw_event()),'other'))
    def test_missing_signature(self): self.assertFalse(verify_signature(raw_event(),None,KEY))
    def test_signature_length(self): self.assertFalse(verify_signature(raw_event(),'aa',KEY))
    def test_signature_nonhex(self): self.assertFalse(verify_signature(raw_event(),'z'*64,KEY))
    def test_raw_body_required(self): self.assertFalse(verify_signature('{}','a'*64,KEY))
    def test_key_required(self): self.assertFalse(verify_signature(raw_event(),sign(raw_event()),''))
    def test_invalid_signature_no_mutation(self):
        with self.assertRaises(InvalidSignature): ingest(raw_event(),'a'*64,KEY,'merchant-a',self.store)
        self.assertEqual(self.store.effect_count(),0)
    def test_paid_then_duplicate(self):
        self.assertFalse(self.ingest(raw_event())['duplicate'])
        self.assertTrue(self.ingest(raw_event())['duplicate'])
        self.assertEqual(self.store.effect_count(),1)
    def test_reopen_database_keeps_duplicate_protection(self):
        self.ingest(raw_event())
        reopened=PaymentStore(self.store.path)
        self.assertTrue(ingest(raw_event(),sign(raw_event()),KEY,'merchant-a',reopened)['duplicate'])
        self.assertEqual(reopened.effect_count(),1)
    def test_wrong_amount(self):
        with self.assertRaises(PaymentError): self.ingest(raw_event(amount=9999))
        self.assertEqual(self.store.effect_count(),0)
    def test_unknown_transaction(self):
        with self.assertRaises(PaymentError): self.ingest(raw_event(transaction_id='unknown'))
    def test_wrong_account(self):
        with self.assertRaises(PaymentError): ingest(raw_event(),sign(raw_event()),KEY,'merchant-b',self.store)
    def test_wrong_order(self):
        with self.assertRaises(PaymentError): self.ingest(raw_event(order_id='other'))
    def test_boolean_amount(self):
        with self.assertRaises(InvalidPayload): self.ingest(raw_event(amount=True))
    def test_pending_never_fulfills(self):
        with self.assertRaises(InvalidPayload): self.ingest(raw_event(status='pending'))
        self.assertEqual(self.store.effect_count(),0)
    def test_other_provider_not_guessed(self):
        with self.assertRaises(InvalidPayload): self.ingest(raw_event(payment_method='QRIS_SHOPEEPAY'))
    def test_signed_invalid_json(self):
        with self.assertRaises(InvalidPayload): self.ingest(b'{')
    def test_duplicate_json_fields(self):
        with self.assertRaises(InvalidPayload): self.ingest(b'{"event":"x","event":"transaction.received"}')
    def test_concurrent_callbacks_and_status_evidence(self):
        barrier=threading.Barrier(24)
        def worker(i):
            barrier.wait(timeout=10)
            if i%2: return self.store.apply_paid('merchant-a','tx-1','provider-order-1',10000)
            return self.ingest(raw_event())
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            results=list(pool.map(worker,range(24)))
        self.assertEqual(sum(not r['duplicate'] for r in results),1)
        self.assertEqual(self.store.effect_count(),1)
    def test_atomic_rollback_on_effect_failure(self):
        with self.store.connection() as db:
            db.execute("CREATE TRIGGER fail_effect BEFORE INSERT ON effects BEGIN SELECT RAISE(ABORT,'fixture failure'); END")
        with self.assertRaises(sqlite3.Error): self.ingest(raw_event())
        self.assertFalse(self.store.order_state('order-1','merchant-a')['paid'])
        with self.store.connection() as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM receipts').fetchone()[0],0)
    def test_repeated_creation_returns_same_attempt(self):
        attempt=self.store.bind_attempt('order-1','merchant-a','another-tx','another-provider-order')
        self.assertEqual(attempt['transaction_id'],'tx-1')
    def test_already_paid_does_not_create_attempt(self):
        self.ingest(raw_event())
        with self.assertRaises(PaymentError): self.store.bind_attempt('order-1','merchant-a','new','new')

class HTTPDemo(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.store=PaymentStore(Path(self.tmp.name)/'http.sqlite3')
        self.store.seed_order('demo-order','demo-account',10000)
        self.server=build_server(self.store,'app-token',KEY,0)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.base='http://127.0.0.1:'+str(self.server.server_port)
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(); self.tmp.cleanup()
    def request(self,path,body=None,headers=None):
        req=Request(self.base+path,data=body,headers=headers or {})
        try:
            with urlopen(req,timeout=5) as response: return response.status,json.load(response)
        except HTTPError as response: return response.code,json.load(response)
    def create(self):
        status,attempt=self.request('/payments',json.dumps({'order_id':'demo-order','amount':1}).encode(),
            {'Authorization':'Bearer app-token','Content-Type':'application/json'})
        self.assertEqual(status,201); self.assertEqual(attempt['amount'],10000)
        return attempt
    def test_health_is_mock(self): self.assertEqual(self.request('/health')[1]['mode'],'mock')
    def test_create_requires_auth(self): self.assertEqual(self.request('/payments',b'{}')[0],401)
    def test_status_requires_auth(self): self.assertEqual(self.request('/orders/status?order_id=demo-order')[0],401)
    def test_amount_comes_from_order(self): self.create()
    def test_full_signed_http_duplicate(self):
        attempt=self.create()
        raw=raw_event(transaction_id=attempt['transaction_id'],order_id=attempt['order_id'])
        headers={'Content-Type':'application/json','X-Signature':sign(raw)}
        first=self.request('/webhooks/autogopay',raw,headers)
        second=self.request('/webhooks/autogopay',raw,headers)
        self.assertEqual(first[0],200); self.assertFalse(first[1]['duplicate'])
        self.assertTrue(second[1]['duplicate']); self.assertEqual(self.store.effect_count(),1)
    def test_no_bearer_needed_for_signed_webhook(self): self.test_full_signed_http_duplicate()
    def test_invalid_signature_http(self):
        self.assertEqual(self.request('/webhooks/autogopay',raw_event(),{'Content-Type':'application/json','X-Signature':'bad'})[0],401)
        self.assertEqual(self.store.effect_count(),0)
    def test_body_limit(self):
        self.assertEqual(self.request('/webhooks/autogopay',b' '*262145,{'Content-Type':'application/json'})[0],400)

if __name__=='__main__': unittest.main()
