(function(){
'use strict';
/* TOEFL Study Lab Take-an-Interview auto grader v43
   Loaded BEFORE the recorder capture handler so it can observe start/stop clicks.
   - Every completed Interview recording is automatically scored 0-5 from the newest transcript.
   - Re-recording clears the prior score and replaces it with the newest score.
   - Updates both the visible Interview score and the rubric score selector.
   - Transcript-only practice score: pronunciation/acoustic quality cannot be fully measured here.
*/
const timers=new Map();
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function words(s){return clean(s).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[];}
function byId(id){return document.getElementById(id);}
function isInterview(btn){return !!(btn&&btn.matches&&btn.matches('button.record[data-id]')&&!clean(btn.dataset.prompt));}
function grade(text){
  const w=words(text),n=w.length;
  if(!n)return{score:0,n:0,detail:'No effective response was recognized.'};
  if(n<=2)return{score:1,n,detail:'Only a fragment or a few words were recognized.'};
  const unique=new Set(w).size/Math.max(n,1);
  const fillers=w.filter(x=>/^(um|uh|erm|hmm|like)$/.test(x)).length/Math.max(n,1);
  const developed=/(because|since|so|therefore|for example|for instance|such as|first|second|however|although|but|also|personally|i think|i prefer|i believe)/i.test(text);
  let score=n<7?2:n<14?3:n<25?4:5;
  if(n>=10&&n<14&&developed)score=4;
  if(n>=20&&developed)score=5;
  if(n>=12&&unique<0.42)score=Math.min(score,3);
  if(fillers>0.22)score=Math.min(score,3);
  const detail=score===5?'Clear, sufficiently developed response with useful detail.':score===4?'Clear response with adequate development.':score===3?'Generally understandable, but development is limited.':score===2?'Partially developed response with limited content.':'Very limited effective response.';
  return{score,n,detail};
}
function boxFor(id,btn){
  let box=byId(id+'interviewAuto');if(box)return box;
  const ta=byId(id+'tx');if(!ta)return null;
  box=document.createElement('div');box.id=id+'interviewAuto';box.className='interview-auto-v43';
  const details=ta.nextElementSibling;
  if(details)ta.insertAdjacentElement('afterend',box);else ta.parentElement.appendChild(box);
  return box;
}
function setSelect(id,value){
  const s=byId(id);if(!s)return;
  s.value=value===''?'':String(value);
  s.disabled=true;
  s.title='停止錄音後依最新逐字稿自動更新';
  try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+s.id,s.value);}catch(e){}
}
function prepare(btn){
  if(!isInterview(btn))return;
  const id=clean(btn.dataset.id);if(!id)return;
  const finalSel=byId(id+'score');
  if(finalSel){
    finalSel.disabled=true;finalSel.title='停止錄音後依最新逐字稿自動更新';
    const rub=finalSel.closest('.rub'),label=rub&&rub.querySelector('span');if(label)label.textContent='最新自動分數';
  }
  const rubricSel=byId(id+'rub');
  if(rubricSel){
    rubricSel.disabled=true;rubricSel.title='逐字稿模擬分數會自動更新';
    const rub=rubricSel.closest('.rub'),label=rub&&rub.querySelector('span');if(label)label.textContent='Transcript-based score';
  }
  const box=boxFor(id,btn);
  if(box&&!clean(box.textContent))box.innerHTML='<span class="small">完成錄音後，系統會依最新逐字稿自動模擬 Take an Interview 0–5 分。</span>';
}
function clearLatest(btn){
  const id=clean(btn.dataset.id);if(!id)return;
  setSelect(id+'score','');setSelect(id+'rub','');
  const box=boxFor(id,btn);if(box)box.innerHTML='<span class="small">本輪錄音完成後會自動更新最新 Interview 分數。</span>';
}
function scoreLatest(btn){
  if(!document.contains(btn))return;
  const id=clean(btn.dataset.id),ta=byId(id+'tx');if(!id||!ta)return;
  const text=clean(ta.value),r=grade(text);
  setSelect(id+'score',r.score);setSelect(id+'rub',r.score);
  const box=boxFor(id,btn);
  if(box)box.innerHTML='<div><b>最新自動分數 '+r.score+'/5</b> <span class="small">｜辨識字數 '+r.n+'</span></div><div class="small">'+r.detail+' 此分數依逐字稿模擬內容完整度、展開程度與語言多樣性；瀏覽器逐字稿無法完整評估正式 TOEFL 所考量的發音與可理解度。</div>';
  const st=byId(id+'st');if(st&&text)st.textContent=(clean(st.textContent)||'錄音完成')+'｜Interview 已自動評分 '+r.score+'/5';
}
function scheduleGrade(btn){
  const id=clean(btn.dataset.id);if(!id)return;
  const old=timers.get(id);if(old)old.forEach(clearTimeout);
  const arr=[360,700,1250].map((ms,idx)=>setTimeout(()=>{scoreLatest(btn);if(idx===2)timers.delete(id);},ms));
  timers.set(id,arr);
}
/* This handler must run before speaking-record-v42's capture handler, which stops propagation. */
document.addEventListener('click',function(ev){
  const btn=ev.target&&ev.target.closest?ev.target.closest('button.record[data-id]'):null;
  if(!isInterview(btn))return;
  prepare(btn);
  const state=btn.dataset.recState||'idle';
  if(state==='recording')scheduleGrade(btn);
  else if(state==='idle'||state==='')clearLatest(btn);
},true);
/* Prepare newly rendered Speaking panels without MutationObserver. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const normal=b.dataset&&b.dataset.t==='Speaking';
  const mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(!normal&&!mock)return;
  [0,80,250].forEach(ms=>setTimeout(()=>{
    const root=mock?byId('mock'):byId('content');if(root)root.querySelectorAll('button.record[data-id]').forEach(prepare);
  },ms));
},false);
setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),0);
if(!document.getElementById('speaking-interview-auto-v43-style')){
  const st=document.createElement('style');st.id='speaking-interview-auto-v43-style';
  st.textContent='.interview-auto-v43{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}';document.head.appendChild(st);
}
window.__toeflInterviewAutoGradeV43=true;
})();