/* BDL Sourcing — Prime event mode (b214).
   Jack, 30 Sep 2026: "need to get ready for prime event … a toggle … normal filter then a prime one"; "uk prime and eu prime";
   "we can only do prime in amazon germany and france not italy and spain"; "i want to turn it on and off"; "no i want to run it
   on only — no VAs, just me". Rule 1 buying at the Prime price: "yes".

   What it is:
   · A switch only Jack sees (per browser, no end date). Off = the app is exactly as before, for everyone.
   · On, every run screen gets a box grid: each country has its normal filter box and a ★ Prime deals box (UK, DE, FR — and IT, ES since b269).
   · The Prime link is the source's own Finder link with the one drop line swapped: "Amazon price 9%+ under its 90-day average"
     becomes "Prime exclusive price 9%+ under its 90-day average" (PRIME_EXCL_deltaPercent90, the key in Jack's Samsung link).
     During the event Amazon's normal price and the Buy Box do not move, so the normal filter never sees the deal.
   · A file knows its own box: the country from the Amazon links inside it; Prime when most rows say "Buy Box: Prime exclusive = yes"
     (37 of 37 on Jack's 30 Sep Prime export, 2.6% across 127k rows of normal exports). Italy / Spain joined in b269.
   · The Prime file's rows merge into that country's normal file (one run, de-duplicated by ASIN) — an overlay that comes off
     again the moment the Prime file is removed or the switch goes off.
   · The buy price is Keepa's "New, Prime exclusive: Current" when it is lower, with the S&S or coupon the export shows on top
     (Jack, 30 Sep: "most things won't have S&S or coupons but some might — you can see if they do by the export"). */
/* b269 (Jack, 5 Oct: "Amazon Spain is now OK for Prime — Italy is too now"): Prime is bought in all five countries */
const PRIME_KEY='bdl-sourcing-prime',PRIME_MK=['UK','DE','FR','IT','ES'],PRIME_COL='New, Prime exclusive: Current';
const pfiles={UK:null,DE:null,FR:null,IT:null,ES:null};   /* the ★ Prime deals file per country, exactly as dropped */
const pcell={};                          /* 'UK|n' / 'UK|p' / 'viewer' → {state:'keepa'} or {state:'bad',name,why} */
/* b216 (Jack, 1 Oct 2026, early Prime deals already live: "default turn it on now") — ON unless Jack has switched it off. Still never for VAs. */
/* b218 (Jack, 1 Oct: "they need to run normal and prime now until I turn it off"): the VAs get the same box grid and Prime pricing.
   Jack's own switch is his (per browser); everyone else follows his shared 'prime-event' setting (no row yet = on). */
function primeOn(){if(typeof isJack!=='function'||!me())return false;return primeEventOn();}
/* the Prime price of one row: Keepa's column when ticked, nothing otherwise */
/* b220 (Jack, 1 Oct: "on Prime — Buy Box seller needs to be Amazon"): the Prime deal we buy is Amazon's own ("Deal price … Shipper / Seller:
   Amazon"). A row whose Buy Box is held by someone else gets no Prime price; a file without the seller column is taken as it is. */
function primeBBok(r){const s=String((r&&r['Buy Box: Buy Box Seller'])||'').trim();return!s||/^amazon/i.test(s);}
function primePrice(r){if(!r||!primeBBok(r))return null;let v=r[PRIME_COL];
  if(v==null){const k=Object.keys(r).find(h=>/prime exclusive/i.test(h)&&/current/i.test(h)&&!/^buy box/i.test(h));v=k?r[k]:null;}
  const n=kNum(v);return n>0?n:null;}
function primeHasCol(rows){const r=rows&&rows[0];return!!r&&(PRIME_COL in r||Object.keys(r).some(h=>/prime exclusive/i.test(h)&&/current/i.test(h)&&!/^buy box/i.test(h)));}
function primeShare(rows){if(!rows||!rows.length)return 0;
  return rows.filter(r=>String(r['Buy Box: Prime exclusive']||'').trim().toLowerCase()==='yes'||primePrice(r)).length/rows.length;}
function primeIsFile(rows){return primeShare(rows)>=0.5;}
/* the Prime version of a Finder link: every Amazon / Buy Box drop line comes out (they do not move during the event), one
   Prime-exclusive drop goes in at the same bar (the Amazon 90-day one's, else 9%), and the sort follows it */
