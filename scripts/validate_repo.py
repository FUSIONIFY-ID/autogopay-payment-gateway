"""Validate paths, metadata, links, credentials, and synchronized distributions."""
import json
import re
import sys
from pathlib import Path
from sync_skill import files
ROOT=Path(__file__).resolve().parents[1]
NAME='autogopay-payment-gateway'
SKILL=ROOT/'skills'/NAME
VERSION=(ROOT/'VERSION').read_text().strip()

def validate():
    errors=[]
    required=['README.md','VERSION','CHANGELOG.md','CONTRIBUTING.md','docs/examples.md',
      'docs/compatibility.md','docs/testing.md','evals/cases.json',
      '.github/workflows/validate.yml','.agents/plugins/marketplace.json','.claude-plugin/marketplace.json']
    for path in required:
        if not (ROOT/path).is_file(): errors.append('Missing '+path)
    text=(SKILL/'SKILL.md').read_text()
    match=re.match(r'\A---\n(.*?)\n---\n',text,re.S)
    if not match: errors.append('SKILL.md frontmatter missing')
    else:
        pairs=[line.split(':',1) for line in match[1].splitlines() if line.strip()]
        if any(len(p)!=2 for p in pairs): errors.append('Invalid frontmatter field')
        else:
            front={k.strip():v.strip() for k,v in pairs}
            if set(front)!={'name','description'} or len(front)!=len(pairs): errors.append('Frontmatter must contain unique name/description fields')
            if front.get('name')!=NAME: errors.append('Skill name mismatch')
            if not front.get('description') or len(front.get('description',''))>1024: errors.append('Invalid skill description')
    if len(text.splitlines())>=500: errors.append('SKILL.md must stay under 500 lines')
    for ref in (SKILL/'references').glob('*.md'):
        if f'references/{ref.name}' not in text: errors.append('Reference not linked in SKILL.md: '+ref.name)
        if len(ref.read_text().splitlines())>100 and '## Contents' not in ref.read_text(): errors.append('Long reference needs contents: '+ref.name)
    for p in ROOT.rglob('*'):
        if not p.is_file() or any(x in p.parts for x in ('.git','dist','__pycache__','node_modules')): continue
        if p.suffix in ('.pyc','.sqlite3','.db','.zip','.vsix','.png'): continue
        if p.name.startswith('.env') and p.name!='.env.example': errors.append('Populated env file: '+str(p.relative_to(ROOT)))
        try: value=p.read_text()
        except UnicodeDecodeError: continue
        patterns=[r'agp_[a-fA-F0-9]{32,}',r'gh[pousr]_[A-Za-z0-9]{30,}',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----']
        for pattern in patterns:
            if re.search(pattern,value): errors.append('Possible credential in '+str(p.relative_to(ROOT)))
        if p.suffix=='.md':
            # Ignore executable/code examples, validate prose links.
            prose=re.sub(r'```.*?```','',value,flags=re.S)
            for target in re.findall(r'\]\(([^)]+)\)',prose):
                dest=target.split('#',1)[0]
                if not dest or '://' in dest or dest.startswith('mailto:'): continue
                resolved=(p.parent/dest).resolve()
                if not resolved.is_relative_to(ROOT.resolve()) or not resolved.exists(): errors.append('Broken/outside link '+str(p.relative_to(ROOT))+': '+target)
    for kind,path in [('codex','.agents/plugins/marketplace.json'),('claude','.claude-plugin/marketplace.json')]:
        try:
            data=json.loads((ROOT/path).read_text())
            if data['name']!='fusionify-autogopay' or len(data['plugins'])!=1: errors.append('Marketplace metadata mismatch: '+path)
            entry=data['plugins'][0]
            source=entry['source']['path'] if kind=='codex' else entry['source']
            if entry['name']!=NAME or source!='./plugins/'+NAME: errors.append('Marketplace source mismatch: '+path)
            if kind=='claude' and not data['owner']['name']: errors.append('Claude marketplace owner missing')
        except (ValueError,KeyError,IndexError,FileNotFoundError): errors.append('Invalid marketplace: '+path)
    for sub in ('plugin.json','.codex-plugin/plugin.json','.claude-plugin/plugin.json'):
        try:
            manifest=json.loads((ROOT/'plugins'/NAME/sub).read_text())
            if manifest['name']!=NAME or manifest['version']!=VERSION: errors.append('Plugin version/name mismatch: '+sub)
        except (ValueError,KeyError,FileNotFoundError): errors.append('Invalid manifest: '+sub)
    if files(SKILL)!=files(ROOT/'plugins'/NAME/'skills'/NAME): errors.append('Plugin distribution is out of sync')
    for manifest_path in ('gemini-extension.json','mcp-server/package.json'):
        try:
            metadata=json.loads((ROOT/manifest_path).read_text())
            if metadata['version']!=VERSION: errors.append('Distribution version mismatch: '+manifest_path)
        except (ValueError,KeyError,FileNotFoundError): errors.append('Invalid manifest: '+manifest_path)
    extension=ROOT/'vscode-extension'
    if extension.exists():
        try:
            manifest=json.loads((extension/'package.json').read_text())
            if manifest['version']!=VERSION: errors.append('Extension version mismatch')
            if not (extension/manifest['main']).is_file(): errors.append('Extension entry point missing')
            if manifest.get('capabilities',{}).get('untrustedWorkspaces',{}).get('supported') is not False: errors.append('Extension must require workspace trust')
            bundle=extension/'skill-bundle'
            if bundle.exists():
                bundle_files=files(bundle)
                bundle_files.pop('bundle-manifest.json',None)
                if bundle_files!=files(SKILL): errors.append('VS Code skill bundle is out of sync')
        except (ValueError,KeyError,FileNotFoundError): errors.append('Invalid extension manifest')
    return errors

if __name__=='__main__':
    errors=validate()
    if errors:
        print('\n'.join(errors));sys.exit(1)
    print('Repository validation PASS')
