/* BDL Sourcing — the BRANDS page (b10): the list, the run view, the queue, verdicts, blacklists, the runs log, settings.
   Rule maths lives in rule1.js / rule2.js / rule4.js; the compare lives in queue.js; storage in sources.js + cloud.js.
   This file only moves data between the page and those. */
const SLOTS=['viewer','UK','DE','FR','IT','ES'];
const FX_KEY='bdl-sourcing-fx';
const PAGE=50;
let cur=null,result=null,fx={rate:BR.FX_FALLBACK,src:'fallback'},lastSig='',blPick=null;
const touched=new Set();   /* rows judged this sitting stay visible in "To review" so the reason chips can be picked */
const files={viewer:null,UK:null,DE:null,FR:null,IT:null,ES:null,one:null};
const view={status:'REVIEW',market:'ALL',q:'',hideNo:false,sort:'default',page:1,sel:new Set()};
const lview={q:'',market:'ALL',rule:'ALL',owner:'ALL',seg:'all'};
const RULE_LABEL={1:'buy UK/EU · sell UK',2:'high-ticket',3:'grocery · S&S / Business'};
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
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  ban:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>'};
const AV_COLORS=['#6e7bff','#36d6a4','#f76a83','#fbbf24','#9a7bff','#2aa6ff','#f97316','#22b888'];
function avatar(s,big){const c=AV_COLORS[[...s.key].reduce((a,ch)=>a+ch.charCodeAt(0),0)%AV_COLORS.length];
  return`<span class="avatar" style="background:${c}">${escapeHtml((s.name||'?').replace(/^Suz · /,'').slice(0,2).toUpperCase())}</span>`;}
const closeMenus=()=>document.querySelectorAll('.menu.open').forEach(m=>m.classList.remove('open'));

/* ============ identity ============ */
function whoPaint(){['#whoSel','#meIn'].forEach(id=>{const el=$(id);if(el&&el.value!==me())el.value=me();});}
function whoSet(v){lsSet(ME_KEY,v);whoPaint();renderList();if(result)renderTable();toast(v?'You are '+v+' — everything you mark carries your name':'No name set — nothing can be marked until you pick one',!v);}
function needMe(){if(me())return true;toast('Pick who you are first (top right)',true);const s=$('#whoSel');if(s){s.focus();s.classList.add('shake');setTimeout(()=>s.classList.remove('shake'),600);}return false;}

/* ============ list view ============ */
function weekAgo(){return Date.now()-7*864e5;}
function toReviewCount(run){if(!run)return 0;const V=verdAll(),B=blAll();return(run.asins||[]).filter(a=>!V[a]&&!B[a]).length;}
function renderKpis(){const all=srcAll(),runs=runsAll(),V=verdAll();
  const due=all.filter(s=>dueState(s).due).length;
  const wk=runs.filter(r=>new Date(r.at).getTime()>=weekAgo());
  const leads=wk.reduce((s,r)=>s+r.leads,0);
  const asins=new Set();wk.forEach(r=>(r.asins||[]).forEach(a=>asins.add(a)));
  let checked=0;asins.forEach(a=>{if(V[a])checked++;});
  const tr=all.filter(s=>s.status!=='paused').reduce((n,s)=>n+toReviewCount(runLast(s.key)),0);
  const k=(v,l,cls,ic)=>`<div class="kpi"><span class="ki ${cls||''}">${ic}</span><div><div class="kv">${v}</div><div class="kl">${l}</div></div></div>`;
  $('#bKpis').innerHTML=k(all.filter(s=>s.status!=='paused').length,'Active + testing','',ICONS.cal)+k(due,'Due today',due?'amber':'jade',ICONS.run)+k(tr.toLocaleString(),'To review',tr?'iris':'jade',ICONS.eye)+k(wk.length,'Runs this week','',ICONS.hist)+k(leads.toLocaleString(),'Leads this week','jade',ICONS.play)+k(asins.size?Math.round(checked/asins.size*100)+'%':'—','Checked this week',asins.size&&checked/asins.size<.5?'coral':'jade',ICONS.edit);}
