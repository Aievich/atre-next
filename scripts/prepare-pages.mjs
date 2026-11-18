import {readFile,writeFile,access,readdir} from 'node:fs/promises';
import path from 'node:path';
import {rewriteAssetPaths} from './pages-paths.mjs';
const base=process.argv[2]||'/atre-next/',root=path.resolve(process.argv[3]||'dist');
let rewritten=0,checked=0;
async function visit(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await visit(file);else if(/\.(?:html|js|mjs|css|json|svg)$/.test(entry.name)){const original=await readFile(file,'utf8'),updated=rewriteAssetPaths(original,base);if(updated!==original){await writeFile(file,updated);rewritten++;}}}}
await visit(root);await writeFile(path.join(root,'.nojekyll'),'');
await writeFile(path.join(root,'build-info.json'),JSON.stringify({commit:process.env.GITHUB_SHA||null,builtAt:new Date().toISOString()}));
async function verify(value){if(typeof value==='string'&&value.startsWith(base)){await access(path.join(root,value.slice(base.length).split(/[?#]/)[0]));checked++;}else if(Array.isArray(value))for(const x of value)await verify(x);else if(value&&typeof value==='object')for(const x of Object.values(value))await verify(x);}
for(const file of ['data/source-corpus.json','data/provenance.json','materials/polimery-2026/digital.json'])await verify(JSON.parse(await readFile(path.join(root,file),'utf8')));
console.log('Prepared '+base+'; updated '+rewritten+' files; verified '+checked+' publication links.');
