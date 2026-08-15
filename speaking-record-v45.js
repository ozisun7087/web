(function(){
'use strict';
/* Speaking recorder v45
   - Keeps v42 unlimited re-recording behavior.
   - Captures real audio-delivery metrics during every recording round.
   - Dispatches `toefl-speaking-round-complete` with transcript + acoustic metrics.
   - Take-an-Interview v45 grader consumes that event; transcript is no longer the sole score source.
*/
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let current=null,staleRecognition=null,staleStream=null,serial=0;
const rounds=new Map(),audioUrls=new Map();
const FRAME_MS=50;
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function byId(id){return document.getElementById(id);}
function recordButton(t){return t&&t.closest?t.closest('button.record[data-id]'):null;}
function isRepeat(btn){return !!clean(btn&&btn.dataset&&btn.dataset.prompt);}
function words(s){return String(s||'').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[];}
function editDistance(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
function lcsLen(a,b){const dp=Array(b.length+1).fill(0);for(let i=1;i<=a.length;i++){let prev=0;for(let j=1;j<=b.length;j++){const tmp=dp[j];dp[j]=a[i-1]===b[j-1]?prev+1:Math.max(dp[j],dp[j-1]);prev=tmp;}}return dp[b.length];}
function scoreRepeat(prompt,spoken){const p=words(prompt),s=words(spoken);if(!p.length||!s.length)return{score:0,similarity:0,coverage:0};const dist=editDistance(p,s),similarity=Math.max(0,1-dist/Math.max(p.length,s.length,1));const l=lcsLen(p,s),coverage=l/Math.max(p.length,1),precision=l/Math.max(s.length,1),metric=similarity*.58+coverage*.27+precision*.15;return{score:metric>=.96?5:metric>=.84?4:metric>=.66?3:metric>=.44?2:metric>=.16?1:0,similarity:Math.round(metric*100),coverage:Math.round(coverage*100)};}
function setTranscript(id,text){const ta=byId(id+'tx');if(!ta)return;ta.value=clean(text);try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+ta.id,ta.value);}catch(e){}}
function setStatus(id,text){const s=byId(id+'st');if(s)s.textContent=text;}
function resultBox(id){let b=byId(id+'auto');if(b)return b;const ta=byId(id+'tx');if(!ta)return null;b=document.createElement('div');b.id=id+'auto';b.className='speaking-auto-latest';ta.insertAdjacentElement('afterend',b);return b;}
function prepare(btn){if(!btn)return;const id=clean(btn.dataset.id);if(!id)return;btn.dataset.recorderV45='1';btn.dataset.recState=btn.dataset.recState||'idle';const ta=byId(id+'tx');if(ta)ta.placeholder='本輪錄音逐字稿會自動更新在這裡，也可手動修改';if(isRepeat(btn)){const sel=byId(id+'score');if(sel){sel.disabled=true;const rub=sel.closest('.rub'),label=rub&&rub.querySelector('span');if(label)label.textContent='最新自動分數';}const box=resultBox(id);if(box&&!clean(box.textContent))box.innerHTML='<span class="small">可重複錄音；每輪都會以最新逐字稿覆蓋上一輪並重新評分。</span>';}}
function releaseButton(s){if(!s||!s.btn||!document.contains(s.btn))return;s.btn.disabled=false;s.btn.textContent='● 錄音';s.btn.classList.remove('recording');s.btn.dataset.recState='idle';}
function hardAbortStale(){try{if(staleRecognition){staleRecognition.onresult=null;staleRecognition.onend=null;staleRecognition.onerror=null;staleRecognition.abort();}}catch(e){}staleRecognition=null;try{if(staleStream)staleStream.getTracks().forEach(t=>t.stop());}catch(e){}staleStream=null;}
function resetUI(s){setTranscript(s.id,'');setStatus(s.id,'正在啟動第 '+s.round+' 輪錄音…');if(s.repeat){const sel=byId(s.id+'score');if(sel)sel.value='';const box=resultBox(s.id);if(box)box.innerHTML='<span class="small">本輪停止後會更新最新逐字稿與分數。</span>';}const old=audioUrls.get(s.id);if(old){try{URL.revokeObjectURL(old);}catch(e){}audioUrls.delete(s.id);}const au=byId(s.id+'au');if(au){try{au.pause();}catch(e){}au.hidden=true;au.removeAttribute('src');}}
function updateLive(s){if(!s||s.closed)return;const text=clean(s.finalText+' '+s.interimText);s.latest=text;setTranscript(s.id,text);}
function applyRepeatScore(s,text){if(!s.repeat)return;const r=scoreRepeat(s.prompt,text),sel=byId(s.id+'score');if(sel){sel.value=String(r.score);sel.disabled=true;}const box=resultBox(s.id);if(box)box.innerHTML='<div><b>最新自動分數 '+r.score+'/5</b> <span class="small">｜逐字稿吻合度 '+r.similarity+'%｜內容涵蓋 '+r.coverage+'%｜第 '+s.round+' 輪</span></div>';}

function startAudioAnalysis(s){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    const ctx=new AC(),source=ctx.createMediaStreamSource(s.stream),an=ctx.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=0;source.connect(an);
    const buf=new Float32Array(an.fftSize);s.audioCtx=ctx;s.audioSource=source;s.analyser=an;s.rms=[];s.clipFrames=0;s.audioFrames=0;
    s.audioTimer=setInterval(()=>{
      if(s.closed||!s.analyser)return;
      let sum=0,peak=0,clip=0;
      try{s.analyser.getFloatTimeDomainData(buf);}catch(e){return;}
      for(let i=0;i<buf.length;i++){const v=buf[i],a=Math.abs(v);sum+=v*v;if(a>peak)peak=a;if(a>.985)clip++;}
      const rms=Math.sqrt(sum/buf.length);s.rms.push(rms);s.audioFrames++;if(clip/buf.length>.01)s.clipFrames++;
    },FRAME_MS);
  }catch(e){}
}
function stopAudioAnalysis(s){
  if(!s)return;clearInterval(s.audioTimer);s.audioTimer=null;try{s.audioSource&&s.audioSource.disconnect();}catch(e){}try{s.analyser&&s.analyser.disconnect();}catch(e){}try{s.audioCtx&&s.audioCtx.close();}catch(e){}s.audioSource=null;s.analyser=null;s.audioCtx=null;
}
function percentile(a,p){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),i=Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)));return b[i];}
function audioMetrics(s,text){
  const a=(s.rms||[]).slice(),duration=Math.max(.1,(performance.now()-(s.startedAt||performance.now()))/1000);
  if(!a.length)return{durationSec:duration,voicedRatio:0,activeSec:0,longestPauseSec:duration,leadingSilenceSec:duration,trailingSilenceSec:duration,meanRms:0,peakRms:0,clippingRatio:0,asrConfidence:null,wpm:0};
  const floor=percentile(a,.2),threshold=Math.max(.012,Math.min(.05,floor*2.35)),mask=a.map(x=>x>=threshold),first=mask.indexOf(true),last=mask.lastIndexOf(true);
  let voiced=0,maxRun=0,run=0;for(let i=0;i<mask.length;i++){if(mask[i]){voiced++;run=0;}else if(first>=0&&i>=first&&i<=last){run++;if(run>maxRun)maxRun=run;}}
  const activeSec=voiced*FRAME_MS/1000,spanFrames=first>=0?Math.max(1,last-first+1):a.length,voicedRatio=voiced/spanFrames;
  const leading=first<0?duration:first*FRAME_MS/1000,trailing=last<0?duration:Math.max(0,(a.length-1-last)*FRAME_MS/1000);
  const speechSpan=Math.max(1,duration-leading-trailing),wc=words(text).length,wpm=wc*60/speechSpan;
  const conf=s.asrConfidenceWeight>0?s.asrConfidenceSum/s.asrConfidenceWeight:null;
  return{durationSec:duration,voicedRatio,activeSec,longestPauseSec:maxRun*FRAME_MS/1000,leadingSilenceSec:leading,trailingSilenceSec:trailing,meanRms:a.reduce((x,y)=>x+y,0)/a.length,peakRms:Math.max(...a),clippingRatio:(s.clipFrames||0)/Math.max(1,s.audioFrames||a.length),asrConfidence:conf,wpm};
}

