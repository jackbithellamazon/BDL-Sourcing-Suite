/* BDL Sourcing — the BRANDS page (b3): the list, the run view, verdicts, the runs log, settings.
   Rule maths lives in rule1.js / rule2.js. This file only moves data between the page and the rules. */
const SLOTS=['viewer','UK','DE','FR','IT','ES'];
const FX_KEY='bdl-sourcing-fx';
const PAGE=50;
let cur=null,result=null,fx={rate:BR.FX_FALLBACK,src:'fallback'},lastSig='';
const files={viewer:null,UK:null,DE:null,FR:null,IT:null,ES:null,one:null};
const view={status:'ALL',market:'ALL',minRoi:'',minScore:'',q:'',hideNo:false,page:1,sel:new Set()};
const lview={q:'',market:'ALL',rule:'ALL',seg:'due'};
const ICONS={
  run:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  ext:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  hist:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>'};
const AV_COLORS=['#6e7bff','#36d6a4','#f76a83','#fbbf24','#9a7bff','#2aa6ff','#f97316','#22b888'];
function avatar(s,big){const c=AV_COLORS[[...s.key].reduce((a,ch)=>a+ch.charCodeAt(0),0)%AV_COLORS.length];
  return`<span class="avatar" style="background:${c}">${escapeHtml((s.name||'?').slice(0,2).toUpperCase())}</span>`;}
const closeMenus=()=>document.querySelectorAll('.menu.open').forEach(m=>m.classList.remove('open'));

/* ============ list view ============ */
function weekAgo(){return Date.now()-7*864e5;}
function renderKpis(){const all=srcAll(),runs=runsAll(),V=verdAll();
  const due=all.filter(s=>dueState(s).due).length;
  const wk=runs.filter(r=>new Date(r.at).getTime()>=weekAgo());
  const leads=wk.reduce((s,r)=>s+r.leads,0);
  const asins=new Set();wk.forEach(r=>(r.asins||[]).forEach(a=>asins.add(a)));
  let checked=0;asins.forEach(a=>{if(V[a])checked++;});
  const k=(v,l,cls,ic)=>`<div class="kpi"><span class="ki ${cls||''}">${ic}</span><div><div class="kv">${v}</div><div class="kl">${l}</div></div></div>`;
  $('#bKpis').innerHTML=k(all.filter(s=>s.status!=='paused').length,'Active + testing','',ICONS.cal)+k(due,'Due today',due?'amber':'jade',ICONS.run)+k(wk.length,'Runs this week','',ICONS.hist)+k(leads.toLocaleString(),'Leads this week','jade',ICONS.play)+k(asins.size?Math.round(checked/asins.size*100)+'%':'—','Checked this week',asins.size&&checked/asins.size<.5?'coral':'jade',ICONS.edit);}
function renderList(){renderKpis();const q=lview.q.toLowerCase();
  const rows=srcSorted().filter(s=>{
    if(lview.seg==='due'&&!dueState(s).due)return false;
    if(lview.seg==='paused'&&s.status!=='paused')return false;
    if(lview.market!=='ALL'&&!s.markets.includes(lview.market))return false;
    if(lview.rule!=='ALL'&&String(s.rule)!==lview.rule)return false;
    if(q&&!((s.name+' '+(s.note||'')).toLowerCase().includes(q)))return false;return true;});
  const tb=$('#brandTbl');
  if(!rows.length){tb.innerHTML=`<tbody><tr><td colspan="10" style="text-align:center;color:var(--faint);padding:22px">${lview.seg==='due'?'Nothing due — everything has been run inside its cadence.':'Nothing here.'}</td></tr></tbody>`;return;}
  const rowHtml=s=>{const d=dueState(s),last=runLast(s.key),nx=nextRun(s),tok=tokenEstimate(s);
    return`<tr class="${s.status==='paused'?'paused':''}" data-key="${s.key}">
      <td><div class="brandcell">${avatar(s)}<div><span class="bname">${escapeHtml(s.name)}</span><span class="ttag">Rule ${s.rule}</span>${s.note?`<span class="note">${escapeHtml(s.note)}</span>`:''}</div></div></td>
      <td><span class="owner">${escapeHtml(s.owner||'VAs')}</span></td>
      <td><div class="flags">${s.markets.map(m=>`<span class="f" title="${m}">${FLAG[m]}</span>`).join('')}<span class="fk">${s.markets.join(' ')}</span></div></td>
      <td><span class="st ${s.status}">${STATUS_LABEL[s.status]||s.status}</span></td>
      <td><span class="cad">${ICONS.cal}${CADENCE_LABEL[s.cadence]||s.cadence}</span></td>
      <td>${last?`<span class="lastrun">${fmtWhen(last.at)}${last.who?` · <b>${escapeHtml(last.who)}</b>`:''}<span class="sub">${last.leads} leads · ${last.new+last.better} new/changed</span></span>`:`<span class="lastrun" style="color:var(--faint)">never</span>`}</td>
      <td><span class="due ${d.cls}">${d.due?'due now':nx?fmtWhen(nx.toISOString()).replace(' 07:00',''):d.label}</span></td>
      <td><a class="kl" href="${finderLink(s)}" target="_blank" rel="noopener" title="${s.link?'Saved Keepa filter':'Generated from the brand name — edit to paste your own'}">${ICONS.ext}${s.link?'Open saved filter':'Open generated filter'}</a></td>
      <td class="r"><span class="tok" title="Keepa API cost if this ran automatically. A manual export costs 0.">~${tok.toLocaleString()}</span></td>
      <td><div class="acts"><button class="btn run xs" data-act="run" ${s.status==='paused'||s.rule===3?'disabled':''}>${ICONS.run}Run</button><button class="btn ghost xs" data-act="edit">${ICONS.edit}Edit</button>
        <div class="menu"><button class="btn ghost xs icon" data-act="menu" aria-label="More">⋮</button>
          <div class="pop"><button data-act="history">${ICONS.hist}History</button><button data-act="pause">${s.status==='paused'?ICONS.play:ICONS.pause}${s.status==='paused'?'Set active':'Pause'}</button><button data-act="delete" class="danger">${ICONS.trash}Delete</button></div></div></div></td></tr>`;};
  const head=`<thead><tr><th>Name</th><th>Owner</th><th>Buy from</th><th>Status</th><th>Cadence</th><th>Last run</th><th>Next run</th><th>Saved filter</th><th class="r">Est. tokens</th><th></th></tr></thead>`;
  const filters=rows.filter(s=>s.type==='filter'),brands=rows.filter(s=>s.type!=='filter');
  const group=(label,list)=>list.length?`<tr class="grp"><td colspan="10">${label} <span>${list.length}</span></td></tr>`+list.map(rowHtml).join(''):'';
  tb.innerHTML=head+'<tbody>'+group('Saved filters',filters)+group('Brands',brands)+'</tbody>';}
function onListClick(e){const b=e.target.closest('button[data-act]');if(!b){closeMenus();return;}
  const tr=b.closest('tr'),key=tr&&tr.dataset.key,s=key&&srcGet(key);if(!s)return;const act=b.dataset.act;
  if(act==='menu'){const m=b.closest('.menu');const open=m.classList.contains('open');closeMenus();if(!open)m.classList.add('open');e.stopPropagation();return;}
  closeMenus();
  if(act==='run')openRun(key);
  else if(act==='edit')openEdit(s);
  else if(act==='history')openHistory(s);
  else if(act==='pause'){s.status=s.status==='paused'?'active':'paused';s.paused=s.status==='paused';srcSave(s);renderList();toast(s.name+(s.status==='paused'?' paused':' set active'));}
  else if(act==='delete'){if(!confirm('Delete '+s.name+' from the list? Its run history is kept.'))return;srcRemove(key);renderList();toast(s.name+' deleted');}}

/* ============ drawer: edit / add / history ============ */
function openDrawer(html){$('#drawerBody').innerHTML=html;$('#drawer').classList.add('open');}
function closeDrawer(){$('#drawer').classList.remove('open');}
function openEdit(s){const isNew=!s;s=s||{key:'',name:'',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'',brands:[],link:'',status:'testing',owner:me()||'VAs'};
  openDrawer(`<h3>${isNew?'Add brand':'Edit '+escapeHtml(s.name)}</h3><p class="dsub">${isNew?'A brand we want to keep checking. It gets a Keepa Finder link generated for it.':'Changes apply to the next run. History is untouched.'}</p>
  <div class="form">
    <div class="field"><label>Name</label><input class="full" id="eName" value="${escapeHtml(s.name)}" placeholder="Corsair" autocomplete="off"></div>
    <div class="field"><label>Type</label><select class="full" id="eType"><option value="brand"${s.type==='brand'?' selected':''}>Brand (Rule 1 · buy UK/EU, sell UK)</option><option value="filter"${s.type==='filter'?' selected':''}>Keepa filter (Rule 2 · high-ticket UK)</option></select></div>
    <div class="field"><label>Buy from</label><div class="mks">${MARKETS.map(m=>`<label><input type="checkbox" value="${m}"${s.markets.includes(m)?' checked':''}>${FLAG[m]} ${m}</label>`).join('')}</div></div>
    <div class="field"><label>Owner — whose search this is</label><input class="full" id="eOwner" value="${escapeHtml(s.owner||'VAs')}" placeholder="Mera / Suz / VAs / Jack" autocomplete="off"></div>
    <div class="field"><label>Cadence</label><select class="full" id="eCad">${Object.keys(CADENCE_LABEL).map(c=>`<option value="${c}"${s.cadence===c?' selected':''}>${CADENCE_LABEL[c]}</option>`).join('')}</select></div>
    <div class="field"><label>Brand names as Keepa spells them</label><input class="full" id="eBrands" value="${escapeHtml((s.brands||[]).join(', '))}" placeholder="Logitech, Logitech G, Logitech for Creators"><p class="hintline">Keepa's brand filter is exact. Leave blank to use the name.</p></div>
    <div class="field"><label>Keepa filter link</label><input class="full" id="eLink" value="${escapeHtml(s.link||'')}" placeholder="paste a keepa.com/#!finder/… link, or leave blank to generate one"><p class="hintline">One link runs on every marketplace — switch the locale in Keepa, run, export.</p></div>
    <div class="field"><label>Note</label><textarea id="eNote">${escapeHtml(s.note||'')}</textarea></div>
    <div class="field"><label>Status</label><select class="full" id="eStatus"><option value="active"${s.status==='active'?' selected':''}>Active — runs on its cadence</option><option value="testing"${s.status==='testing'?' selected':''}>Testing — we're trying it</option><option value="paused"${s.status==='paused'?' selected':''}>Paused — greyed out, not due</option></select></div>
  </div>
  <div class="dfoot"><button class="btn ghost" id="dCancel">Cancel</button><button class="btn primary" id="dSave"><span class="lab">${isNew?'Add':'Save'}</span></button></div>`);
  $('#dCancel').addEventListener('click',closeDrawer);
  $('#dSave').addEventListener('click',()=>{const name=$('#eName').value.trim();if(!name){toast('Name needed',true);return;}
    const markets=[...document.querySelectorAll('#drawerBody .mks input[type=checkbox][value]:checked')].map(c=>c.value);if(!markets.length){toast('Tick at least one marketplace',true);return;}
    const type=$('#eType').value;const key=isNew?srcKeyFor(name):s.key;if(isNew&&srcGet(key)){toast(name+' is already in the list',true);return;}
    const out=Object.assign({},s,{key,name,type,rule:type==='filter'?2:1,markets,cadence:$('#eCad').value,owner:$('#eOwner').value.trim()||'VAs',note:$('#eNote').value.trim(),status:$('#eStatus').value,paused:$('#eStatus').value==='paused',
      brands:$('#eBrands').value.split(',').map(x=>x.trim()).filter(Boolean),link:$('#eLink').value.trim()});
    srcSave(out);closeDrawer();renderList();toast(isNew?name+' added':'Saved');if(cur&&cur.key===key){cur=out;paintRunHead();}});
  setTimeout(()=>$('#eName').focus(),50);}
function openHistory(s){const runs=runsFor(s.key).slice().reverse(),V=verdAll();
  openDrawer(`<h3>${escapeHtml(s.name)} · history</h3><p class="dsub">${runs.length} run${runs.length===1?'':'s'} in this browser</p>
    <div class="hist">${runs.length?runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else m++;});
      return`<div class="h"><span class="w">${fmtWhen(r.at)}</span><span class="l"><b>${r.leads}</b> leads · ${r.new} new · ${r.better} better · ${r.worse} worse · ${r.gone} gone</span><span class="v">${y}Y ${n}N ${m}M</span></div>`;}).join(''):'<div class="empty"><span>Not run yet.</span></div>'}</div>
    <div class="dfoot"><button class="btn ghost danger" id="dForget">Forget history</button><button class="btn ghost" id="dClose">Close</button></div>`);
  $('#dClose').addEventListener('click',closeDrawer);
  $('#dForget').addEventListener('click',()=>{if(!confirm('Forget every saved run for '+s.name+'? The next run shows everything as NEW.'))return;histForget(s.key);lsSet(RUN_KEY,runsAll().filter(r=>r.source!==s.key));closeDrawer();renderList();toast('History cleared for '+s.name);});}

/* ============ run view ============ */
function openRun(key){const s=srcGet(key);if(!s)return;
  if(cur&&cur.key!==key)clearRun();cur=s;
  $('#viewList').hidden=true;$('#viewRun').hidden=false;paintRunHead();paintSlots();run();window.scrollTo({top:0,behavior:'smooth'});}
function backToList(){$('#viewRun').hidden=true;$('#viewList').hidden=false;renderList();}
function paintRunHead(){const s=cur;$('#runAvatar').innerHTML=avatar(s);$('#runName').textContent=s.name;
  $('#runMk').innerHTML=s.markets.map(m=>`<i class="mk ${m==='UK'?'uk':''}">${m}</i>`).join(' ');
  $('#runMeta').textContent=`${escapeHtml(s.owner||'VAs')} · Rule ${s.rule} · ${STATUS_LABEL[s.status]||''} · ${CADENCE_LABEL[s.cadence]||s.cadence} · ~${tokenEstimate(s).toLocaleString()} Keepa tokens if automated, 0 by export`+(s.note?' · '+s.note:'');
  const r1=s.rule===1;
  $('#step1Title').textContent=r1?'Drop the Product Finder exports':"Drop this morning's export";
  $('#step1Sub').textContent=r1?`Finder export for each of ${s.markets.join(' · ')}, then the UK Product Viewer. Any order.`:'UK Product Finder, all columns. One file.';
  const link=finderLink(s);
  $('#keepaRow').innerHTML=`<span class="lab">Open in Keepa:</span>`+(r1?s.markets.map(m=>`<a href="${link}" target="_blank" rel="noopener" title="Opens the filter — set Keepa to ${m}, run, export">${FLAG[m]} ${m}${ICONS.ext}</a>`).join(''):`<a href="${link}" target="_blank" rel="noopener">${FLAG.UK} the filter${ICONS.ext}</a>`)+(s.link?'':`<span class="lab" style="margin-left:6px">generated from the brand name — edit to paste your own</span>`);}
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
function removeFile(k){files[k]=null;paintSlots();run();}
function paintSlots(){if(!cur)return;const r1=cur.rule===1;
  const chip=(k,label,f,need)=>`<div class="fchip ${f?'ok':''}"><span class="dot"></span><span class="k">${label}</span><span class="n">${f?escapeHtml(f.name):need}</span><span class="r">${f?f.rows.length.toLocaleString()+' rows':''}</span>${f?`<button class="x" data-rm="${k}" title="Remove">×</button>`:''}</div>`;
  let h='';
  if(r1){cur.markets.forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],'Finder export · expected');});
    MARKETS.filter(m=>!cur.markets.includes(m)&&files[m]).forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],'');});
    h+=chip('viewer','Viewer',files.viewer,'UK Product Viewer · required');}
  else h+=chip('one','Export',files.one,'UK Product Finder · required');
  $('#fileChips').innerHTML=h;
  /* the ASIN hand-off: every ASIN the Finders found, minus the ones the Viewer already covers */
  const merged=new Set();MARKETS.forEach(k=>{if(files[k])files[k].asins.forEach(a=>merged.add(a));});
  const covered=new Set(files.viewer?files.viewer.asins:[]);const missing=[...merged].filter(a=>!covered.has(a));
  const bar=$('#asinBar');bar.hidden=!(r1&&merged.size);
  if(r1&&merged.size){bar.classList.toggle('done',!missing.length);
    $('#asinMsg').innerHTML=!missing.length?`all ${merged.size.toLocaleString()} ASINs covered by the Viewer`
      :files.viewer?`Viewer covers ${covered.size.toLocaleString()} of ${merged.size.toLocaleString()} — the other <b>${missing.length.toLocaleString()}</b> aren't listed on Amazon UK, nothing to do`
      :`<b>${missing.length.toLocaleString()}</b> of ${merged.size.toLocaleString()} ASINs have no UK data yet`;
    $('#asinN').textContent=merged.size.toLocaleString();bar._all=[...merged];}
  const since=files.viewer?files.viewer.hasSince:(files.one?files.one.hasSince:true);$('#sinceNote').hidden=since;}
