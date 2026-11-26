import {datasetCsv,datasetPeriodColumn,datasets,geoCode,numericColumns,rowsFor,saveFile,summary} from './annotations.mjs';
import {canonicalDataset,exportDataset,externalSources} from './data-model.mjs';
import {geographicMap} from './geo-experience.mjs';
import {esc as e,fmt} from './lib.mjs';
import {budgetData,budgetLegend,budgetMap,budgetMetrics,budgetPeriods,budgetSource,budgetValue,mapData} from './regional-budgets.mjs';
import {matchesTaxonomy,taxonomyFields} from './taxonomy.mjs';
import {demoInvestmentDataset,demoSubscriptionActive,investmentId} from './demo-subscription.mjs';

export const geoRoute = '/geoanalytics';
const budget = {id:'regional-budgets', title:'Бюджеты регионов', materialTitle:'АТРЭ ГеоЭкономика', access:'open'};
const lockedHint = 'Набор откроется после покупки демонстрационной подписки в клиентской зоне.';
const lockIcon = '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/></svg>';
const mapHint = 'Данные можно отобразить на карте.';
const mapIcon = '<svg class="geo-map-icon" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/></svg>';
const oldMetrics = ['cons','peak','cap'];
const fields = ['columns','period','filter','view'];
const views = [['map','Карта'],['chart','График'],['table','Таблица']];
const budgetBins = [100,250,500,1000];

const datasetKeywords = {
  territories:['ЦОД','центры обработки данных','потребление электроэнергии','максимальная нагрузка','установленная мощность','федеральные округа'],
  'regional-budgets':['геоэкономика','федеральное казначейство','региональные финансы','бюджеты субъектов РФ'],
  'sport-spending':['расходы на спорт','форма 1-ФК','Минспорт'],
  'polymers-countries-2024':['полимеры','полимеры по странам','мировой рынок полимеров','крупнотоннажные полимеры','производство полимеров'],
  'kz-price-indices':['цены в Казахстане','инфляция','табачные изделия'],
  'ru-cigarettes-2026':['сигареты в России','табачные изделия','выпуск сигарет','ЕМИСС'],
  'tobacco-countries-h1-2026':['сигареты в России и Казахстане','табачные изделия','Россия и Казахстан']
};

const catalogIds = new Set(['regional-budgets','territories','polymers-countries-2024',
  'kz-price-indices','ru-cigarettes-2026','tobacco-countries-h1-2026',investmentId]);

function workspaceDatasets(C, subscribed = false) {
  return [budget,...datasets(C),demoInvestmentDataset(subscribed)];
}

function datasetPeriods(d) {
  const label = datasetPeriodColumn(d);
  return label ? [...new Set(d.rows.map(row=>row[label]).filter(x=>x!=null).map(String))].map(x=>[x,x]) : [];
}

function datasetViews(d, columns) {
  return views.filter(([id])=>id==='table' || (columns.length && (id==='chart'||hasMap(d))));
}

export function geoVoiceLayers(C, legacyNames = []) {
  return workspaceDatasets(C,demoSubscriptionActive()).map(d=>{
    const budgetSet = isBudget(d);
    const columns = budgetSet ? budgetMetrics.map(([name,label])=>({name,label})) : numericColumns(d);
    const legacyId = d.id==='territories' ? 'cod' : d.id;
    const periods = budgetSet ? Object.entries(budgetPeriods) : datasetPeriods(d);
    return {
      id:legacyId,title:d.title,aliases:[legacyNames.find(([id])=>id===legacyId)?.[1],...(datasetKeywords[d.id]||[]),
        ...(legacyId==='cod'?['энергетика']:[])].filter(Boolean),
      metrics:columns.map(({name,label},i)=>({label,value:legacyId==='cod'?String(i):name})),
      views:datasetViews(d,columns).map(([id])=>id),
      periods:periods.length&&!budgetSet ? [...periods,['all','Все периоды'],...(datasetPeriodColumn(d)==='base'?[['all','Все базы']]:[])] : periods,
      access:d.access||'open',
      matchesScope: scope=>matchesTaxonomy(C,d,scope)
    };
  });
}

