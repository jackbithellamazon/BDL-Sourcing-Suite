/* BDL Sourcing — the BRANDS page. Pick a source, drop the Keepa exports, get the leads.
   Rule maths lives in rule1.js / rule2.js. This file only moves data between the page and the rules. */
const SLOTS=['viewer','UK','DE','FR','IT','ES'];
const FX_KEY='bdl-sourcing-fx';
let cur=null,result=null,fx={rate:BR.FX_FALLBACK,src:'fallback'},lastSig='';
const files={viewer:null,UK:null,DE:null,FR:null,IT:null,ES:null,one:null};
const view={status:'ALL',market:'ALL',minRoi:'',minScore:'',q:'',hideNo:false};

/* ============ sources list ============ */
function renderSources(){const list=$('#srcList');const rows=srcSorted();
  list.innerHTML=rows.map(s=>{const due=dueState(s),last=runLast(s.key);
    return`<button class="src${cur&&cur.key===s.key?' active':''}${s.disabled?' off':''}" data-key="${s.key}" type="button"${s.disabled?' disabled':''}>
      <span class="sname">${escapeHtml(s.name)}<span class="stype">${s.type==='filter'?'filter':'brand'}</span></span>
      <span class="smk">${s.markets.map(m=>`<i class="mk ${m==='UK'?'uk':''}">${m}</i>`).join('')}</span>
      <span class="srule">Rule ${s.rule}</span>
      <span class="scad">${escapeHtml(s.cadence)}</span>
      <span class="sdue ${due.cls}">${escapeHtml(due.label)}</span>
      <span class="slast">${last?last.leads+' leads':''}</span>
      <span class="snote" title="${escapeHtml(s.note||'')}">${escapeHtml(s.note||'')}</span></button>`;}).join('');
  list.querySelectorAll('.src').forEach(b=>b.addEventListener('click',()=>selectSource(b.dataset.key)));}
function selectSource(key){const s=srcGet(key);if(!s||s.disabled)return;
  if(cur&&cur.key!==key)clearRun(true);cur=s;renderSources();
  $('#runCard').hidden=false;$('#runName').textContent=s.name;
  $('#runMeta').textContent=`Rule ${s.rule} · buy from ${s.markets.join(' · ')} · ${s.cadence}`+(s.note?' · '+s.note:'');
  const r1=s.rule===1;$('#stepFinders').hidden=!r1;$('#stepViewer').hidden=!r1;$('#stepOne').hidden=r1;$('#fxField').hidden=!r1;
  $('#dropFindersSmall').textContent=r1?`Product Finder exports for ${s.markets.join(' · ')} — any order, all at once`:'';
  paintSlots();run();$('#runCard').scrollIntoView({behavior:'smooth',block:'start'});}
function addSourceUI(show){$('#addSrc').hidden=!show;if(show)$('#addName').focus();}
function addSource(){const name=$('#addName').value.trim();if(!name){toast('Type a brand name',true);return;}
  const markets=[...document.querySelectorAll('#addSrc input[type=checkbox]:checked')].map(c=>c.value);
  if(!markets.length){toast('Tick at least one marketplace',true);return;}
  const key=srcKeyFor(name);if(srcGet(key)){toast(name+' is already in the list',true);return;}
  srcSave({key,name,type:'brand',rule:1,markets,cadence:$('#addCad').value,note:$('#addNote').value.trim()});
  $('#addName').value='';$('#addNote').value='';addSourceUI(false);renderSources();selectSource(key);toast(name+' added');}
function removeSource(){if(!cur)return;if(!confirm('Remove '+cur.name+' from the list? Its run history stays.'))return;
  srcRemove(cur.key);cur=null;$('#runCard').hidden=true;renderSources();}

