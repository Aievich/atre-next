import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseVoiceCommand as parse,commandHash,recognitionError,createSpeechSession,createVoiceContentRoutes} from '../src/voice-commands.mjs';

test('Russian section and report commands use allowlisted internal routes',()=>{
  for(const [phrase,route] of [['Открой атлас данных.','/atlas'],['Перейди в конструктор данных','/constructor'],['Открой главную страницу','/'],['Открой доклад о полимерах','/study/polimery-2026'],['Покажи исследования','/studies'],['Сотрудникам','/employee'],['Открой клиентскую зону','/client']]) assert.equal(parse(phrase).route,route,phrase);
  assert.equal(parse('открой https://example.com','navigate').kind,'unknown');
  assert.equal(commandHash(parse('javascript:alert(1)')),null);
});
test('search and assistant queries preserve payload and encode URL characters',()=>{
  assert.deepEqual(parse('Найди Полимеры & газ'),{kind:'search',query:'Полимеры & газ',label:'Поиск по материалам'});
  const q=parse('Спроси помощника: что такое ЦОД?');assert.equal(q.kind,'assistant');assert.equal(q.query,'что такое ЦОД');
  assert.equal(parse('Сравни потребление','assistant').kind,'assistant');
  assert.equal(parse('Атлас данных','search').kind,'search');
  assert.equal(parse('316,5 млрд').kind,'unknown');assert.equal(parse('316,5 млрд','search').query,'316,5 млрд');
  assert.equal(commandHash(parse('  ')),null);
});
test('commands resolve news, current materials and the published vocabulary',()=>{
  const {materials}=JSON.parse(readFileSync(new URL('../data/source-corpus.json',import.meta.url)));
  const {items}=JSON.parse(readFileSync(new URL('../data/news.json',import.meta.url)));
  const content=createVoiceContentRoutes(materials,items);
  const resolve=phrase=>commandHash(parse(phrase,'auto',content));
  assert.equal(resolve('Открой новости'),'#/news');
  assert.equal(resolve('Покажи актуальное'),'#/?section=actual');
  assert.equal(resolve('Открой новость о Лотусе'),'#/news/lotus-platform');
  assert.equal(resolve('Открой доклад ВЭД 2026'),'#/study/ved-platezhi-2026');
  assert.equal(resolve('Покажи тег трансграничные расчеты'),'#/studies?tag='+encodeURIComponent('Трансграничные расчёты'));
  assert.equal(resolve('Найди в новостях цифровой паспорт'),'#/search?q='+encodeURIComponent('цифровой паспорт')+'&type=news');
  assert.equal(resolve('Покажи тег ничего подобного'),null);
});
test('voice assistant preserves current scope and dataset slice only on assistant route',()=>{
  const c=parse('Сравни значения','assistant');
  const p=new URLSearchParams(commandHash(c,'#/assistant?material=cod-2026&dataset=territories&columns=cons&filter=Москва&question=old').split('?')[1]);
  assert.equal(p.get('dataset'),'territories');assert.equal(p.get('filter'),'Москва');assert.equal(p.get('question'),'Сравни значения');
  assert.equal(commandHash(c,'#/atlas?metric=2'),'#/assistant?question='+encodeURIComponent(c.query).replaceAll('%20','+'));
});
test('voice filters combine with active catalog filters and validate dates',()=>{
  const topics=[{id:'industry-analysis',short:'Анализ отраслей'}];
  const resolve=(phrase,hash)=>commandHash(parse(phrase,'auto',{filters:{topics}}),hash);
  const format=resolve('Выбери формат PDF','#/studies?query=ЦОД');
  const topic=resolve('Направление анализ отраслей',format);
  const range=resolve('Дата публикации с 1 октября 2026 по 31.10.2026',topic);
  const params=new URLSearchParams(range.split('?')[1]);
  assert.deepEqual(Object.fromEntries(params),{
    query:'ЦОД',format:'pdf',topic:'industry-analysis',from:'2026-10-01',to:'2026-10-31'
  });
  assert.equal(resolve('Покажи публикации за 2025 год','#/news'),'#/studies?from=2025-01-01&to=2025-12-31');
  assert.equal(resolve('Дата публикации с 31.02.2026 по 01.03.2026',range),null);
  assert.equal(resolve('Сбрось фильтры',range),'#/studies');
});

test('voice atlas filters retain the active slice and respect the selected layer',()=>{
  const layers=[
    {id:'cod',title:'Энергетика',metrics:[{label:'Максимальная нагрузка',value:'1'}]},
    {id:'polymers',title:'Полимеры',metrics:[{label:'Производство',value:'production'}]}
  ];
  const resolve=(phrase,hash)=>commandHash(parse(phrase,'auto',{filters:{layers}}),hash);
  const metric=resolve('Показатель максимальная нагрузка','#/atlas?view=rank&regions=moscow');
  assert.equal(metric,'#/atlas?view=rank&regions=moscow&metric=1');
  assert.equal(resolve('Вид таблица',metric),'#/atlas?view=table&regions=moscow&metric=1');
  const layer=resolve('Слой полимеры',metric);
  assert.equal(layer,'#/atlas?layer=polymers');
  assert.equal(resolve('Показатель производство',layer),'#/atlas?layer=polymers&column=production');
  assert.equal(resolve('Режим полимеры',layer),null);
  assert.equal(resolve('Вид рейтинг',layer),null);
  assert.equal(resolve('Сбрось фильтры',layer),'#/atlas');
});
function harness(){
  const events=[],instances=[],timers=[];
  class Recognition{constructor(){instances.push(this)}start(){this.onstart()}abort(){this.onend?.()}stop(){this.onend?.()}}
  const session=createSpeechSession(Recognition,e=>events.push(e),{schedule:f=>{timers.push(f);return 1},cancel:()=>{}});
  const result=(t,final)=>Object.assign([{transcript:t}],{isFinal:final});
  return {session,events,instances,timers,result};
}
test('recording starts only explicitly, interim text is not committed, final text is returned once',()=>{
  const h=harness();assert.equal(h.instances.length,0);h.session.start();const r=h.instances[0];
  assert.equal(r.lang,'ru-RU');assert.equal(r.continuous,false);
  r.onresult({results:[h.result('Открой',false)]});assert.equal(h.events.at(-1).state,'listening');
  r.onresult({results:[h.result('Открой атлас',true)]});r.onend();r.onend();
  assert.deepEqual(h.events.at(-1),{state:'ready',text:'Открой атлас'});
  assert.equal(h.events.filter(x=>x.state==='ready').length,1);
});
test('cancellation ignores late recognition results and a new recording owns the events',()=>{
  const h=harness();h.session.start();const old=h.instances[0];h.session.stop();const count=h.events.length;
  old.onresult({results:[h.result('Поздний результат',true)]});old.onend();assert.equal(h.events.length,count);
  h.session.start();const r=h.instances[1];old.onerror({error:'network'});assert.equal(h.events.at(-1).state,'listening');
  r.onerror({error:'not-allowed'});r.onend();assert.equal(h.events.at(-1).message,recognitionError('not-allowed'));assert.equal(h.events.filter(e=>e.state==='ready').length,0);
});
test('silent recordings, start failures and recording timeout have recoverable outcomes',()=>{
  const h=harness();h.session.start();h.timers[0]();assert.equal(h.events.at(-1).message,recognitionError('no-speech'));
  class Broken{start(){throw Error('denied')}abort(){}}
  const events=[];createSpeechSession(Broken,e=>events.push(e)).start();assert.equal(events.at(-1).state,'error');
});
