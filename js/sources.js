/* BDL Sourcing — the BRANDS registry. What we run, where, with which rule.
   Test mode: lives in localStorage. Later this becomes the src_source table. */
const SRC_KEY='bdl-sourcing-sources';
/* Seed from Jack's list, 11 Sep 2026. Alphabetical. markets = where we BUY; we always sell UK. */
const SRC_SEED=[
  {key:'mera-highticket',name:'Mera high-ticket',type:'filter',rule:2,markets:['UK'],cadence:'daily',note:'Keepa Product Finder filter · £60+ Buy Box · Amazon down 9%+',owner:'Mera'},
  {key:'suz-tea-coffee',name:'Suz tea & coffee',type:'filter',rule:3,markets:['UK'],cadence:'daily',note:'Rule 3 not designed yet — needs the filter link + one export',owner:'Suz',disabled:true},
  {key:'acer',name:'Acer',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'massive brand for us'},
  {key:'asus',name:'ASUS',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days',note:'major recurring brand'},
  {key:'bls',name:'BLS',type:'brand',rule:1,markets:['UK'],cadence:'weekly'},
  {key:'bosch',name:'Bosch',type:'brand',rule:1,markets:['UK'],cadence:'3 days',note:'run with Tassimo'},
  {key:'braun',name:'Braun',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'corsair',name:'Corsair',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'dji',name:'DJI',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'weekly'},
  {key:'elgato',name:'Elgato',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'gopro',name:'GoPro',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'gtech',name:'Gtech',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'very often has a Business discount even when the data does not show it'},
  {key:'hoover',name:'Hoover',type:'brand',rule:1,markets:['UK'],cadence:'weekly',note:'also caught by the Mera filter'},
  {key:'lenovo',name:'Lenovo',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'unbelievable brand to run'},
  {key:'logitech',name:'Logitech',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days'},
  {key:'msi',name:'MSI',type:'brand',rule:1,markets:['UK'],cadence:'weekly',note:'goes in waves — on for a month, off for a month'},
  {key:'philips',name:'Philips',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days',note:'major recurring brand'},
  {key:'samsung',name:'Samsung',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'2 days'},
  {key:'sandisk',name:'SanDisk',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'},
  {key:'shark',name:'Shark',type:'brand',rule:1,markets:['UK'],cadence:'3 days'},
  {key:'skullcandy',name:'Skullcandy',type:'brand',rule:1,markets:['DE','FR','IT','ES'],cadence:'weekly'},
  {key:'steelseries',name:'SteelSeries',type:'brand',rule:1,markets:['DE','FR','IT','ES'],cadence:'weekly'},
  {key:'tassimo',name:'Tassimo',type:'brand',rule:1,markets:['UK'],cadence:'3 days',note:'run with Bosch'},
  {key:'tefal',name:'Tefal',type:'brand',rule:1,markets:['UK','DE','FR','IT','ES'],cadence:'3 days'}
];
const CADENCE_DAYS={daily:1,'2 days':2,'3 days':3,weekly:7,adhoc:0};
function srcAll(){let v=lsGet(SRC_KEY,null);if(!v||!v.length){v=SRC_SEED.map(s=>Object.assign({},s));lsSet(SRC_KEY,v);}
  /* seed rows Jack has not got yet (a newer build added them) are appended, never overwritten */
  const have=new Set(v.map(s=>s.key));let changed=false;
  SRC_SEED.forEach(s=>{if(!have.has(s.key)){v.push(Object.assign({},s));changed=true;}});
  if(changed)lsSet(SRC_KEY,v);return v;}
function srcGet(key){return srcAll().find(s=>s.key===key)||null;}
function srcSave(src){const v=srcAll();const i=v.findIndex(s=>s.key===src.key);if(i<0)v.push(src);else v[i]=src;lsSet(SRC_KEY,v);}
function srcRemove(key){lsSet(SRC_KEY,srcAll().filter(s=>s.key!==key));}
function srcKeyFor(name){return name.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
/* sorted: filters first, then brands A-Z */
function srcSorted(){return srcAll().sort((a,b)=>(a.type===b.type?0:a.type==='filter'?-1:1)||a.name.localeCompare(b.name));}

/* ---- run log: one row per export processed. This is the 7-day count. ---- */
const RUN_KEY='bdl-sourcing-runs';
function runsAll(){return lsGet(RUN_KEY,[]);}
function runsFor(key){return runsAll().filter(r=>r.source===key);}
function runLast(key){const r=runsFor(key);return r.length?r[r.length-1]:null;}
function runAdd(run){const v=runsAll();v.push(run);if(v.length>400)v.splice(0,v.length-400);lsSet(RUN_KEY,v);}
function dueState(src){const last=runLast(src.key);const days=CADENCE_DAYS[src.cadence];
  if(!last)return{label:'never run',cls:'due'};
  const age=(Date.now()-new Date(last.at).getTime())/864e5;
  if(!days)return{label:'ad-hoc',cls:''};
  if(age>=days)return{label:'due · last '+Math.floor(age)+'d ago',cls:'due'};
  return{label:'next in '+Math.max(1,Math.ceil(days-age))+'d',cls:'ok'};}

/* ---- history snapshots per source: NEW / BETTER / WORSE / UNCHANGED / GONE ---- */
const HIST_KEY='bdl-sourcing-history';
function histAll(){return lsGet(HIST_KEY,{});}
function histPrev(key){const h=histAll()[key]||[];return h.length?h[h.length-1]:null;}
function histPush(key,snap){const h=histAll();h[key]=h[key]||[];h[key].push({stamp:stamp(),snap});if(h[key].length>40)h[key]=h[key].slice(-40);lsSet(HIST_KEY,h);}
function histForget(key){const h=histAll();delete h[key];lsSet(HIST_KEY,h);}

/* ---- verdicts: who said what about an ASIN. The learning layer, test-mode edition. ---- */
const VERD_KEY='bdl-sourcing-verdicts';
const NO_REASONS=['price wrong','not a real drop','restricted','IP','EU plug','too slow','other'];
function verdAll(){return lsGet(VERD_KEY,{});}
function verdGet(asin){return verdAll()[asin]||null;}
function verdSet(asin,v){const a=verdAll();if(!v)delete a[asin];else a[asin]=Object.assign({at:new Date().toISOString()},v);lsSet(VERD_KEY,a);}