function clearRun(){SLOTS.forEach(k=>files[k]=null);files.one=null;result=null;lastSig='';$('#fileIn').value='';view.sel.clear();view.page=1;
  warn([]);$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;if(cur)paintSlots();}

/* ============ FX (Rule 1 EU buys) — lives in Settings, used here ============ */
async function loadFx(){let c=lsGet(FX_KEY,null);
  if(c&&Date.now()-c.t<BR.FX_TTL_H*3600e3){fx={rate:c.rate,src:'ecb'};paintFx();return;}
  try{const j=await(await fetch('https://api.frankfurter.dev/v1/latest?base=GBP&symbols=EUR')).json();
    const rate=Math.ceil(10000/j.rates.EUR)/10000;fx={rate,src:'ecb'};lsSet(FX_KEY,{rate,t:Date.now()});}
  catch(e){fx={rate:c?c.rate:BR.FX_FALLBACK,src:c?'stale':'fallback'};}
  paintFx();}
function paintFx(){const inp=$('#fxIn');if(inp&&document.activeElement!==inp)inp.value=fx.rate.toFixed(4);
  const chip=$('#fxChip');if(chip){chip.textContent=fx.src==='ecb'?'ECB live · rounded up':fx.src==='stale'?'cached · offline':'fallback · offline';chip.className='fxchip '+(fx.src==='ecb'?'live':'off');}
  if(result)run();}
