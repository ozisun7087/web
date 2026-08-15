(function(){
'use strict';
/* TOEFL Study Lab Speaking recorder v47
   Robust stop/re-record state machine for desktop + mobile browsers.
   - The record button is NEVER disabled while a session is active.
   - A second tap during permission/requesting, recording, or stopping always means STOP/CANCEL.
   - A repeated tap while already stopping becomes an emergency hard stop.
   - MediaRecorder/SpeechRecognition are never allowed to keep the UI locked: stop watchdog forces cleanup.
   - Every new round creates fresh media + recognition instances.
   - Preserves audio-delivery metrics and dispatches `toefl-speaking-round-complete` for strict 0-10 scoring.
*/

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const FRAME_MS=50;
const STOP_WATCHDOG_MS=1200;
const MAX_RECORDING_MS=120000;
let current=null;
let serial=0;
const sessions=new Map();
const rounds=new Map();
const audioUrls=new Map();

function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function byId(id){return document.getElementById(id);}
function recordButton(t){return t&&t.closest?t.closest('button.record[data-id]'):null;}
function isRepeat(btn){return !!clean(btn&&btn.dataset&&btn.dataset.prompt);}
function words(s){return String(s||'').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[];}
function setTranscript(id,text){const ta=byId(id+'tx');if(!ta)return;ta.value=clean(text);try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+ta.id,ta.value);}catch(e){}}
function setStatus(id,text){const el=byId(id+'st');if(el)el.textContent=text;}
function prepare(btn){
  if(!btn)return;const id=clean(btn.dataset.id);if(!id)return;
  if(!btn.dataset.recState)btn.dataset.recState='idle';
  btn.dataset.recorderV47='1';btn.disabled=false;
  const ta=byId(id+'tx');if(ta)ta.placeholder='本輪錄音逐字稿會自動更新在這裡，也可手動修改';
}
function idleButton(btn){if(!btn||!document.contains(btn))return;btn.disabled=false;btn.dataset.recState='idle';btn.textContent='● 錄音';btn.classList.remove('recording');}
function requestingButton(btn){if(!btn||!document.contains(btn))return;btn.disabled=false;btn.dataset.recState='requesting';btn.textContent='■ 取消錄音';btn.classList.add('recording');}
function recordingButton(btn){if(!btn||!document.contains(btn))return;btn.disabled=false;btn.dataset.recState='recording';btn.textContent='■ 停止錄音';btn.classList.add('recording');}
function stoppingButton(btn){if(!btn||!document.contains(btn))return;btn.disabled=false;btn.dataset.recState='stopping';btn.textContent='■ 正在停止…（再按可強制）';btn.classList.add('recording');}

function resetRoundUI(s){
  setTranscript(s.id,'');
  setStatus(s.id,'正在取得麥克風…再次按按鍵可取消');
  const old=audioUrls.get(s.id);if(old){try{URL.revokeObjectURL(old);}catch(e){}audioUrls.delete(s.id);}
  const au=byId(s.id+'au');if(au){try{au.pause();}catch(e){}au.hidden=true;au.removeAttribute('src');}
  const score=byId(s.id+'score');if(score)score.value='';
  if(!s.repeat){const rub=byId(s.id+'rub');if(rub)rub.value='';const box=byId(s.id+'interviewAuto');if(box)box.innerHTML='<span class="small">本輪完成後會依最新錄音內容重新評分。</span>';}
  else {const box=byId(s.id+'auto');if(box)box.innerHTML='<span class="small">本輪完成後會依最新錄音內容重新評分。</span>';}
}

