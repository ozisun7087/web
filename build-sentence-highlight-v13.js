(function(){
'use strict';
/* TOEFL Study Lab Build a Sentence error highlighter v13
   Robust delegated-event version. It survives render()/wire() rebinding.
*/
const SENTENCE_ID=/^(ws|ww|mws)\d+$/;

function esc(s){
  return String(s).replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m;});
}
function key(s){
  return String(s||'').toLowerCase().replace(/[’‘]/g,"'").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,'').replace(/'/g,'');
}
function tokens(text){
  return String(text||'').trim().split(/\s+/).filter(Boolean).map(function(raw){return {raw:raw,key:key(raw)};});
}
function normalized(s){
  return String(s||'').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?;:]/g,'').replace(/\s+/g,' ');
}
function isCorrect(input){
  return normalized(input.value)===normalized(input.dataset.answer||'');
}

/* Longest-common-subsequence alignment.
   Correctly positioned tokens remain normal; moved/extra tokens become red.
   Missing answer positions get a red placeholder without revealing the answer. */
function diffOps(userText,answerText){
  const u=tokens(userText),a=tokens(answerText),m=u.length,n=a.length;
  const dp=Array.from({length:m+1},function(){return Array(n+1).fill(0);});
  for(let i=m-1;i>=0;i--){
    for(let j=n-1;j>=0;j--){
      dp[i][j]=(u[i].key&&u[i].key===a[j].key)?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    }
  }
  const out=[];let i=0,j=0;
  while(i<m||j<n){
    if(i<m&&j<n&&u[i].key&&u[i].key===a[j].key){out.push({type:'ok',raw:u[i].raw});i++;j++;continue;}
    if(i<m&&(j>=n||dp[i+1][j]>=dp[i][j+1])){out.push({type:'wrong',raw:u[i].raw});i++;continue;}
    if(j<n){out.push({type:'missing'});j++;continue;}
  }
  return out;
}
function getBox(input){
  const q=input.closest('.q');if(!q)return null;
  let box=q.querySelector('.sentence-error-map[data-for="'+input.id+'"]');
  if(!box){
    box=document.createElement('div');
    box.className='sentence-error-map';
    box.dataset.for=input.id;
    input.insertAdjacentElement('afterend',box);
  }
  return box;
}
function clearMark(input){
  if(!input)return;
  const q=input.closest('.q');if(!q)return;
  const box=q.querySelector('.sentence-error-map[data-for="'+input.id+'"]');
  if(box)box.remove();
}
function renderMark(input){
  if(!input||!SENTENCE_ID.test(input.id))return;
  if(isCorrect(input)){clearMark(input);return;}
  const box=getBox(input);if(!box)return;
  const value=input.value.trim();
  if(!value){
    box.innerHTML='<div><b>你的答案：</b> <span class="sentence-wrong-token">尚未作答</span></div><div class="sentence-error-note">紅色表示需要修正的地方。</div>';
    return;
  }
  const ops=diffOps(value,input.dataset.answer||'');
  const parts=[];
  let gapOpen=false;
  for(const op of ops){
    if(op.type==='ok'){
      gapOpen=false;
      parts.push('<span class="sentence-ok-token">'+esc(op.raw)+'</span>');
    }else if(op.type==='wrong'){
      gapOpen=false;
      parts.push('<span class="sentence-wrong-token">'+esc(op.raw)+'</span>');
    }else if(op.type==='missing'&&!gapOpen){
      gapOpen=true;
      parts.push('<span class="sentence-wrong-token sentence-gap">〔此處缺少／順序不對〕</span>');
    }
  }
  box.innerHTML='<div class="sentence-user-line"><b>你的答案：</b> '+parts.join(' ')+'</div><div class="sentence-error-note">紅色＝這個字詞的位置、拼字，或此處的字詞有問題。請修改後再按「檢查答案」。</div>';
}
function inputFromButton(btn){
  if(!btn)return null;
  const id=btn.dataset&&btn.dataset.id;
  if(id&&SENTENCE_ID.test(id))return document.getElementById(id);
  const q=btn.closest&&btn.closest('.q');
  return q?q.querySelector('input[type="text"][id]'):null;
}
function afterOriginalCheck(input){
  /* Run after the site's own checkFill/onClick handler has completed. */
  setTimeout(function(){renderMark(input);},0);
}

/* Capture phase means this listener survives any later .onclick reassignment by wire(). */
document.addEventListener('click',function(ev){
  const btn=ev.target&&ev.target.closest?ev.target.closest('.ckfill'):null;
  if(!btn)return;
  const input=inputFromButton(btn);
  if(input&&SENTENCE_ID.test(input.id))afterOriginalCheck(input);
},true);

document.addEventListener('keydown',function(ev){
  const input=ev.target;
  if(ev.key==='Enter'&&input&&input.matches&&input.matches('input[type="text"][id]')&&SENTENCE_ID.test(input.id)){
    afterOriginalCheck(input);
  }
},true);

document.addEventListener('input',function(ev){
  const input=ev.target;
  if(input&&input.matches&&input.matches('input[type="text"][id]')&&SENTENCE_ID.test(input.id))clearMark(input);
},true);

/* As an additional safeguard, watch newly rendered Writing/Mock content. */
new MutationObserver(function(){
  document.querySelectorAll('input[type="text"][id]').forEach(function(input){
    if(SENTENCE_ID.test(input.id))input.dataset.sentenceHighlightV13='1';
  });
}).observe(document.documentElement,{childList:true,subtree:true});

if(!document.getElementById('sentence-error-highlight-style-v13')){
  const st=document.createElement('style');
  st.id='sentence-error-highlight-style-v13';
  st.textContent='\n.sentence-error-map{margin:7px 0 8px;padding:10px 12px;border-radius:10px;background:#fff4f2;border:1px solid #f0b8b1;line-height:1.8;font-size:1rem}\n.sentence-user-line{overflow-wrap:anywhere}\n.sentence-wrong-token{color:#c01818!important;font-weight:900!important;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}\n.sentence-ok-token{color:inherit}\n.sentence-gap{display:inline-block;white-space:nowrap}\n.sentence-error-note{margin-top:4px;color:#a3261d;font-size:.86rem;font-weight:700}\n';
  document.head.appendChild(st);
}
})();
