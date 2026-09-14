/* ============================================================================
   RULE 1 — GENERAL A2A UK + EU BRAND SOURCING
   FROZEN 9 Sep 2026. Jack: "if we fuck around too much we will lose the work we have done."
   This file is the rule. Change a number here only when Jack asks, and change nothing else.
   The full write-up with the measurements lives in SOURCING RULES / RULE 1 / Rule 1.md.
   DOM-free: rule1Compute(files, brand, rate, prevRun) -> result. The page never reaches in.
   ============================================================================ */
const BR={
  VAT:0.20, PREP:0.60, INBOUND_KG:0.00, CARD_FEE:0.01, BASKET_CAP:175, BASKET_MAX:5,
  SHIP_BASE:3.99, SHIP_KG:0.83, SS_UK:0.15, SS_EU:0.05, MIN_ROI:0, MIN_ROI_WIDE:-15, WIDE_GAP:1.25, SELL_UPLIFT:1.08, SELL_HAIRCUT_AMZ90:0.80,
  NOT_A_DROP:0.08, MOVE_GBP:0.10, MOVE_PCT:0.005, DST:0.02, MISC:0.40,
  REF_LOW:0.08, REF_LOW_AT:10, REF_UPLIFT:1.0053, CLOSING:0.50, CLOSING_CATS:['pc & video games','video games'],
  SLOW_SPM:50, SLOW_ROI:15, SLOW_PROFIT:5.00, SPM_BANDS:[300,100,50,30,10],
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
  const dst=(referral+fba+closing)*BR.DST;return referral+fba+closing+BR.PREP+BR.INBOUND_KG*kg+dst+BR.MISC;}
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
  const vrows=files.viewer.rows,out=[],dropped=[],st={viewer:vrows.length,demand:0,sell:0,buy:0,kept:0,bbHiCol:vrows.some(r=>r['Buy Box: Highest']!=null&&r['Buy Box: Highest']!==''),capped:0},reasons={};
  const drop=(a,title,why,key)=>{dropped.push([a,title,why]);reasons[key]=(reasons[key]||0)+1;};
  for(const r of vrows){
    const a=(r.ASIN||'').trim(),title=r.Title||'',tl=title.toLowerCase();
    const bought=brNum(r['Monthly Sales Trends: Bought in past month']),drops=brNum(r['Sales Rank: Drops last 30 days'])||0,spm=bought||drops;
    if(spm<10){drop(a,title,`demand: bought ${bought||0} / drops ${Math.round(drops)} (need 10)`,'Not enough demand');continue;}
    st.demand++;
    if(BR.BLACKLIST[a]){drop(a,title,'blacklisted: '+BR.BLACKLIST[a],'Blacklisted');continue;}
    const fbaNow=brNum(r['New, 3rd Party FBA: Current']),fba30=brNum(r['New, 3rd Party FBA: 30 days avg.']),fba90=brNum(r['New, 3rd Party FBA: 90 days avg.']),bb90=brNum(r['Buy Box: 90 days avg.']);
    const catText=((r['Categories: Tree']||'')+' '+title).toLowerCase();
    const zeroVat=BR.ZERO_VAT.some(w=>catText.includes(w))&&!BR.ZERO_VAT_NOT.some(w=>catText.includes(w));
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
    const pick=tied.find(o=>o[0]==='IT')||tied.reduce((m,o)=>o[2]<m[2]?o:m);
    const [d,local,landed,q]=pick;
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
    let pmNote='',pmRoi=null;
    if(d==='UK'&&ukp){const scen=[...BR.GENERIC_PM],bd=brBrandDisc(r.Brand);if(bd)scen.push(bd);
      const bp=scen.reduce((m,x)=>x[1]>m[1]?x:m);const pmCost=r2(ukp*(1-bp[1]/100));
      const [pmP,pr_]=brProfit(sell,pmCost,ref,fba,kg,vat,catRoot);pmRoi=pr_;
      pmNote=`if ${bp[0]} price-matches: £${pmCost.toFixed(2)} -> £${pmP.toFixed(2)} / ${Math.round(pmRoi)}%`;}
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
    if(Math.max(roi,hiRoi)<floor&&!(pmRoi!=null&&pmRoi>=5)){drop(a,title,`ROI ${roi}% below the ${floor}% floor (cheapest ${d} £${landed.toFixed(2)} landed, sell £${sell.toFixed(2)})`,wideGap?'Wide-gap, still under -15%':'ROI under breakeven');continue;}
    st.kept++;if(src.endsWith('capped at the Buy Box high'))st.capped++;
    const sd=brNum(r['Buy Box: Standard Deviation 90 days'])||0;
    const flags=[
      plugRisk?`PLUG CHECK - screen bought in ${d}, confirm UK lead`:'',
      (notADrop&&d!=='UK')?`UK not in a drop (BB90 £${bb90.toFixed(2)} = Amazon £${ukp.toFixed(2)}) - fine, buying ${d}`:(notADrop?`NOT A DROP: Buy Box 90d £${bb90.toFixed(2)} = Amazon £${ukp.toFixed(2)}`:''),
      bb90?`worst case (Buy Box 90d £${bb90.toFixed(2)}): ${Math.round(bb90Roi)}%`:'',
      wideGap?`AMAZON OWNS THE BUY BOX, FBA SITS ${Math.round((fba90/bb90-1)*100)}% ABOVE (£${bb90.toFixed(2)} vs £${fba90.toFixed(2)}) - sell price is a graph call`:'',
      (loSell&&sell/loSell>1.3)?`WIDE SELL RANGE ${Math.round(loSell)}-${Math.round(sell)} - needs eyes`:'',
      (roi<5&&pmRoi!=null&&pmRoi>=5)?'A2A->OA: only works if a retailer price-matched (see OA price-match)':'',
      zeroVat?'ZERO-RATED VAT assumed (coffee/tea) - confirm':'',
      (fbaNow&&fba90&&fbaNow<=0.92*fba90)?'FBA-now well under FBA-90d - 90d average may be stale (tanked?)':'',
      ltd?'LIMITED TIME DEAL - FBA now only':'',
      (src.startsWith('Amazon')||src.startsWith('Buy Box held'))?'no FBA seller - sell is Amazon based, verify':'',
      !bought?'demand from drops only - does it sell?':'',
      sd>0.15*(bb90||1e9)?'sell price volatile':'',
      d==='UK'?'UK buy: check OA retailers (Currys 5%, JL 4%, Argos 6%)':''].filter(Boolean).join('; ');
    out.push({STATUS:'',Changed:'',ASIN:a,Title:title,'Sell range':`£${loSell.toFixed(2)}-£${hiSell.toFixed(2)}`,'ROI low %':loRoi,'ROI high %':hiRoi,
      SAS:`https://sas.selleramp.com/sas/lookup?search_term=${a}&sas_cost_price=${landed.toFixed(2)}&sas_sale_price=${sell.toFixed(2)}`,
      Keepa:`https://keepa.com/#!product/2-${a}`,'Buy link':`https://www.amazon.${BR_LINK[d]}/dp/${a}`,'UK sell link':`https://www.amazon.co.uk/dp/${a}`,
      'Buy market':d,'Landed £':landed,'Discount applied':note.trim(),'Sell £ used':sell,'Sell used':src,'Breakeven sell £':brBreakeven(landed,ref,fba,kg,catRoot),
      'Profit £':pr,'ROI %':roi,'Best case':src,'GOOD LEAD?':'','HAPPY ON SHEET?':'',WHY:'',
      SPM:Math.round(spm),'SPM from':bought?'bought':'drops','Buy price (local)':local,'Basket qty':q,'ROI at BuyBox90 %':bb90Roi,
      'Sell low £':loSell,'Sell high £':hiSell,'Sell FBA now £':fbaNow,'Sell FBA 30d £':fba30,'Sell FBA 90d £':fba90,'Sell BB 90d £':bb90,'UK Amazon now £':ukp,
      'Phase 2 (ROI>=10%)':roi>=10?'YES':'no','OA price-match':pmNote,
      'All Amazon prices':opts.map(o=>`${o[0]} ${o[1]}`).join(' | '),'Dropped in':[...(found[a]||new Set(['UK']))].sort().join('/'),
      'Referral %':r1(ref*100),'FBA fee £':fba,kg:r2(kg),'Fees from':feeSrc,'LTD badge':r['Deals: Badge']||'',Category:catRoot,Flags:flags,'Last seen':'',
      'Tracking since':r['Tracking since']||'','Listed since':r['Listed since']||''});
  }
  const band=s=>{const i=BR.SPM_BANDS.findIndex(b=>s>=b);return i<0?BR.SPM_BANDS.length:i;};
  const slow=out.filter(o=>o.SPM<BR.SLOW_SPM&&o['ROI %']<BR.SLOW_ROI&&o['Profit £']<BR.SLOW_PROFIT);
  slow.forEach(o=>{drop(o.ASIN,o.Title,`slow seller (${o.SPM}/mo) with ROI ${o['ROI %']}% and profit £${o['Profit £'].toFixed(2)} - needs ROI ≥ ${BR.SLOW_ROI}% or profit ≥ £${BR.SLOW_PROFIT}`,'Slow seller, thin margin');});
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
