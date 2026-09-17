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
  SELL_UPLIFT:1.25, MOVED:0.70, FBM_LIFT:1.10, SELL_UPLIFT_NO3P:1.05, LOW_TICKET:60, REGIME_GAP:1.35, LONE_FBA_GAP:1.30, LONE_FBA_OFFERS:2, YOUNG_DAYS:90, THIN_REVIEWS:25,
  /* score = 100 * ( sat(profit*spm,6000)^0.50 * sat(roi,9)^0.24 * sat(profit,18)^0.26 )^0.8
     under £60 (14 Sep, Jack: WoodWick candle £3.08 × 300/mo at 21% ROI "is a good lead", scored 28) the money and profit scales
     are a quarter of the high-ticket ones: £1,500/month and £6/unit saturate instead of £6,000 and £18 */
  SAT:{money:6000,roi:9,profit:18},
  /* b38 (Jack, 15 Sep: "I thought it would be pretty good at over 20% ROI" — the Hogwarts model, 25% on 100/mo, scored 33 because half the
     score was money-a-month): under £60 the score leans on ROI and profit a unit; volume still counts but half-saturates at £600/mo.
     Hogwarts 33→53, WoodWick 58→72, BioEars 63→76, Pepsi 64→73. Over £60 is untouched. */
  /* b39 (Jack, 15 Sep 06:30: "100% ROI, £1, 1K+ a month is a banger if I go deep on it") — under £60 profit a unit barely matters once it
     clears £1.50; ROI and volume carry it. £1/100%/1,000 → 75, £1.50/60%/2,000 → 82, Hogwarts £2.49/25%/100 → 59, £1/15%/300 → 55. */
  SAT_LOW:{money:300,roi:20,profit:1},POW:{money:0.50,roi:0.24,profit:0.26,all:0.8},POW_LOW:{money:0.38,roi:0.5,profit:0.12,all:0.8},   /* b40: Jack — "£1 at 100% on 1,000 a month is like an 80" */
  /* what each brand's own store / OA channel usually gives on top — keep if the needed % off <= max(10, this) */
  BRAND:{'acer':15,'bosch':10,'dyson':10,"de'longhi":10,'delonghi':10,'gillette':10,'henry':10,'numatic':10,
    'honor':10,'hoover':15,'huawei':15,'huel':10,'lego':5,'lenovo':10,'logitech':10,'miele':10,'ninja':9,
    'oneplus':10,'philips':5,'russell hobbs':20,'sage':15,'samsung':10,'shark':9,'stanley':15,'tefal':10,
    'vax':10,'wahl':15,'e.l.f.':20,'elf':20},
  /* generic UK retailers that price-match Amazon and then discount on top */
  RETAIL:[['Argos',6],['Currys',5],['John Lewis',4]],
  DEFAULT_ALLOW:10, MIN_SCORE:35, MIN_ROI_LOW:10   /* b45 (Jack): "I won't buy anything under 10% ROI on the lower-ticket side" — own price or with a code */   /* b41 (Jack, 15 Sep: "the shit shouldn't be on her thing to look at") — a row must score 35, on its own or with a code, to be a lead */
};
function r2sat(x,h){return x>0?x/(x+h):0;}
function r2score(p,roi,spm,low){if(p<=0||roi<=0)return 1;const S=low?R2.SAT_LOW:R2.SAT,P=low?(R2.POW_LOW||R2.POW):R2.POW;
  const v=100*Math.pow(Math.pow(r2sat(p*spm,S.money),P.money)*Math.pow(r2sat(roi,S.roi),P.roi)*Math.pow(r2sat(p,S.profit),P.profit),P.all);
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
  /* Under £60 (14 Sep 2026, fitted on 13 of Jack's grocery calls): Amazon IS the market on consumables, so no plateau uplift.
     Sell = the HIGHER of the Buy Box 90/180-day averages (Sharpie £8.75: the 180d carries the normal price when Amazon has just
     dipped), capped at the 3P FBA 90-day average when there is one (Nicorette £9.82, Grenade £12.00) and at the Buy Box high.
     Not capped at Amazon's own average — that dragged Sharpie to £7.01. Shark £25.22, Febreze £18.29, Starbucks £32.48, MacuShield
     £13.12, Solgar £9.89 all land within his calls. £60 = Mera's floor, so her rows never come through here; YSL at £50 does. */
  /* b27 (Jack, 14 Sep midnight: Canon PIXMA TS4150i, Buy Box average £56 with FBA sellers at £60–62 and 3P winning the box a third of
     the time — his sell £62–69, the consumables rule said £56): electronics, computers and large appliances are never "Amazon is the
     market" goods, so they take the plateau model whatever the price. Grocery, beauty, home, stationery stay on the under-£60 rule. */
  const hardGoods=/electronics|computers|large appliances/.test((r['Categories: Root']||'').toLowerCase())
    &&!/\b(ink|inks|toner|cartridges?|batter(?:y|ies)|film|refills?|bottle)\b/i.test(r.Title||'');   /* inks, toner, batteries, film = consumables: Amazon is the market */
  if(!hardGoods&&(bb90||bb180||amz||0)<R2.LOW_TICKET){const base=[bb90,bb180].filter(x=>x);
    if(!base.length){const s=third.length?Math.min(...third):null;return{sell:s,why:s?'3P 90d average (no Buy Box history)':'',conf:'low'};}
    /* the higher of the two averages carries the normal price after a short dip (Sharpie) — unless the 180d is a different price
       regime altogether (L'OR pods: 90d £10.82, 180d £34.24 from a £60 launch) — then the 90d is the truth */
    const regime=bb90&&bb180&&bb180>bb90*R2.REGIME_GAP;
    let s=regime?bb90:Math.max(...base),why=regime?'Buy Box 90d average (180d is an old higher price) · no uplift':`Buy Box ${base.length===2?'90/180d':'90d'} average · no uplift (under £${R2.LOW_TICKET})`,conf='medium';
    /* b62 (Jack, 16 Sep, Nescafé Decaf 100g x6: "sell price for me is 20+, no FBA seller under 21, 0% VAT, fast selling"):
       never cap below where the FBA sellers actually are TODAY. When the cheapest live FBA offer sits above the 90-day FBA
       average, that live offer is the cap. It only ever lifts the sell back towards the Buy Box average — never past it.
       Measured on his tea & coffee, S&S, A2A £10-40 and Business exports: one extra lead (that jar), none lost. */
    const fcur=kNum(r['New, 3rd Party FBA: Current']);
    const fCap=(f90&&fcur&&fcur>f90)?fcur:f90;
    if(fCap&&fCap<s){s=fCap;why=fCap===fcur&&f90&&fcur>f90?'capped at the cheapest FBA offer live now':'capped at the FBA 90d average';}
    if(hi&&hi<s){s=hi;why='capped at the Buy Box high';}
    return{sell:Math.round(s*100)/100,why,conf};}
  /* £60+ — refit 14 Sep evening on Jack's calls: Vivobook 15 £425–450 against a lone FBA seller parked at £599.99 while FBM sat at
     £399 and the Buy Box slid £502 → £422 → £314; IdeaPad Chromebook £325 with 26 sellers; Siemens EQ500 £596 with every 3P channel
     at £674–698; Galaxy Book4 Pro £1,700–1,800 with one FBM at £2,499; STATUS toaster "never sell it" after a month flat at £23.95
     against an £86 90-day average; Sonicare 5300 "it tanked", £85–89.
     · the base is the Buy Box 90-day average (the 180-day drags the old regime in);
     · a month sitting 30%+ under that base, with no FBA seller or an FBA average that fell too, means the price moved — the
       30-day average is the base (toaster → loss → dropped);
     · a plateau above the Buy Box is proven by FBA history and its height is the LOWEST 3P channel, FBA or FBM, because the higher
       one can be a parked seller nobody buys from. Sell = base +25%, never above that floor; without proof, +5%.
     Unchanged by design: S26 Ultra £1,393.96 (no 3P, +5%), Book4 £1,788.23 (FBM-only is not proof). */
  const bb30=kNum(r['Buy Box: 30 days avg.']),f30=kNum(r['New, 3rd Party FBA: 30 days avg.']);
  let base=bb90||bb180||0,baseWhy='Buy Box 90d';
  if(!base){const s=third.length?Math.max(...third):null;return{sell:s,why:s?'3P 90d average (no Buy Box history)':'',conf:'low'};}
  const moved=!!(bb30&&bb30<base*R2.MOVED&&(!f90||(f30&&f30<f90*0.9)));
  if(moved){base=bb30;baseWhy='Buy Box 30d (price moved down)';}
  /* the lowest 3P channel is the ceiling either way: above the base it is the plateau height, below it it is what 3P actually sells at
     (Melitta FBA £102 against a £134 Buy Box average, Hisense TV FBA £473 against £609) */
  /* an FBM seller prices under FBA for the same sale (Vax SpinScrub: FBM £158, FBA £227, Jack £180; Vivobook: FBM £399, Jack £425–450),
     so the FBM channel counts at +10% before it can cap anything */
  /* b26 (Jack, 14 Sep late): Shark upright £200–205 against FBA 90d £220 / 30d £198, Jet 75E £265 against £283 / £261, Ninja Blast
     £79–85 against £87 / £71 — a falling FBA channel is priced between where it was and where it is: the floor is the midpoint of the
     30- and 90-day FBA averages when the 30-day is lower (Shark £209, Jet £272, Blast £79 — all within 3% of his calls) */
  const fbaFloor=f90?((f30&&f30<f90)?(f30+f90)/2:f90):0;
  const fbmAdj=fbm90?fbm90*R2.FBM_LIFT:0,chans=[fbaFloor,fbmAdj].filter(x=>x);
  const lowest=chans.length?Math.min(...chans):0;
  const proven=!!f90&&lowest>base*R2.SELL_UPLIFT_NO3P;
  const up=proven?R2.SELL_UPLIFT:R2.SELL_UPLIFT_NO3P;
  let s=base*up,why=`${baseWhy} +${Math.round((up-1)*100)}%`,conf=proven?'medium':(moved?'medium':'low');
  if(lowest&&lowest<s){s=lowest;why='capped at the 3P floor (lowest 3P average)';conf='high';}
  if(hi&&hi<s){s=hi;why='capped at the Buy Box high';}
  return{sell:Math.round(s*100)/100,why,conf};}

