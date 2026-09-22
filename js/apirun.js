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
/* rows for these ASINs, from the day's cache where possible, the rest from Keepa at 6 tokens each */
async function apiRows(asins,domain,onStep){const cache=apiCache(),now=Date.now(),out=[],ask=[];
  asins.forEach(a=>{const c=cache[domain+'|'+a];if(c&&now-c.at<API_CACHE_H*3600e3)out.push(c.row);else ask.push(a);});
  let spent=0;
  for(let i=0;i<ask.length;i+=100){const part=ask.slice(i,i+100);if(onStep)onStep(i,ask.length);
    const r=await fetch(WORKER+'/keepa?path=product&domain='+domain+'&stats=90&offers=20&rating=1&asin='+part.join(','));const j=await r.json();
    if(j.error)throw new Error(j.error.message||'Keepa refused');spent+=j.tokensConsumed||0;
    (j.products||[]).forEach(p=>{const row=apiRow(p,domain);if(!row)return;cache[domain+'|'+p.asin]={at:now,row};out.push(row);});}
  lsSet(API_CACHE_KEY,cache);return{rows:out,spent,fromCache:asins.length-ask.length};}
/* every ASIN a saved filter finds today */
async function apiAllAsins(selection,domain,onStep,limit){const all=[];let page=0,total=null,spent=0;
  while(true){const sel=Object.assign({},selection,{perPage:API_PAGE,page});if(onStep)onStep(all.length,total);
    const j=await apiQuery(sel,domain);spent+=j.tokensConsumed||0;total=j.totalResults||0;(j.asinList||[]).forEach(a=>all.push(a));
    if(all.length>=total||!(j.asinList||[]).length||page>=20||(limit&&all.length>=limit))break;page++;}
  const uniq=[...new Set(all)];return{asins:limit?uniq.slice(0,limit):uniq,total,spent};}
