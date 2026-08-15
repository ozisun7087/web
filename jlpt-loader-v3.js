(()=>{
'use strict';
/* v3 compatibility bridge -> v4 global anti-duplication engine */
const status=document.getElementById('jlptV3Status');
if(status){
  status.id='jlptV4Status';
  status.textContent='正在載入 v4：文字・語彙、文法、讀解、聽解皆啟用全題組去重複機制。';
}
document.title='JLPT Study Lab v4';
const brand=document.querySelector('.brand');if(brand)brand.textContent='日本語能力試驗 JLPT Study Lab v4';
const s=document.createElement('script');
s.src='./jlpt-loader-v4.js?v=4';
s.defer=true;
document.body.appendChild(s);
})();