function renderList(){renderKpis();renderApprovals();const q=lview.q.toLowerCase();
  const rows=srcSorted().filter(s=>{
    if(lview.seg==='due'&&!dueState(s).due)return false;
    if(lview.seg==='paused'&&s.status!=='paused')return false;
    if(lview.seg==='mine'&&!(me()&&(s.owner===me()||(s.inProgress&&lockFresh(s)&&s.inProgress.who===me()))))return false;
    if(lview.market!=='ALL'&&!s.markets.includes(lview.market))return false;
    if(lview.rule!=='ALL'&&String(s.rule)!==lview.rule)return false;
    if(lview.owner!=='ALL'&&(s.owner||'VAs')!==lview.owner)return false;
    if(q&&!((s.name+' '+(s.note||'')).toLowerCase().includes(q)))return false;return true;});
  const tb=$('#brandTbl');
  if(!rows.length){tb.innerHTML=`<tbody><tr><td colspan="8" style="text-align:center;color:var(--faint);padding:22px">${lview.seg==='due'?'Nothing due — everything has been run inside its cadence.':lview.seg==='mine'?(me()?'Nothing is yours yet — Jack sets the owner in Edit.':'Pick who you are (top right) to see your list.'):'Nothing here.'}</td></tr></tbody>`;return;}
  const rowHtml=s=>{const d=dueState(s),last=runLast(s.key),nx=nextRun(s),tok=tokenEstimate(s),lk=lockFresh(s)?s.inProgress:null,tr=toReviewCount(last);
    const nextTxt=d.due?'Due now':nx?fmtWhen(nx.toISOString()).replace(' 07:00',''):(s.status==='paused'?'Paused':'—');
    return`<tr class="${s.status==='paused'?'paused':''}" data-key="${s.key}">
      <td class="namec"><div class="brandcell">${avatar(s)}<div class="ntext"><div class="nline"><span class="bname">${escapeHtml(s.name)}</span><span class="rl" title="${RULE_LABEL[s.rule]||''}">Rule ${s.rule}</span></div><span class="note" title="${escapeHtml(s.note||'')}">${escapeHtml(s.note||(s.type==='filter'?'Saved Keepa filter':'Brand run · UK sell side'))}</span></div></div></td>
      <td class="ownc">${escapeHtml(s.owner||'VAs')}</td>
      <td><div class="flags" title="${s.markets.join(' · ')}">${s.markets.map(m=>`<span class="f">${FLAG[m]}</span>`).join('')}</div></td>
      <td class="stc"><span class="st ${s.status}"><i></i>${STATUS_LABEL[s.status]||s.status}</span>${lk?`<div class="inprog" title="${escapeHtml(lk.who)} opened this ${fmtWhen(lk.at)} and is working through it"><i></i>${escapeHtml(lk.who)} on it · ${new Date(lk.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>`:''}</td>
      <td class="cadc">${CADENCE_LABEL[s.cadence]||s.cadence}</td>
      <td class="lastc" title="${last?`${last.leads} leads · ${last.new} new · ${last.better} better · ${last.worse} worse · ${last.gone} gone`:''}">${last?`<span class="l1">${fmtWhen(last.at)}${last.who?` <span class="who">${escapeHtml(last.who)}</span>`:''}</span><span class="l2">${last.leads} leads · <span class="tr ${tr?'':'zero'}">${tr?tr+' to review':'all reviewed'}</span></span>`:`<span class="l1 dim">Not run yet</span>`}</td>
      <td class="nextc"><span class="nx ${d.due?'now':''}">${nextTxt}</span><span class="l2" title="Keepa API cost if this ran automatically — a manual export costs 0">~${tok.toLocaleString()} tokens</span></td>
      <td class="actc"><div class="acts">${finderLink(s)?`<a class="ib" href="${finderLink(s)}" target="_blank" rel="noopener" title="${s.link?'Open the saved Keepa filter':'Open the generated Keepa filter (edit to paste your own)'}">${ICONS.ext}</a>`:`<span class="ib nolink" title="No Keepa link saved yet — Edit and paste it">?</span>`}<button class="btn run xs" data-act="run" ${s.status==='paused'?'disabled':''} title="${lk&&lk.who!==me()?'Someone else has it open — you can still join':''}">${ICONS.run}${lk&&lk.who!==me()?'Join':'Run'}</button><button class="ib" data-act="edit" title="Edit">${ICONS.edit}</button>
        <div class="menu"><button class="ib" data-act="menu" aria-label="More">⋮</button>
          <div class="pop"><button data-act="history">${ICONS.hist}History</button><button data-act="pause">${s.status==='paused'?ICONS.play:ICONS.pause}${s.status==='paused'?'Set active':'Pause'}</button>${lk?`<button data-act="unlock">${ICONS.eye}Clear "on it"</button>`:''}<button data-act="delete" class="danger">${ICONS.trash}Delete</button></div></div></div></td></tr>`;};
  const head=`<thead><tr><th>Name</th><th>Owner</th><th>Buy from</th><th>Status</th><th>Cadence</th><th>Last run</th><th>Next run</th><th></th></tr></thead>`;
  const filters=rows.filter(s=>s.type==='filter'),brands=rows.filter(s=>s.type!=='filter');
  const group=(label,list)=>list.length?`<tr class="grp"><td colspan="8"><span class="gl">${label}</span><span class="gn">${list.length}</span></td></tr>`+list.map(rowHtml).join(''):'';
  tb.innerHTML=head+'<tbody>'+group('Saved filters',filters)+group('Brands',brands)+'</tbody>';}
function onListClick(e){const b=e.target.closest('button[data-act]');if(!b){closeMenus();return;}
  const tr=b.closest('tr'),key=tr&&tr.dataset.key,s=key&&srcGet(key);if(!s)return;const act=b.dataset.act;
  if(act==='menu'){const m=b.closest('.menu');const open=m.classList.contains('open');closeMenus();if(!open)m.classList.add('open');e.stopPropagation();return;}
  closeMenus();
  if(act==='run')openRun(key);
  else if(act==='edit')openEdit(s);
  else if(act==='history')openHistory(s);
  else if(act==='unlock'){srcUnlock(s);renderList();toast('Cleared');}
  else if(act==='pause'){s.status=s.status==='paused'?'active':'paused';s.paused=s.status==='paused';srcSave(s);renderList();toast(s.name+(s.status==='paused'?' paused':' set active'));}
  else if(act==='delete'){if(!confirm('Delete '+s.name+' from the list for everyone? Its run history is kept.'))return;srcRemove(key);renderList();toast(s.name+' deleted');}}
/* brand-blacklist requests waiting on Jack — everyone sees them, only Jack gets the buttons */
function renderApprovals(){const el=$('#approvals');if(!el)return;const P=Object.entries(bbAll()).filter(([k,r])=>r.status==='pending');
  if(!P.length){el.hidden=true;el.innerHTML='';return;}el.hidden=false;
  el.innerHTML=`<div class="ah">${ICONS.ban} ${P.length} brand blacklist request${P.length===1?'':'s'} ${isJack()?'waiting for you':'waiting for Jack'}</div>`+P.map(([k,r])=>`<div class="ar" data-bb="${escapeHtml(k)}"><b>${escapeHtml(r.display||k)}</b><span class="why">${escapeHtml(r.reason)}</span><span class="by">${escapeHtml(r.by||'?')} · ${fmtWhen(r.at)}</span>${isJack()?`<button class="btn primary xs" data-dec="approved">Approve — drop the brand everywhere</button><button class="btn ghost xs" data-dec="rejected">Reject</button>`:'<span class="wait">pending</span>'}</div>`).join('');}
function onApprovalClick(e){const b=e.target.closest('button[data-dec]');if(!b)return;if(!isJack()){toast('Only Jack approves brand blacklists',true);return;}
  const k=b.closest('[data-bb]').dataset.bb;bbDecide(k,b.dataset.dec);renderList();renderSettings();if(result)run();toast(b.dataset.dec==='approved'?k+' blacklisted everywhere':'Request rejected');}

/* ============ drawer: edit / add / history / brand blacklist ============ */
function openDrawer(html){$('#drawerBody').innerHTML=html;$('#drawer').classList.add('open');}
function closeDrawer(){$('#drawer').classList.remove('open');}
function openEdit(s){const isNew=!s;s=s||{key:'',name:'',type:'brand',rule:1,markets:['UK'],cadence:'2 days',note:'',brands:[],link:'',status:'testing',owner:me()||'VAs'};
  openDrawer(`<h3>${isNew?'Add brand / filter':'Edit '+escapeHtml(s.name)}</h3><p class="dsub">${isNew?'A brand or saved Keepa filter we want to keep running.':'Changes apply to the next run, for everyone. History is untouched.'}</p>
  <div class="form">
    <div class="field"><label>Name</label><input class="full" id="eName" value="${escapeHtml(s.name)}" placeholder="Corsair" autocomplete="off"></div>
    <div class="field"><label>Type</label><select class="full" id="eType"><option value="brand"${s.type==='brand'?' selected':''}>Brand</option><option value="filter"${s.type==='filter'?' selected':''}>Saved Keepa filter</option></select></div>
    <div class="field"><label>Rule</label><select class="full" id="eRule"><option value="1"${s.rule===1?' selected':''}>Rule 1 · buy UK/EU, sell UK (Finder per market + UK Viewer)</option><option value="2"${s.rule===2?' selected':''}>Rule 2 · high-ticket UK (one Finder export)</option><option value="3"${s.rule===3?' selected':''}>Rule 3 · grocery / S&amp;S / Business UK (one Finder export, Rule 4 VAT)</option></select><p class="hintline">Rule 1 needs the UK Product Viewer stage; Rules 2 and 3 take one UK export and are the same maths.</p></div>
    <div class="field"><label>Buy from</label><div class="mks">${MARKETS.map(m=>`<label><input type="checkbox" value="${m}"${s.markets.includes(m)?' checked':''}>${FLAG[m]} ${m}</label>`).join('')}</div></div>
    <div class="field"><label>Owner — whose search this is</label><select class="full" id="eOwner">${['Jack','Mera','Suz','VAs'].map(u=>`<option${(s.owner||'VAs')===u?' selected':''}>${u}</option>`).join('')}</select></div>
    <div class="field"><label>Cadence</label><select class="full" id="eCad">${Object.keys(CADENCE_LABEL).map(c=>`<option value="${c}"${s.cadence===c?' selected':''}>${CADENCE_LABEL[c]}</option>`).join('')}</select></div>
    <div class="field"><label>Brand names as Keepa spells them</label><input class="full" id="eBrands" value="${escapeHtml((s.brands||[]).join(', '))}" placeholder="Logitech, Logitech G, Logitech for Creators"><p class="hintline">Keepa's brand filter is exact. Leave blank to use the name. Filters can leave this empty.</p></div>
    <div class="field"><label>Keepa filter link</label><input class="full" id="eLink" value="${escapeHtml(s.link||'')}" placeholder="paste a keepa.com/#!finder/… link, or leave blank to generate one"><p class="hintline">One link runs on every marketplace — switch the locale in Keepa, run, export.</p></div>
    <div class="field"><label class="chk"><input type="checkbox" id="eVat0"${s.vat0?' checked':''}> Every product on this filter is 0% VAT (tea &amp; coffee)</label><p class="hintline">Rule 4 then works every row at 0% without needing the keyword lists. A VA's 20% click on a row still wins.</p></div>
    <div class="field"><label>Note</label><textarea id="eNote">${escapeHtml(s.note||'')}</textarea></div>
    ${!isNew?`<p class="hintline">Floors (${floorsLabel(s.filters)||'none'}) are set on the run screen and saved with this source.</p>`:''}
    <div class="field"><label>Status</label><select class="full" id="eStatus"><option value="active"${s.status==='active'?' selected':''}>Active — runs on its cadence</option><option value="testing"${s.status==='testing'?' selected':''}>Testing — we're trying it</option><option value="paused"${s.status==='paused'?' selected':''}>Paused — greyed out, not due</option></select></div>
  </div>
  <div class="dfoot"><button class="btn ghost" id="dCancel">Cancel</button><button class="btn primary" id="dSave"><span class="lab">${isNew?'Add':'Save'}</span></button></div>`);
  $('#dCancel').addEventListener('click',closeDrawer);
  $('#eType').addEventListener('change',e=>{if(e.target.value==='brand')$('#eRule').value='1';else if($('#eRule').value==='1')$('#eRule').value='2';});
  $('#dSave').addEventListener('click',()=>{const name=$('#eName').value.trim();if(!name){toast('Name needed',true);return;}
    const markets=[...document.querySelectorAll('#drawerBody .mks input[type=checkbox][value]:checked')].map(c=>c.value);if(!markets.length){toast('Tick at least one marketplace',true);return;}
    const type=$('#eType').value,rule=parseInt($('#eRule').value);const key=isNew?srcKeyFor(name):s.key;if(isNew&&srcGet(key)){toast(name+' is already in the list',true);return;}
    if(rule!==1&&markets.some(m=>m!=='UK')){toast('Rules 2 and 3 are UK only — untick the EU markets or pick Rule 1',true);return;}
    const out=Object.assign({},s,{key,name,type,rule,markets,cadence:$('#eCad').value,owner:$('#eOwner').value,note:$('#eNote').value.trim(),status:$('#eStatus').value,paused:$('#eStatus').value==='paused',
      brands:$('#eBrands').value.split(',').map(x=>x.trim()).filter(Boolean),link:$('#eLink').value.trim(),vat0:$('#eVat0').checked});
    srcSave(out);closeDrawer();renderList();toast(isNew?name+' added':'Saved');if(cur&&cur.key===key){cur=out;paintRunHead();renderGuide();}});
  setTimeout(()=>$('#eName').focus(),50);}
function openHistory(s){const runs=runsFor(s.key).slice().reverse(),V=verdAll();
  openDrawer(`<h3>${escapeHtml(s.name)} · history</h3><p class="dsub">${runs.length} run${runs.length===1?'':'s'} · shared</p>
    <div class="hist">${runs.length?runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;});
      return`<div class="h"><span class="w">${fmtWhen(r.at)}${r.who?'<br>'+escapeHtml(r.who):''}</span><span class="l"><b>${r.leads}</b> leads · ${r.new} new · ${r.better} better · ${r.worse} worse · ${r.gone} gone${r.blacklisted?' · '+r.blacklisted+' blacklisted':''}</span><span class="v">${y}Y ${n}N ${m}M</span></div>`;}).join(''):'<div class="empty"><span>Not run yet.</span></div>'}</div>
    <div class="dfoot"><button class="btn ghost danger" id="dForget">Forget history</button><button class="btn ghost" id="dClose">Close</button></div>`);
  $('#dClose').addEventListener('click',closeDrawer);
  $('#dForget').addEventListener('click',()=>{if(!confirm('Forget every saved run and the compare baseline for '+s.name+' — for everyone? The next run shows everything as NEW. Verdicts are kept.'))return;histForget(s.key);runsForget(s.key);closeDrawer();renderList();renderLog();toast('History cleared for '+s.name);});}
function openBrandBlacklist(brand,fromAsin){if(!needMe())return;
  openDrawer(`<h3>Blacklist a brand</h3><p class="dsub">${isJack()?'You are Jack — this applies straight away.':'Goes to Jack for approval. Until then the brand keeps showing with a PENDING chip.'}</p>
  <div class="form">
    <div class="field"><label>Brand as Keepa spells it</label><input class="full" id="bbBrand" value="${escapeHtml(brand||'')}" autocomplete="off"></div>
    <div class="field"><label>Reason (required)</label><textarea id="bbWhy" placeholder="e.g. every listing is gated · brand files IP claims · all EU plug"></textarea></div>
    ${fromAsin?`<p class="hintline">Started from ${fromAsin}. The ASIN itself is not blacklisted by this — use ⃠ on the row for that.</p>`:''}
  </div>
  <div class="dfoot"><button class="btn ghost" id="dCancel">Cancel</button><button class="btn primary" id="dSave"><span class="lab">${isJack()?'Blacklist now':'Send to Jack'}</span></button></div>`);
  $('#dCancel').addEventListener('click',closeDrawer);
  $('#dSave').addEventListener('click',()=>{const b=$('#bbBrand').value.trim(),w=$('#bbWhy').value.trim();if(!b){toast('Brand needed',true);return;}if(!w){toast('A reason is required',true);return;}
    bbRequest(b,w,isJack());closeDrawer();renderList();renderSettings();if(result)run();toast(isJack()?b+' blacklisted everywhere':'Sent to Jack — '+b+' shows PENDING until he decides');});
  setTimeout(()=>$('#bbWhy').focus(),50);}

/* ============ run view ============ */
async function openRun(key){const s=srcGet(key);if(!s)return;
  if(cur&&cur.key!==key){srcUnlock(cur);clearRun();}cur=s;touched.clear();blPick=null;
  if(!(lockFresh(s)&&s.inProgress.who===me()))srcLock(cur);
  $('#viewList').hidden=true;$('#viewRun').hidden=false;paintRunHead();paintSlots();paintFloors();renderGuide();
  $('#sumEmpty').textContent='Loading the shared compare baseline…';
  await cloudPullLeads(key);run();window.scrollTo({top:0,behavior:'smooth'});}
function backToList(){if(cur&&cur.inProgress&&cur.inProgress.who===me())srcUnlock(cur);$('#viewRun').hidden=true;$('#viewList').hidden=false;renderList();}
function paintRunHead(){const s=cur;$('#runAvatar').innerHTML=avatar(s);$('#runName').textContent=s.name;
  $('#runMk').innerHTML=s.markets.map(m=>`<i class="mk ${m==='UK'?'uk':''}">${m}</i>`).join(' ');
  const lk=lockFresh(s)&&s.inProgress.who!==me()?` · <span class="lock">${escapeHtml(s.inProgress.who)} is also on this (since ${new Date(s.inProgress.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})})</span>`:'';
  $('#runMeta').innerHTML=`${escapeHtml(s.owner||'VAs')} · Rule ${s.rule} · ${RULE_LABEL[s.rule]||''} · ${STATUS_LABEL[s.status]||''} · ${CADENCE_LABEL[s.cadence]||s.cadence} · ~${tokenEstimate(s).toLocaleString()} Keepa tokens if automated, 0 by export`+(s.note?' · '+escapeHtml(s.note):'')+lk;
  const r1=s.rule===1;
  $('#step1Title').textContent=r1?'Drop the Product Finder exports':"Drop this morning's export";
  $('#step1Sub').textContent=r1?`Finder export for each of ${s.markets.join(' · ')}, then the UK Product Viewer. Any order.`:'UK Product Finder, all columns. One file.';
  const link=finderLink(s);
  if(!link){$('#keepaRow').innerHTML=`<span class="nolinkmsg">No Keepa link saved for this yet — <button type="button" class="linkbtn" id="keepaEdit">Edit</button> and paste the Finder link. Exports can still be dropped below.</span>`;$('#keepaEdit').addEventListener('click',()=>openEdit(cur));return;}
  $('#keepaRow').innerHTML=`<span class="lab">Open in Keepa:</span>`+(r1?s.markets.map(m=>`<a href="${link}" target="_blank" rel="noopener" title="Opens the filter — set Keepa to ${m}, run, export">${FLAG[m]} ${m}${ICONS.ext}</a>`).join(''):`<a href="${link}" target="_blank" rel="noopener">${FLAG.UK} the filter${ICONS.ext}</a>`)+(s.link?'':`<span class="lab" style="margin-left:6px">generated from the brand name — edit to paste your own</span>`);}
/* floors: the inputs ARE this source's floors — saved as you type, shared, applied to every run of it */
function paintFloors(){if(!cur)return;const f=cur.filters||{};const r1=cur.rule===1;
  FLOORS.forEach(([k,l,scope])=>{const el=$('#fl_'+k);if(!el)return;el.parentElement.hidden=(scope==='r2'&&r1);if(document.activeElement!==el)el.value=f[k]==null?'':f[k];});
  const lab=floorsLabel(f);$('#floorSaved').innerHTML=lab?`<b>Floors for ${escapeHtml(cur.name)}:</b> ${escapeHtml(lab)} · saved for everyone`:`No floors set for ${escapeHtml(cur.name)} — the rule's own limits apply. Type a number and it is saved for everyone who runs this.`;
  $('#floorClear').hidden=!lab;}
let floorT=null;
function onFloorInput(){if(!cur)return;clearTimeout(floorT);floorT=setTimeout(()=>{const f={};FLOORS.forEach(([k])=>{const el=$('#fl_'+k);if(!el)return;const v=el.value.trim();if(v!==''&&!isNaN(+v))f[k]=+v;});
  if(Object.keys(f).length)cur.filters=f;else delete cur.filters;srcSave(cur);paintFloors();lastSig='';run();toast('Floors saved for '+cur.name);},650);}
/* the step strip: exactly what to do next, with ticks as it happens */
function renderGuide(){const g=$('#guide');if(!g||!cur)return;const r1=cur.rule===1;
  const have=MARKETS.filter(m=>files[m]).length,want=r1?cur.markets.filter(m=>m!=='UK'||!files.viewer).length:0;const anyFinder=MARKETS.some(m=>files[m]);
  const bar=$('#asinBar'),merged=(bar&&bar._all)?bar._all.length:0;
  const rev=result?result.out.filter(o=>o.QUEUE).length:0;
  let steps;
  if(r1)steps=[
    ['Open the Keepa filter for each market',`${cur.markets.map(m=>FLAG[m]).join(' ')} · switch Keepa's locale, run it`,anyFinder],
    ['Export CSV from each',`all columns · ${cur.markets.length} file${cur.markets.length===1?'':'s'}`,anyFinder],
    ['Drop them here',`${have} of ${cur.markets.length} in`,have>=cur.markets.length&&have>0],
    ['Open the UK Product Viewer with the ASINs',merged?`${merged.toLocaleString()} ASINs merged — one click below`:'the app merges and de-dupes them',!!files.viewer],
    ['Export ALL columns from the Viewer','this is the UK selling side: sales, fees, offers',!!files.viewer],
    ['Drop the Viewer export here','leads appear',!!result],
    ['Review what needs a look',result?`${rev} to review`:'',!!result&&rev===0]];
  else steps=[
    ['Open the Keepa filter',finderLink(cur)?FLAG.UK+' UK':'no link saved yet — Edit and paste it',!!files.one],
    ['Export CSV — all columns','one file',!!files.one],
    ['Drop it here','leads appear',!!result],
    ['Review what needs a look',result?`${rev} to review`:'',!!result&&rev===0]];
  let next=steps.findIndex(s=>!s[2]);
  g.innerHTML=steps.map((s,i)=>`<div class="gs ${s[2]?'done':i===next?'now':''}"><span class="gn">${s[2]?'✓':i+1}</span><div><div class="gt">${escapeHtml(s[0])}</div>${s[1]?`<div class="gd">${escapeHtml(s[1])}</div>`:''}</div></div>`).join('');}
function sig(){return SLOTS.map(k=>files[k]?files[k].name+':'+files[k].rows.length:'').join('|')+'|'+(files.one?files.one.name+':'+files.one.rows.length:'');}
async function handleFiles(list){const arr=[...list];if(!arr.length||!cur)return;const notes=[];
  for(const file of arr){let d;try{d=describeExport(parseCSV(await readFileText(file)));}catch(e){d=null;}
    if(!d){notes.push(file.name+': no data rows');continue;}
    const f={name:file.name,rows:d.rows,hasFees:d.hasFees,asins:d.asins,domain:d.domain,hasSince:d.hasSince};
    if(!d.full&&!d.hasFees){notes.push(file.name+': not a full-column export — needs Title and the demand columns at minimum');continue;}
    if(cur.rule!==1){if(d.domain&&d.domain!=='UK')notes.push(file.name+': this is a '+d.domain+' export — Rule '+cur.rule+' is UK only');files.one=f;continue;}
    if(d.domain&&d.domain!=='UK'){files[d.domain]=f;continue;}
    /* UK: Keepa names the file — ProductViewer is the sell side, ProductFinder is the UK buy list.
       Unnamed files fall back to: the biggest UK file with the fee columns is the sell side. */
    const nm=file.name.toLowerCase(),v=files.viewer;
    if(nm.includes('productviewer'))files.viewer=f;
    else if(nm.includes('productfinder'))files.UK=f;
    else if(!v)files.viewer=f;
    else if(f.hasFees&&(!v.hasFees||f.rows.length>=v.rows.length)){files.UK=v;files.viewer=f;}
    else files.UK=f;}
  touched.clear();paintSlots();warn(notes);run();}
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
  else if(bar)bar._all=[];
  const since=files.viewer?files.viewer.hasSince:(files.one?files.one.hasSince:true);$('#sinceNote').hidden=since;}
function clearRun(){SLOTS.forEach(k=>files[k]=null);files.one=null;result=null;lastSig='';$('#fileIn').value='';view.sel.clear();view.page=1;touched.clear();blPick=null;
  warn([]);$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;if(cur){paintSlots();renderGuide();}}

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
function run(){if(!cur)return;
  /* UK-only brand with just the Finder export: the Finder carries the same columns, so it IS the sell side */
  if(cur.rule===1&&!files.viewer&&files.UK&&files.UK.hasFees&&cur.markets.every(m=>m==='UK')){files.viewer=files.UK;files.UK=null;paintSlots();}
  const ready=cur.rule===1?!!files.viewer:!!files.one;
  if(!ready){result=null;$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;
    $('#sumEmpty').textContent=cur.rule===1?(MARKETS.some(m=>files[m])?'Finder exports in — drop the UK Product Viewer export and the leads appear here.':'Drop the exports and the numbers appear here.'):'Drop the export and the numbers appear here.';renderGuide();return;}
  const prevMap=baselineOf(leadMap(cur.key));
  let R;
  if(cur.rule===1){R=rule1Compute(files,cur.name,rate(),null);R.rule=1;R.out.forEach(o=>{if(!o.Brand)o.Brand=cur.name;});}
  else{/* a tea & coffee filter: every row is 0% unless it reads like an appliance (machine, grinder…) or a VA has set it */
    const vf=cur.vat0?((row,fact)=>{if(fact&&fact.vat!=null&&fact.vat!=='')return vatFor(row,fact);
      const text=((row.Title||'')+' | '+(row['Categories: Sub']||'')).toLowerCase();if(r4has(text,vat0Words().not))return{rate:R4.STANDARD,why:'20% — reads like an appliance, not the drink',src:'rule'};
      return{rate:0,why:'0% VAT — everything on this filter is tea / coffee',src:'source'};}):vatFor;
    R=rule2Compute(files.one.rows,factsAll(),{vatFor:vf,rule:cur.rule});R.rule=cur.rule;
    R.dropped=R.all.filter(o=>!o.kept).map(o=>[o.ASIN,o.Product,`needs ${o['Needs % off']}% off Amazon to reach ${R2.TARGET_ROI}% ROI (brand allows ${o['Brand discount %']||R2.DEFAULT_ALLOW}%)`]);
    R.reasons={'Needs more discount than the brand gives':R.dropped.length};}
  /* the central blacklists: an ASIN, or an approved brand, never shows — on any rule, any run, whatever Keepa filter found it */
  const B=blAll(),bl=[];R.out=R.out.filter(o=>{const b=B[o.ASIN];const bb=bbStatusFor(o.Brand||(cur.type==='brand'?cur.name:''));
    if(b){bl.push([o.ASIN,o.Title||o.Product||'','BLACKLISTED · '+b.reason+(b.note?' — '+b.note:'')+(b.who?' · '+b.who:'')]);return false;}
    if(bb==='approved'){bl.push([o.ASIN,o.Title||o.Product||'','BRAND BLACKLISTED · '+(o.Brand||cur.name)]);return false;}return true;});
  R.blacklisted=bl;R.dropped=bl.concat(R.dropped||[]);if(bl.length)R.reasons['Blacklisted']=bl.length;
  /* this source's own floors — the customisable Filter & Sort, saved on the source so it is the same for everyone */
  const fl=[];R.out=R.out.filter(o=>{const why=failsFloor(o,cur.filters,R.rule);if(why){fl.push([o.ASIN,o.Title||o.Product||'','Below the floors set for '+cur.name+': '+why]);return false;}return true;});
  if(fl.length){R.dropped=fl.concat(R.dropped);R.reasons['Below the floors set for '+cur.name]=fl.length;}R.floored=fl.length;
  if(R.rule!==1)R.out.forEach((o,i)=>o['#']=i+1);
  R.gone=applyQueue(R.out,R.rule,prevMap,verdAll());
  const stamps=Object.values(prevMap).map(p=>p.stamp).filter(Boolean).sort();R.prevStamp=stamps.length?stamps[stamps.length-1]:null;
  result=R;
  const s=sig();if(s!==lastSig){lastSig=s;view.page=1;view.sel.clear();logRun();}
  renderResults();renderGuide();}
function logRun(){const R=result,c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};R.out.forEach(o=>c[o.STATUS]++);
  const names=cur.rule===1?SLOTS.filter(k=>files[k]).map(k=>files[k].name):[files.one.name];
  const rowsIn=cur.rule===1?files.viewer.rows.length:files.one.rows.length;
  runSave({at:nowIso(),day:today(),source:cur.key,name:cur.name,rule:cur.rule,files:names,rowsIn,leads:R.out.length,new:c.NEW,better:c.BETTER,worse:c.WORSE,gone:R.gone.length,blacklisted:R.blacklisted.length,asins:R.out.map(o=>o.ASIN),who:me()});
  leadSave(cur.key,nextLeadMap(R.out,R.rule,leadMap(cur.key)));renderLog();}

