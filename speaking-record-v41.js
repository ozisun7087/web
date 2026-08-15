(function(){
'use strict';
/* TOEFL Study Lab Speaking recorder v41
   Reliability goals:
   - Every recording round creates a fresh MediaRecorder, MediaStream, and SpeechRecognition instance.
   - A finished round is always fully disposed before the button is re-enabled.
   - SpeechRecognition is never restarted on the same instance; if the browser ends recognition early,
     a new recognition instance is created for the same round.
   - Works for both Listen and Repeat and Take an Interview.
   - Listen and Repeat automatically updates the latest 0-5 transcript-match practice score.
*/

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let current=null;
let serial=0;
const rounds=new Map();
const audioUrls=new Map();

function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function byId(id){return document.getElementById(id);}
function words(s){return String(s||'').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[];}
function recordButton(target){return target&&target.closest?target.closest('button.record[data-id]'):null;}
function isRepeat(btn){return !!clean(btn&&btn.dataset&&btn.dataset.prompt);}

function editDistance(a,b){
  const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)d[i][0]=i;
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}
function lcsLen(a,b){
  const dp=Array(b.length+1).fill(0);
  for(let i=1;i<=a.length;i++){
    let prev=0;
    for(let j=1;j<=b.length;j++){
      const tmp=dp[j];
      dp[j]=a[i-1]===b[j-1]?prev+1:Math.max(dp[j],dp[j-1]);
      prev=tmp;
    }
  }
  return dp[b.length];
}
function scoreRepeat(prompt,spoken){
  const p=words(prompt),s=words(spoken);
  if(!p.length||!s.length)return{score:0,similarity:0,coverage:0};
  const dist=editDistance(p,s),similarity=Math.max(0,1-dist/Math.max(p.length,s.length,1));
  const lcs=lcsLen(p,s),coverage=lcs/Math.max(p.length,1),precision=lcs/Math.max(s.length,1);
  const metric=similarity*.58+coverage*.27+precision*.15;
  const score=metric>=.96?5:metric>=.84?4:metric>=.66?3:metric>=.44?2:metric>=.16?1:0;
  return{score,similarity:Math.round(metric*100),coverage:Math.round(coverage*100)};
}

function setTranscript(id,text){
  const ta=byId(id+'tx');if(!ta)return;
  ta.value=clean(text);
  try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+ta.id,ta.value);}catch(e){}
}
function setStatus(id,text){const s=byId(id+'st');if(s)s.textContent=text;}
function resultBox(id){
  let box=byId(id+'auto');
  if(box){box.classList.add('speaking-auto-latest');return box;}
  const ta=byId(id+'tx');if(!ta)return null;
  box=document.createElement('div');box.id=id+'auto';box.className='speaking-auto-latest';
  ta.insertAdjacentElement('afterend',box);return box;
}
function prepareUI(btn){
  if(!btn)return;
  const id=clean(btn.dataset.id);if(!id)return;
  const ta=byId(id+'tx');if(ta)ta.placeholder='本輪錄音逐字稿會自動更新在這裡，也可手動修改';
  if(isRepeat(btn)){
    const sel=byId(id+'score');
    if(sel){
      sel.disabled=true;sel.title='每輪停止錄音後自動更新';
      const rub=sel.closest('.rub'),label=rub&&rub.querySelector('span');if(label)label.textContent='最新自動分數';
    }
    const box=resultBox(id);
    if(box&&!clean(box.textContent))box.innerHTML='<span class="small">每次重新錄音都會清空上一輪逐字稿；停止後自動更新最新分數。</span>';
  }
  btn.dataset.recorderV41='1';
}
function resetRoundUI(session){
  setTranscript(session.id,'');
  setStatus(session.id,'正在取得麥克風…');
  if(session.repeat){
    const sel=byId(session.id+'score');if(sel){sel.value='';sel.disabled=true;}
    const box=resultBox(session.id);if(box)box.innerHTML='<span class="small">本輪錄音完成後會自動更新逐字稿與最新分數。</span>';
  }
  const old=audioUrls.get(session.id);
  if(old){try{URL.revokeObjectURL(old);}catch(e){}audioUrls.delete(session.id);}
  const au=byId(session.id+'au');if(au){try{au.pause();}catch(e){}au.removeAttribute('src');au.hidden=true;}
}
function renderLive(session){
  if(!session||session.disposed)return;
  const t=clean(session.finalText+' '+session.interimText);
  session.latest=t;setTranscript(session.id,t);
}
function applyRepeatScore(session,transcript){
  const r=scoreRepeat(session.prompt,transcript);
  const sel=byId(session.id+'score');if(sel){sel.value=String(r.score);sel.disabled=true;sel.dataset.autoLatest='1';}
  const box=resultBox(session.id);
  if(box)box.innerHTML='<div class="speaking-auto-score"><b>最新自動分數 '+r.score+'/5</b> <span class="small">｜逐字稿吻合度 '+r.similarity+'%｜內容涵蓋 '+r.coverage+'%｜第 '+session.round+' 輪</span></div><div class="small">此為依最新逐字稿模擬的練習分數；瀏覽器逐字稿不能完整評估正式 TOEFL 所考量的發音與可理解度。</div>';
  return r;
}