/* ============ files in ============ */
function sig(){return SLOTS.map(k=>files[k]?files[k].name+':'+files[k].rows.length:'').join('|')+'|'+(files.one?files.one.name+':'+files.one.rows.length:'');}
async function handleFiles(list){const arr=[...list];if(!arr.length||!cur)return;const notes=[];
  for(const file of arr){let d;try{d=describeExport(parseCSV(await readFileText(file)));}catch(e){d=null;}
    if(!d){notes.push(file.name+': no data rows');continue;}
    const f={name:file.name,rows:d.rows,hasFees:d.hasFees,asins:d.asins,domain:d.domain,hasSince:d.hasSince};
    if(!d.full&&!d.hasFees){notes.push(file.name+': not a full-column export — needs Title and the demand columns at minimum');continue;}
    if(cur.rule===2){if(d.domain&&d.domain!=='UK')notes.push(file.name+': this is a '+d.domain+' export — Rule 2 is UK only');files.one=f;continue;}
    if(d.domain&&d.domain!=='UK'){files[d.domain]=f;continue;}
    /* UK: Keepa names the file — ProductViewer is the sell side, ProductFinder is the UK buy list.
       Unnamed files fall back to: the biggest UK file with the fee columns is the sell side. */
    const nm=file.name.toLowerCase(),v=files.viewer;
    if(nm.includes('productviewer'))files.viewer=f;
    else if(nm.includes('productfinder'))files.UK=f;
    else if(!v)files.viewer=f;
    else if(f.hasFees&&(!v.hasFees||f.rows.length>=v.rows.length)){files.UK=v;files.viewer=f;}
    else files.UK=f;}
  paintSlots();warn(notes);run();}
function warn(lines){const w=$('#warnRun');if(!lines||!lines.length){w.classList.remove('show');w.innerHTML='';return;}
  w.innerHTML=lines.map(l=>'<div>⚠ '+escapeHtml(l)+'</div>').join('');w.classList.add('show');}
function paintSlots(){if(!cur)return;
  SLOTS.forEach(k=>{const el=$('#slot-'+k),f=files[k];if(!el)return;el.classList.toggle('filled',!!f);
    el.querySelector('.sv').textContent=f?f.rows.length.toLocaleString()+' rows':(k==='viewer'?'required':cur.markets.includes(k)?'expected':'optional');
    el.title=f?f.name:'';el.classList.toggle('dim',k!=='viewer'&&!cur.markets.includes(k));});
  const one=$('#slot-one');if(one){one.classList.toggle('filled',!!files.one);one.querySelector('.sv').textContent=files.one?files.one.rows.length.toLocaleString()+' rows':'required';}
  /* the ASIN hand-off: every ASIN the Finders found, minus the ones the Viewer already covers */
  const merged=new Set();['UK','DE','FR','IT','ES'].forEach(k=>{if(files[k])files[k].asins.forEach(a=>merged.add(a));});
  const covered=new Set(files.viewer?files.viewer.asins:[]);const missing=[...merged].filter(a=>!covered.has(a));
  const bar=$('#asinBar');bar.hidden=!merged.size;
  if(merged.size){$('#asinN').textContent=merged.size.toLocaleString();$('#asinMiss').textContent=missing.length.toLocaleString();
    bar.classList.toggle('done',!missing.length);
    $('#asinMsg').innerHTML=!missing.length?`all ${merged.size.toLocaleString()} ASINs covered by the Viewer`
      :files.viewer?`Viewer covers ${covered.size.toLocaleString()} of ${merged.size.toLocaleString()} — the other <b>${missing.length.toLocaleString()}</b> aren't listed on Amazon UK, nothing to do`
      :`<b>${missing.length.toLocaleString()}</b> of ${merged.size.toLocaleString()} ASINs have no UK data yet — open the Viewer, export all columns, drop it below`;
    bar._all=[...merged];}
  const since=files.viewer?files.viewer.hasSince:(files.one?files.one.hasSince:true);
  $('#sinceNote').hidden=since;}
function clearRun(keepSource){SLOTS.forEach(k=>files[k]=null);files.one=null;result=null;lastSig='';$('#fileIn').value='';
  warn([]);$('#results').hidden=true;$('#emptyRun').hidden=false;if(cur)paintSlots();if(!keepSource){cur=null;$('#runCard').hidden=true;renderSources();}}

