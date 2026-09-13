/* BDL Sourcing — the BRANDS registry. What we run, where, with which rule, and the Keepa link to run it.
   Test mode: lives in localStorage. Later this becomes the src_source table. */
const SRC_KEY='bdl-sourcing-sources';
const MERA_LINK='https://keepa.com/#!finder/%7B%22f%22%3A%7B%22BUY_BOX_SHIPPING_avg90%22%3A%7B%22filterType%22%3A%22number%22%2C%22type%22%3A%22greaterThanOrEqual%22%2C%22filter%22%3A60%2C%22filterTo%22%3Anull%7D%2C%22AMAZON_deltaPercent90%22%3A%7B%22filterType%22%3A%22number%22%2C%22type%22%3A%22greaterThanOrEqual%22%2C%22filter%22%3A9%2C%22filterTo%22%3Anull%7D%2C%22brand%22%3A%7B%22filterType%22%3A%22autocomplete%22%2C%22filter%22%3A%22alienware%23%23%23amazon%23%23%23amazon%20basics%23%23%23amzchef%23%23%23apple%23%23%23brabantia%23%23%23caso%23%23%23cello%23%23%23comfee\'%23%23%23cosori%23%23%23dreame%23%23%23dyson%23%23%23ecovacs%23%23%23euhomy%23%23%23eureka%23%23%23famivac%23%23%23fridja%23%23%23geepas%23%23%23geesuu%23%23%23gigabyte%23%23%23google%23%23%23haden%23%23%23hammer%20h%23%23%23hkc%23%23%23hp%23%23%23iiyama%23%23%23inteture%23%23%23irobot%23%23%23kodak%23%23%23koorui%23%23%23leedow%23%23%23lefant%23%23%23levoit%23%23%23microsoft%23%23%23oppo%23%23%23panasonic%23%23%23proscenic%23%23%23rug%20doctor%23%23%23sony%23%23%23tcl%23%23%23toshiba%23%23%23ultenic%23%23%23vacmaster%23%23%23venga!%23%23%23vexilar%23%23%23xiaomi%23%23%23yashe%23%23%23zachvo%22%2C%22type%22%3A%22isNoneOf%22%7D%2C%22srAvgMonth%22%3A%7B%22filterType%22%3A%22text%22%2C%22type%22%3A%22equals%22%2C%22filter%22%3A%22202601%22%7D%2C%22salesRankDrops30%22%3A%7B%22filterType%22%3A%22number%22%2C%22type%22%3A%22greaterThanOrEqual%22%2C%22filter%22%3A10%2C%22filterTo%22%3Anull%7D%2C%22categories%22%3A%7B%22filterType%22%3A%22autocomplete%22%2C%22filter%22%3A%2210256218031%23%23%2310706431%23%23%2311712411%23%23%2313528598031%23%23%231391051031%23%23%2317477983031%23%23%23193679031%23%23%2330117754031%23%23%2330117755031%23%23%233147441%23%23%233147711%23%23%233147721%23%23%233147741%23%23%233147751%23%23%233538292031%23%23%233576389031%23%23%23368204031%23%23%23428652031%23%23%23429892031%23%23%235362060031%23%23%23560864%23%23%23770072031%22%2C%22type%22%3A%22isOneOf%22%7D%2C%22productType%22%3A%7B%22values%22%3A%5B%220%22%5D%2C%22filterType%22%3A%22set%22%7D%7D%2C%22s%22%3A%5B%7B%22colId%22%3A%22AMAZON_deltaPercent90%22%2C%22sort%22%3A%22asc%22%7D%5D%2C%22t%22%3A%22g%22%7D';
/* Seed from Jack's list, 11 Sep 2026. Alphabetical. markets = where we BUY; we always sell UK. */
const SRC_SEED=[
  {key:'mera-highticket',name:'Mera high-ticket',type:'filter',rule:2,markets:['UK'],cadence:'daily',note:'£60+ Buy Box · Amazon down 9%+ · 10+ drops',owner:'Mera',link:MERA_LINK,status:'active'},
  {key:'suz-tea-coffee',name:'Suz tea & coffee',type:'filter',rule:3,markets:['UK'],cadence:'daily',note:'Rule 3 not designed yet — needs the filter link + one export',owner:'Suz',status:'paused'},
  {key:'acer',name:'Acer',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'massive brand for us',status:'testing'},
  {key:'asus',name:'ASUS',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days',note:'major recurring brand',status:'testing'},
  {key:'bls',name:'BLS',type:'brand',rule:1,markets:['UK'],cadence:'weekly'},
  {key:'bosch',name:'Bosch',type:'brand',rule:1,markets:['UK'],cadence:'3 days',note:'run with Tassimo'},
  {key:'braun',name:'Braun',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'corsair',name:'Corsair',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'dji',name:'DJI',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'weekly'},
  {key:'elgato',name:'Elgato',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'gopro',name:'GoPro',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'gtech',name:'Gtech',type:'brand',rule:1,markets:['UK'],cadence:'weekly',note:'Business tiers on the listing — Keepa never shows them, open every lead on the Business account'},
  {key:'hoover',name:'Hoover',type:'brand',rule:1,markets:['UK'],cadence:'weekly',note:'also caught by the Mera filter'},
  {key:'lenovo',name:'Lenovo',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'unbelievable brand to run',status:'testing'},
  {key:'logitech',name:'Logitech',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days',brands:['Logitech','Logitech G','Logitech for Creators'],status:'testing'},
  {key:'msi',name:'MSI',type:'brand',rule:1,markets:['UK'],cadence:'weekly',note:'goes in waves — on for a month, off for a month'},
  {key:'philips',name:'Philips',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days',note:'major recurring brand',status:'testing'},
  {key:'samsung',name:'Samsung',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days'},
  {key:'sandisk',name:'SanDisk',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'shark',name:'Shark',type:'brand',rule:1,markets:['UK'],cadence:'3 days'},
  {key:'skullcandy',name:'Skullcandy',type:'brand',rule:1,markets:['DE','FR','IT','ES'],cadence:'weekly'},
  {key:'steelseries',name:'SteelSeries',type:'brand',rule:1,markets:['DE','FR','IT','ES'],cadence:'weekly'},
  {key:'tassimo',name:'Tassimo',type:'brand',rule:1,markets:['UK'],cadence:'3 days',note:'run with Bosch'},
  {key:'tefal',name:'Tefal',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'}
];
const CADENCE_DAYS={daily:1,'2 days':2,'3 days':3,weekly:7,adhoc:0};
const CADENCE_LABEL={daily:'Daily','2 days':'Every 2 days','3 days':'Every 3 days',weekly:'Weekly',adhoc:'One-off'};
const MARKETS=['UK','DE','FR','IT','ES'];
const FLAG={UK:'🇬🇧',DE:'🇩🇪',FR:'🇫🇷',IT:'🇮🇹',ES:'🇪🇸'};
function srcAll(){let v=lsGet(SRC_KEY,null);if(!v||!v.length){v=SRC_SEED.map(s=>Object.assign({},s));lsSet(SRC_KEY,v);}
  /* seed rows Jack has not got yet (a newer build added them) are appended, never overwritten;
     seed-only fields (link, brands) are back-filled when the row has none */
  const have={};v.forEach(s=>have[s.key]=s);let changed=false;
  SRC_SEED.forEach(s=>{if(!have[s.key]){v.push(Object.assign({},s));changed=true;}
    else{['link','brands','status'].forEach(f=>{if(s[f]&&have[s.key][f]==null){have[s.key][f]=s[f];changed=true;}});}});
  /* b4: status replaces the old paused flag; anything unlabelled is paused (greyed) until Jack switches it on */
  v.forEach(x=>{if(!x.status){x.status='paused';changed=true;}x.paused=x.status==='paused';if(!x.owner){const seed=SRC_SEED.find(z=>z.key===x.key);x.owner=(seed&&seed.owner)||'VAs';changed=true;}});
  if(changed)lsSet(SRC_KEY,v);return v;}
function srcGet(key){return srcAll().find(s=>s.key===key)||null;}
function srcSave(src){const v=srcAll();const i=v.findIndex(s=>s.key===src.key);if(i<0)v.push(src);else v[i]=src;lsSet(SRC_KEY,v);}
function srcRemove(key){lsSet(SRC_KEY,srcAll().filter(s=>s.key!==key));}
function srcKeyFor(name){return name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
/* sorted: filters first, then brands A-Z */
function srcSorted(){return srcAll().sort((a,b)=>(a.type===b.type?0:a.type==='filter'?-1:1)||a.name.localeCompare(b.name));}
/* Keepa Product Finder link for a brand: the brand strings + Amazon down 9%+ vs its 90-day average.
   The link carries no marketplace — Keepa runs it on whichever locale is selected, so one link does all five. */
function finderLink(src){if(src.link)return src.link;
  const brands=(src.brands&&src.brands.length?src.brands:[src.name]).map(b=>b.toLowerCase()).join('###');
  const f={brand:{filterType:'autocomplete',filter:brands,type:'isOneOf'},
    AMAZON_deltaPercent90:{filterType:'number',type:'greaterThanOrEqual',filter:9,filterTo:null},
    productType:{values:['0'],filterType:'set'}};
  return 'https://keepa.com/#!finder/'+encodeURIComponent(JSON.stringify({f,s:[{colId:'AMAZON_deltaPercent90',sort:'desc'}],t:'g'}));}

/* ---- run log: one row per export processed per source per day. This is the 7-day count. ---- */
const RUN_KEY='bdl-sourcing-runs';
function runsAll(){return lsGet(RUN_KEY,[]);}
function runsFor(key){return runsAll().filter(r=>r.source===key);}
function runLast(key){const r=runsFor(key);return r.length?r[r.length-1]:null;}
const STATUS_LABEL={active:'Active',testing:'Testing',paused:'Paused'};
/* Keepa API cost if this run were automated: 10 per Finder query + 1 per ASIN pulled. Manual export = 0. */
function tokenEstimate(src){const last=runLast(src.key);const rowsIn=last?last.rowsIn:(src.type==='filter'?520:400);
  if(src.type==='filter')return 10+rowsIn;
  const eu=src.markets.filter(m=>m!=='UK').length;return 10*src.markets.length+rowsIn+Math.round(eu*rowsIn*0.25);}
function nextRun(src){const last=runLast(src.key);const days=CADENCE_DAYS[src.cadence];if(!last||!days)return null;
  const d=new Date(last.at);d.setDate(d.getDate()+days);d.setHours(7,0,0,0);return d;}
function dueState(src){if(src.status==='paused')return{label:'paused',cls:'paused',due:false};
  const last=runLast(src.key);const days=CADENCE_DAYS[src.cadence];
  if(!last)return{label:'never run',cls:'due',due:true};
  const age=(Date.now()-new Date(last.at).getTime())/864e5;
  if(!days)return{label:'one-off',cls:'',due:false};
  if(age>=days)return{label:'due',cls:'due',due:true};
  return{label:'in '+Math.max(1,Math.ceil(days-age))+'d',cls:'ok',due:false};}
function fmtWhen(iso){const d=new Date(iso);const t=new Date();const sameDay=d.toDateString()===t.toDateString();
  const y=new Date(t);y.setDate(t.getDate()-1);const yest=d.toDateString()===y.toDateString();
  const hm=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return(sameDay?'Today':yest?'Yesterday':d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}))+' '+hm;}

/* ---- history snapshots per source: NEW / BETTER / WORSE / UNCHANGED / GONE ---- */
const HIST_KEY='bdl-sourcing-history';
function histAll(){return lsGet(HIST_KEY,{});}
function histForget(key){const h=histAll();delete h[key];lsSet(HIST_KEY,h);}

/* ---- verdicts: who said what about an ASIN. The learning layer, test-mode edition. ---- */
const VERD_KEY='bdl-sourcing-verdicts',ME_KEY='bdl-sourcing-me',REASONS_KEY='bdl-sourcing-reasons';
const NO_REASONS_DEFAULT=['price wrong','not a real drop','restricted','IP','EU plug','too slow','other'];
function noReasons(){return lsGet(REASONS_KEY,NO_REASONS_DEFAULT);}
function me(){return lsGet(ME_KEY,'');}
function verdAll(){return lsGet(VERD_KEY,{});}
function verdGet(asin){return verdAll()[asin]||null;}
function verdSet(asin,v){const a=verdAll();if(!v)delete a[asin];else a[asin]=Object.assign({at:new Date().toISOString(),who:me()},v);lsSet(VERD_KEY,a);}

/* ---- ASIN facts: what a VA has confirmed about a product. Test-mode edition of the knowledge layer. ---- */
const FACT_KEY='bdl-sourcing-facts';
const PM_OPTIONS=['Currys','Argos','John Lewis','Brand direct'];
function factsAll(){return lsGet(FACT_KEY,{});}
function factGet(asin){return factsAll()[asin]||{};}
function factSet(asin,f){const a=factsAll();const clean=Object.assign({},a[asin]||{},f,{at:new Date().toISOString(),who:me()});
  if(!(clean.pm&&clean.pm.length)&&!clean.sell&&!clean.note)delete a[asin];else a[asin]=clean;lsSet(FACT_KEY,a);}

/* ---- Discounts: Jack's Discord #Sourcing VA reference (6 Sep 2026) + additions. Editable in Settings; Rule 2 reads this. ---- */
const DISC_KEY='bdl-sourcing-discounts';
const DISC_SEED=[{"name":"Acer","type":"brand","pct":15,"salePct":5,"fullPriceOnly":true,"verified":true},{"name":"AO","type":"retailer","flat":10,"minSpend":300,"verified":true,"note":"flat not pct - effective % falls as price rises"},{"name":"Argos","type":"retailer","pct":6,"verified":true},{"name":"B&Q","type":"retailer","pct":4,"verified":true},{"name":"Beauty Bay","type":"retailer","pct":15,"minSpend":50,"verified":true},{"name":"Boots","type":"retailer","pct":3,"verified":true,"note":"extra 10% on Bangers is IN-STORE ONLY - not usable for OA"},{"name":"Bosch","type":"brand","pct":10,"verified":true},{"name":"Currys","type":"retailer","pct":5,"verified":true},{"name":"De'Longhi","type":"brand","pct":10,"verified":true},{"name":"Dyson","type":"brand","pct":10,"fullPriceOnly":true,"verified":true},{"name":"e.l.f.","type":"brand","pct":20,"fullPriceOnly":true,"verified":true},{"name":"Gillette","type":"brand","pct":10,"fullPriceOnly":true,"verified":true,"note":"also via newsletter signup"},{"name":"Gtech","type":"brand","pct":19,"note":"Amazon Business tiers on the listing itself — Keepa never shows them (AirRAM: Keepa £168.99, Business 10 units £136.20 inc VAT = 19%). VA must open the listing on the Business account.","verified":true,"business":true},{"name":"Halfords","type":"retailer","pct":4,"verified":true},{"name":"Henry (Numatic)","type":"brand","pct":10,"verified":true},{"name":"Holland & Barrett","type":"retailer","note":"always has a code - rate varies, check at purchase"},{"name":"Honor","type":"brand","pct":10,"verified":true},{"name":"Hoover Direct","type":"brand","pct":15,"verified":true,"note":"Jack 12 Sep: use 15 to get the best COGs.  (two-item minimum)"},{"name":"Huawei","type":"brand","pct":15,"verified":true},{"name":"Huel","type":"brand","pct":10,"verified":true},{"name":"iHerb","type":"retailer"},{"name":"John Lewis","type":"retailer","pct":4,"verified":true},{"name":"Kenwood","type":"brand","note":"price-matched at most retailers — check Currys / JL","verified":false},{"name":"Lego","type":"brand","pct":5,"fullPriceOnly":true,"verified":true},{"name":"Lenovo","type":"brand","pct":10,"verified":true},{"name":"Logitech","type":"brand","note":"code via Honey/Coupert, rate varies"},{"name":"Marks Electrical","type":"retailer","pct":8,"verified":true,"note":"includes sale items"},{"name":"Miele","type":"brand","pct":10,"minSpend":300,"note":"NOT TESTED"},{"name":"Mirfama","type":"retailer"},{"name":"Ninja Kitchen","type":"brand","pct":9,"verified":true,"note":"includes sale items"},{"name":"OnePlus","type":"brand","pct":10,"verified":true},{"name":"Philips Home Appliances","type":"brand","pct":5,"verified":true},{"name":"Robert Dyas","type":"retailer","pct":5,"verified":true},{"name":"Russell Hobbs","type":"brand","pct":20,"verified":true},{"name":"Sage Appliances","type":"brand","pct":15,"minSpend":250,"note":"NOT TESTED"},{"name":"Samsung","type":"brand","pct":10,"verified":true,"note":"Samsung website only"},{"name":"Shark","type":"brand","pct":9,"verified":true,"note":"includes sale; also 10% via newsletter signup"},{"name":"Skinny Food Co","type":"brand"},{"name":"Sports Direct","type":"retailer","pct":3.5,"verified":true,"note":"delivery fee can exceed the discount on small orders"},{"name":"Stanley","type":"brand","pct":15,"verified":true},{"name":"Superdrug","type":"retailer","pct":10,"cap":5,"verified":true,"note":"CAPPED at £5 - effective rate falls below 10% above £50 spend; codes run out fast"},{"name":"Tefal","type":"brand","pct":10,"fullPriceOnly":true,"verified":true},{"name":"Tesco","type":"retailer","pct":3,"verified":true,"note":"local store"},{"name":"The Entertainer","type":"retailer","pct":5,"verified":true,"note":"TEMPORARY - reverts to 4%"},{"name":"The Perfume Shop","type":"retailer","pct":15,"verified":true},{"name":"Vax","type":"brand","pct":10,"verified":true},{"name":"Wahl","type":"brand","pct":15,"verified":true}];
function discAll(){let v=lsGet(DISC_KEY,null);if(!v||!v.length){v=DISC_SEED.map(x=>Object.assign({},x));lsSet(DISC_KEY,v);}return v;}
function discSave(list){lsSet(DISC_KEY,list);}
function discReset(){localStorage.removeItem(DISC_KEY);}
/* the brand's own channel for a product, if we have one */
function discForBrand(brand){const b=(brand||'').toLowerCase().trim();if(!b)return null;const w=b.split(/\s+/)[0];
  return discAll().find(e=>e.type==='brand'&&(e.name.toLowerCase()===b||e.name.toLowerCase().startsWith(w)||b.startsWith(e.name.toLowerCase().split(' ')[0])))||null;}
/* generic price-matchers: retailers that match Amazon then discount on top */
function discMatchers(){return discAll().filter(e=>e.type==='retailer'&&e.pct&&!e.fullPriceOnly&&['argos','currys','john lewis','ao','marks electrical','robert dyas'].includes(e.name.toLowerCase()));}
/* what a discount entry is worth on a sale-priced (price-matched) item, on a given cost */
function discRate(e,cost){if(!e)return 0;if(e.flat)return cost>=(e.minSpend||0)?Math.min(100,100*e.flat/cost):0;
  if(e.minSpend&&cost<e.minSpend)return 0;let p=e.fullPriceOnly?(e.salePct||0):(e.pct||0);
  if(e.cap&&cost*p/100>e.cap)p=100*e.cap/cost;return p;}
