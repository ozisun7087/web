(function(){
'use strict';
/* TOEFL Study Lab Build-a-Sentence clickable-bank shuffle v28
   - The clickable word/phrase chips themselves are shuffled, not only the slash prompt.
   - Applies to Writing (ws*), Weakness (ww*), and Mock Writing (mws*).
   - Guarantees the chip sequence is not already the complete answer order.
   - No MutationObserver; preserves the site's stability mode.
*/
const TARGET=/^(ws|ww|mws)\d+$/;

function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function norm(s){return clean(s).toLowerCase().replace(/[.,!?;:'“”‘’"()]/g,'').replace(/\s+/g,' ');}
function randInt(max){
  if(max<=1)return 0;
  try{
    if(window.crypto&&crypto.getRandomValues){
      const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%max;
    }
  }catch(e){}
  return Math.floor(Math.random()*max);
}
function shuffled(a){
  const out=a.slice();
  for(let i=out.length-1;i>0;i--){const j=randInt(i+1);[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function sameOrder(a,b){return a.length===b.length&&a.every((x,i)=>norm(x)===norm(b[i]));}
function isAnswerOrder(chunks,answer){return norm(chunks.join(' '))===norm(answer);}
function forceScramble(chunks,answer){
  const original=chunks.slice();
  if(original.length<2)return original;
  let out=original.slice();
  for(let tries=0;tries<10;tries++){
    out=shuffled(original);
    if(!sameOrder(out,original)&&!isAnswerOrder(out,answer))return out;
  }
  /* Deterministic fallback: rotate until both conditions are satisfied. */
  for(let shift=1;shift<original.length;shift++){
    out=original.slice(shift).concat(original.slice(0,shift));
    if(!sameOrder(out,original)&&!isAnswerOrder(out,answer))return out;
  }
  return original.slice().reverse();
}
function promptFor(q){
  if(!q)return null;
  const first=q.firstElementChild;
  if(first&&String(first.textContent||'').includes('/'))return first;
  return [...q.children].find(x=>String(x.textContent||'').includes('/')&&!x.classList.contains('bs-bank'))||null;
}
function chunksFromPrompt(prompt){
  if(!prompt)return[];
  const shown=clean(prompt.textContent||'');
  if(!shown.includes('/'))return[];
  return shown.split('/').map(clean).filter(Boolean);
}
function makeChip(text,i){
  const b=document.createElement('button');
  b.type='button';b.className='ghost bs-chip';b.dataset.chunk=text;b.dataset.index=String(i);
  b.style.cssText='min-height:38px;padding:6px 10px';b.textContent=text;return b;
}
function wireBank(bank,input){
  if(bank.dataset.v28wired==='1')return;
  bank.dataset.v28wired='1';
  bank.addEventListener('click',function(e){
    const b=e.target&&e.target.closest?e.target.closest('.bs-chip'):null;if(!b||!bank.contains(b))return;
    const c=clean(b.dataset.chunk||b.textContent||'');if(!c)return;
    input.value=(clean(input.value)?clean(input.value)+' ':'')+c;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    b.disabled=true;b.style.opacity='.45';
  });
}
function ensureReset(bank,input){
  const q=input.closest('.q');if(!q)return;
  let reset=[...q.querySelectorAll('button')].find(b=>clean(b.textContent)==='清空重排');
  if(reset)return;
  reset=document.createElement('button');reset.type='button';reset.className='ghost';reset.textContent='清空重排';reset.style.marginBottom='8px';
  reset.addEventListener('click',function(){
    input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
    bank.querySelectorAll('.bs-chip').forEach(b=>{b.disabled=false;b.style.opacity='1';});
  });
  bank.insertAdjacentElement('afterend',reset);
}
function buildMissingBank(input,prompt,chunks){
  const q=input.closest('.q');if(!q||chunks.length<2)return null;
  const bank=document.createElement('div');bank.className='bs-bank';bank.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 9px';
  const order=forceScramble(chunks,input.dataset.answer||'');
  order.forEach((c,i)=>bank.appendChild(makeChip(c,i)));
  const note=document.createElement('div');note.className='small bs-v28-note';note.textContent='2026 Build a Sentence：點選已打亂的字詞／片語，重組成完整句子。';
  input.insertAdjacentElement('beforebegin',bank);bank.insertAdjacentElement('beforebegin',note);
  wireBank(bank,input);ensureReset(bank,input);bank.dataset.v28shuffled='1';
  return bank;
}
function shuffleExistingBank(bank,input){
  if(!bank||bank.dataset.v28shuffled==='1')return;
  const buttons=[...bank.querySelectorAll('.bs-chip')];if(buttons.length<2)return;
  const chunks=buttons.map(b=>clean(b.dataset.chunk||b.textContent||''));
  const order=forceScramble(chunks,input.dataset.answer||'');
  const used=new Set();
  order.forEach(c=>{
    const idx=buttons.findIndex((b,i)=>!used.has(i)&&norm(b.dataset.chunk||b.textContent||'')===norm(c));
    if(idx>=0){used.add(idx);bank.appendChild(buttons[idx]);}
  });
  buttons.forEach((b,i)=>{if(!used.has(i))bank.appendChild(b);});
  bank.dataset.v28shuffled='1';
  /* Existing v17 banks already have a click handler; missing banks are wired below. */
}
function installOne(input){
  if(!input||!TARGET.test(input.id))return;
  const q=input.closest('.q');if(!q)return;
  const prompt=promptFor(q);if(!prompt)return;
  const chunks=chunksFromPrompt(prompt);if(chunks.length<2)return;
  let bank=q.querySelector('.bs-bank');
  if(!bank)bank=buildMissingBank(input,prompt,chunks);
  else shuffleExistingBank(bank,input);
  if(bank){
    /* If this bank was created by v28, ensure its own click behavior is present. */
    if(bank.querySelector('.bs-v28-owned'))wireBank(bank,input);
    const order=[...bank.querySelectorAll('.bs-chip')].map(b=>clean(b.dataset.chunk||b.textContent||''));
    if(isAnswerOrder(order,input.dataset.answer||'')){
      bank.dataset.v28shuffled='';shuffleExistingBank(bank,input);
    }
  }
}
function install(root){
  const host=root&&root.querySelectorAll?root:document;
  host.querySelectorAll('input[type="text"][id]').forEach(installOne);
}
function scanSoon(){setTimeout(()=>install(document),0);setTimeout(()=>install(document),60);setTimeout(()=>install(document),180);}

document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const tab=b.classList&&b.classList.contains('tab');
  const mock=/mockPart\(['\"]mw['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(tab||mock)scanSoon();
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scanSoon,{once:true});else scanSoon();

window.__shuffleBuildSentenceBanksV28=function(){install(document);};
})();
