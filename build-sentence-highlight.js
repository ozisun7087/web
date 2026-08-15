(function(){
/* TOEFL Study Lab Build a Sentence error highlighter v11
   - When a Build a Sentence answer is incorrect, show the user's answer below the field.
   - Wrong / misplaced user tokens are red.
   - Missing positions are marked in red without automatically revealing the correct answer.
*/
const __sentenceId=/^(ws|ww|mws)\d+$/;
const __baseCheckFill=typeof window.checkFill==='function'?window.checkFill:null;

function __escSentence(s){
  return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]||m));
}
function __sentenceKey(s){
  return String(s)
    .toLowerCase()
    .replace(/[’‘]/g,"'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,'')
    .replace(/'/g,'');
}
function __sentenceTokens(text){
  return String(text||'').trim().split(/\s+/).filter(Boolean).map(raw=>({raw,key:__sentenceKey(raw)}));
}
function __sentenceOps(userText,answerText){
  const u=__sentenceTokens(userText),a=__sentenceTokens(answerText),m=u.length,n=a.length;
  const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=m-1;i>=0;i--){
    for(let j=n-1;j>=0;j--){
      dp[i][j]=(u[i].key&&u[i].key===a[j].key)?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  const out=[];let i=0,j=0;
  while(i<m||j<n){
    if(i<m&&j<n&&u[i].key&&u[i].key===a[j].key){out.push({type:'ok',raw:u[i].raw});i++;j++;continue}
    if(i<m&&(j>=n||dp[i+1][j]>=dp[i][j+1])){out.push({type:'wrong',raw:u[i].raw});i++;continue}
    if(j<n){out.push({type:'missing'});j++;continue}
  }
  return out;
}
function __sentenceBox(input){
  const q=input&&input.closest('.q');if(!q)return null;
  let box=q.querySelector('.sentence-error-map[data-for="'+input.id+'"]');
  if(!box){
    box=document.createElement('div');
    box.className='sentence-error-map';box.dataset.for=input.id;
    const feedback=q.querySelector('.feedback');
    if(feedback)feedback.insertAdjacentElement('afterend',box);else input.insertAdjacentElement('afterend',box);
  }
  return box;
}
function __clearSentenceMark(input){
  if(!input)return;
  const q=input.closest('.q');if(!q)return;
  const box=q.querySelector('.sentence-error-map[data-for="'+input.id+'"]');
  if(box)box.remove();
}
function __renderSentenceMark(input,ok){
  if(!input||!__sentenceId.test(input.id))return;
  if(ok){__clearSentenceMark(input);return}
  const box=__sentenceBox(input);if(!box)return;
  const value=input.value.trim();
  if(!value){
    box.innerHTML='<div><b>你的答案：</b> <span class="sentence-wrong-token">尚未作答</span></div><div class="small sentence-error-note">紅色表示需要修正的地方。</div>';
    return;
  }
  const ops=__sentenceOps(value,input.dataset.answer||'');
  let missingShown=false;
  const parts=[];
  for(const op of ops){
    if(op.type==='ok')parts.push('<span>'+__escSentence(op.raw)+'</span>');
    else if(op.type==='wrong')parts.push('<span class="sentence-wrong-token">'+__escSentence(op.raw)+'</span>');
    else if(op.type==='missing'&&!missingShown){parts.push('<span class="sentence-wrong-token sentence-gap">〔此處缺少字詞／順序有誤〕</span>');missingShown=true;}
  }
  box.innerHTML='<div><b>你的答案：</b> '+parts.join(' ')+'</div><div class="small sentence-error-note">紅色＝拼字、遺漏或字詞順序需要修正。修改後再按「檢查答案」。</div>';
}
function __sentenceCheck(input){
  if(!input)return false;
  const ok=__baseCheckFill?__baseCheckFill(input):(typeof norm==='function'?norm(input.value)===norm(input.dataset.answer):input.value.trim()===String(input.dataset.answer||'').trim());
  __renderSentenceMark(input,ok);
  return ok;
}

if(__baseCheckFill){
  window.checkFill=function(input){
    if(input&&__sentenceId.test(input.id))return __sentenceCheck(input);
    return __baseCheckFill(input);
  };
}

function __installSentenceHighlight(){
  document.querySelectorAll('input[type="text"][id]').forEach(input=>{
    if(!__sentenceId.test(input.id))return;
    const q=input.closest('.q');if(!q)return;
    const button=[...q.querySelectorAll('.ckfill')].find(b=>b.dataset.id===input.id);
    if(button)button.onclick=()=>__sentenceCheck(input);
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();__sentenceCheck(input)}};
    if(input.dataset.sentenceHighlightWired!=='1'){
      input.dataset.sentenceHighlightWired='1';
      input.addEventListener('input',()=>__clearSentenceMark(input));
    }
  });
}

if(!document.getElementById('sentence-error-highlight-style')){
  const st=document.createElement('style');st.id='sentence-error-highlight-style';
  st.textContent='.sentence-error-map{margin-top:8px;padding:9px 10px;border-radius:9px;background:#fff7f6;border:1px solid #efc7c2;line-height:1.75}.sentence-wrong-token{color:#b42318;font-weight:900}.sentence-gap{white-space:nowrap}.sentence-error-note{margin-top:3px;color:#9f241b}';
  document.head.appendChild(st);
}

if(typeof window.render==='function'){
  const __sentenceRender=window.render;
  window.render=function(){const r=__sentenceRender.apply(this,arguments);setTimeout(__installSentenceHighlight,0);return r;};
}
if(typeof window.mockPart==='function'){
  const __sentenceMockPart=window.mockPart;
  window.mockPart=function(){const r=__sentenceMockPart.apply(this,arguments);setTimeout(__installSentenceHighlight,0);return r;};
}
setTimeout(__installSentenceHighlight,0);setTimeout(__installSentenceHighlight,250);
})();
