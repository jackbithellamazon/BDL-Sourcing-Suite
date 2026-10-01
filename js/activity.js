/* BDL Sourcing — VA activity (b204).
   Jack, 29 Sep 2026: "start recording that — I wanna know what each VA clicks and doesn't; if they click Open in Keepa I presume they are
   working it now". Every button or link a VA presses is kept — when, where, what — one row per person per day in src_settings
   (act:<Name>:<day>), the same way the Keepa console keeps its day rows. Jack's own clicks are not recorded.
   A press of an "Open in Keepa" / Viewer button is also stamped on the source itself (s.keepa, last 30), so the Brands list can show
   the row blue — "In Keepa 10:58 · Mera · 🇬🇧" — until an export comes back. Jack reads it all on Brands / Filters → VA activity. */
const ACT_KEY='bdl-sourcing-activity',ACT_DAYS=3,ACT_CAP=3000;   /* b219: 1,200 → 3,000 a day — it lives in the big store (IndexedDB), not the shared 5 MB pot */   /* the cloud keeps every day; this browser only the last 3 */
let actDirty=new Set(),actT=null;
function actAll(){return lsGet(ACT_KEY,{})||{};}
function actOn(){const m=typeof me==='function'?me():'';return!!m&&m!=='Jack'&&!(typeof guestOn==='function'&&guestOn());}
function actLog(k,d,src,x){if(!actOn())return;const who=me(),day=today(),key=who+'|'+day,all=actAll();
  const r=all[key]||(all[key]={who,day,ev:[]});
  const e={t:nowIso(),k,s:src!==undefined?src:(typeof cur!=='undefined'&&cur?cur.key:''),d:String(d||'').slice(0,90)};if(x)e.x=x;r.ev.push(e);   /* b219: x = the facts behind the click */
  if(r.ev.length>ACT_CAP)r.ev=r.ev.slice(-ACT_CAP);r.updatedAt=nowIso();
  const cut=new Date(Date.now()-ACT_DAYS*864e5).toISOString().slice(0,10);Object.keys(all).forEach(x=>{if(all[x].day<cut)delete all[x];});
  lsSet(ACT_KEY,all);actDirty.add(key);clearTimeout(actT);actT=setTimeout(actFlush,4000);}
function actFlush(){clearTimeout(actT);if(!actDirty.size)return;const all=actAll();
  const rows=[...actDirty].map(k=>all[k]).filter(Boolean).map(r=>settingRow('act:'+r.who+':'+r.day,r));actDirty.clear();
  if(rows.length&&typeof cloudQueue==='function')cloudQueue('src_settings','upsert',rows);}
window.addEventListener('pagehide',actFlush);
document.addEventListener('visibilitychange',()=>{if(!actOn())return;if(document.hidden){actLog('away','left the Sourcing tab');actFlush();}else actLog('back','came back to the Sourcing tab');});
/* what page they are on */
const ACT_PAGES={'page-brands':'Brands','page-keepa':'Keepa console','page-audit':'Audits','page-settings':'Settings'};
function actPage(){const p=[...document.querySelectorAll('.page')].find(x=>x.offsetParent!==null);return p?(ACT_PAGES[p.id]||'Lead tools'):'';}
function actLabel(el){const txt=(el.querySelector&&el.querySelector('h3,b.t,.gt,.lab'))?el.querySelector('h3,b.t,.gt,.lab').textContent:el.textContent;
  const t=el.getAttribute('aria-label')||txt.replace(/\s+/g,' ').trim()||el.title||el.id||el.dataset.act||el.tagName;return String(t).slice(0,60);}