const PRIME_DROP_RE=/^(AMAZON|BUY_BOX_SHIPPING)_deltaPercent(7|30|90)$/;
/* b220: and the Prime link asks Keepa for Amazon in the Buy Box — that country's own Amazon seller IDs (Jack's Mera £60+ Prime link, 1 Oct) */
const AMZ_BB_IDS={UK:'A3P5ROKL5A1OLE,AZH2GF8Z5J95G',DE:'A3JWKAKR8XB7XF,AMUN6OW4OKOC5',FR:'A1X6FK5RDHNB96,A2W68NJA5YNXUP',IT:'A11IL2PNWYJU7H',ES:'A1AT7YVPFBWXBL'};   /* b269: + Amazon.it / Amazon.es (their EU drops links' own IDs, checked on the live pages) */
function primeLink(link,mk){if(!link)return'';const m=/^(.*#!finder\/)(.+)$/.exec(link);if(!m)return'';let j;
  try{j=JSON.parse(decodeURIComponent(m[2]));}catch(e){return'';}
  const f=j.f||(j.f={});const bar=f.AMAZON_deltaPercent90||f.BUY_BOX_SHIPPING_deltaPercent90||null;
  Object.keys(f).forEach(k=>{if(PRIME_DROP_RE.test(k))delete f[k];});
  if(!f.PRIME_EXCL_deltaPercent90)f.PRIME_EXCL_deltaPercent90=bar?Object.assign({},bar):{filterType:'number',type:'greaterThanOrEqual',filter:9,filterTo:null};   /* b224: a Prime-only filter keeps its own bar */
  if(Array.isArray(j.s))j.s=j.s.map(x=>x&&PRIME_DROP_RE.test(x.colId||'')?Object.assign({},x,{colId:'PRIME_EXCL_deltaPercent90'}):x);
  f.buyBoxSellerIdHistory={filterType:'dynamic',filter:AMZ_BB_IDS[mk]||AMZ_BB_IDS.UK,filterDetail:'',type:'equals'};
  return m[1]+encodeURIComponent(JSON.stringify(j));}
/* which slot a country's Prime rows overlay: Rule 2 = the one UK file; a UK-only brand = its one UK file; otherwise that country's Finder */
function primeSlot(k){if(!cur)return null;if(cur.rule!==1)return k==='UK'?'one':null;return(k==='UK'&&typeof ukOnly==='function'&&ukOnly())?'viewer':k;}
function primeMerge(base,p){const at=new Map(),rows=[];
  (base?base.rows:[]).forEach(r=>{const a=(r.ASIN||'').trim();at.set(a,rows.length);rows.push(r);});
  p.rows.forEach(r=>{const a=(r.ASIN||'').trim();if(at.has(a)){const i=at.get(a);if(primePrice(r)&&!primePrice(rows[i]))rows[i]=r;}else{at.set(a,rows.length);rows.push(r);}});
  return Object.assign({},base||p,{name:(base?base.name+' + ':'')+'★ '+p.name,rows,asins:[...at.keys()].filter(Boolean),
    hasFees:(base?base.hasFees:true)&&p.hasFees,hasSince:(base?base.hasSince:true)&&p.hasSince,__prime:true,__base:base||null});}
/* the overlay comes off (back to exactly what was dropped) and goes back on — around every drop, remove and switch */
function primeStrip(){if(files.viewer&&files.viewer.__aug)files.viewer=files.viewer.__pure;   /* b242: the Viewer + UK file merge comes apart first */
  ['one','viewer','UK','DE','FR','IT','ES'].forEach(s=>{const f=files[s];if(f&&f.__prime)files[s]=f.__base||null;});}
function primeApply(){primeStrip();if(primeOn()&&cur)PRIME_MK.forEach(k=>{const p=pfiles[k];if(!p)return;const s=primeSlot(k);if(s)files[s]=primeMerge(files[s],p);});
  if(typeof dropAlias==='function')dropAlias();}   /* b242: …and goes back together on top of the Prime rows */
function primeClear(){PRIME_MK.forEach(k=>pfiles[k]=null);Object.keys(pcell).forEach(k=>delete pcell[k]);}
/* the normal file in a country's box, underneath any overlay */
function primeNormal(k){const s=cur&&cur.rule!==1?(k==='UK'?'one':null):(k==='UK'&&ukOnly()?'viewer':k);const f=s?files[s]:null;return f&&f.__prime?f.__base:f;}
/* ---- the box grid (the approved preview, 30 Sep) ---- */
function primeMarkets(){if(!cur)return[];if(cur.rule!==1||ukOnly())return['UK'];
  const ms=cur.markets.slice();MARKETS.forEach(m=>{if(!ms.includes(m)&&(files[m]||pfiles[m]))ms.push(m);});return MARKETS.filter(m=>ms.includes(m));}
function primeLinkFor(m,kind){if(!cur)return'';const base=(cur.links&&cur.links[m])||finderLink(cur);return kind==='p'?primeLink(base,m):base;}
/* b243 (Jack, 3 Oct, Bialetti: "doesn't need the Prime one — it's just a sales one"): a source with noPrime has no ★ boxes — its filter has no
   price-drop condition, so the normal export already holds every product and its Prime price column. The Prime PRICE is still used. */
function primeSlots(){const out=[];primeMarkets().forEach(m=>{if(!(cur&&cur.primeOnly))out.push(m+'|n');if(PRIME_MK.includes(m)&&!(cur&&cur.noPrime))out.push(m+'|p');});return out;}   /* b224: Prime-only = ★ boxes only */
function primeIn(key){const [m,k]=key.split('|');return k==='p'?!!pfiles[m]:!!primeNormal(m);}
function paintPrime(){const host=$('#primeGrid'),vr=$('#viewRun');if(!host||!vr)return;
  const on=!!cur&&primeOn()&&!(typeof isListed==='function'&&isListed(cur))&&!cur.drop;vr.classList.toggle('primemode',on);paintPrimeSwitch();   /* b222: not on Drop & check */
  if(!on){host.hidden=true;host.innerHTML='';return;}
  host.hidden=false;const slots=primeSlots(),nx=slots.find(k=>!primeIn(k))||null,r1multi=cur.rule===1&&!ukOnly();
  /* b234: a two-link source (Suz's coupons: % off + £ off) — its normal box takes two exports, one button each */
  const two=cur.rule!==1&&!!cur.link2&&!cur.primeOnly,nIn=two&&primeNormal('UK')?String(primeNormal('UK').name||'').split(' + ').length:0;
  const viewerIn=!!files.viewer&&r1multi,finIn=slots.filter(primeIn).length+(two&&nIn>=2?1:0),allF=!nx;
  const esc=escapeHtml,site={UK:'Amazon.co.uk',DE:'Amazon.de',FR:'Amazon.fr',IT:'Amazon.it',ES:'Amazon.es'};
  let h=`<div class="pghead"><b>Get a file from every box</b><span>Open in Keepa → rows per page biggest → Export → All active columns → CSV → drop it anywhere. Each file finds its own box.</span><span class="pgcount"><b>${finIn+(viewerIn?1:0)}</b> / ${slots.length+(r1multi?1:0)+(two?1:0)} files</span></div>`;
  h+=`<div class="pgrid"><div></div><div class="pcolh">Normal filter</div><div class="pcolh prime">★ Prime deals</div>`;
  primeMarkets().forEach(m=>{h+=`<div class="pmk"><span class="fl">${FLAG[m]}</span><div>${m}<small>${site[m]}</small></div></div>`;
    ['n','p'].forEach(kind=>{const key=m+'|'+kind,pr=kind==='p';
      if(pr&&!PRIME_MK.includes(m)){h+=`<div class="pcell noprime"><span class="txt"><span class="t1">No Prime box</span><span class="t2">Prime deals can't be bought on ${site[m]}</span></span></div>`;return;}
      if(pr&&cur.noPrime){h+=`<div class="pcell noprime"><span class="txt"><span class="t1">No ★ box needed</span><span class="t2">the normal ${m} file already has the Prime prices</span></span></div>`;return;}
      if(!pr&&cur.primeOnly){h+=`<div class="pcell noprime"><span class="txt"><span class="t1">Prime-only filter</span><span class="t2">Just the ★ box for ${m}</span></span></div>`;return;}   /* b224 */
      const f=pr?pfiles[m]:primeNormal(m),c=pcell[key]||{},link=primeLinkFor(m,kind);
      const st=f?'in':c.state==='bad'?'bad':c.state==='keepa'?'keepa':'';
      const go=link?`<a class="go" href="${esc(link)}" target="_blank" rel="noopener" data-pkey="${key}">${st==='keepa'||st==='bad'?'Open again':'Open in Keepa'} ↗</a>`:'';
      let t1,t2,right='';
      if(!pr&&two){const L=finderLinks(cur);const gos=L.map((x,i)=>`<a class="go" href="${esc(x.url)}" target="_blank" rel="noopener" data-pkey="${key}" title="${esc(x.lab)} — export all columns, drop it in">${nIn>i?'✓ ':''}${esc(x.lab.replace(/ coupons$/,''))} ↗</a>`).join('');
        t1=f?(nIn>=2?'Both exports in':'1 of 2 in'):'UK filter';t2=f?`${f.rows.length.toLocaleString()} products`:'2 exports — drop both';
        h+=`<div class="pcell two ${nIn>=2?'in':''} ${key===nx&&!f?'next':''}"><span class="box">${nIn>=2?'✓':''}</span><span class="txt"><span class="t1">${t1}</span><span class="t2">${t2}</span></span><span class="gos">${gos}</span>${f?`<button type="button" class="x" data-prm="${key}" aria-label="Remove the UK normal files">✕</button>`:''}</div>`;return;}
      if(f){t1=esc(f.name);t2=`${f.rows.length.toLocaleString()} products${pr?` · ${f.rows.filter(primePrice).length.toLocaleString()} with a Prime price`:''}`;right=`<button type="button" class="x" data-prm="${key}" aria-label="Remove ${m} ${pr?'Prime':'normal'} file">✕</button>`;}
      else if(st==='bad'){t1='Not taken — '+esc(c.why||'columns missing');t2=esc(c.name||'');right=go;}
      else if(st==='keepa'){t1='In Keepa — waiting for the file';t2='Export → All active columns → CSV, then drop it here';right=go;}
      else{t1=pr?`${m} ★ Prime deals`:`${m} filter`;t2=m==='UK'?'Keepa on the UK flag first':`Set Keepa to ${m} first, then press`;right=go;}   /* b262: a link opened on another country loses "sold by Amazon" — the flag comes first */
      h+=`<div class="pcell ${pr?'prime':''} ${st} ${key===nx&&!st?'next':''}"><span class="box">${f?'✓':st==='bad'?'!':''}</span><span class="txt"><span class="t1">${t1}</span><span class="t2">${t2}</span></span>${right}</div>`;});});
  h+='</div>';
  if(r1multi){const bar=$('#asinBar'),merged=(bar&&bar._all)?bar._all.length:0,vLeft=typeof viewerPartsLeft==='function'?viewerPartsLeft():0,vN=merged?viewerParts(bar._all).length:1;
    h+=`<div class="pviewer"><div class="pmk"><span class="fl">${FLAG.UK}</span><div>UK Viewer<small>the selling side</small></div></div>`+(files.viewer&&vLeft
      ?`<div class="pcell next"><span class="box"></span><span class="txt"><span class="t1">Part ${vN-vLeft} of ${vN} in · ${files.viewer.rows.length.toLocaleString()} products so far</span><span class="t2">${merged.toLocaleString()} ASINs is more than one Keepa export holds — press for the next part</span></span><button type="button" class="go big" data-pview="1">Open part ${vN-vLeft+1} of ${vN} ↗</button></div>`
      :files.viewer
      ?`<div class="pcell in"><span class="box">✓</span><span class="txt"><span class="t1">${esc(files.viewer.name)}</span><span class="t2">${files.viewer.rows.length.toLocaleString()} products priced in the UK</span></span><button type="button" class="x" data-prm="viewer" aria-label="Remove the Viewer file">✕</button></div>`
      :`<div class="pcell ${allF?'next':finIn?'':'off'} ${(pcell.viewer||{}).state==='keepa'?'keepa':''}"><span class="box"></span><span class="txt"><span class="t1">${merged?`${merged.toLocaleString()} ASINs merged from ${finIn} file${finIn===1?'':'s'}${allF?'':' so far'}`:'Opens once the country files are in'}</span><span class="t2">${merged?'One press opens the Viewer with them loaded · export all columns · drop it here':'Every ASIN from the boxes above, de-duplicated'}</span></span>${merged?`<button type="button" class="go big" data-pview="1">${vN>1?`Open part 1 of ${vN}`:'Open UK Viewer'} ↗</button>`:''}</div>`)+'</div>';}
  h+=`<details class="pwhat"><summary>What is Prime exclusive?</summary><p>${escapeHtml(PRIME_WHAT)}</p><p>Each ★ box is the same filter with the Prime price added. Its export needs Keepa's <b>New, Prime exclusive → Current</b> column (Configure Columns, tick it once). On the lead list: <b>Deal → ★ Prime exclusive</b> shows only the Prime leads; <b>Buy from</b> ticks countries.</p></details>`;
  h+=`<p class="pnote">${cur.noPrime?'★ This filter needs the normal box for each flag only — no ★ Prime boxes. Prime prices are read from the normal files':cur.primeOnly?'★ A Prime-only filter — just the ★ box for each flag':'★ Prime deals are on until Jack turns them off — do the normal box AND the ★ Prime box for each flag'} · ${r1multi?(cur.noPrime||cur.primeOnly?'every file goes into the one UK Viewer':'every country has a ★ Prime box now — Italy and Spain too · every file goes into the one UK Viewer'):'both files join into one run'} · buy price = the Prime price when it is lower, plus any S&amp;S or coupon the export shows.</p>`;
  host.innerHTML=h;}
function paintPrimeSwitch(){const b=$('#primeTog');if(!b)return;const j=typeof isJack==='function'&&isJack();b.hidden=!j;if(!j)return;
  const on=primeEventOn();b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false');
  b.innerHTML=`<i class="ptog"></i>★ Prime event${on?' on':''}`;
  b.title=on?'Prime event mode is on — for everyone: Suz and Mera get the ★ Prime boxes too, and every export needs the Prime price column. Press to switch it off.':'Switch on for the Prime event: every run gets a ★ Prime deals box for every country — for you, Suz and Mera.';}   /* b260: it has been shared since b218 */
function primeToggle(){if(!isJack())return;const on=!primeEventOn();lsSet(PRIME_KEY,on);primeApply();
  lsSet(PRIME_EVENT_KEY,{on,at:nowIso()});if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('prime-event',{on,at:nowIso()})]);   /* b217: the VAs' notes follow */
  if(typeof renderList==='function')renderList();if(cur&&typeof paintRunHead==='function')paintRunHead();
  if(typeof paintSlots==='function'&&cur)paintSlots();paintPrime();if(cur&&typeof run==='function')run();
  toast(on?'★ Prime event on — the Prime boxes are on every run, for you, Suz and Mera':'Prime event off for everyone — normal filters only');}
