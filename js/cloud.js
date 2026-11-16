/* BDL Sourcing — SHARED STORAGE (b10, 13 Sep 2026). Supabase REST, no SDK, anon key like every other BDL app.
   Local first: every store writes localStorage, then queues a ROW-LEVEL upsert / delete here. The outbox drains in order and
   survives a refresh, so a dropped connection loses nothing. Pull on boot replaces the local copies with the cloud's — but only
   once the outbox is empty, so an unsent local change can never be overwritten by a stale cloud row.
   Never a whole-dataset upload (the Aug-2026 OA Overview bug class): each write is the rows that changed.
   Sandbox rule: on localhost the cloud is OFF unless ?cloud is in the URL. */
const CLOUD={url:'https://ffbdazepqrsyurhouxif.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYmRhemVwcXJzeXVyaG91eGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTM5MjIsImV4cCI6MjA5MDQ2OTkyMn0.BAuodLUDGzO9A7IfoRRn0HZ1MgWOXNPeYKPDBNaNWeg'};
const OUTBOX_KEY='bdl-sourcing-outbox';
const cloud={busy:false,last:null,err:'',tables:true,pulled:false,pulling:false,dropped:[]};
/* b155 (Jack, 25 Sep: "a guest mode so it doesn't actually save to Supabase at all — I want to run them all and check them").
   Guest mode = the sandbox switch on the live site: cloudEnabled() goes false, so nothing is queued, sent or pulled (the same
   path every sandbox test already runs), and cloudReq refuses any write as a second lock. guest.js takes the snapshot on the
   way in and puts it back on the way out. */
const GUEST_KEY='bdl-sourcing-guest';
function guestOn(){try{const g=JSON.parse(localStorage.getItem(GUEST_KEY)||'null');return!!(g&&g.on);}catch(e){return false;}}
/* b182: guest mode sends nothing, but it may still READ the live shelves and storefront, so the audit is not an empty page. The
   sandbox on localhost and a copy opened from a file read nothing. */
function cloudReadable(){if(cloudEnabled())return true;const h=location.hostname;return guestOn()&&!(h==='localhost'||h==='127.0.0.1'||h==='');}
function cloudEnabled(){if(guestOn())return false;const h=location.hostname;const local=h==='localhost'||h==='127.0.0.1'||h==='';return !local||/[?&]cloud/.test(location.search);}
function nowIso(){return new Date().toISOString();}
function cloudHdr(extra){return Object.assign({apikey:CLOUD.key,Authorization:'Bearer '+CLOUD.key,'Content-Type':'application/json'},extra||{});}
async function cloudReq(method,path,body,prefer,keepalive){
  if(guestOn()&&method!=='GET'){const e=new Error('guest mode — nothing is sent');e.status=0;throw e;}
  const r=await fetch(CLOUD.url+'/rest/v1/'+path,{method,headers:cloudHdr(prefer?{Prefer:prefer}:{}),body:body==null?undefined:JSON.stringify(body),keepalive:!!keepalive});
  if(!r.ok){const t=await r.text();const e=new Error(method+' '+path.split('?')[0]+' → '+r.status+' '+t.slice(0,160));e.status=r.status;e.body=t;throw e;}
  const t=await r.text();return t?JSON.parse(t):null;}   /* 201/204 with return=minimal have no body */
async function cloudGetAll(table,query){const out=[];let from=0;const page=1000;
  while(true){const r=await fetch(CLOUD.url+'/rest/v1/'+table+'?'+(query||'select=*'),{headers:cloudHdr({Range:from+'-'+(from+page-1),'Range-Unit':'items'})});
    if(!r.ok){const t=await r.text();const e=new Error('GET '+table+' → '+r.status+' '+t.slice(0,160));e.status=r.status;e.body=t;throw e;}
    const rows=await r.json();out.push(...rows);if(rows.length<page)break;from+=page;}
  return out;}