/* ============ results ============ */
function sumTile(v,l,cls){return`<div class="sum ${cls||''}"><span class="sv">${typeof v==='number'?v.toLocaleString():v}</span><span class="sl">${l}</span></div>`;}
function renderResults(){const R=result,st=R.st,out=R.out;$('#sumEmpty').hidden=true;$('#results').hidden=false;
  const rev=out.filter(o=>o.QUEUE).length;let tiles;
  if(cur.rule===1){const cnt=k=>out.filter(o=>o['Buy market']===k).length,euN=out.length-cnt('UK');
    tiles=sumTile(st.viewer,'in the Viewer')+sumTile(st.demand,'sell 10+/month in the UK')+sumTile(st.buy,'Amazon selling it')+sumTile(out.length,'leads','lead')
      +sumTile(rev,'to review',rev?'cool':'')+sumTile(out.filter(o=>o['ROI %']>=10).length,'ROI 10%+')+sumTile(cnt('UK'),'buy from UK')+sumTile(euN,euN?'buy from EU · '+['DE','FR','IT','ES'].map(k=>cnt(k)?k+' '+cnt(k):'').filter(Boolean).join(' '):'buy from EU','warm');}
  else{const m=out.reduce((s,o)=>s+o['£ per month'],0);
    tiles=sumTile(st.rows,'in the export')+sumTile(st.priced,'Amazon selling it')+sumTile(st.demand,'sell 10+/month')+sumTile(out.length,'leads','lead')
      +sumTile(rev,'to review',rev?'cool':'')+sumTile(out.filter(o=>o.Score>=60).length,'score 60+')+sumTile(out.filter(o=>o.Score>=40&&o.Score<60).length,'score 40–59','warm')+sumTile('£'+Math.round(m).toLocaleString(),'£ / month on the list');}
  $('#sumGrid').innerHTML=tiles;
  const c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};out.forEach(o=>c[o.STATUS]++);
  $('#statusRow').innerHTML=(R.prevStamp?`<span class="vs">vs ${escapeHtml(R.prevStamp.slice(0,10))}</span>`:`<span class="vs">first run for ${escapeHtml(cur.name)} — everything is NEW</span>`)+
    [['TO REVIEW',rev,'rev'],['NEW',c.NEW,'new'],['BETTER',c.BETTER,'better'],['WORSE',c.WORSE,'worse'],['UNCHANGED',c.UNCHANGED,'same'],['GONE',R.gone.length,'gone'],['BLACKLISTED',R.blacklisted.length,'bl']].map(([l,n,k])=>`<span class="spill ${k}${n?'':' zero'}"><b>${n}</b>${l}</span>`).join('');
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]);
  $('#fell').innerHTML=`<span class="fl">Filtered out</span><span class="fr">${rs.length?rs.map(([k,n])=>`${escapeHtml(k)} ${n}`).join(' · '):'nothing'}</span><span class="fbar"><span style="width:${Math.min(100,R.dropped.length/((st.viewer||st.rows)||1)*100)}%"></span></span><span class="fn">${R.dropped.length} dropped</span>`;
  const est=cur.rule===1?out.filter(o=>(o['Fees from']||'').startsWith('ESTIMATED')).length:0;
  const fw=$('#feeWarn');if(est){fw.innerHTML='<b>'+est+' of '+out.length+' leads have estimated fees.</b> Tick <em>Referral Fee %</em> and <em>FBA Pick&amp;Pack Fee</em> on the export and the maths becomes exact.';fw.classList.add('show');}else{fw.classList.remove('show');}
  $('#fMarket').hidden=cur.rule!==1;
  const unseen=out.filter(o=>!verdGet(o.ASIN)).length;const sb=$('#seenAll');sb.hidden=!unseen;sb.textContent=`Mark all ${unseen} as seen`;
  renderTable();}
