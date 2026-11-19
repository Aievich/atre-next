import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVoiceCommand as parse,commandHash,recognitionError,createSpeechSession} from '../src/voice-commands.mjs';

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
test('voice assistant preserves current scope and dataset slice only on assistant route',()=>{
  const c=parse('Сравни значения','assistant');
  const p=new URLSearchParams(commandHash(c,'#/assistant?material=cod-2026&dataset=territories&columns=cons&filter=Москва&question=old').split('?')[1]);
  assert.equal(p.get('dataset'),'territories');assert.equal(p.get('filter'),'Москва');assert.equal(p.get('question'),'Сравни значения');
  assert.equal(commandHash(c,'#/atlas?metric=2'),'#/assistant?question='+encodeURIComponent(c.query).replaceAll('%20','+'));
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
