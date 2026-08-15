(function(){
'use strict';
/* TOEFL Study Lab Build a Sentence checker v14
   - Case-sensitive.
   - Punctuation-sensitive (straight/curly apostrophes are equivalent).
   - Word order / spelling / omissions are checked.
   - Incorrect user locations are highlighted in red by category.
   - Delegated events survive render()/wire() rebinding.
*/
const SENTENCE_ID=/^(ws|ww|mws)\d+$/;

function esc(s){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]||m));}
function apostrophe(s){return String(s||'').replace(/[’‘]/g,"'");}
function units(text){
  const s=apostrophe(text),out=[];
  const re=/[A-Za-z]+(?:'[A-Za-z]+)*|\d+(?:\.\d+)?|[.,!?;:]/g;
  let m;
  while((m=re.exec(s))){
    const raw=m[0],isP=/^[.,!?;:]$/.test(raw);
    out.push({raw,kind:isP?'punct':'word'});
  }
  return out;
}
function semanticKey(u){
  if(u.kind==='punct')return 'p:'+u.raw;
  return 'w:'+u.raw.toLowerCase().replace(/'/g,'');
}
function exactKey(u){return u.kind+':'+apostrophe(u.raw);}
function strictCorrect(input){
  const u=units(input.value),a=units(input.dataset.answer||'');
  if(u.length!==a.length)return false;
  for(let i=0;i<u.length;i++)if(exactKey(u[i])!==exactKey(a[i]))return false;
  return true;
}
function classifyMatched(u,a){
  const ur=apostrophe(u.raw),ar=apostrophe(a.raw);
  if(ur===ar)return 'ok';
  if(ur.toLowerCase()===ar.toLowerCase())return 'case';
  if(ur.toLowerCase().replace(/'/g,'')===ar.toLowerCase().replace(/'/g,''))return 'punct';
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
      out.push({type:classifyMatched(u[i],a[j]),raw:u[i].raw,kind:u[i].kind});i++;j++;continue;
    }
    if(i<m&&(j>=n||dp[i+1][j]>=dp[i][j+1])){out.push({type:'wrong',raw:u[i].raw,kind:u[i].kind});i++;continue;}
    if(j<n){out.push({type:'missing',kind:a[j].kind});j++;continue;}
  }
  return out;
}
function getBox(input){
  const q=input.closest('.q');if(!q)return null;
  let box=q.querySelector('.sentence-error-map-v14[data-for="'+input.id+'"]');
  if(!box){box=document.createElement('div');box.className='sentence-error-map-v14';box.dataset.for=input.id;input.insertAdjacentElement('afterend',box);}
  return box;
}
function clearMark(input){
  if(!input)return;const q=input.closest('.q');if(!q)return;
  q.querySelectorAll('.sentence-error-map-v14[data-for="'+input.id+'"],.sentence-error-map[data-for="'+input.id+'"]').forEach(x=>x.remove());
}
function setFeedback(input,ok){
  const q=input.closest('.q');if(!q)return;
  const f=q.querySelector('.feedback');if(!f)return;
  f.className='feedback show '+(ok?'ok':'no');
  f.textContent=ok?'✓ 正確（大小寫、標點與字詞順序皆正確）':'✗ 再檢查一次（大小寫、標點與字詞順序都會計入）';
}
function opHtml(op,first,prevKind){
  if(op.type==='missing'){
    const label=op.kind==='punct'?'〔缺少／標點不對〕':'〔此處缺少／順序不對〕';
    return {html:'<span class="sentence-v14-error sentence-v14-gap">'+label+'</span>',kind:'gap'};
  }
  let cls='sentence-v14-ok',title='';
  if(op.type==='case'){cls='sentence-v14-error sentence-v14-case';title=' title="大小寫錯誤"';}
  else if(op.type==='punct'){cls='sentence-v14-error sentence-v14-punct';title=' title="標點符號錯誤"';}
  else if(op.type==='wrong'){cls='sentence-v14-error sentence-v14-word';title=' title="字詞、拼字或順序錯誤"';}
  const token='<span class="'+cls+'"'+title+'>'+esc(op.raw)+'</span>';
  return {html:token,kind:op.kind};
}
function renderOps(ops){
  let htmlOut='',prevKind=null,first=true;
  for(const op of ops){
    const rendered=opHtml(op,first,prevKind);
    const noSpaceBefore=op.kind==='punct';
    if(!first&&!noSpaceBefore)htmlOut+=' ';
    htmlOut+=rendered.html;
    prevKind=rendered.kind;first=false;
  }
  return htmlOut;
}
function renderMark(input){
  if(!input||!SENTENCE_ID.test(input.id))return;
  const ok=strictCorrect(input);setFeedback(input,ok);
  if(ok){clearMark(input);return;}
  clearMark(input);
  const box=getBox(input);if(!box)return;
  const value=input.value.trim();
  if(!value){
    box.innerHTML='<div><b>你的答案：</b> <span class="sentence-v14-error">尚未作答</span></div><div class="sentence-v14-note">紅色表示需要修正。</div>';return;
  }
  const ops=diffOps(value,input.dataset.answer||'');
  const hasCase=ops.some(x=>x.type==='case'),hasPunct=ops.some(x=>x.type==='punct'||(x.type==='missing'&&x.kind==='punct')||(x.type==='wrong'&&x.kind==='punct'));
  const hasWord=ops.some(x=>x.type==='wrong'&&x.kind!=='punct'||x.type==='missing'&&x.kind!=='punct');
  const cats=[];if(hasWord)cats.push('字詞／拼字／順序');if(hasCase)cats.push('大小寫');if(hasPunct)cats.push('標點');
  box.innerHTML='<div class="sentence-v14-user"><b>你的答案：</b> '+renderOps(ops)+'</div><div class="sentence-v14-note">紅色＝需要修正'+(cats.length?'（'+cats.join('、')+'）':'')+'。滑鼠停在紅字上可看錯誤類型。</div>';
}
function inputFromButton(btn){
  const id=btn&&btn.dataset&&btn.dataset.id;if(id&&SENTENCE_ID.test(id))return document.getElementById(id);
  const q=btn&&btn.closest?btn.closest('.q'):null;return q?q.querySelector('input[type="text"][id]'):null;
}
function afterOriginal(input){setTimeout(()=>renderMark(input),0);}