function visible(){const q=view.q.toLowerCase();const list=result.out.filter(o=>{
  if(view.status==='REVIEW'){if(!o.QUEUE&&!touched.has(o.ASIN))return false;}
  else if(view.status!=='ALL'&&o.STATUS!==view.status)return false;
  if(cur.rule===1&&view.market!=='ALL'&&o['Buy market']!==view.market)return false;
  if(view.hideNo){const v=verdGet(o.ASIN);if(v&&v.v==='No')return false;}
  if(q&&!((o.ASIN+' '+(o.Title||o.Product||'')+' '+(o.Brand||'')).toLowerCase().includes(q)))return false;return true;});
  const sc=o=>cur.rule===1?o['Profit £']:o.Score;
  if(view.sort==='gain')list.sort((a,b)=>(b.gain||0)-(a.gain||0)||sc(b)-sc(a));
  else if(view.sort==='profit')list.sort((a,b)=>b['Profit £']-a['Profit £']);
  else if(view.sort==='roi')list.sort((a,b)=>b['ROI %']-a['ROI %']);
  else if(view.sort==='month')list.sort((a,b)=>(b['£ per month']||b['Profit £']*b.SPM)-(a['£ per month']||a['Profit £']*a.SPM));
  return list;}
function acts(o){const f=factGet(o.ASIN);const tr=f.track?`<button type="button" class="on" data-track="${o.ASIN}" title="On the Keepa tracker at £${f.track.target} (${escapeHtml(f.track.who||'')}) — click to change">TRACK £${f.track.target}</button>`:`<button type="button" data-track="${o.ASIN}" title="Set a target buy price and open Keepa to track it">Track</button>`;
  return`<div class="rowacts"><a href="${o.Keepa}" target="_blank" rel="noopener" title="Keepa graph">Keepa</a><a href="${o.SAS}" target="_blank" rel="noopener" title="SellerAmp">SAS</a><a href="${o['Buy link']}" target="_blank" rel="noopener" title="Buy page">Buy${cur.rule===1&&o['Buy market']!=='UK'?' '+o['Buy market']:''}</a>${cur.rule===1&&o['Buy market']!=='UK'?`<a href="${o['UK sell link']}" target="_blank" rel="noopener">UK</a>`:''}${tr}</div>`;}
