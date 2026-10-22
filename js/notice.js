/* BDL Sourcing — b260: "tell her with a popup" (Jack, 4 Oct).
   1. WHY A FILE WAS NOT TAKEN. Every refused export now has a reason — empty, Viewer / Finder columns not ticked, no Prime price column,
      a Prime file for another country on a UK-only filter. The person who dropped it gets a popup saying why and what to do (the column
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

/* ---- b305: little drawings of Keepa's own screen, so a VA sees exactly where to click (Jack, 15 Oct: "help her — better and more
   detailed instructions"). Drawn from Mera's and Suz's screen videos: the country button sits top right next to the search box and shows
   the site (.co.uk / .it…); the rows button is in the toolbar ABOVE the table ("100 rows"), next to Export. ---- */
const KP_SITE={UK:['.co.uk','United Kingdom'],DE:['.de','Germany'],FR:['.fr','France'],IT:['.it','Italy'],ES:['.es','Spain']};
function kpPic(kind,o){o=o||{};const F=m=>(typeof FLAG!=='undefined'&&FLAG[m])||m,num=n=>`<span class="kpn">${n}</span>`;
  if(kind==='flag'){const to=o.to||'UK',from=o.from&&o.from!==to?o.from:null,cur=from||'??';
    return`<div class="kp"><div class="kp-top"><span class="kp-logo">◆ Keepa</span><span class="kp-nav">DEALS · TRACK · APPS · PRO</span><span class="kp-search">Search for products</span><span class="kp-flag hl">${num(1)}${from?F(from)+' '+KP_SITE[from][0]:'the flag'} ▾</span><span class="kp-user">👤</span></div>
      <div class="kp-menu"><div class="kp-mh">EUROPE</div>${['UK','DE','FR','IT','ES'].map(m=>`<div class="kp-mi${m===to?' hl':''}">${m===to?num(2):''}${F(m)} ${KP_SITE[m][1]} <i>${KP_SITE[m][0]}</i></div>`).join('')}</div></div>`;}
  if(kind==='rows')return`<div class="kp"><div class="kp-sub"><b>Product Finder</b> · Product Viewer · Product Best Sellers</div>
      <div class="kp-tools"><span>☰ Configure Columns</span><span>🔍 Jump to column</span><span class="kp-rows hl">${num(1)}≡ 100 rows ▾<span class="kp-dd"><i>5</i><i>20</i><i>100</i><i>…</i><i class="hl">${num(2)}5000</i></span></span><span class="kp-exp${o.exp?' hl':''}">${o.exp?num(3):''}⤓ Export</span></div>
      <div class="kp-note">Keepa opens every filter on <b>100 rows</b> — and it only exports the rows on screen.</div></div>`;
  if(kind==='export')return`<div class="kp kp-dlg"><b>Export Data</b><div>What to export? <span class="hl">${num(4)}● All active columns</span> ○ Only ASINs</div><div>Format: ○ Excel (.xlsx) <span class="hl">${num(5)}● CSV</span></div><div>☐ Include currency symbols <i>(leave it off)</i></div><span class="kp-btn">${num(6)}Export</span></div>`;
  if(kind==='files')return`<div class="kpfiles"><div class="ok">✓ KeepaExport-…-<b>ProductFinder</b>.csv <i>from “the filter” — today’s search</i></div><div class="bad">✗ KeepaExport-…-<b>ProductViewer</b>.csv <i>from “Open all in Keepa” — only your leads</i></div></div>`;
  return'';}

