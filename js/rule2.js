/* ============================================================================
   RULE 2 — MERA HIGH-TICKET UK FILTER  (v2, 12 Sep 2026)
   One UK Product Finder export in, scored list out. Deliberately lenient: OA discounts are
   invisible to the data, so keep the banger and tolerate a few duds rather than the other way round.

   v2 sell price — fitted on Jack's 10 graph reads of 12 Sep (mean error 7%, none over +15%, none under −6%):
     · a third party holds the Buy Box below Amazon right now  → sell = Buy Box today (Brother £331)
     · otherwise sell = max(Buy Box 90d, Buy Box 180d) × 1.25 (× 1.05 when no third party has ever traded it),
         capped at the higher of the FBA / FBM 90-day averages, and at the Buy Box all-time high
       (Vax £176 vs £180 · Siemens £597 vs £629 · Shark £216 vs £214 · S26+ £1,269 vs £1,200)
   v1 was FBA 90d else Buy Box 90d: +26% on the Vax, +11% on the Siemens, always high.
   ============================================================================ */
const R2={
  VAT:0.20, TARGET_ROI:5.0, MIN_SPM:10, PREP_MISC:1.00, DST:0.02, DEF_REF:15, DEF_FBA:3.50, SS_UK:0.15,
  SELL_UPLIFT:1.25, SELL_UPLIFT_NO3P:1.05, LONE_FBA_GAP:1.30, LONE_FBA_OFFERS:2, YOUNG_DAYS:90, THIN_REVIEWS:25,
  /* score = 100 * ( sat(profit*spm,6000)^0.50 * sat(roi,9)^0.24 * sat(profit,18)^0.26 )^0.8 */
  SAT:{money:6000,roi:9,profit:18},POW:{money:0.50,roi:0.24,profit:0.26,all:0.8},
  /* what each brand's own store / OA channel usually gives on top — keep if the needed % off <= max(10, this) */
  BRAND:{'acer':15,'bosch':10,'dyson':10,"de'longhi":10,'delonghi':10,'gillette':10,'henry':10,'numatic':10,
    'honor':10,'hoover':15,'huawei':15,'huel':10,'lego':5,'lenovo':10,'logitech':10,'miele':10,'ninja':9,
    'oneplus':10,'philips':5,'russell hobbs':20,'sage':15,'samsung':10,'shark':9,'stanley':15,'tefal':10,
    'vax':10,'wahl':15,'e.l.f.':20,'elf':20},
  /* generic UK retailers that price-match Amazon and then discount on top */
  RETAIL:[['Argos',6],['Currys',5],['John Lewis',4]],
  DEFAULT_ALLOW:10
};
function r2sat(x,h){return x>0?x/(x+h):0;}
function r2score(p,roi,spm){if(p<=0||roi<=0)return 1;
  const v=100*Math.pow(Math.pow(r2sat(p*spm,R2.SAT.money),R2.POW.money)*Math.pow(r2sat(roi,R2.SAT.roi),R2.POW.roi)*Math.pow(r2sat(p,R2.SAT.profit),R2.POW.profit),R2.POW.all);
  return Math.max(1,Math.min(100,Math.round(v)));}
function r2fees(sale,ref,fba){const r=sale*ref;return r+fba+R2.PREP_MISC+(r+fba)*R2.DST;}
function r2prof(sale,cost,ref,fba,vat){const V=1+(vat==null?R2.VAT:vat);const p=sale/V-cost/V-r2fees(sale,ref,fba);
  return[Math.round(p*100)/100,cost?Math.round(1000*p/cost)/10:0];}
/* what % off Amazon's price gets this to the target ROI */
function r2needed(sale,amz,ref,fba,t,vat){t=t==null?R2.TARGET_ROI:t;let lo=0,hi=0.95;
  for(let i=0;i<50;i++){const m=(lo+hi)/2;if(r2prof(sale,amz*(1-m),ref,fba,vat)[1]<t)lo=m;else hi=m;}return hi*100;}