export function geoDatasetSearchEntries(C) {
  return workspaceDatasets(C).filter(item=>catalogIds.has(item.id)).map(item=>{
    const columns=item.id===budget.id ? budgetMetrics.map(([,label])=>label) : item.columns.map(column=>column.label);
    const names=item.id==='territories' ? C.atlas.territories.flatMap(territory=>[territory.name,territory.short]) : [];
    return {
      id:item.id,type:'dataset',title:item.title,
      href:'#'+geoRoute+'?'+new URLSearchParams({dataset:item.id}),
      tags:[...(datasetKeywords[item.id]||[]),...columns,...names],
      summary:[item.coverage,columns.join(', ')].filter(Boolean).join(' · ')
    };
  });
}

export function workspaceParams(route, input) {
  const params = new URLSearchParams(input);
  if (route === '/atlas') {
    const layer = params.get('layer');
    params.set('dataset', !layer || layer==='cod' ? 'territories' : layer);
    const metric = params.get('budgetMetric') || params.get('column') || (!layer||layer==='cod' ? oldMetrics[Number(params.get('metric'))] : '');
    if (metric) params.set('columns',metric);
    params.set('view',params.get('view')==='rank' ? 'chart' : params.get('view') || 'map');
    for (const key of ['layer','metric','column','budgetMetric']) params.delete(key);
  }
  if (route === '/constructor') {
    params.set('dataset',canonicalDataset(params.get('dataset')) || 'territories');
    if (!params.has('view')) params.set('view','table');
  }
  return params;
}

const isBudget = d => d.id===budget.id;
const isOpen = d => d.access==='open';
const hasMap = d => isBudget(d) || Boolean(geoCode(d));
function datasetCard(d,selected) {
  const open = isOpen(d);
  const cardId = 'geo-dataset-'+d.id;
  const hint = !open ? lockedHint : hasMap(d) ? mapHint : '';
  const status = !open ? 'Платный · пример' : d.id===investmentId ? 'Открыт по демоподписке' : 'Открытый';
  return `<button type="button" id="${e(cardId)}" data-geo-dataset="${e(d.id)}" aria-pressed="${selected}"${hint?` aria-describedby="${e(cardId)}-hint"`:''}>
    <strong>${open?'':lockIcon}${e(d.title)}</strong>
    <small class="geo-card-status">${status}${hint===mapHint?mapIcon:''}</small>
    ${hint?`<small id="${e(cardId)}-hint" class="geo-dataset-tip${hint===mapHint?' geo-map-tip':''}" role="tooltip">${hint}</small>`:''}</button>`;
}
const paramKey = (side,key) => side ? 'beside-'+key : key;
const set = (params,key,value) => value ? params.set(key,value) : params.delete(key);
const option = (value,label,current) => `<option value="${e(value)}"${value===current?' selected':''}>${e(label)}</option>`;
const source = (href,label) => `<a class="source" href="${e(href)}"${/^https?:|\.pdf(?:#|$)/.test(href)?' target="_blank" rel="noopener noreferrer"':''}>${e(label)} ↗</a>`;

function budgetDataset(input,year) {
  const budgetFields = [...budgetMetrics,...new Set(input.flatMap(row=>Object.keys(row.sectors||{})))].map(item=>
    typeof item==='string' ? ['sector:'+item,item] : item);
  const columns = [{name:'name',label:'Регион',type:'text'},...budgetFields.map(([name,label])=>({name,label,type:'number',unit:'млрд ₽',decimals:3}))];
  const rows = input.map(row=>({id:row.id,name:row.name,...Object.fromEntries(budgetFields.map(([key])=>[key,budgetValue(row,key)]))}));
  return {...budget,columns,rows,input,year,coverage:budgetPeriods[year],sourceHref:budgetSource,
    limitations:['2025 год — 12 месяцев, 2026 год — 9 месяцев. Периоды показываются отдельно. Территории без сопоставимой границы доступны в таблице.']};
}

