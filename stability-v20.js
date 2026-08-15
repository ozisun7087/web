(function(){
'use strict';
/* TOEFL Study Lab stability v20
   - Mock Speaking bypasses layered mockPart wrappers and uses the original renderer.
   - Writing auto-grade UI is initialized explicitly; no MutationObserver is needed.
*/
const baseMock=window.__toeflBaseMockPartV20;
const patchedMock=window.mockPart;

function writingMap(){return {wemail:'erub',wdisc:'drub',mwemail:'mwer',mwdisc:'mwdr'};}
function installWritingOne(id,scoreId){
  const ta=document.getElementById(id);if(!ta)return;
  const sel=document.getElementById(scoreId);
  if(sel){const d=sel.closest('details');if(d)d.style.display='none';}
  if(ta.dataset.v20AutoGrade==='1')return;
  ta.dataset.v20AutoGrade='1';
  let result=document.getElementById(id+'-auto-result');
  const wrap=document.createElement('div');wrap.className='auto-grade-actions';wrap.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px';
  const btn=document.createElement('button');btn.type='button';btn.textContent='評分';btn.className='auto-grade-btn';
  btn.addEventListener('click',function(){if(typeof window.gradeToeflWritingV12==='function')window.gradeToeflWritingV12(id);});
  const note=document.createElement('span');note.className='small';note.textContent='按下後立即模擬 TOEFL iBT Writing 0–5 評分。';
  wrap.append(btn,note);
  if(!result){result=document.createElement('div');result.id=id+'-auto-result';result.className='score';result.style.display='none';}
  ta.insertAdjacentElement('afterend',wrap);wrap.insertAdjacentElement('afterend',result);
  ta.addEventListener('input',function(){
    delete ta.dataset.autoScore;
    if(sel)sel.value='';
    if(result){result.style.display='block';result.innerHTML='<span class="small">內容已修改，請重新按「評分」。</span>';}
  });
}
function installWritingUI(){const m=writingMap();Object.keys(m).forEach(id=>installWritingOne(id,m[id]));}

/* Most important safety fix: Mock Speaking does NOT traverse the Reading/Writing mock wrapper chain. */
if(typeof baseMock==='function'&&typeof patchedMock==='function'){
  window.mockPart=function(p){
    if(p==='ms'){
      return baseMock.apply(this,arguments);
    }
    const r=patchedMock.apply(this,arguments);
    if(p==='mw')setTimeout(installWritingUI,0);
    return r;
  };
}

/* Explicit initialization only on relevant user actions. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  if(b.dataset&&b.dataset.t==='Writing')setTimeout(installWritingUI,0);
  if(/mockPart\(['\"]mw['\"]\)/.test(String(b.getAttribute('onclick')||'')))setTimeout(installWritingUI,0);
},false);
setTimeout(installWritingUI,0);

/* Lightweight heartbeat for debugging/recovery; no DOM polling. */
window.__toeflV20Ready=true;
})();
