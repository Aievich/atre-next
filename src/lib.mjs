export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const norm=v=>String(v??'').toLowerCase().replace(/ё/g,'е').replace(/(\d)[,.](\d)/g,'$1·$2').replace(/[^\p{L}\p{N}·]+/gu,' ').trim();
const stem=v=>v.replace(/(иями|ами|ого|ему|ому|ыми|ими|иях|ах|ях|ов|ев|ий|ый|ой|ая|яя|ое|ее|ые|ие|ом|ем|ам|ям|ую|юю|ы|и|а|я|у|ю|е|о)$/,'');
const aliases={цод:['цод','центр обработки данных','дата центр'],фитнес:['фитнес','спорт'],энергия:['электроэнергия','энергосистема'],наследование:['преемственность','передача бизнеса']};
export function searchable(m){return [m.searchTitle??m.title,m.summary,...(m.topics||[]),...(m.tags||[]),...(m.sections||[]).map(s=>s.title+' '+s.text),...(m.keyMetrics||[]).map(x=>JSON.stringify(x)),...(m.datasets||[]).map(x=>JSON.stringify(x.rows||[]))].join(' ')}
export function search(items,query,type='all'){
 const q=norm(query), tokens=q.split(' ').filter(Boolean), qt=tokens.map(stem); if(!q)return [];
 return items.filter(m=>type==='all'||m.type===type).map(m=>{const title=norm(m.searchTitle??m.title), text=norm(searchable(m)), words=new Set(text.split(' ').map(stem));let score=title.includes(q)?24:0;score+=text.includes(q)?14:0;const keyword=m.type==='dataset'&&(m.tags||[]).some(tag=>norm(tag)===q);if(keyword)score+=20;let matches=0;qt.forEach((t,i)=>{if(words.has(t)||text.includes(tokens[i])){score+=4;matches++}});Object.entries(aliases).forEach(([key,vs])=>{if(q.includes(key)&&vs.some(x=>text.includes(x)))score+=3});if(matches<qt.length&&qt.length>1)score*=matches/qt.length;return {...m,score,reason:title.includes(q)?'Совпадение в названии':keyword?'Совпадение по ключевым словам набора':text.includes(q)?'Точное совпадение в тексте или данных':'Совпадение по словам и форме запроса'};}).filter(x=>x.score>2).sort((a,b)=>b.score-a.score).slice(0,30);
}
export const fmt=(n,d=1)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:d}).format(Number(n));
export const signed=n=>(Number(n)>0?'+':'')+fmt(n)+'%';
export function sportScenario(percent){const loss=70.2*percent/100;return {loss,growth:loss/9.2*100,target:9.2+loss}}
export const metrics=['Потребление электроэнергии','Максимальная нагрузка','Установленная мощность'];
export function buildSearchIndex(corpus,news=[]){
 const index=[];
 for(const m of corpus.materials){index.push(m);for(const s of m.sections||[])index.push({...m,tags:[],topics:[],searchTitle:s.title,id:m.id+'--'+s.id,materialId:m.id,title:m.title+' · '+s.title,summary:s.text,sections:[],datasets:[],keyMetrics:[],sourceHref:s.sourceHref,sourcePage:s.sourcePage,sectionId:s.id});}
 for(const p of corpus.pdfPages||[]){const m=corpus.materials.find(m=>m.id===(p.materialId||p.reportId));if(m)index.push({...m,tags:[],topics:[],searchTitle:'',id:m.id+'--pdf'+p.page+'-'+p.sourceHref,materialId:m.id,title:m.title,summary:[...new Set([p.text?.trim(),p.ocrText?.trim()].filter(Boolean))].join(' '),sections:[],datasets:[],keyMetrics:[],page:p.page,sourceHref:p.sourceHref,ocr:!!p.ocrText});}
 for(const p of corpus.projects||[])index.push({...p,type:'project',format:'project',summary:p.legacyTitle||p.title,sections:[],datasets:[],keyMetrics:[]});
 for(const item of news)index.push({...item,type:'news',sections:[{title:'',text:item.body.join(' ')}]});
 return index;
}
export function csvRows(regions,metric){return '\ufeff'+[['Территория','Показатель','Изменение, %','База прогноза','Горизонт'],...regions.map(r=>[r.name,metrics[metric],r.values[metric],2025,2031])].map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\r\n')}
