(function(){
'use strict';
/* TOEFL Study Lab Speaking recorder v49
   iPhone/Safari playback fix:
   - Playback no longer depends on MediaRecorder container/MIME output.
   - Captures microphone PCM with Web Audio and encodes a standard mono 16-bit WAV.
   - Replaces the <audio> element every round so a prior Safari MEDIA_ERR_SRC_NOT_SUPPORTED state cannot persist.
   - Keeps robust stop/re-record behavior, live SpeechRecognition transcript, acoustic metrics,
     and dispatches `toefl-speaking-round-complete` for the strict 0-10 scorer.
*/
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const BUFFER_SIZE=2048;
const STOP_GRACE_MS=500;
const MAX_RECORDING_MS=120000;
let current=null,serial=0;
const rounds=new Map(),audioUrls=new Map();
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function byId(id){return document.getElementById(id);}
function recordButton(t){return t&&t.closest?t.closest('button.record[data-id]'):null;}
function isRepeat(btn){return !!clean(btn&&btn.dataset&&btn.dataset.prompt);}
function words(s){return String(s||'').toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[];}
function setTranscript(id,text){const ta=byId(id+'tx');if(!ta)return;ta.value=clean(text);try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+ta.id,ta.value);}catch(e){}}
function setStatus(id,text){const el=byId(id+'st');if(el)el.textContent=text;}
function prepare(btn){if(!btn)return;const id=clean(btn.dataset.id);if(!id)return;if(!btn.dataset.recState)btn.dataset.recState='idle';btn.dataset.recorderV49='1';btn.disabled=false;const ta=byId(id+'tx');if(ta)ta.placeholder='本輪錄音逐字稿會自動更新在這裡，也可手動修改';}
function idleButton(btn){if(!btn||!document.contains(btn))return;btn.disabled=false;btn.dataset.recState='idle';btn.textContent='● 錄音';btn.classList.remove('recording');}
function activeButton(btn,state){if(!btn||!document.contains(btn))return;btn.disabled=false;btn.dataset.recState=state;btn.classList.add('recording');btn.textContent=state==='requesting'?'■ 取消錄音':state==='stopping'?'■ 正在停止…（再按可強制）':'■ 停止錄音';}
function freshAudioElement(id,hide){
  const old=byId(id+'au');if(!old)return null;
  try{old.pause();}catch(e){}
  try{old.removeAttribute('src');old.load&&old.load();}catch(e){}
  const au=document.createElement('audio');
  au.id=old.id;au.controls=true;au.preload='metadata';au.setAttribute('playsinline','');au.setAttribute('webkit-playsinline','');
  au.className=old.className||'';au.style.cssText=old.style.cssText||'';au.hidden=hide!==false;
  old.replaceWith(au);return au;
}
function resetRoundUI(s){
  setTranscript(s.id,'');setStatus(s.id,'正在取得麥克風…再次按錄音鍵可取消');
  const oldUrl=audioUrls.get(s.id);if(oldUrl){try{URL.revokeObjectURL(oldUrl);}catch(e){}audioUrls.delete(s.id);}
  freshAudioElement(s.id,true);
  const score=byId(s.id+'score');if(score)score.value='';
  if(!s.repeat){const rub=byId(s.id+'rub');if(rub)rub.value='';const box=byId(s.id+'interviewAuto');if(box)box.innerHTML='<span class="small">本輪完成後會依最新錄音內容重新評分。</span>';}
  else{const box=byId(s.id+'auto');if(box)box.innerHTML='<span class="small">本輪完成後會依最新錄音內容重新評分。</span>';}
}
function updateLive(s){if(!s||s.finalized)return;const text=clean(s.finalText+' '+s.interimText);s.latest=text;setTranscript(s.id,text);}
function startRecognition(s,attempt){
  if(!SR||!s||s.finalized||s.stopRequested||s.state!=='recording'||current!==s)return;
  let r;try{r=new SR();}catch(e){return;}s.recognition=r;
  try{r.lang='en-US';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;}catch(e){}
  r.onresult=e=>{if(s.finalized||current!==s)return;let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const alt=e.results[i][0],t=clean(alt&&alt.transcript);if(!t)continue;if(e.results[i].isFinal){s.finalText=clean(s.finalText+' '+t);const c=Number(alt&&alt.confidence);if(Number.isFinite(c)&&c>0){const n=Math.max(1,words(t).length);s.asrConfidenceSum+=c*n;s.asrConfidenceWeight+=n;}}else interim=clean(interim+' '+t);}s.interimText=interim;updateLive(s);};
  r.onerror=e=>{if(s.finalized||current!==s)return;s.lastRecognitionError=String(e&&e.error||'');};
  r.onend=()=>{if(s.finalized||current!==s)return;if(s.interimText){s.finalText=clean(s.finalText+' '+s.interimText);s.interimText='';updateLive(s);}s.recognition=null;if(!s.stopRequested&&attempt<10)setTimeout(()=>startRecognition(s,attempt+1),220);};
  try{r.start();}catch(e){try{r.abort();}catch(_){}s.recognition=null;if(!s.stopRequested&&attempt<10)setTimeout(()=>startRecognition(s,attempt+1),300+attempt*80);}
}
function stopRecognition(s,hard){const r=s&&s.recognition;if(!r)return;try{if(hard)r.abort();else r.stop();}catch(e){try{r.abort();}catch(_){} }if(hard){try{r.onresult=null;r.onerror=null;r.onend=null;}catch(e){}s.recognition=null;}}
async function startPcm(s){
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('AudioContext unavailable');
  const ctx=new AC();s.audioCtx=ctx;s.sampleRate=ctx.sampleRate||44100;try{if(ctx.state==='suspended')await ctx.resume();}catch(e){}
  const source=ctx.createMediaStreamSource(s.stream),proc=ctx.createScriptProcessor?ctx.createScriptProcessor(BUFFER_SIZE,1,1):null;if(!proc)throw new Error('PCM capture unavailable');
  s.audioSource=source;s.processor=proc;s.pcm=[];s.rmsFrames=[];s.clipSamples=0;s.totalSamples=0;
  proc.onaudioprocess=e=>{
    if(s.finalized||s.stopRequested)return;
    const input=e.inputBuffer&&e.inputBuffer.numberOfChannels?e.inputBuffer.getChannelData(0):null;if(!input)return;
    const copy=new Float32Array(input.length);copy.set(input);s.pcm.push(copy);
    let sum=0,clip=0;for(let i=0;i<copy.length;i++){const v=copy[i],a=Math.abs(v);sum+=v*v;if(a>.985)clip++;}
    const rms=Math.sqrt(sum/Math.max(1,copy.length)),dur=copy.length/s.sampleRate;s.rmsFrames.push({rms,dur});s.clipSamples+=clip;s.totalSamples+=copy.length;
    try{const out=e.outputBuffer&&e.outputBuffer.getChannelData(0);if(out)out.fill(0);}catch(_){}
  };
  source.connect(proc);proc.connect(ctx.destination);
}
function stopPcm(s){if(!s)return;try{if(s.processor){s.processor.onaudioprocess=null;s.processor.disconnect();}}catch(e){}try{s.audioSource&&s.audioSource.disconnect();}catch(e){}s.processor=null;s.audioSource=null;}
function closeAudioContext(s){try{s.audioCtx&&s.audioCtx.close();}catch(e){}s.audioCtx=null;}
function percentile(a,p){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y),i=Math.min(b.length-1,Math.max(0,Math.floor((b.length-1)*p)));return b[i];}
function metrics(s,text){
  const frames=s.rmsFrames||[],duration=s.startedAt?Math.max(.1,((s.stoppedAt||performance.now())-s.startedAt)/1000):0;
  if(!frames.length)return{durationSec:duration,voicedRatio:0,activeSec:0,longestPauseSec:duration,leadingSilenceSec:duration,trailingSilenceSec:duration,meanRms:0,peakRms:0,clippingRatio:0,asrConfidence:null,wpm:0};
  const vals=frames.map(x=>x.rms),floor=percentile(vals,.2),threshold=Math.max(.008,Math.min(.04,floor*2.35)),mask=frames.map(x=>x.rms>=threshold),first=mask.indexOf(true),last=mask.lastIndexOf(true);
  let active=0,totalSpan=0,maxPause=0,run=0,mean=0,peak=0;
  for(let i=0;i<frames.length;i++){const f=frames[i];mean+=f.rms*f.dur;if(f.rms>peak)peak=f.rms;if(first>=0&&i>=first&&i<=last){totalSpan+=f.dur;if(mask[i]){active+=f.dur;run=0;}else{run+=f.dur;if(run>maxPause)maxPause=run;}}}
  const leading=first<0?duration:frames.slice(0,first).reduce((a,x)=>a+x.dur,0),trailing=last<0?duration:frames.slice(last+1).reduce((a,x)=>a+x.dur,0),span=Math.max(.5,duration-leading-trailing),wc=words(text).length;
  const conf=s.asrConfidenceWeight>0?s.asrConfidenceSum/s.asrConfidenceWeight:null;
  return{durationSec:duration,voicedRatio:totalSpan?active/totalSpan:0,activeSec:active,longestPauseSec:maxPause,leadingSilenceSec:leading,trailingSilenceSec:trailing,meanRms:mean/Math.max(.001,frames.reduce((a,x)=>a+x.dur,0)),peakRms:peak,clippingRatio:(s.clipSamples||0)/Math.max(1,s.totalSamples||1),asrConfidence:conf,wpm:wc*60/span};
}
function wavBlob(s){
  const chunks=s.pcm||[];let n=0;for(const c of chunks)n+=c.length;if(!n)return null;
  const sr=Math.round(s.sampleRate||44100),buf=new ArrayBuffer(44+n*2),v=new DataView(buf);let o=0;
  function str(x){for(let i=0;i<x.length;i++)v.setUint8(o++,x.charCodeAt(i));}
  str('RIFF');v.setUint32(o,36+n*2,true);o+=4;str('WAVE');str('fmt ');v.setUint32(o,16,true);o+=4;v.setUint16(o,1,true);o+=2;v.setUint16(o,1,true);o+=2;v.setUint32(o,sr,true);o+=4;v.setUint32(o,sr*2,true);o+=4;v.setUint16(o,2,true);o+=2;v.setUint16(o,16,true);o+=2;str('data');v.setUint32(o,n*2,true);o+=4;
  for(const c of chunks)for(let i=0;i<c.length;i++){let x=Math.max(-1,Math.min(1,c[i]));v.setInt16(o,x<0?x*32768:x*32767,true);o+=2;}
  return new Blob([buf],{type:'audio/wav'});
}
function installPlayback(s){
  const blob=wavBlob(s);if(!blob||blob.size<=44){setStatus(s.id,'本輪錄音已完成，但沒有取得可播放的音訊資料。');return;}
  const url=URL.createObjectURL(blob),old=audioUrls.get(s.id);if(old){try{URL.revokeObjectURL(old);}catch(e){}}audioUrls.set(s.id,url);
  const au=freshAudioElement(s.id,true);if(!au)return;
  let settled=false;const ok=()=>{if(settled)return;settled=true;au.hidden=false;au.dataset.playbackV49='wav';};
  const bad=()=>{if(settled)return;settled=true;au.hidden=true;setStatus(s.id,'本輪錄音已完成，但目前瀏覽器無法播放此 WAV 音檔；逐字稿與評分仍已保留。');};
  au.addEventListener('loadedmetadata',ok,{once:true});au.addEventListener('canplay',ok,{once:true});au.addEventListener('error',bad,{once:true});
  au.src=url;try{au.load();}catch(e){}
  setTimeout(()=>{if(!settled){if(au.readyState>=1)ok();else bad();}},1800);
}
function emitCompleted(s,text,m){try{document.dispatchEvent(new CustomEvent('toefl-speaking-round-complete',{detail:{id:s.id,round:s.round,repeat:s.repeat,transcript:text,prompt:s.prompt,audio:m}}));}catch(e){}}
function cleanup(s){clearTimeout(s.maxTimer);clearTimeout(s.stopTimer);stopRecognition(s,true);stopPcm(s);try{s.stream&&s.stream.getTracks().forEach(t=>t.stop());}catch(e){}closeAudioContext(s);s.stream=null;}
function finalize(s,reason,emit){
  if(!s||s.finalized)return;s.finalized=true;s.state='done';s.stoppedAt=s.stoppedAt||performance.now();clearTimeout(s.stopTimer);clearTimeout(s.maxTimer);stopPcm(s);
  const text=clean(s.latest||s.finalText||s.interimText||byId(s.id+'tx')?.value||'');setTranscript(s.id,text);const m=metrics(s,text);installPlayback(s);if(emit!==false&&s.startedAt)emitCompleted(s,text,m);cleanup(s);idleButton(s.btn);
  if(reason==='cancel')setStatus(s.id,'已取消本輪錄音，可立即重新錄音');else if(reason==='forced')setStatus(s.id,'已強制停止並完成本輪，可立即再次錄音');else if(!text)setStatus(s.id,'第 '+s.round+' 輪完成｜未辨識到英文，可立即再次錄音');else setStatus(s.id,'第 '+s.round+' 輪完成｜WAV 音檔已建立，可播放並可立即再次錄音');if(current===s)current=null;
}
function requestStop(s,forced){
  if(!s||s.finalized)return;if(s.stopRequested){finalize(s,'forced',!!s.startedAt);return;}s.stopRequested=true;s.state='stopping';s.stoppedAt=performance.now();activeButton(s.btn,'stopping');setStatus(s.id,'正在停止第 '+s.round+' 輪…若未結束可再按一次強制停止');clearTimeout(s.maxTimer);stopPcm(s);
  try{s.stream&&s.stream.getTracks().forEach(t=>t.stop());}catch(e){}
  try{stopRecognition(s,false);}catch(e){}
  s.stopTimer=setTimeout(()=>finalize(s,forced?'forced':'normal',!!s.startedAt),STOP_GRACE_MS);
}
async function startSession(btn){
  prepare(btn);const id=clean(btn.dataset.id);if(!id)return;if(current&&!current.finalized)finalize(current,'forced',false);
  const round=(rounds.get(id)||0)+1;rounds.set(id,round);const s={token:++serial,id,btn,round,prompt:clean(btn.dataset.prompt),repeat:isRepeat(btn),state:'requesting',stopRequested:false,finalized:false,stream:null,recognition:null,finalText:'',interimText:'',latest:'',startedAt:0,stoppedAt:0,pcm:[],rmsFrames:[],sampleRate:44100,clipSamples:0,totalSamples:0,asrConfidenceSum:0,asrConfidenceWeight:0};current=s;resetRoundUI(s);activeButton(btn,'requesting');
  if(!navigator.mediaDevices?.getUserMedia){setStatus(id,'目前瀏覽器無法使用麥克風');finalize(s,'cancel',false);return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(s.finalized||s.stopRequested||current!==s){try{stream.getTracks().forEach(t=>t.stop());}catch(e){}if(!s.finalized)finalize(s,'cancel',false);return;}
    s.stream=stream;s.startedAt=performance.now();await startPcm(s);s.state='recording';activeButton(btn,'recording');setStatus(id,'第 '+round+' 輪錄音中…再次按錄音鍵即可停止');startRecognition(s,0);s.maxTimer=setTimeout(()=>requestStop(s,false),MAX_RECORDING_MS);
  }catch(e){setStatus(id,'無法開始錄音：'+String(e&&e.message||e));finalize(s,'cancel',false);}
}
document.addEventListener('click',function(ev){const btn=recordButton(ev.target);if(!btn)return;ev.preventDefault();ev.stopImmediatePropagation();prepare(btn);const st=btn.dataset.recState||'idle';if(current&&current.btn===btn&&st!=='idle'){requestStop(current,st==='stopping');return;}startSession(btn);},true);
document.addEventListener('click',function(ev){const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;const normal=b.dataset&&b.dataset.t==='Speaking',mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));if(normal||mock)[0,100,300].forEach(ms=>setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),ms));},false);
window.addEventListener('pagehide',()=>{if(current&&!current.finalized)finalize(current,'forced',false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&current&&!current.finalized)requestStop(current,false);});
setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),0);
window.__toeflSpeakingRecorderV49=true;
})();