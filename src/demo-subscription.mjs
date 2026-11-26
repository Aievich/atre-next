const subscriptionKey = 'atre-demo-subscription';
export const investmentId = 'investment-preview';
export const investmentHref = '#/geoanalytics?dataset='+investmentId;

export function demoSubscriptionActive(storage = globalThis.localStorage) {
  try { return storage.getItem(subscriptionKey)==='active'; }
  catch { return false; }
}

export function activateDemoSubscription(storage = globalThis.localStorage) {
  try {
    storage.setItem(subscriptionKey,'active');
    return demoSubscriptionActive(storage);
  } catch { return false; }
}

export function cancelDemoSubscription(storage = globalThis.localStorage) {
  try {
    storage.removeItem(subscriptionKey);
    return storage.getItem(subscriptionKey)!=='active';
  } catch { return false; }
}

export function demoInvestmentDataset(active) {
  const sourceHref = '#/client';
  const columns = [
    {name:'name',label:'Территория',type:'text'},
    {name:'period',label:'Год',type:'year'},
    {name:'amount',label:'Инвестиции',type:'number',unit:'млрд ₽',decimals:1}
  ];
  const rows = active ? [
    {name:'Условный регион А',period:'2025',amount:18.4},
    {name:'Условный регион Б',period:'2025',amount:12.6},
    {name:'Условный регион В',period:'2025',amount:7.9}
  ] : [];
  return {
    id:investmentId,title:'Региональные инвестиции',materialTitle:'Демонстрационный набор',
    access:active?'open':'paid',kind:'quantitative',sourceHref,sourceTableTitle:'Пример инвестиционных данных',
    coverage:'2025 · условные территории',columns,rows,referenceRecords:[],
    schema:{version:1,dimensions:[{id:'name',label:'Территория'},{id:'period',label:'Год'}],
      indicators:[{id:'amount',label:'Инвестиции',unit:'млрд ₽'}],attributes:[]},
    records:rows.map((row,rowIndex)=>({
      id:investmentId+':'+rowIndex,rowIndex,dimensions:{name:row.name,period:row.period},period:row.period,
      indicator:'amount',indicatorLabel:'Инвестиции',value:row.amount,unit:'млрд ₽',status:'demo',source:{href:sourceHref}
    })),
    limitations:['Условные данные для демонстрации подписки. Территории и значения вымышлены.']
  };
}

export function renderDemoSubscription() {
  return `<section id="demo-subscription" class="note client-subscription">
    <h2>Демонстрационная подписка</h2>
    <p>Открывает пример набора «Региональные инвестиции» в этом браузере. Оплата не требуется.</p>
    <div data-demo-subscription-actions></div><p data-demo-subscription-status role="status"></p>
  </section>`;
}

export function bindDemoSubscription(root) {
  const actions = root.querySelector('[data-demo-subscription-actions]');
  const status = root.querySelector('[data-demo-subscription-status]');
  function render() {
    actions.innerHTML = demoSubscriptionActive() ?
      `<a class="button dark" href="${investmentHref}">Открыть набор</a>
        <button type="button" data-demo-cancel class="button secondary">Отменить демоподписку</button>` :
      '<button type="button" class="button dark">Купить подписку (демо)</button>';
    actions.querySelector('button')?.addEventListener('click',event=>{
      const cancel = event.currentTarget.hasAttribute('data-demo-cancel');
      if (!(cancel ? cancelDemoSubscription() : activateDemoSubscription())) {
        status.textContent = 'Статус подписки не удалось изменить. Проверьте настройки хранилища браузера.';
        return;
      }
      render();
      status.textContent = cancel ? 'Демоподписка отменена. Доступ к набору закрыт.' : 'Демонстрационная подписка активна.';
      actions.querySelector('a,button').focus();
    });
  }
  render();
  if (demoSubscriptionActive()) status.textContent = 'Демонстрационная подписка активна.';
}
