(function(){
'use strict';
/* TOEFL Study Lab 2026 Reading/Writing structure patch v17
   - Keeps the post-2026-01-21 task families.
   - Read an Academic Passage includes Sentence Simplification / Essential Information items.
*/

const RF=[
  {pre:'University students often ',stem:'bal',ans:'ance',post:' academic work with jobs, clubs, and family responsibilities.'},
  {pre:'Good time management can ',stem:'red',ans:'uce',post:' stress and make demanding schedules easier to handle.'},
  {pre:'One useful strategy is to ',stem:'div',ans:'ide',post:' large assignments into smaller tasks.'},
  {pre:'Students can then ',stem:'est',ans:'imate',post:' how much time each step will require.'},
  {pre:'A realistic plan also ',stem:'inc',ans:'ludes',post:' short breaks and unexpected delays.'},
  {pre:'When priorities are ',stem:'cle',ans:'ar',post:', students are less likely to spend too much time on minor tasks.'},
  {pre:'Regularly reviewing a schedule can ',stem:'rev',ans:'eal',post:' whether the original plan is still practical.'},
  {pre:'Over time, these habits may ',stem:'imp',ans:'rove',post:' both efficiency and confidence.'}
];

const DAILY_GROUPS=[
  {
    title:'Campus notice',
    text:'The Student Services Center will close at 3:00 p.m. this Thursday for staff training. Students who need to submit housing documents may use the secure drop box beside the main entrance until 8:00 p.m. Online services will remain available all day.',
    qs:[
      ['Why will the Student Services Center close early?',['Because of building repairs','Because of staff training','Because online services are unavailable'],1],
      ['What can students do after 3:00 p.m.?',['Use the drop box for housing documents','Meet staff inside the center','Pick up documents from the training room'],0]
    ]
  },
  {
    title:'Message from a classmate',
    text:'Hi Lena, the study group is moving from the library café to Room 214 because the café is hosting an event tonight. We are still starting at 6:30. I reserved the room until 8:30, so bring the article you want us to discuss first. — Marco',
    qs:[
      ['What has changed about the study group?',['Its meeting place','Its starting time','The article to be discussed'],0],
      ['Why does Marco mention the room reservation?',['To explain when the group can use the room','To ask Lena to reserve another room','To cancel the meeting after 6:30'],0]
    ]
  }
];

const ACADEMIC_GROUPS=[
  {
    title:'Academic Passage 1 — Urban heat',
    html:'Cities are often warmer than nearby rural areas, a pattern known as the urban heat island effect. <mark class="academic-highlight">Although dark surfaces such as asphalt and rooftops make cities hotter by absorbing solar energy during the day, the same neighborhoods can be cooled when reflective materials and vegetation reduce heat storage and increase shade and evaporation.</mark> Buildings can also reduce air circulation, while a relative lack of vegetation limits cooling through shade and evaporation. Researchers have found that planting trees, installing reflective roofs, and increasing access to green space can reduce local temperatures. These measures may also provide other benefits, including improved air quality and more comfortable outdoor spaces.',
    qs:[
      ['What is the main idea of the passage?',['Urban design can contribute to higher city temperatures and can also help reduce them','Rural areas are becoming warmer than cities','Reflective roofs are the only effective response to urban heat'],0],
      ['Why does the author mention asphalt and rooftops?',['To give examples of surfaces that can store heat','To explain why buildings improve air circulation','To compare construction costs'],0],
      ['The word “limits” is closest in meaning to',['reduces','measures','creates'],0],
      ['Which of the sentences below best expresses the essential information in the highlighted sentence? Incorrect choices change the meaning in important ways or leave out essential information.',['Urban surfaces can raise temperatures by storing heat, while reflective materials and vegetation can help cool the same areas.','Cities become cooler because asphalt and rooftops increase shade and evaporation.','Reflective materials make neighborhoods hotter, but vegetation has no effect on temperature.','Urban neighborhoods can be cooled only if all dark surfaces are removed completely.'],0,'simplification']
    ]
  },
  {
    title:'Academic Passage 2 — Memory and retrieval',
    html:'Learning is strengthened not only by studying information but also by retrieving it from memory. In many experiments, students who test themselves on material remember more later than students who spend the same amount of time rereading it. <mark class="academic-highlight">Because retrieval requires learners to reconstruct information from memory rather than merely encounter it again on a page, successful recall can make that information easier to access during a later attempt.</mark> Feedback is also important because it helps students correct errors before those errors become firmly established. For this reason, low-stakes quizzes can function as learning activities rather than merely as tools for measuring performance.',
    qs:[
      ['What does the passage mainly explain?',['Why retrieving information can improve learning','Why rereading is always ineffective','Why high-stakes exams should replace quizzes'],0],
      ['According to the passage, retrieval is especially useful when learners',['produce an answer from memory','read the same page repeatedly','avoid receiving feedback'],0],
      ['Why is feedback important?',['It helps correct errors before they become established','It makes all tests easier','It eliminates the need to study'],0],
      ['Which of the sentences below best expresses the essential information in the highlighted sentence? Incorrect choices change the meaning in important ways or leave out essential information.',['Actively recalling information can strengthen later access to it because learners must reconstruct it from memory.','Reading information repeatedly is more demanding than recalling it and therefore produces stronger memories.','Learners can remember material later only if they reconstruct every detail exactly during the first attempt.','Retrieval weakens memory because reconstructing information is harder than seeing it again.'],0,'simplification']
    ]
  }
];

function esc(s){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function mcq(id,p,c,a,kind){
  const badge=kind==='simplification'?'<div class="small" style="font-weight:850;color:#3157d5;margin-bottom:5px">Sentence Simplification / Essential Information</div>':'';
  return '<div class="q">'+badge+'<div><b>'+esc(p)+'</b></div>'+c.map((x,i)=>'<label class="option"><input type="radio" name="'+id+'" value="'+i+'"> '+esc(x)+'</label>').join('')+'<div class="actions"><button class="ghost ckmcq" data-name="'+id+'" data-a="'+a+'">檢查答案</button></div><div class="feedback"></div></div>';
}
function ctest(){
  let text='<div class="q"><h4 style="margin:0 0 8px">Complete the Words｜短文 C-test</h4><div class="small" style="margin-bottom:10px">依上下文補完被刪除的字母。這是短文理解＋字彙／句法／拼字的整合練習。</div><div style="line-height:2.05;font-size:1.03rem">';
  RF.forEach((x,i)=>{text+=esc(x.pre)+esc(x.stem)+'<input type="text" id="rf'+i+'" data-answer="'+esc(x.ans)+'" aria-label="Complete word '+(i+1)+'" style="display:inline-block;width:'+Math.max(62,x.ans.length*18)+'px;padding:4px 7px;margin:0 3px;vertical-align:baseline">'+esc(x.post)+' ';});
  text+='</div><div class="actions" style="margin-top:10px"><button type="button" class="ghost" id="rf-check-all">檢查 Complete the Words</button></div><div id="rf-summary" class="feedback"></div></div>';
  return text;
}
function groupedReading(group,prefix,start){
  const body=group.html||esc(group.text||'');
  let h='<div class="q academic-passage-card" style="background:#fff"><div class="small">'+esc(group.title)+'</div><div style="font-size:1.04rem;line-height:1.75;margin-top:5px">'+body+'</div></div>';
  group.qs.forEach((q,i)=>{h+=mcq(prefix+(start+i),q[0],q[1],q[2],q[3]);});
  return h;
}
function readingHTML(mock){
  let h='<h3>'+ (mock?'Mock Reading':'Reading｜20題訓練') +'</h3><div class="accent-note"><b>2026 新制 Reading</b><br><span class="small">Complete the Words → Read in Daily Life → Read an Academic Passage。Read an Academic Passage 內含主旨、細節、字彙，以及 Sentence Simplification／Essential Information 等理解題。本站日常訓練固定 20 題。</span></div>';
  h+=ctest();
  h+='<h4>Read in Daily Life</h4>';
  let idx=0;DAILY_GROUPS.forEach(g=>{h+=groupedReading(g,mock?'mrd':'rd',idx);idx+=g.qs.length;});
  h+='<h4>Read an Academic Passage</h4>';
  idx=0;ACADEMIC_GROUPS.forEach(g=>{h+=groupedReading(g,mock?'mra':'ra',idx);idx+=g.qs.length;});
  if(!mock)h+='<div class="score" id="rscore">Reading：尚未計分</div><button onclick="scoreObjective(\'r\')">計算 Reading</button>';
  return h;
}

function chunkButton(text,i){return '<button type="button" class="ghost bs-chip" data-chunk="'+esc(text)+'" data-index="'+i+'" style="min-height:38px;padding:6px 10px">'+esc(text)+'</button>';}
function enhanceBuildSentence(root){
  (root||document).querySelectorAll('input[type="text"][id]').forEach(input=>{
    if(!/^(ws|mws)\d+$/.test(input.id)||input.dataset.v17chunks==='1')return;
    const q=input.closest('.q');if(!q)return;
    const prompt=q.firstElementChild;if(!prompt)return;
    const raw=prompt.dataset.originalPrompt||prompt.textContent||'';
    if(!raw.includes('/'))return;
    input.dataset.v17chunks='1';
    const chunks=raw.split('/').map(x=>x.trim()).filter(Boolean);
    const bank=document.createElement('div');bank.className='bs-bank';bank.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 9px';
    chunks.forEach((c,i)=>bank.insertAdjacentHTML('beforeend',chunkButton(c,i)));
    const note=document.createElement('div');note.className='small';note.textContent='2026 Build a Sentence：先依語法排序字詞／片語。本站保留文字框，讓你同時練習句首大小寫與句尾標點。';
    input.insertAdjacentElement('beforebegin',bank);bank.insertAdjacentElement('beforebegin',note);
    bank.addEventListener('click',e=>{
      const b=e.target.closest('.bs-chip');if(!b)return;
      const c=b.dataset.chunk||'';
      input.value=(input.value.trim()?input.value.trim()+' ':'')+c;
      input.dispatchEvent(new Event('input',{bubbles:true}));
      b.disabled=true;b.style.opacity='.45';
    });
    const reset=document.createElement('button');reset.type='button';reset.className='ghost';reset.textContent='清空重排';reset.style.marginBottom='8px';
    reset.onclick=()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));bank.querySelectorAll('.bs-chip').forEach(b=>{b.disabled=false;b.style.opacity='1';});};
    bank.insertAdjacentElement('afterend',reset);
  });
}

