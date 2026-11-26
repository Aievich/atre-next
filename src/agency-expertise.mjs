import {esc as e,norm} from './lib.mjs';
import {matchesTaxonomy,sectors,taxonomySelect} from './taxonomy.mjs';
import {carouselControls,slideAttributes} from './publications.mjs';

const projectsRoute = '#/about/projects';
const sectorNames = new Map(sectors);
const extraSectors = new Set(['sport','consumer','labor']);
const researchPractices = {
  'cod-2026':['digital-transformation','strategy'],
  'sport-2026':['operations','investment'],
  'ved-platezhi-2026':['investment','international'],
  'polimery-2026':['operations','international'],
  'seraya-zanyatost':['regulation'],
  'volna-preemstvennosti':['strategy','organization'],
  'ved-platezhi-2025':['investment','international'],
  'lokalizaciya-taksi':['regulation'],
  'peredacha-biznesa':['strategy','organization'],
  'porty-baltiki':['strategy','international'],
  'porog-1000-evro':['regulation','international'],
  'farma-suverenitet':['strategy','regulation'],
  'tobacco-market-2026-07':['operations']
};
export const projectHref = id => projectsRoute+'/'+encodeURIComponent(id);
const practiceHref = id => '#/topics/practice/'+id;
const sectorHref = id => '#/topics/sector/'+id;
const link = (href,label,cls='') => `<a class="${cls}" href="${e(href)}">${e(label)}</a>`;
const unique = list => [...new Set(list)];
const sectorName = id => id==='government'?'Государство':sectorNames.get(id);
const heading = (title,lead='') => `<header class="page-heading"><div><h1>${e(title)}</h1>${lead?`<p class="lead">${e(lead)}</p>`:''}</div></header>`;
const hrefWith = (route,params) => route+(params.size?'?'+params:'');

const practiceShowcase = {
  strategy:{
    description:'Исследуем рынок и конкурентов, определяем цели и помогаем реализовать стратегию.',
    art:0
  },
  operations:{
    description:'Помогаем улучшать процессы, управлять поставками и измерять эффективность.',
    art:1
  },
  investment:{
    description:'Анализируем финансовое состояние, оцениваем инвестиции и помогаем управлять рисками.',
    art:2
  },
  regulation:{
    description:'Оцениваем влияние регулирования, разрабатываем меры поддержки и обосновываем тарифы.',
    art:3
  },
  'digital-transformation':{
    description:'Разрабатываем ИТ-стратегии, проектируем работу с данными и автоматизируем процессы.',
    art:4
  },
  climate:{
    description:'Разрабатываем стратегии устойчивого развития и решения для управления климатическими рисками.',
    art:5
  },
  international:{
    description:'Изучаем зарубежные рынки и помогаем подготовить выход и адаптировать продукты.',
    art:6
  },
  organization:{
    description:'Проектируем структуры и системы управления, сопровождаем изменения в компании.',
    art:7
  },
  innovation:{
    description:'Ищем и оцениваем технологии, помогаем внедрять инновации и цифровизировать производство.',
    art:8
  }
};

export function practiceArtStyle(id) {
  const art = practiceShowcase[id]?.art ?? 0;
  return `--art-x:${art%3*50}%;--art-y:${Math.floor(art/3)*50}%`;
}

