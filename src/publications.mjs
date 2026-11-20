import {esc as e, norm} from './lib.mjs';

export function renderTags(material) {
  const tags = material.tags || [];
  if (!tags.length) return '';
  return `<ul class="publication-tags" aria-label="Ключевые слова">${tags.map(tag =>
    `<li><a href="#/studies?tag=${encodeURIComponent(tag)}">${e(tag)}</a></li>`
  ).join('')}</ul>`;
}

export function filterPublications(materials, {query = '', format = 'all', topic = '', tag = '', from = '', to = ''}) {
  const keyword = norm(query);
  return materials.filter(material =>
    (format === 'all' || material.format === format) &&
    (!topic || material.topics.includes(topic)) &&
    (!tag || material.tags?.includes(tag)) &&
    (!(from || to) || (material.date && (!from || material.date >= from) && (!to || material.date <= to))) &&
    (!keyword || norm([material.title, material.summary, ...(material.tags || [])].join(' ')).includes(keyword))
  );
}

const featuredReports = [
  {
    id: 'cod-2026',
    findings: [
      'По оценке доклада, на ЦОД приходилось около 1% потребления электроэнергии ОРЭМ в 2025 г.',
      'К 2042 г. мощность ЦОД может составить 3,6–32,2 ГВт в зависимости от сценария.'
    ]
  },
  {
    id: 'sport-2026',
    findings: [
      'Рынок фитнес-услуг в 2025 г. оценивался в 316,5 млрд руб. по данным FitnessData.',
      'В 2025 г. коммерческие договоры обеспечили 62,2% операционных доходов 16 клубов и групп РПЛ.'
    ]
  },
  {
    id: 'polimery-2026',
    cover: '/materials/polimery-2026/pages/page-01.jpg',
    findings: [
      'Российская нефтехимия завершает импортозамещение базовых полимеров и выходит на этап реализации профицита.',
      'Авторы выделяют устойчивый спрос с положительным нетбэком как условие эффективной загрузки мощностей.'
    ]
  }
];

export function renderFeaturedReports(materials) {
  const slides = featuredReports.flatMap(({id, cover, findings}) => {
    const material = materials.find(item => item.id === id);
    return material ? [{material, cover: cover || material.coverHref, findings}] : [];
  });
  return `<section class="featured-reports" data-carousel data-interval="5000" aria-labelledby="featured-reports-title">
    <h2 id="featured-reports-title">Исследования</h2>
    <div class="featured-panel">
      <div class="featured-tools">
        <a class="carousel-icon" href="#/studies" aria-label="Все материалы" title="Все материалы">${carouselIcons.catalog}</a>
        ${carouselControls('Предыдущий доклад', 'Следующий доклад', slides.length)}
      </div>
      <div class="carousel-slides" data-carousel-slides aria-live="off">
      ${slides.map(({material, cover, findings}, index) => `<article class="featured-report" ${slideAttributes(index)}>
        <img src="${e(cover)}" alt="Обложка доклада «${e(material.shortTitle)}»"${index ? ' loading="lazy"' : ''}>
        <div>
          <h3>${e(material.title)}</h3>
          <ul>${findings.map(finding => `<li>${e(finding)}</li>`).join('')}</ul>
          <a class="button dark" href="#/study/${e(material.id)}">Читать доклад</a>
        </div>
      </article>`).join('')}
      </div>
    </div>
  </section>`;
}

const carouselIcons = Object.fromEntries(Object.entries({
  catalog: 'M4 5h16M4 12h16M4 19h16',
  previous: 'm14 6-6 6 6 6',
  next: 'm10 6 6 6-6 6',
  pause: 'M9 5v14m6-14v14',
  play: 'm8 5 11 7-11 7z'
}).map(([name, path]) => [name, `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`]));

export function carouselIconButton(icon, label, attributes) {
  return `<button class="carousel-icon" type="button" ${attributes} aria-label="${e(label)}" title="${e(label)}">${carouselIcons[icon]}</button>`;
}

function carouselControls(previous, next, size) {
  if (size < 2) return '';
  return `<div class="carousel-controls">
    ${carouselIconButton('pause','Приостановить автосмену','data-carousel-pause')}
    ${carouselIconButton('previous',previous,'data-carousel-step="-1"')}
    ${carouselIconButton('next',next,'data-carousel-step="1"')}
  </div>`;
}

function slideAttributes(index) {
  return index ? 'data-carousel-slide inert aria-hidden="true"' : 'data-carousel-slide data-active aria-hidden="false"';
}

const newsHref = item => '#/news/' + encodeURIComponent(item.id);
const longDate = new Intl.DateTimeFormat('ru-RU', {dateStyle: 'long', timeZone: 'UTC'});
const shortDate = new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});

function renderDate(item, formatter = longDate) {
  const date = item.date || item.eventDate;
  return date ? `<time datetime="${e(date)}">${e(formatter.format(new Date(date)))}</time>` : '';
}

