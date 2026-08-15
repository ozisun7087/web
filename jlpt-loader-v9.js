(()=>{
'use strict';
/* JLPT Study Lab v9
   Fixes Full Mock listening generation across N1-N5.
   Root cause: quick/verbal branches in the v6 level-separated listening engine had only
   four fixed utterance families, while official-benchmark mocks require up to 12 quick
   items. The uniqueness guard therefore had to fail after the available fixed scripts
   were exhausted.

   v9 makes every quick/verbal utterance genuinely unique by naturally addressing a
   different named person. With 12 names and a serial stride coprime to 12, N2's 12 quick
   items (the largest quick block) all receive different audio strings. Other listening
   types retain the v6 level-specific content design. v9 also keeps v7's official-pace
   policy and the v8 retry-stride fix.
*/
async function boot(){
  const status=document.getElementById('jlptV9Status');
  try{
    const res=await fetch('./jlpt-loader-v6.js?v=9-base',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    let src=await res.text();

    // Keep official-pace policy: N5/N4 modestly slow; N3/N2/N1 native Japanese TTS rate.
    const rateRx=/const RATE=\{N5:[^}]+\};/;
    if(!rateRx.test(src))throw new Error('找不到 v6 RATE 設定');
    src=src.replace(rateRx,"const RATE={N5:0.92,N4:0.92,N3:1.00,N2:1.00,N1:1.00};");

    // Fresh v5 source and corrected uniqueness retry strides from v8.
    src=src.replace("./jlpt-loader-v5.js?v=6","./jlpt-loader-v5.js?v=9-fix");
    const loadNeedle="let src=await res.text();\n    const rx=/const listenReplacement=`[\\s\\S]*?`;\\n\\nconst dailyReplacement=/;";
    const loadInjected="let src=await res.text();\n    src=src.replaceAll('i+attempt*1009','i+attempt*1010').replaceAll('i+attempt*1013','i+attempt*1014');\n    const rx=/const listenReplacement=`[\\s\\S]*?`;\\n\\nconst dailyReplacement=/;";
    if(!src.includes(loadNeedle))throw new Error('找不到 v6→v5 產題載入點');
    src=src.replace(loadNeedle,loadInjected);

    // Patch the v6 listening generator itself before it is inserted into v5.
    // Prefixing a named addressee is natural Japanese and yields >=12 distinct audio
    // strings for quick/verbal blocks. Teacher-address utterances become e.g. 田中先生、…
    const returnNeedle="  return{id:qid('listening',type,i,mode),skill:'listening',type,audio,p,a,o:shuffle([a,...d],r),e:'音声の内容・話者の意図・論理関係から「'+a+'」が最も適切です。'};";
    const returnInjected="  if(type==='quick'||type==='verbal'){\n    if(/^先生、/.test(audio))audio=audio.replace(/^先生、/,n+'先生、');\n    else audio=n+'さん、'+audio;\n  }\n"+returnNeedle;
    if(!src.includes(returnNeedle))throw new Error('找不到 v6 listening return 點');
    src=src.replace(returnNeedle,returnInjected);

    // Make Mock failures visible instead of leaving the previous section on screen.
    const mockFnOld="function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;const qs=g[2].flatMap(mockSet);document.getElementById('mockArea').innerHTML='<div class=\"section-title mock-title\">'+g[1]+'｜'+qs.length+' 題</div><div class=\"accent small\">此區依官方題數基準完整產生。完成後顯示 raw accuracy；JLPT 正式成績採尺度分數，本站不把 raw accuracy 假裝成官方分數。</div>'+qs.map(card).join('')+'<button class=\"btn primary\" data-finishmock=\"'+g[0]+'\">完成此 Mock 區段</button>';document.getElementById('mockArea').scrollIntoView({behavior:'smooth',block:'start'})}";
    const mockFnNew="function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;const area=document.getElementById('mockArea');try{const qs=g[2].flatMap(mockSet);area.innerHTML='<div class=\"section-title mock-title\">'+g[1]+'｜'+qs.length+' 題</div><div class=\"accent small\">此區依官方題數基準完整產生。完成後顯示 raw accuracy；JLPT 正式成績採尺度分數，本站不把 raw accuracy 假裝成官方分數。</div>'+qs.map(card).join('')+'<button class=\"btn primary\" data-finishmock=\"'+g[0]+'\">完成此 Mock 區段</button>';area.scrollIntoView({behavior:'smooth',block:'start'});}catch(err){area.innerHTML='<div class=\"accent\" style=\"color:#b42318\"><b>此 Mock 區段產生失敗</b><br><span class=\"small\">'+esc(String(err&&err.message||err))+'</span></div>';console.error(err);}}";

    // The function lives in the fetched jlpt-app-v2 source inside v5, so inject a
    // replacement into v5 source at the same point where v6 already edits that source.
    const injectPoint="src=src.replaceAll('i+attempt*1009','i+attempt*1010').replaceAll('i+attempt*1013','i+attempt*1014');";
    const mockPatch="src=src.replaceAll('i+attempt*1009','i+attempt*1010').replaceAll('i+attempt*1013','i+attempt*1014');\n    if(src.includes("+JSON.stringify(mockFnOld)+"))src=src.replace("+JSON.stringify(mockFnOld)+","+JSON.stringify(mockFnNew)+");";
    src=src.replace(injectPoint,mockPatch);

    src=src
      .replaceAll('JLPT Study Lab v6','JLPT Study Lab v9')
      .replaceAll('jlptV6Status','jlptV9Status')
      .replaceAll("dataset.jlptVersion='6'","dataset.jlptVersion='9'")
      .replaceAll('N1～N5 聽解採不同語速、篇幅、資訊密度與推論層級。','Full Mock 聽解已修正：即時應答／發話表現具足量唯一音檔；語速依 JLPT 官方級別描述校準。');

    (0,eval)(src+'\n//# sourceURL=jlpt-app-v9-loader-runtime.js');
    document.documentElement.dataset.jlptVersion='9';
    if(status)status.textContent='v9 已載入：N1～N5 Full Mock 聽解可產生足量唯一題目，並保留官方語速校準。';
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v9 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    else console.error(err);
  }
}
boot();
})();