function verdCell(o){const v=verdGet(o.ASIN)||{};const b=x=>`<button type="button" class="vb ${x[0]}${v.v===x?' on':''}" data-v="${x}" data-asin="${o.ASIN}" title="${x}">${x[0]}</button>`;
  const chips=v.v==='No'?`<div class="vreasons">${noReasons().map(r=>`<button type="button" class="vr${v.reason===r?' on':''}" data-r="${r}" data-asin="${o.ASIN}">${escapeHtml(r)}</button>`).join('')}</div>`:'';
  const note=v.v&&v.v!=='Seen'?`<input class="vnote" data-asin="${o.ASIN}" placeholder="note…" value="${escapeHtml(v.note||'')}">`:'';
  const who=v.v?`<span class="chg">${v.v==='Seen'?'seen':''} ${escapeHtml(v.who||'')} · ${fmtWhen(v.at)}</span>`:'';
  const pick=blPick===o.ASIN?`<div class="blpick"><span class="t">Never show again — why?</span>${BL_REASONS.map(r=>`<button type="button" class="vr" data-blr="${r}" data-asin="${o.ASIN}">${r}</button>`).join('')}<button type="button" class="brandb" data-blbrand="${o.ASIN}">Blacklist the whole brand instead…</button></div>`:'';
  return`<div class="verd">${b('Yes')}${b('No')}${b('Maybe')}<button type="button" class="vb B${blPick===o.ASIN?' on':''}" data-bl="${o.ASIN}" title="Blacklist — never show this ASIN again">⃠</button></div>${chips}${note}${who}${pick}`;}
function statusCell(o){const sp=`<span class="spill ${({NEW:'new',BETTER:'better',WORSE:'worse',UNCHANGED:'same'})[o.STATUS]}">${o.STATUS}</span>`;
  const first=(o.Changed||'').split('; ')[0]||'';
  const chg=o.Changed?`<span class="chg" title="${escapeHtml(o.Changed)}">${escapeHtml(first)}${o.Changed.includes('; ')?' …':''}</span>`:'';
  const since=o.QUEUE==='better'?`<span class="chg since" title="${escapeHtml(o.sinceVerdict)}">↑ since ${escapeHtml(o.verdict.v==='Seen'?'seen':o.verdict.v)}${o.verdict.who?' · '+escapeHtml(o.verdict.who):''}</span>`:'';
  const low=o.low?`<span class="chg" title="Lowest buy we saw, and when — set a Keepa track at it">low £${o.low.buy.toFixed(2)} · ${escapeHtml(o.low.stamp.slice(5,10).replace('-','/'))}</span>`:'';
  return sp+chg+since+low;}
