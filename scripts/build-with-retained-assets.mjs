// InsoMail modification, 2026-10-29. Keep immutable client assets available to open tabs across releases.
import {cpSync,existsSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const history='.asset-history';
const output='dist/client/_next/static';
function merge(source,target){if(!existsSync(source))return;mkdirSync(target,{recursive:true});for(const name of readdirSync(source)){const from=`${source}/${name}`,to=`${target}/${name}`;if(statSync(from).isDirectory())merge(from,to);else if(!existsSync(to))cpSync(from,to);}}
merge(output,history);
const result=spawnSync('npm',['run','build:app'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
merge(output,history);
merge(history,output);
console.log('Immutable client asset history merged into deployment assets.');
