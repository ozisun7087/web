(()=>{
'use strict';
/* Legacy compatibility bridge -> v5 global anti-duplication engine */
const status=document.getElementById('jlptV4Status')||document.getElementById('jlptV3Status');
if(status){
  status.id='jlptV5Status';
  status.textContent='正在載入 v5：所有類型題目強制去重，聽解音檔採唯一情境生成。';
}
document.title='JLPT Study Lab v5';
const brand=document.querySelector('.brand');if(brand)brand.textContent='日本語能力試驗 JLPT Study Lab v5';
if(document.documentElement.dataset.jlptV5Forwarded==='1')return;
document.documentElement.dataset.jlptV5Forwarded='1';
const s=document.createElement('script');
s.src='./jlpt-loader-v5.js?v=5';
s.defer=true;
document.body.appendChild(s);
})();