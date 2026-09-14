/* BDL Sourcing — known-answer checks. Open index.html?checks with the fixtures served at ../fixtures/.
   Every number below was produced by this exact code on a real export and agreed with Jack.
   If a check goes red, a rule has drifted. Do not "fix" the number — find out what moved. */
window.SourcingChecks=(function(){
  const R=[];const ok=(name,got,want)=>{const pass=JSON.stringify(got)===JSON.stringify(want);R.push({name,pass,got,want});return pass;};
  async function csv(name){const t=await(await fetch('../fixtures/'+name)).text();return describeExport(parseCSV(t));}
  async function rule1(prefix,markets){const f={viewer:await csv(prefix+'-viewer.csv')};
    for(const m of markets){try{f[m]=await csv(prefix+'-'+m+'.csv');}catch(e){f[m]=null;}}
    ['UK','DE','FR','IT','ES'].forEach(m=>{if(!(m in f))f[m]=null;});
    return rule1Compute(f,prefix,0.86,null);}
  async function run(){R.length=0;const t0=performance.now();
    try{
      /* Rule 1 — Logitech, 9 Sep 2026 exports */
      const L=await rule1('logitech',['UK','DE','FR','IT','ES']);
      ok('R1 Logitech · viewer rows',L.st.viewer,415);
      ok('R1 Logitech · demand',L.st.demand,EXPECT.logitech.demand);
      ok('R1 Logitech · leads',L.out.length,EXPECT.logitech.leads);
      ok('R1 Logitech · first lead',L.out[0]&&L.out[0].ASIN,EXPECT.logitech.first);
      /* Rule 1 — ASUS, 11 Sep 2026 exports (five Finders + Viewer) */
      const A=await rule1('asus',['UK','DE','FR','IT','ES']);
      ok('R1 ASUS · viewer rows',A.st.viewer,375);
      ok('R1 ASUS · demand',A.st.demand,EXPECT.asus.demand);
      ok('R1 ASUS · leads',A.out.length,EXPECT.asus.leads);
      const mb=A.out.find(o=>o.ASIN==='B0H3VS2JL7');
      ok('R1 ASUS · B0H3VS2JL7 profit/ROI',mb?[mb['Profit £'],mb['ROI %']]:null,EXPECT.asus.mb);
      /* Rule 2 v2 — Mera, 11 Sep 2026 (sell price refitted 12 Sep on Jack's 10 graph reads) */
      const M=rule2Compute((await csv('mera-2026-09-11.csv')).rows);
      ok('R2 Mera 11 Sep · rows',M.st.rows,EXPECT.mera.rows);
      ok('R2 Mera 11 Sep · qualifying',M.out.length,EXPECT.mera.leads);
      const lt=M.all.find(o=>o.ASIN==='B0H4ZBZ757');
      ok('R2 Mera · Lenovo tab B0H4ZBZ757',lt?[lt.Score,lt['Profit £'],lt['ROI %']]:null,EXPECT.mera.lenovo);
      const si=M.all.find(o=>o.ASIN==='B0CVXXDFLQ');
      ok('R2 Mera · Siemens B0CVXXDFLQ',si?[si.Score,si['Profit £'],si['ROI %'],si['Sells /mo']]:null,EXPECT.mera.siemens);
      /* Rule 2 v2 — Mera, 12 Sep 2026 export with the extra columns (Buy Box 180d/Highest, FBM 90d, Tracking since) */
      const M2=rule2Compute((await csv('mera-2026-09-12b.csv')).rows);
      ok('R2 Mera 12 Sep · qualifying',M2.out.length,EXPECT.mera12.leads);
      ok('R2 Mera 12 Sep · first lead',M2.out[0]&&M2.out[0].ASIN,EXPECT.mera12.first);
      const vx=M2.all.find(o=>o.ASIN==='B0D817NXZZ');
      ok('R2 Mera 12 Sep · Vax sell £ (Jack: £180)',vx?vx['Sell for £']:null,EXPECT.mera12.vaxSell);
      ok('R2 Mera 12 Sep · Vax score / potential',vx?[vx.Score,vx['Potential score']]:null,EXPECT.mera12.vaxScore);
      ok('R2 Mera 12 Sep · NO 3P HISTORY count',M2.all.filter(o=>o['No 3P history?']==='yes').length,EXPECT.mera12.no3p);
      /* Rule 2 as the app runs it in b10: Rule 4 VAT hook on, no VA facts. Locks what a Mera run actually produces. */
      const M4=rule2Compute((await csv('mera-2026-09-12b.csv')).rows,{},{vatFor});
      ok('R2 Mera 12 Sep · with Rule 4 hook',[M4.out.length,M4.all.filter(o=>o['VAT %']===0).length],EXPECT.mera12.withVat);
      /* Rule 3 — Suz's grocery / S&S / Business filters, 13 Sep 2026 exports (same maths as Rule 2, Rule 4 on top) */
      const SN=rule2Compute((await csv('suz-sns-2026-09-13.csv')).rows,{},{vatFor,rule:3});
      ok('R3 Suz S&S 13 Sep · rows / qualifying',[SN.st.rows,SN.out.length],EXPECT.sns.counts);
      ok('R3 Suz S&S · first lead',SN.out[0]&&SN.out[0].ASIN,EXPECT.sns.first);
      ok('R3 Suz S&S · zero-rated (Rule 4) all / kept',[SN.all.filter(o=>o['VAT %']===0).length,SN.out.filter(o=>o['VAT %']===0).length],EXPECT.sns.vat0);
      const ec=SN.all.find(o=>o.ASIN==='B0D1HBH6FN');
      ok('R3 Suz S&S · Ecover B0D1HBH6FN (Business 12% + S&S 15%)',ec?[ec.Score,ec['After discount £'],ec['Sell for £'],ec['ROI %'],ec['VAT %']]:null,EXPECT.sns.ecover);
      const pp=SN.all.find(o=>o.ASIN==='B08ZPSYKLP');
      ok('R3 Suz S&S · Pro Plus caffeine = 20% not coffee',pp?pp['VAT %']:null,20);
      const BZ=rule2Compute((await csv('suz-business-2026-09-13.csv')).rows,{},{vatFor,rule:3});
      ok('R3 Suz Business 13 Sep · rows / qualifying',[BZ.st.rows,BZ.out.length],EXPECT.biz.counts);
      ok('R3 Suz Business · first lead',BZ.out[0]&&BZ.out[0].ASIN,EXPECT.biz.first);
      const lg=BZ.all.find(o=>o.ASIN==='B0FQWKWKLV');
      ok('R3 Suz Business · LG monitor B0FQWKWKLV (Business 5% = the 12-unit price)',lg?[lg.Score,lg['After discount £'],lg['Sell for £'],lg['ROI %']]:null,EXPECT.biz.lg);
      /* Rule 4 — VAT */
      const vr=t=>vatFor({Title:t},null).rate;
      ok('R4 · Lavazza coffee beans = 0%',vr('Lavazza Qualita Rossa Coffee Beans 1kg'),0);
      ok('R4 · coffee MACHINE = 20%',vr("De'Longhi Magnifica Bean to Cup Coffee Machine"),0.2);
      ok('R4 · Yorkshire Tea = 0%',vr('Yorkshire Tea 240 Tea Bags'),0);
      ok('R4 · AirPods not pods = 20%',vr('Apple AirPods Pro 2'),0.2);
      ok('R4 · tea tree oil = 20%',vr('Tea Tree Oil 100ml'),0.2);
      ok('R4 · coffee syrup = 20%',vr('1883 Maison Routin Premium Banana Syrup for Coffee'),0.2);
      ok('R4 · Green Tea perfume = 20%',vr('Elizabeth Arden Green Tea Citron Freesia EDT 100ml'),0.2);
      ok('R4 · coffee capsules = 0%',vr('Lavazza A Modo Mio Coffee Capsules x36'),0);
      ok('R4 · hot chocolate = 0%',vr('Options Belgian Hot Chocolate Drink'),0);
      ok('R4 · VA fact wins',vatFor({Title:'Some Coffee'},{vat:20,who:'Mera'}).rate,0.2);
      ok('R4 · VA sets 0 on anything',vatFor({Title:'Baby food pouch'},{vat:0}).rate,0);
      /* queue — the "better since" compare, Jack 13 Sep: 2p counts */
      const S=(buy,profit,roi,disc)=>({buy,sell:200,profit,roi,spm:40,disc:disc||''});
      ok('queue · 2p cheaper = BETTER',compareState(S(148.98,20.02,13.4),S(149,20,13.4)).status,'BETTER');
      ok('queue · 5p more profit = BETTER',compareState(S(149,20.05,13.5),S(149,20,13.4)).status,'BETTER');
      ok('queue · ROI 11→12 = BETTER',compareState(S(149,18,12),S(149,16.5,11)).status,'BETTER');
      ok('queue · business price appears = BETTER',compareState(S(149,20,13.4,'Business 9%'),S(149,20,13.4)).status,'BETTER');
      ok('queue · 2p dearer = WORSE',compareState(S(149.02,19.98,13.4),S(149,20,13.4)).status,'WORSE');
      ok('queue · same = UNCHANGED',compareState(S(149,20,13.4),S(149,20,13.4)).status,'UNCHANGED');
      ok('queue · no baseline = NEW',compareState(S(149,20,13.4),null).status,'NEW');
      ok('queue · cheaper but sell fell 10% = WORSE',compareState(S(148,15,10),S(149,20,13.4)).status,'WORSE');
      const q=[{ASIN:'A','After discount £':100,'Sell for £':150,'Profit £':10,'ROI %':10,'Sells /mo':30,Score:40,'Discount applied':''},{ASIN:'B','After discount £':100,'Sell for £':150,'Profit £':10,'ROI %':10,'Sells /mo':30,Score:40,'Discount applied':''},{ASIN:'C','After discount £':100,'Sell for £':150,'Profit £':10,'ROI %':10,'Sells /mo':30,Score:40,'Discount applied':''}];
      const gone=applyQueue(q,2,{B:{state:{buy:100,sell:150,profit:10,roi:10,spm:30},stamp:'2026-09-12_0700'},C:{state:{buy:100,sell:150,profit:10,roi:10,spm:30},stamp:'2026-09-12_0700'},Z:{state:{buy:50,sell:80,profit:5,roi:9,spm:10},stamp:'2026-09-12_0700'}},{B:{v:'No',state:{buy:100,sell:150,profit:10,roi:10,spm:30}},C:{v:'No',state:{buy:101,sell:150,profit:9.5,roi:9.4,spm:30}}});
      ok('queue · new, judged-unchanged, judged-but-better, gone',[q[0].QUEUE,q[1].QUEUE,q[2].QUEUE,gone.length],['new','','better',1]);
      /* floors — the per-source Filter & Sort */
      const fo={ASIN:'F','Sells /mo':120,'ROI %':14,'Profit £':22,'Sell for £':180,'After discount £':140,Score:55,'Potential score':60,Offers:4};
      ok('floors · none set passes',failsFloor(fo,null,2),'');
      ok('floors · sales 5000 fails',!!failsFloor(fo,{minSpm:5000},2),true);
      ok('floors · ROI 10 passes, score 70 fails',[failsFloor(fo,{minRoi:10},2),!!failsFloor(fo,{minScore:70},2)],['',true]);
      ok('floors · rule 1 ignores score',failsFloor({SPM:30,'ROI %':12,'Profit £':5,'Sell £ used':40,'Landed £':30},{minScore:70},1),'');
      /* pure maths */
      /* referral 15.00 + FBA 3.50 + prep 0.60 + misc 0.40 + 2% DST on (15+3.5) = 0.37 */
      ok('fees · £100 sale, 15%, £3.50 FBA',Math.round(brFees(100,0.15,3.50,0.5,'')*100)/100,19.87);
      ok('R2 score · £30/10%/1000',r2score(30,10,1000),EXPECT.score1);
      ok('R2 score · £100/20%/50',r2score(100,20,50),EXPECT.score2);
    }catch(e){R.push({name:'checks crashed: '+e.message,pass:false,got:String(e.stack||e),want:''});}
    render(performance.now()-t0);return R;}
  function render(ms){const pass=R.filter(r=>r.pass).length;
    let el=document.getElementById('checksOut');if(!el){el=document.createElement('div');el.id='checksOut';document.body.prepend(el);}
    el.style.cssText='position:fixed;inset:20px;overflow:auto;z-index:99;background:#0b0e16;color:#eef1f7;padding:22px;border-radius:14px;font:13px/1.6 ui-monospace,Menlo,monospace;border:2px solid '+(pass===R.length?'#36d6a4':'#f76a83');
    el.innerHTML=`<div style="font-size:18px;font-weight:700;margin-bottom:12px">${pass===R.length?'ALL GREEN':'RED'} · ${pass}/${R.length} checks · ${Math.round(ms)} ms</div>`+
      R.map(r=>`<div style="color:${r.pass?'#36d6a4':'#f76a83'}">${r.pass?'✓':'✗'} ${r.name}${r.pass?'':` — got ${JSON.stringify(r.got)} want ${JSON.stringify(r.want)}`}</div>`).join('')+
      `<div style="margin-top:14px;color:#868ea2">Close: reload without ?checks</div>`;}
  /* Expected values — produced by build b1 on 12 Sep 2026 from the frozen rules, then LOCKED.
     Logitech 9 Sep: 415 rows → 241 demand → 88 leads.  ASUS 11 Sep: 375 → 114 → 50 (floor 0% / −15% wide-gap).
     Mera 11 Sep under Rule 2 v2 + the Settings discount list (Acer full-price-only → 5% on sale): 525 rows → 366 qualify; Siemens sells at £596 (was £698 under v1's lone-FBA hole).
     Mera 12 Sep (extra columns): 390 qualify, Vax £176.64 vs Jack's £180, 139 with no 3P history. */
  const EXPECT=window.SOURCING_EXPECT||{
    logitech:{demand:241,leads:88,first:'B07MTXLFXV'},
    asus:{demand:114,leads:50,mb:[80.04,89.3]},
    mera:{rows:525,leads:366,lenovo:[69,37.67,31.4],siemens:[77,107.12,30.7,100]},
    mera12:{leads:390,first:'B0GTWMRV87',vaxSell:176.64,vaxScore:[65,77],no3p:139,withVat:[390,0]},
    /* Suz 13 Sep: S&S 2,520 rows → 596 qualify (66 zero-rated, 36 of them kept); Business 179 → 16. Ecover £9.05 after 12% + 15%, sells £24.83. */
    sns:{counts:[2520,596],first:'B00T7L20EC',vat0:[66,36],ecover:[52,9.05,24.83,57.2,20]},
    biz:{counts:[179,16],first:'B0CVXQRN2K',lg:[54,403.73,522.97,13.4]},
    score1:75,score2:66};
  return{run,results:R};})();
