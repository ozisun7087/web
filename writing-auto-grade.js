(function(){
/* TOEFL Study Lab writing auto-grader v10
   Browser-side practice estimator. It does not reproduce ETS proprietary scoring.
*/
const __writingProfiles={
  wemail:{type:'email',scoreId:'erub',label:'Write an Email',keywords:['friday','field','visit','group','professor','william'],requirements:[
    {name:'說明無法參加的原因',patterns:[/because\b/i,/due to\b/i,/reason\b/i,/unable to\b/i,/cannot\b/i,/can\x27t\b/i,/conflict\b/i,/appointment\b/i,/work\b/i,/family\b/i,/sick|ill|health/i]},
    {name:'表達仍希望完成 fieldwork',patterns:[/complete\b.*field/i,/finish\b.*field/i,/still\b.*(?:want|hope|would like)/i,/(?:want|hope|would like)\b.*(?:fieldwork|field work|visit|assignment)/i]},
    {name:'詢問能否加入另一組',patterns:[/(?:join|work with)\b.*(?:another|other)\b.*group/i,/(?:another|other)\b.*group/i,/could i\b.*join/i,/may i\b.*join/i]},
    {name:'若無法加入則提出替代方式',patterns:[/if (?:that|this|it) (?:is not|isn\x27t) possible/i,/if i can(?:not|\x27t)/i,/otherwise\b/i,/alternative\b/i,/instead\b/i,/make[- ]?up/i,/another (?:way|option|assignment|time)/i]}
  ]},
  wdisc:{type:'discussion',scoreId:'drub',label:'Academic Discussion',keywords:['government','governments','physical','improvement','preservation','community','communities','urban','regeneration','redevelopment'],stance:[/\bi (?:think|believe|argue|would say|agree|disagree)\b/i,/\bin my (?:view|opinion)\b/i,/\bshould\b/i,/\bpriority\b/i,/\bprioriti[sz]e\b/i]},
  mwemail:{type:'email',scoreId:'mwer',label:'Write an Email',keywords:['project','group','meeting','notes','materials','catch up','schedule'],requirements:[
    {name:'道歉並說明未能出席',patterns:[/sorry\b/i,/apologi[sz]e/i,/miss(?:ed)?\b.*meeting/i,/could not\b.*attend/i,/unable to\b.*attend/i]},
    {name:'簡要說明原因',patterns:[/because\b/i,/due to\b/i,/reason\b/i,/conflict\b/i,/unexpected\b/i,/schedule\b/i]},
    {name:'索取會議資料或重點',patterns:[/(?:notes|materials|summary|minutes)/i,/(?:send|share|forward)\b.*(?:notes|materials|summary|minutes)/i]},
    {name:'提出補進度或碰面方式',patterns:[/catch up/i,/meet\b/i,/available\b/i,/another time/i,/review\b.*together/i]}
  ]},
  mwdisc:{type:'discussion',scoreId:'mwdr',label:'Academic Discussion',keywords:['universities','university','students','student','community','service','require','required','volunteer','education'],stance:[/\bi (?:think|believe|argue|would say|agree|disagree)\b/i,/\bin my (?:view|opinion)\b/i,/\bshould\b/i,/\brequire\b/i]}
};

const __mockPrompts={
  mwemail:'You missed a meeting with your project group because of an unexpected schedule conflict. Write an email to the group leader, Alex. Apologize and briefly explain what happened, ask for the meeting notes or materials, and propose a way to catch up with the group.',
  mwdisc:'Professor: Should universities require students to participate in community service? Maria: Yes. It helps students connect learning with real social needs. Daniel: No. Required service can become a burden and may reduce genuine motivation. Write your contribution to the academic discussion.'
};

function __escHtml(s){return String(s).replace(/[&<>\x22]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\x22':'&quot;'}[m]||m))}
function __words(text){return (String(text).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[])}
function __sentences(text){return String(text).split(/[.!?]+/).map(x=>x.trim()).filter(x=>__words(x).length>=2)}
function __clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function __round1(n){return Math.round(n*10)/10}
function __countMatches(text,patterns){return patterns.reduce((n,r)=>n+(r.test(text)?1:0),0)}
function __lexicalMetrics(text){
  const words=__words(text),wc=words.length,unique=new Set(words).size;
  const content=words.filter(w=>w.length>=5),contentUnique=new Set(content).size;
  return{wc,unique,tdr:wc?unique/wc:0,contentTdr:content.length?contentUnique/content.length:0};
}
function __mechanics(text){
  const sentences=__sentences(text),issues=[];
  let penalty=0;
  const t=String(text);
  if(/\bi is\b/i.test(t)){penalty+=0.55;issues.push('注意 I am／I was 等基本主動詞一致。')}
  if(/\b(?:he|she|it) (?:have|do|go|want|need|think|say)\b/i.test(t)){penalty+=0.45;issues.push('第三人稱單數動詞形式有可疑處。')}
  if(/\bpeople is\b/i.test(t)||/\bthere is (?:many|several|two|three|four|five)\b/i.test(t)){penalty+=0.4;issues.push('檢查單複數與主動詞一致。')}
  if(/\s{2,}/.test(t)){penalty+=0.12;issues.push('有多餘空格，可再校對格式。')}
  if(/[!?.,]{3,}/.test(t)){penalty+=0.2;issues.push('標點符號使用過密。')}
  if(/(^|[.!?]\s+)i\b/.test(t)){penalty+=0.25;issues.push('英文代名詞 I 應大寫。')}
  if(sentences.length>=2){
    const lowerStarts=sentences.filter(s=>/^[a-z]/.test(s)).length;
    if(lowerStarts){penalty+=Math.min(.45,lowerStarts*.15);issues.push('部分句子開頭應使用大寫。')}
  }
  const fragments=sentences.filter(s=>__words(s).length<5).length;
  if(fragments>=2){penalty+=0.25;issues.push('有數個過短句，注意句子完整性。')}
  const accuracy=__clamp(4.85-penalty,0,5);
  return{accuracy,issues};
}
function __variety(text){
  const m=__lexicalMetrics(text),sent=__sentences(text);
  const connectors=[/\bbecause\b/i,/\balthough\b/i,/\bwhile\b/i,/\bhowever\b/i,/\btherefore\b/i,/\bfor example\b/i,/\bfor instance\b/i,/\bin addition\b/i,/\bmoreover\b/i,/\bif\b/i,/\bwhich\b/i,/\bthat\b/i,/\bwhen\b/i,/\bsince\b/i,/\bon the other hand\b/i];
  const c=__countMatches(text,connectors);
  let score=1.3;
  if(m.wc>=35)score+=.55;if(m.wc>=60)score+=.45;if(m.wc>=90)score+=.35;
  if(m.tdr>=.55)score+=.55;else if(m.tdr>=.45)score+=.35;
  score+=Math.min(1.15,c*.23);
  if(sent.length>=4)score+=.35;
  return __clamp(score,0,5);
}
function __lengthCeiling(wc){if(wc<5)return 0;if(wc<15)return 1;if(wc<30)return 2;if(wc<55)return 3;if(wc<80)return 4;return 5}
function __overallScore(weighted,wc){
  let score=Math.round(weighted);
  score=Math.min(score,__lengthCeiling(wc));
  if(wc>=80&&weighted>=4.55)score=5;
  return __clamp(score,0,5);
}
function __emailGrade(text,p){
  const m=__lexicalMetrics(text),mech=__mechanics(text),variety=__variety(text);
  const hits=p.requirements.map(r=>r.patterns.some(rx=>rx.test(text)));
  const fulfilled=hits.filter(Boolean).length;
  const greeting=/\b(?:dear|hello|hi)\b/i.test(text),closing=/\b(?:best|regards|sincerely|thank you|thanks)\b/i.test(text);
  const polite=/\b(?:could you|could i|would you|would it be possible|please|thank you|i would appreciate|may i)\b/i.test(text);
  let task=(fulfilled/p.requirements.length)*4.1+(greeting?.25:0)+(closing?.25:0)+(polite?.4:0);
  task=__clamp(task,0,5);
  const weighted=task*.48+variety*.22+mech.accuracy*.30;
  const score=__overallScore(weighted,m.wc);
  const feedback=[];
  const missing=p.requirements.filter((r,i)=>!hits[i]).map(r=>r.name);
  if(missing.length)feedback.push('內容任務尚可補強：'+missing.join('、')+'。');else feedback.push('題目要求的主要溝通目的都有涵蓋。');
  if(!polite)feedback.push('可加入更自然的禮貌請求語氣，例如 Could I… / Would it be possible…。');
  if(m.wc<60)feedback.push('篇幅偏短，建議用完整理由與具體下一步讓訊息更清楚。');
  if(variety<3.5)feedback.push('句型與連接方式較單一，可增加 because, if, although 等自然結構。');
  if(mech.issues.length)feedback.push(mech.issues[0]);
  if(score>=4&&feedback.length<2)feedback.push('整體清楚、切題且語氣適當；下一步可追求更精確自然的措辭。');
  return{score,task:__round1(task),variety:__round1(variety),accuracy:__round1(mech.accuracy),wc:m.wc,feedback};
}
function __discussionGrade(text,p){
  const m=__lexicalMetrics(text),mech=__mechanics(text),variety=__variety(text),sent=__sentences(text);
  const keyHits=p.keywords.filter(k=>String(text).toLowerCase().includes(k)).length;
  const stance=__countMatches(text,p.stance||[])>0;
  const support=__countMatches(text,[/\bbecause\b/i,/\bsince\b/i,/\bfor example\b/i,/\bfor instance\b/i,/\bone reason\b/i,/\bthis (?:means|shows|helps|allows|can)\b/i,/\btherefore\b/i]);
  const interaction=/\b(?:maria|daniel|agree|disagree|another student|classmate|previous post)\b/i.test(text);
  let development=0.7;
  if(stance)development+=1.15;
  development+=Math.min(1.15,keyHits*.16);
  development+=Math.min(1.35,support*.45);
  if(sent.length>=4)development+=.35;
  if(interaction)development+=.25;
  development=__clamp(development,0,5);
  const weighted=development*.45+variety*.25+mech.accuracy*.30;
  const score=__overallScore(weighted,m.wc);
  const feedback=[];
  if(!stance)feedback.push('需要更明確地表達自己的立場。');
  if(support<1)feedback.push('請至少加入一個清楚的理由或具體例子來支持立場。');
  else if(support<2)feedback.push('已有支持理由；若再補一個具體例子，論證會更完整。');
  if(keyHits<2)feedback.push('回應與題目核心概念的連結偏弱，請更直接回應教授的問題。');
  if(variety<3.5)feedback.push('可增加自然的句型與詞彙變化，但不要為了複雜而複雜。');
  if(mech.issues.length)feedback.push(mech.issues[0]);
  if(score>=4&&feedback.length<2)feedback.push('立場清楚且有發展；下一步可讓例子更具體、語言更精確。');
  return{score,task:__round1(development),variety:__round1(variety),accuracy:__round1(mech.accuracy),wc:m.wc,feedback};
}
function __grade(id){
  const ta=document.getElementById(id),p=__writingProfiles[id];if(!ta||!p)return null;
  const text=ta.value.trim();
  if(!text){alert('請先完成作答後再按「評分」。');return null}
  const result=p.type==='email'?__emailGrade(text,p):__discussionGrade(text,p);
  ta.dataset.autoScore=String(result.score);
  const sel=document.getElementById(p.scoreId);if(sel)sel.value=String(result.score);
  const box=document.getElementById(id+'-auto-result');
  if(box){
    const firstLabel=p.type==='email'?'任務完成／溝通效果':'切題與觀點發展';
    box.innerHTML='<div style="font-size:1.12rem;font-weight:900;margin-bottom:6px">模擬分數 '+result.score+'/5</div>'+
      '<div class="small">'+firstLabel+' '+result.task+'/5｜語言多樣性 '+result.variety+'/5｜語言正確性／寫作規範 '+result.accuracy+'/5｜字數 '+result.wc+'</div>'+
      '<div style="margin-top:8px">'+result.feedback.slice(0,3).map(x=>'• '+__escHtml(x)).join('<br>')+'</div>'+
      '<div class="small" style="margin-top:8px">本站依 TOEFL iBT 公開評分重點建立模擬規則；此為練習估分，不是 ETS 正式評分。</div>';
    box.style.display='block';
  }
  try{if(typeof safe!=='undefined'&&safe.set)safe.set('auto-'+id,JSON.stringify(result))}catch(e){}
  return result;
}
function __invalidate(id){
  const ta=document.getElementById(id),p=__writingProfiles[id];if(!ta||!p)return;
  delete ta.dataset.autoScore;
  const sel=document.getElementById(p.scoreId);if(sel)sel.value='';
  const box=document.getElementById(id+'-auto-result');
  if(box&&box.style.display!=='none')box.innerHTML='<div class="small">內容已修改，請重新按「評分」。</div>';
}
function __ensureMockPrompt(id){
  const ta=document.getElementById(id);if(!ta||!__mockPrompts[id])return;
  const q=ta.closest('.q');if(!q||q.querySelector('.auto-writing-prompt'))return;
  const p=document.createElement('p');p.className='auto-writing-prompt';p.textContent=__mockPrompts[id];q.insertBefore(p,ta);
}
function __installOne(id){
  const ta=document.getElementById(id),p=__writingProfiles[id];if(!ta||!p||ta.dataset.autoGraderInstalled==='1')return;
  ta.dataset.autoGraderInstalled='1';
  __ensureMockPrompt(id);
  const sel=document.getElementById(p.scoreId);
  if(sel){const details=sel.closest('details');if(details)details.style.display='none';sel.value='';}
  const wrap=document.createElement('div');wrap.className='auto-grade-actions';wrap.style.marginTop='9px';
  const btn=document.createElement('button');btn.type='button';btn.textContent='評分';btn.className='auto-grade-btn';
  btn.onclick=()=>__grade(id);
  const note=document.createElement('span');note.className='small';note.style.marginLeft='8px';note.textContent='按下後自動依 TOEFL iBT 公開評分重點模擬 0–5 分。';
  wrap.appendChild(btn);wrap.appendChild(note);
  const result=document.createElement('div');result.id=id+'-auto-result';result.className='score';result.style.display='none';
  ta.insertAdjacentElement('afterend',wrap);wrap.insertAdjacentElement('afterend',result);
  ta.addEventListener('input',()=>__invalidate(id));
}
function enhanceWritingAutoGrade(){Object.keys(__writingProfiles).forEach(__installOne)}

const __oldScoreWriting=typeof scoreWriting==='function'?scoreWriting:null;
window.scoreWriting=function(){
  const e=document.getElementById('wemail'),d=document.getElementById('wdisc');
  if(e&&!e.dataset.autoScore&&!__grade('wemail'))return;
  if(d&&!d.dataset.autoScore&&!__grade('wdisc'))return;
  if(__oldScoreWriting)return __oldScoreWriting();
};
window.gradeToeflWriting=function(id){return __grade(id)};

if(typeof render==='function'){
  const __writingRender=render;
  window.render=function(){__writingRender();setTimeout(enhanceWritingAutoGrade,0)};
}
if(typeof mockPart==='function'){
  const __writingMockPart=mockPart;
  window.mockPart=function(p){__writingMockPart(p);setTimeout(enhanceWritingAutoGrade,0)};
}
setTimeout(enhanceWritingAutoGrade,0);setTimeout(enhanceWritingAutoGrade,250);
})();