/* ============ FX (Rule 1 EU buys) ============ */
async function loadFx(){let c=lsGet(FX_KEY,null);
  if(c&&Date.now()-c.t<BR.FX_TTL_H*3600e3){fx={rate:c.rate,src:'ecb'};paintFx();return;}
  try{const j=await(await fetch('https://api.frankfurter.dev/v1/latest?base=GBP&symbols=EUR')).json();
    const rate=Math.ceil(10000/j.rates.EUR)/10000;fx={rate,src:'ecb'};lsSet(FX_KEY,{rate,t:Date.now()});}
  catch(e){fx={rate:c?c.rate:BR.FX_FALLBACK,src:c?'stale':'fallback'};}
  paintFx();}
function paintFx(){const inp=$('#fxIn');if(document.activeElement!==inp)inp.value=fx.rate.toFixed(4);
  const chip=$('#fxChip');chip.textContent=fx.src==='ecb'?'ECB live · rounded up':fx.src==='stale'?'cached · offline':'fallback · offline';
  chip.className='fxchip '+(fx.src==='ecb'?'live':'off');if(result)run();}
function rate(){const v=parseFloat($('#fxIn').value);return v>0.5&&v<1.5?v:fx.rate;}

/* ============ the run ============ */
function prevForToday(key){const h=histAll()[key]||[];const t=today();for(let i=h.length-1;i>=0;i--){if(h[i].stamp.slice(0,10)!==t)return h[i];}return null;}
function saveSnapToday(key,snap){const h=histAll();h[key]=(h[key]||[]).filter(x=>x.stamp.slice(0,10)!==today());h[key].push({stamp:stamp(),snap});if(h[key].length>40)h[key]=h[key].slice(-40);lsSet(HIST_KEY,h);}
function snapOf(out,rule){const s={};out.forEach(o=>{s[o.ASIN]=rule===1?{'Buy market':o['Buy market'],'Landed £':o['Landed £'],'Sell £ used':o['Sell £ used'],'ROI %':o['ROI %'],'Profit £':o['Profit £'],SPM:o.SPM}
  :{'Buy market':'UK','Landed £':o['After discount £'],'Sell £ used':o['Sell for £'],'ROI %':o['ROI %'],'Profit £':o['Profit £'],SPM:o['Sells /mo'],Score:o.Score};});return s;}
/* NEW / BETTER / WORSE / UNCHANGED for Rule 2 — same thresholds Rule 1 uses inside rule1.js */
function applyStatus2(out,prevRun){const prev=prevRun?prevRun.snap:{};
  out.forEach(o=>{const p=prev[o.ASIN];let s='NEW';const why=[];
    if(p){s='UNCHANGED';const landed=o['After discount £'],moved=Math.max(BR.MOVE_GBP,p['Landed £']*BR.MOVE_PCT);
      if(landed<=p['Landed £']-moved){why.push(`buy £${p['Landed £'].toFixed(2)}->£${landed.toFixed(2)}`);s='BETTER';}
      else if(landed>=p['Landed £']+moved){why.push(`buy £${p['Landed £'].toFixed(2)}->£${landed.toFixed(2)}`);s='WORSE';}
      if(o['ROI %']-p['ROI %']>=3&&s!=='BETTER'){s='BETTER';why.push(`ROI ${p['ROI %']}->${o['ROI %']}`);}
      if(o['ROI %']-p['ROI %']<=-3){s='WORSE';why.push(`ROI ${p['ROI %']}->${o['ROI %']}`);}
      if(o['Sell for £']<p['Sell £ used']*0.95){s='WORSE';why.push(`sell £${p['Sell £ used'].toFixed(2)}->£${o['Sell for £'].toFixed(2)}`);}}
    o.STATUS=s;o.Changed=why.join('; ');o['Last seen']=p?prevRun.stamp:'';});
  const keptSet=new Set(out.map(o=>o.ASIN));
  return Object.entries(prev).filter(([a])=>!keptSet.has(a)).map(([a,p])=>[a,`was £${p['Landed £']} ROI ${p['ROI %']}%`+(p.Score?' score '+p.Score:'')]);}
