import {esc as e,fmt,norm} from './lib.mjs';

const periods = {'2025':'Январь–декабрь 2025','2026':'Январь–сентябрь 2026'};
const source = 'https://olgamanusadzhian.github.io/atre-geoeconomics/';
const metrics = [
  ['revenue','Доходы бюджета'],['tax','Налоговые и неналоговые доходы'],
  ['transfers','Безвозмездные поступления'],['expenses','Расходы бюджета'],['balance','Баланс бюджета']
];
export const budgetPeriods = periods;
export const budgetMetrics = metrics;
export const budgetSource = source;
const geometryAliases = {'чувашия':'чувашская','кемеровская кузбасс':'кемеровская'};
const regionKey = name => {
  const key = norm(name).split(' ').filter(word=>!['г','город','республика','автономный','автономная','округ','край','область'].includes(word)).join(' ');
  return geometryAliases[key] || key;
};

export function budgetValue(row, metric) {
  const value = metric.startsWith('sector:') ? row.sectors?.[metric.slice(7)] : row[metric];
  return Number.isFinite(value) ? value : null;
}

export function bindBudgetRegions(features, rows) {
  const byName = new Map();
  for (const row of rows) {
    const key = regionKey(row.name);
    byName.set(key,byName.has(key)?null:row);
  }
  return features.map(feature=>({feature,row:byName.get(regionKey(feature.properties.name))||null}));
}

const palette = ['#dce9e6','#b1d0d0','#75aeb7','#398192','#145976'];
const isNegative = value => value < 0;
const negativePalette = ['#f4ddd0','#eabda6','#d89878','#bf7757','#9f5038'];
const shade = (value,cap,bins) => {
  if (value===null) return '#e8e9e5';
  const magnitude = Math.abs(value);
  const index = bins ? bins.filter(limit=>magnitude>=limit).length : Math.min(4,Math.floor(magnitude/cap*5));
  return (isNegative(value)?negativePalette:palette)[index];
};
const valueLabel = value => value===null ? 'Нет данных' : fmt(value,3)+' млрд ₽';

const load = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Не удалось загрузить '+url);
  return response.json();
};
let geometry;
const records = new Map();
export function budgetData(year) {
  if (!records.has(year)) {
    const request = load(year==='2025'?'/data/geoeconomics-2025.json':'/data/geoeconomics-2026.json')
      .catch(error=>{records.delete(year);throw error;});
    records.set(year,request);
  }
  return records.get(year);
}
export function mapData() {
  return geometry ||= load('/geo/russia-regions.geojson')
    .catch(()=>{geometry=null;return null;});
}
export function budgetLegend(cap, hasNegative, bins) {
  if (bins) {
    const labels = bins.map((end,index)=>index?`${fmt(bins[index-1],0)}–<${fmt(end,0)}`:`< ${fmt(end,0)}`);
    labels.push(`≥ ${fmt(bins.at(-1),0)}`);
    return `<div class="budget-legend geo-budget-legend"><strong>млрд ₽</strong>
      ${labels.map((label,index)=>`<span><i style="background:${palette[index]}"></i>${e(label)}</span>`).join('')}
      ${hasNegative?'<span>Тёплые тона — отрицательные значения</span>':''}<span class="budget-missing">Нет данных</span></div>`;
  }
  return `<div class="budget-legend"><span>0</span>${palette.map(color=>`<i style="background:${color}"></i>`).join('')}<span>${fmt(cap,3)} млрд ₽</span>
    ${hasNegative?'<span>Тёплые тона — отрицательные значения</span>':''}<span class="budget-missing">Нет данных</span></div>`;
}

export function budgetMap(geo,rows,metric,cap,bins) {
  const d3 = window.d3;
  if (!geo || !d3) return '<p class="empty">Границы карты недоступны. Значения есть в таблице.</p>';
  const bindings = bindBudgetRegions(geo.features,rows);
  const features = geo.features.map(feature => {
    if (d3.geoArea(feature) <= 2*Math.PI) return feature;
    const reverse = rings=>rings.map(ring=>[...ring].reverse());
    const coordinates = feature.geometry.type==='Polygon' ? reverse(feature.geometry.coordinates) :
      feature.geometry.coordinates.map(reverse);
    return {...feature,geometry:{...feature.geometry,coordinates}};
  });
  const projection = d3.geoAzimuthalEquidistant().rotate([-100,-60])
    .fitExtent([[14,12],[866,439]],{type:'FeatureCollection',features});
  const path = d3.geoPath(projection);
  return `<svg viewBox="0 0 880 450" class="budget-map" aria-label="Бюджеты регионов · география источника">
    ${features.map((feature,index)=>{
      const row=bindings[index].row;
      const title=row ? row.name+': '+valueLabel(budgetValue(row,metric)) : feature.properties.name+': нет сопоставимой записи';
      return `<path d="${path(feature)}" fill="${shade(row?budgetValue(row,metric):null,cap,bins)}"${row?` tabindex="0" role="button" data-budget-region="${e(row.id)}" aria-label="${e(title)}"`:''}><title>${e(title)}</title></path>`;
    }).join('')}
  </svg>`;
}

