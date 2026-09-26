(function(){
"use strict";
var DATA=window.TOEFL_MOCK_DATA,DAY="2026-09-26",STORE="toefl-mock-"+DAY;
var $=function(s,p){return(p||document).querySelector(s)},$$=function(s,p){return Array.prototype.slice.call((p||document).querySelectorAll(s))};
function esc(x){return String(x).replace(/[&<>"']/g,function(m){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])})}
function norm(x){return String(x||"").toLowerCase().replace(/[.,!?;:]/g,"").replace(/\s+/g," ").trim()}
function words(x){return(String(x||"").match(/\S+/g)||[])}
function hash(s){var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,seed){var x=a.slice(),r=rng(seed);for(var i=x.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var z=x[i];x[i]=x[j];x[j]=z}return x}
function msg(id,text,kind){var e=$(id);if(!e)return;e.className="result "+(kind||"");e.innerHTML=text;e.classList.remove("hidden")}
function countWords(s){return words(s).length}
function positionPlan(n,key){var a=[];for(var i=0;i<n;i++)a.push(i%4);return shuffle(a,hash(DAY+"|"+key))}
var reading=[],listening=[],rState={},lState={},wState={bs:DATA.writing.bs.map(function(){return{picked:[],checked:false,correct:false}}),email:null,discussion:null},sState={};
function makeReading(){
  DATA.reading.words.forEach(function(x,i){reading.push({id:"rw"+i,type:"words",text:x[4],answer:x[0],category:x[5],options:null})});
  DATA.reading.daily.forEach(function(x){reading.push({id:x[0],type:"daily",title:x[1],passage:x[2],question:x[3],options:x[4],correct:x[5],category:"detail"})});
  DATA.reading.academic.forEach(function(g,gi){g.qs.forEach(function(q,qi){reading.push({id:"a"+gi+"q"+qi,type:"academic",title:g.title,passage:g.text,question:q[0],options:q[1],correct:q[2],category:q[3]})})});
}
function makeListening(){
  var accents=["en-US","en-GB","en-AU","en-NZ"];
  DATA.listening.responses.forEach(function(x,i){listening.push({id:"lr"+i,type:"response",lang:accents[i%4],question:x[0],audio:x[0],options:x[1],correct:x[2],category:"Response"})});
  DATA.listening.conversations.forEach(function(c,ci){c[2].forEach(function(q,qi){listening.push({id:c[0]+"q"+qi,type:"conversation",lang:accents[(ci+1)%4],dialogue:c[1],question:q[0],audio:c[1]+" Question: "+q[0],options:q[1],correct:q[2],category:"Detail"})})});
  DATA.listening.announcements.forEach(function(c,ci){c[1].forEach(function(q,qi){listening.push({id:c[0]+"q"+qi,type:"announcement",lang:accents[(ci+2)%4],dialogue:c[1],question:q[0],audio:c[1]+" Question: "+q[0],options:q[1],correct:q[2],category:"Purpose"})})});
  DATA.listening.talks.forEach(function(c,ci){c[1].forEach(function(q,qi){listening.push({id:c[0]+"q"+qi,type:"talk",lang:accents[(ci+3)%4],dialogue:c[1],question:q[0],audio:c[1]+" Question: "+q[0],options:q[1],correct:q[2],category:"Main idea"})})});
}
makeReading();makeListening();
function prepared(item,index,section){
  var pos=positionPlan(section==="R"?reading.length:listening.length,section)[index];
  var others=item.options.map(function(v,i){return i===item.correct?null:v}).filter(Boolean);
  others=shuffle(others,hash(DAY+"|"+section+"|"+item.id));
  var out=[],k=0;for(var i=0;i<4;i++)out.push(i===pos?item.options[item.correct]:others[k++]);
  return{options:out,correct:pos};
}
function renderReading(){
  var box=$("#readingContent"),html='<div class="q"><div class="instruction"><b>Mock composition</b>：6 Complete the Words + 6 Read in Daily Life + 24 Read an Academic Passage = 36 items.</div></div>';
  var plan=positionPlan( reading.filter(function(x){return x.type!=="words"}).length,"R");
  var pi=0;
  reading.forEach(function(it,i){
    rState[it.id]={selected:null,checked:false,correct:false};
    if(it.type==="words"){
      html+='<div class="q" id="R-'+it.id+'"><div class="small">READING '+(i+1)+'/36</div><span class="tag">Complete the Words</span><p>'+esc(it.text).replace("_","<span class=\"blank\">____</span>")+'</p><input class="wordInput" data-id="'+it.id+'" type="text" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="Type the missing word"><div class="actions"><button class="checkWord" data-id="'+it.id+'">檢查</button><select class="errorTag"><option value="">錯題分類</option><option>字彙</option><option>拼字</option><option>詞性／word form</option></select></div><div class="result hidden" id="RF-'+it.id+'"></div></div>';
    }else{
      var p=prepared(it,pi++,"R"),o=p.options;rState[it.id].correct=p.correct;
      html+='<div class="q" id="R-'+it.id+'"><div class="small">READING '+(i+1)+'/36</div><span class="tag">'+esc(it.type==="daily"?"Read in Daily Life":"Read an Academic Passage")+'</span>'+ (it.title?'<span class="tag">'+esc(it.title)+'</span>':'') +
      (it.passage?'<div class="passage"><b>Text</b>'+it.passage.split("\\n").map(function(t){return"<p>"+esc(t)+"</p>"}).join("")+'</div>':'')+
      '<p><b>'+esc(it.question)+'</b></p>'+o.map(function(v,j){return'<button class="option rOpt" data-id="'+it.id+'" data-i="'+j+'">'+String.fromCharCode(65+j)+". "+esc(v)+"</button>"}).join("")+
      '<div class="actions"><button class="checkR" data-id="'+it.id+'">檢查</button><select class="errorTag"><option value="">錯題分類</option><option>主旨／purpose</option><option>細節／detail</option><option>推論／inference</option><option>字彙／vocabulary</option><option>組織／organization</option><option>說話者意圖</option></select><button class="ghost showR" data-id="'+it.id+'">顯示答案</button></div><div class="result hidden" id="RF-'+it.id+'"></div></div>';
    }
  });
  box.innerHTML=html;
}
function listeningAudioLabel(type){return type==="response"?"Listen and Choose a Response":"Listening "+type.charAt(0).toUpperCase()+type.slice(1)}
function renderListening(){
  var box=$("#listeningContent"),html="",plan=positionPlan(listening.length,"L");
  listening.forEach(function(it,i){
    var p=prepared(it,i,"L");lState[it.id]={selected:null,checked:false,correct:p.correct};
    html+='<div class="q" id="L-'+it.id+'"><div class="small">LISTENING '+(i+1)+'/36</div><span class="tag">'+esc(listeningAudioLabel(it.type))+'</span><span class="tag">'+esc(it.lang)+'</span>'+
      '<div class="audio"><button class="playBtn" data-id="'+it.id+'" data-mode="full">🔊 播放完整音檔</button>'+ (it.type==="response"?"":'<button class="playBtn" data-id="'+it.id+'" data-mode="question">🔊 只重播題問</button>')+'</div>'+
      '<p><b>題問</b> '+esc(it.question)+'</p>'+p.options.map(function(v,j){return'<button class="option lOpt" data-id="'+it.id+'" data-i="'+j+'">'+String.fromCharCode(65+j)+". "+esc(v)+"</button>"}).join("")+
      '<div class="actions"><button class="checkL" data-id="'+it.id+'">檢查</button><select class="errorTag"><option value="">錯題分類</option><option>主旨／main idea</option><option>細節／detail</option><option>推論／inference</option><option>說話者意圖／purpose</option><option>語氣／attitude</option><option>Response</option></select><button class="ghost showL" data-id="'+it.id+'">顯示答案</button></div><div class="result hidden" id="LF-'+it.id+'"></div><details class="transcript"><summary>訂正後看逐字稿</summary><div>'+esc(it.audio)+'</div></details></div>';
  });
  box.innerHTML=html;
}
function renderWriting(){
  var h='<div class="q"><div class="instruction">Writing raw 0–20 = 10 Build a Sentence ×1 + Email 0–5 + Academic Discussion 0–5。Build a Sentence 今日亂序由 2026-09-26 固定種子產生，刷新後仍相同。</div></div>';
  DATA.writing.bs.forEach(function(q,i){
    var toks=shuffle(q[0],hash(DAY+"|BS|"+i));
    if(toks.every(function(v,j){return v===q[0][j]}))toks.reverse();
    h+='<div class="q" id="W-'+i+'"><div class="small">WRITING Build a Sentence '+(i+1)+'/10</div><div class="chips">'+toks.map(function(t){return '<button class="chip bsTok" data-i="'+i+'" data-t="'+esc(t)+'">'+esc(t)+'</button>'}).join('')+'</div><div class="small">Your sentence</div><div class="answerline" id="WL-'+i+'"><span class="small">點選字詞組開始。</span></div><div class="actions"><button class="ghost bsUndo" data-i="'+i+'">移除最後一組</button><button class="ghost bsReset" data-i="'+i+'">重設</button><button class="checkBS" data-i="'+i+'">檢查</button></div><div class="result hidden" id="WF-'+i+'"></div></div>';
  });
  h+='<div class="q"><h3>Write an Email｜1 題</h3><div class="note">'+esc(DATA.writing.email)+'</div><textarea id="emailAnswer" placeholder="Write your email here..."></textarea><div class="count"><span>Email</span><span id="emailCount">0 words</span></div><button id="gradeEmail">站內模擬評分 0–5</button><div class="result hidden" id="emailResult"></div></div>';
  h+='<div class="q"><h3>Write for an Academic Discussion｜1 題</h3><div class="note">'+esc(DATA.writing.discussion)+'</div><textarea id="discussionAnswer" placeholder="Write your response here..."></textarea><div class="count"><span>Academic Discussion</span><span id="discussionCount">0 words</span></div><button id="gradeDiscussion">站內模擬評分 0–5</button><div class="result hidden" id="discussionResult"></div></div>';
  $("#writingContent").innerHTML=h;wireWriting();
}
function bsRenderLine(i){
  var box=$("#WL-"+i),a=wState.bs[i].picked;
  box.innerHTML=a.length?a.map(function(t,k){return '<button class="answerchip bsPicked" data-i="'+i+'" data-k="'+k+'">'+esc(t)+'</button>'}).join(''):'<span class="small">點選字詞組開始。</span>';
  $$('.bsTok[data-i="'+i+'"]').forEach(function(b){b.classList.toggle("used",a.indexOf(b.dataset.t)>=0)})
}
function simpleWritingGrade(text,type){
  var w=countWords(text),l=String(text).toLowerCase(),s=0,fb=[];
  if(w>=55)s++;if(w>=90)s++;if(w>=130)s++;
  if(type==="email"){if(/\b(dear|hello|hi)\b/i.test(text))s++;if(/\b(could|would|please|may i|would it be possible)\b/i.test(text))s++;if(/\b(field|visit|class|group|alternative|because|schedule)\b/i.test(text))s++;if(!/\b(could|would|please|may i)\b/i.test(text))fb.push("請把請求寫得更直接且禮貌。");}
  else{if(/\b(i think|i believe|in my view|i would argue|my position)\b/i.test(text)||/\bshould\b/i.test(text))s++;if(/\b(because|for example|for instance|such as|however|therefore)\b/i.test(text))s++;if(/\b(housing|culture|identity|preservation|resident|community|redevelopment)\b/i.test(text))s++;if(!/\b(because|for example|for instance|such as)\b/i.test(text))fb.push("可加入明確理由與具體例子。");}
  if(w<55)fb.push("內容偏短，建議補充背景、理由或結果。");
  return{score:Math.min(5,s),feedback:fb.length?fb:["主要任務元素已涵蓋；仍請人工檢查文法與語意。"]};
}
function renderScores(){
  var rb=reading.filter(function(x){return x._checked&&x._correct}).length,rw=reading.filter(function(x){return x._checked}).length;
  var lb=listening.filter(function(x){return x._checked&&x._correct}).length,lw=listening.filter(function(x){return x._checked}).length;
  var bs=wState.bs.filter(function(x){return x.checked&&x.correct}).length;
  var wr=bs+(wState.email?wState.email.score:0)+(wState.discussion?wState.discussion.score:0);
  var ss=speakingScore();
  $("#rKpi").innerHTML="<div><b>"+rb+"</b><span>對題</span></div><div><b>"+rw+"/36</b><span>已評</span></div><div><b>"+(rw?Math.round(rb/rw*100):0)+"%</b><span>正確率</span></div><div><b>"+(rw-rb)+"</b><span>錯題</span></div>";
  $("#lKpi").innerHTML="<div><b>"+lb+"</b><span>對題</span></div><div><b>"+lw+"/36</b><span>已評</span></div><div><b>"+(lw?Math.round(lb/lw*100):0)+"%</b><span>正確率</span></div><div><b>"+(lw-lb)+"</b><span>錯題</span></div>";
  $("#overallRaw").textContent="Reading "+rb+"/36｜Listening "+lb+"/36｜Writing "+wr+"/20｜Speaking "+ss+"/55";
  $("#stickyScore").textContent="R "+rb+"/36 · L "+lb+"/36 · W "+wr+"/20 · S "+ss+"/55";
  var wrong=reading.concat(listening).filter(function(x){return x._checked&&!x._correct}),tags={};
  wrong.forEach(function(x){var sec=x._sec==="L"?"L-":"R-",sel=$("#"+sec+x.id);if(sel){var s=$(".errorTag",sel);if(s&&s.value)tags[s.value]=(tags[s.value]||0)+1}});
  $("#errorSummary").innerHTML=wrong.length?("目前客觀題錯 "+wrong.length+" 題。 "+Object.keys(tags).map(function(k){return esc(k)+" × "+tags[k]}).join("；")+"。"):("目前尚無已確認錯題。");
}
function wireReadingListening(){
  document.addEventListener("click",function(e){
    var b=e.target.closest(".rOpt,.lOpt");if(!b)return;
    var id=b.dataset.id,st=b.classList.contains("rOpt")?rState[id]:lState[id],sel=b.classList.contains("rOpt")?".rOpt[data-id='"+id+"']":".lOpt[data-id='"+id+"']";
    $$(sel).forEach(function(x){x.classList.remove("selected")});b.classList.add("selected");st.selected=Number(b.dataset.i);
  });
  document.addEventListener("click",function(e){
    var b=e.target.closest(".checkR,.checkL");if(!b)return;var id=b.dataset.id,isR=b.classList.contains("checkR"),st=isR?rState[id]:lState[id],fb=$("#"+(isR?"RF-":"LF-")+id);if(st.selected===null){msg(fb,"請先選擇答案。","bad");return}
    st.checked=true;var item=(isR?reading:listening).find(function(x){return x.id===id});item._checked=true;item._correct=st.selected===st.correct;item._sec=isR?"R":"L";
    msg(fb,item._correct?"✓ 正確":"✗ 錯誤：可按「顯示答案」訂正。"+(item._options?" 正確答案："+String.fromCharCode(65+st.correct)+". "+esc(item._options[st.correct]):""),item._correct?"ok":"bad");renderScores();autoSave();
  });
  document.addEventListener("click",function(e){
    var b=e.target.closest(".showR,.showL");if(!b)return;var id=b.dataset.id,isR=b.classList.contains("showR"),item=(isR?reading:listening).find(function(x){return x.id===id}),fb=$("#"+(isR?"RF-":"LF-")+id),opts=item._options;msg(fb,"正確答案："+String.fromCharCode(65+item._correctIndex)+". "+esc(opts[item._correctIndex]),"ok");
  });
  document.addEventListener("click",function(e){
    var b=e.target.closest(".checkWord");if(!b)return;var id=b.dataset.id,item=reading.find(function(x){return x.id===id}),v=$(".wordInput[data-id='"+id+"']").value.trim();item._checked=true;item._correct=norm(v)===norm(item.answer);item._sec="R";msg($("#RF-"+id),item._correct?"✓ Correct":"✗ Correct answer: "+esc(item.answer),item._correct?"ok":"bad");renderScores();autoSave();
  });
}
function wireWriting(){
  $$(".bsTok").forEach(function(b){b.onclick=function(){var i=Number(b.dataset.i),a=wState.bs[i].picked;if(a.indexOf(b.dataset.t)<0){a.push(b.dataset.t);bsRenderLine(i)}autoSave()}});
  $$(".bsUndo").forEach(function(b){b.onclick=function(){var i=Number(b.dataset.i);wState.bs[i].picked.pop();bsRenderLine(i);autoSave()}});
  $$(".bsReset").forEach(function(b){b.onclick=function(){var i=Number(b.dataset.i);wState.bs[i].picked=[];wState.bs[i].checked=false;bsRenderLine(i);$("#WF-"+i).className="result hidden";autoSave()}});
  $$(".bsPicked").forEach(function(b){b.onclick=function(){var i=Number(b.dataset.i);wState.bs[i].picked.splice(Number(b.dataset.k),1);bsRenderLine(i);autoSave()}});
  $$(".checkBS").forEach(function(b){b.onclick=function(){var i=Number(b.dataset.i),st=wState.bs[i],ans=DATA.writing.bs[i][1];st.checked=true;st.correct=norm(st.picked.join(" "))===norm(ans);msg($("#WF-"+i),st.correct?"✓ 正確":"✗ 請檢查詞序與句型骨架。正確句："+esc(ans),st.correct?"ok":"bad");renderScores();autoSave()}});
  var e=$("#emailAnswer"),d=$("#discussionAnswer");
  e.oninput=function(){$("#emailCount").textContent=countWords(e.value)+" words";autoSave()};d.oninput=function(){$("#discussionCount").textContent=countWords(d.value)+" words";autoSave()};
  $("#gradeEmail").onclick=function(){wState.email=simpleWritingGrade(e.value,"email");var r=wState.email;msg($("#emailResult"),"站內練習估分："+r.score+"/5<br>"+r.feedback.map(esc).join("<br>")+"<div class='small'>非 ETS 正式評分，也不是 1–6 正式換算。</div>",r.score>=4?"ok":"warn");renderScores();autoSave()};
  $("#gradeDiscussion").onclick=function(){wState.discussion=simpleWritingGrade(d.value,"discussion");var r=wState.discussion;msg($("#discussionResult"),"站內練習估分："+r.score+"/5<br>"+r.feedback.map(esc).join("<br>")+"<div class='small'>非 ETS 正式評分，也不是 1–6 正式換算。</div>",r.score>=4?"ok":"warn");renderScores();autoSave()};
}
var BAD=["espeak","festival","flite","pico","mbrola","robot","whisper","bells","boing","bubbles","organ","zarvox"],voiceCache=[],speechToken=0;
function voices(){if(!("speechSynthesis"in window))return[];var seen={};return speechSynthesis.getVoices().filter(function(v){var k=(v.voiceURI||v.name||"")+"|"+(v.lang||"");if(seen[k])return false;seen[k]=1;var n=(v.name||"").toLowerCase(),l=(v.lang||"").toLowerCase();return /^en(-|_)/i.test(l)&&!BAD.some(function(x){return n.indexOf(x)>=0})})}
function voiceRank(v,locale,used){
  var l=(v.lang||"").toLowerCase(),want=(locale||"en-US").toLowerCase(),pref=want==="en-nz"?["en-nz","en-au","en-gb","en-us","en-ca"]:want==="en-au"?["en-au","en-nz","en-gb","en-us","en-ca"]:want==="en-gb"?["en-gb","en-ie","en-au","en-nz","en-us"]:["en-us","en-ca","en-gb","en-au","en-nz"];
  var p=pref.indexOf(l);if(p<0)p=50;var s=p*5;if(l===want)s-=30;var n=(v.name||"").toLowerCase();if(/natural|neural|enhanced|premium|google|microsoft|apple/.test(n))s-=8;if(v.localService)s-=1;if(used[v.voiceURI||v.name])s+=100;return s;
}
function pickVoice(locale,used){var a=voices().slice().sort(function(a,b){return voiceRank(a,locale,used)-voiceRank(b,locale,used)});return a[0]||null}
function splitAudio(text,locale,questionOnly){
  if(questionOnly)return[{role:"__NARRATOR__",text:text,locale:locale}];
  var q=text.lastIndexOf(" Question:"),qtext=q>=0?text.slice(q+10).trim():"",body=q>=0?text.slice(0,q).trim():text,lines=body.split("\n").filter(Boolean),segs=[];
  lines.forEach(function(line){var m=line.match(/^([A-Z][A-Za-z0-9 _-]{0,25}):\s*(.*)$/);if(m)segs.push({role:m[1],text:m[2],locale:locale});else if(segs.length)segs[segs.length-1].text+=" "+line;else segs.push({role:"__NARRATOR__",text:line,locale:locale})});
  if(qtext)segs.push({role:"__NARRATOR__",text:qtext,locale:locale});
  return segs;
}
function speakAudio(text,locale,button,questionOnly){
  if(!("speechSynthesis"in window)){alert("目前瀏覽器不支援語音播放，請使用 Safari／Chrome／Edge。");return}
  var token=++speechToken;try{speechSynthesis.cancel()}catch(e){}
  var segs=splitAudio(text,locale,questionOnly),used={},roleVoices={};
  var roles=[];segs.forEach(function(s){if(roles.indexOf(s.role)<0)roles.push(s.role)});
  roles.forEach(function(role){roleVoices[role]=pickVoice(role==="__NARRATOR__"?"en-US":locale,used);if(roleVoices[role])used[roleVoices[role].voiceURI||roleVoices[role].name]=1});
  if(button){button.setAttribute("aria-busy","true");button.dataset.old=button.dataset.old||button.textContent;button.textContent="🔊 播放中｜再按可重播"}
  function next(i){
    if(token!==speechToken||i>=segs.length){if(button){button.removeAttribute("aria-busy");button.textContent=button.dataset.old||"播放"}return}
    var s=segs[i],v=roleVoices[s.role]||pickVoice(s.locale,{});
    if(!v){next(i+1);return}
    var u=new SpeechSynthesisUtterance(s.text);u.voice=v;u.lang=v.lang||s.locale;u.rate=.94;u.pitch=1;u.volume=1;
    u.onend=function(){setTimeout(function(){next(i+1)},roles.length>1&&i+1<segs.length&&segs[i+1].role!==s.role?120:35)};
    u.onerror=function(){setTimeout(function(){next(i+1)},80)};speechSynthesis.speak(u)
  }
  next(0)
}
function updateVoiceStatus(){
  var v=voices();$("#voiceStatus").textContent=v.length?"可用正常英文聲線："+v.length+"。播放時優先 Natural／Neural／Enhanced／Premium／Google／Microsoft／Apple；指定口音沒有合適聲線時會退回最近的正常英文聲線。":"尚未偵測到正常英文聲線；請在系統／瀏覽器安裝英文語音。";
}
function wireListeningAudio(){
  document.addEventListener("click",function(e){var b=e.target.closest(".playBtn");if(!b)return;var it=listening.find(function(x){return x.id===b.dataset.id});if(!it)return;speakAudio(b.dataset.mode==="question"?it.question:it.audio,it.lang,b,b.dataset.mode==="question")});
  updateVoiceStatus();if("speechSynthesis"in window){speechSynthesis.onvoiceschanged=updateVoiceStatus;setTimeout(updateVoiceStatus,500)}
}
function transcriptScore(target,actual){var A=norm(target).split(" ").filter(Boolean),B=norm(actual).split(" ").filter(Boolean);if(!A.length||!B.length)return 0;var d=Array.from({length:A.length+1},function(){return Array(B.length+1).fill(0)});for(var i=1;i<=A.length;i++)for(var j=1;j<=B.length;j++)d[i][j]=A[i-1]===B[j-1]?d[i-1][j-1]+1:Math.max(d[i-1][j],d[i][j-1]);return d[A.length][B.length]/Math.max(A.length,B.length)}
var SPEAK=DATA.speaking,media=null,recognition=null;
function initSpeaking(){
  SPEAK.repeat.forEach(function(q,i){var id="sr"+i;sState[id]={auto:0,final:0,transcript:"",audioUrl:""}});
  SPEAK.interview.forEach(function(q,i){var id="si"+i;sState[id]={auto:0,final:0,transcript:"",audioUrl:""}});
  var h="";
  SPEAK.repeat.forEach(function(q,i){var id="sr"+i;h+='<div class="q" id="S-'+id+'"><div class="small">SPEAKING '+(i+1)+'/11</div><span class="tag">Listen and Repeat</span><span class="tag">'+esc(q[1])+'</span><div class="audio"><button class="speakPrompt" data-id="'+id+'">🔊 播放句子</button></div><div class="note">播放後完整重述。評分重點是 intelligibility、節奏與內容相似度；站內自動分只提供建議。</div>'+recordUI(id)+'</div>'});
  SPEAK.interview.forEach(function(q,i){var id="si"+i;h+='<div class="q" id="S-'+id+'"><div class="small">SPEAKING '+(i+8)+'/11</div><span class="tag">Take an Interview</span><span class="tag">'+esc(q[3])+'</span><div class="audio"><button class="speakPrompt" data-id="'+id+'">🔊 播放題問</button></div><div class="note"><b>Prompt</b><br>'+esc(q[0])+'<br><span class="small">策略：'+esc(q[2])+'</span></div>'+recordUI(id)+'</div>'});
  $("#speakingContent").innerHTML=h;wireSpeaking();
}
function recordUI(id){return'<div class="recordbox"><div class="barbtns"><button class="startRec" data-id="'+id+'">🎙️ 錄音</button><button class="stopRec ghost" data-id="'+id+'" disabled>⏹ 停止</button></div><div class="small recStatus" id="RS-'+id+'">尚未錄音</div><audio class="recAudio hidden" id="AU-'+id+'" controls></audio><textarea class="transcriptInput" id="TR-'+id+'" placeholder="自動英文逐字稿會寫入這裡；也可在辨識後手動修正。"></textarea><div class="actions"><button class="gradeS ghost" data-id="'+id+'">自動建議分數 0–5</button><select class="finalS" data-id="'+id+'">'+[0,1,2,3,4,5].map(function(n){return'<option value="'+n+'">'+n+'/5 最終修正</option>'}).join("")+'</select></div><div class="result hidden" id="SR-'+id+'"></div></div>'}
function startRecognition(id){
  var R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return null;try{var r=new R();r.lang="en-US";r.continuous=true;r.interimResults=true;r.onresult=function(e){var text="";for(var i=e.resultIndex;i<e.results.length;i++)text+=e.results[i][0].transcript+" ";text=text.trim();$("#TR-"+id).value=text;sState[id].transcript=text};r.onerror=function(){};r.start();return r}catch(e){return null}
}
function stopRecognition(){if(recognition){try{recognition.stop()}catch(e){}recognition=null}}
function startRecord(id){
  if(media){stopRecord(media.id)}
  var st=sState[id],status=$("#RS-"+id);if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==="undefined"){status.textContent="此瀏覽器無法錄音，請改用 Safari／Chrome／Edge 並允許麥克風。";return}
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(function(stream){
    var mime=["audio/mp4","audio/webm;codecs=opus","audio/webm"].find(function(m){return window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(m)})||"";
    var rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),chunks=[];rec.ondataavailable=function(e){if(e.data.size)chunks.push(e.data)};rec.onstop=function(){var blob=new Blob(chunks,{type:mime||"audio/webm"});if(st.audioUrl)URL.revokeObjectURL(st.audioUrl);st.audioUrl=URL.createObjectURL(blob);var a=$("#AU-"+id);a.src=st.audioUrl;a.classList.remove("hidden");stream.getTracks().forEach(function(t){t.stop()});status.textContent="錄音完成，可回放；逐字稿可編輯後再評分。"};rec.start();media={id:id,rec:rec,stream:stream};recognition=startRecognition(id);$(".startRec[data-id='"+id+"']").disabled=true;$(".stopRec[data-id='"+id+"']").disabled=false;status.textContent="錄音中…";}).catch(function(err){status.textContent="無法取得麥克風權限："+String(err.message||err)})
}
function stopRecord(id){
  if(!media||media.id!==id)return;try{media.rec.stop()}catch(e){}try{media.stream.getTracks().forEach(function(t){t.stop()})}catch(e){}media=null;stopRecognition();$(".startRec[data-id='"+id+"']").disabled=false;$(".stopRec[data-id='"+id+"']").disabled=true
}
function speakingScore(){
  return Object.keys(sState).reduce(function(sum,id){return sum+(sState[id].final||0)},0)
}
function gradeSpeaking(id){
  var idx=Number(id.replace("sr",""));if(id.indexOf("sr")===0){var q=SPEAK.repeat[idx],t=$("#TR-"+id).value||"",sim=transcriptScore(q[0],t),s=Math.round(sim*5),fb=sim>=.9?"逐字稿高度相似；仍需人工修正 pronunciation/intelligibility。":sim>=.7?"內容大致相似；請人工檢查漏字與節奏。":"逐字稿相似度偏低；請重新錄音或手動修正逐字稿。";sState[id].transcript=t;sState[id].auto=s;if(!$(".finalS[data-id=\""+id+"\"]").dataset.changed)sState[id].final=s;msg($("#SR-"+id),"自動建議："+s+"/5｜最終採計："+sState[id].final+"/5<br>"+esc(fb)+"<div class='small'>此分數主要依逐字稿相似度，不等同 ETS pronunciation／intelligibility 評分。</div>",s>=4?"ok":"warn")}
  else{var i=Number(id.replace("si","")),q=SPEAK.interview[i],t=$("#TR-"+id).value||"",w=countWords(t),l=t.toLowerCase(),hits=q[1].filter(function(k){return l.indexOf(k)>=0}).length,conn=(l.match(/\b(because|for example|for instance|however|therefore|also|but|so)\b/g)||[]).length,s=(w>=45?2:w>=25?1:0)+(hits>=3?2:hits>=1?1:0)+((conn>=2||/[.!?]/.test(t))?1:0);s=Math.min(5,s);sState[id].transcript=t;sState[id].auto=s;if(!$("#FS-"+id).dataset.changed)sState[id].final=s;msg($("#SR-"+id),"自動建議："+s+"/5｜最終採計："+sState[id].final+"/5<br>切題／展開："+(hits>=3?"較完整":"可再補充")+"；速度、停頓、pronunciation、rhythm、intonation、intelligibility、grammar、vocabulary 請人工修正。",s>=4?"ok":"warn")};renderScores();autoSave()
}
function wireSpeaking(){
  $$(".speakPrompt").forEach(function(b){b.onclick=function(){var id=b.dataset.id,idx=Number(id.slice(2)),q=id.indexOf("sr")===0?SPEAK.repeat[idx]:SPEAK.interview[idx],text=id.indexOf("sr")===0?q[0]:q[0];speakAudio(text,q[id.indexOf("sr")===0?1:3],b,false)}});
  $$(".startRec").forEach(function(b){b.onclick=function(){startRecord(b.dataset.id)}});
  $$(".stopRec").forEach(function(b){b.onclick=function(){stopRecord(b.dataset.id)}});
  $$(".gradeS").forEach(function(b){b.onclick=function(){gradeSpeaking(b.dataset.id)}});
  $$(".finalS").forEach(function(s){s.onchange=function(){var id=s.dataset.id;sState[id].final=Number(s.value);$("#FS-"+id).dataset.changed="1";renderScores();autoSave()}});
}
function wireAudioDetails(){wireListeningAudio()}
function timer(){
  var left=10800,id=null;
  function paint(){var h=Math.floor(left/3600),m=Math.floor(left%3600/60),s=left%60;$("#timer").textContent=String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");$("#timerBar").style.width=((1-left/10800)*100)+"%"}
  $("#startTimer").onclick=function(){if(id)return;id=setInterval(function(){left=Math.max(0,left-1);paint();if(left===0){clearInterval(id);id=null;alert("180 分鐘完成，請進入最後訂正。")}},1000)};
  $("#pauseTimer").onclick=function(){clearInterval(id);id=null};
  $("#resetTimer").onclick=function(){clearInterval(id);id=null;left=10800;paint()};paint()
}
function autoSave(){
  try{localStorage.setItem(STORE,JSON.stringify({r:rState,l:lState,w:wState,s:sState,email:$("#emailAnswer")?$("#emailAnswer").value:"",discussion:$("#discussionAnswer")?$("#discussionAnswer").value:"",notes:$("#reviewNotes").value,checks:$$(".selfCheck:checked").map(function(x){return x.id},)}))}catch(e){}
}
function restore(){
  try{var z=JSON.parse(localStorage.getItem(STORE)||"null");if(!z)return;
    if(z.r)Object.keys(z.r).forEach(function(k){if(rState[k]){rState[k]=z.r[k];var it=reading.find(function(x){return x.id===k});if(it&&z.r[k].checked){it._checked=true;it._correct=z.r[k].selected===z.r[k].correct;it._sec="R"}}});
    if(z.l)Object.keys(z.l).forEach(function(k){if(lState[k]){lState[k]=z.l[k];var it=listening.find(function(x){return x.id===k});if(it&&z.l[k].checked){it._checked=true;it._correct=z.l[k].selected===z.l[k].correct;it._sec="L"}}});
    if(z.w){wState=Object.assign(wState,z.w);wState.bs=z.w.bs||wState.bs}
    if($("#emailAnswer"))$("#emailAnswer").value=z.email||"";if($("#discussionAnswer"))$("#discussionAnswer").value=z.discussion||"";$("#reviewNotes").value=z.notes||"";(z.checks||[]).forEach(function(id){var c=$("#"+id);if(c)c.checked=true});
    reading.forEach(function(it){var st=rState[it.id];if(st&&st.selected!==null){var b=$("#R-"+it.id+" .rOpt:nth-of-type("+(st.selected+1)+")");if(b)b.classList.add("selected")}});
    listening.forEach(function(it){var st=lState[it.id];if(st&&st.selected!==null){var bs=$("#L-"+it.id+" .lOpt:nth-of-type("+(st.selected+1)+")");if(bs)bs.classList.add("selected")}});
    DATA.writing.bs.forEach(function(_,i){bsRenderLine(i)});
    if($("#emailAnswer"))$("#emailCount").textContent=countWords($("#emailAnswer").value)+" words";if($("#discussionAnswer"))$("#discussionCount").textContent=countWords($("#discussionAnswer").value)+" words";
    Object.keys(sState).forEach(function(id){var st=sState[id],ta=$("#TR-"+id);if(ta)ta.value=st.transcript||"";var fs=$("#S-"+id+" .finalS");if(fs)fs.value=st.final||0});renderScores()
  }catch(e){}
}
function finalRecord(){
  $("#saveRecord").onclick=function(){autoSave();alert("已儲存 2026-09-26 今日模考紀錄。")};
  $("#clearRecord").onclick=function(){if(confirm("清除今天所有作答與紀錄？")){localStorage.removeItem(STORE);location.reload()}};
}
renderReading();renderListening();renderWriting();initSpeaking();wireReadingListening();wireAudioDetails();timer();finalRecord();restore();renderScores();
window.__TOEFL_MOCK_READY=true;
})();