/* BDL Sourcing — boot. Bump BUILD every ship. */
const BUILD={version:'1.2',date:'2026-09-27',n:181};
const THEME_KEY='sourcing-suite-theme';
function setTheme(theme){const mode=theme==='dark'?'dark':'light';document.documentElement.dataset.theme=mode;
  $('#themeLabel').textContent=mode==='dark'?'Dark':'Light';
  $('#themeToggle').setAttribute('aria-pressed',mode==='dark'?'true':'false');
  $('#themeToggle').setAttribute('aria-label',mode==='dark'?'Switch to light mode':'Switch to dark mode');
  try{localStorage.setItem(THEME_KEY,mode);}catch(e){}}
document.addEventListener('DOMContentLoaded',async()=>{
  $('#buildTag').textContent=`v${BUILD.version} · ${BUILD.date} · b${BUILD.n}`;
  try{await bigLoad();}catch(e){}   /* b178: the caches and history come from the browser's big store before anything is drawn */
  if(typeof audState!=='undefined')audState.prod=lsGet(AUD_PROD,{})||{};   /* audit.js read this at parse time, before the big store was in */
  if(typeof authBoot==='function')authBoot().catch(()=>{});   /* b126: take a sign-in link if one just arrived, keep the session fresh */
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
  /* b172 (Jack, 27 Sep: "add this as a home button"). The logo takes you to Brands / Filters — the list of what is due today —
     closing any open run, back on the brand list, at the top of the page, with the address cleared. */
  $('#homeBtn').addEventListener('click',e=>{e.preventDefault();goHome();});
  leadToolsInit();brandsInit();cloudInit();
  if(location.search.includes('checks')){const s=document.createElement('script');s.src='tests/checks.js';s.onload=()=>SourcingChecks.run();document.head.appendChild(s);}
});
function goHome(){const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b)b.click();
  try{if(typeof cur!=='undefined'&&cur&&!$('#viewRun').hidden&&typeof backToList==='function')backToList();}catch(e){}
  if(typeof showTab==='function')showTab('brands');
  try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}
  window.scrollTo({top:0,behavior:'smooth'});}
