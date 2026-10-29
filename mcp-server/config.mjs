import { fileURLToPath } from 'node:url';
const target=process.argv[2]||'generic';
const server={command:process.execPath,args:[fileURLToPath(new URL('./stdio.mjs',import.meta.url))]};
if(target==='vscode')console.log(JSON.stringify({servers:{autogopay:{type:'stdio',...server}}},null,2));
else if(['generic','claude','gemini','cursor'].includes(target))console.log(JSON.stringify({mcpServers:{autogopay:server}},null,2));
else {console.error('Use generic, claude, gemini, cursor or vscode');process.exitCode=1;}
