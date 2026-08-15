(function(){
'use strict';
/* TOEFL Study Lab error reason tracker v23
   Reliable version: installs synchronously whenever the site's native wire() runs.
   No MutationObserver. Keeps v20 stability mode.
*/
const REASONS=['看不懂／聽不懂','看懂但推論錯','字彙','句法','粗心','時間不足','口音辨識','Writing 組句','Speaking 發音或展開不足'];
const STORE_KEY='toefl-error-reasons-v22';
let assignments=load();
function load(){try{const x=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch(e){return {};}}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(assignments));}catch(e){}}
function esc(s){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));}
function section(){const b=document.querySelector('#tabs .tab.active');return b&&b.dataset&&b.dataset.t?b.dataset.t:'Practice';}
function prefix(el){return el&&el.closest&&el.closest('#mock')?'Mock':section();}
function key(pre,id){return pre+':'+id;}
function optionHtml(){return '<option value="">未選擇錯題原因</option>'+REASONS.map(r=>'<option value="'+esc(r)+'">'+esc(r)+'</option>').join('');}
function makeSelect(k,label){
  const wrap=document.createElement('div');wrap.className='error-reason-v23';wrap.dataset.reasonKey=k;
  const lab=document.createElement('label');lab.className='error-reason-label-v23';
  const title=document.createElement('span');title.className='error-reason-title-v23';title.textContent=label||'錯題原因';
  const sel=document.createElement('select');sel.className='error-reason-select-v23';sel.innerHTML=optionHtml();sel.value=REASONS.includes(assignments[k])?assignments[k]:'';
  sel.addEventListener('change',function(){if(sel.value&&REASONS.includes(sel.value))assignments[k]=sel.value;else delete assignments[k];save();renderStats();});
  lab.append(title,sel);wrap.appendChild(lab);return wrap;
}
function hasKey(root,k){return [...root.querySelectorAll('.error-reason-v23')].some(x=>x.dataset.reasonKey===k);}
function identity(q){
  const rec=q.querySelector('button.record[data-id]');if(rec&&rec.dataset.id)return rec.dataset.id;
  const fill=q.querySelector('.ckfill[data-id]');if(fill&&fill.dataset.id)return fill.dataset.id;
  const mcq=q.querySelector('.ckmcq[data-name]');if(mcq&&mcq.dataset.name)return mcq.dataset.name;
  const ta=[...q.querySelectorAll('textarea[id]')].find(x=>!['notes','review'].includes(x.id));if(ta)return ta.id;
  const tx=[...q.querySelectorAll('input[type="text"][id]')].find(x=>!/^rf\d+$/.test(x.id));if(tx)return tx.id;
  return '';
}
function installCtest(q){
  const inputs=[...q.querySelectorAll('input[type="text"][id]')].filter(x=>/^rf\d+$/.test(x.id));if(!inputs.length)return false;
  let panel=q.querySelector('.ctest-error-reasons-v23');
  if(!panel){panel=document.createElement('div');panel.className='ctest-error-reasons-v23';const h=document.createElement('div');h.className='error-reason-panel-title-v23';h.textContent='錯題原因';panel.appendChild(h);q.appendChild(panel);}
  const pre=prefix(q);
  inputs.forEach((inp,i)=>{const k=key(pre,inp.id);if(!hasKey(panel,k))panel.appendChild(makeSelect(k,'第 '+(i+1)+' 空'));});
  return true;
}
function installCard(q,index){
  if(!q||q.dataset.errorReasonV23==='1')return;
  if(installCtest(q)){q.dataset.errorReasonV23='1';return;}
  const id=identity(q);if(!id)return;
  const k=key(prefix(q),id);
  if(!hasKey(q,k))q.appendChild(makeSelect(k,'錯題原因'));
  q.dataset.errorReasonV23='1';
}
function install(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('.q').forEach((q,i)=>installCard(q,i));
  renderStats();
}
function statsBox(){
  const notes=document.getElementById('notes');if(!notes)return null;
  const card=notes.closest('.card');if(!card)return null;
  let box=card.querySelector('#error-reason-stats-v23');
  if(!box){
    const old=card.querySelector('#error-reason-stats-v22');if(old)old.remove();
    box=document.createElement('div');box.id='error-reason-stats-v23';box.className='error-reason-stats-v23';notes.insertAdjacentElement('beforebegin',box);
  }
  return box;
}
function renderStats(){
  const box=statsBox();if(!box)return;
  const c={};REASONS.forEach(r=>c[r]=0);Object.values(assignments).forEach(r=>{if(REASONS.includes(r))c[r]++;});
  const total=REASONS.reduce((n,r)=>n+c[r],0);
  box.innerHTML='<div><b>錯題原因統計</b><div class="small">目前已標記 '+total+' 題／空格</div></div><div class="error-reason-stats-grid-v23">'+REASONS.map(r=>'<div class="error-reason-stat-v23"><span>'+esc(r)+'</span><b>'+c[r]+'</b></div>').join('')+'</div>';
}

/* Core fix: every render/mock render ends by calling wire(); attach dropdown installation there. */
if(typeof window.wire==='function'){
  const nativeWire=window.wire;
  window.wire=function(){const r=nativeWire.apply(this,arguments);install(document);return r;};
}

/* Fallback for patches that call a captured/older wire reference. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mock=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock){setTimeout(()=>install(document),0);setTimeout(()=>install(document),80);}
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(document));else install(document);
setTimeout(()=>install(document),120);

if(!document.getElementById('error-reason-v23-style')){
  const st=document.createElement('style');st.id='error-reason-v23-style';
  st.textContent='\n.error-reason-v23{margin-top:12px;padding-top:10px;border-top:1px dashed #cfd8e6}\n.error-reason-label-v23{display:grid;grid-template-columns:110px minmax(220px,1fr);gap:10px;align-items:center}\n.error-reason-title-v23{font-size:.9rem;font-weight:900;color:#46536a}\n.error-reason-select-v23{width:100%;min-height:44px;background:#fff}\n.ctest-error-reasons-v23{margin-top:12px;padding:10px;border-top:1px dashed #cfd8e6;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\n.error-reason-panel-title-v23{grid-column:1/-1;font-weight:900;color:#46536a}\n.ctest-error-reasons-v23 .error-reason-v23{margin:0;padding:0;border:0}\n.ctest-error-reasons-v23 .error-reason-label-v23{grid-template-columns:70px 1fr}\n.error-reason-stats-v23{margin:0 0 12px;padding:12px;border:1px solid #c8d6ff;border-radius:12px;background:#f7f9ff}\n.error-reason-stats-grid-v23{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}\n.error-reason-stat-v23{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:7px 9px;border:1px solid #dbe3ef;border-radius:9px;background:#fff;font-size:.86rem}\n.error-reason-stat-v23 b{color:#3157d5;font-size:1.04rem}\n@media(max-width:720px){.error-reason-label-v23{grid-template-columns:1fr}.ctest-error-reasons-v23{grid-template-columns:1fr}.error-reason-panel-title-v23{grid-column:auto}.ctest-error-reasons-v23 .error-reason-label-v23{grid-template-columns:1fr}.error-reason-stats-grid-v23{grid-template-columns:1fr}}\n';
  document.head.appendChild(st);
}
})();
