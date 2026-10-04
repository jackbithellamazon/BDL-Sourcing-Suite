/* BDL Sourcing — b260: "tell her with a popup" (Jack, 4 Oct).
   1. WHY A FILE WAS NOT TAKEN. Every refused export now has a reason — empty, Viewer / Finder columns not ticked, no Prime price column,
      a Prime file for a country Prime cannot be bought in. The person who dropped it gets a popup saying why and what to do (the column
      list keeps its own popup), and the activity log keeps the reason so Jack can see it on the Activity page.
   2. THE VIEWER'S OWN COLUMN LIST. Mera's DJI, Samsung and SanDisk runs died on 1 Oct: her Product Viewer exports were refused three times,
      14 columns not ticked IN THE VIEWER (the Viewer keeps its own list — the Finder's ticks do not count). When a VA's Viewer export is
      refused, the app remembers it under her name (this browser + the shared settings, `vneed:<Name>`) and shows her a popup every time she
      opens the app until a Viewer export of hers goes in. Mera starts with one, from those 1 Oct refusals. */
const VNEED_KEY='bdl-sourcing-vneed';
/* Jack's message to Mera — her 1 Oct refusals happened before this build, so no browser remembered them */
const VNEED_SEED={Mera:{at:'2026-10-01T16:34:00.000Z',n:14,runs:'DJI, Samsung and SanDisk / Seagate / WD (1 Oct)',seed:'2026-10-04'}};
function vneedAll(){return lsGet(VNEED_KEY,{})||{};}
function vneedOf(who){if(!who)return null;const v=vneedAll()[who];if(v)return v.cleared?null:v;const s=VNEED_SEED[who];return s&&!vneedAll()['_seen:'+who+':'+s.seed]?s:null;}
function vneedPut(who,v){const all=vneedAll();all[who]=v;lsSet(VNEED_KEY,all);
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('vneed:'+who,v)]);}
/* a VA's Viewer export was refused: remember the columns it lacked */
function vneedSet(missing,src){const who=typeof me==='function'?me():'';if(!who||(typeof isJack==='function'&&isJack()))return;
  vneedPut(who,{at:nowIso(),n:(missing||[]).length,missing:(missing||[]).map(c=>c.h),src:src||''});}
/* a Viewer export of hers went in: done, for good (until the next refusal) */
function vneedClear(how){const who=typeof me==='function'?me():'';if(!who)return;const cur=vneedAll()[who],s=VNEED_SEED[who];
  if(!cur&&!s)return;if(cur&&cur.cleared)return;
  const all=vneedAll();if(s)all['_seen:'+who+':'+s.seed]=true;lsSet(VNEED_KEY,all);vneedPut(who,{cleared:true,at:nowIso(),how:how||'viewer in'});}
/* the shared copy, unpacked by cloudPull */
function vneedFromCloud(st){const all=vneedAll();let ch=false;Object.keys(st||{}).filter(k=>k.startsWith('vneed:')).forEach(k=>{const who=k.slice(6),v=st[k];
  if(!v)return;const mine=all[who];if(!mine||String(v.at||'')>String(mine.at||'')){all[who]=v;ch=true;}
  if(v.cleared){const s=VNEED_SEED[who];if(s&&!all['_seen:'+who+':'+s.seed]){all['_seen:'+who+':'+s.seed]=true;ch=true;}}});
  if(ch)lsSet(VNEED_KEY,all);}