/* b217 (Jack, 1 Oct: "notes need say about prime deals please — in the notes"). While the Prime event is on, every source's note says
   so — for everyone. Jack's switch drives it and travels to the VAs as one src_settings row ('prime-event'); no row yet = on, because the
   early Prime deals are already live. Off = the line disappears everywhere on the VAs' next sync. */
const PRIME_EVENT_KEY='bdl-sourcing-prime-event';
/* b285 (Jack, 7 Oct 2026, after Prime Big Deal Days: "take all prime exclusive down now, hide it — the Prime event is over, back to normal").
   OFF is the default now, for everyone. The shared 'prime-event' row only counts when it was switched on AFTER this event ended (PRIME_END),
   so the VAs go back to normal without anyone touching it; Jack's own switch goes off once (PRIME_OFF_KEY). Next event: Jack presses
   ★ Prime event and it is on again for everyone, exactly as before. */
const PRIME_END='2026-10-07T21:30:00.000Z',PRIME_OFF_KEY='bdl-sourcing-prime-off-2026-10';
function primeEndOnce(){if(lsGet(PRIME_OFF_KEY,false))return;lsSet(PRIME_OFF_KEY,true);lsSet(PRIME_KEY,false);}
function primeEventOn(){if(typeof isJack==='function'&&isJack())return!!lsGet(PRIME_KEY,false);const v=lsGet(PRIME_EVENT_KEY,null);return!!(v&&v.on&&String(v.at||'')>PRIME_END);}
const PRIME_NOTE_SHORT='★ Prime: Keepa & SAS show normal price';
/* b240 (Jack, 3 Oct: "improve the notes and what is Prime exclusive too") */
const PRIME_WHAT='What is Prime exclusive? During a Prime event (Prime Big Deal Days, Prime Day) Amazon sells some products cheaper to Prime members only. We buy on Prime accounts, so we pay that price. It is on Amazon UK, Germany, France, Italy and Spain. Keepa keeps it in its own column ("New, Prime exclusive"): Keepa\'s main price, its Europe box and SAS all show the normal price, so a Prime deal looks worse there than it really is.';
const PRIME_NOTE_FULL='★ Prime deals are on (UK, Germany, France, Italy, Spain). Some Amazon prices right now are Prime exclusive — cheaper for Prime members only, and we buy on Prime accounts. Keepa\'s main price and SAS show the NORMAL price, so these leads look worse there than they are. A ★ lead is priced at the Prime price: trust its row. To see only those: Deal → ★ Prime exclusive; Buy from → tick a country.';
function primeNoteChip(s){return primeEventOn()&&!(s&&s.status==='paused')?`<b class="pnchip" title="${PRIME_NOTE_FULL.replace(/"/g,'&quot;')}">${PRIME_NOTE_SHORT}</b>`:'';}
/* b216 (Jack, 1 Oct: "tell the VAs Keepa and SAS prices are wrong — the EU or UK price is Prime exclusive and not showing on SAS and
   Keepa — tell them on the notes"). Keepa's "Europe £" box and SAS's European Marketplaces panel show Amazon's NORMAL price (£58.77 on the
   Galaxy Buds), never the Prime one (£39). Every Prime lead says so on its row — for everyone, VAs included, live run or saved run
   (it is read from the lead's own "★ Prime price" line, which the saved leads keep). */
