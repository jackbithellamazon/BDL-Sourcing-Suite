/* BDL Sourcing — boot. Bump BUILD every ship. */
const BUILD={version:'1.2',date:'2026-09-17',n:96};
const THEME_KEY='sourcing-suite-theme';
function setTheme(theme){const mode=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=mode;
  $('#themeLabel').textContent=mode==='dark'?'Dark':'Light';
  $('#themeToggle').setAttribute('aria-pressed',mode==='dark'?'true':'false');
  $('#themeToggle').setAttribute('aria-label',mode==='dark'?'Switch to light mode':'Switch to dark mode');
  try{localStorage.setItem(THEME_KEY,mode);}catch(e){}}
document.addEventListener('DOMContentLoaded',()=>{
  $('#buildTag').textContent=`v${BUILD.version} · ${BUILD.date} · b${BUILD.n}`;
  setTheme(document.documentElement.dataset.theme);
  $('#themeToggle').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
  document.querySelectorAll('.pagebtn').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.pagebtn').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');$('#'+b.dataset.page).classList.add('active');}));
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    const page=t.closest('.page');page.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    page.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');$('#'+t.dataset.tab).classList.add('active');}));
  leadToolsInit();brandsInit();cloudInit();
  if(location.search.includes('checks')){const s=document.createElement('script');s.src='tests/checks.js';s.onload=()=>SourcingChecks.run();document.head.appendChild(s);}
});
