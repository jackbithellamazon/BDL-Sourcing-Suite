/* BDL Sourcing — the OA check on the storefront audit (b321).
   Jack, 6 Nov 2026: "for stuff that isn't a2a — can these use google to see if it's an oa lead using the coupons and stuff I've sent over",
   then "1 yeah add one but I want to automate it as much as humanly possible".
   A rival product the still-a-lead check says is NOT a lead on Amazon UK, but would be under £X, gets an OA line. Jack's page only.
     · Free, always: the most each shop on the discount list (Settings) can charge and still make 10% once the code is off,
       plus Google ↗ — Google Shopping for the barcode when Keepa gave us one (the exact product), the title when not.
     · Automatic, once the bdl-sourcing Worker has a Google Shopping key (Worker v3, secret SERPER_API_KEY): the still-a-lead
       button also reads Google Shopping for those rows, keeps real UK shops only (no eBay / OnBuy / Amazon, nothing used or
       refurbished), takes the codes off and says ★ OA lead, OA lead? (check it) or how far over the cheapest shop is.
       One search a product (two when the barcode finds nothing), only when Jack presses a button, reused for 24 hours.
       No Keepa tokens: it runs on the numbers the still-a-lead check already has. */
const OA={ready:null,pinging:false,busy:false};
const OA_IDS='bdl-sourcing-audit-ids';     /* asin → {e: barcode, m: model} — from Keepa answers we already paid for */
const OA_SHOP='bdl-sourcing-audit-shop';   /* asin → {at, by:'ean'|'title', q, hits:[{s,on,pr,d,pct,c,p,roi,chk,l}]} */
const OA_USE='bdl-sourcing-shop-use';      /* {m:'2026-11', n} — searches this month, so the cost is never a surprise */
const OA_REUSE_H=24,OA_ROI=10,OA_KEEP=800;
/* marketplaces and price sites are not a shop Jack buys from; used stock is not the product */
const OA_MARKET=/ebay|onbuy|fruugo|manomano|\bwish\b|temu|aliexpress|amazon|etsy|facebook|cdiscount|vinted|back ?market|music ?magpie|\bcex\b|gumtree|depop|shpock|idealo|pricerunner|pricespy|google/i;
const OA_USED=/refurb|renewed|\bused\b|pre-?owned|open[- ]box|graded|second[- ]hand|ex[- ]display|b-?grade/i;
/* how the shops on the discount list name themselves on Google Shopping */
const OA_ALIAS={'ao':['ao','ao com'],'b&q':['b&q','b q','diy','b and q'],'henry (numatic)':['numatic','henry'],'hoover direct':['hoover'],'ninja kitchen':['ninja','sharkninja'],
  'shark':['shark','sharkclean','shark clean'],'philips home appliances':['philips'],'sage appliances':['sage'],'e.l.f.':['e l f','elf cosmetics'],
  'holland & barrett':['holland & barrett','holland and barrett','holland barrett'],'the entertainer':['the entertainer','entertainer','thetoyshop'],
  'the perfume shop':['the perfume shop','perfume shop'],"de'longhi":['delonghi','de longhi'],'sports direct':['sports direct','sportsdirect'],'beauty bay':['beauty bay','beautybay']};
/* shops that matter beyond the electrical chains, by Amazon's top category */
const OA_ROOT_EXTRA=[[/toys|games/,'The Entertainer'],[/sports/,'Sports Direct'],[/diy|garden/,'B&Q'],[/automotive|car & motor/,'Halfords'],[/beauty/,'Beauty Bay'],[/beauty|perfume|fragrance/,'The Perfume Shop']];

