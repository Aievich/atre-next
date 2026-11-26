import {norm} from './lib.mjs';

const clean = s => String(s || '').normalize('NFKC').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const destinations = [
  [/^(?:на )?главн(?:ая|ую)(?: страниц[ау])?$/, '/', 'Главная'],
  [/^(?:для сми|сми|пресс-служба|пресс служба)$/, '/media', 'Для СМИ'],
  [/^(?:об атрэ|о компании|о нас)$/, '/about', 'Об АТРЭ'],
  [/^(?:геоэкономика|бюджеты регионов)$/, '/atlas?layer=regional-budgets', 'Бюджеты регионов'],
  [/^(?:аналитическ(?:ая|ую) платформ[ау]|геоаналитик[ау])(?: атрэ)?$/, '/geoanalytics', 'Аналитическая платформа'],
  [/^(?:новости|лента новостей)$/, '/news', 'Новости'],
  [/^актуальное$/, '/?section=actual', 'Актуальное'],
  [/^(?:каталог(?: исследований| публикаций)?|исследования|публикации|доклады)$/, '/studies', 'Исследования'],
  [/^(?:атлас(?: данных)?|карт[ау])$/, '/atlas', 'Аналитическая платформа'],
  [/^конструктор(?: данных)?$/, '/constructor', 'Аналитическая платформа'],
  [/^(?:проект[ыа]|проектный опыт)$/, '/about/projects', 'Проектный опыт'],
  [/^(?:наша команда|команд[ау](?: атрэ)?)$/, '/about/team', 'Команда АТРЭ'],
  [/^(?:клиенты и партн[её]ры|партн[её]ры атрэ)$/, '/about/partners', 'Клиенты и партнёры'],
  [/^(?:консалтинг|направления)$/, '/topics', 'Консалтинг'],
  [/^практики(?: атрэ)?$/, '/topics', 'Практики АТРЭ'],
  [/^(?:секторы|отрасли)(?: атрэ)?$/, '/topics?view=sectors', 'Секторы'],
  [/^темы исследований$/, '/topics?view=themes', 'Темы исследований'],
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
const atlasViews = new Map([['карта','map'],['карту','map'],['рейтинг','rank'],['таблица','table'],['таблицу','table'],['график','chart']]);
const accessTypes = new Map([['все наборы',''],['открытые','open'],['платные','paid']]);
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

function parseVoiceFilter(nav, {topics = [], layers = [], sectors = [], practices = []} = {}) {
  const catalog = values => ({kind:'filter',route:'/studies',values,label:'Фильтры исследований'});
  const atlas = values => ({kind:'filter',route:'/atlas',values,label:'Фильтры атласа'});
  const geo = values => ({...atlas(values),route:'/geoanalytics',label:'Фильтры аналитической платформы'});
  if (/^сбрось(?:те)? фильтры (?:аналитической платформы|геоаналитики)$/u.test(nav)) return {...geo({}),reset:true};
  if (/^сбрось(?:те)? фильтры атласа$/u.test(nav)) return {...atlas({}),reset:true};
  if (/^сбрось(?:те)? фильтры(?: исследований| каталога)?$/u.test(nav)) {
    return {...catalog({}),reset:true,currentSection:nav.endsWith('фильтры')};
  }
  const phrase = nav.replace(/^(?:установи(?:те)?|выбери(?:те)?|примени(?:те)?|фильтр по)\s+/u,'');
  const setting = phrase.match(/^(формат|отрасль|сектор|направление|тема|практика|доступ|ключевое слово|набор данных|набор|период|база сравнения|слой данных|слой|показатель|представление|вид|фильтр строк)\s*[:—-]?\s+(.+)$/u);
  if (setting) {
    const [,field,value] = setting;
    const key = norm(value);
    if (field==='формат' && catalogFormats.has(key)) return catalog({format:catalogFormats.get(key)});
    if (field==='направление'||field==='тема') {
      if (['все направления','все темы'].includes(key)) return {...catalog({topic:''}),currentSection:true};
      const topic = topics.find(item => [item.short,item.title,item.name].some(name => norm(name)===key));
      if (topic) return {...catalog({topic:topic.id}),currentSection:true};
    }
    if (field==='отрасль'||field==='сектор') {
      if (['все отрасли','все секторы'].includes(key)) return {...catalog({sector:''}),currentSection:true};
      const sector = sectors.find(([id,title])=>norm(title)===key||(id==='government'&&key==='государство'));
      if (sector) return {...catalog({sector:sector[0]}),currentSection:true};
    }
    if (field==='практика') {
      const practice = practices.find(item=>norm(item.title)===key);
      if (practice||key==='все практики') return {kind:'filter',route:'/about/projects',values:{practice:practice?.id||''},label:'Фильтры проектов'};
    }
    if (field==='доступ' && accessTypes.has(key)) return geo({access:accessTypes.get(key)});
    if (field==='ключевое слово') return catalog({query:value});
    const availableLayers = typeof layers==='function' ? layers() : layers;
    if (field==='фильтр строк') return {...geo({filter:key==='все строки'?'':value}),layers:availableLayers};
    if (field==='период'||field==='база сравнения') return {...geo({}),periodName:key.replace(/^(\d{4}) год[ау]?$/,'$1'),layers:availableLayers};
    if (['слой','слой данных','набор','набор данных'].includes(field)) {
      const titles = availableLayers.filter(item=>norm(item.title)===key);
      const matches = titles.length ? titles : availableLayers.filter(item=>(item.aliases||[]).some(name=>norm(name)===key));
      if (matches.length===1) return {...atlas({layer:matches[0].id}),layers:availableLayers};
    }
    if (field==='показатель') return {...atlas({}),metricName:key,layers:availableLayers};
    if (atlasViews.has(key) && (field==='представление'||field==='вид')) return {...atlas({view:atlasViews.get(key)}),layers:availableLayers};
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
  if(mode==='navigate') return {kind:'unknown',label:'Не удалось определить раздел. Укажите его название, например «Аналитическая платформа».'};
  const search=text.match(/^(?:найди(?:те)?|найти|ищи|поиск(?: по материалам)?|поищи)\s*[:—-]?\s+(.+)$/iu);
  if(search){
    const inNews=search[1].match(/^(?:новость|новости|в новостях)\s+(?:про |о |об )?(.+)$/iu);
    const inDatasets=search[1].match(/^(?:в наборах данных|набор(?: данных)?|наборы данных)\s+(?:про |о |об )?(.+)$/iu);
    if (inNews) return {kind:'search',query:inNews[1],type:'news',label:'Поиск по новостям'};
    if (inDatasets) return {kind:'search',query:inDatasets[1],type:'dataset',label:'Поиск по наборам данных'};
    return {kind:'search',query:search[1],label:'Поиск по материалам'};
  }
  const ask=text.match(/^(?:спроси(?:ть)?(?: у)? (?:атрэ|помощника)|помощник[,:]?|вопрос помощнику|задай вопрос(?: помощнику)?)\s*[:—-]?\s+(.+)$/iu);
  if(ask) return {kind:'assistant',query:ask[1],label:'Вопрос помощнику'};
  return {kind:'unknown',label:'Команда не распознана. Скажите «Открой новости», «Покажи тег …» или «Найди …».'};
}

export function commandHash(command,currentHash='') {
  if(command.kind==='filter') {
    const [page,query] = currentHash.slice(1).split('?');
    if (command.route==='/geoanalytics' || (page==='/geoanalytics'&&command.currentSection) || (command.route==='/atlas'&&page!=='/atlas')) {
      const next = new URLSearchParams(page==='/geoanalytics'&&!command.reset ? query : '');
      const values = {...command.values};
      if (values.layer) {
        const id = values.layer==='cod' ? 'territories' : values.layer;
        const layer = command.layers.find(item=>item.id===values.layer);
        if (layer?.access && next.get('access') && next.get('access')!==layer.access) next.delete('access');
        for (const field of ['sector','topic']) {
          if (layer?.matchesScope && !layer.matchesScope({[field]:next.get(field)})) next.delete(field);
        }
        if (next.get('dataset')!==id) {
          for (const key of ['columns','period','filter','view','regions','compare','focus','budgetRegion']) next.delete(key);
        }
        values.dataset = id;
        delete values.layer;
      }
      const id = next.get('dataset') || 'regional-budgets';
      const layer = command.layers?.find(item=>item.id===(id==='territories'?'cod':id));
      if (layer?.access==='paid' && (values.view || 'filter' in values)) return null;
      if (command.metricName) {
        const metric = layer?.metrics.find(item=>norm(item.label)===command.metricName);
        if (!metric) return null;
        values.columns = layer.id==='cod' ? ['cons','peak','cap'][Number(metric.value)] : metric.value;
      }
      if (command.periodName) {
        const period = layer?.periods?.find(([value,label])=>norm(value)===command.periodName||norm(label)===command.periodName);
        if (!period) return null;
        values.period = period[0];
      }
      if (values.view==='rank') values.view='chart';
      if (values.view && layer?.views && !layer.views.includes(values.view)) return null;
      if (values.dataset && values.dataset===next.get('beside')) {
        next.delete('beside');
        for (const key of ['columns','period','filter','view']) next.delete('beside-'+key);
      }
      for (const [key,value] of Object.entries(values)) {
        if (value) next.set(key,value); else next.delete(key);
      }
      return '#/geoanalytics'+(next.size?'?'+next:'');
    }
    const route = command.currentSection && ['/atlas','/about/projects'].includes(page) ? page : command.route;
    const params = new URLSearchParams(page===route && !command.reset ? query : '');
    const values = {...command.values};
    if (route==='/about/projects') params.delete('page');
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
  if(command.kind==='search') {
    const [page,query]=currentHash.split('?');
    const active=page==='#/search' ? new URLSearchParams(query).get('type') : '';
    const type=command.type || active;
    return '#/search?q='+encodeURIComponent(command.query)+
      (['dataset','news','project','monitoring','report'].includes(type)?'&type='+type:'');
  }
  if(command.kind==='assistant') {
    const current=currentHash.replace(/^#/,'');
    const params=current.split('?')[0]==='/assistant'?new URLSearchParams(current.split('?')[1]||''):new URLSearchParams();
    params.delete('mode');
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