/* ---- why a dropped file was not taken ---- */
const REFUSE_WHY={
  empty:{short:'empty export (0 products)',head:'This export has no products in it',
    body:'Keepa found <b>0 products</b> for this filter today, so the file has nothing in it. That is not a mistake on your side.',
    todo:'Check the flag first, then mark it done — steps below.',
    pic:()=>'<ol class="kpsteps"><li>Was Keepa still loading? An export made before the table fills is empty — wait until the products show and the number of results stops changing, then export again</li><li>Look at Keepa\u2019s message: it must say <b>No results found for Amazon.co.uk</b>. If it says <b>.it / .de / .fr / .es</b>, Keepa is on the wrong country — click the flag top right → <b>United Kingdom</b> → press the filter again</li><li>Right country and still 0? Press <b>✓ Keepa showed 0 results? Mark this done for today</b> (under the Keepa buttons) — then go to the next filter</li></ol>'+kpPic('flag',{to:'UK'})},
  /* b311 (Jack, 22 Oct: "how are we improving it"): Mera's £95+ came back empty 6 times on 16–19 Oct — it usually has about 550 products, and
     each file was dropped 18–63 s after Keepa opened. The b309 answer ("not a mistake — mark it done") would have marked a real search done with 0. */
  'empty-big':{short:r=>`empty export — Keepa still loading (usually ~${r.usual})`,head:r=>`Keepa had not finished loading — this filter usually has about ${Number(r.usual).toLocaleString()} products`,
    body:r=>`The file has <b>0 products</b>, but this search normally finds about <b>${Number(r.usual).toLocaleString()}</b>. That means Keepa was still loading when Export was pressed${r.secs!=null?` — this file came in <b>${r.secs} seconds</b> after Keepa was opened`:''}. Big searches can take a minute or two.`,
    todo:'Wait for Keepa, then export again — steps below. Do not mark it done.',
    pic:()=>'<ol class="kpsteps"><li>Go to the Keepa tab with this filter and <b>wait</b>: the products must show in the table and the number of results at the top must stop changing</li><li>The flag top right must say <b>.co.uk</b></li><li><b>100 rows</b> button above the table → <b>5000</b></li><li><b>Export</b> → All active columns → CSV → drop the new file</li><li>Still empty after two minutes? Press <b>the filter</b> here once more. Still 0 → tell Jack the filter may need fixing (don\u2019t mark it done)</li></ol>'+kpPic('rows',{exp:true})+kpPic('export')},
  /* b311: on a brand with EU countries the UK Viewer is made from the Finder files, so it can only come last */
  'viewer-first':{short:r=>`Viewer with no country files (${r.n} products)`,head:'The UK Viewer comes last — drop the country files first',
    body:r=>`A <b>Product Viewer</b> file with ${r.n} products, and no country files in yet. On a brand with EU countries the run needs today\u2019s <b>Product Finder</b> export from each flag button first — the app then makes the UK Viewer list from them. A Viewer on its own is the page of leads you already had (from <b>Open all in Keepa</b>), so the brand would not really be run.`,
    todo:'Follow the steps below — the same order as the steps on this page.',
    pic:()=>kpPic('files')+'<ol class="kpsteps"><li>For each flag button here (UK, DE, FR, IT, ES): set that flag in Keepa first, then press the button</li><li>In Keepa: <b>100 rows</b> → 5000 → <b>Export</b> → All active columns → CSV → drop the <b>ProductFinder</b> file here</li><li>When every country is in, press <b>Open UK Product Viewer</b> here → wait for the table → Export → drop that Viewer file last</li></ol>'+kpPic('rows',{exp:true})},
  /* b311: the same file dropped on a second filter */
  twice:{short:r=>`same file as ${r.on} today`,head:r=>`This file already ran ${r.on} today`,
    body:r=>`It has the same name and the same <b>${Number(r.n).toLocaleString()} products</b> as the file ${escapeHtml(r.on)} ran on today — so it is that filter\u2019s export. Every filter has its own Keepa search, so this one would not really be run.`,
    todo:'Get this filter\u2019s own export — steps below.',
    pic:()=>'<ol class="kpsteps"><li>Here, press <b>the filter</b> (step 1 at the top) — Keepa opens this filter\u2019s own search</li><li>Wait for the table to fill · <b>100 rows</b> → <b>5000</b></li><li><b>Export</b> → All active columns → CSV → Export</li><li>Drop the <b>newest</b> file in Downloads — it has a new number at the end, like <b>ProductFinder (13).csv</b></li></ol>'+kpPic('rows',{exp:true})+kpPic('export')},
  'page':{short:'exactly 100 rows (one Keepa page)',head:'Exactly 100 rows — one Keepa page, not the whole search',
    body:'Keepa opens every search on <b>100 rows</b> per page and exports only the page on screen, so the rest of the search was left out.',
    todo:'Set 5000 rows and export again — steps below.',
    pic:()=>'<ol class="kpsteps"><li>In Keepa, the <b>100 rows</b> button above the table → <b>5000</b></li><li>Check the flag top right is the country of the button you pressed</li><li><b>Export</b> → All active columns → CSV → drop the new file</li></ol>'+kpPic('rows',{exp:true})+kpPic('export')},
  'prime-col':{short:'no Prime price column',head:'Prime price column not ticked',
    body:'Prime deals are on, so every export needs Keepa\'s Prime price — without it a Prime-only deal would be priced at Amazon\'s normal price.',
    todo:'Tick one column in Keepa (once — Keepa remembers) — steps below.',
    pic:()=>'<ol class="kpsteps"><li>In Keepa, press <b>Configure Columns</b> (top left, above the table)</li><li>In its search box type <b>Prime</b></li><li>Tick <b>New, Prime exclusive → Current</b> and close the box</li><li><b>100 rows</b> → 5000 → <b>Export</b> → All active columns → CSV → drop the new file</li></ol>'+kpPic('rows',{exp:true})},
  'prime-market':{short:'Prime file for another country on a UK-only filter',head:'Prime deals file for the wrong country',
    body:'This filter is UK only — it takes the UK ★ Prime file, not another country\'s.',
    todo:'Use the normal export for that country (or the UK one), and drop that instead.'},
  cols:{short:'columns not ticked',head:'Keepa columns not ticked',body:'',todo:''},
  /* b266 (Jack, 5 Oct: "make sure she's putting a fresh export in"): Keepa names every export with the day it was made */
  old:{short:r=>`old export (${typeof ukDate==='function'?ukDate(r.day):r.day})`,head:'This export is not from today',
    body:r=>`Keepa made this file on <b>${escapeHtml(typeof ukDate==='function'?ukDate(r.day):r.day)}</b> — it says so in the file name. Prices change every day, so an old export gives wrong leads.`,
    todo:'Export it again now — steps below.',
    pic:r=>'<ol class="kpsteps"><li>Go to the Keepa tab with this filter (or press <b>the filter</b> here again)</li><li><b>100 rows</b> button above the table → <b>5000</b></li><li><b>Export</b> → All active columns → CSV → Export</li><li>In Downloads take the <b>newest</b> file — its name has today\u2019s date: <b>KeepaExport-'+(typeof today==='function'?today():'')+'-…</b> — and drop it here</li></ol>'+kpPic('rows',{exp:true})+kpPic('export')},
  /* b304 (two weeks of runs, 15 Oct: 50 of 121 filter-days were run on the wrong file) */
  'viewer-finder':{short:r=>`Viewer file, not the filter (${r.n} products)`,head:'This is your leads\u2019 Viewer page — not today\u2019s search',
    pic:()=>kpPic('files')+'<ol class="kpsteps"><li>Back here, press <b>the filter</b> (step 1 at the top) — Keepa opens <b>Product Finder</b></li><li>In Keepa, the <b>100 rows</b> button above the table → <b>5000</b></li><li><b>Export</b> → All active columns → CSV → Export</li><li>Drop the new file here — its name says <b>ProductFinder</b></li></ol>'+kpPic('rows',{exp:true})+kpPic('export'),
    body:r=>`A <b>Product Viewer</b> file with ${r.n} products: the Keepa page that <b>Open all in Keepa</b> opens. It only has the leads you already had, so the filter would not really be run.`,
    todo:'Follow the 4 steps below — the pictures show where to click in Keepa.'},
  country:{short:r=>`from Amazon ${r.mk}, not UK`,head:r=>`This export is from Amazon ${r.mk} — Keepa was on the wrong flag`,
    pic:r=>'<ol class="kpsteps"><li>Go to your Keepa tab. Top right, next to the search box, click the flag — it says <b>'+((KP_SITE[r.mk]||[''])[0])+'</b></li><li>In the list click <b>United Kingdom</b></li><li>Back here, press <b>the filter</b> again → rows <b>5000</b> → Export → drop the new file</li></ol>'+kpPic('flag',{from:r.mk,to:'UK'}),
    body:'A Keepa filter runs on whatever country Keepa is set to. This one is UK only, so another country\u2019s prices would give wrong leads.',
    todo:'Follow the 3 steps below — the picture shows where the flag is in Keepa.'},
  small:{short:r=>`only ${r.n} products (usually ~${r.usual})`,head:r=>`Only ${r.n} products — this filter usually has about ${Number(r.usual).toLocaleString()}`,
    pic:()=>'<ol class="kpsteps"><li>In Keepa, the <b>100 rows</b> button above the table → <b>5000</b> (Keepa resets it to 100 on every filter)</li><li>Check the flag top right says <b>.co.uk</b></li><li><b>Export</b> → All active columns → CSV → Export, drop the new file</li></ol>'+kpPic('rows',{exp:true})+kpPic('export'),
    body:'You chose to export again — good. Most often Keepa was still on 100 rows per page, or on another country\u2019s flag.',
    todo:'Follow the 3 steps below — the pictures show where to click in Keepa.'}};