function renderTable(){const all=visible();const pages=Math.max(1,Math.ceil(all.length/PAGE));if(view.page>pages)view.page=pages;
  const rows=all.slice((view.page-1)*PAGE,view.page*PAGE);
  $('#leadCount').textContent=(view.status==='REVIEW'?'To review':'Leads')+(all.length===result.out.length?` (${all.length})`:` (${all.length} of ${result.out.length})`);
  const asin=o=>`<td class="asin">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></td>`;
  const sel=o=>`<td class="sel"><input type="checkbox" data-sel="${o.ASIN}"${view.sel.has(o.ASIN)?' checked':''}></td>`;
  const pend=b=>bbStatusFor(b)==='pending'?`<i class="ch pend" title="Brand blacklist requested — waiting for Jack">BRAND BLACKLIST PENDING</i>`:'';
  let h;
  if(!all.length){$('#leads').innerHTML=`<tbody><tr><td style="text-align:center;color:var(--faint);padding:26px">${view.status==='REVIEW'?'Nothing to review — every lead on this run has a verdict and none has got better since. Switch to <b>Everything</b> to see them all.':'Nothing matches.'}</td></tr></tbody>`;$('#pager').innerHTML='';$('#openSel').textContent='Open this page in Keepa';return;}
  if(cur.rule===1){h=`<thead><tr><th></th><th>#</th><th>Status</th><th>ASIN</th><th>Product</th><th>Verdict</th><th>Links</th><th class="r">Buy · landed £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">/mo</th><th>Flags</th></tr></thead><tbody>`;
    rows.forEach((o,i)=>{h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''}">${sel(o)}<td class="idx">${(view.page-1)*PAGE+i+1}</td><td>${statusCell(o)}</td>${asin(o)}
      <td class="prod"><span class="t" title="${escapeHtml(o.Title)}">${escapeHtml(o.Title)}</span><span class="s">${escapeHtml(o['Sell used'])}${o['LTD badge']?' · <b>LTD</b>':''}</span>${pend(cur.name)}</td>
      <td class="vcell">${verdCell(o)}</td><td class="linkc">${acts(o)}</td>
      <td class="num r buyc"><i class="mk ${o['Buy market']==='UK'?'uk':''}">${o['Buy market']}</i> <b>${gbp(o['Landed £'])}</b>${o['Discount applied']?`<span class="sub">${escapeHtml(o['Discount applied'])}</span>`:''}</td>
      <td class="num r">${gbp(o['Sell £ used'])}<span class="sub">${escapeHtml(o['Sell range'])}</span></td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}">${gbp(o['Profit £'])}</td><td class="num r ${o['ROI %']>=10?'pos':o['ROI %']>=0?'':'neg'}">${pct(o['ROI %'])}</td>
      <td class="num r">${o.SPM}<span class="sub">${o['SPM from']}</span></td>
      <td class="flagc" title="${escapeHtml(o.Flags)}"><span class="chips">${(o.Flags||'').split('; ').filter(Boolean).map(f=>`<i class="ch ${/PLUG|NOT A DROP|WIDE|volatile|no FBA|LIMITED|drops only|tanked/i.test(f)?'warn':/A2A->OA|price-match/i.test(f)?'info':''}">${escapeHtml(f.length>42?f.slice(0,40)+'…':f)}</i>`).join('')}</span></td></tr>`;});}
  else{h=`<thead><tr><th></th><th>#</th><th>Score</th><th>Status</th><th>ASIN</th><th>Product</th><th>Verdict</th><th>Links</th><th class="r">Buy £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">Demand</th><th>Price-matched at</th></tr></thead><tbody>`;
    rows.forEach(o=>{const pot=o['Potential score']>o.Score+5?o['Potential score']:0;const band=bandOf(Math.max(o.Score,pot));
      const fact=factGet(o.ASIN);const alt=[['Buy Box 90d',o['Buy Box 90d £']],['Buy Box 180d',o['Buy Box 180d £']],['FBA 90d',o['FBA 90d £']],['FBM 90d',o['FBM 90d £']],['Buy Box high',o['Buy Box high £']]].filter(x=>x[1]).map(x=>`${x[0]} ${gbp(x[1])}`).join(' · ');
      const vcls=fact.vat==null?'':(+fact.vat===0?'z':'s');const vtxt=fact.vat==null?(o['VAT %']===0?(cur.vat0?'0% VAT · FILTER':'0% VAT · CONFIRM'):'VAT 20%'):(+fact.vat===0?'0% VAT ✓':'20% VAT ✓');
      h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''} band-${band}">${sel(o)}<td class="idx">${o['#']}</td>
      <td><span class="score ${band}">${o.Score}</span>${pot?`<span class="potl" title="Potential score with ${escapeHtml(o['Potential via'])}">→ ${pot}</span>`:''}</td>
      <td>${statusCell(o)}</td>${asin(o)}
      <td class="prod"><span class="t" title="${escapeHtml(o.Product)}">${escapeHtml(o.Product)}</span><span class="s">${escapeHtml(o.Brand)} · ${o['Sells /mo']}/mo ${o['Demand from']}${o.Reviews?' · '+o.Reviews.toLocaleString()+' reviews':''}${o['Age days']!==''?' · '+o['Age days']+'d tracked':''}</span><span class="chips">${(o.chips||[]).filter(([t])=>!/VAT/.test(t)).map(([t,c])=>`<i class="ch ${c}">${escapeHtml(t)}</i>`).join('')}<button type="button" class="ch vatb ${vcls}" data-vat="${o.ASIN}" title="Rule 4 — click to cycle: 0% VAT set by you → 20% set by you → back to the rule">${vtxt}</button>${pend(o.Brand)}</span></td>
      <td class="vcell">${verdCell(o)}</td><td class="linkc">${acts(o)}</td>
      <td class="num r buyc"><b>${gbp(o['After discount £'])}</b><span class="sub">${o['Discount applied']?'Amazon '+gbp(o['Buy at £'])+' · '+escapeHtml(o['Discount applied']):o['Amazon 90d drop %']+'% under 90d avg'}</span></td>
      <td class="num r sellc"><b>${gbp(o['Sell for £'])}</b><span class="sub conf-${o['Sell confidence']}" title="${escapeHtml(alt)}">${escapeHtml(o['Sell from'])}</span><input class="ysell" data-asin="${o.ASIN}" type="number" step="0.01" placeholder="your sell £" value="${fact.sell||''}" title="What the graph says it really sells for — saved, and used for the refit"></td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}">${gbp(o['Profit £'])}</td><td class="num r ${o['ROI %']>=10?'pos':o['ROI %']>=0?'':'neg'}">${pct(o['ROI %'])}</td>
      <td class="num r">${o['Sells /mo']}<span class="sub">/mo · £${o['£ per month'].toLocaleString()}</span></td>
      <td class="pmc"><div class="pms">${PM_OPTIONS.map(x=>`<button type="button" class="pm${(fact.pm||[]).includes(x)?' on':''}" data-pm="${x}" data-asin="${o.ASIN}">${x}</button>`).join('')}</div>${(o.pot||[]).length?(()=>{const b=o.pot.reduce((m,x)=>x.roi>m.roi?x:m,o.pot[0]);return`<span class="sub" title="${escapeHtml(o.pot.map(x=>`${x.who} ${x.pct}% → ${pct(x.roi)} ROI`).join(' · '))}">best: ${escapeHtml(b.who)} ${b.pct}% → ${pct(b.roi)} ROI</span>`;})():''}</td></tr>`;});}
  $('#leads').innerHTML=h+'</tbody>';
  const from=all.length?(view.page-1)*PAGE+1:0,to=Math.min(all.length,view.page*PAGE);
  let pg='';const win=[...new Set([1,2,view.page-1,view.page,view.page+1,pages-1,pages].filter(p=>p>=1&&p<=pages))].sort((a,b)=>a-b);
  let last=0;win.forEach(p=>{if(p-last>1)pg+='<span style="padding:0 4px;color:var(--faint)">…</span>';pg+=`<button data-pg="${p}" class="${p===view.page?'on':''}">${p}</button>`;last=p;});
  $('#pager').innerHTML=`<span>Showing ${from}–${to} of ${all.length}${view.sel.size?` · <b>${view.sel.size} selected</b>`:''}</span><div class="pg"><button data-pg="${view.page-1}" ${view.page<=1?'disabled':''}>‹</button>${pg}<button data-pg="${view.page+1}" ${view.page>=pages?'disabled':''}>›</button></div>`;
  $('#openSel').textContent=view.sel.size?`Open ${view.sel.size} selected in Keepa`:`Open this page in Keepa`;}
function bandOf(sc){return sc>=70?'hi':sc>=50?'md':sc>=30?'lo':'weak';}
function leadOf(a){return result?result.out.find(o=>o.ASIN===a):null;}
function markAllSeen(){if(!result||!needMe())return;const list=result.out.filter(o=>!verdGet(o.ASIN));if(!list.length){toast('Everything already has a verdict');return;}
  if(!confirm(`Mark all ${list.length} leads without a verdict as SEEN by ${me()}? This is the baseline: from the next run only NEW leads and ones that got BETTER will be "to review".`))return;
  verdSetMany(list.map(o=>({asin:o.ASIN,v:{v:'Seen',reason:'',note:'',source:cur.key,state:o.state}})));
  list.forEach(o=>{o.verdict=verdGet(o.ASIN);o.QUEUE='';o.sinceVerdict='';});touched.clear();renderResults();renderLog();toast(list.length+' marked as seen — baseline set');}
function onTableClick(e){const cp=e.target.closest('button[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');return;}
  const b=e.target.closest('button');if(!b)return;const a=b.dataset.asin||b.dataset.bl||b.dataset.blbrand||b.dataset.vat||b.dataset.track;if(!a)return;const o=leadOf(a);
  if(b.dataset.pm){const f=factGet(a);const pm=new Set(f.pm||[]);if(pm.has(b.dataset.pm))pm.delete(b.dataset.pm);else pm.add(b.dataset.pm);factSet(a,{pm:[...pm]});touched.add(a);run();return;}
  if(b.dataset.vat!=null){if(!needMe())return;const f=factGet(a);const next=f.vat==null?0:(+f.vat===0?20:null);factSet(a,{vat:next});toast(next==null?'Back to the Rule 4 keyword rule':next+'% VAT set on '+a+' — shared');touched.add(a);run();return;}
  if(b.dataset.track!=null){if(!o)return;const f=factGet(a);const sug=f.track?f.track.target:(o.low?o.low.buy:Math.round((o.state.buy*0.9)*100)/100);
    const t=prompt('Track '+a+' on Keepa — target buy price £ (blank to clear)',sug);if(t===null)return;const v=parseFloat(t);
    factSet(a,{track:v>0?{target:v}:null});renderTable();if(v>0){toast('Noted £'+v.toFixed(2)+' — now set the same in Keepa');window.open(o.Keepa,'_blank');}return;}
  if(b.dataset.bl!=null){if(!needMe())return;blPick=blPick===a?null:a;renderTable();return;}
  if(b.dataset.blr){if(!needMe())return;blSet(a,{reason:b.dataset.blr,title:o?(o.Title||o.Product||''):'',source:cur.key});blPick=null;touched.delete(a);toast(a+' blacklisted · '+b.dataset.blr+' — never shows again');run();return;}
  if(b.dataset.blbrand!=null){blPick=null;openBrandBlacklist(o?(o.Brand||(cur.type==='brand'?cur.name:'')):'',a);renderTable();return;}
  if(b.dataset.v){if(!needMe())return;const v=verdGet(a)||{};touched.add(a);
    if(v.v===b.dataset.v){verdSet(a,null);if(o){o.verdict=null;o.QUEUE='new';o.sinceVerdict='';}}
    else{verdSet(a,{v:b.dataset.v,reason:b.dataset.v==='No'?v.reason||'':'',note:v.note||'',source:cur.key,state:o?o.state:null});if(o){o.verdict=verdGet(a);o.QUEUE='';o.sinceVerdict='';}}}
  else if(b.dataset.r){const v=verdGet(a)||{};verdSet(a,Object.assign(v,{reason:v.reason===b.dataset.r?'':b.dataset.r}));}
  renderTable();renderLog();}
function onTableChange(e){const s=e.target.dataset&&e.target.dataset.sel;if(s){if(e.target.checked)view.sel.add(s);else view.sel.delete(s);renderTable();}}
function onTableInput(e){const i=e.target;
  if(i.classList.contains('ysell')){clearTimeout(i._t);i._t=setTimeout(()=>{const v=parseFloat(i.value);factSet(i.dataset.asin,{sell:v>0?v:null});touched.add(i.dataset.asin);run();},700);return;}
  if(!i.classList.contains('vnote'))return;const v=verdGet(i.dataset.asin);if(v){clearTimeout(i._t);i._t=setTimeout(()=>{v.note=i.value;verdSet(i.dataset.asin,v);},600);}}

/* ============ outputs ============ */
function base(){return today()+'-RULE'+cur.rule+'-'+cur.key;}
function withVerdicts(out){const V=verdAll();return out.map(o=>{const v=V[o.ASIN];const c=Object.assign({},o);if(v){c['GOOD LEAD?']=v.v;c.WHY=[v.reason,v.note,v.who].filter(Boolean).join(' — ');}return c;});}
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
  const tot={runs:runs.length,leads:0,y:0,n:0,m:0,tr:0};
  const rows=runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;});const tr=toReviewCount(r);
    tot.leads+=r.leads;tot.y+=y;tot.n+=n;tot.m+=m;tot.tr+=tr;
    return`<tr><td class="num">${fmtWhen(r.at)}</td><td>${escapeHtml(r.name)}<div class="chg">Rule ${r.rule} · ${(r.files||[]).length} file${(r.files||[]).length===1?'':'s'}${r.who?' · '+escapeHtml(r.who):''}</div></td><td class="num">${r.rowsIn.toLocaleString()}</td><td class="num">${r.leads}</td><td class="num">${r.new}</td><td class="num">${r.better}</td><td class="num">${r.worse}</td><td class="num">${r.gone}</td><td class="num pos">${y||'<span class=z>0</span>'}</td><td class="num neg">${n||'<span class=z>0</span>'}</td><td class="num">${m||'<span class=z>0</span>'}</td><td class="num ${tr?'':'pos'}">${tr||'<span class=z>0</span>'}</td></tr>`;}).join('');
  el.innerHTML=`<div class="logstats">${stat('Runs',tot.runs)}${stat('Leads produced',tot.leads)}${stat('Marked Yes',tot.y)}${stat('Marked No',tot.n)}${stat('Still to review',tot.tr)}</div>
    <div class="tablewrap show"><div class="tablescroll"><table><thead><tr><th>When</th><th>Source</th><th class="r">Rows in</th><th class="r">Leads</th><th class="r">New</th><th class="r">Better</th><th class="r">Worse</th><th class="r">Gone</th><th class="r">Yes</th><th class="r">No</th><th class="r">Maybe</th><th class="r">Unreviewed</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;}
function stat(k,v,sub){return`<div class="stat"><span class="k">${k}</span><span class="v">${typeof v==='number'?v.toLocaleString():v}</span>${sub?`<span class="sub">${escapeHtml(sub)}</span>`:''}</div>`;}
function exportLog(){const runs=runsAll(),V=verdAll();
  const hdr=['at','who','source','rule','files','rows_in','leads','new','better','worse','gone','blacklisted','yes','no','maybe','seen'];
  const rows=runs.map(r=>{let y=0,n=0,m=0,s=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;else s++;});
    return{at:r.at,who:r.who||'',source:r.name,rule:r.rule,files:(r.files||[]).join(' | '),rows_in:r.rowsIn,leads:r.leads,new:r.new,better:r.better,worse:r.worse,gone:r.gone,blacklisted:r.blacklisted||0,yes:y,no:n,maybe:m,seen:s};});
  download(today()+'-SOURCING-RUN-LOG.csv',rowsToCsv(hdr,rows),'text/csv');
  const F=factsAll();const fh=['asin','price_matched_at','va_sell','vat','track_target','who','at'];
  download(today()+'-SOURCING-FACTS.csv',rowsToCsv(fh,Object.entries(F).map(([a,f])=>({asin:a,price_matched_at:(f.pm||[]).join(' | '),va_sell:f.sell||'',vat:f.vat==null?'':f.vat,track_target:f.track?f.track.target:'',who:f.who||'',at:f.at||''}))),'text/csv');
  const vh=['asin','verdict','reason','note','who','source','at','buy_at_verdict','profit_at_verdict','roi_at_verdict'];
  download(today()+'-SOURCING-VERDICTS.csv',rowsToCsv(vh,Object.entries(V).map(([a,v])=>({asin:a,verdict:v.v,reason:v.reason||'',note:v.note||'',who:v.who||'',source:v.source||'',at:v.at,buy_at_verdict:v.state?v.state.buy:'',profit_at_verdict:v.state?v.state.profit:'',roi_at_verdict:v.state?v.state.roi:''}))),'text/csv');
  const B=blAll();const bh=['asin','reason','note','title','who','at','source'];
  download(today()+'-SOURCING-BLACKLIST.csv',rowsToCsv(bh,Object.entries(B).map(([a,b])=>({asin:a,reason:b.reason,note:b.note||'',title:b.title||'',who:b.who||'',at:b.at,source:b.source||''}))),'text/csv');}

