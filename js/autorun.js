/* BDL Sourcing — AUTOMATED FILTERS (b330, 10 Nov 2026; the parked b325 overnight pulls, now run by the keepa Worker).
   Keepa Discord chat + Jack, 10 Nov ("automated filters final decisions"): the keepa Worker pulls the filters Jack switches to
   Automated, Sunday night → Thursday night from 00:05 UK, drip-fed at the refill rate, never below 1,000 tokens. Per product:
   a 1-token look every night (stats=90&history=1), the cut in autocut.js, then a full answer (offers=20, no rating) for the
   survivors at most every 3 days. Its progress is one src_autopull row per filter per night; products go into keepa_cache.
   The Suite's half:
     · data.auto on the filter (Jack only) — the search, ready-made by the Suite's own apiSelection(), so the Worker never
       translates a link; re-saved by itself when the link changes (linkSig), or the Worker refuses it as 'stale'
     · Filter check: an Automated list (last night per filter) and the Manual list as before
     · the run screen: "Last night's list is ready" FIRST — built from keepa_cache + src_autopull at 0 tokens, for the VAs too.
       Everything after it is the same run (open every lead in Keepa, ✓ Done). No usable pull → "export as usual".
   Not automated (decided): Business UK (the Business % is not in Keepa's API answer), Prime-event filters, brand lists. */
const AUTO={TABLE:'src_autopull',MAX_H:20,CACHE_MS:120e3,cache:{},allAt:0,busy:false};
/* "live" counts that only a full answer carries; they choose Rule 2's sell shape (8+ FBA sellers = big pack), so on a 1-token
   night they come from the full answer under 3 days old, like the averages (Jack: "the sell price moves a few days apart") */
const AUTO_CARRY=['Buy Box Eligible Offer Counts: New FBA','New FBM Offer Count: Current'];
function autoDec(l){try{return decodeURIComponent(String(l||''));}catch(e){return String(l||'');}}
/* '' = can be automated, else why not (shown on the Manual list) */
function autoWhyNot(s){if(!s)return'no filter';
  if(s.type!=='filter')return'brand lists (Rule 1) come later';
  if(s.rule!==2)return'Rule 2 filters only for now';
  if((s.markets||['UK']).join()!=='UK')return'UK filters only for now';
  if(s.drop||(typeof isListed==='function'&&isListed(s)))return'a list you drop in, not a Keepa search';
  if(!s.link)return'no saved Keepa link';
  if(/^prime/.test(s.key||'')||/prime deal/i.test(s.name||''))return'Prime-event filters stay manual';
  if(/businessDiscount/.test(autoDec(s.link)+autoDec(s.link2)))return"the Business % is not in Keepa's API answer — stays manual";
  const sels=typeof apiSelections==='function'?apiSelections(s):[];if(!sels.length||sels.some(x=>!x))return'its Keepa link cannot be read';
  return'';}
