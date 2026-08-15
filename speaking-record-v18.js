(function(){
'use strict';
/* TOEFL Study Lab Speaking recorder v18
   Listen and Repeat:
   - Every recording cycle is a fresh attempt.
   - Transcript is cleared at start, updated live, and finalized after Stop.
   - Latest 0-5 practice score is automatically recalculated from the newest transcript.
   - Delegated capture listener prevents the legacy recorder from overwriting the new cycle.
*/
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let active=null;
const rounds=new Map();
const audioUrls=new Map();

function repeatButton(target){
  const b=target&&target.closest?target.closest('button.record'):null;
  return b&&String(b.dataset.prompt||'').trim()?b:null;
}
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function wordList(s){return (String(s||'').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[]);}
function editDistance(a,b){
  const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)d[i][0]=i;
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return d[m][n];
}
function lcsLen(a,b){
  const n=b.length,dp=Array(n+1).fill(0);
  for(let i=1;i<=a.length;i++){
    let prev=0;
    for(let j=1;j<=n;j++){
      const tmp=dp[j];
      dp[j]=a[i-1]===b[j-1]?prev+1:Math.max(dp[j],dp[j-1]);
      prev=tmp;
    }
  }
  return dp[n];
}
function scoreRepeat(prompt,spoken){
  const p=wordList(prompt),s=wordList(spoken);
  if(!s.length||!p.length)return{score:0,similarity:0,coverage:0};
  const dist=editDistance(p,s),sim=Math.max(0,1-dist/Math.max(p.length,s.length,1));
  const lcs=lcsLen(p,s),coverage=lcs/Math.max(p.length,1),precision=lcs/Math.max(s.length,1);
  const metric=sim*.58+coverage*.27+precision*.15;
  let score=0;
  if(metric>=.96)score=5;else if(metric>=.84)score=4;else if(metric>=.66)score=3;else if(metric>=.44)score=2;else if(metric>=.16)score=1;
  return{score,similarity:Math.round(metric*100),coverage:Math.round(coverage*100)};
}
function qFor(btn){return btn.closest('.q');}
function el(id){return document.getElementById(id);}
function setTranscript(session,text){
  const ta=el(session.id+'tx');if(!ta)return;
  const v=clean(text);
  ta.value=v;
  ta.dispatchEvent(new Event('input',{bubbles:true}));
}
function setStatus(session,text){const s=el(session.id+'st');if(s)s.textContent=text;}
function scoreSelect(session){return el(session.id+'score');}
function resultBox(session){
  let box=el(session.id+'auto');
  if(!box){
    const ta=el(session.id+'tx');if(!ta)return null;
    box=document.createElement('div');box.id=session.id+'auto';box.className='speaking-auto-latest';ta.insertAdjacentElement('afterend',box);
  }
  box.classList.add('speaking-auto-latest');
  return box;
}
function clearLatest(session){
  const sel=scoreSelect(session);if(sel){sel.value='';sel.disabled=true;}
  const box=resultBox(session);if(box)box.innerHTML='<span class="small">本輪錄音完成後會自動更新逐字稿與最新分數。</span>';
}
function applyLatestScore(session,transcript){
  const r=scoreRepeat(session.prompt,transcript),sel=scoreSelect(session);
  if(sel){sel.value=String(r.score);sel.disabled=true;sel.dataset.autoLatest='1';}
  const box=resultBox(session);
  if(box){
    box.innerHTML='<div class="speaking-auto-score"><b>最新自動分數 '+r.score+'/5</b> <span class="small">｜逐字稿吻合度 '+r.similarity+'%｜內容涵蓋 '+r.coverage+'%｜第 '+session.round+' 輪</span></div><div class="small">此分數依本輪自動逐字稿與原句的字詞完整度／順序模擬；瀏覽器逐字稿無法完全取代正式考試對發音與可理解度的評分。</div>';
  }
  return r;
}
function updateLiveTranscript(session){
  session.latest=clean((session.finalText+' '+session.interimText));
  setTranscript(session,session.latest);
}
function setupRecognition(session){
  const r=new SR();session.recognition=r;session.recognitionDone=false;
  r.lang='en-US';r.continuous=true;r.interimResults=true;try{r.maxAlternatives=1;}catch(e){}
  r.onresult=function(e){
    if(session.done)return;
    let inter='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t=clean(e.results[i][0]&&e.results[i][0].transcript);
      if(!t)continue;
      if(e.results[i].isFinal)session.finalText=clean(session.finalText+' '+t);else inter=clean(inter+' '+t);
    }
    session.interimText=inter;updateLiveTranscript(session);
  };
  r.onerror=function(e){session.lastRecognitionError=e&&e.error?e.error:'';};
  r.onend=function(){
    session.recognitionDone=true;
    if(session.done)return;
    if(session.stopping){maybeFinalize(session);return;}
    if(active===session){
      session.restartTimer=setTimeout(function(){
        if(active!==session||session.stopping||session.done)return;
        session.interimText='';session.recognitionDone=false;
        try{r.start();}catch(e){session.recognitionDone=true;}
      },120);
    }
  };
  return r;
}
function setupRecorder(session){
  const rec=new MediaRecorder(session.stream);session.recorder=rec;session.recorderDone=false;
  rec.ondataavailable=e=>{if(e.data&&e.data.size)session.chunks.push(e.data);};
  rec.onstop=function(){
    session.recorderDone=true;
    if(session.chunks.length){
      const blob=new Blob(session.chunks,{type:rec.mimeType||'audio/webm'}),url=URL.createObjectURL(blob),au=el(session.id+'au');
      const old=audioUrls.get(session.id);if(old)try{URL.revokeObjectURL(old);}catch(e){}
      audioUrls.set(session.id,url);
      if(au){au.src=url;au.hidden=false;}
    }
    maybeFinalize(session);
  };
  return rec;
}
async function startAttempt(btn){
  if(active&&active!==null){
    if(active.btn===btn&&active.starting)return;
    await stopAttempt(active,true);
  }
  if(!SR){alert('目前瀏覽器不支援自動語音逐字稿。請使用支援 Speech Recognition 的 Chrome／Edge／Safari 環境後再錄音。');return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){alert('目前瀏覽器無法使用錄音功能，請改用 Chrome／Edge／Safari。');return;}
  const id=btn.dataset.id,prompt=String(btn.dataset.prompt||'').trim();
  if(!id||!prompt)return;
  const round=(rounds.get(id)||0)+1;rounds.set(id,round);
  const session={id,btn,prompt,round,starting:true,stopping:false,done:false,chunks:[],finalText:'',interimText:'',latest:'',recorderDone:false,recognitionDone:false};
  active=session;
  btn.disabled=true;btn.textContent='準備錄音…';btn.classList.add('recording');
  setTranscript(session,'');clearLatest(session);setStatus(session,'正在取得麥克風…');
  try{
    session.stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(active!==session||session.done){session.stream.getTracks().forEach(t=>t.stop());return;}
    setupRecorder(session);setupRecognition(session);
    session.recorder.start();
    try{session.recognition.start();}catch(e){throw e;}
    session.starting=false;btn.disabled=false;btn.textContent='■ 停止錄音';
    setStatus(session,'第 '+round+' 輪錄音中…逐字稿會即時更新');
  }catch(e){
    session.done=true;session.starting=false;btn.disabled=false;btn.textContent='● 錄音';btn.classList.remove('recording');
    try{session.stream?.getTracks().forEach(t=>t.stop());}catch(_){}
    if(active===session)active=null;
    setStatus(session,'無法開始錄音');
    alert('無法取得麥克風或啟動自動逐字稿，請確認瀏覽器的麥克風／語音辨識權限。');
  }
}
function stopAttempt(session,silent){
  return new Promise(resolve=>{
    if(!session||session.done){resolve();return;}
    if(session.stopping){session.stopResolvers=(session.stopResolvers||[]).concat(resolve);return;}
    session.stopping=true;session.stopResolvers=[resolve];
    clearTimeout(session.restartTimer);
    session.btn.disabled=true;session.btn.textContent='正在整理逐字稿…';
    setStatus(session,'停止錄音中…正在取得本輪最後逐字稿');
    try{session.recognition?.stop();}catch(e){session.recognitionDone=true;}
    try{if(session.recorder&&session.recorder.state!=='inactive')session.recorder.stop();else session.recorderDone=true;}catch(e){session.recorderDone=true;}
    session.forceTimer=setTimeout(()=>finalize(session,silent),1300);
    maybeFinalize(session,silent);
  });
}
function maybeFinalize(session,silent){
  if(session.done||!session.stopping)return;
  if(session.recorderDone&&session.recognitionDone)finalize(session,silent);
}
function finalize(session,silent){
  if(!session||session.done)return;
  session.done=true;clearTimeout(session.forceTimer);clearTimeout(session.restartTimer);
  const transcript=clean(session.latest||session.finalText||el(session.id+'tx')?.value||'');
  setTranscript(session,transcript);
  const r=applyLatestScore(session,transcript);
  session.btn.disabled=false;session.btn.textContent='● 錄音';session.btn.classList.remove('recording');
  setStatus(session,transcript?'第 '+session.round+' 輪完成｜逐字稿與最新分數已更新':'第 '+session.round+' 輪完成｜未辨識到有效英文，最新分數 '+r.score+'/5');
  try{session.stream?.getTracks().forEach(t=>t.stop());}catch(e){}
  if(active===session)active=null;
  (session.stopResolvers||[]).forEach(fn=>{try{fn();}catch(e){}});session.stopResolvers=[];
}

