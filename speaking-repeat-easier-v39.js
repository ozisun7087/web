(function(){
'use strict';
/* TOEFL Study Lab Listen-and-Repeat easier v39
   - Hard final override for Listen and Repeat only.
   - Much shorter sentences than v38, with compressed adaptive tiers.
   - Re-applies after Speaking navigation and immediately before user interaction.
   - Keeps playback text, recorder scoring prompt, and show-answer transcript aligned.
   - Take an Interview is untouched.
*/
const SETS={
  foundation:[
    'The seminar starts at nine.',
    'Please submit the form by Friday.',
    'Residents discussed the housing plan.',
    'The study examines local housing.',
    'Redevelopment can change neighborhoods.',
    'Affordable housing helps families stay.',
    'Researchers use data and interviews.'
  ],
  standard:[
    'The seminar starts at nine in Room 305.',
    'Please submit the proposal by Friday afternoon.',
    'Residents discussed the new housing plan.',
    'The study examines local housing policies.',
    'Redevelopment can change social networks.',
    'Affordable housing helps residents stay nearby.',
    'Researchers combine data with short interviews.'
  ],
  advanced:[
    'The seminar starts at nine, so please arrive early.',
    'Please submit the proposal by Friday for review.',
    'Residents discussed the plan and housing costs.',
    'The study examines how housing affects residents.',
    'Redevelopment can improve buildings and change communities.',
    'Affordable housing helps long-term residents stay nearby.',
    'Researchers combine surveys with interviews for better evidence.'
  ],
  challenge:[
    'The seminar starts at nine, so students should arrive early.',
    'Please submit the proposal by Friday before the next class.',
    'Residents discussed the housing plan and asked about rents.',
    'The study examines how housing policies affect daily life.',
    'Redevelopment may improve buildings but change social networks.',
    'Affordable housing helps long-term residents remain in the area.',
    'Researchers combine surveys and interviews to compare different evidence.'
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
function isRepeatCard(q){
  if(!q)return false;
  const heading=[...q.querySelectorAll('h3,h4,b,strong')].map(x=>clean(x.textContent)).join(' ');
  if(/Listen and Repeat/i.test(heading))return true;
  const rec=q.querySelector('button.record[data-prompt]');
  const play=q.querySelector('button.splay[data-text]');
  if(!rec||!play)return false;
  const all=[...q.parentElement.querySelectorAll('.q')].filter(x=>x.querySelector('button.record[data-prompt]')&&x.querySelector('button.splay[data-text]'));
  const idx=all.indexOf(q);
  /* Speaking banks place the seven Listen-and-Repeat items before interview items. */
  return idx>=0&&idx<7;
}
function repeatCards(root){
  if(!root||!root.querySelectorAll)return[];
  return [...root.querySelectorAll('.q')].filter(isRepeatCard).slice(0,7);
}
function apply(root){
  if(!root)return;
  const key=tierKey(root),set=SETS[key]||SETS.advanced;
  repeatCards(root).forEach((q,i)=>{
    const prompt=set[i%set.length];
    const play=q.querySelector('button.splay[data-text]');
    const rec=q.querySelector('button.record[data-prompt]');
    if(play){play.dataset.text=prompt;play.setAttribute('data-text',prompt);}
    if(rec){rec.dataset.prompt=prompt;rec.setAttribute('data-prompt',prompt);}
    q.dataset.repeatDifficultyV39=key;
    let note=q.querySelector('.repeat-easier-v39-note');
    if(!note){
      note=document.createElement('div');note.className='small repeat-easier-v39-note';
      const audio=play&&play.closest('.audio');
      if(audio)audio.insertAdjacentElement('afterend',note);else q.prepend(note);
    }
    note.textContent='Listen and Repeat｜'+({foundation:'基礎',standard:'標準',advanced:'進階',challenge:'挑戰'}[key])+'：短句版，已降低記憶與句法負荷。';
  });
}
function roots(){return [document.getElementById('content'),document.getElementById('mock')].filter(Boolean);}
function applyAll(){roots().forEach(apply);}
function applyBurst(){[0,40,120,260,520,900,1500].forEach(ms=>setTimeout(applyAll,ms));}

/* Re-apply after stable rendering hooks. */
if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);applyAll();setTimeout(applyAll,50);setTimeout(applyAll,250);return r;};
}

/* Navigation into Speaking / Mock Speaking. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const normal=b.dataset&&b.dataset.t==='Speaking';
  const mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(normal||mock)applyBurst();
},false);

/* Pointer/key preflight runs before the later click handlers used by playback/recording/show-answer. */
function preflight(ev){
  const q=ev.target&&ev.target.closest?ev.target.closest('.q'):null;
  if(!q||!isRepeatCard(q))return;
  const root=q.closest('#mock')||q.closest('#content')||document;
  apply(root);
}
document.addEventListener('pointerdown',preflight,true);
document.addEventListener('touchstart',preflight,true);
document.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' ')preflight(ev);},true);
document.addEventListener('click',preflight,true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyBurst,{once:true});else applyBurst();
if(!document.getElementById('speaking-repeat-easier-v39-style')){
  const st=document.createElement('style');st.id='speaking-repeat-easier-v39-style';
  st.textContent='.repeat-easier-v39-note{margin:4px 0 8px;color:#667085;font-weight:650}';document.head.appendChild(st);
}
window.__toeflSpeakingRepeatEasierV39=true;
})();