function detachRecognition(r){
  if(!r)return;
  try{r.onresult=null;r.onerror=null;r.onend=null;r.onstart=null;}catch(e){}
  try{r.abort();}catch(e){}
}
function startRecognitionCycle(session){
  if(!SR||!session||session.stopping||session.disposed||current!==session)return;
  const cycle=++session.recognitionCycle;
  let r;
  try{r=new SR();}catch(e){session.recognitionUnavailable=true;return;}
  session.recognition=r;
  session.recognitionEnded=false;
  try{r.lang='en-US';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;}catch(e){}
  r.onresult=e=>{
    if(current!==session||session.disposed||session.stopping&&session.finalized)return;
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const text=clean(e.results[i][0]&&e.results[i][0].transcript);if(!text)continue;
      if(e.results[i].isFinal)session.finalText=clean(session.finalText+' '+text);else interim=clean(interim+' '+text);
    }
    session.interimText=interim;renderLive(session);
  };
  r.onerror=e=>{
    if(current!==session||session.disposed)return;
    session.recognitionError=e&&e.error?String(e.error):'';
    /* no-speech / aborted are normal lifecycle events; other errors still allow audio recording */
  };
  r.onend=()=>{
    if(session.disposed||cycle!==session.recognitionCycle)return;
    session.recognitionEnded=true;
    /* Preserve the last visible interim phrase if the browser ended before marking it final. */
    if(session.interimText){session.finalText=clean(session.finalText+' '+session.interimText);session.interimText='';renderLive(session);}
    detachRecognition(r);
    if(session.stopping){maybeFinish(session);return;}
    if(current===session){
      /* Never restart the same SpeechRecognition object. Create a fresh one. */
      session.recognitionRestartTimer=setTimeout(()=>startRecognitionCycle(session),180);
    }
  };
  try{r.start();}
  catch(e){
    detachRecognition(r);session.recognitionEnded=true;
    if(!session.stopping&&current===session)session.recognitionRestartTimer=setTimeout(()=>startRecognitionCycle(session),280);
  }
}

function setupRecorder(session){
  const rec=new MediaRecorder(session.stream);session.recorder=rec;session.recorderEnded=false;
  rec.ondataavailable=e=>{if(e.data&&e.data.size)session.chunks.push(e.data);};
  rec.onstop=()=>{
    session.recorderEnded=true;
    try{
      if(session.chunks.length){
        const blob=new Blob(session.chunks,{type:rec.mimeType||'audio/webm'}),url=URL.createObjectURL(blob);
        const old=audioUrls.get(session.id);if(old)try{URL.revokeObjectURL(old);}catch(e){}
        audioUrls.set(session.id,url);
        const au=byId(session.id+'au');if(au){au.src=url;au.hidden=false;}
      }
    }catch(e){}
    maybeFinish(session);
  };
  rec.onerror=()=>{session.recorderEnded=true;maybeFinish(session);};
  rec.start();
}

async function startAttempt(btn){
  prepareUI(btn);
  if(current){
    if(current.btn===btn&&!current.stopping)return stopAttempt(current);
    await stopAttempt(current,true);
  }
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
    alert('目前瀏覽器無法使用錄音功能，請改用 Chrome／Edge／Safari。');return;
  }
  const id=clean(btn.dataset.id);if(!id)return;
  const session={
    token:++serial,id,btn,prompt:clean(btn.dataset.prompt),repeat:isRepeat(btn),
    round:(rounds.get(id)||0)+1,starting:true,stopping:false,finalized:false,disposed:false,
    chunks:[],finalText:'',interimText:'',latest:'',stream:null,recorder:null,recognition:null,
    recorderEnded:false,recognitionEnded:!SR,recognitionCycle:0,waiters:[]
  };
  rounds.set(id,session.round);current=session;resetRoundUI(session);
  btn.disabled=true;btn.textContent='準備錄音…';btn.classList.add('recording');
  try{
    session.stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(current!==session||session.disposed){session.stream.getTracks().forEach(t=>t.stop());return;}
    setupRecorder(session);
    startRecognitionCycle(session);
    session.starting=false;btn.disabled=false;btn.textContent='■ 停止錄音';
    setStatus(id,'第 '+session.round+' 輪錄音中…逐字稿會即時更新');
  }catch(e){
    session.starting=false;session.stopping=true;session.recorderEnded=true;session.recognitionEnded=true;
    setStatus(id,'無法開始錄音');
    await dispose(session,false);
    alert('無法取得麥克風權限或啟動錄音，請確認瀏覽器權限。');
  }
}

