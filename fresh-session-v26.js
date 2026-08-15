(function(){
'use strict';
/* TOEFL Study Lab fresh-session reset v26
   A browser page reload starts a completely fresh practice round.
   - Clears every answer/transcript/score value persisted by the site's native wire() under v-*.
   - Clears all legacy/current error-reason persistence keys.
   - Resets any question controls that the browser itself may restore during reload.
   - Does NOT continuously reset during tab changes; users can still work normally during the same page load.
*/

function clearPersistedPracticeState(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k)keys.push(k);
    }
    keys.forEach(k=>{
      if(/^v-/i.test(k) || /^toefl-error-reasons-/i.test(k) || /^v-error-reason/i.test(k)){
        localStorage.removeItem(k);
      }
    });
  }catch(e){}
}

function resetQuestionDom(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('.q').forEach(q=>{
    q.querySelectorAll('input[type="text"],textarea').forEach(el=>{
      el.value='';
      delete el.dataset.autoScore;
    });
    q.querySelectorAll('input[type="radio"],input[type="checkbox"]').forEach(el=>{el.checked=false;});
    q.querySelectorAll('select').forEach(el=>{
      el.selectedIndex=0;
      if(el.options&&el.options.length)el.value=el.options[0].value;
    });
    q.querySelectorAll('.feedback').forEach(el=>{
      el.classList.remove('show','ok','no');
      el.textContent='';
    });
    q.querySelectorAll('.answer').forEach(el=>el.classList.remove('show'));
    q.querySelectorAll('audio').forEach(el=>{
      try{el.pause();el.removeAttribute('src');el.load();}catch(e){}
      el.hidden=true;
    });
    q.querySelectorAll('.sentence-error-map,.sentence-error-map-v14,.sentence-error-map-v15').forEach(el=>el.remove());
    q.querySelectorAll('[id$="-auto-result"]').forEach(el=>{el.style.display='none';el.innerHTML='';});
  });

  /* Review textarea is not wrapped in .q, but native wire() persists it as v-review. */
  const review=document.getElementById('review');
  if(review)review.value='';
}

/* Clear storage immediately, before any delayed patch can read it. */
clearPersistedPracticeState();

/* One-shot DOM cleanup protects against browser form-state restoration on reload. */
let passes=0;
function initialPass(){
  passes++;
  clearPersistedPracticeState();
  resetQuestionDom(document);
  if(typeof window.__resetToeflErrorReasonsV25==='function'){
    try{window.__resetToeflErrorReasonsV25();}catch(e){}
  }
  if(passes<4)setTimeout(initialPass,[0,70,220,500][passes]||500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialPass,{once:true});
else initialPass();

/* Reload/BFCache restore must also behave as a new round. */
window.addEventListener('pageshow',function(ev){
  if(ev.persisted){
    clearPersistedPracticeState();
    resetQuestionDom(document);
    if(typeof window.__resetToeflErrorReasonsV25==='function'){
      try{window.__resetToeflErrorReasonsV25();}catch(e){}
    }
  }
});

window.__toeflFreshSessionV26=true;
})();