function startAudioAnalysis(s){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC||!s.stream)return;
    const ctx=new AC();try{if(ctx.state==='suspended')ctx.resume();}catch(e){}
    const source=ctx.createMediaStreamSource(s.stream),an=ctx.createAnalyser();an.fftSize=1024;an.smoothingTimeConstant=0;source.connect(an);
    const buf=new Float32Array(an.fftSize);s.audioCtx=ctx;s.audioSource=source;s.analyser=an;s.rms=[];s.clipFrames=0;s.audioFrames=0;
    s.audioTimer=setInterval(()=>{
      if(s.finalized||!s.analyser)return;
      try{s.analyser.getFloatTimeDomainData(buf);}catch(e){return;}
      let sum=0,clip=0;
      for(let i=0;i<buf.length;i++){const v=buf[i],a=Math.abs(v);sum+=v*v;if(a>.985)clip++;}
      s.rms.push(Math.sqrt(sum/buf.length));s.audioFrames++;if(clip/buf.length>.01)s.clipFrames++;
    },FRAME_MS);
  }catch(e){}
}
function stopAudioAnalysis(s){
  if(!s)return;clearInterval(s.audioTimer);s.audioTimer=null;
  try{s.audioSource&&s.audioSource.disconnect();}catch(e){}try{s.analyser&&s.analyser.disconnect();}catch(e){}try{s.audioCtx&&s.audioCtx.close();}catch(e){}
  s.audioSource=null;s.analyser=null;s.audioCtx=null;
}
function percentile(a,p){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),i=Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)));return b[i];}
function audioMetrics(s,text){
  const a=(s.rms||[]).slice();
  const duration=s.startedAt?Math.max(.1,((s.stoppedAt||performance.now())-s.startedAt)/1000):0;
  if(!a.length)return{durationSec:duration,voicedRatio:0,activeSec:0,longestPauseSec:duration,leadingSilenceSec:duration,trailingSilenceSec:duration,meanRms:0,peakRms:0,clippingRatio:0,asrConfidence:null,wpm:0};
  const floor=percentile(a,.20),threshold=Math.max(.010,Math.min(.050,floor*2.35)),mask=a.map(x=>x>=threshold),first=mask.indexOf(true),last=mask.lastIndexOf(true);
  let voiced=0,maxRun=0,run=0;
  for(let i=0;i<mask.length;i++){
    if(mask[i]){voiced++;run=0;}
    else if(first>=0&&i>=first&&i<=last){run++;if(run>maxRun)maxRun=run;}
  }
  const activeSec=voiced*FRAME_MS/1000,spanFrames=first>=0?Math.max(1,last-first+1):a.length,voicedRatio=voiced/spanFrames;
  const leading=first<0?duration:first*FRAME_MS/1000,trailing=last<0?duration:Math.max(0,(a.length-1-last)*FRAME_MS/1000);
  const speechSpan=Math.max(.5,duration-leading-trailing),wc=words(text).length,wpm=wc*60/speechSpan;
  const conf=s.asrConfidenceWeight>0?s.asrConfidenceSum/s.asrConfidenceWeight:null;
  return{durationSec:duration,voicedRatio,activeSec,longestPauseSec:maxRun*FRAME_MS/1000,leadingSilenceSec:leading,trailingSilenceSec:trailing,meanRms:a.reduce((x,y)=>x+y,0)/a.length,peakRms:Math.max(...a),clippingRatio:(s.clipFrames||0)/Math.max(1,s.audioFrames||a.length),asrConfidence:conf,wpm};
}

function updateLive(s){if(!s||s.finalized)return;const text=clean(s.finalText+' '+s.interimText);s.latest=text;setTranscript(s.id,text);}
function stopRecognition(s,hard){
  clearTimeout(s.recognitionRestartTimer);s.recognitionRestartTimer=null;
  const r=s.recognition;if(!r)return;
  try{r.onresult=null;r.onerror=null;r.onend=null;}catch(e){}
  try{hard?r.abort():r.stop();}catch(e){try{r.abort();}catch(_){} }
  s.recognition=null;
}
function startRecognition(s,attempt){
  if(!SR||!s||s.finalized||s.stopRequested||s.state!=='recording'||current!==s)return;
  let r;try{r=new SR();}catch(e){return;}
  s.recognition=r;
  try{r.lang='en-US';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;}catch(e){}
  r.onresult=e=>{
    if(s.finalized||s.stopRequested||current!==s)return;
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const alt=e.results[i][0],t=clean(alt&&alt.transcript);if(!t)continue;
      if(e.results[i].isFinal){
        s.finalText=clean(s.finalText+' '+t);
        const c=Number(alt&&alt.confidence);if(Number.isFinite(c)&&c>0){const w=Math.max(1,words(t).length);s.asrConfidenceSum+=c*w;s.asrConfidenceWeight+=w;}
      }else interim=clean(interim+' '+t);
    }
    s.interimText=interim;updateLive(s);
  };
  r.onerror=e=>{
    if(s.finalized||s.stopRequested||current!==s)return;
    s.lastRecognitionError=String(e&&e.error||'');
  };
  r.onend=()=>{
    if(s.finalized||s.stopRequested||current!==s)return;
    if(s.interimText){s.finalText=clean(s.finalText+' '+s.interimText);s.interimText='';updateLive(s);}
    s.recognition=null;
    if(attempt<10)s.recognitionRestartTimer=setTimeout(()=>startRecognition(s,attempt+1),220);
  };
  try{r.start();}catch(e){
    try{r.abort();}catch(_){}s.recognition=null;
    if(!s.stopRequested&&attempt<10)s.recognitionRestartTimer=setTimeout(()=>startRecognition(s,attempt+1),300+attempt*80);
  }
}

