(()=>{
'use strict';
/* JLPT Study Lab v3 loader
   Fixes repeated 文字・語彙 items without rewriting the whole v2 engine.
   The v2 app is fetched as text, vocabQ() is replaced, then executed.
   - Daily vocab: core lexemes are drawn without replacement for the whole daily set.
   - Full Mock: each vocabulary item type draws lexemes in a deterministic no-repeat cycle.
   - Same date + level remains stable; the next date receives a different permutation.
*/
const replacement=`function vocabQ(type,i,seed,mode){
  const r=rng(seed+i*97),bank=LEX[S.level];
  /* One deterministic permutation per date/level/mode. Since daily vocab counts are
     <= each level's lexical bank size, every daily question uses a different core word.
     In Full Mock the index may wrap across different item types, but never within a
     single type because official per-type counts are smaller than the bank. */
  const order=shuffle(bank,rng(hash('vocab-order|'+S.level+'|'+mode+'|'+seed)));
  const x=order[i%order.length];
  const others=shuffle(bank.filter(y=>y!==x),r);
  let p='',a='',o=[];
  if(type==='kanji'){
    p='「'+x[0]+'」の読み方として最も適切なものを選んでください。';a=x[1];o=[a,...others.slice(0,3).map(y=>y[1])];
  }else if(type==='orthography'){
    p='「'+x[1]+'」の表記として最も適切なものを選んでください。';a=x[0];o=[a,...others.slice(0,3).map(y=>y[0])];
  }else if(type==='wordFormation'){
    const extraWF=[
      ['申請書を（　）提出してください。','再',['未','非','無']],
      ['この資料はまだ（　）公開です。','未',['再','全','過']],
      ['内容に誤りがあったため（　）確認した。','再',['不','逆','外']],
      ['この設備は（　）使用が可能です。','再',['未','否','半']],
      ['事故の（　）発を防ぐ対策が必要だ。','再',['未','非','逆']]
    ];
    const wfOrder=shuffle(WF.concat(extraWF),rng(hash('wf-order|'+S.level+'|'+mode+'|'+seed)));
    const z=wfOrder[i%wfOrder.length];p=z[0];a=z[1];o=[a,...z[2]];
  }else if(type==='context'){
    p=x[2].replace(x[0],'（　）');a=x[0];o=[a,...others.slice(0,3).map(y=>y[0])];
  }else if(type==='paraphrase'){
    p='「'+x[0]+'」に最も近い意味を選んでください。';a=x[3];o=[a,...others.slice(0,3).map(y=>y[3])];
  }else{
    p='「'+x[0]+'」の使い方として最も適切なものを選んでください。';a=x[2];
    o=[a,'昨日、'+x[0]+'を食べました。',x[0]+'が駅へ歩きました。','私は'+x[0]+'を三時です。'];
  }
  return{id:qid('vocab',type,i,mode),skill:'vocab',type,p,a,o:shuffle(o,r),e:'正解：'+a};
}`;
async function boot(){
  const status=document.getElementById('jlptV3Status');
  try{
    const res=await fetch('./jlpt-app-v2.js?v=3',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    let src=await res.text();
    const rx=/function vocabQ\(type,i,seed,mode\)\{[\s\S]*?\}(?=\nfunction grammarQ)/;
    if(!rx.test(src))throw new Error('找不到 vocabQ 產題函式');
    src=src.replace(rx,replacement);
    (0,eval)(src+'\n//# sourceURL=jlpt-app-v3-runtime.js');
    const s=document.createElement('script');s.src='./jlpt-mock-state-v2.js?v=3';s.defer=true;document.body.appendChild(s);
    if(status)status.remove();
    document.documentElement.dataset.jlptVersion='3';
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v3 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    else console.error(err);
  }
}
boot();
})();