(function(){
'use strict';
/* TOEFL Study Lab Listen-and-Repeat easier v38
   - Lowers ONLY Listen and Repeat difficulty; Take an Interview is unchanged.
   - Keeps adaptive tiers, but caps sentence length and syntactic complexity.
   - Updates both playback text and recorder scoring prompt so grading/show-answer stay aligned.
   - Applies to normal Speaking and Mock Speaking.
   - No MutationObserver.
*/
const SETS={
  foundation:[
    'The seminar begins at nine.',
    'Please submit the form by Friday.',
    'Residents discussed the housing plan.',
    'The study examines local housing.',
    'Redevelopment can change social networks.',
    'Affordable housing helps families stay nearby.',
    'Researchers use data and interviews.'
  ],
  standard:[
    'The seminar begins at nine in Room 305.',
    'Please submit the proposal by Friday afternoon.',
    'Residents discussed the new housing plan yesterday.',
    'The study examines how housing policies affect residents.',
    'Redevelopment can change social networks in a neighborhood.',
    'Affordable housing helps residents remain near their community.',
    'Researchers combine survey data with short interviews.'
  ],
  advanced:[
    'The seminar begins at nine, so please arrive a few minutes early.',
    'Please submit the proposal by Friday so the instructor can review it.',
    'Residents discussed the housing plan and raised concerns about affordability.',
    "The study examines how housing policies affect residents' daily lives.",
    'Redevelopment can improve buildings but may also change social networks.',
    'Affordable housing can help long-term residents remain in the neighborhood.',
    "Researchers combine survey data with interviews to understand residents' experiences."
  ],
  challenge:[
    'Although the seminar begins at nine, students should arrive a few minutes early.',
    'Please submit the proposal by Friday so the instructor can review it before class.',
    'Residents discussed the housing plan and asked whether rents would remain affordable.',
    'The study examines how housing policies affect daily routines in different neighborhoods.',
    'Redevelopment may improve physical conditions while also changing existing social networks.',
    'Affordable housing can help long-term residents remain nearby during neighborhood redevelopment.',
    'Researchers combine survey data with interviews because the two sources provide different evidence.'
  ]
};
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function tierKey(root){
  const note=root&&root.querySelector?root.querySelector('.adaptive-tier-v33'):null;
  const t=clean(note&&note.textContent);
  if(/今日難度：基礎/.test(t))return 'foundation';
  if(/今日難度：標準/.test(t))return 'standard';
  if(/今日難度：挑戰/.test(t))return 'challenge';
  return 'advanced';
}
function repeatCards(root){
  if(!root||!root.querySelectorAll)return[];
  return [...root.querySelectorAll('.q')].filter(q=>q.querySelector('button.record[data-prompt]')&&q.querySelector('button.splay[data-text]'));
}
function apply(root){
  if(!root)return;
  const key=tierKey(root),set=SETS[key]||SETS.advanced;
  const cards=repeatCards(root);
  cards.forEach((q,i)=>{
    const prompt=set[i%set.length];
    const play=q.querySelector('button.splay[data-text]');
    const rec=q.querySelector('button.record[data-prompt]');
    if(play)play.dataset.text=prompt;
    if(rec)rec.dataset.prompt=prompt;
    q.dataset.repeatDifficultyV38=key;
    let note=q.querySelector('.repeat-easier-v38-note');
    if(!note){
      note=document.createElement('div');
      note.className='small repeat-easier-v38-note';
      const audio=play&&play.closest('.audio');
      if(audio)audio.insertAdjacentElement('afterend',note);
      else q.insertBefore(note,q.firstChild&&q.firstChild.nextSibling);
    }
    note.textContent='Listen and Repeat｜'+({foundation:'基礎',standard:'標準',advanced:'進階',challenge:'挑戰'}[key])+'：已降低句長與記憶負荷。';
  });
}
function applySoon(root){setTimeout(()=>apply(root),0);setTimeout(()=>apply(root),80);setTimeout(()=>apply(root),220);}
if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);apply(document.getElementById('content'));apply(document.getElementById('mock'));return r;};
}
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const normal=b.dataset&&b.dataset.t==='Speaking';
  const mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(normal)applySoon(document.getElementById('content'));
  if(mock)applySoon(document.getElementById('mock'));
},false);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{applySoon(document.getElementById('content'));applySoon(document.getElementById('mock'));},{once:true});
else{applySoon(document.getElementById('content'));applySoon(document.getElementById('mock'));}
if(!document.getElementById('speaking-repeat-easier-v38-style')){
  const st=document.createElement('style');st.id='speaking-repeat-easier-v38-style';
  st.textContent='.repeat-easier-v38-note{margin:4px 0 8px;color:#667085}';document.head.appendChild(st);
}
window.__toeflSpeakingRepeatEasierV38=true;
})();