let vneedShownAt=0;
function vneedCheck(force){const who=typeof me==='function'?me():'';if(!who||(typeof isJack==='function'&&isJack()))return false;
  const v=vneedOf(who);if(!v)return false;if(!force&&Date.now()-vneedShownAt<20*60e3)return false;vneedShownAt=Date.now();
  const miss=v.missing&&v.missing.length&&typeof KEEPA_COLS!=='undefined'?KEEPA_COLS.filter(c=>v.missing.includes(c.h)):null;
  const when=v.at?new Date(v.at).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'';
  openColsPanel(miss,'KeepaExport-ProductViewer.csv',{
    head:`<h3>${escapeHtml(who)} — before your next run: <span class="bad">tick ${v.n?v.n+' ':''}columns in the Keepa Product <u>Viewer</u></span></h3>
      <p class="colswhy"><b>Why:</b> your Product Viewer export${v.runs?'s for <b>'+escapeHtml(v.runs)+'</b> were':' '+(when?'on '+escapeHtml(when)+' ':'')+'was'} not taken — ${v.n?'<b>'+v.n+' columns</b> are':'columns are'} not ticked <b>in the Viewer</b>. The Viewer keeps <b>its own column list</b>: ticking them in the Product Finder does not count. No Viewer file = the run cannot finish and no leads come out for the EU countries.</p>
      <p><b>Do this once (2 minutes):</b> open any <b>Product Viewer</b> in Keepa → <b>Configure Columns</b> (top left, above the table) → tick every ${miss?'<b class="bad">red</b> box below':'column below that is not ticked yet'} — type its name into the <b>Filter columns…</b> box and tick it. Keepa remembers. Then your next Viewer export goes straight in.</p>`,
    foot:`<div class="vnbtns"><button type="button" class="btn primary" id="vnDone">I've ticked them</button><button type="button" class="btn ghost" id="vnLater">Remind me later</button></div>`});
  const ov=$('#colsOv');if(ov){const d=$('#vnDone'),l=$('#vnLater');
    if(d)d.onclick=()=>{vneedClear('ticked');ov.hidden=true;if(typeof actLog==='function')actLog('click','Viewer columns — "I have ticked them"');toast('Thanks — your next Product Viewer export should go straight in');};
    if(l)l.onclick=()=>{ov.hidden=true;if(typeof actLog==='function')actLog('click','Viewer columns — "remind me later"');};}
  if(typeof actLog==='function')actLog('click','Viewer columns popup shown');
  return true;}

/* ---- why a dropped file was not taken ---- */
const REFUSE_WHY={
  empty:{short:'empty export (0 products)',head:'This export has no products in it',
    body:'Keepa found <b>0 products</b> for this filter today, so the file has nothing in it. That is not a mistake on your side.',
    todo:'Nothing to export today. Press <b>✓ Keepa showed 0 results? Mark this done for today</b> (under the Keepa buttons) so the filter shows as done — then go to the next one.'},
  'prime-col':{short:'no Prime price column',head:'Prime price column not ticked',
    body:'Prime deals are on, so every export needs Keepa\'s Prime price — without it a Prime-only deal would be priced at Amazon\'s normal price.',
    todo:'In Keepa press <b>Configure Columns</b> and tick <b>New, Prime exclusive → Current</b> (once — Keepa remembers). Export again and drop the new file.'},
  'prime-market':{short:'Prime file for a country Prime is not bought in',head:'Prime deals file for the wrong country',
    body:'Prime-only prices can only be bought on Amazon.co.uk, .de and .fr — or this filter is UK only.',
    todo:'Use the normal export for that country (or the UK one), and drop that instead.'},
  cols:{short:'columns not ticked',head:'Keepa columns not ticked',body:'',todo:''}};
function refusedShort(r){if(r.why==='cols')return`${r.kind==='viewer'?'Viewer':'Finder'} missing ${r.n} column${r.n===1?'':'s'}`;return(REFUSE_WHY[r.why]||{}).short||r.why;}
/* the popup for refusals that have no column list (that one has its own) */
function refusedPop(list){const L=(list||[]).filter(r=>r.why!=='cols');if(!L.length)return false;const e=escapeHtml;
  const old=$('#refPop');if(old)old.remove();
  const d=document.createElement('div');d.id='refPop';d.className='lvpop';
  d.innerHTML=`<div class="lvcard" role="dialog" aria-modal="true" aria-labelledby="refTitle">
    <div class="lvhead"><span class="lvwarn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg></span>
      <div><h3 id="refTitle">${L.length===1?'This file was not taken':L.length+' files were not taken'}</h3><p>Here is why, and what to do.</p></div></div>
    <ol class="lvsteps refsteps">${L.map(r=>{const w=REFUSE_WHY[r.why]||{};return`<li class="now"><span class="lvt"><b>${e(w.head||r.why)}</b><small class="reffile">${e(r.f)}</small><small>${w.body||''}</small><small class="reftodo"><b>Do this:</b> ${w.todo||''}</small></span></li>`;}).join('')}</ol>
    <div class="lvbtns"><button type="button" class="btn primary" id="refOk">OK</button></div></div>`;
  document.body.appendChild(d);const close=()=>d.remove();$('#refOk').addEventListener('click',close);d.addEventListener('click',ev=>{if(ev.target===d)close();});
  document.addEventListener('keydown',function k(ev){if(ev.key==='Escape'){close();document.removeEventListener('keydown',k);}});
  return true;}