/* b106. "Could not find the 'asked' column of 'src_products' in the schema cache" is a missing COLUMN (PGRST204,
   HTTP 400) — the table is there. Matching 'schema cache' alone read that as a missing TABLE, switched the whole
   audit sync off, and left every verdict queued behind a row that could never send. Only a missing table
   (404 / PGRST205 / relation does not exist) counts now. */
function missingTables(e){if(!e)return false;const b=e.body||'';
  if(/PGRST204|column/i.test(b)&&!/PGRST205|relation .* does not exist/i.test(b))return false;
  return e.status===404||/PGRST205|does not exist|schema cache/i.test(b);}
/* ---- outbox ---- */
function outbox(){return lsGet(OUTBOX_KEY,[]);}
/* op 'upsert' → payload = rows[] · op 'delete' → payload = {col, vals[]} */
function cloudQueue(table,op,payload,meta){if(!cloudEnabled())return;if(op==='upsert'&&!payload.length)return;if(op==='delete'&&!payload.vals.length)return;
  let q=outbox();const item={t:Date.now(),id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),table,op,payload,tries:0};if(meta)item.meta=meta;   /* b332: a field-limited filter save says which fields it is about */
  /* b290 (VA HQ handover S2, 8 Oct: VA HQ now stops a VA ending her shift on an unfinished run, so a ✓ Done must reach Supabase within
     seconds). A run row jumps the queue — nothing older can hold it back — and any older copy of the same run still waiting is dropped,
     since this one carries everything that one did. */
  if(table==='src_runs'&&op==='upsert'){const ids=new Set(payload.map(r=>r.id));q=q.filter(x=>!(x.table==='src_runs'&&x.op==='upsert'&&(x.payload||[]).every(r=>ids.has(r.id))));q.unshift(item);}
  else q.push(item);
  lsSet(OUTBOX_KEY,q);paintCloud();cloudFlush();}
/* b290: the item a flush sent is taken out by identity — a run row may have jumped in front of it while it was on its way */
function outboxDrop(it){const q=outbox();const i=q.findIndex(x=>it.id?x.id===it.id:(x.t===it.t&&x.table===it.table));if(i>=0)q.splice(i,1);lsSet(OUTBOX_KEY,q);return q;}
/* b332 (bug 2): a field-limited filter save (a VA's "I am on this" / "opened Keepa" stamp, or the fields she changed on the form) is laid onto the
   SERVER's row just before it is sent — the server's copy of everything else is kept, so an old copy in her browser can never put back what
   Jack changed. A filter the server does not have yet goes up whole. If the server row cannot be read the change stays queued. */
async function srcFreshen(rows,fields,getRows){if(!Array.isArray(fields)||!rows||!rows.length)return rows;
  const get=getRows||(keys=>cloudGetAll('src_sources','select=key,data&key=in.('+keys.map(k=>'"'+encodeURIComponent(k)+'"').join(',')+')'));
  const have={};(await get(rows.map(r=>r.key))||[]).forEach(r=>{if(r&&r.key)have[r.key]=r.data;});
  return rows.map(r=>have[r.key]?Object.assign({},r,{data:srcPick(have[r.key],r.data,fields)}):r);}
/* b332 (bug 11): a change the server refused three times used to vanish with only a console line. It is counted and shown now. */
function cloudDropText(n){return n+' change'+(n===1?'':'s')+' NOT saved for everyone';}
function cloudDropNote(x,msg){cloud.dropped.push({table:(x&&x.table)||'?',op:(x&&x.op)||'',why:String(msg||'').slice(0,160),at:nowIso()});
  if(typeof toast==='function')toast(cloudDropText(cloud.dropped.length)+' — the server refused it three times. It is in this browser only. Tell Jack.',true,{label:'OK',fn:()=>{}});}
