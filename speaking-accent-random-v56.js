(function(){
'use strict';
/* TOEFL Study Lab Speaking accent engine v56
   Fixes the v55 issue where only a locale was passed to the older speech layer.
   v56 owns Speaking prompt playback and selects an actual SpeechSynthesisVoice
   for each question whenever the browser exposes one.

   Behaviour:
   - Questions are assigned from a shuffled balanced deck of North American,
     U.K., Australian, and New Zealand accents.
   - The same question keeps its assigned accent/voice during the page session.
   - Reloading reshuffles assignments.
   - Voice inventory is refreshed on voiceschanged and immediately before play.
   - Exact regional voices are selected by BOTH locale and well-known voice-name
     hints. If an exact regional voice is unavailable on the device, a distinct
     English fallback voice plus a mild acoustic profile is used and the badge
     says "fallback" instead of pretending it is a native regional voice.
   - No MutationObserver is used.
*/

const ACCENTS=[
  {id:'north-america',label:'North American',short:'North American',locales:['en-US','en-CA'],rate:.91,pitch:1.00,
   hints:/\b(us|united states|american|canada|canadian|samantha|alex|allison|ava|susan|tom|zoe|aaron|joelle|nicky|reed|google us english|microsoft .* online.*united states)\b/i},
  {id:'uk',label:'U.K.',short:'U.K.',locales:['en-GB'],rate:.89,pitch:.98,
   hints:/\b(uk|united kingdom|british|england|english uk|daniel|serena|kate|stephanie|jamie|oliver|martha|google uk english|microsoft .* online.*united kingdom)\b/i},
  {id:'australia',label:'Australian',short:'Australian',locales:['en-AU'],rate:.92,pitch:1.02,
   hints:/\b(australia|australian|karen|lee|catherine|gordon|google australian english|microsoft .* online.*australia)\b/i},
  {id:'new-zealand',label:'New Zealand',short:'New Zealand',locales:['en-NZ'],rate:.90,pitch:1.01,
   hints:/\b(new zealand|zealand|kiwi|moana|google new zealand english|microsoft .* online.*new zealand)\b/i}
];

const assignments=new Map();
let deck=[];
let deckIndex=0;
let playToken=0;
let currentBtn=null;
let currentUtterance=null;
let voiceCache=[];
let voiceGeneration=0;

function rand(max){
  if(max<=1)return 0;
  try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;}}catch(e){}
  return Math.floor(Math.random()*max);
}
function shuffle(input){
  const a=input.slice();
  for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function refillDeck(){
  let next=shuffle(ACCENTS);
  /* Avoid a same-accent seam between decks where possible. */
  if(deck.length&&next.length>1&&deck[deck.length-1].id===next[0].id){[next[0],next[1]]=[next[1],next[0]];}
  deck=next;deckIndex=0;
}
function nextAccent(){if(!deck.length||deckIndex>=deck.length)refillDeck();return deck[deckIndex++];}
refillDeck();

function normLang(v){return String(v||'').trim().toLowerCase().replace(/_/g,'-');}
function voiceId(v){return String((v&&v.voiceURI)||'')+'|'+String((v&&v.name)||'')+'|'+String((v&&v.lang)||'');}
function refreshVoices(){
  let raw=[];
  try{raw=(window.speechSynthesis&&speechSynthesis.getVoices?speechSynthesis.getVoices():[])||[];}catch(e){}
  const seen=new Set();
  voiceCache=raw.filter(v=>{const k=voiceId(v);if(seen.has(k))return false;seen.add(k);return true;});
  voiceGeneration++;
  return voiceCache;
}
function englishVoices(){return refreshVoices().filter(v=>normLang(v.lang).startsWith('en'));}
function exactRegionalVoices(accent,all){
  const allowed=new Set(accent.locales.map(normLang));
  let exact=all.filter(v=>allowed.has(normLang(v.lang)));
  if(exact.length)return exact;
  /* Some engines expose poor/blank language metadata but useful regional names. */
  exact=all.filter(v=>accent.hints.test((String(v.name||'')+' '+String(v.voiceURI||'')+' '+String(v.lang||''))));
  return exact;
}
function pickVoice(accent,assignedVoiceId){
  const all=englishVoices();
  const regional=exactRegionalVoices(accent,all);
  if(assignedVoiceId){
    const previous=all.find(v=>voiceId(v)===assignedVoiceId);
    if(previous){
      const exact=regional.some(v=>voiceId(v)===assignedVoiceId);
      return {voice:previous,exact};
    }
  }
  if(regional.length){return {voice:regional[rand(regional.length)],exact:true};}
  return {voice:null,exact:false,all};
}
function keyFor(btn,index){
  const q=btn.closest&&btn.closest('.q');
  const rec=q&&q.querySelector?q.querySelector('button.record[data-id]'):null;
  const id=rec&&rec.dataset?String(rec.dataset.id||'').trim():'';
  const text=String(btn.dataset.text||'').replace(/\s+/g,' ').trim();
  return id||('splay|'+index+'|'+text);
}
function allSpeakingButtons(){return [...document.querySelectorAll('button.splay')];}
function ensureAssignment(btn,index){
  const key=keyFor(btn,index);
  let a=assignments.get(key);
  if(!a){a={accent:nextAccent(),voiceId:'',fallbackVoiceId:''};assignments.set(key,a);}
  return a;
}
function distributeFallbackVoices(){
  const buttons=allSpeakingButtons();
  const all=englishVoices();
  const used=new Set();
  buttons.forEach((btn,index)=>{
    const a=ensureAssignment(btn,index);
    const regional=exactRegionalVoices(a.accent,all);
    if(regional.length){
      if(!a.voiceId||!regional.some(v=>voiceId(v)===a.voiceId)){
        const unused=regional.filter(v=>!used.has(voiceId(v)));
        const v=(unused.length?unused:regional)[rand((unused.length?unused:regional).length)];
        a.voiceId=voiceId(v);used.add(a.voiceId);
      }
    }else if(all.length){
      if(!a.fallbackVoiceId||!all.some(v=>voiceId(v)===a.fallbackVoiceId)){
        const unused=all.filter(v=>!used.has(voiceId(v)));
        const pool=unused.length?unused:all;
        const v=pool[rand(pool.length)];
        a.fallbackVoiceId=voiceId(v);used.add(a.fallbackVoiceId);
      }
    }
  });
}
function addCss(){
  if(document.getElementById('toefl-accent-v56-style'))return;
  const s=document.createElement('style');s.id='toefl-accent-v56-style';
  s.textContent='.toefl-accent-v56{display:inline-flex;align-items:center;gap:5px;margin-left:8px;padding:3px 7px;border-radius:999px;background:#eef3ff;color:#2949a8;font-size:11px;font-weight:700;vertical-align:middle}.toefl-accent-v56.fallback{background:#fff4e5;color:#8a4b08}.toefl-accent-v56.voice-ready:before{content:"●";font-size:8px}.toefl-accent-v56.fallback:before{content:"△";font-size:10px}';
  document.head.appendChild(s);
}
function badgeFor(btn){
  let badge=btn.parentElement&&btn.parentElement.querySelector(':scope > .toefl-accent-v56');
  if(!badge){badge=document.createElement('span');badge.className='toefl-accent-v56';btn.insertAdjacentElement('afterend',badge);}
  return badge;
}
function applyAssignments(){
  addCss();
  distributeFallbackVoices();
  const all=englishVoices();
  allSpeakingButtons().forEach((btn,index)=>{
    const a=ensureAssignment(btn,index);
    const exact=exactRegionalVoices(a.accent,all);
    const badge=badgeFor(btn);
    badge.className='toefl-accent-v56 '+(exact.length?'voice-ready':'fallback');
    badge.textContent=exact.length?('本題口音：'+a.accent.short):('本題目標：'+a.accent.short+'（裝置 fallback）');
    btn.dataset.toeflAccent=a.accent.id;
    btn.dataset.toeflAccentName=a.accent.label;
    btn.dataset.toeflAccentV56='1';
    btn.title='本題 Speaking 音檔口音：'+a.accent.label+(exact.length?'':'；此裝置未提供對應區域語音，將使用英文 fallback');
  });
}
function waitForVoices(ms){
  refreshVoices();
  if(voiceCache.some(v=>normLang(v.lang).startsWith('en')))return Promise.resolve();
  return new Promise(resolve=>{
    let done=false;
    const finish=()=>{if(done)return;done=true;refreshVoices();resolve();};
    let timer=setTimeout(finish,ms||800);
    try{
      if(speechSynthesis.addEventListener){
        const h=()=>{clearTimeout(timer);try{speechSynthesis.removeEventListener('voiceschanged',h);}catch(e){}finish();};
        speechSynthesis.addEventListener('voiceschanged',h,{once:true});
      }
    }catch(e){}
  });
}
function resetButton(btn){
  if(!btn)return;
  btn.disabled=false;
  if(btn.dataset.playLabelV56)btn.textContent=btn.dataset.playLabelV56;
  btn.removeAttribute('aria-busy');
}
function fallbackProfile(accent){
  /* Mild differentiation only for devices missing a true regional voice.
     The UI explicitly labels this as fallback so it is not misrepresented. */
  if(accent.id==='uk')return {rate:.87,pitch:.96};
  if(accent.id==='australia')return {rate:.94,pitch:1.04};
  if(accent.id==='new-zealand')return {rate:.90,pitch:1.06};
  return {rate:.92,pitch:1.00};
}
async function playSpeaking(btn){
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){alert('目前瀏覽器不支援語音播放，請改用 Safari、Chrome 或 Edge。');return;}
  const buttons=allSpeakingButtons();
  const index=Math.max(0,buttons.indexOf(btn));
  const a=ensureAssignment(btn,index);
  const token=++playToken;
  if(currentBtn&&currentBtn!==btn)resetButton(currentBtn);
  currentBtn=btn;
  if(!btn.dataset.playLabelV56)btn.dataset.playLabelV56=btn.textContent;
  btn.disabled=false;btn.textContent='準備 '+a.accent.short+' 音檔…';btn.setAttribute('aria-busy','true');
  try{speechSynthesis.cancel();if(speechSynthesis.paused)speechSynthesis.resume();}catch(e){}
  await waitForVoices(900);
  if(token!==playToken)return;
  distributeFallbackVoices();
  const all=englishVoices();
  let choice=pickVoice(a.accent,a.voiceId);
  if(choice.voice&&choice.exact)a.voiceId=voiceId(choice.voice);
  if(!choice.voice){
    const fallbackId=a.fallbackVoiceId;
    choice.voice=all.find(v=>voiceId(v)===fallbackId)||all[0]||null;
    choice.exact=false;
  }
  const text=String(btn.dataset.text||'').trim();
  if(!text){resetButton(btn);return;}
  const u=new SpeechSynthesisUtterance(text);currentUtterance=u;
  if(choice.voice){u.voice=choice.voice;u.lang=choice.voice.lang||a.accent.locales[0];}
  else u.lang=a.accent.locales[0];
  const profile=choice.exact?{rate:a.accent.rate,pitch:a.accent.pitch}:fallbackProfile(a.accent);
  u.rate=profile.rate;u.pitch=profile.pitch;u.volume=1;
  const badge=badgeFor(btn);
  badge.className='toefl-accent-v56 '+(choice.exact?'voice-ready':'fallback');
  badge.textContent=choice.exact?('本題口音：'+a.accent.short):('本題目標：'+a.accent.short+'（裝置 fallback）');
  if(choice.voice)badge.title='實際語音：'+choice.voice.name+' / '+choice.voice.lang;
  u.onstart=()=>{if(token!==playToken)return;btn.textContent='🔊 '+a.accent.short+' 播放中…';btn.setAttribute('aria-busy','true');};
  u.onend=()=>{if(token!==playToken)return;currentUtterance=null;resetButton(btn);};
  u.onerror=()=>{if(token!==playToken)return;currentUtterance=null;resetButton(btn);};
  try{speechSynthesis.speak(u);}catch(e){resetButton(btn);}
}

