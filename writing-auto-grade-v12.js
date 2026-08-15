(function(){
'use strict';
/* TOEFL Study Lab Writing auto-grader v12
   Robust DOM observer version: no dependency on render() wrapping.
   Practice estimator based on public TOEFL-style dimensions, not official ETS scoring.
*/
const PROFILES={
  wemail:{type:'email',scoreId:'erub',requirements:[
    ['說明無法參加的原因',[/because\b/i,/due to\b/i,/unable to\b/i,/cannot\b/i,/can't\b/i,/conflict\b/i,/appointment\b/i,/work\b/i,/family\b/i,/health\b/i,/sick\b/i]],
    ['表達仍希望完成 fieldwork',[/still\b.*(?:want|hope|would like)/i,/(?:want|hope|would like)\b.*(?:fieldwork|field work|visit|assignment)/i,/complete\b.*field/i,/finish\b.*field/i]],
    ['詢問能否加入另一組',[/could i\b.*join/i,/may i\b.*join/i,/(?:join|work with)\b.*(?:another|other)\b.*group/i,/(?:another|other)\b.*group/i]],
    ['若不行則提出替代方式',[/otherwise\b/i,/alternative\b/i,/instead\b/i,/make[- ]?up/i,/another (?:way|option|assignment|time)/i,/if (?:that|this|it) (?:is not|isn't) possible/i,/if i (?:cannot|can't)/i]]
  ],keywords:['friday','field','visit','professor','group']},
  wdisc:{type:'discussion',scoreId:'drub',keywords:['government','physical','improvement','preservation','community','urban','regeneration','redevelopment'],stance:[/\bi (?:think|believe|argue|agree|disagree|would say)\b/i,/\bin my (?:view|opinion)\b/i,/\bshould\b/i,/\bprioriti[sz]e\b/i]},
  mwemail:{type:'email',scoreId:'mwer',requirements:[
    ['道歉／說明未出席',[/sorry\b/i,/apologi[sz]e/i,/miss(?:ed)?\b.*meeting/i,/could not\b.*attend/i,/unable to\b.*attend/i]],
    ['說明原因',[/because\b/i,/due to\b/i,/reason\b/i,/conflict\b/i,/unexpected\b/i,/schedule\b/i]],
    ['索取資料／重點',[/notes\b/i,/materials\b/i,/summary\b/i,/minutes\b/i,/(?:send|share|forward)\b.*(?:notes|materials|summary|minutes)/i]],
    ['提出補進度方式',[/catch up/i,/meet\b/i,/available\b/i,/another time/i,/review\b.*together/i]]
  ],keywords:['project','group','meeting','notes','materials','schedule']},
  mwdisc:{type:'discussion',scoreId:'mwdr',keywords:['university','universities','student','students','community','service','require','volunteer','education'],stance:[/\bi (?:think|believe|argue|agree|disagree|would say)\b/i,/\bin my (?:view|opinion)\b/i,/\bshould\b/i,/\brequire\b/i]}
};

function words(t){return (String(t).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[])}
function sentences(t){return String(t).split(/[.!?]+/).map(s=>s.trim()).filter(s=>words(s).length>=2)}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function one(n){return Math.round(n*10)/10}
function html(s){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function hasAny(t,arr){return arr.some(r=>r.test(t))}
function countAny(t,arr){return arr.reduce((n,r)=>n+(r.test(t)?1:0),0)}
function lengthCeiling(wc){if(wc<5)return 0;if(wc<15)return 1;if(wc<30)return 2;if(wc<55)return 3;if(wc<80)return 4;return 5}
function nonsense(text){
  const w=words(text),joined=w.join(' ');
  if(w.length<5)return true;
  if(/^(?:ha|he|hi|ho|lol|test|asdf|qwerty|blah)+$/i.test(joined.replace(/\s+/g,'')))return true;
  const uniq=new Set(w);
  if(w.length>=5&&uniq.size<=2)return true;
  return false;
}
function language(text){
  const w=words(text),s=sentences(text),uniq=new Set(w).size;
  const connectors=[/\bbecause\b/i,/\balthough\b/i,/\bhowever\b/i,/\btherefore\b/i,/\bif\b/i,/\bwhile\b/i,/\bsince\b/i,/\bfor example\b/i,/\bfor instance\b/i,/\bin addition\b/i,/\bwhich\b/i,/\bthat\b/i];
  let variety=1.2;
  if(w.length>=30)variety+=.6;if(w.length>=55)variety+=.5;if(w.length>=80)variety+=.4;
  if(w.length&&uniq/w.length>=.55)variety+=.6;else if(w.length&&uniq/w.length>=.42)variety+=.35;
  variety+=Math.min(1.2,countAny(text,connectors)*.24);if(s.length>=4)variety+=.35;
  let accuracy=4.8,issues=[];
  if(/\bi is\b/i.test(text)){accuracy-=.7;issues.push('檢查 I am／I was 等基本主動詞一致。')}
  if(/\b(?:he|she|it) (?:have|do|go|want|need|think|say)\b/i.test(text)){accuracy-=.5;issues.push('檢查第三人稱單數動詞形式。')}
  if(/\bpeople is\b/i.test(text)){accuracy-=.5;issues.push('檢查單複數與主動詞一致。')}
  if(/(^|[.!?]\s+)i\b/.test(text)){accuracy-=.3;issues.push('英文代名詞 I 應大寫。')}
  if(/[!?.,]{3,}/.test(text)){accuracy-=.25;issues.push('標點符號使用過密。')}
  if(s.length>=2&&s.filter(x=>/^[a-z]/.test(x)).length){accuracy-=.25;issues.push('部分句首需要大寫。')}
  return{variety:clamp(variety,0,5),accuracy:clamp(accuracy,0,5),issues};
}
function gradeEmail(text,p){
  const w=words(text),lang=language(text);
  if(nonsense(text))return{score:0,task:0,variety:one(lang.variety),accuracy:one(lang.accuracy),wc:w.length,feedback:['作答內容不足以完成 Email 的溝通任務。','請依題目逐一回應要求，而不是輸入測試文字或無關內容。']};
  const hits=p.requirements.map(x=>hasAny(text,x[1])),fulfilled=hits.filter(Boolean).length;
  const greeting=/\b(?:dear|hello|hi)\b/i.test(text),closing=/\b(?:best|regards|sincerely|thank you|thanks)\b/i.test(text),polite=/\b(?:could you|could i|would you|would it be possible|please|may i|i would appreciate)\b/i.test(text);
  let task=fulfilled/p.requirements.length*4.1+(greeting?.2:0)+(closing?.2:0)+(polite?.5:0);task=clamp(task,0,5);
  const weighted=task*.5+lang.variety*.2+lang.accuracy*.3;
  let score=Math.min(Math.round(weighted),lengthCeiling(w.length));
  const feedback=[];const missing=p.requirements.filter((x,i)=>!hits[i]).map(x=>x[0]);
  if(missing.length)feedback.push('尚未充分完成：'+missing.join('、')+'。');else feedback.push('主要溝通目的都有涵蓋。');
  if(!polite)feedback.push('可使用 Could I… / Would it be possible… 等自然禮貌語氣。');
  if(w.length<55)feedback.push('篇幅偏短，請把理由與下一步寫得更完整。');
  if(lang.issues[0])feedback.push(lang.issues[0]);
  return{score:clamp(score,0,5),task:one(task),variety:one(lang.variety),accuracy:one(lang.accuracy),wc:w.length,feedback};
}
function gradeDiscussion(text,p){
  const w=words(text),s=sentences(text),lang=language(text);
  if(nonsense(text))return{score:0,task:0,variety:one(lang.variety),accuracy:one(lang.accuracy),wc:w.length,feedback:['作答內容不足以形成有效的 Academic Discussion 回應。','請先明確表態，再提供理由或例子支持你的觀點。']};
  const lower=text.toLowerCase(),keyHits=p.keywords.filter(k=>lower.includes(k)).length,stance=countAny(text,p.stance||[])>0;
  const support=countAny(text,[/\bbecause\b/i,/\bsince\b/i,/\bfor example\b/i,/\bfor instance\b/i,/\bone reason\b/i,/\btherefore\b/i,/\bthis (?:means|shows|helps|allows|can)\b/i]);
  let task=.4+(stance?1.25:0)+Math.min(1.35,keyHits*.2)+Math.min(1.5,support*.5)+(s.length>=4?.4:0);task=clamp(task,0,5);
  const weighted=task*.48+lang.variety*.22+lang.accuracy*.30;
  let score=Math.min(Math.round(weighted),lengthCeiling(w.length));
  if(keyHits===0)score=Math.min(score,1);
  const feedback=[];
  if(!stance)feedback.push('需要更明確表達自己的立場。');
  if(support===0)feedback.push('至少加入一個清楚的理由或具體例子。');
  else if(support===1)feedback.push('已有理由；再補一個具體例子會更完整。');
  if(keyHits<2)feedback.push('與教授問題的核心概念連結偏弱，請更直接切題。');
  if(w.length<55)feedback.push('篇幅偏短，觀點發展仍有限。');
  if(lang.issues[0])feedback.push(lang.issues[0]);
  return{score:clamp(score,0,5),task:one(task),variety:one(lang.variety),accuracy:one(lang.accuracy),wc:w.length,feedback};
}
function grade(id){
  const ta=document.getElementById(id),p=PROFILES[id];if(!ta||!p)return;
  const text=ta.value.trim();if(!text){alert('請先完成作答後再按「評分」。');return}
  const r=p.type==='email'?gradeEmail(text,p):gradeDiscussion(text,p);
  ta.dataset.autoScore=String(r.score);
  const sel=document.getElementById(p.scoreId);if(sel)sel.value=String(r.score);
  const box=document.getElementById(id+'-auto-result');if(!box)return;
  const label=p.type==='email'?'任務完成／溝通效果':'切題與觀點發展';
  box.innerHTML='<div style="font-size:1.18rem;font-weight:900;margin-bottom:6px">模擬分數 '+r.score+'/5</div><div class="small">'+label+' '+r.task+'/5｜語言多樣性 '+r.variety+'/5｜語言正確性 '+r.accuracy+'/5｜字數 '+r.wc+'</div><div style="margin-top:8px">'+r.feedback.slice(0,4).map(x=>'• '+html(x)).join('<br>')+'</div><div class="small" style="margin-top:8px">此為本站練習用模擬評分，不是 ETS 正式分數。</div>';
  box.style.display='block';
}
function invalidate(id){
  const ta=document.getElementById(id),p=PROFILES[id];if(!ta||!p)return;delete ta.dataset.autoScore;
  const sel=document.getElementById(p.scoreId);if(sel)sel.value='';
  const box=document.getElementById(id+'-auto-result');if(box&&box.style.display!=='none'){box.innerHTML='<div class="small">內容已修改，請重新按「評分」。</div>';}
}
function install(id){
  const ta=document.getElementById(id),p=PROFILES[id];if(!ta||!p)return;
  const oldDetails=document.getElementById(p.scoreId)?.closest('details');if(oldDetails)oldDetails.style.display='none';
  if(ta.dataset.autoGraderV12==='1')return;ta.dataset.autoGraderV12='1';
  const wrap=document.createElement('div');wrap.className='auto-grade-actions';wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px';
  const btn=document.createElement('button');btn.type='button';btn.className='auto-grade-btn';btn.textContent='評分';btn.addEventListener('click',()=>grade(id));
  const note=document.createElement('span');note.className='small';note.textContent='按下後立即模擬 TOEFL iBT Writing 0–5 評分。';
  wrap.append(btn,note);
  const result=document.createElement('div');result.id=id+'-auto-result';result.className='score';result.style.display='none';
  ta.insertAdjacentElement('afterend',wrap);wrap.insertAdjacentElement('afterend',result);
  ta.addEventListener('input',()=>invalidate(id));
}
function scan(){Object.keys(PROFILES).forEach(install)}
window.gradeToeflWritingV12=grade;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(scan,0);setTimeout(scan,150);setTimeout(scan,600);
})();