export function workspaceSlice(d,params,side,territories) {
  const value = key => params.get(paramKey(side,key)) || '';
  const label = datasetPeriodColumn(d);
  const periods = isBudget(d) ? Object.entries(budgetPeriods) : datasetPeriods(d);
  const allColumns = numericColumns(d);
  const chosen = value('columns').split(',');
  const columns = allColumns.filter(col=>chosen.includes(col.name));
  const selected = columns.length ? columns : allColumns.slice(0,1);
  const filter = value('filter');
  const ids = params.get('regions')?.split(',');
  const visible = !side && d.id==='territories' && ids ?
    territories.filter(t=>ids.includes(t.id)) : null;
  const names = visible && new Set(visible.flatMap(t=>[t.name,t.short]));
  const supported = datasetViews(d,selected);
  const view = supported.some(([id])=>id===value('view')) ? value('view') : supported[0][0];
  const defaultPeriod = view==='map' && !d.geo && !isBudget(d) && !filter && !params.has(paramKey(side,'period')) ?
    (label==='base'?periods[0]:periods.at(-1))?.[0] || '' : '';
  const period = isBudget(d) ? d.year : periods.some(([id])=>id===value('period')) ? value('period') : defaultPeriod;
  const rows = rowsFor(d,filter,isBudget(d)?'':period).filter(row=>!names || names.has(row.name));
  return {label,periods,period,allColumns,columns:selected,filter,rows,supported,view,visible};
}

