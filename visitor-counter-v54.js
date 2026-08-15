(function(){
'use strict';
/* TOEFL Study Lab visitor counter v54
   Goals:
   - Refreshing the page does NOT increment the count repeatedly.
   - The same browser is counted at most once per 24 hours via localStorage.
   - The tracking service also performs short-window server-side deduplication.
   - Reading the current total never increments the counter.
*/
const ID='toefl-visitor-counter-v54';
const SITE='toefl-ibt-2026-study-lab.vercel.app';
const PAGE='/';
const API='https://page-views-api.ratneshc.com/api/v1';
const STORAGE_KEY='toefl-visitor-last-count-v54';
const COOLDOWN_MS=24*60*60*1000;

function readLast(){
  try{return Number(localStorage.getItem(STORAGE_KEY)||0)||0;}catch(e){return 0;}
}
function writeLast(v){
  try{localStorage.setItem(STORAGE_KEY,String(v));}catch(e){}
}
function endpoint(kind){
  return API+'/'+kind+'?site='+encodeURIComponent(SITE)+'&path='+encodeURIComponent(PAGE);
}
async function request(kind){
  const r=await fetch(endpoint(kind),{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',keepalive:kind==='track'});
  if(!r.ok)throw new Error('visitor counter HTTP '+r.status);
  return r.json();
}
function makeUI(){
  if(document.getElementById(ID))return document.getElementById(ID);
  const hero=document.querySelector('.hero');if(!hero)return null;
  const wrap=document.createElement('div');wrap.id=ID;wrap.setAttribute('aria-label','網站瀏覽人次');
  wrap.style.cssText='margin-top:12px;display:flex;align-items:center;gap:8px;min-height:26px;flex-wrap:wrap';
  const label=document.createElement('span');label.className='small';label.textContent='網站瀏覽人次';
  const value=document.createElement('strong');value.dataset.visitorCount='1';value.textContent='—';value.style.cssText='font-variant-numeric:tabular-nums;color:#3157d5';
  const note=document.createElement('span');note.className='small';note.textContent='同一瀏覽器 24 小時內不重複計入';note.style.opacity='.78';
  wrap.append(label,value,note);
  const badges=hero.querySelector('.badges');if(badges)badges.insertAdjacentElement('afterend',wrap);else hero.appendChild(wrap);
  return wrap;
}
async function update(){
  const wrap=makeUI();if(!wrap)return;
  const value=wrap.querySelector('[data-visitor-count]');
  const now=Date.now(),last=readLast();
  const shouldTrack=!last||now-last>=COOLDOWN_MS;
  if(shouldTrack){
    // Claim the 24h window before making the network request so a rapid reload or
    // another tab cannot easily submit a second increment request.
    writeLast(now);
    try{await request('track');}catch(e){/* conservative: do not retry on refresh */}
  }
  try{
    const data=await request('views');
    const n=Number(data&&data.views);
    if(Number.isFinite(n)&&n>=0)value.textContent=Math.trunc(n).toLocaleString('zh-TW');
  }catch(e){
    if(value)value.textContent='—';
  }
}
function install(){const el=makeUI();if(el&&!el.dataset.started){el.dataset.started='1';update();}}
[0,80,250,700,1400].forEach(ms=>setTimeout(install,ms));
})();
