(function(){
'use strict';
/* TOEFL Study Lab Speaking accent engine v57
   Exam-likeness weighting. ETS publicly confirms North American, U.K.,
   Australian and New Zealand accents may occur, but does not publish exact
   percentages. Practice proxy used here: NA 65%, UK 20%, AU 10%, NZ 5%.
   A 20-item weighted deck (13/4/2/1) is shuffled, so long-run exposure keeps
   the target proportions while item order remains random.
*/

const ACCENTS=[
  {id:'north-america',label:'North American',short:'North American',weight:13,prob:'65%',locales:['en-US','en-CA'],rate:.91,pitch:1.00,
   hints:/\b(us|united states|american|canada|canadian|samantha|alex|allison|ava|susan|tom|zoe|aaron|joelle|nicky|reed|google us english|microsoft .* online.*united states)\b/i},
  {id:'uk',label:'U.K.',short:'U.K.',weight:4,prob:'20%',locales:['en-GB'],rate:.89,pitch:.98,
   hints:/\b(uk|united kingdom|british|england|english uk|daniel|serena|kate|stephanie|jamie|oliver|martha|google uk english|microsoft .* online.*united kingdom)\b/i},
  {id:'australia',label:'Australian',short:'Australian',weight:2,prob:'10%',locales:['en-AU'],rate:.92,pitch:1.02,
   hints:/\b(australia|australian|karen|lee|catherine|gordon|google australian english|microsoft .* online.*australia)\b/i},
  {id:'new-zealand',label:'New Zealand',short:'New Zealand',weight:1,prob:'5%',locales:['en-NZ'],rate:.90,pitch:1.01,
   hints:/\b(new zealand|zealand|kiwi|moana|google new zealand english|microsoft .* online.*new zealand)\b/i}
];
const DISTRIBUTION_TEXT='口音練習權重：North American 65%｜U.K. 20%｜Australian 10%｜New Zealand 5%（ETS 未公布官方百分比，本站依官方描述作擬真配置）';
const assignments=new Map();
let deck=[],deckIndex=0,playToken=0,currentBtn=null,currentUtterance=null,voiceCache=[];

function rand(max){
  if(max<=1)return 0;
  try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;}}catch(e){}
  return Math.floor(Math.random()*max);
}
function shuffle(input){const a=input.slice();for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function refillDeck(){
  const weighted=[];
  ACCENTS.forEach(a=>{for(let i=0;i<a.weight;i++)weighted.push(a);});
  let next=shuffle(weighted);
  /* Reduce identical accent at the seam when a swap is possible. */
  if(deck.length&&next.length>1&&deck[deck.length-1].id===next[0].id){
    const j=next.findIndex((x,i)=>i>0&&x.id!==next[0].id);
    if(j>0)[next[0],next[j]]=[next[j],next[0]];
  }
  deck=next;deckIndex=0;
}
function nextAccent(){if(!deck.length||deckIndex>=deck.length)refillDeck();return deck[deckIndex++];}
refillDeck();

function normLang(v){return String(v||'').trim().toLowerCase().replace(/_/g,'-');}
function voiceId(v){return String((v&&v.voiceURI)||'')+'|'+String((v&&v.name)||'')+'|'+String((v&&v.lang)||'');}
function refreshVoices(){
  let raw=[];try{raw=(window.speechSynthesis&&speechSynthesis.getVoices?speechSynthesis.getVoices():[])||[];}catch(e){}
  const seen=new Set();voiceCache=raw.filter(v=>{const k=voiceId(v);if(seen.has(k))return false;seen.add(k);return true;});return voiceCache;
}
function englishVoices(){return refreshVoices().filter(v=>normLang(v.lang).startsWith('en'));}
function exactRegionalVoices(accent,all){
  const allowed=new Set(accent.locales.map(normLang));
  let exact=all.filter(v=>allowed.has(normLang(v.lang)));
  if(exact.length)return exact;
  return all.filter(v=>accent.hints.test(String(v.name||'')+' '+String(v.voiceURI||'')+' '+String(v.lang||'')));
}
function keyFor(btn,index){
  const q=btn.closest&&btn.closest('.q');
  const rec=q&&q.querySelector?q.querySelector('button.record[data-id]'):null;
  const id=rec&&rec.dataset?String(rec.dataset.id||'').trim():'';
  const text=String(btn.dataset.text||'').replace(/\s+/g,' ').trim();
  return id||('splay|'+index+'|'+text);
}
function buttons(){return [...document.querySelectorAll('button.splay')];}
function ensureAssignment(btn,index){
  const key=keyFor(btn,index);let a=assignments.get(key);
  if(!a){a={accent:nextAccent(),voiceId:'',fallbackVoiceId:''};assignments.set(key,a);}return a;
}
function chooseRegional(accent,preferredId){
  const all=englishVoices(),regional=exactRegionalVoices(accent,all);
  if(preferredId){const prev=regional.find(v=>voiceId(v)===preferredId);if(prev)return {voice:prev,exact:true,all};}
  if(regional.length)return {voice:regional[rand(regional.length)],exact:true,all};
  return {voice:null,exact:false,all};
}
function allocateFallbacks(){
  const all=englishVoices(),used=new Set();
  buttons().forEach((btn,index)=>{
    const a=ensureAssignment(btn,index),regional=exactRegionalVoices(a.accent,all);
    if(regional.length){
      if(!a.voiceId||!regional.some(v=>voiceId(v)===a.voiceId)){
        const unused=regional.filter(v=>!used.has(voiceId(v))),pool=unused.length?unused:regional,v=pool[rand(pool.length)];
        a.voiceId=voiceId(v);used.add(a.voiceId);
      }
    }else if(all.length&&(!a.fallbackVoiceId||!all.some(v=>voiceId(v)===a.fallbackVoiceId))){
      const unused=all.filter(v=>!used.has(voiceId(v))),pool=unused.length?unused:all,v=pool[rand(pool.length)];
      a.fallbackVoiceId=voiceId(v);used.add(a.fallbackVoiceId);
    }
  });
}
function addCss(){
  if(document.getElementById('toefl-accent-v57-style'))return;
  const s=document.createElement('style');s.id='toefl-accent-v57-style';
  s.textContent='.toefl-accent-v57{display:inline-flex;align-items:center;gap:5px;margin-left:8px;padding:3px 7px;border-radius:999px;background:#eef3ff;color:#2949a8;font-size:11px;font-weight:700;vertical-align:middle}.toefl-accent-v57.fallback{background:#fff4e5;color:#8a4b08}.toefl-accent-v57.ready:before{content:"●";font-size:8px}.toefl-accent-v57.fallback:before{content:"△";font-size:10px}.toefl-accent-distribution-v57{margin:8px 0 12px;padding:8px 10px;border:1px solid #dbe3ef;border-radius:10px;background:#f8faff;color:#4b5870;font-size:11px;line-height:1.5}';
  document.head.appendChild(s);
}
function badgeFor(btn){
  let b=btn.parentElement&&btn.parentElement.querySelector(':scope > .toefl-accent-v57');
  if(!b){b=document.createElement('span');b.className='toefl-accent-v57';btn.insertAdjacentElement('afterend',b);}return b;
}
function ensureDistributionNote(){
  const first=buttons()[0];if(!first)return;
  const section=first.closest('section')||first.closest('.panel')||first.closest('.card')||first.parentElement;
  if(!section||section.querySelector('.toefl-accent-distribution-v57'))return;
  const n=document.createElement('div');n.className='toefl-accent-distribution-v57';n.textContent=DISTRIBUTION_TEXT;
  const q=first.closest('.q');if(q&&q.parentElement)q.parentElement.insertBefore(n,q);else section.insertBefore(n,section.firstChild);
}
function applyAssignments(){
  addCss();allocateFallbacks();const all=englishVoices();
  buttons().forEach((btn,index)=>{
    const a=ensureAssignment(btn,index),exact=exactRegionalVoices(a.accent,all),b=badgeFor(btn);
    b.className='toefl-accent-v57 '+(exact.length?'ready':'fallback');
    b.textContent=exact.length?('本題口音：'+a.accent.short):('本題目標：'+a.accent.short+'（裝置 fallback）');
    b.title=a.accent.short+'｜練習權重 '+a.accent.prob;
    btn.dataset.toeflAccent=a.accent.id;btn.dataset.toeflAccentName=a.accent.label;btn.dataset.toeflAccentWeight=a.accent.prob;btn.dataset.toeflAccentV57='1';
  });
  ensureDistributionNote();
}
function waitForVoices(ms){
  refreshVoices();if(voiceCache.some(v=>normLang(v.lang).startsWith('en')))return Promise.resolve();
  return new Promise(resolve=>{let done=false,timer;const finish=()=>{if(done)return;done=true;refreshVoices();resolve();};timer=setTimeout(finish,ms||900);try{if(speechSynthesis.addEventListener){const h=()=>{clearTimeout(timer);try{speechSynthesis.removeEventListener('voiceschanged',h);}catch(e){}finish();};speechSynthesis.addEventListener('voiceschanged',h,{once:true});}}catch(e){}});
}
function resetButton(btn){if(!btn)return;btn.disabled=false;if(btn.dataset.playLabelV57)btn.textContent=btn.dataset.playLabelV57;btn.removeAttribute('aria-busy');}
function fallbackProfile(accent){if(accent.id==='uk')return {rate:.87,pitch:.96};if(accent.id==='australia')return {rate:.94,pitch:1.04};if(accent.id==='new-zealand')return {rate:.90,pitch:1.06};return {rate:.92,pitch:1.00};}
async function playSpeaking(btn){
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){alert('目前瀏覽器不支援語音播放，請改用 Safari、Chrome 或 Edge。');return;}
  const list=buttons(),index=Math.max(0,list.indexOf(btn)),a=ensureAssignment(btn,index),token=++playToken;
  if(currentBtn&&currentBtn!==btn)resetButton(currentBtn);currentBtn=btn;
  if(!btn.dataset.playLabelV57)btn.dataset.playLabelV57=btn.textContent;
  btn.disabled=false;btn.textContent='準備 '+a.accent.short+' 音檔…';btn.setAttribute('aria-busy','true');
  try{speechSynthesis.cancel();if(speechSynthesis.paused)speechSynthesis.resume();}catch(e){}
  await waitForVoices(900);if(token!==playToken)return;allocateFallbacks();
  let choice=chooseRegional(a.accent,a.voiceId);const all=choice.all||englishVoices();
  if(choice.voice&&choice.exact)a.voiceId=voiceId(choice.voice);
  if(!choice.voice){choice.voice=all.find(v=>voiceId(v)===a.fallbackVoiceId)||all[0]||null;choice.exact=false;}
  const text=String(btn.dataset.text||'').trim();if(!text){resetButton(btn);return;}
  const u=new SpeechSynthesisUtterance(text);currentUtterance=u;
  if(choice.voice){u.voice=choice.voice;u.lang=choice.voice.lang||a.accent.locales[0];}else u.lang=a.accent.locales[0];
  const p=choice.exact?{rate:a.accent.rate,pitch:a.accent.pitch}:fallbackProfile(a.accent);u.rate=p.rate;u.pitch=p.pitch;u.volume=1;
  const b=badgeFor(btn);b.className='toefl-accent-v57 '+(choice.exact?'ready':'fallback');b.textContent=choice.exact?('本題口音：'+a.accent.short):('本題目標：'+a.accent.short+'（裝置 fallback）');if(choice.voice)b.title='練習權重 '+a.accent.prob+'｜實際語音：'+choice.voice.name+' / '+choice.voice.lang;
  u.onstart=()=>{if(token!==playToken)return;btn.textContent='🔊 '+a.accent.short+' 播放中…';};
  u.onend=()=>{if(token!==playToken)return;currentUtterance=null;resetButton(btn);};
  u.onerror=()=>{if(token!==playToken)return;currentUtterance=null;resetButton(btn);};
  try{speechSynthesis.speak(u);}catch(e){resetButton(btn);}
}

