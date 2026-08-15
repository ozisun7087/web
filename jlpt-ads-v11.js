(()=>{
'use strict';
/* JLPT Study Lab v11 - Google AdSense bridge.
   Publisher ID is configured. Auto ads can run with client ID alone when enabled
   in AdSense. Fixed in-page placements still require ad-unit slot IDs.
*/
const CFG={client:'ca-pub-3086163657339958',middleSlot:'',footerSlot:''};
const defs=[['jlptAdMiddle',CFG.middleSlot],['jlptAdFooter',CFG.footerSlot]];
function validClient(){return /^ca-pub-\d{16}$/.test(CFG.client);}
function validSlot(x){return /^\d{5,20}$/.test(x||'');}
function setReserved(el){
  if(!el)return;
  el.innerHTML='<div class="ad-label">廣告</div><div class="ad-placeholder">Google AdSense</div>';
}
function mount(el,slot){
  if(!el||!validSlot(slot))return;
  el.innerHTML='<div class="ad-label">廣告</div><ins class="adsbygoogle jlpt-responsive-ad" style="display:block" data-ad-client="'+CFG.client+'" data-ad-slot="'+slot+'" data-ad-format="auto" data-full-width-responsive="true"></ins>';
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
}
function ensureScript(){
  return new Promise((resolve,reject)=>{
    const old=document.querySelector('script[data-jlpt-adsense-client]');
    if(old){resolve();return;}
    const s=document.createElement('script');
    s.async=true;
    s.crossOrigin='anonymous';
    s.dataset.jlptAdsenseClient=CFG.client;
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(CFG.client);
    s.onload=resolve;s.onerror=reject;
    document.head.appendChild(s);
  });
}
function boot(){
  const els=defs.map(([id])=>document.getElementById(id));
  if(!validClient()){
    els.forEach(setReserved);
    document.documentElement.dataset.adsense='invalid-client';
    return;
  }
  // Load the official AdSense code even when fixed slot IDs are not configured.
  // This enables Auto ads if Auto ads is enabled for this site in AdSense.
  ensureScript().then(()=>{
    defs.forEach(([id,slot])=>{
      const el=document.getElementById(id);
      if(validSlot(slot))mount(el,slot);else setReserved(el);
    });
    document.documentElement.dataset.adsense='auto-ready';
  }).catch(()=>{
    els.forEach(setReserved);
    document.documentElement.dataset.adsense='load-error';
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
