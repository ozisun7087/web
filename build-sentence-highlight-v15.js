(function(){
'use strict';
/* TOEFL Study Lab Build a Sentence checker v15
   Authoritative checker: it intercepts Build-a-Sentence checks before the legacy
   checkFill() can ignore capitalization and punctuation.
*/
const SENTENCE_ID=/^(ws|ww|mws)\d+$/;

function esc(s){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));}
function apostrophe(s){return String(s||'').replace(/[’‘]/g,"'");}
function units(text){
  const s=apostrophe(text),out=[];
  const re=/[A-Za-z]+(?:'[A-Za-z]+)*|\d+(?:\.\d+)?|[.,!?;:]/g;
  let m;
  while((m=re.exec(s))){
    const raw=m[0],kind=/^[.,!?;:]$/.test(raw)?'punct':'word';
    out.push({raw,kind});
  }
  return out;
}
function exactKey(u){return u.kind+':'+apostrophe(u.raw);}
function semanticKey(u){
  if(u.kind==='punct')return 'p:'+u.raw;
  return 'w:'+apostrophe(u.raw).toLowerCase().replace(/'/g,'');
}
function strictCorrect(input){
  const u=units(input.value),a=units(input.dataset.answer||'');
  if(u.length!==a.length)return false;
  for(let i=0;i<u.length;i++)if(exactKey(u[i])!==exactKey(a[i]))return false;
  return true;
}
function classify(u,a){
  const ur=apostrophe(u.raw),ar=apostrophe(a.raw);
  if(ur===ar)return 'ok';
  if(u.kind==='word'&&ur.toLowerCase()===ar.toLowerCase())return 'case';
  return 'wrong';
}
function diffOps(userText,answerText){
  const u=units(userText),a=units(answerText),m=u.length,n=a.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=m-1;i>=0;i--){
    for(let j=n-1;j>=0;j--){
      dp[i][j]=semanticKey(u[i])===semanticKey(a[j])?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  const out=[];let i=0,j=0;
  while(i<m||j<n){
    if(i<m&&j<n&&semanticKey(u[i])===semanticKey(a[j])){
      out.push({type:classify(u[i],a[j]),raw:u[i].raw,kind:u[i].kind});i++;j++;continue;
    }
    if(i<m&&(j>=n||dp[i+1][j]>=dp[i][j+1])){
      out.push({type:u[i].kind==='punct'?'punct':'wrong',raw:u[i].raw,kind:u[i].kind});i++;continue;
    }
    if(j<n){out.push({type:'missing',kind:a[j].kind});j++;continue;}
  }
  return out;
}
function clearOld(input){
  const q=input&&input.closest('.q');if(!q)return;
  q.querySelectorAll('.sentence-error-map,.sentence-error-map-v14,.sentence-error-map-v15').forEach(x=>x.remove());
}
function feedback(input,ok){
  const q=input.closest('.q'),f=q&&q.querySelector('.feedback');if(!f)return;
  f.className='feedback show '+(ok?'ok':'no');
  f.textContent=ok?'✓ 正確（字詞、順序、大小寫與標點皆正確）':'✗ 再檢查一次（字詞、順序、大小寫與標點都會計入）';
}
function resultBox(input){
  clearOld(input);
  const box=document.createElement('div');
  box.className='sentence-error-map-v15';
  box.dataset.for=input.id;
  input.insertAdjacentElement('afterend',box);
  return box;
}
function renderErrors(input){
  const box=resultBox(input),ops=diffOps(input.value,input.dataset.answer||'');
  if(!input.value.trim()){
    box.innerHTML='<b>你的答案：</b> <span class="s15-error">尚未作答</span>';
    return;
  }
  const parts=[];let prevKind='';
  for(const op of ops){
    let h='',kind=op.kind||'';
    if(op.type==='missing'){
      h='<span class="s15-error s15-gap">'+(op.kind==='punct'?'〔缺少標點〕':'〔此處缺少／順序不對〕')+'</span>';
      kind='gap';
    }else{
      let cls='s15-ok',title='';
      if(op.type==='case'){cls='s15-error';title=' title="大小寫錯誤"';}
      else if(op.type==='punct'){cls='s15-error';title=' title="標點錯誤"';}
      else if(op.type==='wrong'){cls='s15-error';title=' title="拼字、字詞或順序錯誤"';}
      h='<span class="'+cls+'"'+title+'>'+esc(op.raw)+'</span>';
    }
    const noSpace=(op.kind==='punct'&&/^[.,!?;:]$/.test(op.raw||''));
    if(parts.length&&!noSpace&&prevKind!=='gap')parts.push(' ');
    parts.push(h);prevKind=kind;
  }
  box.innerHTML='<div><b>你的答案：</b> '+parts.join('')+'</div>'+
    '<div class="s15-note"><span class="s15-error">紅色</span>＝需要修正。系統會檢查拼字、字詞順序、<b>大小寫</b>與<b>標點符號</b>。</div>';
}
function runStrictCheck(input){
  if(!input||!SENTENCE_ID.test(input.id))return false;
  const ok=strictCorrect(input);
  clearOld(input);feedback(input,ok);
  if(!ok)renderErrors(input);
  return ok;
}
function inputFromButton(btn){
  const id=btn&&btn.dataset&&btn.dataset.id;
  if(id&&SENTENCE_ID.test(id))return document.getElementById(id);
  const q=btn&&btn.closest&&btn.closest('.q');
  return q?q.querySelector('input[type="text"][id]'):null;
}

/* IMPORTANT: capture phase + stopImmediatePropagation makes this checker authoritative.
   The site's legacy onclick/checkFill() never runs for Build-a-Sentence questions. */
document.addEventListener('click',function(ev){
  const btn=ev.target&&ev.target.closest?ev.target.closest('.ckfill'):null;
  if(!btn)return;
  const input=inputFromButton(btn);
  if(!input||!SENTENCE_ID.test(input.id))return;
  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();
  runStrictCheck(input);
},true);

document.addEventListener('keydown',function(ev){
  const input=ev.target;
  if(ev.key!=='Enter'||!input||!input.matches||!input.matches('input[type="text"][id]')||!SENTENCE_ID.test(input.id))return;
  ev.preventDefault();
  ev.stopPropagation();
  ev.stopImmediatePropagation();
  runStrictCheck(input);
},true);

document.addEventListener('input',function(ev){
  const input=ev.target;
  if(input&&input.matches&&input.matches('input[type="text"][id]')&&SENTENCE_ID.test(input.id))clearOld(input);
},true);

/* Keep Writing raw sentence scoring consistent with the strict checker. */
window.__strictBuildSentenceCorrectV15=strictCorrect;

if(!document.getElementById('sentence-error-highlight-style-v15')){
  const st=document.createElement('style');st.id='sentence-error-highlight-style-v15';
  st.textContent='.sentence-error-map-v15{margin:7px 0 8px;padding:10px 12px;border-radius:10px;background:#fff4f2;border:1px solid #f0b8b1;line-height:1.8;overflow-wrap:anywhere}.s15-error{color:#c01818!important;font-weight:900!important;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}.s15-ok{color:inherit}.s15-gap{display:inline-block;white-space:nowrap}.s15-note{margin-top:5px;color:#8f2b24;font-size:.86rem}';
  document.head.appendChild(st);
}
})();
