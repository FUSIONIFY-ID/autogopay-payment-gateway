"""Build an offline skill bundle and integrity manifest for the VS Code extension."""
import hashlib
import json
import shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'skills/autogopay-payment-gateway'
TARGET=ROOT/'vscode-extension/skill-bundle'
if __name__=='__main__':
    if TARGET.exists(): shutil.rmtree(TARGET)
    shutil.copytree(SOURCE,TARGET,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    files=[{'path':p.relative_to(TARGET).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
           for p in sorted(TARGET.rglob('*')) if p.is_file()]
    (TARGET/'bundle-manifest.json').write_text(json.dumps({'name':'autogopay-payment-gateway','version':(ROOT/'VERSION').read_text().strip(),'files':files},indent=2)+'\n')
    print('VS Code offline skill bundle synchronized')
