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
  /* b152 (25 Sep 2026): the checks replay OLD exports, but some rules count days from today — how old a listing is (b105: an option
     under six months old stays on its family's sales), how recent a confirmed sale was (b108/b109). On 25 Sep the Galaxy S26 family
     in the 12 Sep Mera export turned exactly six months old, 19 options left that export's leads, and four checks went red with
     no code having changed. The rules were right; the test was asking a 12 Sep question with a 25 Sep clock. So the whole run is
     judged as of the day every baseline below was last agreed. Move this date only when the baselines are re-agreed. */
  const CHECK_CLOCK='2026-09-24T12:00:00Z';
  function pinClock(){const Real=Date;const fixed=new Real(CHECK_CLOCK).getTime();
    const Pinned=class extends Real{constructor(...a){if(a.length)super(...a);else super(fixed);} static now(){return fixed;}};
    globalThis.Date=Pinned;return()=>{globalThis.Date=Real;};}
  async function run(){R.length=0;const t0=performance.now();const unpin=pinClock();
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
      /* Rule 1 b22 — sell never above "Buy Box: Highest" (Jack, 14 Sep: Lenovo Idea Tab "never ever been higher than 509.99").
         Synthetic UK-only Finder; the Logitech/ASUS exports never carried the column, so their locks stand. */
      const hdrC=['ASIN','Title','Brand','Categories: Root','Monthly Sales Trends: Bought in past month','Sales Rank: Drops last 30 days','Amazon: Current','Buy Box: Current','Buy Box: 90 days avg.','Buy Box: Highest','New, 3rd Party FBA: Current','New, 3rd Party FBA: 30 days avg.','New, 3rd Party FBA: 90 days avg.','Referral Fee %','FBA Pick&Pack Fee','Package: Weight (g)','Buy Box: Buy Box Seller'];
      const rowC=(a,t,ukp,bb90,hi,f90)=>[a,t,'Lenovo','Computers & Accessories',100,30,ukp,ukp,bb90,hi,'','',f90,7,4.82,900,'Amazon'];
      const tabC=[hdrC,rowC('B0GT2CJRP6','Lenovo Idea Tab Pro Gen 2',449.99,493.56,509.99,''),rowC('B0FXXRHY49','Lenovo L27-41 monitor',79.01,91.31,109,119.95),rowC('B0NOCAP000','No cap needed',50,80,120,'')];
      const SC=describeExport(parseCSV(tabC.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')));
      const C=rule1Compute({UK:SC,viewer:SC,DE:null,FR:null,IT:null,ES:null},'Lenovo',0.86,null);
      const tabl=C.out.find(o=>o.ASIN==='B0GT2CJRP6'),mon=C.out.find(o=>o.ASIN==='B0FXXRHY49'),noc=C.out.find(o=>o.ASIN==='B0NOCAP000');
      ok('R1 cap · Idea Tab sells at the Buy Box high',tabl?[tabl['Sell £ used'],tabl['Sell used'],tabl['Sell high £']]:null,[509.99,'Amazon owns the Buy Box · Buy Box 90d +8%, capped at the Buy Box high',509.99]);
      ok('R1 cap · monitor: sell £98.61 stands, best case capped at £109',mon?[mon['Sell £ used'],mon['Sell high £'],mon['Sell range']]:null,[98.61,109,'£91.31-£109.00']);
      ok('R1 cap · untouched when under the high',noc?[noc['Sell £ used'],noc['Sell used']]:null,[86.4,'Amazon owns the Buy Box · Buy Box 90d +8%']);
      ok('R1 cap · column seen / rows capped',[C.st.bbHiCol,C.st.capped],[true,1]);
      ok('R1 cap · Logitech export has no column',L.st.bbHiCol,false);
      const M12r=await csv('mera-2026-09-12b.csv');const MR=rule1Compute({UK:M12r,viewer:M12r,DE:null,FR:null,IT:null,ES:null},'Mera',0.86,null);
      const hiOf={};M12r.rows.forEach(r=>{hiOf[(r.ASIN||'').trim()]=parseFloat(String(r['Buy Box: Highest']).replace(/[^0-9.]/g,''))||0;});
      ok('R1 cap · Mera 12 Sep as UK-only: leads / capped',[MR.out.length,MR.st.capped],EXPECT.r1cap.mera);
      ok('R1 cap · no lead sells above its Buy Box high',MR.out.every(o=>!hiOf[o.ASIN]||(o['Sell £ used']<=hiOf[o.ASIN]+0.01&&o['Sell high £']<=hiOf[o.ASIN]+0.01)),true);
      /* b23 — table density helpers */
      const fp=flagPick(['worst case (Buy Box 90d £10.00): 3%','UK buy: check OA retailers (Currys 5%, JL 4%, Argos 6%)','sell price volatile','demand from drops only - does it sell?','NOT A DROP: Buy Box 90d £12.00 = Amazon £11.50','ZERO-RATED VAT assumed (coffee/tea) - confirm']);
      ok('b23 flags · two ranked chips, rest behind +n',[fp.show,fp.rest.length],[['NOT A DROP: Buy Box 90d £12.00 = Amazon £11.50','sell price volatile'],2]);
      ok('b23 sell label · short forms',[shortSell('Buy Box 90/180d average · no uplift (under £60)'),shortSell('Buy Box 180d +25%'),shortSell('capped at the Buy Box high'),shortSell('3P holds the Buy Box today')],['BB 90/180d avg · no uplift','BB 180d +25%','capped at BB high','3P holds the Buy Box']);
      /* b25 — £60+ refit on Jack's 14 Sep evening calls (Mera 12 Sep export carries every column) */
      const MF=rule2Compute((await csv('mera-2026-09-12b.csv')).rows,{},{vatFor});const fx=a=>MF.all.find(o=>o.ASIN===a);
      const vb=fx('B0GTWMRV87'),cb=fx('B0CHF986Q4'),sm=fx('B0CVXXDFLQ'),ts=fx('B00Q8OKQGU');
      ok('R2 fit · Vivobook 15 (Jack £425–450; parked FBA £599.99 ignored, FBM £399 +10% caps)',vb?[vb['Sell for £'],vb['Sell from']]:null,EXPECT.r2fit.vivobook);
      ok('R2 fit · IdeaPad Chromebook (Jack £325; 26 sellers)',cb?[cb['Sell for £'],cb['Sell from']]:null,EXPECT.r2fit.chromebook);
      ok('R2 fit · Siemens EQ500 (Jack £596; 3P floor £674)',sm?[sm['Sell for £'],sm['Sell from']]:null,EXPECT.r2fit.siemens);
      ok('R2 fit · STATUS toaster (Jack: never) → price moved, dropped',ts?[ts['Sell for £'],ts['Sell from'],!!MF.out.find(o=>o.ASIN==='B00Q8OKQGU')]:null,EXPECT.r2fit.toaster);
      ok('R2 fit · lead state carries Keepa inputs',(()=>{const k=leadState(vb,2).k;return[k.bb90,k.bb30,k.f90,k.fbm90,typeof k.why];})(),EXPECT.r2fit.keepa);
      /* b26 — round-4 calls: Shark upright £200–205, Ninja Detect £125–135, Brother £155.99 max, Hoover HMC5 £169–170, AOC £249.99 (data says
         £171 Buy Box / £199 FBA — disputed), Jet 75E £265, Ninja Blast £79–85 "tanked, full of sellers" */
      const f2=a=>{const o=MF.all.find(x=>x.ASIN===a);return o?[o['Sell for £'],o['Sell from']]:null;};
      ok('R2 fit · Shark upright (Jack £200–205; FBA 30/90d midpoint caps)',f2('B08CKWG1L9'),EXPECT.r2fit2.shark);
      ok('R2 fit · Ninja Detect (Jack £125–135)',f2('B0D8QP7NWR'),EXPECT.r2fit2.ninja);
      ok('R2 fit · Brother printer (Jack £155.99 max)',f2('B0CJV7P1C2'),EXPECT.r2fit2.brother);
      ok('R2 fit · Hoover HMC5 (Jack £169–170)',f2('B0H4TMTMG8'),EXPECT.r2fit2.hoover);
      ok('R2 fit · Samsung Jet 75E (Jack £249.99 — model +9%, he prices under the 3P pack; FBA 30/90d midpoint caps)',f2('B0CGXQG4M4'),EXPECT.r2fit2.jet);
      ok('R2 fit · Ninja Blast 2-pack (Jack £79–85; FBA 30/90d midpoint £78.86)',f2('B0DNR78C5J'),EXPECT.r2fit2.blast);
      /* b27 — Canon PIXMA TS4150i, Jack £62 min / £67–69, buy Argos £39.99 −6%: computers take the plateau model under £60 */
      const CN=rule2Compute((await csv('canon-ts4150i-2026-09-14.csv')).rows,{},{vatFor});const cn=CN.all[0];
      ok('R2 fit · Canon TS4150i (Jack £62–69; £56 Buy Box avg, FBA £60–62)',cn?[cn['Sell for £'],cn['Sell from'],cn['Category kind']]:null,EXPECT.r2fit2.canon);
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
      const bk=M2.all.find(o=>o.ASIN==='B0CS6N4VF7'),ph=M2.all.find(o=>o.ASIN==='B0G53Q4DPN');
      ok('R2 Mera 12 Sep · Galaxy Book4 Pro: FBM-only history gets no plateau (Jack £1,700–1,800)',bk?[bk['Sell for £'],bk['Sell from']]:null,EXPECT.mera12.book4);
      ok('R2 Mera 12 Sep · S26 Ultra 512GB no history +5% (Jack £1,299.99 minimum)',ph?ph['Sell for £']:null,EXPECT.mera12.phone);
      /* Rule 2 as the app runs it in b10: Rule 4 VAT hook on, no VA facts. Locks what a Mera run actually produces. */
      const M4=rule2Compute((await csv('mera-2026-09-12b.csv')).rows,{},{vatFor});
      ok('R2 Mera 12 Sep · with Rule 4 hook',[M4.out.length,M4.all.filter(o=>o['VAT %']===0).length],EXPECT.mera12.withVat);
      /* Suz's grocery / S&S / Business filters, 13 Sep 2026 exports — Rule 2 with the under-£60 sell model, Rule 4 on top */
      const SN=rule2Compute((await csv('suz-sns-2026-09-13.csv')).rows,{},{vatFor});
      ok('R3 Suz S&S 13 Sep · rows / qualifying',[SN.st.rows,SN.out.length],EXPECT.sns.counts);
      ok('R3 Suz S&S · first lead',SN.out[0]&&SN.out[0].ASIN,EXPECT.sns.first);
      ok('R3 Suz S&S · zero-rated (Rule 4) all / kept',[SN.all.filter(o=>o['VAT %']===0).length,SN.out.filter(o=>o['VAT %']===0).length],EXPECT.sns.vat0);
      const ec=SN.all.find(o=>o.ASIN==='B0D1HBH6FN');
      ok('R3 Suz S&S · Ecover B0D1HBH6FN (Business 12% + S&S 15%)',ec?[ec.Score,ec['After discount £'],ec['Sell for £'],ec['ROI %'],ec['VAT %']]:null,EXPECT.sns.ecover);
      const pp=SN.all.find(o=>o.ASIN==='B08ZPSYKLP');
      ok('R3 Suz S&S · Pro Plus caffeine = 20% not coffee',pp?pp['VAT %']:null,20);
      const lor=SN.all.find(o=>o.ASIN==='B0G4QJPXD6'),ww=SN.all.find(o=>o.ASIN==='B09RGW82GJ');
      ok("R2 Suz S&S · L'OR pods: 180d is an old price regime, sell = 90d avg and it is a loss",lor?[lor['Sell for £'],lor.kept]:null,EXPECT.sns.lor);
      ok('R2 Suz S&S · WoodWick candle: low-ticket score scale (Jack: a good lead, was 28)',ww?ww.Score:null,EXPECT.sns.woodwick);
      const sb=SN.all.find(o=>o.ASIN==='B0D32138JW'),sk=SN.all.find(o=>o.ASIN==='B0FNX6YLCJ'),fb=SN.all.find(o=>o.ASIN==='B07L5BS94K');
      ok('R2 Suz S&S · under-£60 sell = higher Buy Box average, no uplift (Starbucks / Shark / Febreze)',[sb&&sb['Sell for £'],sk&&sk['Sell for £'],fb&&fb['Sell for £']],[EXPECT.sns.starbucks,EXPECT.sns.shark,EXPECT.sns.febreze]);
      const BZ=rule2Compute((await csv('suz-business-2026-09-13.csv')).rows,{},{vatFor});
      ok('R3 Suz Business 13 Sep · rows / qualifying',[BZ.st.rows,BZ.out.length],EXPECT.biz.counts);
      ok('R3 Suz Business · first lead',BZ.out[0]&&BZ.out[0].ASIN,EXPECT.biz.first);
      const lg=BZ.all.find(o=>o.ASIN==='B0FQWKWKLV');
      ok('R3 Suz Business · LG monitor B0FQWKWKLV (Business 5% = the 12-unit price)',lg?[lg.Score,lg['After discount £'],lg['Sell for £'],lg['ROI %']]:null,EXPECT.biz.lg);
      /* never-sell categories */
      ok('cat · Fashion root blocked',catBlockReason('Fashion › Women | Nike Air Max Trainers'),'fashion');
      ok('cat · wine blocked',catBlockReason('Grocery › Wine | Oxford Landing Sauvignon Blanc 75cl'),'wine');
      ok('cat · coffee not blocked',catBlockReason('Grocery › Coffee | Lavazza beans'),'');
      ok('cat · spirit level not blocked',catBlockReason('DIY | Stanley Spirit Level 60cm'),'');
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
      /* b47: no verdict + same as the last run = not queued (Jack: "only new or better leads in here"); worse likewise; better is */
      {const q2=[{ASIN:'U','After discount £':100,'Sell for £':150,'Profit £':10,'ROI %':10,'Sells /mo':30,Score:40},{ASIN:'W','After discount £':110,'Sell for £':150,'Profit £':4,'ROI %':4,'Sells /mo':30,Score:20},{ASIN:'B','After discount £':90,'Sell for £':150,'Profit £':20,'ROI %':22,'Sells /mo':30,Score:60}];
        const pm={U:{state:{buy:100,sell:150,profit:10,roi:10,spm:30},stamp:'2026-09-14_0700'},W:{state:{buy:100,sell:150,profit:10,roi:10,spm:30},stamp:'2026-09-14_0700'},B:{state:{buy:100,sell:150,profit:10,roi:10,spm:30},stamp:'2026-09-14_0700'}};
        applyQueue(q2,2,pm,{});ok('queue · no verdict: unchanged / worse / better',[q2[0].STATUS,q2[0].QUEUE,q2[1].STATUS,q2[1].QUEUE,q2[2].STATUS,q2[2].QUEUE],['UNCHANGED','','WORSE','','BETTER','new']);}
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
      /* b57: five old ShiftTrack filters seeded paused with their links (Jack's 15 Sep notes) — never active by default */
      const hist=['suz-20plus','suz-7day-7-40','suz-7day-7-50','mera-7day-50plus','mera-7day-20-all'];
      /* b64: the storefront audit. An answer belongs to the product; your own correction inside 15 minutes rewrites
         the same row; anyone else's press writes a new one; a Keepa export fills the details for free. */
      const nowT='2026-09-16T10:00:00.000Z',soon='2026-09-16T10:05:00.000Z',later='2026-09-16T12:00:00.000Z';
      const p1=audPress('B0TEST00001',null,'not','Jack','A1',nowT);
      const p2=audPress('B0TEST00001',p1.row,'discord','Jack','A1',soon);      /* same person, 5 min later → correction */
      const p3=audPress('B0TEST00001',p2.row,'discord','Jack','A1',later);     /* same person, 2 h later → new row */
      const p4=audPress('B0TEST00001',p2.row,'ws','Mera','A1',soon);           /* someone else → new row */
      ok('Audit · a correction rewrites, a later press adds',[p1.replaced,p2.replaced,p2.row.id===p1.row.id,p3.replaced,p4.replaced,p4.row.id===p2.row.id],
        [false,true,true,false,false,false]);
      ok('Audit · status: verdict, then a joint lead we sell, else to do',
        [audStatus({verdict:'not'},false),audStatus(null,true),audStatus(null,false)],['not','jointauto','todo']);
      const csvRow=(await csv('tea-coffee-2026-09-15.csv')).rows.find(r=>r.ASIN==='B0CNXZYW75');
      const pr=audFromCsv(csvRow);
      ok('Audit · a Keepa export fills the details free',[pr.asin,pr.brand,Math.round(pr.price*100)/100,pr.image.startsWith('https://m.media-amazon.com/images/'),pr.source],
        ['B0CNXZYW75','STARBUCKS',27.99,true,'export']);
      ok('Audit · Keepa API product → the same shape',(()=>{const k=audFromKeepa({asin:'B0TEST00002',title:'Test',brand:'B',imagesCSV:'51abc.jpg,52def.jpg',stats:{current:[1299,-1,-1,4210,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1199]},categoryTree:[{name:'Grocery'}],monthlySold:400});
        return [k.price,k.rank,k.image,k.root,k.mo];})(),[11.99,4210,'https://m.media-amazon.com/images/I/51abc.jpg','Grocery',400]);
      ok('Audit · our own lead history is read back per ASIN',(()=>{const O=audOurIndex(
          [{name:'Mera high-ticket',source:'mera-highticket',day:'2026-09-15',at:'2026-09-15T10:00:00Z',who:'Mera',asins:['B0TEST00003']}],
          {'mera-highticket':{B0TEST00003:{state:{score:64,roi:12,profit:5,buy:10,sell:20},stamp:'2026-09-15_1000'}}},
          {});
        const e=O.B0TEST00003;return [e.runs,e.src,e.owner,e.score,e.roi,!!e.said];})(),[1,'Mera high-ticket','Mera',64,12,false]);
      /* b73 (Jack, 16 Sep): the audit's SellerAmp button must NOT carry a cost price. The Buy Box figure is what the
         RIVAL sells at, not what Jack pays, so sending it as sas_cost_price made SellerAmp read a 0% deal. Clicking
         the button and pressing S now open exactly the same URL. */
      ok('Audit · SellerAmp opens on the ASIN alone, no cost price',(()=>{const html=auLinks('B0TEST00004');
        const hrefs=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
        const sas=hrefs.find(h=>h.includes('selleramp'))||'';
        return [sas.includes('sas_cost_price'),sas.includes('sas_sale_price'),sas,hrefs.length];
      })(),[false,false,'https://sas.selleramp.com/sas/lookup?search_term=B0TEST00004',3]);
      /* b74 (Jack: "image still fucked", "why are auto and we had it and missed it the same colour"):
         1. .aupimg is a grid whose ROW was sized by the image itself (a 500px product in a 170px box), so the
            img's max-height:100% measured against 500px and overflow:hidden chopped the product in half.
            grid-template-rows:100% pins the row to the box, so contain finally contains.
         2. #FF8A3D belongs to the Missed it verdict ALONE. "We had it" and the "Our lead" chip are history,
            not a decision, so they are slate now. */
      ok('Audit · the panel image fits its box instead of being cropped',(()=>{
        const box=document.createElement('div');box.className='aupimg';box.style.width='600px';
        const im=document.createElement('img');im.width=500;im.height=500;box.appendChild(im);
        document.body.appendChild(box);
        const b=box.getBoundingClientRect(),i=im.getBoundingClientRect();
        box.remove();
        /* before the fix a 500px product laid out at its full 500px and overflow:hidden cut it in half */
        return [Math.round(b.height),Math.round(i.height),i.height<=b.height+1];
      })(),[170,170,true]);
      ok('Audit · orange means Missed it and nothing else',(()=>{
        const missed=(AUDIT_TYPES.find(t=>t.code==='missed')||{}).hex;
        const chip=document.createElement('span');chip.className='aupill p-had';document.body.appendChild(chip);
        const col=getComputedStyle(chip).color;chip.remove();
        const hex='#'+col.match(/\d+/g).slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join('').toUpperCase();
        return [missed,hex===missed,hex];
      })(),['#FF8A3D',false,'#B3C0D6']);
      /* b75: the two Mera filters are named for what they actually catch. The migration must rename a saved row
         that still holds the old name, and must NOT touch one Jack has renamed himself. */
      /* b126 (Jack: "improve names, electricals + look like the same for me"): named for what each one catches */
      /* b131: named from the decoded Keepa payload, not from the note — £60+ has no upper bound and is category-restricted */
      ok('Sources · the two Mera filters are named for what they actually search',
        ['mera-highticket','mera-150plus'].map(k=>(SRC_SEED.find(z=>z.key===k)||{}).name),
        ['Mera · chosen categories £60+','Mera · anything £150–£2,000']);
      ok('Sources · the rename skips a filter Jack named himself',(()=>{
        const rows=[{key:'mera-highticket',name:'Mera high-ticket',migV:6},
                    {key:'mera-150plus',name:'Mera BIG STUFF',migV:6}];
        const OLD={'mera-highticket':'Mera high-ticket','mera-150plus':'Mera high-ticket £150+'};
        rows.forEach(x=>{const sd=SRC_SEED.find(z=>z.key===x.key);
          if(sd&&x.name===OLD[x.key])x.name=sd.name;x.migV=7;});
        return rows.map(r=>r.name+'|'+r.migV);
      })(),['Mera · chosen categories £60+|7','Mera BIG STUFF|7']);
      /* b76 (Jack, 17 Sep): 100 EU alert ASINs with no Finder exports behind them. The UK Viewer is dropped as
         normal and the EU BUY side is bought from Keepa — 1 token per ASIN per market — then handed to Rule 1 in
         the exact shape a dropped CSV makes, so the frozen rule is never touched. */
      /* b78 — Jack sent the amazon.es checkout: GBP 68.91 against our GBP 77.06. A Keepa CSV is priced in
         the ACCOUNT currency, so his EU exports are already in pounds; the API answers in euros. Convert
         once here or Rule 1 reads euros as pounds and every EU buy looks ~17% dearer than it is. */
      ok('EU prices · euros are converted to pounds, like the export they stand in for',(()=>{
        const r=eupRow('B0TEST00010',7430,0.8575);          /* EUR 74.30 -> GBP */
        return [r&&r.ASIN,r&&r['Amazon: Current'],kNum(r&&r['Amazon: Current'])<74.30];
      })(),['B0TEST00010','63.71',true]);
      ok('EU prices · no Amazon offer in that market means no row, never a guess',
        [eupRow('B0TEST00011',null,0.8575),
         eupCents({stats:{current:[-1,1999,-1]}}),
         eupCents(null)],[null,null,null]);
      ok('EU prices · the cost is ASINs x markets, and a cached one is free',(()=>{
        const key=EUP_KEY,keep=localStorage.getItem(key);
        localStorage.removeItem(key);
        const asins=['B0TEST00013','B0TEST00014'],mk=['DE','FR','IT','ES'];
        const before=eupCost(asins,mk);
        const c={};c['DE|B0TEST00013']={at:Date.now(),row:null};
        /* a market answered hours ago is still worth re-using; one from last week is not */
        c['FR|B0TEST00013']={at:Date.now()-13*3600e3,row:null};
        lsSet(key,c);
        const after=eupCost(asins,mk);
        if(keep==null)localStorage.removeItem(key);else localStorage.setItem(key,keep);
        return [before,after];
      })(),[8,7]);
      ok('EU prices · the list has a home to be dropped into',(()=>{const s=SRC_SEED.find(z=>z.key==='eu-alert-list');
        return s?[s.rule,s.markets.join(','),s.cadence,s.status,s.owner]:null;})(),[1,'DE,FR,IT,ES','adhoc','active','Jack']);
      /* b77: Ultimate Ears is a Logitech sub-brand Keepa files under its OWN brand name, so the Logitech
         run never saw it. The Keepa finder link is built from src.brands, so the name widens the filter. */
      ok('Sources · Ultimate Ears rides with Logitech',(()=>{const s=SRC_SEED.find(z=>z.key==='logitech');
        const inLink=decodeURIComponent(finderLink({type:'brand',brands:s.brands})).toLowerCase();
        return [s.brands.includes('Ultimate Ears'),inLink.includes('ultimate ears'),inLink.includes('logitech g')];
      })(),[true,true,true]);
      ok('Sources · the rename adds, it never drops a name Jack typed',(()=>{
        const x={key:'logitech',brands:['Logitech','Jack custom'],migV:7};
        if(!x.brands.some(b=>String(b).toLowerCase()==='ultimate ears'))x.brands.push('Ultimate Ears');
        return x.brands.join('|');})(),'Logitech|Jack custom|Ultimate Ears');
      /* the run toolbar has to stay reachable while you scroll a long lead list */
      ok('Leads · the run toolbar is sticky and the KPV button is there',(()=>{
        const tb=document.querySelector('#leadResults .toolbar');
        return [tb?getComputedStyle(tb).position:'missing',!!document.querySelector('#copyKpv')];
      })(),['sticky',true]);
      /* b84 (Jack: "confirmed sales > everything — confirmed sales is sales from Amazon themselves and
         confirmed a minimum of 50"). The order of resort, proven on the Logitech Lift family 17 Sep:
         real sales 1000/300/200/100/100 against review shares 68.7/13.9/10.5/6.7/0.3%. */
      ok('Leads · Amazon\u2019s own figure beats everything else',(()=>{
        const rows=[{ASIN:'A1','Variation Count':'8','Variation ASINs':'A1,A2','Reviews: Review Count - Format Specific':'2538','Listed since':'2022/04/19'},
                    {ASIN:'A2','Variation Count':'8','Variation ASINs':'A1,A2','Reviews: Review Count - Format Specific':'11','Listed since':'2026/03/02'}];
        const rev={},byAsin={};rows.forEach(r=>{byAsin[r.ASIN]=r;rev[r.ASIN]=kNum(r['Reviews: Review Count - Format Specific'])||0;});
        const out=[{ASIN:'A1',SPM:1000,'SPM from':'bought',Flags:''},{ASIN:'A2',SPM:32,'SPM from':'drops',Flags:''}];
        out.forEach(o=>{const bought=(o['SPM from']==='bought')?o.SPM:null;
          if(bought>=50){o['Demand basis']='confirmed by Amazon';return;}
          const sibs=String(byAsin[o.ASIN]['Variation ASINs']).split(',').filter(x=>byAsin[x]);
          const fam=sibs.reduce((t,x)=>t+(rev[x]||0),0);
          if(fam>0){o['Option share %']=r1(rev[o.ASIN]/fam*100);o['Demand basis']='share of the family reviews';}
        });
        return [out[0]['Demand basis'],out[0]['Option share %'],out[1]['Demand basis'],out[1]['Option share %']];
      })(),['confirmed by Amazon',undefined,'share of the family reviews',0.4]);
      /* 50 is the floor Amazon ever prints — measured across 622 of Jack's rows, the smallest is 50 */
      ok('Leads · a figure under 50 is never treated as confirmed',
        [49,50,100].map(v=>v>=50?'confirmed by Amazon':'not confirmed'),
        ['not confirmed','confirmed by Amazon','confirmed by Amazon']);
      /* b85 (Jack, 17 Sep): "something that doesn't even show 50 spm by amazon even if it says 40 drops -
         it isn't over 50 sales". A missing figure is a CEILING, not a gap. And: "anything with 10 keepa
         drops and a 50% or under % shouldn't be sold unless profit and roi is really really good, where
         i'd buy 1 unit." The four numbers live in ONE_UNIT so he can change them in one line. */
      ok('Leads · the one-unit rule is four numbers in one place',
        [ONE_UNIT.share,ONE_UNIT.drops,ONE_UNIT.roi,ONE_UNIT.profit],[0.50,10,50,10]);
      ok('Leads · 10 drops and half the listing: only exceptional money is worth a unit',(()=>{
        const call=(share,spm,roi,prof)=>{
          if(!(share<=ONE_UNIT.share&&spm<=ONE_UNIT.drops))return 'normal';
          return (roi>=ONE_UNIT.roi&&prof>=ONE_UNIT.profit)?'1 unit only':'leave it';};
        return [call(0.50,10,91,13),      /* the Starrett money, on half a listing */
                call(0.50,10,20,4),       /* ordinary money */
                call(0.50,10,60,6),       /* good ROI, thin per unit */
                call(0.90,10,20,4),       /* 90% of the listing - untouched */
                call(0.30,28,20,4)];      /* plenty of drops - untouched */
      })(),['1 unit only','leave it','leave it','normal','normal']);
      /* b85b (Jack, 17 Sep): a missing figure is a ceiling ONLY up to a point. "The odd one will still sell
         50+ and slipped through as a bug... anything over 50 keepa drops though, sales over 50 times a
         month." Measured on his own 1,404-row no-figure export: 60 of them, 4%. */
      ok('Leads · above 50 drops a missing figure means Amazon lost it, not a small seller',
        [12,49,50,51,140].map(d=>d>LOST_FIGURE_DROPS?'treat as 50+':'under 50 a month'),
        ['under 50 a month','under 50 a month','under 50 a month','treat as 50+','treat as 50+']);
      ok('Leads · a lost figure is never sent to the one-unit rule',(()=>{
        const call=(share,dr,roi,prof)=>{const lost=dr>LOST_FIGURE_DROPS;
          if(!(!lost&&share<=ONE_UNIT.share&&dr<=ONE_UNIT.drops))return 'normal';
          return (roi>=ONE_UNIT.roi&&prof>=ONE_UNIT.profit)?'1 unit only':'leave it';};
        return [call(0.4,10,20,4),call(0.4,10,91,13),call(0.4,140,20,4)];
      })(),['leave it','1 unit only','normal']);
      /* b87 (Jack: "improve these buttons"). An empty verdict must not look like a full one, the strip
         must read as three groups, and the tab you are on must be obvious. Measured, not eyeballed. */
      ok('Audit · the tab strip separates empty from full, and groups what it shows',(()=>{
        const host=document.createElement('div');host.className='autabs';
        host.innerHTML='<button class="on" style="--c:#2CE38B"><i class="d"></i><span>Joint</span><b>14</b></button>'
          +'<i class="sep"></i><button class="zero" style="--c:#FF5C6C"><i class="d"></i><span>Not lead</span><b>0</b></button>';
        document.body.appendChild(host);
        const on=host.querySelector('button.on'),zero=host.querySelector('button.zero');
        const o=+getComputedStyle(zero).opacity, dot=getComputedStyle(on.querySelector('.d')).width;
        const sep=getComputedStyle(host.querySelector('.sep')).width;
        /* b153: the counts used to be monospace so they lined up; they are the Mac system font now, lined up by tabular figures */
        const badge=getComputedStyle(on.querySelector('b')).fontVariantNumeric.toLowerCase();
        host.remove();
        return [o<0.5,o>0.3,dot,sep,badge.includes('tabular-nums')];
      })(),[true,true,'7px','1px',true]);
      /* b88 (Jack: "sellers on it is — why tho"). One dash was doing two jobs: Keepa says nobody is listed,
         and we never asked. Records written before the offer count existed counted as loaded forever. */
      ok('Audit · a product we have asked about is told apart from one we have not',(()=>{
        const k=audFromKeepa({asin:'B0TEST00030',title:'x',stats:{current:[1299,-1,-1,4210,0,0,0,0,0,0,0,7,0,0,0,0,0,0,1199]}});
        const kNone=audFromKeepa({asin:'B0TEST00031',title:'x',stats:{current:[1299,-1,-1,4210,0,0,0,0,0,0,0,-1]}});
        const old={asin:'B0TEST00032',source:'keepa'};      /* written before the field existed */
        const needs=p=>!p||p.source==='ours'||!p.asked;
        return [k.offers,k.asked,kNone.offers,kNone.asked,needs(k),needs(old)];
      })(),[7,1,null,1,false,true]);
      /* b89: Jack switched the parked Mera 7-day filter on. Its rank month was still Sep 2025. */
      ok('Sources · Mera 7-Day Drops is live and pinned to a current rank month',(()=>{
        const s=SRC_SEED.find(z=>z.key==='mera-7day-20-all');
        return [s.status,s.link.includes('%22202608%22'),s.link.includes('202509'),s.cadence];
      })(),['active',true,false,'daily']);
      /* b90 (Jack, 17 Sep): "happy for it just to be a £1 on all instead of splitting them". Rule 2 already
         carried one PREP_MISC of 1.00; Rule 1 split it 60p prep + 40p misc. Same money, one number now.
         Verified against his own 62-lead EU run: every landed, sell, profit, ROI and breakeven identical. */
      ok('Rule 1 · handling is one pound a unit, and it matches Rule 2',
        [BR.PREP_MISC,R2.PREP_MISC,BR.PREP,BR.MISC],[1.00,1.00,undefined,undefined]);
      ok('Rule 1 · the fee stack is referral + FBA + £1 + DST',(()=>{
        const f=brFees(22.99,0.15,3.05,0.36,'Home & Garden');
        const referral=22.99*0.15, dst=(referral+3.05)*BR.DST;
        return [Math.round(f*100)/100,Math.round((referral+3.05+1.00+dst)*100)/100];
      })(),[7.63,7.63]);
      /* b91: "never found it" (our filters never surfaced it) is a different answer from "never looked at"
         (it reached our list and nobody judged it). One blames a filter, the other a pair of eyes. */
      ok('Audit · Missed it can say the filters never found it',(()=>{
        const m=AUDIT_TYPES.find(t=>t.code==='missed');
        return [m.reasons.length,m.reasons.indexOf('Never found it'),m.reasons[m.reasons.length-1],
                AU_RKEYS.length>=m.reasons.length,AU_RKEYS[m.reasons.indexOf('Never found it')]];
      })(),[4,2,'Other',true,'e']);   /* b164: trimmed to the four Jack uses — Never looked at (Q), Passed on it (W), Never found it (E), Other (R) */
      ok('Audit · every reason on every verdict still has a key',
        AUDIT_TYPES.filter(t=>t.reasons).every(t=>t.reasons.length<=AU_RKEYS.length),true);
      /* b92 (Jack: "isn't smooth at all - very very jumpy"). Judging changes a row's height, the list is
         re-rendered whole, and everything below jumped. The row you are ON is now pinned: measure where it
         sits before the render, scroll by the difference after. And the picker only ever opens on that row. */
      /* b99: the correction is armed by a press, fires once, then disarms. A render nobody asked for -
         the Keepa graph landing in the panel, say - must never move the page, which is what jittered. */
      ok('Audit · the page is pinned by a press, once, and not by anything else',(()=>{
        const A={top:null,want:false};
        const pin=(top)=>{A.top=top;A.want=true;};
        const render=(after)=>{if(!(A.want&&A.top!=null))return 0;
          A.want=false;const drift=after-A.top;A.top=null;
          return (Math.abs(drift)>1&&Math.abs(drift)<600)?drift:0;};
        pin(200);
        const a=render(264);        /* the press: row grew 64px, scroll 64 so it stays put */
        const b=render(320);        /* graph lands after it: disarmed, so nothing moves */
        pin(200);
        const c=render(1400);       /* a wild jump is not a layout shift, leave it alone */
        return [a,b,c];
      })(),[64,0,0]);
      ok('Audit · the reason picker belongs to the focused row alone',(()=>{
        const shows=(i,focus)=>i===focus;
        return [shows(1,1),shows(0,1),shows(5,1)];})(),[true,false,false]);
      /* b93 (Jack: "improve colours"). A stripe on all 134 rows meant the stripe told you nothing.
         To do = none, judged = the verdict's colour at full strength, focused = wider plus a lift. */
      ok('Audit · the stripe is on the rows that have been decided, not on everything',(()=>{
        const host=document.createElement('div');host.className='aulist';
        host.innerHTML='<div class="aurow" style="--edge:#6e7bff"></div>'
          +'<div class="aurow judged" style="--edge:#FF8A3D"></div>'
          +'<div class="aurow focus" style="--edge:#6e7bff"></div>';
        document.body.appendChild(host);
        const rows=[...host.querySelectorAll('.aurow')];
        const o=rows.map(r=>+getComputedStyle(r,'::before').opacity);
        const w=rows.map(r=>getComputedStyle(r,'::before').width);
        host.remove();
        return [o[0],o[1],o[2],w[1],w[2]];
      })(),[0,1,1,'3px','4px']);
      /* b94 (Jack: "improve smoothness when i tick it and how it reacts when it's ticked and where it goes").
         The press now leaves a mark for one render so the row can flash its verdict colour once and the chip
         can pop in. The mark expires, so scrolling past the row later never replays it. */
      ok('Audit · a judged row is marked only for the moment it lands',(()=>{
        const view={landed:null};
        const press=a=>{view.landed={a:a,at:Date.now()};};
        const marked=(a,at)=>!!(view.landed&&view.landed.a===a&&Date.now()-view.landed.at<600);
        press('B0TEST00040');
        const now=marked('B0TEST00040'), other=marked('B0TEST00041');
        view.landed={a:'B0TEST00040',at:Date.now()-900};      /* the same row, a second later */
        return [now,other,marked('B0TEST00040')];
      })(),[true,false,false]);
      ok('Audit · the flash is short enough to keep up with the keyboard',(()=>{
        const st=document.createElement('style');document.head.appendChild(st);
        const el=document.createElement('div');el.className='aulist';
        el.innerHTML='<div class="aurow landed" style="--edge:#2CE38B"></div>';
        document.body.appendChild(el);
        const d=getComputedStyle(el.firstChild).animationDuration;
        el.remove();st.remove();
        return [d,parseFloat(d)<=0.5];
      })(),['0.42s',true]);
      /* b95 (Jack: "why does unsure take us to the top - i want to bulk go through them rapid without being
         moved as that just pisses me off"). auAdvance wrapped round to row 1 when nothing below was left. */
      ok('Audit · judging only ever moves you down the shelf',(()=>{
        const todo=[false,false,true,false,false];      /* only index 2 is unjudged */
        const advance=(focus)=>{for(let i=focus+1;i<todo.length;i++)if(todo[i])return i;
          return focus<todo.length-1?todo.length-1:focus;};
        return [advance(0),      /* finds the one below */
                advance(2),      /* nothing below: settles on the last row, NOT row 0 */
                advance(4)];     /* already last: stays put */
      })(),[2,4,4]);
      ok('Audit · G goes back to the first one still waiting',(()=>{
        const todo=[false,true,false,true];
        const first=()=>{for(let i=0;i<todo.length;i++)if(todo[i])return i;return -1;};
        return first();})(),1);
      /* b96 (Jack: "discord not having the 2nd click"). A verdict list saved in the browser before PS/THC/FFB
         existed used to win outright, so his Discord had no reasons and the second step never appeared. */
      ok('Audit · an old saved verdict list cannot freeze out a new behaviour',(()=>{
        const key='bdl-sourcing-audit-types',keep=localStorage.getItem(key);
        lsSet(key,[{code:'discord',label:'Discord',short:'Discord',hex:'#8C95FF',icon:'msg'},
                   {code:'not',label:'Not lead',short:'Not lead',hex:'#FF5C6C',icon:'x'}]);
        const t=audTypes();const d=t.find(x=>x.code==='discord');
        if(keep==null)localStorage.removeItem(key);else localStorage.setItem(key,keep);
        return [t.slice(0,2).map(x=>x.code).join(','),t.length===AUDIT_TYPES.length,(d.reasons||[]).join('/'),d.prompt,d.hex];
      })(),['discord,not',true,'PS/THC/FFB','Which Discord?','#8C95FF']);   /* b161: the saved two keep their order, and every answer in the code still appears after them */
      ok('Audit · with nothing saved it is simply the answers in the code',(()=>{
        const key='bdl-sourcing-audit-types',keep=localStorage.getItem(key);
        localStorage.removeItem(key);const n=audTypes().length;
        if(keep!=null)localStorage.setItem(key,keep);
        return n;})(),AUDIT_TYPES.length);
      /* b97 (Jack: "still not working bro"). Pressing the verdict a row already HAS is a no-op in audJudge,
         and the caller bailed before redrawing — so on a row already marked Discord, pressing 3 did nothing
         at all and the PS/THC/FFB picker could never be reached again. */
      ok('Audit · pressing the verdict a row already has still opens its picker',(()=>{
        const now='2026-09-17T10:00:00.000Z';
        const first=audPress('B0TEST00050',null,'discord','Jack','A1',now);
        const again=audPress('B0TEST00050',first.row,'discord','Jack','A1',now);
        /* audJudge would return nothing for the second press: same verdict, nothing to write */
        const redrawn=again.same&&(first.row.verdict==='discord');
        return [first.same===true,again.same===true,redrawn];
      })(),[false,true,true]);
      /* b98. b94 wrote `auView.landed={a:asin,…}` inside auJudgeNow(asins,code) — `asin` does not exist
         there, so EVERY verdict press threw a ReferenceError after saving but before redrawing. The verdict
         went in, the screen never moved, and it looked exactly like "Discord has no second step".
         Nothing here called auJudgeNow, so 128 checks passed while the one thing he does all day was broken.
         These read the functions' own source and fail on a name that is not in scope. */
      ok('Audit · the judge path only uses names that exist',(()=>{
        const bad=[];
        [['auJudgeNow',auJudgeNow],['auAdvance',auAdvance],['auFirstTodo',auFirstTodo],['audJudge',audJudge]]
          .forEach(([name,fn])=>{
            /* comments mention the names they are explaining, so read the CODE only */
            const src=fn.toString().replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ');
            const params=(src.slice(src.indexOf('(')+1,src.indexOf(')'))||'').split(',').map(x=>x.trim()).filter(Boolean);
            /* a bare `asin` inside a function whose parameter is `asins` is the exact slip b94 made */
            /* `asin:` is a property NAME and fine; `.asin` is a property READ and fine.
               A bare `asin` being used as a value is the slip. */
            if(params.includes('asins')&&/[^\w.]asin\b(?!s)(?!\s*:)/.test(src))bad.push(name+' uses `asin` but takes `asins`');});
        return bad;})(),[]);
      ok('Audit · a press marks the row it was actually given',(()=>{
        const v={landed:null};
        const mark=(asins)=>{v.landed={a:asins[0],at:Date.now()};};
        mark(['B0TEST00060','B0TEST00061']);
        return [v.landed.a,typeof v.landed.a];})(),['B0TEST00060','string']);
      /* b100 (Jack: "add a sort by"). 39 rivals had one fixed order. Each option answers a different
         question, so each is tested against the same set of rivals. */
      ok('Audits · the rival list can be asked seven different questions',(()=>{
        const mk=(name,all,sell,had,todo,la)=>({sh:{name},c:{all,sell,had,todo},la});
        const rows=[mk('Alpha',100,10,2,90,'2026-09-16'),
                    mk('Bravo',200,60,9,20,''),           /* never audited */
                    mk('Charlie',50,5,1,5,'2026-09-01')];
        const order=k=>{auView.rsort=k;return auRankRivals(rows.slice()).map(r=>r.sh.name).join(',');};
        return [order('overlap'),order('leads'),order('todo'),order('most'),order('size'),order('done'),order('name')];
      })(),['Bravo,Alpha,Charlie','Bravo,Alpha,Charlie','Charlie,Bravo,Alpha','Alpha,Bravo,Charlie',
            'Bravo,Alpha,Charlie','Bravo,Charlie,Alpha','Alpha,Bravo,Charlie']);
      ok('Audits · an order it does not know falls back to the useful one',(()=>{
        auView.rsort='nonsense';const a=auRsort();auView.rsort='leads';const b=auRsort();
        auView.rsort=null;return [a,b,auRsort()];})(),['overlap','leads','overlap']);
      /* b101: Keepa exports only the page on screen. Two of his ~150 exports stopped on exactly a page size
         (a mixed filter at 100, the SanDisk/Seagate brand run at 50). Real ones never land on those numbers
         by chance often enough to matter; these did, and nobody could tell. */
      ok('Import · an export that stops on a Keepa page size is flagged',
        [20,50,99,100,101,250,500,1000,2520,2965].map(onePage),
        [true,true,false,true,false,true,true,true,false,false]);
      /* b102: Rule 1 rows now take a typed sell price, re-priced through Rule 1's OWN fee maths. Measured on
         the G321 White from his 18 Sep Logitech run: France £29.74, landed £31.00. Rule 1 sold it at £47.51
         (7.2% ROI); Jack reads £51.50 off the graph. The formula is not touched. */
      ok('Rule 1 · a sell price typed off the graph re-works the profit with the same fees',(()=>{
        const landed=31.00,ref=0.15,fba=3.19,kg=0.4,cat='Computers & Accessories';
        const rule=brProfit(47.51,landed,ref,fba,kg,null,cat), yours=brProfit(51.50,landed,ref,fba,kg,null,cat);
        return [rule[0],rule[1],yours[0],yours[1],brBreakeven(landed,ref,fba,kg,cat)];
      })(),[2.24,7.2,4.95,16,44.22]);
      /* b103 (Jack, 18 Sep): "under 50spm need a minimum of £3 profit per unit or 20% roi" - literally, £3 OR 20%
         (was £5 OR 15%). A stricter "£3 AND 10%" was tried and rejected: it removed £90-£153/unit high-ticket leads.
         On his 18 Sep Logitech run the literal rule brings back one lead - the G321 Black - and loses none. */
      ok('Rule 1 · a slow seller needs £3 a unit or 20% ROI',[BR.SLOW_SPM,BR.SLOW_PROFIT,BR.SLOW_ROI],[50,3,20]);
      ok('Rule 1 · the G321 Black clears the slow-seller bar at the rule\u2019s own price',(()=>{
        const spm=49,roi=10.3,profit=3.22;
        return !(spm<BR.SLOW_SPM&&roi<BR.SLOW_ROI&&profit<BR.SLOW_PROFIT);})(),true);
      /* b103: "all 3 rules need to be super interlinkable". Rule 1 had its own seven-word VAT list and never
         asked Rule 3, so the same coffee could be taxed differently on a brand run and on Suz's filter. */
      ok('Rule 1 · VAT comes from Rule 3, the same engine as everywhere else',
        /vatFor\(r,null\)/.test(rule1Compute.toString()),true);
      ok('Rule 3 · the answers Rule 1 now gets are the refined ones',
        ['Lavazza Qualita Oro Coffee Beans 1kg','De\'Longhi Dedica Espresso Coffee Machine','Twinings English Breakfast 80 Tea Bags',
         'Coffee Machine Descaler Tablets'].map(t=>Math.round(vatFor({Title:t},null).rate*100)),[0,20,0,20]);
      /* b104: a variation with no figure names the sibling that actually sells - measured on the real ASUS
         Chromebook 15 family, 18 Sep: the lead (Misty Green 128GB) has none, Fabric Blue 64GB sells 1,000. */
      ok('Variations · a lead with no figure names the sibling that really sells',(()=>{
        const by={
          B0GNSHN79M:{'Monthly Sales Trends: Bought in past month':'','Variation Attributes':'Color: Misty Green; Size: 4GB RAM + 128GB eMMC;'},
          B0FL2CV8N2:{'Monthly Sales Trends: Bought in past month':'1000','Variation Attributes':'Color: Fabric Blue; Size: 4GB RAM + 64GB eMMC;'},
          B09C26SKX1:{'Monthly Sales Trends: Bought in past month':'100','Variation Attributes':'Color: Silver; Size: 4GB RAM + 64GB eMMC;'}};
        const a='B0GNSHN79M',sibs=Object.keys(by);
        const seller=sibs.map(x=>({x,b:kNum(by[x]['Monthly Sales Trends: Bought in past month'])||0}))
          .filter(z=>z.x!==a&&z.b>=50).sort((p,q)=>q.b-p.b)[0];
        return [seller&&seller.x,seller&&seller.b];})(),['B0FL2CV8N2',1000]);
      /* b105 (Jack: "it needs to see if it actually sells - this should check the reviews"). With no confirmed
         figure, an option's demand is the family's drops x its share of the family's reviews. */
      ok('Variations · an option is judged on its own share of the family, not the family',(()=>{
        const rows=[
          {ASIN:'B0FL7NNGRG','Variation ASINs':'B0FL7NNGRG,B0FL7QLH89','Reviews: Rating Count':'398','Reviews: Review Count - Format Specific':'130','Listed since':'2025/08/01'},
          {ASIN:'B0FL7QLH89','Variation ASINs':'B0FL7NNGRG,B0FL7QLH89','Reviews: Rating Count':'398','Reviews: Review Count - Format Specific':'54','Listed since':'2025/08/01'}];
        stampShares(rows);
        const spm=(r,drops,bought)=>bought||(r.__share!=null&&!r.__new?drops*r.__share:drops);
        return [Math.round(rows[0].__share*100),Math.round(spm(rows[0],49,0)),Math.round(spm(rows[1],53,300))];
      })(),[71,35,300]);
      ok('Variations · a new option keeps the family\u2019s drops (its reviews have not caught up)',(()=>{
        const recent=new Date(Date.now()-40*864e5).toISOString().slice(0,10).replace(/-/g,'/');
        const rows=[{ASIN:'A1','Variation ASINs':'A1,A2','Reviews: Rating Count':'10','Reviews: Review Count - Format Specific':'1','Listed since':recent},
                    {ASIN:'A2','Variation ASINs':'A1,A2','Reviews: Rating Count':'10','Reviews: Review Count - Format Specific':'99','Listed since':'2022/01/01'}];
        stampShares(rows);return [!!rows[0].__new,!!rows[1].__new];})(),[true,false]);
      /* b106 — the amber "Audit tables not created yet" banner, with the tables sitting right there. Product rows
         carried two columns src_products does not have; Supabase said "Could not find the 'asked' column ... in the
         schema cache" (HTTP 400, PGRST204); the app read "schema cache" as MISSING TABLES, stopped the sync, and
         every verdict queued behind that row stayed on his machine. Both ends are pinned here. */
      ok('Sync · a missing column is not a missing table',[
        missingTables({status:400,body:'{"code":"PGRST204","message":"Could not find the \'asked\' column of \'src_products\' in the schema cache"}'}),
        missingTables({status:404,body:'{"code":"PGRST205","message":"Could not find the table \'public.src_audit_verdicts\' in the schema cache"}'}),
        missingTables({status:404,body:''}),
        missingTables({status:500,body:'boom'})],[false,true,true,false]);
      ok('Sync · each audit table is sent only the columns it was built with',(()=>{
        const p=audShape('src_products',[{asin:'B0TEST00070',title:'x',price:9.99,offers:7,asked:1,fba:null,source:'keepa'}])[0];
        const v=audShape('src_audit_verdicts',[{id:'a|b|c',asin:'B0TEST00070',verdict:'discord',reason:'PS',extra:'nope'}])[0];
        return [Object.keys(p).sort().join(','),p.fba,Object.keys(v).sort().join(',')];
      })(),['asin,fba,price,source,title',7,'asin,id,reason,verdict']);
      /* b107 (Jack: "var from reviews should be on all of them"). Rule 2 gets the same demand as Rule 1 since b105:
         no confirmed figure = family drops x this option's review share; confirmed beats everything. */
      ok('Rule 2 · a variation is judged on its own share of the reviews, same as Rule 1',
        /r\.__share/.test(rule2Compute.toString())&&/r\.__share/.test(rule1Compute.toString()),true);
      /* b108 (Jack: "if it's had monthly sales it should stay"). The Shark Matrix Plus (B0G451ZTHV) showed a confirmed
         50-100 a month from May to 28 Aug 2026, then a blank - Amazon's number lapsed, the product did not stop selling. */
      ok('Demand · a figure Amazon confirmed recently still counts when today\u2019s is blank',(()=>{
        const iso=d=>new Date(Date.now()-d*864e5).toISOString().slice(0,10).replace(/-/g,'/');
        const base={'Monthly Sales Trends: Bought in past month':'','Monthly Sales Trends: Monthly Sold (Last Known)':'50'};
        const recent=confirmedSales(Object.assign({},base,{'Monthly Sales Trends: Monthly Sold Date (Last Known)':iso(21)}));
        const stale=confirmedSales(Object.assign({},base,{'Monthly Sales Trends: Monthly Sold Date (Last Known)':iso(200)}));
        const today=confirmedSales({'Monthly Sales Trends: Bought in past month':'300'});
        const none=confirmedSales({'Monthly Sales Trends: Bought in past month':''});
        return [recent&&recent.n,recent&&recent.lapsed,stale,today&&today.n,today&&today.lapsed,none];
      })(),[50,true,null,300,false,null]);
      /* b109 (Jack: "has to have a confirmed spm in the last 365 days if the review % puts it under 10 spm").
         The share is an estimate; one confirmed figure in the past year is proof, and proof wins. Keeps only. */
      ok('Demand · a confirmed figure in the last year overrules a low review share',(()=>{
        const iso=d=>new Date(Date.now()-d*864e5).toISOString().slice(0,10).replace(/-/g,'/');
        const row=d=>({'Monthly Sales Trends: Monthly Sold (Last Known)':'50','Monthly Sales Trends: Monthly Sold Date (Last Known)':iso(d)});
        const keep=(share,drops,r)=>{const spm=drops*share;
          const yearOk=spm<10?confirmedWithin(r,CONFIRMED_RESCUE_DAYS):null;return spm>=10||!!yearOk;};
        return [keep(0.10,49,row(200)),   /* reviews say 5/mo, confirmed 200 days ago: kept */
                keep(0.10,49,row(400)),   /* confirmed over a year ago: out */
                keep(0.10,49,{}),         /* never confirmed: out */
                keep(0.50,49,{})];        /* reviews already say 25/mo: kept on its own */
      })(),[true,false,false,true]);
      ok('Demand · the rescue only applies where the review share caused the drop',
        [/share!=null&&spm<10/.test(rule1Compute.toString()),/share!=null&&spm<R2\.MIN_SPM/.test(rule2Compute.toString())],[true,true]);
      /* b63 (Jack sent them 16 Sep): the six brands that had no Keepa link now carry his, and are Active */
      ok('Sources · the six new brand links are seeded Active',['hoover','tassimo','gopro','corsair-elgato','skullcandy','steelseries'].map(k=>{const s=SRC_SEED.find(z=>z.key===k);return s?[s.status,!!(s.link&&s.link.startsWith('https://keepa.com/#!finder/'))]:null;}),[['active',true],['active',true],['active',true],['active',true],['active',true],['active',true]]);
      /* b63: Microsoft, Staub and Xiaomi are banned outright (they were only banned inside Mera's Keepa filter before) */
      ok('Blacklist · Jack-approved brand bans seeded',BB_SEED.map(([k])=>k),['microsoft','staub','xiaomi']);
      /* b58: the Lead history view builds from whatever lead states this browser holds, without throwing */
      /* b110: the export says what it is missing; the rank month rolls on open; the API route is parked but its translator is real */
      ok('Export · lists the ladder columns a file is missing',missingLadderCols([{ASIN:'B0',Title:'x','Variation Count':'2','Reviews: Rating Count':'10'}]).length,4);
      ok('Export · a full file is missing nothing',missingLadderCols([Object.fromEntries(LADDER_COLS.map(c=>[c,'1']))]),[]);
      ok('Sources · last full month, on the 1st and mid-month',[lastFullMonth(new Date(2026,0,1)),lastFullMonth(new Date(2026,8,18))],['202512','202608']);
      {const suz=SRC_SEED.find(z=>z.key==='suz-deep-drops');const opened=rollRankMonth(suz.link,new Date(2026,8,18));
        ok('Sources · Suz A2A opens on Aug 2026, not Sep 2025',[suz.link.includes('%22202509%22'),opened.includes('%22202608%22'),opened.includes('202509')],[true,true,false]);
        ok('Sources · finderLink hands out the rolled link',finderLink(suz)===rollRankMonth(suz.link),true);
        const t=apiSelection(suz);
        ok('API · Suz A2A translates to the Product Finder API',[t.selection.avg90_AMAZON_gte,t.selection.avg90_AMAZON_lte,t.selection.deltaPercent90_AMAZON_gte,t.selection.current_AMAZON_gte,t.selection.totalOfferCount_gte,t.selection.monthlySold_gte,t.selection.productType,t.selection.categories_exclude.length,t.selection.perPage],[1000,4000,27,400,3,100,[0],2,50]);
        ok('API · what the API cannot do comes back as after-filters',[t.after.brandNot.includes('amazon'),t.after.rootNot.length,t.skipped],[true,6,['rank month (website only)']]);
        ok('API · after-filters drop a blocked brand and keep the rest',[apiKeep({brand:'Amazon',rootCategory:1},t.after),apiKeep({brand:'Tefal',rootCategory:1},t.after),apiKeep({brand:'Tefal',rootCategory:t.after.rootNot[0]},t.after)],[false,true,false]);
        ok('API · parked',APIRUN.on,false);}
      /* b111: a file without the ladder columns stops the run with a message that names them */
      ok('Export · missing columns block the run and are named',(m=>[!!m,/Export error/.test(m),/Variation ASINs/.test(m),/does not start/.test(m)])(ladderBlock({name:'x.csv',rows:[],missing:['Variation ASINs','Variation Count']})),[true,true,true,true]);
      ok('Export · a full file, or one built from the API, never blocks',[ladderBlock({name:'x.csv',missing:[]}),ladderBlock({name:'api',fromKeepa:true,missing:['Variation ASINs']}),ladderBlock(null)],[null,null,null]);
      /* b112: one discount list for both rules */
      ok('Discounts · Rule 1 and Rule 2 read the same list (Tefal full-price-only = 0 on a match, Hoover Direct 15%)',[discBrandPair('Tefal',100),discBrandPair('Hoover',100),brPmScenarios('Hoover',100,'Home & Kitchen').some(x=>x[0]==='Hoover Direct'&&x[1]===15)],[null,['Hoover Direct',15],true]);
      ok('Discounts · matchers by category (computers get Marks Electrical once confirmed, grocery gets Boots, not Currys)',[discMatchersFor('Computers & Accessories',500,['Marks Electrical']).some(x=>/marks/i.test(x[0])),discMatchersFor('Grocery',20).some(x=>/currys/i.test(x[0])),discMatchersFor('Grocery',20).some(x=>/boots/i.test(x[0]))],[true,false,true]);
      /* b113: unconfirmed retailers are assumed at 5%, confirmed ones at their rate; Business entries are not codes; Dell is on the list */
      ok('Discounts · Marks Electrical 8% is assumed at Currys / Argos 5% until a VA confirms it',[discMatchersFor('Computers & Accessories',500),discMatchersFor('Computers & Accessories',500,['Marks Electrical']).some(x=>x[0]==='Marks Electrical'&&x[1]===8)],[[['Currys / Argos (assumed)',5]],true]);
      ok('Discounts · Gtech (Business tiers) is not a price-match scenario; Dell is listed with no rate',[discBrandPair('Gtech',250),r2brate('Gtech',250),!!discForBrand('Dell'),discBrandPair('Dell',250)],[null,null,true,null]);
      /* b115: one sell price + the £100 bar, both switched off; scored against Jack's 23 graph calls of 18-19 Sep */
      {const LV=await csv('logitech-2026-09-18-viewer.csv'),SZ=await csv('suz-a2a-2026-09-19.csv'),ME=await csv('mera-electricals-2026-09-19.csv'),RD=await csv('random-2026-09-19.csv'),LP=await csv('laptops-2026-09-19.csv');
        const SETS={logiV:LV.rows,suz:SZ.rows,meraE:ME.rows,mera12:M12r.rows,rand:RD.rows,lap:LP.rows};
        const CALLS=[['logiV','B07W6H9L5G',253],['logiV','B0D3HJ7T18',108],['logiV','B0GGC3F6NS',67],['logiV','B07W6JP28L',88],['suz','B0D5CZ1XGQ',29],['suz','B07CGPZ3ZQ',40],['suz','B0GR4VR1C9',15.5],['suz','B0DWS969V4',14.5],['suz','B0DN93PF5Z',39],['suz','B00MW79OJC',21],['suz','B00014WXQO',31],['suz','B0BRK74S9Z',22.5],['meraE','B08F7V27DX',487],['meraE','B0DGXNP9ZH',530],['meraE','B09X7MPX8L',230],['meraE','B0CVXXDFLQ',600],['mera12','B07WQH7TJ4',265],['mera12','B08CKWG1L9',202.5],['mera12','B0D8QP7NWR',130],['mera12','B0CJV7P1C2',155.99],['mera12','B0H4TMTMG8',169.5],['mera12','B0CGXQG4M4',249.99],['mera12','B0DNR78C5J',82],
          /* 20 Sep, the random set: Instax £122, Skullcandy £25, Legion £130, Woofbrush £37, H115i £75 minimum, Superlight £92, Odyssey £375 */
          ['rand','B0C5JPYF86',122],['rand','B0CQKMWNHQ',25],['rand','B0FXXZDDMJ',130],['rand','B0H263L5TK',37],['rand','B0C6Q25HTR',75],['rand','B0F1YT51FQ',92],['rand','B0DP2ZSB33',375],
          /* 20 Sep: G PRO X headset £115 (Amazon holds the box 32%), GilletteLabs £29 (under £60, box out of stock 29%, sellers at £28) */
          ['logiV','B07W5JKB8Z',115],['suz','B0DY7SV4VC',29],
          /* 20 Sep, laptops: Book3 Pro £726, Chromebook 14 £260, Vivobook 400/mo £400, Chromebook Plus 514 £400, CX1505 £305, Chromebook Plus 516 £399 */
          ['lap','B0BQRQTV46',726],['lap','B0GNST9HPY',260],['lap','B0GTWMRV87',400],['lap','B0B8H4B2QJ',400],['lap','B0F24WGB75',305],['lap','B0B8H5ZF2N',399]];
        let within=0,n=0;CALLS.forEach(([set,a,jack])=>{const r=SETS[set].find(x=>(x.ASIN||'').trim()===a);if(!r)return;n++;const P=sellPick(r);if(P&&Math.abs(P.sell-jack)/jack<=0.10)within++;});
        ok('One sell · within 10% of Jack on 37 of his 38 graph calls',[n,within],[38,37]);
        const g305=sellPick(SZ.rows.find(x=>x.ASIN.trim()==='B07CGPZ3ZQ')),g923=sellPick(LV.rows.find(x=>x.ASIN.trim()==='B07W6H9L5G')),siem=sellPick(ME.rows.find(x=>x.ASIN.trim()==='B0CVXXDFLQ')),tom=sellPick(SZ.rows.find(x=>x.ASIN.trim()==='B0D5CZ1XGQ'));
        ok('One sell · the four shapes pick the right level',[g305.shape,g305.sell,g923.shape,g923.sell,siem.shape,siem.sell,tom.shape,tom.sell],['big-pack',39.71,'amazon-owns',269.86,'amazon-dips',560.71,'small-pack',26.72]);
        ok('One sell + £100 bar · both switched ON (b117), the b114 swap stays off',[UNIFIED_SELL.on,BAR100.on,BR.UNIFIED_SELL_60],[true,true,false]);
        UNIFIED_SELL.on=false;BAR100.on=false;const MEa=rule2Compute(ME.rows,{},{});UNIFIED_SELL.on=true;BAR100.on=true;const MEb=rule2Compute(ME.rows,{},{});
        ok('One sell + £100 bar · Mera electricals 19 Sep: 272 -> 238 with both on (b134: Amazfit is no longer blocked)',[MEa.out.length,MEb.out.length],[272,238]);}
      /* b116: the levels on the row, the stale-FBA note, and what the app learns from Jack's picks */
      {const LP=await csv('laptops-2026-09-19.csv'),SZ=await csv('suz-a2a-2026-09-19.csv');const dell=LP.rows.find(x=>x.ASIN.trim()==='B0GK33PJTK'),g305=SZ.rows.find(x=>x.ASIN.trim()==='B07CGPZ3ZQ');
        ok('Levels · six levels with seller counts on the G305',sellLevels(g305).map(x=>[x.key,x.value,x.n]),[['bb90',33.2,null],['bb180',32.03,null],['fba30',39.71,10],['fba90',43.11,10],['fbm90',42.05,15],['hi',96.24,null]]);
        ok('Levels · the Dell 15 FBA average is flagged stale, the G305 is not',[staleFba(dell),staleFba(g305)],[true,false]);
        const facts={a:{lvl:'fba30',shape:'big-pack',who:'Jack'},b:{lvl:'fba30',shape:'big-pack',who:'Jack'},c:{lvl:'fba30',shape:'big-pack',who:'Jack'},d:{lvl:'fba30',shape:'big-pack',who:'Jack'},e:{lvl:'bb90',shape:'big-pack',who:'Jack'},f:{lvl:'bb90',shape:'amazon-owns',who:'Jack'},g:{lvl:'bb90',shape:'big-pack',who:'Suz'},h:{lvl:'bb90',shape:'big-pack',who:'Mera'}};
        ok('Levels · learns a shape only after 5 of Jack\'s picks at 70% (the VAs\' two taps do not count)',[lvlStats(facts,'big-pack').n,lvlStats(facts,'big-pack').top.lvl,Object.keys(learnedLevels(facts))],[5,'fba30',['big-pack']]);
        UNIFIED_SELL.learned=learnedLevels(facts);const P=sellPick(g305);UNIFIED_SELL.learned=null;
        ok('Levels · a learned level becomes the pick for that shape',[P.learned,P.sell,P.shape],[true,39.71,'big-pack']);}
      /* b119: the velocity bar, from Jack's six calls on 20 Sep */
      ok('Velocity bar · CanesMeno / Chicnutrix / Moleskine show, Epson / Nutriburst / Perfectil do not',[passesVelocity(1000,9.3,0.66),passesVelocity(300,7.2,0.98),passesVelocity(100,9.4,1.12),passesVelocity(100,8.1,2.25),passesVelocity(100,7.4,0.47),passesVelocity(50,8.8,1.53)],[true,true,true,false,false,false]);
      ok('Velocity bar · under 50/mo it is the b103 slow-seller rule',[velocityBar(49),passesVelocity(49,10.3,3.22),passesVelocity(49,19,2.9)],[{min:0,roi:20,profit:3},true,false]);
      ok('Velocity bar · slides with pace: 200/mo needs 7.5% or £1, 150/mo 8.3% or £2, 1000/mo 6% or £1',[velocityBar(200),velocityBar(150),velocityBar(1000),passesVelocity(200,5,0.95),passesVelocity(200,8,0.5)],[{min:200,roi:7.5,profit:1},{min:100,roi:8.3,profit:2},{min:300,roi:6,profit:1},false,true]);
      /* b122: a variation whose own share is unknown is not handed the family's drops */
      {const LP=await csv('laptops-2026-09-19.csv'),ME=await csv('mera-electricals-2026-09-19.csv');stampShares(LP.rows);stampShares(ME.rows);
        const spin=LP.rows.find(x=>x.ASIN.trim()==='B0BTCNN3TS'),cb=LP.rows.find(x=>x.ASIN.trim()==='B0GNST9HPY');
        ok('Share unknown · the 3-option Acer Spin with no reviews of its own is unknown, the confirmed Chromebook 14 is not',[shareUnknown(spin),shareUnknown(cb)],[true,false]);
        const b=rule2Compute(LP.rows,{},{});
        ok('Share unknown · laptops 19 Sep: 50 leads, 21 of them on the family drops with the share unknown and flagged (b123: under 50 confirmed we use Keepa drops)',[b.out.length,b.st.unknown,b.unknown.length,b.all.filter(o=>o.chips.some(c=>/OWN SHARE UNKNOWN/.test(c[0]))).length>0],[50,21,21,true]);
        const ck={n:60,last:null,at:Date.now()};optionStamp(spin,ck);
        ok('Share unknown · a confirmed figure from Keepa clears it',[shareUnknown(spin),spin['Monthly Sales Trends: Bought in past month']],[false,'60']);
        ok('Share unknown · Keepa history turns into the Last Known columns',optionFromKeepa({monthlySold:0,monthlySoldHistory:[7263000,50,7300000,0]}).last,{n:50,date:'2024/10/22'});}
      /* b126: brand runs belong to nobody until Jack hands them out, and signing in names you */
      ok('Sources · every brand run is unassigned in a fresh list',[...new Set(SRC_SEED.filter(s=>s.type==='brand').map(s=>s.owner||'(none)'))],['(none)']);
      ok('Sources · unassigned is an owner you can pick, and it is not VAs',[OWNER_OPTS,NO_OWNER!=='VAs'],[['Jack','Mera','Suz','VAs','—'],true]);
      ok('Sign in · a name is read from the address, and Jack is known',[authNameFor('jackbithellamazon@gmail.com'),authNameFor('suz@bdl.co.uk'),authNameFor('mera.k@bdl.co.uk'),authNameFor('a@b.com',{name:'Given Name'})],['Jack','Suz','Mera','Given Name']);
      ok('Sign in · no session means the name picker still runs everything',[authSession(),authedName(),authUser()],[null,'',null]);
      /* b127: a past run shows what it recorded, and never prints NaN for a figure it never had */
      ok('Past runs · a missing count reads as a dash, not NaN',[numOrDash(35),numOrDash('—'),numOrDash(undefined),numOrDash(0)],['<b>35</b>','<b>—</b>','<b>—</b>','<b>0</b>']);
      /* b131 (ShiftTrack found it): a run can never be saved without a name on it */
      ok('Runs · a name is required before an export is processed',/if\(!me\(\)\)\{pendingFiles=arr;needMe\(\);/.test(String(handleFiles)),true);
      ok('Runs · the held export replays itself once a name is picked',/pendingFiles\).\{const f=pendingFiles;pendingFiles=null;whoGate\(false\);handleFiles\(f\);\}/.test(String(whoSet).replace(/\s+/g,' '))||/pendingFiles/.test(String(whoSet)),true);
      /* b132: a VA sees her own sources and nobody else's; Jack sees everything; unowned is Jack's until he hands it out */
      {const save=me();const S=k=>({key:k,owner:{a:'Suz',b:'Mera',c:NO_OWNER,d:'Jack',e:'VAs'}[k],status:'active'});const K=['a','b','c','d','e'];
        lsSet(ME_KEY,'Suz');const suz=K.map(k=>canSee(S(k)));
        lsSet(ME_KEY,'Mera');const mera=K.map(k=>canSee(S(k)));
        lsSet(ME_KEY,'Jack');const jack=K.map(k=>canSee(S(k)));
        lsSet(ME_KEY,save||'');
        ok('Privacy · own + "VAs" yes, each other and unowned no, Jack everything',[suz,mera,jack],[[true,false,false,false,true],[false,true,false,false,true],[true,true,true,true,true]]);}
      ok('Sources · Mera 200+ is in, paused, with her Keepa link',(()=>{const s=SRC_SEED.find(z=>z.key==='mera-200plus');return s?[s.name,s.status,s.owner,/keepa\.com\/#!finder/.test(s.link||''),/%22filter%22%3A200/.test(s.link||'')]:null;})(),['Mera · 200+ · 10% drop','paused','Mera',true,true]);
      /* b134: Logitech's multi-buy promos, and Amazfit is no longer blocked anywhere */
      ok('Logitech · a promo allowance, marked as a promo not a code',[discIsPromo('Logitech'),discBrandPair('Logitech',50),discIsPromo('Bosch')],[true,['Logitech',10],false]);
      ok('Logitech · the promo lives on the brand site, so the row sends them there',[discPromoSite('Logitech'),discPromoSite('Bosch'),BR.PROMO_FLOOR_ROI],['logitech.com','',-5]);
      ok('Filters · no saved filter blocks Amazfit any more',SRC_SEED.filter(s=>/amazfit/i.test(s.link||'')).map(s=>s.key),[]);
      ok('Filters · the other brand blocks survived the edit',(()=>{const b=s=>{try{const j=JSON.parse(decodeURIComponent((s.link||'').split('#!finder/')[1]));const x=(j.f||{}).brand;return x&&x.type==='isNoneOf'?String(x.filter).split('###').length:0;}catch(e){return -1;}};
        return [b(SRC_SEED.find(z=>z.key==='mera-150plus')),b(SRC_SEED.find(z=>z.key==='suz-deep-drops'))];})(),[42,39]);
      /* b136 (ShiftTrack, 21 Sep): a brand Jack has already given to a person must survive the "all brands unassigned" migration */
      ok('Owners · assigning a brand sticks; only the seeded pool is cleared',(()=>{
        const rows=[{key:'msi',type:'brand',owner:'Mera'},{key:'gtech',type:'brand',owner:'Mera'},{key:'bialetti',type:'brand',owner:'Suz'},
                    {key:'acer',type:'brand',owner:'VAs'},{key:'braun',type:'brand'}];
        rows.forEach(x=>{if(x.type==='brand'&&(x.migV||0)<11){if(!x.owner||x.owner==='VAs')x.owner=NO_OWNER;x.migV=11;}});
        return rows.map(r=>r.key+'='+r.owner);})(),['msi=Mera','gtech=Mera','bialetti=Suz','acer=—','braun=—']);
      /* b138: a Keepa API product maps onto the same columns a CSV export has — checked against the same two products' export */
      {const J=await(await fetch('../fixtures/api-sample-2026-09-21.json')).json();const ME2=await csv('mera-electricals-2026-09-19.csv');
        const rows=J.products.map(p=>apiRow(p,2));const r=rows.find(x=>x.ASIN==='B0B8H4B2QJ'),c=ME2.rows.find(x=>x.ASIN.trim()==='B0B8H4B2QJ');
        const near=(a,b,pct)=>Math.abs(kNum(a)-kNum(b))<=kNum(b)*pct;
        ok('API · prices land within 2% of the export taken two days earlier (Buy Box 90d, FBA 90d, FBM 90d)',[near(r['Buy Box: 90 days avg.'],c['Buy Box: 90 days avg.'],0.02),near(r['New, 3rd Party FBA: 90 days avg.'],c['New, 3rd Party FBA: 90 days avg.'],0.02),near(r['New, 3rd Party FBM: 90 days avg.'],c['New, 3rd Party FBM: 90 days avg.'],0.02)],[true,true,true]);
        ok('API · the exact columns match the export (Buy Box high, review count ±1 for two days of reviews, monthly sold, FBA offers, OOS, fees, variations, root)',[r['Buy Box: Highest'],String(Math.abs(kNum(r['Reviews: Rating Count'])-kNum(c['Reviews: Rating Count']))<=1?c['Reviews: Rating Count']:r['Reviews: Rating Count']),r['Monthly Sales Trends: Bought in past month'],r['Buy Box Eligible Offer Counts: New FBA'],r['Buy Box: 90 days OOS'],r['Referral Fee %'],r['FBA Pick&Pack Fee'],r['Variation Count'],r['Categories: Root'],rowDomain(r)],
          [c['Buy Box: Highest'],c['Reviews: Rating Count'],c['Monthly Sales Trends: Bought in past month'],c['Buy Box Eligible Offer Counts: New FBA'],c['Buy Box: 90 days OOS'],c['Referral Fee %'],c['FBA Pick&Pack Fee'],c['Variation Count'],c['Categories: Root'],'UK']);
        ok('API · Amazon\'s share of the box is read, and a variation with no confirmed figure is share-unknown (a confirmed one is not)',[/\d+ %/.test(r['Buy Box: % Amazon 90 days']),r['Reviews: Review Count - Format Specific'],shareUnknown(r),shareUnknown(Object.assign({},r,{'Monthly Sales Trends: Bought in past month':''}))],[true,'-',false,true]);
        const R2=rule2Compute(rows,{},{});ok('API · the rules run on API rows without a drop (2 priced, both demand)',[R2.st.priced,R2.st.demand],[2,2]);}
      /* b139 (Jack, 21 Sep — does an API run count as the VA's run? "not until they worked it") */
      {const L=String(logRun).replace(/\s+/g,' ');const iL=L.indexOf('apiLookSave('),iR=L.indexOf('runSave(');
        ok('API look · logRun stores it on its own and returns before runSave / leadSave (no src_runs row, baseline untouched)',[iL>0&&iR>iL,/paintRunStrip\(\);return;\}/.test(L.slice(iL,iR)),/apiLook=!!\(sellNow&&sellNow\.fromKeepa\)/.test(String(window.run)),String(apiLookSave).includes('cloudQueue')],[true,true,true,false]);}
      {const k='__chk_look';apiLookForget(k);apiLookSave(k,{at:'2026-09-21T10:32:00Z',leads:3,rows:[{ASIN:'B000000001'}]});const L=apiLookFor(k);apiLookForget(k);
        ok('API look · round-trips in this browser only and forgets cleanly',[L&&L.leads,L&&L.rows.length,apiLookFor(k)],[3,1,null]);}
      /* b140 (Jack, 21 Sep: "keep improving smoothness and easy to use") */
      ok('Keys · ↓ / Y at the last row of a page carries on to the next page, ↑ at the top goes back',[/view\.page<pages\)\{view\.page\+\+;touched\.clear\(\);renderTable\(\)/.test(String(stepActive)),/view\.page>1\)\{view\.page--;touched\.clear\(\);renderTable\(\)/.test(String(stepActive))],[true,true]);
      ok('Judged pill · says "all done" and lights Done when every visible lead has a verdict',[/finished=all\.length>0&&done===all\.length/.test(String(paintJudged)),/classList\.toggle\('ready',finished/.test(String(paintJudged))],[true,true]);
      {const css=[...document.styleSheets].find(x=>/brands\.css/.test(x.href||''));const rules=css?[...css.cssRules].map(r=>r.cssText):[];
        ok('Table · fits a 1366px laptop: the note box no longer forces a 244px Verdict column, level chips are chip-sized',[rules.some(r=>/^\.vnote \{.*max-width: 168px/.test(r)),rules.some(r=>/\.ltbl td\.num \.lv b \{.*font-size: 10\.5px/.test(r))],[true,true]);}
      /* b141 (Jack, 22 Sep: "storefront audit — still very jittery", "still very jumpy whenever I press anything") */
      {const css=[...document.styleSheets].find(x=>/brands\.css/.test(x.href||''));const rules=css?[...css.cssRules].map(r=>r.cssText):[];
        ok('Audit · a row never changes height: the buttons are on every row, not revealed on hover or focus',
          [rules.some(r=>/\.aulist \.aurow:not\(:hover\):not\(\.focus\) > \.aubtns/.test(r)&&/display: flex/.test(r)),
           rules.some(r=>/\.aulist \.aurow\.reasoning > \.aubtns/.test(r)&&/display: none/.test(r)),
           rules.some(r=>/\.aulist \.aurow:not\(\.focus\) \.aunext/.test(r)&&/visibility: hidden/.test(r))],[true,true,true]);}
      ok('Audit · a press repaints the list, not the whole page',[typeof auQuickRender==='function',typeof auRefresh==='function',/auQuickRender\(\)\)renderAudit/.test(String(auRefresh)),/auRefresh\(\);auFollow\(\);\}$/.test(String(auJudgeNow).trim())],[true,true,true,true]);
      ok('Audit · the reason chips stand in for the buttons instead of opening a line under them',/&&!v\.reason/.test(String(auRow))&&/reasons\?' reasoning':''/.test(String(auRow)),true);
      {const st={current:[]};st.current[18]=-1;st.current[0]=-1;st.current[1]=1299;st.current[3]=4200;
        const r=audFromKeepa({asin:'B0TEST00001',title:'T',stats:st});
        const bb={current:[]};bb.current[18]=2499;bb.current[0]=2599;bb.current[1]=2399;
        const r2=audFromKeepa({asin:'B0TEST00002',title:'T',stats:bb});
        ok('Audit · no Buy Box and no Amazon offer falls back to the cheapest live 3P price, labelled',[r.price,r.pricefrom,r2.price,r2.pricefrom],[12.99,'3p',24.99,'bb']);}
      {const rows=[{a:'x1',p:{price:10}},{a:'x2',p:{price:90}},{a:'x3',p:{}}];
        ok('Audit · the frozen order re-freezes when the numbers THIS sort reads arrive',/AU_SORTF\[auView\.sort\]/.test(String(auVisible))&&/auView\._osig!==osig/.test(String(auVisible)),true);}
      ok('Audit · a verdict given on another shelf says which shelf it came from',/v\.seller_id!==sh\.seller/.test(String(auRow))&&/from \$\{escapeHtml\(auSrcShort\(fromShelf\)\)\}/.test(String(auRow)),true);
      /* b142 (Jack, 22 Sep: "why only 83 and then I opened KPV and it only shows 1 now — super super buggy") */
      ok('Open in Keepa · looking is not judging: nothing is marked seen by opening',[/verdSetMany/.test(String(openInKeepa)),/nothing marked/.test(String(openInKeepa))],[false,true]);
      ok('Put back · restores the newest batch of SEEN marks on this source, never a Yes / No / Maybe',[typeof seenToday==='function',typeof putBackSeen==='function',/v\.v==='Seen'/.test(String(seenToday)),/sort\(\)\.pop\(\)/.test(String(seenToday)),/verdDelMany\(list\)/.test(String(putBackSeen))],[true,true,true,true,true]);
      ok('Put back · a removed verdict leaves the cloud too',[typeof verdDelMany==='function',/cloudQueue\('src_verdicts','delete'/.test(String(verdDelMany))],[true,true]);
      /* b143 (Jack, 22 Sep: "what is the fix and improvement to make sure it never happens again") — the guard that
         makes b142's bug impossible to reintroduce: ONE place in the app may write a Seen verdict, and it is the
         button that says so. If anyone ever adds another, this check fails with the line number. */
      {const src=await(await fetch('js/brands.js')).text();
        const hits=[...src.matchAll(/v:'Seen'/g)].map(m=>m.index);
        const start=src.indexOf('function markAllSeen(');const end=src.indexOf('\nfunction ',start+20);
        const inside=hits.length?hits.every(i=>i>start&&i<end):false;
        const lines=hits.map(i=>src.slice(0,i).split('\n').length);
        ok('Guard · only "Mark all as seen" may write a Seen verdict (b142: the Open button was doing it silently)',[hits.length,inside,lines.length===1],[1,true,true]);}
      ok('Verdicts · every write records how it was made, and that label never reaches the cloud',[/via:via\|\|'the row'/.test(String(verdSet)),/via:via\|\|'a bulk button'/.test(String(verdSetMany)),/rows\.push\(\{asin,v:row\.v,reason:row\.reason\|\|'',note:row\.note\|\|'',who,at,source_key/.test(String(verdSetMany)),/via/.test(String(verdSetMany).split('rows.push')[1]||'')],[true,true,true,false]);
      ok('History · a run records which leads needed a look and which fell off, not just the counts',[/queue:dayQueueFor\(R\)/.test(String(logRun))&&/o\.QUEUE\)\.map\(o=>o\.ASIN\)/.test(String(dayQueueFor)),/goneAsins:/.test(String(logRun)),/wasQueued\.has\(a\)\?'new':''/.test(String(openPastRun))],[true,true,true]);
      /* b144 (Jack, 22 Sep: "the 83 that was in the queue needs to be there for the day and marked done by x person") */
      ok('Today\'s list · the day\'s queue is fixed by the run and judged leads stay on it',[typeof dayList==='function',/r\.day\|\|String\(r\.at\)\.slice\(0,10\)\)!==today\(\)/.test(String(dayList)),/!\(day&&day\.has\(o\.ASIN\)\)/.test(String(visible)),/done\(a\)-done\(b\)/.test(String(visible))],[true,true,true,true]);
      ok('Today\'s list · the header counts what is left and who answered the rest',[/to do<span class="ldone"/.test(String(renderTable)),/byWho\[w\]=\(byWho\[w\]\|\|0\)\+1/.test(String(renderTable)),typeof paintDayBar==='function'],[true,true,true]);
      /* b145 (Jack, 22 Sep: a second run the same day must not rebuild the list) */
      ok('Today\'s list · set by the first run of the day, and only ever grows',[typeof dayQueueFor==='function',/\[\.\.\.new Set\(\[\.\.\.had,\.\.\.now\]\)\]/.test(String(dayQueueFor)),/queue:dayQueueFor\(R\)/.test(String(logRun))],[true,true,true]);
      ok('Better · the row says how much more profit, and £1+ reads differently from pennies',[/o\.STATUS==='BETTER'&&Math.abs\(o\.gain\|\|0\)>=0\.005/.test(String(statusCell)),/Math\.abs\(o\.gain\)>=1\?'big':''/.test(String(statusCell))],[true,true]);
      {/* the measured shape of BETTER on the 11→12 Sep Mera pair, so a change to the rule shows up here */
       const A=await csv('mera-2026-09-11.csv'),B=await csv('mera-2026-09-12.csv');
       const RA=rule2Compute(A.rows,{},{vatFor}),RB=rule2Compute(B.rows,{},{vatFor});
       const prev={};RA.out.forEach(o=>{prev[o.ASIN]={state:leadState(o,2),stamp:'2026-09-11T09:00:00Z'};});
       const out=RB.out.map(o=>Object.assign({},o));applyQueue(out,2,prev,{});
       const better=out.filter(o=>prev[o.ASIN]&&o.STATUS==='BETTER');
       const big=better.filter(o=>Math.abs(o.gain||0)>=1).length,tiny=better.filter(o=>Math.abs(o.gain||0)<0.25).length;
       ok('Better · measured on two real Mera runs: 25 flagged, 9 worth £1+ a unit, 13 under 25p',[better.length,big,tiny],[25,9,13]);}
      /* b146 (Jack, 22 Sep: "order of cheapness on EU if price matched - italy france germany - unsure where spain sits just yet") */
      {const P=(a,l)=>euPick(a,['IT','FR','DE'],l==null?0.25:l);
        const mk=(m,c)=>[m,c/1.17,c,1];
        const L=BR.EU_LEVEL;
        ok('EU order · on a matched price it goes Italy, France, Germany',[P([mk('ES',20.00),mk('FR',20.00),mk('DE',20.00)],L)[0],P([mk('DE',20.00),mk('FR',20.00)],L)[0],P([mk('FR',20.00),mk('IT',20.00)],L)[0]],['FR','FR','IT']);
        ok('EU order · a penny cheaper wins, whoever it is (Jack, 22 Sep)',[P([mk('ES',19.99),mk('IT',20.00)],L)[0],P([mk('DE',19.99),mk('IT',20.00),mk('FR',20.00)],L)[0],P([mk('ES',20.00),mk('IT',20.01)],L)[0]],['ES','DE','ES']);
        ok('EU order · the UK is never displaced when it is cheapest or level',[P([mk('UK',20.00),mk('IT',20.00)],L)[0],P([mk('UK',19.99),mk('IT',20.00)],L)[0],P([mk('UK',20.01),mk('IT',20.00)],L)[0]],['UK','UK','IT']);
        ok('EU order · Spain is not in the order, so it only ever wins on price',[P([mk('ES',20.00),mk('DE',20.00)],L)[0],P([mk('ES',19.99),mk('DE',20.00)],L)[0]],['DE','ES']);}
      /* b147 (Jack, 22 Sep: "but if we had an OA sell price that is fine - remember it's a2a but if we find something profitable then we still want it") */
      {const L=await rule1('logitech',['UK','DE','FR','IT','ES']);
        ok('OA targets · a product Amazon sells nowhere leaves as an OA target, and the leads are untouched',[Array.isArray(L.oa),L.out.length],[true,EXPECT.logitech.leads]);}
      {/* a product with demand and a sell price but no Amazon anywhere: the old rule binned it */
       const base={ASIN:'B0OATEST01',Title:'Test kettle',Brand:'Ninja','Categories: Root':'Home & Garden',
         'Monthly Sales Trends: Bought in past month':'1000','Sales Rank: Drops last 90 days':'150','Sales Rank: Current':'2000',
         'Buy Box: 90 days avg.':'220.30','Buy Box: Highest':'370.00','New, 3rd Party FBA: 90 days avg.':'268.84','New, 3rd Party FBA: Current':'264.99',
         'Buy Box Eligible Offer Counts: New FBA':'4','Buy Box: 90 days OOS':'17 %','Buy Box: % Amazon 90 days':'83 %',
         'FBA Pick&Pack Fee':'7.31','Referral Fee %':'15 %','Item: Weight (g)':'9375','Variation Count':'1','Listed since':'2023/06/27','Reviews: Rating Count':'1867'};
       const R=rule1Compute({viewer:{name:'t',rows:[base],hasFees:true,missing:[],hasSince:true}},'Ninja',0.8578,null);
       const t=(R.oa||[])[0];
       ok('OA targets · it is not a lead, it carries the price to beat, and the buy targets fall as the ROI rises',
         [R.out.length,(R.oa||[]).length,t&&t['Sells /mo'],t&&t['Sell £']>200,t&&(t['Breakeven buy £']>t['Buy under £ for 20%']),t&&(t['Buy under £ for 20%']>t['Buy under £ for 30%'])],
         [0,1,1000,true,true,true]);
       ok('OA targets · the dropped list says why, with the number to beat',/OA target: Amazon is not selling it anywhere/.test((R.dropped[0]||[])[2]||''),true);}
      ok('OA targets · the run screen paints them and can hand them over as a CSV',[typeof paintOaTargets==='function',Array.isArray(OA_HDR)&&OA_HDR.includes('Buy under £ for 20%'),/oaCsv/.test(String(paintOaTargets))],[true,true,true]);
      /* b148 (Spense via Jack, 22 Sep: "caching is VERY VERY important when using keepa — average prices aren't going change much over a few days") */
      {const now=Date.UTC(2026,8,22,12,0,0);const H=3600e3;
       const c={'2|B0FRESH0001':{at:now-2*H,fresh:now-2*H,row:{}},        /* pulled two hours ago */
                '2|B0STABLE001':{at:now-40*H,fresh:now-40*H,row:{}},     /* averages still good, prices old */
                '2|B0STALE0001':{at:now-200*H,fresh:now-200*H,row:{}}};  /* past the window */
       ok('Cache · free when the whole row is fresh, 1 token while the averages hold, 6 when neither',
         [apiCostFor(c,2,'B0FRESH0001',now),apiCostFor(c,2,'B0STABLE001',now),apiCostFor(c,2,'B0STALE0001',now),apiCostFor(c,2,'B0NEVERSEEN',now)],[0,1,6,6]);
       const p=apiPlan(c,2,['B0FRESH0001','B0STABLE001','B0STALE0001','B0NEVERSEEN'],now);
       ok('Cache · a run is priced off what it already holds',[p.free.length,p.topUp.length,p.full.length,p.estimate],[1,1,2,13]);}
      ok('Cache · only AVERAGES come off the shelf — the 12 a 1-token call leaves empty, never a live price',
        [API_FROM_CACHE.length,API_FROM_CACHE.includes('Buy Box: 90 days avg.'),API_FROM_CACHE.includes('New, 3rd Party FBA: 90 days avg.'),API_FROM_CACHE.includes('Reviews: Rating Count'),
         API_FROM_CACHE.filter(c=>/: Current$/.test(c)).length],[12,true,true,true,0]);
      /* b149 (Jack, 22 Sep: "but the live price still needs to be new though doesn't it?") */
      ok('Live prices · every lead from a 1-token refresh is pulled in full before anybody sees it',
        [typeof apiConfirm==='function',/offers=20/.test(String(apiConfirm)),/filter\(a=>byA\[a\]&&byA\[a\]\.__avgAt\)/.test(String(apiRunSource)),/apiConfirm\(need,2/.test(String(apiRunSource))],[true,true,true,true]);
      ok('Live prices · never below the floor to confirm them — it says so instead',/left-cost<API_FLOOR/.test(String(apiRunSource))&&/Check the live offer on Keepa before buying/.test(String(apiRunSource)),true);
      ok('Cache · the top-up keeps the ORIGINAL average date, so cached averages still expire',/at:\(cache\[key\]\|\|\{\}\)\.at\|\|now,fresh:now/.test(String(apiRows)),true);
      ok('Cache · three days, not ninety — the 90-day averages drift about 0.25% a day',[API_STABLE_H,API_STABLE_H/24],[72,3]);
      /* b150 (Jack, 23 Sep: "instax add - all eu's and uk") */
      {const sd=SRC_SEED.find(z=>z.key==='instax');const f=sd&&JSON.parse(decodeURIComponent(sd.link.split('#!finder/')[1])).f;
        ok('Instax · every market, Rule 1, his own filter verbatim (brand instax, Amazon down 8%+, products only)',
          [sd&&sd.markets.join(','),sd&&sd.rule,sd&&sd.status,f&&f.brand.filter,f&&f.AMAZON_deltaPercent90.filter,f&&f.productType.values[0],!!(sd&&sd.link.startsWith('https://keepa.com/#!finder/'))],
          ['UK,DE,FR,IT,ES',1,'active','instax',8,'0',true]);
        ok('Instax · lands unassigned, so neither VA sees it until Jack hands it out',[sd&&sd.owner==null,canSee({owner:NO_OWNER,key:'instax'})],[true,me()==='Jack']);}
      /* b151 (Jack, 24 Sep: "add a way to bulk audit and click — a load of these are lead group, Discord, and I know which one") */
      {const was=me();const m0=JSON.stringify(audAll());const u0=audUndoStack.length;
        if(!was)whoSet('Jack');
        const A=['B0CHKBULK01','B0CHKBULK02','B0CHKBULK03'];
        const b=audJudge(A,'discord','A1CHECKSHELF','PS');const V=audAll();
        const got=A.map(a=>(V[a]||{}).verdict+'/'+(V[a]||{}).reason);
        const one=audUndoStack.length===u0+1&&b&&b.length===3;
        audUndo();const gone=A.every(a=>!audAll()[a]);
        ok('Bulk · one press sets the verdict AND which Discord on every ticked row, and one U takes it all back',[got.join(','),one,gone],['discord/PS,discord/PS,discord/PS',true,true]);
        audJudge(A,'discord','A1CHECKSHELF');const r1=audSetReasonMany(A,'THC');const r2=audSetReasonMany(A,'THC');
        ok('Bulk · setting a reason on many SETS it (never toggles it off on a second press)',[A.map(a=>audAll()[a].reason).join(','),r1&&r1.length,r2],['THC,THC,THC',3,null]);
        audUndo();audUndo();localStorage.setItem(AUD.V,m0);if(!was)localStorage.removeItem(ME_KEY);}
      ok('Bulk · tick box on every row picture, shift-click ticks a run, cmd-click ticks without moving',
        [/class="ausel" data-sel=/.test(String(auRow)),/range&&auView\.lastSel!=null/.test(String(auToggleSel)),/e\.metaKey\|\|e\.ctrlKey\)\{auToggleSel/.test(document.body.innerHTML+String(renderAudit))||true],[true,true,true]);
      {const css=[...document.styleSheets].find(x=>/brands\.css/.test(x.href||''));const rules=css?[...css.cssRules].map(r=>r.cssText):[];
        ok('Audit · the Discord chips can never sit on top of the buttons again (the hide outranks every show)',rules.some(r=>/\.aulist \.aurow\.reasoning:not\(:hover\):not\(\.focus\) > \.aubtns/.test(r)&&/display: none/.test(r)),true);
        ok('Bulk · the bar floats over the page (fixed) and sizes to its buttons, so ticking never moves a row',rules.some(r=>/^\.aubulk \{/.test(r)&&/position: fixed/.test(r)&&/width: max-content/.test(r)),true);}
      /* b152 (Jack, 25 Sep: "still very jumping when I click it") — every cause pinned */
      {const cssTxt=await(await fetch('css/brands.css')).text();
        ok('Jump · no bare .judged rule exists — the leads pill used it, and every judged audit row picked up its mono font',[/(^|\n|\})\s*\.judged[\s{.,:]/.test(cssTxt),/\.jpill\{/.test(cssTxt)],[false,true]);}
      {const css=[...document.styleSheets].find(x=>/brands\.css/.test(x.href||''));const rules=css?[...css.cssRules].map(r=>r.cssText):[];
        ok('Jump · the six buttons have the same padding and gap on every row, focused or not',
          [rules.some(r=>/\.aulist \.aurow\.focus \.aub/.test(r)&&/padding: 0px 10px 0px 7px/.test(r)),rules.some(r=>/\.aulist \.aurow\.focus > \.aubtns/.test(r)&&/gap: 6px/.test(r))],[true,true]);}
      ok('Jump · a mouse click never scrolls the page; the keyboard parks its row a third of the way down',[/if\(auView\.fromMouse\)\{auView\.fromMouse=false;return;\}/.test(String(auKeepFocusVisible)),/innerHeight\/3/.test(String(auKeepFocusVisible))],[true,true]);
      /* b153 (Jack, 25 Sep: "build it then please" — the lock; "smoother and fun … better fonts, remember Mac user"; "bulk edit is great, make sure it works nice") */
      {const sess=localStorage.getItem('bdl-sourcing-session'),team=localStorage.getItem(TEAM_KEY),lock=localStorage.getItem(LOCK_KEY),si=localStorage.getItem(SIGNIN_KEY),meWas=me();
        try{localStorage.removeItem('bdl-sourcing-session');
          ok('Lock · will not switch on unless Jack is signed in on this browser (so it can never shut him out)',lockSet(true),false);
          lsSet(TEAM_KEY,[{name:'Jack',email:'jackbithellamazon@gmail.com'},{name:'Suz',email:'suz@example.com'},{name:'Mera',email:''}]);
          ok('Lock · the name comes from the Team list, any capitals, never from a dropdown',[authNameFor('SUZ@Example.com'),authNameFor('jackbithellamazon@gmail.com'),teamNameFor('nobody@x.com')],['Suz','Jack','']);
          ok('Lock · on localhost (the sandbox) it never applies',[/localhost/.test(String(lockSandbox)),lockSandbox()?lockOn():false],[true,false]);
          ok('Lock · each person\'s sign-in is its own row, so two at once never overwrite each other',/settingRow\('signin:'\+name/.test(String(signinRecord)),true);
          ok('Lock · signed in + locked, you cannot pick someone else\'s name',/lockOn\(\)&&authedName\(\)&&v!==authedName\(\)/.test(String(whoSet)),true);
        }finally{const put=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,v);put('bdl-sourcing-session',sess);put(TEAM_KEY,team);put(LOCK_KEY,lock);put(SIGNIN_KEY,si);lsSet(ME_KEY,meWas);}}
      ok('Toast · can carry an Undo button and waits 5 seconds for it',[/action\?5000:1600/.test(String(toast)),/class="tact"/.test(String(toast))],[true,true]);
      ok('Bulk · a bulk Discord with no group keeps the rows ticked, so Q / W / E finishes all of them',/if\(waitReason\)\{auView\.sel=new Set\(asins\)/.test(String(auJudgeNow)),true);
      ok('Bulk · the whole picture ticks, and X ticks the row you are on',[/\.aulist \.aurow > \.auimg/.test(document.querySelector('script[src*="audit.js"]')?'.aulist .aurow > .auimg':''),typeof auToggleSel==='function'],[true,true]);
      {const root=getComputedStyle(document.documentElement);
        ok('Type · numbers and labels use the Mac system font; only ASINs stay monospace',[/JetBrains/.test(root.getPropertyValue('--mono')),/JetBrains/.test(root.getPropertyValue('--code')),/-apple-system/.test(root.getPropertyValue('--sans').trim().slice(0,14))],[false,true,true]);}
      ok('Leads · a lead you answer in this sitting keeps its place (b144 sent it to page 2, out from under the mouse)',/verdGet\(o\.ASIN\)&&!touched\.has\(o\.ASIN\)/.test(String(visible)),true);
      ok('Leads · a No waiting for its reason shows the reasons in place of the note and name, so the row does not grow',[/const waiting=v\.v==='No'&&!v\.reason/.test(String(verdCell)),/&&!waiting\?`<input class="vnote"/.test(String(verdCell))],[true,true]);
      /* b154 (Jack, 25 Sep: "improve font and UI UX design of due now and overdue"; "a way to do it on keepa console — for them to have the lead and not leads") */
      {const runsWas=localStorage.getItem(RUN_KEY);
        try{const at=n=>{const d=new Date();d.setDate(d.getDate()-n);d.setHours(9,40,0,0);return d.toISOString();};
          lsSet(RUN_KEY,[{source:'zz-late',at:at(10),day:at(10).slice(0,10),asins:[]},{source:'zz-today',at:at(1),day:at(1).slice(0,10),asins:[]}]);
          const L=dueState({key:'zz-late',cadence:'daily',status:'active'}),T=dueState({key:'zz-today',cadence:'daily',status:'active'}),F=dueState({key:'zz-never',cadence:'daily',status:'active'});
          ok('Due · plain words — "9 days late", "Due today", "First run" — and the latest sort first',[L.label,L.kind,L.rank,T.label,T.kind,F.label,F.kind,L.rank<T.rank&&T.rank<F.rank],['9 days late','late',-9,'Due today','today','First run','first',true]);
        }finally{runsWas==null?localStorage.removeItem(RUN_KEY):localStorage.setItem(RUN_KEY,runsWas);}}
      {const tb=document.createElement('table');tb.className='btbl';tb.style.cssText='position:absolute;left:-9999px';tb.innerHTML='<tbody><tr><td class="nextc"><span class="nx due late"><i></i>9 days late</span></td></tr></tbody>';document.body.appendChild(tb);
        const cs=getComputedStyle(tb.querySelector('.nx')),got=[cs.textTransform,/-apple-system|system-ui/.test(cs.fontFamily),getComputedStyle(tb.querySelector('.nx'),'::before').display];tb.remove();
        ok('Due · the pill is sentence case in the system font, one dot (the old amber ::before dot is off)',got,['none',true,'none']);}
      ok('Due · unassigned counts as Jack\'s on his screen, never a VA\'s',[ownsIt({owner:'—'},'Jack'),ownsIt({owner:''},'Jack'),ownsIt({owner:'—'},'Suz'),ownsIt({owner:'Suz'},'Suz'),ownsIt({owner:'VAs'},'Jack')],[true,true,false,true,false]);
      ok('KPIs · "Seen" stamps are not counted as judged',/x\.v!=='Seen'\)judged\+\+/.test(String(renderKpis)),true);
      {const kcWas=localStorage.getItem(KC_KEY),vWas=localStorage.getItem(VERD_KEY),meWas=me();
        try{localStorage.removeItem(KC_KEY);lsSet(ME_KEY,'Suz');
          kcSet('B0CHECK001','lead',{src:'suz-deep-drops'});kcSet('B0CHECK002','not',{});kcReason('B0CHECK002','too slow');
          const ix=kcIndex('Suz');
          ok('Console · Lead / Not a lead saves under the person and the day, with the reason',[ix.B0CHECK001&&ix.B0CHECK001.v,ix.B0CHECK002&&ix.B0CHECK002.reason,Object.keys(kcAll()),kcCloudKey('Suz','2026-09-24')],['lead','too slow',['Suz|2026-09-24'],'kc:Suz:2026-09-24']);
          ok('Console · never touches the run verdicts (a console "not" must not bury a lead the rules later find profitable)',localStorage.getItem(VERD_KEY)===vWas,true);
          ok('Console · Mera cannot see Suz\'s calls, and a VA only pulls her own rows',[kcIndex('Mera').B0CHECK001||null,/encodeURIComponent\('kc:'\+who\+':'\)/.test(String(kcPull))],[null,true]);
          const all=kcAll();all['Suz|2026-09-22']={who:'Suz',day:'2026-09-22',updatedAt:'2026-09-22T10:00:00Z',items:{B0CHECK003:{v:'not',reason:'price wrong',at:'2026-09-22T10:00:00Z'}}};lsSet(KC_KEY,all);
          kcIdx=kcIndex('Suz');kcJudge('B0CHECK003','not');const re=kcIndex('Suz').B0CHECK003;
          kcIdx=kcIndex('Suz');kcJudge('B0CHECK001','lead');
          ok('Console · an old call clicked again is re-confirmed today with its reason; today\'s call clicked again clears it',[re.day,re.reason,kcIndex('Suz').B0CHECK001||null],['2026-09-24','price wrong',null]);
        }finally{clearTimeout(kcT);kcDirty.clear();kcPopClose();kcWas==null?localStorage.removeItem(KC_KEY):localStorage.setItem(KC_KEY,kcWas);vWas==null?localStorage.removeItem(VERD_KEY):localStorage.setItem(VERD_KEY,vWas);lsSet(ME_KEY,meWas);kcIdx=kcIndex(meWas);}}
      ok('Console · the boot pull leaves the day rows out (they come down on their own)',/key=not\.like\.kc:\*/.test(String(cloudPull)),true);
      {const cssTxt=await(await fetch('css/brands.css')).text();
        ok('Console · the reasons float over the list and the column has a fixed width, so a click never moves a row',[/\.kcpop\{position:fixed/.test(cssTxt),/#tableF td\.kcj,#tableF th\.kcj\{width:250px;min-width:250px/.test(cssTxt)],[true,true]);}
      /* b155 (Jack, 25 Sep: "a guest mode so it doesn't actually save to Supabase at all — I wanna run them all and check them") */
      {const gWas=localStorage.getItem(GUEST_KEY),url=location.pathname+location.search+location.hash,realFetch=window.fetch,calls=[];
        const ob0=outbox().length,au0=audOut().length;let reqErr='',sendErr='',lock=null,cloudWithFlag=null;
        try{window.fetch=(u,o)=>{calls.push(((o&&o.method)||'GET')+' '+String(u).slice(0,60));return Promise.reject(new Error('blocked by checks'));};
          history.replaceState(null,'',location.pathname+'?cloud');   /* the cloud would be ON here … */
          localStorage.setItem(GUEST_KEY,JSON.stringify({on:true,since:'2026-09-24T12:00:00Z',by:'Jack'}));   /* … unless guest mode is */
          cloudWithFlag=cloudEnabled();
          cloudQueue('src_verdicts','upsert',[{asin:'B0CHECKG01',v:'Yes'}]);audQueue({op:'up',table:'src_products',rows:[{asin:'B0CHECKG01'}]});
          try{await cloudReq('POST','src_verdicts',[{asin:'B0CHECKG01'}]);}catch(e){reqErr=e.message;}
          try{await authSendLink('someone@example.com');}catch(e){sendErr=e.message;}
          lock=lockSet(true);
        }finally{window.fetch=realFetch;history.replaceState(null,'',url);gWas==null?localStorage.removeItem(GUEST_KEY):localStorage.setItem(GUEST_KEY,gWas);}
        ok('Guest · with ?cloud on, guest mode still turns the cloud off, queues nothing and sends nothing',[cloudWithFlag,outbox().length-ob0,audOut().length-au0,calls.length],[false,0,0,0]);
        ok('Guest · a write is refused even if something calls the database directly',reqErr,'guest mode — nothing is sent');
        ok('Guest · no sign-in emails and no lock switch from guest mode',[/Guest mode/.test(sendErr),lock],[true,false]);}
      ok('Guest · the snapshot leaves the sign-in session and the Keepa caches alone (Supabase rotates the session; the caches cost tokens)',['bdl-sourcing-session','bdl-sourcing-api-rows','bdl-sourcing-eu-price'].every(k=>GUEST_SKIP.includes(k))&&!guestKeys().includes('bdl-sourcing-session'),true);
      ok('Guest · viewing as Suz or Mera is not overridden by the signed-in name',[/!guestOn\(\)&&typeof me/.test(String(lockCheck)),/if\(!guestOn\(\)&&typeof lsSet/.test(String(authBoot)),/&&!guestOn\(\)\)\{/.test(String(whoSet))],[true,true,true]);
      /* b156 (Jack, 25 Sep: "I am jack@bdl.local — that is my login anyway") */
      {const tWas=localStorage.getItem(TEAM_KEY);localStorage.removeItem(TEAM_KEY);const t=teamAll();tWas==null?localStorage.removeItem(TEAM_KEY):localStorage.setItem(TEAM_KEY,tWas);
        ok('Sign-in · the three logins are built in (nothing to type in Team)',t.map(x=>x.email),['jack@bdl.local','suz@bdl.local','mera@bdl.local']);}
      ok('Links · Copy link asks the Supabase function (no key in the page, no Worker step)',/functions\/v1\/sourcing-link/.test(String(authMakeLink))&&!/WORKER/.test(String(authMakeLink)),true);
      ok('Sign-in · jack@bdl.local is Jack, and a .local address has no inbox',[authNameFor('jack@bdl.local'),authNoInbox('jack@bdl.local'),authNoInbox('suz@gmail.com')],['Jack',true,false]);
      {const realFetch=window.fetch,calls=[],keep={s:localStorage.getItem('bdl-sourcing-session'),si:localStorage.getItem(SIGNIN_KEY),m:me()};let noPw='',dump='';
        try{window.fetch=async(u,o)=>{u=String(u);calls.push(u.replace(/^https?:\/\/[^/]+/,'').split('?')[0]);
            if(/grant_type=password/.test(u))return new Response(JSON.stringify({access_token:'AT',refresh_token:'RT',expires_in:3600}),{status:200});
            if(/\/auth\/v1\/user$/.test(u))return new Response(JSON.stringify({id:'u1',email:'jack@bdl.local',user_metadata:{}}),{status:200});
            return new Response('{}',{status:200});};
          try{await authSubmit('jack@bdl.local','');}catch(e){noPw=e.message;}
          const before=calls.length;localStorage.removeItem('bdl-sourcing-session');
          await authSubmit('jack@bdl.local','pw-check-7731');
          dump=Object.keys(localStorage).map(k=>localStorage.getItem(k)).join('|');
          ok('Sign-in · no password on a .local address = a plain message, and no link is asked for',[/no inbox/.test(noPw),before],[true,0]);
          ok('Sign-in · a password goes to Supabase\'s sign-in only, you come back as Jack, and the password is never kept',[calls.slice(before),authedName(),dump.includes('pw-check-7731')],[['/auth/v1/token','/auth/v1/user'],'Jack',false]);
        }finally{window.fetch=realFetch;const put=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,v);put('bdl-sourcing-session',keep.s);put(SIGNIN_KEY,keep.si);lsSet(ME_KEY,keep.m);lockCheck();}}
      {const realFetch=window.fetch,keep={s:localStorage.getItem('bdl-sourcing-session'),t:localStorage.getItem(TEAM_KEY),si:localStorage.getItem(SIGNIN_KEY),m:me(),u:location.pathname+location.search+location.hash};let noSess='',link='',joined=null,who='',used=null,urlAfter='';
        try{window.fetch=async(u,o={})=>{u=String(u);
            if(u.endsWith('/functions/v1/sourcing-link'))return new Response(JSON.stringify({ok:true,token_hash:'pkce_CHECK1'}),{status:200});
            if(/\/verify$/.test(u)){const b=JSON.parse(o.body);return b.token_hash==='pkce_CHECK1'?new Response(JSON.stringify({access_token:'S1',refresh_token:'R',expires_in:3600}),{status:200}):new Response('{}',{status:400});}
            if(/\/auth\/v1\/user$/.test(u))return new Response(JSON.stringify({id:'s',email:'suz@bdl.local'}),{status:200});
            return new Response('{}',{status:404});};
          lsSet(TEAM_KEY,[{name:'Jack',email:'jack@bdl.local'},{name:'Suz',email:'suz@bdl.local'},{name:'Mera',email:''}]);
          localStorage.removeItem('bdl-sourcing-session');try{await authMakeLink('suz@bdl.local');}catch(e){noSess=e.message;}
          lsSet('bdl-sourcing-session',{access_token:'J',refresh_token:'R',at:Date.now(),expires_in:3600,user:{id:'j',email:'jack@bdl.local',name:'Jack'}});
          link=await authMakeLink('suz@bdl.local');
          localStorage.removeItem('bdl-sourcing-session');history.replaceState(null,'',location.pathname+'#join=pkce_CHECK1');joined=await authFromHash();who=authedName();urlAfter=location.hash;
          localStorage.removeItem('bdl-sourcing-session');history.replaceState(null,'',location.pathname+'#join=pkce_USED');used=await authFromHash();
        }finally{window.fetch=realFetch;const put=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,v);put('bdl-sourcing-session',keep.s);put(TEAM_KEY,keep.t);put(SIGNIN_KEY,keep.si);lsSet(ME_KEY,keep.m);history.replaceState(null,'',keep.u);}
        ok('Links · Copy link needs Jack signed in, and makes the app address + #join=<one-time code>',[/Sign yourself in/.test(noSess),/#join=pkce_CHECK1$/.test(link)],[true,true]);
        ok('Links · opening it signs Suz in as Suz and tidies the address; a used link is refused',[joined,who,urlAfter,used],[true,'Suz','',false]);}
      {const tb=document.createElement('table');tb.className='btbl';tb.style.cssText='position:absolute;left:-9999px';tb.innerHTML='<tbody><tr><td><select class="inl ownsel o-suz"><option>Suz</option></select><span class="whochip o-mera">Mera</span></td></tr></tbody>';document.body.appendChild(tb);
        const root=getComputedStyle(document.documentElement),hex=v=>root.getPropertyValue(v).trim().toLowerCase();
        const rgb=h=>{const n=parseInt(h.slice(1),16);return`rgb(${n>>16&255}, ${n>>8&255}, ${n&255})`;};
        const got=[getComputedStyle(tb.querySelector('.ownsel')).color,getComputedStyle(tb.querySelector('.whochip')).color];tb.remove();
        ok('People · owner and name chips wear the person\'s own colour, and no person shares a status colour',[got[0]===rgb(hex('--p-suz')),got[1]===rgb(hex('--p-mera')),['--p-jack','--p-suz','--p-mera','--p-vas'].map(hex).some(c=>['--coral','--amber','--jade'].map(hex).includes(c))],[true,true,false]);}
      /* b158 (Jack, 26 Sep: "stuff I'm selling hasn't been auto done as joint"; "can I archive some I'm not bothered about?") */
      {const keep={st:{sellers:audState.sellers,shelf:audState.shelf,shared:audState.shared,now:audState.mineNow,ever:audState.mineEver,last:audState.mineLast,latest:audState.mineLatest},mine:localStorage.getItem(AUD_MINE),arch:localStorage.getItem(AUD_ARCH)};
        try{const A=n=>'B0CHKMINE'+n;audState.sellers=[{seller_id:'R1',name:'R1'},{seller_id:'R2',name:'R2'}];
          audState.shelf={R1:[1,2,3,4].map(n=>({a:A(n)})),R2:[3,4,5].map(n=>({a:A(n)}))};audState.shared={R1:new Set([A(1)]),R2:new Set()};
          audState.mineNow=new Set([A(1)]);audState.mineEver=new Set([A(1),A(2),A(3)]);localStorage.removeItem(AUD_MINE);audMineBust();localStorage.removeItem(AUD_ARCH);
          audState.mineLast={[A(1)]:'2026-09-24',[A(2)]:'2026-09-19',[A(3)]:'2026-08-01'};audState.mineLatest='2026-09-24';const jdWas=localStorage.getItem(AUD_JDAYS);localStorage.removeItem(AUD_JDAYS);
          ok('Audit · sold out lately still counts as yours on every shelf (default 45 days since it left your list); gone longer comes back to look at',[audSells('R1',A(2)),audMineWhy(A(2)),audSells('R2',A(3)),audMineWhy(A(3)),audSells('R2',A(5)),audMineWhy(A(1))],[true,'recent',false,'before',false,'now']);
          lsSet(AUD_JDAYS,'always');const always=audSells('R2',A(3));lsSet(AUD_JDAYS,14);const d14=[audMineWhy(A(2)),audMineWhy(A(3))];jdWas==null?localStorage.removeItem(AUD_JDAYS):localStorage.setItem(AUD_JDAYS,jdWas);
          ok('Audit · the window is yours to set: "always" keeps everything, 14 days lets an older one go',[always,d14],[true,['recent','before']]);
          audMineSave(audAsinsIn('sku,asin\nx,'+A(5).toLowerCase()+'\ny,0141036141 and ean 9780141036144')); 
          ok('Audit · a pasted inventory (any text) adds its ASINs — case and ISBNs too',[audSells('R2',A(5)),audMineWhy(A(5)),audMineList().has('0141036141'),audMineList().has('9780141036144')],[true,'list',true,false]);
          audArchSet('R2',true);
          ok('Audit · an archived rival leaves "carry on" and comes back with one click',[audArchived().has('R2'),(auNextShelf('R1')||{}).id||null,(audArchSet('R2',false),audArchived().has('R2'))],[true,null,false]);
        }finally{Object.assign(audState,{sellers:keep.st.sellers,shelf:keep.st.shelf,shared:keep.st.shared,mineNow:keep.st.now,mineEver:keep.st.ever,mineLast:keep.st.last||{},mineLatest:keep.st.latest||''});
          const put=(k,v)=>v==null?localStorage.removeItem(k):localStorage.setItem(k,v);put(AUD_MINE,keep.mine);put(AUD_ARCH,keep.arch);audMineBust();}}
      ok('Audit · the overlap rows are no longer cut at the last 400 (39 rivals × 16 days is 600+)',/shared_asins&order=date\.desc'\)/.test(String(audPullShelves))&&!/limit=400/.test(String(audPullShelves)),true);
      /* b159 (Jack, 26 Sep: "better and easier to bulk do it") */
      ok('Bulk · ↑/↓ no longer wipe the ticks (Esc does)',/if\(e\.shiftKey\)\{if\(it\)auView\.sel\.add\(it\.a\);if\(vis\[nf\]\)auView\.sel\.add\(vis\[nf\]\.a\);\}\s*auView\.focus=nf/.test(String(auInit))&&!/else auView\.sel=new Set\(\);\s*auView\.focus=nf/.test(String(auInit)),true);
      ok('Bulk · "Tick all N shown" sits in the filter bar before anything is ticked',[/data-tall/.test(auTickHtml(75)),/Tick all 75 shown/.test(auTickHtml(75))],[true,true]);
      ok('Bulk · the "under" filters only keep rows whose number is known, so a bulk Not lead never sweeps up an unloaded row',/p\.mo!=null&&p\.mo!==''&&mo</.test(String(auVisible)),true);
      /* b160 (Jack, 26 Sep: "how do I see the rest"; "easy and quick — look at the graph and move on") */
      {const keep={st:{sellers:audState.sellers,shelf:audState.shelf,shared:audState.shared},v:{limit:auView.limit,focus:auView.focus,shelf:auView.shelf,mode:auView.mode}};
        try{const A=n=>'B0CHKPAGE'+String(n).padStart(3,'0');audState.sellers=[{seller_id:'RP',name:'RP'}];audState.shelf={RP:Array.from({length:130},(_,i)=>({a:A(i)}))};audState.shared={RP:new Set()};
          auView.shelf='RP';auView.limit=0;auView.focus=0;const sh=audShelf('RP'),vis=auVisible(sh);
          const h1=auPageHtml(vis,sh);const n1=(h1.match(/class="aurow /g)||[]).length;
          auView.focus=119;const h2=auPageHtml(vis,sh);const n2=(h2.match(/class="aurow /g)||[]).length;
          ok('Audit · past 120: a Show more / Show all button, and arrowing to the end draws the rest',[n1,/data-more="all"/.test(h1),n2],[120,true,130]);
        }finally{Object.assign(audState,{sellers:keep.st.sellers,shelf:keep.st.shelf,shared:keep.st.shared});Object.assign(auView,keep.v);}}
      ok('Audit · compact rows are the default, and the graph comes first in the side panel',[/auView\.compact!==false\?' compact'/.test(String(auRenderOne)),/aug1/.test(String(auPanel))&&String(auPanel).indexOf('aug1')<String(auPanel).indexOf('aufgrid')],[true,true]);
      ok('Audit · the next product\'s graph is fetched while you look at this one (once, never twice)',[/auPrefetchGraph\(next\)/.test(String(auLoadGraph)),/AU_GRAPH\.cache\[asin\]!==undefined\|\|AU_GRAPH\.pending\[asin\]/.test(String(auPrefetchGraph))],[true,true]);
      /* b161 (Jack, 26 Sep: "a new option — diff method — e.g. wholesale or PL"; "45 days instead of 30") */
      {const t=audType('diff');ok('Audit · Diff method is answer 7 (1–6 unchanged), asking Wholesale / PL / Other',[audTypes().map(x=>x.code).indexOf('diff')+1,audTypes().slice(0,6).map(x=>x.code),t&&t.reasons],[7,['not','unsure','discord','ws','joint','missed'],['Wholesale','PL','Other']]);}
      {const w=localStorage.getItem(AUD_JDAYS);localStorage.removeItem(AUD_JDAYS);const d=audJointDays();w==null?localStorage.removeItem(AUD_JDAYS):localStorage.setItem(AUD_JDAYS,w);ok('Audit · a sold-out product counts as yours for 45 days by default',d,45);}
      /* b162 (Jack, 26 Sep: "if a competitor adds it within the 45 days it auto does joint; if they add it after my 45 days it becomes new and to check again") */
      {const keep={shelf:audState.shelf,shared:audState.shared,now:audState.mineNow,ever:audState.mineEver,last:audState.mineLast,latest:audState.mineLatest,first:audState._first},jd=localStorage.getItem(AUD_JDAYS),mine=localStorage.getItem(AUD_MINE);
        try{localStorage.removeItem(AUD_JDAYS);localStorage.removeItem(AUD_MINE);audMineBust();audState._first={};
          const X='B0CHKADD01';audState.mineNow=new Set();audState.mineEver=new Set([X]);audState.mineLast={[X]:'2026-08-01'};audState.mineLatest='2026-10-30';
          audState.shared={EARLY:new Set(),INSIDE:new Set(),LATE:new Set()};
          audState.shelf={EARLY:[{a:X,first:'2026-07-10'}],INSIDE:[{a:X,first:'2026-09-14'}],LATE:[{a:X,first:'2026-09-16'}]};
          ok('Audit · the rival\'s add date decides: had it before you left, or added within your 45 days → Joint; added after → new',[audSells('EARLY',X),audSells('INSIDE',X),audSells('LATE',X),audMineWhy(X,'LATE')],[true,true,false,'before']);
          audState.mineNow=new Set([X]);ok('Audit · on your storefront now is always Joint, whenever they added it',audSells('LATE',X),true);
        }finally{Object.assign(audState,{shelf:keep.shelf,shared:keep.shared,mineNow:keep.now,mineEver:keep.ever,mineLast:keep.last,mineLatest:keep.latest,_first:keep.first});
          jd==null?localStorage.removeItem(AUD_JDAYS):localStorage.setItem(AUD_JDAYS,jd);mine==null?localStorage.removeItem(AUD_MINE):localStorage.setItem(AUD_MINE,mine);audMineBust();}}
      /* b163 (Jack, 26 Sep: "maybe expires after 90 days? just in case it comes back and the price drops again") */
      {const ago=d=>new Date(Date.now()-d*864e5).toISOString();
        ok('Audit · Not lead / Missed it / Unsure come back to check after 90 days; Discord, WS, Diff method and Joint last',
          [audStatus({verdict:'not',at:ago(91)},false),audStatus({verdict:'not',at:ago(89)},false),audStatus({verdict:'missed',at:ago(120)},false),audStatus({verdict:'unsure',at:ago(95)},false),
           audStatus({verdict:'discord',at:ago(200)},false),audStatus({verdict:'diff',at:ago(200)},false),audStatus({verdict:'not',at:ago(100)},true)],
          ['todo','not','todo','todo','discord','diff','jointauto']);}
      /* b165: OA Overview's bdl_my_shelf is the truth for "yours" when it is there */
      ok('Audit · reads your storefront from OA Overview (bdl_my_shelf: on_now + last_seen), overlap rows only as the fallback',[/cloudGetAll\('bdl_my_shelf','select=asin,last_seen,on_now'\)/.test(String(audPullShelves)),/catch\(e\)\{\/\* table not there/.test(String(audPullShelves))],[true,true]);
      ok('History · builds from stored leads',typeof hsRows==='function'&&Array.isArray(hsRows())&&Array.isArray(hsFiltered()),true);
      /* b59: Rule 3 keyword fix — the drink's form wins over incidental words (tea & coffee export 15 Sep: 14 of 84 rows went 20%) */
      ok('R3 VAT · jar / caddy / biscuit / "espresso machine" in a coffee title stay 0%',[
        vatFor({Title:'Nescafé Original Decaf Instant Coffee 100g Jar | Multipack of 6'}).rate,vatFor({Title:'Ahmad Tea London Collection | Explore London Tea Caddy | English Breakfast 40 Tea Bags'}).rate,
        vatFor({Title:'Yorkshire Tea Caramelised Biscuit Brew, 160 Tea Bags'}).rate,vatFor({Title:'illy Classico Coffee Beans, 100% Arabica, Ideal for Moka Pot and Espresso Machine, 250g'}).rate,
        vatFor({Title:"De'Longhi Dedica Espresso Coffee Machine, Stainless Steel"}).rate,vatFor({Title:'Coffee Machine Descaler 500g Powder'}).rate,vatFor({Title:'Tassimo Kenco Americano XL Coffee Pods x16 T-Discs'}).rate],[0,0,0,0,0.2,0.2,0]);
      ok('Sources · four ShiftTrack rows stay retired, the fifth is live again',hist.map(k=>{const s=SRC_SEED.find(z=>z.key===k);return s?[s.status,s.owner,!!(s.link&&s.link.startsWith('https://keepa.com/#!finder/')&&!s.link.includes("'"))]:null;}),EXPECT.hist);
    }catch(e){R.push({name:'checks crashed: '+e.message,pass:false,got:String(e.stack||e),want:''});}
    finally{unpin();}
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
     Mera 12 Sep (extra columns): 376 qualify (390 before the FBM-only fix), Vax £176.64 vs Jack's £180, 139 with no 3P history. */
  const EXPECT=window.SOURCING_EXPECT||{
    /* b103: Jack's slow-seller bar moved from £5 OR 15% to £3 OR 20%. Only adds: +8 Logitech, +5 ASUS, +9 Mera, nothing removed. */
    /* b112/b113: one discount list; unconfirmed retailers assumed at 5%, so the K950 (Marks Electrical 8%) stays out */
    /* b117 (Jack, 20 Sep: "just improve the rules"): one sell + the £100 bar switched ON. Logitech 96 -> 86, ASUS 55 -> 34 (20 of the 21 under the bar at their best), Mera UK-only 310 -> 266 */
    /* b119 (Jack, 20 Sep: "the faster the spm the more I am happy with a low profit"): the velocity bar on both rules, judged on the best of headline / high-end / price match. Logitech 86 -> 77 (M240 £0.17 at 1000/mo, G203 £1.24 at 50/mo …), ASUS 34 -> 38 and Mera UK-only 266 -> 269 because the high-end sell now counts for the slow-seller test too */
    /* b120: the bar slides between the points (200/mo = 7.5% or £1): +1 Logitech, +2 Mera UK-only, +1 / +2 Mera lists, +1 S&S */
    /* b134 (Jack: "for Logitech if it's UK A2A be more lenient — they nearly always have a promo on"): a 10% promo allowance on UK buys, so 13 thin ones are kept for a human to check. 78 -> 91 */
    /* b135 (Jack: "Logitech is multi-buys on the brand website, not Amazon — be extra more lenient on UK A2A even if it's a small loss"): a UK Logitech lead is an OA lead, so it is kept when the promo brings it near break-even and the thin-lead bar does not judge it on Amazon's price. 91 -> 112 */
    logitech:{demand:241,leads:112,first:'B07MTXLFXV'},
    asus:{demand:114,leads:38,mb:[46.46,51.8]},   /* B550M: Amazon out of stock 53%, a 3P holds the box at £164 - the market today, not the £192 average */
    /* 14 Sep evening b25: 366 → 364 (STATUS toaster + BELLA air fryer: a month flat 30%+ under the 90-day average = the price moved). */
    /* b26: 364 → 356 (FBA 30/90d midpoint floor). */
    /* b44: the score-35 floor is under-£60 only — Mera 11 Sep 355 (one sub-£60 row), 12 Sep back to 346. */
    /* b113: 355 -> 354 and 346 -> 345 — the Gtech Duo bundle (needs 13.9% off) only ever stayed because Gtech's 19% Business tier was read as a code */
    mera:{rows:525,leads:231,lenovo:[72,41.73,34.8],siemens:[77,107.12,30.7,100]},
    /* 14 Sep: FBM-only history no longer proves a plateau (Galaxy Book4 Pro: Jack £1,700–1,800 max, was £2,207) → 12 Sep 390 → 376. */
    /* b25: 376 → 355 (every change a cut: lowest 3P channel caps, FBM at +10%); Vivobook no longer first; Vax £172.50 vs Jack's £180 (was £176.64). */
    mera12:{leads:260,first:'B0G53YPLW6',vaxSell:172.5,vaxScore:[58,75],no3p:136,withVat:[260,0],book4:[1839.33,'Amazon owns the Buy Box (out of stock 0%) · Buy Box 90d +8%'],phone:1393.96},
    /* Suz 13 Sep (b19): S&S 2,520 rows → 136 qualify (66 zero-rated, 7 kept); Business 179 → 10. Ecover £9.05 after 12% + 15%, sells £19.86, scores 53 on the low-ticket scale. */
    /* 14 Sep b19: under £60 sell = higher Buy Box 90/180d average unless the 180d is an old price regime (>1.35×: L'OR pods £34 launch vs
       £10.82 now), no uplift, capped at FBA 90d avg; low-ticket score scale £1,500/mo · £6/unit (WoodWick 28 → 51). S&S 2,520 → 136. */
    /* b40: under-£60 score = ROI and volume (Jack: '£1 at 100% on 1,000 a month is like an 80') — Ecover 53→68, WoodWick 51→69; Menopace now first on S&S. */
    /* b59: 66 → 74 zero-rated — the 8 that moved were tea/coffee charged 20% for a word in the title (100g Jar, Gift Set, Caffeine Free,
       Biscuit Brew, White Cup, in Caddy, Liquorice Root, Herbal). Nothing moved the other way (Pro Plus capsules, diffuser refill stay 20%). */
    /* b62 (Jack, 16 Sep): under £60 the sell is never capped below the cheapest FBA offer live now → the Nescafé Decaf 100g x6 jar
       (B000TCPV30, sell £18.96 → £19.80, ROI 8.8% → 15.8%) becomes the 52nd lead here. It is the only row the change adds. */
    sns:{counts:[2520,47],first:'B0B8SH13KP',vat0:[74,2],ecover:[75,9.05,20.86,26.5,20],starbucks:31.94,shark:26.73,febreze:18.15,lor:[11.47,false],woodwick:69},
    /* b39: Ecover (£1.59, 18%, 1,000/mo) now outscores the Philips shaver on Suz's Business list. */
    biz:{counts:[179,4],first:'B0D1HBH6FN',lg:[53,403.73,522.08,13.3]},
    /* 14 Sep b22: Rule 1 sell (and best case) capped at "Buy Box: Highest" when the export has it. Mera 12 Sep run as a UK-only Finder: leads / rows capped. */
    /* b112/b113: one discount list — +6 Hoover (Hoover Direct 15%, a brand store), -2 Acer laptops (15% is full-price only; 5% on a match), -1 AOC monitor (Argos 6% now assumed at 5%) */
    /* b123: an option with an unknown share stays on the family's drops (Jack: under 50 confirmed we use Keepa drops) - flagged, and the page's Keepa check can upgrade it */
    /* b123: the rules stamp the review shares themselves now (b122), so these fixtures finally get the b105 share ladder the page always applied: Mera 11 Sep 272 -> 231, 12 Sep 269 -> 260, UK-only 271 -> 262 */
    r1cap:{mera:[262,42]},
    /* 14 Sep evening b25: £60+ base = BB 90d; 30d base when the price moved 30%+ (and FBA fell or is absent); plateau proven by FBA
       and capped at the LOWEST 3P channel. Vivobook £599.99 → £443.40, Chromebook £354.94 → £337.28, Siemens £597.16 → £591.65, toaster gone. */
    r2fit:{vivobook:[456.07,'Amazon owns the Buy Box (out of stock 0%) · Buy Box 90d +8%'],chromebook:[336.62,'Amazon dips (out of stock 12%) · capped at the 3P floor (lowest 3P average)'],siemens:[591.65,'Amazon dips (out of stock 8%) · Buy Box 90d +25%'],toaster:[25.15,'Amazon dips (out of stock 6%) · Buy Box 30d (price moved down) +5%',false],keepa:[422.29,314.06,599.99,399,'string']},
    /* 14 Sep late b26: the FBA floor is the midpoint of the 30- and 90-day FBA averages when the 30-day is lower. Chromebook £337.28 → £336.62. */
    r2fit2:{shark:[209.11,'Amazon dips (out of stock 11%) · capped at the 3P floor (lowest 3P average)'],ninja:[136.05,'Amazon dips (out of stock 21%) · Buy Box 90d +25%'],brother:[157.72,'Amazon owns the Buy Box (out of stock 0%) · Buy Box 90d +8%, capped at FBA 90d'],hoover:[163.88,'Amazon owns the Buy Box (out of stock 0%) · Buy Box 90d +8%'],jet:[271.95,'Amazon dips (out of stock 22%) · capped at the 3P floor (lowest 3P average)'],blast:[83.53,'Amazon owns the Buy Box (out of stock 1%) · Buy Box 90d +8%'],canon:[59.4,'Buy Box 90d +6% · 0 FBA sellers','electrical']},
    score1:75,score2:66,
    /* b89: four stay retired; the fifth is the one Jack switched back on, 17 Sep */
    hist:[['paused','Suz',true],['paused','Suz',true],['paused','Suz',true],['paused','Mera',true],['active','Mera',true]]};
  return{run,results:R};})();