/* "KeepaExport-2026-10-05-ProductFinder (3).csv" → "2026-10-05"; a renamed file gives null and is never refused for its date */
function exportDay(name){const m=String(name||'').match(/KeepaExport-(\d{4}-\d{2}-\d{2})-/i);return m?m[1]:null;}
/* the earliest day that still counts as today: the browser's own date or the UTC date, whichever is earlier — so a VA in another
   time zone is never refused for a file Keepa named by the other clock */
function freshFloor(){const l=typeof today==='function'?today():new Date().toISOString().slice(0,10),u=new Date().toISOString().slice(0,10);return l<u?l:u;}
function exportIsOld(name){const d=exportDay(name);return!!(d&&d<freshFloor());}
function refusedShort(r){if(r.why==='cols')return`${r.kind==='viewer'?'Viewer':'Finder'} missing ${r.n} column${r.n===1?'':'s'}`;const s=(REFUSE_WHY[r.why]||{}).short;return typeof s==='function'?s(r):s||r.why;}
/* the popup for refusals that have no column list (that one has its own) */
function refusedPop(list){const L=(list||[]).filter(r=>r.why!=='cols');if(!L.length)return false;const e=escapeHtml;
  const old=$('#refPop');if(old)old.remove();
  const d=document.createElement('div');d.id='refPop';d.className='lvpop';
  d.innerHTML=`<div class="lvcard" role="dialog" aria-modal="true" aria-labelledby="refTitle">
    <div class="lvhead"><span class="lvwarn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg></span>
      <div><h3 id="refTitle">${L.length===1?'This file was not taken':L.length+' files were not taken'}</h3><p>Here is why, and what to do.</p></div></div>
    <ol class="lvsteps refsteps">${L.map(r=>{const w=REFUSE_WHY[r.why]||{};const fx=v=>typeof v==='function'?v(r):(v||'');return`<li class="now"><span class="lvt"><b>${e(typeof w.head==='function'?w.head(r):(w.head||r.why))}</b><small class="reffile">${e(r.f)}</small><small>${fx(w.body)}</small><small class="reftodo"><b>Do this:</b> ${fx(w.todo)}</small>${w.pic?`<div class="kpwrap">${fx(w.pic)}</div>`:''}</span></li>`;}).join('')}</ol>
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
/* b304 (Mera's video, 15 Oct: after Logitech's Italy file she opened her UK £60+ filter and Keepa said "No results found for Amazon.it").
   Keepa stays on the last flag. The app remembers the last country a VA set it to; a UK filter opened after an EU one asks first. */
const MK_ANY=Object.assign({UK:['the UK','amazon.co.uk']},MK_SITE),KFLAG_KEY='bdl-sourcing-kflag';
function kflagSet(m){try{lsSet(KFLAG_KEY,{mk:m,at:Date.now()});}catch(e){}}
function kflagLast(){const x=lsGet(KFLAG_KEY,null);return x&&x.mk&&Date.now()-(+x.at||0)<16*3600e3?x.mk:null;}
let flagPass=false;
/* the country a press needs Keepa set to, or null (UK, Viewer links, Jack) */
function flagNeed(a){if(!a||(typeof isJack==='function'&&isJack()))return null;if(!/#!finder\//.test(a.getAttribute('href')||''))return null;
  const m=a.closest('#keepaRow')?(a.dataset.mk||'UK'):String(a.dataset.pkey||'').split('|')[0];if(MK_SITE[m])return m;
  if(m==='UK'){const l=kflagLast();return l&&l!=='UK'?'UK':null;}   /* b304: back to the UK after an EU filter */
  return null;}
function flagPop(a,m){const [name,site]=MK_ANY[m],F=(typeof FLAG!=='undefined'&&FLAG[m])||'';const was=m==='UK'?kflagLast():null,wasN=was&&MK_ANY[was]?MK_ANY[was][0]:'';const old=$('#flagPop');if(old)old.remove();
  const d=document.createElement('div');d.id='flagPop';d.className='lvpop';
  d.innerHTML=`<div class="lvcard flagcard" role="dialog" aria-modal="true" aria-labelledby="flagTitle">
    <div class="lvhead"><span class="lvwarn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg></span>
      <div><h3 id="flagTitle">${was?`Is Keepa back on ${F} ${name}?`:`Is Keepa set to ${F} ${name}?`}</h3><p>${was?`Your last filter had Keepa on <b>${(typeof FLAG!=='undefined'&&FLAG[was])||''} ${wasN}</b> — Keepa stays on that flag until you change it. A UK filter opened on ${wasN} shows <b>No results</b> or the wrong products.`:'Set it <b>before</b> the filter opens. If Keepa is on another country, it drops "sold by Amazon" and you get thousands of the wrong products.'}</p></div></div>
    <ol class="lvsteps flagsteps">
      <li class="now"><span class="lvi">1</span><span class="lvt"><b>Go to your Keepa tab. Top right, next to the search box, click the flag${was?` — it says <u>${KP_SITE[was][0]}</u>`:''}</b><small>It shows which Amazon Keepa is on: .co.uk = UK, .de = Germany, .fr = France, .it = Italy, .es = Spain.</small></span></li>
      <li class="now"><span class="lvi">2</span><span class="lvt"><b>In the list, click ${F} ${KP_SITE[m][1]} (${site})</b><small>Already on ${KP_SITE[m][0]}? Nothing to change — go to step 3.</small></span></li>
      <li class="now"><span class="lvi">3</span><span class="lvt"><b>Come back here and press the blue button — the filter opens on ${m==='UK'?'the UK':name}</b><small>Opened it before changing the flag? Close that Keepa tab and press the filter again here.</small></span></li></ol>
    <div class="kpwrap">${kpPic('flag',{from:was||null,to:m})}</div>
    <div class="lvbtns"><button type="button" class="btn primary" id="flagGo">Keepa is on ${m==='UK'?'UK':name} — open the filter ↗</button><button type="button" class="btn ghost" id="flagNo">Cancel</button></div></div>`;
  document.body.appendChild(d);const close=()=>{d.remove();document.removeEventListener('keydown',esc);};function esc(ev){if(ev.key==='Escape')close();}
  document.addEventListener('keydown',esc);d.addEventListener('click',ev=>{if(ev.target===d)close();});$('#flagNo').addEventListener('click',close);
  $('#flagGo').addEventListener('click',()=>{close();
    const live=a.isConnected?a:document.querySelector(a.dataset.pkey?`#primeGrid a[data-pkey="${a.dataset.pkey}"]`:a.dataset.mk?`#keepaRow a[data-mk="${a.dataset.mk}"]`:'#keepaRow a[href*="#!finder/"]');
    if(typeof actLog==='function')actLog('click',`Keepa flag check · ${m} · "Keepa is on ${name}"`);kflagSet(m);   /* b304 */
    if(live){flagPass=true;try{live.click();}finally{flagPass=false;}}else window.open(a.href,'_blank','noopener');});
  return true;}
