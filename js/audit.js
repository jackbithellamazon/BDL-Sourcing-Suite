/* BDL Sourcing — STOREFRONT AUDIT (b64, 16 Sep 2026).
   Jack goes down a rival's shelf and gives every product one answer. The answer belongs to the PRODUCT, not the shelf:
   judge it on LVRO's shelf and it shows as judged on everyone else's. He audits a rival once; after that only their NEW
   lines come back. Nothing here changes a filter or a rule — an audit is a judgement, not a source.

   Where the data comes from
     · shelves        OA Overview's saved rivals (bdl_sellers, bdl_competitor_shelf) — read only, 0 Keepa tokens
     · joint leads    bdl_competitor_asins.shared_asins — what Jack already sells, auto-marked green
     · our leads      this app's own src_runs / src_leads / src_verdicts — "was our lead, nobody said Yes"
     · titles etc     a Keepa Viewer export dropped in (free) or the Worker at ~1 token an ASIN, cached in src_products
     · any seller     the Worker's seller route with storefront=1 (~10 tokens), or a pasted list of ASINs

   Storage rule: the audit has its OWN outbox. A missing audit table must never block the main outbox (one 404 there stops
   every other sync), so nothing is queued to the cloud until the tables are proven to exist. */
const AUD={V:'bdl-sourcing-audit-v',OUT:'bdl-sourcing-audit-out',SHELF:'bdl-sourcing-audit-shelves',VIEW:'bdl-sourcing-audit-view',
  COLLAPSE_MIN:15,   /* the same person pressing again within 15 minutes corrects the row instead of writing a new one */
  PAGE:120};
const AUDIT_TYPES=[
  {code:'not',label:'Not lead',short:'Not lead',hex:'#FF5C6C',icon:'x'},
  {code:'unsure',label:"Can't find / unsure",short:'Unsure',hex:'#FFB224',icon:'help'},
  {code:'discord',label:'Discord',short:'Discord',hex:'#8C95FF',icon:'msg'},
  {code:'ws',label:'WS',short:'WS',hex:'#22D3EE',icon:'box'},
  {code:'joint',label:'Joint lead',short:'Joint',hex:'#2CE38B',icon:'check'},
  {code:'missed',label:'Missed it',short:'Missed it',hex:'#FF8A3D',icon:'clock',reasons:['Out of stock','Passed on it','Too slow','Price gone','Other']}];
