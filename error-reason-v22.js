(function(){
'use strict';
/* TOEFL Study Lab error-reason tracker v22
   - Adds an error-reason dropdown to every actual practice item.
   - Complete-the-Words blanks each get their own dropdown.
   - One stored reason per stable question key; changing a reason moves the count instead of double-counting.
   - Displays cumulative counts in the bottom Weakness & Review card.
   - Uses explicit post-render scans only; no MutationObserver, preserving v20 stability mode.
*/

const REASONS=[
  '看不懂／聽不懂',
  '看懂但推論錯',
  '字彙',
  '句法',
  '粗心',
  '時間不足',
  '口音辨識',
  'Writing 組句',
  'Speaking 發音或展開不足'
];
const STORE_KEY='toefl-error-reasons-v22';
let assignments=loadAssignments();

function loadAssignments(){
  try{
    const x=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');
    return x&&typeof x==='object'&&!Array.isArray(x)?x:{};
  }catch(e){return {};}
}
function saveAssignments(){
  try{localStorage.setItem(STORE_KEY,JSON.stringify(assignments));}catch(e){}
}
function esc(s){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));}
function activeSection(){
  const b=document.querySelector('#tabs .tab.active');
  return b&&b.dataset&&b.dataset.t?String(b.dataset.t):'Practice';
}
function prefixFor(el){
  return el&&el.closest&&el.closest('#mock')?'Mock':activeSection();
}
function stableKey(prefix,id){return prefix+':'+String(id||'unknown');}
function optionsHTML(){
  return '<option value="">未選擇錯題原因</option>'+REASONS.map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>').join('');
}
function setAssignment(key,value){
  if(!key)return;
  if(value&&REASONS.includes(value))assignments[key]=value;
  else delete assignments[key];
  saveAssignments();
  renderStats();
}
function createSelector(key,label){
  const wrap=document.createElement('div');
  wrap.className='error-reason-wrap-v22';
  wrap.dataset.reasonKey=key;
  const lab=document.createElement('label');
  lab.className='error-reason-label-v22';
  lab.textContent=label||'錯題原因';
  const sel=document.createElement('select');
  sel.className='error-reason-select-v22';
  sel.setAttribute('aria-label',(label||'錯題原因')+'選擇');
  sel.innerHTML=optionsHTML();
  sel.value=REASONS.includes(assignments[key])?assignments[key]:'';
  sel.addEventListener('change',()=>setAssignment(key,sel.value));
  lab.appendChild(sel);wrap.appendChild(lab);
  return wrap;
}
function questionIdentity(q){
  const rec=q.querySelector('button.record[data-id]');
  if(rec&&rec.dataset.id)return rec.dataset.id;
  const fill=q.querySelector('.ckfill[data-id]');
  if(fill&&fill.dataset.id)return fill.dataset.id;
  const mcq=q.querySelector('.ckmcq[data-name]');
  if(mcq&&mcq.dataset.name)return mcq.dataset.name;
  const ta=[...q.querySelectorAll('textarea[id]')].find(x=>!['notes','review'].includes(x.id));
  if(ta)return ta.id;
  const text=[...q.querySelectorAll('input[type="text"][id]')].find(x=>!/^rf\d+$/.test(x.id));
  if(text)return text.id;
  return '';
}
function isActualQuestion(q){
  return !!(q.querySelector('.ckfill[data-id],.ckmcq[data-name],button.record[data-id],textarea[id]'));
}
function installCtest(q){
  const inputs=[...q.querySelectorAll('input[type="text"][id^="rf"]')].filter(x=>/^rf\d+$/.test(x.id));
  if(!inputs.length)return false;
  let panel=q.querySelector('.ctest-reasons-v22');
  if(!panel){
    panel=document.createElement('div');
    panel.className='ctest-reasons-v22';
    const title=document.createElement('div');
    title.className='error-reason-title-v22';
    title.textContent='各空格錯題原因';
    panel.appendChild(title);
    const action=q.querySelector('.actions');
    if(action)action.insertAdjacentElement('afterend',panel);else q.appendChild(panel);
  }
  const prefix=prefixFor(q);
  inputs.forEach((input,i)=>{
    const key=stableKey(prefix,input.id);
    if(panel.querySelector('[data-reason-key="'+CSS.escape(key)+'"]'))return;
    panel.appendChild(createSelector(key,'第 '+(i+1)+' 空'));
  });
  return true;
}
function installQuestion(q){
  if(!q||q.dataset.errorReasonV22==='1')return;
  if(installCtest(q)){q.dataset.errorReasonV22='1';return;}
  if(!isActualQuestion(q))return;
  const id=questionIdentity(q);if(!id)return;
  const key=stableKey(prefixFor(q),id);
  if(q.querySelector('.error-reason-wrap-v22[data-reason-key="'+CSS.escape(key)+'"]')){q.dataset.errorReasonV22='1';return;}
  const wrap=createSelector(key,'錯題原因');
  const feedback=q.querySelector('.feedback');
  const answer=q.querySelector('.answer');
  const rub=q.querySelector('.rub');
  if(feedback)feedback.insertAdjacentElement('afterend',wrap);
  else if(answer)answer.insertAdjacentElement('afterend',wrap);
  else if(rub)rub.insertAdjacentElement('afterend',wrap);
  else q.appendChild(wrap);
  q.dataset.errorReasonV22='1';
}
function installQuestions(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('.q').forEach(installQuestion);
}
function statsHost(){
  const notes=document.getElementById('notes');
  if(!notes)return null;
  const card=notes.closest('.card');if(!card)return null;
  let box=card.querySelector('#error-reason-stats-v22');
  if(!box){
    box=document.createElement('div');
    box.id='error-reason-stats-v22';
    box.className='error-reason-stats-v22';
    notes.insertAdjacentElement('beforebegin',box);
  }
  return box;
}
function counts(){
  const out={};REASONS.forEach(r=>out[r]=0);
  Object.values(assignments).forEach(r=>{if(Object.prototype.hasOwnProperty.call(out,r))out[r]++;});
  return out;
}
function renderStats(){
  const box=statsHost();if(!box)return;
  const c=counts(),total=REASONS.reduce((n,r)=>n+c[r],0);
  box.innerHTML='<div class="error-reason-stats-head-v22"><div><b>錯題原因統計</b><div class="small">已標記 '+total+' 題／空格；同一題改選原因時會自動移轉計數。</div></div></div>'+
    '<div class="error-reason-stats-grid-v22">'+REASONS.map(r=>'<div class="error-reason-stat-v22"><span>'+esc(r)+'</span><b>'+c[r]+'</b></div>').join('')+'</div>';
}
function installAll(root){installQuestions(root||document);renderStats();}
function rescanSoon(root){
  setTimeout(()=>installAll(root||document),0);
  setTimeout(()=>installAll(root||document),50);
  setTimeout(()=>installAll(root||document),180);
}