function wireCtest(root){
  const btn=(root||document).querySelector('#rf-check-all');if(!btn||btn.dataset.wired==='1')return;
  btn.dataset.wired='1';btn.onclick=()=>{
    let ok=0,total=0;
    RF.forEach((x,i)=>{const el=(root||document).querySelector('#rf'+i);if(!el)return;total++;const good=el.value.trim().toLowerCase()===x.ans.toLowerCase();el.style.borderColor=good?'#8ac6b1':'#e39a92';el.style.background=good?'#f3fbf7':'#fff5f3';if(good)ok++;});
    const s=(root||document).querySelector('#rf-summary');if(s){s.className='feedback show '+(ok===total?'ok':'no');s.textContent='Complete the Words：'+ok+'/'+total;}
  };
}
function installStyles(){
  if(document.getElementById('rw2026-v17-style'))return;
  const st=document.createElement('style');st.id='rw2026-v17-style';
  st.textContent='.academic-highlight{background:#fff0a8;padding:1px 2px;border-radius:3px;color:inherit}.academic-passage-card mark{font-weight:750}';
  document.head.appendChild(st);
}
function installReading(){
  const c=document.getElementById('content');if(!c)return;
  let isReading=false;try{isReading=(typeof active!=='undefined'&&active==='Reading');}catch(e){}
  if(!isReading)return;
  if(c.dataset.rw2026v17==='1')return;
  c.dataset.rw2026v17='1';c.innerHTML=readingHTML(false);
  if(typeof wire==='function')wire();
  wireCtest(c);
}
function installWriting(){
  const c=document.getElementById('content');if(!c)return;
  let isWriting=false;try{isWriting=(typeof active!=='undefined'&&active==='Writing');}catch(e){}
  if(!isWriting)return;
  if(!c.querySelector('.rw2026-writing-note')){
    const h=c.querySelector('h3');if(h){const n=document.createElement('div');n.className='accent-note rw2026-writing-note';n.innerHTML='<b>2026 新制 Writing</b><br><span class="small">Build a Sentence、Write an Email、Write for an Academic Discussion。Integrated Writing 已不是 2026/1/21 後的現行題型。</span>';h.insertAdjacentElement('afterend',n);}
  }
  enhanceBuildSentence(c);
}
function enhanceCurrent(){installStyles();installReading();installWriting();const mock=document.getElementById('mock');if(mock)enhanceBuildSentence(mock);}