const AU_RKEYS=['q','w','e','r','t'];
function audTypes(){const v=lsGet('bdl-sourcing-audit-types',null);return Array.isArray(v)&&v.length?v:AUDIT_TYPES;}
function audType(code){return audTypes().find(t=>t.code===code)||null;}
const AU_ICON={x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>'};

/* ---------- pure bits (the checks lock these) ---------- */
/* a verdict row. id is stable so a correction overwrites instead of piling up */
function audRow(asin,code,who,sellerId,at){const t=at||nowIso();
  return{id:asin+'|'+(who||'?')+'|'+new Date(t).getTime().toString(36),asin,domain:2,verdict:code,reason:'',note:'',seller_id:sellerId||'',who:who||'',at:t,expires_at:null};}
/* what the app should show for one product: a verdict, a joint lead it detected, or nothing yet */
function audStatus(cur,sells){if(cur&&cur.verdict)return cur.verdict;if(sells)return'jointauto';return'todo';}
/* press → {row, replaced, same}. Your own press inside the collapse window corrects that row; anyone else's writes a new one. */
function audPress(asin,cur,code,who,sellerId,now){now=now||new Date().toISOString();
  const mine=!!(cur&&cur.who===who&&(new Date(now)-new Date(cur.at))/60000<AUD.COLLAPSE_MIN);
  if(cur&&cur.verdict===code&&mine)return{row:cur,replaced:true,same:true};
  if(mine)return{row:Object.assign({},cur,{verdict:code,reason:'',at:now,seller_id:sellerId||cur.seller_id||''}),replaced:true};
  return{row:audRow(asin,code,who,sellerId,now),replaced:false};}
/* a Keepa product from the API → the row we cache */
function audFromKeepa(p){if(!p||!p.asin)return null;const st=(p.stats&&p.stats.current)||[];
  const cents=v=>v==null||v<0?null:Math.round(v)/100;
  const img=(p.imagesCSV||'').split(',')[0]||((p.images&&p.images[0]&&(p.images[0].l||p.images[0].m))||'');
  return{asin:p.asin,domain:2,title:(p.title||'').slice(0,300),brand:(p.brand||'').slice(0,80),
    image:img?('https://m.media-amazon.com/images/I/'+img):'',price:cents(st[18]!=null&&st[18]>0?st[18]:st[0]),
    rank:st[3]!=null&&st[3]>0?st[3]:null,root:(p.categoryTree&&p.categoryTree[0]&&p.categoryTree[0].name)||'',
    mo:p.monthlySold||null,fba:null,source:'keepa',fetched_at:nowIso()};}
/* a Keepa CSV export row → the same shape, free */
function audFromCsv(r){const a=(r.ASIN||'').trim();if(!/^B[0-9A-Z]{9}$/.test(a))return null;
  const img=((r.Image||'').split(';')[0]||'').trim();
  return{asin:a,domain:2,title:(r.Title||'').slice(0,300),brand:(r.Brand||'').slice(0,80),image:/^https?:/.test(img)?img:'',
    price:kNum(r['Buy Box: Current'])||kNum(r['Amazon: Current'])||null,rank:kNum(r['Sales Rank: Current'])||null,
    root:r['Categories: Root']||'',mo:kNum(r['Monthly Sales Trends: Bought in past month'])||null,
    fba:kNum(r['Buy Box Eligible Offer Counts: New FBA'])||null,source:'export',fetched_at:nowIso()};}
/* every ASIN this business has ever kept as a lead: source, day, who, the numbers, and what we said */
function audOurIndex(runs,leadsAll,verds){const out={};
  (runs||[]).forEach(r=>{(r.asins||[]).forEach(a=>{const e=out[a]=out[a]||{runs:0,first:'',last:'',src:'',owner:'',day:''};
    e.runs++;const d=String(r.day||r.at).slice(0,10);if(!e.first||d<e.first)e.first=d;if(d>e.last){e.last=d;e.src=r.name||r.source;e.day=d;e.owner=r.who||'';}});});
  Object.entries(leadsAll||{}).forEach(([key,m])=>{Object.entries(m||{}).forEach(([a,e])=>{if(!out[a]||!e||!e.state)return;
    const s=e.state,cur=out[a];const score=+s.score||0;if(score>=(cur.score||0)){cur.score=score;cur.roi=+s.roi||0;cur.profit=+s.profit||0;cur.buy=+s.buy||0;cur.sell=+s.sell||0;cur.key=key;}});});
  Object.entries(verds||{}).forEach(([a,v])=>{if(out[a]){out[a].said=v.v;out[a].saidBy=v.who||'';out[a].saidAt=v.at||'';}});
  return out;}

/* ---------- local state ---------- */
function audAll(){return lsGet(AUD.V,{});}
function audSave(m){lsSet(AUD.V,m);}
function audGet(asin){return audAll()[asin]||null;}
function audOut(){return lsGet(AUD.OUT,[]);}
function audQueue(op){const q=audOut();q.push(op);lsSet(AUD.OUT,q);audFlush();}
const AUD_PROD='bdl-sourcing-audit-prod';
const audState={tables:null,pulled:0,shelfAt:0,sellers:[],shelf:{},shared:{},prod:lsGet(AUD_PROD,{})||{},checking:false};
/* the picture cache also lives in this browser, capped, so a refresh never blanks the list */
function audProdSaveLocal(){const e=Object.entries(audState.prod);const keep=e.length>4000?e.slice(e.length-4000):e;
  lsSet(AUD_PROD,Object.fromEntries(keep));}
function audShelvesLocal(){return lsGet(AUD.SHELF,{});}
function audShelvesSave(v){lsSet(AUD.SHELF,v);}
/* ---------- cloud (its own outbox, never the app's) ---------- */
async function audCheckTables(){if(!cloudEnabled()||audState.checking)return audState.tables;audState.checking=true;
  try{await cloudGetAll('src_audit_verdicts','select=id&limit=1');audState.tables=true;}
  catch(e){audState.tables=missingTables(e)?false:audState.tables;}
  audState.checking=false;return audState.tables;}
async function audFlush(){if(!cloudEnabled())return;if(audState.tables===null)await audCheckTables();if(!audState.tables)return;
  let q=audOut();let guard=0;
  while(q.length&&guard++<50){const it=q[0];
    try{
      if(it.op==='up')for(let i=0;i<it.rows.length;i+=200)await cloudReq('POST',it.table,it.rows.slice(i,i+200),'resolution=merge-duplicates,return=minimal');
      else if(it.op==='del')await cloudReq('DELETE',it.table+'?id=in.('+it.ids.map(v=>'"'+encodeURIComponent(v)+'"').join(',')+')',null,'return=minimal');
      q=audOut();q.shift();lsSet(AUD.OUT,q);
    }catch(e){if(missingTables(e)){audState.tables=false;return;}
      it.tries=(it.tries||0)+1;q[0]=it;lsSet(AUD.OUT,q);if(it.tries>=3){q.shift();lsSet(AUD.OUT,q);console.warn('audit: dropped a change',it,e.message);}return;}}
  audPaintSync();}
async function audPullVerdicts(force){if(!cloudEnabled()||!(await audCheckTables()))return false;
  if(!force&&Date.now()-audState.pulled<600e3)return true;
  try{const rows=await cloudGetAll('src_audit_current','select=*');const m={};rows.forEach(r=>{m[r.asin]=r;});
    const local=audAll();Object.entries(local).forEach(([a,r])=>{if(!m[a]||new Date(r.at)>new Date(m[a].at))m[a]=r;});
    audSave(m);audState.pulled=Date.now();return true;}catch(e){return false;}}
/* OA Overview's saved rivals and shelves — read only */
async function audPullShelves(force){if(!cloudEnabled())return false;if(!force&&Date.now()-audState.shelfAt<600e3&&audState.sellers.length)return true;
  try{const [sellers,shelf]=await Promise.all([cloudGetAll('bdl_sellers','select=seller_id,name,seller_order&order=seller_order'),
      cloudGetAll('bdl_competitor_shelf','select=seller_id,asin,first_seen,baseline&gone_on=is.null')]);
    const by={};shelf.forEach(r=>{(by[r.seller_id]=by[r.seller_id]||[]).push({a:r.asin,first:String(r.first_seen||'').slice(0,10),base:!!r.baseline});});
    audState.sellers=sellers;audState.shelf=by;
    const ca=await cloudGetAll('bdl_competitor_asins','select=seller_id,date,shared_asins&order=date.desc&limit=400');
    const sh={};ca.forEach(r=>{if(!sh[r.seller_id])sh[r.seller_id]=new Set(r.shared_asins||[]);});
    audState.shared=sh;audState.shelfAt=Date.now();return true;}
  catch(e){audState.shelfErr=e.message;return false;}}
async function audPullProducts(asins){if(!cloudEnabled()||!(await audCheckTables()))return;
  const want=asins.filter(a=>!audState.prod[a]);if(!want.length)return;
  for(let i=0;i<want.length;i+=150){const part=want.slice(i,i+150);
    try{const rows=await cloudGetAll('src_products','select=*&asin=in.('+part.join(',')+')');rows.forEach(r=>audState.prod[r.asin]=r);audProdSaveLocal();}catch(e){return;}}}
function audSaveProducts(rows){rows.forEach(r=>{audState.prod[r.asin]=r;});audProdSaveLocal();if(cloudEnabled())audQueue({op:'up',table:'src_products',rows});}

/* ---------- shelves in this browser (pasted lists and pulled sellers) ---------- */
function audShelfList(){const out=[];
  audState.sellers.forEach(s=>{const items=audState.shelf[s.seller_id]||[];if(!items.length)return;
    out.push({id:s.seller_id,name:s.name||s.seller_id,seller:s.seller_id,kind:'rival',items});});
  Object.values(audShelvesLocal()).forEach(s=>{const pulled=s.kind==='pulled';out.push({id:s.id,name:s.name,seller:s.seller||'',kind:s.kind||'list',
    items:(s.asins||[]).map(a=>({a,first:pulled?String(s.at||'').slice(0,10):'',base:!pulled}))});});
  return out;}
function audShelf(id){return audShelfList().find(s=>s.id===id)||null;}
function audSells(shelfId,asin){const s=audState.shared[shelfId];return !!(s&&s.has&&s.has(asin));}

/* ---------- judging ---------- */
let audUndoStack=[];
function audJudge(asins,code,sellerId){if(!needMe())return;const who=me();const now=nowIso();const batch=[];const m=audAll();
  asins.forEach(a=>{const cur=m[a]||null;const p=audPress(a,cur,code,who,sellerId,now);if(p.same)return;
    batch.push({asin:a,prev:cur?Object.assign({},cur):null,row:p.row});m[a]=p.row;});
  if(!batch.length)return;
  audSave(m);audUndoStack.push(batch);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:batch.map(b=>b.row)});
  return batch;}