/* brand rate = the brand's own channel from the Settings discount list (sale rate when full-price-only), falling back to the built-in map */
function r2brate(b,cost){if(typeof discForBrand==='function'){const e=discForBrand(b);if(e){const p=discRate(e,cost||100);return p>0?Math.round(p*10)/10:(e.business?null:0);}}
  const bl=(b||'').toLowerCase().trim();for(const k of Object.keys(R2.BRAND)){if(bl===k||bl.startsWith(k+' '))return R2.BRAND[k];}return null;}
function r2hasSS(r){if((r['Buy Box: Subscribe & Save']||'').trim().toLowerCase()==='yes')return true;
  const c=(r['One Time Coupon: Subscribe & Save %']||'').trim();return c!==''&&c!=='-';}
function r2days(s){if(!s)return null;const m=/^(\d{4})\/(\d{2})\/(\d{2})/.exec(s.trim());if(!m)return null;
  return Math.round((Date.now()-new Date(+m[1],m[2]-1,+m[3]).getTime())/864e5);}
/* the sell price and why — see the header comment */
function r2sell(r){
  const amz=kNum(r['Amazon: Current']),bbc=kNum(r['Buy Box: Current']),bb90=kNum(r['Buy Box: 90 days avg.']),bb180=kNum(r['Buy Box: 180 days avg.']);
  const f90=kNum(r['New, 3rd Party FBA: 90 days avg.']),fbm90=kNum(r['New, 3rd Party FBM: 90 days avg.']),hi=kNum(r['Buy Box: Highest']);
  const third=[f90,fbm90].filter(x=>x);
  if(bbc&&amz&&bbc<amz-0.5)return{sell:bbc,why:'3P holds the Buy Box today',conf:'high'};
  /* with 3P history the higher of the 90/180-day Buy Box averages carries the plateau; without it, the 90-day
     average alone is closest to Jack's calls (the 180-day one drags in the launch price on new listings) */
  const base=third.length?Math.max(bb90||0,bb180||0):(bb90||bb180||0);
  if(!base){const s=third.length?Math.max(...third):null;return{sell:s,why:s?'3P 90d average (no Buy Box history)':'',conf:'low'};}
  /* the +25% plateau effect only shows up where third parties have traded it; brand-new Amazon-only listings
     sit at the Buy Box average (S26+ 1.01x, S26 Ultra 0.97x, A37 0.97x on Jack's 12 Sep calls) */
  const up=third.length?R2.SELL_UPLIFT:R2.SELL_UPLIFT_NO3P;
  let s=base*up,why=`Buy Box ${bb180&&bb180>(bb90||0)?'180d':'90d'} +${Math.round((up-1)*100)}%`,conf=third.length?'medium':'low';
  if(third.length&&Math.max(...third)<s){s=Math.max(...third);why='capped at the 3P 90d average';conf='high';}
  if(hi&&hi<s){s=hi;why='capped at the Buy Box high';}
  return{sell:Math.round(s*100)/100,why,conf};}

/* rows = array of {Header:value} from ONE UK Product Finder export.
   facts = {ASIN:{pm:['Currys',...], sell:123, vat:0}} — what the VAs have confirmed (optional).
   opts = {vatFor:(row,fact)=>{rate,why,src}} — Rule 4 hook (b10). Without it every row is 20% VAT, as before.
   Rule 3 (Suz's grocery / S&S / Business filters) is this same maths — the input method never changes the rule.
   Returns {out:[qualifying, sorted by score], all:[every priced row], st:{...}} */
