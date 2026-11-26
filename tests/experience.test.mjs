import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {renderHome,renderHomeSwitch,renderConsultingHome,parseAtlasState,allMetricsCsv,citationText} from '../src/experience.mjs';
import {filterPublications,renderCurrentMaterials,renderNews,renderNewsArticle,renderTags} from '../src/publications.mjs';
import {buildSearchIndex,search} from '../src/lib.mjs';
import {bindBudgetRegions,budgetValue} from '../src/regional-budgets.mjs';
import {matchesTaxonomy} from '../src/taxonomy.mjs';
import {pressRequestHref} from '../src/agency-pages.mjs';
import {datasets} from '../src/annotations.mjs';
import {geoDatasetSearchEntries,geoVoiceLayers,workspaceParams,workspaceSlice} from '../src/geoanalytics.mjs';
import {commandHash,parseVoiceCommand} from '../src/voice-commands.mjs';
import {agencyProjects,matchProjects,projectHref} from '../src/agency-expertise.mjs';
import {activateDemoSubscription,cancelDemoSubscription,demoInvestmentDataset,demoSubscriptionActive} from '../src/demo-subscription.mjs';
import {consultingFields,handlePressRequest,pressFields,savePressRequest} from '../scripts/press-inbox.mjs';
const C=JSON.parse(await readFile(new URL('../data/source-corpus.json',import.meta.url),'utf8'));
const news=JSON.parse(await readFile(new URL('../data/news.json',import.meta.url),'utf8'));
const agency=JSON.parse(await readFile(new URL('../data/agency-expertise.json',import.meta.url),'utf8'));

test('home variants have shareable addresses and consulting links to existing pages',()=>{
 assert.match(renderHomeSwitch(false),/href="#\/" aria-current="page"/);
 assert.match(renderHomeSwitch(true),/href="#\/\?view=consulting" aria-current="page"/);
 const markup=renderConsultingHome(agency.practices,C.materials,news);
 const practices=[...markup.matchAll(/href="#\/topics\/practice\/([^"]+)"/g)].map(([,id])=>id);
 assert.deepEqual(practices,agency.practices.map(practice=>practice.id));
 assert.match(markup,/href="#\/about\/projects"[^>]*>Посмотреть проекты/);
 assert.doesNotMatch(markup,/Примеры проектов/);
 assert.doesNotMatch(markup,/consulting-proof/);
 assert.match(markup,/class="consulting-analytics"[\s\S]*class="featured-report"[\s\S]*class="hero-data"/);
 assert.match(markup,/class="section consulting-news"[\s\S]*href="#\/news\/lotus-platform"/);
 assert.match(markup,/class="hero consulting-hero"[\s\S]*id="consulting-services"[\s\S]*data-carousel-progress[\s\S]*<\/section>\s*<\/section>/);
 assert.doesNotMatch(markup,/Посмотреть услуги/);
 assert.ok(markup.includes('href="#/request?kind=consulting"'));
 assert.ok(markup.includes('href="#/request"'));
});