function createAudioPlayback(s){
  if(!s.chunks||!s.chunks.length)return;
  try{
    const blob=new Blob(s.chunks,{type:s.mimeType||'audio/webm'});if(!blob.size)return;
    const url=URL.createObjectURL(blob),old=audioUrls.get(s.id);if(old)try{URL.revokeObjectURL(old);}catch(e){}
    audioUrls.set(s.id,url);const au=byId(s.id+'au');if(au){au.src=url;au.hidden=false;}
  }catch(e){}
}
function cleanupMedia(s){
  clearTimeout(s.maxTimer);clearTimeout(s.stopWatchdog);clearTimeout(s.recognitionRestartTimer);
  stopRecognition(s,true);stopAudioAnalysis(s);
  try{if(s.recorder&&s.recorder.state!=='inactive')s.recorder.stop();}catch(e){}
  try{s.stream&&s.stream.getTracks().forEach(t=>{try{t.stop();}catch(e){}});}catch(e){}
  s.recorder=null;s.stream=null;
}
function emitCompleted(s,text,metrics){
  try{document.dispatchEvent(new CustomEvent('toefl-speaking-round-complete',{detail:{id:s.id,round:s.round,repeat:s.repeat,transcript:text,prompt:s.prompt,audio:metrics}}));}catch(e){}
}
function finalize(s,reason,emit){
  if(!s||s.finalized)return;
  s.finalized=true;s.state='done';s.stoppedAt=s.stoppedAt||performance.now();
  clearTimeout(s.stopWatchdog);clearTimeout(s.maxTimer);clearTimeout(s.recognitionRestartTimer);
  stopAudioAnalysis(s);
  const text=clean(s.latest||s.finalText||s.interimText||byId(s.id+'tx')?.value||'');
  setTranscript(s.id,text);createAudioPlayback(s);
  const metrics=audioMetrics(s,text);
  if(emit!==false&&s.startedAt)emitCompleted(s,text,metrics);
  cleanupMedia(s);idleButton(s.btn);
  if(reason==='cancel')setStatus(s.id,'已取消本輪錄音，可立即重新錄音');
  else if(reason==='watchdog')setStatus(s.id,'已強制停止錄音並完成本輪，可立即再次錄音');
  else if(!text)setStatus(s.id,'第 '+s.round+' 輪完成｜未辨識到英文，可立即再次錄音');
  else setStatus(s.id,'第 '+s.round+' 輪完成｜可立即再次錄音');
  if(sessions.get(s.id)===s)sessions.delete(s.id);if(current===s)current=null;
}
function requestStop(s,reason){
  if(!s||s.finalized)return;
  /* Any second stop request is an emergency hard stop. */
  if(s.stopRequested){finalize(s,'watchdog',!!s.startedAt);return;}
  s.stopRequested=true;s.state='stopping';s.stoppedAt=performance.now();stoppingButton(s.btn);
  setStatus(s.id,'正在停止第 '+s.round+' 輪…若沒有立即結束，可再按一次強制停止');
  clearTimeout(s.maxTimer);clearTimeout(s.recognitionRestartTimer);
  stopRecognition(s,false);
  if(!s.stream&&!s.recorder){finalize(s,'cancel',false);return;}
  try{if(s.recorder&&s.recorder.state==='recording'){try{s.recorder.requestData();}catch(e){}s.recorder.stop();}else if(!s.recorder||s.recorder.state==='inactive'){setTimeout(()=>finalize(s,reason||'normal',!!s.startedAt),60);}}catch(e){setTimeout(()=>finalize(s,'watchdog',!!s.startedAt),30);}
  /* Stop tracks shortly after MediaRecorder.stop(), not before it gets its final data event. */
  setTimeout(()=>{try{s.stream&&s.stream.getTracks().forEach(t=>t.stop());}catch(e){}},120);
  s.stopWatchdog=setTimeout(()=>finalize(s,'watchdog',!!s.startedAt),STOP_WATCHDOG_MS);
}
function hardClose(s){if(!s||s.finalized)return;finalize(s,'watchdog',false);}