function primeNote(o){const d=String((o&&o['Discount applied'])||'');if(!/★ Prime price/.test(d))return'';
  const mk=o['Buy market']||'UK',site={UK:'Amazon.co.uk',DE:'Amazon.de',FR:'Amazon.fr',IT:'Amazon.it',ES:'Amazon.es'}[mk]||'Amazon';
  const m=/\(Amazon [A-Z]{2} £([\d.,]+)\)/.exec(d),was=m?'£'+m[1]:(+o['Buy at £']>0?'£'+(+o['Buy at £']).toFixed(2):'');
  const buy=+(o['Landed £']!=null&&o['Buy market']?o['Landed £']:o['After discount £'])||0;
  const wasN=m?+String(m[1]).replace(/,/g,''):(+o['Buy at £']||0),save=wasN&&buy&&wasN>buy?wasN-buy:0;
  /* b247: short enough for the Flags column — the long explanation is the tooltip */
  return`<span class="primenote" title="${escapeHtml(PRIME_WHAT)}">★ <b>Prime £${buy?buy.toFixed(2):''} on ${site}</b>${was?` (normal ${was}${save?`, £${save.toFixed(2)} less`:''})`:''}. <b>Keepa &amp; SAS show the normal price</b> — trust this row.</span>`;}
/* a file dropped while the switch is on: returns true when this module took it (placed in a Prime box, or refused / ignored with a note) */
function primeTake(file,d,f,notes){if(!primeOn()||!cur||/productviewer/i.test(file.name)||(typeof isListed==='function'&&isListed(cur))||!primeIsFile(d.rows))return false;   /* b249: never on a list run (Replen) */
  const mk=d.domain||'UK';
  if(!PRIME_MK.includes(mk)){notes.push(`${file.name}: a ${mk} ★ Prime deals file — ignored. Prime deals are not bought on that Amazon.`);return true;}
  if(cur.rule!==1&&mk!=='UK'){notes.push(`${file.name}: a ${mk} Prime file — Rule ${cur.rule} is UK only.`);return true;}
  /* b270 (found in the Italy / Spain audit): a UK-only brand run has only a UK ★ box — another country's ★ file was taken in silently (no box,
     no ✕) and priced EU buys this filter never asks for. Now it is turned away like on a Rule 2 filter. */
  if(cur.rule===1&&typeof ukOnly==='function'&&ukOnly()&&mk!=='UK'){notes.push(`${file.name}: a ${mk} Prime file — ${cur.name} is UK only, it takes the UK ★ file.`);return true;}
  const key=mk+'|p';
  if(!primeHasCol(d.rows)){pcell[key]={state:'bad',name:file.name,why:'no Prime price column'};
    notes.push(`${file.name}: a ★ Prime deals file without the Prime price. In Keepa press Configure Columns and tick New, Prime exclusive → Current, export again, drop the new file.`);return 'cols';}
  /* b227 (Jack, 1 Oct: "I might add multiple files — a bunch of brands and a bunch of countries"): a second ★ Prime file for the same
     country of mostly NEW products joins the first (Brother Prime + Samsung Prime); a re-export of the same list still replaces it. */
  pfiles[mk]=(typeof partMerge==='function'&&pfiles[mk])?partMerge(pfiles[mk],f,notes):f;delete pcell[key];return true;}