/* Capture phase: completely own Listen and Repeat recording clicks so legacy recordToggle cannot race with this recorder. */
document.addEventListener('click',function(ev){
  const btn=repeatButton(ev.target);if(!btn)return;
  ev.preventDefault();ev.stopImmediatePropagation();
  if(active&&active.btn===btn&&!active.starting){stopAttempt(active,false);return;}
  if(active&&active.btn===btn&&active.starting)return;
  startAttempt(btn);
},true);

function decorate(){
  document.querySelectorAll('button.record[data-prompt]').forEach(btn=>{
    if(!String(btn.dataset.prompt||'').trim())return;
    const id=btn.dataset.id,sel=el(id+'score');
    if(sel){
      sel.disabled=true;sel.title='每輪停止錄音後自動更新';
      const rub=sel.closest('.rub');if(rub){const label=rub.querySelector('span');if(label)label.textContent='最新自動分數';}
    }
    const ta=el(id+'tx');if(ta)ta.placeholder='本輪錄音逐字稿會自動更新在這裡';
    if(btn.dataset.v18decorated!=='1'){
      btn.dataset.v18decorated='1';
      const box=resultBox({id});if(box&&!box.textContent.trim())box.innerHTML='<span class="small">每次重新錄音都會覆蓋上一輪逐字稿，停止後自動更新最新分數。</span>';
    }
  });
}
new MutationObserver(decorate).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate);else decorate();
setTimeout(decorate,100);setTimeout(decorate,500);

if(!document.getElementById('speaking-record-v18-style')){
  const st=document.createElement('style');st.id='speaking-record-v18-style';
  st.textContent='.speaking-auto-latest{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}.speaking-auto-score{margin-bottom:3px}.record.recording{filter:saturate(1.15)}';
  document.head.appendChild(st);
}
})();
