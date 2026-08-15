(function(){
'use strict';
/* TOEFL Study Lab Speaking accent randomizer v55
   ETS 2026 Speaking may use native-speaker accents from North America,
   the U.K., Australia, and New Zealand.
   - A shuffled four-accent deck is created once per page load.
   - Speaking prompt buttons are assigned across that deck so one practice
     session contains real accent variety instead of accidental same-accent runs.
   - The same prompt keeps the same assigned accent when replayed in the
     current page session; reloading creates a new shuffle.
   - No MutationObserver is used, preserving the site's stability safeguards.
*/

const ACCENTS=[
  {id:'north-america',name:'North American',locales:['en-US','en-CA'],canonical:'en-US'},
  {id:'uk',name:'U.K.',locales:['en-GB'],canonical:'en-GB'},
  {id:'australia',name:'Australian',locales:['en-AU'],canonical:'en-AU'},
  {id:'new-zealand',name:'New Zealand',locales:['en-NZ'],canonical:'en-NZ'}
];

const assignments=new Map();
let nextAccent=0;
let deck=[];

function randomInt(max){
  if(max<=1)return 0;
  try{
    if(window.crypto&&crypto.getRandomValues){
      const x=new Uint32Array(1);crypto.getRandomValues(x);
      return x[0]%max;
    }
  }catch(e){}
  return Math.floor(Math.random()*max);
}
function shuffle(a){
  const out=a.slice();
  for(let i=out.length-1;i>0;i--){
    const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}
function resetDeck(){deck=shuffle(ACCENTS);nextAccent=0;}
resetDeck();

function voices(){
  try{return (window.speechSynthesis&&speechSynthesis.getVoices?speechSynthesis.getVoices():[])||[];}
  catch(e){return[];}
}
function localeFor(accent){
  const available=voices();
  const exact=[];
  for(const locale of accent.locales){
    const target=locale.toLowerCase();
    if(available.some(v=>String(v.lang||'').toLowerCase()===target))exact.push(locale);
  }
  if(exact.length)return exact[randomInt(exact.length)];
  /* Still request the ETS-valid locale when the device does not expose an exact
     installed voice. The browser may provide it lazily; the base speech layer
     otherwise falls back to the closest available English voice. */
  return accent.canonical;
}
function promptKey(btn,index){
  const text=String(btn&&btn.dataset&&btn.dataset.text||'').replace(/\s+/g,' ').trim();
  const q=btn&&btn.closest?btn.closest('.q'):null;
  const rec=q&&q.querySelector?q.querySelector('button.record[data-id]'):null;
  const id=rec&&rec.dataset?String(rec.dataset.id||''):'';
  return id||text||('speaking-'+index);
}
function nextProfile(){
  if(nextAccent>=deck.length){deck=shuffle(ACCENTS);nextAccent=0;}
  return deck[nextAccent++];
}
function assignVisible(){
  const buttons=[...document.querySelectorAll('button.splay')];
  buttons.forEach((btn,index)=>{
    const key=promptKey(btn,index);
    let accent=assignments.get(key);
    if(!accent){accent=nextProfile();assignments.set(key,accent);}
    btn.dataset.toeflAccent=accent.id;
    btn.dataset.toeflAccentName=accent.name;
    btn.dataset.toeflAccentLocale=localeFor(accent);
    btn.dataset.lang=btn.dataset.toeflAccentLocale;
    btn.dataset.accentV55='1';
  });
}
function accentForButton(btn){
  assignVisible();
  const id=String(btn.dataset.toeflAccent||'');
  const accent=ACCENTS.find(x=>x.id===id)||nextProfile();
  const locale=btn.dataset.toeflAccentLocale||localeFor(accent);
  btn.dataset.toeflAccent=accent.id;
  btn.dataset.toeflAccentName=accent.name;
  btn.dataset.toeflAccentLocale=locale;
  btn.dataset.lang=locale;
  return {accent,locale};
}

/* Capture phase deliberately owns Speaking play clicks. The older playback
   patch may rewrite button.onclick after render, but it cannot force en-US
   because this listener handles the event first. */
document.addEventListener('click',function(ev){
  const btn=ev.target&&ev.target.closest?ev.target.closest('button.splay'):null;
  if(!btn)return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  const p=accentForButton(btn);
  if(typeof window.__toeflSpeak==='function'){
    window.__toeflSpeak(btn.dataset.text||'',p.locale,btn,{});
  }else if(typeof window.speakText==='function'){
    window.speakText(btn.dataset.text||'',p.locale,btn);
  }
},true);

/* Re-assign after the render entry points without observing the DOM. */
if(typeof window.render==='function'){
  const baseRender=window.render;
  window.render=function(){
    const r=baseRender.apply(this,arguments);
    setTimeout(assignVisible,20);setTimeout(assignVisible,320);
    return r;
  };
}
if(typeof window.mockPart==='function'){
  const baseMockPart=window.mockPart;
  window.mockPart=function(){
    const r=baseMockPart.apply(this,arguments);
    setTimeout(assignVisible,20);setTimeout(assignVisible,320);
    return r;
  };
}

if('speechSynthesis' in window){
  try{speechSynthesis.getVoices();}catch(e){}
  /* Do not replace the site's existing onvoiceschanged handler. */
  if(typeof speechSynthesis.addEventListener==='function'){
    speechSynthesis.addEventListener('voiceschanged',()=>setTimeout(assignVisible,0));
  }
}
[0,80,350,900].forEach(ms=>setTimeout(assignVisible,ms));
window.__toeflSpeakingAccentRandomV55={assignVisible,accents:ACCENTS.map(x=>x.id)};
})();
