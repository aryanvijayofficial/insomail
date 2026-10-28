// insoMail modification, 2026-10-29. Preserve immutable client assets across releases.
import {cpSync,existsSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,sep} from 'node:path';
const history=process.env.INSOMAIL_ASSET_HISTORY_DIR || '.asset-history';
const output='dist/client/_next/static';
function hasFiles(path){return existsSync(path)&&readdirSync(path).some(name=>{const child=resolve(path,name);return statSync(child).isDirectory()?hasFiles(child):true;});}
function merge(source,target){if(!existsSync(source))return;mkdirSync(target,{recursive:true});for(const name of readdirSync(source)){const from=`${source}/${name}`,to=`${target}/${name}`;if(statSync(from).isDirectory())merge(from,to);else if(!existsSync(to))cpSync(from,to);}}
// CI is ephemeral. Refuse a release that silently loses every prior asset.
// Restore the persistent directory before this command; persist it after success.
const mustRetain=process.env.CI && !['false','0'].includes(process.env.CI.toLowerCase());
const bootstrap=process.env.INSOMAIL_ASSET_HISTORY_BOOTSTRAP === '1';
if(resolve(history)===resolve(output)||resolve(history).startsWith(resolve(output)+sep)||resolve(output).startsWith(resolve(history)+sep)){console.error('Asset history must be stored outside the build output.');process.exit(1);}
if(mustRetain&&!hasFiles(history)&&!hasFiles(output)&&!bootstrap){console.error('Missing prior immutable assets in clean CI. Restore INSOMAIL_ASSET_HISTORY_DIR before building. For a genuinely new installation only, set INSOMAIL_ASSET_HISTORY_BOOTSTRAP=1.');process.exit(1);}
merge(output,history);
const result=spawnSync('npm',['run','build:app'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
merge(output,history);
merge(history,output);
console.log(`Immutable client asset history merged from ${history}. Persist this directory before the next clean build.`);