function newRecognizer(s,attempt){if(!SR||!s||s.closed||s.stopping||current!==s)return;let r;try{r=new SR();}catch(e){setStatus(s.id,'錄音中，但此瀏覽器無法啟動自動逐字稿');return;}s.recognition=r;staleRecognition=r;try{r.lang='en-US';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;}catch(e){}
  r.onresult=e=>{if(s.closed||s.stopping||current!==s)return;let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const alt=e.results[i][0],t=clean(alt&&alt.transcript);if(!t)continue;if(e.results[i].isFinal){s.finalText=clean(s.finalText+' '+t);const c=Number(alt&&alt.confidence);if(Number.isFinite(c)&&c>0){const weight=Math.max(1,words(t).length);s.asrConfidenceSum+=c*weight;s.asrConfidenceWeight+=weight;}}else interim=clean(interim+' '+t);}s.interimText=interim;updateLive(s);};
  r.onerror=e=>{if(s.closed||current!==s)return;const err=String(e&&e.error||'');s.lastRecognitionError=err;if(!s.stopping&&/aborted|network|no-speech|audio-capture/i.test(err))setStatus(s.id,'第 '+s.round+' 輪錄音中…語音辨識重新連線');};
  r.onend=()=>{if(s.closed||s.stopping||current!==s)return;if(s.interimText){s.finalText=clean(s.finalText+' '+s.interimText);s.interimText='';updateLive(s);}s.recognition=null;if(attempt<8)setTimeout(()=>newRecognizer(s,attempt+1),250);};
  try{r.start();setStatus(s.id,'第 '+s.round+' 輪錄音中…逐字稿會即時更新');}catch(e){try{r.abort();}catch(_){}s.recognition=null;if(attempt<8){setStatus(s.id,'第 '+s.round+' 輪錄音中…正在重新啟動逐字稿');setTimeout(()=>newRecognizer(s,attempt+1),350+attempt*120);}else setStatus(s.id,'錄音中；自動逐字稿啟動失敗');}
}
async function start(btn){prepare(btn);if(btn.dataset.recState==='recording'){stop(current);return;}if(btn.dataset.recState==='starting')return;hardAbortStale();if(current&&!current.closed)await forceClose(current);if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){alert('目前瀏覽器無法使用錄音功能，請改用 Chrome／Edge／Safari。');return;}const id=clean(btn.dataset.id);if(!id)return;const round=(rounds.get(id)||0)+1;rounds.set(id,round);const s={token:++serial,id,btn,round,prompt:clean(btn.dataset.prompt),repeat:isRepeat(btn),stream:null,recorder:null,recognition:null,chunks:[],finalText:'',interimText:'',latest:'',stopping:false,closed:false,startedAt:0,rms:[],clipFrames:0,audioFrames:0,asrConfidenceSum:0,asrConfidenceWeight:0};current=s;resetUI(s);btn.dataset.recState='starting';btn.disabled=true;btn.textContent='準備錄音…';btn.classList.add('recording');try{s.stream=await navigator.mediaDevices.getUserMedia({audio:true});staleStream=s.stream;if(current!==s||s.closed){s.stream.getTracks().forEach(t=>t.stop());return;}s.startedAt=performance.now();startAudioAnalysis(s);const rec=new MediaRecorder(s.stream);s.recorder=rec;rec.ondataavailable=e=>{if(e.data&&e.data.size)s.chunks.push(e.data);};rec.onstop=()=>{try{if(s.chunks.length){const blob=new Blob(s.chunks,{type:rec.mimeType||'audio/webm'}),url=URL.createObjectURL(blob),old=audioUrls.get(id);if(old)URL.revokeObjectURL(old);audioUrls.set(id,url);const au=byId(id+'au');if(au){au.src=url;au.hidden=false;}}}catch(e){}};rec.start();btn.dataset.recState='recording';btn.disabled=false;btn.textContent='■ 停止錄音';newRecognizer(s,0);}catch(e){setStatus(id,'無法開始錄音');releaseButton(s);await forceClose(s);}}
function stop(s){if(!s||s.closed||s.stopping)return;s.stopping=true;s.btn.dataset.recState='stopping';s.btn.disabled=true;s.btn.textContent='正在停止…';setStatus(s.id,'正在完成第 '+s.round+' 輪…');try{if(s.recognition)s.recognition.stop();}catch(e){try{s.recognition&&s.recognition.abort();}catch(_){}}try{if(s.recorder&&s.recorder.state!=='inactive')s.recorder.stop();}catch(e){}setTimeout(()=>finish(s),260);}
function finish(s){if(!s||s.closed)return;stopAudioAnalysis(s);const text=clean(s.latest||s.finalText||s.interimText||byId(s.id+'tx')?.value||''),metrics=audioMetrics(s,text);setTranscript(s.id,text);applyRepeatScore(s,text);setStatus(s.id,text?'第 '+s.round+' 輪完成｜可立即再次錄音':'第 '+s.round+' 輪完成｜未辨識到英文，可立即再次錄音');
  try{document.dispatchEvent(new CustomEvent('toefl-speaking-round-complete',{detail:{id:s.id,round:s.round,repeat:s.repeat,transcript:text,prompt:s.prompt,audio:metrics}}));}catch(e){}
  releaseButton(s);forceClose(s);
}
async function forceClose(s){if(!s||s.closed)return;s.closed=true;stopAudioAnalysis(s);try{if(s.recognition){s.recognition.onresult=null;s.recognition.onend=null;s.recognition.onerror=null;s.recognition.abort();}}catch(e){}try{if(s.recorder&&s.recorder.state!=='inactive')s.recorder.stop();}catch(e){}try{s.stream&&s.stream.getTracks().forEach(t=>t.stop());}catch(e){}if(staleRecognition===s.recognition)staleRecognition=null;if(staleStream===s.stream)staleStream=null;s.recognition=null;s.recorder=null;s.stream=null;if(current===s)current=null;}
document.addEventListener('click',function(ev){const btn=recordButton(ev.target);if(!btn)return;ev.preventDefault();ev.stopImmediatePropagation();prepare(btn);if(btn.dataset.recState==='recording'){stop(current);return;}if(btn.dataset.recState==='stopping'||btn.dataset.recState==='starting')return;start(btn);},true);
document.addEventListener('click',function(ev){const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;const normal=b.dataset&&b.dataset.t==='Speaking',mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));if(!normal&&!mock)return;setTimeout(()=>{const root=mock?byId('mock'):byId('content');if(root)root.querySelectorAll('button.record[data-id]').forEach(prepare);},0);},false);
window.addEventListener('pagehide',()=>{hardAbortStale();if(current)forceClose(current);});setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),0);
if(!document.getElementById('speaking-record-v45-style')){const st=document.createElement('style');st.id='speaking-record-v45-style';st.textContent='.speaking-auto-latest{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}.record.recording{filter:saturate(1.15)}';document.head.appendChild(st);}
window.__toeflSpeakingRecorderV45=true;
})();