function run(){if(!cur)return;
  const ready=cur.rule===1?!!files.viewer:!!files.one;
  if(!ready){result=null;$('#results').hidden=true;$('#emptyRun').hidden=false;return;}
  const prevRun=prevForToday(cur.key);
  if(cur.rule===1){result=rule1Compute(files,cur.name,rate(),prevRun);result.rule=1;}
  else{const R=rule2Compute(files.one.rows);R.gone=applyStatus2(R.out,prevRun);R.prevStamp=prevRun?prevRun.stamp:null;R.dropped=R.all.filter(o=>!o.kept).map(o=>[o.ASIN,o.Product,`needs ${o['Needs % off']}% off Amazon to reach ${R2.TARGET_ROI}% ROI (brand allows ${o['Brand discount %']||R2.DEFAULT_ALLOW}%)`]);
    R.reasons={'Needs more discount than the brand gives':R.dropped.length};R.rule=2;result=R;}
  const s=sig();if(s!==lastSig){lastSig=s;logRun();}
  renderResults();}
function logRun(){const R=result,c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};R.out.forEach(o=>c[o.STATUS]++);
  const names=cur.rule===1?SLOTS.filter(k=>files[k]).map(k=>files[k].name):[files.one.name];
  const rowsIn=cur.rule===1?files.viewer.rows.length:files.one.rows.length;
  const runs=runsAll().filter(r=>!(r.source===cur.key&&(r.day||r.at.slice(0,10))===today()));
  runs.push({at:new Date().toISOString(),day:today(),source:cur.key,name:cur.name,rule:cur.rule,files:names,rowsIn,leads:R.out.length,new:c.NEW,better:c.BETTER,worse:c.WORSE,gone:R.gone.length,asins:R.out.map(o=>o.ASIN)});
  lsSet(RUN_KEY,runs);saveSnapToday(cur.key,snapOf(R.out,cur.rule));renderSources();renderLog();}

/* ============ results ============ */
function renderResults(){const R=result,st=R.st;$('#emptyRun').hidden=true;$('#results').hidden=false;
  const stages=cur.rule===1?[['In the viewer',st.viewer],['Sells 10+/month',st.demand],['Has a sell price',st.sell],['Amazon selling it',st.buy],['Leads',st.kept]]
    :[['In the export',st.rows],['Amazon selling it',st.priced],['Sells 10+/month',st.demand],['Has a sell price',st.sell],['Leads',st.kept]];
  const max=stages[0][1]||1;
  $('#funnel').innerHTML=stages.map(([l,n],i)=>`<div class="fstage${i===stages.length-1?' last':''}"><span class="fl">${l}</span><span class="fn">${n.toLocaleString()}</span><span class="fbar"><span style="width:${Math.max(2,n/max*100)}%"></span></span></div>`).join('');
  const out=R.out;
  if(cur.rule===1){const cnt=k=>out.filter(o=>o['Buy market']===k).length,euN=out.length-cnt('UK');
    $('#stats').innerHTML=stat('ROI 10%+',out.filter(o=>o['ROI %']>=10).length)+stat('Buy from UK',cnt('UK'))+stat('Buy from EU',euN,euN?['DE','FR','IT','ES'].map(k=>cnt(k)?k+' '+cnt(k):'').filter(Boolean).join(' · '):'no EU exports')+stat('Best ROI',(out.length?Math.round(Math.max(...out.map(o=>o['ROI %']))):0)+'%');}
  else{const m=out.reduce((s,o)=>s+o['£ per month'],0);
    $('#stats').innerHTML=stat('Score 60+',out.filter(o=>o.Score>=60).length)+stat('Score 40–59',out.filter(o=>o.Score>=40&&o.Score<60).length)+stat('£ / month on the list','£'+Math.round(m).toLocaleString())+stat('Best score',out.length?Math.max(...out.map(o=>o.Score)):0);}
  const c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};out.forEach(o=>c[o.STATUS]++);
  $('#statusRow').innerHTML=(R.prevStamp?`<span class="vs">vs ${escapeHtml(R.prevStamp.slice(0,10))}</span>`:`<span class="vs">first run for ${escapeHtml(cur.name)} — everything is NEW</span>`)+
    [['NEW',c.NEW,'new'],['BETTER',c.BETTER,'better'],['WORSE',c.WORSE,'worse'],['UNCHANGED',c.UNCHANGED,'same'],['GONE',R.gone.length,'gone']].map(([l,n,k])=>`<span class="spill ${k}${n?'':' zero'}"><b>${n}</b>${l}</span>`).join('');
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]),rmax=rs.length?rs[0][1]:1;
  $('#reasons').innerHTML=rs.length?rs.map(([k,n])=>`<div class="reason"><span class="rl">${escapeHtml(k)}</span><span class="rbar"><span style="width:${n/rmax*100}%"></span></span><span class="rn">${n}</span></div>`).join(''):'<div class="reason"><span class="rl">Nothing dropped</span></div>';
  $('#dropLbl').textContent=R.dropped.length.toLocaleString()+' dropped';
  const est=cur.rule===1?out.filter(o=>(o['Fees from']||'').startsWith('ESTIMATED')).length:0;
  const fw=$('#feeWarn');if(est){fw.innerHTML='<b>'+est+' of '+out.length+' leads have estimated fees.</b> Tick <em>Referral Fee %</em> and <em>FBA Pick&amp;Pack Fee</em> on the export and the maths becomes exact.';fw.classList.add('show');}else{fw.classList.remove('show');}
  $('#fMarket').hidden=cur.rule!==1;$('#fScoreWrap').hidden=cur.rule!==2;$('#fRoiWrap').hidden=cur.rule!==1;
  renderTable();}
