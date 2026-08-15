(function(){
'use strict';
/* TOEFL Study Lab fresh-session reset v27
   Goal: browser Reload = a truly fresh practice round.
   Key fix over v26: browsers can restore dynamic form state later when an element with
   the same id/name is recreated. We therefore track controls actually touched during
   THIS page load and reset any newly rendered untouched practice controls after wire().
*/

const dirty=new Set();
let booting=true;

function clearPersistedPracticeState(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);if(k)keys.push(k);
    }
    keys.forEach(k=>{
      if(/^v-/i.test(k)||/^toefl-error-reasons-/i.test(k)||/^v-error-reason/i.test(k)||k==='notes'){
        localStorage.removeItem(k);
      }
    });
  }catch(e){}
}
function controlKey(el){
  if(!el)return '';
  if(el.id)return 'id:'+el.id;
  if(el.name)return 'name:'+el.name+':'+String(el.value||'');
  return '';
}
function markDirty(el){
  const k=controlKey(el);if(k)dirty.add(k);
}
function isDirty(el){
  const k=controlKey(el);return !!(k&&dirty.has(k));
}
function isPracticeControl(el){
  if(!el||!el.matches)return false;
  if(el.id==='timer')return false;
  if(el.closest('.q'))return true;
  if(el.id==='review'||el.id==='notes')return true;
  if(el.classList.contains('error-reason-select-v25'))return true;
  return false;
}
function resetOne(el){
  if(!el||isDirty(el))return;
  try{el.setAttribute('autocomplete','off');}catch(e){}
  if(el.matches('input[type="radio"],input[type="checkbox"]')){el.checked=false;return;}
  if(el.matches('input[type="text"],textarea')){el.value='';delete el.dataset.autoScore;return;}
  if(el.matches('select')){el.selectedIndex=0;if(el.options&&el.options.length)el.value=el.options[0].value;}
}
function resetUntouchedControls(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('input,textarea,select').forEach(el=>{if(isPracticeControl(el))resetOne(el);});

  host.querySelectorAll('.q').forEach(q=>{
    q.querySelectorAll('.feedback').forEach(el=>{if(!el.dataset.v27Touched){el.classList.remove('show','ok','no');el.textContent='';}});
    q.querySelectorAll('.answer').forEach(el=>el.classList.remove('show'));
    q.querySelectorAll('.sentence-error-map,.sentence-error-map-v14,.sentence-error-map-v15').forEach(el=>el.remove());
    q.querySelectorAll('[id$="-auto-result"]').forEach(el=>{el.style.display='none';el.innerHTML='';});
    q.querySelectorAll('audio').forEach(el=>{
      if(el.dataset.v27Recorded==='1')return;
      try{el.pause();el.removeAttribute('src');el.load();}catch(e){}
      el.hidden=true;
    });
  });
}
function resetErrorReasons(){
  if(typeof window.__resetToeflErrorReasonsV25==='function'){
    try{window.__resetToeflErrorReasonsV25();}catch(e){}
  }
}
function freshPass(){
  clearPersistedPracticeState();
  resetUntouchedControls(document);
  resetErrorReasons();
}

/* Clear before any native delayed restoration can read stale state. */
clearPersistedPracticeState();

/* Native wire() is called after every normal render and Mock render. Reset only controls
   that have NOT been used during this page load, defeating late browser form restoration. */
if(typeof window.wire==='function'){
  const previousWire=window.wire;
  window.wire=function(){
    const r=previousWire.apply(this,arguments);
    resetUntouchedControls(document);
    return r;
  };
}

/* Track genuine user interactions. Programmatic assignment does not mark dirty. */
document.addEventListener('input',function(ev){if(ev.isTrusted&&isPracticeControl(ev.target))markDirty(ev.target);},true);
document.addEventListener('change',function(ev){if(ev.isTrusted&&isPracticeControl(ev.target))markDirty(ev.target);},true);
document.addEventListener('click',function(ev){
  if(!ev.isTrusted)return;
  const target=ev.target;
  if(target&&target.matches&&target.matches('input[type="radio"],input[type="checkbox"],select')&&isPracticeControl(target))markDirty(target);
  const b=target&&target.closest?target.closest('button'):null;
  if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mock=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock){
    setTimeout(()=>resetUntouchedControls(document),0);
    setTimeout(()=>resetUntouchedControls(document),60);
    setTimeout(()=>resetUntouchedControls(document),220);
  }
},true);

/* Initial browser restoration can happen after DOMContentLoaded/load/pageshow. Run several
   guarded passes; they never erase fields already touched during this page load. */
const delays=[0,50,180,500,1200,2400];
function schedulePasses(){delays.forEach(ms=>setTimeout(freshPass,ms));setTimeout(()=>{booting=false;},2600);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedulePasses,{once:true});else schedulePasses();
window.addEventListener('load',()=>{setTimeout(freshPass,0);setTimeout(freshPass,250);},{once:true});
window.addEventListener('pageshow',function(){setTimeout(freshPass,0);setTimeout(freshPass,180);});

/* Prevent browser autocomplete/form-restoration heuristics as an additional layer. */
try{document.documentElement.setAttribute('data-toefl-fresh-session','v27');}catch(e){}

window.__toeflFreshSessionV27=true;
window.__toeflFreshDirtyV27=dirty;
})();