let flushTimer=null;
async function cloudFlush(){if(!cloudEnabled()||cloud.busy||window.TAB_PAUSED)return;   /* b306 */if(!outbox().length){paintCloud();return;}cloud.busy=true;paintCloud();
  try{while(true){const q=outbox();if(!q.length)break;const it=q[0];
      try{
        if(it.op==='upsert'){const rows=(it.table==='src_sources'&&it.meta&&it.meta.fields)?await srcFreshen(it.payload,it.meta.fields):it.payload;   /* b332 */
          for(let i=0;i<rows.length;i+=200)await cloudReq('POST',it.table,rows.slice(i,i+200),'resolution=merge-duplicates,return=minimal');}
        else if(it.op==='delete'){const vals=it.payload.vals;for(let i=0;i<vals.length;i+=200)await cloudReq('DELETE',it.table+'?'+it.payload.col+'=in.('+vals.slice(i,i+200).map(v=>'"'+encodeURIComponent(v)+'"').join(',')+')',null,'return=minimal');}
        outboxDrop(it);cloud.last=Date.now();cloud.err='';cloud.tables=true;
      }catch(e){
        if(missingTables(e)){cloud.tables=false;cloud.err='shared tables not created yet';throw e;}
        /* a row the server refuses (400/409/422) must not block everything behind it — three tries then drop it, loudly */
        if(e.status&&e.status>=400&&e.status<500&&e.status!==429){const q2=outbox();const i=q2.findIndex(x=>it.id?x.id===it.id:(x.t===it.t&&x.table===it.table));const x=q2[i>=0?i:0];if(!x)continue;x.tries=(x.tries||0)+1;
          if(x.tries>=3){console.warn('BDL Sourcing: dropped an unsendable change',x,e.message);q2.splice(i>=0?i:0,1);cloudDropNote(x,e.message);}lsSet(OUTBOX_KEY,q2);cloud.err=e.message;if(x.tries>=1&&x.tries<3)throw e;continue;}
        throw e;}}
  }catch(e){cloud.err=cloud.err||e.message;clearTimeout(flushTimer);flushTimer=setTimeout(cloudFlush,cloud.tables?20000:120000);}
  cloud.busy=false;paintCloud();}
