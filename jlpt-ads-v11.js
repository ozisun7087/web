(()=>{
'use strict';
/* JLPT Study Lab v11 - Google AdSense layout bridge.
   Fill in the three values below after AdSense approval:
   client: ca-pub-xxxxxxxxxxxxxxxx
   middleSlot / footerSlot: numeric ad-unit slot IDs
   Until then, the page shows neutral reserved ad areas and sends no request to Google.
*/
const CFG={client:'',middleSlot:'',footerSlot:''};
const defs=[['jlptAdMiddle',CFG.middleSlot],['jlptAdFooter',CFG.footerSlot]];
function valid(){return /^ca-pub-\d{10,20}$/.test(CFG.client)&&defs.every(x=>/^\d{5,20}$/.test(x[1]));}
function setWaiting(el){
  if(!el)return;
  el.innerHTML='<div class="ad-label">廣告</div><div class="ad-placeholder">Google AdSense 廣告版位</div>';
}
function mount(el,slot){
  if(!el)return;
  el.innerHTML='<div class="ad-label">廣告</div><ins class="adsbygoogle jlpt-responsive-ad" style="display:block" data-ad-client="'+CFG.client+'" data-ad-slot="'+slot+'" data-ad-format="auto" data-full-width-responsive="true"></ins>';
  try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
}
function boot(){
  const els=defs.map(([id])=>document.getElementById(id));
  if(!valid()){
    els.forEach(setWaiting);
    document.documentElement.dataset.adsense='layout-ready';
    return;
  }
  const s=document.createElement('script');
  s.async=true;
  s.crossOrigin='anonymous';
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(CFG.client);
  s.onload=()=>defs.forEach(([id,slot])=>mount(document.getElementById(id),slot));
  s.onerror=()=>els.forEach(setWaiting);
  document.head.appendChild(s);
  document.documentElement.dataset.adsense='active';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
