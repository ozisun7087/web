(function(){
'use strict';
/* TOEFL Study Lab visitor counter v51
   Uses an image-only counter to avoid adding third-party JavaScript or credentials.
   This is a cumulative visit/page-view indicator, not an authenticated unique-user metric.
*/
const BADGE_ID='toefl-visitor-counter-v51';
const PATH='toefl-ibt-2026-study-lab.vercel.app';
function install(){
  if(document.getElementById(BADGE_ID))return;
  const hero=document.querySelector('.hero');
  if(!hero)return;
  const wrap=document.createElement('div');
  wrap.id=BADGE_ID;
  wrap.setAttribute('aria-label','網站瀏覽人次');
  wrap.style.cssText='margin-top:12px;display:flex;align-items:center;gap:8px;min-height:24px';
  const label=document.createElement('span');
  label.className='small';
  label.textContent='網站瀏覽人次';
  const img=document.createElement('img');
  img.alt='網站瀏覽人次統計';
  img.loading='eager';
  img.referrerPolicy='no-referrer';
  img.decoding='async';
  img.style.cssText='height:22px;max-width:180px;border:0';
  img.src='https://api.visitorbadge.io/api/visitors?path='+encodeURIComponent(PATH)+'&label=VISITS&labelColor=%23667085&countColor=%233157d5&style=flat';
  img.onerror=function(){wrap.style.display='none';};
  wrap.append(label,img);
  const badges=hero.querySelector('.badges');
  if(badges)badges.insertAdjacentElement('afterend',wrap);else hero.appendChild(wrap);
}
[0,80,250,700].forEach(ms=>setTimeout(install,ms));
document.addEventListener('click',()=>setTimeout(install,80),true);
})();
