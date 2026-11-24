import {esc as e} from './lib.mjs';
import {aboutNav,projectCards} from './agency-expertise.mjs';

const pressEmail = 'media@agencytde.ru';
const phone = '<a href="tel:+74952272775">+7 (495) 227-27-75</a>';
const ratingHref = 'https://raex-rr.com/b2b/consulting/consulting_strategic_planning_and_organizational_development/2026/';
const outbound = (url,label) => `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`;
const media = [
  ['2026-10-22','РБК ТВ','Переговоры России и США и частные инвестиции в спорт',
    'Владислав Онищенко о финансовых расчётах, коммерческих правах и условиях привлечения инвесторов в спортивную отрасль.',
    'https://tv.rbc.ru/archive/den/6ad9bdfd2ae5963a4e824635'],
  ['2026-10-16','РБК ТВ','Что необходимо для нового инвестиционного цикла',
    'Владислав Онищенко о спросе, стоимости капитала и инфраструктуре для крупных проектов.',
    'https://tv.rbc.ru/archive/den/6ad1da402ae5962ff617603a'],
  ['2026-09-02','РБК ТВ','Мировой долг, роль доллара и цифровая торговля в ЕАЭС',
    'Владислав Онищенко о стоимости долгосрочного капитала и электронном обмене данными при трансграничных перевозках.',
    'https://tv.rbc.ru/archive/den/6a97d3182ae59640068503cd'],
  ['2026-05-27','RAEX','Почему компании обращаются за стратегическим консалтингом',
    'Интервью Владислава Онищенко о задачах, для которых компании и государственные организации привлекают консультантов.',
    'https://raex-rr.com/b2b/consulting/biggest_consulting_companies_and_groups/2026/opinions/onishenko_interview_2026/']
];

const team = [
  ['onishchenko','Владислав Онищенко','Генеральный директор','Стратегии и решения федерального уровня. Руководил Аналитическим центром при Правительстве РФ и Фондом «Центр стратегических разработок».'],
  ['vasin','Дмитрий Васин','Партнёр · 20+ лет','Стратегическое планирование, финансы и инвестиции, государственное и корпоративное управление.'],
  ['nakoryakova','Лора Накорякова','Партнёр · 15+ лет','Анализ рынков, платформенная экономика и устойчивое развитие.'],
  ['koksharova','Виктория Кокшарова','Партнёр · 15+ лет','ТЭК и ЖКХ, экономика замкнутого цикла и низкоуглеродное развитие.'],
  ['kaplinskaya','Диана Каплинская','Партнёр · 15+ лет','Инфраструктура, транспорт, прогнозирование и корпоративные стратегии.'],
  ['pavlyushina','Виктория Павлюшина','Партнёр · 12+ лет','Макроэкономика, туризм и гостеприимство, устойчивое развитие.'],
  ['klishina','Марина Клишина','Партнёр · 30+ лет','Государственные финансы, операционная эффективность и экономический анализ.'],
  ['kovaleva','Елена Ковалёва','Партнёр · 12+ лет','Отраслевые рынки, экономические эффекты и отраслевая политика.'],
  ['kostash','Вячеслав Косташ','Руководитель проектов · 17+ лет','Цифровая трансформация, ИТ-стратегия и проектное управление.']
];

const day = new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeZone:'UTC'});