/* ---- pull: cloud → local. Called on boot and on demand. ---- */
async function cloudPull(){if(!cloudEnabled()||cloud.pulling)return false;cloud.pulling=true;paintCloud();let ok=false;
  try{await cloudIdle();await cloudFlush();await cloudIdle();if(outbox().length)throw new Error('unsent changes — pull skipped');
    /* b154: the Keepa console's day rows (kc:<Name>:<day>) live in src_settings too — they come down on their own (kcPull), not with every boot */
    const [S,R,V,F,B,BB,D,ST]=await Promise.all(['src_sources','src_runs','src_verdicts','src_facts','src_blacklist','src_brand_blacklist','src_discounts','src_settings'].map(t=>cloudGetAll(t,t==='src_settings'?'key=not.like.kc:*':undefined)));
    cloud.tables=true;
    /* an EMPTY cloud table means nobody has synced it yet — push what this browser has, never wipe it */
    if(!S.length)cloudQueue('src_sources','upsert',srcAll().map(srcRow));else lsSet(SRC_KEY,S.map(r=>r.data));
    const LR=runsAll();if(!R.length&&LR.length)cloudQueue('src_runs','upsert',LR.map(run=>({id:run.source+'|'+(run.day||run.at.slice(0,10)),source_key:run.source,day:run.day||run.at.slice(0,10),at:run.at,who:run.who||'',data:run})));
    else lsSet(RUN_KEY,R.map(r=>r.data).sort((a,b)=>a.at<b.at?-1:1));
    const LV=verdAll();if(!V.length&&Object.keys(LV).length)cloudQueue('src_verdicts','upsert',Object.entries(LV).map(([asin,row])=>({asin,v:row.v,reason:row.reason||'',note:row.note||'',who:row.who||'',at:row.at||nowIso(),source_key:row.source||'',state:row.state||null})));
    else{const vo={};V.forEach(r=>vo[r.asin]={v:r.v,reason:r.reason||'',note:r.note||'',who:r.who||'',at:r.at,source:r.source_key||'',state:r.state||null});lsSet(VERD_KEY,vo);}
    const LF=factsAll();if(!F.length&&Object.keys(LF).length)cloudQueue('src_facts','upsert',Object.entries(LF).map(([asin,f])=>{const {who,at,...data}=f;return{asin,data,who:who||'',at:at||nowIso()};}));
    else{const fo={};F.forEach(r=>fo[r.asin]=Object.assign({},r.data||{},{who:r.who||'',at:r.at}));lsSet(FACT_KEY,fo);}
    const LB=blAll();if(!B.length&&Object.keys(LB).length)cloudQueue('src_blacklist','upsert',Object.entries(LB).map(([asin,b])=>({asin,reason:b.reason,note:b.note||'',title:b.title||'',who:b.who||'',at:b.at||nowIso(),source_key:b.source||''})));
    else{const bo={};B.forEach(r=>bo[r.asin]={reason:r.reason,note:r.note||'',title:r.title||'',who:r.who||'',at:r.at,source:r.source_key||''});lsSet(BL_KEY,bo);}
    const LBB=bbAll();if(!BB.length&&Object.keys(LBB).length)cloudQueue('src_brand_blacklist','upsert',Object.entries(LBB).map(([k,r])=>bbRow(k,r)));
    else{const bb={};BB.forEach(r=>bb[r.brand]={display:r.display||r.brand,reason:r.reason,by:r.requested_by||'',at:r.requested_at,status:r.status,decidedBy:r.decided_by||'',decidedAt:r.decided_at||''});lsSet(BB_KEY,bb);}
    if(!D.length)cloudQueue('src_discounts','upsert',discAll().map(discRow));else lsSet(DISC_KEY,D.map(r=>r.data).sort((a,b)=>a.name.localeCompare(b.name)));
    const st={};ST.forEach(r=>st[r.key]=r.value);
    if(typeof vneedFromCloud==='function')vneedFromCloud(st);   /* b260: a VA's 'tick the Viewer columns' reminder follows her to any browser */
    if(st.reasons)lsSet(REASONS_KEY,st.reasons);else cloudQueue('src_settings','upsert',[settingRow('reasons',noReasons())]);
    if(st.vat0)lsSet(VAT0_KEY,st.vat0);else cloudQueue('src_settings','upsert',[settingRow('vat0',vat0Words())]);
    if(st.catBlock)lsSet(CAT_KEY,st.catBlock);else cloudQueue('src_settings','upsert',[settingRow('catBlock',catWords())]);
    /* b158: the audit's inventory list and archived rivals follow Jack to any browser */
    if(st['audit-mine'])lsSet('bdl-sourcing-audit-mine',st['audit-mine']);if(st['sold-before']&&typeof SOLD_KEY!=='undefined'){lsSet(SOLD_KEY,st['sold-before']);SOLD_C=null;}   /* b283 */
    if(st['audit-archived'])lsSet('bdl-sourcing-audit-archived',st['audit-archived']);
    if(st['claude-oa']&&typeof claudeFromCloud==='function')claudeFromCloud(st['claude-oa']);   /* b333: Claude's results follow Jack to any browser — a VA's browser never keeps them */
    if(st['audit-from'])lsSet('bdl-sourcing-audit-from',st['audit-from']);   /* b317: rivals brought back with the last 30 days only */
    if(st['audit-jointdays']!=null)lsSet('bdl-sourcing-audit-jointdays',st['audit-jointdays']);
    if(st['audit-va'])lsSet('bdl-sourcing-audit-va',st['audit-va']);   /* b288: which storefronts Mera and Suz audit */
    if(st['prime-event'])lsSet('bdl-sourcing-prime-event',st['prime-event']);   /* b217: Jack's Prime event switch → the Prime line in every note */
    /* b290 (VA HQ handover S1, Jack: yes): the switch is data — one shared row that says on or off. The event ended with no row saying
       off (b285 did it with a date), so Jack's first pull on this build writes {on:false}; every switch after that writes its own row. */
    if(typeof isJack==='function'&&isJack()&&!lsGet('bdl-sourcing-prime-row-b290',false)&&typeof PRIME_END!=='undefined'){const v=st['prime-event'];
      if(!(v&&v.on&&String(v.at||'')>PRIME_END)&&!(v&&v.on===false)){const row={on:false,at:nowIso()};lsSet('bdl-sourcing-prime-event',row);cloudQueue('src_settings','upsert',[settingRow('prime-event',row)]);}
      lsSet('bdl-sourcing-prime-row-b290',true);}
    /* b153: who is who, who has signed in, and whether the door is locked */
    if(st.team&&typeof TEAM_KEY!=='undefined')lsSet(TEAM_KEY,st.team);
    if(typeof SIGNIN_KEY!=='undefined'){const si={};Object.keys(st).filter(k=>k.startsWith('signin:')).forEach(k=>si[k.slice(7)]=st[k]);if(Object.keys(si).length)lsSet(SIGNIN_KEY,Object.assign(lsGet(SIGNIN_KEY,{})||{},si));}
    if(st.lock&&typeof LOCK_KEY!=='undefined'){lsSet(LOCK_KEY,st.lock);if(typeof lockCheck==='function')lockCheck();}
    /* lead states are pulled per source when a run opens; the ones this browser already holds go up if the cloud has none */
    const LL=leadAll();for(const key of Object.keys(LL)){const m=LL[key];if(!m||!Object.keys(m).length)continue;
      const have=await cloudGetAll('src_leads','select=id&source_key=eq.'+encodeURIComponent(key)+'&limit=1');
      if(!have.length)cloudQueue('src_leads','upsert',Object.entries(m).map(([a,e])=>({id:key+'|'+a,source_key:key,asin:a,state:e.state,stamp:e.stamp,prev:e.prev||null,updated_at:nowIso()})));}
    cloud.pulled=true;cloud.last=Date.now();cloud.err='';ok=true;
  }catch(e){cloud.err=e.message;if(missingTables(e))cloud.tables=false;}
  cloud.pulling=false;paintCloud();return ok;}
