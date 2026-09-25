/* BDL Sourcing — guest mode (b155).
   Jack, 25 Sep 2026: "can I have a guest mode too so it doesn't actually save to Supabase at all, as I wanna run them all and
   check them but not for it to save to Supabase".
   In:  send anything still queued, pull the latest real data, snapshot every app key in this browser (IndexedDB — it can be a
        few MB, more than localStorage would hold twice), then flip the switch. cloudEnabled() is false from then on, exactly
        like the localhost sandbox: nothing queued, nothing sent, nothing pulled. cloudReq refuses writes as a second lock.
   Out: throw away everything this browser holds, put the snapshot back, reload — the normal boot pull then brings in whatever
        Suz and Mera did in the meantime. Nothing made in guest mode can ever reach Supabase, because it never enters a queue.
   Kept across the snapshot on purpose: the sign-in session (Supabase rotates it — an old copy would sign Jack out), the
   Keepa caches (real data that cost real tokens), the £/€ rate, the theme and this browser's lock id. */
const GUEST_SKIP=['bdl-sourcing-session','bdl-sourcing-api-rows','bdl-sourcing-eu-price','bdl-sourcing-fx','bdl-sourcing-lockid','sourcing-suite-theme',GUEST_KEY];
function guestKeys(){return Object.keys(localStorage).filter(k=>(k.startsWith('bdl-sourcing')||k.startsWith('sourcing-suite'))&&!GUEST_SKIP.includes(k));}
function guestIdb(mode,fn){return new Promise((res,rej)=>{let r;try{r=indexedDB.open('bdl-sourcing-guest',1);}catch(e){rej(e);return;}
  r.onupgradeneeded=()=>r.result.createObjectStore('snap');r.onerror=()=>rej(r.error);
  r.onsuccess=()=>{const db=r.result;let out;const tx=db.transaction('snap',mode);const q=fn(tx.objectStore('snap'));if(q)q.onsuccess=()=>{out=q.result;};
    tx.oncomplete=()=>{db.close();res(out);};tx.onerror=()=>{db.close();rej(tx.error);};tx.onabort=()=>{db.close();rej(tx.error);};};});}
