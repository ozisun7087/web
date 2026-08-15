(()=>{
'use strict';
if(new URLSearchParams(location.search).has('app')){
  const el=document.getElementById('jlptTrafficValue')?.closest('.traffic-strip');
  if(el)el.style.display='none';
  return;
}
/* JLPT Study Lab v12 - lightweight cumulative visitor counter.
   Uses CounterAPI v1 as an approximate public counter. To reduce accidental inflation:
   - the same browser increments at most once every 6 hours;
   - the displayed value is cached locally for 5 minutes;
   - failures never block the study app.
   This is an approximate page-visitor metric, not audited analytics.
*/
const NS=['jlpt','lab','a7f3c91e6b2d'].join('-');
const NAME=['views','4c8e7f'].join('-');
const BASE='https://api.counterapi.dev/v1/'+NS+'/'+NAME;
const HIT_KEY='jlpt-traffic-last-hit-v12';
const VALUE_KEY='jlpt-traffic-last-value-v12';
const VALUE_TS_KEY='jlpt-traffic-value-ts-v12';
const HIT_GAP=6*60*60*1000;
const CACHE_GAP=5*60*1000;
function numberFrom(x){if(typeof x==='number'&&Number.isFinite(x))return x;if(!x||typeof x!=='object')return null;for(const k of ['value','count','up_count','total']){if(typeof x[k]==='number'&&Number.isFinite(x[k]))return x[k];}if(x.data){const n=numberFrom(x.data);if(n!==null)return n;}return null;}
function paint(value,note){const n=document.getElementById('jlptTrafficValue');const s=document.getElementById('jlptTrafficNote');if(n)n.textContent=(typeof value==='number'&&Number.isFinite(value))?Math.max(0,Math.round(value)).toLocaleString('zh-TW'):'—';if(s)s.textContent=note||'約略統計';}
async function read(url){const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),4500);try{const r=await fetch(url,{cache:'no-store',signal:ctl.signal,mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();const v=numberFrom(j);if(v===null)throw new Error('No numeric value');return v;}finally{clearTimeout(t);}}
async function boot(){const now=Date.now();const cached=Number(localStorage.getItem(VALUE_KEY));const cachedAt=Number(localStorage.getItem(VALUE_TS_KEY));if(Number.isFinite(cached)&&cachedAt&&now-cachedAt<CACHE_GAP){paint(cached,'約略統計');return;}const lastHit=Number(localStorage.getItem(HIT_KEY));const shouldHit=!lastHit||now-lastHit>=HIT_GAP;try{const value=await read(BASE+(shouldHit?'/up':''));if(shouldHit)localStorage.setItem(HIT_KEY,String(now));localStorage.setItem(VALUE_KEY,String(value));localStorage.setItem(VALUE_TS_KEY,String(now));paint(value,'約略統計');}catch(err){if(Number.isFinite(cached))paint(cached,'暫存值');else paint(null,'暫時無法取得');}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
