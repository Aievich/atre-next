import {norm} from './lib.mjs';

const clean = s => String(s || '').normalize('NFKC').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const destinations = [
  [/^(?:на )?главн(?:ая|ую)(?: страниц[ау])?$/, '/', 'Главная'],
  [/^(?:новости|лента новостей)$/, '/news', 'Новости'],
  [/^актуальное$/, '/?section=actual', 'Актуальное'],
  [/^(?:каталог(?: исследований| публикаций)?|исследования|публикации|доклады)$/, '/studies', 'Исследования'],
  [/^(?:атлас(?: данных)?|карт[ау])$/, '/atlas', 'Атлас данных'],
  [/^конструктор(?: данных)?$/, '/constructor', 'Конструктор данных'],
  [/^проект[ыа]$/, '/projects', 'Проекты'],
  [/^направления$/, '/topics', 'Направления'],
  [/^(?:помощник[ау]?|спросить атрэ)$/, '/assistant', 'Помощник'],
  [/^(?:поиск)$/, '/search', 'Поиск'],
  [/^(?:клиентам|клиентск(?:ая|ую) зон[ау]|кабинет клиента)$/, '/client', 'Клиентам'],
  [/^(?:сотрудникам|кабинет сотрудника)$/, '/employee', 'Сотрудникам'],
  [/^(?:источники|источники и границы данных)$/, '/sources', 'Источники и границы данных'],
  [/^(?:доклад (?:по |о )?)?(?:цод|центры обработки данных)$/, '/study/cod-2026', 'Доклад о ЦОД'],
  [/^(?:доклад (?:по |о )?)?(?:спорт|спорте)$/, '/study/sport-2026', 'Доклад о спорте'],
  [/^(?:доклад (?:по |о )?)?(?:полимеры|полимерах|полимерам)$/, '/study/polimery-2026', 'Доклад о полимерах']
];

export function createVoiceContentRoutes(materials, articles, filters = {}) {
  const routes = new Map();
  function add(names, route, label) {
    for (const name of names) {
      const key = norm(name);
      if (key) routes.set(key, routes.has(key) && routes.get(key)?.route !== route ? null : {kind:'navigate',route,label});
    }
  }
  for (const item of materials) {
    add([item.title,item.shortTitle], '/study/'+encodeURIComponent(item.id), item.title);
  }
  for (const item of articles) {
    add([item.title,...(item.voiceAliases || [])], '/news/'+encodeURIComponent(item.id), item.title);
  }
  return {
    routes,
    tags: new Map(materials.flatMap(item => (item.tags || []).map(tag => [norm(tag),tag]))),
    filters
  };
}

const catalogFormats = new Map([
  ['pdf','pdf'],['пдф','pdf'],['цифровые доклады','digital'],
  ['мониторинги','monitoring'],['все форматы','']
]);
const atlasViews = new Map([['карта','map'],['карту','map'],['рейтинг','rank'],['таблица','table'],['таблицу','table']]);
const months = 'января февраля марта апреля мая июня июля августа сентября октября ноября декабря'.split(' ');

function voiceDate(text) {
  const numeric = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/u);
  const spoken = text.match(/^(\d{1,2}) ([а-я]+) (\d{4})$/u);
  if (!numeric && !spoken) return '';
  const [,day,month,year] = numeric || spoken;
  const monthNumber = numeric ? Number(month) : months.indexOf(month)+1;
  const iso = [year,String(monthNumber).padStart(2,'0'),day.padStart(2,'0')].join('-');
  const parsed = new Date(iso);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0,10)===iso ? iso : '';
}

