/* ============================================================================
   RULE 1 — GENERAL A2A UK + EU BRAND SOURCING
   FROZEN 9 Sep 2026. Jack: "if we fuck around too much we will lose the work we have done."
   This file is the rule. Change a number here only when Jack asks, and change nothing else.
   The full write-up with the measurements lives in SOURCING RULES / RULE 1 / Rule 1.md.
   DOM-free: rule1Compute(files, brand, rate, prevRun) -> result. The page never reaches in.
   ============================================================================ */
/* b146 (Jack, 22 Sep: "order of cheapness on EU if price matched — Italy, France, Germany; unsure where Spain sits just yet").
   It is a tie-break and nothing more. Three things it must never do, all of them measured on the Logitech export first:
     · never displace the UK — home market, no import, no wait, so it wins any tie on price;
     · never pay more, not even a penny (a first cut at £1 sent two leads to a dearer country and lost one lead outright;
       Jack, same day: "if Spain is still cheaper or UK is cheaper then use that — if anyone is cheaper even by a penny use that one");
     · never place Spain — Jack does not know where it sits yet, so ES competes on price alone.
   opts are [market, local price, landed £, qty]; returns the one to buy from. */
function euPick(opts,order,level){if(!opts||!opts.length)return null;
  const outright=opts.reduce((m,o)=>o[2]<m[2]?o:m);
  if(outright[0]==='UK')return outright;
  const lvl=opts.filter(o=>o[0]!=='UK'&&o[2]-outright[2]<=(level==null?0.25:level));
  return (order||[]).reduce((p,mk)=>p||lvl.find(o=>o[0]===mk),null)||outright;}
