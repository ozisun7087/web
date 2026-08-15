(function(){
'use strict';
/* TOEFL Study Lab Build-a-Sentence click formatting v31
   - First selected chunk is displayed with its first English letter capitalized.
   - The currently last selected chunk always ends with a period.
   - When another chunk is selected, the previous terminal period is moved to the new end.
   - Applies to Writing (ws*), Weakness (ww*), and Mock Writing (mws*).
   - Capture-phase interception prevents the older bank handler from appending the raw lowercase chunk a second time.
*/
const TARGET=/^(ws|ww|mws)\d+$/;
function clean(s){return String(s||'').trim().replace(/\s+/g,' ');}
function capitalizeFirstLetter(s){
  return String(s||'').replace(/[A-Za-z]/,m=>m.toUpperCase());
}
function formatSentence(chunks){
  if(!chunks.length)return '';
  let text=chunks.map(clean).filter(Boolean).join(' ');
  text=capitalizeFirstLetter(text);
  text=text.replace(/[,.!?;:]+\s*$/,'').trimEnd();
  return text?text+'.':'';
}
function inputForBank(bank){
  const q=bank&&bank.closest?bank.closest('.q'):null;if(!q)return null;
  return [...q.querySelectorAll('input[type="text"][id]')].find(x=>TARGET.test(x.id))||null;
}
function selectedFor(bank){
  if(!Array.isArray(bank.__v31SelectedChunks))bank.__v31SelectedChunks=[];
  return bank.__v31SelectedChunks;
}
function clearBankState(bank){
  if(bank)bank.__v31SelectedChunks=[];
}

document.addEventListener('click',function(ev){
  const target=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!target)return;

  if(target.classList&&target.classList.contains('bs-chip')){
    const bank=target.closest('.bs-bank');
    const input=inputForBank(bank);
    if(!bank||!input)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    const chunk=clean(target.dataset.chunk||target.textContent||'');
    if(!chunk)return;
    const selected=selectedFor(bank);
    selected.push(chunk);
    input.value=formatSentence(selected);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    target.disabled=true;
    target.style.opacity='.45';
    return;
  }

  if(clean(target.textContent)==='清空重排'){
    const q=target.closest('.q');
    const bank=q&&q.querySelector?q.querySelector('.bs-bank'):null;
    clearBankState(bank);
  }
},true);

/* If the user manually clears the text field, start the click sequence from the beginning too. */
document.addEventListener('input',function(ev){
  const input=ev.target;
  if(!input||!input.matches||!input.matches('input[type="text"][id]')||!TARGET.test(input.id))return;
  if(clean(input.value))return;
  const q=input.closest('.q');const bank=q&&q.querySelector?q.querySelector('.bs-bank'):null;
  clearBankState(bank);
},false);

window.__formatBuildSentenceClicksV31=true;
})();