document.addEventListener('click',e=>{if(flagPass)return;const a=e.target.closest&&e.target.closest('#keepaRow a[data-mk],#keepaRow a[href*="#!finder/"],#primeGrid a[data-pkey]');const m=flagNeed(a);if(!m)return;
  e.preventDefault();e.stopImmediatePropagation();flagPop(a,m);},true);

/* ---- the app's own dialogs (b266) ----
   Jack, 5 Oct: "popups nicely UI / UX designed — not Google Chrome ones". Every question the app asks used the browser's grey
   confirm() box. One designed dialog now asks them all: a title, the detail, a real button saying what happens, Cancel.
   Enter = the button, Esc or a click outside = Cancel. uiConfirm(message) splits the old "title\n\ndetail" text by itself.
   window.__uiAnswer (checks only) answers at once. */
const UI_ICON={
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.2"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19L12 3z"/><path d="M12 10v4.5M12 17.6v.2"/></svg>',
  danger:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  token:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h4.5a1.8 1.8 0 0 1 0 3.6H9"/></svg>'};
function uiDialog(o){o=o||{};
  if(window.__uiAnswer!==undefined){const a=window.__uiAnswer;return Promise.resolve(o.input?(a===true?String(o.input.value==null?'':o.input.value):a):!!a);}
  return new Promise(res=>{const old=document.getElementById('uiDlg');if(old)old.remove();const tone=o.tone||'info',e=escapeHtml;
    const d=document.createElement('div');d.id='uiDlg';d.className='lvpop uidlg';
    d.innerHTML=`<div class="lvcard uicard t-${tone}" role="dialog" aria-modal="true" aria-labelledby="uiT">
      <div class="lvhead"><span class="lvwarn uiic">${UI_ICON[tone]||UI_ICON.info}</span><div class="uitxt"><h3 id="uiT">${o.titleHtml||e(o.title||'')}</h3>${o.body?`<div class="uibody">${o.body}</div>`:''}</div></div>
      ${o.input?`<input class="uiin" id="uiIn" type="text" inputmode="${o.input.mode||'text'}" value="${e(String(o.input.value==null?'':o.input.value))}" placeholder="${e(o.input.placeholder||'')}" aria-labelledby="uiT">`:''}
      <div class="lvbtns"><button type="button" class="btn primary${tone==='danger'?' danger':''}" id="uiOk">${e(o.ok||'OK')}</button>${o.cancel===false?'':`<button type="button" class="btn ghost" id="uiNo">${e(o.cancel||'Cancel')}</button>`}</div></div>`;
    document.body.appendChild(d);const inp=document.getElementById('uiIn'),okB=document.getElementById('uiOk');
    const done=v=>{d.remove();document.removeEventListener('keydown',key,true);res(v);};
    const yes=()=>done(o.input?(inp?inp.value:''):true),no=()=>done(o.input?null:false);
    function key(ev){if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();no();}else if(ev.key==='Enter'&&(document.activeElement===inp||document.activeElement===okB)){ev.preventDefault();yes();}}
    document.addEventListener('keydown',key,true);okB.addEventListener('click',yes);const nb=document.getElementById('uiNo');if(nb)nb.addEventListener('click',no);
    d.addEventListener('click',ev=>{if(ev.target===d)no();});setTimeout(()=>{(inp||okB).focus();if(inp)inp.select();},30);});}
function uiConfirm(msg,o){const p=String(msg).split('\n\n');
  return uiDialog(Object.assign({title:p[0],body:p.slice(1).map(x=>`<p>${escapeHtml(x).replace(/\n/g,'<br>')}</p>`).join('')},o||{}));}
function uiPrompt(msg,value,o){return uiDialog(Object.assign({title:msg,input:{value}},o||{}));}