function oaJack(){return typeof isJack==='function'&&isJack()&&!(typeof audIsVA==='function'&&audIsVA());}
/* b322: read once, not once per row — a 500-row rival used to parse the whole store a thousand times a repaint */
const OA_C={};
function oaMemo(k){const raw=lsRaw(k),c=OA_C[k];if(c&&c.raw===raw)return c.v;let v={};try{v=JSON.parse(raw)||{};}catch(e){v={};}OA_C[k]={raw,v};return v;}
function oaIdsAll(){return oaMemo(OA_IDS);}
function oaIdsSave(products){if(!products||!products.length)return 0;const m=Object.assign({},oaIdsAll());let n=0;
  products.forEach(p=>{if(!p||!p.asin)return;const e=String((Array.isArray(p.eanList)&&p.eanList[0])||(Array.isArray(p.upcList)&&p.upcList[0])||'').trim();
    const md=String(p.model||p.partNumber||'').trim().slice(0,40);if(!e&&!md)return;const o=m[p.asin];if(o&&o.e===e&&o.m===md)return;m[p.asin]={e,m:md};n++;});
  if(n){let en=Object.entries(m);if(en.length>3000)en=en.slice(en.length-3000);lsSet(OA_IDS,Object.fromEntries(en));}return n;}
function oaShopAll(){return oaMemo(OA_SHOP);}
function oaShopSave(m){let en=Object.entries(m);if(en.length>OA_KEEP)en=en.sort((x,y)=>String(y[1].at).localeCompare(String(x[1].at))).slice(0,OA_KEEP);lsSet(OA_SHOP,Object.fromEntries(en));}
function oaUseGet(){const u=lsGet(OA_USE,null),m=today().slice(0,7);return u&&u.m===m?u.n:0;}
function oaUse(n){if(!n)return;lsSet(OA_USE,{m:today().slice(0,7),n:oaUseGet()+n});}

/* what you pay at shelf price S once the code is off — discRate already counts a full-price-only code at its sale rate,
   a minimum spend, a £ cap and a flat £ off, so a sale price never gets a code it would not get */
function oaCost(e,S){return S*(1-(discRate(e,S)||0)/100);}
/* the most the shop can charge for it to cost under T. The cost is straight between the breaks, so the answer is one of these */
function oaMaxShelf(e,T){if(!e||!(T>0))return null;const p=e.fullPriceOnly?(e.salePct||0):(e.pct||0);const c=[T];
  if(p>0&&p<100)c.push(T/(1-p/100));if(e.cap)c.push(T+e.cap);if(e.flat)c.push(T+e.flat);if(e.minSpend)c.push(e.minSpend);
  let best=T;c.forEach(S=>{S=Math.floor(S*100)/100;if(S>best&&oaCost(e,S)<=T+0.005)best=S;});return Math.floor(best*100)/100;}
/* the shops on the discount list worth showing for this product: its own brand store first, then the chains for its category */
function oaShops(root,brand){const out=[];const b=typeof discForBrand==='function'?discForBrand(brand):null;if(b&&!b.business&&(b.pct||b.flat))out.push(b);
  root=String(root||'').toLowerCase();const grocery=/grocery|health|beauty|pet|baby|drugstore/.test(root);
  const hard=/electronics|computers|large appliances/.test(root);const elec=/electronics|computers|home & garden|large appliances|diy|kitchen|garden|toys|sports|stationery|office/.test(root)||!root;
  const R=discAll().filter(e=>e.type==='retailer'&&(e.pct||e.flat));const has=n=>out.some(x=>x.name===n);
  (grocery?R.filter(e=>/boots|superdrug|tesco|holland/i.test(e.name))
    :R.filter(e=>/^(argos|currys|john lewis|ao|marks electrical|robert dyas)$/i.test(e.name)&&(hard||!/^(marks electrical|ao)$/i.test(e.name))&&(elec||!/^currys$/i.test(e.name))))
    .forEach(e=>{if(!has(e.name))out.push(e);});
  OA_ROOT_EXTRA.forEach(([re,n])=>{if(re.test(root)&&!has(n)){const e=R.find(x=>x.name===n);if(e)out.push(e);}});
  return out;}

/* ---- reading Google Shopping ---- */
function oaNorm(s){return String(s||'').toLowerCase().replace(/&amp;/g,'&').replace(/\.(com|co\.uk|uk|net)\b/g,' ').replace(/\b(uk|ltd|limited|store|official|shop|online|direct|plc)\b/g,' ').replace(/[^a-z0-9&]+/g,' ').replace(/\s+/g,' ').trim();}
function oaShopOf(source){const n=oaNorm(source);if(!n)return null;
  return discAll().find(e=>{const names=OA_ALIAS[e.name.toLowerCase()]||[oaNorm(e.name)];return names.some(x=>x&&(n===x||n.startsWith(x+' ')||(x.length>3&&n.startsWith(x))));})||null;}
