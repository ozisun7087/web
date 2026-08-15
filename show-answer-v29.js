(function(){
'use strict';
/* TOEFL Study Lab show-answer v29
   - Adds 顯示答案 to every objectively scored item that does not already have one.
   - Complete the Words: reveals the correct completion only beside wrong/blank fields; keeps the user's entry intact.
   - MCQ (Reading/Listening/Mock/Weakness): marks the correct option green and a selected wrong option red.
   - Existing Build a Sentence / fill / Speaking answer mechanisms are preserved.
   - No MutationObserver; keeps the site's stability mode.
*/

function norm(s){return String(s||'').trim().toLowerCase();}
function esc(s){return String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));}

function clearCtestOne(input){
  input.classList.remove('v29-answer-wrong','v29-answer-right');
  const next=input.nextElementSibling;
  if(next&&next.classList&&next.classList.contains('v29-ctest-correction'))next.remove();
}
function revealCtest(card){
  const inputs=[...card.querySelectorAll('input[type="text"][data-answer]')].filter(x=>/^rf\d+$/.test(x.id||''));
  let wrong=0;
  inputs.forEach(input=>{
    clearCtestOne(input);
    const ans=String(input.dataset.answer||'');
    if(norm(input.value)!==norm(ans)){
      wrong++;
      input.classList.add('v29-answer-wrong');
      const tag=document.createElement('span');
      tag.className='v29-ctest-correction';
      tag.innerHTML='正確補字：<b>'+esc(ans)+'</b>';
      input.insertAdjacentElement('afterend',tag);
    }else{
      input.classList.add('v29-answer-right');
    }
  });
  let note=card.querySelector('.v29-ctest-answer-note');
  if(!note){note=document.createElement('div');note.className='v29-ctest-answer-note';const actions=card.querySelector('.actions');(actions||card).insertAdjacentElement(actions?'afterend':'beforeend',note);}
  note.textContent=wrong?('已顯示 '+wrong+' 個答錯／未作答空格的正確答案。已答對的空格不重複顯示。'):'全部空格皆已答對。';
}
function installCtest(card){
  const inputs=[...card.querySelectorAll('input[type="text"][data-answer]')].filter(x=>/^rf\d+$/.test(x.id||''));
  if(!inputs.length)return false;
  const check=card.querySelector('#rf-check-all');if(!check)return false;
  const actions=check.closest('.actions')||check.parentElement;
  if(actions&&!actions.querySelector('.v29-show-ctest')){
    const b=document.createElement('button');b.type='button';b.className='ghost v29-show-ctest';b.textContent='顯示答案';
    b.addEventListener('click',()=>revealCtest(card));
    actions.appendChild(b);
  }
  inputs.forEach(input=>{
    if(input.dataset.v29AnswerInput==='1')return;input.dataset.v29AnswerInput='1';
    input.addEventListener('input',()=>{
      clearCtestOne(input);
      const note=card.querySelector('.v29-ctest-answer-note');if(note)note.remove();
    });
  });
  return true;
}

function radiosFor(q,name){return [...q.querySelectorAll('input[type="radio"]')].filter(r=>r.name===name);}
function clearMcqReveal(q){
  q.querySelectorAll('.v29-correct-option,.v29-wrong-option').forEach(x=>x.classList.remove('v29-correct-option','v29-wrong-option'));
  const r=q.querySelector('.v29-mcq-answer');if(r)r.remove();
}
function revealMcq(q,check){
  clearMcqReveal(q);
  const name=String(check.dataset.name||''),answer=Number(check.dataset.a);
  const radios=radiosFor(q,name);if(!radios.length||!Number.isFinite(answer))return;
  const correct=radios.find(r=>Number(r.value)===answer);if(!correct)return;
  const correctLabel=correct.closest('.option')||correct.parentElement;
  if(correctLabel)correctLabel.classList.add('v29-correct-option');
  const chosen=radios.find(r=>r.checked);
  if(chosen&&chosen!==correct){const l=chosen.closest('.option')||chosen.parentElement;if(l)l.classList.add('v29-wrong-option');}
  const box=document.createElement('div');box.className='v29-mcq-answer';
  const text=(correctLabel?correctLabel.textContent:'').trim();
  box.innerHTML=(chosen===correct?'✓ 你的答案正確：':'正確答案：')+'<b>'+esc(text)+'</b>';
  const actions=check.closest('.actions');if(actions)actions.insertAdjacentElement('afterend',box);else q.appendChild(box);
}
function installMcq(q){
  const check=q.querySelector('.ckmcq[data-name][data-a]');if(!check)return false;
  const actions=check.closest('.actions')||check.parentElement;
  if(actions&&!actions.querySelector('.v29-show-mcq')){
    const b=document.createElement('button');b.type='button';b.className='ghost v29-show-mcq';b.textContent='顯示答案';
    b.addEventListener('click',()=>revealMcq(q,check));
    actions.appendChild(b);
  }
  if(q.dataset.v29McqChange!=='1'){
    q.dataset.v29McqChange='1';
    q.addEventListener('change',ev=>{if(ev.target&&ev.target.matches&&ev.target.matches('input[type="radio"]'))clearMcqReveal(q);});
  }
  return true;
}

function installExistingFill(q){
  const check=q.querySelector('.ckfill[data-id]');if(!check)return false;
  const actions=check.closest('.actions')||check.parentElement;
  if(actions&&!actions.querySelector('.showans')){
    const input=document.getElementById(check.dataset.id||'');
    const ans=input&&input.dataset?input.dataset.answer:'';
    if(ans){
      let answer=q.querySelector('.answer');if(!answer){answer=document.createElement('div');answer.className='answer';answer.textContent='答案：'+ans;q.appendChild(answer);}
      const b=document.createElement('button');b.type='button';b.className='ghost showans';b.textContent='顯示答案';
      b.addEventListener('click',()=>answer.classList.toggle('show'));
      actions.appendChild(b);
    }
  }
  return true;
}

function install(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('.q').forEach(q=>{
    if(installCtest(q))return;
    if(installMcq(q))return;
    installExistingFill(q);
  });
}

/* Every normal render already calls wire(); install immediately after it. */
if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);install(document);return r;};
}

/* Fallback for renderer wrappers holding an older wire reference. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mock=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock){setTimeout(()=>install(document),0);setTimeout(()=>install(document),80);setTimeout(()=>install(document),220);}
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>install(document));else install(document);
setTimeout(()=>install(document),100);setTimeout(()=>install(document),350);

if(!document.getElementById('show-answer-v29-style')){
  const st=document.createElement('style');st.id='show-answer-v29-style';
  st.textContent='\n.v29-ctest-correction{display:inline-block;margin:0 5px 4px 3px;padding:3px 7px;border-radius:8px;background:#fff1ef;border:1px solid #efc7c2;color:#9f241b;font-size:.84rem;vertical-align:middle;white-space:nowrap}\n.v29-answer-wrong{border-color:#e39a92!important;background:#fff5f3!important}.v29-answer-right{border-color:#8ac6b1!important;background:#f3fbf7!important}\n.v29-ctest-answer-note,.v29-mcq-answer{margin-top:8px;padding:8px 10px;border-radius:9px;background:#eefaf6;border-left:4px solid #14785a;color:#126147}\n.option.v29-correct-option{background:#edf9f4!important;border:1px solid #8ac6b1}.option.v29-wrong-option{background:#fff1ef!important;border:1px solid #e39a92}\n';
  document.head.appendChild(st);
}
})();
