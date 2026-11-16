/* BDL Sourcing — the shared Keepa cache (b319).
   Jack, 6 Nov 2026: "the Suite will use it but also Keepa trackers use it all too — anyway to help cache more, yes get a shared cache".
   One Supabase table, keepa_cache (~/Downloads/2026-11-06-SHARED-KEEPA-CACHE-SUPABASE.sql), holds every Keepa product any of our apps has paid
   for — one row per country × product × kind: stats (90-day stats, 1 token) · bb (+ the Buy Box, ~3) · offers (+ live offers, ~6). A richer
   kind answers a poorer question. Before the Suite asks Keepa it looks here; after, it saves here — and so does the Keepa Worker (the trackers).
   Kept OUT of the outbox on purpose: a missing table, or a slow one, must never hold up a VA's run or ✓ Done. Jack's browser only — the VAs
   never call Keepa. If the table is not there yet, it switches itself off for the visit and everything works as before. */
const KC={off:false,pruned:false};
const KC_RANK={stats:1,bb:2,offers:3};
const KC_NOW_H=2,KC_AVG_H=72,KC_INFO_H=24*7;   /* current prices reused 2 h · averages 72 h · titles, pictures, rank 7 days */
const KC_PRUNE_KEY='bdl-sourcing-kc-pruned';
function kcOn(){return!KC.off&&typeof cloudEnabled==='function'&&cloudEnabled()&&typeof isJack==='function'&&isJack();}
/* b325 → b330: READING is for everyone — a VA's overnight list is built from the cache (0 tokens). Writing and Keepa calls stay Jack's. */
function kcCanRead(){return!KC.off&&typeof cloudEnabled==='function'&&cloudEnabled();}
/* price history and the raw offer list are big and nothing reads them back — the stats carry the prices */
function kcSlim(p){const o=Object.assign({},p);const f=kcFba3p(p);if(f!=null)o.bdlFba3p=f;delete o.csv;delete o.offers;delete o.liveOffersOrder;return o;}
/* b320 (the Keepa Worker's reply, 6 Nov): the trackers' sell price is the lowest LIVE new FBA offer that is not Amazon — from the offer list, which
   the cache leaves out. So before it goes, that one number is kept: bdlFba3p, price + shipping in pence. With it the Worker can reuse a Suite row
   up to 2 hours old. Only an answer that carried live offers (kind 'offers') has it. */
function kcFba3p(p){if(!p||!Array.isArray(p.offers)||!p.offers.length)return null;const live=Array.isArray(p.liveOffersOrder)?p.liveOffersOrder:p.offers.map((x,i)=>i);let best=null;
  live.forEach(i=>{const x=p.offers[i];if(!x||x.condition!==1||!x.isFBA||x.isAmazon)return;const c=x.offerCSV||[];if(c.length<3)return;const pr=+c[c.length-2],sh=+c[c.length-1]||0;if(!(pr>0))return;const t=pr+Math.max(0,sh);if(best==null||t<best)best=t;});
  return best;}
function kcAge(x){return x?(Date.now()-new Date(x.at).getTime())/3600e3:Infinity;}
/* asin → {p, at, kind} — the newest row of at least `kind`, no older than maxH hours */
async function kcGet(domain,asins,kind,maxH,anyone){if(!(anyone?kcCanRead():kcOn())||!asins||!asins.length)return{};const out={},need=KC_RANK[kind]||1;
  try{for(let i=0;i<asins.length;i+=100){const part=asins.slice(i,i+100);
      const rows=await cloudGetAll('keepa_cache','select=asin,kind,product,fetched_at&domain=eq.'+domain+'&asin=in.('+part.join(',')+')&fetched_at=gte.'+new Date(Date.now()-maxH*3600e3).toISOString());
      rows.forEach(r=>{if((KC_RANK[r.kind]||0)<need)return;const o=out[r.asin];if(!o||new Date(r.fetched_at)>new Date(o.at))out[r.asin]={p:r.product,at:r.fetched_at,kind:r.kind};});}}
  catch(e){if(typeof missingTables==='function'&&missingTables(e))KC.off=true;}
  return out;}
/* fire and forget — never in the way */
function kcPut(domain,products,kind){if(!kcOn()||!products||!products.length)return;const now=new Date().toISOString();
  const rows=products.filter(p=>p&&p.asin).map(p=>({domain,asin:p.asin,kind,product:kcSlim(p),fetched_at:now,app:'sourcing'}));if(!rows.length)return;
  (async()=>{try{for(let i=0;i<rows.length;i+=100)await cloudReq('POST','keepa_cache',rows.slice(i,i+100),'resolution=merge-duplicates,return=minimal');kcPrune();}
    catch(e){if(typeof missingTables==='function'&&missingTables(e))KC.off=true;}})();}
/* once a day: rows older than 7 days go */
function kcPrune(){if(KC.pruned||!kcOn())return;KC.pruned=true;const d=new Date().toISOString().slice(0,10);if(lsGet(KC_PRUNE_KEY,'')===d)return;lsSet(KC_PRUNE_KEY,d);
  cloudReq('POST','rpc/keepa_cache_prune',{}).catch(()=>{});}
