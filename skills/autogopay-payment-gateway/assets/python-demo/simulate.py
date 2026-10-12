"""Create a mock attempt and deliver the same signed callback twice, loopback only."""
import argparse
import hashlib
import hmac
import json
import os
from urllib.request import Request,urlopen

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8080)
    args=parser.parse_args()
    base=f'http://127.0.0.1:{args.port}'
    token=os.environ.get('DEMO_APP_TOKEN','local-demo-token')
    key=os.environ.get('DEMO_WEBHOOK_KEY','local-demo-signing-key')
    request=Request(base+'/payments',data=json.dumps({'order_id':'demo-order'}).encode(),
                    headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
    with urlopen(request,timeout=5) as response:
        attempt=json.load(response)
    body=json.dumps({'event':'transaction.received','transaction':{
        'transaction_id':attempt['transaction_id'],'order_id':attempt['order_id'],
        'amount':attempt['amount'],'status':'PAID','payment_method':'QRIS'}}).encode()
    signature=hmac.new(key.encode(),body,hashlib.sha256).hexdigest()
    for _ in range(2):
        req=Request(base+'/webhooks/autogopay',data=body,
                    headers={'Content-Type':'application/json','X-Signature':signature})
        with urlopen(req,timeout=5) as response:
            print(json.dumps(json.load(response)))
