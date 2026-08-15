(function(){
/* TOEFL Study Lab patch v9
   - Stable repeatable speech playback
   - Dialogue roles are perceptually separated
   - The question narrator reserves a voice that is NOT used by dialogue roles
   - Question-only replay reuses that reserved narrator profile for the same dialogue context
   - Build a Sentence chunks are deterministically scrambled each day
*/
let __speechToken=0,__speechTimer=null,__speechUtterance=null,__speechBtn=null;

function __resetSpeechButton(btn){
  if(!btn)return;
  btn.disabled=false;
  if(btn.dataset.playLabel)btn.textContent=btn.dataset.playLabel;
  btn.removeAttribute('aria-busy');
}
function __voiceId(v){return String((v&&v.voiceURI)||'')+'|'+String((v&&v.name)||'')+'|'+String((v&&v.lang)||'')}
function __allVoices(){
  const raw=(window.speechSynthesis&&speechSynthesis.getVoices())||[],seen=new Set();
  return raw.filter(v=>{const k=__voiceId(v);if(seen.has(k))return false;seen.add(k);return true});
}
function __allEnglishVoices(){return __allVoices().filter(v=>(v.lang||'').toLowerCase().startsWith('en'))}
function __localePrefs(lang){
  const t=String(lang||'en-US');
  if(t==='en-NZ')return['en-NZ','en-AU','en-GB','en-US','en-CA'];
  if(t==='en-AU')return['en-AU','en-NZ','en-GB','en-US','en-CA'];
  if(t==='en-GB')return['en-GB','en-IE','en-AU','en-NZ','en-US'];
  return['en-US','en-CA','en-GB','en-AU','en-NZ'];
}
function __rankedVoices(lang){
  const prefs=__localePrefs(lang).map(x=>x.toLowerCase()),target=String(lang||'en-US').toLowerCase();
  return __allEnglishVoices().slice().sort((a,b)=>{
    function score(v){
      const l=String(v.lang||'').toLowerCase(),p=prefs.indexOf(l);
      let s=p<0?50:p*5;
      if(l===target)s-=30;
      if(v.localService)s-=1;
      return s;
    }
    return score(a)-score(b);
  });
}
function __fallbackRoleLang(lang,i){const p=__localePrefs(lang);return p[i%p.length]||lang||'en-US'}
function __findVoice(lang){
  const v=__rankedVoices(lang);if(v.length)return v[0];
  if(typeof voiceFor==='function'){try{return voiceFor(lang)||null}catch(e){}}
  return null;
}

function __dialogueSegments(text){
  const original=String(text||'').trim();if(!original)return[];
  const qm=' Question. ',qi=original.lastIndexOf(qm);
  const body=qi>0?original.slice(0,qi).trim():original;
  const question=qi>0?original.slice(qi+qm.length).trim():'';
  const re=/(^|\s)([A-Z][A-Za-z]*(?:\s+(?:[A-Z][A-Za-z]*|[A-Z0-9]+)){0,2}):\s*/g,matches=[];
  let m;
  while((m=re.exec(body))){matches.push({speaker:m[2].trim(),labelStart:m.index+(m[1]?m[1].length:0),textStart:re.lastIndex})}
  let out=[];
  if(matches.length>=2){
    const unique=[];
    matches.forEach(x=>{const k=x.speaker.toLowerCase();if(!unique.some(y=>y.toLowerCase()===k))unique.push(x.speaker)});
    if(unique.length>=2){
      if(matches[0].labelStart>0){
        const pre=body.slice(0,matches[0].labelStart).trim();
        if(pre)out.push({speaker:'__NARRATOR__',text:pre,narrator:true,question:false});
      }
      matches.forEach((x,i)=>{
        const end=i+1<matches.length?matches[i+1].labelStart:body.length;
        const t=body.slice(x.textStart,end).trim();
        if(t)out.push({speaker:x.speaker,text:t,narrator:false,question:false});
      });
    }
  }
  if(!out.length&&body)out=[{speaker:null,text:body,narrator:false,question:false}];
  if(question)out.push({speaker:'__QUESTION__',text:'Question. '+question,narrator:true,question:true});
  return out;
}

function __speakerProfiles(contextSegments,lang){
  const names=[];
  contextSegments.forEach(x=>{
    if(x.speaker&&!x.narrator&&!names.some(n=>n.toLowerCase()===String(x.speaker).toLowerCase()))names.push(String(x.speaker));
  });
  const voices=__rankedVoices(lang),map={};
  const pitches=[0.74,1.30,0.90,1.39,0.82],rates=[0.87,0.97,0.91,0.85,0.99];

  /* Reserve one actual English voice for the question BEFORE assigning dialogue roles.
     This guarantees that, whenever the browser exposes >=2 English voices, the question
     never uses an underlying voice used by any dialogue character. */
  let questionVoice=null;
  if(names.length>=2&&voices.length>=2)questionVoice=voices[0];
  const rolePool=questionVoice?voices.slice(1):voices.slice();
  const usedRoleIds=new Set();

  names.forEach((name,i)=>{
    let v=null;
    if(rolePool.length)v=rolePool[i%rolePool.length];
    else if(voices.length)v=voices[i%voices.length];
    if(v)usedRoleIds.add(__voiceId(v));
    map[name.toLowerCase()]={
      voice:v,
      lang:v?(v.lang||lang):__fallbackRoleLang(lang,i),
      pitch:pitches[i%pitches.length],
      rate:rates[i%rates.length],
      role:true
    };
  });

  if(!questionVoice){
    questionVoice=voices.find(v=>!usedRoleIds.has(__voiceId(v)))||null;
  }
  /* If only one English voice exists, there is no legal unused underlying English voice.
     Mark the question profile blocked rather than silently reusing a dialogue voice. */
  const questionBlocked=names.length>=2&&!questionVoice;
  map.__question__={
    voice:questionVoice,
    lang:(questionVoice&&questionVoice.lang)||lang||'en-US',
    pitch:1.03,
    rate:0.90,
    question:true,
    blocked:questionBlocked
  };

  /* Any pre-dialogue narrator also avoids dialogue-role voices when possible. */
  let nv=voices.find(v=>!usedRoleIds.has(__voiceId(v))&&(!questionVoice||__voiceId(v)!==__voiceId(questionVoice)))||questionVoice||null;
  map.__narrator__={voice:nv,lang:(nv&&nv.lang)||lang||'en-US',pitch:0.98,rate:0.90,narrator:true};
  return map;
}

function __profileFor(seg,state){
  if(seg.question||seg.speaker==='__QUESTION__')return state.profiles.__question__;
  if(seg.narrator)return state.profiles.__narrator__;
  if(!seg.speaker)return{voice:__findVoice(state.lang),lang:state.lang,pitch:1,rate:.9};
  return state.profiles[String(seg.speaker).toLowerCase()]||{voice:null,lang:state.lang,pitch:1,rate:.9};
}
function __speechState(text,lang,btn,token,opts){
  opts=opts||{};
  const contextSegments=__dialogueSegments(opts.contextText||text);
  const profiles=__speakerProfiles(contextSegments,lang);
  const roles=new Set(contextSegments.filter(x=>x.speaker&&!x.narrator).map(x=>String(x.speaker).toLowerCase()));
  let segments;
  if(opts.questionOnly){
    let q=String(text||'').trim();
    if(!/^question[.!?]?\s/i.test(q))q='Question. '+q;
    segments=[{speaker:'__QUESTION__',text:q,narrator:true,question:true}];
  }else segments=__dialogueSegments(text);
  return{segments,profiles,lang:lang||'en-US',btn,token,isDialogue:roles.size>1,retried:{},questionOnly:!!opts.questionOnly};
}
function __finishSpeech(state){__resetSpeechButton(state.btn);__speechUtterance=null}
function __speakQueueItem(state,index){
  if(state.token!==__speechToken)return;
  if(index>=state.segments.length){__finishSpeech(state);return}
  const seg=state.segments[index],profile=__profileFor(seg,state);
  if((seg.question||seg.speaker==='__QUESTION__')&&profile.blocked){
    __finishSpeech(state);
    alert('此裝置目前只提供一個可用的英文語音。為避免題問重複使用多人對話中的聲線，本站已停止播放題問。請改用提供至少兩個英文語音的 Chrome／Safari／系統語音環境。');
    return;
  }
  const u=new SpeechSynthesisUtterance(String(seg.text||''));
  __speechUtterance=u;
  u.lang=profile.lang||state.lang;u.volume=1;u.rate=profile.rate;u.pitch=profile.pitch;
  if(profile.voice)u.voice=profile.voice;
  u.onstart=()=>{
    if(state.token!==__speechToken)return;
    if(state.btn){
      state.btn.textContent=(seg.question||state.questionOnly)?'🔊 題問播放中｜獨立 narrator 聲線':(state.isDialogue?'🔊 播放中｜角色聲線已分離':'🔊 播放中｜再按可重播');
      state.btn.setAttribute('aria-busy','true');
    }
  };
  u.onend=()=>{
    if(state.token!==__speechToken)return;
    const next=state.segments[index+1];
    const pause=state.isDialogue&&next&&next.speaker!==seg.speaker?130:35;
    __speechTimer=setTimeout(()=>__speakQueueItem(state,index+1),pause);
  };
  u.onerror=()=>{
    if(state.token!==__speechToken)return;
    if(!state.retried[index]){state.retried[index]=true;__speechTimer=setTimeout(()=>__speakQueueItem(state,index),180)}
    else __speechTimer=setTimeout(()=>__speakQueueItem(state,index+1),80);
  };
  try{speechSynthesis.speak(u)}catch(e){u.onerror()}
}
function __startSpeech(text,lang,btn,token,opts){
  if(token!==__speechToken)return;
  const state=__speechState(text,lang,btn,token,opts);
  __speechTimer=setTimeout(()=>__speakQueueItem(state,0),80);
}
window.__toeflSpeak=function(text,lang,btn,opts){
  if(!('speechSynthesis' in window)){alert('目前瀏覽器不支援語音播放，請改用 Safari／Chrome 開啟。');return}
  const token=++__speechToken;clearTimeout(__speechTimer);
  if(__speechBtn&&__speechBtn!==btn)__resetSpeechButton(__speechBtn);__speechBtn=btn;
  if(btn&&!btn.dataset.playLabel)btn.dataset.playLabel=btn.textContent;
  if(btn){btn.disabled=false;btn.textContent='準備播放…';btn.setAttribute('aria-busy','true')}
  try{speechSynthesis.cancel()}catch(e){}
  try{if(speechSynthesis.paused)speechSynthesis.resume()}catch(e){}
  try{speechSynthesis.getVoices()}catch(e){}
  if(__allEnglishVoices().length===0)__speechTimer=setTimeout(()=>__startSpeech(text,lang,btn,token,opts),320);
  else __startSpeech(text,lang,btn,token,opts);
};
window.speakText=function(text,lang,btn){window.__toeflSpeak(text,lang,btn,{})};

function __primaryDialogueButton(host,exclude){
  if(!host)return null;
  return [...host.querySelectorAll('button.play')].find(x=>x!==exclude&&String(x.dataset.text||'').includes(' Question. '))||null;
}
function wireReliablePlayback(){
  document.querySelectorAll('button.play').forEach(b=>{
    if(!b.dataset.playLabel)b.dataset.playLabel=b.textContent;
    b.disabled=false;
    const host=b.closest('.audio')||b.parentElement;
    const questionOnly=/只重播題問/.test(b.textContent)||b.dataset.questionOnly==='1';
    if(questionOnly){
      b.dataset.questionOnly='1';
      b.onclick=(ev)=>{
        ev.preventDefault();
        const primary=__primaryDialogueButton(host,b);
        const contextText=primary?primary.dataset.text||'':'';
        window.__toeflSpeak(b.dataset.text||'',b.dataset.lang||'en-US',b,{questionOnly:true,contextText});
      };
    }else{
      b.onclick=(ev)=>{ev.preventDefault();window.__toeflSpeak(b.dataset.text||'',b.dataset.lang||'en-US',b,{})};
    }
    const basis=questionOnly?((__primaryDialogueButton(host,b)||{}).dataset||{}).text||'':b.dataset.text||'';
    const segs=__dialogueSegments(basis);
    const speakerCount=new Set(segs.filter(x=>x.speaker&&!x.narrator).map(x=>String(x.speaker).toLowerCase())).size;
    if(speakerCount>1&&host&&!host.querySelector('.dialogue-voice-note')){
      const note=document.createElement('span');note.className='small dialogue-voice-note';
      note.textContent='多人對話：角色聲線分離；題問固定使用未被角色使用的 narrator 聲線';
      host.appendChild(note);
    }
  });
  document.querySelectorAll('button.splay').forEach(b=>{
    if(!b.dataset.playLabel)b.dataset.playLabel=b.textContent;b.disabled=false;
    b.onclick=(ev)=>{ev.preventDefault();window.__toeflSpeak(b.dataset.text||'','en-US',b,{})};
  });
}

/* ---------- Build a Sentence: deterministic daily scrambling ---------- */
function __dayKey(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())}
function __hash32(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function __rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function __shuffleChunks(chunks,key){
  const original=chunks.slice(),a=chunks.slice(),rnd=__rng(__hash32(__dayKey()+'|'+key+'|'+original.join('|')));
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  if(a.length>1&&a.every((x,i)=>x===original[i]))a.push(a.shift());
  return a;
}
function scrambleSentenceCards(){
  document.querySelectorAll('input[type="text"][id]').forEach(input=>{
    if(!/^(ws|ww|mws)\d+$/.test(input.id))return;
    const q=input.closest('.q');if(!q)return;
    const prompt=q.firstElementChild;if(!prompt)return;
    let source=prompt.dataset.originalPrompt||prompt.textContent||'';
    if(!source.includes('/'))return;
    prompt.dataset.originalPrompt=source;
    const chunks=source.split('/').map(x=>x.trim()).filter(Boolean);if(chunks.length<2)return;
    const shuffled=__shuffleChunks(chunks,input.id);
    prompt.textContent=shuffled.join(' / ');prompt.dataset.scrambled='1';
    if(!q.querySelector('.scramble-note')){
      const note=document.createElement('div');note.className='small scramble-note';
      note.textContent='字詞組已打亂，請重組成自然且文法正確的英文句子。';
      prompt.insertAdjacentElement('afterend',note);
    }
  });
}
function enhanceAll(){wireReliablePlayback();scrambleSentenceCards()}
if(typeof render==='function'){const _render=render;render=function(){_render();setTimeout(enhanceAll,0)}}
if(typeof mockPart==='function'){const _mock=mockPart;mockPart=function(p){_mock(p);setTimeout(enhanceAll,0)}}
if('speechSynthesis' in window){
  try{speechSynthesis.getVoices()}catch(e){}
  speechSynthesis.onvoiceschanged=()=>{try{speechSynthesis.getVoices();enhanceAll()}catch(e){}};
}
if(typeof render==='function')render();
setTimeout(enhanceAll,0);setTimeout(enhanceAll,250);
})();
