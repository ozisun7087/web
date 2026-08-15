(function(){
'use strict';
/* TOEFL Study Lab Speaking transcript reveal v21
   - Adds a 顯示答案 button to every Speaking question.
   - Clicking it copies the exact text used by that question's playback button into the recording transcript textarea.
   - Existing transcript content is replaced, not appended.
   - Any latest score tied to the overwritten user response is cleared to avoid misleading grading.
   - No MutationObserver and no mockPart/render wrapping, preserving v20 stability mode.
*/

function clean(s){return String(s||'').trim();}
function byId(id){return document.getElementById(id);}

function speakingCards(root){
  if(!root||!root.querySelectorAll)return [];
  return [...root.querySelectorAll('.q')].filter(q=>q.querySelector('button.splay[data-text]')&&q.querySelector('button.record[data-id]'));
}

function install(root){
  speakingCards(root||document).forEach(q=>{
    const play=q.querySelector('button.splay[data-text]');
    const rec=q.querySelector('button.record[data-id]');
    if(!play||!rec)return;
    const id=clean(rec.dataset.id);
    if(!id||!byId(id+'tx'))return;
    if(q.querySelector('.speaking-show-answer-v21[data-id="'+id+'"]'))return;

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='ghost speaking-show-answer-v21';
    btn.dataset.id=id;
    btn.textContent='顯示答案';
    btn.title='顯示此題播放音檔的逐字稿，並覆蓋錄音逐字稿欄位';

    const audio=play.closest('.audio');
    if(audio)play.insertAdjacentElement('afterend',btn);
    else play.insertAdjacentElement('afterend',btn);
  });
}

function clearStaleScore(id,q){
  const score=byId(id+'score');
  if(score){score.value='';try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+score.id,'');}catch(e){}}

  /* Listen and Repeat auto-result box. */
  const auto=byId(id+'auto');
  if(auto){
    auto.classList.add('speaking-auto-latest');
    auto.innerHTML='<span class="small">已顯示參考逐字稿；先前作答分數已清除。請重新錄音後取得新的自動分數。</span>';
  }

  /* Take an Interview has an additional holistic rubric select. Clear it too because the response textarea was overwritten by the question transcript. */
  const rubric=q&&q.querySelector('details select');
  if(rubric){rubric.value='';try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+rubric.id,'');}catch(e){}}
}

function reveal(btn){
  const q=btn.closest('.q');if(!q)return;
  const id=clean(btn.dataset.id);
  const play=q.querySelector('button.splay[data-text]');
  const ta=byId(id+'tx');
  if(!play||!ta)return;

  const transcript=String(play.dataset.text||'');
  ta.value=transcript;
  try{if(typeof safe!=='undefined'&&safe.set)safe.set('v-'+ta.id,transcript);}catch(e){}
  /* Fire input so any existing persistence / invalidation code sees the replacement. */
  ta.dispatchEvent(new Event('input',{bubbles:true}));
  clearStaleScore(id,q);

  const status=byId(id+'st');
  if(status)status.textContent='已顯示此題音檔逐字稿，並覆蓋原內容';
}

document.addEventListener('click',function(ev){
  const revealBtn=ev.target&&ev.target.closest?ev.target.closest('.speaking-show-answer-v21'):null;
  if(revealBtn){
    ev.preventDefault();
    reveal(revealBtn);
    return;
  }

  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;
  if(!b)return;
  const opensSpeaking=b.dataset&&b.dataset.t==='Speaking';
  const opensMockSpeaking=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(!opensSpeaking&&!opensMockSpeaking)return;
  setTimeout(function(){
    install(opensMockSpeaking?byId('mock'):byId('content'));
  },0);
},false);

/* Covers Speaking being the initial active tab when the page first loads. */
setTimeout(function(){install(document);},0);
setTimeout(function(){install(document);},250);

if(!document.getElementById('speaking-show-answer-v21-style')){
  const st=document.createElement('style');
  st.id='speaking-show-answer-v21-style';
  st.textContent='.speaking-show-answer-v21{flex:0 0 auto}.audio .speaking-show-answer-v21{margin-left:0}';
  document.head.appendChild(st);
}
})();
