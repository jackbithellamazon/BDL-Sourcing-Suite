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
  {code:'discord',label:'Discord',short:'Discord',hex:'#8C95FF',icon:'msg',prompt:'Which Discord?',reasons:['PS','THC','FFB']},
  {code:'ws',label:'WS',short:'WS',hex:'#22D3EE',icon:'box'},
  {code:'joint',label:'Joint lead',short:'Joint',hex:'#2CE38B',icon:'check'},
  {code:'missed',label:'Missed it',short:'Missed it',hex:'#FF8A3D',icon:'clock',prompt:'Why missed?',reasons:['Out of stock','Passed on it','Too slow','Price gone','Never looked at','Never found it','Other']}];
/* b91 (Jack, 17 Sep): "never found it" is a different answer from "never looked at", and it is the one that
   points at a filter rather than at a person. Never looked at = it reached our list and nobody judged it.
   Never found it = our filters never surfaced it at all, and the rival is selling it anyway. Slotted before
   Other so the list still ends on the catch-all; Other moves from Y to U, every other key stays put. */
const AU_RKEYS=['q','w','e','r','t','y','u'];
/* b96 (Jack: "discord not having the 2nd click"). The six verdicts can be overridden by a list saved in the
   browser — a hook for when he names extra ones. Nothing in the app writes it, but a list saved before a
   feature existed used to win outright, so his Discord had no reasons array and the PS/THC/FFB step simply
   never appeared. A saved list may say WHICH verdicts exist and what they are called; how one BEHAVES always
   comes from the code. Otherwise every future change is invisible to whoever has an old list stored. */
function audTypes(){const v=lsGet('bdl-sourcing-audit-types',null);
  if(!Array.isArray(v)||!v.length)return AUDIT_TYPES;
  return v.map(t=>{const base=AUDIT_TYPES.find(b=>b.code===t.code);if(!base)return t;
    return Object.assign({},base,t,{reasons:base.reasons,prompt:base.prompt});});}
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
    image:img?('https://m.media-amazon.com/images/I/'+img):'',
    /* b141 (Jack, 22 Sep: "sell price isn't going on all of them"). It only ever read the Buy Box, then Amazon.
       A listing with no Buy Box and no Amazon offer — 3P only, or suppressed — came back blank, and a blank row
       reads as broken. The cheapest live NEW offer is the third resort, and the row says which one it is. */
    price:cents(st[18]!=null&&st[18]>0?st[18]:(st[0]!=null&&st[0]>0?st[0]:st[1])),
    pricefrom:(st[18]!=null&&st[18]>0)?'bb':(st[0]!=null&&st[0]>0)?'amz':(st[1]!=null&&st[1]>0)?'3p':'',
    rank:st[3]!=null&&st[3]>0?st[3]:null,root:(p.categoryTree&&p.categoryTree[0]&&p.categoryTree[0].name)||'',
    mo:p.monthlySold||null,fba:null,offers:st[11]!=null&&st[11]>0?st[11]:null,
    /* b88 (Jack: "sellers on it is — why tho"). A dash meant two different things: Keepa says nobody is
       listed, and we never asked. Records written before the offer count existed fell in the second camp
       and counted as loaded forever, so the dash never cleared. asked:1 says we have been. */
    asked:1,source:'keepa',fetched_at:nowIso()};}
/* a Keepa CSV export row → the same shape, free */
function audFromCsv(r){const a=(r.ASIN||'').trim();if(!/^B[0-9A-Z]{9}$/.test(a))return null;
  const img=((r.Image||'').split(';')[0]||'').trim();
  return{asin:a,domain:2,title:(r.Title||'').slice(0,300),brand:(r.Brand||'').slice(0,80),image:/^https?:/.test(img)?img:'',
    price:kNum(r['Buy Box: Current'])||kNum(r['Amazon: Current'])||kNum(r['New: Current'])||null,
    pricefrom:kNum(r['Buy Box: Current'])?'bb':kNum(r['Amazon: Current'])?'amz':kNum(r['New: Current'])?'3p':'',
    asked:1,rank:kNum(r['Sales Rank: Current'])||null,
    root:r['Categories: Root']||'',mo:kNum(r['Monthly Sales Trends: Bought in past month'])||null,
    fba:kNum(r['Buy Box Eligible Offer Counts: New FBA'])||null,offers:kNum(r['Total Offer Count'])||null,source:'export',fetched_at:nowIso()};}
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
function audQueue(op){if(typeof guestOn==='function'&&guestOn())return;   /* b155: guest mode queues nothing, so nothing can be sent later */
  const q=audOut();q.push(op);lsSet(AUD.OUT,q);audFlush();}
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
/* b106 — every audit table gets exactly the columns it was created with (2026-09-16-BDL-SOURCING-AUDIT-SUPABASE.sql).
   Product rows carry two local-only fields, `offers` and `asked`, which src_products does not have; sending them
   got every product upsert rejected, and that one rejected row blocked the whole queue. Applied at SEND time, so
   the rows already stuck in the outbox are cleaned on the way out too. The offer count is kept, in the table's
   own `fba` column, which is what that column is for. */
const AUD_COLS={
  src_products:['asin','domain','title','brand','image','price','rank','root','mo','fba','source','fetched_at'],
  src_audit_verdicts:['id','asin','domain','verdict','reason','note','seller_id','who','at','expires_at'],
  src_audit_shelves:['seller_id','name','kind','asins','pulled_at','pulled_by']};
function audShape(table,rows){const c=AUD_COLS[table];if(!c)return rows;
  return rows.map(r=>{const o={};c.forEach(k=>{if(r[k]!==undefined)o[k]=r[k];});
    if(table==='src_products'&&(o.fba==null||o.fba==='')&&r.offers!=null)o.fba=r.offers;return o;});}
async function audFlush(){if(!cloudEnabled())return;if(audState.tables===null)await audCheckTables();if(!audState.tables)return;
  let q=audOut();let guard=0;
  while(q.length&&guard++<50){const it=q[0];
    try{
      if(it.op==='up')for(let i=0;i<it.rows.length;i+=200)await cloudReq('POST',it.table,audShape(it.table,it.rows.slice(i,i+200)),'resolution=merge-duplicates,return=minimal');
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
    try{const rows=await cloudGetAll('src_products','select=*&asin=in.('+part.join(',')+')');rows.forEach(r=>{if(r.source==='keepa'){r.asked=1;if(r.offers==null&&r.fba!=null)r.offers=r.fba;}audState.prod[r.asin]=r;});audProdSaveLocal();}catch(e){return;}}}
function audSaveProducts(rows){rows.forEach(r=>{audState.prod[r.asin]=r;});audProdSaveLocal();if(cloudEnabled())audQueue({op:'up',table:'src_products',rows});}

/* b65 (Jack: "as automated as possible"): opening a shelf fills in the details by itself.
   Free first — anything we have already seen as a lead carries its title — then the Worker tops the rest up,
   inside a token budget, unless Jack turns it off. */
const AUD_AUTO='bdl-sourcing-audit-auto',AUD_AUTO_CAP=500,AUD_TOKEN_FLOOR=250;
function audAuto(){const v=lsGet(AUD_AUTO,null);return v==null?true:!!v;}
function audAutoSet(v){lsSet(AUD_AUTO,!!v);}
/* titles we already own, from our own runs — costs nothing */
function audFillFromOurs(asins){const LA=leadAll();const have=new Set(asins);const add=[];
  Object.values(LA).forEach(m=>Object.entries(m||{}).forEach(([a,e])=>{if(!have.has(a)||audState.prod[a]||!e||!e.state)return;
    const st=e.state;if(!st.title)return;
    add.push({asin:a,domain:2,title:String(st.title).slice(0,300),brand:String(st.brand||'').slice(0,80),image:'',
      price:+st.buy||null,rank:null,root:'',mo:+st.spm||null,fba:null,source:'ours',fetched_at:nowIso()});}));
  if(add.length){add.forEach(r=>audState.prod[r.asin]=r);audProdSaveLocal();}
  return add.length;}
async function audTokensLeft(){try{const r=await fetch(WORKER+'/health');const j=await r.json();return j&&j.tokensLeft!=null?j.tokensLeft:null;}catch(e){return null;}}
/* returns how many it loaded. quiet:true = no confirm, used by the automatic pass */
async function audLoadDetails(asins,quiet,onBatch){const need=asins.filter(a=>!audState.prod[a]||audState.prod[a].source==='ours'||!audState.prod[a].asked);
  if(!need.length)return 0;let got=0;
  for(let i=0;i<need.length;i+=100){const part=need.slice(i,i+100);
    try{const r=await fetch(WORKER+'/keepa?path=product&domain=2&stats=30&asin='+part.join(','));const j=await r.json();
      const rows=(j.products||[]).map(audFromKeepa).filter(Boolean);
      if(rows.length){audSaveProducts(rows);got+=rows.length;if(onBatch)onBatch(got,need.length);}
      if(j.error)break;}
    catch(e){break;}}
  return got;}
/* b66 (Jack: "if we find the lead but don't sell it, can that be automated?") — yes: a product that was a lead on one of
   our filters, that nobody bought, sitting on a rival's shelf we do not sell on, IS a missed lead. Marked for him as
   'auto' with the reason filled in; one key press overrides it. Never touches a product that already has an answer. */
function audAutoMissed(sh){const V=audAll();const O=auOurs();const now=nowIso();const rows=[];
  sh.items.forEach(it=>{if(V[it.a]||audSells(sh.id,it.a))return;const o=O[it.a];if(!o||o.said==='Yes')return;
    const reason=o.said==='No'?'Passed on it':o.said?'Passed on it':'Never looked at';
    const row=audRow(it.a,'missed','auto',sh.seller||sh.id,now);row.reason=reason;row.note=(o.src||'')+(o.saidBy?' · '+o.saidBy+' said '+o.said:'');
    V[it.a]=row;rows.push(row);});
  if(rows.length){audSave(V);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows});}
  return rows.length;}
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
/* b151: `reason` lets one press set the verdict AND which Discord / why missed — so a bulk "Discord · PS" is one batch and one undo */
function audJudge(asins,code,sellerId,reason){if(!needMe())return;const who=me();const now=nowIso();const batch=[];const m=audAll();
  asins.forEach(a=>{const cur=m[a]||null;const p=audPress(a,cur,code,who,sellerId,now);
    if(p.same){if(!reason||(cur&&cur.reason===reason))return;
      const row=Object.assign({},cur,{reason,at:now});batch.push({asin:a,prev:Object.assign({},cur),row});m[a]=row;return;}
    const row=reason?Object.assign({},p.row,{reason}):p.row;
    batch.push({asin:a,prev:cur?Object.assign({},cur):null,row});m[a]=row;});
  if(!batch.length)return;
  audSave(m);audUndoStack.push(batch);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:batch.map(b=>b.row)});
  return batch;}