test('the home hero shares one showcase for maps and nine illustrated practice slides',()=>{
 const home=renderHome(C,news,agency.practices);
 const hero=home.slice(0,home.indexOf('class="section home-entry"'));
 const showcase=hero.slice(hero.indexOf('<section class="practice-showcase"'));
 assert.match(hero,/aria-controls="hero-geo-panel" aria-selected="true"/);
 assert.match(hero,/aria-controls="hero-practices-panel" aria-selected="false"/);
 assert.match(showcase,/id="hero-practices-panel" role="tabpanel" aria-labelledby="hero-practices-tab" hidden/);
 assert.match(showcase,/<\/section>\s*<\/div><\/section>/);
 assert.equal(new Set([...showcase.matchAll(/--art-x:([^"]+)/g)].map(([,position])=>position)).size,9);
 const links=[...showcase.matchAll(/href="#\/topics\/practice\/([^"]+)"/g)].map(([,id])=>id);
 assert.deepEqual(links,agency.practices.map(practice=>practice.id));
 assert.equal((showcase.match(/data-carousel-slide\sdata-active/g)||[]).length,1);
 assert.match(showcase,/data-carousel-pause/);
 assert.match(showcase,/data-carousel-step="-1"/);
 assert.match(showcase,/data-carousel-step="1"/);
});

test('typed and spoken keyword queries return direct links to the same datasets',()=>{
 const entries=geoDatasetSearchEntries(C);
 assert.deepEqual(entries.map(entry=>entry.id),['regional-budgets','territories','kz-price-indices',
  'ru-cigarettes-2026','polymers-countries-2024','tobacco-countries-h1-2026','investment-preview']);
 assert.equal(new Set(entries.map(entry=>entry.href)).size,entries.length);
 const index=[...buildSearchIndex(C,news.items),...entries];
 const result=search(index,'потребление электроэнергии')[0];
 assert.equal(result.type,'dataset');
 assert.equal(result.href,'#/geoanalytics?dataset=territories');
 const command=parseVoiceCommand('федеральное казначейство','search');
 const url=commandHash(command,'#/search?type=dataset');
 const params=new URLSearchParams(url.split('?')[1]);
 assert.equal(params.get('type'),'dataset');
 assert.equal(search(index,params.get('q'),params.get('type'))[0].href,'#/geoanalytics?dataset=regional-budgets');
});

test('every published keyword points to a catalog filter that contains its report',()=>{
 for(const material of C.materials){
  const links=[...renderTags(material).matchAll(/href="(#[^"]+)"/g)];
  assert.equal(links.length,material.tags?.length||0);
  for(const [,href] of links){
   const [route,query]=href.split('?');
   const tag=new URLSearchParams(query).get('tag');
   assert.equal(route,'#/studies');
   assert.ok(filterPublications(C.materials,{tag}).includes(material));
  }
 }
 const original=C.materials.find(material=>material.id==='ved-platezhi-2026');
 assert.ok(filterPublications(C.materials,{tag:'трансграничные расчеты'}).includes(original));
 assert.match(renderTags(original,new URLSearchParams({format:'pdf',from:'2026-01-01'})),/format=pdf&amp;from=2026-01-01&amp;tag=/);
});

test('the four partner groups include all 32 entries and their exact media in the build',async()=>{
 assert.deepEqual(agency.partners.map(group=>group.organizations.length),[8,7,9,8]);
 for(const item of agency.partners.flatMap(group=>group.organizations).filter(item=>item.href)){
  const asset=await readFile(new URL('../dist'+item.href,import.meta.url));
  assert.equal(createHash('sha256').update(asset).digest('hex'),item.sha256);
 }
});

test('a local demo subscription unlocks the investment dataset without payment',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 assert.equal(demoInvestmentDataset(demoSubscriptionActive(storage)).rows.length,0);
 assert.equal(activateDemoSubscription(storage),true);
 const data=demoInvestmentDataset(demoSubscriptionActive(storage));
 assert.equal(data.access,'open');
 assert.equal(data.rows.length,3);
 assert.ok(data.records.every(record=>record.status==='demo'));
 assert.equal(cancelDemoSubscription(storage),true);
 const locked=demoInvestmentDataset(demoSubscriptionActive(storage));
 assert.equal(locked.access,'paid');
 assert.equal(locked.rows.length,0);
});

test('consulting requests accept only known types and return a receipt after local storage',async()=>{
 const sample={name:'Тест',email:'test@example.test',subject:'Исследование',question:'Описание задачи',kind:'research'};
 assert.equal(consultingFields({...sample,kind:'unknown'}),null);
 const folder=await mkdtemp(path.join(tmpdir(),'atre-consulting-test-'));
 try {
  const request=Readable.from([Buffer.from(JSON.stringify(sample))]);
  request.method='POST';
  request.headers={'content-type':'application/json'};
  let code,body;
  const response={writeHead(status){code=status;},end(value){body=JSON.parse(value);}};
  await handlePressRequest(request,response,folder,consultingFields);
  assert.equal(code,201);
  const record=JSON.parse(await readFile(path.join(folder,body.id+'.json'),'utf8'));
  assert.equal(record.kind,'research');
  assert.equal(record.email,sample.email);
 } finally { await rm(path.join(folder),{recursive:true,force:true}); }
});

test('the local press inbox validates requests and persists a receipt with the reply email',async()=>{
 const sample={outlet:'Тестовая редакция',subject:'Тест',question:'Проверка формы',email:'reporter@example.test'};
 assert.equal(pressFields({...sample,email:'invalid'}),null);
 assert.equal(pressFields({...sample,question:' '.repeat(8)}),null);
 const folder=await mkdtemp(path.join(tmpdir(),'atre-press-test-'));
 try {
  const id=await savePressRequest(folder,pressFields(sample));
  const saved=JSON.parse(await readFile(path.join(folder,id+'.json'),'utf8'));
  assert.equal(saved.id,id);
  assert.equal(saved.email,sample.email);
  assert.equal(saved.question,sample.question);
 } finally { await rm(path.join(folder),{recursive:true,force:true}); }
});

test('appendix projects are available by practice and sector with one canonical link',()=>{
 const projects=agencyProjects(C,agency);
 assert.equal(agency.practices.length,9);
 assert.equal(agency.projects.length,88);
 assert.equal(projects.length,116);
 assert.equal(new Set(projects.map(p=>projectHref(p.id))).size,projects.length);
 const [index]=matchProjects(projects,{practice:'digital-transformation',sector:'energy'});
 assert.equal(index.title,'Индекс цифровой зрелости ТЭК (Минэнерго России)');
 assert.equal(index.sourceSlide,17);
 const matched=projects.find(p=>p.id==='project-29');
 assert.equal(matched.sourceSlide,17);
 assert.deepEqual(matched.topics,C.projects.find(p=>p.id===matched.id).topics);
 assert.equal(matchProjects(projects,{query:'возможных кейсов'}).includes(matched),true);
});

test('all nine team portraits match the embedded PPTX files',async()=>{
 assert.equal(Object.keys(agency.portraits).length,9);
 for(const {href,slide,sha256} of Object.values(agency.portraits)){
  assert.ok(slide>=6&&slide<=8);
  const original=await readFile(new URL('../public'+href,import.meta.url));
  assert.equal(createHash('sha256').update(original).digest('hex'),sha256);
  const built=await readFile(new URL('../dist'+href,import.meta.url));
  assert.deepEqual(built,original);
 }
});

test('the regional atlas joins each geometry to one distinct source record in both periods',async()=>{
 const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
 const {features}=await readJson('../public/geo/russia-regions.geojson');
 for(const year of [2025,2026]){
  const rows=await readJson('../data/geoeconomics-'+year+'.json');
  const joined=bindBudgetRegions(features,rows);
  assert.equal(rows.length,91);
  assert.equal(joined.filter(item=>item.row).length,83);
  assert.equal(new Set(joined.map(item=>item.row.id)).size,83);
  assert.equal(joined.find(item=>item.feature.properties.name==='Алтай').row.name,'Республика Алтай');
  assert.equal(joined.find(item=>item.feature.properties.name==='Алтайский край').row.name,'Алтайский край');
 }
 assert.equal(budgetValue({sectors:{Здравоохранение:0}},'sector:Здравоохранение'),0);
 assert.equal(budgetValue({sectors:{}},'sector:Здравоохранение'),null);
});

test('taxonomy applies the same editorial classification to a report and its datasets',()=>{
 const material=C.materials.find(item=>item.id==='polimery-2026');
 const scope={sector:'industry',topic:'industry-analysis'};
 assert.equal(matchesTaxonomy(C,material,scope),true);
 assert.equal(matchesTaxonomy(C,{materialId:material.id},scope),true);
 assert.equal(matchesTaxonomy(C,material,{...scope,sector:'finance'}),false);
 assert.equal(matchesTaxonomy(C,{id:'regional-budgets'},{sector:'government',topic:'fiscal-effects'}),true);
});

test('a press request encodes the subject and question for the official mailbox',()=>{
 const data=new Map([['outlet','Редакция'],['subject','АТРЭ & спорт'],['question','Как изменился рынок?'],['deadline','']]);
 const href=pressRequestHref(data);
 const parsed=new URL(href);
 assert.equal(parsed.pathname,'media@agencytde.ru');
 assert.equal(parsed.searchParams.get('subject'),'Запрос СМИ: АТРЭ & спорт');
 assert.match(parsed.searchParams.get('body'),/Вопрос: Как изменился рынок\?/);
});

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

test('current materials alternate between news and the newest reports outside the featured showcase',()=>{
 const markup=renderCurrentMaterials(news,C.materials);
 const links=[...markup.matchAll(/href="(#\/(?:news|study)\/[^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(links,[
  '#/news/platform-economy-2026','#/study/ved-platezhi-2026','#/news/lotus-platform',
  '#/study/seraya-zanyatost','#/news/raex-consulting'
 ]);
 const home=renderHome(C,news,agency.practices,geoDatasetSearchEntries(C).length);
 const reportLinks=[...home.matchAll(/href="(#\/study\/[^"]+)"/g)].map(match=>match[1]);
 assert.equal(reportLinks.length,new Set(reportLinks).size);
});

test('voice filters use current dataset names, periods, views and scopes',()=>{
 const layers=()=>geoVoiceLayers(C);
 const content={filters:{layers,practices:agency.practices}};
 const resolve=(phrase,hash)=>commandHash(parseVoiceCommand(phrase,'auto',content),hash);
 const spending=resolve('Набор Расходы на физическую культуру и спорт','#/geoanalytics?dataset=regional-budgets&sector=government&columns=revenue');
 assert.equal(spending,'#/geoanalytics?dataset=sport-spending');
 assert.equal(resolve('Период 2024 год',spending),spending+'&period=2024');
 assert.equal(resolve('Период 2010',spending),null);
 assert.equal(resolve('Вид карта',spending),null);
 assert.equal(resolve('Вид график',spending),spending+'&view=chart');
 assert.equal(resolve('Фильтр строк Москва',spending),spending+'&filter='+encodeURIComponent('москва'));
 assert.equal(resolve('Сбрось фильтры Геоаналитики','#/atlas?detail=1'),'#/geoanalytics');
 assert.equal(resolve('Практика Операционная эффективность','#/about/projects?sector=transport&page=2'),'#/about/projects?sector=transport&practice=operations');
 assert.equal(resolve('Открой клиенты и партнёры','#/'),'#/about/partners');
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
test('legacy atlas and constructor links retain the selected data slice in Geoanalytics',()=>{
 const forecast=workspaceParams('/atlas','metric=2&view=rank&regions=moscow,siberia&compare=moscow,siberia&focus=moscow&topic=territorial-development');
 assert.equal(forecast.get('dataset'),'territories');
 assert.equal(forecast.get('columns'),'cap');
 assert.equal(forecast.get('view'),'chart');
 assert.equal(forecast.get('regions'),'moscow,siberia');
 assert.equal(forecast.get('focus'),'moscow');
 assert.equal(forecast.get('topic'),'territorial-development');
 const budget=workspaceParams('/atlas','layer=regional-budgets&period=2026&budgetMetric=expenses');
 assert.equal(budget.get('dataset'),'regional-budgets');
 assert.equal(budget.get('period'),'2026');
 assert.equal(budget.get('columns'),'expenses');
 const builder=workspaceParams('/constructor','dataset=fitness-studios&columns=total,share&filter=2025&beside=sport-spending');
 assert.equal(builder.get('dataset'),'fitness-market');
 assert.equal(builder.get('columns'),'total,share');
 assert.equal(builder.get('filter'),'2025');
 assert.equal(builder.get('beside'),'sport-spending');
 assert.equal(builder.get('view'),'table');
});

test('forecast slices join short district names and country series select one map period',()=>{
 const data=datasets(C);
 const forecast=data.find(d=>d.id==='territories');
 const slice=workspaceSlice(forecast,new URLSearchParams('regions=moscow,siberia&columns=cap'),0,C.atlas.territories);
 assert.deepEqual(slice.rows.map(row=>row.name),['Москва и Московская область','Сибирский ФО']);
 assert.equal(slice.columns[0].name,'cap');
 const tobacco=data.find(d=>d.id==='ru-cigarettes-2026');
 const map=workspaceSlice(tobacco,new URLSearchParams('view=map'),0,C.atlas.territories);
 assert.equal(map.rows.length,1);
 assert.equal(map.period,map.rows[0].month);
 const chart=workspaceSlice(tobacco,new URLSearchParams('view=chart'),0,C.atlas.territories);
 assert.equal(chart.rows.length,tobacco.rows.length);
});
