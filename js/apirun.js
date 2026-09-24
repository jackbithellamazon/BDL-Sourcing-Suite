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

/* ============================================================================
   b138 — RUN VIA KEEPA API, Jack only (Jack, 21 Sep: "only Jack myself can run it via API pls").
   Measured 21 Sep: a product with stats + offers + rating = 6 tokens, and with those three the API carries every
   column the rules read from a CSV (Buy Box averages, FBA/FBM averages, Buy Box high, out-of-stock %, Amazon's share of the
   box, review count, drops, monthly sold, fees, weight, variations). Without offers the Buy Box and FBA columns are empty,
   so there is no cheap version that the sell model could trust. A full Mera list is ~3,300 tokens; rows are cached a day
   so the same list re-run costs only the list query. Two things the API cannot give: a variation's own review share (so it
   is judged on the family's drops and says so), and Business tier discounts.
   ============================================================================ */
const API_IDX={AMAZON:0,NEW:1,SALES:3,NEW_FBM:7,NEW_FBA:10,COUNT_NEW:11,RATING:16,COUNT_REVIEWS:17,BUY_BOX:18};
const API_AMAZON_SELLER={2:'A3P5ROKL5A1OLE',3:'A3JWKAKR8XB7XF',4:'A1X6FK5RDHNB96',8:'A11IL2PNWYJU7H',9:'A1AT7YVPFBWXBL'};
const API_DOMAIN_TLD={2:'co.uk',3:'de',4:'fr',8:'it',9:'es'};
const API_CACHE_KEY='bdl-sourcing-api-rows',API_CACHE_H=24,API_FLOOR=250,API_PER_PRODUCT=6,API_PER_PAGE=12,API_PAGE=500;
/* b148 (Spense in the Discord, via Jack 22 Sep: "Caching is VERY VERY important when using keepa. Average prices aren't going
   change much over a few days"; Jack: "probs worth caching average price for like 90 days or whatever we use - saves keepa
   tokens and space in storage").
   A full row costs 6 tokens because it needs offers=20. A stats-only call is 1 token and comes back with exactly these 13
   columns empty — measured on B0C9JD2B4D, 22 Sep. Everything else (Amazon price, rank, drops, monthly sold, fees, weight,
   category, variations, FBM, offer counts) is identical. So for an ASIN we already hold, one token refreshes what moves and
   the averages come off the shelf.
   NOT 90 days though: measured on Jack's own consecutive exports, the 90-day averages drift about 0.25% a DAY — 0.23% over
   one day, 0.60% over three, 1.73% over seven (and 8% of products move more than 5% in a week). Three days keeps the median
   error near half a percent; ninety would be a fifth off. The 30-day averages move twice as fast, which is why they are in
   the list below and get re-read whenever a full pull happens. */
const API_STABLE_H=72;
/* b149 (Jack, 22 Sep: "but the live price still needs to be new though doesn't it?"). Yes. Measured on B0FJM3MZ9T: the 1-token
   call DOES refresh Amazon's own price (the A2A buy price), the lowest new price, rank and monthly sold — but the live Buy Box,
   the live FBA offer, the live FBM offer and the total offer count all need the 6-token offers data. b148 carried the live FBA
   offer forward from the shelf as if it were today's. It no longer does: only AVERAGES come off the shelf, never a live price.
   A blank live price makes the rules fall back on the averages, which is Rule 1's own principle anyway. And every product that
   comes out as a LEAD is pulled in full straight after (apiConfirm), so the ones anybody acts on always carry live prices. */
const API_FROM_CACHE=['Buy Box: 30 days avg.','Buy Box: 90 days avg.','Buy Box: 180 days avg.','Buy Box: Highest',
  'Buy Box: 90 days OOS','Buy Box: % Amazon 90 days','New, 3rd Party FBA: 30 days avg.',
  'New, 3rd Party FBA: 90 days avg.','Monthly Sales Trends: Monthly Sold (Last Known)',
  'Monthly Sales Trends: Monthly Sold Date (Last Known)','Reviews: Rating','Reviews: Rating Count'];
const API_CACHE_MAX=6000;   /* keep the file honest: oldest averages go first */
/* what an ASIN will cost on the next run: 0 if the whole row is still fresh, 1 if only the averages are, 6 if neither */
function apiCostFor(cache,domain,asin,now){const c=cache[domain+'|'+asin];if(!c)return 6;
  now=now||Date.now();
  if(now-(c.fresh||c.at)<API_CACHE_H*3600e3)return 0;
  return now-c.at<API_STABLE_H*3600e3?1:6;}
function apiPlan(cache,domain,asins,now){const p={free:[],topUp:[],full:[]};
  (asins||[]).forEach(a=>{const cost=apiCostFor(cache,domain,a,now);(cost===0?p.free:cost===1?p.topUp:p.full).push(a);});
  p.estimate=p.topUp.length+p.full.length*API_PER_PRODUCT;return p;}
function apiTrim(cache){const keys=Object.keys(cache);if(keys.length<=API_CACHE_MAX)return cache;
  keys.sort((a,b)=>(cache[a].at||0)-(cache[b].at||0)).slice(0,keys.length-API_CACHE_MAX).forEach(k=>delete cache[k]);return cache;}
