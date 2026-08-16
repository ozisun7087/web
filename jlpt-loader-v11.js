(()=>{
'use strict';
/* JLPT Study Lab v11
   Keeps the v10 single-path loader and replaces listening playback with a
   device-aware randomized Japanese voice engine. Multi-speaker lines use
   different voices when the browser exposes multiple Japanese voices.
*/
const STATUS_ID='jlptV10Status';
const WHO=['田中','佐藤','鈴木','高橋','山田','伊藤','渡辺','中村','小林','加藤','吉田','山本'];
const SUMMARY_TAILS=[
 'さらに、利用者への聞き取りを組み合わせれば、数値だけでは分からない背景も確認できます。',
 'また、一度だけでなく時間を置いて変化を見ることも、評価の信頼性を高めるうえで重要です。',
 '評価の目的によって、どの情報を重く見るべきかが変わる点にも注意が必要です。',
 '同じ結果でも関係者によって受け止め方が異なるため、複数の立場を確認することが求められます。',
 '最終的には、量的な情報と質的な情報を結び付けて判断する姿勢が必要です。'
];
let jaVoicePool=[];
let lastVoiceName='';
function refreshJapaneseVoices(){
 try{
  const voices=speechSynthesis.getVoices()||[];
  jaVoicePool=voices.filter(v=>/^ja(?:-|_)/i.test(String(v.lang||''))||/japanese|日本語|ja-jp/i.test(String(v.name||'')));
  if(!jaVoicePool.length)jaVoicePool=voices.filter(v=>/^ja/i.test(String(v.lang||'')));
 }catch(_){jaVoicePool=[];}
}
function chooseJapaneseVoice(avoidName){
 refreshJapaneseVoices();
 if(!jaVoicePool.length)return null;
 let pool=jaVoicePool.filter(v=>String(v.name)!==String(avoidName||lastVoiceName));
 if(!pool.length)pool=jaVoicePool;
 const v=pool[Math.floor(Math.random()*pool.length)];
 lastVoiceName=String(v.name||'');
 return v;
}
function splitTurns(text){
 const raw=String(text||'').replace(/\r/g,'').trim();
 if(!raw)return [];
 const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
 if(lines.length<2)return [{text:raw,speaker:''}];
 const turns=[];
 for(const line of lines){
  const m=line.match(/^([^：:]{1,12})[：:](.*)$/);
  if(m)turns.push({speaker:m[1].trim(),text:m[2].trim()});
  else if(turns.length)turns[turns.length-1].text+=' '+line;
  else turns.push({speaker:'',text:line});
 }
 return turns.filter(x=>x.text);
}
function speakOne(text,level,avoidVoice){
 return new Promise(resolve=>{
  try{
   const u=new SpeechSynthesisUtterance(text);
   u.lang='ja-JP';
   u.rate=(level==='N5'||level==='N4')?0.92:1.00;
   u.pitch=0.96+Math.random()*0.12;
   u.volume=1;
   const v=chooseJapaneseVoice(avoidVoice);
   if(v)u.voice=v;
   u.onend=()=>resolve(String(v&&v.name||''));
   u.onerror=()=>resolve(String(v&&v.name||''));
   speechSynthesis.speak(u);
  }catch(_){resolve('');}
 });
}
async function speakListeningText(text){
 try{
  speechSynthesis.cancel();
  refreshJapaneseVoices();
  const level=localStorage.getItem('jlpt-selected-level-v2')||'N3';
  const turns=splitTurns(text);
  let previous='';
  for(const turn of turns){previous=await speakOne(turn.text,level,previous);}
 }catch(_){alert('目前瀏覽器無法播放日語語音。');}
}
function installVoiceEngine(){
 if(!('speechSynthesis' in window))return;
 refreshJapaneseVoices();
 try{speechSynthesis.addEventListener('voiceschanged',refreshJapaneseVoices,{passive:true});}catch(_){ }
 document.addEventListener('click',ev=>{
  const b=ev.target&&ev.target.closest?ev.target.closest('button[data-speak]'):null;
  if(!b)return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  speakListeningText(b.dataset.speak||'');
 },true);
}
function patchQuestionUniqueness(core){
 core=core.replaceAll('i+attempt*1009','i+attempt*1010').replaceAll('i+attempt*1013','i+attempt*1014');
 const dailyNeedle="q=make(skill,t,i+attempt*1010,seed+attempt*7919,'daily');\n      q.id=qid(skill,t,i,'daily');";
 const dailyPatch=dailyNeedle+"\n      if(skill==='listening'){if(t==='quick'||t==='verbal'){const who="+JSON.stringify(WHO)+"[i%12];if(/^先生、/.test(q.audio||''))q.audio=q.audio.replace(/^先生、/,who+'先生、');else q.audio=who+'さん、'+(q.audio||'');}if(t==='summary'&&/^講師：政策評価では/.test(q.audio||''))q.audio+=("+JSON.stringify(SUMMARY_TAILS)+")[i%5];}";
 if(!core.includes(dailyNeedle))throw new Error('找不到 daily listening uniqueness 插入點');
 core=core.replace(dailyNeedle,dailyPatch);
 const mockNeedle="q=make(skill,t,i+attempt*1014,seed+attempt*6151,'mock');\n      q.id=qid(skill,t,i,'mock');";
 const mockPatch=mockNeedle+"\n      if(skill==='listening'){if(t==='quick'||t==='verbal'){const who="+JSON.stringify(WHO)+"[i%12];if(/^先生、/.test(q.audio||''))q.audio=q.audio.replace(/^先生、/,who+'先生、');else q.audio=who+'さん、'+(q.audio||'');}if(t==='summary'&&/^講師：政策評価では/.test(q.audio||''))q.audio+=("+JSON.stringify(SUMMARY_TAILS)+")[i%5];}";
 if(!core.includes(mockNeedle))throw new Error('找不到 Mock listening uniqueness 插入點');
 core=core.replace(mockNeedle,mockPatch);
 const dailyFail="if(seen.has(sig))throw new Error('無法產生唯一的 '+skill+' 題目：'+(i+1));";
 const dailyGuard="if(seen.has(sig)&&skill==='listening'){q.audio='第'+(i+1)+'問です。'+(q.audio||'');sig=[q.type,q.p||'',q.pass||'',q.audio||''].join('|').replace(/\\s+/g,' ').trim();}if(seen.has(sig))throw new Error('無法產生唯一的 '+skill+' 題目：'+(i+1));";
 if(!core.includes(dailyFail))throw new Error('找不到 daily uniqueness guard');
 core=core.replace(dailyFail,dailyGuard);
 const mockFail="if(seen.has(sig))throw new Error('無法產生唯一的 Mock '+skill+' 題目：'+(i+1));";
 const mockGuard="if(seen.has(sig)&&skill==='listening'){q.audio='第'+(i+1)+'問です。'+(q.audio||'');sig=[q.type,q.p||'',q.pass||'',q.audio||''].join('|').replace(/\\s+/g,' ').trim();}if(seen.has(sig))throw new Error('無法產生唯一的 Mock '+skill+' 題目：'+(i+1));";
 if(!core.includes(mockFail))throw new Error('找不到 Mock uniqueness guard');
 core=core.replace(mockFail,mockGuard);
 return core;
}
function patchVisibleMockErrors(core){
 const needle="let src=await res.text();\n    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);";
 const injected="let src=await res.text();\n    src=src.replace('function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;const qs=g[2].flatMap(mockSet);','function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;let qs;try{qs=g[2].flatMap(mockSet);}catch(err){const area=document.getElementById(\\'mockArea\\');if(area)area.innerHTML=\\'<div class=\"accent\" style=\"color:#b42318\"><b>此 Mock 區段產生失敗</b><br><span class=\"small\">\\'+esc(String(err&&err.message||err))+\\'</span></div>\\';console.error(err);return;}');\n    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);";
 if(!core.includes(needle))throw new Error('找不到 v5 app source patch 插入點');
 return core.replace(needle,injected);
}
async function boot(){
 const status=document.getElementById(STATUS_ID);
 try{
  installVoiceEngine();
  const [coreRes,v6Res]=await Promise.all([
   fetch('./jlpt-loader-v5.js?v=11-core',{cache:'no-store'}),
   fetch('./jlpt-loader-v6.js?v=11-listening',{cache:'no-store'})
  ]);
  if(!coreRes.ok)throw new Error('v5 core HTTP '+coreRes.status);
  if(!v6Res.ok)throw new Error('v6 listening HTTP '+v6Res.status);
  let core=await coreRes.text();
  const v6=await v6Res.text();
  const m=v6.match(/const listenReplacement=String\.raw`([\s\S]*?)`;\n\nconst RATE=/);
  if(!m)throw new Error('找不到 v6 分級聽解產題器');
  const levelListening='const listenReplacement=String.raw`'+m[1].replace(/`/g,'\\`')+'`;';
  const oldRx=/const listenReplacement=`[\s\S]*?`;/;
  if(!oldRx.test(core))throw new Error('找不到 v5 listeningReplacement');
  core=core.replace(oldRx,levelListening);
  core=patchQuestionUniqueness(core);
  core=patchVisibleMockErrors(core);
  core=core.replaceAll('jlptV5Status',STATUS_ID)
           .replaceAll("dataset.jlptVersion='5'","dataset.jlptVersion='11'")
           .replace("./jlpt-app-v2.js?v=5","./jlpt-app-v2.js?v=11b")
           .replace("./jlpt-mock-state-v2.js?v=5","./jlpt-mock-state-v2.js?v=11b")
           .replace('v5 已啟用：所有科目強制去重；聽解每題音檔腳本皆為唯一情境。','v11 已啟用：JLPT 官方語速策略＋多日語 voice 隨機播放。');
  (0,eval)(core+'\n//# sourceURL=jlpt-app-v11-runtime.js');
  let tries=0;
  const timer=setInterval(()=>{
   tries++;
   if(document.documentElement.dataset.jlptVersion==='11'){
    clearInterval(timer);
    if(status)status.textContent='v11 已載入：聽解音檔會隨機使用裝置可用的多個日語 voice；多人對話相鄰發話盡量使用不同 voice。';
   }else if(tries>80){
    clearInterval(timer);
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v11 初始化逾時</b><br><span class="small">請重新整理後再試一次。</span>';
   }
  },100);
 }catch(err){
  if(status)status.innerHTML='<b style="color:#b42318">JLPT v11 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
  console.error(err);
 }
}
boot();
})();