function primeRefused(file,d){if(!primeOn()||!cur||!d)return;const vw=/productviewer/i.test(file.name);
  const key=vw?'viewer':(d.domain||'UK')+'|'+(primeIsFile(d.rows)?'p':'n');pcell[key]={state:'bad',name:file.name,why:'Keepa columns not ticked'};}
function primeAccepted(file,d){if(!cur||!d)return;const vw=/productviewer/i.test(file.name);delete pcell[vw?'viewer':(d.domain||'UK')+'|n'];}
document.addEventListener('click',e=>{
  const t=e.target.closest('#primeTog');if(t){e.preventDefault();primeToggle();return;}
  const a=e.target.closest('#primeGrid a[data-pkey]');if(a){const k=a.dataset.pkey;const [m,kind]=k.split('|');if(!(kind==='p'?pfiles[m]:primeNormal(m)))pcell[k]={state:'keepa'};setTimeout(paintPrime,0);return;}
  const v=e.target.closest('#primeGrid [data-pview]');if(v){e.preventDefault();pcell.viewer={state:'keepa'};const b=$('#asinOpen');if(b)b.click();paintPrime();return;}
  const x=e.target.closest('#primeGrid [data-prm]');if(x){e.preventDefault();const k=x.dataset.prm;primeStrip();
    if(k==='viewer')files.viewer=null;else{const [m,kind]=k.split('|');if(kind==='p')pfiles[m]=null;else{const s=primeSlot(m);if(s)files[s]=null;}}
    delete pcell[k];primeApply();paintSlots();run();toast('Removed');}});

