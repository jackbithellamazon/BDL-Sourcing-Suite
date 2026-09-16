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
      /* Rule 1 b22 — sell never above "Buy Box: Highest" (Jack, 14 Sep: Lenovo Idea Tab "never ever been higher than 509.99").
         Synthetic UK-only Finder; the Logitech/ASUS exports never carried the column, so their locks stand. */
      const hdrC=['ASIN','Title','Brand','Categories: Root','Monthly Sales Trends: Bought in past month','Sales Rank: Drops last 30 days','Amazon: Current','Buy Box: Current','Buy Box: 90 days avg.','Buy Box: Highest','New, 3rd Party FBA: Current','New, 3rd Party FBA: 30 days avg.','New, 3rd Party FBA: 90 days avg.','Referral Fee %','FBA Pick&Pack Fee','Package: Weight (g)','Buy Box: Buy Box Seller'];
      const rowC=(a,t,ukp,bb90,hi,f90)=>[a,t,'Lenovo','Computers & Accessories',100,30,ukp,ukp,bb90,hi,'','',f90,7,4.82,900,'Amazon'];
      const tabC=[hdrC,rowC('B0GT2CJRP6','Lenovo Idea Tab Pro Gen 2',449.99,493.56,509.99,''),rowC('B0FXXRHY49','Lenovo L27-41 monitor',79.01,91.31,109,119.95),rowC('B0NOCAP000','No cap needed',50,80,120,'')];
      const SC=describeExport(parseCSV(tabC.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n')));
      const C=rule1Compute({UK:SC,viewer:SC,DE:null,FR:null,IT:null,ES:null},'Lenovo',0.86,null);
      const tabl=C.out.find(o=>o.ASIN==='B0GT2CJRP6'),mon=C.out.find(o=>o.ASIN==='B0FXXRHY49'),noc=C.out.find(o=>o.ASIN==='B0NOCAP000');
      ok('R1 cap · Idea Tab sells at the Buy Box high',tabl?[tabl['Sell £ used'],tabl['Sell used'],tabl['Sell high £']]:null,[509.99,'Buy Box 90d +8%, capped at the Buy Box high',509.99]);
      ok('R1 cap · monitor: sell £98.61 stands, best case capped at £109',mon?[mon['Sell £ used'],mon['Sell high £'],mon['Sell range']]:null,[98.61,109,'£91.31-£109.00']);
      ok('R1 cap · untouched when under the high',noc?[noc['Sell £ used'],noc['Sell used']]:null,[86.4,'Buy Box 90d +8%']);
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
      /* b63 (Jack sent them 16 Sep): the six brands that had no Keepa link now carry his, and are Active */
      ok('Sources · the six new brand links are seeded Active',['hoover','tassimo','gopro','corsair-elgato','skullcandy','steelseries'].map(k=>{const s=SRC_SEED.find(z=>z.key===k);return s?[s.status,!!(s.link&&s.link.startsWith('https://keepa.com/#!finder/'))]:null;}),[['active',true],['active',true],['active',true],['active',true],['active',true],['active',true]]);
      /* b63: Microsoft, Staub and Xiaomi are banned outright (they were only banned inside Mera's Keepa filter before) */
      ok('Blacklist · Jack-approved brand bans seeded',BB_SEED.map(([k])=>k),['microsoft','staub','xiaomi']);
      /* b58: the Lead history view builds from whatever lead states this browser holds, without throwing */
      ok('History · builds from stored leads',typeof hsRows==='function'&&Array.isArray(hsRows())&&Array.isArray(hsFiltered()),true);
      /* b59: Rule 3 keyword fix — the drink's form wins over incidental words (tea & coffee export 15 Sep: 14 of 84 rows went 20%) */
      ok('R3 VAT · jar / caddy / biscuit / "espresso machine" in a coffee title stay 0%',[
        vatFor({Title:'Nescafé Original Decaf Instant Coffee 100g Jar | Multipack of 6'}).rate,vatFor({Title:'Ahmad Tea London Collection | Explore London Tea Caddy | English Breakfast 40 Tea Bags'}).rate,
        vatFor({Title:'Yorkshire Tea Caramelised Biscuit Brew, 160 Tea Bags'}).rate,vatFor({Title:'illy Classico Coffee Beans, 100% Arabica, Ideal for Moka Pot and Espresso Machine, 250g'}).rate,
        vatFor({Title:"De'Longhi Dedica Espresso Coffee Machine, Stainless Steel"}).rate,vatFor({Title:'Coffee Machine Descaler 500g Powder'}).rate,vatFor({Title:'Tassimo Kenco Americano XL Coffee Pods x16 T-Discs'}).rate],[0,0,0,0,0.2,0.2,0]);
      ok('Sources · ShiftTrack history rows seeded paused',hist.map(k=>{const s=SRC_SEED.find(z=>z.key===k);return s?[s.status,s.owner,!!(s.link&&s.link.startsWith('https://keepa.com/#!finder/')&&!s.link.includes("'"))]:null;}),EXPECT.hist);
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
     Mera 12 Sep (extra columns): 376 qualify (390 before the FBM-only fix), Vax £176.64 vs Jack's £180, 139 with no 3P history. */
  const EXPECT=window.SOURCING_EXPECT||{
    logitech:{demand:241,leads:88,first:'B07MTXLFXV'},
    asus:{demand:114,leads:50,mb:[80.04,89.3]},
    /* 14 Sep evening b25: 366 → 364 (STATUS toaster + BELLA air fryer: a month flat 30%+ under the 90-day average = the price moved). */
    /* b26: 364 → 356 (FBA 30/90d midpoint floor). */
    /* b44: the score-35 floor is under-£60 only — Mera 11 Sep 355 (one sub-£60 row), 12 Sep back to 346. */
    mera:{rows:525,leads:355,lenovo:[69,37.67,31.4],siemens:[77,107.12,30.7,100]},
    /* 14 Sep: FBM-only history no longer proves a plateau (Galaxy Book4 Pro: Jack £1,700–1,800 max, was £2,207) → 12 Sep 390 → 376. */
    /* b25: 376 → 355 (every change a cut: lowest 3P channel caps, FBM at +10%); Vivobook no longer first; Vax £172.50 vs Jack's £180 (was £176.64). */
    mera12:{leads:346,first:'B0G53YPLW6',vaxSell:172.5,vaxScore:[58,75],no3p:139,withVat:[346,0],book4:[1788.23,'Buy Box 90d +5%'],phone:1393.96},
    /* Suz 13 Sep (b19): S&S 2,520 rows → 136 qualify (66 zero-rated, 7 kept); Business 179 → 10. Ecover £9.05 after 12% + 15%, sells £19.86, scores 53 on the low-ticket scale. */
    /* 14 Sep b19: under £60 sell = higher Buy Box 90/180d average unless the 180d is an old price regime (>1.35×: L'OR pods £34 launch vs
       £10.82 now), no uplift, capped at FBA 90d avg; low-ticket score scale £1,500/mo · £6/unit (WoodWick 28 → 51). S&S 2,520 → 136. */
    /* b40: under-£60 score = ROI and volume (Jack: '£1 at 100% on 1,000 a month is like an 80') — Ecover 53→68, WoodWick 51→69; Menopace now first on S&S. */
    /* b59: 66 → 74 zero-rated — the 8 that moved were tea/coffee charged 20% for a word in the title (100g Jar, Gift Set, Caffeine Free,
       Biscuit Brew, White Cup, in Caddy, Liquorice Root, Herbal). Nothing moved the other way (Pro Plus capsules, diffuser refill stay 20%). */
    /* b62 (Jack, 16 Sep): under £60 the sell is never capped below the cheapest FBA offer live now → the Nescafé Decaf 100g x6 jar
       (B000TCPV30, sell £18.96 → £19.80, ROI 8.8% → 15.8%) becomes the 52nd lead here. It is the only row the change adds. */
    sns:{counts:[2520,52],first:'B000JPQR30',vat0:[74,2],ecover:[68,9.05,19.86,18.7,20],starbucks:32.48,shark:25.22,febreze:18.29,lor:[10.82,false],woodwick:69},
    /* b39: Ecover (£1.59, 18%, 1,000/mo) now outscores the Philips shaver on Suz's Business list. */
    biz:{counts:[179,8],first:'B0D1HBH6FN',lg:[44,403.73,496.75,8.5]},
    /* 14 Sep b22: Rule 1 sell (and best case) capped at "Buy Box: Highest" when the export has it. Mera 12 Sep run as a UK-only Finder: leads / rows capped. */
    r1cap:{mera:[298,59]},
    /* 14 Sep evening b25: £60+ base = BB 90d; 30d base when the price moved 30%+ (and FBA fell or is absent); plateau proven by FBA
       and capped at the LOWEST 3P channel. Vivobook £599.99 → £443.40, Chromebook £354.94 → £337.28, Siemens £597.16 → £591.65, toaster gone. */
    r2fit:{vivobook:[438.9,'capped at the 3P floor (lowest 3P average)'],chromebook:[336.62,'capped at the 3P floor (lowest 3P average)'],siemens:[591.65,'Buy Box 90d +25%'],toaster:[25.15,'Buy Box 30d (price moved down) +5%',false],keepa:[422.29,314.06,599.99,399,'string']},
    /* 14 Sep late b26: the FBA floor is the midpoint of the 30- and 90-day FBA averages when the 30-day is lower. Chromebook £337.28 → £336.62. */
    r2fit2:{shark:[209.11,'capped at the 3P floor (lowest 3P average)'],ninja:[136.05,'Buy Box 90d +25%'],brother:[157.72,'capped at the 3P floor (lowest 3P average)'],hoover:[169.46,'capped at the 3P floor (lowest 3P average)'],jet:[271.95,'capped at the 3P floor (lowest 3P average)'],blast:[78.86,'capped at the 3P floor (lowest 3P average)'],canon:[60.91,'capped at the 3P floor (lowest 3P average)','electrical']},
    score1:75,score2:66,
    hist:[['paused','Suz',true],['paused','Suz',true],['paused','Suz',true],['paused','Mera',true],['paused','Mera',true]]};
  return{run,results:R};})();
