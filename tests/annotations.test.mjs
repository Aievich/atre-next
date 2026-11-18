import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {datasets,sliceState,rowsFor,summary,datasetCsv,geoCode,cardFigures} from '../src/annotations.mjs';
const C=JSON.parse(fs.readFileSync(new URL('../data/source-corpus.json',import.meta.url)));
test('constructor restores filtered multi-indicator slice and excludes invalid columns',()=>{
 const {d,columns,filter}=sliceState(C,new URLSearchParams({dataset:'territories',columns:'cons,cap,missing',filter:'Сибир'}));
 const rows=rowsFor(d,filter);
 assert.deepEqual(columns.map(c=>c.name),['cons','cap']);assert.equal(rows.length,1);
 assert.deepEqual(columns.map(c=>rows[0][c.name]),[23.1,2.1]);
 const csv=datasetCsv(d,columns,rows);assert.match(csv,/23.1/);assert.doesNotMatch(csv,/Москва/);
 assert.match(summary(d,columns,rows),/23,1/);assert.match(summary(d,columns,[]),/значений в выборке нет/);
});
test('layers retain country scope, differing index bases and usable source references',()=>{
 const ds=datasets(C);assert.equal(ds.length,19);
 assert.equal(geoCode(ds.find(d=>d.id==='fitness-market')),null);
 assert.equal(geoCode(ds.find(d=>d.id==='ru-cigarettes-2026')),'RUS');
 assert.equal(geoCode(ds.find(d=>d.id==='kz-price-indices')),'KAZ');
 assert.ok(ds.every(d=>d.sourceHref));
 assert.match(ds.find(d=>d.id==='kz-price-indices').limitations.join(' '),/не прирост/);
});
test('every report card has figures linked to its own available source page',()=>{
 for(const m of C.materials.filter(m=>m.type==='report')){
  const figures=cardFigures(m,C);assert.ok(figures.length>=2,m.id);
  for(const k of figures){assert.ok(k.sourceHref,m.id);assert.ok(C.pdfPages.some(p=>p.reportId===m.id&&p.page===k.sourcePage),m.id+' page '+k.sourcePage);}
 }
});
