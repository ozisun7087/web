(function(){
'use strict';
/* TOEFL Study Lab Speaking recorder v19
   - Fixes Mock -> Speaking freeze by removing the global MutationObserver/full-page rescans.
   - Listen and Repeat recording is initialized lazily only when its button is used.
   - Every recording cycle replaces the previous transcript and auto score.
*/
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let active=null;
const rounds=new Map();
const audioUrls=new Map();

function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function words(s){return String(s||'').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[];}
function byId(id){return document.getElementById(id);}
function repeatButton(target){
  const b=target&&target.closest?target.closest('button.record[data-prompt]'):null;
  return b&&clean(b.dataset.prompt)?b:null;
}
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
function resultBox(id){
  let box=byId(id+'auto');
  if(box){box.classList.add('speaking-auto-latest');return box;}
  const ta=byId(id+'tx');
  if(!ta)return null;
  box=document.createElement('div');
  box.id=id+'auto';
  box.className='speaking-auto-latest';
  ta.insertAdjacentElement('afterend',box);
  return box;
}
function prepareUI(btn){
  if(!btn)return;
  const id=btn.dataset.id;
  if(!id)return;
  const sel=byId(id+'score');
  if(sel){
    sel.disabled=true;
    sel.title='每輪停止錄音後自動更新';
    const rub=sel.closest('.rub');
    const label=rub&&rub.querySelector('span');
    if(label)label.textContent='最新自動分數';
  }
  const ta=byId(id+'tx');
  if(ta)ta.placeholder='本輪錄音逐字稿會自動更新在這裡';
  if(btn.dataset.v19prepared!=='1'){
    btn.dataset.v19prepared='1';
    const box=resultBox(id);
    if(box&&!clean(box.textContent))box.innerHTML='<span class="small">每次重新錄音都會覆蓋上一輪逐字稿，停止後自動更新最新分數。</span>';
  }
}
function setTranscript(id,text){
  const ta=byId(id+'tx');
  if(!ta)return;
  ta.value=clean(text);
  try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+ta.id,ta.value);}catch(e){}
}
function setStatus(id,text){const s=byId(id+'st');if(s)s.textContent=text;}
function resetLatest(id){
  const sel=byId(id+'score');
  if(sel){sel.value='';sel.disabled=true;}
  const box=resultBox(id);
  if(box)box.innerHTML='<span class="small">本輪錄音完成後會自動更新逐字稿與最新分數。</span>';
}
function applyScore(session,transcript){
  const r=scoreRepeat(session.prompt,transcript);
  const sel=byId(session.id+'score');
  if(sel){sel.value=String(r.score);sel.disabled=true;sel.dataset.autoLatest='1';}
  const box=resultBox(session.id);
  if(box)box.innerHTML='<div class="speaking-auto-score"><b>最新自動分數 '+r.score+'/5</b> <span class="small">｜逐字稿吻合度 '+r.similarity+'%｜內容涵蓋 '+r.coverage+'%｜第 '+session.round+' 輪</span></div><div class="small">此為依最新逐字稿模擬的練習分數；瀏覽器逐字稿不能完整評估正式 TOEFL 所考量的發音與可理解度。</div>';
  return r;
}
function updateTranscript(session){
  session.latest=clean(session.finalText+' '+session.interimText);
  setTranscript(session.id,session.latest);
}
function setupRecognition(session){
  const r=new SR();
  session.recognition=r;session.recognitionDone=false;
  r.lang='en-US';r.continuous=true;r.interimResults=true;
  try{r.maxAlternatives=1;}catch(e){}
  r.onresult=e=>{
    if(session.done)return;
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const text=clean(e.results[i][0]&&e.results[i][0].transcript);
      if(!text)continue;
      if(e.results[i].isFinal)session.finalText=clean(session.finalText+' '+text);
      else interim=clean(interim+' '+text);
    }
    session.interimText=interim;
    updateTranscript(session);
  };
  r.onerror=e=>{session.recognitionError=e&&e.error?e.error:'';};
  r.onend=()=>{
    session.recognitionDone=true;
    if(session.done)return;
    if(session.stopping){maybeFinalize(session);return;}
    if(active===session){
      session.restartTimer=setTimeout(()=>{
        if(active!==session||session.stopping||session.done)return;
        session.interimText='';session.recognitionDone=false;
        try{r.start();}catch(e){session.recognitionDone=true;}
      },140);
    }
  };
}
function setupRecorder(session){
  const rec=new MediaRecorder(session.stream);
  session.recorder=rec;session.recorderDone=false;
  rec.ondataavailable=e=>{if(e.data&&e.data.size)session.chunks.push(e.data);};
  rec.onstop=()=>{
    session.recorderDone=true;
    if(session.chunks.length){
      const blob=new Blob(session.chunks,{type:rec.mimeType||'audio/webm'});
      const url=URL.createObjectURL(blob),old=audioUrls.get(session.id);
      if(old)try{URL.revokeObjectURL(old);}catch(e){}
      audioUrls.set(session.id,url);
      const au=byId(session.id+'au');
      if(au){au.src=url;au.hidden=false;}
    }
    maybeFinalize(session);
  };
}
async function startAttempt(btn){
  prepareUI(btn);
  if(active){
    if(active.btn===btn&&active.starting)return;
    await stopAttempt(active,true);
  }
  if(!SR){alert('目前瀏覽器不支援自動語音逐字稿。請改用支援 Speech Recognition 的 Chrome／Edge／Safari。');return;}
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){alert('目前瀏覽器無法使用錄音功能，請改用 Chrome／Edge／Safari。');return;}
  const id=btn.dataset.id,prompt=clean(btn.dataset.prompt);
  if(!id||!prompt)return;
  const round=(rounds.get(id)||0)+1;rounds.set(id,round);
  const session={id,btn,prompt,round,starting:true,stopping:false,done:false,chunks:[],finalText:'',interimText:'',latest:'',recorderDone:false,recognitionDone:false,stopResolvers:[]};
  active=session;
  setTranscript(id,'');resetLatest(id);setStatus(id,'正在取得麥克風…');
  btn.disabled=true;btn.textContent='準備錄音…';btn.classList.add('recording');
  try{
    session.stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(active!==session||session.done){session.stream.getTracks().forEach(t=>t.stop());return;}
    setupRecorder(session);setupRecognition(session);
    session.recorder.start();session.recognition.start();
    session.starting=false;btn.disabled=false;btn.textContent='■ 停止錄音';
    setStatus(id,'第 '+round+' 輪錄音中…逐字稿會即時更新');
  }catch(e){
    session.done=true;session.starting=false;
    try{session.stream?.getTracks().forEach(t=>t.stop());}catch(_){}
    if(active===session)active=null;
    btn.disabled=false;btn.textContent='● 錄音';btn.classList.remove('recording');
    setStatus(id,'無法開始錄音');
    alert('無法取得麥克風或啟動自動逐字稿，請確認瀏覽器權限。');
  }
}
function stopAttempt(session,silent){
  return new Promise(resolve=>{
    if(!session||session.done){resolve();return;}
    if(session.stopping){session.stopResolvers.push(resolve);return;}
    session.stopping=true;session.stopResolvers.push(resolve);
    clearTimeout(session.restartTimer);
    session.btn.disabled=true;session.btn.textContent='正在整理逐字稿…';
    setStatus(session.id,'停止錄音中…正在取得本輪最後逐字稿');
    try{session.recognition?.stop();}catch(e){session.recognitionDone=true;}
    try{if(session.recorder&&session.recorder.state!=='inactive')session.recorder.stop();else session.recorderDone=true;}catch(e){session.recorderDone=true;}
    session.forceTimer=setTimeout(()=>finalize(session,silent),1400);
    maybeFinalize(session,silent);
  });
}
function maybeFinalize(session,silent){
  if(!session||session.done||!session.stopping)return;
  if(session.recorderDone&&session.recognitionDone)finalize(session,silent);
}
function finalize(session,silent){
  if(!session||session.done)return;
  session.done=true;clearTimeout(session.forceTimer);clearTimeout(session.restartTimer);
  const transcript=clean(session.latest||session.finalText||byId(session.id+'tx')?.value||'');
  setTranscript(session.id,transcript);
  const r=applyScore(session,transcript);
  if(document.contains(session.btn)){
    session.btn.disabled=false;session.btn.textContent='● 錄音';session.btn.classList.remove('recording');
  }
  setStatus(session.id,transcript?'第 '+session.round+' 輪完成｜逐字稿與最新分數已更新':'第 '+session.round+' 輪完成｜未辨識到有效英文，最新分數 '+r.score+'/5');
  try{session.stream?.getTracks().forEach(t=>t.stop());}catch(e){}
  if(active===session)active=null;
  session.stopResolvers.splice(0).forEach(fn=>{try{fn();}catch(e){}});
}