/* ============ settings page ============ */
function renderSettings(){whoPaint();paintFx();
  $('#reasonChips').innerHTML=noReasons().map(r=>`<span class="c">${escapeHtml(r)}<button data-rr="${escapeHtml(r)}" title="Remove">×</button></span>`).join('');
  renderDiscounts();renderBlacklists();
  const w=vat0Words();if(document.activeElement!==$('#vatZero'))$('#vatZero').value=w.zero.join(', ');if(document.activeElement!==$('#vatNot'))$('#vatNot').value=w.not.join(', ');
  paintCloud();
  const sz=Object.keys(localStorage).filter(k=>k.startsWith('bdl-sourcing')).reduce((s,k)=>s+(localStorage.getItem(k)||'').length,0);
  $('#dataInfo').textContent=`${srcAll().length} sources · ${runsAll().length} runs · ${Object.keys(verdAll()).length} verdicts · ${Object.keys(blAll()).length} blacklisted · ${(sz/1024).toFixed(0)} KB in this browser`;}
function renderBlacklists(){const B=Object.entries(blAll()).sort((a,b)=>(b[1].at||'').localeCompare(a[1].at||''));
  $('#blTbl').innerHTML=`<thead><tr><th>ASIN</th><th>Product</th><th>Reason</th><th>Who</th><th>When</th><th></th></tr></thead><tbody>`+(B.length?B.map(([a,b])=>`<tr><td class="num"><a href="https://keepa.com/#!product/2-${a}" target="_blank" rel="noopener">${a}</a></td><td class="dnote" title="${escapeHtml(b.title||'')}">${escapeHtml(b.title||'')}</td><td><b>${escapeHtml(b.reason)}</b>${b.note?`<span class="sub">${escapeHtml(b.note)}</span>`:''}</td><td>${escapeHtml(b.who||'')}</td><td class="num">${b.at?fmtWhen(b.at):''}</td><td><button class="btn ghost xs" data-blx="${a}" title="Remove from the blacklist">×</button></td></tr>`).join(''):'<tr><td colspan="6" style="color:var(--faint);text-align:center;padding:14px">Empty. The ⃠ button on a lead adds to it.</td></tr>')+'</tbody>';
  const BB=Object.entries(bbAll()).sort((a,b)=>(a[1].status==='pending'?0:1)-(b[1].status==='pending'?0:1)||(b[1].at||'').localeCompare(a[1].at||''));
  $('#bbTbl').innerHTML=`<thead><tr><th>Brand</th><th>Reason</th><th>Requested</th><th>Status</th><th></th></tr></thead><tbody>`+(BB.length?BB.map(([k,r])=>`<tr><td><b>${escapeHtml(r.display||k)}</b></td><td class="dnote" title="${escapeHtml(r.reason)}">${escapeHtml(r.reason)}</td><td>${escapeHtml(r.by||'')}<span class="sub">${r.at?fmtWhen(r.at):''}</span></td><td><span class="stp ${r.status}">${r.status}</span>${r.decidedBy?`<span class="sub">${escapeHtml(r.decidedBy)} · ${r.decidedAt?fmtWhen(r.decidedAt):''}</span>`:''}</td><td><div class="acts2">${isJack()&&r.status!=='approved'?`<button class="btn primary xs" data-bbd="approved" data-k="${escapeHtml(k)}">Approve</button>`:''}${isJack()&&r.status==='pending'?`<button class="btn ghost xs" data-bbd="rejected" data-k="${escapeHtml(k)}">Reject</button>`:''}${isJack()||r.by===me()?`<button class="btn ghost xs" data-bbx="${escapeHtml(k)}" title="Remove">×</button>`:''}</div></td></tr>`).join(''):'<tr><td colspan="5" style="color:var(--faint);text-align:center;padding:14px">No brand requests yet.</td></tr>')+'</tbody>';}
function renderDiscounts(){const L=discAll();
  $('#discTbl').innerHTML=`<thead><tr><th>Name</th><th>Type</th><th class="r">%</th><th>Applies</th><th class="r">Min £</th><th>Note</th><th></th></tr></thead><tbody>`+L.map((e,i)=>`<tr class="${e.verified===false||(!e.pct&&!e.flat&&!e.business)?'dim':''}">
    <td><b>${escapeHtml(e.name)}</b></td><td><span class="ttag">${e.type}</span></td>
    <td class="r num">${e.business?'tiers':e.flat?'£'+e.flat+' flat':e.pct!=null?e.pct+'%':'?'}${e.salePct?`<span class="sub">sale ${e.salePct}%</span>`:''}${e.cap?`<span class="sub">cap £${e.cap}</span>`:''}</td>
    <td>${e.business?'<i class="ch info">OPEN LISTING</i>':e.fullPriceOnly?'<i class="ch warn">FULL PRICE ONLY</i>':'<i class="ch good">ANY PRICE</i>'}${e.verified===false?' <i class="ch">UNVERIFIED</i>':''}</td>
    <td class="r num">${e.minSpend?'£'+e.minSpend:''}</td><td class="dnote" title="${escapeHtml(e.note||'')}">${escapeHtml(e.note||'')}</td>
    <td><button class="btn ghost xs" data-di="${i}" title="Remove">×</button></td></tr>`).join('')+'</tbody>';}
