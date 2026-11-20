import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseAtlasState,allMetricsCsv,citationText} from '../src/experience.mjs';
import {filterPublications,renderCurrentMaterials,renderNews,renderNewsArticle} from '../src/publications.mjs';
import {buildSearchIndex,search} from '../src/lib.mjs';
const C=JSON.parse(await readFile(new URL('../data/source-corpus.json',import.meta.url),'utf8'));
const news=JSON.parse(await readFile(new URL('../data/news.json',import.meta.url),'utf8'));

test('publication dates include both endpoints and compose with other filters',()=>{
 const october={from:'2026-10-22',to:'2026-10-22',format:'digital'};
 assert.deepEqual(filterPublications(C.materials,october).map(m=>m.id),['cod-2026','sport-2026']);
 assert.deepEqual(filterPublications(C.materials,{...october,tag:'Фитнес'}).map(m=>m.id),['sport-2026']);
 assert.deepEqual(filterPublications(C.materials,{from:'2026-11-01',to:'2026-10-01'}),[]);
 assert.equal(filterPublications(C.materials,{to:'2024-10-29'}).length,2);
});

test('news search includes the article text and supports a news-only filter',()=>{
 const index=buildSearchIndex(C,news.items);
 const results=search(index,'цифровой паспорт перевозки','news');
 assert.equal(results[0].id,'lotus-platform');
 assert.ok(results.every(item=>item.type==='news'));
});

test('news cards have unique internal destinations and populated articles with sources',()=>{
 const list=renderNews(news);
 assert.equal(new Set(news.items.map(item=>item.id)).size,news.items.length);
 for(const item of news.items){
  assert.ok(list.includes(`href="#/news/${item.id}"`));
  assert.ok(item.summary.length>0&&item.body.length>0);
  const article=renderNewsArticle(item);
  assert.ok(article.includes('href="#/news"'));
  assert.ok(article.includes(item.url));
 }
 assert.ok(!list.includes(news.items[0].url));
});

test('current materials alternate between local news and the newest reports',()=>{
 const markup=renderCurrentMaterials(news,C.materials);
 const links=[...markup.matchAll(/href="(#\/(?:news|study)\/[^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(links,[
  '#/news/platform-economy-2026','#/study/cod-2026','#/news/lotus-platform',
  '#/study/sport-2026','#/news/raex-consulting'
 ]);
});
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