function rule2Compute(rows,facts,opts){facts=facts||{};opts=opts||{};
  const all=[],st={rows:rows.length,priced:0,demand:0,sell:0,kept:0};
  for(const r of rows){
    const a=(r.ASIN||'').trim();if(!a)continue;
    const amz=kNum(r['Amazon: Current']);if(!amz)continue;st.priced++;
    const bought=kNum(r['Monthly Sales Trends: Bought in past month']),drops=kNum(r['Sales Rank: Drops last 30 days'])||0;
    const spm=bought?bought:drops;if(spm<R2.MIN_SPM)continue;st.demand++;
    const S=r2sell(r);const fact=facts[a]||{};
    const sell=fact.sell||S.sell;if(!sell)continue;st.sell++;
    const vt=opts.vatFor?opts.vatFor(r,fact):{rate:R2.VAT,why:'',src:'default'};const vat=vt.rate;
    const ref=(kNum(r['Referral Fee %'])||R2.DEF_REF)/100,fba=kNum(r['FBA Pick&Pack Fee'])||R2.DEF_FBA;
    const brand=(r.Brand||'').trim();let eff=amz;const ap=[];
    const bd=kNum(r['Business Discount: Percentage']);if(bd){eff*=(1-bd/100);ap.push(`Business ${Math.round(bd)}%`);}
    const cp=kNum(r['One Time Coupon: Percentage']);if(cp){eff*=(1-cp/100);ap.push(`coupon ${Math.round(cp)}%`);}
    const ca=kNum(r['One Time Coupon: Absolute']);if(ca){eff-=ca;ap.push(`coupon £${ca.toFixed(2)}`);}
    if(r2hasSS(r)){eff*=(1-R2.SS_UK);ap.push(`S&S ${R2.SS_UK*100}%`);}
    eff=Math.round(eff*100)/100;
    const [p,roi]=r2prof(sell,eff,ref,fba,vat),br=r2brate(brand,amz),nd=r2needed(sell,eff,ref,fba,null,vat);const bEntry=(typeof discForBrand==='function')?discForBrand(brand):null;
    const kept=nd<=Math.max(R2.DEFAULT_ALLOW,br||R2.DEFAULT_ALLOW);
    const score=r2score(p,roi,Math.round(spm));
    /* what an extra retailer discount would do — brand direct, and the best generic price-matcher */
    const pot=[];
    if(br){const c=Math.round(amz*(1-br/100)*100)/100;const [pp,pr]=r2prof(sell,c,ref,fba,vat);pot.push({who:(bEntry?bEntry.name:brand.split(' ')[0]+' direct'),pct:br,cost:c,p:pp,roi:pr,score:r2score(pp,pr,Math.round(spm)),confirmed:(fact.pm||[]).some(x=>/direct|brand/i.test(x))});}
    const matchers=(typeof discMatchers==='function')?discMatchers().map(e=>[e.name,discRate(e,amz)]).filter(x=>x[1]>0):R2.RETAIL;
    matchers.forEach(([who,pct])=>{const c=Math.round(amz*(1-pct/100)*100)/100;const [pp,pr]=r2prof(sell,c,ref,fba,vat);pot.push({who,pct:Math.round(pct*10)/10,cost:c,p:pp,roi:pr,score:r2score(pp,pr,Math.round(spm)),confirmed:(fact.pm||[]).includes(who)});});
    const best=pot.reduce((m,x)=>x.score>m.score?x:m,{score:score,who:'',roi,p});
    /* history + risk signals */
    const f90=kNum(r['New, 3rd Party FBA: 90 days avg.']),fbm90=kNum(r['New, 3rd Party FBM: 90 days avg.']),bb90=kNum(r['Buy Box: 90 days avg.']);
    const fbaN=kNum(r['Buy Box Eligible Offer Counts: New FBA'])||0,fbmN=kNum(r['New FBM Offer Count: Current'])||0;
    const no3P=!f90&&!fbm90&&!fbmN;
    const age=r2days(r['Tracking since']);const reviews=kNum(r['Reviews: Rating Count'])||0;
    const loneFba=!!(f90&&bb90&&f90>bb90*R2.LONE_FBA_GAP&&fbaN<=R2.LONE_FBA_OFFERS);
    const ltd=!!(r['Deals: Badge']||'').trim();
    const chips=[];
    if(spm>=300)chips.push(['STRONG SALES','good']);else if(spm>=100)chips.push(['GOOD SALES','good']);
    if(p>=40)chips.push(['HIGH PROFIT','good']);
    if(roi>=20)chips.push(['HIGH ROI','good']);else if(roi>0&&roi<8)chips.push(['THIN MARGIN','warn']);
    if(p<=0)chips.push(['LOSS AT AMAZON PRICE','bad']);
    if(nd>0&&kept)chips.push([`NEEDS ${Math.round(nd)}% OFF`,'warn']);
    if(best.who&&best.score>score+5)chips.push([`→ ${best.score} WITH ${best.who.toUpperCase()} ${best.pct}%`,best.confirmed?'good':'info']);
    (fact.pm||[]).forEach(x=>chips.push([`PM CONFIRMED · ${x.toUpperCase()}`,'good']));
    if(bEntry&&bEntry.business)chips.push(['OPEN LISTING · BUSINESS TIERS','info']);
    else if(bEntry&&bEntry.fullPriceOnly&&!bEntry.salePct)chips.push([`${bEntry.name.toUpperCase()} ${bEntry.pct}% = FULL PRICE ONLY`,'warn']);
    else if(bEntry&&bEntry.note&&/not tested|varies/i.test(bEntry.note))chips.push([`${bEntry.name.toUpperCase()} CODE UNVERIFIED`,'warn']);
    if(ltd)chips.push(['LTD','warn']);
    if(no3P)chips.push(['NO 3P HISTORY','risk']);
    else if(!f90)chips.push(['NO FBA HISTORY','warn']);
    if(loneFba)chips.push(['FBA PRICE = ONE OFFER','warn']);
    if(age!=null&&age<R2.YOUNG_DAYS)chips.push([`${age}D OLD`,'warn']);
    else if(reviews<R2.THIN_REVIEWS)chips.push(['FEW REVIEWS','warn']);
    if(S.why.startsWith('3P holds'))chips.push(['3P HOLDS BUY BOX','info']);
    if(fact.sell)chips.push(['SELL SET BY VA','good']);
    if(!bought)chips.push(['DEMAND FROM DROPS','warn']);
    if(vat===0)chips.push([vt.src==='va'?'0% VAT · SET BY VA':vt.src==='source'?'0% VAT · FILTER':'0% VAT · CHECK',vt.src==='warn'?'warn':vt.src==='va'||vt.src==='source'?'good':'warn']);else if(vt.src==='va')chips.push(['20% VAT · SET BY VA','info']);else if(vt.src==='rule')chips.push(['20% VAT · APPLIANCE','info']);
    const o={ASIN:a,Product:r.Title||'',Brand:brand,Score:score,'Potential score':best.score,'Potential via':best.who?`${best.who} ${best.pct}%`:'',
      'Buy at £':amz,'After discount £':eff,'Discount applied':ap.join('; '),'Sell for £':sell,'Sell from':fact.sell?'VA':S.why,'Sell confidence':fact.sell?'set':S.conf,
      'Buy Box 90d £':bb90,'Buy Box 180d £':kNum(r['Buy Box: 180 days avg.']),'FBA 90d £':f90,'FBM 90d £':fbm90,'Buy Box high £':kNum(r['Buy Box: Highest']),
      'Profit £':p,'ROI %':roi,'Sells /mo':Math.round(spm),'Demand from':bought?'confirmed':'drops',
      '£ per month':Math.round(p*spm),'Needs % off':Math.round(nd*10)/10,'Brand discount %':br==null?'':br,
      'Check OA?':(br||nd>0)?'yes':'','FBA resale proven?':f90?'yes':'no','No 3P history?':no3P?'yes':'no','Limited time deal?':ltd?'yes':'no',
      'Amazon 90d drop %':kNum(r['Amazon: 90 days drop %'])||0,'Offers':kNum(r['New Offer Count: Current'])||0,'FBA offers':fbaN,'FBM offers':fbmN,
      'Reviews':reviews,'Age days':age==null?'':age,'VAT %':Math.round(vat*100),'VAT from':vt.src==='va'?'VA':vt.src==='source'?'filter':vt.src==='rule'?'Rule 4':'default','Tracking since':r['Tracking since']||'','Listed since':r['Listed since']||'',
      Keepa:`https://keepa.com/#!product/2-${a}`,'Buy link':`https://www.amazon.co.uk/dp/${a}`,'UK sell link':`https://www.amazon.co.uk/dp/${a}`,
      SAS:`https://sas.selleramp.com/sas/lookup?search_term=${a}&sas_cost_price=${eff.toFixed(2)}&sas_sale_price=${sell.toFixed(2)}`,
      kept,chips,pot,STATUS:'',Changed:'','Last seen':''};
    all.push(o);}
  const out=all.filter(o=>o.kept).sort((x,y)=>y.Score-x.Score||y['Potential score']-x['Potential score']||y['£ per month']-x['£ per month']);
  out.forEach((o,i)=>o['#']=i+1);st.kept=out.length;
  return{out,all,st};}
