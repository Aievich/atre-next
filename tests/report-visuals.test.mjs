import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {visualPageParts,renderVisualPage} from '../src/report-visuals.mjs';
const base=new URL('../public/materials/polimery-2026/',import.meta.url);
const data=JSON.parse(readFileSync(new URL('digital.json',base)));
const manifest=JSON.parse(readFileSync(new URL('visuals/index.json',base)));
const pages=data.sections.flatMap(s=>s.pages),hash=b=>createHash('sha256').update(b).digest('hex');

test('every numbered PDF figure and table, including continuations and duplicate table 9, has an original crop',()=>{
  assert.equal(manifest.items.length,55);
  assert.deepEqual([...new Set(manifest.items.filter(v=>v.kind==='figure').map(v=>v.number))].sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1));
  assert.deepEqual([...new Set(manifest.items.filter(v=>v.kind==='table').map(v=>v.number))].sort((a,b)=>a-b),Array.from({length:12},(_,i)=>i+1));
  assert.deepEqual(manifest.items.filter(v=>v.kind==='table'&&v.number===9).map(v=>v.page),[30,35]);
  for(const [num,ps] of [[3,[14,15]],[4,[18,19]],[7,[27,28]],[11,[39,40]]])assert.deepEqual(manifest.items.filter(v=>v.kind==='table'&&v.number===num).map(v=>v.page),ps);
});
test('immutable text ranges cover every character once and retain all narrative outside original visuals',()=>{
  for(const page of pages){
    const plan=manifest.pages[page.page];if(!plan)continue;
    assert.equal(hash(page.text),plan.textSha256);
    let end=0;for(const run of plan.runs){assert.equal(run.start,end);assert.ok(run.end>run.start);end=run.end;}
    assert.equal(end,page.text.length);
    const parts=visualPageParts(page,manifest),sourceRuns=plan.runs.filter(r=>!r.visualId).map(r=>page.text.slice(r.start,r.end)).join('');
    assert.equal(parts.filter(p=>p.kind==='text').map(p=>p.text).join(''),sourceRuns);
    for(const v of manifest.items.filter(v=>v.page===page.page))assert.equal(parts.find(p=>p.asset?.id===v.id).text,plan.runs.filter(r=>r.visualId===v.id).map(r=>page.text.slice(r.start,r.end)).join(''));
    assert.equal(parts.reduce((n,p)=>n+p.text.length,0),page.text.length);
  }
  const page7=visualPageParts(pages.find(p=>p.page===7),manifest).filter(p=>p.kind==='text').map(p=>p.text).join('');assert.match(page7,/Значительное неравенство в подушевом потреблении/);
  const page24=visualPageParts(pages.find(p=>p.page===24),manifest).filter(p=>p.kind==='text').map(p=>p.text).join('');assert.match(page24,/Для потребителей важным фактором является устойчивость цен/);
});
test('all crop files are verified against the unchanged source PDF and render once with readable source alternatives',()=>{
  assert.equal(hash(readFileSync(new URL('polimery-2026.pdf',base))),manifest.pdfSha256);
  for(const asset of manifest.items){assert.equal(hash(readFileSync(new URL('visuals/'+asset.id+'.webp',base))),asset.sha256);assert.ok(asset.width>=1400);assert.ok(Math.abs(asset.height-(asset.bbox[3]-asset.bbox[1])*200/72)<3);}
  const html=pages.map(p=>renderVisualPage(p,manifest)).join('');
  assert.equal((html.match(/data-source-visual=/g)||[]).length,55);
  for(const v of manifest.items)assert.ok(html.includes(`id="polymer-${v.id}"`));
  assert.match(html,/Текстовая расшифровка таблицы/);assert.match(html,/target="_blank"/);
});