function kDate(m){if(!m||m<0)return'';const d=new Date((m+21564000)*60000);return d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');}
function apiMoney(arr,i){const v=arr&&arr[i];return(v==null||v<0)?'':(v/100).toFixed(2);}
function apiInt(arr,i){const v=arr&&arr[i];return(v==null||v<0)?'':String(v);}
/* one Keepa product -> one row shaped like a Product Finder / Viewer export row, so the rules do not know the difference */
function apiRow(p,domain){if(!p||!p.asin)return null;const st=p.stats||{},cur=st.current||[],a30=st.avg30||[],a90=st.avg90||[],a180=st.avg180||[];
  const I=API_IDX;const amz=cur[I.AMAZON],amz90=a90[I.AMAZON];
  const oos=(st.outOfStockPercentage90||[])[I.BUY_BOX];const bbs=st.buyBoxStats||{};const amzStat=bbs[API_AMAZON_SELLER[domain]||'']||null;
  const vars=p.variations||[];const tree=(p.categoryTree||[]).map(c=>c.name);
  const h=p.monthlySoldHistory||[];let lastN='',lastD='';for(let i=h.length-2;i>=0;i-=2){if(h[i+1]>0){lastN=String(h[i+1]);lastD=kDate(h[i]);break;}}
  const elig=p.buyBoxEligibleOfferCounts||[];const tld=API_DOMAIN_TLD[domain]||'co.uk';
  const coupon=Array.isArray(p.coupon)?p.coupon:null;
  return{
    'ASIN':p.asin,'Title':p.title||'','Brand':p.brand||'',
    'URL: Keepa':`https://keepa.com/#!product/${domain}-${p.asin}`,'URL: Amazon':`https://www.amazon.${tld}/dp/${p.asin}`,
    'Amazon: Current':apiMoney(cur,I.AMAZON),'Amazon: 30 days avg.':apiMoney(a30,I.AMAZON),'Amazon: 90 days avg.':apiMoney(a90,I.AMAZON),'Amazon: 180 days avg.':apiMoney(a180,I.AMAZON),
    'Amazon: 90 days drop %':(amz>0&&amz90>0)?Math.round(100*(amz90-amz)/amz90)+' %':'',
    'Buy Box: Current':apiMoney(cur,I.BUY_BOX),'Buy Box: 30 days avg.':apiMoney(a30,I.BUY_BOX),'Buy Box: 90 days avg.':apiMoney(a90,I.BUY_BOX),'Buy Box: 180 days avg.':apiMoney(a180,I.BUY_BOX),
    'Buy Box: Highest':(st.max&&st.max[I.BUY_BOX]&&st.max[I.BUY_BOX][1]>0)?(st.max[I.BUY_BOX][1]/100).toFixed(2):'',
    'Buy Box: 90 days OOS':(oos!=null&&oos>=0)?oos+' %':'',
    'Buy Box: % Amazon 90 days':amzStat&&amzStat.percentageWon!=null?Math.round(amzStat.percentageWon)+' %':'',
    'Buy Box: Buy Box Seller':st.buyBoxIsAmazon?'Amazon':(st.buyBoxSellerId||''),'Buy Box: Is FBA':st.buyBoxIsFBA?'yes':'no',
    'Buy Box: Subscribe & Save':p.isSNS?'yes':'no',
    'New: Current':apiMoney(cur,I.NEW),'New Offer Count: Current':apiInt(cur,I.COUNT_NEW),
    'New, 3rd Party FBA: Current':apiMoney(cur,I.NEW_FBA),'New, 3rd Party FBA: 30 days avg.':apiMoney(a30,I.NEW_FBA),'New, 3rd Party FBA: 90 days avg.':apiMoney(a90,I.NEW_FBA),
    'New, 3rd Party FBM: Current':apiMoney(cur,I.NEW_FBM),'New, 3rd Party FBM: 90 days avg.':apiMoney(a90,I.NEW_FBM),
    'Buy Box Eligible Offer Counts: New FBA':elig[0]!=null?String(elig[0]):'','New FBM Offer Count: Current':elig[1]!=null?String(elig[1]):'',
    'Sales Rank: Current':apiInt(cur,I.SALES),'Sales Rank: Drops last 30 days':st.salesRankDrops30!=null?String(st.salesRankDrops30):'','Sales Rank: Drops last 90 days':st.salesRankDrops90!=null?String(st.salesRankDrops90):'',
    'Monthly Sales Trends: Bought in past month':p.monthlySold>0?String(p.monthlySold):'',
    'Monthly Sales Trends: Monthly Sold (Last Known)':lastN,'Monthly Sales Trends: Monthly Sold Date (Last Known)':lastD,
    'Reviews: Rating':(cur[I.RATING]>0)?(cur[I.RATING]/10).toFixed(1):'','Reviews: Rating Count':apiInt(cur,I.COUNT_REVIEWS),'Reviews: Review Count - Format Specific':'-',
    'Variation Count':vars.length?String(vars.length):'','Variation ASINs':vars.map(v=>v.asin).join(','),'Variation Attributes':(vars.find(v=>v.asin===p.asin)||{attributes:[]}).attributes.map(x=>x.dimension+': '+x.value).join('; '),
    'Referral Fee %':p.referralFeePercent!=null?p.referralFeePercent+' %':'','FBA Pick&Pack Fee':(p.fbaFees&&p.fbaFees.pickAndPackFee>0)?(p.fbaFees.pickAndPackFee/100).toFixed(2):'',
    'Package: Weight (g)':p.packageWeight>0?String(p.packageWeight):'','Item: Weight (g)':p.itemWeight>0?String(p.itemWeight):'',
    'Categories: Root':tree[0]||'','Categories: Sub':tree[tree.length-1]||'','Categories: Tree':tree.join(' > '),
    'Listed since':kDate(p.listedSince),'Tracking since':kDate(p.trackingSince),
    'Deals: Badge':(st.lightningDealInfo&&st.lightningDealInfo.length)?'Lightning Deal':'',
    'One Time Coupon: Percentage':coupon&&coupon[0]<0?String(-coupon[0]):'','One Time Coupon: Absolute':coupon&&coupon[0]>0?(coupon[0]/100).toFixed(2):'','One Time Coupon: Subscribe & Save %':coupon&&coupon[1]<0?String(-coupon[1]):'',
    'Business Discount: Percentage':'',
    __api:true,__rootId:p.rootCategory,__binding:(p.binding||'').toLowerCase()};}
function apiCache(){return lsGet(API_CACHE_KEY,{});}
/* rows for these ASINs: free from cache, 1 token to refresh what moves, 6 only when we have nothing */
async function apiRows(asins,domain,onStep){const cache=apiCache(),now=Date.now(),out=[];
  const plan=apiPlan(cache,domain,asins,now);
  plan.free.forEach(a=>out.push(cache[domain+'|'+a].row));
  let spent=0,done=0;const need=plan.topUp.length+plan.full.length;
  const pull=async(list,cheap)=>{
    for(let i=0;i<list.length;i+=100){const part=list.slice(i,i+100);if(onStep)onStep(done,need);
      const q='path=product&domain='+domain+'&stats=90&history=0'+(cheap?'':'&offers=20&rating=1')+'&asin='+part.join(',');
      const r=await fetch(WORKER+'/keepa?'+q);const j=await r.json();
      if(j.error)throw new Error(j.error.message||'Keepa refused');spent+=j.tokensConsumed||0;
      (j.products||[]).forEach(p=>{let row=apiRow(p,domain);if(!row)return;const key=domain+'|'+p.asin;
        if(cheap){const held=(cache[key]||{}).row||{};
          /* the averages we already paid for; the 1-token call left these empty */
          API_FROM_CACHE.forEach(c=>{if(held[c]!=null&&held[c]!=='')row[c]=held[c];});
          row.__avgAt=(cache[key]||{}).at||now;
          cache[key]={at:(cache[key]||{}).at||now,fresh:now,row};}
        else cache[key]={at:now,fresh:now,row};
        out.push(row);});
      done+=part.length;}};
  await pull(plan.topUp,true);
  await pull(plan.full,false);
  lsSet(API_CACHE_KEY,apiTrim(cache));
  return{rows:out,spent,fromCache:plan.free.length,toppedUp:plan.topUp.length,fullPulls:plan.full.length};}
/* b149: the leads, pulled in full at 6 tokens each, so their live Buy Box / FBA / FBM prices are today's */
async function apiConfirm(asins,domain,onStep){const cache=apiCache(),now=Date.now(),out=[];let spent=0;
  for(let i=0;i<asins.length;i+=100){const part=asins.slice(i,i+100);if(onStep)onStep(i,asins.length);
    const r=await fetch(WORKER+'/keepa?path=product&domain='+domain+'&stats=90&history=0&offers=20&rating=1&asin='+part.join(','));const j=await r.json();
    if(j.error)throw new Error(j.error.message||'Keepa refused');spent+=j.tokensConsumed||0;
    (j.products||[]).forEach(p=>{const row=apiRow(p,domain);if(!row)return;cache[domain+'|'+p.asin]={at:now,fresh:now,row};out.push(row);});}
  lsSet(API_CACHE_KEY,apiTrim(cache));return{rows:out,spent};}
/* every ASIN a saved filter finds today */
async function apiAllAsins(selection,domain,onStep,limit){const all=[];let page=0,total=null,spent=0;
  while(true){const sel=Object.assign({},selection,{perPage:API_PAGE,page});if(onStep)onStep(all.length,total);
    const j=await apiQuery(sel,domain);spent+=j.tokensConsumed||0;total=j.totalResults||0;(j.asinList||[]).forEach(a=>all.push(a));
    if(all.length>=total||!(j.asinList||[]).length||page>=20||(limit&&all.length>=limit))break;page++;}
  const uniq=[...new Set(all)];return{asins:limit?uniq.slice(0,limit):uniq,total,spent};}
