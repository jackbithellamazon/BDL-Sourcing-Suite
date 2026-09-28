/* BDL Sourcing — shared helpers. No rules live here. */
const $ = s => document.querySelector(s);
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
/* b153: an optional action — {label, fn} — puts a button in the toast (Undo), and the toast waits 5 seconds for it instead of 1.6 */
function toast(msg,err,action){const t=$('#toast');t.innerHTML=(err?'':CHECK)+'<span>'+msg+'</span>'+(action?`<button type="button" class="tact">${action.label}</button>`:'');
  t.className='toast show'+(err?' err':'')+(action?' act':'');clearTimeout(t._t);
  if(action){const b=t.querySelector('.tact');b.onclick=()=>{clearTimeout(t._t);t.className='toast';action.fn();};}
  t._t=setTimeout(()=>t.className='toast',action?5000:1600);}
function flashOk(btn,word){const lab=btn.querySelector('.lab');if(!lab)return;
  const prev=lab.textContent;btn.classList.add('ok');lab.textContent=word||'Copied';
  clearTimeout(btn._t);btn._t=setTimeout(()=>{btn.classList.remove('ok');lab.textContent=prev;},1400);}
function copy(text,msg,btn,word){if(!text){toast('Nothing to copy',true);return;}
  const ok=()=>{toast(msg);if(btn)flashOk(btn,word);};
  navigator.clipboard.writeText(text).then(ok).catch(()=>{
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();
    document.execCommand('copy');ta.remove();ok();});}
function download(name,text,type){const b=new Blob([text],{type:type||'text/plain'});
  const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);}