/* one listener for every click — capture phase, so nothing that stops the event hides it */
document.addEventListener('click',e=>{if(!actOn())return;const el=e.target.closest('a,button,[role="button"],.pagebtn,label.chk,summary');if(!el)return;
  const src=typeof cur!=='undefined'&&cur&&!($('#viewRun')||{}).hidden?cur.key:'';
  const row=el.closest('tr[data-asin],tr[data-key],[data-asin]');const asin=row&&row.dataset.asin?row.dataset.asin:'';
  /* b218: the Prime box grid's buttons are Open in Keepa too (the Viewer one clicks #asinOpen, which logs itself below) */
  const pg=el.closest('#primeGrid a[data-pkey]');if(pg){const [m,kind]=pg.dataset.pkey.split('|');const lab=m+(kind==='p'?' ★ Prime':'');actLog('keepa','Open in Keepa · '+lab,src,{box:pg.dataset.pkey});actStampKeepa(src,lab);return;}
  if(el.closest('#primeGrid [data-pview]'))return;
  const mk=el.closest('#keepaRow a');
  if(mk){const m=!mk.dataset.mk||mk.dataset.mk==='viewer'?'UK':mk.dataset.mk;actLog('keepa','Open in Keepa · '+m+(mk.dataset.mk==='viewer'?' (Viewer)':''),src);actStampKeepa(src,m);return;}
  if(el.closest('#asinOpen')){actLog('keepa','Open UK Product Viewer (merged ASINs)',src);actStampKeepa(src,'UK Viewer');return;}
  if(el.closest('.pagebtn')){const pb=el.closest('.pagebtn');actLog('page','Page · '+(ACT_PAGES[pb.dataset.page]||'Lead tools'),'');return;}
  const lab=actLabel(el);
  if(el.closest('#openSel'))return;   /* b219: Open all in Keepa logs itself, with every ASIN it opened */
  if(/^(Y|N|M)$/.test(lab)&&asin){actLog('verdict',lab+' · '+asin,src,actLead(asin));return;}
  if(asin&&/keepa|sas|buy [a-z]{2}\b|sell uk|amazon/i.test(lab)){actLog('lead',lab+' · '+asin,src,actLead(asin));return;}
  if(el.closest('tr[data-key]')&&!src){const k=el.closest('tr[data-key]').dataset.key;actLog('list',lab+' · '+((typeof srcGet==='function'&&srcGet(k)||{}).name||k),k);return;}
  actLog('click',(actPage()?actPage()+' · ':'')+lab,src);},true);
/* b219: the facts behind a lead click — how it is bought, score, ROI, profit, rule, market */
function actLead(asin){const o=typeof result!=='undefined'&&result&&result.out?result.out.find(z=>z.ASIN===asin):null;if(!o)return{a:asin};
  const n=v=>v==null||v===''?null:Math.round(+v*100)/100;
  return{a:asin,bt:o.BuyType||(o.state&&o.state.bt)||'',sc:o.Score||0,roi:n(o['ROI %']),p:n(o['Profit £']),buy:n(o['Landed £']??o['After discount £']),sell:n(o['Sell £ used']??o['Sell for £']),rl:typeof cur!=='undefined'&&cur?cur.rule:null,mk:o['Buy market']||'UK'};}
/* the source remembers the Keepa press, so the list can say "in Keepa" */
/* b207 (Jack, 29 Sep: "tell her she needs to drag it back in"). After any Open in Keepa / Viewer press, the moment she comes back to the
   Sourcing tab the drop box shouts: "Back from Keepa? Drag the file you exported in here", glowing, scrolled into view. For everyone. */
let awaitDrop=null;
/* b213 (Jack, 30 Sep recording: "still so jumpy"): the nudge no longer scrolls the page or pushes anything down — every return from Keepa
   was yanking the page to the drop box, and the banner appearing/vanishing shifted everything by a row. Now the drop box itself changes
   its words and glows, in place. */
function dropNudge(){const box=$('#dropAny');if(!box||!awaitDrop||($('#viewRun')||{}).hidden)return;
  if(typeof files!=='undefined'&&awaitDrop.slot&&files[awaitDrop.slot]){awaitDrop=null;return;}
  const big=box.querySelector('.big'),small=box.querySelector('.small');
  if(big&&!big.dataset.orig){big.dataset.orig=big.innerHTML;if(small)small.dataset.orig=small.innerHTML;}
  if(big)big.innerHTML='Back from Keepa? <b>Drag the file you exported in here</b>';
  if(small)small.innerHTML='Export → All active columns → CSV · nothing is saved until you drop it';
  box.classList.add('gohot','dropwait');}
function dropNudgeOff(){awaitDrop=null;const box=$('#dropAny');if(!box)return;box.classList.remove('dropwait');
  const big=box.querySelector('.big'),small=box.querySelector('.small');
  if(big&&big.dataset.orig){big.innerHTML=big.dataset.orig;delete big.dataset.orig;}if(small&&small.dataset.orig){small.innerHTML=small.dataset.orig;delete small.dataset.orig;}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&awaitDrop)setTimeout(dropNudge,250);});