const BR={
  VAT:0.20, PREP_MISC:1.00, INBOUND_KG:0.00,   /* b90 (Jack, 17 Sep): one pound a unit for handling, not 60p prep + 40p misc. Same money, one number. */ CARD_FEE:0.01, BASKET_CAP:175, BASKET_MAX:5,
  /* b146 (Jack, 22 Sep): when EU prices land level (within £1), this is the order they actually turn out cheapest in.
     Spain is deliberately absent — he does not know where it sits yet, so it competes on price alone. */
  EU_ORDER:['IT','FR','DE'], EU_LEVEL:0.005,   /* b146b (Jack: "if anyone is cheaper than the others even by a penny use that one") — matched means MATCHED, so the window is half a penny of rounding and nothing more */
  SHIP_BASE:3.99, SHIP_KG:0.83, SS_UK:0.15, SS_EU:0.05, MIN_ROI:0, MIN_ROI_WIDE:-15, WIDE_GAP:1.25, SELL_UPLIFT:1.08, SELL_HAIRCUT_AMZ90:0.80,
  NOT_A_DROP:0.08, MOVE_GBP:0.10, MOVE_PCT:0.005, DST:0.02,
  REF_LOW:0.08, REF_LOW_AT:10, REF_UPLIFT:1.0053, CLOSING:0.50, CLOSING_CATS:['pc & video games','video games'],
  UNIFIED_SELL_60:false,   /* b114: built, OFF until Jack says go — flipping it moves Logitech 96->93, ASUS 55->43, Mera UK-only 310->279 (18 Sep measurement) */
  PROMO_FLOOR_ROI:-5,   /* b135: a UK buy of a promo brand is really an OA buy. The 10% stand-in is the smallest promo they run, so near break-even on that is worth a human's eyes: -5% here is about -14% at Amazon's price. */
  SLOW_SPM:50, SLOW_ROI:20, SLOW_PROFIT:3.00, SPM_BANDS:[300,100,50,30,10],   /* b103 (Jack, 18 Sep): "under 50spm need a minimum of £3 profit per unit or 20% roi" — was £5 or 15%. The G321 Black (49 drops, 10.3%, £3.22) was dropped by the old bar. */
  DEF_REF:0.15, DEF_FBA:3.50, DEF_KG:0.5, FX_FALLBACK:0.86, FX_TTL_H:6,
  /* Fallbacks for exports without the fee columns. Medians measured from 3,441 of Jack's own
     UK products that DID carry them, 6-8 Sep 2026. Much better than a flat 15% and 3.50 guess:
     median profit error falls from 3.23 to 0.34 on the same leads. */
  REF_BY_CAT:{
    'Amazon Devices & Accessories':15.0,
    'Automotive':14.99,
    'Baby Products':15.0,
    'Beauty':15.0,
    'Business, Industry & Science':15.0,
    'CDs & Vinyl':15.01,
    'Computers & Accessories':7.0,
    'DIY & Tools':13.0,
    'Electronics & Photo':14.99,
    'Fashion':15.0,
    'Grocery':15.0,
    'Health & Personal Care':15.0,
    'Home & Garden':15.0,
    'Lighting':13.01,
    'Musical Instruments & DJ':13.0,
    'PC & Video Games':15.0,
    'Pet Supplies':14.99,
    'Sports & Outdoors':15.0,
    'Stationery & Office Supplies':15.0,
    'Toys & Games':15.0},
  FBA_BY_WEIGHT:[[0,2.71],[100,3.02],[250,3.09],[500,3.2],[1000,3.54],[2000,5.02],[4000,6.39],[10000,14.65]],
  ZERO_VAT:['coffee','tea ','teabag','tea bag','espresso','capsule','pods'],
  ZERO_VAT_NOT:['machine','maker','brewer','grinder','kettle','mug','cup','flask','filter','descal'],
  EXCLUDE:['vacuum','hoover','kettle','toaster','steam iron','steam generator','garment steamer','clothes steamer',
    'microwave','blender','air fryer','deep fryer','coffee machine','coffee maker','espresso machine','pod machine',
    'senseo','juicer','food processor','sparkling water maker','slow cooker','pressure cooker','stand mixer',
    'fridge','freezer','dishwasher','washing machine','tumble dryer','oven','hob','extractor','iron with',
    'rice cooker','soup maker','bread maker','ice cream maker','waffle maker','sandwich toaster','grill'],
  FLAG:['gaming monitor','computer monitor','curved monitor','portable monitor','oled monitor',
    'led monitor','uhd monitor','smart tv','led tv','oled tv','qled tv','4k tv','television'],
  EU_PLUG:['eu plug','euro plug','2-pin','2 pin','schuko','type f plug','type c plug'],
  EXEMPT:['blood pressure','baby monitor','heart rate'],
  BLACKLIST:{B018X8X1R4:'EU plug',B016TLZ0LC:'EU plug'},
  GENERIC_PM:[['Argos',6],['Currys',5],['John Lewis',4]],
  BRAND_DISC:[['Acer',15],['Argos',6],['B&Q',4],['Beauty Bay',15],['Bosch',10],['Boots',3],['Currys',5],['Dyson',10],
    ["De'Longhi",10],['e.l.f.',20],['Gillette',10],['Halfords',4],['Henry (Numatic)',10],['Honor',10],['Hoover Direct',10],
    ['Huawei',15],['Huel',10],['John Lewis',4],['Lego',5],['Lenovo',10],['Marks Electrical',8],['Miele',10],
    ['Ninja Kitchen',9],['OnePlus',10],['Philips Home Appliances',5],['Robert Dyas',5],['Russell Hobbs',20],
    ['Sage Appliances',15],['Samsung',10],['Shark',9],['Sports Direct',3.5],['Stanley',15],['Superdrug',10],['Tefal',10],
    ['Tesco',3],['The Entertainer',5],['The Perfume Shop',15],['Vax',10],['Wahl',15]]
};
const BR_LINK={UK:'co.uk',DE:'de',FR:'fr',IT:'it',ES:'es'};
const r1=v=>Math.round(v*10)/10,r2=v=>Math.round(v*100)/100;
const brNum=kNum;
function brMedian(a){const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;}
function brFees(sale,ref,fba,kg,cat){const referral=sale*(sale<BR.REF_LOW_AT?BR.REF_LOW:ref*(ref<0.10?BR.REF_UPLIFT:1));
  const c=(cat||'').toLowerCase();const closing=BR.CLOSING_CATS.some(x=>c.includes(x))?BR.CLOSING:0;
  const dst=(referral+fba+closing)*BR.DST;return referral+fba+closing+BR.PREP_MISC+BR.INBOUND_KG*kg+dst;}
function brProfit(sale,cost,ref,fba,kg,vat,cat){const Vs=1+(vat==null?BR.VAT:vat);
  const p=sale/Vs-cost/Vs-brFees(sale,ref,fba,kg,cat);return[r2(p),cost?r1(100*p/cost):0];}
function brBreakeven(cost,ref,fba,kg,cat){let lo=0.01,hi=100000;
  for(let i=0;i<60;i++){const mid=(lo+hi)/2;if(brProfit(mid,cost,ref,fba,kg,null,cat)[0]<0)lo=mid;else hi=mid;}return r2(hi);}
/* Keepa's 'Buy Box: Subscribe & Save' flag is not reliable: the website ticks S&S on products
   where the CSV export writes 'no' (proved on B000TCPV30, 8 Sep 2026, live page £12.00 -> £10.20).
   A listing cannot carry an S&S coupon without having S&S, so that column is used as a second
   detector. The coupon percentage itself is deliberately IGNORED: it is single-unit only,
   and Jack's rate is always 15% UK / 5% EU. */
function brHasSS(r){
  if((r['Buy Box: Subscribe & Save']||'').trim().toLowerCase()==='yes')return true;
  const c=(r['One Time Coupon: Subscribe & Save %']||'').trim();
  return c!==''&&c!=='-';}
function brFbaForWeight(kg){const g=kg*1000;let v=BR.DEF_FBA;
  for(const pair of BR.FBA_BY_WEIGHT){if(g>=pair[0])v=pair[1];}return v;}
