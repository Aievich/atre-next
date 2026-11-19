const clean = s => String(s || '').normalize('NFKC').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const destinations = [
  [/^(?:на )?главн(?:ая|ую)(?: страниц[ау])?$/, '/', 'Главная'],
  [/^(?:каталог(?: исследований)?|исследования|доклады)$/, '/studies', 'Исследования'],
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

// Only internal, allowlisted destinations. Unknown global commands never navigate.
export function parseVoiceCommand(input, mode='auto') {
  const text=clean(input).replace(/[.!?]+$/,'').trim();
  if(!text) return {kind:'empty',label:'Произнесите или воспользуйтесь текстовым поиском.'};
  if(mode==='search') return {kind:'search',query:text,label:'Поиск по материалам'};
  if(mode==='assistant') return {kind:'assistant',query:text,label:'Вопрос помощнику'};
  const lower=text.toLocaleLowerCase('ru');
  const nav=lower.replace(/^(?:пожалуйста[,]? )?/,'').replace(/^(?:открой(?:те)?|перейди(?:те)?(?: в| на)?|покажи(?:те)?(?: раздел)?|раздел)\s+/,'').replace(/^раздел\s+/,'');
  const target=destinations.find(([pattern])=>pattern.test(nav));
  if(target) return {kind:'navigate',route:target[1],label:target[2]};
  if(mode==='navigate') return {kind:'unknown',label:'Не удалось определить раздел. Укажите его название, например «Атлас данных».'};
  const search=text.match(/^(?:найди(?:те)?|найти|ищи|поиск(?: по материалам)?|поищи)\s*[:—-]?\s+(.+)$/iu);
  if(search) return {kind:'search',query:search[1],label:'Поиск по материалам'};
  const ask=text.match(/^(?:спроси(?:ть)?(?: у)? (?:атрэ|помощника)|помощник[,:]?|вопрос помощнику|задай вопрос(?: помощнику)?)\s*[:—-]?\s+(.+)$/iu);
  if(ask) return {kind:'assistant',query:ask[1],label:'Вопрос помощнику'};
  return {kind:'unknown',label:'Команда не распознана. Скажите «Открой атлас данных», «Найди …» или «Спроси помощника …».'};
}

export function commandHash(command,currentHash='') {
  if(command.kind==='navigate') return '#'+command.route;
  if(command.kind==='search') return '#/search?q='+encodeURIComponent(command.query);
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
    'network':'Не удалось подключиться к сервису распознавания. Проверьте соединение или введите команду.',
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
      rec.onerror=event=>{if(active()){failed=true;notify({state:'error',message:recognitionError(event.error)});}};
      rec.onend=()=>{if(!active())return;current=null;cancel(timeout);if(!failed)notify(final.trim()?{state:'ready',text:final.trim()}:{state:'error',message:recognitionError('no-speech')});};
      notify({state:'starting',text:''});
      try{rec.start();if(active())timeout=schedule(()=>{if(active())rec.stop();},20000);}
      catch{current=null;notify({state:'error',message:'Не удалось включить микрофон. Проверьте разрешения браузера или введите команду.'});}
    },
    stop
  };
}
