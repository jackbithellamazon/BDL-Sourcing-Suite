/* BDL Sourcing — "YOU HAVEN'T FINISHED" (b243, 3 Oct 2026).
   Jack: "they need to export and drop it back in and then work the ASINs — if they try and go back, get a nice popup explaining what
   they haven't done and what they should be doing." (Mera pressed Open in Keepa on her £60+ filter at 17:34 and left; nothing was saved
   and the filter sat 15 days late.)

   A VA who has STARTED a run — pressed an Open in Keepa button, or dropped a file — and tries to leave it (back arrow, the logo, another
   page, Next due) before it is finished gets one popup: what is done, what is not, and exactly what to do now. "Stay and finish" takes
   her to the thing to press; "Leave anyway" lets her go. Jack never sees it. One-offs (Drop & check) and storefront lists are left alone.
   Closing the tab mid-run asks the browser's own "Leave site?" too. */
function leaveState(){
  if(typeof cur==='undefined'||!cur||!$('#viewRun')||$('#viewRun').hidden)return null;
  const pg=$('#page-brands');if(!pg||!pg.classList.contains('active'))return null;
  if(!me()||isJack())return null;
  if(cur.drop||(typeof isListed==='function'&&isListed(cur)))return null;
  if(result&&(result.past||result.apiLook))return null;
  const r1multi=cur.rule===1&&!(typeof ukOnly==='function'&&ukOnly());
  const prime=typeof primeOn==='function'&&primeOn()&&typeof primeSlots==='function';
  /* the files this run needs, one per box */
  const boxes=prime?primeSlots().map(k=>{const [m,kind]=k.split('|');return{lab:(FLAG[m]||'')+' '+m+(kind==='p'?' ★ Prime':''),in:primeIn(k)};})
    :r1multi?cur.markets.map(m=>({lab:(FLAG[m]||'')+' '+m,in:!!files[m]}))
    :[{lab:'the export',in:!!(cur.rule===1?files.viewer:files.one)}];
  const anyFile=SLOTS.some(k=>files[k])||!!files.one;
  const pressed=(typeof awaitDrop!=='undefined'&&!!awaitDrop&&(!awaitDrop.key||awaitDrop.key===cur.key))||(typeof pcell!=='undefined'&&Object.values(pcell).some(c=>c&&c.state==='keepa'));   /* b260: only a press made on THIS filter */
  if(!anyFile&&!pressed)return null;   /* opened it, touched nothing: free to go */
  /* today's run is already saved (files dropped earlier, or "Keepa showed 0 results — mark done") and nothing new is half-loaded: free to go */
  {const lr=typeof runLast==='function'?runLast(cur.key):null;if(!anyFile&&lr&&(lr.day||String(lr.at).slice(0,10))===today())return null;}
  const fresh=!!result&&!result.stored;
  const missing=boxes.filter(b=>!b.in),partsLeft=r1multi&&typeof viewerPartsLeft==='function'?viewerPartsLeft():0;
  const viewerIn=!r1multi||(!!files.viewer&&(!files.viewer.__alias||!!files.viewer.__allUk)&&!partsLeft);   /* b278: the UK file covers everything — no Viewer to wait for */
  const runOk=fresh&&!missing.length&&viewerIn;
  const todo=fresh?result.out.filter(o=>o.QUEUE):[],left=todo.filter(o=>!(typeof doneToday==='function'&&doneToday(o))).length;
  /* b244: finished = files in, leads worked AND ✓ Done pressed (a run saved before b244 never needed the press) */
  const lrun=typeof runLast==='function'?runLast(cur.key):null,needPress=!!(lrun&&lrun.needDone&&!lrun.done&&(lrun.day||String(lrun.at).slice(0,10))===today());
  if(lrun&&typeof runStale==='function'&&runStale(lrun)&&!pressed)return null;   /* b260: over 12 hours unfinished — it no longer counts, there is nothing to finish */
  if(runOk&&!left&&!needPress)return null;
  const nIn=boxes.length-missing.length,many=boxes.length>1;
  const steps=[{k:'files',ok:!missing.length,label:many?'Export every box from Keepa and drop the files in':'Export from Keepa and drop the file in',
    detail:!missing.length?(many?`all ${boxes.length} files in`:'file in'):many?`${nIn} of ${boxes.length} in — still missing: ${missing.map(b=>b.lab.trim()).join(' · ')}`:(pressed?'you pressed Open in Keepa — but the export never came back in':'not in yet')}];
  /* b245: her Viewer export was refused for unticked columns — say so, and which */
  const vr=(typeof viewerRefused!=='undefined'&&viewerRefused&&viewerRefused.key===cur.key&&!viewerIn)?viewerRefused:null;
  const vrCols=vr?vr.missing.slice(0,5).map(c=>typeof colPath==='function'?colPath(c):c.h).join(' · ')+(vr.missing.length>5?` … (+${vr.missing.length-5})`:''):'';
  if(r1multi)steps.push({k:'viewer',ok:viewerIn,label:'The merge — the UK Product Viewer file',
    detail:viewerIn?'in':vr?`your Viewer export was REFUSED — ${vr.missing.length} column${vr.missing.length===1?'':'s'} not ticked in the Viewer: ${vrCols}`:partsLeft&&files.viewer?`${partsLeft} part${partsLeft===1?'':'s'} still to do`:missing.length===boxes.length?'after the country files':'not in — no merge file, no leads'});
  steps.push({k:'leads',ok:runOk&&!left,label:'Look at the leads in To review (Open all in Keepa)',
    detail:fresh?(left?`${left} of ${todo.length} not looked at yet`:'all looked at'):'they appear once the files are in'});
  steps.push({k:'done',ok:runOk&&!left&&!needPress,label:'Press ✓ Done (next to Open all in Keepa)',detail:runOk&&!left?'not pressed yet — the filter still shows as NOT FINISHED':'last of all — it puts your name on the filter and turns it green'});
  const first=steps.find(s=>!s.ok);let next,hot;
  if(first.k==='files'){hot=prime?'#primeGrid':'#dropAny';
    next=pressed&&!anyFile
      ?'In Keepa: <b>Export → All active columns → CSV</b>. Then <b>drag that file from Downloads onto the drop box</b> on this page.'
      :many?`Still to get: <b>${missing.map(b=>escapeHtml(b.lab.trim())).join(' · ')}</b>. For each one: press its <b>Open in Keepa</b> button → <b>Export → All active columns → CSV</b> → drag the file in here.`
      :'Press <b>Open in Keepa</b> → <b>Export → All active columns → CSV</b> → drag the file from Downloads onto the drop box.';}
  else if(first.k==='viewer'){hot='#asinOpen';
    next=vr?`Your Viewer export was refused because <b>the Viewer has its own column list</b> — ticking columns in the Product Finder does not tick them in the Viewer. In the <b>Viewer</b>: <b>Configure Columns</b> → tick the ${vr.missing.length} missing one${vr.missing.length===1?'':'s'} (press <b>Stay and finish</b> — the full list opens) → <b>Export → All active columns → CSV</b> → drop it in. Once only — Keepa remembers.`:partsLeft&&files.viewer?`The Viewer is in parts and <b>${partsLeft} part${partsLeft===1?' is':'s are'} still missing</b>. Press the <b>Open part…</b> button, export all columns, drop it in — for every part.`
      :'Press <b>Open UK Product Viewer</b> — Keepa opens with every product from your country files merged in. <b>Export → All active columns → CSV</b>, then drop that file in here. Your leads appear straight after.';}
  else if(first.k==='done'){hot='#doneSel';
    next='Press <b>✓ Done</b> — the button right next to <b>Open all in Keepa</b>. That is what marks this filter DONE with your name — without it the filter shows as NOT FINISHED for everyone.';}
  else{hot='#leadTop';
    next=`<b>Scroll down to To review</b> — ${left} lead${left===1?'':'s'} to look at. Press <b>Open all in Keepa</b>, read each graph, <b>Y / N / M</b> if you want — then press <b>✓ Done</b> (right next to Open all in Keepa). Done marks them looked at and finishes the filter.`;}
  return{name:cur.name,who:me(),key:cur.key,steps,first:first.k,next,hot,saved:runOk,left,vr:!!vr};}

