import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildDatasets,exportDataset,canonicalDataset} from '../src/data-model.mjs';
import {renderExternalSources,datasetCsv} from '../src/annotations.mjs';
const C=JSON.parse(fs.readFileSync(new URL('../data/source-corpus.json',import.meta.url)));
const all=buildDatasets(C),get=id=>all.find(d=>d.id===id);
test('annual expense columns become distinct observations and filtered export preserves only selected years',()=>{
 const d=get('sport-spending'),rows=d.rows.filter(r=>r.name==='Заработная плата'&&r.period==='2025');
 assert.equal(d.rows.length,21);assert.equal(d.schema.indicators[0].unit,'млрд руб.');
 const result=exportDataset(d,[d.columns.find(c=>c.name==='amount')],rows);
 assert.equal(result.observations.length,1);assert.equal(result.observations[0].value,456.5);assert.equal(result.observations[0].period,'2025');
 assert.match(datasetCsv(d,[d.columns.find(c=>c.name==='amount')],rows),/456.5/);
});
test('dataset consolidation removes duplicate club sample and preserves sources of joined fitness indicators',()=>{
 assert.equal(canonicalDataset('rpl-selected'),'rpl-clubs');assert.equal(canonicalDataset('fitness-studios'),'fitness-market');
 assert.equal(all.some(d=>d.id==='rpl-selected'),false);
 const d=get('fitness-market');assert.equal(d.records.find(r=>r.indicator==='growth'&&r.period==='2021').value,null);
 assert.equal(d.records.find(r=>r.indicator==='growth').source.page,9);assert.equal(d.records.find(r=>r.indicator==='total').source.page,8);
});
test('country comparison uses the same half-year and converts millions to billions without comparing incompatible monthly values',()=>{
 const d=get('tobacco-countries-h1-2026');assert.equal(d.rows.length,2);
 assert.ok(Math.abs(d.rows[0].production-100.05827103)<1e-9);assert.equal(d.rows[1].production,14.1757);
 assert.equal(d.rows[0].period,d.rows[1].period);assert.deepEqual(d.rows.map(r=>r.geoCode),['RUS','KAZ']);
 assert.equal(d.records.every(r=>r.source.href&&r.geoCode),true);
});
test('polymer country values match PDF table and geographic subsets exclude aggregate rows',()=>{
 const d=get('polymers-countries-2024'),countries=d.rows.filter(r=>r.geoCode);
 assert.equal(countries.length,10);assert.equal(countries.find(r=>r.geoCode==='CHN').production,85);
 assert.equal(countries.find(r=>r.geoCode==='RUS').production,8);
 assert.equal(d.rows.find(r=>r.name==='Мир').geoCode,'');assert.ok(d.records.every(r=>r.source.page===13));
});
test('external sources appear only for selected datasets with verified matching references',()=>{
 assert.equal(renderExternalSources(get('club-league')), '');
 const sports=renderExternalSources(get('sport-spending'));assert.match(sports,/storage.minsport/);assert.doesNotMatch(sports,/fedstat|stat.gov.kz/);
 const kz=renderExternalSources(get('kz-price-indices'));assert.match(kz,/stat.gov.kz/);assert.doesNotMatch(kz,/fedstat|minsport/);
});
test('financial reference values retain units and missing qualified values',()=>{
 const d=get('vfla-finance');assert.equal(d.kind,'quantitative');
 assert.ok(d.records.some(r=>r.unit==='человек'&&r.value===43.5));assert.ok(d.records.some(r=>r.originalValue==='менее 0,1'&&r.value===null));
 assert.equal(get('club-league').referenceRecords.length,4);
});