/* Tabs and Mock section buttons render synchronously and some existing patches do a short deferred replacement.
   Scan a few times after those explicit user actions instead of observing the entire DOM. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=!!(b.classList&&b.classList.contains('tab'));
  const mockButton=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mockButton)rescanSoon(document);
},false);

/* Keep displayed selectors synchronized if a dropdown is rebuilt after navigation. */
document.addEventListener('change',function(ev){
  const sel=ev.target&&ev.target.matches?ev.target.matches('.error-reason-select-v22'):false;
  if(sel)renderStats();
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>rescanSoon(document));
else rescanSoon(document);

if(!document.getElementById('error-reason-v22-style')){
  const st=document.createElement('style');st.id='error-reason-v22-style';
  st.textContent='\n.error-reason-wrap-v22{margin-top:10px;padding-top:9px;border-top:1px dashed #d7deea}\n.error-reason-label-v22{display:grid;grid-template-columns:minmax(92px,auto) minmax(180px,1fr);gap:10px;align-items:center;font-size:.9rem;font-weight:800;color:#46536a}\n.error-reason-select-v22{width:100%;min-height:42px;background:#fff}\n.ctest-reasons-v22{margin-top:10px;padding:10px;border:1px dashed #cfd8e6;border-radius:10px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\n.ctest-reasons-v22 .error-reason-title-v22{grid-column:1/-1;font-weight:900;color:#46536a}\n.ctest-reasons-v22 .error-reason-wrap-v22{margin:0;padding:0;border:0}\n.ctest-reasons-v22 .error-reason-label-v22{grid-template-columns:72px 1fr}\n.error-reason-stats-v22{margin:0 0 12px;padding:12px;border:1px solid #c8d6ff;border-radius:12px;background:#f7f9ff}\n.error-reason-stats-head-v22{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}\n.error-reason-stats-grid-v22{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}\n.error-reason-stat-v22{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 9px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;font-size:.86rem}\n.error-reason-stat-v22 b{font-size:1.04rem;color:#3157d5}\n@media(max-width:720px){.error-reason-label-v22{grid-template-columns:1fr}.ctest-reasons-v22{grid-template-columns:1fr}.ctest-reasons-v22 .error-reason-title-v22{grid-column:auto}.ctest-reasons-v22 .error-reason-label-v22{grid-template-columns:1fr}.error-reason-stats-grid-v22{grid-template-columns:1fr}}\n';
  document.head.appendChild(st);
}
})();
