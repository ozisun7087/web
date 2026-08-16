(function(){
'use strict';
/* TOEFL Study Lab natural voice guard v58
   Goal: prefer normal human-like English system voices and suppress novelty/
   robotic voices. Applies to Listening and Speaking at the final
   speechSynthesis.speak() boundary, so all existing accent/replay logic remains.
*/
if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance)return;

const synth=window.speechSynthesis;
const originalSpeak=synth.speak.bind(synth);
const originalGetVoices=synth.getVoices.bind(synth);
const replacementMap=new Map();
const claimed=new Set();

const BAD=/\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|princess|trinoids|whisper|zarvox|novelty|robot|robotic|espeak|festival|flite|pico|mbrola|gnuspeech|sam voice|organ|synth)\b/i;
const PREMIUM=/\b(natural|neural|online|premium|enhanced|high quality|studio)\b/i;
const PROVIDER=/\b(google|microsoft|siri|apple)\b/i;
const KNOWN_GOOD=/\b(samantha|ava|allison|susan|tom|zoe|aaron|joelle|nicky|reed|daniel|serena|kate|stephanie|jamie|oliver|martha|karen|lee|catherine|gordon|moana|arthur|ryan|sonia|libby|jenny|aria|guy|natasha|william|andrew|emma|brian)\b/i;
const LOW=/\b(compact|legacy|classic|basic)\b/i;

function normLang(x){return String(x||'').trim().toLowerCase().replace(/_/g,'-');}
function vid(v){return String((v&&v.voiceURI)||'')+'|'+String((v&&v.name)||'')+'|'+String((v&&v.lang)||'');}
function label(v){return String((v&&v.name)||'')+' '+String((v&&v.voiceURI)||'')+' '+String((v&&v.lang)||'');}
function allEnglish(){
  let a=[];try{a=originalGetVoices()||[];}catch(e){}
  const seen=new Set();
  return a.filter(v=>{
    const id=vid(v);if(seen.has(id))return false;seen.add(id);
    return normLang(v.lang).startsWith('en')&&!BAD.test(label(v));
  });
}
function quality(v,target){
  if(!v)return-9999;
  const text=label(v),l=normLang(v.lang),t=normLang(target||'en-US');
  if(BAD.test(text))return-9999;
  let s=0;
  if(l===t)s+=70;else if(l.slice(0,2)===t.slice(0,2))s+=25;
  if(PREMIUM.test(text))s+=90;
  if(PROVIDER.test(text))s+=28;
  if(KNOWN_GOOD.test(text))s+=24;
  if(LOW.test(text))s-=30;
  if(v.localService===false)s+=8; // online voices are often neural/natural
  else if(v.localService===true)s+=3;
  return s;
}
function candidates(lang){
  const t=normLang(lang||'en-US'),all=allEnglish();
  const exact=all.filter(v=>normLang(v.lang)===t);
  const sameBase=all.filter(v=>normLang(v.lang).slice(0,2)===t.slice(0,2));
  const pool=exact.length?exact:(sameBase.length?sameBase:all);
  return pool.slice().sort((a,b)=>quality(b,t)-quality(a,t));
}
function chooseVoice(current,lang){
  const pool=candidates(lang);if(!pool.length)return current||null;
  const curText=label(current),curScore=quality(current,lang),bestScore=quality(pool[0],lang);
  // Keep an already-good voice; replace obvious low-quality/special voices, or
  // upgrade when a substantially better natural/neural voice exists.
  if(current&&!BAD.test(curText)&&!LOW.test(curText)&&curScore>=bestScore-18)return current;

  const key=current?vid(current):'__none__|'+normLang(lang);
  const mapped=replacementMap.get(key);
  if(mapped){const hit=pool.find(v=>vid(v)===mapped);if(hit)return hit;}

  let chosen=pool.find(v=>!claimed.has(vid(v)))||pool[0];
  replacementMap.set(key,vid(chosen));claimed.add(vid(chosen));
  return chosen;
}
function naturalizeUtterance(u){
  if(!u)return u;
  const target=(u.voice&&u.voice.lang)||u.lang||'en-US';
  const v=chooseVoice(u.voice,target);
  if(v){try{u.voice=v;u.lang=v.lang||target;}catch(e){}}

  // Extreme pitch shifts are a major source of cartoonish/non-human sound.
  let p=Number(u.pitch);if(!Number.isFinite(p))p=1;
  if(p<0.94)p=0.94;else if(p>1.06)p=1.06;
  try{u.pitch=p;}catch(e){}

  let r=Number(u.rate);if(!Number.isFinite(r))r=.92;
  if(r<.86)r=.86;else if(r>1.02)r=1.02;
  try{u.rate=r;}catch(e){}
  try{u.volume=1;}catch(e){}
  return u;
}
function guardedSpeak(u){return originalSpeak(naturalizeUtterance(u));}

let installed=false;
try{synth.speak=guardedSpeak;installed=synth.speak===guardedSpeak;}catch(e){}
if(!installed&&window.SpeechSynthesis&&SpeechSynthesis.prototype){
  try{SpeechSynthesis.prototype.speak=function(u){return originalSpeak(naturalizeUtterance(u));};installed=true;}catch(e){}
}

window.__toeflNaturalVoiceV58={
  installed,
  refresh:function(){try{originalGetVoices();}catch(e){}},
  inspect:function(){return allEnglish().map(v=>({name:v.name,lang:v.lang,localService:v.localService,quality:quality(v,v.lang)})).sort((a,b)=>b.quality-a.quality);}
};
try{synth.addEventListener('voiceschanged',()=>window.__toeflNaturalVoiceV58.refresh());}catch(e){}
})();
