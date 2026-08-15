(function(){
'use strict';
/* TOEFL Study Lab adaptive difficulty v33
   - Keeps current answers ephemeral; only compact performance history persists.
   - Today's tier is based on the most recent completed result BEFORE today.
   - <60% foundation, 60-79% standard, 80-89% advanced, >=90% challenge.
   - No prior history => advanced baseline (preserves the user's current higher-difficulty preference).
   - Applies difficulty changes to Reading C-test, Listening language load,
     Writing Build-a-Sentence chunk granularity, and Speaking prompts.
   - No MutationObserver.
*/
const HIST_KEY='toefl-adaptive-history-v33';
const LABELS=['基礎','標準','進階','挑戰'];
const SKILLS=['Reading','Listening','Writing','Speaking','Weakness'];

function dateKey(d){d=d||new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
function loadHistory(){try{const x=JSON.parse(localStorage.getItem(HIST_KEY)||'{}');return x&&typeof x==='object'?x:{};}catch(e){return {};}}
function saveHistory(h){try{localStorage.setItem(HIST_KEY,JSON.stringify(h));}catch(e){}}
let history=loadHistory();
function previousRecord(skill){
  const arr=Array.isArray(history[skill])?history[skill]:[];
  const today=dateKey();
  return arr.filter(x=>x&&x.date&&x.date<today&&Number.isFinite(Number(x.accuracy))).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;
}
function tierFor(skill){
  const r=previousRecord(skill);if(!r)return 2;
  const a=Number(r.accuracy);
  return a<.60?0:a<.80?1:a<.90?2:3;
}
function record(skill,accuracy,source){
  accuracy=Number(accuracy);if(!SKILLS.includes(skill)||!Number.isFinite(accuracy))return;
  accuracy=Math.max(0,Math.min(1,accuracy));
  const d=dateKey(),arr=Array.isArray(history[skill])?history[skill]:[];
  const item={date:d,accuracy:Math.round(accuracy*1000)/1000,source:source||skill,ts:Date.now()};
  const idx=arr.findIndex(x=>x&&x.date===d);
  if(idx>=0)arr[idx]=item;else arr.push(item);
  history[skill]=arr.slice(-20);saveHistory(history);
}
function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function canon(s){return clean(s).replace(/[’]/g,"'");}
function norm(s){return canon(s).toLowerCase();}
function randInt(max){if(max<=1)return 0;try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;}}catch(e){}return Math.floor(Math.random()*max);}
function shuffle(a){const out=a.slice();for(let i=out.length-1;i>0;i--){const j=randInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;}
function pct(a){return Math.round(Number(a)*100)+'%';}

function addTierNote(host,skill,tier){
  if(!host)return;
  let note=host.querySelector(':scope > .adaptive-tier-v33');
  if(!note){note=document.createElement('div');note.className='accent-note adaptive-tier-v33';const h=host.querySelector('h3,h4');if(h)h.insertAdjacentElement('afterend',note);else host.prepend(note);}
  const r=previousRecord(skill);
  let why='無前次紀錄，沿用進階基準。';
  if(r){
    const a=Number(r.accuracy);
    why='上次 '+skill+' 正確度／評分 '+pct(a)+'（'+r.date+'）→ '+(a<.60?'降低難度':a<.80?'維持標準難度':a<.90?'維持進階難度':'提高到挑戰難度')+'。';
  }
  note.innerHTML='<b>今日難度：'+LABELS[tier]+'</b><br><span class="small">'+why+' 同一天重新整理不會改變本日難度；下一個練習日才依今天成績調整。</span>';
}

/* ---------- Reading: change how many letters are exposed in Complete the Words ---------- */
function applyCtest(root,tier){
  if(!root)return;
  root.querySelectorAll('input[type="text"][data-answer]').forEach(input=>{
    if(!/^rf\d+$/.test(input.id||''))return;
    const prev=input.previousSibling;if(!prev||prev.nodeType!==3)return;
    if(!input.dataset.v33BaseFull){
      const m=String(prev.nodeValue||'').match(/([A-Za-z]+)$/);if(!m)return;
      const stem=m[1],ans=String(input.dataset.answer||'');
      input.dataset.v33BasePrefix=String(prev.nodeValue||'').slice(0,-stem.length);
      input.dataset.v33BaseFull=stem+ans;
      input.dataset.v33BaseStem=String(stem.length);
    }
    const full=input.dataset.v33BaseFull||'',base=Number(input.dataset.v33BaseStem||3),prefix=input.dataset.v33BasePrefix||'';
    if(full.length<3)return;
    let visible=base;
    if(tier===0)visible=Math.min(full.length-1,Math.max(base+1,Math.ceil(full.length*.58)));
    if(tier===1)visible=base;
    if(tier===2)visible=Math.max(2,base-1);
    if(tier===3)visible=Math.max(1,base-2);
    prev.nodeValue=prefix+full.slice(0,visible);
    input.dataset.answer=full.slice(visible);
    input.style.width=Math.max(58,(full.length-visible)*17+26)+'px';
  });
}

/* ---------- Listening: preserve answers while increasing linguistic load ---------- */
const RESP_ADV=[
  'I know you have several other deadlines, but could you send me the revised housing report by this afternoon?',
  "Just to make sure I wrote it down correctly, didn't the professor move the meeting to Friday?",
  "Since we will need time to analyze the data afterward, why don't we conduct the interviews before the semester ends?",
  'Before we begin, do you mind if I record our conversation for my research?',
  'After everyone had a chance to review the proposal, how did residents respond to it?',
  'If the original location is inconvenient, could we meet near the library instead?',
  'I need to arrange transportation in advance, so when is the field visit scheduled?',
  'If I have questions about my application, who should I contact about student housing?'
];
const RESP_CHALLENGE=[
  'I realize the deadline is fairly tight and that you are handling several projects at once, but could you send me the revised housing report by this afternoon?',
  "I may have copied the original announcement rather than the update, so didn't the professor move the meeting to Friday?",
  "Given that transcription and coding will take several days, why don't we conduct the interviews before the semester ends?",
  'Before we discuss any personal experiences, do you mind if I record our conversation for my research, provided that the file remains confidential?',
  'Once the cost estimates and safety changes had been explained, how did residents respond to the proposal overall?',
  'If the café is likely to be crowded and we still need a quiet place to work, could we meet near the library instead?',
  'Because I have another appointment later that day and need to plan the trip carefully, when exactly is the field visit scheduled?',
  'If the general student services office cannot answer questions about eligibility or rent, who should I contact about student housing?'
];
const LONG_EXTRA=[
  'The notice also asks residents to allow extra time when entering the building.',
  'The advisor notes that the revised schedule should still leave time for analysis.',
  'The announcement reminds attendees to check the room number when they arrive.',
  'The speaker briefly contrasts this idea with purely economic measures of place.',
  'The researcher notes that the two kinds of evidence often answer different questions.',
  'The professor adds that ownership status can shape how people experience redevelopment.',
  'The notice distinguishes the meeting date from the later deadline for written comments.',
  'The speaker notes that both benefits and constraints can appear at the same time.',
  'The advisor emphasizes that reminders should inform participants rather than pressure them.',
  'The speaker adds that different groups may value the same project in different ways.'
];
function sentenceCaseLower(s){return String(s||'').replace(/^([A-Z])/,m=>m.toLowerCase());}
function applyListening(root,tier){
  if(!root)return;
  const prim=[...root.querySelectorAll('button.play')].filter(b=>!b.dataset.questionOnly&&!/只重播題問/.test(b.textContent||''));
  let resp=0,long=0;
  prim.forEach(b=>{
    if(!b.dataset.v33BaseText)b.dataset.v33BaseText=b.dataset.text||'';
    const base=b.dataset.v33BaseText||'';
    if(base.includes(' Question. ')){
      const parts=base.split(' Question. '),body=parts[0],q=parts.slice(1).join(' Question. ');
      let text=body;
      if(tier>=2)text+=' '+(LONG_EXTRA[long%LONG_EXTRA.length]||'');
      if(tier===3)text+=' The listener must distinguish the main answer from this additional contextual detail.';
      b.dataset.text=text+' Question. '+q;long++;
    }else{
      const idx=resp++;
      if(tier===0){
        b.dataset.text=base.replace(/^I know you have several other deadlines, but /i,'');
      }else if(tier===1)b.dataset.text=base;
      else if(tier===2)b.dataset.text=RESP_ADV[idx]||base;
      else b.dataset.text=RESP_CHALLENGE[idx]||RESP_ADV[idx]||base;
    }
  });
}

/* ---------- Writing: merge/split the advanced v32 chunks ---------- */
function orderChunksByAnswer(chunks,answer){
  const a=norm(answer),withPos=chunks.map((c,i)=>{
    const key=norm(c).replace(/[.,!?;:]+$/,'');
    let p=a.indexOf(key);if(p<0)p=100000+i;return{c,p,i};
  });
  return withPos.sort((x,y)=>x.p-y.p||x.i-y.i).map(x=>x.c);
}
function mergeToCount(chunks,target){
  let a=chunks.slice();
  while(a.length>target){
    let best=0,bestLen=1e9;
    for(let i=0;i<a.length-1;i++){const len=(a[i]+' '+a[i+1]).length;if(len<bestLen){bestLen=len;best=i;}}
    a.splice(best,2,clean(a[best]+' '+a[best+1]));
  }
  return a;
}
function splitForChallenge(chunks){
  const out=[];
  chunks.forEach(c=>{
    const words=clean(c).split(' ');
    if(words.length>=5&&out.length<8){const cut=Math.ceil(words.length/2);out.push(words.slice(0,cut).join(' '),words.slice(cut).join(' '));}
    else out.push(c);
  });
  return out;
}
function scrambleNotCorrect(chunks,answer){
  for(let i=0;i<12;i++){const x=shuffle(chunks);if(norm(x.join(' '))!==norm(answer))return x;}
  return chunks.slice(1).concat(chunks[0]);
}
function promptNode(q){return [...q.children].find(el=>!(el.classList&&el.classList.contains('bs-bank'))&&String(el.textContent||'').includes('/'))||q.firstElementChild;}
function makeChip(text,i){const b=document.createElement('button');b.type='button';b.className='ghost bs-chip';b.dataset.chunk=text;b.dataset.index=String(i);b.style.cssText='min-height:38px;padding:6px 10px';b.textContent=text;return b;}
function applyBuild(root,tier){
  if(!root)return;
  root.querySelectorAll('input[type="text"][id]').forEach(input=>{
    if(!/^(ws|ww|mws)\d+$/.test(input.id||''))return;
    const q=input.closest('.q'),bank=q&&q.querySelector('.bs-bank');if(!q||!bank)return;
    if(!input.dataset.v33BaseChunks){
      const raw=[...bank.querySelectorAll('.bs-chip')].map(b=>clean(b.dataset.chunk||b.textContent||'')).filter(Boolean);
      const correct=orderChunksByAnswer(raw,input.dataset.answer||'');
      try{input.dataset.v33BaseChunks=JSON.stringify(correct);}catch(e){return;}
    }
    let base=[];try{base=JSON.parse(input.dataset.v33BaseChunks||'[]');}catch(e){return;}
    let chunks=tier===0?mergeToCount(base,4):tier===1?mergeToCount(base,5):tier===2?base.slice():splitForChallenge(base);
    const order=scrambleNotCorrect(chunks,input.dataset.answer||'');
    bank.replaceChildren(...order.map(makeChip));
    bank.__v31SelectedChunks=[];bank.dataset.v28shuffled='1';
    input.value='';
    const p=promptNode(q);if(p){p.textContent=order.join(' / ');p.dataset.originalPrompt=order.join(' / ');}
    let n=q.querySelector('.adaptive-build-note-v33');
    if(!n){n=document.createElement('div');n.className='small adaptive-build-note-v33';bank.insertAdjacentElement('beforebegin',n);}
    n.textContent='自適應組句難度：'+LABELS[tier]+'｜'+chunks.length+' 個片語；'+(tier===0?'片語較完整':tier===1?'中等切分':tier===2?'複雜句法＋細分片語':'複雜句法＋更細片語切分')+'。';
  });
}

/* ---------- Speaking ---------- */
const REP_FOUND=[
  'The seminar begins at nine.','Please submit the proposal by Friday.','Residents discussed the redevelopment plan.','The study examines housing policy.','Redevelopment can disrupt social networks.','Affordable housing can help residents remain nearby.','Researchers combine data with interviews.'
];
const REP_ADV_SUFFIX=[
  'which was moved from its original afternoon time','so the instructor can review it before the next meeting','where several residents raised concerns about affordability','especially how those policies affect everyday routines','even when physical conditions improve','while a neighborhood is undergoing rapid change','because the two sources reveal different kinds of evidence'
];
const REP_CHALLENGE_SUFFIX=[
  'and students who arrive late may miss the opening instructions','although supporting documents may be submitted separately the following week','and some participants asked whether the final design could still be revised','rather than relying only on changes in property values or construction activity','which means planners may need to evaluate social as well as physical outcomes','provided that affordability protections remain in effect over time','which can make the interpretation more reliable when the findings initially appear inconsistent'
];
const INT_FOUND=['What kind of neighborhood do you prefer, and why?','Should cities preserve old buildings? Why or why not?','Name one change that could improve your community.','What can planners learn from residents?'];
const INT_ADV=[
  'What kind of neighborhood would you prefer to live in, and which two features would matter most to you? Explain why.',
  'Do you think cities should preserve old buildings even when redevelopment is more profitable? State your position and give one concrete example.',
  'Describe one change that could improve daily life in your community, and explain who would benefit most from it.',
  'What can planners learn by talking directly with residents that they might miss if they rely only on statistics? Give an example.'
];
const INT_CHALLENGE=[
  'Imagine you must choose between a quieter neighborhood with fewer services and a busier neighborhood with excellent transit. Which would you choose, and how would you justify the trade-off?',
  'When preservation limits the amount of new housing that can be built, how should a city balance cultural heritage against affordability? Defend one priority while acknowledging the other.',
  'Identify a change that could improve daily life in your community, explain one possible unintended consequence, and describe how you would reduce that risk.',
  'Compare what planners can learn from resident interviews with what they can learn from administrative statistics. Which source would you trust more for one specific decision, and why?'
];
function stripPeriod(s){return String(s||'').replace(/[.!?]+$/,'');}
function applySpeaking(root,tier){
  if(!root)return;
  const qs=[...root.querySelectorAll('.q')].filter(q=>q.querySelector('button.record[data-id]'));
  qs.forEach(q=>{
    const rec=q.querySelector('button.record[data-id]'),play=q.querySelector('button.splay');if(!rec||!play)return;
    const id=rec.dataset.id||'',m=id.match(/(\d+)$/),idx=m?Number(m[1]):0;
    const repeat=!!rec.dataset.prompt;
    if(repeat){
      if(!rec.dataset.v33BasePrompt)rec.dataset.v33BasePrompt=rec.dataset.prompt||play.dataset.text||'';
      const base=rec.dataset.v33BasePrompt||'';
      let text=tier===0?(REP_FOUND[idx%REP_FOUND.length]||base):base;
      if(tier>=2)text=stripPeriod(base)+', '+REP_ADV_SUFFIX[idx%REP_ADV_SUFFIX.length]+'.';
      if(tier===3)text=stripPeriod(text)+', '+REP_CHALLENGE_SUFFIX[idx%REP_CHALLENGE_SUFFIX.length]+'.';
      rec.dataset.prompt=text;play.dataset.text=text;
    }else{
      if(!play.dataset.v33BasePrompt)play.dataset.v33BasePrompt=play.dataset.text||'';
      const base=play.dataset.v33BasePrompt||'';
      const text=tier===0?(INT_FOUND[idx%4]||base):tier===1?base:tier===2?(INT_ADV[idx%4]||base):(INT_CHALLENGE[idx%4]||base);
      play.dataset.text=text;
    }
  });
}

/* ---------- Measurement ---------- */
function objectiveAccuracy(root,patterns){
  let points=0,total=0,answered=0;
  root.querySelectorAll('input[type="text"][data-answer]').forEach(i=>{
    if(patterns&&patterns.fill&&!patterns.fill.test(i.id||''))return;
    total++;if(clean(i.value))answered++;
    if((/^rf\d+$/.test(i.id||'')?norm(i.value)===norm(i.dataset.answer):canon(i.value)===canon(i.dataset.answer)))points++;
  });
  const checks=[...root.querySelectorAll('.ckmcq[data-name][data-a]')].filter(b=>!patterns||!patterns.mcq||patterns.mcq.test(b.dataset.name||''));
  checks.forEach(b=>{total++;const c=root.querySelector('input[name="'+CSS.escape(b.dataset.name)+'"]:checked');if(c){answered++;if(Number(c.value)===Number(b.dataset.a))points++;}});
  return{accuracy:total?points/total:null,completion:total?answered/total:0};
}
function buildAccuracy(root,re){
  const inputs=[...root.querySelectorAll('input[type="text"][data-answer]')].filter(i=>re.test(i.id||''));
  if(!inputs.length)return{points:0,total:0,answered:0};let p=0,a=0;
  inputs.forEach(i=>{if(clean(i.value))a++;if(canon(i.value)===canon(i.dataset.answer))p++;});return{points:p,total:inputs.length,answered:a};
}
function writingAccuracy(root,prefix){
  const re=prefix==='m'?/^mws\d+$/:/^ws\d+$/;const b=buildAccuracy(root,re);
  const ids=prefix==='m'?['mwemail','mwdisc']:['wemail','wdisc'];let pts=b.points,total=b.total,answered=b.answered;
  ids.forEach(id=>{const ta=root.querySelector('#'+id)||document.getElementById(id);if(!ta)return;total+=5;const s=Number(ta.dataset.autoScore);if(Number.isFinite(s)){pts+=s;answered+=5;}});
  return{accuracy:total?pts/total:null,completion:total?answered/total:0};
}
function speakingAccuracy(root,prefix){
  const sels=[...root.querySelectorAll('select[id$="score"]')].filter(s=>prefix==='m'?/^ms/.test(s.id):/^(rep|int)/.test(s.id));
  if(!sels.length)return{accuracy:null,completion:0};let p=0,a=0;sels.forEach(s=>{if(s.value!==''){a++;p+=Number(s.value)/5;}});return{accuracy:p/sels.length,completion:a/sels.length};
}
function weaknessAccuracy(root){
  const obj=objectiveAccuracy(root,{fill:/^(wf|ww)\d+$/,mcq:/^wl\d+$/});
  const sels=[...root.querySelectorAll('select[id^="wr"][id$="score"]')];let p=(obj.accuracy||0)*8,total=8,done=obj.completion*8;
  sels.forEach(s=>{total++;if(s.value!==''){done++;p+=Number(s.value)/5;}});
  return{accuracy:total?p/total:null,completion:total?done/total:0};
}
function measureCurrent(){
  const active=document.querySelector('#tabs .tab.active')?.dataset?.t||'';
  const content=document.getElementById('content');if(!content)return;
  let r=null,skill=active,source=active;
  if(active==='Reading')r=objectiveAccuracy(content,{fill:/^rf\d+$/,mcq:/^(rd|ra)/});
  else if(active==='Listening')r=objectiveAccuracy(content,{mcq:/^(lr|ll)/});
  else if(active==='Writing')r=writingAccuracy(content,'');
  else if(active==='Speaking')r=speakingAccuracy(content,'');
  else if(active==='Weakness')r=weaknessAccuracy(content);
  else if(active==='Mock'){
    const m=document.getElementById('mock');if(!m)return;const h=clean(m.querySelector('h4')?.textContent||'');
    if(/Reading/i.test(h)){skill='Reading';source='Mock Reading';r=objectiveAccuracy(m,{fill:/^rf\d+$/,mcq:/^(mrd|mra|mrm)/});}
    else if(/Listening/i.test(h)){skill='Listening';source='Mock Listening';r=objectiveAccuracy(m,{mcq:/^(mlr|mll)/});}
    else if(/Writing/i.test(h)){skill='Writing';source='Mock Writing';r=writingAccuracy(m,'m');}
    else if(/Speaking/i.test(h)){skill='Speaking';source='Mock Speaking';r=speakingAccuracy(m,'m');}
  }
  if(r&&r.accuracy!=null&&r.completion>=.80)record(skill,r.accuracy,source);
}

/* ---------- Apply current day's frozen tier ---------- */
function applyCurrent(){
  const active=document.querySelector('#tabs .tab.active')?.dataset?.t||'';
  const content=document.getElementById('content');if(!content)return;
  if(active==='Reading'){const t=tierFor('Reading');addTierNote(content,'Reading',t);applyCtest(content,t);}
  else if(active==='Listening'){const t=tierFor('Listening');addTierNote(content,'Listening',t);applyListening(content,t);}
  else if(active==='Writing'){const t=tierFor('Writing');addTierNote(content,'Writing',t);applyBuild(content,t);}
  else if(active==='Speaking'){const t=tierFor('Speaking');addTierNote(content,'Speaking',t);applySpeaking(content,t);}
  else if(active==='Weakness'){const t=tierFor('Weakness');addTierNote(content,'Weakness',t);applyBuild(content,t);applySpeaking(content,t);}
  else if(active==='Mock'){
    const m=document.getElementById('mock');if(!m)return;const h=clean(m.querySelector('h4')?.textContent||'');
    if(/Reading/i.test(h)){const t=tierFor('Reading');addTierNote(m,'Reading',t);applyCtest(m,t);}
    else if(/Listening/i.test(h)){const t=tierFor('Listening');addTierNote(m,'Listening',t);applyListening(m,t);}
    else if(/Writing/i.test(h)){const t=tierFor('Writing');addTierNote(m,'Writing',t);applyBuild(m,t);}
    else if(/Speaking/i.test(h)){const t=tierFor('Speaking');addTierNote(m,'Speaking',t);applySpeaking(m,t);}
  }
}
function scanSoon(){setTimeout(applyCurrent,0);setTimeout(applyCurrent,90);setTimeout(applyCurrent,260);}

/* Save a sufficiently complete set before navigation replaces it. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const isTab=b.classList&&b.classList.contains('tab');
  const isMock=/mockPart\(['\"]m[rlws]['\"]\)/.test(String(b.getAttribute('onclick')||''));
  const isScore=/計算\s*(?:Mock\s*)?(?:Reading|Listening|Writing|Speaking)/i.test(clean(b.textContent||''));
  if(isTab||isMock||isScore){measureCurrent();if(isTab||isMock)scanSoon();else setTimeout(measureCurrent,80);}
},true);
window.addEventListener('pagehide',measureCurrent);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')measureCurrent();});

/* Native renders call wire(); this is the stable primary hook. */
if(typeof window.wire==='function'){
  const previous=window.wire;window.wire=function(){const r=previous.apply(this,arguments);scanSoon();return r;};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scanSoon,{once:true});else scanSoon();

if(!document.getElementById('adaptive-difficulty-v33-style')){
  const st=document.createElement('style');st.id='adaptive-difficulty-v33-style';
  st.textContent='.adaptive-tier-v33{border-width:2px}.adaptive-build-note-v33{font-weight:800;color:#46536a;margin:5px 0 7px}';document.head.appendChild(st);
}
window.__toeflAdaptiveDifficultyV33={tierFor,previousRecord,history:()=>loadHistory(),record};
})();