export function renderCurrentMaterials(news, materials) {
  const articles = news.items.slice(0, 3);
  const reports = [...materials].filter(item => item.type === 'report')
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 2);
  const slides = articles.flatMap((item, index) => [
    {item, label: 'Новость', href: newsHref(item)},
    ...reports.slice(index, index + 1).map(report => ({
      item: report, label: 'Публикация', href: '#/study/' + encodeURIComponent(report.id)
    }))
  ]);
  if (!slides.length) return '';
  const number = n => String(n).padStart(2, '0');
  return `<section class="current-materials" data-carousel data-interval="4500" aria-labelledby="current-materials-title">
    <div class="current-header">
      <h2 id="current-materials-title" tabindex="-1">Актуальное</h2>
      ${carouselControls('Предыдущий материал', 'Следующий материал', slides.length)}
    </div>
    <div class="carousel-slides" data-carousel-slides aria-live="off">
      ${slides.map(({item, label, href}, index) => `<a class="current-slide" href="${e(href)}" ${slideAttributes(index)}>
        <span class="current-art${item.coverHref ? ' current-cover' : ''}" aria-hidden="true">
          <img src="${e(item.coverHref || '/brand/logo-mark-light.svg')}" alt="">
        </span>
        <span class="current-copy">
          <span class="current-type">${label}</span>
          <strong>${e(item.title)}</strong>
          <span class="current-meta">${renderDate(item, shortDate)}<span aria-label="Материал ${index + 1} из ${slides.length}">${number(index + 1)} / ${number(slides.length)}</span></span>
        </span>
      </a>`).join('')}
    </div>
  </section>`;
}

export function enhanceHomeCarousels(main) {
  const cleanups = [...main.querySelectorAll('[data-carousel]')].map(enhanceCarousel);
  return () => cleanups.forEach(cleanup => cleanup());
}

function enhanceCarousel(section) {
  const slides = [...section.querySelectorAll('[data-carousel-slide]')];
  if (slides.length < 2) return () => {};
  const pause = section.querySelector('[data-carousel-pause]');
  const region = section.querySelector('[data-carousel-slides]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let playing = !motion.matches;
  let visible = false;
  let timer;

  function setActive(slide, value) {
    slide.toggleAttribute('data-active', value);
    slide.inert = !value;
    slide.setAttribute('aria-hidden', String(!value));
  }

  function show(step) {
    setActive(slides[active], false);
    active = (active + step + slides.length) % slides.length;
    setActive(slides[active], true);
  }

  function schedule() {
    clearInterval(timer);
    if (playing && visible && !region.matches(':hover, :focus-within') && !document.hidden) {
      timer = setInterval(() => show(1), Number(section.dataset.interval));
    }
  }

  function setPlaying(value) {
    playing = value;
    pause.innerHTML = playing ? carouselIcons.pause : carouselIcons.play;
    const label = playing ? 'Приостановить автосмену' : 'Возобновить автосмену';
    pause.setAttribute('aria-label', label);
    pause.title = label;
    region.setAttribute('aria-live', playing ? 'off' : 'polite');
    schedule();
  }

  pause.onclick = () => setPlaying(!playing);
  section.querySelectorAll('[data-carousel-step]').forEach(button => {
    button.onclick = () => {
      setPlaying(false);
      show(Number(button.dataset.carouselStep));
    };
  });
  for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) {
    region.addEventListener(event, () => queueMicrotask(schedule));
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  observer.observe(region);
  const updateMotion = () => setPlaying(!motion.matches);
  motion.addEventListener('change', updateMotion);
  document.addEventListener('visibilitychange', schedule);
  setPlaying(playing);
  return () => {
    clearInterval(timer);
    observer.disconnect();
    motion.removeEventListener('change', updateMotion);
    document.removeEventListener('visibilitychange', schedule);
  };
}

export function renderNews({items, archive}) {
  return `<div class="container"><header class="page-heading">
    <div><h1>Новости АТРЭ</h1></div>
    <a class="button secondary" href="${e(archive)}" target="_blank" rel="noopener noreferrer">Архив на сайте АТРЭ</a>
  </header>
  <div class="news-grid">${items.map(item => `<article class="news-card">
    <a class="news-card-link" href="${e(newsHref(item))}" aria-labelledby="news-title-${e(item.id)}">
      ${renderDate(item)}
      <h2 id="news-title-${e(item.id)}">${e(item.title)}</h2>
      <p>${e(item.summary)}</p>
    </a>
  </article>`).join('')}</div></div>`;
}

export function renderNewsArticle(item) {
  const sources = [{label: 'Публикация АТРЭ', url: item.url}, ...(item.additionalSources || [])];
  return `<div class="container">
    <article class="news-article">
      <a class="breadcrumb" href="#/news">← Все новости</a>
      <header>
        ${item.eventDate && !item.date ? '<span>Дата мероприятия · </span>' : ''}${renderDate(item)}
        <h1>${e(item.title)}</h1>
        <p class="lead">${e(item.summary)}</p>
      </header>
      <div class="news-article-body">${item.body.map(paragraph => `<p>${e(paragraph)}</p>`).join('')}</div>
      <div class="news-article-sources">
        <h2>Источники</h2>
        ${sources.map(({label, url}) => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`).join('')}
      </div>
    </article>
  </div>`;
}
