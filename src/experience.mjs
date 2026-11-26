import {esc as e,fmt,signed,metrics} from './lib.mjs';
import {carouselControls,renderCurrentMaterials,renderFeaturedReports,renderNewsCards,slideAttributes} from './publications.mjs';
import {renderPracticeShowcase,practiceArtStyle} from './agency-expertise.mjs';
const link=(url,label,cl='')=>`<a class="${cl}" href="${e(url)}" ${/\.pdf/.test(url)?'target="_blank" rel="noopener noreferrer"':''}>${label}</a>`;
const status={estimate:'Оценка',forecast:'Прогноз',observation:'Наблюдение',scenario:'Сценарий'};
export function parseAtlasState(params,territories){
 const valid=new Set(territories.map(r=>r.id));
 const ids=v=>[...new Set(v.split(',').filter(id=>valid.has(id)))];
 const selected=params.has('regions')?ids(params.get('regions')):[...valid];
 const compared=(params.has('compare')?ids(params.get('compare')):selected.slice(0,2)).filter(id=>selected.includes(id)).slice(0,3);
 const metric=Number(params.get('metric')||0);
 return {selected,compared,metric:Number.isInteger(metric)&&metric>=0&&metric<=2?metric:0,view:['map','rank','table'].includes(params.get('view'))?params.get('view'):'map',focus:selected.includes(params.get('focus'))?params.get('focus'):selected[0]};
}
export function allMetricsCsv(rows){return '\ufeff'+[['Территория',...metrics.map(m=>m+', %'),'База прогноза','Горизонт'],...rows.map(r=>[r.name,...r.values,2025,2031])].map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');}
export function citationText(material,item,origin){
 const url=item.sourceHref||material.pdfHref;
 return ['АТРЭ. '+material.title,item.label?item.label+': '+item.value:null,item.period?'Период: '+item.period:null,item.valueStatus?status[item.valueStatus]:null,item.source?'Основание: '+item.source:null,item.sourcePage?'PDF, с. '+item.sourcePage:null,url?new URL(url,origin).href:null].filter(Boolean).join('. ');
}
const consultingHome = '#/?view=consulting';

export function renderHomeSwitch(consulting) {
 return `<nav class="home-switch" aria-label="Вариант главной страницы">
   <div><a href="#/"${consulting?'':' aria-current="page"'}>Исследования и данные</a>
   <a href="${consultingHome}"${consulting?' aria-current="page"':''}>Консалтинг</a></div>
 </nav>`;
}

const clientTasks = {
 strategy:'Определить стратегию роста',
 operations:'Повысить эффективность операций',
 investment:'Оценить инвестиционный проект',
 regulation:'Обосновать регуляторное решение',
 'digital-transformation':'Спланировать цифровую трансформацию',
 climate:'Разработать климатическую стратегию',
 international:'Подготовить выход на новый рынок',
 organization:'Перестроить систему управления',
 innovation:'Выбрать технологии для развития'
};

export function renderConsultingHome(practices,materials,news) {
 return `<div class="consulting-home">
  <section class="hero consulting-hero" aria-labelledby="consulting-title">
    <div class="hero-copy">
      <p class="eyebrow light">КОНСАЛТИНГ АТРЭ</p>
      <h1 id="consulting-title">Стратегия, данные и внедрение</h1>
      <p>Помогаем компаниям, органам власти и институтам развития оценивать рынки и инвестиции, разрабатывать стратегии и внедрять изменения.</p>
      <div class="actions">
        ${link('#/request?kind=consulting','Обсудить проект','button peach')}
        ${link('#/about/projects','Посмотреть проекты','button outline-light')}
      </div>
    </div>
  <section class="consulting-services" id="consulting-services" tabindex="-1" data-carousel data-interval="7000" aria-labelledby="consulting-services-title">
    <div class="section-title">
      <h2 id="consulting-services-title">Чем можем помочь</h2>
      <div class="consulting-service-tools">
        ${link('#/topics?view=sectors','Отраслевая экспертиза')}
        ${carouselControls('Предыдущая услуга','Следующая услуга',practices.length)}
      </div>
    </div>
    <div class="carousel-slides" data-carousel-slides aria-live="off">${practices.map((practice,index)=>`
      <article class="consulting-service" ${slideAttributes(index)}>
        <div class="practice-art" style="${practiceArtStyle(practice.id)}" aria-hidden="true"></div>
        <h3>${link('#/topics/practice/'+encodeURIComponent(practice.id),e(clientTasks[practice.id]||practice.title))}</h3>
        <ul>${practice.directions.slice(0,3).map(({title,description})=>`<li>${e(description||title)}</li>`).join('')}</ul>
      </article>`).join('')}</div>
    <div class="carousel-progress" aria-hidden="true"><span data-carousel-progress></span></div>
  </section>
  </section>
  <section class="section consulting-resources">
    <h2>Аналитика АТРЭ</h2>
    <div class="consulting-analytics">
      ${renderFeaturedReports(materials,3)}
      <section class="consulting-atlas" aria-labelledby="consulting-atlas-title">
        <h3 id="consulting-atlas-title">${link('#/geoanalytics','Аналитическая платформа')}</h3>
        <div class="hero-data"></div>
      </section>
    </div>
  </section>
  <section class="section consulting-news" aria-labelledby="consulting-news-title">
    <div class="section-title"><h2 id="consulting-news-title">Новости АТРЭ</h2>${link('#/news','Все новости')}</div>
    ${renderNewsCards(news.items.slice(3,5),3,renderCurrentMaterials(news,materials,3))}
  </section>
  <section class="assistant-banner consulting-contact" id="consulting-contact" tabindex="-1">
    <div><h2>Обсудим вашу задачу</h2><p>Расскажите, какое решение нужно принять и какие данные у вас уже есть.</p>
      <div class="consulting-links">
        ${link('mailto:info@agencytde.ru','info@agencytde.ru')}
        ${link('tel:+74952272775','+7 (495) 227-27-75')}
        ${link('#/about/team','Команда АТРЭ')}
        ${link('#/about/partners','Клиенты и партнёры')}
      </div>
    </div>
    ${link('#/request','Написать в АТРЭ','button dark')}
  </section>
 </div>`;
}

export function renderHome(C,news,practices=[],datasetCount){
const practicePanel=renderPracticeShowcase(practices);
return `
<section class="hero"><div class="hero-copy"><p class="eyebrow light">АГЕНТСТВО ТРАНСФОРМАЦИИ И РАЗВИТИЯ ЭКОНОМИКИ</p><h1>Экономика.<br>Данные.<br><em>Основания решений.</em></h1><p>Исследования отраслей и территорий: доклады АТРЭ, открытые таблицы и инструменты для проверки аналитических выводов.</p><div class="actions">${link('#/studies','Выбрать исследование ↗','button peach')}${link('#/geoanalytics','Открыть аналитическую платформу ↗','button outline-light')}</div><div class="hero-bottom"><span>${C.materials.filter(item=>item.type==='report').length} докладов</span>${datasetCount===undefined?'':`<span>${datasetCount} наборов данных</span>`}</div></div><div class="hero-showcase">${practicePanel?`
 <div class="hero-showcase-tabs" role="tablist" aria-label="Витрина АТРЭ">
  <button type="button" id="hero-geo-tab" role="tab" aria-controls="hero-geo-panel" aria-selected="true">Геоданные</button>
  <button type="button" id="hero-practices-tab" role="tab" aria-controls="hero-practices-panel" aria-selected="false" tabindex="-1">Практики АТРЭ</button>
 </div>`:''}
 <div class="hero-data" id="hero-geo-panel" ${practicePanel?'role="tabpanel" aria-labelledby="hero-geo-tab"':''}><div class="map-caption"><span class="live-dot"></span> В ФОКУСЕ · ЦОД И ЭНЕРГЕТИКА</div><div class="hero-map" id="hero-map"></div><div class="map-overview"><div><small>Прогноз 2025 → 2031 · 5 территорий</small><strong>Сравните территорию.<br>Проверьте основание.</strong></div>${link('#/geoanalytics?dataset=territories&regions=siberia,northwest&compare=siberia,northwest','Начать сравнение ↗')}</div></div>
 ${practicePanel}
</div></section>
<div class="section home-entry"><section class="task-section"><div class="section-title"><div><p class="eyebrow">ВАША ЗАДАЧА</p><h2>Начните с того, что хотите понять.</h2></div><p class="section-intro">От выбора темы — к конкретному числу, сравнению и первоисточнику.</p></div><div class="task-grid">${[['01','Изучить отрасль','Открыть исследования и проекты по отраслям.','topics?view=sectors'],['02','Сравнить территории','Исследовать данные по территориям и сравнивать регионы.','geoanalytics'],['03','Найти показатель','Поиск по таблицам и страницам PDF.','search'],['04','Познакомиться с опытом','Открыть каталог проектного опыта АТРЭ.','about/projects']].map(([n,t,d,u])=>link('#/'+u,`<span>${n}<b aria-hidden="true">↗</b></span><h3>${t}</h3><p>${d}</p>`,'task-card')).join('')}</div></section>
${renderCurrentMaterials(news,C.materials)}</div>
${renderFeaturedReports(C.materials)}
<section class="section"><div class="section-title"><div><p class="eyebrow">ТЕМЫ ИССЛЕДОВАНИЙ</p><h2>Тема связывает<br>исследования и практику.</h2></div>${link('#/topics?view=themes','Все темы исследований ↗')}</div><div class="topic-grid">${C.topics.slice(0,6).map((t,i)=>link('#/topic/'+t.id,`<small>0${i+1}</small><h3>${e(t.short)}</h3><span>${C.materials.filter(m=>m.topics.includes(t.id)).length} материалов · ${C.projects.filter(p=>p.topics.includes(t.id)).length} проектов ↗</span>`,'topic-card')).join('')}</div><p class="caption">Тематические связи предварительные; основания раскрываются в материалах.</p></section>
<section class="section practice-preview"><div class="section-title"><div><p class="eyebrow">ОПУБЛИКОВАННЫЙ КАТАЛОГ</p><h2>Практика АТРЭ.</h2></div>${link('#/about/projects','Все проекты ↗')}</div><div class="practice-list">${C.projects.slice(0,3).map((p,i)=>link('#/about/projects/'+encodeURIComponent(p.id),`<span>0${i+1}</span><h3>${e(p.title)}</h3><b>↗</b>`)).join('')}</div><p class="caption">Здесь представлены подтверждённые названия проектов. Описание роли, методов и результатов требует дополнительных разрешённых материалов.</p></section>
<section class="assistant-banner"><div><p class="eyebrow">ПРОДОЛЖИТЬ ИССЛЕДОВАНИЕ</p><h2>Сформулируйте вопрос.<br>Найдите его основание.</h2><p>Помощник найдёт фрагменты публикаций и выполнит поддерживаемое сравнение.</p></div>${link('#/assistant','Перейти к помощнику ↗','button dark')}</section>`;}
export function renderOverview(m,atlasUrl){if(m.format!=='digital')return '';const s=m.sections.find(s=>['findings','summary'].includes(s.id))||m.sections[0];const excerpts=s.text.split(/\n\s*\n/).filter(p=>p.length>100).slice(0,3).map(p=>p.split(/(?<=[.!?])\s+(?=[А-ЯЁ])/)[0]);return `<section class="research-brief" aria-label="Краткий обзор исследования"><div class="brief-head"><div><p class="eyebrow">ДОКЛАД ЗА НЕСКОЛЬКО МИНУТ</p><h2>${m.id==='cod-2026'?'Как рост ЦОД связан с энергетикой территорий?':'Как устроены расходы и доходы спортивной экономики?'}</h2></div><span class="tag">${m.id==='cod-2026'?'Оценки и прогнозы':'Оценки · 2025'}</span></div><div class="brief-body"><div><p class="eyebrow">ФРАГМЕНТЫ ВЫВОДОВ ДОКЛАДА</p>${excerpts.map((p,i)=>`<blockquote><span>0${i+1}</span><p>${e(p)}</p></blockquote>`).join('')}${link(s.sourceHref||m.pdfHref,'Проверить выводы в PDF ↗','source')}</div><aside><p class="eyebrow">МОЖНО ИССЛЕДОВАТЬ</p><h3>${m.id==='cod-2026'?'Территории и три показателя':'Условное замещение выручки'}</h3><p>${m.id==='cod-2026'?'Карта, рейтинг и сравнение двух–трёх территорий с одной прогнозной базой.':'Как меняется необходимый рост доходов в дни матчей при снижении коммерческой выручки.'}</p>${m.id==='cod-2026'?link(atlasUrl,'Открыть сравнение ↗','button dark'):'<button class="button dark" data-section="sport-calc">Открыть калькулятор ↗</button>'}<p class="caption">${m.id==='cod-2026'?'2025 — прогнозная база. Разность темпов не равна дефициту.':'Расчёт по базам 70,2 и 9,2 млрд руб. Дополнительные расходы и ограничения вместимости не учтены.'}</p></aside></div><div class="brief-metrics">${m.keyMetrics.map((k,i)=>`<article><span class="tag">${e(status[k.valueStatus]||'Показатель')}</span><strong>${e(k.value)}</strong><p>${e(k.label)}</p><small>${e(k.period)}</small><div>${link(k.sourceHref,'PDF, с. '+k.sourcePage+' ↗','source')}</div></article>`).join('')}</div></section>`;}
export function renderComparison(C,state,atlasHash){const rows=state.compared.map(id=>C.atlas.territories.find(r=>r.id===id)),focus=C.atlas.territories.find(r=>r.id===state.focus);return `<aside class="comparison-panel"><p class="eyebrow">РАБОЧАЯ ПАНЕЛЬ</p>${focus?`<div class="territory-focus"><p class="caption">Выбранная территория</p><h3>${e(focus.short)}</h3>${metrics.map((m,i)=>`<div><span>${m}</span><strong>${signed(focus.values[i])}</strong></div>`).join('')}<p class="caption">Выберите точку карты, чтобы сменить территорию.</p></div>`:''}<h3>Сравнить территории</h3><p class="caption">Выберите две или три из отображаемых территорий.</p><div class="compare-options">${C.atlas.territories.filter(r=>state.selected.includes(r.id)).map(r=>`<label><input type="checkbox" data-compare="${r.id}" ${state.compared.includes(r.id)?'checked':''} ${rows.length>=3&&!state.compared.includes(r.id)?'disabled':''}><span>${e(r.short)}</span></label>`).join('')}</div>${rows.length>=2?`<div class="compare-key">${rows.map((r,i)=>`<span class="series-${i}"><i></i>${e(r.short)}</span>`).join('')}</div>${metrics.map((m,i)=>`<div class="compare-metric"><h4>${m}</h4><div class="compare-values" style="--series:${rows.length}">${rows.map((r,j)=>`<strong class="series-${j}" title="${e(r.short)}">${signed(r.values[i])}</strong>`).join('')}</div>${rows.length===2?`<small>Разность: ${fmt(rows[0].values[i]-rows[1].values[i])} п. п.<br>Первая территория − вторая</small>`:''}</div>`).join('')}<button class="button secondary" data-action="export-comparison">CSV сравнения ↓</button>`:'<p class="empty">Выберите ещё территорию для сравнения.</p>'}<p class="caption">Прогноз · база 2025 → 2031. Все три показателя — изменения в процентах.</p>${link(C.atlas.sourceHref,'Таблица 2 · PDF, с. 4 ↗','source')}<div class="panel-actions">${link('#/study/cod-2026?return='+encodeURIComponent(atlasHash),'Открыть доклад с этим срезом ↗')}${link('#/assistant?material=cod-2026&return='+encodeURIComponent(atlasHash)+'&question='+encodeURIComponent('Сравни '+metrics[state.metric]+': '+rows.map(r=>r.short).join(' и ')),'Обсудить сравнение ↗')}</div><button class="citation-button" data-cite="atlas">Скопировать цитирование данных</button></aside>`;}

export function bindHeroShowcase(root){
 const tabs=[...root.querySelectorAll('.hero-showcase-tabs [role="tab"]')];
 if(!tabs.length)return;
 function activate(active){
  for(const tab of tabs){
   const selected=tab===active;
   tab.setAttribute('aria-selected',String(selected));
   tab.tabIndex=selected?0:-1;
   root.querySelector('#'+tab.getAttribute('aria-controls')).hidden=!selected;
  }
 }
 tabs.forEach((tab,index)=>{
  tab.onclick=()=>activate(tab);
  tab.onkeydown=event=>{
   const target={
    ArrowLeft:(index+tabs.length-1)%tabs.length,
    ArrowRight:(index+1)%tabs.length,
    Home:0,End:tabs.length-1
   }[event.key];
   if(!Number.isInteger(target))return;
   event.preventDefault();
   activate(tabs[target]);
   tabs[target].focus();
  };
 });
}
