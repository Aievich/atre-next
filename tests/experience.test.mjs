import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseAtlasState,allMetricsCsv,citationText} from '../src/experience.mjs';
const C=JSON.parse(await readFile(new URL('../data/source-corpus.json',import.meta.url),'utf8'));
test('URL restores metric, territories, comparison and focus while rejecting invalid IDs',()=>{
 const s=parseAtlasState(new URLSearchParams('metric=2&view=rank&regions=siberia,northwest,volga&compare=northwest,siberia&focus=volga'),C.atlas.territories);
 assert.deepEqual(s,{metric:2,view:'rank',selected:['siberia','northwest','volga'],compared:['northwest','siberia'],focus:'volga'});
 const bad=parseAtlasState(new URLSearchParams('metric=NaN&regions=siberia,northwest&compare=siberia,siberia,moscow,northwest&focus=bad'),C.atlas.territories);
 assert.equal(bad.metric,0);assert.deepEqual(bad.compared,['siberia','northwest']);assert.equal(bad.focus,'siberia');
});
test('comparison CSV exports all three original metrics and only compared territories',()=>{
 const r=C.atlas.territories.find(r=>r.id==='northwest');const csv=allMetricsCsv([r]);
 assert.ok(csv.includes('"17.8";"12.4";"-3.5";"2025";"2031"'));assert.equal(csv.split('\r\n').length,2);assert.ok(!csv.includes('Москва'));
});
test('citation contains source page, period and URL without inventing an author',()=>{
 const m=C.materials.find(m=>m.id==='sport-2026');const text=citationText(m,m.keyMetrics[1],'http://127.0.0.1:8173/');
 assert.ok(text.includes('316,5'));assert.ok(text.includes('2025'));assert.ok(text.includes('PDF, с. 7'));assert.ok(text.includes('http://127.0.0.1:8173/materials/'));assert.ok(!text.includes('unconfirmed'));
});