window.addEventListener('focus',()=>{if(awaitDrop&&Date.now()-awaitDrop.at>1500)setTimeout(dropNudge,250);});   /* back from another window, not just another tab */
function actStampKeepa(key,m){awaitDrop={slot:m==='UK Viewer'||m==='UK'?'viewer':m,at:Date.now()};if(!key||typeof srcGet!=='function')return;const s=(typeof cur!=='undefined'&&cur&&cur.key===key)?cur:srcGet(key);if(!s)return;   /* the open run's own object, or leaving the run re-saves a copy without the stamp */
  s.keepa=[{who:me(),at:nowIso(),mk:m}].concat((s.keepa||[]).filter(o=>o&&o.at)).slice(0,30);srcSave(s);}
/* the newest Keepa press that no run has caught up with */
function keepaSinceRun(s){const o=(s&&s.keepa||[])[0];if(!o)return null;const last=runLast(s.key);return(!last||new Date(o.at)>new Date(last.at))?o:null;}

/* ---------- Jack's page: Brands / Filters → VA activity ---------- */
const actView={day:null,rows:null,loading:false};
async function actPull(day){if(typeof cloudReadable==='function'&&cloudReadable()){try{const rows=await cloudGetAll('src_settings','select=key,value&key=like.'+encodeURIComponent('act:')+'*'+encodeURIComponent(':'+day));return rows.map(r=>r.value).filter(v=>v&&v.who);}catch(e){}}
  return Object.values(actAll()).filter(r=>r.day===day);}