/* b112 (Jack, 18 Sep: "go then"): Rule 1 reads the same Settings discount list as Rule 2 — brands and price-matchers, by category,
   editable in Settings. BR.GENERIC_PM and BR.BRAND_DISC below are only the fallback when that list is not loaded. */
function brPmScenarios(brand,cost,root){
  if(typeof discMatchersFor==='function'&&typeof discBrandPair==='function'){
    const scen=discMatchersFor(root,cost);const bd=discBrandPair(brand,cost);if(bd)scen.push(bd);return scen;}
  const scen=[...BR.GENERIC_PM],bd=brBrandDisc(brand);if(bd)scen.push(bd);return scen;}
function brBrandDisc(brand){const b=(brand||'').trim().toLowerCase().split(/\s+/)[0]||'';if(!b)return null;
  return BR.BRAND_DISC.find(x=>x[0].toLowerCase().startsWith(b))||null;}

/* files = {viewer:{rows}, UK:{rows}|null, DE:..., FR:..., IT:..., ES:...}
   brand = string (only used for the result), rate = GBP per EUR,
   prevRun = {stamp, snap:{ASIN:{...}}} from the last downloaded sheet, or null */
function rule1Compute(files,brand,rate,prevRun){
  const eu={},euSS={},found={};
  ['UK','DE','FR','IT','ES'].forEach(d=>{const f=files[d];if(!f)return;f.rows.forEach(r=>{const a=(r.ASIN||'').trim();if(!a)return;
    (found[a]=found[a]||new Set()).add(d);
    if(d!=='UK'){const v=brNum(r['Amazon: Current']);if(v){(eu[a]=eu[a]||{})[d]=v;}
      if(brHasSS(r))(euSS[a]=euSS[a]||{})[d]=true;}});});
  if(typeof stampShares==='function')stampShares(files.viewer.rows);   /* b122 */
  const vrows=files.viewer.rows,out=[],dropped=[],st={viewer:vrows.length,demand:0,sell:0,buy:0,kept:0,bbHiCol:vrows.some(r=>r['Buy Box: Highest']!=null&&r['Buy Box: Highest']!==''),capped:0},reasons={};
  const drop=(a,title,why,key)=>{dropped.push([a,title,why]);reasons[key]=(reasons[key]||0)+1;};
  for(const r of vrows){
    const a=(r.ASIN||'').trim(),title=r.Title||'',tl=title.toLowerCase();
    /* b105 (Jack, 18 Sep: "it needs to see if it actually sells, as the family might sell 49 keepa drops but that
       particular asin might not sell at all - this should check the reviews"). Rank drops belong to the whole
       variation family. The proven way to split them (Logitech Lift, 17 Sep: real sales 1000/300/200/100/100 vs
       review shares 68.7/13.9/10.5/6.7/0.3%) is each option's share of the family's own reviews. So with no
       confirmed figure, THIS option's demand is the family's drops x its share, and the 10-a-month floor is
       tested against that. Confirmed still beats everything. An option under six months old is left on the
       family's drops, because its reviews have not caught up yet (the Sand, 0.3% of reviews, sold 100). */
    /* b108: a figure Amazon confirmed in the last 90 days counts as confirmed, even if today's is blank */
    const cs=(typeof confirmedSales==='function')?confirmedSales(r):null;
    const bought=cs?cs.n:brNum(r['Monthly Sales Trends: Bought in past month']),drops=brNum(r['Sales Rank: Drops last 30 days'])||0;
    const share=(!bought&&r.__share!=null&&!r.__new)?r.__share:null;
    const spm=bought||(share!=null?drops*share:drops);
    /* b109: under 10 because of the review share, but Amazon confirmed sales on it within a year - keep it */
    const yearOk=(share!=null&&spm<10&&typeof confirmedWithin==='function')?confirmedWithin(r,CONFIRMED_RESCUE_DAYS):null;
    /* b122: a variation with no share of its own and no confirmed figure is not handed the family's drops */
    /* b123 (Jack: "if it's under 50 confirmed sales we use Keepa drops, you know this"): an option with no share of its own stays on the
       family's drops, says so, and the page's one-token Keepa check can only upgrade it to a confirmed figure */
    const unknown=typeof shareUnknown==='function'&&shareUnknown(r);if(unknown)st.unknown=(st.unknown||0)+1;
    if(spm<10&&!yearOk){drop(a,title,share!=null
        ?`demand: no confirmed figure, family drops ${Math.round(drops)} x ${Math.round(share*100)}% of the family's reviews = ${Math.round(spm)} for this option (need 10)`
        :`demand: bought ${bought||0} / drops ${Math.round(drops)} (need 10)`,'Not enough demand');continue;}
    st.demand++;
    if(BR.BLACKLIST[a]){drop(a,title,'blacklisted: '+BR.BLACKLIST[a],'Blacklisted');continue;}
    const fbaNow=brNum(r['New, 3rd Party FBA: Current']),fba30=brNum(r['New, 3rd Party FBA: 30 days avg.']),fba90=brNum(r['New, 3rd Party FBA: 90 days avg.']),bb90=brNum(r['Buy Box: 90 days avg.']);
    const catText=((r['Categories: Tree']||'')+' '+title).toLowerCase();
    /* b103 (Jack: "all 3 rules need to be super interlinkable — there might be tea and coffee on Mera's or
       Suz's filter or a brand"). Rule 1 had its own seven-word VAT list and never asked Rule 3, so one coffee
       product could get two different VAT answers depending on which run found it. Rule 3 is the engine now;
       the old list is only the fallback if Rule 3 is not loaded (the rule stays DOM-free either way). */
    const vt=(typeof vatFor==='function')?vatFor(r,null):null;
    const zeroVat=vt?vt.rate===0:(BR.ZERO_VAT.some(w=>catText.includes(w))&&!BR.ZERO_VAT_NOT.some(w=>catText.includes(w)));
    const catRoot=r['Categories: Root']||'';
    const ukp=brNum(r['Amazon: Current']),ukDropped=!!(found[a]&&found[a].has('UK')),ltd=!!(r['Deals: Badge']||'').trim();
    /* Sell price, refitted 8 Sep 2026 against 62 prices Jack read off the graph himself.
       Buy Box 90d + 8%, never above the FBA 90d average. Mean error 6.1% vs 14.8% for the old
       median-of-three, and the old rule's +61% worst case disappears. Live/spot prices are never
       used: Keepa's FBA Current spikes (Contigo bottle read GBP 19.99 against a GBP 9 real price). */
    let sells=[];
    if(bb90&&fba90) sells=[['Buy Box 90d +8%, capped at FBA 90d',r2(Math.min(fba90,bb90*BR.SELL_UPLIFT))]];
    else if(bb90)   sells=[['Buy Box 90d +8%',r2(bb90*BR.SELL_UPLIFT)]];
    else if(fba90)  sells=[['FBA 90d average',r2(fba90)]];
    const bbSeller=r['Buy Box: Buy Box Seller']||'',bbNow=brNum(r['Buy Box: Current']);
    if(!sells.length&&!fbaNow&&bb90&&bbSeller.startsWith('Amazon'))sells.push(['Amazon 90d level x0.8 (no FBA data)',r2(bb90*BR.SELL_HAIRCUT_AMZ90)]);
    if(!sells.length&&!fbaNow&&ukp&&!ukDropped)sells.push(['Amazon UK price (no FBA seller)',ukp]);
    if(!sells.length&&!fbaNow&&bbNow&&bbSeller.startsWith('Amazon'))sells.push(['Buy Box held by '+bbSeller.split(' (')[0]+' (no FBA seller)',bbNow]);
    /* b114 (Jack, 18 Sep, on the Shark upright at a GBP 199 Buy Box: "agree with rule 2 more"): one sell price whichever run finds a
       product. At GBP 60 and above Rule 1 takes Rule 2's sell model - fitted to his 14 Sep high-ticket calls (Vax GBP 180, Shark GBP 209,
       Siemens, Jet, Blast, all within 3%) - because on those products Amazon holds the Buy Box low and the 3P pack sits well above it,
       which the 8 Sep formula was never fitted to. Under GBP 60 the 8 Sep fit stays. Averages only, as before: r2sell never uses a spot price. */
    /* b115: the one sell price (sellPick in rule2.js) when UNIFIED_SELL.on — replaces the b114 £60+ swap below */
    if(sells.length&&bb90&&typeof UNIFIED_SELL!=='undefined'&&UNIFIED_SELL.on&&typeof sellPick==='function'){const P=sellPick(r);if(P&&P.sell)sells=[[P.why,P.sell]];}
    else if(BR.UNIFIED_SELL_60&&sells.length&&bb90&&typeof r2sell==='function'&&typeof R2!=='undefined'){const S2=r2sell(r);
      /* Rule 1's one principle survives the swap: never a spot price. Rule 2's "3P holds the Buy Box today" path prices off today's
         Buy Box, so that path is skipped here and the average-based sell stands. */
      if(S2&&S2.sell>=R2.LOW_TICKET&&!/holds the Buy Box today/i.test(S2.why||''))sells=[['Rule 2 model: '+S2.why,S2.sell]];}
    const notADrop=!!(ukp&&bb90&&Math.abs(bb90-ukp)/ukp<=BR.NOT_A_DROP);
    if(!sells.length){drop(a,title,'NO SELL PRICE: no FBA seller, no usable Amazon UK','No sell price');continue;}
    st.sell++;
    const refX=brNum(r['Referral Fee %']),fbaX=brNum(r['FBA Pick&Pack Fee']);
    const gX=brNum(r['Package: Weight (g)'])||brNum(r['Item: Weight (g)']);
    const kg=gX?gX/1000:BR.DEF_KG;
    const knownCat=BR.REF_BY_CAT[catRoot]!=null;
    const ref=refX?refX/100:(knownCat?BR.REF_BY_CAT[catRoot]/100:BR.DEF_REF);
    const fba=fbaX?fbaX:brFbaForWeight(kg);
    const feeSrc=(refX&&fbaX)?'keepa export'
      :(refX?'referral from export, FBA estimated from weight'
        :(fbaX?'FBA from export, referral estimated from category'
          :(knownCat?'ESTIMATED from category + weight - tick the fee columns for exact'
                    :'ESTIMATED, category not in the table - tick the fee columns')));
    const opts=[];let note='';
    if(ukp){let eff=ukp;const ss=brHasSS(r);
      const cp=brNum(r['One Time Coupon: Percentage'])||0,ca=brNum(r['One Time Coupon: Absolute'])||0;
      if(ss){eff*=(1-BR.SS_UK);note+=`S&S ${BR.SS_UK*100}% `;}
      if(cp){eff*=(1-cp/100);note+=`coupon ${cp}% `;}
      if(ca){eff-=ca;note+=`coupon £${ca.toFixed(2)} `;}
      opts.push(['UK',ukp,r2(eff),1]);}
    for(const d of Object.keys(eu[a]||{})){let gbp=eu[a][d];
      if(euSS[a]&&euSS[a][d]){gbp*=(1-BR.SS_EU);note+=`${d} S&S ${BR.SS_EU*100}% `;}
      const eur=gbp/rate,q=Math.max(1,Math.min(BR.BASKET_MAX,Math.floor(BR.BASKET_CAP/eur)));
      const post=(BR.SHIP_BASE+BR.SHIP_KG*kg*q)*rate;
      opts.push([d,r2(eur),r2(gbp*(1+BR.CARD_FEE)+post/q+0.005),q]);}
    if(!opts.length){drop(a,title,'Amazon not selling anywhere','Amazon not selling');continue;}
    st.buy++;
    const best=Math.min(...opts.map(o=>o[2])),tied=opts.filter(o=>o[2]-best<=1.00);
    /* b146 (Jack, 22 Sep: "order of cheapness on EU if price matched — Italy, France, Germany; unsure where Spain sits yet").
       Only ever a tie-break: when two countries land within £1 of each other the price is effectively the same, so the one that
       usually turns out cheapest once you are actually buying wins. Spain is deliberately NOT in the order — it falls through to
       whichever is cheapest on the day, until Jack knows where it sits. Nothing here beats a genuinely cheaper country. */
    const outright=tied.reduce((m,o)=>o[2]<m[2]?o:m);
    const pick=euPick(opts,BR.EU_ORDER,BR.EU_LEVEL);
    const [d,local,landed,q]=pick;
    if(outright[0]!==d)note+=`${d} and ${outright[0]} level at £${outright[2].toFixed(2)}-£${landed.toFixed(2)} - took ${d} `;
    if(notADrop&&d==='UK')sells=[['Buy Box 90d - not a real drop',bb90]];
    /* b22 (Jack, 14 Sep 2026: Lenovo Idea Tab "never ever been higher than 509.99"): nothing sells
       above the highest Buy Box price Keepa has ever seen for the listing. Only bites when the
       export carries "Buy Box: Highest"; the Logitech/ASUS locks below never had the column. */
    const bbHi=brNum(r['Buy Box: Highest'])||0;
    if(bbHi)sells=sells.map(([lab,sp])=>sp>bbHi+0.005?[lab+', capped at the Buy Box high',r2(bbHi)]:[lab,sp]);
    const vat=zeroVat?0:null;
    const cands=sells.map(([lab,sp])=>{const [p,roi]=brProfit(sp,landed,ref,fba,kg,vat,catRoot);return{p,roi,lab,sp};});
    const bestC=cands.reduce((m,c)=>c.roi>m.roi?c:m);const pr=bestC.p,roi=bestC.roi,src=bestC.lab,sell=bestC.sp;
    const loSell=bb90||sell;let hiSell=((fbaNow&&!ltd)?fbaNow:fba90)||sell;if(bbHi&&hiSell>bbHi)hiSell=r2(bbHi);
    const [loP,loRoi]=brProfit(loSell,landed,ref,fba,kg,vat,catRoot),[hiP,hiRoi]=brProfit(hiSell,landed,ref,fba,kg,vat,catRoot);
    const bb90Roi=bb90?brProfit(bb90,landed,ref,fba,kg,vat,catRoot)[1]:null;
    let pmNote='',pmRoi=null,pmP=null;
    let pmScen=[];
    if(d==='UK'&&ukp){const scen=brPmScenarios(r.Brand,ukp,catRoot);pmScen=scen;
      if(scen.length){const bp=scen.reduce((m,x)=>x[1]>m[1]?x:m);const pmCost=r2(ukp*(1-bp[1]/100));
      const [pmP_,pr_]=brProfit(sell,pmCost,ref,fba,kg,vat,catRoot);pmRoi=pr_;pmP=pmP_;
      /* b134 (Jack, 21 Sep: "for Logitech if it's UK A2A be more lenient — they nearly always have a promo on, buy 2 get £10 off,
         buy 3 get £50 off, it's so random"). A promo is not a price match, so it is worded as one and never presented as certain. */
      const promo=(typeof discIsPromo==='function')&&discIsPromo(r.Brand)&&bp[0].toLowerCase()===String(r.Brand||'').toLowerCase().split(' ')[0];
      pmNote=promo?`if ${bp[0]} has a promo on (they usually do): £${pmCost.toFixed(2)} -> £${pmP_.toFixed(2)} / ${Math.round(pmRoi)}%`
        :`if ${bp[0]} price-matches: £${pmCost.toFixed(2)} -> £${pmP_.toFixed(2)} / ${Math.round(pmRoi)}%`;}}
    const exempt=BR.EXEMPT.some(x=>tl.includes(x));
    if(BR.EU_PLUG.some(w=>tl.includes(w))){drop(a,title,'EU PLUG stated in the title','EU plug in title');continue;}
    if(d!=='UK'&&BR.EXCLUDE.some(w=>tl.includes(w))&&!exempt){drop(a,title,`MAINS APPLIANCE: would be an EU buy (${d}) - UK plug required`,'Appliance from EU');continue;}
    const plugRisk=d!=='UK'&&BR.FLAG.some(w=>tl.includes(w))&&!exempt;
    /* Wide gap = Amazon owns the Buy Box while the FBA pack sits well above it. On that shape the
       Buy Box average is Amazon's own price, not a market price, so the sell number is a graph call
       and the floor is loosened rather than the maths being fudged. (Jack, 8 Sep: Philips Beard
       Trimmer sold 17 units in 14 days at GBP 39.50 while this sheet scored it -5%.) */
    const wideGap=!!(fba90&&bb90&&fba90>bb90*BR.WIDE_GAP);
    const floor=wideGap?BR.MIN_ROI_WIDE:BR.MIN_ROI;
    /* b115: the £100+ bar (BAR100 in rule2.js), judged on the best of Amazon's price, the high-end sell and the price match */
    if(typeof BAR100!=='undefined'&&BAR100.on&&sell>=BAR100.SELL){const bR=Math.max(roi,hiRoi,pmRoi==null?-99:pmRoi),bP=Math.max(pr,hiP,pmP==null?-99:pmP);
      if(!(bR>=BAR100.ROI||bP>=BAR100.PROFIT)){drop(a,title,`under the £${BAR100.SELL}+ bar: best ${Math.round(bR)}% / £${bP.toFixed(2)} (needs ${BAR100.ROI}% or £${BAR100.PROFIT})`,'Under the £100+ bar');continue;}}
    /* b135 (Jack: "be extra more lenient on UK A2A Logitech even if it's a small loss — tell them to go looking at the Logitech
       website and OA price matches"). The promo is on the brand's own site, so a small loss against Amazon's price is not the
       test: what matters is whether it works once the promo is on. Break-even there is enough to put it in front of a human. */
    const promoRescue=(d==='UK'&&typeof discIsPromo==='function'&&discIsPromo(r.Brand)&&pmRoi!=null&&pmRoi>=BR.PROMO_FLOOR_ROI);
    const promoOA=promoRescue&&Math.max(roi,hiRoi)<10;   /* an OA lead in an A2A run: it is on the list to be checked on the brand site, so the thin-lead bar does not judge it on Amazon's price */
    if(Math.max(roi,hiRoi)<floor&&!(pmRoi!=null&&pmRoi>=5)&&!promoRescue){drop(a,title,`ROI ${roi}% below the ${floor}% floor (cheapest ${d} £${landed.toFixed(2)} landed, sell £${sell.toFixed(2)})`,wideGap?'Wide-gap, still under -15%':'ROI under breakeven');continue;}
    st.kept++;if(src.endsWith('capped at the Buy Box high'))st.capped++;
    const sd=brNum(r['Buy Box: Standard Deviation 90 days'])||0;
    const flags=[
      yearOk?`reviews put it at ${Math.round(spm)}/mo, but Amazon confirmed ${yearOk.n}/mo on ${yearOk.since} - kept`:'',
      (cs&&cs.lapsed)?`Amazon's figure lapsed - last confirmed ${cs.n}/mo on ${cs.since}, counted as confirmed`:'',
      plugRisk?`PLUG CHECK - screen bought in ${d}, confirm UK lead`:'',
      (notADrop&&d!=='UK')?`UK not in a drop (BB90 £${bb90.toFixed(2)} = Amazon £${ukp.toFixed(2)}) - fine, buying ${d}`:(notADrop?`NOT A DROP: Buy Box 90d £${bb90.toFixed(2)} = Amazon £${ukp.toFixed(2)}`:''),
      bb90?`worst case (Buy Box 90d £${bb90.toFixed(2)}): ${Math.round(bb90Roi)}%`:'',
      wideGap?`AMAZON OWNS THE BUY BOX, FBA SITS ${Math.round((fba90/bb90-1)*100)}% ABOVE (£${bb90.toFixed(2)} vs £${fba90.toFixed(2)}) - sell price is a graph call`:'',
      (loSell&&sell/loSell>1.3)?`WIDE SELL RANGE ${Math.round(loSell)}-${Math.round(sell)} - needs eyes`:'',
      (roi<5&&pmRoi!=null&&pmRoi>=5)?'A2A->OA: only works if a retailer price-matched (see OA price-match)':'',
      zeroVat?('0% VAT — '+((vt&&vt.why)||'coffee/tea')+' (Rule 3)'):'',
      (fbaNow&&fba90&&fbaNow<=0.92*fba90)?'FBA-now well under FBA-90d - 90d average may be stale (tanked?)':'',
      ltd?'LIMITED TIME DEAL - FBA now only':'',
      (src.startsWith('Amazon')||src.startsWith('Buy Box held'))?'no FBA seller - sell is Amazon based, verify':'',
      !bought?'demand from drops only - does it sell?':'',
      sd>0.15*(bb90||1e9)?'sell price volatile':'',
      (d==='UK'&&pmScen.length)?'UK buy: check OA retailers ('+pmScen.map(x=>x[0]+' '+x[1]+'%').join(', ')+')':'',
      unknown?`variation of ${brNum(r['Variation Count'])}: on the family's ${drops} drops, its own share unknown (siblings not in the export, or no reviews yet)`:'',
      (!unknown&&r.__optionChecked&&!bought)?`variation of ${brNum(r['Variation Count'])}: on the family's ${drops} drops, Keepa has no confirmed figure for this option`:'',
      (/grocery|health|beauty|pet|baby|drugstore/i.test(catRoot)&&!brHasSS(r))?'no S&S seen on Keepa - check the page':'',
      /* b134: the brand nearly always has something on that Keepa cannot see */
      (d==='UK'&&typeof discIsPromo==='function'&&discIsPromo(r.Brand))?`OA, NOT AMAZON: buy it from ${(typeof discPromoSite==='function'&&discPromoSite(r.Brand))||'the brand site'} - they nearly always have a multi-buy on (buy 2 get £10, buy 3 get £50, it changes). Check the site, then Argos and Currys for a price match, then Discord it`:''].filter(Boolean).join('; ');
    out.push({STATUS:'',Changed:'',ASIN:a,Title:title,'Sell range':`£${loSell.toFixed(2)}-£${hiSell.toFixed(2)}`,'ROI low %':loRoi,'ROI high %':hiRoi,'Profit high £':hiP,
      SAS:`https://sas.selleramp.com/sas/lookup?search_term=${a}&sas_cost_price=${landed.toFixed(2)}&sas_sale_price=${sell.toFixed(2)}`,
      Keepa:`https://keepa.com/#!product/2-${a}`,'Buy link':`https://www.amazon.${BR_LINK[d]}/dp/${a}`,'UK sell link':`https://www.amazon.co.uk/dp/${a}`,
      'Buy market':d,'Landed £':landed,'Discount applied':note.trim(),'Sell £ used':sell,'Sell used':src,'Breakeven sell £':brBreakeven(landed,ref,fba,kg,catRoot),
      'Profit £':pr,'ROI %':roi,'Best case':src,'GOOD LEAD?':'','HAPPY ON SHEET?':'',WHY:'',
      SPM:Math.round(spm),'SPM from':bought?'bought':(share!=null?'drops x '+Math.round(share*100)+'% of reviews':'drops'),'Buy price (local)':local,'Basket qty':q,'ROI at BuyBox90 %':bb90Roi,
      'Sell low £':loSell,'Sell high £':hiSell,'Sell FBA now £':fbaNow,'Sell FBA 30d £':fba30,'Sell FBA 90d £':fba90,'Sell BB 90d £':bb90,'UK Amazon now £':ukp,
      'Phase 2 (ROI>=10%)':roi>=10?'YES':'no','OA price-match':pmNote,promoOA:promoOA||false,
      'All Amazon prices':opts.map(o=>`${o[0]} ${o[1]}`).join(' | '),'Dropped in':[...(found[a]||new Set(['UK']))].sort().join('/'),
      'Referral %':r1(ref*100),'FBA fee £':fba,kg:r2(kg),'Fees from':feeSrc,'LTD badge':r['Deals: Badge']||'',Category:catRoot,Flags:flags,'Last seen':'',
      'Tracking since':r['Tracking since']||'','Listed since':r['Listed since']||''});
  }
  const band=s=>{const i=BR.SPM_BANDS.findIndex(b=>s>=b);return i<0?BR.SPM_BANDS.length:i;};
  /* b103 (Jack, 18 Sep): "under 50spm need a minimum of £3 profit per unit or 20% roi" — exactly as he said
     it, £3 OR 20% (was £5 OR 15%). Two tighter versions were tried and REJECTED on his real data:
       · "£3 AND 10%, OR 20%" removed high-ticket slow sellers making £90-£153 a unit at 7-9.5% ROI
         (Galaxy Z Fold8, MSI Crosshair, ASUS TUF A16) - far worse than what it was meant to stop.
       · exempting a family's main option by review share let NEGATIVE-profit rows through, because this
         cut also catches thin-margin rows the wide-gap floor lets past.
     The literal rule only ever ADDS leads (measured: Logitech +1 = the G321 Black, EU alerts +1, old
     fixtures +8/+5/+8, nothing removed); the ones it adds all make £3+ a unit and are Jack's to judge. */
  /* b119 (Jack, 20 Sep): the velocity bar in rule2.js — the same sliding bar Rule 2 uses; under 50/mo it is exactly the b103 slow-seller rule */
  const vel=typeof passesVelocity==='function';
  /* judged on the best of the headline, the high-end sell and the price match — the same three that let the lead in */
  const bestOf=o=>{const pm=/-> £([\d.]+) \/ (-?\d+)%/.exec(o['OA price-match']||'');return{roi:Math.max(o['ROI %'],o['ROI high %']||-99,pm?+pm[2]:-99),p:Math.max(o['Profit £'],o['Profit high £']||-99,pm?+pm[1]:-99)};};
  const slow=out.filter(o=>{if(o.promoOA)return false;   /* b135: judged on the brand site, not on Amazon's price */
    const b=bestOf(o);return vel?!passesVelocity(o.SPM,b.roi,b.p):(o.SPM<BR.SLOW_SPM&&b.roi<BR.SLOW_ROI&&b.p<BR.SLOW_PROFIT);});
  slow.forEach(o=>{const b=vel?velocityBar(o.SPM):{roi:BR.SLOW_ROI,profit:BR.SLOW_PROFIT};const bo=bestOf(o);drop(o.ASIN,o.Title,`thin for ${o.SPM}/mo: best ROI ${Math.round(bo.roi)}% and profit £${bo.p.toFixed(2)} - at that pace it needs ROI ≥ ${b.roi}% or profit ≥ £${b.profit}`,o.SPM<BR.SLOW_SPM?'Slow seller, thin margin':'Thin for its pace');});
  const kept=out.filter(o=>!slow.includes(o));st.kept=kept.length;
  /* STATUS vs the last sheet downloaded for this brand */
  const prev=prevRun?prevRun.snap:{};
  kept.forEach(o=>{const p=prev[o.ASIN];let s='NEW';const why=[];
    if(p){s='UNCHANGED';const moved=Math.max(BR.MOVE_GBP,p['Landed £']*BR.MOVE_PCT);
      if(o['Buy market']!==p['Buy market']&&Math.abs(o['Landed £']-p['Landed £'])>=moved){why.push(`country ${p['Buy market']}->${o['Buy market']}`);s=o['Landed £']<p['Landed £']?'BETTER':'WORSE';}
      else if(o['Landed £']<=p['Landed £']-moved){why.push(`buy £${r2(p['Landed £']).toFixed(2)}->£${r2(o['Landed £']).toFixed(2)}`);s='BETTER';}
      else if(o['Landed £']>=p['Landed £']+moved){why.push(`buy £${r2(p['Landed £']).toFixed(2)}->£${r2(o['Landed £']).toFixed(2)}`);s='WORSE';}
      if(o['ROI %']-p['ROI %']>=3&&s!=='BETTER'){s='BETTER';why.push(`ROI ${r1(p['ROI %'])}->${r1(o['ROI %'])}`);}
      if(o['ROI %']-p['ROI %']<=-3){s='WORSE';why.push(`ROI ${r1(p['ROI %'])}->${r1(o['ROI %'])}`);}
      if((o['Sell £ used']||0)<(p['Sell £ used']||0)*0.95){s='WORSE';why.push(`sell £${r2(p['Sell £ used']).toFixed(2)}->£${r2(o['Sell £ used']).toFixed(2)}`);}}
    o.STATUS=s;o.Changed=why.join('; ');o['Last seen']=p?prevRun.stamp:'';});
  const keptSet=new Set(kept.map(o=>o.ASIN));
  const gone=Object.entries(prev).filter(([a])=>!keptSet.has(a)).map(([a,p])=>[a,`was ${p['Buy market']} £${p['Landed £']} ROI ${p['ROI %']}%`]);
  const ord={NEW:0,BETTER:1,WORSE:2,UNCHANGED:3};
  kept.sort((x,y)=>(ord[x.STATUS]-ord[y.STATUS])||(band(x.SPM)-band(y.SPM))||(y['Profit £']-x['Profit £']));
  return{out:kept,dropped,reasons,st,gone,prevStamp:prevRun?prevRun.stamp:null,rate};}
/* what the history snapshot keeps per lead — enough to say NEW / BETTER / WORSE next time */
function rule1Snap(out){const snap={};out.forEach(o=>{snap[o.ASIN]={'Buy market':o['Buy market'],'Landed £':o['Landed £'],'Sell £ used':o['Sell £ used'],'ROI %':o['ROI %'],'Profit £':o['Profit £'],'SPM':o.SPM};});return snap;}