function stat(k,v,sub){return`<div class="stat"><span class="k">${k}</span><span class="v">${typeof v==='number'?v.toLocaleString():v}</span>${sub?`<span class="sub">${escapeHtml(sub)}</span>`:''}</div>`;}
function visible(){const q=view.q.toLowerCase();return result.out.filter(o=>{
  if(view.status!=='ALL'&&o.STATUS!==view.status)return false;
  if(cur.rule===1&&view.market!=='ALL'&&o['Buy market']!==view.market)return false;
  if(cur.rule===1&&view.minRoi!==''&&o['ROI %']<parseFloat(view.minRoi))return false;
  if(cur.rule===2&&view.minScore!==''&&o.Score<parseFloat(view.minScore))return false;
  if(view.hideNo){const v=verdGet(o.ASIN);if(v&&v.v==='No')return false;}
  if(q&&!((o.ASIN+' '+(o.Title||o.Product||'')+' '+(o.Brand||'')).toLowerCase().includes(q)))return false;return true;});}
function links(o){return`<span class="lk"><a href="${o.SAS}" target="_blank" rel="noopener">SAS</a><a href="${o.Keepa}" target="_blank" rel="noopener">Keepa</a><a href="${o['Buy link']}" target="_blank" rel="noopener">Buy${cur.rule===1?' '+o['Buy market']:''}</a>${cur.rule===1&&o['Buy market']!=='UK'?`<a href="${o['UK sell link']}" target="_blank" rel="noopener">UK</a>`:''}</span>`;}
function verdCell(o){const v=verdGet(o.ASIN)||{};const b=x=>`<button type="button" class="vb ${x[0]}${v.v===x?' on':''}" data-v="${x}" data-asin="${o.ASIN}">${x[0]}</button>`;
  const chips=v.v==='No'?`<div class="vreasons">${NO_REASONS.map(r=>`<button type="button" class="vr${v.reason===r?' on':''}" data-r="${r}" data-asin="${o.ASIN}">${r}</button>`).join('')}</div>`:'';
  const note=v.v?`<input class="vnote" data-asin="${o.ASIN}" placeholder="note…" value="${escapeHtml(v.note||'')}">`:'';
  return`<div class="verd">${b('Yes')}${b('No')}${b('Maybe')}</div>${chips}${note}`;}