function actTime(iso){return new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
async function renderActivity(){const el=$('#actBody');if(!el)return;if(!isJack()){el.innerHTML='<div class="empty">Only Jack sees this.</div>';return;}
  renderWork();   /* b219 */
  const day=actView.day||today();actView.day=day;const dp=$('#actDay');if(dp&&dp.value!==day)dp.value=day;
  el.innerHTML='<div class="empty">Loading…</div>';const rows=await actPull(day);if(actView.day!==day)return;
  const vas=['Suz','Mera'].concat(rows.map(r=>r.who).filter(w=>w!=='Suz'&&w!=='Mera'));
  const srcName=k=>{const s=k&&srcGet(k);return s?s.name:(k||'');};
  const runsDay=runsAll().filter(r=>(r.day||String(r.at).slice(0,10))===day);
  el.innerHTML=`<div class="actgrid">${[...new Set(vas)].map(who=>{const r=rows.find(x=>x.who===who);const ev=(r&&r.ev||[]).slice().sort((a,b)=>a.t<b.t?-1:1);
    const c=k=>ev.filter(e=>e.k===k).length;const opened=[...new Set(ev.filter(e=>e.k==='click'&&/Run|Join|Start|Next due/i.test(e.d)||e.k==='list').map(e=>e.s).filter(Boolean))];
    const inKeepa=[...new Set(ev.filter(e=>e.k==='keepa').map(e=>e.s).filter(Boolean))];
    const ran=runsDay.filter(x=>x.who===who);
    const mine=srcAll().filter(s=>s.status!=='paused'&&(s.owner===who||s.owner==='VAs')&&!isListed(s));
    const due=mine.filter(s=>dueState(s).due||ran.some(x=>(x.source||x.source_key)===s.key));
    const untouched=due.filter(s=>!inKeepa.includes(s.key)&&!ran.some(x=>(x.source||x.source_key)===s.key)&&!ev.some(e=>e.s===s.key));
    const kd={keepa:'🔵',verdict:'✅',lead:'🔗',page:'📄',list:'📋',away:'💤',back:'↩️',drop:'📥',click:'·'};
    return`<div class="actva"><div class="acthead">${whoChip(who)}${ev.length?`<span>first ${actTime(ev[0].t)} · last ${actTime(ev[ev.length-1].t)} · ${ev.length} clicks</span>`:'<span class="dim">no clicks recorded</span>'}</div>
      <div class="actsum"><div><b>${inKeepa.length}</b><span>filters opened in Keepa</span></div><div><b>${c('drop')}</b><span>exports dropped</span></div><div><b>${ran.length}</b><span>runs saved</span></div><div><b>${c('verdict')}</b><span>Y / N / M</span></div><div><b>${c('lead')}</b><span>lead links opened</span></div></div>
      ${inKeepa.length?`<div class="actline"><b>In Keepa:</b> ${inKeepa.map(k=>escapeHtml(srcName(k))).join(' · ')}</div>`:''}
      ${untouched.length?`<div class="actline bad"><b>Due, not touched:</b> ${untouched.map(s=>escapeHtml(s.name)).join(' · ')}</div>`:''}
      <details class="actlog"${ev.length&&ev.length<=40?' open':''}><summary>Every click (${ev.length})</summary><ol>${ev.slice().reverse().map(e=>`<li class="k-${e.k}"><time>${actTime(e.t)}</time><span class="ki">${kd[e.k]||'·'}</span><span>${escapeHtml(e.d)}${e.s&&e.k!=='list'?` <i>· ${escapeHtml(srcName(e.s))}</i>`:''}</span></li>`).join('')}</ol></details></div>`;}).join('')}</div>
    <p class="actnote">Recorded from b204 on, VAs only. 🔵 = pressed an Open in Keepa / Viewer button (the row goes blue on the list) · 📥 = dropped a file · ✅ = Y / N / M · 🔗 = opened a lead in Keepa / SAS / Amazon · 💤 = left the tab.</p>`;}
document.addEventListener('DOMContentLoaded',()=>{const dp=$('#actDay');if(dp)dp.addEventListener('change',()=>{actView.day=dp.value||today();renderActivity();});
  const rf=$('#actRefresh');if(rf)rf.addEventListener('click',()=>renderActivity());
  const t=$('#actToday');if(t)t.addEventListener('click',()=>{actView.day=today();renderActivity();});});

/* the nudge is for everyone (Jack too); the recording above stays VA-only */
document.addEventListener('click',e=>{if(typeof actOn==='function'&&actOn())return;const mk=e.target.closest('#keepaRow a,#asinOpen,#primeGrid a[data-pkey]');if(!mk)return;
  const m=mk.id==='asinOpen'?'viewer':mk.dataset.pkey?mk.dataset.pkey.split('|')[0]:(!mk.dataset.mk||mk.dataset.mk==='viewer'?'viewer':mk.dataset.mk);awaitDrop={slot:m,at:Date.now()};},true);

/* ---------- b208: the lead sheet teaches Sourcing ----------
   Jack, 29 Sep: "yes" to — any ASIN a VA puts on the lead sheet (AVM HQ's `leads` table, read only) that came up on a Sourcing run in the
   week before becomes a Yes on that run, under HER name, so each filter can show "★ 3 leads this week". Runs in Jack's browser only (one
   writer; VAs never see each other's work), at most every 30 minutes, last 14 days of the sheet. A real Yes / No / Maybe is never touched —
   only an empty verdict or a Seen is upgraded. */
const LSM_KEY='bdl-sourcing-leadsheet-at';
/* b210 (Jack, 29 Sep: "I don't wanna see leads by whether they're on a sheet or not"): the sheet no longer writes verdicts (they hid and sank
   leads). It only keeps a marker — ASIN → which run, who, when — for the "★ leads this week" count. Any verdict b208 wrote ("lead sheet") is removed. */
const SHEET_KEY='bdl-sourcing-sheetmatch';
async function leadSheetMatch(force){if(!isJack()||typeof cloudReadable!=='function'||!cloudReadable())return 0;
  {const V=verdAll();const bad=Object.keys(V).filter(a=>V[a]&&V[a].note==='lead sheet');if(bad.length&&typeof verdDelMany==='function')verdDelMany(bad);}
  const last=+lsGet(LSM_KEY,0)||0;if(!force&&Date.now()-last<30*60e3)return 0;lsSet(LSM_KEY,Date.now());
  let rows;const since=new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  try{rows=await cloudGetAll('leads','select=asin,va,date,created_at,superseded&date=gte.'+since);}catch(e){return 0;}
  const LA=leadAll(),M={};let n=0;
  rows.forEach(l=>{const asin=(l.asin||'').trim();if(!/^B[0-9A-Z]{9}$/.test(asin)||l.superseded||!l.va)return;
    const d=Date.parse(l.date||String(l.created_at).slice(0,10));if(!d)return;
    let best=null;Object.entries(LA).forEach(([src,m])=>{const e=m&&m[asin];if(!e||!e.stamp)return;const t=Date.parse(String(e.stamp).slice(0,10));
      if(t&&t<=d+864e5&&d-t<=7*864e5&&(!best||t>best.t))best={src,t};});
    if(best){M[asin]={src:best.src,who:l.va,at:l.created_at||nowIso()};n++;}});
  lsSet(SHEET_KEY,M);if(typeof renderList==='function'&&!($('#viewList')||{}).hidden)renderList();return n;}
function sheetMark(asin){return(lsGet(SHEET_KEY,{})||{})[asin]||null;}
/* Yes verdicts on a source in the last 7 days — the row's "★ 3 leads this week" */
/* b211 (Jack: "fuck is this" at "★ 2 leads this week"): the badge says what it is — how many of this filter's products went on the lead sheet
   (or got a Yes) in the last 7 days, and by whom */
function weekLeads(key){const V=verdAll(),M=lsGet(SHEET_KEY,{})||{},cut=Date.now()-7*864e5;const set=new Set(),who=new Set();
  for(const a in V){const v=V[a];if(v&&v.v==='Yes'&&v.note!=='lead sheet'&&v.source===key&&Date.parse(v.at)>=cut){set.add(a);if(v.who)who.add(v.who);}}
  for(const a in M){const m=M[a];if(m&&m.src===key&&Date.parse(m.at)>=cut){set.add(a);if(m.who)who.add(m.who);}}return{n:set.size,who:[...who],asins:[...set]};}
function yesThisWeek(key){return weekLeads(key).n;}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{leadSheetMatch().catch(()=>{});},9000);});