function rate(){const inp=$('#fxIn');const v=inp?parseFloat(inp.value):NaN;return v>0.5&&v<1.5?v:fx.rate;}

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
  if(!ready){result=null;$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;
    $('#sumEmpty').textContent=cur.rule===1?(MARKETS.some(m=>files[m])?'Finder exports in — drop the UK Product Viewer export and the leads appear here.':'Drop the exports and the numbers appear here.'):'Drop the export and the numbers appear here.';return;}
  const prevRun=prevForToday(cur.key);
  if(cur.rule===1){result=rule1Compute(files,cur.name,rate(),prevRun);result.rule=1;}
  else{const R=rule2Compute(files.one.rows,factsAll());R.gone=applyStatus2(R.out,prevRun);R.prevStamp=prevRun?prevRun.stamp:null;R.dropped=R.all.filter(o=>!o.kept).map(o=>[o.ASIN,o.Product,`needs ${o['Needs % off']}% off Amazon to reach ${R2.TARGET_ROI}% ROI (brand allows ${o['Brand discount %']||R2.DEFAULT_ALLOW}%)`]);
    R.reasons={'Needs more discount than the brand gives':R.dropped.length};R.rule=2;result=R;}
  const s=sig();if(s!==lastSig){lastSig=s;view.page=1;view.sel.clear();logRun();}
  renderResults();}
