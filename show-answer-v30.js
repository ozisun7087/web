(function(){
'use strict';
/* TOEFL Study Lab show-answer v30
   - Adds 顯示答案 to every practice item that has an objective answer.
   - Complete the Words: reveals only wrong/blank completions, preserving the learner's entry.
   - MCQ: correct option green, selected wrong option red.
   - Open Writing tasks: shows a high-quality reference response, explicitly marked as non-unique.
   - Existing Build a Sentence and Speaking answer mechanisms remain in place.
   - No MutationObserver.
*/
const REFERENCES={
  wemail:`Dear Professor Williams,\n\nI am sorry, but I will not be able to attend Friday's neighborhood field visit because I have an unavoidable medical appointment. I still hope to complete the fieldwork for the course. Would it be possible for me to join another group's visit? If that is not possible, could I complete an alternative field assignment or visit the neighborhood at another approved time?\n\nThank you for your understanding.\nBest regards,`,
  wdisc:`I believe governments should improve physical conditions while giving strong protection to existing communities. Better housing, transportation, and public facilities can improve residents' quality of life, but redevelopment should not force long-term residents to leave. For example, a city can renovate unsafe buildings while also providing affordable housing and involving residents in planning decisions. This approach preserves social networks and local identity while still allowing necessary physical improvements.`,
  mwemail:`Dear Project Team,\n\nI am sorry that I missed our group meeting because of an unexpected scheduling conflict. Could someone please send me the meeting notes or any materials that were discussed? I would like to catch up as soon as possible. I am available tomorrow afternoon if anyone can briefly review the main decisions with me.\n\nThank you,`,
  mwdisc:`I think universities should require some community service, as long as students have flexible choices. Community service can help students connect classroom learning with real social needs and develop responsibility. For example, students could choose tutoring, environmental work, or support for local organizations based on their interests and schedules. A flexible requirement would provide educational value without placing the same burden on every student.`
};
function norm(s){return String(s||'').trim().toLowerCase();}
function esc(s){return String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));}

function clearCtestOne(input){
  input.classList.remove('v30-answer-wrong','v30-answer-right');
  const next=input.nextElementSibling;
  if(next&&next.classList&&next.classList.contains('v30-ctest-correction'))next.remove();
}
function revealCtest(card){
  const inputs=[...card.querySelectorAll('input[type="text"][data-answer]')].filter(x=>/^rf\d+$/.test(x.id||''));
  let wrong=0;
  inputs.forEach(input=>{
    clearCtestOne(input);
    const ans=String(input.dataset.answer||'');
    if(norm(input.value)!==norm(ans)){
      wrong++;
      input.classList.add('v30-answer-wrong');
      const tag=document.createElement('span');tag.className='v30-ctest-correction';
      tag.innerHTML='正確補字：<b>'+esc(ans)+'</b>';
      input.insertAdjacentElement('afterend',tag);
    }else input.classList.add('v30-answer-right');
  });
  let note=card.querySelector('.v30-ctest-answer-note');
  if(!note){note=document.createElement('div');note.className='v30-ctest-answer-note';const actions=card.querySelector('.actions');if(actions)actions.insertAdjacentElement('afterend',note);else card.appendChild(note);}
  note.textContent=wrong?('已顯示 '+wrong+' 個答錯／未作答空格的正確答案；已答對的空格不重複顯示。'):'全部空格皆已答對。';
}
function installCtest(card){
  const inputs=[...card.querySelectorAll('input[type="text"][data-answer]')].filter(x=>/^rf\d+$/.test(x.id||''));
  if(!inputs.length)return false;
  const check=card.querySelector('#rf-check-all');if(!check)return false;
  const actions=check.closest('.actions')||check.parentElement;
  if(actions&&!actions.querySelector('.v30-show-ctest')){
    const b=document.createElement('button');b.type='button';b.className='ghost v30-show-ctest';b.textContent='顯示答案';b.addEventListener('click',()=>revealCtest(card));actions.appendChild(b);
  }
  inputs.forEach(input=>{
    if(input.dataset.v30AnswerInput==='1')return;input.dataset.v30AnswerInput='1';
    input.addEventListener('input',()=>{clearCtestOne(input);const note=card.querySelector('.v30-ctest-answer-note');if(note)note.remove();});
  });
  return true;
}