/* ---------- b219: what's working ----------
   Jack, 1 Oct 2026: "make sure we can get 100s of data from their clicks — knowing what is working and what is not — remember we either buy
   on Prime price or Amazon price, some might be on offer but not a Prime offer". One table over the last 7 or 30 days, built only from what
   is already saved: the runs (which leads were shown), the VAs' clicks (which leads they opened), Y / N / M, and the lead sheet (which went
   on it). Split by how the lead is bought, and by filter. Hit = a Yes or the lead sheet. Clicks before b219 count by the ASIN in their text;
   leads shown before b219 have no buy type and sit on their own row. */
const WORK={span:7};
async function actPullRange(since){if(typeof cloudReadable==='function'&&cloudReadable()){try{
    const rows=await cloudGetAll('src_settings','select=key,value&key=like.'+encodeURIComponent('act:')+'*&updated_at=gte.'+encodeURIComponent(since+'T00:00:00Z'));
    return rows.map(r=>r.value).filter(v=>v&&v.who&&v.day>=since);}catch(e){}}
  return Object.values(actAll()).filter(r=>r&&r.day>=since);}
function workSummary(D){const T={},S={},srcOf={};
  const btOf=(src,a)=>{const v=D.verds[a];if(v&&v.state&&v.state.bt)return v.state.bt;const e=D.leads[src]&&D.leads[src][a];return(e&&e.state&&e.state.bt)||'untagged';};
  const add=(o,k,f,a)=>{const r=o[k]||(o[k]={shown:new Set(),opened:new Set(),Yes:new Set(),Maybe:new Set(),No:new Set(),sheet:new Set(),hit:new Set()});r[f].add(a);if(f==='Yes'||f==='sheet')r.hit.add(a);};
  (D.runs||[]).filter(r=>(r.day||String(r.at).slice(0,10))>=D.since).forEach(r=>(r.asins||[]).forEach(a=>{const s=r.source;if(!srcOf[a])srcOf[a]=s;add(T,btOf(s,a),'shown',a);add(S,s,'shown',a);}));
  const opened=new Set();(D.acts||[]).forEach(r=>(r.ev||[]).forEach(e=>{if(e.x&&e.x.a)opened.add(e.x.a);if(e.x&&e.x.as)e.x.as.forEach(a=>opened.add(a));
    if(!e.x&&(e.k==='lead'||e.k==='verdict')){const m=/B[0-9A-Z]{9}/.exec(e.d||'');if(m)opened.add(m[0]);}}));
  opened.forEach(a=>{const s=srcOf[a];if(!s)return;add(T,btOf(s,a),'opened',a);add(S,s,'opened',a);});
  Object.entries(D.verds||{}).forEach(([a,v])=>{if(!v||!v.at||String(v.at).slice(0,10)<D.since||!['Yes','Maybe','No'].includes(v.v))return;const s=v.source||srcOf[a]||'';
    add(T,(v.state&&v.state.bt)||btOf(s,a),v.v,a);if(s)add(S,s,v.v,a);});
  Object.entries(D.sheet||{}).forEach(([a,m])=>{if(!m||!m.at||String(m.at).slice(0,10)<D.since)return;const s=m.src||srcOf[a]||'';add(T,btOf(s,a),'sheet',a);if(s)add(S,s,'sheet',a);});
  const flat=o=>Object.fromEntries(Object.entries(o).map(([k,r])=>[k,Object.fromEntries(Object.entries(r).map(([f,set])=>[f,set.size]))]));
  return{byType:flat(T),bySrc:flat(S)};}