/* rows = array of {Header:value} from ONE UK Product Finder export.
   facts = {ASIN:{pm:['Currys',...], sell:123, vat:0}} — what the VAs have confirmed (optional).
   opts = {vatFor:(row,fact)=>{rate,why,src}} — Rule 4 hook (b10). Without it every row is 20% VAT, as before.
   Every UK filter (Mera's electricals, Suz's S&S / Business / tea & coffee) runs this same maths — the filter never changes the rule;
   the row does: price band picks the sell model, Rule 4 picks the VAT, S&S / Business / coupons adjust the buy price when Keepa shows them.
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
    const low=sell<R2.LOW_TICKET;const score=r2score(p,roi,Math.round(spm),low);
    /* what an extra retailer discount would do — brand direct, and the best generic price-matcher */
    const pot=[];
    if(br){const c=Math.round(amz*(1-br/100)*100)/100;const [pp,pr]=r2prof(sell,c,ref,fba,vat);pot.push({who:(bEntry?bEntry.name:brand.split(' ')[0]+' direct'),pct:br,cost:c,p:pp,roi:pr,score:r2score(pp,pr,Math.round(spm),low),confirmed:(fact.pm||[]).some(x=>/direct|brand/i.test(x))});}
    /* which retailers could price-match THIS product: electricals only get the electrical chains; grocery / health / beauty get none
       (Boots, Superdrug and Tesco have their own prices, so there is nothing to compute — the VA checks them by eye) */
    const root=(r['Categories: Root']||'').toLowerCase();
    const grocery=/grocery|health|beauty|pet|baby|drugstore/.test(root);
    const elec=/electronics|computers|home & garden|large appliances|diy|kitchen|garden|toys|sports|stationery|office/.test(root)||!root;
    /* b34: Marks Electrical and AO only stock real electricals — not toys, sports or stationery, which the wider 'elec' bucket includes */
    const hard=/electronics|computers|large appliances/.test(root);
    /* b35 (Jack: "an extra 5% on a low-ticket lead could make it a banger"): grocery, health and beauty get their own price-matchers —
       Boots, Superdrug, Tesco, Holland & Barrett — from the Settings discount list, so the "→ score with a code" shows there too */
    const matchers=(typeof discMatchers!=='function')?(grocery?[]:R2.RETAIL)
      :grocery?discAll().filter(e=>e.type==='retailer'&&/boots|superdrug|tesco|holland/i.test(e.name)).map(e=>[e.name,discRate(e,amz)]).filter(x=>x[1]>0)
      :discMatchers().filter(e=>(hard||!/marks electrical|ao\b/i.test(e.name))&&(elec||!/currys/i.test(e.name))).map(e=>[e.name,discRate(e,amz)]).filter(x=>x[1]>0);
    matchers.forEach(([who,pct])=>{const c=Math.round(amz*(1-pct/100)*100)/100;const [pp,pr]=r2prof(sell,c,ref,fba,vat);pot.push({who,pct:Math.round(pct*10)/10,cost:c,p:pp,roi:pr,score:r2score(pp,pr,Math.round(spm),low),confirmed:(fact.pm||[]).includes(who)});});
    const best=pot.reduce((m,x)=>x.score>m.score?x:m,{score:score,who:'',roi,p});
    const bestRoi=Math.max(roi,...pot.map(x=>x.roi));
    const keptFinal=kept&&(!low||(Math.max(score,best.score)>=R2.MIN_SCORE&&bestRoi>=R2.MIN_ROI_LOW));   /* b44/b45: the floor is for the under-£60 feeds only — Mera's list shows everything */
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
    /* b43 (Jack, 15 Sep: Polly Pocket and BioEars "tanking as a lot of sellers have jumped on it") — FBA sliding month on month with a crowd of
       sellers. A flag for the VA's eyes, not a price change: Pepsi shows the same shape and he still called it £33. */
    {const fc=kNum(r['New, 3rd Party FBA: Current']),f30t=kNum(r['New, 3rd Party FBA: 30 days avg.']),f90t=kNum(r['New, 3rd Party FBA: 90 days avg.']),oc=kNum(r['New Offer Count: Current'])||0;
      if(fc&&f30t&&f90t&&fc<f30t&&f30t<f90t*0.97&&oc>=30)chips.push(['TANKING? · '+oc+' SELLERS','bad']);}
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
      'Buy Box 90d £':bb90,'Buy Box 180d £':kNum(r['Buy Box: 180 days avg.']),'FBA 90d £':f90,'FBM 90d £':fbm90,'Buy Box high £':kNum(r['Buy Box: Highest']),'Buy Box 30d £':kNum(r['Buy Box: 30 days avg.']),'FBA 30d £':kNum(r['New, 3rd Party FBA: 30 days avg.']),'Offers':kNum(r['New Offer Count: Current']),
      'Profit £':p,'ROI %':roi,'Sells /mo':Math.round(spm),'Demand from':bought?'confirmed':'drops',
      '£ per month':Math.round(p*spm),'Needs % off':Math.round(nd*10)/10,'Brand discount %':br==null?'':br,
      'Check OA?':(br||nd>0)?'yes':'','FBA resale proven?':f90?'yes':'no','No 3P history?':no3P?'yes':'no','Limited time deal?':ltd?'yes':'no',
      'Amazon 90d drop %':kNum(r['Amazon: 90 days drop %'])||0,'Offers':kNum(r['New Offer Count: Current'])||0,'FBA offers':fbaN,'FBM offers':fbmN,
      'Reviews':reviews,'Category':[r['Categories: Root'],r['Categories: Sub']].filter(Boolean).join(' › '),'Category kind':grocery?'grocery':elec?'electrical':'general','Age days':age==null?'':age,'VAT %':Math.round(vat*100),'VAT from':vt.src==='va'?'VA':vt.src==='source'?'filter':vt.src==='rule'?'Rule 3':'default','Tracking since':r['Tracking since']||'','Listed since':r['Listed since']||'',
      Keepa:`https://keepa.com/#!product/2-${a}`,'Buy link':`https://www.amazon.co.uk/dp/${a}`,'UK sell link':`https://www.amazon.co.uk/dp/${a}`,
      SAS:`https://sas.selleramp.com/sas/lookup?search_term=${a}&sas_cost_price=${eff.toFixed(2)}&sas_sale_price=${sell.toFixed(2)}`,
      kept:keptFinal,lowScore:kept&&!keptFinal,lowRoi:kept&&low&&bestRoi<R2.MIN_ROI_LOW,chips,pot,STATUS:'',Changed:'','Last seen':''};
    all.push(o);}
  const out=all.filter(o=>o.kept).sort((x,y)=>y.Score-x.Score||y['Potential score']-x['Potential score']||y['£ per month']-x['£ per month']);
  out.forEach((o,i)=>o['#']=i+1);st.kept=out.length;
  return{out,all,st};}
