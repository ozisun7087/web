(()=>{
'use strict';
/* JLPT Study Lab v5 loader
   - Loads the stable v2 application source, then replaces all four question generators.
   - Listening audio is generated from a unique index -> unique day/place/time/action combination.
   - Daily and Mock sets enforce a second uniqueness check on prompt/passage/audio signatures.
   - Same date + level stays deterministic; next date changes the set.
*/

const vocabReplacement=`function vocabQ(type,i,seed,mode){
  const r=rng(seed+i*97),bank=LEX[S.level];
  const order=shuffle(bank,rng(hash('vocab-v5|'+S.level+'|'+mode+'|'+seed)));
  const x=order[i%order.length],others=shuffle(bank.filter(y=>y!==x),r);
  let p='',a='',o=[];
  if(type==='kanji'){
    p='「'+x[0]+'」の読み方として最も適切なものを選んでください。';a=x[1];o=[a,...others.slice(0,3).map(y=>y[1])];
  }else if(type==='orthography'){
    p='「'+x[1]+'」の表記として最も適切なものを選んでください。';a=x[0];o=[a,...others.slice(0,3).map(y=>y[0])];
  }else if(type==='wordFormation'){
    const wf=WF.concat([
      ['申請書を（　）提出してください。','再',['未','非','無']],
      ['この資料はまだ（　）公開です。','未',['再','全','過']],
      ['内容に誤りがあったため（　）確認した。','再',['不','逆','外']],
      ['この設備は（　）使用が可能です。','再',['未','否','半']],
      ['事故の（　）発を防ぐ対策が必要だ。','再',['未','非','逆']],
      ['計画を（　）調整する必要がある。','再',['不','未','無']],
      ['結果は現在（　）確定です。','未',['再','非','全']],
      ['資料を（　）整理して提出した。','再',['否','逆','外']]
    ]);
    const z=shuffle(wf,rng(hash('wf-v5|'+S.level+'|'+mode+'|'+seed)))[i%wf.length];p=z[0];a=z[1];o=[a,...z[2]];
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

const grammarReplacement=`function grammarQ(type,i,seed,mode){
  const r=rng(seed+i*131);
  const extra={
    N5:[
      ['日曜日は学校が（　）。','休みです',['休みます','休んで','休みでしたか']],
      ['ここに名前を（　）ください。','書いて',['書く','書いた','書き']],
      ['田中さんは料理が（　）です。','上手',['上手に','上手を','上手での']],
      ['机の上（　）本があります。','に',['を','へ','で']],
      ['日本語の本を二冊（　）。','買いました',['買いますか','買うで','買いに']],
      ['今日は昨日（　）寒くありません。','ほど',['まで','しか','だけ']]
    ],
    N4:[
      ['この薬は食事のあとで（　）ください。','飲んで',['飲む','飲んだ','飲み']],
      ['駅に着いたら私に（　）ください。','連絡して',['連絡する','連絡した','連絡を']],
      ['この本は思った（　）難しくありません。','ほど',['しか','まで','だけ']],
      ['先生に相談した（　）、方法が分かりました。','おかげで',['ために','せいを','ところに']],
      ['来週までにレポートを出さ（　）なりません。','なければ',['なくて','ないで','ないほど']],
      ['その店は駅から歩いて五分（　）です。','くらい',['しかを','までを','だけを']]
    ],
    N3:[
      ['予約を変更する（　）、前日までに連絡してください。','場合は',['うちに','ばかりに','ところで']],
      ['説明を聞けば聞く（　）、疑問が増えました。','ほど',['しか','だけ','まで']],
      ['彼は日本に十年住んでいる（　）、漢字が苦手です。','わりに',['ために','ほどで','だけに']],
      ['申込書は明日までに提出する（　）になっています。','こと',['もの','ところ','わけ']],
      ['この仕事は経験がある人（　）難しいでしょう。','でも',['しか','こそ','ほど']],
      ['電車が止まった（　）、会議に遅れました。','ために',['うちに','ほどに','だけで']]
    ],
    N2:[
      ['事情（　）、予定を変更する場合があります。','によっては',['に先立って','に限って','に反して']],
      ['この制度は利用者の声（　）改善された。','をもとに',['を問わず','にかけて','に反して']],
      ['忙しいからといって、連絡をしなくていい（　）。','わけではない',['に違いない','にすぎない','ことになる']],
      ['結果（　）、次の調査方法を決める。','に応じて',['に先立って','を問わず','に反して']],
      ['安全性を確保する（　）、手順を見直した。','ために',['わりに','だけに','ほどに']],
      ['新制度の導入（　）、説明会が開かれた。','に先立って',['に反して','に限って','に応じて']]
    ],
    N1:[
      ['状況を十分に把握した（　）でなければ判断できない。','うえ',['そば','末','きり']],
      ['彼の努力には敬意を払わずには（　）。','いられない',['おかない','すまないで','ならないか']],
      ['議論は結論が出ない（　）、時間だけが過ぎていった。','まま',['なり','ほど','きりで']],
      ['制度の変更は影響の大きさ（　）慎重に進めるべきだ。','ゆえに',['そばから','を皮切りに','にひきかえ']],
      ['予想外の反対を受け、計画は変更を（　）。','余儀なくされた',['禁じ得なかった','ものとした','極まりなかった']],
      ['数字だけを根拠に結論を出すのは早計と（　）。','言わざるを得ない',['言うまでもない','言ってやまない','言いかねるべきだ']]
    ]
  };
  const extraSc={
    N5:[['母と','スーパーで','野菜を','買いました'],['明日','友達に','電話を','します'],['教室で','先生の話を','よく','聞きます']],
    N4:[['宿題が終わったら','友達と','公園へ','行きます'],['駅に着いたら','すぐに','電話して','ください'],['この店では','カードで','払うことが','できます']],
    N3:[['雨が降っても','予定どおり','試合を','行います'],['必要な資料を','そろえてから','申請書を','提出してください'],['この経験を','将来の仕事に','生かしたいと','考えています']],
    N2:[['利用者の意見を','十分に聞いたうえで','新しい制度を','導入しました'],['予算の範囲内で','できるだけ','効果の高い方法を','選ぶべきです'],['安全性だけでなく','使いやすさにも','配慮する必要が','あります']],
    N1:[['複雑な背景を','考慮に入れたうえで','最終的な判断を','下すべきだ'],['短期的利益を','優先するあまり','長期的影響を','見失ってはならない'],['複数の資料を','照合してこそ','事実関係を','正確に把握できる']]
  };
  if(type==='composition'){
    const all=(SC[S.level]||[]).concat(extraSc[S.level]||[]),order=shuffle(all,rng(hash('grammar-comp-v5|'+S.level+'|'+mode+'|'+seed)));
    const c=order[i%order.length],star=2,opts=shuffle(c,r);
    return{id:qid('grammar',type,i,mode),skill:'grammar',type,p:'次の語句を正しい順序に並べたとき、★に入るものを選んでください。\\n'+c[0]+'　＿＿　＿＿　★　＿＿',a:c[star],o:opts,e:'正しい語順：'+c.join(' ')};
  }
  const bank=(GR[S.level]||[]).concat(extra[S.level]||[]),order=shuffle(bank,rng(hash('grammar-'+type+'-v5|'+S.level+'|'+mode+'|'+seed)));
  const x=order[i%order.length];
  const p=type==='text'?'前後の流れを考えて、最も自然なものを選んでください。\\n'+x[0]:x[0];
  return{id:qid('grammar',type,i,mode),skill:'grammar',type,p,a:x[1],o:shuffle([x[1],...x[2]],r),e:'この文脈では「'+x[1]+'」が最も自然です。'};
}`;

const readingReplacement=`function readingQ(type,i,seed,mode){
  const r=rng(seed+i*173),serial=(seed%9973)+i;
  const names=['田中','佐藤','鈴木','高橋','山田','伊藤','渡辺','中村','小林','加藤'];
  const places=['図書館','市民センター','駅前広場','大学','公園','博物館','体育館','地域交流館','商店街','文化会館'];
  const days=['月曜日','火曜日','水曜日','木曜日','金曜日','土曜日','日曜日'];
  const times=['9時','10時','11時','13時','14時','15時','16時','17時'];
  const topics=['公共交通','地域イベント','図書館サービス','公園整備','ごみ収集','学校行事','観光案内','防災訓練','健康講座','地域交流'];
  const actions=['参加者を増やす','利用時間を見直す','案内を分かりやすくする','予約方法を簡単にする','安全確認を強化する','費用を抑える','情報提供を早める','利用者の意見を集める'];
  const effects=['利用しやすくなる','混雑が減る','参加者が増える','負担が軽くなる','安全性が高まる','情報を得やすくなる','地域の交流が増える','手続きが早くなる'];
  const day=days[i%days.length],place=places[Math.floor(i/days.length)%places.length],time=times[(serial*3)%times.length];
  const n=names[(serial*5)%names.length],topic=topics[(serial*7)%topics.length],action=actions[(serial*11)%actions.length],effect=effects[(serial*13)%effects.length];
  let pass='',p='',a='',d=[];
  if(type==='info'){
    const close=times[(serial*3+3)%times.length];
    pass=place+'のお知らせ：'+day+'は'+time+'から'+close+'まで利用できます。受付は終了時刻の30分前までです。';
    p=place+'について正しいものはどれですか。';a=day+'は'+time+'から利用できる';d=['毎日24時間利用できる','受付は終了後でもできる',day+'は休館である'];
  }else if(S.level==='N5'){
    pass=n+'さんは'+day+'に'+place+'へ行きます。'+time+'に友達と会って、そのあと'+topic+'について話します。';
    p=n+'さんは何時に友達と会いますか。';a=time;d=times.filter(x=>x!==time).slice(0,3);
  }else if(S.level==='N4'){
    pass=n+'さんは'+day+'に'+place+'のイベントへ行く予定です。しかし開始時間が変わり、'+time+'からになりました。参加する人は新しい時間を確認する必要があります。';
    p='参加する人が確認する必要があることは何ですか。';a='新しい開始時間';d=['会場の名前だけ','参加費の返金','イベントの中止'];
  }else if(S.level==='N3'){
    pass=day+'、'+place+'では'+topic+'について新しい取り組みを始めた。目的は'+action+'ことである。開始後、'+effect+'という声がある一方、運用方法をさらに改善してほしいという意見も出ている。';
    p='この文章から分かることは何ですか。';a='取り組みには効果があるが改善を求める声もある';d=['取り組みは完全に失敗した','利用者から意見は出ていない','取り組みはすでに中止された'];
  }else if(S.level==='N2'){
    pass=day+'に'+place+'で行われた'+topic+'の検討では、単に制度を増やすだけでは十分とは限らないとされた。'+action+'ことに加え、実際の利用者がどのような条件で使うのかを把握する必要がある。その結果、'+effect+'可能性が高まる。';
    p=type==='thematic'?'筆者が最も重視していることは何ですか。':'筆者の考えに最も合うものはどれですか。';
    a='制度だけでなく利用者の条件も考えること';d=['制度の数だけを増やすこと','利用者の意見を聞かないこと','条件に関係なく同じ方法を使うこと'];
  }else{
    pass=day+'の'+place+'での'+topic+'をめぐる議論では、数値化された成果が重視されやすい。しかし、何を成果として測るかという段階ですでに判断が含まれている。'+action+'ためには、指標そのものの妥当性を問い直し、数値に表れにくい影響も検討する必要がある。そうすることで、'+effect+'だけでなく、制度の意味をより多面的に捉えられる。';
    p=type==='integrated'?'この文章の論理に最も合うものはどれですか。':type==='thematic'?'筆者の主張は何ですか。':'筆者が重要だと考えていることは何ですか。';
    a='指標の選び方を含めて多面的に評価すること';d=['数値だけで自動的に判断すること','測りにくい影響を除外すること','一つの指標だけを長く使うこと'];
  }
  return{id:qid('reading',type,i,mode),skill:'reading',type,pass,p,a,o:shuffle([a,...d],r),e:'本文の内容に最も合うのは「'+a+'」です。'};
}`;

const listenReplacement=`function listenQ(type,i,seed,mode){
  const r=rng(seed+i*199),serial=(seed%100003)+i;
  /* i is global within the Listening set. The pair day+place is therefore unique
     for the first 56 questions, more than any JLPT Listening section used here. */
  const days=['月曜日','火曜日','水曜日','木曜日','金曜日','土曜日','日曜日'];
  const places=['図書館','市民センター','大学','公園','会議室','体育館','博物館','文化会館'];
  const names=['田中','佐藤','鈴木','高橋','山田','伊藤','渡辺','中村'];
  const times=['9時','10時','11時','13時','14時','15時','16時','17時'];
  const actions=['資料をメールで送る','予約を変更する','先生に連絡する','受付で申込書を出す','会議資料を確認する','本を返却する','参加者に時間変更を知らせる','必要な写真を提出する','アンケートを集める','会場を予約する'];
  const topics=['交通計画','地域イベント','図書館サービス','防災訓練','公共施設','研究発表','観光案内','環境対策'];
  const day=days[i%days.length],place=places[Math.floor(i/days.length)%places.length];
  const n=names[(serial*3)%names.length],t1=times[(serial*5)%times.length],t2=times[(serial*5+3)%times.length];
  const act=actions[(serial*7)%actions.length],topic=topics[(serial*11)%topics.length];
  let audio='',p='',a='',d=[];
  if(type==='quick'||type==='verbal'){
    if(i%3===0){
      audio='今度の'+day+'に'+place+'へ行きたいんですが、何時から利用できますか。';
      p='最も自然な答えはどれですか。';a=t1+'からです。';d=['昨日でした。','三人です。','駅の近くです。'];
    }else if(i%3===1){
      audio=day+'に'+place+'へ行く前に、この書類を'+t1+'までに出したほうがいいですか。';
      p='最も自然な答えはどれですか。';a='はい、できればその時間までにお願いします。';d=['いいえ、書類ではありません。','三人で駅です。','毎週読みます。'];
    }else{
      audio=day+'の'+t1+'から'+place+'で'+topic+'の説明会があります。参加しますか。';
      p='最も自然な答えはどれですか。';a='はい、予定が空いているので参加します。';d=['説明会は青いです。','昨日参加します。','駅を三つ買います。'];
    }
  }else if(type==='task'){
    audio='女の人：'+n+'さん、'+day+'に'+place+'へ行く前に、まず'+act+'のを忘れないでください。男の人：わかりました。'+t1+'までに先にそれを済ませます。';
    p='男の人はこのあと最初に何をしますか。';a=act;d=actions.filter(x=>x!==act).slice(0,3);
  }else if(type==='point'){
    audio='男の人：'+day+'の'+topic+'の会議は'+t1+'からでしたね。女の人：時間が変わって、'+t2+'からになりました。場所は'+place+'のままです。';
    p='会議は何時からですか。';a=t2;d=times.filter(x=>x!==t2).slice(0,3);
  }else if(type==='summary'){
    audio='女の人：'+day+'に'+place+'で話し合った'+topic+'についてですが、設備を増やすだけでは十分ではありません。利用する人の意見を聞いて、実際に使いやすい方法を考える必要があります。';
    p='女の人が最も言いたいことは何ですか。';a='利用者の意見を聞いて改善方法を考えるべきだ';d=['設備だけ増やせばよい','利用者の意見は必要ない','改善をやめるべきだ'];
  }else{
    audio='先生：'+day+'に'+place+'で検討する'+topic+'について二つの案があります。A案は短期間で実施できますが費用が高く、B案は時間がかかりますが維持費を抑えられます。今回は長期的な費用を重視します。';
    p='先生の方針に最も合うものはどれですか。';a='長期費用を考えてB案を詳しく検討する';d=['短期間という理由だけでA案に決める','どちらの案も検討しない','費用を考えずA案を選ぶ'];
  }
  if(S.level==='N1'&&type!=='quick'&&type!=='verbal')audio+=' なお、判断の前提となる条件が変われば結論も見直す必要があります。';
  else if(S.level==='N2'&&type!=='quick'&&type!=='verbal')audio+=' そのため、条件を確認してから最終的に判断します。';
  return{id:qid('listening',type,i,mode),skill:'listening',type,audio,p,a,o:shuffle([a,...d],r),e:'音声内容から「'+a+'」が正解です。'};
}`;

const dailyReplacement=`function dailySet(skill){
  const key=[S.level,skill,dkey()].join('|');if(S.sets[key])return S.sets[key];
  const count=OFFICIAL[S.level].daily[skill],types=typePlan(skill,count),seed=hash('daily-v5|'+key),seen=new Set(),out=[];
  types.forEach((t,i)=>{
    let q=null,sig='',attempt=0;
    do{
      q=make(skill,t,i+attempt*1009,seed+attempt*7919,'daily');
      q.id=qid(skill,t,i,'daily');
      sig=[q.type,q.p||'',q.pass||'',q.audio||''].join('|').replace(/\\s+/g,' ').trim();
      attempt++;
    }while(seen.has(sig)&&attempt<120);
    if(seen.has(sig))throw new Error('無法產生唯一的 '+skill+' 題目：'+(i+1));
    seen.add(sig);out.push(q);
  });
  return S.sets[key]=out;
}`;

const mockReplacement=`function mockSet(skill){
  const key=[S.level,skill,dkey()].join('|');if(S.mockSets[key])return S.mockSets[key];
  const bp=OFFICIAL[S.level].mock[skill],seed=hash('mock-v5|'+key),types=[];
  Object.entries(bp).forEach(([t,n])=>{for(let k=0;k<n;k++)types.push(t)});
  const seen=new Set(),out=[];
  types.forEach((t,i)=>{
    let q=null,sig='',attempt=0;
    do{
      q=make(skill,t,i+attempt*1013,seed+attempt*6151,'mock');
      q.id=qid(skill,t,i,'mock');
      sig=[q.type,q.p||'',q.pass||'',q.audio||''].join('|').replace(/\\s+/g,' ').trim();
      attempt++;
    }while(seen.has(sig)&&attempt<160);
    if(seen.has(sig))throw new Error('無法產生唯一的 Mock '+skill+' 題目：'+(i+1));
    seen.add(sig);out.push(q);
  });
  return S.mockSets[key]=out;
}`;

function replaceFn(src,name,next,replacement){
  const start=src.indexOf('function '+name+'(');
  const end=src.indexOf('\nfunction '+next+'(',start);
  if(start<0||end<0)throw new Error('找不到 '+name+' 產題函式');
  return src.slice(0,start)+replacement+src.slice(end);
}

async function boot(){
  const status=document.getElementById('jlptV5Status');
  try{
    const res=await fetch('./jlpt-app-v2.js?v=5',{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    let src=await res.text();
    src=replaceFn(src,'vocabQ','grammarQ',vocabReplacement);
    src=replaceFn(src,'grammarQ','readingQ',grammarReplacement);
    src=replaceFn(src,'readingQ','listenQ',readingReplacement);
    src=replaceFn(src,'listenQ','make',listenReplacement);
    src=replaceFn(src,'dailySet','mockSet',dailyReplacement);
    src=replaceFn(src,'mockSet','reason',mockReplacement);
    (0,eval)(src+'\n//# sourceURL=jlpt-app-v5-runtime.js');
    const s=document.createElement('script');s.src='./jlpt-mock-state-v2.js?v=5';document.body.appendChild(s);
    if(status)status.innerHTML='v5 已啟用：所有科目強制去重；聽解每題音檔腳本皆為唯一情境。';
    document.documentElement.dataset.jlptVersion='5';
  }catch(err){
    if(status)status.innerHTML='<b style="color:#b42318">JLPT v5 載入失敗</b><br><span class="small">'+String(err&&err.message||err)+'</span>';
    console.error(err);
  }
}
boot();
})();