"""Local reference implementation; SQLite transactions protect payment effects."""
import json
import sqlite3
from contextlib import contextmanager

class PaymentError(ValueError):
    pass

class PaymentStore:
    def __init__(self, path):
        self.path = str(path)
        with self.connection() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS orders (
              id TEXT PRIMARY KEY, account TEXT NOT NULL, amount INTEGER NOT NULL,
              paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0,1)));
            CREATE TABLE IF NOT EXISTS attempts (
              account TEXT NOT NULL, provider TEXT NOT NULL, transaction_id TEXT NOT NULL,
              provider_order_id TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id),
              amount INTEGER NOT NULL, PRIMARY KEY(account,provider,transaction_id),
              UNIQUE(account,provider,provider_order_id));
            CREATE TABLE IF NOT EXISTS receipts (
              account TEXT NOT NULL, provider TEXT NOT NULL, transaction_id TEXT NOT NULL,
              provider_order_id TEXT NOT NULL, amount INTEGER NOT NULL,
              PRIMARY KEY(account,provider,transaction_id));
            CREATE TABLE IF NOT EXISTS effects (
              order_id TEXT NOT NULL REFERENCES orders(id), kind TEXT NOT NULL,
              payload TEXT NOT NULL, PRIMARY KEY(order_id,kind));
            ''')

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            yield db
        finally:
            db.close()

    def seed_order(self, order_id, account, amount):
        if type(amount) is not int or not 1 <= amount <= 10_000_000:
            raise PaymentError('Invalid integer IDR amount')
        with self.connection() as db:
            db.execute('INSERT INTO orders(id,account,amount) VALUES(?,?,?)',
                       (order_id, account, amount))

    def bind_attempt(self, order_id, account, transaction_id, provider_order_id):
        # Local demo generates IDs, not real gateway requests. Applications must
        # persist a creation intent before a real provider call and serialize it.
        with self.connection() as db:
            try:
                db.execute('BEGIN IMMEDIATE')
                order = db.execute('SELECT * FROM orders WHERE id=? AND account=?',
                                   (order_id, account)).fetchone()
                if not order or order['paid']:
                    raise PaymentError('Order unavailable')
                existing = db.execute('SELECT * FROM attempts WHERE order_id=?',
                                      (order_id,)).fetchone()
                if existing:
                    db.commit()
                    return dict(existing)
                db.execute('INSERT INTO attempts VALUES(?,?,?,?,?,?)',
                           (account,'gopay',transaction_id,provider_order_id,order_id,order['amount']))
                result = db.execute('SELECT * FROM attempts WHERE order_id=?', (order_id,)).fetchone()
                db.commit()
                return dict(result)
            except Exception:
                db.rollback()
                raise

    def apply_paid(self, account, transaction_id, provider_order_id, amount):
        """Call only with authenticated, schema-validated paid evidence."""
        if type(amount) is not int or amount <= 0:
            raise PaymentError('Invalid amount')
        if not all(isinstance(x,str) and x for x in (account,transaction_id,provider_order_id)):
            raise PaymentError('Invalid identifier')
        with self.connection() as db:
            try:
                db.execute('BEGIN IMMEDIATE')
                attempt = db.execute('''SELECT * FROM attempts WHERE account=?
                    AND provider='gopay' AND transaction_id=? AND provider_order_id=?''',
                    (account,transaction_id,provider_order_id)).fetchone()
                if not attempt or attempt['amount'] != amount:
                    raise PaymentError('Unknown payment or amount mismatch')
                order = db.execute('SELECT * FROM orders WHERE id=?', (attempt['order_id'],)).fetchone()
                if order['account'] != account or order['amount'] != amount:
                    raise PaymentError('Order mismatch')
                old = db.execute('''SELECT * FROM receipts WHERE account=?
                    AND provider='gopay' AND transaction_id=?''', (account,transaction_id)).fetchone()
                if old and (old['provider_order_id'] != provider_order_id or old['amount'] != amount):
                    raise PaymentError('Conflicting receipt')
                db.execute('INSERT OR IGNORE INTO receipts VALUES(?,?,?,?,?)',
                           (account,'gopay',transaction_id,provider_order_id,amount))
                changed = db.execute('UPDATE orders SET paid=1 WHERE id=? AND paid=0',
                                     (attempt['order_id'],)).rowcount
                if changed:
                    db.execute('INSERT INTO effects VALUES(?,?,?)',
                               (attempt['order_id'],'fulfill',json.dumps({'order_id':attempt['order_id']})))
                db.commit()
                return {'paid':True,'duplicate':not bool(changed)}
            except Exception:
                db.rollback()
                raise

    def order_state(self, order_id, account):
        with self.connection() as db:
            order = db.execute('SELECT id,amount,paid FROM orders WHERE id=? AND account=?',
                               (order_id,account)).fetchone()
            if not order:
                raise PaymentError('Order not found')
            return dict(order)

    def effect_count(self):
        with self.connection() as db:
            return db.execute('SELECT COUNT(*) FROM effects').fetchone()[0]