/* the sandbox has no cloud pull to trigger it; a name picked or changed checks again */
document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{if(typeof cloudEnabled==='function'&&!cloudEnabled())vneedCheck();},1500);
  const w=document.getElementById('whoSel');if(w)w.addEventListener('change',()=>setTimeout(()=>vneedCheck(true),400));});

/* ---- "Is Keepa on Germany?" (b264) ----
   Jack, 4 Oct: "tell them when they do it — to change Keepa to Germany and France". A Keepa Finder link carries no country: it runs on
   whatever flag Keepa is on. Opened on the UK flag, the Germany / France filters lost "sold by Amazon" and Germany came back with 3,861
   products instead of 1,155. So a VA who presses a Germany / France / Italy / Spain filter button is asked first, every time: set the flag,
   then open it. Jack is not asked. Viewer links are not touched — they carry their own country. */
const MK_SITE={DE:['Germany','amazon.de'],FR:['France','amazon.fr'],IT:['Italy','amazon.it'],ES:['Spain','amazon.es']};
let flagPass=false;
/* the country a press needs Keepa set to, or null (UK, Viewer links, Jack) */
function flagNeed(a){if(!a||(typeof isJack==='function'&&isJack()))return null;if(!/#!finder\//.test(a.getAttribute('href')||''))return null;
  const m=a.closest('#keepaRow')?a.dataset.mk:String(a.dataset.pkey||'').split('|')[0];return MK_SITE[m]?m:null;}
function flagPop(a,m){const [name,site]=MK_SITE[m],F=(typeof FLAG!=='undefined'&&FLAG[m])||'';const old=$('#flagPop');if(old)old.remove();
  const d=document.createElement('div');d.id='flagPop';d.className='lvpop';
  d.innerHTML=`<div class="lvcard flagcard" role="dialog" aria-modal="true" aria-labelledby="flagTitle">
    <div class="lvhead"><span class="lvwarn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg></span>
      <div><h3 id="flagTitle">Is Keepa set to ${F} ${name}?</h3><p>Set it <b>before</b> the filter opens. If Keepa is on another country, it drops "sold by Amazon" and you get thousands of the wrong products.</p></div></div>
    <ol class="lvsteps flagsteps">
      <li class="now"><span class="lvi">1</span><span class="lvt"><b>In Keepa: the flag at the top right → ${F} ${name} (${site})</b><small>Already on ${name}? Go to step 2.</small></span></li>
      <li class="now"><span class="lvi">2</span><span class="lvt"><b>Then open the filter</b><small>Changed the flag after it opened? Close that Keepa tab and open it again from here.</small></span></li></ol>
    <div class="lvbtns"><button type="button" class="btn primary" id="flagGo">Keepa is on ${name} — open the filter ↗</button><button type="button" class="btn ghost" id="flagNo">Cancel</button></div></div>`;
  document.body.appendChild(d);const close=()=>{d.remove();document.removeEventListener('keydown',esc);};function esc(ev){if(ev.key==='Escape')close();}
  document.addEventListener('keydown',esc);d.addEventListener('click',ev=>{if(ev.target===d)close();});$('#flagNo').addEventListener('click',close);
  $('#flagGo').addEventListener('click',()=>{close();
    const live=a.isConnected?a:document.querySelector(a.dataset.pkey?`#primeGrid a[data-pkey="${a.dataset.pkey}"]`:`#keepaRow a[data-mk="${a.dataset.mk}"]`);
    if(typeof actLog==='function')actLog('click',`Keepa flag check · ${m} · "Keepa is on ${name}"`);
    if(live){flagPass=true;try{live.click();}finally{flagPass=false;}}else window.open(a.href,'_blank','noopener');});
  return true;}
document.addEventListener('click',e=>{if(flagPass)return;const a=e.target.closest&&e.target.closest('#keepaRow a[data-mk],#primeGrid a[data-pkey]');const m=flagNeed(a);if(!m)return;
  e.preventDefault();e.stopImmediatePropagation();flagPop(a,m);},true);