export function renderRegionalBudgets(main, params, picker) {
  const year = Object.hasOwn(periods,params.get('period')) ? params.get('period') : '2025';
  main.innerHTML = `<div class="container atlas agency-page">
    <header class="page-heading"><div><p class="eyebrow">Геоаналитика · Региональные бюджеты</p>
      <h1>Бюджеты регионов</h1><p class="lead">Доходы, расходы и бюджетный баланс по данным Федерального казначейства.</p></div>
      <a class="button secondary" href="${source}" target="_blank" rel="noopener noreferrer">Портал «АТРЭ ГеоЭкономика»</a>
    </header>
    <div class="atlas-controls">${picker('regional-budgets')}<label>Период<select id="budget-period">
      ${Object.entries(periods).map(([id,label])=>`<option value="${id}"${id===year?' selected':''}>${label}</option>`).join('')}
    </select></label><label>Показатель<select id="budget-metric" disabled></select></label></div>
    <section class="budget-content"><p class="empty" role="status">Загружаем бюджетные данные…</p></section>
    <p class="caption">2025 год — 12 месяцев, 2026 год — 9 месяцев. Значения показаны отдельно по периодам. Территории без границ доступны в списке регионов и в рейтинге при наличии значения. Названия и охват набора сохранены по источнику.</p>
    <p class="caption"><a href="${source}" target="_blank" rel="noopener noreferrer">Источник данных и методика — «АТРЭ ГеоЭкономика»</a> · <a href="https://github.com/codeforgermany/click_that_hood/blob/main/public/data/russia.geojson" target="_blank" rel="noopener noreferrer">Границы Click That ’Hood</a></p>
  </div>`;
  const content = main.querySelector('.budget-content');
  const update = (key,value) => {
    const next = new URLSearchParams(location.hash.split('?')[1]);
    next.set('layer','regional-budgets');
    next.set(key,value);
    location.hash = '/atlas?'+next;
  };
  main.querySelector('#budget-period').onchange = event=>update('period',event.target.value);
  Promise.all([budgetData(year),mapData()]).then(([rows,geo])=>{
    if (!content.isConnected) return;
    const sections = [...new Set(rows.flatMap(row=>Object.keys(row.sectors||{})))];
    const options = [...metrics,...sections.map(label=>['sector:'+label,label])];
    const [metric,title] = options.find(([id])=>id===params.get('budgetMetric')) || options[0];
    const select = main.querySelector('#budget-metric');
    const option = ([id,label])=>`<option value="${e(id)}"${id===metric?' selected':''}>${e(label)}</option>`;
    select.innerHTML = `<optgroup label="Итоги бюджета">${metrics.map(option).join('')}</optgroup><optgroup label="Расходы по разделам">${options.slice(metrics.length).map(option).join('')}</optgroup>`;
    select.disabled = false;
    select.onchange = event=>update('budgetMetric',event.target.value);
    const ranked = [...rows].filter(row=>budgetValue(row,metric)!==null)
      .sort((a,b)=>budgetValue(b,metric)-budgetValue(a,metric));
    const cap = Math.max(1,...ranked.map(row=>Math.abs(budgetValue(row,metric))));
    content.innerHTML = `<div class="budget-workspace">
      <section class="agency-panel"><h2>${e(title)}</h2><p class="caption">${periods[year]} · млрд ₽</p>
        ${budgetMap(geo,rows,metric,cap)}
        ${budgetLegend(cap,ranked.some(row=>isNegative(budgetValue(row,metric))))}
      </section>
      <aside class="agency-panel"><label>Регион<select id="budget-region">
        ${[...rows].sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(row=>`<option value="${e(row.id)}">${e(row.name)}</option>`).join('')}
        </select></label><div id="budget-profile" role="status"></div></aside>
    </div>
    <details class="agency-panel budget-ranking" open><summary>Рейтинг · ${ranked.length} значений</summary>
      <div class="table-scroll"><table><thead><tr><th scope="col">Регион</th><th scope="col">${e(title)}, млрд ₽</th></tr></thead>
      <tbody>${ranked.map(row=>`<tr><td><button type="button" class="text-button" data-budget-region="${e(row.id)}">${e(row.name)}</button></td><td>${fmt(budgetValue(row,metric),3)}</td></tr>`).join('')}</tbody></table></div>
    </details>`;
    const region = content.querySelector('#budget-region');
    function selectRegion(id,remember=false) {
      const row = rows.find(item=>item.id===id);
      if (!row) return;
      region.value=id;
      content.querySelectorAll('path[data-budget-region]').forEach(path=>{
        const active=path.dataset.budgetRegion===id;
        path.classList.toggle('selected',active);
        path.setAttribute('aria-pressed',String(active));
      });
      content.querySelector('#budget-profile').innerHTML = `<h3>${e(row.name)}</h3>
        <p><strong>${e(title)}</strong><br>${valueLabel(budgetValue(row,metric))}</p>
        <dl>${metrics.map(([key,label])=>`<div><dt>${label}</dt><dd>${valueLabel(budgetValue(row,key))}</dd></div>`).join('')}</dl>`;
      if (remember) {
        const next=new URLSearchParams(location.hash.split('?')[1]);
        next.set('budgetRegion',id);
        history.replaceState(null,'','#/atlas?'+next);
      }
    }
    region.onchange = ()=>selectRegion(region.value,true);
    content.querySelectorAll('[data-budget-region]').forEach(control=>{
      control.onclick=()=>selectRegion(control.dataset.budgetRegion,true);
      if (control.tagName.toLowerCase()==='path') control.onkeydown=event=>{
        if (event.key==='Enter'||event.key===' ') {event.preventDefault();control.onclick();}
      };
    });
    selectRegion(rows.find(row=>row.id===params.get('budgetRegion'))?.id || ranked[0]?.id || rows[0]?.id);
  }).catch(()=>{
    if (content.isConnected) content.innerHTML='<p class="empty">Не удалось загрузить бюджетные данные. Обновите страницу или откройте исходный портал.</p>';
  });
}
