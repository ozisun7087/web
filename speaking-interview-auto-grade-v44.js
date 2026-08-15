(function(){
'use strict';
/* TOEFL Study Lab Take-an-Interview conservative transcript grader v44
   Based on ETS 2026 construct: clear/coherent response, appropriate support/elaboration,
   effective vocabulary/grammar; official scoring also considers intelligibility/fluency,
   which a transcript-only browser grader cannot fully measure.
   v44 is intentionally conservative and question-aware. Short opinion answers with vague
   support can no longer receive 4/5 merely for containing 'because'.
*/
const timers=new Map();
const STOP=new Set(('a an the and or but if then than to of in on at for from with by as is are was were be been being do does did have has had can could will would should may might must it this that these those i me my we our you your they them their he she his her there here what which who whom where when why how').split(' '));
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function words(s){return clean(s).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[];}
function byId(id){return document.getElementById(id);}
function isInterview(btn){return !!(btn&&btn.matches&&btn.matches('button.record[data-id]')&&!clean(btn.dataset.prompt));}
function cardFor(btn){return btn&&btn.closest?btn.closest('.q'):null;}
function questionFor(btn){const q=cardFor(btn);const p=q&&q.querySelector('button.splay[data-text]');return clean(p&&p.dataset.text);}
function questionType(question){
  const q=question.toLowerCase();
  if(/\b(why|should|do you think|what do you think|agree|disagree|prefer|better|important|advantage|disadvantage|benefit|drawback|effect|impact|recommend|opinion|would you rather)\b/.test(q))return'opinion';
  if(/\b(describe|tell me about|experience|example|explain)\b/.test(q))return'experience';
  return'factual';
}
function contentWords(arr){return arr.filter(x=>!STOP.has(x)&&x.length>2);}
function features(text,question){
  const w=words(text),n=w.length,cw=contentWords(w),unique=new Set(w).size/Math.max(n,1),contentUnique=new Set(cw).size;
  const lower=' '+clean(text).toLowerCase()+' ';
  const reasons=(lower.match(/\b(because|since|therefore|so|as a result|one reason|the reason)\b/g)||[]).length;
  const examples=(lower.match(/\b(for example|for instance|such as|like when|one example)\b/g)||[]).length;
  const contrast=(lower.match(/\b(however|although|while|whereas|but|on the other hand)\b/g)||[]).length;
  const addition=(lower.match(/\b(also|another|in addition|moreover|besides|first|second)\b/g)||[]).length;
  const clauses=(lower.match(/\b(because|since|although|while|whereas|if|when|which|that|who|so|but|and)\b/g)||[]).length;
  const vagueEnd=/\b(it|this|that)\s+(can|could|will|would|may|might)?\s*(help|good|better|important|useful|bad)\s*[.!?]*$/i.test(clean(text))||/\bbecause\s+(it|this|that)\s+can\s+help\s*[.!?]*$/i.test(clean(text));
  const fragments=!/[a-z]/i.test(text)||n<4;
  const repetitions=n>=8?1-new Set(w).size/n:0;
  const qcw=new Set(contentWords(words(question)));
  const overlap=cw.filter(x=>qcw.has(x)).length;
  return{w,n,cw,unique,contentUnique,reasons,examples,contrast,addition,clauses,vagueEnd,fragments,repetitions,overlap};
}
function grade(text,question){
  const f=features(text,question),type=questionType(question);
  if(!f.n)return{score:0,n:0,type,detail:'No effective response was recognized.'};
  if(f.n<=3)return{score:1,n:f.n,type,detail:'Only a fragment or a few words were recognized.'};

  let score=1;
  if(type==='opinion'){
    /* Opinion/support questions require actual development, not merely a stance. */
    if(f.n>=6)score=2;
    if(f.n>=16&&f.contentUnique>=7&&(f.reasons+f.examples+f.contrast+f.addition)>=1&&!f.vagueEnd)score=3;
    if(f.n>=28&&f.contentUnique>=12&&(f.reasons+f.examples+f.contrast+f.addition)>=2&&f.clauses>=2&&!f.vagueEnd&&f.unique>=0.52)score=4;
    if(f.n>=45&&f.contentUnique>=18&&(f.reasons+f.examples+f.contrast+f.addition)>=3&&f.clauses>=3&&!f.vagueEnd&&f.unique>=0.58)score=5;
    /* A very short or vague reason is capped at 2. */
    if(f.n<16||f.vagueEnd)score=Math.min(score,2);
  }else if(type==='experience'){
    if(f.n>=6)score=2;
    if(f.n>=13&&f.contentUnique>=6)score=3;
    if(f.n>=24&&f.contentUnique>=10&&(f.examples+f.reasons+f.addition+f.clauses)>=1&&f.unique>=0.50)score=4;
    if(f.n>=38&&f.contentUnique>=15&&(f.examples+f.reasons+f.addition+f.clauses)>=2&&f.unique>=0.56)score=5;
  }else{
    /* Early factual/personal-information questions can be answered more briefly. */
    if(f.n>=5)score=2;
    if(f.n>=9&&f.contentUnique>=4)score=3;
    if(f.n>=15&&f.contentUnique>=7&&f.unique>=0.48)score=4;
    if(f.n>=25&&f.contentUnique>=11&&f.unique>=0.55)score=5;
  }

  if(f.repetitions>0.48)score=Math.min(score,2);
  if(f.unique<0.38&&f.n>=10)score=Math.min(score,3);
  /* Transcript-only language red flags that usually signal limited control. */
  const low=clean(text).toLowerCase();
  if(/\bshould preserve old building\b/.test(low))score=Math.min(score,2);
  if(/\bbecause (it|this|that) can help\b/.test(low))score=Math.min(score,2);

  const detail=score===5?'Well-developed and coherent response with substantial support and varied language.':score===4?'Clear and adequately developed response with relevant support and sufficient language range.':score===3?'Generally clear response, but support, elaboration, or language range is still limited.':score===2?'Limited response: the main idea is partly clear, but support/elaboration is insufficient or vague.':'Very limited effective response.';
  return{score,n:f.n,type,detail};
}
function boxFor(id){let box=byId(id+'interviewAuto');if(box)return box;const ta=byId(id+'tx');if(!ta)return null;box=document.createElement('div');box.id=id+'interviewAuto';box.className='interview-auto-v44';ta.insertAdjacentElement('afterend',box);return box;}
function setSelect(id,value){const s=byId(id);if(!s)return;s.value=value===''?'':String(value);s.disabled=true;s.title='停止錄音後依最新逐字稿保守模擬更新';try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+s.id,s.value);}catch(e){}}
function prepare(btn){if(!isInterview(btn))return;const id=clean(btn.dataset.id);if(!id)return;const finalSel=byId(id+'score');if(finalSel){finalSel.disabled=true;const rub=finalSel.closest('.rub'),label=rub&&rub.querySelector('span');if(label)label.textContent='最新自動分數';}const rubricSel=byId(id+'rub');if(rubricSel){rubricSel.disabled=true;const rub=rubricSel.closest('.rub'),label=rub&&rub.querySelector('span');if(label)label.textContent='Transcript-based score';}const box=boxFor(id);if(box&&!clean(box.textContent))box.innerHTML='<span class="small">完成錄音後，依 ETS 2026 Take an Interview 的清晰度、連貫、支持／展開與語言範圍做保守逐字稿模擬評分。</span>';}
function clearLatest(btn){const id=clean(btn.dataset.id);if(!id)return;setSelect(id+'score','');setSelect(id+'rub','');const box=boxFor(id);if(box)box.innerHTML='<span class="small">本輪完成後會以最新逐字稿重新評分。</span>';}
function scoreLatest(btn){if(!document.contains(btn))return;const id=clean(btn.dataset.id),ta=byId(id+'tx');if(!id||!ta)return;const text=clean(ta.value),question=questionFor(btn),r=grade(text,question);setSelect(id+'score',r.score);setSelect(id+'rub',r.score);const typeName=r.type==='opinion'?'意見／支持':r.type==='experience'?'經驗／說明':'事實／簡答';const box=boxFor(id);if(box)box.innerHTML='<div><b>最新保守模擬分數 '+r.score+'/5</b> <span class="small">｜辨識字數 '+r.n+'｜'+typeName+'題</span></div><div class="small">'+r.detail+' 正式 TOEFL 還會評量 intelligibility 與 fluency；本站只根據逐字稿，不能完整取代 ETS AI＋人工評分，因此不會把短而未充分展開的回答高估為 4–5 分。</div>';const st=byId(id+'st');if(st&&text)st.textContent='Interview 已依最新逐字稿保守評分 '+r.score+'/5';}
function scheduleGrade(btn){const id=clean(btn.dataset.id);if(!id)return;const old=timers.get(id);if(old)old.forEach(clearTimeout);const arr=[320,650,1100,1700].map((ms,idx)=>setTimeout(()=>{scoreLatest(btn);if(idx===3)timers.delete(id);},ms));timers.set(id,arr);}
document.addEventListener('click',function(ev){const btn=ev.target&&ev.target.closest?ev.target.closest('button.record[data-id]'):null;if(!isInterview(btn))return;prepare(btn);const state=btn.dataset.recState||'idle';if(state==='recording')scheduleGrade(btn);else if(state==='idle'||state==='')clearLatest(btn);},true);
document.addEventListener('click',function(ev){const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;const normal=b.dataset&&b.dataset.t==='Speaking',mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));if(!normal&&!mock)return;[0,80,250].forEach(ms=>setTimeout(()=>{const root=mock?byId('mock'):byId('content');if(root)root.querySelectorAll('button.record[data-id]').forEach(prepare);},ms));},false);
setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),0);
if(!document.getElementById('speaking-interview-auto-v44-style')){const st=document.createElement('style');st.id='speaking-interview-auto-v44-style';st.textContent='.interview-auto-v44{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}';document.head.appendChild(st);}
window.__toeflInterviewAutoGradeV44=true;
})();