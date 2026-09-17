/* ============================================================================
   BDL SOURCING — EU BUY PRICES FROM KEEPA  (b76, 17 Sep 2026)
   Jack, 17 Sep: a viewer link of 100 EU alert ASINs — "i'd wanna know eu prices to see if
   it's prof or not… would i export the viewer then it can use tokens to find eu prices".

   A brand run needs five CSVs, one per market. An alert list has no exports, so the EU buy
   side is BOUGHT from Keepa instead — measured at 1 token per ASIN per market on Jack's own
   account, 17 Sep — and handed to Rule 1 in exactly the shape a dropped CSV would have made.
   Rule 1 is frozen and is not touched: it still reads 'Amazon: Current' off files.DE/FR/IT/ES.

   Two deliberate limits, both of which UNDERSTATE profit rather than flatter it:
     · Amazon's own offer only, like the Finder exports it stands in for. No Amazon price in
       that market = no row, not a guess at a 3P seller Jack has never bought from.
     · No Subscribe & Save flag. The API does not carry the two columns brHasSS reads, so the
       EU 5% is never applied. A lead that clears without it clears for real.
   ============================================================================ */
const EUP_KEY='bdl-sourcing-eu-price',EUP_TTL_H=12,EUP_BATCH=100;
const EUP_DOMAIN={UK:2,DE:3,FR:4,IT:8,ES:9};

function eupCache(){return lsGet(EUP_KEY,{});}
function eupPut(c){lsSet(EUP_KEY,c);}
/* Prices go stale; a 12h cache means running the same list twice in a day is free. */
function eupHit(cache,mk,asin){const e=cache[mk+'|'+asin];
  return e&&(Date.now()-e.at)<EUP_TTL_H*3600e3?e:null;}

/* What this run will actually cost — cached ASINs are free, so the number falls on a re-run. */
function eupCost(asins,markets){const c=eupCache();let n=0;
  markets.forEach(mk=>asins.forEach(a=>{if(!eupHit(c,mk,a))n++;}));return n;}

/* THE CURRENCY TRAP (Jack, 17 Sep — he sent the amazon.es checkout that proved it).
   A Keepa CSV export is priced in the ACCOUNT's currency, so his DE/FR/IT/ES exports arrive in
   POUNDS already — same ASIN reads DE 114.91 / UK 114.98 in his own Asus files. The API does not:
   /product on domain 9 answers in EUROS. Hand Rule 1 the euro figure and it reads it as pounds,
   which inflated this Braun epilator to a £77.06 landed cost against a real £68.91 basket.
   So the euros are converted here, once, and the row leaves in pounds like the CSV it stands in for.
   The cache holds the EURO cents, never the pounds — the rate moves, the stored price does not. */
function eupRow(asin,cents,rate){
  if(cents==null)return null;
  const gbp=(cents/100)*rate;
  return{ASIN:asin,'Amazon: Current':gbp.toFixed(2),
    'Buy Box: Subscribe & Save':'','One Time Coupon: Subscribe & Save %':''};
}
/* the euro price Keepa currently shows for Amazon's own offer, or null if Amazon is not selling */
function eupCents(p){const cur=(p&&p.stats&&p.stats.current)||[];
  return cur[0]!=null&&cur[0]>-1?cur[0]:null;}

async function eupBalance(){try{const r=await fetch(WORKER+'/health');const j=await r.json();
  return j&&j.tokensLeft!=null?j.tokensLeft:null;}catch(e){return null;}}

/* Buys the missing prices and returns {DE:{name,rows,asins}, …} — the same shape paintSlots
   and rule1Compute already expect from a dropped file. onStep(done,total,market) drives the UI. */
async function eupFetch(asins,markets,onStep,rate){
  rate=rate>0?rate:0.86;   /* GBP per EUR, same number the run screen shows */
  const cache=eupCache(),out={},miss={};let need=0;
  markets.forEach(mk=>{miss[mk]=asins.filter(a=>!eupHit(cache,mk,a));need+=miss[mk].length;});
  let done=0;
  for(const mk of markets){
    const dom=EUP_DOMAIN[mk];if(!dom)continue;
    for(let i=0;i<miss[mk].length;i+=EUP_BATCH){
      const part=miss[mk].slice(i,i+EUP_BATCH);
      if(onStep)onStep(done,need,mk);
      let js=null;
      try{const r=await fetch(WORKER+'/keepa?path=product&domain='+dom+'&stats=90&history=0&asin='+part.join(','));
        js=await r.json();}catch(e){js=null;}
      const got=(js&&js.products)||[];
      /* Keepa answers in the order asked, but never trust that — match on the ASIN it sends back. */
      const byAsin={};got.forEach(p=>{if(p&&p.asin)byAsin[p.asin]=p;});
      part.forEach(a=>{cache[mk+'|'+a]={at:Date.now(),cents:eupCents(byAsin[a])};});
      done+=part.length;
      if(onStep)onStep(done,need,mk);
    }
  }
  eupPut(cache);
  markets.forEach(mk=>{
    const rows=[];asins.forEach(a=>{const e=eupHit(cache,mk,a);const r=e?eupRow(a,e.cents,rate):null;if(r)rows.push(r);});
    out[mk]={name:'Keepa · '+mk+' · '+today(),rows,asins:rows.map(r=>r.ASIN),fromKeepa:true,hasSince:true};
  });
  return out;
}