function logRun(){const R=result,c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};R.out.forEach(o=>c[o.STATUS]++);
  const names=cur.rule===1?SLOTS.filter(k=>files[k]).map(k=>files[k].name):[files.one.name];
  const rowsIn=cur.rule===1?files.viewer.rows.length:files.one.rows.length;
  const runs=runsAll().filter(r=>!(r.source===cur.key&&(r.day||r.at.slice(0,10))===today()));
  runs.push({at:new Date().toISOString(),day:today(),source:cur.key,name:cur.name,rule:cur.rule,files:names,rowsIn,leads:R.out.length,new:c.NEW,better:c.BETTER,worse:c.WORSE,gone:R.gone.length,asins:R.out.map(o=>o.ASIN),who:me()});
  lsSet(RUN_KEY,runs);saveSnapToday(cur.key,snapOf(R.out,cur.rule));renderLog();}

/* ============ results ============ */
function sumTile(v,l,cls){return`<div class="sum ${cls||''}"><span class="sv">${typeof v==='number'?v.toLocaleString():v}</span><span class="sl">${l}</span></div>`;}
function renderResults(){const R=result,st=R.st,out=R.out;$('#sumEmpty').hidden=true;$('#results').hidden=false;
  let tiles;
  if(cur.rule===1){const cnt=k=>out.filter(o=>o['Buy market']===k).length,euN=out.length-cnt('UK');
    tiles=sumTile(st.viewer,'in the Viewer')+sumTile(st.demand,'sell 10+/month')+sumTile(st.buy,'Amazon selling it')+sumTile(out.length,'leads','lead')
      +sumTile(out.filter(o=>o['ROI %']>=10).length,'ROI 10%+','cool')+sumTile(cnt('UK'),'buy from UK')+sumTile(euN,euN?'buy from EU · '+['DE','FR','IT','ES'].map(k=>cnt(k)?k+' '+cnt(k):'').filter(Boolean).join(' '):'buy from EU','warm')+sumTile((out.length?Math.round(Math.max(...out.map(o=>o['ROI %']))):0)+'%','best ROI');}
  else{const m=out.reduce((s,o)=>s+o['£ per month'],0);
    tiles=sumTile(st.rows,'in the export')+sumTile(st.priced,'Amazon selling it')+sumTile(st.demand,'sell 10+/month')+sumTile(out.length,'leads','lead')
      +sumTile(out.filter(o=>o.Score>=60).length,'score 60+','cool')+sumTile(out.filter(o=>o.Score>=40&&o.Score<60).length,'score 40–59','warm')+sumTile('£'+Math.round(m).toLocaleString(),'£ / month on the list')+sumTile(out.length?Math.max(...out.map(o=>o.Score)):0,'best score');}
  $('#sumGrid').innerHTML=tiles;
  const c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};out.forEach(o=>c[o.STATUS]++);
  $('#statusRow').innerHTML=(R.prevStamp?`<span class="vs">vs ${escapeHtml(R.prevStamp.slice(0,10))}</span>`:`<span class="vs">first run for ${escapeHtml(cur.name)} — everything is NEW</span>`)+
    [['NEW',c.NEW,'new'],['BETTER',c.BETTER,'better'],['WORSE',c.WORSE,'worse'],['UNCHANGED',c.UNCHANGED,'same'],['GONE',R.gone.length,'gone']].map(([l,n,k])=>`<span class="spill ${k}${n?'':' zero'}"><b>${n}</b>${l}</span>`).join('');
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]),tot=R.dropped.length||1;
  $('#fell').innerHTML=`<span class="fl">Filtered out</span><span class="fr">${rs.length?rs.map(([k,n])=>`${escapeHtml(k)} ${n}`).join(' · '):'nothing'}</span><span class="fbar"><span style="width:${Math.min(100,R.dropped.length/((st.viewer||st.rows)||1)*100)}%"></span></span><span class="fn">${R.dropped.length} dropped</span>`;
  const est=cur.rule===1?out.filter(o=>(o['Fees from']||'').startsWith('ESTIMATED')).length:0;
  const fw=$('#feeWarn');if(est){fw.innerHTML='<b>'+est+' of '+out.length+' leads have estimated fees.</b> Tick <em>Referral Fee %</em> and <em>FBA Pick&amp;Pack Fee</em> on the export and the maths becomes exact.';fw.classList.add('show');}else{fw.classList.remove('show');}
  $('#fMarket').hidden=cur.rule!==1;$('#fScore').hidden=cur.rule!==2;$('#fRoi').hidden=cur.rule!==1;
  renderTable();}
function visible(){const q=view.q.toLowerCase();return result.out.filter(o=>{
  if(view.status!=='ALL'&&o.STATUS!==view.status)return false;
  if(cur.rule===1&&view.market!=='ALL'&&o['Buy market']!==view.market)return false;
  if(cur.rule===1&&view.minRoi!==''&&o['ROI %']<parseFloat(view.minRoi))return false;
  if(cur.rule===2&&view.minScore!==''&&Math.max(o.Score,o['Potential score']||0)<parseFloat(view.minScore))return false;
  if(view.hideNo){const v=verdGet(o.ASIN);if(v&&v.v==='No')return false;}
  if(q&&!((o.ASIN+' '+(o.Title||o.Product||'')+' '+(o.Brand||'')).toLowerCase().includes(q)))return false;return true;});}