function audUndo(){const b=audUndoStack.pop();if(!b)return false;const m=audAll();const del=[],up=[];
  b.forEach(({asin,prev,row})=>{if(prev){m[asin]=prev;up.push(prev);}else{delete m[asin];del.push(row.id);}});
  audSave(m);if(cloudEnabled()){if(up.length)audQueue({op:'up',table:'src_audit_verdicts',rows:up});if(del.length)audQueue({op:'del',table:'src_audit_verdicts',ids:del});}
  return b;}
function audSetReason(asin,reason){const m=audAll();const r=m[asin];if(!r)return;r.reason=r.reason===reason?'':reason;r.at=nowIso();
  audSave(m);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:[r]});}
function audSetReasonMany(asins,reason){const m=audAll();const batch=[];const now=nowIso();
  asins.forEach(a=>{const r=m[a];if(!r||r.reason===reason)return;const row=Object.assign({},r,{reason,at:now});batch.push({asin:a,prev:Object.assign({},r),row});m[a]=row;});
  if(!batch.length)return null;audSave(m);audUndoStack.push(batch);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:batch.map(b=>b.row)});return batch;}
function audSetNote(asin,note){const m=audAll();const r=m[asin];if(!r)return;r.note=(note||'').slice(0,200);
  audSave(m);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:[r]});}

/* ============ the page ============ */
const AU_SORTS=[['sold','Sells the most a month'],['shelf','Newest on their shelf'],['price','Dearest first · high ticket'],['cheap','Cheapest first'],['rank','Best sales rank'],['few','Fewest sellers on it'],['many','Most sellers on it'],['title','Name A–Z']];
const auView=Object.assign({mode:'list',shelf:null,tab:{},focus:0,q:'',order:null,stay:new Set(),sel:new Set(),secs:[],lastAt:0,follow:false,sort:'sold',band:'ALL',vol:'0',sellers:'0',cards:null},lsGet(AUD.VIEW,{})||{});
function auSave(){lsSet(AUD.VIEW,{cards:auView.cards,tab:auView.tab,secs:auView.secs.slice(-40),follow:!!auView.follow,sort:auView.sort,band:auView.band,vol:auView.vol,sellers:auView.sellers});}
/* b66: "Keepa follows me" — one Keepa tab, reused, showing whatever product you are on. Opened from a key or click, so no popup block. */
function auFollow(){if(!auView.follow||auView.mode!=='audit')return;const sh=audShelf(auView.shelf);if(!sh)return;const it=auVisible(sh)[auView.focus];if(!it)return;
  try{window.open('https://keepa.com/#!product/2-'+it.a,'bdl-audit-keepa');}catch(e){}}
