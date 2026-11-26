import {esc as e, fmt} from './lib.mjs';
import {budgetData, budgetSource, mapData, budgetMap, budgetLegend} from './regional-budgets.mjs';

const maxBytes = 2 * 1024 * 1024;
const maxRows = 5000;
const statuses = {actual:'Факт', forecast:'Прогноз', estimate:'Оценка', missing:'Пропуск'};
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
const sourceUrl = value => typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value);
let current;

export function validateGeoPackage(data) {
  const p = data?.passport;
  if (data?.schemaVersion !== 1) throw Error('Поддерживается только schemaVersion 1.');
  if (!id(p?.id) || ![p.title,p.version,p.description,p.source].every(text))
    throw Error('В паспорте нужны id, title, version, description и source.');
  if (p.sourceUrl !== undefined && !sourceUrl(p.sourceUrl)) throw Error('Ссылка на источник должна начинаться с https://.');
  if (!Array.isArray(data.series) || !data.series.length || data.series.length > maxRows ||
      !Array.isArray(data.observations) || !data.observations.length || data.observations.length > maxRows)
    throw Error('Пакет должен содержать от 1 до 5000 рядов и от 1 до 5000 наблюдений.');
  const series = new Map();
  for (const [index,s] of data.series.entries()) {
    if (!id(s?.id) || ![s.label,s.indicator,s.unit].every(text) || series.has(s.id))
      throw Error('Ряд '+(index+1)+'. Проверьте id, label, indicator, unit и уникальность id.');
    if (s.regionCode !== undefined && (!Number.isSafeInteger(s.regionCode) || s.regionCode <= 0 || s.unit !== 'млрд ₽'))
      throw Error('Ряд '+s.id+'. Для пробной карты укажите положительный cartodb_id и единицу «млрд ₽».');
    series.set(s.id,s);
  }
  const keys = new Set();
  for (const [index,o] of data.observations.entries()) {
    const location = 'Наблюдение '+(index+1)+'. ';
    if (!series.has(o?.seriesId) || !text(o.period) || !Object.hasOwn(statuses,o.status))
      throw Error(location+'Проверьте ссылку на ряд, период и статус значения.');
    const key = JSON.stringify([o.seriesId,o.period]);
    if (keys.has(key)) throw Error(location+'Повтор ключа «ряд и период».');
    keys.add(key);
    const interval = o.lower !== undefined || o.upper !== undefined;
    const validInterval = interval && o.status==='estimate' && Number.isFinite(o.lower) && Number.isFinite(o.upper) &&
      o.lower <= o.upper && (o.value === null || o.value >= o.lower && o.value <= o.upper);
    const validValue = o.status==='missing' ? o.value === null : Number.isFinite(o.value) || o.value === null && validInterval;
    if (!validValue || interval && !validInterval || [o.note,o.sourceLocator].some(value=>value!==undefined&&!text(value)))
      throw Error(location+'Проверьте число, границы оценки и примечания.');
  }
  return data;
}

async function example(name) {
  if (name==='sport') return {
    schemaVersion:1,
    passport:{id:'sport-example',title:'Экономика спорта · демонстрационный срез',version:'1',
      description:'Условный ряд для проверки интервалов, пропуска и нуля. Значения не предназначены для аналитики.',
      source:'Условные тестовые данные'},
    series:[{id:'attendance',label:'Посещаемость мероприятий',indicator:'Число посещений',unit:'чел.'}],
    observations:[
      {seriesId:'attendance',period:'2023',status:'estimate',value:null,lower:100,upper:150,note:'Условная интервальная оценка'},
      {seriesId:'attendance',period:'2024',status:'missing',value:null},
      {seriesId:'attendance',period:'2025',status:'actual',value:0}
    ]
  };
  const regions = new Map([['Московская область',23],['Сахалинская область',11]]);
  const rows = (await budgetData('2025')).filter(row=>regions.has(row.name));
  return {
    schemaVersion:1,
    passport:{id:'budget-example',title:'Бюджеты регионов · январь–декабрь 2025',version:'1',
      description:'Открытый срез расходов. Геометрия соответствует слою регионов сайта.',
      source:'АТРЭ ГеоЭкономика',sourceUrl:budgetSource},
    series:rows.map(row=>({id:row.id,label:row.name,indicator:'Расходы бюджета',unit:'млрд ₽',
      regionCode:regions.get(row.name)})),
    observations:rows.map(row=>({seriesId:row.id,period:'Январь–декабрь 2025',
      value:row.expenses,status:Number.isFinite(row.expenses)?'actual':'missing'}))
  };
}