/* light refresh of what other people change while the list is open: sources (locks) + runs */
async function cloudPullLight(){if(!cloudEnabled()||!cloud.tables||outbox().length)return false;
  try{const [S,R]=await Promise.all([cloudGetAll('src_sources'),cloudGetAll('src_runs')]);
    if(S.length)lsSet(SRC_KEY,S.map(r=>r.data));lsSet(RUN_KEY,R.map(r=>r.data).sort((a,b)=>a.at<b.at?-1:1));cloud.last=Date.now();cloud.err='';paintCloud();return true;}
  catch(e){cloud.err=e.message;paintCloud();return false;}}
/* b250 (Jack, 3 Oct: "why are these all To review if Suz did it yesterday"). Opening a filter writes its "X is on it" lock first, so a send was
   always already on its way when the baseline was asked for — cloudFlush() returns at once while another flush is busy, the outbox still
   showed 1, and the pull gave up without a word. The run then compared against whatever THIS browser had last (nothing, if somebody else
   ran the filter last) and every lead came out NEW. Now the pull waits for the send that is in flight, and only stands down when lead
   changes themselves are still unsent. */
async function cloudIdle(ms){const t0=Date.now();while(cloud.busy&&Date.now()-t0<(ms||10000))await new Promise(r=>setTimeout(r,50));}
const leadsUnsent=()=>outbox().some(it=>it.table==='src_leads');
/* lead states for one source — pulled when its run view opens (the compare baseline must be shared, not per machine) */
async function cloudPullLeads(sourceKey){if(!cloudEnabled()||!cloud.tables)return false;
  if(outbox().length){await cloudIdle();await cloudFlush();await cloudIdle();}
  if(leadsUnsent())return false;  /* never replace a baseline that has unsent lead changes */
  try{const rows=await cloudGetAll('src_leads','select=*&source_key=eq.'+encodeURIComponent(sourceKey));
    const m={};rows.forEach(r=>m[r.asin]={state:r.state,stamp:r.stamp,prev:r.prev||null});const all=leadAll();all[sourceKey]=m;lsSet(LEAD_KEY,all);return true;}
  catch(e){cloud.err=e.message;if(missingTables(e))cloud.tables=false;paintCloud();return false;}}
