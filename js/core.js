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
function lsGet(k,fb){try{const v=JSON.parse(localStorage.getItem(k));return v==null?fb:v;}catch(e){return fb;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
const gbp=v=>v==null||isNaN(v)?'—':'£'+Number(v).toFixed(2);
const pct=v=>v==null||isNaN(v)?'—':Math.round(v)+'%';