function acts(o){return`<div class="rowacts"><a href="${o.Keepa}" target="_blank" rel="noopener" title="Keepa graph">Keepa</a><a href="${o.SAS}" target="_blank" rel="noopener" title="SellerAmp">SAS</a><a href="${o['Buy link']}" target="_blank" rel="noopener" title="Buy page">Buy${cur.rule===1&&o['Buy market']!=='UK'?' '+o['Buy market']:''}</a>${cur.rule===1&&o['Buy market']!=='UK'?`<a href="${o['UK sell link']}" target="_blank" rel="noopener">UK</a>`:''}</div>`;}
function verdCell(o){const v=verdGet(o.ASIN)||{};const b=x=>`<button type="button" class="vb ${x[0]}${v.v===x?' on':''}" data-v="${x}" data-asin="${o.ASIN}" title="${x}">${x[0]}</button>`;
  const chips=v.v==='No'?`<div class="vreasons">${noReasons().map(r=>`<button type="button" class="vr${v.reason===r?' on':''}" data-r="${r}" data-asin="${o.ASIN}">${escapeHtml(r)}</button>`).join('')}</div>`:'';
  const note=v.v?`<input class="vnote" data-asin="${o.ASIN}" placeholder="note…" value="${escapeHtml(v.note||'')}">`:'';
  return`<div class="verd">${b('Yes')}${b('No')}${b('Maybe')}</div>${chips}${note}`;}