function renderTable(){const rows=visible();$('#tblCount').textContent=rows.length===result.out.length?rows.length+' leads':rows.length+' of '+result.out.length+' leads';
  const sp=s=>`<span class="spill ${({NEW:'new',BETTER:'better',WORSE:'worse',UNCHANGED:'same'})[s]}">${s}</span>`;
  let h;
  if(cur.rule===1){h='<thead><tr><th>Status</th><th>Lead</th><th>Verdict</th><th>Buy</th><th class="r">Landed £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">/mo</th><th>Flags</th></tr></thead><tbody>';
    rows.forEach(o=>{h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''}"><td>${sp(o.STATUS)}${o.Changed?`<div class="chg">${escapeHtml(o.Changed)}</div>`:''}</td>
      <td class="lead"><span class="asin">${o.ASIN}</span><span class="ttl" title="${escapeHtml(o.Title)}">${escapeHtml(o.Title)}</span>${links(o)}</td><td class="vcell">${verdCell(o)}</td>
      <td><i class="mk ${o['Buy market']==='UK'?'uk':''}">${o['Buy market']}</i>${o['Discount applied']?`<div class="chg">${escapeHtml(o['Discount applied'])}</div>`:''}</td>
      <td class="num">${gbp(o['Landed £'])}</td><td class="num">${gbp(o['Sell £ used'])}<div class="chg">${escapeHtml(o['Sell range'])}</div></td>
      <td class="num ${o['Profit £']>=0?'pos':'neg'}">${gbp(o['Profit £'])}</td><td class="num ${o['ROI %']>=10?'pos':o['ROI %']>=0?'':'neg'}">${pct(o['ROI %'])}</td>
      <td class="num">${o.SPM}<div class="chg">${o['SPM from']}</div></td>
      <td class="flags" title="${escapeHtml(o.Flags)}">${escapeHtml(o.Flags)}</td></tr>`;});}
  else{h='<thead><tr><th>#</th><th>Score</th><th>Status</th><th>Lead</th><th>Verdict</th><th class="r">Amazon £</th><th class="r">After disc.</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">/mo</th><th class="r">£/mo</th><th class="r">Needs off</th></tr></thead><tbody>';
    rows.forEach(o=>{const band=o.Score>=60?'hi':o.Score>=40?'md':'lo';
      h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''}"><td class="num">${o['#']}</td><td><span class="score ${band}">${o.Score}</span></td><td>${sp(o.STATUS)}${o.Changed?`<div class="chg">${escapeHtml(o.Changed)}</div>`:''}</td>
      <td class="lead"><span class="asin">${o.ASIN}</span><span class="ttl" title="${escapeHtml(o.Product)}">${escapeHtml(o.Product)}</span><span class="brand">${escapeHtml(o.Brand)}${o['Limited time deal?']==='yes'?' · <b>LTD</b>':''}${o['FBA resale proven?']==='no'?' · no FBA history':''}</span>${links(o)}</td><td class="vcell">${verdCell(o)}</td>
      <td class="num">${gbp(o['Buy at £'])}<div class="chg">${o['Amazon 90d drop %']}% off 90d</div></td><td class="num">${gbp(o['After discount £'])}${o['Discount applied']?`<div class="chg">${escapeHtml(o['Discount applied'])}</div>`:''}</td>
      <td class="num">${gbp(o['Sell for £'])}</td><td class="num ${o['Profit £']>=0?'pos':'neg'}">${gbp(o['Profit £'])}</td><td class="num ${o['ROI %']>=10?'pos':''}">${pct(o['ROI %'])}</td>
      <td class="num">${o['Sells /mo']}<div class="chg">${o['Demand from']}</div></td><td class="num">£${o['£ per month'].toLocaleString()}</td>
      <td class="num">${o['Needs % off']}%<div class="chg">${o['Brand discount %']!==''?'brand '+o['Brand discount %']+'%':''}</div></td></tr>`;});}
  $('#leads').innerHTML=h+'</tbody>';}
