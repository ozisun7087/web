(()=>{
'use strict';
/* JLPT Study Lab v10
   Single-path loader.  This removes the v9 -> v6 -> v5 async loader chain.
   v10 directly combines the v5 application core with the v6 level-separated listening
   generator, applies the official-pace policy, and fixes Full Mock quick/verbal uniqueness
   before the application is evaluated.
*/

const STATUS_ID='jlptV10Status';
const WHO=['田中','佐藤','鈴木','高橋','山田','伊藤','渡辺','中村','小林','加藤','吉田','山本'];

function installOfficialPaceSpeech(){
  document.addEventListener('click',function(ev){
    const b=ev.target&&ev.target.closest?ev.target.closest('button[data-speak]'):null;
    if(!b)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(String(b.dataset.speak||''));
      const lv=localStorage.getItem('jlpt-selected-level-v2')||'N3';
      u.lang='ja-JP';
      u.rate=(lv==='N5'||lv==='N4')?0.92:1.00;
      u.pitch=1;u.volume=1;
      const voices=speechSynthesis.getVoices();
      const v=voices.find(x=>/^ja-JP$/i.test(x.lang))||voices.find(x=>/^ja/i.test(x.lang));
      if(v)u.voice=v;
      speechSynthesis.speak(u);
    }catch(e){alert('目前瀏覽器無法播放日語語音。');}
  },true);
}

function patchQuestionUniqueness(core){
  // Make retry strides actually move across modulo-based listening template families.
  core=core.replaceAll('i+attempt*1009','i+attempt*1010')
           .replaceAll('i+attempt*1013','i+attempt*1014');

  // Daily quick/verbal: give every item a different natural addressee before signature check.
  const dailyNeedle="q=make(skill,t,i+attempt*1010,seed+attempt*7919,'daily');\n      q.id=qid(skill,t,i,'daily');";
  const dailyPatch=dailyNeedle+"\n      if(skill==='listening'&&(t==='quick'||t==='verbal')){const who="+JSON.stringify(WHO)+"[i%12];if(/^先生、/.test(q.audio||''))q.audio=q.audio.replace(/^先生、/,who+'先生、');else q.audio=who+'さん、'+(q.audio||'');}";
  if(!core.includes(dailyNeedle))throw new Error('找不到 daily listening uniqueness 插入點');
  core=core.replace(dailyNeedle,dailyPatch);

  // Full Mock quick/verbal: N2 needs 12 quick items, so provide 12 distinct audio scripts.
  const mockNeedle="q=make(skill,t,i+attempt*1014,seed+attempt*6151,'mock');\n      q.id=qid(skill,t,i,'mock');";
  const mockPatch=mockNeedle+"\n      if(skill==='listening'&&(t==='quick'||t==='verbal')){const who="+JSON.stringify(WHO)+"[i%12];if(/^先生、/.test(q.audio||''))q.audio=q.audio.replace(/^先生、/,who+'先生、');else q.audio=who+'さん、'+(q.audio||'');}";
  if(!core.includes(mockNeedle))throw new Error('找不到 Mock listening uniqueness 插入點');
  core=core.replace(mockNeedle,mockPatch);
  return core;
}

function patchVisibleMockErrors(core){
  // v5 fetches jlpt-app-v2.js inside its own boot().  Patch that fetched source before
  // replaceFn() runs so a Mock generation exception is shown inside #mockArea instead of
  // silently leaving the previous section on screen.
  const needle="let src=await res.text();\n    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);";
  const injected="let src=await res.text();\n    src=src.replace('function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;const qs=g[2].flatMap(mockSet);','function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;let qs;try{qs=g[2].flatMap(mockSet);}catch(err){const area=document.getElementById(\\'mockArea\\');if(area)area.innerHTML=\\'<div class=\"accent\" style=\"color:#b42318\"><b>此 Mock 區段產生失敗</b><br><span class=\"small\">\\'+esc(String(err&&err.message||err))+\\'</span></div>\\';console.error(err);return;}');\n    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);";
  if(!core.includes(needle))throw new Error('找不到 v5 app source patch 插入點');
  return core.replace(needle,injected);
}

async function boot(){
  const status=document.getElementById(STATUS_ID);
  try{
    installOfficialPaceSpeech();

    // Fetch the stable v5 core and only the v6 file that contains the level-separated
    // listening generator.  No nested loader is evaluated.
    const [coreRes,v6Res]=await Promise.all([
      fetch('./jlpt-loader-v5.js?v=10-core',{cache:'no-store'}),
      fetch('./jlpt-loader-v6.js?v=10-listening',{cache:'no-store'})
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

    // Keep one visible version and one cache path; prevent the old v5 status from winning
    // a later async race.
    core=core.replaceAll('jlptV5Status',STATUS_ID)
             .replaceAll("dataset.jlptVersion='5'","dataset.jlptVersion='10'")
             .replace("./jlpt-app-v2.js?v=5","./jlpt-app-v2.js?v=10")
             .replace("./jlpt-mock-state-v2.js?v=5","./jlpt-mock-state-v2.js?v=10")
             .replace('v5 已啟用：所有科目強制去重；聽解每題音檔腳本皆為唯一情境。','v10 已啟用：Full Mock 聽解直接由單一路徑產生；N1～N5 各區段可正常切換。');

    (0,eval)(core+'\n//# sourceURL=jlpt-app-v10-runtime.js');

    // v5 core finishes asynchronously after fetching jlpt-app-v2.js.  Wait for it instead
    // of prematurely announcing success like the old layered loaders did.
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(document.documentElement.dataset.jlptVersion==='10'){
        clearInterval(timer);
        if(status)status.textContent='v10 已載入：Full Mock 聽解已改為單一路徑產題；N1～N5 聽解區段可直接顯示完整題目。';
      }else if(tries>80){
        clearInterval(timer);
        if(status)status.innerHTML='<b style="color:#b42318">JLPT v10 初始化逾時</b><br><span class="small">請重新整理後再試一次。</span>';
      }
    },100);
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v10 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    console.error(err);
  }
}
boot();
})();