function table(d, {rows,columns}) {
  const shown = [...d.columns.filter(c=>c.type!=='number'||c.name==='year'),...columns];
  return `<div class="table-scroll"><table aria-label="${e(d.title)}"><thead><tr>${shown.map(c=>`<th scope="col">${e(c.label)}${c.unit?' · '+e(c.unit):''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(row=>`<tr>${shown.map(c=>`<td>${e(Number.isFinite(row[c.name])?fmt(row[c.name],c.decimals??(c.name==='year'?0:1)):row[c.name]??'Нет данных')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function chart(d, {rows,columns,label}) {
  const dimension = d.columns.find(c=>c.type!=='number'&&c.name!==label)?.name || label;
  return columns.map(c=>{
    const numeric = rows.filter(row=>Number.isFinite(row[c.name]));
    const extent = Math.max(...numeric.map(row=>Math.abs(row[c.name])),0) || 1;
    const diverging = numeric.some(row=>row[c.name]<0);
    const visible = isBudget(d) ? [...numeric].sort((a,b)=>Math.abs(b[c.name])-Math.abs(a[c.name])).slice(0,12) : numeric;
    return `<section class="geo-series"><h3>${e(c.label)} <small>${e(c.unit||'')}</small></h3>
      ${isBudget(d)&&numeric.length>12?'<p class="caption">12 регионов с наибольшими абсолютными значениями. Все значения доступны в таблице.</p>':''}
      ${visible.map(row=>{
        const key = [row[dimension],label!==dimension?row[label]:null].filter(x=>x!=null).join(' · ');
        const current = row[c.name];
        const width = Math.abs(current)/extent*(diverging?50:100);
        const start = diverging ? current<0 ? 50-width : 50 : 0;
        return `<div class="geo-bar"><span>${e(key||'Наблюдение '+(rows.indexOf(row)+1))}</span>
          <div class="geo-bar-track${diverging?' diverging':''}" aria-hidden="true"><i style="--start:${start}%;--width:${width}%" class="${current<0?'negative':''}"></i></div>
          <strong>${fmt(current,c.decimals??1)}</strong></div>`;
      }).join('') || '<p class="empty">В этом срезе нет числовых значений.</p>'}</section>`;
  }).join('');
}

function mapLegend(max,unit,negative=false) {
  return `<div class="geo-map-key"><span>0</span><i aria-hidden="true"></i><span>${fmt(max,3)} ${e(unit||'')}</span>
    ${negative?'<span>Тёплый цвет — отрицательное значение</span>':''}<span>Серый — нет значения в срезе</span></div>`;
}

function territorialMap(G, territories, rows, column) {
  const d3 = window.d3;
  const outline = G.features.find(f=>f.properties.code==='RUS');
  if (!d3 || !outline) return '<p class="empty">Границы карты недоступны.</p>';
  const projection = d3.geoAzimuthalEquidistant().rotate([-100,-63]).fitExtent([[18,16],[852,430]],outline);
  const path = d3.geoPath(projection);
  const values = new Map(rows.map(row=>[row.name,row[column.name]]));
  const valueFor = territory=>values.get(territory.name) ?? values.get(territory.short);
  const maximum = Math.max(0,...rows.filter(row=>Number.isFinite(row[column.name])).map(row=>Math.abs(row[column.name])));
  return `<svg class="geo-territory-map" viewBox="0 0 880 450" aria-label="Прогноз для пяти территорий">
    <path class="geo-outline" d="${path(outline)}"/>
    ${territories.filter(t=>Number.isFinite(valueFor(t))).map(t=>{
      const [x,y] = projection(t.coordinates);
      const n = valueFor(t);
      const label = t.short+': '+fmt(n,column.decimals??1)+' '+column.unit;
      const opacity = maximum ? .35+.65*Math.abs(n)/maximum : .35;
      return `<circle role="button" tabindex="0" class="${n<0?'negative':''}" cx="${x}" cy="${y}" r="11" style="opacity:${opacity}" data-map-value="${e(label)}" aria-label="${e(label)}"><title>${e(label)}</title></circle>`;
    }).join('')}</svg>${mapLegend(maximum,column.unit,rows.some(row=>row[column.name]<0))}
    <p class="caption">Условные точки территорий прогноза. Границы округов и расположение ЦОД не показаны. Геометрия: Natural Earth.</p>`;
}

async function mapView(G, territories, d, slice) {
  const {rows,columns:[column]} = slice;
  if (isBudget(d)) {
    const ids = new Set(rows.map(row=>row.id));
    const sourceRows = d.input.filter(row=>ids.has(row.id));
    const max = Math.max(0,...rows.filter(row=>Number.isFinite(row[column.name])).map(row=>Math.abs(row[column.name])));
    const geo = await mapData();
    return budgetMap(geo,sourceRows,column.name,max||1,budgetBins)+
      (geo ? budgetLegend(max,rows.some(row=>row[column.name]<0),budgetBins)+
        `<p class="caption">${source('https://github.com/codeforgermany/click_that_hood/blob/main/public/data/russia.geojson','Границы Click That ’Hood')}</p>` : '');
  }
  if (d.id==='territories') return territorialMap(G,territories,rows,column);
  const code = geoCode(d);
  if (!d.geo && rows.length!==1) return '<p class="empty">Выберите один период или одну строку, чтобы отобразить значение на уровне страны.</p>';
  const plotted = rows.filter(row=>Number.isFinite(row[column.name])).map(row=>d.geo?row:{...row,geoCode:code,name:code==='RUS'?'Россия':'Казахстан'});
  if (!plotted.some(row=>row.geoCode)) return '<p class="empty">В срезе нет значений с сопоставимой географией.</p>';
  const max = Math.max(0,...plotted.filter(row=>row.geoCode).map(row=>row[column.name]));
  return geographicMap(G,{...d,rows:plotted},column)+mapLegend(max,column.unit)+
    (!d.geo?'<p class="caption">Значение относится к стране целиком.</p>':'');
}

function budgetExport(d,slice) {
  const records = slice.rows.flatMap(row=>slice.columns.map(c=>({region:row.name,period:d.coverage,
    indicator:c.label,value:row[c.name],unit:c.unit,source:d.sourceHref})));
  return {id:d.id,title:d.title,limitations:d.limitations,observations:records};
}

function renderPanel(host,d,slice,side,params) {
  const key = name=>paramKey(side,name);
  const id = name=>`geo-${key(name)}`;
  const periodField = slice.periods.length ? `<label>${slice.label==='base'?'База сравнения':'Период'}
    <select id="${id('period')}" data-geo-key="${key('period')}">${isBudget(d)?'':option('all',slice.label==='base'?'Все базы':'Все периоды',slice.period||'all')}
      ${slice.periods.map(([value,label])=>option(value,label,slice.period)).join('')}</select></label>` : '';
  const indicator = slice.allColumns.length ? `<label>Показатель<select id="${id('columns')}" data-geo-key="${key('columns')}">
    ${slice.columns.length>1?option(slice.columns.map(c=>c.name).join(','),'Выбранные показатели',slice.columns.map(c=>c.name).join(',')):''}
    ${slice.allColumns.map(c=>option(c.name,c.label+(c.unit?' · '+c.unit:''),slice.columns.length===1?slice.columns[0].name:null)).join('')}</select></label>` : '';
  const details = new URLSearchParams({detail:'1'});
  if (isBudget(d)) {
    details.set('layer',d.id);
    details.set('period',d.year);
    if (!side && params.has('budgetRegion')) details.set('budgetRegion',params.get('budgetRegion'));
    if (slice.columns[0]) details.set('budgetMetric',slice.columns[0].name);
  }
  if (d.id==='territories') {
    for (const name of ['regions','compare','focus']) if (params.has(name)&&!side) details.set(name,params.get(name));
    details.set('metric',String(Math.max(0,oldMetrics.indexOf(slice.columns[0]?.name))));
    details.set('view',slice.view==='chart'?'rank':slice.view);
  }
  const assistant = new URLSearchParams({material:d.materialId||'',dataset:d.id,columns:slice.columns.map(c=>c.name).join(','),
    filter:slice.filter,period:slice.period,return:location.hash.slice(1)});
  host.innerHTML = `<header><p class="eyebrow">${e(d.materialTitle)}</p><h2>${e(d.title)}</h2><p class="caption">${e(d.coverage)}</p></header>
    <div class="geo-fields">${periodField}${indicator}<form data-geo-filter><label>Фильтр строк
      <input id="${id('filter')}" type="search" value="${e(slice.filter)}" placeholder="Территория или категория"></label><button type="submit" class="button secondary">Применить</button></form></div>
    ${!isBudget(d)&&slice.allColumns.length>1?`<details class="geo-columns"${slice.columns.length>1?' open':''}><summary>Несколько показателей</summary>
      <div>${slice.allColumns.map(c=>`<label><input type="checkbox" id="${id('metric-'+e(c.name))}" data-geo-column value="${e(c.name)}"${slice.columns.some(x=>x.name===c.name)?' checked':''}> ${e(c.label)}</label>`).join('')}</div></details>`:''}
    ${slice.visible?`<p class="caption">Территорий в срезе: ${slice.visible.length}. <button type="button" class="text-button" data-geo-clear-regions>Показать все</button></p>`:''}
    <div class="geo-view-tabs" role="group" aria-label="Представление: ${e(d.title)}">${slice.supported.map(([view,label])=>
      `<button type="button" id="${id(view)}" data-geo-view="${view}" aria-pressed="${view===slice.view}">${label}</button>`).join('')}</div>
    <div class="geo-visual" data-geo-visual></div><p class="caption" data-map-status role="status"></p>
    <footer class="geo-panel-footer">
      <div class="actions"><button type="button" class="button secondary" data-geo-export="csv">CSV ↓</button>
        <button type="button" class="button secondary" data-geo-export="json">JSON ↓</button>
        ${(isBudget(d)||d.id==='territories')?`<a class="button secondary" href="#/atlas?${e(details)}">${isBudget(d)?'Профили регионов':'Сравнение территорий'}</a>`:''}
        ${!isBudget(d)&&d.id!==investmentId?`<a class="button secondary" href="#/assistant?${e(assistant)}">Обсудить срез</a>`:''}
      </div>
      ${!isBudget(d)?`<details><summary>О наборе и срезе</summary>${summary(d,slice.columns,slice.rows)}
        <p class="caption">Исходное представление: ${e(d.sourceTableTitle)}. Строк в срезе: ${slice.rows.length} из ${d.rows.length}.</p>
        ${d.transformation?`<p class="caption">${e(d.transformation)}</p>`:''}</details>`:''}
      <p>${source(d.sourceHref,d.sourcePage?'Первоисточник · PDF, с. '+d.sourcePage:'Источник данных')}</p>
      ${externalSources(d).length?`<details><summary>Внешние источники</summary><ul>${externalSources(d).map(s=>`<li>${source(s.url,s.title)}</li>`).join('')}</ul></details>`:''}
      ${d.limitations.map(note=>`<p class="caption">${e(note)}</p>`).join('')}
    </footer>`;
}

export function geoanalyticsPage(C,G,params,main,focusId) {
  const allItems = workspaceDatasets(C,demoSubscriptionActive()).map(item=>({...item,access:item.access||'open'}));
  const items = allItems.filter(item=>catalogIds.has(item.id));
  const investment = items.find(item=>item.id===investmentId);
  const scope = {sector:params.get('sector'),topic:params.get('topic')};
  const access = params.get('access') || '';
  const available = items.filter(d=>(!access||d.access===access)&&matchesTaxonomy(C,d,scope));
  const requested = canonicalDataset(params.get('dataset'));
  const retained = id => !catalogIds.has(id) && allItems.find(d=>d.id===id&&(!access||d.access===access)&&matchesTaxonomy(C,d,scope));
  const first = available.find(d=>d.id===requested) || retained(requested) || available[0];
  if (first && first.id!==params.get('dataset') && (requested || scope.sector || scope.topic || access)) {
    params = new URLSearchParams(params);
    params.set('dataset',first.id);
    if (first.id!==requested) {
      for (const key of [...fields,'regions','compare','focus','budgetRegion']) params.delete(key);
    }
    history.replaceState(null,'','#'+geoRoute+'?'+params);
  }
  const peers = available.filter(d=>isOpen(d)&&d.id!==first?.id);
  const beside = canonicalDataset(params.get('beside'));
  const retainedPeer = beside!==first?.id && retained(beside);
  if (retainedPeer && isOpen(retainedPeer)) peers.push(retainedPeer);
  const second = isOpen(first||{}) ? peers.find(d=>d.id===beside) : null;
  const navigate = next => { location.hash = geoRoute+(next.size?'?'+next:''); };
  const update = (key,value) => {
    const next = new URLSearchParams(params);
    next.set('dataset',first.id);
    set(next,key,value);
    navigate(next);
  };
  main.innerHTML = `<div class="container geoanalytics">
    <header class="page-heading"><div><h1>Аналитическая платформа</h1><p class="lead">Сравнивайте данные из исследований АТРЭ и других источников на картах, графиках и в таблицах.</p><a class="button secondary" href="#/geoanalytics-preview?${e(new URLSearchParams({return:geoRoute+(params.size?'?'+params:'')}))}">Открыть пробную версию ↗</a></div></header>
    <div class="geo-layout">
      <aside class="geo-catalog" aria-label="Каталог наборов данных"><h2>Наборы данных</h2>
        <div class="geo-filters"><label>Доступ<select id="geo-access" data-geo-scope="access">
          ${[['','Все наборы'],['open','Открытые'],['paid','Платные']].map(([id,label])=>option(id,label,access)).join('')}</select></label>
          ${taxonomyFields(C,params,items)}</div>
        <div class="geo-catalog-list">${available.map(d=>datasetCard(d,d===first)).join('')||'<p class="caption">По выбранным фильтрам наборов нет.</p>'}</div>
      </aside>
      <div class="geo-workspace">
        ${first&&isOpen(first)&&peers.length?`<div class="geo-compare"><label>Сравнить с набором
          <select id="geo-beside" data-geo-key="beside">${option('','Без сравнения',second?.id||'')}
            ${peers.map(d=>option(d.id,d.title,second?.id)).join('')}</select></label>
          ${second?'<p class="caption">У каждого набора собственные период, единицы и шкала.</p>':''}</div>`:''}
        <div class="geo-panels${second?' paired':''}">
          ${first?'<section class="geo-panel" data-geo-side="0"></section>':'<p class="empty">Измените фильтры, чтобы выбрать набор.</p>'}
          ${second?'<section class="geo-panel" data-geo-side="1"></section>':''}
        </div>
      </div>
    </div>
  </div>`;
  const content = main.querySelector('.geoanalytics');
  content.querySelector('[data-taxonomy="sector"]').id = 'geo-sector';
  content.querySelector('[data-taxonomy="topic"]').id = 'geo-topic';
  const restoreFocus = () => {
    if (focusId && (document.activeElement===document.body||document.activeElement===main)) {
      content.querySelector('#'+CSS.escape(focusId))?.focus({preventScroll:true});
    }
  };
  content.addEventListener('change',event=>{
    const control = event.target;
    const scopeKey = control.dataset.geoScope || control.dataset.taxonomy;
    if (scopeKey) {
      const next = new URLSearchParams(params);
      set(next,scopeKey,control.value);
      navigate(next);
    } else if (control.dataset.geoKey==='beside') {
      const next = new URLSearchParams(params);
      next.set('dataset',first.id);
      set(next,'beside',control.value);
      for (const field of fields) next.delete(paramKey(1,field));
      navigate(next);
    } else if (control.dataset.geoKey) update(control.dataset.geoKey,control.value);
  });
  content.addEventListener('click',event=>{
    const control = event.target.closest('[data-geo-dataset]');
    if (!control || control.dataset.geoDataset===first?.id) return;
    const next = new URLSearchParams(params);
    next.set('dataset',control.dataset.geoDataset);
    for (const field of [...fields,'regions','compare','focus','budgetRegion']) next.delete(field);
    if (next.get('beside')===control.dataset.geoDataset || (control.dataset.geoDataset===investmentId&&!isOpen(investment))) {
      next.delete('beside');
      for (const field of fields) next.delete(paramKey(1,field));
    }
    navigate(next);
  });

  async function mount(item,side) {
    if (!item) return;
    const host = content.querySelector(`[data-geo-side="${side}"]`);
    if (!isOpen(item)) {
      host.innerHTML = `<header><p class="eyebrow">Платный набор · пример</p><h2>${e(item.title)}</h2></header>
        <div class="note"><strong>Доступ по подписке</strong><p>${lockedHint}</p>
        <a class="text-link" href="#/client">Клиентская зона АТРЭ</a></div>`;
      return;
    }
    let data = item;
    if (isBudget(item)) {
      const period = params.get(paramKey(side,'period'));
      const year = Object.hasOwn(budgetPeriods,period)?period:'2025';
      host.innerHTML = '<p class="empty" role="status">Загружаем бюджетные данные…</p>';
      try { data = budgetDataset(await budgetData(year),year); }
      catch {
        host.innerHTML = `<p class="empty">Не удалось загрузить бюджетные данные. ${source(budgetSource,'Исходный портал')}</p>`;
        return;
      }
      if (!host.isConnected) return;
    }
    const slice = workspaceSlice(data,params,side,C.atlas.territories);
    renderPanel(host,data,slice,side,params);
    restoreFocus();
    const visual = host.querySelector('[data-geo-visual]');
    host.querySelector('[data-geo-filter]').addEventListener('submit',event=>{
      event.preventDefault();
      update(paramKey(side,'filter'),event.target.querySelector('input').value.trim());
    });
    host.addEventListener('change',event=>{
      if (!event.target.hasAttribute('data-geo-column')) return;
      const columns = [...host.querySelectorAll('[data-geo-column]:checked')].map(input=>input.value);
      if (columns.length) update(paramKey(side,'columns'),columns.join(','));
      else event.target.checked = true;
    });
    host.addEventListener('click',event=>{
      if (event.target.closest('[data-geo-clear-regions]')) {
        update('regions','');
        return;
      }
      const view = event.target.closest('[data-geo-view]')?.dataset.geoView;
      if (view && view!==slice.view) update(paramKey(side,'view'),view);
      const format = event.target.closest('[data-geo-export]')?.dataset.geoExport;
      if (!format) return;
      const name = 'atre-'+data.id+'.'+format;
      const exported = isBudget(data)?budgetExport(data,slice):exportDataset(data,slice.columns,slice.rows);
      if (format==='json') saveFile(name,JSON.stringify(exported,null,2),'application/json;charset=utf-8');
      else if (isBudget(data)) {
        const lines = [['Регион','Период','Показатель','Значение','Единица','Источник'],...exported.observations.map(Object.values)];
        saveFile(name,'\ufeff'+lines.map(line=>line.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(';')).join('\r\n'));
      } else saveFile(name,datasetCsv(data,slice.columns,slice.rows));
    });
    if (!slice.rows.length) visual.innerHTML = '<p class="empty">По фильтру строк ничего не найдено.</p>';
    else if (slice.view!=='map') visual.innerHTML = slice.view==='table'?table(data,slice):chart(data,slice);
    else {
      visual.innerHTML = '<p class="caption" role="status">Загружаем карту…</p>';
      try {
        const markup = await mapView(G,C.atlas.territories,data,slice);
        if (!host.isConnected) return;
        visual.innerHTML = markup;
      } catch {
        visual.innerHTML = '<p class="empty">Не удалось построить карту. Значения доступны в таблице.</p>';
      }
      for (const mark of visual.querySelectorAll('[data-geo-code], [data-budget-region], [data-map-value]')) {
        const show = ()=>{host.querySelector('[data-map-status]').textContent=mark.getAttribute('aria-label');};
        mark.addEventListener('click',show);
        mark.addEventListener('keydown',event=>{if (event.key==='Enter'||event.key===' ') {event.preventDefault();show();}});
      }
    }
  }
  const list = content.querySelector('.geo-catalog-list');
  const selectedCard = list.querySelector('[aria-pressed="true"]');
  if (selectedCard && selectedCard.offsetTop+selectedCard.offsetHeight>list.clientHeight) {
    list.scrollTop=selectedCard.offsetTop+selectedCard.offsetHeight-list.clientHeight;
  }
  const workspace = content.querySelector('.geo-workspace');
  if (focusId?.startsWith('geo-dataset-') && workspace.getBoundingClientRect().top<100) {
    workspace.scrollIntoView({block:'start',behavior:'instant'});
  }
  mount(first,0);
  mount(second,1);
  restoreFocus();
}