function parseVoiceFilter(nav, {topics = [], layers = []} = {}) {
  const catalog = values => ({kind:'filter',route:'/studies',values,label:'Фильтры исследований'});
  const atlas = values => ({kind:'filter',route:'/atlas',values,label:'Фильтры атласа'});
  if (/^сбрось(?:те)? фильтры атласа$/u.test(nav)) return {...atlas({}),reset:true};
  if (/^сбрось(?:те)? фильтры(?: исследований| каталога)?$/u.test(nav)) {
    return {...catalog({}),reset:true,currentSection:nav.endsWith('фильтры')};
  }
  const phrase = nav.replace(/^(?:установи(?:те)?|выбери(?:те)?|примени(?:те)?|фильтр по)\s+/u,'');
  const setting = phrase.match(/^(формат|направление|ключевое слово|слой данных|слой|показатель|представление|вид)\s*[:—-]?\s+(.+)$/u);
  if (setting) {
    const [,field,value] = setting;
    const key = norm(value);
    if (field==='формат' && catalogFormats.has(key)) return catalog({format:catalogFormats.get(key)});
    if (field==='направление') {
      if (key==='все направления') return catalog({topic:''});
      const topic = topics.find(item => [item.short,item.title,item.name].some(name => norm(name)===key));
      if (topic) return catalog({topic:topic.id});
    }
    if (field==='ключевое слово') return catalog({query:value});
    if (field==='слой'||field==='слой данных') {
      const layer = layers.find(item => [item.title,...(item.aliases||[])].some(name => norm(name)===key));
      if (layer) return atlas({layer:layer.id});
    }
    if (field==='показатель') return {...atlas({}),metricName:key, layers};
    if (atlasViews.has(key) && (field==='представление'||field==='вид')) return atlas({view:atlasViews.get(key)});
  }
  const year = phrase.match(/^(?:публикации|доклады|исследования) за (\d{4})(?: год[ау]?)?$/u);
  if (year) return catalog({from:year[1]+'-01-01',to:year[1]+'-12-31'});
  const range = phrase.match(/^(?:даты публикации|дата публикации|период публикации) с (.+?) по (.+)$/u);
  if (range) {
    const from = voiceDate(range[1]), to = voiceDate(range[2]);
    if (from && to && from<=to) return catalog({from,to});
  }
  return null;
}

// Only internal, allowlisted destinations. Unknown global commands never navigate.
export function parseVoiceCommand(input, mode='auto', content) {
  const text=clean(input).replace(/[.!?]+$/,'').trim();
  if(!text) return {kind:'empty',label:'Произнесите или воспользуйтесь текстовым поиском.'};
  if(mode==='search') return {kind:'search',query:text,label:'Поиск по материалам'};
  if(mode==='assistant') return {kind:'assistant',query:text,label:'Вопрос помощнику'};
  const lower=text.toLocaleLowerCase('ru');
  const nav=lower.replace(/^(?:пожалуйста[,]? )?/,'').replace(/^(?:открой(?:те)?|перейди(?:те)?(?: в| на)?|покажи(?:те)?(?: раздел)?|раздел)\s+/,'').replace(/^раздел\s+/,'');
  const filter = parseVoiceFilter(nav,content?.filters);
  if (filter) return filter;
  const target=destinations.find(([pattern])=>pattern.test(nav));
  if(target) return {kind:'navigate',route:target[1],label:target[2]};
  const tagPhrase=nav.match(/^(?:тег|тэг|по тегу|материалы по тегу)\s*[:—-]?\s+(.+)$/u);
  const tag=tagPhrase && content?.tags?.get(norm(tagPhrase[1]));
  if(tag) return {kind:'navigate',route:'/studies?tag='+encodeURIComponent(tag),label:tag};
  const item=content?.routes?.get(norm(nav.replace(/^(?:новость|статью|доклад|публикацию)\s+(?:про |о |об |по )?/,'')));
  if(item) return item;
  if(mode==='navigate') return {kind:'unknown',label:'Не удалось определить раздел. Укажите его название, например «Атлас данных».'};
  const search=text.match(/^(?:найди(?:те)?|найти|ищи|поиск(?: по материалам)?|поищи)\s*[:—-]?\s+(.+)$/iu);
  if(search){
    const inNews=search[1].match(/^(?:новость|новости|в новостях)\s+(?:про |о |об )?(.+)$/iu);
    return inNews ? {kind:'search',query:inNews[1],type:'news',label:'Поиск по новостям'} : {kind:'search',query:search[1],label:'Поиск по материалам'};
  }
  const ask=text.match(/^(?:спроси(?:ть)?(?: у)? (?:атрэ|помощника)|помощник[,:]?|вопрос помощнику|задай вопрос(?: помощнику)?)\s*[:—-]?\s+(.+)$/iu);
  if(ask) return {kind:'assistant',query:ask[1],label:'Вопрос помощнику'};
  return {kind:'unknown',label:'Команда не распознана. Скажите «Открой новости», «Покажи тег …» или «Найди …».'};
}