function renderTable(){const all=visible();const pages=Math.max(1,Math.ceil(all.length/PAGE));if(view.page>pages)view.page=pages;
  const rows=all.slice((view.page-1)*PAGE,view.page*PAGE);
  $('#leadCount').textContent=all.length===result.out.length?`Leads (${all.length})`:`Leads (${all.length} of ${result.out.length})`;
  const sp=s=>`<span class="spill ${({NEW:'new',BETTER:'better',WORSE:'worse',UNCHANGED:'same'})[s]}">${s}</span>`;
  const asin=o=>`<td class="asin">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></td>`;
  const sel=o=>`<td class="sel"><input type="checkbox" data-sel="${o.ASIN}"${view.sel.has(o.ASIN)?' checked':''}></td>`;
  let h;
  if(cur.rule===1){h=`<thead><tr><th></th><th>#</th><th>Status</th><th>ASIN</th><th>Product</th><th>Verdict</th><th>Buy</th><th class="r">Landed £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">/mo</th><th>Flags</th><th class="r">Links</th></tr></thead><tbody>`;
    rows.forEach((o,i)=>{h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''}">${sel(o)}<td class="idx">${(view.page-1)*PAGE+i+1}</td><td>${sp(o.STATUS)}${o.Changed?`<span class="chg">${escapeHtml(o.Changed)}</span>`:''}</td>${asin(o)}
      <td class="prod"><span class="t" title="${escapeHtml(o.Title)}">${escapeHtml(o.Title)}</span><span class="s">${escapeHtml(o['Sell used'])}${o['LTD badge']?' · <b>LTD</b>':''}</span></td>
      <td class="vcell">${verdCell(o)}</td>
      <td><i class="mk ${o['Buy market']==='UK'?'uk':''}">${o['Buy market']}</i>${o['Discount applied']?`<span class="chg">${escapeHtml(o['Discount applied'])}</span>`:''}</td>
      <td class="num r">${gbp(o['Landed £'])}</td><td class="num r">${gbp(o['Sell £ used'])}<span class="sub">${escapeHtml(o['Sell range'])}</span></td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}">${gbp(o['Profit £'])}</td><td class="num r ${o['ROI %']>=10?'pos':o['ROI %']>=0?'':'neg'}">${pct(o['ROI %'])}</td>
      <td class="num r">${o.SPM}<span class="sub">${o['SPM from']}</span></td>
      <td class="flagc" title="${escapeHtml(o.Flags)}"><span class="chips">${(o.Flags||'').split('; ').filter(Boolean).map(f=>`<i class="ch ${/PLUG|NOT A DROP|WIDE|volatile|no FBA|LIMITED|drops only|tanked/i.test(f)?'warn':/A2A->OA|price-match/i.test(f)?'info':''}">${escapeHtml(f.length>42?f.slice(0,40)+'…':f)}</i>`).join('')}</span></td><td>${acts(o)}</td></tr>`;});}
  else{h=`<thead><tr><th></th><th>#</th><th>Score</th><th>Status</th><th>ASIN</th><th>Product</th><th>Verdict</th><th class="r">Amazon £</th><th class="r">After discounts £</th><th class="r">Sell price £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">Sells / month</th><th class="r">£ / month</th><th>Price-matched at</th><th class="r">Links</th></tr></thead><tbody>`;
    rows.forEach(o=>{const pot=o['Potential score']>o.Score+5?o['Potential score']:0;const band=bandOf(Math.max(o.Score,pot));
      const fact=factGet(o.ASIN);const alt=[['Buy Box 90d',o['Buy Box 90d £']],['Buy Box 180d',o['Buy Box 180d £']],['FBA 90d',o['FBA 90d £']],['FBM 90d',o['FBM 90d £']],['Buy Box high',o['Buy Box high £']]].filter(x=>x[1]).map(x=>`${x[0]} ${gbp(x[1])}`).join(' · ');
      h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''} band-${band}">${sel(o)}<td class="idx">${o['#']}</td>
      <td><span class="score ${band}">${o.Score}</span>${pot?`<span class="potl" title="Potential score with ${escapeHtml(o['Potential via'])}">→ ${pot}</span>`:''}</td>
      <td>${sp(o.STATUS)}${o.Changed?`<span class="chg">${escapeHtml(o.Changed)}</span>`:''}</td>${asin(o)}
      <td class="prod"><span class="t" title="${escapeHtml(o.Product)}">${escapeHtml(o.Product)}</span><span class="s">${escapeHtml(o.Brand)} · ${o['Sells /mo']}/mo ${o['Demand from']}${o.Reviews?' · '+o.Reviews.toLocaleString()+' reviews':''}${o['Age days']!==''?' · '+o['Age days']+'d tracked':''}</span><span class="chips">${(o.chips||[]).map(([t,c])=>`<i class="ch ${c}">${escapeHtml(t)}</i>`).join('')}</span></td>
      <td class="vcell">${verdCell(o)}</td>
      <td class="num r">${gbp(o['Buy at £'])}<span class="sub">${o['Amazon 90d drop %']}% under 90d avg</span></td><td class="num r">${gbp(o['After discount £'])}<span class="sub">${o['Discount applied']?escapeHtml(o['Discount applied']):'none found'}</span></td>
      <td class="num r sellc"><b>${gbp(o['Sell for £'])}</b><span class="sub conf-${o['Sell confidence']}" title="${escapeHtml(alt)}">${escapeHtml(o['Sell from'])}</span><input class="ysell" data-asin="${o.ASIN}" type="number" step="0.01" placeholder="your sell £" value="${fact.sell||''}" title="What the graph says it really sells for — saved, and used for the refit"></td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}">${gbp(o['Profit £'])}</td><td class="num r ${o['ROI %']>=10?'pos':o['ROI %']>=0?'':'neg'}">${pct(o['ROI %'])}</td>
      <td class="num r">${o['Sells /mo']}</td><td class="num r">£${o['£ per month'].toLocaleString()}</td>
      <td class="pmc"><div class="pms">${PM_OPTIONS.map(x=>`<button type="button" class="pm${(fact.pm||[]).includes(x)?' on':''}" data-pm="${x}" data-asin="${o.ASIN}">${x}</button>`).join('')}</div>${(o.pot||[]).length?`<span class="sub">${o.pot.map(x=>`${escapeHtml(x.who)} ${x.pct}% → ${pct(x.roi)}`).join(' · ')}</span>`:''}</td>
      <td>${acts(o)}</td></tr>`;});}
  $('#leads').innerHTML=h+'</tbody>';
  const from=all.length?(view.page-1)*PAGE+1:0,to=Math.min(all.length,view.page*PAGE);
  let pg='';const win=[...new Set([1,2,view.page-1,view.page,view.page+1,pages-1,pages].filter(p=>p>=1&&p<=pages))].sort((a,b)=>a-b);
  let last=0;win.forEach(p=>{if(p-last>1)pg+='<span style="padding:0 4px;color:var(--faint)">…</span>';pg+=`<button data-pg="${p}" class="${p===view.page?'on':''}">${p}</button>`;last=p;});
  $('#pager').innerHTML=`<span>Showing ${from}–${to} of ${all.length}${view.sel.size?` · <b>${view.sel.size} selected</b>`:''}</span><div class="pg"><button data-pg="${view.page-1}" ${view.page<=1?'disabled':''}>‹</button>${pg}<button data-pg="${view.page+1}" ${view.page>=pages?'disabled':''}>›</button></div>`;
  $('#openSel').textContent=view.sel.size?`Open ${view.sel.size} selected in Keepa`:`Open this page in Keepa`;}
function bandOf(sc){return sc>=70?'hi':sc>=50?'md':sc>=30?'lo':'weak';}
function onTableClick(e){const cp=e.target.closest('button[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');return;}
  const b=e.target.closest('button');if(!b)return;const a=b.dataset.asin;if(!a)return;
  if(b.dataset.pm){const f=factGet(a);const pm=new Set(f.pm||[]);if(pm.has(b.dataset.pm))pm.delete(b.dataset.pm);else pm.add(b.dataset.pm);factSet(a,{pm:[...pm]});run();return;}
  const v=verdGet(a)||{};
  if(b.dataset.v){if(v.v===b.dataset.v)verdSet(a,null);else verdSet(a,{v:b.dataset.v,reason:b.dataset.v==='No'?v.reason||'':'',note:v.note||'',source:cur.key});}
  else if(b.dataset.r){verdSet(a,Object.assign(v,{reason:v.reason===b.dataset.r?'':b.dataset.r}));}
  renderTable();renderLog();}
function onTableChange(e){const s=e.target.dataset&&e.target.dataset.sel;if(s){if(e.target.checked)view.sel.add(s);else view.sel.delete(s);renderTable();}}
function onTableInput(e){const i=e.target;
  if(i.classList.contains('ysell')){clearTimeout(i._t);i._t=setTimeout(()=>{const v=parseFloat(i.value);factSet(i.dataset.asin,{sell:v>0?v:null});run();},700);return;}
  if(!i.classList.contains('vnote'))return;const v=verdGet(i.dataset.asin);if(v){v.note=i.value;verdSet(i.dataset.asin,v);}}

/* ============ outputs ============ */
function base(){return today()+'-RULE'+cur.rule+'-'+cur.key;}
function withVerdicts(out){const V=verdAll();return out.map(o=>{const v=V[o.ASIN];const c=Object.assign({},o);if(v){c['GOOD LEAD?']=v.v;c.WHY=[v.reason,v.note].filter(Boolean).join(' — ');}return c;});}
function dlSheet(){if(!result||!result.out.length){toast('Nothing on the sheet yet',true);return;}
  const hdr=cur.rule===1?R1_HDR:R2_HDR;downloadBlob(base()+'-REVIEW.xlsx',buildXlsx(hdr,withVerdicts(result.out),cur.name+' Rule '+cur.rule));toast(result.out.length+' leads on the sheet');}
function dlCsv(){if(!result||!result.out.length){toast('Nothing on the sheet yet',true);return;}download(base()+'-REVIEW.csv',rowsToCsv(cur.rule===1?R1_HDR:R2_HDR,withVerdicts(result.out)),'text/csv');}
function dlDropped(){if(!result){toast('Run something first',true);return;}download(base()+'-DROPPED.csv',droppedCsv(result),'text/csv');}
function openInKeepa(){if(!result){toast('Nothing to open',true);return;}
  const list=view.sel.size?[...view.sel]:visible().slice((view.page-1)*PAGE,view.page*PAGE).map(o=>o.ASIN);
  if(!list.length){toast('Nothing to open',true);return;}window.open(keepaLink(list,'2'),'_blank');}

/* ============ runs log (the 7-day count) ============ */
function renderLog(){const runs=runsAll().slice().reverse().slice(0,60);const V=verdAll();const el=$('#runLog');
  if(!runs.length){el.innerHTML='<div class="empty"><span>No runs yet. Hit Run on a brand and drop its exports — every run lands here with its lead count and what was marked.</span></div>';return;}
  const tot={runs:runs.length,leads:0,y:0,n:0,m:0};
  const rows=runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else m++;});
    tot.leads+=r.leads;tot.y+=y;tot.n+=n;tot.m+=m;
    return`<tr><td class="num">${fmtWhen(r.at)}</td><td>${escapeHtml(r.name)}<div class="chg">Rule ${r.rule} · ${(r.files||[]).length} file${(r.files||[]).length===1?'':'s'}${r.who?' · '+escapeHtml(r.who):''}</div></td><td class="num">${r.rowsIn.toLocaleString()}</td><td class="num">${r.leads}</td><td class="num">${r.new}</td><td class="num">${r.better}</td><td class="num">${r.worse}</td><td class="num">${r.gone}</td><td class="num pos">${y||'<span class=z>0</span>'}</td><td class="num neg">${n||'<span class=z>0</span>'}</td><td class="num">${m||'<span class=z>0</span>'}</td><td class="num">${r.leads?Math.round((y+n+m)/r.leads*100)+'%':'—'}</td></tr>`;}).join('');
  el.innerHTML=`<div class="logstats">${stat('Runs',tot.runs)}${stat('Leads produced',tot.leads)}${stat('Marked Yes',tot.y)}${stat('Marked No',tot.n)}${stat('Checked',tot.leads?Math.round((tot.y+tot.n+tot.m)/tot.leads*100)+'%':'—')}</div>
    <div class="tablewrap show"><div class="tablescroll"><table><thead><tr><th>When</th><th>Source</th><th class="r">Rows in</th><th class="r">Leads</th><th class="r">New</th><th class="r">Better</th><th class="r">Worse</th><th class="r">Gone</th><th class="r">Yes</th><th class="r">No</th><th class="r">Maybe</th><th class="r">Checked</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;}
function stat(k,v,sub){return`<div class="stat"><span class="k">${k}</span><span class="v">${typeof v==='number'?v.toLocaleString():v}</span>${sub?`<span class="sub">${escapeHtml(sub)}</span>`:''}</div>`;}
function exportLog(){const runs=runsAll(),V=verdAll();
  const hdr=['at','who','source','rule','files','rows_in','leads','new','better','worse','gone','yes','no','maybe'];
  const rows=runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else m++;});
    return{at:r.at,who:r.who||'',source:r.name,rule:r.rule,files:(r.files||[]).join(' | '),rows_in:r.rowsIn,leads:r.leads,new:r.new,better:r.better,worse:r.worse,gone:r.gone,yes:y,no:n,maybe:m};});
  download(today()+'-SOURCING-RUN-LOG.csv',rowsToCsv(hdr,rows),'text/csv');
  const F=factsAll();const fh=['asin','price_matched_at','va_sell','who','at'];
  download(today()+'-SOURCING-FACTS.csv',rowsToCsv(fh,Object.entries(F).map(([a,f])=>({asin:a,price_matched_at:(f.pm||[]).join(' | '),va_sell:f.sell||'',who:f.who||'',at:f.at||''}))),'text/csv');
  const vh=['asin','verdict','reason','note','who','source','at'];
  download(today()+'-SOURCING-VERDICTS.csv',rowsToCsv(vh,Object.entries(V).map(([a,v])=>({asin:a,verdict:v.v,reason:v.reason||'',note:v.note||'',who:v.who||'',source:v.source||'',at:v.at}))),'text/csv');}