function settingsInit(){
  $('#discTbl').addEventListener('click',e=>{const b=e.target.closest('button[data-di]');if(!b)return;const L=discAll();const x=L[+b.dataset.di];if(!confirm('Remove '+x.name+' from the discount list, for everyone?'))return;L.splice(+b.dataset.di,1);discSave(L);renderDiscounts();if(result)run();});
  $('#dAdd').addEventListener('click',()=>{const name=$('#dName').value.trim();if(!name){toast('Name needed',true);return;}
    const e={name,type:$('#dType').value,verified:true};const p=parseFloat($('#dPct').value);if(p>0)e.pct=p;const sp=parseFloat($('#dSale').value);if(sp>0)e.salePct=sp;
    if($('#dFull').checked)e.fullPriceOnly=true;const mn=parseFloat($('#dMin').value);if(mn>0)e.minSpend=mn;const n=$('#dNote').value.trim();if(n)e.note=n;
    const L=discAll().filter(x=>x.name.toLowerCase()!==name.toLowerCase());L.push(e);L.sort((a,b)=>a.name.localeCompare(b.name));discSave(L);
    ['dName','dPct','dSale','dMin','dNote'].forEach(id=>$('#'+id).value='');$('#dFull').checked=false;renderDiscounts();toast(name+' added — live on the next run, for everyone');if(result)run();});
  $('#dReset').addEventListener('click',()=>{if(!confirm('Reset the discount list to the 6 Sep reference (+ Gtech, Kenwood), for everyone? Additions go.'))return;discReset();renderDiscounts();toast('Discount list reset');if(result)run();});
  $('#meIn').addEventListener('change',e=>whoSet(e.target.value));
  $('#whoSel').addEventListener('change',e=>whoSet(e.target.value));
  $('#fxIn').addEventListener('input',()=>{if(result)run();});$('#fxRefresh').addEventListener('click',()=>{try{localStorage.removeItem(FX_KEY);}catch(e){}loadFx();});
  $('#reasonAdd').addEventListener('click',()=>{const v=$('#reasonIn').value.trim();if(!v)return;const r=noReasons();if(!r.includes(v))r.push(v);reasonsSave(r);$('#reasonIn').value='';renderSettings();});
  $('#reasonChips').addEventListener('click',e=>{const b=e.target.closest('button[data-rr]');if(!b)return;reasonsSave(noReasons().filter(x=>x!==b.dataset.rr));renderSettings();});
  $('#blTbl').addEventListener('click',e=>{const b=e.target.closest('button[data-blx]');if(!b)return;if(!needMe())return;const a=b.dataset.blx;if(!confirm('Take '+a+' off the blacklist? It will show on the next run.'))return;blRemove(a);renderBlacklists();toast(a+' removed from the blacklist by '+me());if(result)run();});
  $('#bbTbl').addEventListener('click',e=>{const d=e.target.closest('button[data-bbd]');if(d){if(!isJack()){toast('Only Jack decides',true);return;}bbDecide(d.dataset.k,d.dataset.bbd);renderBlacklists();renderList();if(result)run();toast(d.dataset.k+' '+d.dataset.bbd);return;}
    const x=e.target.closest('button[data-bbx]');if(!x)return;if(!confirm('Remove the '+x.dataset.bbx+' request / block?'))return;bbRemove(x.dataset.bbx);renderBlacklists();renderList();if(result)run();});
  $('#bbAdd').addEventListener('click',()=>{if(!needMe())return;const b=$('#bbName').value.trim(),w=$('#bbReason').value.trim();if(!b||!w){toast('Brand and reason both needed',true);return;}bbRequest(b,w,isJack());$('#bbName').value='';$('#bbReason').value='';renderBlacklists();renderList();toast(isJack()?b+' blacklisted':'Sent to Jack');});
  $('#vatSave').addEventListener('click',()=>{const sp=v=>v.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const w={zero:sp($('#vatZero').value),not:sp($('#vatNot').value)};if(!w.zero.length){toast('Need at least one zero-rated word',true);return;}vat0Save(w);toast('Rule 4 words saved for everyone');if(result)run();});
  $('#vatReset').addEventListener('click',()=>{vat0Save({zero:R4.ZERO.slice(),not:R4.NOT.slice()});renderSettings();toast('Rule 4 words reset');if(result)run();});
  $('#cloudPullBtn').addEventListener('click',async()=>{if(!cloudEnabled()){toast('Cloud is off in the sandbox',true);return;}toast('Refreshing…');const ok=await cloudPull();onCloudPulled(ok);toast(ok?'Up to date with the shared project':'Could not refresh — '+cloud.err,!ok);});
  $('#cloudSendBtn').addEventListener('click',()=>{if(!outbox().length){toast('Nothing queued');return;}cloudFlush();toast('Sending '+outbox().length+'…');});
  $('#dataExport').addEventListener('click',()=>{const o={};Object.keys(localStorage).filter(k=>k.startsWith('bdl-sourcing')).forEach(k=>o[k]=localStorage.getItem(k));download(today()+'-BDL-SOURCING-BACKUP.json',JSON.stringify(o),'application/json');});
  $('#dataImport').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await readFileText(f));if(!confirm('Replace this browser\'s sourcing data with the backup ('+Object.keys(o).length+' keys)? The shared copy is not touched until you change something.'))return;Object.entries(o).forEach(([k,v])=>{if(k.startsWith('bdl-sourcing'))localStorage.setItem(k,v);});toast('Imported — reloading');setTimeout(()=>location.reload(),600);}catch(err){toast('Not a backup file',true);}e.target.value='';});
  $('#dataReset').addEventListener('click',()=>{if(!confirm('Reset the brand list to the seed? Runs, history and verdicts are kept.'))return;localStorage.removeItem(SRC_KEY);const v=srcAll();cloudQueue('src_sources','upsert',v.map(srcRow));renderSettings();renderList();toast('Brand list reset');});}

/* after the shared copy lands: repaint everything from it */
function onCloudPulled(ok){whoPaint();renderList();renderLog();renderSettings();
  if(ok&&cur){cloudPullLeads(cur.key).then(()=>{if(result)run();});}}

/* ============ wiring ============ */
function brandsInit(){renderList();renderLog();
  $('#brandTbl').addEventListener('click',onListClick);document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus();});
  $('#approvals').addEventListener('click',onApprovalClick);
  $('#addBrand').addEventListener('click',()=>openEdit(null));
  $('#lq').addEventListener('input',e=>{lview.q=e.target.value;renderList();});
  $('#lMarket').addEventListener('change',e=>{lview.market=e.target.value;renderList();});
  $('#lRule').addEventListener('change',e=>{lview.rule=e.target.value;renderList();});
  $('#lOwner').addEventListener('change',e=>{lview.owner=e.target.value;renderList();});
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
  $('#seenAll').addEventListener('click',markAllSeen);
  $('#copyKept').addEventListener('click',e=>{if(!result||!result.out.length){toast('Nothing to copy',true);return;}copy(result.out.map(o=>o.ASIN).join(', '),result.out.length+' ASINs copied',e.currentTarget,'Copied');});
  $('#openSel').addEventListener('click',openInKeepa);
  $('#leads').addEventListener('click',onTableClick);$('#leads').addEventListener('change',onTableChange);$('#leads').addEventListener('input',onTableInput);
  $('#pager').addEventListener('click',e=>{const b=e.target.closest('button[data-pg]');if(!b||b.disabled)return;view.page=parseInt(b.dataset.pg);touched.clear();renderTable();$('#leadTop').scrollIntoView({behavior:'smooth',block:'start'});});
  $('#fStatus').addEventListener('change',e=>{view.status=e.target.value;view.page=1;touched.clear();renderTable();});
  $('#fSort').addEventListener('change',e=>{view.sort=e.target.value;view.page=1;renderTable();});
  $('#fMarket').addEventListener('change',e=>{view.market=e.target.value;view.page=1;renderTable();});
  $('#floorRow').addEventListener('input',onFloorInput);
  $('#floorClear').addEventListener('click',()=>{if(!cur)return;delete cur.filters;srcSave(cur);paintFloors();lastSig='';run();toast('Floors cleared for '+cur.name);});
  $('#fQ').addEventListener('input',e=>{view.q=e.target.value;view.page=1;renderTable();});
  $('#fHideNo').addEventListener('change',e=>{view.hideNo=e.target.checked;view.page=1;renderTable();});
  $('#logExport').addEventListener('click',exportLog);
  $('#rulesToggle').addEventListener('click',()=>{const o=$('#rulesBox');const open=o.classList.toggle('show');$('#rulesToggle').textContent=open?'Hide the rules':'Show the rules';});
  /* what other people change while the list is open: locks, runs, verdict counts */
  setInterval(()=>{if(!cloudEnabled()||!cloud.tables||!$('#page-brands').classList.contains('active')||$('#viewList').hidden)return;cloudPullLight().then(ok=>{if(ok){renderList();renderLog();}});},90000);
  window.addEventListener('beforeunload',()=>{if(cur&&cur.inProgress&&cur.inProgress.who===me())srcUnlock(cur,true);});
  settingsInit();renderSettings();loadFx();}
