import test from 'node:test';
import assert from 'node:assert/strict';
import {installVoiceControl} from '../src/voice-control.mjs';

function fixture(t,mode='auto',hash='#/'){
  const events=new Map(),listeners={},instances=[],timers=[];
  const classes=new Set(),classList={add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)};
  const attrs={},button={dataset:{voiceMode:mode},setAttribute:(k,v)=>attrs[k]=v,classList,isConnected:true,focus(){}};
  const input={value:'',addEventListener:(event,fn)=>listeners.input=fn},status={textContent:''},close={addEventListener:(event,fn)=>listeners.close=fn};
  const form={addEventListener:(event,fn)=>listeners.submit=fn},retry={addEventListener:(event,fn)=>listeners.retry=fn};
  const panel={hidden:true,classList,setAttribute(){},querySelector:s=>s==='input'?input:s==='#voice-status'?status:s==='form'?form:s==='.voice-retry'?retry:close};
  class Recognition{constructor(){instances.push(this)}start(){this.onstart()}abort(){this.aborted=true;this.onend?.()}stop(){this.onend?.()}}
  const win={SpeechRecognition:Recognition,isSecureContext:true,addEventListener:(name,fn)=>events.set('window:'+name,fn),dispatchEvent:event=>events.get('window:'+event.type)?.(event)};
  const doc={hidden:false,body:{append(){}},createElement:()=>panel,querySelectorAll:()=>[button],addEventListener:(name,fn)=>events.set(name,fn)};
  const originals=new Map();for(const [key,value] of Object.entries({document:doc,window:win,location:{hash},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{},HashChangeEvent:class{constructor(type){this.type=type}}})){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
  t.after(()=>{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  const launch=installVoiceControl();
  const click=()=>events.get('click')({target:{closest:()=>button}});
  const result=(text,final)=>Object.assign([{transcript:text}],{isFinal:final});
  const finish=text=>{const r=instances.at(-1);r.onresult({results:[result(text,true)]});r.onend();};
  return {events,instances,panel,input,status,attrs,launch,click,finish,result,listeners};
}

test('one click starts the microphone and final speech executes without a menu or confirmation',t=>{
  const f=fixture(t);assert.equal(f.instances.length,0);assert.ok(!f.launch.includes('dialog'));f.click();assert.equal(f.instances.length,1);assert.equal(f.panel.hidden,false);assert.equal(f.attrs['aria-pressed'],'true');
  f.instances[0].onresult({results:[f.result('Открой атлас',false)]});assert.equal(f.input.value,'Открой атлас');assert.equal(location.hash,'#/');
  f.finish('Открой атлас данных');assert.equal(location.hash,'#/atlas');assert.match(f.status.textContent,/Открываю/);assert.equal(f.attrs['aria-pressed'],'false');
});
test('unknown commands show feedback without navigation; repeat click cancels and rejects late results',t=>{
  const f=fixture(t);f.click();f.finish('абракадабра');assert.equal(location.hash,'#/');assert.match(f.status.textContent,/Команда не распознана/);
  f.click();const old=f.instances.at(-1);f.click();assert.equal(old.aborted,true);old.onresult({results:[f.result('Открой исследования',true)]});old.onend();assert.equal(location.hash,'#/');
});
test('search microphone accepts a free phrase and assistant microphone retains the dataset context',t=>{
  const f=fixture(t,'search','#/search');f.click();f.finish('316,5');assert.equal(location.hash,'#/search?q=316%2C5');
});
test('free question is automatically sent with the current assistant slice',t=>{
  const f=fixture(t,'assistant','#/assistant?material=cod-2026&dataset=territories&columns=cons');f.click();f.finish('Сравни территории');const p=new URLSearchParams(location.hash.split('?')[1]);assert.equal(p.get('question'),'Сравни территории');assert.equal(p.get('dataset'),'territories');assert.equal(p.get('material'),'cod-2026');
});
test('global microphone can navigate away from assistant while its inline microphone keeps free question mode',t=>{
  const f=fixture(t,'auto','#/assistant?material=cod-2026');f.click();f.finish('Открой атлас данных');assert.equal(location.hash,'#/atlas');
});
test('closing feedback and hiding the document stop active capture',t=>{
  const f=fixture(t);f.click();f.listeners.close();assert.equal(f.instances[0].aborted,true);assert.equal(f.panel.hidden,true);
  f.click();document.hidden=true;f.events.get('visibilitychange')();assert.equal(f.instances[1].aborted,true);assert.equal(f.attrs['aria-pressed'],'false');
});

test('network failure allows typed commands and ignores late recognition results',t=>{
  const f=fixture(t);f.click();const old=f.instances[0];old.onerror({error:'network'});
  assert.equal(old.aborted,true);assert.equal(f.attrs['aria-pressed'],'false');
  old.onresult({results:[f.result('Открой исследования',true)]});old.onend();assert.equal(location.hash,'#/');
  f.input.value='Открой атлас данных';f.listeners.submit({preventDefault(){}});assert.equal(location.hash,'#/atlas');
});

test('retry starts a fresh session and typed search preserves the microphone mode',t=>{
  const f=fixture(t,'search');f.click();f.instances[0].onerror({error:'network'});f.listeners.retry();assert.equal(f.instances.length,2);
  f.input.value='316,5';f.listeners.input();assert.equal(f.instances[1].aborted,true);
  f.listeners.submit({preventDefault(){}});assert.equal(location.hash,'#/search?q=316%2C5');
});
