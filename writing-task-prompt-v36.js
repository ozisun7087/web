(function(){
'use strict';
/* TOEFL Study Lab Writing task prompt guard v36
   - All task descriptions for Write an Email and Academic Discussion are in English.
   - Replaces any older Chinese v35 prompt instead of merely filling a missing prompt.
   - Applies to normal Writing and Mock Writing.
   - No MutationObserver; uses wire() + navigation rescans for stability.
*/

const TASKS={
  wemail:{
    title:'Write an Email',
    html:'<div class="writing-task-prompt-v36"><b>Situation:</b> You are unable to attend the neighborhood field visit scheduled for Friday. Write an email to <b>Professor Williams</b>.<br><b>In your email, be sure to:</b><ol><li>Explain why you cannot attend the field visit.</li><li>Say that you still want to complete the fieldwork requirement.</li><li>Ask whether you can join another group.</li><li>If joining another group is not possible, suggest an alternative way to complete the fieldwork.</li></ol></div>'
  },
  wdisc:{
    title:'Academic Discussion',
    html:'<div class="writing-task-prompt-v36"><b>Professor:</b> In urban regeneration, should governments give greater priority to physical improvements or to preserving existing communities?<br><br><b>Maria:</b> I think physical improvements should come first because safer buildings, better transportation, and improved public facilities can benefit many residents.<br><br><b>Daniel:</b> I believe preserving existing communities is equally important because redevelopment can disrupt social networks and force long-term residents to leave.<div class="writing-task-instruction-v36"><b>Your task:</b> Write a response to the professor. State and support your own position. You may agree or disagree with either student, but your response should contribute meaningfully to the discussion.</div></div>'
  },
  mwemail:{
    title:'Write an Email',
    html:'<div class="writing-task-prompt-v36"><b>Situation:</b> You missed a meeting with your research project team because of an unexpected scheduling conflict. Write an email to the other members of your group.<br><b>In your email, be sure to:</b><ol><li>Apologize for missing the meeting and briefly explain why you could not attend.</li><li>Ask whether someone can send you the meeting notes or related materials.</li><li>Explain that you want to catch up as soon as possible.</li><li>Suggest a time or another way you can review what you missed.</li></ol></div>'
  },
  mwdisc:{
    title:'Academic Discussion',
    html:'<div class="writing-task-prompt-v36"><b>Professor:</b> Should universities require students to complete some community service before graduation?<br><br><b>Maria:</b> Yes. Community service can connect academic learning with real social needs and help students develop a stronger sense of responsibility.<br><br><b>Daniel:</b> No. Students already have different academic, work, and family obligations, so a requirement could create an unfair burden.<div class="writing-task-instruction-v36"><b>Your task:</b> Write a response to the professor. State and support your own position. You may agree or disagree with either student, but your response should contribute meaningfully to the discussion.</div></div>'
  }
};

function cardForTextarea(ta){return ta&&ta.closest?ta.closest('.q'):null;}
function titleNode(card){return card?card.querySelector('h4,b'):null;}
function removeOldPrompts(card,ta){
  if(!card||!ta)return;
  card.querySelectorAll('.writing-task-prompt-v35,.writing-task-prompt-v36').forEach(x=>x.remove());
  /* Native normal-Writing prompts are plain <p> elements before the textarea. */
  [...card.children].forEach(el=>{
    if(el===ta)return;
    if(el.tagName==='P'&&el.compareDocumentPosition(ta)&Node.DOCUMENT_POSITION_FOLLOWING){
      const t=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(t.length>20)el.remove();
    }
  });
}
function ensureOne(id){
  const ta=document.getElementById(id),cfg=TASKS[id];
  if(!ta||!cfg)return;
  const card=cardForTextarea(ta);if(!card)return;
  const title=titleNode(card);if(title)title.textContent=cfg.title;
  removeOldPrompts(card,ta);
  const wrap=document.createElement('div');wrap.innerHTML=cfg.html;
  ta.insertAdjacentElement('beforebegin',wrap.firstElementChild);
}
function ensureAll(){Object.keys(TASKS).forEach(ensureOne);}

if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);ensureAll();return r;};
}

document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mockWriting=/mockPart\(['\"]mw['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mockWriting){setTimeout(ensureAll,0);setTimeout(ensureAll,70);setTimeout(ensureAll,200);}
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureAll,{once:true});else ensureAll();
setTimeout(ensureAll,120);setTimeout(ensureAll,420);

if(!document.getElementById('writing-task-prompt-v36-style')){
  const st=document.createElement('style');st.id='writing-task-prompt-v36-style';
  st.textContent='.writing-task-prompt-v36{margin:7px 0 12px;padding:11px 13px;border:1px solid #c8d6ff;border-radius:10px;background:#f7f9ff;line-height:1.65;color:#182237}.writing-task-prompt-v36 ol{margin:6px 0 0 1.35em;padding-left:.4em}.writing-task-instruction-v36{margin-top:10px;padding-top:9px;border-top:1px dashed #c7d3e8}';
  document.head.appendChild(st);
}
window.__toeflWritingPromptGuardV36=true;
})();
