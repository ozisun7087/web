(()=>{
'use strict';
/* JLPT Study Lab v7
   Official-pace calibration layer.
   JLPT does not publish numeric playback multipliers. Its official level summary describes:
   - N5/N4: slowly spoken conversations
   - N3: near-natural speed
   - N2: nearly natural speed
   - N1: natural speed
   Therefore v7 removes the artificial five-step 0.76..1.08 speed ladder from v6.
   Browser TTS cannot reproduce the official recordings exactly across OS/voices, so v7 uses
   only two implementation bands: a modest slow band for N5/N4 and the voice's native rate
   for N3/N2/N1. Difficulty separation remains in script length, density and inference load.
*/
async function boot(){
  const status=document.getElementById('jlptV7Status');
  try{
    const res=await fetch('./jlpt-loader-v6.js?v=7-base',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    let src=await res.text();

    /* Remove v6's artificial five-level speed ladder.
       0.92 is used only as a browser-TTS approximation of the official "slowly spoken" band;
       native 1.00 is used for near-natural/natural bands. We intentionally do NOT make
       N1 faster than N2/N3 merely to increase difficulty. */
    const rx=/const RATE=\{N5:[^}]+\};/;
    if(!rx.test(src))throw new Error('找不到 v6 RATE 設定');
    src=src.replace(rx,"const RATE={N5:0.92,N4:0.92,N3:1.00,N2:1.00,N1:1.00};");

    src=src
      .replaceAll('JLPT Study Lab v6','JLPT Study Lab v7')
      .replaceAll('jlptV6Status','jlptV7Status')
      .replaceAll("dataset.jlptVersion='6'","dataset.jlptVersion='7'")
      .replaceAll('N1～N5 聽解採不同語速、篇幅、資訊密度與推論層級。','語速依 JLPT 官方級別描述校準：N5/N4 較慢，N3/N2 近常速，N1 常速；不再人工逐級加速。');

    (0,eval)(src+'\n//# sourceURL=jlpt-app-v7-loader-runtime.js');
    document.documentElement.dataset.jlptVersion='7';
    if(status)status.textContent='v7 已載入：聽解語速依 JLPT 官方級別描述校準，不再用人為五段倍速拉開難度。';
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v7 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    else console.error(err);
  }
}
boot();
})();
