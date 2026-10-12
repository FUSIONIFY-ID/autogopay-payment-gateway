const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { buildPlan, installPlan, validRelative } = require('../src/installer');
const BUNDLE = path.resolve(__dirname, '../skill-bundle');
async function temporary(fn) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'autogopay-vsix-')); try { return await fn(dir); } finally { await fs.rm(dir,{recursive:true,force:true}); } }
test('rejects traversal and invalid paths', () => { for (const p of ['../x','/x','a\\b','a//b','a/./b','C:/x']) assert.equal(validRelative(p),false); assert.equal(validRelative('references/webhooks.md'),true); });
test('installs to all six targets with shared paths deduplicated', async()=>temporary(async root=>{
 const plan=await buildPlan(root,BUNDLE,['cursor','claude-code','codex','qoder','opencode','kiro-cli']);
 const result=await installPlan(plan);assert.ok(result.written>0);
 for(const prefix of ['.agents','.claude','.qoder','.kiro']) {
  const target=path.join(root,prefix,'skills/autogopay-payment-gateway');
  assert.match(await fs.readFile(path.join(target,'SKILL.md'),'utf8'),/name: autogopay-payment-gateway/);
  assert.ok((await fs.readFile(path.join(target,'references/webhooks.md'))).length>0);
 }
 assert.equal(new Set(plan.operations.map(x=>x.destination)).size,plan.operations.length);
}));
test('repeat installation does not write unchanged files', async()=>temporary(async root=>{
 await installPlan(await buildPlan(root,BUNDLE,['cursor']));
 const result=await installPlan(await buildPlan(root,BUNDLE,['cursor']));assert.equal(result.written,0);
}));
test('custom changes require approval', async()=>temporary(async root=>{
 await installPlan(await buildPlan(root,BUNDLE,['cursor']));
 const skill=path.join(root,'.agents/skills/autogopay-payment-gateway/SKILL.md');await fs.writeFile(skill,'custom');
 const plan=await buildPlan(root,BUNDLE,['cursor']);await assert.rejects(installPlan(plan),/approval/);
 assert.equal(await fs.readFile(skill,'utf8'),'custom');
 await installPlan(plan,{overwrite:true});assert.match(await fs.readFile(skill,'utf8'),/name:/);
}));
test('file changes after preview are not overwritten', async()=>temporary(async root=>{
 const plan=await buildPlan(root,BUNDLE,['cursor']);const op=plan.operations[0];
 await fs.mkdir(path.dirname(op.destination),{recursive:true});await fs.writeFile(op.destination,'new-user-change');
 await assert.rejects(installPlan(plan),/changed since preview/);assert.equal(await fs.readFile(op.destination,'utf8'),'new-user-change');
}));
test('rejects unsupported targets', async()=>temporary(async root=>{await assert.rejects(buildPlan(root,BUNDLE,['chatgpt']),/Unsupported/);await assert.rejects(buildPlan(root,BUNDLE,[]),/Choose/);}));
test('symlinked target cannot write outside workspace', async()=>temporary(async root=>temporary(async outside=>{
 await fs.symlink(outside,path.join(root,'.agents'),'dir');await assert.rejects(buildPlan(root,BUNDLE,['cursor']),/Symbolic/);
 assert.deepEqual(await fs.readdir(outside),[]);
})));
test('bundle tampering is detected', async()=>temporary(async root=>{
 const bundle=path.join(root,'bundle');await fs.cp(BUNDLE,bundle,{recursive:true});await fs.writeFile(path.join(bundle,'SKILL.md'),'tampered');
 await assert.rejects(buildPlan(root,bundle,['cursor']),/integrity/);
}));
test('malicious bundle path is rejected', async()=>temporary(async root=>{
 const bundle=path.join(root,'bundle');await fs.cp(BUNDLE,bundle,{recursive:true});
 const file=path.join(bundle,'bundle-manifest.json');const meta=JSON.parse(await fs.readFile(file));meta.files[0].path='../escape';await fs.writeFile(file,JSON.stringify(meta));
 await assert.rejects(buildPlan(root,bundle,['cursor']),/Invalid bundle entry/);
}));
test('duplicate bundle entries rejected', async()=>temporary(async root=>{
 const bundle=path.join(root,'bundle');await fs.cp(BUNDLE,bundle,{recursive:true});
 const file=path.join(bundle,'bundle-manifest.json');const meta=JSON.parse(await fs.readFile(file));meta.files.push(meta.files[0]);await fs.writeFile(file,JSON.stringify(meta));
 await assert.rejects(buildPlan(root,bundle,['cursor']),/Invalid bundle entry/);
}));
test('partial write failure rolls back earlier writes', async()=>temporary(async root=>{
 const plan=await buildPlan(root,BUNDLE,['cursor']);await fs.writeFile(path.join(root,'blocked'),'not-a-directory');
 plan.operations[1].destination=path.join(root,'blocked','file');
 await assert.rejects(installPlan(plan));
 await assert.rejects(fs.readFile(plan.operations[0].destination),{code:'ENOENT'});
}));