function stopAttempt(session,silent){
  return new Promise(resolve=>{
    if(!session||session.disposed){resolve();return;}
    session.waiters.push(resolve);
    if(session.stopping)return;
    session.stopping=true;session.btn.disabled=true;session.btn.textContent='正在整理逐字稿…';
    setStatus(session.id,'停止錄音中…正在取得本輪最後逐字稿');
    clearTimeout(session.recognitionRestartTimer);
    try{
      if(session.recognition){session.recognition.stop();}
      else session.recognitionEnded=true;
    }catch(e){session.recognitionEnded=true;detachRecognition(session.recognition);}
    try{
      if(session.recorder&&session.recorder.state!=='inactive')session.recorder.stop();
      else session.recorderEnded=true;
    }catch(e){session.recorderEnded=true;}
    session.finishTimer=setTimeout(()=>finish(session,silent),1600);
    maybeFinish(session,silent);
  });
}
function maybeFinish(session,silent){
  if(!session||session.disposed||!session.stopping)return;
  if(session.recorderEnded&&session.recognitionEnded)finish(session,silent);
}
async function finish(session,silent){
  if(!session||session.finalized||session.disposed)return;
  session.finalized=true;clearTimeout(session.finishTimer);clearTimeout(session.recognitionRestartTimer);
  /* A late interim phrase is useful; keep it if no final event arrived. */
  const transcript=clean(session.latest||session.finalText||session.interimText||byId(session.id+'tx')?.value||'');
  setTranscript(session.id,transcript);
  let r=null;
  if(session.repeat)r=applyRepeatScore(session,transcript);
  if(transcript)setStatus(session.id,'第 '+session.round+' 輪完成｜逐字稿'+(session.repeat?'與最新分數':'')+'已更新');
  else setStatus(session.id,'第 '+session.round+' 輪完成｜未辨識到有效英文'+(session.repeat?'，最新分數 '+((r&&r.score)||0)+'/5':'') );
  await dispose(session,true);
}
async function dispose(session,restoreButton){
  if(!session||session.disposed)return;
  session.disposed=true;clearTimeout(session.finishTimer);clearTimeout(session.recognitionRestartTimer);
  detachRecognition(session.recognition);session.recognition=null;
  try{if(session.recorder&&session.recorder.state!=='inactive')session.recorder.stop();}catch(e){}
  try{session.stream&&session.stream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});}catch(e){}
  session.recorder=null;session.stream=null;session.chunks=[];
  /* Give Chromium/WebKit a brief release window before allowing the next SpeechRecognition session. */
  await new Promise(r=>setTimeout(r,120));
  if(restoreButton&&document.contains(session.btn)){
    session.btn.disabled=false;session.btn.textContent='● 錄音';session.btn.classList.remove('recording');
  }else if(document.contains(session.btn)){
    session.btn.disabled=false;session.btn.textContent='● 錄音';session.btn.classList.remove('recording');
  }
  if(current===session)current=null;
  const waiters=session.waiters.splice(0);waiters.forEach(fn=>{try{fn();}catch(e){}});
}

/* Capture all Speaking record buttons so the original one-shot recordToggle never runs. */
document.addEventListener('click',function(ev){
  const btn=recordButton(ev.target);if(!btn)return;
  ev.preventDefault();ev.stopImmediatePropagation();prepareUI(btn);
  if(current&&current.btn===btn&&!current.stopping&&!current.disposed){stopAttempt(current,false);return;}
  if(current&&current.btn===btn&&current.stopping)return;
  startAttempt(btn);
},true);

/* Initialize only newly opened Speaking panels. No MutationObserver/full-page loop. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const opensSpeaking=b.dataset&&b.dataset.t==='Speaking';
  const opensMockSpeaking=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(!opensSpeaking&&!opensMockSpeaking)return;
  setTimeout(()=>{
    const root=opensMockSpeaking?byId('mock'):byId('content');
    if(root)root.querySelectorAll('button.record[data-id]').forEach(prepareUI);
  },0);
},false);

/* If the user navigates away while recording, release hardware/state instead of poisoning the next round. */
document.addEventListener('click',function(ev){
  const tab=ev.target&&ev.target.closest?ev.target.closest('.tab'):null;
  if(tab&&current&&!current.disposed&&tab.dataset.t!=='Speaking')stopAttempt(current,true);
},false);

setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepareUI),0);
setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepareUI),250);

if(!document.getElementById('speaking-record-v41-style')){
  const st=document.createElement('style');st.id='speaking-record-v41-style';
  st.textContent='.speaking-auto-latest{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}.speaking-auto-score{margin-bottom:3px}.record.recording{filter:saturate(1.15)}';document.head.appendChild(st);
}
window.__toeflSpeakingRecorderV41={version:41,get active(){return !!current;}};
})();