function auUk(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return'';const x=new Date(+m[1],+m[2]-1,+m[3]);
  return x.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function auDays(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return 999;return Math.round((new Date(today())-new Date(+m[1],+m[2]-1,+m[3]))/864e5);}
function auAgo(d){const n=auDays(d);return n<=0?'today':n===1?'yesterday':n+' days ago';}
function auOurs(){if(!auView._ours||auView._oursAt!==runsAll().length+'|'+Object.keys(verdAll()).length){auView._ours=audOurIndex(runsAll(),leadAll(),verdAll());auView._oursAt=runsAll().length+'|'+Object.keys(verdAll()).length;}return auView._ours;}
function auCounts(sh){const V=audAll();const c={todo:0,all:sh.items.length,had:0,sell:0,judged:0,byHand:0,auto:0};audTypes().forEach(t=>c[t.code]=0);const O=auOurs();
  sh.items.forEach(it=>{const sells=audSells(sh.id,it.a);const st=audStatus(V[it.a],sells);
    if(st==='todo')c.todo++;else{c.judged++;if(st==='jointauto'){c.joint++;c.auto++;}else{if(V[it.a]&&V[it.a].who==='auto')c.auto++;else c.byHand++;if(c[st]!=null)c[st]++;}}
    if(sells)c.sell++;if(O[it.a])c.had++;});return c;}
function auLastAudit(sh){let at='';const V=audAll();sh.items.forEach(it=>{const v=V[it.a];if(v&&v.seller_id===sh.seller&&v.at>at)at=v.at;});return at?at.slice(0,10):'';}
function auNewSince(sh){const la=auLastAudit(sh);if(!la)return 0;const V=audAll();return sh.items.filter(it=>!it.base&&it.first>la&&audStatus(V[it.a],audSells(sh.id,it.a))==='todo').length;}
function auAv(name){const cs=['#A78BFA','#22D3EE','#2CE38B','#FFB224','#FF8A3D','#8C95FF','#F472B6'];let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;return cs[h%cs.length];}
function auIni(n){return String(n).split(/[\s·]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';}
function auDonut(c,size){const segs=audTypes().map(t=>[c[t.code]||0,t.hex]).concat([[c.todo,'rgba(255,255,255,.10)']]);
  const tot=segs.reduce((a,[n])=>a+n,0)||1;let off=25;const R=15.9155;
  return`<svg class="audonut" viewBox="0 0 42 42" style="width:${size||78}px;height:${size||78}px">${segs.filter(([n])=>n).map(([n,col])=>{const p=n/tot*100;const el=`<circle cx="21" cy="21" r="${R}" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${off}"/>`;off-=p;return el;}).join('')}<text x="21" y="21.6" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor">${c.todo.toLocaleString()}</text><text x="21" y="26.4" text-anchor="middle" font-size="3.4" font-weight="700" fill="currentColor" opacity=".6">LEFT</text></svg>`;}
function auSyncNote(){const n=audOut().length;if(!cloudEnabled())return'<span class="ausync off">Sandbox · nothing leaves this browser</span>';
  if(audState.tables===false)return'<span class="ausync bad">Audit tables not created yet — run the SQL once. Your answers are saved here and will send themselves.</span>';
  return n?`<span class="ausync">${n} answer${n===1?'':'s'} to send</span>`:'<span class="ausync ok">Saved for everyone</span>';}
function audPaintSync(){const el=$('#auSync');if(el)el.outerHTML=auSyncNote().replace('<span class="','<span id="auSync" class="');}

const AU_ANCHOR={top:null,want:false};
/* called by the things that move the cursor, so only a deliberate press pins the page */
function auPin(){const el=document.querySelector('.aurow.focus');
  AU_ANCHOR.top=el?el.getBoundingClientRect().top:null;AU_ANCHOR.want=!!el;}
/* b141 (Jack, 22 Sep: "still very jumpy whenever I press anything"). Two causes, both gone now.
   (1) The row's buttons appeared only on the row you were on, so every press grew one row and shrank another and
       the list shuffled under your hand. b92 and b99 tried to CORRECT that with scroll maths; the row simply does
       not change height any more, so there is nothing to correct.
   (2) Every press rebuilt the entire page — header, tabs, selects, list, panel. Now a press repaints the list, the
       panel and the numbers, and leaves everything else alone. */
function auPaintCounts(sh){const c=auCounts(sh);const host=$('#page-audit');if(!host)return;
  const bar=host.querySelector('.auprog .aubar');
  if(bar)bar.innerHTML=audTypes().map(t=>c[t.code]?`<i style="width:${c[t.code]/c.all*100}%;background:${t.hex}" title="${c[t.code]} ${escapeHtml(t.label)}"></i>`:'').join('');
  const secs=auView.secs.length?auView.secs.reduce((a,b)=>a+b,0)/auView.secs.length:6;
  const line=host.querySelector('.aupline');
  if(line){const b=line.querySelector('b'),s=line.querySelector('span');
    if(b)b.textContent=`${c.todo.toLocaleString()} left of ${c.all.toLocaleString()}`;
    if(s)s.textContent=c.todo?`about ${Math.max(1,Math.round(c.todo*secs/60))} min · ${c.byHand.toLocaleString()} judged${c.auto?` · ${c.auto.toLocaleString()} marked for you`:''}`:'all done';}
  host.querySelectorAll('.autabs [data-tab]').forEach(el=>{const k=el.dataset.tab;const n=k==='all'?c.all:(c[k]||0);
    const b=el.querySelector('b');if(b)b.textContent=n;el.classList.toggle('zero',!n);});}
/* b152 (Jack, 25 Sep: "still very jumping when I click it"). Measured: judging the row near the bottom of the screen moved the
   focus to the next row, which was off-screen, and the page scrolled 230px under the mouse. A CLICK never scrolls now — you are
   looking at the row you clicked, and the next row's buttons are right there. The KEYBOARD still keeps its row on screen, but
   when it has to scroll it puts the row a third of the way down, so the next few presses do not scroll at all (it used to nudge
   on every press once you reached the bottom). */
function auKeepFocusVisible(){if(auView.fromMouse){auView.fromMouse=false;return;}
  const el=document.querySelector('.aurow.focus');if(!el)return;
  const r=el.getBoundingClientRect();if(r.top>=64&&r.bottom<=innerHeight-20)return;
  window.scrollTo({top:Math.max(0,r.top+window.scrollY-Math.round(innerHeight/3)),behavior:'smooth'});}
function auQuickRender(){if(auView.mode!=='audit')return false;const sh=audShelf(auView.shelf);if(!sh)return false;
  const host=$('#page-audit');const list=host&&host.querySelector('.aulist');if(!list)return false;
  const tab=auView.tab[sh.id]||'todo';const c=auCounts(sh);
  if(tab==='todo'&&!c.todo&&!auView.q)return false;                 /* the shelf is finished — that screen is a different page */
  const vis=auVisible(sh);if(!vis.length)return false;
  if(auView.focus>=vis.length)auView.focus=Math.max(0,vis.length-1);
  const page=vis.slice(0,AUD.PAGE);
  list.innerHTML=page.map((it,i)=>auRow(it,i,sh)).join('')+(vis.length>AUD.PAGE?`<div class="aumore">Showing the first ${AUD.PAGE} of ${vis.length}. Judge these and the rest follow.</div>`:'');
  const panel=host.querySelector('.aupanel');if(panel)panel.innerHTML=auPanel(vis[auView.focus],sh);
  auPaintCounts(sh);auKeepFocusVisible();
  const cur=vis[auView.focus];if(cur)auLoadGraph(cur.a);
  return true;}
function auRefresh(){if(!auQuickRender())renderAudit();auPaintBulk();}
/* b151 (Jack, 24 Sep: "add a way to bulk audit and click — a load of these are lead group, Discord, and I know which one").
   Tick rows on their picture (shift-click ticks a run), and a bar pinned to the bottom of the screen judges every ticked row in
   one press — including WHICH Discord, as one click. It floats over the page, so ticking never moves a single row. One press is
   one undo. The keyboard already worked this way (shift + arrow, then 1-6); now the mouse does too, and Q / W / E set the reason
   on every ticked row. */
function auPaintBulk(){let el=document.getElementById('auBulk');const pg=document.getElementById('page-audit');
  const on=!!(pg&&pg.classList.contains('active'))&&auView.mode==='audit'&&auView.sel&&auView.sel.size>0&&!!audShelf(auView.shelf);
  document.body.classList.toggle('au-selecting',on);
  if(!on){if(el){el.hidden=true;el.innerHTML='';}return;}
  if(!el){el=document.createElement('div');el.id='auBulk';el.className='aubulk';document.body.appendChild(el);
    el.addEventListener('click',e=>{const t=e.target;const sh=audShelf(auView.shelf);if(!sh)return;
      if(t.closest('[data-bclear]')){auView.sel=new Set();auView.lastSel=null;auRefresh();return;}
      if(t.closest('[data-ball]')){auView.sel=new Set(auVisible(sh).map(it=>it.a));auRefresh();return;}
      const more=t.closest('[data-bmore]');if(more){auView.bulkOpen=auView.bulkOpen===more.dataset.bmore?null:more.dataset.bmore;auPaintBulk();return;}
      const b=t.closest('[data-bv]');if(b){auView.bulkOpen=null;auView.fromMouse=true;auJudgeNow([...auView.sel],b.dataset.bv,b.dataset.br||'');}});}
  const sh=audShelf(auView.shelf);const n=auView.sel.size,shown=auVisible(sh).length;
  const btn=(t,idx)=>{const k=`<kbd>${idx+1}</kbd>`;
    if(t.reasons&&t.reasons.length<=3)return`<span class="bgrp" style="--c:${t.hex}"><span class="bl">${AU_ICON[t.icon]||''}${escapeHtml(t.short||t.label)}</span>${t.reasons.map(r=>`<button type="button" class="bb" data-bv="${t.code}" data-br="${escapeHtml(r)}" title="Mark all ${n} ${escapeHtml(t.label)} · ${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}</span>`;
    if(t.reasons)return`<button type="button" class="bb${auView.bulkOpen===t.code?' open':''}" style="--c:${t.hex}" data-bmore="${t.code}" title="${escapeHtml(t.label)} — pick why">${k}${AU_ICON[t.icon]||''}${escapeHtml(t.short||t.label)} ▾</button>`;
    return`<button type="button" class="bb" style="--c:${t.hex}" data-bv="${t.code}" title="Mark all ${n} ${escapeHtml(t.label)} · key ${idx+1}">${k}${AU_ICON[t.icon]||''}${escapeHtml(t.short||t.label)}</button>`;};
  const types=audTypes();const open=types.find(t=>t.code===auView.bulkOpen);
  el.hidden=false;
  el.innerHTML=`<div class="bmain"><span class="bn"><b>${n}</b> ticked</span><span class="bsep"></span>${types.map(btn).join('')}<span class="bsep"></span>
      ${n<shown?`<button type="button" class="bl2" data-ball="1">Tick all ${shown} shown</button>`:''}<button type="button" class="bl2" data-bclear="1">Clear <kbd>Esc</kbd></button></div>
    ${open?`<div class="bwhy" style="--c:${open.hex}"><span>${escapeHtml(open.prompt||'Why?')}</span>${open.reasons.map(r=>`<button type="button" class="bb" data-bv="${open.code}" data-br="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}</div>`:''}`;
  /* b153: the toast sits exactly above the bar, however tall the bar is */
  document.documentElement.style.setProperty('--bulk-h',el.offsetHeight+'px');}
function auToggleSel(asin,i,range){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);
  if(range&&auView.lastSel!=null){const a=Math.min(auView.lastSel,i),b=Math.max(auView.lastSel,i);for(let k=a;k<=b;k++)if(vis[k])auView.sel.add(vis[k].a);}
  else{if(auView.sel.has(asin))auView.sel.delete(asin);else auView.sel.add(asin);}
  auView.lastSel=i;auRefresh();}
function renderAudit(){const host=$('#page-audit');if(!host)return;
  document.body.classList.toggle('auditing',auView.mode==='audit');
  if(!isJack()){host.innerHTML=`<div class="card"><div class="empty"><span>The storefront audit is Jack's. Pick your name top right if this is you.</span></div></div>`;return;}
  if(auView.mode==='audit'&&auView.shelf&&audShelf(auView.shelf))auRenderOne();else auRenderList();
  if(typeof auPaintBulk==='function')auPaintBulk();}
/* b69 (Jack: "highest % of products I sell too") — the rival you overlap with most is the one worth auditing,
   because everything on their shelf you do not sell is a lead you have not found yet. */
function auOverlap(c){return c.all?c.sell/c.all:0;}
/* b100 (Jack: "add a sort by"). 39 rivals was one fixed order — most overlap first — and no way to ask a
   different question of the list. These are the questions worth asking, in the words of the answer. */
const AU_RSORTS=[['overlap','You sell the most of theirs'],['leads','Most were our leads'],
  ['todo','Fewest left to judge'],['most','Most left to judge'],['size','Biggest shelf'],
  ['done','Least recently audited'],['name','Name A-Z']];
function auRsort(){return AU_RSORTS.some(x=>x[0]===auView.rsort)?auView.rsort:'overlap';}
function auRankRivals(rows){const by={
  overlap:(a,b)=>auOverlap(b.c)-auOverlap(a.c)||b.c.todo-a.c.todo,
  leads:(a,b)=>(b.c.had||0)-(a.c.had||0)||auOverlap(b.c)-auOverlap(a.c),
  todo:(a,b)=>(a.c.todo||0)-(b.c.todo||0)||auOverlap(b.c)-auOverlap(a.c),
  most:(a,b)=>(b.c.todo||0)-(a.c.todo||0)||auOverlap(b.c)-auOverlap(a.c),
  size:(a,b)=>(b.c.all||0)-(a.c.all||0),
  /* never audited first — those are the ones with everything still to find */
  done:(a,b)=>String(a.la||'').localeCompare(String(b.la||''))||auOverlap(b.c)-auOverlap(a.c),
  name:(a,b)=>String(a.sh.name||'').localeCompare(String(b.sh.name||''))}[auRsort()];
  return rows.sort(by);}
function auNextShelf(fromId){const L=audShelfList().map(sh=>({sh,c:auCounts(sh)})).filter(x=>x.sh.id!==fromId&&x.c.todo>0)
  .sort((a,b)=>auOverlap(b.c)-auOverlap(a.c)||b.c.todo-a.c.todo);return L[0]?L[0].sh:null;}
function auRenderList(){auView.mode='list';const shelves=audShelfList();
  if(auView.cards===null)auView.cards=shelves.length<=8;   /* a few rivals read better as cards, 39 do not */const V=audAll();const O=auOurs();
  const rows=auRankRivals(shelves.map(sh=>({sh,c:auCounts(sh),la:auLastAudit(sh),nw:auNewSince(sh)})));
  const seen=new Set();let todo=0,had=0,sell=0,missed=0;
  shelves.forEach(sh=>sh.items.forEach(it=>{if(seen.has(it.a))return;seen.add(it.a);const st=audStatus(V[it.a],audSells(sh.id,it.a));
    if(st==='todo')todo++;if(st==='missed')missed++;if(audSells(sh.id,it.a))sell++;const o=O[it.a];if(o&&o.said!=='Yes')had++;}));
  const k=(v,l,s,cls)=>`<div class="kpi"><div><div class="kv ${cls||''}">${v}</div><div class="kl">${l}</div>${s?`<div class="ks">${s}</div>`:''}</div></div>`;
  const stat=x=>!x.la?`<span class="aupill p-todo">Never audited</span>`:x.nw?`<span class="aupill p-todo">${x.nw} new since your audit</span>`:x.c.todo?`<span class="aupill p-todo">${x.c.todo} to do</span>`:`<span class="aupill p-joint">Up to date</span>`;
  $('#page-audit').innerHTML=`<div class="card">
    <div class="cardhead"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg></span><h2>Storefront audits</h2>
      <span class="sub">One pass per rival. After that only their new lines come back. An answer belongs to the product, so it counts on every shelf.</span>
      <div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}<label class="ausortby"><span>Order</span><select id="auRsort">${AU_RSORTS.map(([v,l])=>`<option value="${v}"${auRsort()===v?' selected':''}>${l}</option>`).join('')}</select></label><button class="btn ghost sm" id="auCards" type="button">${auView.cards?'Show as a list':'Show as cards'}</button><button class="btn ghost sm" id="auRefresh" type="button">Refresh shelves</button>${(()=>{const n=auNextShelf(null);const c=n?auCounts(n):null;return n?`<button class="btn primary sm" type="button" data-open="${escapeHtml(n.id)}">${ICONS.run}${c.byHand?'Carry on':'Start'} · ${escapeHtml(n.name)} · ${c.todo.toLocaleString()} left</button>`:'';})()}</div></div>
    ${shelves.length?`<div class="kpis aukpis">
      ${k(shelves.length,'Rivals with a saved shelf','from OA Overview, plus any you add')}
      ${k(seen.size.toLocaleString(),'Products','each judged once, everywhere')}
      ${k(todo.toLocaleString(),'Still to judge','','iris')}
      ${k(had.toLocaleString(),'Were our leads','on one of our filters, nobody said Yes','amber')}
      ${k(sell.toLocaleString(),'You already sell','joint leads, auto-marked','jade')}</div>`:''}
    ${shelves.length?(auView.cards?`<div class="aucards">${rows.map(x=>`<button class="aucard" type="button" data-open="${escapeHtml(x.sh.id)}">
      <div><div class="top"><span class="auav" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span>
        <div><div class="nm">${escapeHtml(x.sh.name)}</div><div class="meta">${x.sh.items.length.toLocaleString()} products · ${x.la?'last audited '+auUk(x.la)+' ('+auAgo(x.la)+')':'not audited yet'}</div></div></div>
        <div class="facts">${stat(x)}${x.c.sell?`<span class="aupill p-joint">${Math.round(auOverlap(x.c)*100)}% you sell too · ${x.c.sell}</span>`:''}${x.c.had?`<span class="aupill p-had">${x.c.had} were our leads</span>`:''}</div>
        <div class="prog"><b>${x.c.todo.toLocaleString()}</b> left to judge${x.c.byHand?` · ${x.c.byHand.toLocaleString()} you judged`:''}${x.c.auto?` · ${x.c.auto.toLocaleString()} marked for you`:''}</div></div>${auDonut(x.c)}</button>`).join('')}</div>`
      :`<div class="tablewrap show"><div class="tablescroll"><table class="logtbl autbl"><thead><tr><th>Rival</th><th class="r">You sell too</th><th class="r">Were our leads</th><th class="r">Left to judge</th><th class="r">Products</th><th>Last audited</th><th></th></tr></thead><tbody>
        ${rows.map(x=>`<tr data-open="${escapeHtml(x.sh.id)}"><td class="lsrc"><div class="lrow"><span class="auav sm" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span><div><b>${escapeHtml(x.sh.name)}</b><div class="chg">${x.la?'audited '+auUk(x.la):'never audited'}${x.nw?' · '+x.nw+' new since':''}</div></div></div></td>
        <td class="num"><b class="${auOverlap(x.c)>=0.15?'jade':''}">${Math.round(auOverlap(x.c)*100)}%</b><div class="chg">${x.c.sell}</div></td>
        <td class="num"><b class="${x.c.had?'amber':''}">${x.c.had}</b></td>
        <td class="num"><b>${x.c.todo.toLocaleString()}</b>${x.c.byHand?`<div class="chg">${x.c.byHand} judged</div>`:''}</td>
        <td class="num">${x.c.all.toLocaleString()}</td>
        <td class="lwhen">${x.la?auAgo(x.la):'—'}</td>
        <td class="num"><span class="btn primary xs">Audit →</span></td></tr>`).join('')}</tbody></table></div></div>`)
      :`<div class="empty"><span>${cloudEnabled()?'No shelves yet. OA Overview saves each rival’s shelf on its next fetch, or add a list below.':'Cloud is off in the sandbox, so OA Overview’s rival shelves are not here. Paste a list of ASINs below to try the screen.'}</span></div>`}
    <details class="auadd"><summary>Add a shelf that is not on the list</summary>
    <div class="ausplit">
      <div class="aubox"><h3>Pull any storefront</h3><p class="ssub">A seller who is not on OA Overview's list. Keepa returns their whole shelf through your Worker.</p>
        <div class="row"><input class="txt" id="auSeller" placeholder="Seller ID, e.g. A3P5ROKL5A1OLE" autocomplete="off"><button class="btn solid sm" id="auPull" type="button">Pull · about 10 tokens</button></div></div>
      <div class="aubox"><h3>Audit a list of ASINs</h3><p class="ssub">Paste ASINs, or drop any Keepa export here. An export brings the titles and pictures with it, free.</p>
        <div class="row"><input class="txt" id="auName" placeholder="Name this list" autocomplete="off" style="max-width:170px"><textarea class="txt" id="auAsins" placeholder="B0CNXZYW75, B07X63KLLH …" rows="2"></textarea><button class="btn solid sm" id="auAdd" type="button">Start</button></div>
        <div class="audrop" id="auDrop">Drop a Keepa export here</div><input type="file" id="auFile" accept=".csv,text/csv" multiple hidden></div>
    </div></details></div>`;}

function auVisible(sh){const V=audAll();const q=auView.q.toLowerCase();const tab=auView.tab[sh.id]||'todo';const O=auOurs();
  /* b141 (Jack, 22 Sep: "how is highest ticket first showing a 16 pound lead?"). The order is frozen on purpose so rows
     do not leap about as you judge them — but it was frozen BEFORE the prices arrived, so "dearest first" ranked a shelf
     where almost every price was still 0. It now re-freezes when the sort, the tab or the number of loaded prices changes.
     Judging changes none of those, so the list still holds still while you work. */
  const AU_SORTF={price:'price',cheap:'price',sold:'mo',rank:'rank',few:'sellers',many:'sellers',title:'title'};
  const kf=AU_SORTF[auView.sort];   /* count only what THIS sort reads, so the order re-freezes the moment those numbers land */
  const known=kf?sh.items.filter(it=>{const p=audState.prod[it.a];if(!p)return false;
    return kf==='sellers'?!!(+p.fba||+p.offers):(kf==='title'?!!p.title:!!+p[kf]);}).length:sh.items.length;
  const osig=[sh.id,auView.sort,tab,known].join('|');
  if(auView._osig!==osig){auView.order=null;auView._osig=osig;}
  if(!auView.order){const P=audState.prod;const num=(a,f)=>{const x=P[a.a]||{};return +x[f]||0;};
    const by={shelf:(a,b)=>String(b.first||'').localeCompare(String(a.first||'')),
      sold:(a,b)=>num(b,'mo')-num(a,'mo'),price:(a,b)=>num(b,'price')-num(a,'price'),
      cheap:(a,b)=>(num(a,'price')||1e9)-(num(b,'price')||1e9),
      rank:(a,b)=>(num(a,'rank')||1e9)-(num(b,'rank')||1e9),
      few:(a,b)=>((num(a,'fba')||num(a,'offers')||1e9)-(num(b,'fba')||num(b,'offers')||1e9)),
      many:(a,b)=>((num(b,'fba')||num(b,'offers')||0)-(num(a,'fba')||num(a,'offers')||0)),
      title:(a,b)=>String((P[a.a]||{}).title||a.a).localeCompare(String((P[b.a]||{}).title||b.a))}[auView.sort]||((a,b)=>0);
    const o=sh.items.slice().sort((a,b)=>{const sa=audStatus(V[a.a],audSells(sh.id,a.a))==='todo'?0:1,sb=audStatus(V[b.a],audSells(sh.id,b.a))==='todo'?0:1;
      return (sa-sb)||by(a,b);});auView.order={};o.forEach((it,i)=>auView.order[it.a]=i);}
  const list=sh.items.filter(it=>{const st=audStatus(V[it.a],audSells(sh.id,it.a));
    if(tab==='todo'&&st!=='todo'&&!auView.stay.has(it.a))return false;
    if(tab==='had'&&!O[it.a])return false;
    if(tab==='sell'&&!(audSells(sh.id,it.a)||st==='joint'))return false;
    if(audType(tab)&&st!==tab&&!(tab==='joint'&&st==='jointauto'))return false;
    const p=audState.prod[it.a]||{};const pr=+p.price||0,mo=+p.mo||0;
    if(auView.band==='a'&&!(pr&&pr<20))return false;
    if(auView.band==='b'&&!(pr>=20&&pr<60))return false;
    if(auView.band==='c'&&!(pr>=60))return false;
    if(+auView.vol>0&&!(mo>=+auView.vol))return false;
    const sellers=+p.fba||+p.offers||0;
    if(+auView.sellers>0&&sellers&&sellers>=+auView.sellers)return false;   /* unknown counts stay: they are not "many sellers", they are "not loaded" */
    if(q){if(!((it.a+' '+(p.title||'')+' '+(p.brand||'')).toLowerCase().includes(q)))return false;}return true;});
  list.sort((a,b)=>(auView.order[a.a]==null?1e9:auView.order[a.a])-(auView.order[b.a]==null?1e9:auView.order[b.a]));
  return list;}
const AU_LINK_ICON={amazon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h2l2.4 10.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 9H7"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>',
  keepa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 4-6 5 4"/><path d="M3 21h18"/></svg>',
  sas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M9 11h4M11 9v4"/></svg>'};
/* b81 (Jack, 17 Sep): "can we have a mini tile for if things were found via our brand or filter thingy".
   The chip already knew it was ours; it just would not say WHICH of ours. Now it names the source and
   wears that person's colour, so a shelf reads at a glance: purple dot = Mera found it, yellow = Suz.
   Source names are long ("Mera · electricals £60+"), so the owner half is dropped — the dot says who. */
function auSrcShort(name){const s=String(name||'').trim();
  const i=s.indexOf('\u00b7');                       /* "Suz · A2A £10-40" -> "A2A £10-40" */
  let out=(i>=0?s.slice(i+1):s).trim();
  out=out.replace(/\s*\((retired|weak|dead)\)\s*$/i,'').trim();
  return out.length>22?out.slice(0,21).trim()+'\u2026':out;}
/* b82 (Jack, 17 Sep): "what if it was on the filter or brands that was ran and stored as being a lead but
   we haven't sold it or bought it — that way i can see how and why the analysis was right or wrong".
   This is the feedback loop the app never had. A rival is selling the thing we found and passed on, so the
   one number that settles it is TODAY'S price against the sell price the rule promised at the time.
   Nothing here is a rule. It reports, it does not judge, and it never changes a lead. */
function auReview(o,nowPrice){
  if(!o||!o.sell)return null;
  if(!(nowPrice>0))return{tone:'flat',line:'No price on their shelf yet, so there is nothing to check it against.'};
  const sell=+o.sell,buy=+o.buy||0,gap=nowPrice/sell;
  const spread=buy?r2(nowPrice-buy):null;
  const over=Math.round((1-gap)*100);        /* + = our sell was above today */
  let tone,line;
  if(gap>=0.95&&gap<=1.15){tone='good';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — that call held.`;}
  else if(gap>1.15){tone='good';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — we were ${Math.round((gap-1)*100)}% UNDER, the lead was better than we scored it.`;}
  else if(gap>=0.5){tone='warn';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — ${over}% high, so the ROI we quoted was flattering.`;}
  else {tone='bad';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — ${gap?(1/gap).toFixed(1):'?'}\u00d7 out. That ROI never existed.`;}
  const now=buy?(spread>0
      ?`At ${gbp(buy)} buy and ${gbp(nowPrice)} sell that is ${gbp(spread)} gross a unit before fees.`
      :`At ${gbp(buy)} buy it loses ${gbp(Math.abs(spread))} a unit at today's price before any fees — passing was right.`):'';
  return{tone,line,now};
}
function auLinks(asin){return[['Amazon','https://www.amazon.co.uk/dp/'+asin,'O','amazon'],['Keepa','https://keepa.com/#!product/2-'+asin,'K','keepa'],['SellerAmp','https://sas.selleramp.com/sas/lookup?search_term='+asin,'S','sas']]
    .map(([l,h,key,ic])=>`<a class="aulk ${ic}" href="${h}" target="_blank" rel="noopener" title="Open on ${l} · key ${key}" data-stop>${AU_LINK_ICON[ic]}<span>${l}</span></a>`).join('');}
function auRow(it,i,sh){const V=audAll();const v=V[it.a];const p=audState.prod[it.a]||{};const sells=audSells(sh.id,it.a);const st=audStatus(v,sells);
  const o=auOurs()[it.a];const t=audType(st);const newShelf=!it.base&&auDays(it.first)<=14;
  const btns=audTypes().map((x,n)=>{const on=(v&&v.verdict===x.code)||(st==='jointauto'&&x.code==='joint');
    return`<button type="button" class="aub ${on?'on':''}${st==='jointauto'&&x.code==='joint'?' auto':''}" style="--c:${x.hex}" data-v="${x.code}" data-a="${it.a}" title="${escapeHtml(x.label)} · key ${n+1}"><kbd>${n+1}</kbd>${AU_ICON[x.icon]||''}<span class="lab">${escapeHtml(x.short||x.label)}</span></button>`;}).join('');
  /* b141: the reason chips take the buttons' place instead of opening a new line under them, so the row keeps its height */
  const reasons=v&&audType(v.verdict)&&audType(v.verdict).reasons&&!v.reason
    ?`<div class="aureasons" style="--c:${audType(v.verdict).hex}">${audType(v.verdict).prompt||'Why?'}${audType(v.verdict).reasons.map((x,n)=>`<button type="button" class="aurs ${v.reason===x?'on':''}" data-r="${escapeHtml(x)}" data-a="${it.a}"><kbd>${AU_RKEYS[n].toUpperCase()}</kbd>${escapeHtml(x)}</button>`).join('')}</div>`:'';
  const ourChip=o?(o.said==='Yes'?`<span class="aupill p-yes src" title="${escapeHtml('Found by '+o.src+' · '+o.day+' · score '+(o.score||0))}"><i class="sq" style="background:${auAv(o.owner||o.saidBy||'VAs')}"></i>${escapeHtml(auSrcShort(o.src))} · ${escapeHtml(o.saidBy||'we')} said Yes</span>`
      :`<span class="aupill p-had src" title="${escapeHtml('Found by '+o.src+' · '+o.owner+' · '+o.day+' · score '+(o.score||0)+' · buy '+gbp(o.buy)+' → sell '+gbp(o.sell)+' · '+(o.roi||0)+'% ROI'+(o.runs>1?' · seen on '+o.runs+' runs':''))}"><i class="sq" style="background:${auAv(o.owner||'VAs')}"></i>${escapeHtml(auSrcShort(o.src))}${o.roi!=null&&o.roi!==''?' · '+o.roi+'%':''}${o.said?' · they said '+escapeHtml(o.said):' · nobody said Yes'}</span>`):'';
  const judged=v?`<span class="aupill p-muted" title="${escapeHtml((audType(v.verdict)||{}).label+' · '+v.who+' · '+auUk(v.at)+(v.reason?' · '+v.reason:'')+(v.note?' · '+v.note:''))}"><i class="sq" style="background:${(audType(v.verdict)||{}).hex||'#888'}"></i>${v.who==='auto'?'marked for you':escapeHtml(v.who)+' · '+auUk(v.at)}${v.reason?' · '+escapeHtml(v.reason):''}</span>`:'';
  /* b141 (Jack, 22 Sep: "are ASINs I press Not lead on another store saving, so another storefront has it down as not a lead too?").
     Yes — one answer per product, by design, and it has always been so. What was missing is the row saying so, which is why a shelf
     could open with rows already marked and no clue where that came from. */
  const elsewhere=v&&v.seller_id&&sh.seller&&v.seller_id!==sh.seller;
  const fromShelf=elsewhere?((audShelf(v.seller_id)||{}).name||v.seller_id):'';
  const links=auLinks(it.a);
  const sellers=+p.fba||+p.offers||0;
  /* b141: a missing price now says which kind of missing it is, instead of showing nothing at all */
  const priceBit=p.price?`<b class="aup">${gbp(p.price)}</b>${p.pricefrom==='3p'?'<i class="aupf" title="No Buy Box and Amazon is not selling it — this is the cheapest live third-party offer">3P</i>':p.pricefrom==='amz'?'<i class="aupf" title="No Buy Box — this is Amazon\u2019s own price">AMZ</i>':''}`
    :(p.asked||p.source?'<i class="aunop" title="Keepa has no Buy Box, no Amazon and no live offer for this ASIN right now">no price on Keepa</i>':'<i class="aunop dim" title="Nobody has loaded this product\u2019s details yet — use the Keepa Viewer (free) or load with tokens">details not loaded</i>');
  /* b141: short units so the whole line fits one row at laptop width — "1,000/mo" not "1,000 a month" */
  const money=[priceBit,p.rank?'#'+(+p.rank).toLocaleString():'',p.mo?`<b class="aumo">${(+p.mo).toLocaleString()}/mo</b>`:'',sellers?sellers+(sellers===1?' seller':' sellers'):''].filter(Boolean).join(' · ');
  const landed=auView.landed&&auView.landed.a===it.a&&Date.now()-auView.landed.at<600?' landed':'';
  return`<div class="aurow ${i===auView.focus?'focus':''} ${auView.sel.has(it.a)?'sel':''} ${st!=='todo'?'judged':''}${reasons?' reasoning':''}${elsewhere?' elsewhere':''}${landed}" data-i="${i}" data-a="${it.a}" style="--edge:${st==='todo'?'var(--iris)':(t?t.hex:(st==='jointauto'?'#2CE38B':'var(--line2)'))}">
    <div class="auimg">${p.image?`<img loading="lazy" src="${escapeHtml(p.image)}" alt="">`:escapeHtml(it.a.slice(0,2))}<button type="button" class="ausel" data-sel="${it.a}" data-i="${i}" aria-label="Select ${it.a}" title="Tick to judge several at once · shift-click ticks a run"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></button></div>
    <div class="aumain">
      <div class="aut" title="${escapeHtml(p.title||it.a)}">${escapeHtml(p.title||it.a)}</div>
      <div class="aufacts">
        <button type="button" class="auasin" data-copy="${it.a}" title="Copy ${it.a}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>${it.a}</button>
        ${money?`<span class="aumoney">${money}</span>`:''}
        ${newShelf?`<span class="new">new · ${auDays(it.first)}d</span>`:''}
      </div>
      ${sells||ourChip?`<div class="auchips">${sells?'<span class="aupill p-joint">You sell this too</span>':''}${ourChip}</div>`:''}</div>
    <div class="auright"><div class="aulinks">${links}</div>
      <div class="aumark">${v?`<span class="aupill big" style="--c:${(audType(v.verdict)||{}).hex}" title="${escapeHtml((audType(v.verdict)||{}).label+' · '+(v.who==='auto'?'marked for you':v.who+' · '+auUk(v.at))+(v.reason?' · '+v.reason:''))}"><i class="sq" style="background:${(audType(v.verdict)||{}).hex}"></i>${escapeHtml((audType(v.verdict)||{}).short||v.verdict)}${v.who==='auto'?' <i class="auauto">auto</i>':''}${elsewhere?` <i class="auelse" title="${escapeHtml('You gave this product that answer on '+fromShelf+' on '+auUk(v.at)+'. One answer per product — it shows on every shelf that carries it.')}">from ${escapeHtml(auSrcShort(fromShelf))}</i>`:''}</span>`
      :st==='jointauto'?`<span class="aupill big" style="--c:#2CE38B"><i class="sq" style="background:#2CE38B"></i>You sell this</span>`:''}</div></div>
    <div class="aubtns">${btns}<button type="button" class="aunext" data-next="1" title="Leave it and move to the next one · down arrow">Next <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg></button></div>${reasons}</div>`;}
function auRenderOne(){const sh=audShelf(auView.shelf);const c=auCounts(sh);const vis=auVisible(sh);const tab=auView.tab[sh.id]||'todo';
  if(auView.focus>=vis.length)auView.focus=Math.max(0,vis.length-1);
  const secs=auView.secs.length?auView.secs.reduce((a,b)=>a+b,0)/auView.secs.length:6;
  const la=auLastAudit(sh);const loaded=sh.items.filter(it=>audState.prod[it.a]).length;
  /* b87 (Jack: "improve these buttons"). Three jobs the old strip did badly: an empty verdict looked
     the same as a full one, the strip read as ten equal things when it is really three groups, and the
     one you are on barely stood out. Now: a colour dot only where the count means something, empty ones
     fade back, the count is a proper badge, and thin rules separate where you are / what we know / what
     you decided. The dot colour is the verdict's own, matching the 1-6 buttons on the row. */
  const tb=(key,label,n,col,dot)=>`<button type="button" class="${tab===key?'on':''}${n?'':' zero'}" data-tab="${key}" style="--c:${col||'var(--muted)'}" title="${escapeHtml(label+' · '+n)}">`
    +`${dot?'<i class="d"></i>':''}<span>${label}</span><b>${n}</b></button>`;
  const page=vis.slice(0,AUD.PAGE);
  $('#page-audit').innerHTML=`<div class="card">
    <div class="auhead"><button class="back" id="auBack" type="button" aria-label="Back to audits">${ICONS.back}</button>
      <span class="auav" style="background:${auAv(sh.name)}">${auIni(sh.name)}</span>
      <div><h2>${escapeHtml(sh.name)}</h2><div class="meta">${sh.items.length.toLocaleString()} products · ${la?'last audited '+auUk(la)+' ('+auAgo(la)+')':'first audit'}${sh.seller?' · seller '+escapeHtml(sh.seller):''}</div></div>
      <div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}
        ${sh.seller?`<a class="btn ghost sm" href="https://www.amazon.co.uk/s?me=${escapeHtml(sh.seller)}" target="_blank" rel="noopener">Their shelf</a><a class="btn ghost sm" href="https://keepa.com/#!seller/2-${escapeHtml(sh.seller)}" target="_blank" rel="noopener">Keepa seller</a>`:''}
        <button class="btn ${auView.follow?'primary':'ghost'} sm" id="auFollow" type="button" title="Opens whatever product you land on in one Keepa tab, so you never click Keepa">${auView.follow?'Keepa follows me · on':'Keepa follows me'}</button>
        <button class="btn ghost sm" id="auRest" type="button">Mark the rest Not lead</button>${(()=>{const n=auNextShelf(sh.id);return n?`<button class="btn primary sm" type="button" data-open="${escapeHtml(n.id)}" title="${escapeHtml(n.name)} · ${auCounts(n).todo} to do">Next rival →</button>`:'';})()}</div></div>
    <div class="auprog"><div class="aubar">${audTypes().map(t=>c[t.code]?`<i style="width:${c[t.code]/c.all*100}%;background:${t.hex}" title="${c[t.code]} ${escapeHtml(t.label)}"></i>`:'').join('')}</div>
      <div class="aupline"><b>${c.todo.toLocaleString()} left of ${c.all.toLocaleString()}</b><span>${c.todo?`about ${Math.max(1,Math.round(c.todo*secs/60))} min · ${c.byHand.toLocaleString()} judged${c.auto?` · ${c.auto.toLocaleString()} marked for you`:''}`:'all done'}</span>
        <span class="audet">${loaded} of ${sh.items.length} have pictures${loaded<sh.items.length?` · <button type="button" class="linkbtn" id="auViewer">Keepa Viewer (free)</button> · <button type="button" class="linkbtn" id="auTokens">load with tokens</button>`:''}</span></div>
      <div class="aunote" id="auNote2"></div></div>
    <div class="autabs">${tb('todo','To do',c.todo,'var(--iris)')}<i class="sep"></i>${tb('had','We had it',c.had,'#93A3BC',1)}${tb('sell','You sell',c.sell,'#2CE38B',1)}<i class="sep"></i>${audTypes().map(t=>tb(t.code,t.short||t.label,c[t.code],t.hex,1)).join('')}<i class="sep"></i>${tb('all','All',c.all)}
      <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="auQ" placeholder="Search title or ASIN" value="${escapeHtml(auView.q)}" autocomplete="off"><kbd>/</kbd></label></div>
    <div class="autools"><span class="l">Order</span><select id="auSort">${AU_SORTS.map(([v,l])=>`<option value="${v}"${auView.sort===v?' selected':''}>${l}</option>`).join('')}</select>
      <span class="l">Price</span><select id="auBand"><option value="ALL"${auView.band==='ALL'?' selected':''}>Any</option><option value="a"${auView.band==='a'?' selected':''}>Under £20</option><option value="b"${auView.band==='b'?' selected':''}>£20 – £60</option><option value="c"${auView.band==='c'?' selected':''}>£60+</option></select>
      <span class="l">Sells</span><select id="auVol"><option value="0"${auView.vol==='0'?' selected':''}>Any</option><option value="100"${auView.vol==='100'?' selected':''}>100+ a month</option><option value="500"${auView.vol==='500'?' selected':''}>500+ a month</option><option value="1000"${auView.vol==='1000'?' selected':''}>1,000+ a month</option></select>
      <span class="l">Sellers</span><select id="auSell"><option value="0"${auView.sellers==='0'?' selected':''}>Any</option><option value="3"${auView.sellers==='3'?' selected':''}>Under 3</option><option value="6"${auView.sellers==='6'?' selected':''}>Under 6</option><option value="11"${auView.sellers==='11'?' selected':''}>Under 11</option></select>
      <span class="autoolsn">${vis.length.toLocaleString()} shown${(()=>{if(auView.sellers==='0')return'';const n=vis.filter(it=>{const p=audState.prod[it.a]||{};return !(+p.fba||+p.offers);}).length;return n?` · ${n} with no seller count yet`:'';})()}</span></div>
    ${loaded===0&&!audAuto()?`<div class="aunodet"><div><b>These are just ASINs so far.</b> Load the titles, pictures and prices and this list becomes readable.</div>
      <div class="row"><button class="btn primary sm" id="auViewer2" type="button">Open ${Math.min(250,sh.items.length)} in the Keepa Viewer · free</button><button class="btn ghost sm" id="auTokens2" type="button">Or load them now · about ${sh.items.length} tokens</button></div>
      <div class="ssub">The Viewer opens with the ASINs already in. Export all columns, then drop the file anywhere on this page.</div></div>`:''}
    ${tab==='todo'&&!c.todo&&!auView.q?auDone(sh,c):
      !vis.length?'<div class="empty"><span>Nothing in this tab.</span></div>':
      `<div class="augrid"><div class="aulist">${page.map((it,i)=>auRow(it,i,sh)).join('')}${vis.length>AUD.PAGE?`<div class="aumore">Showing the first ${AUD.PAGE} of ${vis.length}. Judge these and the rest follow.</div>`:''}</div>
        <aside class="aupanel">${auPanel(vis[auView.focus],sh)}</aside></div>`}
    <div class="aukeys"><span><kbd>1</kbd>–<kbd>${audTypes().length}</kbd> judge</span><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>X</kbd> tick · <kbd>⇧↓</kbd> tick a run</span><span><kbd>G</kbd> back to the next one waiting</span><span><kbd>U</kbd> undo</span><span><kbd>O</kbd><kbd>K</kbd><kbd>S</kbd> Amazon · Keepa · SellerAmp</span><span><kbd>/</kbd> search</span></div></div>`;
  /* b92 (Jack: "isn't smooth at all - very very jumpy"). Judging changes a row's height — the six
     buttons appear, a reason row opens, both close again — and every row below it jumped. The list is
     re-rendered wholesale, so the cure is to pin the row you are ON: remember where it sat on screen
     before the render and scroll by exactly the difference after it. The page then never moves under
     your hand, however much the row grows. scrollIntoView only ran when the row left the viewport,
     which is why it felt fine sometimes and awful others. */
  /* b99 (Jack: "it's jittering when i press discord now"). b92 corrected the scroll on EVERY render and
     stored the result as the next target. The panel's Keepa graph arrives a moment later, the page grows,
     another render lands — and each one tried to re-pin against a target it could no longer reach, so it
     nudged, and nudged again. The correction is now armed only by an actual keypress, runs ONCE after the
     browser has laid the page out, and disarms itself. Renders that nobody asked for leave the scroll alone. */
  const f=document.querySelector('.aurow.focus');
  if(!f){AU_ANCHOR.top=null;AU_ANCHOR.want=false;}
  else if(AU_ANCHOR.want&&AU_ANCHOR.top!=null){
    AU_ANCHOR.want=false;
    requestAnimationFrame(()=>{const el=document.querySelector('.aurow.focus');if(!el)return;
      const drift=el.getBoundingClientRect().top-AU_ANCHOR.top;
      if(Math.abs(drift)>1&&Math.abs(drift)<600)window.scrollBy(0,drift);
      AU_ANCHOR.top=null;});
  }else{AU_ANCHOR.want=false;
    const top=f.getBoundingClientRect().top;
    if(top<0||top>innerHeight-120)f.scrollIntoView({block:'nearest',behavior:'auto'});}
  const cur=vis[auView.focus];if(cur)auLoadGraph(cur.a);}
/* b71: the price graph. Keepa's free chart is limited by IP address, and when it trips it returns a small PNG that says
   "blocked" rather than an error — so a real chart is judged by its width, never by onload alone. It loads only for the
   product you are sitting on, after a moment, and a chart already fetched is reused. */
const AU_GRAPH={cache:{},worker:null,MAX_FREE:6,free:0};
const AU_GRAPH_Q='domain=2&range=90&width=600&height=230&amazon=1&new=1&bb=1&salesrank=1';
/* Keepa's free chart is limited by IP address and, when it trips, answers with a small PNG that reads "blocked" rather than
   failing — so a chart is judged by its size. The Worker's chart costs about 1 token and does not care about the address,
   so that is tried first once the Worker knows the route. */
async function auFetchGraph(asin){
  if(AU_GRAPH.worker!==false){try{
      const r=await fetch(`${WORKER}/keepa?path=graphimage&asin=${asin}&${AU_GRAPH_Q}`);
      const ct=r.headers.get('content-type')||'';
      if(r.ok&&/image/.test(ct)){const b=await r.blob();if(b.size>8000){AU_GRAPH.worker=true;return URL.createObjectURL(b);}}
      else AU_GRAPH.worker=false;   /* the Worker does not allow this route yet */
    }catch(e){AU_GRAPH.worker=false;}}
  if(AU_GRAPH.free<AU_GRAPH.MAX_FREE){AU_GRAPH.free++;
    const url=`https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=co.uk&${AU_GRAPH_Q.replace('domain=2&','')}`;
    const ok=await new Promise(res=>{const img=new Image();img.onload=()=>res(img.naturalWidth>=400?url:null);img.onerror=()=>res(null);img.src=url;});
    if(ok)return ok;}
  return null;}
let auGraphT=null;
function auLoadGraph(asin){clearTimeout(auGraphT);if(!asin)return;
  auGraphT=setTimeout(async()=>{const box=$('#auGraph');if(!box||box.dataset.a!==asin)return;
    if(AU_GRAPH.cache[asin]===false){box.innerHTML=auGraphFallback(asin);return;}
    if(AU_GRAPH.cache[asin]){box.classList.add('has');box.innerHTML=`<img src="${AU_GRAPH.cache[asin]}" alt="Keepa price history">`;return;}
    box.innerHTML='<span class="auglab">Loading the price history…</span>';
    const url=await auFetchGraph(asin);AU_GRAPH.cache[asin]=url||false;
    const b=$('#auGraph');if(!b||b.dataset.a!==asin)return;
    if(url){b.classList.add('has');b.innerHTML=`<img src="${url}" alt="Keepa price history">`;}
    else b.innerHTML=auGraphFallback(asin,AU_GRAPH.worker===false?'Charts need one line adding to your Keepa Worker — the file is in Downloads.':'Keepa is holding the free charts back for a moment.');},450);}
function auGraphFallback(asin,why){return`<span class="auglab">${why?escapeHtml(why)+' ':''}<a class="aulk keepa" href="https://keepa.com/#!product/2-${asin}" target="_blank" rel="noopener" data-stop>Open the full graph on Keepa <kbd>K</kbd></a></span>`;}
function auPanel(it,sh){if(!it)return'<div class="empty"><span>Pick a product.</span></div>';const p=audState.prod[it.a]||{};
  if(!p.title)return`<div class="aupimg none">${escapeHtml(it.a.slice(0,2))}</div><h3>${it.a}</h3>
    <div class="ssub">No details loaded yet, so there is nothing to look at here. Load them once and every audit after this is instant.</div>
    <div class="aulinksbig" style="margin-top:12px">${auLinks(it.a)}</div>
    ${(()=>{const o=auOurs()[it.a];return o?`<div class="ausec"><div class="h">On our filters</div><div class="auours ${o.said==='Yes'?'yes':''}"><b>${o.said?escapeHtml((o.saidBy||'we')+' said '+o.said):'Was a lead · nobody said Yes'}</b><div>${escapeHtml(o.src||'')} · ${auUk(o.day)}${o.score?' · score '+o.score:''}</div></div></div>`:'';})()}`;const v=audGet(it.a);const o=auOurs()[it.a];
  const also=audShelfList().filter(x=>x.id!==sh.id&&x.items.some(y=>y.a===it.a)).map(x=>x.name);
  const fact=(k,val)=>`<div><div class="k">${k}</div><div class="v">${val}</div></div>`;
  return`<div class="aupimg ${p.image?'':'none'}">${p.image?`<img src="${escapeHtml(p.image)}" alt="">`:escapeHtml(it.a.slice(0,2))}</div>
    <h3>${escapeHtml(p.title||it.a)}</h3><div class="ssub">${escapeHtml(p.brand||'')}${p.root?' · '+escapeHtml(p.root):''} · ${it.a}</div>
    <div class="aufgrid">${fact('Buy Box',gbp(p.price))}${fact('Sales rank',p.rank?'#'+(+p.rank).toLocaleString():'—')}${fact('Bought / month',p.mo?(+p.mo).toLocaleString():'—')}
      ${fact('Sellers on it',(p.fba||p.offers)||(p.asked?'none listed':'<span class="pend">loading\u2026</span>'))}${fact('On their shelf',it.base?'Already there':auDays(it.first)+'d')}${fact('Other shelves',also.length)}</div>
    <div class="aulinksbig sticky">${auLinks(it.a)}</div>
    <div class="ausec"><div class="h">Price history · 90 days</div><div class="augraph" id="auGraph" data-a="${it.a}"></div></div>
    <div class="ausec"><div class="h">On our filters</div>${o?`<div class="auours ${o.said==='Yes'?'yes':''}"><b>${o.said?escapeHtml((o.saidBy||'we')+' said '+o.said):'Was a lead · nobody said Yes'}</b>
      <div>${escapeHtml(o.src||'')} · ${escapeHtml(o.owner||'')} · ${auUk(o.day)} · ${o.runs} run${o.runs===1?'':'s'}${o.score?' · score '+o.score:''}${o.buy?' · buy '+gbp(o.buy)+' → sell '+gbp(o.sell)+' · '+o.roi+'% ROI':''}</div>
      ${(()=>{const rv=auReview(o,+p.price);return rv?`<div class="aurev ${rv.tone}"><b>Marking our own homework</b><span>${escapeHtml(rv.line)}</span>${rv.now?`<span>${escapeHtml(rv.now)}</span>`:''}</div>`:'';})()}</div>`
      :'<div class="auours none">Never a lead on our filters. Only leads the rules kept are remembered, not rows they cut.</div>'}</div>
    ${also.length?`<div class="ausec"><div class="h">Also sold by</div><div class="ssub">${also.map(escapeHtml).join(', ')}</div></div>`:''}
    <div class="ausec"><div class="h">Note</div><input class="txt" id="auNote" placeholder="${v?'one line, saved with the answer':'judge it first, then add a note'}" value="${escapeHtml(v&&v.note||'')}" ${v?'':'disabled'} data-a="${it.a}"></div>`;}
function auDone(sh,c){const disc=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='discord');const ws=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='ws');
  return`<div class="audone"><div class="tick">${CHECK}</div><h3>${escapeHtml(sh.name)} is done</h3><p class="ssub">${c.all.toLocaleString()} products judged</p>
    <div class="audgrid">${auDonut(c,130)}<div><div class="aucounts">${audTypes().map(t=>`<button type="button" data-tab="${t.code}"><i style="background:${t.hex}"></i><b>${c[t.code]||0}</b> ${escapeHtml(t.short||t.label)}</button>`).join('')}</div>
      <div class="ssub">${sh.items.filter(it=>!it.base).length} products have appeared on this shelf since we started watching · ${c.sell} you already sell.</div></div></div>
    <div class="row">${disc.length?`<button class="btn solid sm" id="auDisc" type="button">Open the ${disc.length} Discord one${disc.length===1?'':'s'} in Keepa</button>`:''}${ws.length?`<button class="btn solid sm" id="auWs" type="button">Copy ${ws.length} WS ASIN${ws.length===1?'':'s'}</button>`:''}${(()=>{const n=auNextShelf(sh.id);return n?`<button class="btn primary sm" type="button" data-open="${escapeHtml(n.id)}">Next rival · ${escapeHtml(n.name)} · ${auCounts(n).todo} to do →</button>`:'';})()}<button class="btn ghost sm" id="auBack2" type="button">Back to audits</button></div></div>`;}

/* ============ actions and wiring ============ */
function auOpen(id){auView.mode='audit';auView.shelf=id;auView.q='';auView.order=null;auView.stay=new Set();auView.sel=new Set();auView.lastAt=0;
  location.hash='#audit='+id;const sh=audShelf(id);if(!sh)return;
  const vis=auVisible(sh);const V=audAll();const first=vis.findIndex(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo');
  const autoN=audAutoMissed(sh);if(autoN)toast(autoN+' marked Missed it for you — leads we had and never bought');
  auView.focus=Math.max(0,first);renderAudit();
  (async()=>{const asins=sh.items.map(i=>i.a);
    await audPullProducts(asins);                                   /* what the shared cache already holds */
    if(audFillFromOurs(asins))if(auView.shelf===id)renderAudit();   /* titles from our own runs, free */
    if(auView.shelf===id)renderAudit();
    if(!audAuto())return;
    const need=asins.filter(a=>!audState.prod[a]||audState.prod[a].source==='ours'||!audState.prod[a].asked);
    if(!need.length)return;
    const left=await audTokensLeft();
    if(left==null){auNote('Could not reach the Keepa Worker, so the details are not loading by themselves.');return;}
    if(need.length>AUD_AUTO_CAP){auNote(`${need.length} products need details — more than the ${AUD_AUTO_CAP} this loads automatically. Use the buttons above.`);return;}
    if(left-need.length<AUD_TOKEN_FLOOR){auNote(`Only ${left.toLocaleString()} Keepa tokens left, so the details are waiting. They refill 21 a minute.`);return;}
    auNote(`Loading details for ${need.length} products…`);
    const got=await audLoadDetails(need,true,(n,t)=>{auNote(`Getting the pictures, prices and sales ranks from Keepa · ${n} of ${t}`,n/t*100);if(auView.shelf===id)auRefresh();});
    if(auView.shelf===id)renderAudit();
    auNote(got?`Details loaded · about ${got} tokens · <button type="button" class="linkbtn" id="auAutoOff">stop doing this automatically</button>`:'');})();}
function auNote(html,pct){const el=$('#auNote2');if(!el)return;el.innerHTML=(pct!=null?`<span class="auload"><i style="width:${Math.round(pct)}%"></i></span>`:'')+(html||'');}
function auBack(){auView.mode='list';auView.shelf=null;auView.sel=new Set();location.hash='#audit';renderAudit();auPaintBulk();}
function auJudgeNow(asins,code,reason){const sh=audShelf(auView.shelf);if(!sh)return;
  const b=audJudge(asins,code,sh.seller||sh.id,reason);
  if(!b){
    /* b97 (Jack: "still not working bro"). audJudge treats pressing the verdict a row ALREADY has as a
       no-op and returns nothing — and this bailed out before anything redrew. So once a row was on
       Discord, pressing 3 again did precisely nothing: no picker, no feedback, no clue why. Pressing it
       again is how you reach or change the destination, so it has to redraw even when the verdict itself
       has not moved. This is why it looked broken on rows he had already pressed Discord on. */
    const t0=audType(code);
    if(asins.length===1&&(audGet(asins[0])||{}).verdict===code){
      const vis=auVisible(sh);const k=vis.findIndex(it=>it.a===asins[0]);if(k>=0)auView.focus=k;
      auRefresh();auFollow();
      if(!(t0&&t0.reasons))toast('Already marked '+(t0?t0.label:code)+' — press U to undo');
    }
    return;}
  asins.forEach(a=>auView.stay.add(a));
  const gap=(Date.now()-auView.lastAt)/1000;if(auView.lastAt&&gap<60){auView.secs=auView.secs.concat([gap]).slice(-40);auSave();}auView.lastAt=Date.now();
  const t=audType(code);
  const waitReason=!!(t&&t.reasons&&!reason&&asins.length>1);
  toast(waitReason?`Marked ${t.label} on ${asins.length} — now pick which: ${t.reasons.slice(0,3).map((r,n)=>AU_RKEYS[n].toUpperCase()+' '+r).join(' · ')}${t.reasons.length>3?' …':''}`
    :`Marked ${t?t.label:code}${reason?' · '+reason:''}${asins.length>1?' on '+asins.length+' products':''}`,false,
    {label:'Undo',fn:()=>{const u=audUndo();if(u){const vis=auVisible(sh);const back=vis.findIndex(x=>x.a===u[0].asin);if(back>=0)auView.focus=back;auView.sel=new Set();auView.bulkOpen=null;auRefresh();toast('Undone');}}});
  /* b94 (Jack: "improve smoothness when i tick it and how it reacts when it's ticked and where it goes").
     Pressing a key redrew the list and that was the entire feedback — nothing told you it had landed. The
     row that was just judged is now marked for one render, so it can flash its own verdict colour once and
     the chip can pop in. The mark clears itself, so scrolling past later never replays it. */
  auView.landed={a:asins[0],at:Date.now()};   /* b98: `asin` never existed here — the parameter is `asins`, and the ReferenceError killed the redraw on EVERY press */
  clearTimeout(auView._landT);auView._landT=setTimeout(()=>{auView.landed=null;},600);
  /* b153: bulk "Discord" with no group yet keeps the rows ticked and opens their reasons, so Q / W / E (or one click) finishes ALL of them
     — it used to clear the ticks, and the next Q only reached the one row you were on */
  if(waitReason){auView.sel=new Set(asins);auView.bulkOpen=t.reasons.length>3?code:null;}else{   /* Discord's three groups are already on the bar */auView.sel=new Set();auView.lastSel=null;auView.bulkOpen=null;}
  if(!(t&&t.reasons)||reason)auAdvance();auRefresh();auFollow();}
/* b95 (Jack: "why does unsure take us to the top — i want to bulk go through them rapid without being moved").
   It was not Unsure. auAdvance searched DOWN for the next unjudged row and, finding none, wrapped round and
   searched from the top — so the moment everything below you was done, one keypress teleported you to row 1
   and you lost your place completely. It only ever goes down now. Run out of work below and you stay exactly
   where you are, and it tells you how many are left above and which key goes back to them. */
function auAdvance(){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const V=audAll();
  const todo=i=>audStatus(V[vis[i].a],audSells(sh.id,vis[i].a))==='todo';
  for(let i=auView.focus+1;i<vis.length;i++){if(todo(i)){auView.focus=i;return;}}
  let above=0;for(let i=0;i<auView.focus;i++)if(todo(i))above++;
  if(auView.focus<vis.length-1)auView.focus=vis.length-1;      /* settle on the last row, never the first */
  toast(above?`That is the bottom — ${above} still to judge above you, press G to go back to them`
             :'That is every product on this shelf judged');}
/* G — back to the first thing still waiting, for when you have skipped some on the way down */
function auFirstTodo(){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const V=audAll();
  for(let i=0;i<vis.length;i++){if(audStatus(V[vis[i].a],audSells(sh.id,vis[i].a))==='todo'){auView.focus=i;auRefresh();auFollow();return;}}
  toast('Nothing left to judge on this shelf');}
function auOpenKeepaViewer(){const sh=audShelf(auView.shelf);if(!sh)return;const need=sh.items.filter(it=>!audState.prod[it.a]).map(it=>it.a).slice(0,250);
  if(!need.length){toast('Every product already has its details');return;}
  copy(need.join(', '),need.length+' ASINs copied — they are also loading in the Viewer');window.open(keepaLink(need,'2'),'_blank');
  toast('Export ALL columns from the Viewer, then drop the file on this page');}
async function auLoadTokens(){const sh=audShelf(auView.shelf);if(!sh)return;
  const need=sh.items.map(it=>it.a).filter(a=>!audState.prod[a]||audState.prod[a].source==='ours'||!audState.prod[a].asked);
  if(!need.length){toast('Every product already has its details');return;}
  if(!confirm(`Load titles, pictures and prices for ${need.length} product${need.length===1?'':'s'}?\n\nThat costs about ${need.length} Keepa tokens, once. They are saved for good.`))return;
  auNote('Loading details…');const got=await audLoadDetails(need,true,(n,t)=>auNote(`Loading details… ${n} of ${t}`));
  renderAudit();auNote('');toast(got?got+' products loaded':'Nothing came back',!got);}
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
    const trOpen=t.closest('tr[data-open]');if(trOpen){auOpen(trOpen.dataset.open);return;}
    if(t.closest('#auBack')||t.closest('#auBack2')){auBack();return;}
    if(t.closest('#auCards')){auView.cards=!auView.cards;auSave();renderAudit();return;}
    if(t.closest('#auRsort'))return;   /* the select handles itself, below */
    if(t.closest('#auRefresh')){toast('Refreshing…');await audPullShelves(true);await audPullVerdicts(true);renderAudit();toast('Up to date');return;}
    if(t.closest('#auPull')){auPullSeller($('#auSeller').value);return;}
    if(t.closest('#auAdd')){auAddList();return;}
    if(t.closest('#auFollow')){auView.follow=!auView.follow;auSave();renderAudit();if(auView.follow){toast('Keepa will follow you — it opens the product you are on');auFollow();}return;}
    if(t.closest('#auAutoOff')){audAutoSet(false);toast('Details will not load automatically any more — the two buttons above still do it');renderAudit();return;}
    if(t.closest('#auViewer')||t.closest('#auViewer2')){auOpenKeepaViewer();return;}
    if(t.closest('#auTokens')||t.closest('#auTokens2')){auLoadTokens();return;}
    if(t.closest('#auDisc')){const sh=audShelf(auView.shelf);const a=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='discord').map(it=>it.a);window.open(keepaLink(a,'2'),'_blank');return;}
    if(t.closest('#auWs')){const sh=audShelf(auView.shelf);const a=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='ws').map(it=>it.a);copy(a.join(', '),a.length+' WS ASINs copied');return;}
    if(t.closest('#auRest')){const sh=audShelf(auView.shelf);const V=audAll();const left=auVisible(sh).filter(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo').map(it=>it.a);
      if(!left.length){toast('Nothing left to judge in this tab');return;}
      if(confirm(`Mark ${left.length} product${left.length===1?'':'s'} Not lead?`))auJudgeNow(left,'not');return;}
    const tab=t.closest('[data-tab]');if(tab){const sh=audShelf(auView.shelf);auView.tab[sh.id]=tab.dataset.tab;auView.order=null;auView.stay=new Set();auView.focus=0;auSave();
      const vis=auVisible(sh);const V=audAll();const f=vis.findIndex(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo');auView.focus=Math.max(0,f);renderAudit();return;}
    if(t.closest('[data-v],[data-r],[data-next],[data-sel],.aurow'))auView.fromMouse=true;
    const vb=t.closest('[data-v]');if(vb){const sh=audShelf(auView.shelf);const vis=auVisible(sh);const k=vis.findIndex(it=>it.a===vb.dataset.a);if(k>=0)auView.focus=k;
      auJudgeNow(auView.sel.size?[...auView.sel]:[vb.dataset.a],vb.dataset.v);return;}
    if(t.closest('[data-next]')){const sh=audShelf(auView.shelf);const vis=auVisible(sh);if(auView.focus<vis.length-1)auView.focus++;auRefresh();auFollow();return;}
    const tick=t.closest('[data-sel]')||(t.closest('.aulist .aurow > .auimg')&&t.closest('.aurow'));
    if(tick){e.preventDefault();const r=tick.closest('.aurow')||tick;auToggleSel(r.dataset.a||tick.dataset.sel,+(r.dataset.i||tick.dataset.i),e.shiftKey);return;}   /* b153: the whole picture ticks, not just the little box */
    const rs=t.closest('[data-r]');if(rs){audSetReason(rs.dataset.a,rs.dataset.r);auAdvance();auRefresh();return;}
    const row=t.closest('.aurow');if(row){if(e.metaKey||e.ctrlKey){auToggleSel(row.dataset.a,+row.dataset.i,false);return;}auView.focus=+row.dataset.i;auRefresh();auFollow();return;}});
  host.addEventListener('change',e=>{const id=e.target.id;
    const map={auSort:'sort',auBand:'band',auVol:'vol',auSell:'sellers'};
    if(map[id]){auView[map[id]]=e.target.value;auView.order=null;auView.focus=0;auSave();renderAudit();}});
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
    if(e.key==='Escape'){if(auView.sel.size){auView.sel=new Set();auView.lastSel=null;auView.bulkOpen=null;auRefresh();}return;}
    if((e.key==='x'||e.key==='X')&&it&&!e.metaKey&&!e.ctrlKey){e.preventDefault();auToggleSel(it.a,auView.focus,e.shiftKey);return;}   /* b153: X ticks the row you are on, like Gmail */
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const d=e.key==='ArrowDown'?1:-1;const nf=Math.min(vis.length-1,Math.max(0,auView.focus+d));
      if(e.shiftKey){if(it)auView.sel.add(it.a);if(vis[nf])auView.sel.add(vis[nf].a);}else auView.sel=new Set();
      auView.focus=nf;auRefresh();auFollow();return;}
    const types=audTypes();const n=parseInt(e.key,10);
    if(n>=1&&n<=types.length&&it){e.preventDefault();auJudgeNow(auView.sel.size?[...auView.sel]:[it.a],types[n-1].code);return;}
    const rk=AU_RKEYS.indexOf(String(e.key).toLowerCase());
    if((e.key==='g'||e.key==='G')&&!e.metaKey&&!e.ctrlKey){e.preventDefault();auFirstTodo();return;}
    if(rk>=0&&auView.sel.size){const byType={};[...auView.sel].forEach(a=>{const v=audGet(a);const ty=v&&audType(v.verdict);if(ty&&ty.reasons&&ty.reasons[rk])(byType[ty.reasons[rk]]=byType[ty.reasons[rk]]||[]).push(a);});
      const keys=Object.keys(byType);if(keys.length){e.preventDefault();let n=0;keys.forEach(r=>{const b=audSetReasonMany(byType[r],r);if(b)n+=b.length;});
        auView.sel=new Set();auView.lastSel=null;toast(`${n} set to ${keys.join(' / ')} — press U to undo`);auRefresh();return;}}
    if(rk>=0&&it){const v=audGet(it.a);const ty=v&&audType(v.verdict);if(ty&&ty.reasons&&ty.reasons[rk]){audSetReason(it.a,ty.reasons[rk]);auAdvance();auRefresh();auFollow();return;}}
    if(e.key==='u'||e.key==='U'){const b=audUndo();toast(b?(b.length>1?'Undone — '+b.length+' products back':'Undone'):'Nothing to undo');auView.bulkOpen=null;
      if(b){const back=auVisible(sh).findIndex(x=>x.a===b[0].asin);if(back>=0)auView.focus=back;auRefresh();}return;}
    if(!it)return;
    if(e.key==='o'||e.key==='O')window.open('https://www.amazon.co.uk/dp/'+it.a,'_blank');
    else if(e.key==='k'||e.key==='K')window.open('https://keepa.com/#!product/2-'+it.a,'_blank');
    else if(e.key==='s'||e.key==='S')window.open('https://sas.selleramp.com/sas/lookup?search_term='+it.a,'_blank');});
  document.addEventListener('click',e=>{if(e.target.closest('.pagebtn'))setTimeout(auPaintBulk,0);});   /* b151: the bulk bar belongs to the audit page only */
  /* first paint + shared data when the page opens */
  const btn=document.querySelector('.pagebtn[data-page="page-audit"]');
  if(btn)btn.addEventListener('click',async()=>{renderAudit();if(cloudEnabled()){await audPullShelves();await audPullVerdicts();renderAudit();}});
  renderAudit();}
function auHash(){const m=/^#audit(?:=([\w-]+))?/i.exec(location.hash||'');if(!m)return false;
  const b=document.querySelector('.pagebtn[data-page="page-audit"]');if(b&&!b.classList.contains('active'))b.click();
  if(m[1]&&audShelf(m[1]))auOpen(m[1]);else{auView.mode='list';renderAudit();}
  return true;}

/* b100: the rival order, saved so it is still there tomorrow */
document.addEventListener('change',e=>{const sel=e.target&&e.target.closest&&e.target.closest('#auRsort');
  if(!sel)return;auView.rsort=sel.value;auSave();renderAudit();});
