(function(){
'use strict';
/* TOEFL Study Lab Google AdSense layout v52
   - Adds three responsive, clearly labeled ad areas outside question cards.
   - Safe placeholder mode until real AdSense client/slot IDs are configured.
   - When window.TOEFL_ADSENSE_CONFIG contains a valid ca-pub ID + slots,
     this script loads Google's official AdSense script once and activates units.
*/
const ID='toefl-adsense-layout-v52';
const cfg=window.TOEFL_ADSENSE_CONFIG||{
  client:'',
  slots:{top:'',middle:'',bottom:''}
};
function validClient(v){return /^ca-pub-\d{10,}$/.test(String(v||''));}
function validSlot(v){return /^\d{4,}$/.test(String(v||''));}
function css(){
  if(document.getElementById(ID+'-style'))return;
  const st=document.createElement('style');st.id=ID+'-style';
  st.textContent=`
  .toefl-ad-wrap{margin:14px 0;background:#fff;border:1px solid #dbe3ef;border-radius:14px;padding:8px 10px;overflow:hidden}
  .toefl-ad-label{font-size:.72rem;color:#8a94a6;text-align:center;letter-spacing:.06em;margin:0 0 5px}
  .toefl-ad-slot{display:block;width:100%;min-height:90px}
  .toefl-ad-placeholder{min-height:90px;display:grid;place-items:center;text-align:center;border:1px dashed #cfd8e6;border-radius:10px;background:#fafcff;color:#98a2b3;font-size:.78rem;padding:12px}
  @media(max-width:720px){.toefl-ad-wrap{margin:12px -2px;padding:7px}.toefl-ad-slot,.toefl-ad-placeholder{min-height:100px}}
  `;
  document.head.appendChild(st);
}
function makeUnit(place){
  const wrap=document.createElement('section');wrap.className='toefl-ad-wrap';wrap.dataset.adPlace=place;
  const label=document.createElement('div');label.className='toefl-ad-label';label.textContent='廣告';wrap.appendChild(label);
  if(validClient(cfg.client)&&validSlot(cfg.slots&&cfg.slots[place])){
    const ins=document.createElement('ins');ins.className='adsbygoogle toefl-ad-slot';ins.style.display='block';
    ins.setAttribute('data-ad-client',cfg.client);ins.setAttribute('data-ad-slot',cfg.slots[place]);
    ins.setAttribute('data-ad-format','auto');ins.setAttribute('data-full-width-responsive','true');wrap.appendChild(ins);
  }else{
    const ph=document.createElement('div');ph.className='toefl-ad-placeholder';ph.textContent='Google AdSense 廣告版面';wrap.appendChild(ph);
  }
  return wrap;
}
function loadGoogle(){
  if(!validClient(cfg.client)||document.querySelector('script[data-toefl-adsense]'))return Promise.resolve(false);
  return new Promise(resolve=>{
    const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.dataset.toeflAdsense='1';
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(cfg.client);
    s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.head.appendChild(s);
  });
}
async function activate(){
  const ok=await loadGoogle();if(!ok)return;
  document.querySelectorAll('ins.adsbygoogle[data-ad-slot]').forEach(ins=>{
    if(ins.dataset.toeflPushed)return;ins.dataset.toeflPushed='1';
    try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
  });
}
function install(){
  if(document.getElementById(ID))return true;
  const main=document.querySelector('main'),hero=document.querySelector('.hero'),practice=document.querySelector('#practice');
  if(!main||!hero||!practice)return false;
  css();
  const marker=document.createElement('div');marker.id=ID;marker.hidden=true;main.appendChild(marker);
  const top=makeUnit('top');hero.insertAdjacentElement('afterend',top);
  const weekly=[...main.querySelectorAll('.card')].find(x=>/固定每週輪替/.test(x.textContent||''));
  const middle=makeUnit('middle');if(weekly)weekly.insertAdjacentElement('afterend',middle);else practice.insertAdjacentElement('beforebegin',middle);
  const weakness=[...main.querySelectorAll('.card')].find(x=>/弱項與複盤/.test(x.textContent||''));
  const bottom=makeUnit('bottom');if(weakness)weakness.insertAdjacentElement('beforebegin',bottom);else main.appendChild(bottom);
  activate();return true;
}
[0,80,250,700,1400].forEach(ms=>setTimeout(install,ms));
})();