function oaPrice(v){if(typeof v==='number')return v>0?v:null;const m=String(v||'').replace(/,/g,'').match(/£\s*(\d+(?:\.\d{1,2})?)/);return m?+m[1]:null;}
function oaCompact(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');}
/* model numbers to recognise the same product by: Keepa's model first, else letter-and-digit words in the title (not sizes like 1500W or 256GB) */
function oaModels(model,title){const unit=/^\d+(\.\d+)?(w|kw|v|l|ml|cl|mm|cm|m|g|kg|gb|tb|mb|mah|hz|in|inch|pcs|pack|x|k|p)$/i;
  const ok=t=>t.length>=4&&/[a-z]/i.test(t)&&/\d/.test(t)&&!unit.test(t);let L=[];const m=oaCompact(model);
  if(ok(m))L=[m,m.replace(/(uk|eu|gb)$/,'')];
  else L=String(title||'').split(/[\s,()\/|–-]+/).map(oaCompact).filter(ok).slice(0,3);
  return[...new Set(L.filter(x=>x.length>=4))];}
function oaTitleQ(title){let t=String(title||'').replace(/\s+/g,' ').trim();const cut=t.split(/ [–-] |, | \| /)[0];if(cut.length>=25)t=cut;return t.slice(0,90);}
function oaGq(a){const ids=oaIdsAll()[a]||{};return ids.e||oaTitleQ((audState.prod[a]||{}).title);}
/* Google's answer → the UK shops that have it, cheapest first, each with what it costs after the code and what it makes */
function oaHits(a,items){const r=audNowAll()[a]||{},p=audState.prod[a]||{},ids=oaIdsAll()[a]||{};const models=oaModels(ids.m,p.title);
  const bw=oaCompact(String(p.brand||'').split(/\s+/)[0]);const by={};
  (items||[]).forEach(x=>{const t=String(x.title||'');const pr=oaPrice(x.extracted_price!=null?x.extracted_price:x.price);if(!(pr>0)||OA_USED.test(t))return;
    const src=String(x.source||x.seller||x.merchant||'').trim();if(!src||OA_MARKET.test(src))return;
    const e=oaShopOf(src),del=oaPrice(x.delivery)||0,ct=oaCompact(t);
    const pct=e?Math.round((discRate(e,pr)||0)*10)/10:0,c=Math.round((pr*(1-pct/100)+del)*100)/100;
    const chk=!!((bw.length>=2&&!ct.includes(bw))||(models.length&&!models.some(m=>ct.includes(m))));
    const pf=r.sell&&r.fba!=null&&typeof brProfit==='function'?brProfit(r.sell,c,r.ref,r.fba,r.kg||0,null,''):null;
    const h={s:e?e.name:src.slice(0,40),on:!!e,pr,d:del,pct,c,p:pf?pf[0]:null,roi:pf?pf[1]:null,chk,l:String(x.link||x.product_link||'').slice(0,300)};
    const k=h.s.toLowerCase(),o=by[k];if(!o||(o.chk&&!h.chk)||(o.chk===h.chk&&h.c<o.c))by[k]=h;});
  return Object.values(by).sort((x,y)=>(x.chk-y.chk)||(x.c-y.c)).slice(0,5).map((h,i)=>i<2?h:Object.assign({},h,{l:''}));}
/* ★ lead = a shop on your list, the same product, 10%+ · lead? = 10%+ but a shop you have no code for, or not sure it is the same model */
function oaVerdict(a){const s=oaShopAll()[a];if(!s)return null;const H=s.hits||[];const L=H.filter(h=>h.roi!=null&&h.roi>=OA_ROI&&h.p>0).sort((x,y)=>x.c-y.c);
  const firm=L.find(h=>h.on&&!h.chk),maybe=L.find(h=>!h.on||h.chk);
  if(firm)return{k:'lead',h:firm,s};if(maybe)return{k:'maybe',h:maybe,s};const sure=H.filter(h=>!h.chk).sort((x,y)=>x.c-y.c);return{k:H.length?'no':'none',h:sure[0]||H[0]||null,s};}
function oaFresh(a){const s=oaShopAll()[a];return!!s&&Date.now()-new Date(s.at).getTime()<OA_REUSE_H*3600e3;}
/* rows the still-a-lead check said are not a lead on Amazon UK but would be under £X */
function oaWants(a){const r=audNowAll()[a];return!!(r&&!r.none&&!r.lead&&r.max10);}
function oaNeed(asins){return(asins||[]).filter(a=>oaWants(a)&&!oaFresh(a));}

/* ---- the Worker ---- */
/* free: Worker v3 answers /shop?ping=1 with {shop:true} once the key is in; v2 does not know the route, so it stays off */
async function oaReady(){if(OA.ready!=null)return OA.ready;try{const j=await (await fetch(WORKER+'/shop?ping=1')).json();OA.ready=!!(j&&j.ok&&j.shop);}catch(e){OA.ready=false;}return OA.ready;}
function oaPing(){if(OA.ready!=null||OA.pinging||!oaJack())return;OA.pinging=true;
  oaReady().then(v=>{OA.pinging=false;if(v&&typeof renderAudit==='function'&&typeof auView!=='undefined'&&auView.shelf)renderAudit();});}
async function oaFetch(q){try{const j=await (await fetch(WORKER+'/shop?q='+encodeURIComponent(q))).json();if(!j||!j.ok)return null;return Array.isArray(j.items)?j.items:[];}catch(e){return null;}}
async function oaCheck(asins,onStep){const list=oaNeed(asins);if(!list.length)return{n:0,s:0,lead:0};if(!oaJack()||!(await oaReady()))return{n:0,s:0,lead:0,off:true};
  OA.busy=true;let n=0,s=0,fail=0;const m=Object.assign({},oaShopAll());
  const one=async a=>{const ids=oaIdsAll()[a]||{},tq=oaTitleQ((audState.prod[a]||{}).title);let by=ids.e?'ean':'title',q=ids.e||tq;if(!q)return;
    let items=await oaFetch(q);s++;if(items==null){fail++;return;}
    let hits=oaHits(a,items);
    if(!hits.length&&by==='ean'&&tq){const it2=await oaFetch(tq);s++;if(it2){by='title';q=tq;hits=oaHits(a,it2);}}   /* the barcode found nothing — once more by the title */
    m[a]={at:nowIso(),by,q:String(q).slice(0,90),hits};n++;if(onStep)onStep(n,list.length);};
  try{for(let i=0;i<list.length;i+=4){await Promise.all(list.slice(i,i+4).map(one));if(fail>=4&&!n)break;}}
  finally{oaShopSave(m);oaUse(s);OA.busy=false;}
  return{n,s,fail,lead:list.filter(a=>{const v=oaVerdict(a);return v&&v.k==='lead';}).length};}

/* ---- the line on the row ---- */
function oaWhen(at){const d=String(at||'').slice(0,10);return d===today()?'today':(typeof trD==='function'?trD(d):d);}
function oaLine(a){if(!oaJack()||!oaWants(a))return'';oaPing();const r=audNowAll()[a],p=audState.prod[a]||{},e=escapeHtml;
  const g=oaGq(a),bar=/^\d{8,14}$/.test(g);
  const gl=g?`<a class="oag" href="https://www.google.co.uk/search?tbm=shop&q=${encodeURIComponent(g)}" target="_blank" rel="noopener" title="${e('Google Shopping for '+(bar?'the barcode '+g+' — the exact product':'“'+g+'” — check it is the same model'))}">Google ↗</a>`:'';
  const v=oaVerdict(a);
  if(v&&(v.k==='lead'||v.k==='maybe')){const h=v.h,why=v.k==='maybe'?(h.chk?'check it is the same model':'no code for this shop on your list — check it'):'';
    const tip=`Google Shopping ${oaWhen(v.s.at)} (${v.s.by==='ean'?'barcode':'title'} search): ${h.s} ${gbp(h.pr)}${h.pct?` less your ${h.pct}% code`:''}${h.d?` + ${gbp(h.d)} delivery`:''} = ${gbp(h.c)}. At today's Amazon sell (${gbp(r.sell)}) that is ${gbp(h.p)} profit, ${h.roi}% ROI. Prices on Google can be a few hours old — open the shop before you buy.`;
    return`<span class="ofl oa ${v.k}" title="${e(tip)}"><b class="oft">${v.k==='lead'?'★ OA lead':'OA lead?'}</b><span class="ofx">${e(h.s)} ${gbp(h.pr)}${h.pct?` − ${h.pct}%`:''}${h.d?` + ${gbp(h.d)} delivery`:''} = <b>${gbp(h.c)}</b> → ${gbp(h.p)} profit · ${h.roi}% ROI${why?` · ${why}`:''}${h.l?` <a class="oag" href="${e(h.l)}" target="_blank" rel="noopener">${e(h.s)} ↗</a>`:''} ${gl}</span></span>`;}
  if(v){const h=v.h;const txt=h?`cheapest UK shop: ${e(h.s)} ${gbp(h.pr)}${h.pct?` − ${h.pct}%`:''} = ${gbp(h.c)} — ${gbp(h.c-r.max10)} over the ${gbp(r.max10)} it needs${h.chk?' (check it is the same model)':''}`:'no UK shop on Google Shopping has it';
    return`<span class="ofl oa no" title="${e(`Google Shopping ${oaWhen(v.s.at)} (${v.s.by==='ean'?'barcode':'title'} search) — not an OA lead at today's prices. Checked again after ${OA_REUSE_H} hours when you press the button.`)}"><b class="oft">OA</b><span class="ofx">${txt} · checked ${oaWhen(v.s.at)} ${gl}</span></span>`;}
  const L=oaShops(r.root||p.root,p.brand).map(x=>({x,m:oaMaxShelf(x,r.max10)})).filter(o=>o.m&&o.m>r.max10+0.005).slice(0,5);
  const fp=L.filter(o=>o.x.fullPriceOnly&&o.x.pct>(o.x.salePct||0)).map(o=>`${o.x.name}: ${o.x.pct}% only on full price, counted at ${o.x.salePct||0}%`);
  const tip=`To make 10% at today's Amazon sell (${gbp(r.sell)}) it has to cost under ${gbp(r.max10)}. Each shop is the most it can charge, before delivery, with your code from Settings off.`+(fp.length?' '+fp.join(' · ')+'.':'')+(OA.ready?' Press the shop-price button and the app reads Google for you.':' Automatic shop prices switch on when the Google Shopping key is on the Worker.');
  return`<span class="ofl oa" title="${e(tip)}"><b class="oft">OA</b><span class="ofx">buy under ${gbp(r.max10)}${L.length?' · shelf price up to '+L.map(o=>`${e(o.x.name)} <b>${gbp(o.m)}</b>`).join(' · '):''} ${gl}</span></span>`;}
/* the shelf's to-do rows that want a shop check — the toolbar button and the count on it */
function oaShelfNeed(sh){if(!sh||!oaJack())return[];const V=audAll();return sh.items.filter(it=>!audIsOld(it,sh)&&audStatus(V[it.a],audSells(sh.id,it.a))==='todo').map(it=>it.a).filter(a=>oaWants(a)&&!oaFresh(a));}
function oaBtn(sh){oaPing();if(OA.ready!==true)return'';const n=oaShelfNeed(sh).length;if(!n)return'';
  return` · <button type="button" class="linkbtn" id="auShopChk" title="Reads Google Shopping for the to-do rows that are not a lead on Amazon UK and works out each shop's price after your codes. One search a product (two when the barcode finds nothing). No Keepa tokens. ${oaUseGet()} searches so far this month.">🛒 shop prices for ${n} · up to ${n*2} searches</button>`;}
async function oaRun(id){const sh=audShelf(id);const list=oaShelfNeed(sh);if(!list.length){toast('Every row has shop prices from the last 24 hours');return;}
  auNote(`Shop prices on Google · 0 of ${list.length}`,0);const R=await oaCheck(list,(n,t)=>auNote(`Shop prices on Google · ${n} of ${t}`,n/t*100));auNote('');
  if(auView.shelf===id)renderAudit();
  toast(R.off?'Automatic shop prices are not switched on — the Worker needs the Google Shopping key':R.n?`${R.n} checked on Google · ${R.lead} OA lead${R.lead===1?'':'s'} (green) · ${R.s} search${R.s===1?'':'es'}`:'Google Shopping did not answer — try again in a minute',!!R.off||!R.n);}