function onTableClick(e){const b=e.target.closest('button');if(!b)return;const a=b.dataset.asin;if(!a)return;
  const v=verdGet(a)||{};
  if(b.dataset.v){if(v.v===b.dataset.v)verdSet(a,null);else verdSet(a,{v:b.dataset.v,reason:b.dataset.v==='No'?v.reason||'':'',note:v.note||'',source:cur.key,who:''});}
  else if(b.dataset.r){verdSet(a,Object.assign(v,{reason:v.reason===b.dataset.r?'':b.dataset.r}));}
  renderTable();renderLog();}
function onTableInput(e){const i=e.target;if(!i.classList.contains('vnote'))return;const v=verdGet(i.dataset.asin);if(v){v.note=i.value;verdSet(i.dataset.asin,v);}}

/* ============ outputs ============ */
function base(){return today()+'-RULE'+cur.rule+'-'+cur.key;}
function withVerdicts(out){const V=verdAll();return out.map(o=>{const v=V[o.ASIN];const c=Object.assign({},o);if(v){c['GOOD LEAD?']=v.v;c.WHY=[v.reason,v.note].filter(Boolean).join(' — ');}return c;});}
function dlSheet(){if(!result||!result.out.length){toast('Nothing on the sheet yet',true);return;}
  const hdr=cur.rule===1?R1_HDR:R2_HDR;downloadBlob(base()+'-REVIEW.xlsx',buildXlsx(hdr,withVerdicts(result.out),cur.name+' Rule '+cur.rule));toast(result.out.length+' leads on the sheet');}
function dlCsv(){if(!result||!result.out.length){toast('Nothing on the sheet yet',true);return;}download(base()+'-REVIEW.csv',rowsToCsv(cur.rule===1?R1_HDR:R2_HDR,withVerdicts(result.out)),'text/csv');}
function dlDropped(){if(!result){toast('Run something first',true);return;}download(base()+'-DROPPED.csv',droppedCsv(result),'text/csv');}