function audUndo(){const b=audUndoStack.pop();if(!b)return false;const m=audAll();const del=[],up=[];
  b.forEach(({asin,prev,row})=>{if(prev){m[asin]=prev;up.push(prev);}else{delete m[asin];del.push(row.id);}});
  audSave(m);if(cloudEnabled()){if(up.length)audQueue({op:'up',table:'src_audit_verdicts',rows:up});if(del.length)audQueue({op:'del',table:'src_audit_verdicts',ids:del});}
  return b;}
function audSetReason(asin,reason){const m=audAll();const r=m[asin];if(!r)return;r.reason=r.reason===reason?'':reason;r.at=nowIso();
  audSave(m);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:[r]});}
function audSetNote(asin,note){const m=audAll();const r=m[asin];if(!r)return;r.note=(note||'').slice(0,200);
  audSave(m);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:[r]});}

/* ============ the page ============ */
const auView=Object.assign({mode:'list',shelf:null,tab:{},focus:0,q:'',order:null,stay:new Set(),sel:new Set(),secs:[],lastAt:0},lsGet(AUD.VIEW,{})||{});
function auSave(){lsSet(AUD.VIEW,{tab:auView.tab,secs:auView.secs.slice(-40)});}
function auUk(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return'';const x=new Date(+m[1],+m[2]-1,+m[3]);
  return x.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function auDays(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return 999;return Math.round((new Date(today())-new Date(+m[1],+m[2]-1,+m[3]))/864e5);}
function auAgo(d){const n=auDays(d);return n<=0?'today':n===1?'yesterday':n+' days ago';}
function auOurs(){if(!auView._ours||auView._oursAt!==runsAll().length+'|'+Object.keys(verdAll()).length){auView._ours=audOurIndex(runsAll(),leadAll(),verdAll());auView._oursAt=runsAll().length+'|'+Object.keys(verdAll()).length;}return auView._ours;}
function auCounts(sh){const V=audAll();const c={todo:0,all:sh.items.length,had:0,sell:0,judged:0};audTypes().forEach(t=>c[t.code]=0);const O=auOurs();
  sh.items.forEach(it=>{const sells=audSells(sh.id,it.a);const st=audStatus(V[it.a],sells);
    if(st==='todo')c.todo++;else{c.judged++;if(st==='jointauto')c.joint++;else if(c[st]!=null)c[st]++;}
    if(sells)c.sell++;if(O[it.a])c.had++;});return c;}
function auLastAudit(sh){let at='';const V=audAll();sh.items.forEach(it=>{const v=V[it.a];if(v&&v.seller_id===sh.seller&&v.at>at)at=v.at;});return at?at.slice(0,10):'';}
function auNewSince(sh){const la=auLastAudit(sh);if(!la)return 0;const V=audAll();return sh.items.filter(it=>!it.base&&it.first>la&&audStatus(V[it.a],audSells(sh.id,it.a))==='todo').length;}
function auAv(name){const cs=['#A78BFA','#22D3EE','#2CE38B','#FFB224','#FF8A3D','#8C95FF','#F472B6'];let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;return cs[h%cs.length];}
function auIni(n){return String(n).split(/[\s·]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';}
function auDonut(c,size){const segs=audTypes().map(t=>[c[t.code]||0,t.hex]).concat([[c.todo,'rgba(255,255,255,.10)']]);
  const tot=segs.reduce((a,[n])=>a+n,0)||1;let off=25;const R=15.9155;
  return`<svg class="audonut" viewBox="0 0 42 42" style="width:${size||78}px;height:${size||78}px">${segs.filter(([n])=>n).map(([n,col])=>{const p=n/tot*100;const el=`<circle cx="21" cy="21" r="${R}" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${off}"/>`;off-=p;return el;}).join('')}<text x="21" y="23.6" text-anchor="middle" font-size="8" font-weight="800" fill="currentColor">${(c.all-c.todo).toLocaleString()}</text></svg>`;}
function auSyncNote(){const n=audOut().length;if(!cloudEnabled())return'<span class="ausync off">Sandbox · nothing leaves this browser</span>';
  if(audState.tables===false)return'<span class="ausync bad">Audit tables not created yet — run the SQL once. Your answers are saved here and will send themselves.</span>';
  return n?`<span class="ausync">${n} answer${n===1?'':'s'} to send</span>`:'<span class="ausync ok">Saved for everyone</span>';}
function audPaintSync(){const el=$('#auSync');if(el)el.outerHTML=auSyncNote().replace('<span class="','<span id="auSync" class="');}

function renderAudit(){const host=$('#page-audit');if(!host)return;
  if(!isJack()){host.innerHTML=`<div class="card"><div class="empty"><span>The storefront audit is Jack's. Pick your name top right if this is you.</span></div></div>`;return;}
  if(auView.mode==='audit'&&auView.shelf&&audShelf(auView.shelf))auRenderOne();else auRenderList();}
function auRenderList(){auView.mode='list';const shelves=audShelfList();const V=audAll();const O=auOurs();
  const rows=shelves.map(sh=>({sh,c:auCounts(sh),la:auLastAudit(sh),nw:auNewSince(sh)})).sort((a,b)=>b.c.todo-a.c.todo||a.sh.name.localeCompare(b.sh.name));
  const seen=new Set();let todo=0,had=0,sell=0,missed=0;
  shelves.forEach(sh=>sh.items.forEach(it=>{if(seen.has(it.a))return;seen.add(it.a);const st=audStatus(V[it.a],audSells(sh.id,it.a));
    if(st==='todo')todo++;if(st==='missed')missed++;if(audSells(sh.id,it.a))sell++;const o=O[it.a];if(o&&o.said!=='Yes')had++;}));
  const k=(v,l,s,cls)=>`<div class="kpi"><div><div class="kv ${cls||''}">${v}</div><div class="kl">${l}</div>${s?`<div class="ks">${s}</div>`:''}</div></div>`;
  const stat=x=>!x.la?`<span class="aupill p-todo">Never audited</span>`:x.nw?`<span class="aupill p-todo">${x.nw} new since your audit</span>`:x.c.todo?`<span class="aupill p-todo">${x.c.todo} to do</span>`:`<span class="aupill p-joint">Up to date</span>`;
  $('#page-audit').innerHTML=`<div class="card">
    <div class="cardhead"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg></span><h2>Storefront audits</h2>
      <span class="sub">One pass per rival. After that only their new lines come back. An answer belongs to the product, so it counts on every shelf.</span>
      <div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}<button class="btn ghost sm" id="auRefresh" type="button">Refresh shelves</button></div></div>
    ${shelves.length?`<div class="kpis aukpis">
      ${k(shelves.length,'Rivals with a saved shelf','from OA Overview, plus any you add')}
      ${k(seen.size.toLocaleString(),'Products','each judged once, everywhere')}
      ${k(todo.toLocaleString(),'Still to judge','','iris')}
      ${k(had.toLocaleString(),'Were our leads','on one of our filters, nobody said Yes','amber')}
      ${k(sell.toLocaleString(),'You already sell','joint leads, auto-marked','jade')}</div>`:''}
    ${shelves.length?`<div class="aucards">${rows.map(x=>`<button class="aucard" type="button" data-open="${escapeHtml(x.sh.id)}">
      <div><div class="top"><span class="auav" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span>
        <div><div class="nm">${escapeHtml(x.sh.name)}</div><div class="meta">${x.sh.items.length.toLocaleString()} products · ${x.la?'last audited '+auUk(x.la)+' ('+auAgo(x.la)+')':'not audited yet'}</div></div></div>
        <div class="facts">${stat(x)}${x.c.sell?`<span class="aupill p-joint">${x.c.sell} you sell</span>`:''}${x.c.had?`<span class="aupill p-had">${x.c.had} were our leads</span>`:''}</div>
        <div class="prog"><b>${(x.c.all-x.c.todo).toLocaleString()}</b> of ${x.c.all.toLocaleString()} judged</div></div>${auDonut(x.c)}</button>`).join('')}</div>`
      :`<div class="empty"><span>${cloudEnabled()?'No shelves yet. OA Overview saves each rival’s shelf on its next fetch, or add a list below.':'Cloud is off in the sandbox, so OA Overview’s rival shelves are not here. Paste a list of ASINs below to try the screen.'}</span></div>`}
    <div class="ausplit">
      <div class="aubox"><h3>Pull any storefront</h3><p class="ssub">A seller who is not on OA Overview's list. Keepa returns their whole shelf through your Worker.</p>
        <div class="row"><input class="txt" id="auSeller" placeholder="Seller ID, e.g. A3P5ROKL5A1OLE" autocomplete="off"><button class="btn solid sm" id="auPull" type="button">Pull · about 10 tokens</button></div></div>
      <div class="aubox"><h3>Audit a list of ASINs</h3><p class="ssub">Paste ASINs, or drop any Keepa export here. An export brings the titles and pictures with it, free.</p>
        <div class="row"><input class="txt" id="auName" placeholder="Name this list" autocomplete="off" style="max-width:170px"><textarea class="txt" id="auAsins" placeholder="B0CNXZYW75, B07X63KLLH …" rows="2"></textarea><button class="btn solid sm" id="auAdd" type="button">Start</button></div>
        <div class="audrop" id="auDrop">Drop a Keepa export here</div><input type="file" id="auFile" accept=".csv,text/csv" multiple hidden></div>
    </div></div>`;}

function auVisible(sh){const V=audAll();const q=auView.q.toLowerCase();const tab=auView.tab[sh.id]||'todo';const O=auOurs();
  if(!auView.order){const o=sh.items.slice().sort((a,b)=>{const sa=audStatus(V[a.a],audSells(sh.id,a.a))==='todo'?0:1,sb=audStatus(V[b.a],audSells(sh.id,b.a))==='todo'?0:1;
      return (sa-sb)||String(b.first||'').localeCompare(String(a.first||''));});auView.order={};o.forEach((it,i)=>auView.order[it.a]=i);}
  const list=sh.items.filter(it=>{const st=audStatus(V[it.a],audSells(sh.id,it.a));
    if(tab==='todo'&&st!=='todo'&&!auView.stay.has(it.a))return false;
    if(tab==='had'&&!O[it.a])return false;
    if(tab==='sell'&&!(audSells(sh.id,it.a)||st==='joint'))return false;
    if(audType(tab)&&st!==tab&&!(tab==='joint'&&st==='jointauto'))return false;
    if(q){const p=audState.prod[it.a]||{};if(!((it.a+' '+(p.title||'')+' '+(p.brand||'')).toLowerCase().includes(q)))return false;}return true;});
  list.sort((a,b)=>(auView.order[a.a]==null?1e9:auView.order[a.a])-(auView.order[b.a]==null?1e9:auView.order[b.a]));
  return list;}
function auRow(it,i,sh){const V=audAll();const v=V[it.a];const p=audState.prod[it.a]||{};const sells=audSells(sh.id,it.a);const st=audStatus(v,sells);
  const o=auOurs()[it.a];const t=audType(st);const newShelf=!it.base&&auDays(it.first)<=14;
  const btns=audTypes().map((x,n)=>{const on=(v&&v.verdict===x.code)||(st==='jointauto'&&x.code==='joint');
    return`<button type="button" class="aub ${on?'on':''}${st==='jointauto'&&x.code==='joint'?' auto':''}" style="--c:${x.hex}" data-v="${x.code}" data-a="${it.a}" title="${escapeHtml(x.label)} · key ${n+1}"><kbd>${n+1}</kbd>${AU_ICON[x.icon]||''}<span class="lab">${escapeHtml(x.short||x.label)}</span></button>`;}).join('');
  const reasons=v&&audType(v.verdict)&&audType(v.verdict).reasons&&(i===auView.focus||!v.reason)
    ?`<div class="aureasons">Why missed?${audType(v.verdict).reasons.map((x,n)=>`<button type="button" class="aurs ${v.reason===x?'on':''}" data-r="${escapeHtml(x)}" data-a="${it.a}"><kbd>${AU_RKEYS[n].toUpperCase()}</kbd>${escapeHtml(x)}</button>`).join('')}</div>`:'';
  const ourChip=o?(o.said==='Yes'?`<span class="aupill p-yes" title="${escapeHtml(o.src+' · '+o.day+' · score '+(o.score||0))}">${escapeHtml(o.saidBy||'we')} said Yes</span>`
      :`<span class="aupill p-had" title="${escapeHtml(o.src+' · '+o.owner+' · '+o.day+' · score '+(o.score||0)+' · buy '+gbp(o.buy)+' → sell '+gbp(o.sell)+' · '+(o.roi||0)+'% ROI')}">Our lead ${auUk(o.day)}${o.said?' · '+escapeHtml(o.said):' · no verdict'}</span>`):'';
  const judged=v?`<span class="aupill p-muted" title="${escapeHtml((audType(v.verdict)||{}).label+' · '+v.who+' · '+auUk(v.at)+(v.reason?' · '+v.reason:'')+(v.note?' · '+v.note:''))}"><i class="sq" style="background:${(audType(v.verdict)||{}).hex||'#888'}"></i>${escapeHtml(v.who)} · ${auUk(v.at)}${v.reason?' · '+escapeHtml(v.reason):''}</span>`:'';
  const links=[['Keepa','https://keepa.com/#!product/2-'+it.a,'K'],['SellerAmp','https://sas.selleramp.com/sas/lookup?search_term='+it.a+(p.price?'&sas_cost_price='+(+p.price).toFixed(2):''),'S'],['Amazon','https://www.amazon.co.uk/dp/'+it.a,'O']]
    .map(([l,h,key])=>`<a href="${h}" target="_blank" rel="noopener" title="Open on ${l} · key ${key}" data-stop><b>${key}</b><span class="ll">${l}</span></a>`).join('');
  return`<div class="aurow ${i===auView.focus?'focus':''} ${auView.sel.has(it.a)?'sel':''} ${st!=='todo'?'judged':''}" data-i="${i}" data-a="${it.a}" style="--edge:${st==='todo'?'var(--iris)':(t?t.hex:(st==='jointauto'?'#2CE38B':'var(--line2)'))}">
    <div class="auimg">${p.image?`<img loading="lazy" src="${escapeHtml(p.image)}" alt="">`:escapeHtml(it.a.slice(0,2))}</div>
    <div class="aut" title="${escapeHtml(p.title||it.a)}">${escapeHtml(p.title||it.a)}</div>
    <div class="aumain"><div class="aufacts"><button type="button" class="auasin" data-copy="${it.a}" title="Click to copy">${it.a}</button>
      ${p.price?`<span>${gbp(p.price)}</span>`:''}${p.rank?`<span>#${(+p.rank).toLocaleString()}</span>`:''}${p.mo?`<span>${(+p.mo).toLocaleString()}/mo</span>`:''}
      ${newShelf?`<span class="new">new on shelf ${auDays(it.first)}d</span>`:!it.first?'':it.base?'<span>on shelf before we watched</span>':`<span>on shelf since ${auUk(it.first)}</span>`}
      <span class="aulinks">${links}</span></div>
      <div class="auchips">${sells?'<span class="aupill p-joint">You sell this</span>':''}${ourChip}${judged}</div></div>
    <div class="aubtns">${btns}</div>${reasons}</div>`;}
function auRenderOne(){const sh=audShelf(auView.shelf);const c=auCounts(sh);const vis=auVisible(sh);const tab=auView.tab[sh.id]||'todo';
  if(auView.focus>=vis.length)auView.focus=Math.max(0,vis.length-1);
  const secs=auView.secs.length?auView.secs.reduce((a,b)=>a+b,0)/auView.secs.length:6;
  const la=auLastAudit(sh);const loaded=sh.items.filter(it=>audState.prod[it.a]).length;
  const tb=(key,label,n,col)=>`<button type="button" class="${tab===key?'on':''}" data-tab="${key}">${label} <b style="color:${col||'var(--text)'}">${n}</b></button>`;
  const page=vis.slice(0,AUD.PAGE);
  $('#page-audit').innerHTML=`<div class="card">
    <div class="auhead"><button class="back" id="auBack" type="button" aria-label="Back to audits">${ICONS.back}</button>
      <span class="auav" style="background:${auAv(sh.name)}">${auIni(sh.name)}</span>
      <div><h2>${escapeHtml(sh.name)}</h2><div class="meta">${sh.items.length.toLocaleString()} products · ${la?'last audited '+auUk(la)+' ('+auAgo(la)+')':'first audit'}${sh.seller?' · seller '+escapeHtml(sh.seller):''}</div></div>
      <div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}
        ${sh.seller?`<a class="btn ghost sm" href="https://www.amazon.co.uk/s?me=${escapeHtml(sh.seller)}" target="_blank" rel="noopener">Their shelf</a><a class="btn ghost sm" href="https://keepa.com/#!seller/2-${escapeHtml(sh.seller)}" target="_blank" rel="noopener">Keepa seller</a>`:''}
        <button class="btn ghost sm" id="auRest" type="button">Mark the rest Not lead</button></div></div>
    <div class="auprog"><div class="aubar">${audTypes().map(t=>c[t.code]?`<i style="width:${c[t.code]/c.all*100}%;background:${t.hex}" title="${c[t.code]} ${escapeHtml(t.label)}"></i>`:'').join('')}</div>
      <div class="aupline"><b>${(c.all-c.todo).toLocaleString()} of ${c.all.toLocaleString()} judged</b><span>${c.todo?`${c.todo} to do · about ${Math.max(1,Math.round(c.todo*secs/60))} min left`:'all done'}</span>
        <span class="audet">${loaded} of ${sh.items.length} have pictures${loaded<sh.items.length?` · <button type="button" class="linkbtn" id="auViewer">open ${Math.min(250,sh.items.length-loaded)} in the Keepa Viewer (free)</button> · <button type="button" class="linkbtn" id="auTokens">load with tokens</button>`:''}</span></div></div>
    <div class="autabs">${tb('todo','To do',c.todo,'var(--iris)')}${tb('had','We had it',c.had,'#FF8A3D')}${tb('sell','You sell',c.sell,'#2CE38B')}${audTypes().map(t=>tb(t.code,t.short||t.label,c[t.code],t.hex)).join('')}${tb('all','All',c.all)}
      <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="auQ" placeholder="Search title or ASIN" value="${escapeHtml(auView.q)}" autocomplete="off"><kbd>/</kbd></label></div>
    ${tab==='todo'&&!c.todo&&!auView.q?auDone(sh,c):
      !vis.length?'<div class="empty"><span>Nothing in this tab.</span></div>':
      `<div class="augrid"><div class="aulist">${page.map((it,i)=>auRow(it,i,sh)).join('')}${vis.length>AUD.PAGE?`<div class="aumore">Showing the first ${AUD.PAGE} of ${vis.length}. Judge these and the rest follow.</div>`:''}</div>
        <aside class="aupanel">${auPanel(vis[auView.focus],sh)}</aside></div>`}
    <div class="aukeys"><span><kbd>1</kbd>–<kbd>${audTypes().length}</kbd> judge</span><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>⇧↓</kbd> select a run</span><span><kbd>U</kbd> undo</span><span><kbd>O</kbd><kbd>K</kbd><kbd>S</kbd> Amazon · Keepa · SellerAmp</span><span><kbd>/</kbd> search</span></div></div>`;
  const f=document.querySelector('.aurow.focus');if(f)f.scrollIntoView({block:'nearest'});}
function auPanel(it,sh){if(!it)return'<div class="empty"><span>Pick a product.</span></div>';const p=audState.prod[it.a]||{};const v=audGet(it.a);const o=auOurs()[it.a];
  const also=audShelfList().filter(x=>x.id!==sh.id&&x.items.some(y=>y.a===it.a)).map(x=>x.name);
  const fact=(k,val)=>`<div><div class="k">${k}</div><div class="v">${val}</div></div>`;
  return`<div class="aupimg ${p.image?'':'none'}">${p.image?`<img src="${escapeHtml(p.image)}" alt="">`:escapeHtml(it.a.slice(0,2))}</div>
    <h3>${escapeHtml(p.title||it.a)}</h3><div class="ssub">${escapeHtml(p.brand||'')}${p.root?' · '+escapeHtml(p.root):''} · ${it.a}</div>
    <div class="aufgrid">${fact('Buy Box',gbp(p.price))}${fact('Sales rank',p.rank?'#'+(+p.rank).toLocaleString():'—')}${fact('Bought / month',p.mo?(+p.mo).toLocaleString():'—')}
      ${fact('FBA offers',p.fba||'—')}${fact('On their shelf',it.base?'before':auDays(it.first)+'d')}${fact('Other shelves',also.length)}</div>
    <div class="aulinksbig"><a href="https://www.amazon.co.uk/dp/${it.a}" target="_blank" rel="noopener">Amazon <kbd>O</kbd></a><a href="https://keepa.com/#!product/2-${it.a}" target="_blank" rel="noopener">Keepa <kbd>K</kbd></a><a href="https://sas.selleramp.com/sas/lookup?search_term=${it.a}${p.price?'&sas_cost_price='+(+p.price).toFixed(2):''}" target="_blank" rel="noopener">SellerAmp <kbd>S</kbd></a></div>
    <div class="ausec"><div class="h">On our filters</div>${o?`<div class="auours ${o.said==='Yes'?'yes':''}"><b>${o.said?escapeHtml((o.saidBy||'we')+' said '+o.said):'Was a lead · nobody said Yes'}</b>
      <div>${escapeHtml(o.src||'')} · ${escapeHtml(o.owner||'')} · ${auUk(o.day)} · ${o.runs} run${o.runs===1?'':'s'}${o.score?' · score '+o.score:''}${o.buy?' · buy '+gbp(o.buy)+' → sell '+gbp(o.sell)+' · '+o.roi+'% ROI':''}</div></div>`
      :'<div class="auours none">Never a lead on our filters. Only leads the rules kept are remembered, not rows they cut.</div>'}</div>
    ${also.length?`<div class="ausec"><div class="h">Also sold by</div><div class="ssub">${also.map(escapeHtml).join(', ')}</div></div>`:''}
    <div class="ausec"><div class="h">Note</div><input class="txt" id="auNote" placeholder="${v?'one line, saved with the answer':'judge it first, then add a note'}" value="${escapeHtml(v&&v.note||'')}" ${v?'':'disabled'} data-a="${it.a}"></div>`;}
function auDone(sh,c){const disc=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='discord');const ws=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='ws');
  return`<div class="audone"><div class="tick">${CHECK}</div><h3>${escapeHtml(sh.name)} is done</h3><p class="ssub">${c.all.toLocaleString()} products judged</p>
    <div class="audgrid">${auDonut(c,130)}<div><div class="aucounts">${audTypes().map(t=>`<button type="button" data-tab="${t.code}"><i style="background:${t.hex}"></i><b>${c[t.code]||0}</b> ${escapeHtml(t.short||t.label)}</button>`).join('')}</div>
      <div class="ssub">${sh.items.filter(it=>!it.base).length} products have appeared on this shelf since we started watching · ${c.sell} you already sell.</div></div></div>
    <div class="row">${disc.length?`<button class="btn solid sm" id="auDisc" type="button">Open the ${disc.length} Discord one${disc.length===1?'':'s'} in Keepa</button>`:''}${ws.length?`<button class="btn solid sm" id="auWs" type="button">Copy ${ws.length} WS ASIN${ws.length===1?'':'s'}</button>`:''}<button class="btn primary sm" id="auBack2" type="button">Back to audits</button></div></div>`;}

/* ============ actions and wiring ============ */
function auOpen(id){auView.mode='audit';auView.shelf=id;auView.q='';auView.order=null;auView.stay=new Set();auView.sel=new Set();auView.lastAt=0;
  location.hash='#audit='+id;const sh=audShelf(id);if(!sh)return;
  const vis=auVisible(sh);const V=audAll();const first=vis.findIndex(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo');
  auView.focus=Math.max(0,first);renderAudit();
  audPullProducts(sh.items.map(i=>i.a)).then(()=>{if(auView.mode==='audit'&&auView.shelf===id)renderAudit();});}
function auBack(){auView.mode='list';auView.shelf=null;location.hash='#audit';renderAudit();}
function auJudgeNow(asins,code){const sh=audShelf(auView.shelf);if(!sh)return;const b=audJudge(asins,code,sh.seller||sh.id);if(!b)return;
  asins.forEach(a=>auView.stay.add(a));
  const gap=(Date.now()-auView.lastAt)/1000;if(auView.lastAt&&gap<60){auView.secs=auView.secs.concat([gap]).slice(-40);auSave();}auView.lastAt=Date.now();
  const t=audType(code);toast(`Marked ${t?t.label:code}${asins.length>1?' on '+asins.length+' products':''} — press U to undo`);
  auView.sel=new Set();if(!(t&&t.reasons))auAdvance();renderAudit();}
function auAdvance(){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const V=audAll();
  for(let i=auView.focus+1;i<vis.length;i++){if(audStatus(V[vis[i].a],audSells(sh.id,vis[i].a))==='todo'){auView.focus=i;return;}}
  for(let i=0;i<auView.focus;i++){if(audStatus(V[vis[i].a],audSells(sh.id,vis[i].a))==='todo'){auView.focus=i;return;}}}
function auOpenKeepaViewer(){const sh=audShelf(auView.shelf);if(!sh)return;const need=sh.items.filter(it=>!audState.prod[it.a]).map(it=>it.a).slice(0,250);
  if(!need.length){toast('Every product already has its details');return;}
  copy(need.join(', '),need.length+' ASINs copied — they are also loading in the Viewer');window.open(keepaLink(need,'2'),'_blank');
  toast('Export ALL columns from the Viewer, then drop the file on this page');}
async function auLoadTokens(){const sh=audShelf(auView.shelf);if(!sh)return;const need=sh.items.filter(it=>!audState.prod[it.a]).map(it=>it.a);
  if(!need.length){toast('Every product already has its details');return;}
  if(!confirm(`Load titles, pictures and prices for ${need.length} product${need.length===1?'':'s'}?\n\nThat costs about ${need.length} Keepa tokens, once. They are saved for good.`))return;
  toast('Asking Keepa…');let got=0;
  for(let i=0;i<need.length;i+=100){const part=need.slice(i,i+100);
    try{const r=await fetch(WORKER+'/keepa?path=product&domain=2&stats=30&asin='+part.join(','));const j=await r.json();
      const rows=(j.products||[]).map(audFromKeepa).filter(Boolean);if(rows.length){audSaveProducts(rows);got+=rows.length;}
      if(j.error){toast('Keepa: '+j.error,true);break;}}
    catch(e){toast('Could not reach the Worker',true);break;}}
  renderAudit();toast(got?got+' products loaded':'Nothing came back',!got);}
async function auPullSeller(id){id=(id||'').trim().toUpperCase();if(!/^A[0-9A-Z]{5,}$/.test(id)){toast('That does not look like a seller ID',true);return;}
  if(!confirm('Pull this seller\'s whole shelf from Keepa?\n\nThat costs about 10 tokens.'))return;
  toast('Asking Keepa…');
  try{const r=await fetch(WORKER+'/keepa?path=seller&domain=2&storefront=1&seller='+id);const j=await r.json();
    const s=j.sellers&&j.sellers[id];const asins=(s&&(s.asinList||[]))||[];
    if(!asins.length){toast('Keepa returned no products for that seller',true);return;}
    const all=audShelvesLocal();all[id]={id,name:(s.sellerName||id),seller:id,kind:'pulled',asins,at:today(),by:me()};audShelvesSave(all);
    if(cloudEnabled())audQueue({op:'up',table:'src_audit_shelves',rows:[{seller_id:id,name:all[id].name,kind:'pulled',asins,pulled_at:nowIso(),pulled_by:me()}]});
    toast(asins.length+' products in — opening the audit');auOpen(id);}
  catch(e){toast('Could not reach the Worker',true);}}
function auAddList(){const name=($('#auName')&&$('#auName').value.trim())||'Pasted list '+today();
  const raw=($('#auAsins')&&$('#auAsins').value)||'';const asins=[...new Set((raw.match(/B[0-9A-Z]{9}/g)||[]))];
  if(!asins.length){toast('No ASINs found in that box',true);return;}
  const id='list-'+srcKeyFor(name);const all=audShelvesLocal();all[id]={id,name,seller:'',kind:'list',asins,at:today(),by:me()};audShelvesSave(all);
  if(cloudEnabled())audQueue({op:'up',table:'src_audit_shelves',rows:[{seller_id:id,name,kind:'list',asins,pulled_at:nowIso(),pulled_by:me()}]});
  toast(asins.length+' ASINs ready');auOpen(id);}
async function auTakeFiles(list){const files=[...list].filter(f=>/\.csv$/i.test(f.name));if(!files.length)return;
  let rows=[];for(const f of files){try{const t=await readFileText(f);const ex=describeExport(parseCSV(t));if(ex&&ex.rows)rows=rows.concat(ex.rows);}catch(e){}}
  const prods=rows.map(audFromCsv).filter(Boolean);
  if(!prods.length){toast('No ASINs in that export',true);return;}
  const seen={};prods.forEach(p=>seen[p.asin]=p);const uniq=Object.values(seen);
  audSaveProducts(uniq);
  if(auView.mode==='audit'){renderAudit();toast(uniq.length+' products now have their details');}
  else{const name='Export '+today();const id='list-'+srcKeyFor(name);const all=audShelvesLocal();
    all[id]={id,name,seller:'',kind:'list',asins:uniq.map(p=>p.asin),at:today(),by:me()};audShelvesSave(all);
    if(cloudEnabled())audQueue({op:'up',table:'src_audit_shelves',rows:[{seller_id:id,name,kind:'list',asins:all[id].asins,pulled_at:nowIso(),pulled_by:me()}]});
    toast(uniq.length+' products in — opening the audit');auOpen(id);}}
function auInit(){const host=$('#page-audit');if(!host)return;
  host.addEventListener('click',async e=>{const t=e.target;
    if(t.closest('[data-stop]')){e.stopPropagation();return;}
    const cp=t.closest('[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');e.stopPropagation();return;}
    const op=t.closest('[data-open]');if(op){auOpen(op.dataset.open);return;}
    if(t.closest('#auBack')||t.closest('#auBack2')){auBack();return;}
    if(t.closest('#auRefresh')){toast('Refreshing…');await audPullShelves(true);await audPullVerdicts(true);renderAudit();toast('Up to date');return;}
    if(t.closest('#auPull')){auPullSeller($('#auSeller').value);return;}
    if(t.closest('#auAdd')){auAddList();return;}
    if(t.closest('#auViewer')){auOpenKeepaViewer();return;}
    if(t.closest('#auTokens')){auLoadTokens();return;}
    if(t.closest('#auDisc')){const sh=audShelf(auView.shelf);const a=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='discord').map(it=>it.a);window.open(keepaLink(a,'2'),'_blank');return;}
    if(t.closest('#auWs')){const sh=audShelf(auView.shelf);const a=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='ws').map(it=>it.a);copy(a.join(', '),a.length+' WS ASINs copied');return;}
    if(t.closest('#auRest')){const sh=audShelf(auView.shelf);const V=audAll();const left=auVisible(sh).filter(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo').map(it=>it.a);
      if(!left.length){toast('Nothing left to judge in this tab');return;}
      if(confirm(`Mark ${left.length} product${left.length===1?'':'s'} Not lead?`))auJudgeNow(left,'not');return;}
    const tab=t.closest('[data-tab]');if(tab){const sh=audShelf(auView.shelf);auView.tab[sh.id]=tab.dataset.tab;auView.order=null;auView.stay=new Set();auView.focus=0;auSave();
      const vis=auVisible(sh);const V=audAll();const f=vis.findIndex(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo');auView.focus=Math.max(0,f);renderAudit();return;}
    const vb=t.closest('[data-v]');if(vb){const sh=audShelf(auView.shelf);const vis=auVisible(sh);const k=vis.findIndex(it=>it.a===vb.dataset.a);if(k>=0)auView.focus=k;
      auJudgeNow(auView.sel.size?[...auView.sel]:[vb.dataset.a],vb.dataset.v);return;}
    const rs=t.closest('[data-r]');if(rs){audSetReason(rs.dataset.a,rs.dataset.r);auAdvance();renderAudit();return;}
    const row=t.closest('.aurow');if(row){auView.focus=+row.dataset.i;renderAudit();return;}});
  host.addEventListener('input',e=>{if(e.target.id==='auQ'){auView.q=e.target.value;auView.focus=0;auView.order=null;const pos=e.target.selectionStart;renderAudit();
      const q=$('#auQ');if(q){q.focus();q.setSelectionRange(pos,pos);}}
    if(e.target.id==='auNote')audSetNote(e.target.dataset.a,e.target.value);});
  host.addEventListener('dragover',e=>{e.preventDefault();const d=$('#auDrop');if(d)d.classList.add('over');});
  host.addEventListener('dragleave',()=>{const d=$('#auDrop');if(d)d.classList.remove('over');});
  host.addEventListener('drop',e=>{e.preventDefault();const d=$('#auDrop');if(d)d.classList.remove('over');auTakeFiles(e.dataTransfer.files);});
  host.addEventListener('click',e=>{if(e.target.closest('#auDrop'))$('#auFile').click();});
  host.addEventListener('change',e=>{if(e.target.id==='auFile'){auTakeFiles(e.target.files);e.target.value='';}});
  document.addEventListener('keydown',e=>{
    if(!$('#page-audit')||!$('#page-audit').classList.contains('active')||auView.mode!=='audit')return;
    const tg=e.target;if(tg&&tg.closest&&tg.closest('input,textarea,select'))return;
    const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const it=vis[auView.focus];
    if(e.key==='/'){e.preventDefault();const q=$('#auQ');if(q)q.focus();return;}
    if(e.key==='Escape'){if(auView.sel.size){auView.sel=new Set();renderAudit();}return;}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const d=e.key==='ArrowDown'?1:-1;const nf=Math.min(vis.length-1,Math.max(0,auView.focus+d));
      if(e.shiftKey){if(it)auView.sel.add(it.a);if(vis[nf])auView.sel.add(vis[nf].a);}else auView.sel=new Set();
      auView.focus=nf;renderAudit();return;}
    const types=audTypes();const n=parseInt(e.key,10);
    if(n>=1&&n<=types.length&&it){e.preventDefault();auJudgeNow(auView.sel.size?[...auView.sel]:[it.a],types[n-1].code);return;}
    const rk=AU_RKEYS.indexOf(String(e.key).toLowerCase());
    if(rk>=0&&it){const v=audGet(it.a);const ty=v&&audType(v.verdict);if(ty&&ty.reasons&&ty.reasons[rk]){audSetReason(it.a,ty.reasons[rk]);auAdvance();renderAudit();return;}}
    if(e.key==='u'||e.key==='U'){const b=audUndo();toast(b?'Undone':'Nothing to undo');
      if(b){const back=auVisible(sh).findIndex(x=>x.a===b[0].asin);if(back>=0)auView.focus=back;renderAudit();}return;}
    if(!it)return;
    if(e.key==='o'||e.key==='O')window.open('https://www.amazon.co.uk/dp/'+it.a,'_blank');
    else if(e.key==='k'||e.key==='K')window.open('https://keepa.com/#!product/2-'+it.a,'_blank');
    else if(e.key==='s'||e.key==='S')window.open('https://sas.selleramp.com/sas/lookup?search_term='+it.a,'_blank');});
  /* first paint + shared data when the page opens */
  const btn=document.querySelector('.pagebtn[data-page="page-audit"]');
  if(btn)btn.addEventListener('click',async()=>{renderAudit();if(cloudEnabled()){await audPullShelves();await audPullVerdicts();renderAudit();}});
  renderAudit();}
function auHash(){const m=/^#audit(?:=([\w-]+))?/i.exec(location.hash||'');if(!m)return false;
  const b=document.querySelector('.pagebtn[data-page="page-audit"]');if(b&&!b.classList.contains('active'))b.click();
  if(m[1]&&audShelf(m[1]))auOpen(m[1]);else{auView.mode='list';renderAudit();}
  return true;}
