import {mkdir,cp,copyFile,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
// The largest original PDF is split in source control; the public file is byte-identical.
const largePdf=Buffer.concat(await Promise.all([1,2,3].map(i=>readFile('data/assets/volna-preemstvennosti.pdf.part'+i))));
if(createHash('sha256').update(largePdf).digest('hex')!=='55304af87b0fe141dc7a7e353147e2b27ca03467ea1c71dacee51b8d4bbd042f')throw Error('Original PDF checksum mismatch');
await mkdir('dist/materials/volna-preemstvennosti',{recursive:true});
await writeFile('dist/materials/volna-preemstvennosti/volna-preemstvennosti.pdf',largePdf);
for(const [from,to] of [['src/report-visuals.mjs','dist/report-visuals.mjs'],['src/voice-commands.mjs','dist/voice-commands.mjs'],['src/voice-control.mjs','dist/voice-control.mjs'],['src/voice-control.css','dist/voice-control.css'],['src/report-reading.mjs','dist/report-reading.mjs'],['src/polymer-report.mjs','dist/polymer-report.mjs'],['src/polymer-report.css','dist/polymer-report.css'],['index.html','dist/index.html'],['src/data-model.mjs','dist/data-model.mjs'],['src/dataset-sources.mjs','dist/dataset-sources.mjs'],['src/geo-experience.mjs','dist/geo-experience.mjs'],['src/annotations.mjs','dist/annotations.mjs'],['src/annotations.css','dist/annotations.css'],['src/app.js','dist/app.js'],['src/style.css','dist/style.css'],['src/experience.css','dist/experience.css'],['src/lib.mjs','dist/lib.mjs'],['src/experience.mjs','dist/experience.mjs']])await copyFile(from,to);
await mkdir('dist/data',{recursive:true});
await copyFile('src/publications.mjs','dist/publications.mjs');
await copyFile('src/publications.css','dist/publications.css');
await copyFile('data/news.json','dist/data/news.json');
await copyFile('data/source-corpus.json','dist/data/source-corpus.json');
await copyFile('data/provenance.json','dist/data/provenance.json');
await mkdir('dist/employee',{recursive:true});await copyFile('index.html','dist/employee/index.html');
const manifest=JSON.parse(await readFile('.openai/hosting.json','utf8'));manifest.static={directory:'dist'};manifest.d1=null;manifest.r2=null;await writeFile('.openai/hosting.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Built static site with public source corpus, PDFs, atlas and demonstration employee hub.');
