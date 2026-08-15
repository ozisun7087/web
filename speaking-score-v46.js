(function(){
'use strict';
/* TOEFL Study Lab Speaking strict 0-10 practice scale v46
   - ALL Speaking tasks use 0-10 internal practice scores.
   - Listen and Repeat: transcript fidelity + recorded delivery.
   - Take an Interview: recorded delivery + content/development + language control.
   - Intentionally stricter: 8-10 require consistently strong evidence; short/vague answers are capped.
   - This is an internal practice scale, not an ETS official task score scale.
*/
const STOP=new Set(('a an the and or but if then than to of in on at for from with by as is are was were be been being do does did have has had can could will would should may might must it this that these those i me my we our you your they them their he she his her there here what which who whom where when why how').split(' '));
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function words(s){return clean(s).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[];}
function byId(id){return document.getElementById(id);}
function pct(x){return Math.round((Number(x)||0)*100);}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function isInterview(btn){return !!(btn&&!clean(btn.dataset.prompt));}
function btnFor(id){return [...document.querySelectorAll('button.record[data-id]')].find(b=>b.dataset.id===id)||null;}
function questionFor(id){const b=btnFor(id),q=b&&b.closest('.q'),p=q&&q.querySelector('button.splay[data-text]');return clean(p&&p.dataset.text);}
function qType(q){q=clean(q).toLowerCase();if(/\b(why|should|do you think|what do you think|agree|disagree|prefer|better|important|advantage|disadvantage|benefit|drawback|effect|impact|recommend|opinion|would you rather)\b/.test(q))return'opinion';if(/\b(describe|tell me about|experience|example|explain)\b/.test(q))return'experience';return'factual';}
function contentWords(a){return a.filter(x=>!STOP.has(x)&&x.length>2);}
function ensureScale(sel,blank){
  if(!sel)return;
  const old=sel.value;
  const title=blank||(/rub$/i.test(sel.id)?'尚未評分':'未評分');
  sel.replaceChildren();
  const o=document.createElement('option');o.value='';o.textContent=title;sel.appendChild(o);
  for(let i=0;i<=10;i++){const x=document.createElement('option');x.value=String(i);x.textContent=String(i);sel.appendChild(x);}
  if(old!==''&&Number(old)>=0&&Number(old)<=10)sel.value=String(old);else sel.value='';
  sel.dataset.scaleV46='10';
}
function prepCard(q){
  if(!q)return;const btn=q.querySelector('button.record[data-id]');if(!btn)return;const id=clean(btn.dataset.id);if(!id)return;
  ensureScale(byId(id+'score'),'未評分');
  if(isInterview(btn)){
    ensureScale(byId(id+'rub'),'尚未評分');
    const d=q.querySelector('details');if(d){const s=d.querySelector('summary');if(s)s.textContent='Interview 0–10 嚴格練習 rubric';const p=d.querySelector('p.small');if(p)p.textContent='10：內容充分、組織清楚、語言控制與口語表現皆非常穩定。8–9：清楚且有充分支持，但仍有少量限制。6–7：整體可理解且有一定展開。4–5：部分完成，支持或流暢度不足。2–3：內容很有限或停頓明顯。1：僅零碎有效內容。0：無有效回應。';}
  }
}
function prepRoot(root){if(!root)return;root.querySelectorAll('.q').forEach(prepCard);const s=byId('sscore');if(s&&/Speaking raw/i.test(s.textContent))s.textContent='Speaking raw 0–110：尚未計分';}
function prepAll(){prepRoot(byId('content'));prepRoot(byId('mock'));}

function editDistance(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
function lcsLen(a,b){const dp=Array(b.length+1).fill(0);for(let i=1;i<=a.length;i++){let prev=0;for(let j=1;j<=b.length;j++){const tmp=dp[j];dp[j]=a[i-1]===b[j-1]?prev+1:Math.max(dp[j],dp[j-1]);prev=tmp;}}return dp[b.length];}
function repeatFidelity(prompt,spoken){
  const p=words(prompt),s=words(spoken);if(!p.length||!s.length)return{metric:0,similarity:0,coverage:0,score:0};
  const dist=editDistance(p,s),sim=Math.max(0,1-dist/Math.max(p.length,s.length,1)),l=lcsLen(p,s),cov=l/Math.max(1,p.length),prec=l/Math.max(1,s.length),m=sim*.60+cov*.28+prec*.12;
  let sc=m>=.985?10:m>=.95?9:m>=.90?8:m>=.84?7:m>=.77?6:m>=.68?5:m>=.58?4:m>=.45?3:m>=.30?2:m>.08?1:0;
  if(cov<.55)sc=Math.min(sc,4);if(cov<.35)sc=Math.min(sc,2);
  return{metric:m,similarity:Math.round(m*100),coverage:Math.round(cov*100),score:sc};
}
function repeatDelivery(a){
  if(!a||!Number.isFinite(a.durationSec)||a.activeSec<.45)return 0;
  const vr=a.voicedRatio||0,p=a.longestPauseSec||0,w=a.wpm||0,c=a.asrConfidence;
  let s=2;
  if(vr>=.28&&p<=2.2&&w>=45&&w<=240)s=4;
  if(vr>=.36&&p<=1.7&&w>=60&&w<=220)s=5;
  if(vr>=.43&&p<=1.35&&w>=70&&w<=210)s=6;
  if(vr>=.49&&p<=1.05&&w>=80&&w<=200)s=7;
  if(vr>=.55&&p<=.85&&w>=90&&w<=190)s=8;
  if(vr>=.60&&p<=.65&&w>=95&&w<=180)s=9;
  if(vr>=.66&&p<=.50&&w>=105&&w<=170)s=10;
  if(vr<.22||p>3.0||w>260||(w>0&&w<35))s=Math.min(s,2);
  else if(vr<.30||p>2.2||w>235||(w>0&&w<50))s=Math.min(s,4);
  if(Number.isFinite(c)){if(c<.38)s=Math.min(s,3);else if(c<.52)s=Math.min(s,5);}
  if((a.clippingRatio||0)>.20)s=Math.min(s,6);if((a.meanRms||0)<.0035)s=Math.min(s,4);
  return s;
}
function gradeRepeat(d){
  const f=repeatFidelity(d.prompt,d.transcript),del=repeatDelivery(d.audio||{});let score=Math.floor(f.score*.78+del*.22+.05);
  if(f.score<=2)score=Math.min(score,2);if(f.score<=4)score=Math.min(score,4);if(del<=3)score=Math.min(score,5);
  if(score>=8&&(f.score<8||del<6))score=7;if(score>=9&&(f.score<9||del<7))score=8;if(score===10&&(f.score<10||del<9))score=9;
  return{score:clamp(score,0,10),fidelity:f.score,delivery:del,similarity:f.similarity,coverage:f.coverage};
}

function textFeatures(text){
  const w=words(text),n=w.length,cw=contentWords(w),unique=n?new Set(w).size/n:0,cu=new Set(cw).size,low=' '+clean(text).toLowerCase()+' ';
  const support=(low.match(/\b(because|since|therefore|so|as a result|one reason|for example|for instance|such as|another reason|also|moreover|however|although|while|whereas|but|first|second)\b/g)||[]).length;
  const examples=(low.match(/\b(for example|for instance|such as|one example)\b/g)||[]).length;
  const clauses=(low.match(/\b(because|since|although|while|whereas|if|when|which|that|who|so|but|and)\b/g)||[]).length;
  const vague=/\b(because|since)\s+(it|this|that)\s+(can\s+)?(help|be good|be better|be useful)\s*[.!?]*$/i.test(clean(text))||/\b(it|this|that)\s+(can\s+)?(help|be good|be better|be useful)\s*[.!?]*$/i.test(clean(text));
  const repeated=n>=8?1-new Set(w).size/n:0;
  const lowControl=/\bshould preserve old building\b/i.test(clean(text))||/\bbecause It\b/.test(text)||/\bi is agree\b/i.test(text)||/\bpeople is\b/i.test(text);
  return{n,unique,contentUnique:cu,support,examples,clauses,vague,repeated,lowControl};
}
function content10(f,type){
  if(!f.n)return 0;if(f.n<=3)return 1;let s=1;
  if(type==='opinion'){
    if(f.n>=5)s=2;if(f.n>=9)s=3;
    if(f.n>=14&&f.contentUnique>=6&&f.support>=1&&!f.vague)s=4;
    if(f.n>=20&&f.contentUnique>=8&&f.support>=1&&!f.vague)s=5;
    if(f.n>=28&&f.contentUnique>=11&&f.support>=2&&f.clauses>=2&&!f.vague)s=6;
    if(f.n>=36&&f.contentUnique>=14&&f.support>=2&&f.clauses>=2&&!f.vague)s=7;
    if(f.n>=46&&f.contentUnique>=18&&f.support>=3&&f.clauses>=3&&!f.vague)s=8;
    if(f.n>=58&&f.contentUnique>=22&&f.support>=3&&f.examples>=1&&f.clauses>=4&&!f.vague)s=9;
    if(f.n>=72&&f.contentUnique>=27&&f.support>=4&&f.examples>=1&&f.clauses>=5&&!f.vague)s=10;
    if(f.n<14) s=Math.min(s,3);if(f.vague)s=Math.min(s,3);if(f.support<1)s=Math.min(s,4);
  }else if(type==='experience'){
    if(f.n>=5)s=2;if(f.n>=9)s=3;if(f.n>=13&&f.contentUnique>=5)s=4;if(f.n>=19&&f.contentUnique>=8)s=5;if(f.n>=26&&f.contentUnique>=10&&f.support+f.clauses>=2)s=6;if(f.n>=34&&f.contentUnique>=13&&f.support+f.clauses>=3)s=7;if(f.n>=43&&f.contentUnique>=16&&f.support+f.clauses>=4)s=8;if(f.n>=54&&f.contentUnique>=20&&f.examples>=1)s=9;if(f.n>=66&&f.contentUnique>=24&&f.examples>=1&&f.clauses>=4)s=10;
  }else{
    if(f.n>=4)s=2;if(f.n>=7)s=3;if(f.n>=10&&f.contentUnique>=4)s=4;if(f.n>=14&&f.contentUnique>=6)s=5;if(f.n>=20&&f.contentUnique>=8)s=6;if(f.n>=27&&f.contentUnique>=10)s=7;if(f.n>=35&&f.contentUnique>=13)s=8;if(f.n>=45&&f.contentUnique>=16)s=9;if(f.n>=56&&f.contentUnique>=20)s=10;
  }
  if(f.repeated>.50)s=Math.min(s,3);else if(f.repeated>.42)s=Math.min(s,5);return s;
}
function language10(f){
  if(!f.n)return 0;if(f.n<=3)return 1;let s=2;
  if(f.n>=7&&f.contentUnique>=3)s=3;if(f.n>=11&&f.contentUnique>=5)s=4;if(f.n>=16&&f.contentUnique>=7&&f.unique>=.45)s=5;
  if(f.n>=23&&f.contentUnique>=9&&f.clauses>=1&&f.unique>=.48)s=6;if(f.n>=31&&f.contentUnique>=12&&f.clauses>=2&&f.unique>=.50)s=7;
  if(f.n>=41&&f.contentUnique>=15&&f.clauses>=3&&f.unique>=.53)s=8;if(f.n>=53&&f.contentUnique>=19&&f.clauses>=4&&f.unique>=.56)s=9;if(f.n>=66&&f.contentUnique>=23&&f.clauses>=5&&f.unique>=.58)s=10;
  if(f.lowControl)s=Math.min(s,4);if(f.unique<.38&&f.n>=10)s=Math.min(s,4);return s;
}
function delivery10(a,f){
  if(!a||!Number.isFinite(a.durationSec))return 0;const d=a.durationSec,ac=a.activeSec||0,vr=a.voicedRatio||0,p=a.longestPauseSec||0,w=a.wpm||0,c=a.asrConfidence;
  if(d<1||ac<.55)return 0;if(d<2.2||ac<1.2)return 1;let s=2;
  if(ac>=1.8&&vr>=.25&&p<=4.5)s=3;if(ac>=2.6&&vr>=.30&&p<=3.8&&w>=45&&w<=235)s=4;
  if(d>=4.5&&ac>=3.4&&vr>=.35&&p<=3.1&&w>=55&&w<=220)s=5;
  if(d>=6&&ac>=4.5&&vr>=.40&&p<=2.6&&w>=65&&w<=210)s=6;
  if(d>=8&&ac>=6&&vr>=.45&&p<=2.1&&w>=75&&w<=200)s=7;
  if(d>=10&&ac>=7.5&&vr>=.50&&p<=1.7&&w>=85&&w<=190)s=8;
  if(d>=13&&ac>=10&&vr>=.56&&p<=1.35&&w>=95&&w<=180)s=9;
  if(d>=16&&ac>=12.5&&vr>=.62&&p<=1.05&&w>=105&&w<=170)s=10;
  if(vr<.22||p>4.8||(w>0&&w<40)||w>250)s=Math.min(s,3);else if(vr<.30||p>3.5||(w>0&&w<55)||w>225)s=Math.min(s,4);
  if(Number.isFinite(c)){if(c<.38)s=Math.min(s,3);else if(c<.52)s=Math.min(s,5);else if(c<.62)s=Math.min(s,7);}
  if((a.clippingRatio||0)>.20)s=Math.min(s,6);if((a.meanRms||0)<.0035)s=Math.min(s,4);if(f.n<=3)s=Math.min(s,2);
  return s;
}
function holistic10(c,l,d,f,type,a){
  if(c===0||d===0)return 0;let s=Math.floor(c*.44+l*.23+d*.33+.12);
  if(c<=2)s=Math.min(s,2);if(c<=3)s=Math.min(s,3);if(c<=4)s=Math.min(s,5);if(l<=3)s=Math.min(s,4);if(l<=4)s=Math.min(s,6);if(d<=3)s=Math.min(s,4);if(d<=4)s=Math.min(s,5);
  if(type==='opinion'){if(f.n<14||f.vague)s=Math.min(s,3);if(f.support<1)s=Math.min(s,4);if(f.n<20)s=Math.min(s,4);if(f.n<28)s=Math.min(s,5);}
  if(type==='experience'&&f.n<18)s=Math.min(s,5);
  if((a.durationSec||0)<4)s=Math.min(s,3);if((a.activeSec||0)<2)s=Math.min(s,2);
  if(s>=8&&(c<7||l<6||d<6))s=7;if(s>=9&&(c<8||l<8||d<8))s=8;if(s===10&&(c<9||l<9||d<9))s=9;
  return clamp(s,0,10);
}
function interviewGrade(d){const id=clean(d.id),q=questionFor(id),type=qType(q),f=textFeatures(d.transcript),a=d.audio||{},c=content10(f,type),l=language10(f),del=delivery10(a,f),score=holistic10(c,l,del,f,type,a);return{score,content:c,language:l,delivery:del,type,f,a};}
function setScore(id,v){const s=byId(id);if(!s)return;ensureScale(s,/rub$/i.test(id)?'尚未評分':'未評分');s.value=String(v);s.disabled=true;try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+s.id,s.value);}catch(e){}}
function renderRepeat(d,r){const id=clean(d.id);setScore(id+'score',r.score);const box=byId(id+'auto');if(box)box.innerHTML='<div><b>最新嚴格分數 '+r.score+'/10</b> <span class="small">｜內容重現 '+r.fidelity+'/10｜口語表現 '+r.delivery+'/10｜第 '+d.round+' 輪</span></div><div class="small">逐字稿吻合度 '+r.similarity+'%｜內容涵蓋 '+r.coverage+'%。9–10 分只給幾乎完整重現且錄音流暢穩定的表現。</div>';const st=byId(id+'st');if(st)st.textContent='第 '+d.round+' 輪完成｜Listen and Repeat 嚴格評分 '+r.score+'/10';}
function renderInterview(d,r){const id=clean(d.id);setScore(id+'score',r.score);setScore(id+'rub',r.score);let box=byId(id+'interviewAuto');const ta=byId(id+'tx');if(!box&&ta){box=document.createElement('div');box.id=id+'interviewAuto';box.className='interview-auto-v46';ta.insertAdjacentElement('afterend',box);}const tn=r.type==='opinion'?'意見／支持':r.type==='experience'?'經驗／說明':'事實／簡答',a=r.a||{},conf=Number.isFinite(a.asrConfidence)?'｜辨識可信度 '+pct(a.asrConfidence)+'%':'';if(box)box.innerHTML='<div><b>最新嚴格錄音分數 '+r.score+'/10</b> <span class="small">｜內容 '+r.content+'/10｜語言 '+r.language+'/10｜口語表現 '+r.delivery+'/10</span></div><div class="small">'+tn+'題｜錄音 '+(Number(a.durationSec)||0).toFixed(1)+' 秒｜有效發聲 '+pct(a.voicedRatio)+'%｜最長停頓 '+(Number(a.longestPauseSec)||0).toFixed(1)+' 秒｜語速 '+Math.round(Number(a.wpm)||0)+' wpm'+conf+'。本版刻意提高門檻：短答、空泛理由、展開不足、長停頓或語速異常都會明顯扣分；8–10 分需內容、語言與錄音表現同時達到高水準。</div>';const st=byId(id+'st');if(st)st.textContent='第 '+d.round+' 輪完成｜Take an Interview 嚴格評分 '+r.score+'/10';}

document.addEventListener('toefl-speaking-round-complete',function(ev){const d=ev.detail||{};setTimeout(()=>{prepAll();if(d.repeat)renderRepeat(d,gradeRepeat(d));else renderInterview(d,interviewGrade(d));},0);});
document.addEventListener('click',function(ev){const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;const normal=b.dataset&&b.dataset.t==='Speaking',mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));if(normal||mock)[0,80,260,600].forEach(ms=>setTimeout(prepAll,ms));},false);
if(typeof window.scoreSpeaking==='function'||true){window.scoreSpeaking=function(){prepAll();const root=byId('content')||document;const sels=[...root.querySelectorAll('select[id$="score"]')].filter(x=>x.closest('.q'));if(sels.length<11||sels.slice(0,11).some(x=>x.value==='')){alert('請先完成 11 題 0–10 評分');return;}const use=sels.slice(0,11),raw=use.reduce((a,x)=>a+Number(x.value),0),band=Math.round((1+5*raw/110)*2)/2,box=byId('sscore');if(box)box.textContent='Speaking raw '+raw+'/110｜站內練習估分約 '+band.toFixed(1)+'（0–10 為本站嚴格練習尺度，非 ETS 官方單題分制）';};}
setTimeout(prepAll,0);setTimeout(prepAll,300);
if(!document.getElementById('speaking-score-v46-style')){const st=document.createElement('style');st.id='speaking-score-v46-style';st.textContent='.interview-auto-v46{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}';document.head.appendChild(st);}
window.__toeflSpeakingStrict10V46=true;
})();