/* Capture phase prevents the older en-US-only onclick from running. */
document.addEventListener('click',function(ev){
  const btn=ev.target&&ev.target.closest?ev.target.closest('button.splay'):null;
  if(!btn)return;
  ev.preventDefault();ev.stopImmediatePropagation();
  playSpeaking(btn);
},true);

/* Wrap render entry points without MutationObserver. */
if(typeof window.render==='function'){
  const base=window.render;
  window.render=function(){const r=base.apply(this,arguments);[20,180,500].forEach(ms=>setTimeout(applyAssignments,ms));return r;};
}
if(typeof window.mockPart==='function'){
  const base=window.mockPart;
  window.mockPart=function(){const r=base.apply(this,arguments);[20,180,500].forEach(ms=>setTimeout(applyAssignments,ms));return r;};
}
if('speechSynthesis' in window){
  try{speechSynthesis.getVoices();}catch(e){}
  try{speechSynthesis.addEventListener('voiceschanged',()=>{refreshVoices();setTimeout(applyAssignments,0);});}catch(e){}
}
[0,80,350,900,1800].forEach(ms=>setTimeout(applyAssignments,ms));
window.__toeflSpeakingAccentV56={
  refresh:applyAssignments,
  getAssignments:()=>allSpeakingButtons().map((b,i)=>{const a=ensureAssignment(b,i);return {question:keyFor(b,i),accent:a.accent.label};}),
  accents:ACCENTS.map(a=>a.label)
};
})();