/* Lazy capture handler: no MutationObserver, no page-wide rescanning. */
document.addEventListener('click',function(ev){
  const btn=repeatButton(ev.target);
  if(!btn)return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  prepareUI(btn);
  if(active&&active.btn===btn&&!active.starting){stopAttempt(active,false);return;}
  if(active&&active.btn===btn&&active.starting)return;
  startAttempt(btn);
},true);

/* Prepare only the newly opened Speaking panel, once, after its normal click handler renders it. */
document.addEventListener('click',function(ev){
  const t=ev.target&&ev.target.closest?ev.target.closest('button'):null;
  if(!t)return;
  const opensSpeaking=t.dataset&&t.dataset.t==='Speaking';
  const opensMockSpeaking=/mockPart\(['\"]ms['\"]\)/.test(String(t.getAttribute('onclick')||''));
  if(!opensSpeaking&&!opensMockSpeaking)return;
  setTimeout(()=>{
    const root=opensMockSpeaking?document.getElementById('mock'):document.getElementById('content');
    if(!root)return;
    root.querySelectorAll('button.record[data-prompt]').forEach(prepareUI);
  },0);
},false);

if(!document.getElementById('speaking-record-v19-style')){
  const st=document.createElement('style');st.id='speaking-record-v19-style';
  st.textContent='.speaking-auto-latest{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}.speaking-auto-score{margin-bottom:3px}.record.recording{filter:saturate(1.15)}';
  document.head.appendChild(st);
}
})();