export function commandHash(command,currentHash='') {
  if(command.kind==='filter') {
    const [page,query] = currentHash.slice(1).split('?');
    const route = command.currentSection && page==='/atlas' ? page : command.route;
    const params = new URLSearchParams(page===route && !command.reset ? query : '');
    const values = {...command.values};
    if (command.metricName) {
      const layer = command.layers.find(item=>item.id===(params.get('layer')||'cod'));
      const metric = layer?.metrics.find(item=>norm(item.label)===command.metricName);
      if (!metric) return null;
      values[layer.id==='cod'?'metric':'column'] = metric.value;
    }
    if (values.layer && values.layer!==(params.get('layer')||'cod')) {
      for (const key of ['column','metric','view','regions','compare','focus']) params.delete(key);
    }
    if (values.view && params.get('layer') && params.get('layer')!=='cod') return null;
    for (const [key,value] of Object.entries(values)) {
      if (value) params.set(key,value); else params.delete(key);
    }
    return '#'+route+(params.size?'?'+params:'');
  }
  if(command.kind==='navigate') {
    if (command.route.startsWith('/studies?tag=') && currentHash.startsWith('#/studies?')) {
      const params = new URLSearchParams(currentHash.split('?')[1]);
      params.set('tag',new URLSearchParams(command.route.split('?')[1]).get('tag'));
      return '#/studies?'+params;
    }
    return '#'+command.route;
  }
  if(command.kind==='search') return '#/search?q='+encodeURIComponent(command.query)+(command.type==='news'?'&type=news':'');
  if(command.kind==='assistant') {
    const current=currentHash.replace(/^#/,'');
    const params=current.split('?')[0]==='/assistant'?new URLSearchParams(current.split('?')[1]||''):new URLSearchParams();
    params.set('question',command.query);
    return '#/assistant?'+params;
  }
  return null;
}

export function recognitionError(code) {
  return ({'not-allowed':'Доступ к микрофону не разрешён. Разрешите его в настройках сайта или введите команду.',
    'service-not-allowed':'Сервис распознавания недоступен в этом браузере. Введите команду или используйте другой браузер.',
    'audio-capture':'Микрофон не найден или занят другим приложением.',
    'network':'Браузер не подключился к сервису распознавания речи. Введите команду ниже или повторите запись. Если ошибка повторяется, попробуйте другой браузер.',
    'no-speech':'Команда не распознана: речь не обнаружена. Нажмите микрофон и попробуйте ещё раз.',
    'language-not-supported':'Распознавание русской речи недоступно в этом браузере.',
    'aborted':'Запись остановлена.'})[code] || 'Не удалось распознать речь. Попробуйте ещё раз или введите команду.';
}

// One recording per explicit start. Stale browser events are ignored after cancellation.
export function createSpeechSession(Recognition,notify,{schedule=setTimeout,cancel=clearTimeout}={}) {
  let current=null,timeout;
  function stop(){const old=current;current=null;cancel(timeout);old?.abort();}
  return {
    start(){
      stop();const rec=new Recognition();current=rec;
      rec.lang='ru-RU';rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=1;
      let final='',interim='',failed=false;
      const active=()=>current===rec;
      rec.onstart=()=>{if(active())notify({state:'listening',text:''});};
      rec.onresult=event=>{
        if(!active())return;
        final='';interim='';
        for(let i=0;i<event.results.length;i++){
          const result=event.results[i];if(result.isFinal)final+=result[0].transcript+' ';else interim+=result[0].transcript+' ';
        }
        notify({state:'listening',text:(final+interim).trim()});
      };
      rec.onerror=event=>{if(active()){failed=true;current=null;cancel(timeout);rec.abort();notify({state:'error',message:recognitionError(event.error)});}};
      rec.onend=()=>{if(!active())return;current=null;cancel(timeout);if(!failed)notify(final.trim()?{state:'ready',text:final.trim()}:{state:'error',message:recognitionError('no-speech')});};
      notify({state:'starting',text:''});
      try{rec.start();if(active())timeout=schedule(()=>{if(active())rec.stop();},20000);}
      catch{current=null;notify({state:'error',message:'Не удалось включить микрофон. Проверьте разрешения браузера или введите команду.'});}
    },
    stop
  };
}