export function renderPracticeShowcase(practices) {
  if (!practices.length) return '';
  return `<section class="practice-showcase" id="hero-practices-panel" role="tabpanel" aria-labelledby="hero-practices-tab" hidden data-carousel data-interval="7000">
    <div class="practice-showcase-header">
      <a class="practice-showcase-index" href="#/topics?view=practices">Все практики ↗</a>
      ${carouselControls('Предыдущая практика','Следующая практика',practices.length)}
    </div>
    <div class="carousel-slides" data-carousel-slides aria-live="off">
      ${practices.map((practice,index)=>{
        const description = practiceShowcase[practice.id]?.description || practice.directions[0]?.description;
        return `<article class="practice-showcase-slide" ${slideAttributes(index)}>
          <div class="practice-art" aria-hidden="true" style="${practiceArtStyle(practice.id)}"></div>
          <div class="practice-showcase-copy">
            <h2>${e(practice.title)}</h2>
            ${description?`<p>${e(description)}</p>`:''}
            ${link(practiceHref(practice.id),'Смотреть практику','button peach')}
          </div>
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

export function agencyProjects(corpus,data) {
  const appendix = new Map(data.projects.map(item=>[item.id,item]));
  const current = new Map(corpus.projects.map(item=>[item.id,item]));
  return unique([...appendix.keys(),...current.keys()]).map(id=>{
    const item = appendix.get(id);
    const previous = current.get(id);
    const tags = data.legacy[id];
    return {...previous,id,title:item?.title||previous.title,topics:previous?.topics||[],
      practices:unique([...(item?[item.practice]:[]),...(tags?.practices||[])]),
      sectors:unique([...(item?.sectors||[]),...(tags?.sectors||[])]),
      sourceSlide:item?.slide, legacyTitle:item&&previous ? previous.title : ''};
  });
}

export function matchProjects(projects,{practice,sector,topic,query}) {
  const term = norm(query);
  return projects.filter(item=>(!practice||item.practices.includes(practice)) &&
    (!sector||item.sectors.includes(sector)) && (!topic||item.topics.includes(topic)) &&
    (!term||norm([item.title,item.legacyTitle].join(' ')).includes(term)));
}

export function aboutNav(active) {
  return `<nav class="agency-subnav" aria-label="Об АТРЭ">${[['about','Об агентстве'],['team','Команда'],['projects','Проектный опыт'],['partners','Клиенты и партнёры']].map(([id,label])=>
    `<a href="${id==='about'?'#/about':'#/about/'+id}"${id===active?' aria-current="page"':''}>${label}</a>`).join('')}</nav>`;
}

export function projectCards(items) {
  return `<div class="agency-grid">${items.map(p=>`<article class="agency-panel agency-project">
    <h3>${link(projectHref(p.id),p.title)}</h3>
    ${p.sectors.length?`<p class="caption">${e(p.sectors.map(sectorName).join(' · '))}</p>`:''}
    </article>`).join('')}</div>`;
}

const projectFilters = {practice:'Практика',sector:'Сектор',topic:'Тема'};
function filterSelect(key,options,params) {
  return taxonomySelect(key,projectFilters[key],options,params.get(key),{practice:'Все практики',sector:'Все секторы',topic:'Все темы'}[key]);
}

export function projectsPage(main,corpus,data,projects,params) {
  const filters = {practice:params.get('practice'),sector:params.get('sector'),topic:params.get('topic'),query:params.get('q')||''};
  const rows = matchProjects(projects,filters);
  const pageSize = 24;
  const lastPage = Math.max(1,Math.ceil(rows.length/pageSize));
  const page = Math.min(lastPage,Math.max(1,Math.trunc(Number(params.get('page'))||1)));
  const pageUrl = number => {
    const next = new URLSearchParams(params);
    if (number===1) next.delete('page'); else next.set('page',number);
    return hrefWith(projectsRoute,next);
  };
  main.innerHTML = `<div class="container agency-page">${aboutNav('projects')}
    ${heading('Проектный опыт','Проекты и примеры работы АТРЭ по практикам и секторам.')}
    <form class="agency-filter" data-project-filters>
      ${filterSelect('practice',data.practices.map(p=>[p.id,p.title]),params)}
      ${filterSelect('sector',sectors.map(([id])=>[id,sectorName(id)]),params)}
      ${filterSelect('topic',corpus.topics.map(t=>[t.id,t.short]),params)}
      <label>Название проекта<input type="search" name="q" placeholder="Проект или организация" value="${e(filters.query)}"></label>
      <button type="submit" class="button dark">Найти</button>
    </form>
    <p class="caption" role="status">Найдено проектов: ${rows.length}</p>
    ${rows.length ? projectCards(rows.slice((page-1)*pageSize,page*pageSize)):'<p class="empty">По выбранным фильтрам проектов нет.</p>'}
    ${lastPage>1?`<nav class="agency-pagination" aria-label="Страницы проектного опыта">
      ${page>1?link(pageUrl(page-1),'Назад','button secondary'):''}<span>Страница ${page} из ${lastPage}</span>
      ${page<lastPage?link(pageUrl(page+1),'Далее','button secondary'):''}</nav>`:''}
  </div>`;
  const form = main.querySelector('[data-project-filters]');
  function apply() {
    const next = new URLSearchParams();
    for (const select of form.querySelectorAll('select')) if (select.value) next.set(select.dataset.taxonomy,select.value);
    if (form.elements.q.value.trim()) next.set('q',form.elements.q.value.trim());
    location.hash = hrefWith(projectsRoute,next);
  }
  form.addEventListener('change',event=>{ if (event.target.matches('select')) apply(); });
  form.addEventListener('submit',event=>{event.preventDefault();apply();});
}

export function projectPage(main,corpus,data,project) {
  const industries = project.sectors.map(id=>link(sectorHref(id),sectorName(id),'tag'));
  const practices = project.practices.map(id=>link(practiceHref(id),data.practices.find(p=>p.id===id).title,'tag'));
  const themes = project.topics.map(id=>link('#/topic/'+id,corpus.topics.find(t=>t.id===id)?.short||id,'tag'));
  main.innerHTML = `<div class="container agency-page">${aboutNav('projects')}
    ${link(projectsRoute,'← Проектный опыт','breadcrumb')}${heading(project.title)}
    <article class="agency-panel agency-project-detail">
      ${project.summary?`<p>${e(project.summary)}</p>`:''}
      ${project.result?`<h2>Результат</h2><p>${e(project.result)}</p>`:''}
      ${project.legacyTitle?`<p class="caption">Название в ранее опубликованном каталоге — ${e(project.legacyTitle)}.</p>`:''}
      ${!project.sourceSlide&&project.disclosureNote?`<p class="caption">${e(project.disclosureNote)}</p>`:''}
      ${practices.length?`<h2>Практики</h2><div class="agency-tags">${practices.join('')}</div>`:''}
      ${industries.length?`<h2>Секторы</h2><div class="agency-tags">${industries.join('')}</div>`:''}
      ${themes.length?`<h2>Темы исследований</h2><div class="agency-tags">${themes.join('')}</div>`:''}
    </article>
  </div>`;
}

function directionsNav(mode) {
  return `<nav class="agency-subnav" aria-label="Группировка направлений">
    ${[['practices','Практики'],['sectors','Секторы'],['themes','Темы исследований']].map(([id,name])=>
      `<a href="#/topics${id==='practices'?'':'?view='+id}"${id===mode?' aria-current="page"':''}>${name}</a>`).join('')}</nav>`;
}

export function directionsPage(main,corpus,data,projects,mode) {
  const renderSectors = list => `<div class="agency-grid">${list.map(([id])=>`<article class="agency-panel">
    <h3>${link(sectorHref(id),sectorName(id))}</h3><p class="caption">Проектов: ${matchProjects(projects,{sector:id}).length}
      · Исследований: ${corpus.materials.filter(m=>matchesTaxonomy(corpus,m,{sector:id})).length}</p></article>`).join('')}</div>`;
  const grouping = mode==='sectors' ?
    renderSectors(sectors.filter(([id])=>!extraSectors.has(id)))+
      `<h2 class="agency-secondary-title">Другие отрасли в исследованиях</h2>${renderSectors(sectors.filter(([id])=>extraSectors.has(id)))}` :
    mode==='themes' ?
      `<div class="agency-grid">${corpus.topics.map(t=>`<article class="agency-panel"><h3>${link('#/topic/'+t.id,t.short)}</h3>
      <p class="caption">Исследований: ${corpus.materials.filter(m=>m.topics.includes(t.id)).length}</p></article>`).join('')}</div>` :
      `<div class="agency-grid">${data.practices.map(p=>`<article class="agency-panel">
        <h3>${link(practiceHref(p.id),p.title)}</h3><p>${e(p.directions.map(d=>d.title).join(' · '))}</p>
        <p class="caption">Проектов: ${matchProjects(projects,{practice:p.id}).length}</p></article>`).join('')}</div>`;
  const selected = ['sectors','themes'].includes(mode)?mode:'practices';
  main.innerHTML = `<div class="container agency-page">
    ${heading('Консалтинг','Выберите практику по задаче или сектор по отрасли.')}
    ${directionsNav(selected)}${grouping}</div>`;
}

export function expertisePage(main,corpus,data,projects,type,id,renderStudies) {
  const practice = type==='practice'&&data.practices.find(p=>p.id===id);
  const title = practice?.title || (type==='sector'&&sectorName(id));
  if (!title) return false;
  const rows = matchProjects(projects,{[type]:id});
  const research = corpus.materials.filter(m=>practice ? researchPractices[m.id]?.includes(id) : matchesTaxonomy(corpus,m,{sector:id}));
  const relatedPractices = practice ? [] : unique(rows.flatMap(p=>p.practices));
  main.innerHTML = `<div class="container agency-page">
    ${link(practice?'#/topics':'#/topics?view=sectors','← Консалтинг','breadcrumb')}
    ${heading(title)}
    ${practice?`<section><h2>Основные направления</h2><div class="agency-grid">${practice.directions.map(d=>
      `<article class="agency-panel"><h3>${e(d.title)}</h3><p>${e(d.description)}</p></article>`).join('')}</div>
      </section>`:''}
    ${relatedPractices.length?`<section class="agency-section"><h2>Практики сектора</h2><div class="agency-tags">${relatedPractices.map(key=>
      link(practiceHref(key),data.practices.find(p=>p.id===key).title,'tag')).join('')}</div></section>`:''}
    ${rows.length?`<section class="agency-section"><div class="section-title"><h2>Проектный опыт</h2>
      ${link(projectsRoute+'?'+new URLSearchParams({[type]:id}),'Все проекты ('+rows.length+')')}</div>${projectCards(rows.slice(0,6))}</section>`:''}
    ${research.length?`<section class="agency-section"><h2>Исследования и данные</h2>${renderStudies(research)}</section>`:''}
    ${!practice&&!rows.length&&!research.length?'<p class="empty">По этому сектору пока нет связанных материалов или проектов в каталоге.</p>':''}
  </div>`;
  return true;
}
