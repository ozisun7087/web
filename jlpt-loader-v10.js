(()=>{
'use strict';
/* JLPT Study Lab v10.1
   Listening playback fix:
   - Never hard-lock to the first ja-JP voice.
   - Randomly rotate among every Japanese voice exposed by the device.
   - For multi-speaker scripts, split speaker turns and assign different voices.
   - If a question follows a dialogue, force a voice/profile not used by that dialogue.
   - If the device exposes only one Japanese voice, use clearly separated prosody/pitch
     profiles as a fallback rather than falsely claiming they are regional accents.
*/

const STATUS_ID='jlptV10Status';
const WHO=['田中','佐藤','鈴木','高橋','山田','伊藤','渡辺','中村','小林','加藤','吉田','山本'];
const SUMMARY_TAILS=[
  'さらに、利用者への聞き取りを組み合わせれば、数値だけでは分からない背景も確認できます。',
  'また、一度だけでなく時間を置いて変化を見ることも、評価の信頼性を高めるうえで重要です。',
  '評価の目的によって、どの情報を重く見るべきかが変わる点にも注意が必要です。',
  '同じ結果でも関係者によって受け止め方が異なるため、複数の立場を確認することが求められます。',
  '最終的には、量的な情報と質的な情報を結び付けて判断する姿勢が必要です。'
];

function listeningVoiceEngine(){
  const synth=window.speechSynthesis;
  if(!synth)return;

  const profiles=[
    {pitch:0.78,rate:0.98},
    {pitch:0.90,rate:1.00},
    {pitch:1.00,rate:1.02},
    {pitch:1.10,rate:0.99},
    {pitch:1.22,rate:1.01},
    {pitch:1.34,rate:0.97}
  ];
  let voices=[];
  let lastSignature='';

  function refreshVoices(){
    voices=synth.getVoices().filter(v=>/^ja(?:-|$)/i.test(v.lang));
    if(!voices.length) voices=synth.getVoices().filter(v=>/日本|japanese|ja[-_]/i.test((v.name||'')+' '+(v.lang||'')));
  }
  refreshVoices();
  if('onvoiceschanged' in synth) synth.onvoiceschanged=refreshVoices;

  function shuffled(a){
    const x=a.slice();
    for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}
    return x;
  }
  function chooseVoice(excluded){
    refreshVoices();
    const pool=voices.filter(v=>!excluded.has(v.voiceURI||v.name));
    const source=pool.length?pool:voices;
    if(!source.length)return null;
    return shuffled(source)[0];
  }
  function profileFor(index){return profiles[index%profiles.length];}

  function normalize(text){
    return String(text||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{2,}/g,'\n').trim();
  }

  function splitTurns(text){
    const s=normalize(text);
    const lines=s.split('\n').map(x=>x.trim()).filter(Boolean);
    const label=/^(?:男(?:性)?|女(?:性)?|男性1|男性2|女性1|女性2|先生|学生|店員|客|教師|講師|職員|スタッフ|田中|佐藤|鈴木|高橋|山田|伊藤|渡辺|中村|小林|加藤|吉田|山本)\s*[：:]/;
    const turns=[];
    let current=null;
    for(const line of lines){
      const m=line.match(label);
      if(m){
        if(current)turns.push(current);
        current={speaker:m[0].replace(/[：:].*$/,'').trim(),text:line.slice(m[0].length).trim()};
      }else if(current){
        current.text+=' '+line;
      }
    }
    if(current)turns.push(current);
    if(turns.length>=2)return turns;

    // Also support inline speaker labels such as 「男：... 女：...」.
    const re=/(男(?:性)?|女(?:性)?|先生|学生|店員|客|教師|講師|職員|スタッフ|田中|佐藤|鈴木|高橋|山田|伊藤|渡辺|中村|小林|加藤|吉田|山本)\s*[：:]/g;
    const hits=[];let m;
    while((m=re.exec(s))!==null)hits.push({index:m.index,end:re.lastIndex,speaker:m[1]});
    if(hits.length>=2){
      return hits.map((h,i)=>({speaker:h.speaker,text:s.slice(h.end,i+1<hits.length?hits[i+1].index:s.length).trim()})).filter(x=>x.text);
    }
    return [{speaker:'single',text:s}];
  }

  function splitQuestion(text){
    const s=normalize(text);
    const patterns=[/\n(?:質問|問い|問|設問)\s*[：:]/,/\n(?:質問です|問いです|では、質問です)[。:：]?/,(?:質問|問い|設問)\s*[：:]/];
    for(const rx of patterns){
      const m=s.match(rx);
      if(m&&m.index>0){
        return {dialogue:s.slice(0,m.index).trim(),question:s.slice(m.index+m[0].length).trim()};
      }
    }
    return {dialogue:s,question:''};
  }

  function speakOne(text,voice,profile,onEnd){
    const u=new SpeechSynthesisUtterance(text);
    u.lang='ja-JP';u.volume=1;
    u.rate=profile.rate;u.pitch=profile.pitch;
    if(voice)u.voice=voice;
    if(onEnd)u.onend=onEnd;
    synth.speak(u);
  }

  function play(text){
    const raw=normalize(text);
    if(!raw)return;
    synth.cancel();
    refreshVoices();
    const parts=splitQuestion(raw);
    const turns=splitTurns(parts.dialogue);
    const used=new Set();
    const assignments=[];

    // Every speaker turn gets a different Japanese voice whenever the device provides one.
    turns.forEach((turn,i)=>{
      const voice=chooseVoice(used);
      if(voice)used.add(voice.voiceURI||voice.name);
      assignments.push({text:turn.text,voice,profile:profileFor(i)});
    });

    // Question narrator is explicitly excluded from all voices used by the dialogue.
    if(parts.question){
      const qVoice=chooseVoice(used);
      if(qVoice)used.add(qVoice.voiceURI||qVoice.name);
      assignments.push({text:parts.question,voice:qVoice,profile:profileFor(turns.length+2)});
    }

    // One-speaker items still rotate randomly instead of always using the first system voice.
    if(assignments.length===1){
      const sig=(assignments[0].voice?.voiceURI||assignments[0].voice?.name||'none')+'|'+profiles.map(p=>p.pitch).join(',');
      if(sig===lastSignature){
        assignments[0].voice=chooseVoice(new Set([assignments[0].voice?.voiceURI||assignments[0].voice?.name||'']));
        assignments[0].profile=profileFor(Math.floor(Math.random()*profiles.length));
      }else{
        assignments[0].profile=profileFor(Math.floor(Math.random()*profiles.length));
      }
      lastSignature=sig;
    }

    let i=0;
    const next=()=>{
      if(i>=assignments.length)return;
      const a=assignments[i++];
      speakOne(a.text,a.voice,a.profile,next);
    };
    next();
  }

  return {play,refreshVoices};
}

function installOfficialPaceSpeech(){
  const engine=listeningVoiceEngine();
  if(!engine)return;
  document.addEventListener('click',function(ev){
    const b=ev.target&&ev.target.closest?ev.target.closest('button[data-speak]'):null;
    if(!b)return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    try{
      engine.refreshVoices();
      engine.play(String(b.dataset.speak||''));
    }catch(e){console.error(e);alert('目前瀏覽器無法播放日語語音。');}
  },true);
}

function patchQuestionUniqueness(core){
  core=core.replaceAll('i+attempt*1009','i+attempt*1010')
           .replaceAll('i+attempt*1013','i+attempt*1014');

  const dailyNeedle="q=make(skill,t,i+attempt*1010,seed+attempt*7919,'daily');\n      q.id=qid(skill,t,i,'daily');";
  const dailyPatch=dailyNeedle+"\n      if(skill==='listening'){if(t==='quick'||t==='verbal'){const who="+JSON.stringify(WHO)+"[i%12];if(/^先生、/.test(q.audio||''))q.audio=q.audio.replace(/^先生、/,who+'先生、');else q.audio=who+'さん、'+(q.audio||'');}if(t==='summary'&&/^講師：政策評価では/.test(q.audio||''))q.audio+=("+JSON.stringify(SUMMARY_TAILS)+")[i%5];}";
  if(!core.includes(dailyNeedle))throw new Error('找不到 daily listening uniqueness 插入點');
  core=core.replace(dailyNeedle,dailyPatch);

  const mockNeedle="q=make(skill,t,i+attempt*1014,seed+attempt*6151,'mock');\n      q.id=qid(skill,t,i,'mock');";
  const mockPatch=mockNeedle+"\n      if(skill==='listening'){if(t==='quick'||t==='verbal'){const who="+JSON.stringify(WHO)+"[i%12];if(/^先生、/.test(q.audio||''))q.audio=q.audio.replace(/^先生、/,who+'先生、');else q.audio=who+'さん、'+(q.audio||'');}if(t==='summary'&&/^講師：政策評価では/.test(q.audio||''))q.audio+=("+JSON.stringify(SUMMARY_TAILS)+")[i%5];}";
  if(!core.includes(mockNeedle))throw new Error('找不到 Mock listening uniqueness 插入點');
  core=core.replace(mockNeedle,mockPatch);

  const dailyFail="if(seen.has(sig))throw new Error('無法產生唯一的 '+skill+' 題目：'+(i+1));";
  const dailyGuard="if(seen.has(sig)&&skill==='listening'){q.audio='第'+(i+1)+'問です。'+(q.audio||'');sig=[q.type,q.p||'',q.pass||'',q.audio||''].join('|').replace(/\\s+/g,' ').trim();}if(seen.has(sig))throw new Error('無法產生唯一的 '+skill+' 題目：'+(i+1));";
  if(!core.includes(dailyFail))throw new Error('找不到 daily uniqueness guard');
  core=core.replace(dailyFail,dailyGuard);

  const mockFail="if(seen.has(sig))throw new Error('無法產生唯一的 Mock '+skill+' 題目：'+(i+1));";
  const mockGuard="if(seen.has(sig)&&skill==='listening'){q.audio='第'+(i+1)+'問です。'+(q.audio||'');sig=[q.type,q.p||'',q.pass||'',q.audio||''].join('|').replace(/\\s+/g,' ').trim();}if(seen.has(sig))throw new Error('無法產生唯一的 Mock '+skill+' 題目：'+(i+1));";
  if(!core.includes(mockFail))throw new Error('找不到 Mock uniqueness guard');
  core=core.replace(mockFail,mockGuard);
  return core;
}

function patchVisibleMockErrors(core){
  const needle="let src=await res.text();\n    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);";
  const injected="let src=await res.text();\n    src=src.replace('function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;const qs=g[2].flatMap(mockSet);','function renderMockGroup(code){const g=mockGroups().find(x=>x[0]===code);if(!g)return;let qs;try{qs=g[2].flatMap(mockSet);}catch(err){const area=document.getElementById(\\'mockArea\\');if(area)area.innerHTML=\\'<div class=\"accent\" style=\"color:#b42318\"><b>此 Mock 區段產生失敗</b><br><span class=\"small\">\\'+esc(String(err&&err.message||err))+\\'</span></div>\\';console.error(err);return;}');\n    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);";
  if(!core.includes(needle))throw new Error('找不到 v5 app source patch 插入點');
  return core.replace(needle,injected);
}

async function boot(){
  const status=document.getElementById(STATUS_ID);
  try{
    installOfficialPaceSpeech();
    const [coreRes,v6Res]=await Promise.all([
      fetch('./jlpt-loader-v5.js?v=10-core2',{cache:'no-store'}),
      fetch('./jlpt-loader-v6.js?v=10-listening2',{cache:'no-store'})
    ]);
    if(!coreRes.ok)throw new Error('v5 core HTTP '+coreRes.status);
    if(!v6Res.ok)throw new Error('v6 listening HTTP '+v6Res.status);
    let core=await coreRes.text();
    const v6=await v6Res.text();

    const m=v6.match(/const listenReplacement=String\.raw`([\s\S]*?)`;\n\nconst RATE=/);
    if(!m)throw new Error('找不到 v6 分級聽解產題器');
    const levelListening='const listenReplacement=String.raw`'+m[1].replace(/`/g,'\\`')+'`;';
    const oldRx=/const listenReplacement=`[\s\S]*?`;/;
    if(!oldRx.test(core))throw new Error('找不到 v5 listeningReplacement');
    core=core.replace(oldRx,levelListening);

    core=patchQuestionUniqueness(core);
    core=patchVisibleMockErrors(core);
    core=core.replaceAll('jlptV5Status',STATUS_ID)
             .replaceAll("dataset.jlptVersion='5'","dataset.jlptVersion='10.1'")
             .replace("./jlpt-app-v2.js?v=5","./jlpt-app-v2.js?v=10.1b")
             .replace("./jlpt-mock-state-v2.js?v=5","./jlpt-mock-state-v2.js?v=10.1b")
             .replace('v5 已啟用：所有科目強制去重；聽解每題音檔腳本皆為唯一情境。','v10.1 已啟用：聽解採多日語 voice 輪替；多人對話與題問強制使用不同聲線。');

    (0,eval)(core+'\n//# sourceURL=jlpt-app-v10.1-runtime.js');

    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(document.documentElement.dataset.jlptVersion==='10.1'){
        clearInterval(timer);
        if(status)status.textContent='v10.1 已載入：聽解多日語聲線輪替；多人對話不同聲線；題問不使用對話聲線。';
      }else if(tries>80){
        clearInterval(timer);
        if(status)status.innerHTML='<b style="color:#b42318">JLPT v10.1 初始化逾時</b><br><span class="small">請重新整理後再試一次。</span>';
      }
    },100);
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v10.1 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    console.error(err);
  }
}
boot();
})();