if(typeof window.render==='function'){
  const oldRender=window.render;
  window.render=function(){const r=oldRender.apply(this,arguments);setTimeout(enhanceCurrent,0);return r;};
}
if(typeof window.mockPart==='function'){
  const oldMock=window.mockPart;
  window.mockPart=function(p){
    const r=oldMock.apply(this,arguments);
    setTimeout(()=>{
      const m=document.getElementById('mock');if(!m)return;
      if(p==='mr'){
        m.innerHTML=readingHTML(true);
        const score=document.createElement('div');score.className='score';score.id='mr-v17-score';score.textContent='Mock Reading：尚未計分';m.appendChild(score);
        const b=document.createElement('button');b.textContent='計算 Mock Reading';b.type='button';b.onclick=()=>{
          let total=0,ok=0;
          RF.forEach((x,i)=>{const e=m.querySelector('#rf'+i);if(e){total++;if(e.value.trim().toLowerCase()===x.ans.toLowerCase())ok++;}});
          ['mrd','mra'].forEach(pre=>{const names=[...new Set([...m.querySelectorAll('input[name^="'+pre+'"]')].map(x=>x.name))];names.forEach(n=>{total++;const ch=m.querySelector('input[name="'+n+'"]:checked'),ck=m.querySelector('.ckmcq[data-name="'+n+'"]');if(ch&&ck&&Number(ch.value)===Number(ck.dataset.a))ok++;});});
          score.textContent='Mock Reading：'+ok+'/'+total+'｜'+(total?Math.round(ok/total*100):0)+'%';
        };m.appendChild(b);
        if(typeof wire==='function')wire();wireCtest(m);
      }
      if(p==='mw')enhanceBuildSentence(m);
    },0);
    return r;
  };
}

new MutationObserver(()=>setTimeout(enhanceCurrent,0)).observe(document.documentElement,{childList:true,subtree:true});
setTimeout(enhanceCurrent,0);setTimeout(enhanceCurrent,250);
})();
