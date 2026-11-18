import {esc} from './lib.mjs';
// Display-only grouping. Every character is retained, including source line breaks.
export function sourceBlocks(text){
 const parts=[];let current='',kind='prose';const lines=String(text).match(/[^\n]*\n|[^\n]+$/g)||[];
 const flush=()=>{if(current)parts.push({text:current,kind});current='';};
 for(const [index,line] of lines.entries()){const trimmed=line.trim();let next=null;
  if(index===0&&trimmed.length<100&&!/[.!?;:]$/.test(trimmed)&&lines.length>1){flush();parts.push({text:line,kind:'title'});continue;}
  if(/^[-−•]\s/.test(trimmed))next='bullet';
  else if(/^(?:Таблица\s+\d|Рисунок\s+\d|Источники?\s*[–—-])/.test(trimmed))next='source';
  else if(/^(?:Мировой рынок:|ЭЗЦ:|Развилка для России:|Барьеры для реализации:|Выводы для России|Спрос:|Предложение:|Рынок:|\d+\.\s)/.test(trimmed))next='heading';
  if(next){flush();kind=next;}
  else if(!trimmed){current+=line;flush();kind='prose';continue;}
  current+=line;
 }flush();return parts;
}
export const renderSourceText=text=>sourceBlocks(text).map(b=>`<div class="source-reading-block source-reading-${b.kind}">${esc(b.text)}</div>`).join('');
export function readingSections(sections){const ancillary=new Set(['front','abbreviations','credits']);return [...sections.filter(s=>!ancillary.has(s.id)),...sections.filter(s=>ancillary.has(s.id))];}
export function enhanceReading(main){
 const report=main.querySelector('.polymer-report'),toc=main.querySelector('.polymer-toc');
 const navigate=target=>{const el=document.getElementById(target);if(!el)return;let ancestor=el;while(ancestor&&ancestor!==main){if(ancestor.tagName==='DETAILS')ancestor.open=true;ancestor=ancestor.parentElement;}el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
 main.querySelectorAll('[data-polymer-section]').forEach(b=>b.onclick=()=>navigate(b.dataset.polymerSection));
 main.querySelector('#polymer-text-size').onchange=ev=>report.classList.toggle('reading-large',ev.target.value==='large');
 const buttons=[...toc.querySelectorAll('[data-polymer-section]')];
 // One listener for this reader; AbortSignal detaches it on the next SPA navigation.
 const controller=new AbortController();window.addEventListener('hashchange',()=>controller.abort(),{once:true});
 let scheduled=false;const update=()=>{scheduled=false;const targets=buttons.map(b=>document.getElementById(b.dataset.polymerSection)).filter(el=>el&&!el.hidden);const current=targets.filter(el=>el.getBoundingClientRect().top<=160).at(-1)||targets[0];buttons.forEach(b=>{const active=b.dataset.polymerSection===current?.id;b.classList.toggle('reading-active',active);if(active)b.setAttribute('aria-current','location');else b.removeAttribute('aria-current');});};
 window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}},{passive:true,signal:controller.signal});update();
 const search=main.querySelector('#polymer-search'),searchHandler=search.oninput;
 search.oninput=ev=>{searchHandler(ev);const searching=Boolean(search.value.trim());main.querySelectorAll('.polymer-ancillary').forEach(d=>{if(searching&&!d.hidden)d.open=true;});main.querySelectorAll('.polymer-toc [data-polymer-section]').forEach(b=>{const target=document.getElementById(b.dataset.polymerSection);b.hidden=Boolean(target?.hidden);});update();};
}