/* ============ settings page ============ */
function renderSettings(){$('#meIn').value=me();paintFx();
  $('#reasonChips').innerHTML=noReasons().map(r=>`<span class="c">${escapeHtml(r)}<button data-rr="${escapeHtml(r)}" title="Remove">×</button></span>`).join('');
  renderDiscounts();
  $('#blacklist').innerHTML=Object.entries(BR.BLACKLIST).map(([a,w])=>`<div><span>${a}</span><span>${escapeHtml(w)}</span></div>`).join('')||'<div><span>empty</span><span></span></div>';
  const sz=Object.keys(localStorage).filter(k=>k.startsWith('bdl-sourcing')).reduce((s,k)=>s+(localStorage.getItem(k)||'').length,0);
  $('#dataInfo').textContent=`${srcAll().length} sources · ${runsAll().length} runs · ${Object.keys(verdAll()).length} verdicts · ${(sz/1024).toFixed(0)} KB in this browser`;}
function renderDiscounts(){const L=discAll();
  $('#discTbl').innerHTML=`<thead><tr><th>Name</th><th>Type</th><th class="r">%</th><th>Applies</th><th class="r">Min £</th><th>Note</th><th></th></tr></thead><tbody>`+L.map((e,i)=>`<tr class="${e.verified===false||(!e.pct&&!e.flat&&!e.business)?'dim':''}">
    <td><b>${escapeHtml(e.name)}</b></td><td><span class="ttag">${e.type}</span></td>
    <td class="r num">${e.business?'tiers':e.flat?'£'+e.flat+' flat':e.pct!=null?e.pct+'%':'?'}${e.salePct?`<span class="sub">sale ${e.salePct}%</span>`:''}${e.cap?`<span class="sub">cap £${e.cap}</span>`:''}</td>
    <td>${e.business?'<i class="ch info">OPEN LISTING</i>':e.fullPriceOnly?'<i class="ch warn">FULL PRICE ONLY</i>':'<i class="ch good">ANY PRICE</i>'}${e.verified===false?' <i class="ch">UNVERIFIED</i>':''}</td>
    <td class="r num">${e.minSpend?'£'+e.minSpend:''}</td><td class="dnote" title="${escapeHtml(e.note||'')}">${escapeHtml(e.note||'')}</td>
    <td><button class="btn ghost xs" data-di="${i}" title="Remove">×</button></td></tr>`).join('')+'</tbody>';}
