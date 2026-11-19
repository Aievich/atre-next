import {parseVoiceCommand,commandHash,createSpeechSession} from './voice-commands.mjs';

const mic='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/></svg>';
export const voiceButton=(mode='auto',label='Голосовое управление')=>`<button type="button" class="voice-launch" data-voice-open data-voice-mode="${mode}" aria-pressed="false" aria-controls="voice-feedback" aria-label="${label}" title="${label}">${mic}</button>`;

export function installVoiceControl(){
  const panel=document.createElement('aside');panel.id='voice-feedback';panel.className='voice-feedback';panel.hidden=true;panel.setAttribute('aria-label','Голосовой ввод');
  panel.innerHTML=`<div class="voice-feedback-head"><strong id="voice-status" role="status" aria-live="polite">Слушаю…</strong><button type="button" class="voice-close" aria-label="Закрыть голосовой ввод и остановить микрофон">×</button></div><label for="voice-transcript">Распознаваемая фраза</label><input id="voice-transcript" type="text" readonly placeholder="Говорите…"><p class="voice-note">Команда выполнится после распознавания. Повторное нажатие на микрофон останавливает запись.</p><small>Распознавание выполняет браузер, в том числе через свой сервис. Сайт не сохраняет аудио.</small>`;
  document.body.append(panel);
  const text=panel.querySelector('input'),status=panel.querySelector('#voice-status');
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recording=false,mode='auto',opener,timer;
  function state(active){recording=active;panel.classList.toggle('is-listening',active);document.querySelectorAll('[data-voice-open]').forEach(b=>{b.setAttribute('aria-pressed',String(active));b.classList.toggle('is-recording',active);});}
  function stop(){session?.stop();state(false);}
  function close(){clearTimeout(timer);stop();panel.hidden=true;if(opener?.isConnected)opener.focus();}
  function error(message){state(false);panel.classList.add('voice-error');status.textContent=message;}
  const session=Recognition&&window.isSecureContext?createSpeechSession(Recognition,event=>{
    if(event.state==='starting'||event.state==='listening'){
      state(true);status.textContent=event.state==='starting'?'Включаю микрофон…':'Слушаю…';text.value=event.text||'';
    }else if(event.state==='ready'){
      state(false);text.value=event.text;
      const command=parseVoiceCommand(event.text,mode),hash=commandHash(command,location.hash);
      if(!hash){error(command.kind==='empty'?'Команда не распознана. Попробуйте ещё раз.':command.label);return;}
      status.textContent=command.kind==='navigate'?'Открываю: '+command.label:command.kind==='search'?'Ищу по материалам…':'Передаю вопрос помощнику…';
      if(hash===location.hash)window.dispatchEvent(new HashChangeEvent('hashchange'));else location.hash=hash;
      timer=setTimeout(()=>{panel.hidden=true;},3500);
    }else error(event.message);
  }):null;
  panel.querySelector('.voice-close').addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)close();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&recording){stop();status.textContent='Микрофон выключен при переключении вкладки.';}});
  window.addEventListener('hashchange',()=>{if(recording){stop();panel.hidden=true;}});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-voice-open]');if(!button)return;
    clearTimeout(timer);opener=button;panel.hidden=false;panel.classList.remove('voice-error');
    if(recording){stop();status.textContent='Микрофон выключен. Нажмите ещё раз, чтобы повторить.';return;}
    mode=button.dataset.voiceMode||'auto';
    text.value='';
    if(!session){error('Голосовой ввод недоступен в этом браузере. Воспользуйтесь текстовым поиском или полем вопроса помощнику.');return;}
    session.start();
  });
  return voiceButton();
}
