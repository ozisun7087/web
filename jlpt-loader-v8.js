(()=>{
'use strict';
/* JLPT Study Lab v8
   Fixes Full Mock listening sections that could fail silently because the v5 uniqueness
   retry stride preserved serial % 4 in the v6 level-separated listening generator.
   v8 changes the retry stride inside the nested v5 source before it is evaluated:
     daily 1009 -> 1010
     mock  1013 -> 1014
   The resulting retry deltas change modulo-4/template families, so a collision can
   actually move to a different listening script instead of retrying the same family.
   v8 also keeps the v7 official-pace policy: N5/N4 modestly slow, N3/N2/N1 native rate.
*/
async function boot(){
  const status=document.getElementById('jlptV8Status');
  try{
    const res=await fetch('./jlpt-loader-v6.js?v=8-base',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    let src=await res.text();

    // Keep the official-pace calibration from v7. Do not artificially accelerate N1.
    const rateRx=/const RATE=\{N5:[^}]+\};/;
    if(!rateRx.test(src))throw new Error('找不到 v6 RATE 設定');
    src=src.replace(rateRx,"const RATE={N5:0.92,N4:0.92,N3:1.00,N2:1.00,N1:1.00};");

    // Force the nested v5 loader to fetch with a fresh cache key.
    src=src.replace("./jlpt-loader-v5.js?v=6","./jlpt-loader-v5.js?v=8-fix");

    // Patch the v5 source immediately after v6 fetches it.  The old retry strides made
    // the listening serial move by a multiple of 4, so quick/verbal template family did
    // not change on retries.  1010/1014 make the modulo-4 family advance on each retry.
    const needle="let src=await res.text();\n    const rx=/const listenReplacement=`[\\s\\S]*?`;\\n\\nconst dailyReplacement=/;";
    const injected="let src=await res.text();\n    src=src.replaceAll('i+attempt*1009','i+attempt*1010').replaceAll('i+attempt*1013','i+attempt*1014');\n    const rx=/const listenReplacement=`[\\s\\S]*?`;\\n\\nconst dailyReplacement=/;";
    if(!src.includes(needle))throw new Error('找不到 v6→v5 產題載入點');
    src=src.replace(needle,injected);

    src=src
      .replaceAll('JLPT Study Lab v6','JLPT Study Lab v8')
      .replaceAll('jlptV6Status','jlptV8Status')
      .replaceAll("dataset.jlptVersion='6'","dataset.jlptVersion='8'")
      .replaceAll('N1～N5 聽解採不同語速、篇幅、資訊密度與推論層級。','Full Mock 聽解碰撞已修正；語速依 JLPT 官方級別描述校準。');

    (0,eval)(src+'\n//# sourceURL=jlpt-app-v8-loader-runtime.js');
    document.documentElement.dataset.jlptVersion='8';
    if(status)status.textContent='v8 已載入：Full Mock 聽解產題碰撞已修正；各測驗區段可正常切換。';
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v8 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    else console.error(err);
  }
}
boot();
})();
