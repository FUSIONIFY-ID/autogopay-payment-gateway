"""Build reproducible skill and plugin ZIPs, plus checksums, after validation."""
import hashlib
import sys
from pathlib import Path
from zipfile import ZipFile,ZipInfo,ZIP_DEFLATED
from validate_repo import ROOT,SKILL,NAME,validate

def build(source,target,prefix):
    target.parent.mkdir(parents=True,exist_ok=True)
    with ZipFile(target,'w',compression=ZIP_DEFLATED,compresslevel=9) as archive:
        for p in sorted(source.rglob('*')):
            if not p.is_file() or '__pycache__' in p.parts or p.suffix=='.pyc': continue
            info=ZipInfo(prefix+'/'+p.relative_to(source).as_posix(),date_time=(2020,1,1,0,0,0))
            info.create_system=3;info.external_attr=0o100644<<16;info.compress_type=ZIP_DEFLATED
            archive.writestr(info,p.read_bytes(),compress_type=ZIP_DEFLATED,compresslevel=9)
    return hashlib.sha256(target.read_bytes()).hexdigest()

if __name__=='__main__':
    errors=validate()
    if errors: raise SystemExit('\n'.join(errors))
    output=ROOT/'dist'
    sums=[]
    for label,source in [('skill',SKILL),('plugin',ROOT/'plugins'/NAME)]:
        target=output/(label+'.zip')
        first=build(source,target,NAME);second=build(source,target,NAME)
        if first!=second: raise SystemExit('Packaging is not reproducible')
        sums.append(first+'  '+target.name)
    (output/'SHA256SUMS').write_text('\n'.join(sums)+'\n')
    print('Reproducible skill/plugin packaging PASS')