/* ============ run log (the 7-day count) ============ */
function renderLog(){const runs=runsAll().slice().reverse().slice(0,60);const V=verdAll();const el=$('#runLog');
  if(!runs.length){el.innerHTML='<div class="empty"><span>No runs yet. Pick a brand above and drop its exports — every run lands here with its lead count and what was marked.</span></div>';return;}
  const tot={runs:runs.length,leads:0,y:0,n:0,m:0};
  const rows=runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else m++;});
    tot.leads+=r.leads;tot.y+=y;tot.n+=n;tot.m+=m;
    const d=new Date(r.at);return`<tr><td class="num">${d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}<div class="chg">${d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div></td><td>${escapeHtml(r.name)}<div class="chg">Rule ${r.rule} · ${(r.files||[]).length} file${(r.files||[]).length===1?'':'s'}</div></td><td class="num">${r.rowsIn.toLocaleString()}</td><td class="num">${r.leads}</td><td class="num">${r.new}</td><td class="num">${r.better}</td><td class="num">${r.worse}</td><td class="num">${r.gone}</td><td class="num pos">${y||'<span class=z>0</span>'}</td><td class="num neg">${n||'<span class=z>0</span>'}</td><td class="num">${m||'<span class=z>0</span>'}</td><td class="num">${r.leads?Math.round((y+n+m)/r.leads*100)+'%':'—'}</td></tr>`;}).join('');
  el.innerHTML=`<div class="logstats">${stat('Runs',tot.runs)}${stat('Leads produced',tot.leads)}${stat('Marked Yes',tot.y)}${stat('Marked No',tot.n)}${stat('Checked',tot.leads?Math.round((tot.y+tot.n+tot.m)/tot.leads*100)+'%':'—')}</div>
    <div class="tablewrap show"><div class="tablescroll"><table><thead><tr><th>When</th><th>Source</th><th class="r">Rows in</th><th class="r">Leads</th><th class="r">New</th><th class="r">Better</th><th class="r">Worse</th><th class="r">Gone</th><th class="r">Yes</th><th class="r">No</th><th class="r">Maybe</th><th class="r">Checked</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;}
function exportLog(){const runs=runsAll(),V=verdAll();
  const hdr=['at','source','rule','files','rows_in','leads','new','better','worse','gone','yes','no','maybe'];
  const rows=runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else m++;});
    return{at:r.at,source:r.name,rule:r.rule,files:(r.files||[]).join(' | '),rows_in:r.rowsIn,leads:r.leads,new:r.new,better:r.better,worse:r.worse,gone:r.gone,yes:y,no:n,maybe:m};});
  download(today()+'-SOURCING-RUN-LOG.csv',rowsToCsv(hdr,rows),'text/csv');
  const vh=['asin','verdict','reason','note','source','at'];
  download(today()+'-SOURCING-VERDICTS.csv',rowsToCsv(vh,Object.entries(V).map(([a,v])=>({asin:a,verdict:v.v,reason:v.reason||'',note:v.note||'',source:v.source||'',at:v.at}))),'text/csv');}

/* ============ wiring ============ */
function brandsInit(){renderSources();renderLog();
  $('#addOpen').addEventListener('click',()=>addSourceUI($('#addSrc').hidden));$('#addGo').addEventListener('click',addSource);
  $('#addName').addEventListener('keydown',e=>{if(e.key==='Enter')addSource();});
  $('#removeSrc').addEventListener('click',removeSource);
  const zone=$('#dropAny'),inp=$('#fileIn');dz(zone,inp);
  inp.addEventListener('change',e=>{handleFiles(e.target.files);e.target.value='';});
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('over');handleFiles(e.dataTransfer.files);});
  $('#asinCopy').addEventListener('click',e=>{const a=$('#asinBar')._all||[];copy(a.join(', '),a.length+' ASINs copied — paste into the UK Product Viewer',e.currentTarget,'Copied');});
  $('#asinOpen').addEventListener('click',()=>{const a=$('#asinBar')._all||[];if(!a.length){toast('Drop the Finder exports first',true);return;}window.open(keepaLink(a,'2'),'_blank');});
  $('#fxIn').addEventListener('input',()=>{if(result)run();});$('#fxRefresh').addEventListener('click',()=>{try{localStorage.removeItem(FX_KEY);}catch(e){}loadFx();});
  $('#dlSheet').addEventListener('click',dlSheet);$('#dlCsv').addEventListener('click',dlCsv);$('#dlDropped').addEventListener('click',dlDropped);
  $('#copyKept').addEventListener('click',e=>{if(!result||!result.out.length){toast('Nothing to copy',true);return;}copy(result.out.map(o=>o.ASIN).join(', '),result.out.length+' ASINs copied',e.currentTarget,'Copied');});
  $('#openKept').addEventListener('click',()=>{if(!result||!result.out.length){toast('Nothing to open',true);return;}window.open(keepaLink(result.out.map(o=>o.ASIN),'2'),'_blank');});
  $('#clearRun').addEventListener('click',()=>clearRun(true));
  $('#forget').addEventListener('click',()=>{if(!cur)return;if(!confirm('Forget every saved run for '+cur.name+'? The next run shows everything as NEW.'))return;histForget(cur.key);toast('History cleared for '+cur.name);run();});
  $('#leads').addEventListener('click',onTableClick);$('#leads').addEventListener('input',onTableInput);
  $('#fStatus').addEventListener('change',e=>{view.status=e.target.value;renderTable();});
  $('#fMarket').addEventListener('change',e=>{view.market=e.target.value;renderTable();});
  $('#fRoi').addEventListener('input',e=>{view.minRoi=e.target.value;renderTable();});
  $('#fScore').addEventListener('input',e=>{view.minScore=e.target.value;renderTable();});
  $('#fQ').addEventListener('input',e=>{view.q=e.target.value;renderTable();});
  $('#fHideNo').addEventListener('change',e=>{view.hideNo=e.target.checked;renderTable();});
  $('#logExport').addEventListener('click',exportLog);
  $('#rulesToggle').addEventListener('click',()=>{const o=$('#rulesBox');const open=o.classList.toggle('show');$('#rulesToggle').textContent=open?'Hide the rules':'Show the rules';});
  loadFx();}
