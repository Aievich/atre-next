import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {norm,search,sportScenario,csvRows,buildSearchIndex} from '../src/lib.mjs';
const corpus=JSON.parse(await readFile(new URL('../data/source-corpus.json',import.meta.url),'utf8'));
test('energy comparison and CSV retain source values and forecast base',()=>{
 const r=corpus.atlas.territories;assert.equal(r.length,5);
 const nw=r.find(x=>x.id==='northwest');assert.equal(nw.values[2],-3.5);
 assert.ok(csvRows([nw],2).includes('"-3.5";"2025";"2031"'));
 assert.equal(Number((r.find(x=>x.id==='siberia').values[0]-nw.values[0]).toFixed(1)),5.3);
});
test('sport scenario uses disclosed revenue bases',()=>{
 assert.deepEqual(sportScenario(0),{loss:0,growth:0,target:9.2});
 const s=sportScenario(10);assert.ok(Math.abs(s.loss-7.02)<1e-9);assert.ok(Math.abs(s.growth-76.3043478261)<1e-8);
});
test('numeric search accepts decimal comma and dot',()=>{
 assert.equal(norm('316,5'),norm('316.5'));
 const items=corpus.pdfPages.map(p=>({title:p.materialId,summary:p.text+' '+(p.ocrText||''),type:'report'}));
 assert.ok(search(items,'316,5').length>0);assert.deepEqual(search(items,'316.5').map(x=>x.score),search(items,'316,5').map(x=>x.score));
 assert.equal(search(items,'несуществующееуникальноеслово').length,0);
});
test('live search index includes every PDF page and avoids unrelated fragment metrics',()=>{
 const index=buildSearchIndex(corpus);assert.equal(index.filter(x=>x.page).length,264);
 const result=search(index,'316,5');assert.ok(result.some(x=>x.page&&x.sourceHref.includes('.pdf#page=')));
 assert.equal(result.filter(x=>x.sectionId).some(x=>!norm(x.summary).includes('316·5')),false);
});
test('pending countries are not presented as zero observations',()=>{
 const m=corpus.materials.find(x=>x.type==='monitoring');
 assert.equal(m.monitoring.slices.filter(x=>x.status==='ready').length,2);
 assert.equal(m.monitoring.slices.find(x=>x.id==='kz').keyFigures[2].value,'228,2%');
 for(const s of m.monitoring.slices.filter(x=>x.status==='pending'))assert.equal(s.keyFigures,undefined);
});
test('all public documents and datasets exist in build',async()=>{
 assert.equal(corpus.pdfPages.length,264);assert.equal(corpus.materials.flatMap(x=>x.datasets).length,19);
 for(const m of corpus.materials){for(const p of m.pdfFiles||[])await access(new URL('../dist'+p.href,import.meta.url));for(const d of m.datasets)await access(new URL('../dist'+d.csvPath,import.meta.url));}
});