async function renderWork(){const el=$('#workBox');if(!el)return;if(!isJack()){el.innerHTML='';return;}
  const span=WORK.span,since=new Date(Date.now()-(span-1)*864e5).toISOString().slice(0,10);
  el.innerHTML='<div class="empty">Working out what is working…</div>';const acts=await actPullRange(since);if(WORK.span!==span)return;
  const W=workSummary({since,runs:runsAll(),verds:verdAll(),acts,sheet:lsGet(SHEET_KEY,{})||{},leads:leadAll()});
  const pct=(a,b)=>b?Math.round(100*a/b)+'%':'—';
  const row=(lab,r,cls)=>{r=r||{};return`<tr class="${cls||''}"><td>${lab}</td><td class="r">${r.shown||0}</td><td class="r">${r.opened||0} <small>${pct(r.opened||0,r.shown||0)}</small></td><td class="r">${r.Yes||0}</td><td class="r">${r.Maybe||0}</td><td class="r">${r.No||0}</td><td class="r">${r.sheet||0}</td><td class="r"><b>${pct(r.hit||0,r.shown||0)}</b></td></tr>`;};
  const head=`<thead><tr><th></th><th class="r">Leads shown</th><th class="r">Opened by a VA</th><th class="r">Yes</th><th class="r">Maybe</th><th class="r">No</th><th class="r">Lead sheet</th><th class="r" title="A Yes or the lead sheet, out of the leads shown">Hit rate</th></tr></thead>`;
  const types=['prime','offer','amazon','untagged'].filter(k=>W.byType[k]);
  const srcs=Object.entries(W.bySrc).filter(([k])=>k).sort((a,b)=>(b[1].hit||0)-(a[1].hit||0)||(b[1].shown||0)-(a[1].shown||0)).slice(0,15);
  const nm=k=>{const s=srcGet(k);return escapeHtml(s?s.name:k);};
  el.innerHTML=`<div class="workhead"><b>What's working</b><span>last <button type="button" class="wspan${span===7?' on':''}" data-span="7">7 days</button><button type="button" class="wspan${span===30?' on':''}" data-span="30">30 days</button> · from the runs, the VAs' clicks, Y / N / M and the lead sheet</span></div>
    <div class="worktbls"><div><h4>By how it's bought</h4><table class="worktbl">${head}<tbody>${types.length?types.map(k=>row(escapeHtml(BUY_TYPE_LABEL[k]||k),W.byType[k],'bt-'+k)).join(''):'<tr><td colspan="8" class="dim">Nothing yet in this window.</td></tr>'}</tbody></table></div>
    <div><h4>By filter</h4><table class="worktbl">${head}<tbody>${srcs.length?srcs.map(([k,r])=>row(nm(k),r)).join(''):'<tr><td colspan="8" class="dim">Nothing yet in this window.</td></tr>'}</tbody></table></div></div>`;}
document.addEventListener('click',e=>{const b=e.target.closest('#workBox [data-span]');if(!b)return;WORK.span=+b.dataset.span||7;renderWork();});
