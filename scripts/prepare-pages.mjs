import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2]||'/atre-next/';
const dist=path.resolve(process.argv[3]||'dist');
if(!/^\/[a-zA-Z0-9_-]+\/$/.test(base))throw Error('Expected /repository/ base path');
async function edit(file,replace){const p=path.join(dist,file);await writeFile(p,replace(await readFile(p,'utf8')));}
for(const f of ['index.html','employee/index.html'])await edit(f,s=>s.replaceAll('href="/','href="'+base).replaceAll('src="/','src="'+base));
await edit('app.js',s=>s.replaceAll("'/data/","'"+base+'data/').replaceAll("'/geo/","'"+base+'geo/').replaceAll('"/brand/','"'+base+'brand/').replaceAll("startsWith('/employee')","startsWith('"+base+"employee')"));
await edit('style.css',s=>s.replaceAll("url('/fonts/","url('"+base+'fonts/'));
for(const f of ['data/source-corpus.json','data/provenance.json'])await edit(f,s=>s.replaceAll('"/materials/','"'+base+'materials/').replaceAll('"/covers/','"'+base+'covers/'));
await writeFile(path.join(dist,'.nojekyll'),'');
// Check every publication link after adapting the build for GitHub project Pages.
const corpus=JSON.parse(await readFile(path.join(dist,'data/source-corpus.json'),'utf8'));
let checked=0;
async function walk(v){if(typeof v==='string'&&v.startsWith(base)){await access(path.join(dist,v.slice(base.length).split('#')[0]));checked++;}else if(Array.isArray(v))for(const x of v)await walk(x);else if(v&&typeof v==='object')for(const x of Object.values(v))await walk(x);}
await walk(corpus);
console.log('Prepared '+base+'; verified '+checked+' local publication links.');
