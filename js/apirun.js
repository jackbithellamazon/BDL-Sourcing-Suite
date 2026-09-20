/* ============================================================================
   apirun.js — Keepa Product Finder through the Worker. ADDED, NOT USED.
   b110 (Jack, 18 Sep 2026: "add it in but not using yet").

   Measured 18 Sep through bdl-sourcing.…workers.dev (path=query, already allowed by the Worker):
     one /query call            = 10 tokens + 1 per 50 results   (11 tokens for 50 ASINs; 10 for an empty result)
     a Suz-shaped selection     = 318 matches without her brand blocks
     stats for each ASIN after  = 1 token each (same call the audit and EU pricing use)
   So a Suz run through the API is roughly 10 + 7 pages + 318 = ~335 tokens. The export is 0.

   What the API cannot do that the saved web filter does — found by testing, not guessed:
     · exclude brands   ("-amazon" in brand matched nothing: the minus is not a negation)
     · exclude root categories
     · pin a rank month (srAvgMonth only exists on the website)
   Those come back as `after` and are applied in the browser from each product's own brand / root category,
   once the stats have been fetched. The tokens for an excluded product are spent; that is the price of the API route.

   Nothing calls this while APIRUN.on is false. The run screen keeps the export flow. To try it on one source from
   the console:  apiCount(srcByKey('suz-deep-drops'))  → {total, tokensSpent, tokensForFullRun}.
   ============================================================================ */
const APIRUN={on:false,PER_PAGE:50,QUERY_BASE:10,PER_RESULT_PAGE:50};
/* web colId → API key. Prices in the web filter are pounds; the API wants pence. Percent and count fields pass through. */
const API_PRICE=/^(AMAZON|NEW|USED|BUY_BOX|BUY_BOX_SHIPPING|NEW_FBA|NEW_FBM|LISTPRICE|EBAY_NEW|EBAY_USED|WAREHOUSE|COLLECTIBLE|REFURBISHED|LIGHTNING_DEAL)$/;
const API_STATS=/^(current|avg7|avg30|avg90|avg180|avg365|delta7|delta30|delta90|delta180|deltaPercent7|deltaPercent30|deltaPercent90|deltaPercent180)$/;
function apiField(colId){const i=colId.lastIndexOf('_');if(i<0)return null;const base=colId.slice(0,i),stat=colId.slice(i+1);
  if(!API_STATS.test(stat))return null;return{key:stat+'_'+base,pence:API_PRICE.test(base)&&!/deltaPercent/.test(stat)};}
const API_PLAIN={totalOfferCount:'totalOfferCount',monthlySold:'monthlySold',salesRankDrops30:'salesRankDrops30',salesRankDrops90:'salesRankDrops90',
  COUNT_NEW_current:'current_COUNT_NEW',COUNT_NEW_avg180:'avg180_COUNT_NEW',COUNT_REVIEWS_current:'current_COUNT_REVIEWS',RATING_current:'current_RATING'};
function apiIds(v){return String(v||'').split('###').map(x=>x.trim()).filter(Boolean);}
/* turns a saved keepa.com/#!finder/… link (or its decoded JSON) into {selection, after, skipped} */
function apiSelection(src){const link=(src&&src.link)||'';const m=/#!finder\/(.+)$/.exec(link);if(!m)return null;
  let j;try{j=JSON.parse(decodeURIComponent(m[1]));}catch(e){return null;}
  const f=j.f||{},sel={perPage:APIRUN.PER_PAGE,page:0},after={brandNot:[],rootNot:[],bindingNot:[]},skipped=[];
  const num=(k,v)=>{if(v==null||v==='')return;sel[k]=v;};
  for(const [col,c] of Object.entries(f)){
    if(col==='srAvgMonth'){skipped.push('rank month (website only)');continue;}
    if(col==='productType'){sel.productType=(c.values||[]).map(Number);continue;}
    if(col==='brand'){const ids=apiIds(c.filter);if(c.type==='isNoneOf')after.brandNot=ids.map(x=>x.toLowerCase());else sel.brand=ids;continue;}
    if(col==='rootCategory'){const ids=apiIds(c.filter).map(Number);if(c.type==='isNoneOf')after.rootNot=ids;else sel.rootCategory=ids;continue;}
    if(col==='categories_exclude'){sel.categories_exclude=apiIds(c.filter).map(Number);continue;}
    if(col==='categories_include'){sel.categories_include=apiIds(c.filter).map(Number);continue;}
    if(col==='binding'){const ids=apiIds(c.filter).map(x=>x.toLowerCase());if(c.type==='isNoneOf')after.bindingNot=ids;else skipped.push('binding is-one-of');continue;}
    if(c.filterType==='number'){const fld=apiField(col)||(API_PLAIN[col]?{key:API_PLAIN[col],pence:false}:null);
      if(!fld){skipped.push(col);continue;}
      const cv=v=>v==null?null:(fld.pence?Math.round(Number(v)*100):Number(v));
      if(c.type==='inRange'){num(fld.key+'_gte',cv(c.filter));num(fld.key+'_lte',cv(c.filterTo));}
      else if(c.type==='greaterThanOrEqual'||c.type==='greaterThan')num(fld.key+'_gte',cv(c.filter));
      else if(c.type==='lessThanOrEqual'||c.type==='lessThan')num(fld.key+'_lte',cv(c.filter));
      else if(c.type==='equals'){num(fld.key+'_gte',cv(c.filter));num(fld.key+'_lte',cv(c.filter));}
      else skipped.push(col+' '+c.type);
      continue;}
    skipped.push(col);}
  return{selection:sel,after,skipped};}
/* the exclusions the API could not do, applied to a fetched product {brand, rootCategory, binding} */
function apiKeep(prod,after){if(!after)return true;const b=(prod.brand||'').toLowerCase(),bd=(prod.binding||'').toLowerCase();
  if(after.brandNot.some(x=>b===x))return false;
  if(after.rootNot.includes(Number(prod.rootCategory)))return false;
  if(after.bindingNot.some(x=>bd===x))return false;return true;}
/* one page of ASINs. domain 2 = UK. Costs 10 tokens + 1 per 50 results. */
async function apiQuery(selection,domain){const r=await fetch(WORKER+'/keepa?path=query&domain='+(domain||2)+'&selection='+encodeURIComponent(JSON.stringify(selection)));
  const j=await r.json();if(j.error)throw new Error(j.error.message||'Keepa refused the query');return j;}
/* what a full API run of this source would cost, from one 10-11 token call */
async function apiCount(src){const t=apiSelection(src);if(!t)throw new Error('no Keepa finder link on this source');
  const j=await apiQuery(t.selection,2);const total=j.totalResults||0;
  const pages=Math.ceil(total/APIRUN.PER_PAGE);const forRun=APIRUN.QUERY_BASE*Math.max(1,pages)+Math.ceil(total/APIRUN.PER_RESULT_PAGE)+total;
  return{total,tokensSpent:j.tokensConsumed,tokensLeft:j.tokensLeft,tokensForFullRun:forRun,skipped:t.skipped,after:t.after};}