/* b219 (Jack, 1 Oct: "remember we either buy on Prime price or Amazon price — some might be on offer but not a Prime offer"). Every lead says
   how it is bought — and keeps it (state.bt), so every verdict and click carries it into the "what's working" table:
     prime  = the Prime exclusive price (cheaper than Amazon's own, after any S&S / coupon the export shows)
     offer  = Amazon's own price, but Amazon has it on offer: a deal badge, or 9%+ under its 90-day average — not a Prime deal
     amazon = Amazon's normal price (an S&S, coupon or Buy Box find) */
const BUY_TYPE_LABEL={prime:'★ Prime price',offer:'Amazon offer',amazon:'Amazon price',untagged:'not tagged (before b219)'};
function buyTypeOf(o,row){if(o&&(o['Prime deal']==='yes'||/★ Prime price/.test(o['Discount applied']||'')))return'prime';
  /* b260: the "On offer" chip says "a coupon, Subscribe & Save or a deal badge" — coupon and S&S leads were landing under "Normal price" (Suz's coupon filter) */
  if(o&&/coupon|S&S|business/i.test(o['Discount applied']||''))return'offer';
  if(row){const badge=String(row['Deals: Badge']||row['Deals: Deal Type']||'').trim();const d90=kNum(row['Amazon: 90 days drop %']);if(badge||(d90!=null&&d90>=9))return'offer';return'amazon';}
  if(o&&(String(o['LTD badge']||'').trim()||+o['Amazon 90d drop %']>=9))return'offer';return'amazon';}
/* the buy market's own row: UK = the UK Finder / one export / Viewer, EU = that country's file */
function stampBuyTypes(out){if(!out||!out.length)return;const maps={};
  const mapOf=k=>{if(k in maps)return maps[k];const f=files[k];if(!f||!f.rows)return maps[k]=null;const m=new Map();f.rows.forEach(r=>{const a=(r.ASIN||'').trim();if(a&&!m.has(a))m.set(a,r);});return maps[k]=m;};
  const get=(k,a)=>{const m=mapOf(k);return m?m.get(a)||null:null;};
  out.forEach(o=>{const a=o.ASIN,mk=o['Buy market']||'UK';const row=mk==='UK'?(get('one',a)||get('UK',a)||get('viewer',a)):get(mk,a);o.BuyType=buyTypeOf(o,row);});}
