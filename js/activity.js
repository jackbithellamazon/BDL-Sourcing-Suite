/* BDL Sourcing — VA activity (b204).
   Jack, 29 Sep 2026: "start recording that — I wanna know what each VA clicks and doesn't; if they click Open in Keepa I presume they are
   working it now". Every button or link a VA presses is kept — when, where, what — one row per person per day in src_settings
   (act:<Name>:<day>), the same way the Keepa console keeps its day rows. Jack's own clicks are not recorded.
   A press of an "Open in Keepa" / Viewer button is also stamped on the source itself (s.keepa, last 30), so the Brands list can show
   the row blue — "In Keepa 10:58 · Mera · 🇬🇧" — until an export comes back. Jack reads it all on Brands / Filters → VA activity. */
const ACT_KEY='bdl-sourcing-activity',ACT_DAYS=3,ACT_CAP=1200;   /* the cloud keeps every day; this browser only the last 3 */
let actDirty=new Set(),actT=null;
function actAll(){return lsGet(ACT_KEY,{})||{};}
function actOn(){const m=typeof me==='function'?me():'';return!!m&&m!=='Jack'&&!(typeof guestOn==='function'&&guestOn());}
function actLog(k,d,src){if(!actOn())return;const who=me(),day=today(),key=who+'|'+day,all=actAll();
  const r=all[key]||(all[key]={who,day,ev:[]});
  r.ev.push({t:nowIso(),k,s:src!==undefined?src:(typeof cur!=='undefined'&&cur?cur.key:''),d:String(d||'').slice(0,90)});
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
  const mk=el.closest('#keepaRow a');
  if(mk){const m=!mk.dataset.mk||mk.dataset.mk==='viewer'?'UK':mk.dataset.mk;actLog('keepa','Open in Keepa · '+m+(mk.dataset.mk==='viewer'?' (Viewer)':''),src);actStampKeepa(src,m);return;}
  if(el.closest('#asinOpen')){actLog('keepa','Open UK Product Viewer (merged ASINs)',src);actStampKeepa(src,'UK Viewer');return;}
  if(el.closest('.pagebtn')){const pb=el.closest('.pagebtn');actLog('page','Page · '+(ACT_PAGES[pb.dataset.page]||'Lead tools'),'');return;}
  const lab=actLabel(el);
  if(/^(Y|N|M)$/.test(lab)&&asin){actLog('verdict',lab+' · '+asin,src);return;}
  if(asin&&/keepa|sas|buy uk|sell uk|amazon/i.test(lab)){actLog('lead',lab+' · '+asin,src);return;}
  if(el.closest('tr[data-key]')&&!src){const k=el.closest('tr[data-key]').dataset.key;actLog('list',lab+' · '+((typeof srcGet==='function'&&srcGet(k)||{}).name||k),k);return;}
  actLog('click',(actPage()?actPage()+' · ':'')+lab,src);},true);
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
document.addEventListener('click',e=>{if(typeof actOn==='function'&&actOn())return;const mk=e.target.closest('#keepaRow a,#asinOpen');if(!mk)return;
  const m=mk.id==='asinOpen'?'viewer':(!mk.dataset.mk||mk.dataset.mk==='viewer'?'viewer':mk.dataset.mk);awaitDrop={slot:m,at:Date.now()};},true);

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
