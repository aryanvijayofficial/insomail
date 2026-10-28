// InsoMail modification, 2026-10-29. Create the matching AGPL source archive.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const files=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean);
for(const file of files) {
 if (/(^|\/)(node_modules|dist|\.git)(\/|$)|(^|\/)(\.env|\.dev\.vars)(\.|$)/.test(file) && !file.endsWith('.example')) throw new Error(`Unsafe source path: ${file}`);
}
mkdirSync('dist/source',{recursive:true});
writeFileSync('dist/source/files.txt',files.join('\0')+'\0');
execFileSync('tar',['--null','-T','dist/source/files.txt','-czf','dist/source/insomail-source.tar.gz']);
console.log(`Packaged ${files.length} tracked source files without repository metadata or runtime data.`);
