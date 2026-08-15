(function(){
'use strict';
/* TOEFL Study Lab MCQ option-position randomizer v34
   - Randomizes visible option order for every objective multiple-choice question.
   - Correct-answer positions are balanced across the visible question set, so they do not cluster at option 1.
   - Radio values and data-a remain unchanged, so existing scoring/show-answer logic stays correct.
   - One random seed per page load: positions stay stable during the same practice round, and reshuffle after reload.
   - No MutationObserver; preserves the site's stability mode.
*/

const SESSION_SEED=(function(){
  try{
    if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]>>>0;}
  }catch(e){}
  return ((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);
})();
const positionCache=new Map();

function hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,seed){const out=a.slice(),r=rng(seed>>>0);for(let i=out.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function questionKey(q,check){
  const name=String(check&&check.dataset&&check.dataset.name||'');
  if(name)return name;
  const first=q.querySelector('input[type="radio"][name]');
  return first?String(first.name):('q-'+hash32(q.textContent||''));
}
function optionLabels(q,name){
  return [...q.querySelectorAll('.option')].filter(label=>{
    const r=label.querySelector('input[type="radio"]');
    return r&&(!name||r.name===name);
  });
}
function groupAssignments(items,n,context){
  const unresolved=items.filter(x=>!positionCache.has(x.key));
  if(!unresolved.length)return;
  const positions=[];
  for(let i=0;i<unresolved.length;i++)positions.push(i%n);
  const mixed=shuffle(positions,hash32(String(SESSION_SEED)+'|pos|'+n+'|'+context));
  unresolved.forEach((x,i)=>positionCache.set(x.key,mixed[i]));
}
function reorderOne(item){
  const {q,check,key,n}=item;
  if(q.dataset.v34OptionShuffled==='1')return;
  const labels=optionLabels(q,key);if(labels.length!==n||n<2)return;
  const answer=Number(check.dataset.a);
  const correct=labels.find(label=>{
    const r=label.querySelector('input[type="radio"]');
    return r&&Number(r.value)===answer;
  });
  if(!correct)return;
  const desired=Math.max(0,Math.min(n-1,Number(positionCache.get(key))||0));
  const distractors=labels.filter(x=>x!==correct);
  const mixed=shuffle(distractors,hash32(String(SESSION_SEED)+'|dist|'+key));
  const ordered=[];let di=0;
  for(let pos=0;pos<n;pos++)ordered.push(pos===desired?correct:mixed[di++]);
  const actions=check.closest('.actions');
  const anchor=actions||q.querySelector('.feedback')||null;
  ordered.forEach(label=>{
    if(anchor)q.insertBefore(label,anchor);else q.appendChild(label);
  });
  q.dataset.v34OptionShuffled='1';
  q.dataset.v34CorrectVisiblePosition=String(desired+1);
}
function install(root){
  const host=root&&root.querySelectorAll?root:document;
  const items=[];
  host.querySelectorAll('.q').forEach(q=>{
    if(q.dataset.v34OptionShuffled==='1')return;
    const check=q.querySelector('.ckmcq[data-name][data-a]');if(!check)return;
    const key=questionKey(q,check),labels=optionLabels(q,key),n=labels.length;
    if(n<2)return;
    items.push({q,check,key,n});
  });
  const byN=new Map();
  items.forEach(x=>{if(!byN.has(x.n))byN.set(x.n,[]);byN.get(x.n).push(x);});
  byN.forEach((group,n)=>{
    const context=group.map(x=>x.key).sort().join('|');
    groupAssignments(group,n,context);
    group.forEach(reorderOne);
  });
}
function scanSoon(){setTimeout(()=>install(document),0);setTimeout(()=>install(document),60);setTimeout(()=>install(document),180);}

/* Primary hook: normal renders call wire(). */
if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);install(document);return r;};
}

/* Fallback for wrappers that captured an older wire reference. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mock=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock)scanSoon();
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scanSoon,{once:true});else scanSoon();
window.__toeflOptionShuffleV34={seed:SESSION_SEED,install};
})();
