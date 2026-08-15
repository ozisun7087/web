(function(){
'use strict';
/* Take an Interview audio-aware grader v45
   Holistic practice score = recorded delivery + content/development + language control.
   Audio metrics come from speaking-record-v45.js and include duration, voiced ratio,
   pauses, speech rate, level/clipping, and ASR confidence when the browser supplies it.
   Transcript is used only to recover semantic/linguistic evidence from the recording.
*/
const STOP=new Set(('a an the and or but if then than to of in on at for from with by as is are was were be been being do does did have has had can could will would should may might must it this that these those i me my we our you your they them their he she his her there here what which who whom where when why how').split(' '));
function clean(s){return String(s||'').replace(/\s+/g,' ').trim();}
function words(s){return clean(s).toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g)||[];}
function byId(id){return document.getElementById(id);}
function btnFor(id){return [...document.querySelectorAll('button.record[data-id]')].find(b=>b.dataset.id===id)||null;}
function isInterview(btn){return !!(btn&&!clean(btn.dataset.prompt));}
function questionFor(id){const b=btnFor(id),q=b&&b.closest('.q'),p=q&&q.querySelector('button.splay[data-text]');return clean(p&&p.dataset.text);}
function questionType(q){q=clean(q).toLowerCase();if(/\b(why|should|do you think|what do you think|agree|disagree|prefer|better|important|advantage|disadvantage|benefit|drawback|effect|impact|recommend|opinion|would you rather)\b/.test(q))return'opinion';if(/\b(describe|tell me about|experience|example|explain)\b/.test(q))return'experience';return'factual';}
function contentWords(a){return a.filter(x=>!STOP.has(x)&&x.length>2);}
function textFeatures(text,question){
 const w=words(text),n=w.length,cw=contentWords(w),unique=n?new Set(w).size/n:0,cu=new Set(cw).size,low=' '+clean(text).toLowerCase()+' ';
 const support=(low.match(/\b(because|since|therefore|so|as a result|one reason|for example|for instance|such as|another reason|also|moreover|however|although|while|whereas|but|first|second)\b/g)||[]).length;
 const clauses=(low.match(/\b(because|since|although|while|whereas|if|when|which|that|who|so|but|and)\b/g)||[]).length;
 const vague=/\b(because|since)\s+(it|this|that)\s+(can\s+)?(help|be good|be better|be useful)\s*[.!?]*$/i.test(clean(text))||/\b(it|this|that)\s+(can\s+)?(help|be good|be better|be useful)\s*[.!?]*$/i.test(clean(text));
 const repeated=n>=8?1-new Set(w).size/n:0;
 const lowControl=/\bshould preserve old building\b/i.test(clean(text))||/\bbecause It\b/.test(text)||/\bi is agree\b/i.test(text)||/\bpeople is\b/i.test(text);
 const qcw=new Set(contentWords(words(question))),overlap=cw.filter(x=>qcw.has(x)).length;
 return{n,unique,contentUnique:cu,support,clauses,vague,repeated,lowControl,overlap};
}
function contentScore(f,type){
 if(!f.n)return 0;if(f.n<=3)return 1;
 let s=1;
 if(type==='opinion'){
   if(f.n>=6)s=2;
   if(f.n>=14&&f.contentUnique>=6&&f.support>=1&&!f.vague)s=3;
   if(f.n>=26&&f.contentUnique>=11&&f.support>=2&&f.clauses>=2&&!f.vague)s=4;
   if(f.n>=42&&f.contentUnique>=17&&f.support>=3&&f.clauses>=3&&!f.vague)s=5;
   if(f.n<14||f.vague)s=Math.min(s,2);
 }else if(type==='experience'){
   if(f.n>=6)s=2;if(f.n>=12&&f.contentUnique>=5)s=3;if(f.n>=23&&f.contentUnique>=9&&f.support+f.clauses>=2)s=4;if(f.n>=36&&f.contentUnique>=14&&f.support+f.clauses>=3)s=5;
 }else{
   if(f.n>=5)s=2;if(f.n>=9&&f.contentUnique>=4)s=3;if(f.n>=16&&f.contentUnique>=7)s=4;if(f.n>=27&&f.contentUnique>=11)s=5;
 }
 if(f.repeated>.48)s=Math.min(s,2);return s;
}
function languageScore(f){
 if(!f.n)return 0;if(f.n<=3)return 1;let s=2;
 if(f.n>=10&&f.contentUnique>=4)s=3;
 if(f.n>=22&&f.unique>=.48&&f.clauses>=2)s=4;
 if(f.n>=38&&f.unique>=.55&&f.clauses>=3)s=5;
 if(f.lowControl)s=Math.min(s,2);if(f.unique<.38&&f.n>=10)s=Math.min(s,3);return s;
}
function deliveryScore(a,f){
 if(!a||!Number.isFinite(a.durationSec))return 0;
 const d=a.durationSec,active=a.activeSec||0,vr=a.voicedRatio||0,pause=a.longestPauseSec||0,wpm=a.wpm||0,conf=a.asrConfidence;
 if(d<1||active<.6)return 0;if(d<2.5||active<1.3)return 1;
 let s=2;
 if(active>=2&&vr>=.30&&pause<=4.0)s=3;
 if(d>=5&&active>=3&&vr>=.42&&pause<=2.6&&wpm>=65&&wpm<=215)s=4;
 if(d>=8&&active>=5&&vr>=.52&&pause<=1.8&&wpm>=90&&wpm<=190)s=5;
 if(vr<.24||pause>4.5||wpm>0&&wpm<45||wpm>250)s=Math.min(s,2);
 else if(vr<.34||pause>3.2||wpm>0&&wpm<60||wpm>225)s=Math.min(s,3);
 if(Number.isFinite(conf)){if(conf<.42)s=Math.min(s,2);else if(conf<.58)s=Math.min(s,3);}
 if((a.clippingRatio||0)>.22)s=Math.min(s,3);
 if((a.meanRms||0)<.004)s=Math.min(s,2);
 if(f.n<=3)s=Math.min(s,1);
 return s;
}
function holistic(content,language,delivery,f,type,a){
 if(content===0||delivery===0)return 0;
 let raw=.45*content+.22*language+.33*delivery;
 let score=raw<1.55?1:raw<2.55?2:raw<3.55?3:raw<4.45?4:5;
 if(content<=2)score=Math.min(score,2);
 if(delivery<=1)score=Math.min(score,2);
 if(delivery<=2)score=Math.min(score,3);
 if(language<=2)score=Math.min(score,3);
 if(type==='opinion'&&(f.n<14||f.vague||f.support<1))score=Math.min(score,2);
 if(type==='opinion'&&f.n<25)score=Math.min(score,3);
 if(type==='opinion'&&score>=4&&(content<4||delivery<3||language<3))score=3;
 if(type==='experience'&&score>=4&&f.n<20)score=3;
 if((a.durationSec||0)<4)score=Math.min(score,2);
 if((a.activeSec||0)<2)score=Math.min(score,1);
 if(score===5&&(content<5||delivery<4||language<4))score=4;
 return score;
}
function boxFor(id){let b=byId(id+'interviewAuto');if(b)return b;const ta=byId(id+'tx');if(!ta)return null;b=document.createElement('div');b.id=id+'interviewAuto';b.className='interview-auto-v45';ta.insertAdjacentElement('afterend',b);return b;}
function setSelect(id,v){const s=byId(id);if(!s)return;s.value=v===''?'':String(v);s.disabled=true;s.title='依本輪實際錄音內容自動更新';try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+s.id,s.value);}catch(e){}}
function prepare(btn){if(!isInterview(btn))return;const id=clean(btn.dataset.id);if(!id)return;const finalSel=byId(id+'score');if(finalSel){finalSel.disabled=true;const rub=finalSel.closest('.rub'),lab=rub&&rub.querySelector('span');if(lab)lab.textContent='最新錄音自動分數';}const rubricSel=byId(id+'rub');if(rubricSel){rubricSel.disabled=true;const rub=rubricSel.closest('.rub'),lab=rub&&rub.querySelector('span');if(lab)lab.textContent='Audio-based practice score';}const box=boxFor(id);if(box&&!clean(box.textContent))box.innerHTML='<span class="small">完成錄音後，系統會綜合實際音訊的發聲比例、停頓、語速與逐字稿中的內容／語言表現，自動模擬 0–5 分。</span>';}
function clearLatest(btn){if(!isInterview(btn))return;const id=clean(btn.dataset.id);setSelect(id+'score','');setSelect(id+'rub','');const box=boxFor(id);if(box)box.innerHTML='<span class="small">本輪完成後會依最新錄音內容重新評分。</span>';}
function pct(x){return Math.round((Number(x)||0)*100);}
function gradeRound(detail){
 const id=clean(detail&&detail.id),btn=btnFor(id);if(!id||!btn||!isInterview(btn))return;prepare(btn);
 const text=clean(detail.transcript),question=questionFor(id),type=questionType(question),f=textFeatures(text,question),a=detail.audio||{};
 const c=contentScore(f,type),l=languageScore(f),d=deliveryScore(a,f),score=holistic(c,l,d,f,type,a);
 setSelect(id+'score',score);setSelect(id+'rub',score);
 const box=boxFor(id),typeName=type==='opinion'?'意見／支持':type==='experience'?'經驗／說明':'事實／簡答',conf=Number.isFinite(a.asrConfidence)?'｜辨識可信度 '+pct(a.asrConfidence)+'%':'';
 if(box)box.innerHTML='<div><b>最新錄音模擬分數 '+score+'/5</b> <span class="small">｜內容 '+c+'/5｜語言 '+l+'/5｜口語表現 '+d+'/5</span></div><div class="small">'+typeName+'題｜錄音 '+(Number(a.durationSec)||0).toFixed(1)+' 秒｜有效發聲 '+pct(a.voicedRatio)+'%｜最長停頓 '+(Number(a.longestPauseSec)||0).toFixed(1)+' 秒｜語速 '+Math.round(Number(a.wpm)||0)+' wpm'+conf+'。分數以本輪實際音訊的流暢度／停頓／發聲情形為重要依據，並用語音辨識文字判斷內容、支持、詞彙與文法。瀏覽器端仍無法像 ETS 的 AI＋認證評分員一樣完整判斷每個音素與口音細節，因此這是保守的練習模擬分數。</div>';
 const st=byId(id+'st');if(st)st.textContent='第 '+detail.round+' 輪完成｜已依錄音內容自動評分 '+score+'/5';
}
document.addEventListener('toefl-speaking-round-complete',function(ev){const d=ev.detail||{};if(!d.repeat)gradeRound(d);});
/* Clear stale score immediately when a new Interview round starts. Loaded before recorder capture handler. */
document.addEventListener('click',function(ev){const btn=ev.target&&ev.target.closest?ev.target.closest('button.record[data-id]'):null;if(!isInterview(btn))return;prepare(btn);const state=btn.dataset.recState||'idle';if(state==='idle'||state==='')clearLatest(btn);},true);
document.addEventListener('click',function(ev){const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;const normal=b.dataset&&b.dataset.t==='Speaking',mock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));if(!normal&&!mock)return;[0,80,250].forEach(ms=>setTimeout(()=>{const root=mock?byId('mock'):byId('content');if(root)root.querySelectorAll('button.record[data-id]').forEach(prepare);},ms));},false);
setTimeout(()=>document.querySelectorAll('button.record[data-id]').forEach(prepare),0);
if(!document.getElementById('speaking-interview-auto-v45-style')){const st=document.createElement('style');st.id='speaking-interview-auto-v45-style';st.textContent='.interview-auto-v45{margin:8px 0;padding:9px 11px;border-radius:10px;background:#f4f7ff;border:1px solid #cfd9ff;line-height:1.55}';document.head.appendChild(st);}
window.__toeflInterviewAudioGradeV45=true;
})();