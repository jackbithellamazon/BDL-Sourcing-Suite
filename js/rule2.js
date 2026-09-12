/* ============================================================================
   RULE 2 — MERA HIGH-TICKET UK FILTER
   Port of rule2.py (11 Sep 2026). One UK Product Finder export in, scored list out.
   Deliberately lenient: OA discounts are invisible to the data, so keep the banger
   and tolerate a few duds rather than the other way round.
   ============================================================================ */
const R2={
  VAT:0.20, TARGET_ROI:5.0, MIN_SPM:10, PREP_MISC:1.00, DST:0.02, DEF_REF:15, DEF_FBA:3.50, SS_UK:0.15,
  /* score = 100 * ( sat(profit*spm,6000)^0.50 * sat(roi,9)^0.24 * sat(profit,18)^0.26 )^0.8 */
  SAT:{money:6000,roi:9,profit:18},POW:{money:0.50,roi:0.24,profit:0.26,all:0.8},
  /* what each brand's own store / OA channel usually gives on top — keep if the needed % off <= max(10, this) */
  BRAND:{'acer':15,'bosch':10,'dyson':10,"de'longhi":10,'delonghi':10,'gillette':10,'henry':10,'numatic':10,
    'honor':10,'hoover':15,'huawei':15,'huel':10,'lego':5,'lenovo':10,'logitech':10,'miele':10,'ninja':9,
    'oneplus':10,'philips':5,'russell hobbs':20,'sage':15,'samsung':10,'shark':9,'stanley':15,'tefal':10,
    'vax':10,'wahl':15,'e.l.f.':20,'elf':20},
  DEFAULT_ALLOW:10
};
function r2sat(x,h){return x>0?x/(x+h):0;}
function r2score(p,roi,spm){if(p<=0||roi<=0)return 1;
  const v=100*Math.pow(Math.pow(r2sat(p*spm,R2.SAT.money),R2.POW.money)*Math.pow(r2sat(roi,R2.SAT.roi),R2.POW.roi)*Math.pow(r2sat(p,R2.SAT.profit),R2.POW.profit),R2.POW.all);
  return Math.max(1,Math.min(100,Math.round(v)));}
function r2fees(sale,ref,fba){const r=sale*ref;return r+fba+R2.PREP_MISC+(r+fba)*R2.DST;}
function r2prof(sale,cost,ref,fba){const V=1+R2.VAT;const p=sale/V-cost/V-r2fees(sale,ref,fba);
  return[Math.round(p*100)/100,cost?Math.round(1000*p/cost)/10:0];}
/* what % off Amazon's price gets this to the target ROI */
function r2needed(sale,amz,ref,fba,t){t=t==null?R2.TARGET_ROI:t;let lo=0,hi=0.95;
  for(let i=0;i<50;i++){const m=(lo+hi)/2;if(r2prof(sale,amz*(1-m),ref,fba)[1]<t)lo=m;else hi=m;}return hi*100;}
function r2brate(b){const bl=(b||'').toLowerCase().trim();
  for(const k of Object.keys(R2.BRAND)){if(bl===k||bl.startsWith(k+' '))return R2.BRAND[k];}return null;}
function r2hasSS(r){if((r['Buy Box: Subscribe & Save']||'').trim().toLowerCase()==='yes')return true;
  const c=(r['One Time Coupon: Subscribe & Save %']||'').trim();return c!==''&&c!=='-';}

/* rows = array of {Header:value} from ONE UK Product Finder export.
   Returns {out:[qualifying, sorted by score], all:[every priced row], st:{...}} */
function rule2Compute(rows){
  const all=[],st={rows:rows.length,priced:0,demand:0,sell:0,kept:0};
  for(const r of rows){
    const a=(r.ASIN||'').trim();if(!a)continue;
    const amz=kNum(r['Amazon: Current']);if(!amz)continue;st.priced++;
    const bought=kNum(r['Monthly Sales Trends: Bought in past month']),drops=kNum(r['Sales Rank: Drops last 30 days'])||0;
    const spm=bought?bought:drops;if(spm<R2.MIN_SPM)continue;st.demand++;
    const f90=kNum(r['New, 3rd Party FBA: 90 days avg.']),bb90=kNum(r['Buy Box: 90 days avg.']);
    const sell=f90||bb90;if(!sell)continue;st.sell++;
    const ref=(kNum(r['Referral Fee %'])||R2.DEF_REF)/100,fba=kNum(r['FBA Pick&Pack Fee'])||R2.DEF_FBA;
    const brand=(r.Brand||'').trim();let eff=amz;const ap=[];
    const bd=kNum(r['Business Discount: Percentage']);if(bd){eff*=(1-bd/100);ap.push(`Business ${Math.round(bd)}%`);}
    const cp=kNum(r['One Time Coupon: Percentage']);if(cp){eff*=(1-cp/100);ap.push(`coupon ${Math.round(cp)}%`);}
    const ca=kNum(r['One Time Coupon: Absolute']);if(ca){eff-=ca;ap.push(`coupon £${ca.toFixed(2)}`);}
    if(r2hasSS(r)){eff*=(1-R2.SS_UK);ap.push(`S&S ${R2.SS_UK*100}%`);}
    eff=Math.round(eff*100)/100;
    const [p,roi]=r2prof(sell,eff,ref,fba),br=r2brate(brand),nd=r2needed(sell,eff,ref,fba);
    const kept=nd<=Math.max(R2.DEFAULT_ALLOW,br||R2.DEFAULT_ALLOW);
    const o={ASIN:a,Product:r.Title||'',Brand:brand,Score:r2score(p,roi,Math.round(spm)),
      'Buy at £':amz,'After discount £':eff,'Discount applied':ap.join('; '),'Sell for £':sell,
      'Profit £':p,'ROI %':roi,'Sells /mo':Math.round(spm),'Demand from':bought?'confirmed':'drops',
      '£ per month':Math.round(p*spm),'Needs % off':Math.round(nd*10)/10,'Brand discount %':br==null?'':br,
      'Check OA?':(br||nd>0)?'yes':'',
      'FBA resale proven?':f90?'yes':'no','Limited time deal?':(r['Deals: Badge']||'').trim()?'yes':'no',
      'Amazon 90d drop %':kNum(r['Amazon: 90 days drop %'])||0,'Offers':kNum(r['New Offer Count: Current'])||0,
      'Reviews':kNum(r['Reviews: Rating Count'])||0,
      'Tracking since':r['Tracking since']||'','Listed since':r['Listed since']||'',
      Keepa:`https://keepa.com/#!product/2-${a}`,'Buy link':`https://www.amazon.co.uk/dp/${a}`,'UK sell link':`https://www.amazon.co.uk/dp/${a}`,
      SAS:`https://sas.selleramp.com/sas/lookup?search_term=${a}&sas_cost_price=${eff.toFixed(2)}&sas_sale_price=${sell.toFixed(2)}`,
      kept,STATUS:'',Changed:'','Last seen':''};
    all.push(o);}
  const out=all.filter(o=>o.kept).sort((x,y)=>y.Score-x.Score||y['£ per month']-x['£ per month']);
  out.forEach((o,i)=>o['#']=i+1);st.kept=out.length;
  return{out,all,st};}
