(function(){
'use strict';
/* TOEFL Study Lab Writing task prompt guard v35
   - Restores missing task instructions for Write an Email and Academic Discussion.
   - Fixes Mock Writing, whose native mockPart('mw') creates only headings + textareas.
   - Also guards normal Writing against later patches accidentally removing the prompt.
   - No MutationObserver; uses wire() + navigation rescans for stability.
*/

const TASKS={
  wemail:{
    title:'Write an Email',
    html:'<div class="writing-task-prompt-v35"><b>情境：</b>你無法參加週五的 neighborhood field visit。請寫信給 <b>Professor Williams</b>。<br><b>你的 Email 必須完成：</b><ol><li>說明無法參加的原因。</li><li>表達你仍希望完成 fieldwork。</li><li>詢問能否加入另一組。</li><li>若無法加入另一組，提出一個替代完成方式。</li></ol></div>'
  },
  wdisc:{
    title:'Academic Discussion',
    html:'<div class="writing-task-prompt-v35"><b>Professor:</b> Should governments prioritize physical improvement or preservation of existing communities in urban regeneration?<br><b>Maria:</b> Physical improvement should come first.<br><b>Daniel:</b> Community preservation is equally important.<br><div class="writing-task-instruction-v35"><b>Your task:</b> Write a response to the professor. State and support your own position, and contribute meaningfully to the discussion.</div></div>'
  },
  mwemail:{
    title:'Write an Email',
    html:'<div class="writing-task-prompt-v35"><b>情境：</b>你因臨時的 scheduling conflict 未能參加研究 project team 的小組會議。請寫 Email 給小組成員。<br><b>你的 Email 必須完成：</b><ol><li>為未能出席會議致歉並簡要說明原因。</li><li>詢問是否能提供 meeting notes 或相關 materials。</li><li>表達你希望盡快 catch up。</li><li>提出一個你可以配合的時間或補進度方式。</li></ol></div>'
  },
  mwdisc:{
    title:'Academic Discussion',
    html:'<div class="writing-task-prompt-v35"><b>Professor:</b> Should universities require students to complete some community service before graduation?<br><b>Maria:</b> Yes. Community service can connect academic learning with real social needs and help students develop responsibility.<br><b>Daniel:</b> No. Students already have different academic, work, and family obligations, so a requirement may create an unfair burden.<br><div class="writing-task-instruction-v35"><b>Your task:</b> Write a response to the professor. State and support your own position, and contribute meaningfully to the discussion.</div></div>'
  }
};

function visibleText(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
function cardForTextarea(ta){return ta&&ta.closest?ta.closest('.q'):null;}
function titleNode(card){return card?card.querySelector('h4,b'):null;}
function existingPrompt(card,ta){
  if(!card||!ta)return null;
  const nodes=[...card.children];
  const ti=nodes.indexOf(ta);
  for(let i=0;i<ti;i++){
    const el=nodes[i];
    if(!el||el===titleNode(card))continue;
    if(el.classList&&el.classList.contains('adaptive-tier-v33'))continue;
    if(el.classList&&el.classList.contains('writing-task-prompt-v35'))return el;
    if((el.tagName==='P'||el.tagName==='DIV')&&visibleText(el).length>25)return el;
  }
  return null;
}
function ensureOne(id){
  const ta=document.getElementById(id),cfg=TASKS[id];
  if(!ta||!cfg)return;
  const card=cardForTextarea(ta);if(!card)return;
  const title=titleNode(card);
  if(title&&id.startsWith('mw'))title.textContent=cfg.title;
  const old=existingPrompt(card,ta);
  if(old){
    if(!old.classList.contains('writing-task-prompt-v35'))old.classList.add('writing-task-prompt-v35');
    return;
  }
  const wrap=document.createElement('div');
  wrap.innerHTML=cfg.html;
  const prompt=wrap.firstElementChild;
  ta.insertAdjacentElement('beforebegin',prompt);
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
  if(tab||mockWriting){
    setTimeout(ensureAll,0);setTimeout(ensureAll,70);setTimeout(ensureAll,200);
  }
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureAll,{once:true});
else ensureAll();
setTimeout(ensureAll,120);setTimeout(ensureAll,420);

if(!document.getElementById('writing-task-prompt-v35-style')){
  const st=document.createElement('style');st.id='writing-task-prompt-v35-style';
  st.textContent='.writing-task-prompt-v35{margin:7px 0 12px;padding:11px 13px;border:1px solid #c8d6ff;border-radius:10px;background:#f7f9ff;line-height:1.65;color:#182237}.writing-task-prompt-v35 ol{margin:6px 0 0 1.35em;padding-left:.4em}.writing-task-instruction-v35{margin-top:9px;padding-top:8px;border-top:1px dashed #c7d3e8}';
  document.head.appendChild(st);
}
window.__toeflWritingPromptGuardV35=true;
})();
