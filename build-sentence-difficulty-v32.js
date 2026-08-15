(function(){
'use strict';
/* TOEFL Study Lab Build-a-Sentence difficulty upgrade v32
   - Replaces the former short/easy SVO items with 6–7 chunk advanced items.
   - Focuses on subordination, relative clauses, embedded clauses, passive voice,
     conditionals, correlative structures, and inversion.
   - Applies to Writing, Weakness, and Mock Writing.
   - Keeps v31 click formatting (first letter capitalized + current final period).
*/
const PRACTICE=[
  {
    chunks:['although the city approved','the redevelopment plan,','several residents','remained concerned about whether','affordable housing','would be preserved'],
    answer:'Although the city approved the redevelopment plan, several residents remained concerned about whether affordable housing would be preserved.'
  },
  {
    chunks:['the report suggests that','neighborhoods with reliable public transit','are more likely to attract','new businesses','without increasing','dependence on private cars'],
    answer:'The report suggests that neighborhoods with reliable public transit are more likely to attract new businesses without increasing dependence on private cars.'
  },
  {
    chunks:['because many tenants','had not received','clear notice of the changes,','the committee decided to postpone','the public hearing','until additional information','could be distributed'],
    answer:'Because many tenants had not received clear notice of the changes, the committee decided to postpone the public hearing until additional information could be distributed.'
  },
  {
    chunks:['residents who had lived','in the neighborhood for decades','argued that redevelopment','should protect','both affordable housing','and existing social networks'],
    answer:'Residents who had lived in the neighborhood for decades argued that redevelopment should protect both affordable housing and existing social networks.'
  },
  {
    chunks:['if planners rely only on','changes in property values,','they may overlook','less visible effects','that influence residents\'','sense of security','and belonging'],
    answer:"If planners rely only on changes in property values, they may overlook less visible effects that influence residents' sense of security and belonging."
  },
  {
    chunks:['the professor explained that','qualitative interviews','can reveal concerns','that are difficult','to capture through','administrative data alone'],
    answer:'The professor explained that qualitative interviews can reveal concerns that are difficult to capture through administrative data alone.'
  },
  {
    chunks:['although preservation rules','can limit','new construction,','they may also prevent','historically significant buildings','from being demolished'],
    answer:'Although preservation rules can limit new construction, they may also prevent historically significant buildings from being demolished.'
  },
  {
    chunks:['the study found that','residents were more willing','to support the project','when they believed','their comments had influenced','the final design'],
    answer:'The study found that residents were more willing to support the project when they believed their comments had influenced the final design.'
  },
  {
    chunks:['not only did','the new policy','increase access to','public facilities,','but it also','reduced travel time','for lower-income residents'],
    answer:'Not only did the new policy increase access to public facilities, but it also reduced travel time for lower-income residents.'
  },
  {
    chunks:['what the researchers found','most surprising','was that residents','valued social continuity','as much as','physical improvement'],
    answer:'What the researchers found most surprising was that residents valued social continuity as much as physical improvement.'
  }
];

const MOCK=[
  {
    chunks:['even though the proposal','was expected to increase','the housing supply,','critics questioned whether','the new units','would remain affordable','to current residents'],
    answer:'Even though the proposal was expected to increase the housing supply, critics questioned whether the new units would remain affordable to current residents.'
  },
  {
    chunks:['the survey results indicate that','people are more likely to participate','in planning meetings','when they are given','clear information about','how their comments','will be used'],
    answer:'The survey results indicate that people are more likely to participate in planning meetings when they are given clear information about how their comments will be used.'
  },
  {
    chunks:['by comparing interview data','with administrative records,','the researchers were able','to identify patterns','that neither source','would have revealed','on its own'],
    answer:'By comparing interview data with administrative records, the researchers were able to identify patterns that neither source would have revealed on its own.'
  },
  {
    chunks:['had the city consulted','tenants earlier,','it might have recognized','the risk of displacement','before the redevelopment plan','was finalized'],
    answer:'Had the city consulted tenants earlier, it might have recognized the risk of displacement before the redevelopment plan was finalized.'
  },
  {
    chunks:['the committee recommended that','the developer provide','temporary relocation assistance','so that residents','would not be forced','to leave the area','permanently'],
    answer:'The committee recommended that the developer provide temporary relocation assistance so that residents would not be forced to leave the area permanently.'
  },
  {
    chunks:['what makes the policy','particularly controversial','is the possibility that','short-term economic gains','could come at the expense of','long-term community stability'],
    answer:'What makes the policy particularly controversial is the possibility that short-term economic gains could come at the expense of long-term community stability.'
  },
  {
    chunks:['the more transparent','the decision-making process is,','the more likely residents are','to regard the outcome','as legitimate','even when they disagree','with the final decision'],
    answer:'The more transparent the decision-making process is, the more likely residents are to regard the outcome as legitimate even when they disagree with the final decision.'
  },
  {
    chunks:['no sooner had','construction begun','than local businesses','started reporting','a decline in','pedestrian traffic'],
    answer:'No sooner had construction begun than local businesses started reporting a decline in pedestrian traffic.'
  },
  {
    chunks:['the report cautions that','unless affordability protections','are maintained over time,','initial gains in housing access','may gradually disappear','as market pressures increase'],
    answer:'The report cautions that unless affordability protections are maintained over time, initial gains in housing access may gradually disappear as market pressures increase.'
  },
  {
    chunks:['whether redevelopment succeeds','depends not only on','the quality of new infrastructure','but also on whether','existing residents','can continue to live','in the neighborhood'],
    answer:'Whether redevelopment succeeds depends not only on the quality of new infrastructure but also on whether existing residents can continue to live in the neighborhood.'
  }
];

const WEAKNESS=[PRACTICE[8],MOCK[3]];
const TARGET=/^(ws|mws|ww)(\d+)$/;

function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function randInt(max){
  if(max<=1)return 0;
  try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;}}catch(e){}
  return Math.floor(Math.random()*max);
}
function shuffle(a){
  const out=a.slice();
  for(let i=out.length-1;i>0;i--){const j=randInt(i+1);[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function normalizeForOrder(s){return clean(s).toLowerCase().replace(/[.,!?;:'“”‘’"()]/g,'');}
function isCorrectOrder(order,answer){return normalizeForOrder(order.join(' '))===normalizeForOrder(answer);}
function scramble(chunks,answer){
  if(chunks.length<2)return chunks.slice();
  for(let n=0;n<14;n++){
    const out=shuffle(chunks);
    if(!isCorrectOrder(out,answer))return out;
  }
  return chunks.slice(1).concat(chunks[0]);
}
function itemFor(id){
  const m=String(id||'').match(TARGET);if(!m)return null;
  const i=Number(m[2]);
  if(m[1]==='ws')return PRACTICE[i]||null;
  if(m[1]==='mws')return MOCK[i]||null;
  if(m[1]==='ww')return WEAKNESS[i]||null;
  return null;
}
function promptNode(q){
  return [...q.children].find(el=>{
    if(el.classList&&el.classList.contains('bs-bank'))return false;
    return String(el.textContent||'').includes('/');
  })||q.firstElementChild;
}
function makeChip(text,i){
  const b=document.createElement('button');
  b.type='button';b.className='ghost bs-chip';b.dataset.chunk=text;b.dataset.index=String(i);
  b.style.cssText='min-height:38px;padding:6px 10px';b.textContent=text;return b;
}
function ensureBank(q,input,order){
  let bank=q.querySelector('.bs-bank');
  if(!bank){
    bank=document.createElement('div');bank.className='bs-bank';
    bank.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 9px';
    input.insertAdjacentElement('beforebegin',bank);
  }
  bank.replaceChildren(...order.map((c,i)=>makeChip(c,i)));
  bank.dataset.v28shuffled='1';
  bank.__v31SelectedChunks=[];
  input.dataset.v17chunks='1';
  let reset=[...q.querySelectorAll('button')].find(b=>clean(b.textContent)==='清空重排');
  if(!reset){
    reset=document.createElement('button');reset.type='button';reset.className='ghost';reset.textContent='清空重排';reset.style.marginBottom='8px';bank.insertAdjacentElement('afterend',reset);
    reset.addEventListener('click',()=>{
      input.value='';bank.__v31SelectedChunks=[];
      bank.querySelectorAll('.bs-chip').forEach(b=>{b.disabled=false;b.style.opacity='1';});
    });
  }
}
function levelText(prefix,index){
  if(prefix==='mws')return index>=6?'C1 挑戰':'B2+ → C1';
  return index>=8?'C1 挑戰':index>=4?'B2+ → C1':'B2+ 進階';
}
function upgradeOne(input){
  if(!input||input.dataset.v32Difficulty==='1')return;
  const m=input.id.match(TARGET),item=itemFor(input.id);if(!m||!item)return;
  const q=input.closest('.q');if(!q)return;
  const order=scramble(item.chunks,item.answer);
  const prompt=promptNode(q);
  if(prompt){prompt.textContent=order.join(' / ');prompt.dataset.originalPrompt=order.join(' / ');}
  input.dataset.answer=item.answer;
  input.value='';
  try{localStorage.removeItem('v-'+input.id);}catch(e){}
  ensureBank(q,input,order);

  let note=q.querySelector('.bs-v32-note');
  if(!note){
    note=[...q.children].find(el=>el.classList&&el.classList.contains('small')&&/Build a Sentence/.test(String(el.textContent||'')));
  }
  if(!note){note=document.createElement('div');note.className='small bs-v32-note';const bank=q.querySelector('.bs-bank');bank.insertAdjacentElement('beforebegin',note);}
  note.classList.add('bs-v32-note');
  note.textContent='進階 Build a Sentence｜'+levelText(m[1],Number(m[2]))+'：判斷從屬、關係、嵌入子句、被動、條件或倒裝等句法關係。';

  const answer=q.querySelector('.answer');if(answer){answer.textContent='答案：'+item.answer;answer.classList.remove('show');}
  q.querySelectorAll('.feedback').forEach(f=>{f.classList.remove('show','ok','no');f.textContent='';});
  q.querySelectorAll('.sentence-error-map,.sentence-error-map-v14,.sentence-error-map-v15').forEach(x=>x.remove());
  input.dataset.v32Difficulty='1';
}
function install(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('input[type="text"][id]').forEach(upgradeOne);
}
function scanSoon(){setTimeout(()=>install(document),0);setTimeout(()=>install(document),70);setTimeout(()=>install(document),200);}

/* Normal renders call wire(); use it as the primary stable hook. */
if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);install(document);return r;};
}
/* Some wrappers captured an earlier wire(), so also rescan after tab/mock navigation. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mock=/mockPart\(['\"]mw['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock)scanSoon();
},false);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scanSoon,{once:true});else scanSoon();

if(!document.getElementById('build-sentence-difficulty-v32-style')){
  const st=document.createElement('style');st.id='build-sentence-difficulty-v32-style';
  st.textContent='.bs-v32-note{font-weight:750;color:#46536a;margin:5px 0 4px}.bs-bank .bs-chip{white-space:normal;text-align:left}';
  document.head.appendChild(st);
}
window.__toeflBuildSentenceDifficultyV32=true;
})();