const guestSnapPut=v=>guestIdb('readwrite',s=>s.put(v,'snap'));
const guestSnapGet=()=>guestIdb('readonly',s=>s.get('snap'));
const guestSnapDel=()=>guestIdb('readwrite',s=>s.delete('snap'));
function guestInfo(){return lsGet(GUEST_KEY,null)||{};}
function guestWhen(iso){if(!iso)return'';const d=new Date(iso);return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+', '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
let guestBusy=false;
async function guestStart(btn){if(guestBusy||guestOn())return;if(!isJack()){toast('Only Jack can start guest mode',true);return;}
  guestBusy=true;const lab=btn?btn.innerHTML:'';if(btn){btn.disabled=true;btn.textContent='Getting the latest real data…';}
  try{
    if(cloudEnabled()){
      await cloudFlush();if(typeof audFlush==='function')await audFlush();
      const left=outbox().length+(typeof audOut==='function'?audOut().length:0);
      if(left){toast(left+' change'+(left===1?' is':'s are')+' still waiting to go to the shared database — guest mode starts once they have gone',true);return;}
      await cloudPull();if(typeof cloudPullLeadsAll==='function')await cloudPullLeadsAll();if(typeof kcPull==='function')await kcPull();}
    const keys={};guestKeys().forEach(k=>{keys[k]=localStorage.getItem(k);});
    await guestSnapPut({at:nowIso(),by:me(),keys});
    const back=await guestSnapGet();if(!back||!back.keys||Object.keys(back.keys).length!==Object.keys(keys).length)throw new Error('the snapshot did not save');
    lsSet(GUEST_KEY,{on:true,since:nowIso(),by:me()});
    location.reload();   /* every screen, the pill and the banner redraw as guest */
  }catch(e){toast('Guest mode did not start — '+(e&&e.message||e)+'. Nothing changed.',true);}
  finally{guestBusy=false;if(btn){btn.disabled=false;btn.innerHTML=lab;}}}
async function guestLeave(){if(!guestOn())return;
  if(!confirm('Leave guest mode?\n\nEverything done in guest mode is thrown away — runs, Yes / No, audits, blacklists, edits — and this browser goes back to the real shared data. None of it was ever sent.'))return;
  let snap=null;try{snap=await guestSnapGet();}catch(e){}
  guestKeys().forEach(k=>localStorage.removeItem(k));   /* both outboxes included: anything in them was made in guest mode */
  if(snap&&snap.keys)Object.entries(snap.keys).forEach(([k,v])=>{try{localStorage.setItem(k,v);}catch(e){}});
  localStorage.removeItem(GUEST_KEY);try{await guestSnapDel();}catch(e){}
  location.reload();}   /* no snapshot (browser data cleared) = an empty browser, and the boot pull refills it from the shared data */

/* ---- what you see ---- */
function guestPaintBar(){let el=$('#guestBar');if(!guestOn()){if(el)el.remove();document.documentElement.classList.remove('guest');return;}
  document.documentElement.classList.add('guest');
  if(!el){el=document.createElement('div');el.id='guestBar';el.className='guestbar';document.body.prepend(el);}
  const g=guestInfo();const m=me();
  el.innerHTML=`<span class="gtag"><i></i>Guest mode</span>
    <span class="gtxt">Nothing you do is saved to Supabase — it is all undone when you leave. Real data as of <b>${escapeHtml(guestWhen(g.since))}</b>. <span class="gtok">Keepa API buttons still spend real tokens.</span></span>
    <label class="gas">View as <select id="guestAs">${['Jack','Mera','Suz'].map(n=>`<option${n===m?' selected':''}>${n}</option>`).join('')}</select></label>
    <button type="button" class="btn sm gleave" id="guestLeaveBtn">Leave guest mode</button>`;}
function guestPaintBox(){const el=$('#guestBox');if(!el)return;const on=guestOn(),g=guestInfo();
  if(!on&&!isJack()){el.hidden=true;return;}el.hidden=false;
  el.innerHTML=on
    ?`<h3>Guest mode <span class="scope gon">on</span></h3>
      <p class="ssub">Since <b>${escapeHtml(guestWhen(g.since))}</b>. Nothing is going to Supabase and nothing is coming from it — you are working on a copy of the real data as it was then. Leaving throws the copy away, puts this browser back exactly as it was, then picks up whatever Suz and Mera did meanwhile.</p>
      <div class="row"><button class="btn primary sm" type="button" id="guestLeaveBtn2">Leave guest mode</button></div>`
    :`<h3>Guest mode <span class="scope local">this browser</span></h3>
      <p class="ssub">Run every source, judge leads, audit a shelf, use the Keepa console, even view it as Suz or Mera — and <b>nothing is saved to Supabase</b>. When you leave, this browser goes back exactly as it was.</p>
      <ul class="glist"><li>It starts with the latest real data, so your runs compare against the real baseline.</li>
        <li>Keepa API buttons still spend real tokens. What they fetch is kept, so looking again after you leave costs nothing.</li>
        <li>Sign-in links, the Team list and the lock switch are paused while you are in it.</li>
        <li>Other people are not affected. It is only this browser.</li></ul>
      <div class="row"><button class="btn primary sm" type="button" id="guestStartBtn">Start guest mode</button></div>`;}
function guestPaint(){guestPaintBar();guestPaintBox();}
document.addEventListener('click',e=>{
  const s=e.target.closest('#guestStartBtn');if(s){guestStart(s);return;}
  if(e.target.closest('#guestLeaveBtn,#guestLeaveBtn2')){guestLeave();return;}});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='guestAs'&&guestOn()){whoSet(e.target.value);guestPaintBar();}});
/* another tab went in or out of guest mode: this one reloads too, so no tab keeps working on the other side of the line */
window.addEventListener('storage',e=>{if(e.key===GUEST_KEY)location.reload();});
document.addEventListener('DOMContentLoaded',()=>{guestPaint();const sb=document.querySelector('.pagebtn[data-page="page-settings"]');if(sb)sb.addEventListener('click',guestPaintBox);});