function download(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const link = Object.assign(document.createElement('a'),{href:url,download:data.passport.id+'.json'});
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function observationTable(rows) {
  return `<div class="table-scroll"><table><thead><tr>${['Ряд','Показатель','Период','Значение','Интервал','Единица','Статус','Источник и оговорки']
    .map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(({row,series})=>{
      const value = row.value===null ? '—' : fmt(row.value,6);
      const interval = row.lower===undefined ? '—' : fmt(row.lower,6)+'–'+fmt(row.upper,6);
      return '<tr>'+[series.label,series.indicator,row.period,value,interval,series.unit,statuses[row.status],
        [row.sourceLocator,row.note].filter(Boolean).join(' · ')||'—'].map(v=>'<td>'+e(v)+'</td>').join('')+'</tr>';
    }).join('')}</tbody></table></div>`;
}

function drawWorkspace(host, data, geometry) {
  const p = data.passport;
  const series = new Map(data.series.map(s=>[s.id,s]));
  const periods = [...new Set(data.observations.map(o=>o.period))];
  const option = (value,label)=>`<option value="${e(value)}">${e(label)}</option>`;
  host.innerHTML = `<section class="geo-panel">
    <h2>${e(p.title)}</h2><p>${e(p.description)}</p>
    <details><summary>Паспорт набора</summary><p>Код ${e(p.id)} · версия ${e(p.version)} · рядов ${data.series.length} · наблюдений ${data.observations.length}</p>
    <p>Источник · ${p.sourceUrl?`<a href="${e(p.sourceUrl)}" rel="noopener noreferrer" target="_blank">${e(p.source)}</a>`:e(p.source)}</p></details>
    <div class="geo-fields">
      <label>Ряд<select data-pick-series><option value="">Все ряды</option>${data.series.map(s=>option(s.id,s.label)).join('')}</select></label>
      <label>Период<select data-pick-period><option value="">Все периоды</option>${periods.map(p=>option(p,p)).join('')}</select></label>
      <label>Вид<select data-pick-view><option value="table">Таблица</option><option value="map" disabled>Карта</option></select></label>
    </div><p class="caption" data-slice-status role="status"></p><div data-slice></div>
    <div class="geo-panel-footer"><button type="button" class="button secondary" data-export>Скачать пакет JSON</button></div>
    </section>`;
  const selectedSeries = host.querySelector('[data-pick-series]');
  const period = host.querySelector('[data-pick-period]');
  const view = host.querySelector('[data-pick-view]');
  const output = host.querySelector('[data-slice]');
  const features = new Map((geometry?.features||[]).map(f=>[f.properties.cartodb_id,f]));
  const update = () => {
    const rows = data.observations.filter(o=>(!selectedSeries.value||o.seriesId===selectedSeries.value) &&
      (!period.value||o.period===period.value)).map(row=>({row,series:series.get(row.seriesId)}));
    const mapped = rows.filter(({series})=>features.has(series.regionCode));
    const codes = new Set(mapped.map(({series})=>series.regionCode));
    const indicators = new Set(mapped.map(({series})=>series.indicator));
    const mapAvailable = mapped.length>0 && mapped.length===rows.length && mapped.length===codes.size &&
      indicators.size===1 && new Set(rows.map(({row})=>row.period)).size===1 &&
      rows.every(({row})=>row.lower===undefined) && new Set(rows.map(({row})=>row.status).filter(status=>status!=='missing')).size<=1;
    view.options[1].disabled = !mapAvailable;
    if (!mapAvailable) view.value = 'table';
    host.querySelector('[data-slice-status]').textContent = rows.length+' наблюдений. '+(mapAvailable?
      'Для среза доступна карта.':'Карта требует одного периода и показателя, сопоставимых значений и однозначных кодов границ.');
    if (view.value==='table') {
      output.innerHTML = rows.length ? observationTable(rows) : '<p class="empty">В срезе нет наблюдений.</p>';
      return;
    }
    const mapRows = mapped.map(({row,series})=>({id:series.id,name:features.get(series.regionCode).properties.name,value:row.value}));
    const cap = Math.max(...mapRows.map(row=>Math.abs(row.value??0)),1);
    output.innerHTML = budgetMap(geometry,mapRows,'value',cap)+budgetLegend(cap,mapRows.some(row=>row.value<0));
    output.querySelectorAll('[data-budget-region]').forEach(region=>{
      const show = ()=>{host.querySelector('[data-slice-status]').textContent = region.getAttribute('aria-label');};
      region.addEventListener('click',show);
      region.addEventListener('keydown',event=>{
        if (event.key==='Enter'||event.key===' ') {event.preventDefault();show();}
      });
    });
  };
  host.querySelector('.geo-fields').addEventListener('change',update);
  host.querySelector('[data-export]').onclick = ()=>download(data);
  update();
  if (p.id==='budget-example' && !view.options[1].disabled) {
    view.value = 'map';
    update();
  }
}

export function geoPreviewPage(main, params) {
  const returnTo = params.get('return');
  const back = /^\/geoanalytics(?:\?[^\r\n]*)?$/.test(returnTo||'') ? returnTo : '/geoanalytics';
  main.innerHTML = `<div class="container geoanalytics">
    <header class="page-heading"><div><h1>Пробная версия аналитической платформы</h1>
    <p class="lead">Загрузите пакет с паспортом или откройте пример. Загруженные данные остаются во вкладке до перезагрузки страницы.</p>
    <a class="button secondary" href="#${e(back)}">← Вернуться к прежней версии</a></div></header>
    <section class="geo-panel"><h2>Загрузить набор</h2>
    <div class="geo-fields"><label>Файл JSON до 2 МБ<input data-file type="file" accept=".json,application/json"></label></div>
    <div class="actions">
      <button type="button" class="button secondary" data-example="budget">Пример бюджета</button>
      <button type="button" class="button secondary" data-example="sport">Пример по спорту</button>
      <button type="button" class="button secondary" data-clear>Убрать набор</button>
    </div><p class="caption" data-import-status role="status"></p></section>
    <div data-preview-workspace class="geo-workspace"></div></div>`;
  const root = main.firstElementChild;
  const host = root.querySelector('[data-preview-workspace]');
  const input = root.querySelector('[data-file]');
  const status = root.querySelector('[data-import-status]');
  const clear = root.querySelector('[data-clear]');
  let operation = 0;
  let geometry;
  const show = ()=>{
    clear.disabled = !current;
    if (current) drawWorkspace(host,current,geometry);
    else host.replaceChildren();
  };
  const load = async read=>{
    const request = ++operation;
    status.textContent = 'Проверяем пакет…';
    try {
      const data = validateGeoPackage(await read());
      if (data.series.some(s=>s.regionCode!==undefined)) geometry ||= await mapData();
      if (!root.isConnected || request!==operation) return;
      current = data;
      status.textContent = 'Пакет принят.'+(data.series.some(s=>s.regionCode!==undefined &&
        !geometry?.features.some(f=>f.properties.cartodb_id===s.regionCode))?' Часть кодов границ недоступна.':'');
      show();
    } catch (error) {
      if (root.isConnected && request===operation)
        status.textContent = error instanceof SyntaxError ? 'Файл содержит некорректный JSON.' : error.message;
    }
  };
  input.onchange = ()=>{
    const file = input.files[0];
    input.value = '';
    if (file) void load(async ()=>{
      if (file.size>maxBytes) throw Error('Файл больше 2 МБ.');
      return JSON.parse(await file.text());
    });
  };
  root.querySelectorAll('[data-example]').forEach(button=>button.onclick=()=>void load(()=>example(button.dataset.example)));
  clear.onclick = ()=>{
    operation++;
    current = undefined;
    status.textContent = 'Набор убран.';
    show();
  };
  show();
  if (current?.series.some(s=>s.regionCode!==undefined)) {
    const request = operation;
    void mapData().then(result=>{
      if (root.isConnected && request===operation && result) {geometry = result;show();}
    });
  }
}