function radiosFor(q,name){return [...q.querySelectorAll('input[type="radio"]')].filter(r=>r.name===name);}
function clearMcqReveal(q){
  q.querySelectorAll('.v30-correct-option,.v30-wrong-option').forEach(x=>x.classList.remove('v30-correct-option','v30-wrong-option'));
  const r=q.querySelector('.v30-mcq-answer');if(r)r.remove();
}
function revealMcq(q,check){
  clearMcqReveal(q);
  const name=String(check.dataset.name||''),answer=Number(check.dataset.a),radios=radiosFor(q,name);
  if(!radios.length||!Number.isFinite(answer))return;
  const correct=radios.find(r=>Number(r.value)===answer);if(!correct)return;
  const correctLabel=correct.closest('.option')||correct.parentElement;if(correctLabel)correctLabel.classList.add('v30-correct-option');
  const chosen=radios.find(r=>r.checked);
  if(chosen&&chosen!==correct){const l=chosen.closest('.option')||chosen.parentElement;if(l)l.classList.add('v30-wrong-option');}
  const box=document.createElement('div');box.className='v30-mcq-answer';
  const text=(correctLabel?correctLabel.textContent:'').trim();box.innerHTML=(chosen===correct?'✓ 你的答案正確：':'正確答案：')+'<b>'+esc(text)+'</b>';
  const actions=check.closest('.actions');if(actions)actions.insertAdjacentElement('afterend',box);else q.appendChild(box);
}
function installMcq(q){
  const check=q.querySelector('.ckmcq[data-name][data-a]');if(!check)return false;
  const actions=check.closest('.actions')||check.parentElement;
  if(actions&&!actions.querySelector('.v30-show-mcq')){
    const b=document.createElement('button');b.type='button';b.className='ghost v30-show-mcq';b.textContent='顯示答案';b.addEventListener('click',()=>revealMcq(q,check));actions.appendChild(b);
  }
  if(q.dataset.v30McqChange!=='1'){
    q.dataset.v30McqChange='1';q.addEventListener('change',ev=>{if(ev.target&&ev.target.matches&&ev.target.matches('input[type="radio"]'))clearMcqReveal(q);});
  }
  return true;
}

function installExistingFill(q){
  const check=q.querySelector('.ckfill[data-id]');if(!check)return false;
  const actions=check.closest('.actions')||check.parentElement;
  if(actions&&!actions.querySelector('.showans')){
    const input=document.getElementById(check.dataset.id||''),ans=input&&input.dataset?input.dataset.answer:'';
    if(ans){
      let answer=q.querySelector('.answer');if(!answer){answer=document.createElement('div');answer.className='answer';answer.textContent='答案：'+ans;q.appendChild(answer);}
      const b=document.createElement('button');b.type='button';b.className='ghost showans';b.textContent='顯示答案';b.addEventListener('click',()=>answer.classList.toggle('show'));actions.appendChild(b);
    }
  }
  return true;
}

function installOpenWriting(q){
  const ta=[...q.querySelectorAll('textarea[id]')].find(x=>REFERENCES[x.id]);if(!ta)return false;
  if(q.querySelector('.v30-show-writing'))return true;
  const b=document.createElement('button');b.type='button';b.className='ghost v30-show-writing';b.textContent='顯示答案';
  const box=document.createElement('div');box.className='v30-writing-reference';box.hidden=true;
  box.innerHTML='<b>參考高分作答（開放式題沒有唯一正解）</b><div class="v30-reference-text">'+esc(REFERENCES[ta.id]).replace(/\n/g,'<br>')+'</div>';
  b.addEventListener('click',()=>{box.hidden=!box.hidden;b.textContent=box.hidden?'顯示答案':'隱藏答案';});
  ta.insertAdjacentElement('afterend',b);b.insertAdjacentElement('afterend',box);return true;
}

function install(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('.q').forEach(q=>{
    if(installCtest(q))return;
    if(installMcq(q))return;
    if(installExistingFill(q))return;
    installOpenWriting(q);
  });
}
if(typeof window.wire==='function'){
  const previous=window.wire;window.wire=function(){const r=previous.apply(this,arguments);install(document);return r;};
}
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab'),mock=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock){setTimeout(()=>install(document),0);setTimeout(()=>install(document),80);setTimeout(()=>install(document),220);}
},false);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(document));else install(document);
setTimeout(()=>install(document),100);setTimeout(()=>install(document),350);
if(!document.getElementById('show-answer-v30-style')){
  const st=document.createElement('style');st.id='show-answer-v30-style';
  st.textContent='\n.v30-ctest-correction{display:inline-block;margin:0 5px 4px 3px;padding:3px 7px;border-radius:8px;background:#fff1ef;border:1px solid #efc7c2;color:#9f241b;font-size:.84rem;vertical-align:middle;white-space:nowrap}\n.v30-answer-wrong{border-color:#e39a92!important;background:#fff5f3!important}.v30-answer-right{border-color:#8ac6b1!important;background:#f3fbf7!important}\n.v30-ctest-answer-note,.v30-mcq-answer,.v30-writing-reference{margin-top:8px;padding:8px 10px;border-radius:9px;background:#eefaf6;border-left:4px solid #14785a;color:#126147}\n.option.v30-correct-option{background:#edf9f4!important;border:1px solid #8ac6b1}.option.v30-wrong-option{background:#fff1ef!important;border:1px solid #e39a92}\n.v30-show-writing{margin-top:9px}.v30-reference-text{margin-top:7px;line-height:1.65;color:#182237}\n';document.head.appendChild(st);
}
})();