/* b58: every source's lead states in one go — the Lead history view. Replaces the local map wholesale (never with unsent changes pending). */
async function cloudPullLeadsAll(){if(!cloudEnabled()||!cloud.tables)return false;
  if(outbox().length){await cloudIdle();await cloudFlush();await cloudIdle();}
  if(leadsUnsent())return false;
  try{const rows=await cloudGetAll('src_leads','select=*');const all={};rows.forEach(r=>{(all[r.source_key]=all[r.source_key]||{})[r.asin]={state:r.state,stamp:r.stamp,prev:r.prev||null};});lsSet(LEAD_KEY,all);cloud.last=Date.now();cloud.err='';paintCloud();return true;}
  catch(e){cloud.err=e.message;if(missingTables(e))cloud.tables=false;paintCloud();return false;}}
/* ---- the pill in the header ---- */
function paintCloud(){const el=document.getElementById('cloudPill');if(!el)return;const n=outbox().length;let cls='',txt='',title='';
  if(guestOn()){cls='guest';txt='Guest · not saving';title='Guest mode: nothing you do is sent to the shared database, and it is all undone when you leave guest mode';}
  else if(!cloudEnabled()){cls='off';txt='Local · sandbox';title='Cloud is off on localhost (add ?cloud to the URL to test it)';}
  else if(!cloud.tables){cls='bad';txt='Shared storage not set up';title='Run the SQL file in Supabase once — until then everything stays in this browser and is queued ('+n+' waiting)';}
  else if(cloud.pulling){cls='sync';txt='Loading shared data…';}
  else if(cloud.dropped&&cloud.dropped.length){cls='bad';txt=cloudDropText(cloud.dropped.length)+(n?' · '+n+' to send':'');title='The server refused: '+cloud.dropped.map(d=>d.table+' ('+d.why+')').join(' · ')+' — still in this browser only. Tell Jack.';}   /* b332 */
  else if(n){cls='sync';txt=n+' change'+(n===1?'':'s')+' to send';title=cloud.err||'sending…';}
  else if(cloud.err){cls='bad';txt='Sync problem';title=cloud.err;}
  else{cls='ok';txt='Shared'+(cloud.last?' · '+new Date(cloud.last).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'');title='Everyone sees the same runs, verdicts and blacklist';}
  el.className='cloudpill '+cls;el.innerHTML='<i></i>'+txt;el.title=title;
  const s=document.getElementById('cloudInfo');if(s)s.textContent=!cloudEnabled()?'Cloud off (sandbox).':!cloud.tables?'Tables missing — run 2026-09-13-BDL-SOURCING-SUPABASE.sql in the shared project once. Local changes are queued: '+n+'.':(cloud.dropped&&cloud.dropped.length?cloudDropText(cloud.dropped.length)+' (the server refused it three times) · ':'')+(n?n+' queued · ':'')+(cloud.err?'last error: '+cloud.err:'in sync'+(cloud.last?' at '+new Date(cloud.last).toLocaleTimeString('en-GB'):''));}
async function cloudInit(){paintCloud();if(!cloudEnabled())return;
  const ok=await cloudPull();if(typeof onCloudPulled==='function')onCloudPulled(ok);
  window.addEventListener('online',cloudFlush);setInterval(()=>{if(outbox().length)cloudFlush();},45000);
  /* tables not there yet (SQL not run): look again every two minutes so the pill goes green by itself once Jack runs it */
  setInterval(async()=>{if(cloud.tables||cloud.pulling)return;const ok=await cloudPull();if(ok&&typeof onCloudPulled==='function')onCloudPulled(ok);},120000);}