function leaveClose(){const p=$('#leavePop');if(p)p.remove();document.removeEventListener('keydown',leaveKey,true);}
function leaveKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();leaveStay();}}
function leaveStay(){const p=$('#leavePop');const hot=p&&p.dataset.hot,key=p&&p.dataset.key,first=p&&p.dataset.first;leaveClose();if(first==='one-at-a-time')return;
  if(typeof actLog==='function')actLog('leave','Tried to leave unfinished ('+first+') · stayed',key);
  /* b245: stopped at a refused Viewer file → the list of columns to tick opens again */
  if(first==='viewer'&&typeof viewerRefused!=='undefined'&&viewerRefused&&typeof openColsPanel==='function'){openColsPanel(viewerRefused.missing,viewerRefused.name);return;}
  const el=hot&&document.querySelector(hot);if(el&&el.offsetParent!==null){el.scrollIntoView({block:'center',behavior:'smooth'});el.classList.add('gohot');setTimeout(()=>el.classList.remove('gohot'),4500);}}
function leaveAsk(st,proceed){leaveClose();const e=escapeHtml;
  const ic={ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    no:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'};
  let seenFirst=false;
  const rows=st.steps.map((s,i)=>{const cls=s.ok?'ok':!seenFirst?'now':'later';if(!s.ok)seenFirst=true;
    return`<li class="${cls}"><span class="lvi">${s.ok?ic.ok:cls==='now'?ic.no:i+1}</span><span class="lvt"><b>${e(s.label)}</b><small>${e(s.detail)}</small></span></li>`;}).join('');
  const d=document.createElement('div');d.id='leavePop';d.className='lvpop';d.dataset.hot=st.hot||'';d.dataset.key=st.key||'';d.dataset.first=st.first||'';
  d.innerHTML=`<div class="lvcard" role="dialog" aria-modal="true" aria-labelledby="lvTitle">
    <div class="lvhead"><span class="lvwarn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg></span>
      <div><h3 id="lvTitle">Hold on, ${e(st.who)} — this run isn’t finished</h3>
      <p>${e(st.name)} · ${st.first==='done'?'the files are in and the leads are looked at — but <b>you have not pressed ✓ Done</b>.':st.saved?`the run is saved, but <b>${st.left} lead${st.left===1?' has':'s have'} not been looked at</b>.`:'<b>nothing is saved yet</b> — pressing Open in Keepa on its own does not count. It will still show as NOT DONE.'}</p></div></div>
    <ol class="lvsteps">${rows}</ol>
    <div class="lvnext"><span class="lvlab">Do this now</span><p>${st.next}</p></div>
    <div class="lvbtns"><button type="button" class="btn primary" id="lvStay">Stay and finish</button><button type="button" class="btn ghost" id="lvGo">Leave anyway</button></div>
    <p class="lvfoot">Keepa showed 0 results for a box? Then there is nothing to export for it — that one is fine to skip.</p></div>`;
  document.body.appendChild(d);
  d.addEventListener('click',ev=>{if(ev.target===d||ev.target.closest('#lvStay')){leaveStay();return;}
    if(ev.target.closest('#lvGo')){const key=d.dataset.key,first=d.dataset.first;leaveClose();if(typeof actLog==='function')actLog('leave','Left unfinished ('+first+')',key);if(proceed)proceed();}});
  document.addEventListener('keydown',leaveKey,true);
  const b=d.querySelector('#lvStay');if(b)b.focus();}
/* ---- ONE AT A TIME (Jack, 3 Oct: "tell them they have to do it one at a time — no bulk").
   The live log, Fri 2 Oct: Mera pressed the ★ Prime button on 12 filters in 27 minutes (19:10–19:37) and dropped nothing back in.
   A VA starting another filter while one she opened in Keepa TODAY has no file back gets told to finish that one first. ---- */
function unfinishedMine(skipKey){if(!me()||isJack()||typeof keepaSinceRun!=='function')return[];const t=new Date().toDateString(),w=me();
  return visibleSources().filter(s=>s.key!==skipKey&&s.status!=='paused'&&!s.drop).map(s=>({s,kp:keepaSinceRun(s)}))
    .filter(x=>x.kp&&x.kp.who===w&&new Date(x.kp.at).toDateString()===t).sort((a,b)=>new Date(a.kp.at)-new Date(b.kp.at));}
function oneAtATimeAsk(list,target,proceed){leaveClose();const e=escapeHtml,first=list[0],hm=x=>new Date(x.kp.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  const d=document.createElement('div');d.id='leavePop';d.className='lvpop';d.dataset.key=first.s.key;d.dataset.first='one-at-a-time';
  d.innerHTML=`<div class="lvcard" role="dialog" aria-modal="true" aria-labelledby="lvTitle">
    <div class="lvhead"><span class="lvwarn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg></span>
      <div><h3 id="lvTitle">One filter at a time, ${e(me())}</h3>
      <p>You opened <b>${list.length===1?e(first.s.name):list.length+' filters'}</b> in Keepa today and <b>no file has come back</b>${list.length===1?'':' for any of them'}. Opening Keepa is not a run — nothing is saved and ${list.length===1?'it still shows':'they still show'} as NOT DONE.</p></div></div>
    <ol class="lvsteps">${list.slice(0,6).map((x,i)=>`<li class="${i?'later':'now'}"><span class="lvi">${i+1}</span><span class="lvt"><b>${e(x.s.name)}</b><small>opened in Keepa ${hm(x)} (${e(x.kp.mk||'')}) — no file dropped back in</small></span></li>`).join('')}${list.length>6?`<li class="later"><span class="lvi">+</span><span class="lvt"><b>and ${list.length-6} more</b><small>same thing</small></span></li>`:''}</ol>
    <div class="lvnext"><span class="lvlab">Do this now</span><p>Finish <b>${e(first.s.name)}</b> first: in Keepa <b>Export → All active columns → CSV</b> → <b>drop the file in</b> → the merge (UK Viewer) if it asks → <b>work the leads</b>. Then the next filter. One at a time — never open several in Keepa at once.</p></div>
    <div class="lvbtns"><button type="button" class="btn primary" id="lvStay">Go to ${e(first.s.name)}</button><button type="button" class="btn ghost" id="lvGo">Start ${e(target?target.name:'this one')} anyway</button></div>
    <p class="lvfoot">Keepa showed 0 results? Open that filter and press “Keepa showed 0 results — mark this done for today”.</p></div>`;
  document.body.appendChild(d);
  d.addEventListener('click',ev=>{if(ev.target===d){leaveClose();return;}
    if(ev.target.closest('#lvStay')){leaveClose();if(typeof actLog==='function')actLog('leave','One at a time · went back to '+first.s.name,first.s.key);
      if(typeof cur!=='undefined'&&cur&&!$('#viewRun').hidden&&typeof backToList==='function')backToList();if(typeof openRun==='function')openRun(first.s.key);window.scrollTo({top:0,behavior:'smooth'});return;}
    if(ev.target.closest('#lvGo')){leaveClose();if(typeof actLog==='function')actLog('leave','One at a time · started '+(target?target.name:'another')+' anyway, '+list.length+' unfinished',target?target.key:'');if(proceed)proceed();}});
  document.addEventListener('keydown',leaveKey,true);const b=d.querySelector('#lvStay');if(b)b.focus();}
document.addEventListener('click',e=>{if(!e.isTrusted||leaveBypass||!e.target.closest)return;
  const b=e.target.closest('#brandTbl button[data-act="run"]');if(!b)return;const tr=b.closest('tr'),key=tr&&tr.dataset.key;if(!key)return;
  let list=[];try{list=unfinishedMine(key);}catch(x){list=[];}if(!list.length)return;
  e.preventDefault();e.stopImmediatePropagation();
  oneAtATimeAsk(list,srcGet(key),()=>{leaveBypass=true;try{b.click();}finally{leaveBypass=false;}});},true);

/* real clicks only: the buttons that take you out of a run. A scripted click (the checks, the app's own navigation, "Leave anyway") passes. */
let leaveBypass=false;
document.addEventListener('click',e=>{if(!e.isTrusted||leaveBypass||!e.target.closest)return;
  const el=e.target.closest('#backBtn,#homeBtn,#runNext,#runNext2,#runAllTime,.pagebtn');if(!el)return;
  if(el.classList.contains('pagebtn')&&el.dataset.page==='page-brands')return;
  let st=null;try{st=leaveState();}catch(x){st=null;}if(!st)return;
  e.preventDefault();e.stopImmediatePropagation();
  leaveAsk(st,()=>{leaveBypass=true;try{el.click();}finally{leaveBypass=false;}});},true);
/* closing or reloading the tab before the files are in */
window.addEventListener('beforeunload',e=>{let st=null;try{st=leaveState();}catch(x){}if(st&&!st.saved){e.preventDefault();e.returnValue='';}});
