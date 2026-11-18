import {parseVoiceCommand,commandHash,createSpeechSession} from './voice-commands.mjs';

export function installVoiceControl(){
  const mic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/></svg>';
  const dialog=document.createElement('dialog');dialog.className='voice-dialog';dialog.id='voice-dialog';dialog.setAttribute('aria-labelledby','voice-title');
  dialog.innerHTML=`<div class="voice-heading"><div><p class="eyebrow">ГОЛОСОВОЕ УПРАВЛЕНИЕ</p><h2 id="voice-title">Скажите, что найти.</h2></div><button type="button" class="voice-close" aria-label="Закрыть голосовое управление">×</button></div>
  <p>Переходите между разделами, ищите материалы и задавайте вопросы помощнику.</p>
  <label class="voice-label" for="voice-mode">Действие</label><select id="voice-mode"><option value="auto">Определить по фразе</option><option value="navigate">Открыть раздел</option><option value="search">Найти в материалах</option><option value="assistant">Спросить помощника</option></select>
  <div class="voice-examples"><span>«Открой атлас данных»</span><span>«Найди полимеры»</span><span>«Спроси помощника: что такое ЦОД?»</span></div>
  <div class="voice-record"><button type="button" class="button dark" id="voice-record">${mic}<span>Начать запись</span></button><p id="voice-status" role="status" aria-live="polite"></p></div>
  <p class="voice-privacy">Микрофон включается только по кнопке. Речь может передаваться сервису браузера; может понадобиться интернет. Сайт не сохраняет аудио.</p>
  <form id="voice-form"><label class="voice-label" for="voice-text">Ваша фраза <span>— можно отредактировать или ввести вручную</span></label><textarea id="voice-text" rows="3" maxlength="4000" placeholder="Например: открой конструктор данных"></textarea><p id="voice-preview" aria-live="polite"></p><div class="voice-submit"><button type="submit" class="button dark" id="voice-apply" disabled>Выполнить</button><span>Сначала проверьте распознанную фразу.</span></div></form>`;
  document.body.append(dialog);
  const $=s=>dialog.querySelector(s),mode=$('#voice-mode'),text=$('#voice-text'),status=$('#voice-status'),record=$('#voice-record'),apply=$('#voice-apply');
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const supported=!!Recognition&&window.isSecureContext;
  let recording=false,opener;
  function preview(){const hints={auto:'«Открой атлас данных» · «Найди полимеры» · «Спроси помощника: что такое ЦОД?»',navigate:'Назовите раздел: «Атлас данных», «Исследования» или «Конструктор данных».',search:'Произнесите поисковый запрос: название темы, показатель или число.',assistant:'Продиктуйте вопрос свободно. Выбранный контекст помощника будет сохранён.'};$('.voice-examples').textContent=hints[mode.value];const cmd=parseVoiceCommand(text.value,mode.value);apply.disabled=['empty','unknown'].includes(cmd.kind);$('#voice-preview').textContent=cmd.kind==='empty'?'':cmd.kind==='navigate'?'Открыть: '+cmd.label:cmd.kind==='unknown'?cmd.label:cmd.label;apply.textContent=cmd.kind==='search'?'Найти':cmd.kind==='assistant'?'Спросить помощника':'Открыть раздел';}
  function idle(){recording=false;record.setAttribute('aria-pressed','false');record.querySelector('span').textContent='Начать запись';dialog.classList.remove('is-listening');text.readOnly=false;mode.disabled=false;preview();}
  const session=supported?createSpeechSession(Recognition,event=>{
    if(event.state==='starting'||event.state==='listening'){
      recording=true;text.readOnly=true;mode.disabled=true;apply.disabled=true;record.setAttribute('aria-pressed','true');record.querySelector('span').textContent='Остановить запись';dialog.classList.add('is-listening');
      status.textContent=event.state==='starting'?'Ожидаем доступ к микрофону…':'Слушаю… Произнесите одну фразу.';
      text.value=event.text||'';
    }else{idle();if(event.state==='ready'){text.value=event.text;status.textContent='Фраза распознана. Проверьте текст и выполните команду.';preview();text.focus();}else status.textContent=event.message;}
  }):null;
  function stop(){session?.stop();idle();}
  record.disabled=!supported;record.setAttribute('aria-pressed','false');
  function initialStatus(){status.textContent=supported?'Готов к записи на русском языке.':'Распознавание речи недоступно в этом браузере. Команду можно ввести ниже.';}
  initialStatus();
  record.addEventListener('click',()=>{if(recording){stop();status.textContent='Запись остановлена. Текст можно исправить и выполнить.';}else session?.start();});
  text.addEventListener('input',preview);mode.addEventListener('change',preview);
  $('#voice-form').addEventListener('submit',event=>{
    event.preventDefault();if(recording)return;
    const hash=commandHash(parseVoiceCommand(text.value,mode.value),location.hash);if(!hash){preview();return;}
    stop();dialog.close();
    if(hash===location.hash){document.querySelector('#main')?.focus();return;}
    location.hash=hash;document.querySelector('#main')?.focus();
  });
  $('.voice-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('cancel',stop);
  dialog.addEventListener('close',()=>{stop();if(opener?.isConnected)opener.focus();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&recording){stop();status.textContent='Запись остановлена при переключении вкладки.';}});
  window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-voice-open]');if(!button)return;
    opener=button;const route=location.hash.split('?')[0];mode.value=route==='#/assistant'?'assistant':route==='#/search'?'search':'auto';
    text.value='';initialStatus();preview();dialog.showModal();(supported?record:text).focus();
  });
  return `<button type="button" class="voice-launch" data-voice-open aria-haspopup="dialog" aria-controls="voice-dialog" aria-label="Голосовое управление" title="Голосовое управление">${mic}</button>`;
}
