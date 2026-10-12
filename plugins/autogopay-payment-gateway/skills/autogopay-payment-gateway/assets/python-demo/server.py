"""Loopback-only mock GoPay checkout + signed callback, with durable SQLite state.
This never calls the real AutoGoPay API. It is not a production web server.
"""
import argparse
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from uuid import uuid4
from payment_store import PaymentStore, PaymentError
from webhook import ingest, InvalidSignature, InvalidPayload

MAX_BODY = 262144

def build_server(store, token, key, port=8080):
    if not token or not key:
        raise ValueError('Demo token and signing key are required')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):
            pass  # Avoid accidental body/header logging.
        def reply(self,status,body):
            raw=json.dumps(body).encode()
            self.send_response(status)
            self.send_header('Content-Type','application/json')
            self.send_header('Content-Length',str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        def authorized(self):
            import hmac
            supplied=self.headers.get('Authorization','')
            return hmac.compare_digest(supplied.encode(), ('Bearer '+token).encode())
        def body(self):
            if self.headers.get('Transfer-Encoding'):
                raise InvalidPayload('Transfer encoding unsupported by demo')
            size=self.headers.get('Content-Length','0')
            if not size.isdigit() or int(size)>MAX_BODY:
                raise InvalidPayload('Body size invalid')
            raw=self.rfile.read(int(size))
            if len(raw)!=int(size):
                raise InvalidPayload('Incomplete body')
            return raw
        def do_GET(self):
            parts=urlsplit(self.path)
            if parts.path=='/health':
                return self.reply(200,{'mode':'mock','live_payments':False})
            if parts.path!='/orders/status':
                return self.reply(404,{'error':'Not found'})
            if not self.authorized():
                return self.reply(401,{'error':'Unauthorized'})
            try:
                order=parse_qs(parts.query).get('order_id',[''])[0]
                self.reply(200,store.order_state(order,'demo-account'))
            except PaymentError:
                self.reply(404,{'error':'Order not found'})
        def do_POST(self):
            path=urlsplit(self.path).path
            if path not in ('/payments','/webhooks/autogopay'):
                return self.reply(404,{'error':'Not found'})
            if path=='/payments' and not self.authorized():
                return self.reply(401,{'error':'Unauthorized'})
            if self.headers.get_content_type()!='application/json':
                return self.reply(415,{'error':'JSON required'})
            try:
                raw=self.body()
                if path=='/webhooks/autogopay':
                    result=ingest(raw,self.headers.get('X-Signature',''),key,'demo-account',store)
                    return self.reply(200,{'success':True,**result})
                payload=json.loads(raw)
                if not isinstance(payload,dict) or not isinstance(payload.get('order_id'),str):
                    raise InvalidPayload('order_id string required')
                # Ignore customer amount: read the order amount from the database.
                attempt=store.bind_attempt(payload['order_id'],'demo-account','mock-'+uuid4().hex,'mock-order-'+uuid4().hex)
                self.reply(201,{'mode':'mock','transaction_id':attempt['transaction_id'],
                    'order_id':attempt['provider_order_id'],'amount':attempt['amount'],
                    'local_order_id':attempt['order_id'],'status':'pending'})
            except InvalidSignature:
                self.reply(401,{'error':'Invalid signature'})
            except (InvalidPayload,json.JSONDecodeError,UnicodeDecodeError):
                self.reply(400,{'error':'Invalid payload'})
            except PaymentError:
                self.reply(409,{'error':'Payment does not match an available order'})
            except sqlite3.Error:
                self.reply(503,{'error':'Storage unavailable'})
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    server.daemon_threads=True
    return server

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8080)
    parser.add_argument('--db',default='demo.sqlite3')
    args=parser.parse_args()
    token=os.environ.get('DEMO_APP_TOKEN','local-demo-token')
    key=os.environ.get('DEMO_WEBHOOK_KEY','local-demo-signing-key')
    store=PaymentStore(Path(args.db))
    try:
        store.seed_order('demo-order','demo-account',10000)
    except sqlite3.IntegrityError:
        pass
    server=build_server(store,token,key,args.port)
    print(f'Mock-only demo: http://127.0.0.1:{server.server_port}; order=demo-order',flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