async function startSession(btn){
  prepare(btn);const id=clean(btn.dataset.id);if(!id)return;
  /* Guarantee only one live microphone session. */
  if(current&&!current.finalized)hardClose(current);
  const round=(rounds.get(id)||0)+1;rounds.set(id,round);
  const s={token:++serial,id,btn,round,prompt:clean(btn.dataset.prompt),repeat:isRepeat(btn),state:'requesting',stopRequested:false,finalized:false,stream:null,recorder:null,recognition:null,chunks:[],mimeType:'',finalText:'',interimText:'',latest:'',startedAt:0,stoppedAt:0,rms:[],clipFrames:0,audioFrames:0,asrConfidenceSum:0,asrConfidenceWeight:0};
  sessions.set(id,s);current=s;resetRoundUI(s);requestingButton(btn);
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
    setStatus(id,'目前瀏覽器無法使用錄音功能');finalize(s,'cancel',false);alert('目前瀏覽器無法使用錄音功能，請改用 Chrome／Edge／Safari。');return;
  }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(s.finalized||s.stopRequested||current!==s){try{stream.getTracks().forEach(t=>t.stop());}catch(e){}if(!s.finalized)finalize(s,'cancel',false);return;}
    s.stream=stream;s.startedAt=performance.now();startAudioAnalysis(s);
    const rec=new MediaRecorder(stream);s.recorder=rec;s.mimeType=rec.mimeType||'audio/webm';
    rec.ondataavailable=e=>{if(e.data&&e.data.size)s.chunks.push(e.data);};
    rec.onerror=()=>{if(!s.finalized)requestStop(s,'watchdog');};
    rec.onstop=()=>{if(s.stopRequested&&!s.finalized)setTimeout(()=>finalize(s,'normal',true),45);};
    rec.start(250);s.state='recording';recordingButton(btn);setStatus(id,'第 '+round+' 輪錄音中…再次按按鍵即可停止');startRecognition(s,0);
    s.maxTimer=setTimeout(()=>{if(!s.finalized)requestStop(s,'watchdog');},MAX_RECORDING_MS);
  }catch(e){
    if(!s.finalized){setStatus(id,'無法取得麥克風權限或啟動錄音');finalize(s,'cancel',false);}
  }
}

function handleRecordClick(ev){
  const btn=recordButton(ev.target);if(!btn)return;
  ev.preventDefault();ev.stopImmediatePropagation();prepare(btn);
  const id=clean(btn.dataset.id),s=sessions.get(id);
  if(s&&!s.finalized&&(s.state==='requesting'||s.state==='recording'||s.state==='stopping')){requestStop(s,'manual');return;}
  /* Recover a stale visual state rather than leaving the user locked out. */
  if(btn.dataset.recState&&btn.dataset.recState!=='idle'){idleButton(btn);setStatus(id,'錄音狀態已重設，請再按一次開始錄音');return;}
  startSession(btn);
}
document.addEventListener('click',handleRecordClick,true);

/* Re-initialize newly rendered Speaking cards without MutationObserver. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const normal=b.dataset&&b.dataset.t==='Speaking';
  const mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(!normal&&!mock)return;
  [0,80,250].forEach(ms=>setTimeout(()=>{const root=mock?byId('mock'):byId('content');if(root)root.querySelectorAll('button.record[data-id]').forEach(prepare);},ms));
},false);

function stopCurrentForNavigation(){if(current&&!current.finalized)requestStop(current,'navigation');}
window.addEventListener('pagehide',()=>{if(current&&!current.finalized)hardClose(current);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&current&&!current.finalized)requestStop(current,'background');});
setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),0);

if(!document.getElementById('speaking-record-v47-style')){
  const st=document.createElement('style');st.id='speaking-record-v47-style';
  st.textContent='button.record[data-rec-state="requesting"],button.record[data-rec-state="recording"],button.record[data-rec-state="stopping"]{pointer-events:auto!important;opacity:1!important}.record.recording{filter:saturate(1.15)}';document.head.appendChild(st);
}
window.__toeflSpeakingRecorderV47=true;
})();