document.addEventListener('click',function(ev){const btn=ev.target&&ev.target.closest?ev.target.closest('button.splay'):null;if(!btn)return;ev.preventDefault();ev.stopImmediatePropagation();playSpeaking(btn);},true);
if(typeof window.render==='function'){const base=window.render;window.render=function(){const r=base.apply(this,arguments);[20,180,500].forEach(ms=>setTimeout(applyAssignments,ms));return r;};}
if(typeof window.mockPart==='function'){const base=window.mockPart;window.mockPart=function(){const r=base.apply(this,arguments);[20,180,500].forEach(ms=>setTimeout(applyAssignments,ms));return r;};}
if('speechSynthesis' in window){try{speechSynthesis.getVoices();}catch(e){}try{speechSynthesis.addEventListener('voiceschanged',()=>{refreshVoices();setTimeout(applyAssignments,0);});}catch(e){}}
[0,80,350,900,1800].forEach(ms=>setTimeout(applyAssignments,ms));
window.__toeflSpeakingAccentV57={
  refresh:applyAssignments,
  distribution:{'North American':.65,'U.K.':.20,'Australian':.10,'New Zealand':.05},
  getAssignments:()=>buttons().map((b,i)=>{const a=ensureAssignment(b,i);return {question:keyFor(b,i),accent:a.accent.label,weight:a.accent.prob};})
};
})();
