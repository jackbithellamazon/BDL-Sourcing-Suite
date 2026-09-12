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
      /* Rule 2 — Mera, 11 Sep 2026 */
      const M=rule2Compute((await csv('mera-2026-09-11.csv')).rows);
      ok('R2 Mera 11 Sep · rows',M.st.rows,EXPECT.mera.rows);
      ok('R2 Mera 11 Sep · qualifying',M.out.length,EXPECT.mera.leads);
      const lt=M.all.find(o=>o.ASIN==='B0H4ZBZ757');
      ok('R2 Mera · Lenovo tab B0H4ZBZ757',lt?[lt.Score,lt['Profit £'],lt['ROI %']]:null,EXPECT.mera.lenovo);
      const si=M.all.find(o=>o.ASIN==='B0CVXXDFLQ');
      ok('R2 Mera · Siemens B0CVXXDFLQ',si?[si.Score,si['Profit £'],si['ROI %'],si['Sells /mo']]:null,EXPECT.mera.siemens);
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
     Mera 11 Sep: 525 rows → 337 qualify. Siemens B0CVXXDFLQ scores 84 here because a lone £698 FBA offer
     sets the FBA 90d average — a known Rule 2 hole, recorded not hidden. */
  const EXPECT=window.SOURCING_EXPECT||{
    logitech:{demand:241,leads:88,first:'B07MTXLFXV'},
    asus:{demand:114,leads:50,mb:[80.04,89.3]},
    mera:{rows:525,leads:337,lenovo:[65,30.91,25.8],siemens:[84,176.21,50.5,100]},
    score1:75,score2:66};
  return{run,results:R};})();
