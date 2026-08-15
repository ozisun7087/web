(function(){
'use strict';
/* TOEFL Study Lab v40
   Speaking only: when there is no completed Speaking record before today,
   force the baseline to foundation/simple for both normal and Mock Speaking.
   Reading/Listening/Writing defaults are unchanged.
*/
const HIST_KEY='toefl-adaptive-history-v33';
const REP_FOUND=[
  'The seminar begins at nine.',
  'Please submit the proposal by Friday.',
  'Residents discussed the redevelopment plan.',
  'The study examines housing policy.',
  'Redevelopment can disrupt social networks.',
  'Affordable housing can help residents remain nearby.',
  'Researchers combine data with interviews.'
];
const INT_FOUND=[
  'What kind of neighborhood do you prefer, and why?',
  'Should cities preserve old buildings? Why or why not?',
  'Name one change that could improve your community.',
  'What can planners learn from residents?'
];
function dateKey(d){d=d||new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}
function history(){try{const x=JSON.parse(localStorage.getItem(HIST_KEY)||'{}');return x&&typeof x==='object'?x:{};}catch(e){return {};}}
function hasPriorSpeaking(){
  const h=history(),arr=Array.isArray(h.Speaking)?h.Speaking:[],today=dateKey();
  return arr.some(x=>x&&x.date&&String(x.date)<today&&Number.isFinite(Number(x.accuracy)));
}
function indexOfRecord(rec){const m=String(rec&&rec.dataset&&rec.dataset.id||'').match(/(\d+)$/);return m?Number(m[1]):0;}
function forceSimple(root){
  if(!root||hasPriorSpeaking())return;
  const note=root.querySelector('.adaptive-tier-v33');
  if(note){
    note.innerHTML='<b>今日難度：基礎（簡單）</b><br><span class="small">無前次 Speaking 紀錄，使用簡單基準。完成今天的 Speaking 後，下一個練習日再依今天成績自動調整難度。</span>';
    note.dataset.v40SpeakingSimple='1';
  }
  const cards=[...root.querySelectorAll('.q')].filter(q=>q.querySelector('button.record[data-id]')&&q.querySelector('button.splay[data-text]'));
  cards.forEach(q=>{
    const rec=q.querySelector('button.record[data-id]');
    const play=q.querySelector('button.splay[data-text]');
    if(!rec||!play)return;
    const idx=indexOfRecord(rec);
    if(rec.dataset.prompt){
      const text=REP_FOUND[idx%REP_FOUND.length];
      rec.dataset.prompt=text;
      play.dataset.text=text;
      q.dataset.v40SpeakingTier='simple-repeat';
    }else{
      play.dataset.text=INT_FOUND[idx%INT_FOUND.length];
      q.dataset.v40SpeakingTier='simple-interview';
    }
  });
}
function roots(){return [document.getElementById('content'),document.getElementById('mock')].filter(Boolean);}
function applyAll(){roots().forEach(forceSimple);}
function applySoon(){[0,40,120,280,520,900].forEach(ms=>setTimeout(applyAll,ms));}

/* Run after all existing wire wrappers. */
if(typeof window.wire==='function'){
  const previous=window.wire;
  window.wire=function(){const r=previous.apply(this,arguments);applyAll();setTimeout(applyAll,30);return r;};
}

/* Existing adaptive code may schedule its own delayed rewrite after navigation;
   schedule later passes so the simple baseline wins when there is no history. */
document.addEventListener('click',function(ev){
  const b=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!b)return;
  const opensNormal=b.dataset&&b.dataset.t==='Speaking';
  const opensMock=/mockPart\(['\"]ms['\"]\)/.test(String(b.getAttribute('onclick')||''));
  if(opensNormal||opensMock)applySoon();
},false);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applySoon,{once:true});else applySoon();
window.__toeflSpeakingNoHistorySimpleV40=true;
})();