function autoEligible(s){return!autoWhyNot(s);}
function autoOn(s){return!!(s&&s.auto&&s.auto.on&&autoEligible(s));}
function autoHM(at){try{return new Date(at).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'});}catch(e){return String(at).slice(11,16);}}
/* data.auto, shape v1 (agreed with the Keepa Discord chat, 10 Nov) */
function autoNextRank(){return Math.max(0,...srcAll().filter(x=>x.auto&&x.auto.on&&typeof x.auto.rank==='number').map(x=>x.auto.rank))+1;}
function autoBuild(s,prev){const links=apiSelections(s).map((x,n)=>{const sel=Object.assign({},x.selection);delete sel.perPage;delete sel.page;
    return{n,domain:2,selection:sel,after:x.after,skipped:x.skipped};});
  return{v:1,on:true,market:'UK',links,linkSig:linkSig(s.link,s.link2),savedAt:nowIso(),savedBy:typeof me==='function'?me():'',
    rank:prev&&typeof prev.rank==='number'?prev.rank:autoNextRank(),readyBy:(prev&&prev.readyBy)||''};}
/* Jack only. On: build and save the search. Off (Manual): keep the search, so switching back needs nothing new. */
function autoSet(key,on){if(typeof isJack!=='function'||!isJack())return false;const s=srcGet(key);if(!s)return false;
  if(on){const w=autoWhyNot(s);if(w){if(typeof toast==='function')toast(`${s.name}: can't be automated — ${w}`,true);return false;}
    s.auto=autoBuild(s,s.auto||null);}
  else{if(!s.auto)return false;s.auto=Object.assign({},s.auto,{on:false,offAt:nowIso(),offBy:typeof me==='function'?me():''});}
  srcSave(s);delete AUTO.cache[key];AUTO.allAt=0;return true;}
/* the link changed (a seed, a migration, Jack's edit) since the search was saved — the Worker refuses it until it is re-saved */
function autoStale(s){return!!(s&&s.auto&&s.auto.on&&s.auto.linkSig!==linkSig(s.link,s.link2));}
function autoResave(){if(typeof isJack!=='function'||!isJack())return 0;let n=0;
  srcAll().forEach(s=>{if(autoStale(s)&&autoEligible(s)){s.auto=autoBuild(s,s.auto);srcSave(s);n++;}});return n;}
/* the newest night for one filter (with its product list) — a missing table is "no pull", never an error on screen */
async function autoLoad(key,force){const c=AUTO.cache[key];if(!force&&c&&c.full&&Date.now()-c.t<AUTO.CACHE_MS)return c.row;let row=null;
  try{if(typeof cloudReadable==='function'&&cloudReadable()){const r=await cloudGetAll(AUTO.TABLE,'select=*&source_key=eq.'+encodeURIComponent(key)+'&order=night.desc,updated_at.desc&limit=1');row=r&&r[0]||null;}}catch(e){row=null;}
  AUTO.cache[key]={t:Date.now(),row,full:true};return row;}
/* the newest night for every automated filter, without the product lists — for the Brands list and Filter check */
async function autoLoadAll(force){const keys=srcAll().filter(autoOn).map(s=>s.key);if(!keys.length)return false;
  if(!(typeof cloudReadable==='function'&&cloudReadable()))return false;   /* offline: keep what we have, never blank it */
  if(!force&&AUTO.allAt&&Date.now()-AUTO.allAt<AUTO.CACHE_MS)return false;AUTO.allAt=Date.now();
  let rows=[];try{if(typeof cloudReadable==='function'&&cloudReadable()){const since=new Date(Date.now()-9*864e5).toISOString().slice(0,10);
      rows=await cloudGetAll(AUTO.TABLE,'select=source_key,night,status,total,done_n,tokens,started_at,finished_at,updated_at,note&source_key=in.('+keys.map(encodeURIComponent).join(',')+')&night=gte.'+since+'&order=night.desc,updated_at.desc');}}catch(e){rows=[];}
  const t=Date.now();keys.forEach(k=>{const r=rows.find(x=>x.source_key===k)||null;const c=AUTO.cache[k];
    if(!(c&&c.full&&c.row&&r&&c.row.night===r.night&&c.row.updated_at===r.updated_at))AUTO.cache[k]={t,row:r,full:false};});
  return true;}
/* finished (or got part of the way) and under 20 hours old */
function autoFresh(p){return!!(p&&/^(done|partial|capped)$/.test(p.status||'')&&p.finished_at&&Date.now()-new Date(p.finished_at).getTime()<AUTO.MAX_H*3600e3);}
function autoAsins(p){const s=new Set();(p&&p.links||[]).forEach(l=>(l.asins||[]).forEach(a=>s.add(a)));return[...s];}
function autoCount(p){return p?(+p.total||autoAsins(p).length):0;}
/* the night's products, from the shared cache, as rows shaped like an export. Tonight's 1-token look carries Amazon's price, rank
   and monthly sold; the averages (and the FBA / FBM seller counts) come from the full answer under 3 days old. A product that
   survives the 1-token cut but has no full answer yet is NOT judged on half a row — it is counted and left out. */
async function autoRows(p,src){const L=(src&&src.auto&&src.auto.links)||apiSelections(src).map((x,n)=>({n,after:x&&x.after}));
  const afterOf=n=>{const l=L.find(x=>x.n===n)||L[n];return l?l.after:null;};
  const by=new Map();(p.links||[]).forEach((l,i)=>(l.asins||[]).forEach(a=>{if(!by.has(a))by.set(a,[]);by.get(a).push(l.n!=null?l.n:i);}));const asins=[...by.keys()];
  const off=await kcGet(2,asins,'offers',API_STABLE_H,true),st=await kcGet(2,asins,'stats',API_CACHE_H,true);
  const now=Date.now(),rows=[];let missing=0,excluded=0,notPriced=0;
  asins.forEach(a=>{const o=off[a],s=st[a];const base=s&&(!o||new Date(s.at)>new Date(o.at))?s:o;if(!base){missing++;return;}
    if(!by.get(a).some(n=>apiKeep(base.p,afterOf(n)))){excluded++;return;}
    if(!o&&autoCut(base.p,null,now).keep){notPriced++;return;}
    const row=apiRow(base.p,2);if(!row){missing++;return;}
    if(o&&base!==o){const held=apiRow(o.p,2)||{};API_FROM_CACHE.concat(AUTO_CARRY).forEach(c=>{if((row[c]==null||row[c]==='')&&held[c]!=null&&held[c]!=='')row[c]=held[c];});row.__avgAt=new Date(o.at).getTime();}
    rows.push(row);});
  return{rows,missing,excluded,notPriced,total:asins.length};}
/* the run screen — the FIRST thing a VA sees on an automated filter (AVM HQ: they download CSVs out of habit) */
function autoPaint(){const el=$('#autoPull');if(!el)return;if(typeof cur==='undefined'||!cur||!autoOn(cur)){el.hidden=true;el.innerHTML='';return;}el.hidden=false;
  const key=cur.key,c=AUTO.cache[key];
  if(!c||!c.full||Date.now()-c.t>AUTO.CACHE_MS){el.className='autopull wait';el.innerHTML='<span class="apmoon">🌙</span><div class="apt"><b class="apl">Checking for last night’s list…</b></div>';autoLoad(key).then(()=>{if(cur&&cur.key===key)autoPaint();});return;}
  const p=c.row;
  if(typeof files!=='undefined'&&files.one&&files.one.auto){el.className='autopull on';el.innerHTML=`<span class="apmoon">🌙</span><div class="apt"><b class="apl">Using last night’s list — no export today</b><span class="apx">${escapeHtml(files.one.name)} · 0 tokens · open every lead in Keepa as usual, then ✓ Done</span></div>`;return;}
  if(autoFresh(p)){const n=autoCount(p),part=p.status!=='done';el.className='autopull ok';
    el.innerHTML=`<span class="apmoon">🌙</span><div class="apt"><b class="apl">Last night’s list is ready — don’t export from Keepa</b><span class="apx">Keepa pulled this overnight · ${autoHM(p.finished_at)} UK · ${n.toLocaleString()} products · 0 tokens${part?` · <b>not all of it</b> (${p.status==='capped'?'the night’s token limit':'the night ran out'}) — export as well if you want the rest`:''}</span></div><button type="button" class="btn apuse" id="autoUse">Use last night’s list</button>`;return;}
  el.className='autopull none';el.innerHTML=`<span class="apmoon">🌙</span><div class="apt"><b class="apl">No overnight list for this filter today — export from Keepa as usual</b><span class="apx">${p?(p.status==='error'?'last night’s pull went wrong':p.status==='too-big'?'Keepa found too many products for the overnight limit':p.status==='stale'?'the filter’s Keepa link changed — Jack re-saves it':autoFresh(Object.assign({},p,{status:'done'}))?'last night’s pull is still running':'the last pull is too old (lists are pulled Sunday–Thursday nights)'):'nothing pulled for this filter yet'}</span></div>`;}
async function autoUse(){if(typeof cur==='undefined'||!cur||AUTO.busy)return;const src=cur,p=await autoLoad(src.key,true);
  if(!autoFresh(p)){toast('No overnight list for this filter today — export from Keepa as usual',true);autoPaint();return;}
  AUTO.busy=true;const b=$('#autoUse');if(b){b.disabled=true;b.textContent='Loading last night’s list…';}
  try{const R=await autoRows(p,src);
    if(!R.rows.length){toast(R.total?'The products are not in the shared Keepa cache — export from Keepa as usual':'Last night’s pull found nothing for this filter',true);return;}
    if(cur!==src)return;const nm=`Keepa overnight · ${autoHM(p.finished_at)} UK`;
    const f={name:nm,rows:R.rows,hasFees:true,asins:R.rows.map(r=>r.ASIN),domain:'UK',hasSince:true,missing:[],fromKeepa:true,auto:true};
    clearRun();files.one=f;touched.clear();paintSlots();
    warn([`${nm}: ${R.rows.length.toLocaleString()} products from last night's Keepa pull · 0 tokens`+(R.excluded?` · ${R.excluded} left out by brand / category`:'')+(R.notPriced?` · ${R.notPriced} not priced yet (no full Keepa look in the last 3 days)`:'')+(R.missing?` · ${R.missing} not in the cache`:'')]);run();
    if(typeof actLog==='function')actLog('auto','Used the overnight list · '+src.name,src.key);}
  catch(e){toast('Could not read last night’s list — export from Keepa as usual',true);}
  finally{AUTO.busy=false;autoPaint();}}
document.addEventListener('click',e=>{if(e.target.closest('#autoUse'))autoUse();});
/* the Brands / Filters list: a "READY" badge on an automated filter with a fresh list, so nobody exports it by habit */
function autoBadge(s){if(!autoOn(s))return'';const c=AUTO.cache[s.key];
  if(!c)return'<span class="autobadge wait" title="Automated — the keepa Worker pulls it Sunday–Thursday nights">🌙 Automated</span>';
  const p=c.row;if(autoFresh(p))return`<span class="autobadge ok" title="Keepa pulled this overnight — open it and press Use last night’s list. No export.">🌙 Ready ${autoHM(p.finished_at)} · no export</span>`;
  return'<span class="autobadge none" title="Automated, but there is no list for today — export from Keepa as usual">🌙 No list today · export</span>';}
/* called from the Brands list paint: Jack's browser re-saves stale searches; everyone loads the nights once every two minutes */
let autoWarmBusy=false;
function autoWarm(repaint){if(typeof autoResave==='function')autoResave();
  if(autoWarmBusy||!srcAll().some(autoOn))return;if(AUTO.allAt&&Date.now()-AUTO.allAt<AUTO.CACHE_MS)return;
  autoWarmBusy=true;autoLoadAll().then(ch=>{autoWarmBusy=false;if(ch&&typeof repaint==='function')repaint();}).catch(()=>{autoWarmBusy=false;});}