export function pressRequestHref(data) {
  const value = key=>String(data.get(key)||'').trim();
  const subject = 'Запрос СМИ: '+value('subject');
  const body = ['Редакция: '+value('outlet'), ...(value('email')?['Email для ответа: '+value('email')]:[]),
    'Вопрос: '+value('question'), 'Срок ответа: '+(value('deadline')||'не указан')].join('\r\n\r\n');
  return `mailto:${pressEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function mediaPage(main) {
  main.innerHTML = `<div class="container agency-page">
    <header class="page-heading"><div><h1>Для СМИ</h1><p class="lead">Экспертные комментарии, интервью и публикации АТРЭ.</p></div></header>
    <div class="agency-split">
      <section class="agency-panel"><h2>Пресс-служба</h2><p><a href="mailto:${pressEmail}">${pressEmail}</a></p><p>${phone}</p>
        <p>Укажите вопрос, название редакции и срок, к которому нужен комментарий.</p></section>
      <section class="agency-panel"><h2>Запросить мнение АТРЭ</h2>
        <form id="press-request">
          <label>Редакция или издание<input name="outlet" required maxlength="100"></label>
          <label>Электронная почта для ответа<input name="email" type="email" required maxlength="254" autocomplete="email"></label>
          <label>Тема<input name="subject" required maxlength="120"></label>
          <label>Вопрос<textarea name="question" rows="4" required maxlength="900"></textarea></label>
          <label>Срок ответа (если есть)<input name="deadline" maxlength="100"></label>
          <div class="actions"><button type="submit" class="button dark">Отправить запрос</button>
            <button type="button" class="button secondary" data-press-mail>Открыть шаблон письма</button></div>
          <p class="caption">На локальном сайте запрос сохраняется в журнале этого сервера. Шаблон письма откроется в вашей почтовой программе.</p>
          <p data-press-status role="status" aria-live="polite"></p>
        </form>
      </section>
    </div>
    <section class="section compact"><h2>АТРЭ в СМИ</h2><div class="agency-grid">
    ${media.map(([date,source,title,note,url])=>`<article class="agency-panel"><p class="eyebrow">${source} · <time datetime="${date}">${day.format(new Date(date))}</time></p><h3>${outbound(url,title)}</h3><p>${note}</p></article>`).join('')}
    </div><p>${outbound('https://agencytde.ru/media/','Архив публикаций на сайте АТРЭ')}</p></section>
  </div>`;
  const form = main.querySelector('#press-request');
  const status = form.querySelector('[data-press-status]');
  form.querySelector('[data-press-mail]').addEventListener('click',()=>{
    location.href = pressRequestHref(new FormData(form));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    status.textContent = 'Сохраняем запрос…';
    try {
      const fields = Object.fromEntries(new FormData(form));
      const response = await fetch(new URL('api/press-requests',document.baseURI),{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fields)
      });
      if (response.status===400) {
        status.textContent = 'Проверьте заполнение обязательных полей и адрес для ответа.';
        return;
      }
      if (response.status!==201) throw Error('Request unavailable');
      const {id} = await response.json();
      if (!id) throw Error('Missing request number');
      form.reset();
      status.textContent = 'Запрос сохранён на локальном сервере. Номер: '+id;
    } catch {
      status.textContent = 'Сохранить запрос через сайт не удалось. Введённые данные сохранены в форме. Можно открыть шаблон письма.';
    } finally {
      submit.disabled = false;
    }
  });
}

function teamCards(data, people) {
  return `<div class="agency-people">${people.map(([id,name,role,focus])=>`<article class="agency-panel agency-person">
    <div class="agency-portrait${id==='onishchenko'?' agency-portrait-director':''}">
      <img src="${e(data.portraits[id].href)}" alt="" width="160" height="160" loading="lazy">
    </div>
    <div><h3>${e(name)}</h3><p class="agency-role">${e(role)}</p><p>${e(focus)}</p></div>
    </article>`).join('')}</div>`;
}

export function teamPage(main,data) {
  main.innerHTML = `<div class="container agency-page">${aboutNav('team')}
    <header class="page-heading"><div><h1>Команда АТРЭ</h1><p class="lead">Опыт консалтинга, науки, государственного управления и крупного бизнеса.</p></div></header>
    ${teamCards(data,team)}
  </div>`;
}

function partnerLogo(item, showName) {
  return `<li>${item.href?`<img src="${e(item.href)}" alt="${showName?'':e(item.name)}" loading="lazy">`:''}
    ${showName||!item.href?`<span>${e(item.name)}</span>`:''}</li>`;
}

function renderPartners(groups) {
  if (!groups?.length) return '';
  const logos = groups.flatMap(group=>group.organizations);
  const row = logos.map(item=>partnerLogo(item,false)).join('');
  return `<section class="agency-section agency-partners" aria-labelledby="agency-partners-title">
    <div class="section-title">
      <h2 id="agency-partners-title"><a href="#/about/partners">Клиенты и партнёры</a></h2>
      <button type="button" class="text-button" data-partner-pause aria-controls="agency-partner-ticker">Пауза</button>
    </div>
    <div class="agency-logo-window" id="agency-partner-ticker">
      <div class="agency-logo-track" style="--partner-cycle:${logos.length*4}s">
        <ul aria-label="Клиенты и партнёры">${row}</ul>
        <ul aria-hidden="true" inert>${row}</ul>
      </div>
    </div>
  </section>`;
}

export function partnersPage(main,data) {
  main.innerHTML = `<div class="container agency-page">${aboutNav('partners')}
    <header class="page-heading"><div><h1>Клиенты и партнёры</h1></div></header>
    <div class="agency-partner-groups">${data.partners.map(group=>`<section class="agency-panel">
      <h2>${e(group.title)}</h2><ul>${group.organizations.map(item=>partnerLogo(item,true)).join('')}</ul>
    </section>`).join('')}</div>
  </div>`;
}

export function aboutPage(main,data,projects) {
  const selected = ['appendix-11-03','appendix-13-02','appendix-17-02'].map(id=>projects.find(p=>p.id===id)).filter(Boolean);
  main.innerHTML = `<div class="container agency-page">
    ${aboutNav('about')}
    <header class="page-heading"><div><h1>Об АТРЭ</h1><p class="lead">Агентство трансформации и развития экономики помогает компаниям, отраслям и государству разрабатывать стратегии и воплощать их в проектах.</p></div><img class="agency-mark" src="/brand/logo-mark-dark.svg" alt=""></header>
    <div class="agency-grid agency-numbers">
      <div class="agency-panel"><strong>15+ лет</strong><p>Опыт команды</p></div>
      <div class="agency-panel"><strong>250+</strong><p>Проектов</p></div>
      <a class="agency-panel agency-rating" href="${ratingHref}" target="_blank" rel="noopener noreferrer">
        <strong>Топ-10</strong><span>Стратегический консалтинг России по данным RAEX, 2026 ↗</span></a>
      <div class="agency-panel"><strong>500 млрд руб.</strong><p>Совокупная годовая прибыль компаний-клиентов</p></div>
    </div>
    <section class="agency-section"><div class="section-title"><h2>Проектный опыт</h2><a href="#/about/projects">Все проекты</a></div>
      ${projectCards(selected)}
    </section>
    <section class="agency-section"><div class="section-title"><h2>Команда</h2><a href="#/about/team">Вся команда</a></div>
      ${teamCards(data,team.slice(0,3))}
    </section>
    ${renderPartners(data.partners)}
    <section class="agency-section agency-panel"><h2>Контакты</h2><p>${phone} · <a href="mailto:info@agencytde.ru">info@agencytde.ru</a></p><p>Москва, Газетный переулок, д. 3–5, стр. 1</p><p>${outbound('https://t.me/agencytde','Telegram АТРЭ')} · <a href="#/media">Пресс-служба</a></p></section>
  </div>`;
  const pause = main.querySelector('[data-partner-pause]');
  const ticker = main.querySelector('#agency-partner-ticker');
  pause?.addEventListener('click',()=>{
    pause.textContent = ticker.toggleAttribute('data-paused') ? 'Продолжить' : 'Пауза';
  });
}
