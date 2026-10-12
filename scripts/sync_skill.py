"""Synchronize the portable plugin copy; --check makes no changes."""
import argparse
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NAME='autogopay-payment-gateway'
SOURCE=ROOT/'skills'/NAME
TARGET=ROOT/'plugins'/NAME/'skills'/NAME

def files(path):
    return {p.relative_to(path).as_posix():p.read_bytes() for p in path.rglob('*')
            if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc'}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.check:
        if files(SOURCE)!=files(TARGET): raise SystemExit('Plugin copy is out of sync; run python scripts/sync_skill.py')
        print('Plugin synchronization PASS')
    else:
        if TARGET.exists(): shutil.rmtree(TARGET)
        TARGET.parent.mkdir(parents=True,exist_ok=True)
        shutil.copytree(SOURCE,TARGET,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
        print('Plugin skill synchronized')
if __name__=='__main__': main()
