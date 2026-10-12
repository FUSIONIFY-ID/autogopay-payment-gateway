const test=require('node:test');const assert=require('node:assert/strict');
const Module=require('node:module');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');
function loadMock({trusted=true,folders=[]}={}) {
 const handlers=new Map();const messages=[];const quick=[];const context={extensionPath:path.resolve(__dirname,'..'),subscriptions:[]};
 const vscode={
  workspace:{isTrusted:trusted,workspaceFolders:folders},
  window:{registerTreeDataProvider:()=>({dispose(){}}),showWarningMessage:async m=>{messages.push(m);return undefined;},showInformationMessage:async m=>messages.push(m),showErrorMessage:async m=>messages.push(m),showQuickPick:async()=>quick.shift()},
  commands:{registerCommand:(name,fn)=>{handlers.set(name,fn);return{dispose(){}};}},
  env:{clipboard:{writeText:async text=>{messages.push(text);}},openExternal:async uri=>messages.push(uri)},
  Uri:{parse:url=>url},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{None:0},ThemeIcon:class{constructor(id){this.id=id;}},
 };
 const old=Module._load;Module._load=function(id,...args){if(id==='vscode')return vscode;return old.call(this,id,...args);};
 let extension;try{delete require.cache[require.resolve('../src/extension')];extension=require('../src/extension');}finally{Module._load=old;}
 extension.activate(context);return{handlers,messages,quick,context,extension};
}
test('activation registers installer, prompt and docs commands',()=>{const m=loadMock();assert.equal(m.handlers.size,4);assert.ok(m.context.subscriptions.length>=5);assert.equal(m.extension.WelcomeProvider.prototype.getChildren.call({}).length,4);});
test('untrusted workspace cannot install',async()=>{const m=loadMock({trusted:false});await m.handlers.get('autogopay.installSkill')();assert.match(m.messages[0],/trusted workspace/);assert.equal(m.quick.length,0);});
test('missing project is handled',async()=>{const m=loadMock();await m.handlers.get('autogopay.installSkill')();assert.match(m.messages[0],/folder proyek/);});
test('prompt can be copied without credentials',async()=>{const m=loadMock();await m.handlers.get('autogopay.copyPrompt')();assert.match(m.messages[0],/autogopay-payment-gateway/);assert.doesNotMatch(m.messages[0],/agp_[0-9a-f]/);});
test('cancelled target selection does not create skill',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'autogopay-ui-'));
 try {const m=loadMock({folders:[{name:'project',uri:{scheme:'file',fsPath:root}}]});m.quick.push(undefined);await m.handlers.get('autogopay.installSkill')();assert.deepEqual(await fs.readdir(root),[]);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('command installs offline bundle into chosen workspace',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'autogopay-ui-'));
 try {const m=loadMock({folders:[{name:'project',uri:{scheme:'file',fsPath:root}}]});m.quick.push([{id:'cursor'}]);await m.handlers.get('autogopay.installSkill')();assert.match(m.messages[0],/siap/);assert.ok((await fs.readFile(path.join(root,'.agents/skills/autogopay-payment-gateway/SKILL.md'))).length>0);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('virtual filesystem is rejected',async()=>{const m=loadMock({folders:[{name:'virtual',uri:{scheme:'memfs'}}]});await m.handlers.get('autogopay.installSkill')();assert.match(m.messages[0],/filesystem lokal/);});