function downloadBlob(name,blob){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function countUp(el,to){const from=parseInt(el.textContent.replace(/\D/g,''))||0;
  if(from===to){el.textContent=to.toLocaleString();return;}
  const start=performance.now(),dur=560;
  function step(now){const p=Math.min(1,(now-start)/dur);const e=1-Math.pow(1-p,3);
    el.textContent=Math.round(from+(to-from)*e).toLocaleString();if(p<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);}
const asinRe=/^B[0-9A-Z]{9}$/;
function findAsinCol(header,rows){let i=header.findIndex(h=>h.trim().toLowerCase()==='asin');if(i>=0)return i;
  let best=-1,score=0;for(let c=0;c<header.length;c++){let s=0;
    for(let r=0;r<rows.length;r++)if(asinRe.test((rows[r][c]||'').trim()))s++;
    if(s>score){score=s;best=c;}}return score>0?best:-1;}
function randomListId(){const c='abcdefghijklmnopqrstuvwxyz0123456789';let s='';
  for(let i=0;i<64;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
/* Opens Keepa's Product Viewer with the ASINs already loaded — this is what replaces the paste step. */
function keepaLink(asins,domain){if(!asins.length)return'';const o={};o[domain||'2']=asins;
  o.listId=randomListId();o.includeInaccessibleAsins=false;
  return'https://keepa.com/#!viewer/'+encodeURIComponent(JSON.stringify(o));}
function escapeHtml(s){return(''+s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function setBar(k,d,keep,drop){const tot=keep+drop||1;const kp=keep/tot*100;
  k.style.width=kp+'%';d.style.width=(100-kp)+'%';k.classList.toggle('empty',keep===0);d.classList.toggle('empty',drop===0);}
function dz(zone,cb){zone.addEventListener('click',()=>cb.click());
  zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cb.click();}});
  ['dragover','dragenter'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('over');}));
  zone.addEventListener('dragleave',e=>{e.preventDefault();zone.classList.remove('over');});}
function readFileText(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(file);});}
function stamp(d){d=d||new Date();const p=n=>(''+n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;}
function today(){return stamp().slice(0,10);}
/* b177 (Jack, 27 Sep: "major bug — nothing is saving at all"). Every click is written in this browser first and sent to Supabase
   from there. lsSet swallowed every error, so the moment the browser's storage was full — and every app on
   jackbithellamazon.github.io shares ONE allowance of about 5 MB — each press failed in silence: nothing lit, nothing was
   queued, nothing reached Supabase. Now a failed write (1) makes room by dropping this app's own caches, the audit's product
   details first (they reload free from Supabase), and tries again; (2) if there is still no room, keeps the value in memory
   so the app carries on and the outbox still sends to Supabase; and (3) says so, in a red bar, instead of saying nothing. */
const LS_MEM={};const LS_SHED=['bdl-sourcing-howto-hidden','bdl-sourcing-guidefull'];let LS_FULL_AT=0;
/* b178 (Jack, 27 Sep: "I don't want this to happen again"). The browser gives every app on this address ONE shared pot of about
   5 MB (localStorage). The big things Sourcing keeps — product pictures and prices for the audit, the lead history, run results,
   Keepa rows, EU prices, console rows — now live in the browser's big store instead (IndexedDB: hundreds of MB, guest mode
   already uses it). They are loaded into memory once at boot and written back a moment after each change, so the rest of the
   app reads and writes them exactly as before. The 5 MB pot keeps only small settings and the unsent-changes queue. */
const BIG_KEYS=['bdl-sourcing-audit-prod','bdl-sourcing-api-rows','bdl-sourcing-eu-price','bdl-sourcing-leadstate','bdl-sourcing-runs','bdl-sourcing-kc','bdl-sourcing-history',
  /* b181 (Jack, 27 Sep: "we shouldn't be storing much here locally — it should be 99% online"): every other copy of Supabase goes to the big store too.
     The shared pot keeps only the sign-in, this browser's view settings, a few small shared settings and the unsent queue — a few KB. */
  'bdl-sourcing-verdicts','bdl-sourcing-audit-v','bdl-sourcing-sources','bdl-sourcing-facts','bdl-sourcing-blacklist','bdl-sourcing-brandbl','bdl-sourcing-discounts','bdl-sourcing-audit-shelves',
  'bdl-sourcing-option-sales','bdl-sourcing-api-looks','bdl-sourcing-rlog'];
const BIG={};const BIG_T={};const BIG_HOOKS=[];let BIG_READY=false,BIG_LOAD=null;
function isBig(k){return BIG_KEYS.includes(k);}
function bigIdb(mode,fn){return new Promise((res,rej)=>{let r;try{r=indexedDB.open('bdl-sourcing-big',1);}catch(e){rej(e);return;}
  r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onerror=()=>rej(r.error);
  r.onsuccess=()=>{const db=r.result;let out;const tx=db.transaction('kv',mode);const q=fn(tx.objectStore('kv'));if(q&&q.length){out=[];q.forEach((x,i)=>{x.onsuccess=()=>{out[i]=x.result;};});}else if(q)q.onsuccess=()=>{out=q.result;};
    tx.oncomplete=()=>{db.close();res(out);};tx.onerror=()=>{db.close();rej(tx.error);};tx.onabort=()=>{db.close();rej(tx.error);};};});}
function bigLoad(){if(BIG_LOAD)return BIG_LOAD;BIG_LOAD=(async()=>{
  try{const [keys,vals]=await bigIdb('readonly',s=>[s.getAllKeys(),s.getAll()]);(keys||[]).forEach((k,i)=>{if(typeof vals[i]==='string')BIG[k]=vals[i];});}catch(e){}
  /* one-time move out of the 5 MB pot: what is there wins over an older big-store copy, then it leaves the pot */
  BIG_KEYS.forEach(k=>{let v=null;try{v=localStorage.getItem(k);}catch(e){}if(v!=null){BIG[k]=v;bigPut(k);try{localStorage.removeItem(k);}catch(e){}}});
  BIG_READY=true;BIG_HOOKS.splice(0).forEach(f=>{try{f();}catch(e){}});})();return BIG_LOAD;}
function bigPut(k){clearTimeout(BIG_T[k]);BIG_T[k]=setTimeout(()=>{bigIdb('readwrite',s=>Object.prototype.hasOwnProperty.call(BIG,k)?s.put(BIG[k],k):s.delete(k)).catch(()=>{});},250);}
function bigOnReady(f){if(BIG_READY)setTimeout(f,0);else BIG_HOOKS.push(f);}   /* never inside another file's parse */
/* raw access that knows both stores — everything that used to touch localStorage by key goes through these */
function lsRaw(k){if(isBig(k))return Object.prototype.hasOwnProperty.call(BIG,k)?BIG[k]:null;if(Object.prototype.hasOwnProperty.call(LS_MEM,k))return LS_MEM[k];try{return localStorage.getItem(k);}catch(e){return null;}}
function lsRawSet(k,s){if(isBig(k)){BIG[k]=String(s);bigPut(k);return true;}try{localStorage.setItem(k,s);delete LS_MEM[k];return true;}catch(e){LS_MEM[k]=s;lsFullBar();return false;}}
function lsRemove(k){if(isBig(k)){delete BIG[k];bigPut(k);return;}delete LS_MEM[k];try{localStorage.removeItem(k);}catch(e){}}
function lsKeys(){const out=new Set();try{Object.keys(localStorage).forEach(k=>out.add(k));}catch(e){}Object.keys(LS_MEM).forEach(k=>out.add(k));Object.keys(BIG).forEach(k=>out.add(k));return[...out];}
function lsGet(k,fb){try{const raw=lsRaw(k);const v=JSON.parse(raw);return v==null?fb:v;}catch(e){return fb;}}
function lsSet(k,v){let s;try{s=JSON.stringify(v);}catch(e){return false;}
  if(isBig(k)){BIG[k]=s;bigPut(k);return true;}
  try{localStorage.setItem(k,s);delete LS_MEM[k];return true;}catch(e){}
  for(const c of LS_SHED){if(c===k)continue;try{if(localStorage.getItem(c)==null)continue;localStorage.removeItem(c);}catch(e){continue;}
    try{localStorage.setItem(k,s);delete LS_MEM[k];console.warn('storage was full — cleared the cache '+c+' to make room');return true;}catch(e){}}
  LS_MEM[k]=s;lsFullBar();return false;}
/* b181: Chrome's limit is about 5.2 million characters per address, so the meter counts characters and calls 1,048,576 of them a MB (it counted bytes before, which read 7.75 MB of 5) */
function lsUsage(){let ours=0,all=0,big=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const n=k.length+(localStorage.getItem(k)||'').length;all+=n;if(/^(bdl-sourcing|sourcing-suite)/.test(k))ours+=n;}}catch(e){}Object.values(BIG).forEach(v=>{big+=v?v.length:0;});return{ours,all,others:all-ours,big,cap:5*1048576};}
function lsFullBar(){if(Date.now()-LS_FULL_AT<30000&&document.getElementById('lsFullBar'))return;LS_FULL_AT=Date.now();
  const paint=()=>{let el=document.getElementById('lsFullBar');if(!el){el=document.createElement('div');el.id='lsFullBar';el.className='lsfullbar';document.body.prepend(el);}
    const u=lsUsage(),mb=n=>(n/1048576).toFixed(1)+' MB';
    el.innerHTML=`<b>This browser's small store is full.</b> Your clicks are still being sent to Supabase, but anything not sent yet is lost if you reload. It holds ${mb(u.all)} of about 5 MB — Sourcing ${mb(u.ours)}, your other apps on this address ${mb(u.others)}. Settings → Shared storage shows the meter. <button type="button" id="lsFullX">OK</button>`;
    el.querySelector('#lsFullX').onclick=()=>el.remove();};
  if(document.body)paint();else document.addEventListener('DOMContentLoaded',paint);}
const gbp=v=>v==null||isNaN(v)?'—':'£'+Number(v).toFixed(2);
const pct=v=>v==null||isNaN(v)?'—':Math.round(v)+'%';
bigLoad();   /* b178: start reading the big store the moment the app starts; boot waits for it before drawing anything */