function settingsInit(){
  $('#discTbl').addEventListener('click',e=>{const b=e.target.closest('button[data-di]');if(!b)return;const L=discAll();const x=L[+b.dataset.di];if(!confirm('Remove '+x.name+' from the discount list?'))return;L.splice(+b.dataset.di,1);discSave(L);renderDiscounts();if(result)run();});
  $('#dAdd').addEventListener('click',()=>{const name=$('#dName').value.trim();if(!name){toast('Name needed',true);return;}
    const e={name,type:$('#dType').value,verified:true};const p=parseFloat($('#dPct').value);if(p>0)e.pct=p;const sp=parseFloat($('#dSale').value);if(sp>0)e.salePct=sp;
    if($('#dFull').checked)e.fullPriceOnly=true;const mn=parseFloat($('#dMin').value);if(mn>0)e.minSpend=mn;const n=$('#dNote').value.trim();if(n)e.note=n;
    const L=discAll().filter(x=>x.name.toLowerCase()!==name.toLowerCase());L.push(e);L.sort((a,b)=>a.name.localeCompare(b.name));discSave(L);
    ['dName','dPct','dSale','dMin','dNote'].forEach(id=>$('#'+id).value='');$('#dFull').checked=false;renderDiscounts();toast(name+' added — live on the next run');if(result)run();});
  $('#dReset').addEventListener('click',()=>{if(!confirm('Reset the discount list to the 6 Sep reference (+ Gtech, Kenwood)? Your additions go.'))return;discReset();renderDiscounts();toast('Discount list reset');if(result)run();});
  $('#meIn').addEventListener('change',e=>{lsSet(ME_KEY,e.target.value.trim());toast('Saved — verdicts now carry '+(e.target.value.trim()||'no name'));});
  $('#fxIn').addEventListener('input',()=>{if(result)run();});$('#fxRefresh').addEventListener('click',()=>{try{localStorage.removeItem(FX_KEY);}catch(e){}loadFx();});
  $('#reasonAdd').addEventListener('click',()=>{const v=$('#reasonIn').value.trim();if(!v)return;const r=noReasons();if(!r.includes(v))r.push(v);lsSet(REASONS_KEY,r);$('#reasonIn').value='';renderSettings();});
  $('#reasonChips').addEventListener('click',e=>{const b=e.target.closest('button[data-rr]');if(!b)return;lsSet(REASONS_KEY,noReasons().filter(x=>x!==b.dataset.rr));renderSettings();});
  $('#dataExport').addEventListener('click',()=>{const o={};Object.keys(localStorage).filter(k=>k.startsWith('bdl-sourcing')).forEach(k=>o[k]=localStorage.getItem(k));download(today()+'-BDL-SOURCING-BACKUP.json',JSON.stringify(o),'application/json');});
  $('#dataImport').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await readFileText(f));if(!confirm('Replace this browser\'s sourcing data with the backup ('+Object.keys(o).length+' keys)?'))return;Object.entries(o).forEach(([k,v])=>{if(k.startsWith('bdl-sourcing'))localStorage.setItem(k,v);});toast('Imported — reloading');setTimeout(()=>location.reload(),600);}catch(err){toast('Not a backup file',true);}e.target.value='';});
  $('#dataReset').addEventListener('click',()=>{if(!confirm('Reset the brand list to the seed? Runs, history and verdicts are kept.'))return;localStorage.removeItem(SRC_KEY);renderSettings();renderList();toast('Brand list reset');});}

/* ============ wiring ============ */
function brandsInit(){renderList();renderLog();
  $('#brandTbl').addEventListener('click',onListClick);document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus();});
  $('#addBrand').addEventListener('click',()=>openEdit(null));
  $('#lq').addEventListener('input',e=>{lview.q=e.target.value;renderList();});
  $('#lMarket').addEventListener('change',e=>{lview.market=e.target.value;renderList();});
  $('#lRule').addEventListener('change',e=>{lview.rule=e.target.value;renderList();});
  document.querySelectorAll('#lSeg button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#lSeg button').forEach(x=>x.classList.remove('on'));b.classList.add('on');lview.seg=b.dataset.seg;renderList();}));
  $('#drawer .veil').addEventListener('click',closeDrawer);
  $('#backBtn').addEventListener('click',backToList);
  $('#runEdit').addEventListener('click',()=>openEdit(cur));$('#runHist').addEventListener('click',()=>openHistory(cur));
  $('#clearRun').addEventListener('click',()=>{clearRun();toast('Files cleared');});
  const zone=$('#dropAny'),inp=$('#fileIn');dz(zone,inp);
  inp.addEventListener('change',e=>{handleFiles(e.target.files);e.target.value='';});
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('over');handleFiles(e.dataTransfer.files);});
  $('#fileChips').addEventListener('click',e=>{const b=e.target.closest('button[data-rm]');if(b)removeFile(b.dataset.rm);});
  $('#asinCopy').addEventListener('click',e=>{const a=$('#asinBar')._all||[];copy(a.join(', '),a.length+' ASINs copied — paste into the UK Product Viewer',e.currentTarget,'Copied');});
  $('#asinOpen').addEventListener('click',()=>{const a=$('#asinBar')._all||[];if(!a.length){toast('Drop the Finder exports first',true);return;}window.open(keepaLink(a,'2'),'_blank');});
  $('#dlSheet').addEventListener('click',dlSheet);$('#dlCsv').addEventListener('click',dlCsv);$('#dlDropped').addEventListener('click',dlDropped);
  $('#copyKept').addEventListener('click',e=>{if(!result||!result.out.length){toast('Nothing to copy',true);return;}copy(result.out.map(o=>o.ASIN).join(', '),result.out.length+' ASINs copied',e.currentTarget,'Copied');});
  $('#openSel').addEventListener('click',openInKeepa);
  $('#leads').addEventListener('click',onTableClick);$('#leads').addEventListener('change',onTableChange);$('#leads').addEventListener('input',onTableInput);
  $('#pager').addEventListener('click',e=>{const b=e.target.closest('button[data-pg]');if(!b||b.disabled)return;view.page=parseInt(b.dataset.pg);renderTable();$('#leadTop').scrollIntoView({behavior:'smooth',block:'start'});});
  $('#fStatus').addEventListener('change',e=>{view.status=e.target.value;view.page=1;renderTable();});
  $('#fMarket').addEventListener('change',e=>{view.market=e.target.value;view.page=1;renderTable();});
  $('#fRoi').addEventListener('input',e=>{view.minRoi=e.target.value;view.page=1;renderTable();});
  $('#fScore').addEventListener('input',e=>{view.minScore=e.target.value;view.page=1;renderTable();});
  $('#fQ').addEventListener('input',e=>{view.q=e.target.value;view.page=1;renderTable();});
  $('#fHideNo').addEventListener('change',e=>{view.hideNo=e.target.checked;view.page=1;renderTable();});
  $('#logExport').addEventListener('click',exportLog);
  $('#rulesToggle').addEventListener('click',()=>{const o=$('#rulesBox');const open=o.classList.toggle('show');$('#rulesToggle').textContent=open?'Hide the rules':'Show the rules';});
  settingsInit();renderSettings();loadFx();}