document.addEventListener('click',ev=>{
  const btn=ev.target&&ev.target.closest?ev.target.closest('.ckfill'):null;if(!btn)return;
  const input=inputFromButton(btn);if(input&&SENTENCE_ID.test(input.id))afterOriginal(input);
},true);
document.addEventListener('keydown',ev=>{
  const input=ev.target;if(ev.key==='Enter'&&input&&input.matches&&input.matches('input[type="text"][id]')&&SENTENCE_ID.test(input.id))afterOriginal(input);
},true);
document.addEventListener('input',ev=>{
  const input=ev.target;if(input&&input.matches&&input.matches('input[type="text"][id]')&&SENTENCE_ID.test(input.id))clearMark(input);
},true);

/* Make Writing total use the same strict Build-a-Sentence rule. */
function strictSentenceCount(prefix){
  let total=0,correct=0;
  document.querySelectorAll('input[type="text"][id^="'+prefix+'"]').forEach(input=>{if(SENTENCE_ID.test(input.id)){total++;if(strictCorrect(input))correct++;}});
  return{total,correct};
}
window.toeflStrictSentenceCorrect=strictCorrect;
window.scoreWriting=function(){
  const regular=document.getElementById('wemail')||document.getElementById('wdisc');
  if(!regular)return;
  const e=document.getElementById('wemail'),d=document.getElementById('wdisc');
  if(e&&!e.dataset.autoScore&&typeof window.gradeToeflWritingV12==='function')window.gradeToeflWritingV12('wemail');
  if(d&&!d.dataset.autoScore&&typeof window.gradeToeflWritingV12==='function')window.gradeToeflWritingV12('wdisc');
  if(!e||!d||e.dataset.autoScore==null||d.dataset.autoScore==null)return;
  const c=strictSentenceCount('ws');
  const raw=c.correct+Number(e.dataset.autoScore)+Number(d.dataset.autoScore);
  const band=Math.round((1+5*raw/20)*2)/2;
  const out=document.getElementById('wscore');if(out)out.textContent='Writing raw '+raw+'/20｜Build a Sentence '+c.correct+'/'+c.total+'（含大小寫與標點）｜站內練習估分約 '+band.toFixed(1)+'（非 ETS 正式換算）';
};

if(!document.getElementById('sentence-error-highlight-style-v14')){
  const st=document.createElement('style');st.id='sentence-error-highlight-style-v14';
  st.textContent='\n.sentence-error-map-v14{margin:7px 0 8px;padding:10px 12px;border-radius:10px;background:#fff4f2;border:1px solid #f0b8b1;line-height:1.85;font-size:1rem}\n.sentence-v14-user{overflow-wrap:anywhere}\n.sentence-v14-error{color:#c01818!important;font-weight:900!important;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}\n.sentence-v14-case{background:#fff0ef;border-radius:3px;padding:0 1px}\n.sentence-v14-punct{background:#ffe8e5;border-radius:3px;padding:0 1px}\n.sentence-v14-ok{color:inherit}\n.sentence-v14-gap{display:inline-block;white-space:nowrap;margin:0 2px}\n.sentence-v14-note{margin-top:4px;color:#a3261d;font-size:.86rem;font-weight:700}\n';
  document.head.appendChild(st);
}
})();
