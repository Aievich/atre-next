import {esc as e} from './lib.mjs';

export const sectors = [
  ['government','Государство и регионы'],
  ['energy','ТЭК и ЖКХ'],
  ['industry','Промышленность'],
  ['infrastructure','Строительство и инфраструктура'],
  ['transport','Транспорт и логистика'],
  ['finance','Финансовый сектор'],
  ['digital','Цифровая экономика'],
  ['agriculture','Агропромышленный комплекс'],
  ['hightech','Высокотехнологичный сектор'],
  ['environment','Экология и экономика замкнутого цикла'],
  ['health','Фармацевтика и биотехнологии'],
  ['creative','Креативные индустрии и медиа'],
  ['sport','Спорт и фитнес'],
  ['consumer','Потребительские рынки'],
  ['labor','Рынок труда']
];

const materialSectors = {
  'cod-2026':['digital','energy','infrastructure'],
  'sport-2026':['sport'],
  'ved-platezhi-2026':['finance'],
  'polimery-2026':['industry','transport'],
  'seraya-zanyatost':['labor'],
  'ved-platezhi-2025':['finance'],
  'lokalizaciya-taksi':['transport','industry'],
  'porty-baltiki':['transport','infrastructure'],
  'porog-1000-evro':['consumer'],
  'farma-suverenitet':['health','industry'],
  'tobacco-market-2026-07':['consumer','industry']
};
const regionalBudgets = {sectors:['government'],topics:['territorial-development','fiscal-effects']};

function classification(corpus, item) {
  if (item.materialId === 'regional-budgets' || item.id === 'regional-budgets') return regionalBudgets;
  const id = item.materialId || item.id;
  const material = item.materialId ? corpus.materials.find(entry => entry.id === id) : item;
  return {sectors:materialSectors[id] || [],topics:material?.topics || []};
}

export function matchesTaxonomy(corpus, item, {sector, topic}) {
  const scope = classification(corpus,item);
  return (!sector || scope.sectors.includes(sector)) && (!topic || scope.topics.includes(topic));
}

export function taxonomySelect(name, label, options, selected = '', allLabel = name==='sector'?'Все отрасли':'Все направления') {
  return `<label>${label}<select data-taxonomy="${name}">
    <option value="">${e(allLabel)}</option>
    ${options.map(([id,title])=>`<option value="${e(id)}"${id===selected?' selected':''}>${e(title)}</option>`).join('')}
  </select></label>`;
}

export function taxonomyFields(corpus, params, items) {
  const available = items.map(item=>classification(corpus,item));
  return taxonomySelect('sector','Отрасль',sectors.filter(([id])=>available.some(item=>item.sectors.includes(id))),params.get('sector'))+
    taxonomySelect('topic','Направление',corpus.topics.filter(t=>available.some(item=>item.topics.includes(t.id))).map(t=>[t.id,t.short]),params.get('topic'));
}

export function bindTaxonomy(root, route, params) {
  root.querySelectorAll('[data-taxonomy]').forEach(select => select.addEventListener('change', () => {
    const next = new URLSearchParams(params);
    if (select.value) next.set(select.dataset.taxonomy,select.value);
    else next.delete(select.dataset.taxonomy);
    location.hash = route + (next.size?'?'+next:'');
  }));
}
