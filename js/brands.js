/* BDL Sourcing — the BRANDS page (b10): the list, the run view, the queue, verdicts, blacklists, the runs log, settings.
   Rule maths lives in rule1.js / rule2.js / rule4.js; the compare lives in queue.js; storage in sources.js + cloud.js.
   This file only moves data between the page and those. */
const SLOTS=['viewer','UK','DE','FR','IT','ES'];
const FX_KEY='bdl-sourcing-fx';
let cur=null,result=null,fx={rate:BR.FX_FALLBACK,src:'fallback'},lastSig='',blPick=null;
const touched=new Set();   /* rows judged this sitting stay visible in "To review" so the reason chips can be picked */
const files={viewer:null,UK:null,DE:null,FR:null,IT:null,ES:null,one:null};
const view={status:'REVIEW',market:'ALL',q:'',hideNo:false,sort:'default',page:1,per:50,sel:new Set()};
const PAGEN=()=>view.per>0?view.per:1e9;
const LVIEW_KEY='bdl-sourcing-lview';
const lview=Object.assign({q:'',market:'ALL',rule:'ALL',owner:'ALL',seg:'all',type:'ALL',sort:'due',tab:'brands'},lsGet(LVIEW_KEY,{})||{});
function lviewSave(){const {q,...rest}=lview;lsSet(LVIEW_KEY,rest);}
/* b58: one colour per person, used everywhere a name shows */
const OWNER_CLS={Jack:'o-jack',Mera:'o-mera',Suz:'o-suz',VAs:'o-vas','—':'o-none'};
function ownCls(n){return OWNER_CLS[n]||'o-vas';}
function ownLabel(n){return(!n||n===NO_OWNER)?'unassigned':n;}
function whoChip(n){return n?`<span class="whochip ${ownCls(n)}">${escapeHtml(n)}</span>`:'<span class="whochip o-none">no name</span>';}
const RULE_LABEL={1:'buy UK/EU · sell UK',2:'UK Amazon-to-Amazon'};
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
function whoPaint(){['#whoSel','#meIn'].forEach(id=>{const el=$(id);if(el&&el.value!==me())el.value=me();});
  if(typeof paintAuthBox==='function')paintAuthBox();
  /* b126: when the person is signed in the picker is theirs, not a choice — swap it for their name and a way out */
  const n=(typeof authedName==='function')?authedName():'';const sel=$('#whoSel');if(!sel)return;
  let pill=$('#authPill');
  if(n){sel.hidden=true;if(!pill){pill=document.createElement('button');pill.id='authPill';pill.type='button';pill.className='authpill';
      pill.addEventListener('click',()=>{if(confirm('Sign out of '+authedName()+'?'))authSignOut();});sel.parentNode.insertBefore(pill,sel);}
    pill.hidden=false;pill.innerHTML=`<i></i>${escapeHtml(n)}`;pill.title=(authUser()||{}).email+' — click to sign out';}
  else{sel.hidden=false;if(pill)pill.hidden=true;}}
/* the storefront audit is Jack's page — the tile is not there for anyone else */
function paintJackOnly(){document.querySelectorAll('.jackonly').forEach(el=>{el.hidden=!isJack();});
  if(!isJack()){const p=$('#page-audit');if(p&&p.classList.contains('active')){document.querySelector('.pagebtn[data-page="page-brands"]').click();}}}
function whoSet(v){lsSet(ME_KEY,v);whoPaint();paintJackOnly();if(typeof renderAudit==='function')renderAudit();renderList();if(result)renderTable();
  if(v&&pendingFiles){const f=pendingFiles;pendingFiles=null;whoGate(false);handleFiles(f);}   /* b131: the held export goes through */toast(v?'You are '+v+' — everything you mark carries your name':'No name set — nothing can be marked until you pick one',!v);}
/* b24 (14 Sep: Jack clicked Y/N/M all afternoon with no name picked — every click was refused by a toast he never saw and the
   work was lost). The question is now a gate you cannot miss: it opens on first visit and on any marking click, and the click
   that hit it is replayed once a name is picked. */
let whoPending=null,pendingFiles=null;
function needMe(target){if(me())return true;whoPending=target||null;whoGate(true);return false;}
function whoGate(show){let g=$('#whoGate');if(!g){g=document.createElement('div');g.id='whoGate';g.className='whogate';
    /* b126: sign in with a one-click email link. The name picker stays underneath, so nobody is ever locked out. */
    g.innerHTML=`<div class="wg"><div class="wgt">Sign in</div><div class="wgs">Type your work email and we send a one-click link — no password to remember. It keeps you signed in on this browser, and every verdict then carries your real name.</div>
      <div class="wgmail"><input type="email" id="wgEmail" placeholder="you@…" autocomplete="email" spellcheck="false"><button type="button" class="btn primary" id="wgSend">Send me a link</button></div>
      <div class="wgmsg" id="wgMsg"></div>
      <div class="wgor">or carry on without signing in</div>
      <div class="wgb">${USERS.map(u=>`<button type="button" data-who="${u}">${u}</button>`).join('')}</div></div>`;
    g.addEventListener('click',async e=>{
      const send=e.target.closest('#wgSend');
      if(send){const el=$('#wgEmail'),msg=$('#wgMsg'),v=(el.value||'').trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){msg.textContent='That does not look like an email address.';msg.className='wgmsg bad';return;}
        send.disabled=true;msg.textContent='Sending…';msg.className='wgmsg';
        try{await authSendLink(v);msg.innerHTML='Sent. Open the email on <b>this</b> machine and click the link — you will land back here signed in.';msg.className='wgmsg good';}
        catch(err){msg.textContent=String(err.message||err)+(/not found|signups|invalid/i.test(String(err.message||''))?' — ask Jack to invite this address.':'');msg.className='wgmsg bad';send.disabled=false;}
        return;}
      const b=e.target.closest('button[data-who]');if(!b)return;whoSet(b.dataset.who);whoGate(false);const t=whoPending;whoPending=null;if(t)onTableClick({target:t});});
    document.body.appendChild(g);}
  g.classList.toggle('open',!!show);}

/* ============ list view ============ */
function weekAgo(){return Date.now()-7*864e5;}
function toReviewCount(run){if(!run)return 0;const V=verdAll(),B=blAll();return(run.asins||[]).filter(a=>!V[a]&&!B[a]).length;}
function renderKpis(){const all=visibleSources(),keys=new Set(all.map(s=>s.key));
  /* b132: a VA's week counts her own sources only — Jack's tiles still count everything */
  const runs=runsAll().filter(r=>isJack()||keys.has(r.source)),V=verdAll(),LA=leadAll();
  /* b23 (Jack, 14 Sep: "better kpi's like what has actually happened… love data and analysis") — every tile is a count
     from this week's run records, lead states and verdicts; nothing is estimated */
  const due=all.filter(s=>dueState(s).due).length,active=all.filter(s=>s.status==='active').length,testing=all.filter(s=>s.status==='testing').length;
  const wk=runs.filter(r=>new Date(r.at).getTime()>=weekAgo());
  const rowsIn=wk.reduce((s,r)=>s+(r.rowsIn||0),0),leadsSum=wk.reduce((s,r)=>s+(r.leads||0),0),newN=wk.reduce((s,r)=>s+(r.new||0),0),betterN=wk.reduce((s,r)=>s+(r.better||0),0);
  const cut=Math.max(0,rowsIn-leadsSum),saved=rowsIn?Math.round(cut/rowsIn*100):0;
  const seen=new Set(),asins=new Set();let hot=0,warm=0;
  wk.forEach(r=>{const m=LA[r.source]||{};(r.asins||[]).forEach(a=>{asins.add(a);const k=r.source+'|'+a;if(seen.has(k))return;seen.add(k);const sc=(m[a]&&m[a].state&&+m[a].state.score)||0;if(sc>=75)hot++;else if(sc>=50)warm++;});});
  let checked=0;asins.forEach(a=>{if(V[a])checked++;});
  const wv=Object.values(V).filter(x=>x.at&&new Date(x.at).getTime()>=weekAgo());const yes=wv.filter(x=>x.v==='Yes').length,no=wv.filter(x=>x.v==='No').length,maybe=wv.filter(x=>x.v==='Maybe').length;
  const live=all.filter(s=>s.status!=='paused');const tr=live.reduce((n,s)=>n+toReviewCount(runLast(s.key)),0),trSrc=live.filter(s=>toReviewCount(runLast(s.key))>0).length;
  const k=(v,l,sub,cls,ic)=>`<div class="kpi"><span class="ki ${cls||''}">${ic}</span><div><div class="kv">${v}</div><div class="kl">${l}</div>${sub?`<div class="ks">${sub}</div>`:''}</div></div>`;
  $('#bKpis').innerHTML=`<div class="kcap">This week · what actually happened</div>`
    +k(rowsIn.toLocaleString(),'ASINs put through the rules',`${wk.length} run${wk.length===1?'':'s'}`,'',ICONS.hist)
    +k(cut.toLocaleString(),'Cut by the rules',rowsIn?`${saved}% of the work saved`:'','jade',ICONS.eye)
    +k(seen.size.toLocaleString(),'Leads found',`${newN.toLocaleString()} new · ${betterN.toLocaleString()} better`,'iris',ICONS.play)
    +k(hot.toLocaleString(),'Bangers · score 75+',`${warm.toLocaleString()} scored 50–74`,hot?'jade':'',ICONS.run)
    +k(yes.toLocaleString(),'Approved · Yes',`${no} No · ${maybe} Maybe`,yes?'jade':'',ICONS.edit)
    +k(asins.size?Math.round(checked/asins.size*100)+'%':'—','Checked',asins.size?`${checked.toLocaleString()} of ${asins.size.toLocaleString()} leads judged`:'no leads yet',asins.size&&checked/asins.size<.5?'coral':'jade',ICONS.eye)
    +k(tr.toLocaleString(),'To review now',trSrc?`across ${trSrc} filter${trSrc===1?'':'s'}`:'','iris',ICONS.eye)
    +k(due,'Due today',`${active} active · ${testing} testing`,due?'amber':'jade',ICONS.cal);}
function listSorted(){const L=srcAll();const last=s=>runLast(s.key);const t=s=>{const l=last(s);return l?l.at:'';};
  const cmp={due:(a,b)=>(dueRank(a)-dueRank(b))||a.name.localeCompare(b.name),name:(a,b)=>a.name.localeCompare(b.name),
    owner:(a,b)=>(a.owner||'VAs').localeCompare(b.owner||'VAs')||a.name.localeCompare(b.name),
    last:(a,b)=>(t(b)>t(a)?1:t(b)<t(a)?-1:0)||a.name.localeCompare(b.name),
    leads:(a,b)=>(((last(b)||{}).leads||0)-((last(a)||{}).leads||0))||a.name.localeCompare(b.name),
    review:(a,b)=>(toReviewCount(last(b))-toReviewCount(last(a)))||a.name.localeCompare(b.name),
    cadence:(a,b)=>((CADENCE_DAYS[a.cadence]||99)-(CADENCE_DAYS[b.cadence]||99))||a.name.localeCompare(b.name)}[lview.sort]||null;
  if(!cmp)return srcSorted();
  return L.sort((a,b)=>(a.type===b.type?0:a.type==='filter'?-1:1)||cmp(a,b));}
function segCounts(){const all=visibleSources();const c={due:0,mine:0,all:all.length,active:0,paused:0};
  all.forEach(s=>{if(dueState(s).due)c.due++;if(s.status==='paused')c.paused++;else c.active++;if((me()&&s.owner===me())||(lockFresh(s)&&ownLock(s)))c.mine++;});
  document.querySelectorAll('#lSeg button').forEach(b=>{const n=b.querySelector('b');if(n)n.textContent=c[b.dataset.seg]||0;});
  const nb=$('#lvnBrands'),nr=$('#lvnRuns'),nl=$('#lvnLeads');if(nb)nb.textContent=all.length;if(nr)nr.textContent=runsAll().length;
  if(nl){let n=0;const LA=leadAll();Object.values(LA).forEach(m=>n+=Object.keys(m||{}).length);nl.textContent=n.toLocaleString();}}
/* b60 (Jack: "needs to be smooth and easy for my VAs"): the next thing to run, for whoever is signed in */
function nextDue(fromKey){const m=me();const L=visibleSources().filter(s=>s.status!=='paused'&&s.key!==fromKey&&dueState(s).due);
  L.sort((a,b)=>((m&&b.owner===m)-(m&&a.owner===m))||(dueRank(a)-dueRank(b))||a.name.localeCompare(b.name));return L[0]||null;}
function renderYourDay(){const el=$('#yourDay');if(!el)return;const m=me();if(!m){el.hidden=true;return;}
  const mine=srcAll().filter(s=>s.status!=='paused'&&(s.owner===m||(m==='Jack'&&false)));const due=mine.filter(s=>dueState(s).due);
  const tr=mine.reduce((n,s)=>n+toReviewCount(runLast(s.key)),0);const nx=nextDue(null);
  const dueAny=srcAll().filter(s=>s.status!=='paused'&&dueState(s).due).length;
  el.innerHTML=`<div class="yd"><span class="ydn">${whoChip(m)}</span><span class="ydt">${mine.length?(due.length?`<b>${due.length}</b> of your ${mine.length} filters ${due.length===1?'is':'are'} due today`:`all ${mine.length} of your filters are done for today ✓`):`nothing is assigned to you yet`}${tr?` · <b>${tr.toLocaleString()}</b> lead${tr===1?'':'s'} waiting for a look`:''}${!due.length&&dueAny?` · ${dueAny} due for others`:''}</span>
    ${nx?`<button class="btn primary sm" type="button" data-start="${nx.key}">${ICONS.run}Start with ${escapeHtml(nx.name)}${nx.owner!==m?' ('+((!nx.owner||nx.owner===NO_OWNER)?'unassigned':(nx.owner==='VAs'?'VAs':escapeHtml(nx.owner)+"'s"))+')':''}</button>`:''}</div>`;el.hidden=false;}
const HOWTO_KEY='bdl-sourcing-howto-hidden';
function renderHowTo(){const el=$('#howTo');if(!el)return;el.hidden=!!lsGet(HOWTO_KEY,false);}
function renderList(){renderKpis();renderApprovals();segCounts();renderYourDay();renderHowTo();const q=lview.q.toLowerCase();
  const rows=listSorted().filter(s=>{
    if(!canSee(s))return false;   /* b132: a VA sees her own sources and nobody else's */
    if(lview.seg==='due'&&!dueState(s).due)return false;
    if(lview.seg==='paused'&&s.status!=='paused')return false;
    if(lview.seg==='active'&&s.status==='paused')return false;
    if(lview.type!=='ALL'&&(s.type==='filter'?'filter':'brand')!==lview.type)return false;
    if(lview.seg==='mine'&&!(me()&&s.owner===me())&&!(lockFresh(s)&&ownLock(s)))return false;
    if(lview.market!=='ALL'&&!s.markets.includes(lview.market))return false;
    if(lview.rule!=='ALL'&&String(s.rule)!==lview.rule)return false;
    if(lview.owner!=='ALL'&&(s.owner||NO_OWNER)!==lview.owner)return false;
    if(q&&!((s.name+' '+(s.note||'')).toLowerCase().includes(q)))return false;return true;});
  const tb=$('#brandTbl');
  if(!rows.length){tb.innerHTML=`<tbody><tr><td colspan="8" style="text-align:center;color:var(--faint);padding:22px">${lview.seg==='due'?'Nothing due — everything has been run inside its cadence.':lview.seg==='mine'?(me()?'Nothing is yours yet — Jack sets the owner in Edit.':'Pick who you are (top right) to see your list.'):'Nothing here.'}</td></tr></tbody>`;return;}
  const rowHtml=s=>{const d=dueState(s),last=runLast(s.key),nx=nextRun(s),tok=tokenEstimate(s),lk=lockFresh(s)?s.inProgress:null,mine=lk&&ownLock(s),tr=toReviewCount(last);
    return`<tr class="${s.status==='paused'?'paused':(d.cls==='due'?'isdue':d.cls==='done'?'isdone':'')}" data-key="${s.key}">
      <td class="namec"><div class="brandcell">${avatar(s)}<div class="ntext"><div class="nline"><span class="bname">${escapeHtml(s.name)}</span><span class="rl r${s.rule}" title="${RULE_LABEL[s.rule]||''}">Rule ${s.rule}</span></div><span class="note" title="${escapeHtml(s.note||'')}">${escapeHtml(s.note||(s.type==='filter'?'Saved Keepa filter':'Brand run · UK sell side'))}</span></div></div></td>
      <td class="ownc">${isJack()?`<select class="inl ownsel ${ownCls(s.owner||NO_OWNER)}" data-key="${s.key}" title="Who runs this — saves straight away">${OWNER_OPTS.map(u=>`<option${(s.owner||'VAs')===u?' selected':''}>${u}</option>`).join('')}</select>`:whoChip(s.owner||'VAs')}</td>
      <td><div class="flags" title="${s.markets.join(' · ')}">${s.markets.map(m=>`<span class="f">${FLAG[m]}</span>`).join('')}</div></td>
      <td class="stc">${isJack()?`<select class="inl stsel s-${s.status}" data-key="${s.key}" title="Active runs on its cadence · Testing = trial · Paused = off the list — saves straight away">${Object.entries(STATUS_LABEL).map(([k,l])=>`<option value="${k}"${s.status===k?' selected':''}>${l}</option>`).join('')}</select><select class="inl cadsel" data-key="${s.key}" title="How often it should run — saves straight away">${Object.entries(CADENCE_LABEL).map(([k,l])=>`<option value="${k}"${s.cadence===k?' selected':''}>${l}</option>`).join('')}</select>`:`<span class="st ${s.status}"><i></i>${STATUS_LABEL[s.status]||s.status}</span><span class="l2">${CADENCE_LABEL[s.cadence]||s.cadence}</span>`}${lk?`<div class="inprog" title="${mine?'You have this open':escapeHtml(lk.who)+' opened this '+fmtWhen(lk.at)+' and is working through it'}"><i></i>${mine?'you':escapeHtml(lk.who)} on it · ${new Date(lk.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>`:''}</td>
      <td class="lastc" title="${last?`${last.leads} leads · ${last.new} new · ${last.better} better · ${last.worse} worse · ${last.gone} gone`:''}">${last?`<span class="l1">${fmtWhen(last.at)}${last.who?` ${whoChip(last.who)}`:''}</span><span class="l2">${last.leads} leads · <span class="tr ${tr?'':'zero'}">${tr?tr+' to review':'all reviewed'}</span></span>`:`<span class="l1 dim">Not run yet</span>`}</td>
      <td class="nextc"><span class="nx ${d.cls}">${d.label}</span><span class="l2" title="Run by export today = 0 Keepa tokens. If this ran through the API by itself it would cost about ${tok.toLocaleString()} tokens.">${d.sub||'by export'}</span></td>
      <td class="actc"><div class="acts">${finderLink(s)?`<a class="ib" href="${finderLink(s)}" target="_blank" rel="noopener" title="${s.link?'Open the saved Keepa filter':'Open the generated Keepa filter (edit to paste your own)'}">${ICONS.ext}</a>`:`<span class="ib nolink" title="No Keepa link saved yet — Edit and paste it">?</span>`}<button class="btn run xs" data-act="run" ${s.status==='paused'?'disabled':''} title="${lk&&!mine?'Someone else has it open — you can still join':''}">${ICONS.run}${lk&&!mine?'Join':'Run'}</button>${isJack()?`<button class="ib" data-act="edit" title="Edit">${ICONS.edit}</button>`:''}
        <div class="menu"><button class="ib" data-act="menu" aria-label="More">⋮</button>
          <div class="pop"><button data-act="history">${ICONS.hist}History</button>${isJack()?`<button data-act="pause">${s.status==='paused'?ICONS.play:ICONS.pause}${s.status==='paused'?'Set active':'Pause'}</button>`:''}${lk?`<button data-act="unlock">${ICONS.eye}Clear "on it"</button>`:''}${isJack()?`<button data-act="delete" class="danger">${ICONS.trash}Delete</button>`:''}</div></div></div></td></tr>`;};
  const head=`<thead><tr><th>Name</th><th>Owner</th><th>Buy from</th><th>Status · cadence</th><th>Last run</th><th>Next run</th><th></th></tr></thead>`;
  const filters=rows.filter(s=>s.type==='filter'),brands=rows.filter(s=>s.type!=='filter');
  const group=(label,list)=>list.length?`<tr class="grp"><td colspan="8"><span class="gl">${label}</span><span class="gn">${list.length}</span></td></tr>`+list.map(rowHtml).join(''):'';
  tb.innerHTML=head+'<tbody>'+group('Saved filters',filters)+group('Brands',brands)+'</tbody>';}
function onListClick(e){const b=e.target.closest('button[data-act]');if(!b){closeMenus();return;}
  const tr=b.closest('tr'),key=tr&&tr.dataset.key,s=key&&srcGet(key);if(!s)return;const act=b.dataset.act;
  if(act==='menu'){const m=b.closest('.menu');const open=m.classList.contains('open');closeMenus();if(!open)m.classList.add('open');e.stopPropagation();return;}
  closeMenus();
  if(act==='run')openRun(key);
  else if(act==='edit'){if(!isJack()){toast('Only Jack edits filters — ask him',true);return;}openEdit(s);}
  else if(act==='history')openHistory(s);
  else if(act==='unlock'){srcUnlock(s);renderList();toast('Cleared');}
  else if(act==='pause'){if(!isJack()){toast('Only Jack pauses filters',true);return;}s.status=s.status==='paused'?'active':'paused';s.paused=s.status==='paused';srcSave(s);renderList();toast(s.name+(s.status==='paused'?' paused':' set active'));}
  else if(act==='delete'){if(!isJack()){toast('Only Jack deletes filters',true);return;}if(!confirm('Delete '+s.name+' from the list for everyone? Its run history is kept.'))return;srcRemove(key);renderList();toast(s.name+' deleted');}}
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
  const seg=(id,opts,val)=>`<div class="segf" id="${id}">${opts.map(([v,l,sub])=>`<button type="button" data-v="${v}" class="${v===val?'on':''}">${l}${sub?`<span>${sub}</span>`:''}</button>`).join('')}</div>`;
  openDrawer(`<div class="dhead">${isNew?'<span class="avatar" style="background:var(--iris)">+</span>':avatar(s)}<div><h3>${isNew?'Add a brand or filter':escapeHtml(s.name)}</h3><p class="dsub">${isNew?'Something we want to keep running. Saved for everyone.':'Changes apply to the next run, for everyone. History is untouched.'}</p></div></div>
  <div class="form">
    <div class="fsec"><div class="fst">What it is</div>
      <div class="field"><label>Name</label><input class="full" id="eName" value="${escapeHtml(s.name)}" placeholder="e.g. Corsair, or Suz · Subscribe & Save UK" autocomplete="off"></div>
      <div class="field"><label>Type</label>${seg('eTypeSeg',[['brand','Brand','a brand we watch'],['filter','Saved Keepa filter','a search Jack built']],s.type)}<input type="hidden" id="eType" value="${s.type}"></div>
      <div class="field"><label>Rule</label>
        <div class="rcards" id="eRuleCards">
          <label class="rcard"><input type="radio" name="eRule" value="1"${s.rule===1?' checked':''}><b>Rule 1</b><span>Buy UK or EU, sell UK. Finder export per market, then the UK Product Viewer.</span></label>
          <label class="rcard"><input type="radio" name="eRule" value="2"${s.rule!==1?' checked':''}><b>Rule 2</b><span>UK Amazon-to-Amazon. One UK Finder export. Sell price by price band, S&amp;S / Business / coupons off the buy price, Rule 3 VAT — all decided per product, not per filter.</span></label>
        </div></div>
    </div>
    <div class="fsec" id="secMarkets"><div class="fst">Where it buys</div>
      <div class="field"><div class="mks">${MARKETS.map(m=>`<label class="mk-chip"><input type="checkbox" value="${m}"${s.markets.includes(m)?' checked':''}><span>${FLAG[m]} ${m}</span></label>`).join('')}</div><p class="hintline">We always sell in the UK. Tick every marketplace the Finder should be run on.</p></div>
    </div>
    <div class="fsec"><div class="fst">Who and when</div>
      <div class="field"><label>Owner</label>${seg('eOwnerSeg',[['Jack','Jack'],['Mera','Mera'],['Suz','Suz'],['VAs','VAs']],s.owner||'VAs')}<input type="hidden" id="eOwner" value="${escapeHtml(s.owner||'VAs')}"></div>
      <div class="field"><label>How often</label>${seg('eCadSeg',Object.keys(CADENCE_LABEL).map(c=>[c,CADENCE_LABEL[c]]),s.cadence)}<input type="hidden" id="eCad" value="${s.cadence}"></div>
      <div class="field"><label>Status</label>
        <div class="scards">
          <label class="scard active"><input type="radio" name="eStatus" value="active"${s.status==='active'?' checked':''}><i></i><b>Active</b><span>runs on its cadence, shows as due</span></label>
          <label class="scard testing"><input type="radio" name="eStatus" value="testing"${s.status==='testing'?' checked':''}><i></i><b>Testing</b><span>we are trying it out</span></label>
          <label class="scard paused"><input type="radio" name="eStatus" value="paused"${s.status==='paused'?' checked':''}><i></i><b>Paused</b><span>greyed out, never due</span></label>
        </div></div>
    </div>
    <div class="fsec"><div class="fst">Keepa</div>
      <div class="field"><label>Filter link</label>
        <div class="linkrow"><input class="full" id="eLink" value="${escapeHtml(s.link||'')}" placeholder="paste a keepa.com/#!finder/… link" autocomplete="off"><a class="btn ghost sm" id="eLinkOpen" href="${escapeHtml(finderLink(s)||'#')}" target="_blank" rel="noopener">Open ${ICONS.ext}</a></div>
        <p class="hintline" id="eLinkState"></p></div>
      <div class="field" id="fBrands"><label>Brand names as Keepa spells them</label><input class="full" id="eBrands" value="${escapeHtml((s.brands||[]).join(', '))}" placeholder="Logitech, Logitech G, Logitech for Creators"><p class="hintline">Keepa's brand filter is exact. Leave blank to use the name.</p></div>
      <div class="field" id="fVat"><label class="chk"><input type="checkbox" id="eVat0"${s.vat0?' checked':''}> Everything on this filter is 0% VAT (tea &amp; coffee)</label><p class="hintline">Every row is worked at 0% unless it reads like a machine. A VA's 20% click on a row still wins.</p></div>
    </div>
    <div class="fsec"><div class="fst">Notes</div>
      <div class="field"><textarea id="eNote" placeholder="anything the VA should know before running it">${escapeHtml(s.note||'')}</textarea></div>
      ${!isNew?`<p class="hintline">Floors: ${escapeHtml(floorsLabel(s.filters)||'none set')}. Set them on the run screen.</p>`:''}
    </div>
  </div>
  <div class="dfoot">${!isNew?`<button class="btn ghost danger" id="dDelete">Delete</button>`:''}<span class="spacer"></span><button class="btn ghost" id="dCancel">Cancel</button><button class="btn primary" id="dSave"><span class="lab">${isNew?'Add':'Save changes'}</span></button></div>`);
  const rule=()=>parseInt((document.querySelector('input[name=eRule]:checked')||{}).value||'1');
  const paint=()=>{const type=$('#eType').value,r=rule();
    $('#secMarkets').hidden=r!==1;$('#fBrands').hidden=type!=='brand';$('#fVat').hidden=type!=='filter';
    if(r!==1){document.querySelectorAll('#drawerBody .mks input').forEach(c=>{c.checked=c.value==='UK';});}
    const link=$('#eLink').value.trim();const st=$('#eLinkState');const open=$('#eLinkOpen');
    if(link){st.textContent='Saved link — this exact filter opens for whoever runs it. One link works on every marketplace: switch the locale in Keepa.';st.className='hintline ok';open.href=link;open.hidden=false;}
    else if(type==='brand'){st.textContent='No link saved — a brand + Amazon-down-9% filter is generated from the name. Paste your own to replace it.';st.className='hintline warn';open.href=finderLink({name:$('#eName').value||s.name,brands:$('#eBrands').value.split(',').map(x=>x.trim()).filter(Boolean)});open.hidden=false;}
    else{st.textContent='No link saved yet — paste the Finder link, otherwise the run screen has nothing to open.';st.className='hintline warn';open.hidden=true;}};
  document.querySelectorAll('#drawerBody .segf').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(!b)return;g.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    const hid=$('#'+g.id.replace('Seg',''));hid.value=b.dataset.v;
    if(g.id==='eTypeSeg'){const r=rule();if(b.dataset.v==='brand')document.querySelector('input[name=eRule][value="1"]').checked=true;else if(r===1)document.querySelector('input[name=eRule][value="2"]').checked=true;}
    paint();}));
  document.querySelectorAll('input[name=eRule]').forEach(r=>r.addEventListener('change',paint));
  $('#eLink').addEventListener('input',paint);$('#eBrands').addEventListener('input',paint);
  $('#dCancel').addEventListener('click',closeDrawer);
  if(!isNew)$('#dDelete').addEventListener('click',()=>{if(!confirm('Delete '+s.name+' from the list for everyone? Its run history is kept.'))return;srcRemove(s.key);closeDrawer();if(cur&&cur.key===s.key){cur=null;backToList();}renderList();toast(s.name+' deleted');});
  $('#dSave').addEventListener('click',()=>{const name=$('#eName').value.trim();if(!name){toast('Name needed',true);$('#eName').focus();return;}
    const type=$('#eType').value,r=rule();
    const markets=r===1?[...document.querySelectorAll('#drawerBody .mks input[type=checkbox][value]:checked')].map(c=>c.value):['UK'];if(!markets.length){toast('Tick at least one marketplace',true);return;}
    const key=isNew?srcKeyFor(name):s.key;if(isNew&&srcGet(key)){toast(name+' is already in the list',true);return;}
    const status=(document.querySelector('input[name=eStatus]:checked')||{}).value||'testing';
    const out=Object.assign({},s,{key,name,type,rule:r,markets,cadence:$('#eCad').value,owner:$('#eOwner').value||'VAs',note:$('#eNote').value.trim(),status,paused:status==='paused',
      brands:type==='brand'?$('#eBrands').value.split(',').map(x=>x.trim()).filter(Boolean):[],link:$('#eLink').value.trim(),vat0:type==='filter'&&$('#eVat0').checked});
    srcSave(out);closeDrawer();renderList();toast(isNew?name+' added — everyone sees it':'Saved for everyone');if(cur&&cur.key===key){cur=out;paintRunHead();paintFloors();renderGuide();}});
  paint();setTimeout(()=>$('#eName').focus(),50);}
function openHistory(s){const runs=runsFor(s.key).slice().reverse(),V=verdAll();
  openDrawer(`<h3>${escapeHtml(s.name)} · history</h3><p class="dsub">${runs.length} run${runs.length===1?'':'s'} · shared</p>
    <div class="hist">${runs.length?runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;});
      return`<div class="h"><span class="w">${fmtWhen(r.at)}${r.who?'<br>'+escapeHtml(r.who):''}</span><span class="l"><b>${r.leads}</b> leads · ${r.new} new · ${r.better} better · ${r.worse} worse · ${r.gone} gone${r.blacklisted?' · '+r.blacklisted+' blacklisted':''}</span><span class="v">${y}Y ${n}N ${m}M</span></div>`;}).join(''):'<div class="empty"><span>Not run yet.</span></div>'}</div>
    <div class="dfoot"><button class="btn ghost danger" id="dForget">Forget history</button><button class="btn ghost" id="dClose">Close</button></div>`);
  $('#dClose').addEventListener('click',closeDrawer);
  $('#dForget').addEventListener('click',()=>{if(!confirm('Forget every saved run and the compare baseline for '+s.name+' — for everyone? The next run shows everything as NEW. Verdicts are kept.'))return;histForget(s.key);runsForget(s.key);apiLookForget(s.key);closeDrawer();renderList();renderLog();toast('History cleared for '+s.name);});}
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
  if(cur&&cur.key!==key){srcUnlock(cur);clearRun();view.q='';view.page=1;const fq=$('#fQ');if(fq)fq.value='';}cur=s;touched.clear();blPick=null;
  if(!(lockFresh(s)&&ownLock(s)))srcLock(cur);
  if(!me()){toast('Pick who you are (top right) so this run carries your name',true);const w=$('#whoSel');if(w){w.classList.add('shake');setTimeout(()=>w.classList.remove('shake'),600);}}
  $('#viewList').hidden=true;$('#viewRun').hidden=false;paintRunHead();paintSlots();paintFloors();renderGuide();
  {const tc=document.querySelector('#viewRun .twocol');if(tc)tc.classList.add('one');}   /* b48/b55: every source stacks — no dead column either side (Jack, ASUS run) */
  $('#sumEmpty').textContent='Loading the shared compare baseline…';
  await cloudPullLeads(key);run();window.scrollTo({top:0,behavior:'smooth'});}
function backToList(){if(cur&&ownLock(cur))srcUnlock(cur);$('#viewRun').hidden=true;$('#viewList').hidden=false;renderList();}
function paintRunHead(){const s=cur;$('#runAvatar').innerHTML=avatar(s);$('#runName').textContent=s.name;$('#runEdit').hidden=!isJack();
  $('#runMk').innerHTML=s.markets.map(m=>`<i class="mk ${m==='UK'?'uk':''}">${m}</i>`).join(' ');
  const ol=otherLock(s);const lk=ol?` · <span class="lock">${escapeHtml(ol.who)} is also on this (since ${new Date(ol.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})})</span>`:'';
  $('#runMeta').innerHTML=`${whoChip(s.owner||'VAs')} <span class="rl r${s.rule}">Rule ${s.rule} · ${RULE_LABEL[s.rule]||''}</span> <span class="st ${s.status}"><i></i>${STATUS_LABEL[s.status]||''}</span> <span class="mchip">${CADENCE_LABEL[s.cadence]||s.cadence}</span>`+(s.note?` <span class="mnote" title="${escapeHtml(s.note)}">${escapeHtml(s.note)}</span>`:'')+lk;
  paintRunStrip();paintNext();
  const r1=s.rule===1;
  const uk1=r1&&s.markets.every(m=>m==='UK');
  $('#step1Title').textContent=r1&&!uk1?'Drop the Product Finder exports':"Drop this morning's export";
  $('#step1Sub').textContent=r1&&!uk1?`Finder export for each of ${s.markets.join(' · ')}, then the UK Product Viewer. Any order.`:uk1?'UK Product Finder, all columns. One file — it carries the UK sell side too, so no Viewer is needed.':'UK Product Finder, all columns. One file.';
  const link=finderLink(s);
  if(!link){$('#keepaRow').innerHTML=`<span class="nolinkmsg">No Keepa link saved for this yet — <button type="button" class="linkbtn" id="keepaEdit">Edit</button> and paste the Finder link. Exports can still be dropped below.</span>`;$('#keepaEdit').addEventListener('click',()=>openEdit(cur));return;}
  $('#keepaRow').innerHTML=`<span class="lab">Open in Keepa:</span>`+(r1&&!uk1?s.markets.map(m=>`<a href="${link}" data-mk="${m}" target="_blank" rel="noopener" title="Same filter for every market — after it opens, switch Keepa's marketplace (flag, top right) to ${m}, run, export">${FLAG[m]} ${m}<span class="tick">✓</span>${ICONS.ext}</a>`).join('')+`<span class="mkhint">Same filter for all ${s.markets.length}. Keepa cannot take the marketplace from a link — after it opens, switch the flag top-right of Keepa to that country, run, export. One file per country.</span>`:`<a href="${link}" target="_blank" rel="noopener">${FLAG.UK} the filter${ICONS.ext}</a>`)+(s.link?'':`<span class="lab" style="margin-left:6px">generated from the brand name — edit to paste your own</span>`);paintApiRun();}   /* b138: inside the painter, not after it */
function paintNext(){const nx=cur?nextDue(cur.key):null;['#runNext','#runNext2'].forEach(id=>{const b=$(id);if(!b)return;b.hidden=!nx;if(nx){b.innerHTML=(id==='#runNext2'?'Done — next due: ':'Next due: ')+escapeHtml(nx.name)+' →';b.dataset.key=nx.key;}});}
/* b59 (Jack: "make it easier to see the history"): the last runs of this source sit under its name, one chip each; the whole history and
   every lead it ever kept are one click away */
function paintRunStrip(){const el=$('#runStrip');if(!el||!cur)return;const runs=runsFor(cur.key).slice().reverse();const V=verdAll();
  const look=isJack()?apiLookFor(cur.key):null;   /* b139: Jack's API look sits beside the real runs, marked, never counted */
  if(!runs.length&&!look){el.hidden=true;el.innerHTML='';return;}
  const lookChip=look?`<button type="button" class="rchip api" data-look="1" title="Your Keepa API look · ${fmtWhen(look.at)} · ${(look.rowsIn||0).toLocaleString()} in → ${look.leads} leads · ${look.new||0} new · not saved as a run, the due date has not moved"><span class="d">API</span><b>${look.leads}</b><span class="s">leads</span><span class="tr z">${fmtWhen(look.at).toLowerCase()}</span></button>`:'';
  const chips=runs.slice(0,7).map(r=>{let y=0,j=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;j++;if(v.v==='Yes')y++;});const tr=toReviewCount(r);
    return`<button type="button" class="rchip${tr?'':' done'}" data-run="${r.day||r.at.slice(0,10)}" title="${escapeHtml(r.name)} · ${fmtWhen(r.at)}${r.who?' · '+escapeHtml(r.who):''} · ${r.rowsIn||0} in → ${r.leads} leads · ${r.new} new · ${r.better||0} better · ${j} judged"><span class="d">${ukDate(r.at).replace(/^\w+ /,'').replace(/\/\d{4}/,'')}</span><b>${r.leads}</b><span class="s">leads</span>${y?`<span class="y">${y}Y</span>`:''}<span class="tr ${tr?'':'z'}">${tr?tr+' to review':'all judged'}</span></button>`;}).join('');
  const tot=runs.reduce((n,r)=>n+(r.leads||0),0);
  el.innerHTML=`<span class="rl-lab">Last runs</span>${lookChip}${chips}${runs.length>7?`<button type="button" class="rchip more" data-act="hist">+${runs.length-7} more</button>`:''}<span class="rl-tot">${runs.length?`${runs.length} run${runs.length===1?'':'s'} · ${tot.toLocaleString()} leads all time`:'no export run yet'}</span>`;el.hidden=false;}
/* floors: the inputs ARE this source's floors — saved as you type, shared, applied to every run of it */
function paintFloors(){if(!cur)return;const f=cur.filters||{};const r1=cur.rule===1;
  FLOORS.forEach(([k,l,scope])=>{const el=$('#fl_'+k);if(!el)return;el.parentElement.hidden=(scope==='r2'&&r1);if(document.activeElement!==el)el.value=f[k]==null?'':f[k];});
  const lab=floorsLabel(f);$('#floorSaved').innerHTML=lab?`<b>${escapeHtml(cur.name)}:</b> ${escapeHtml(lab)} · saved for everyone`:`Your own limits for ${escapeHtml(cur.name)}, like Filter &amp; sort on the Keepa console. The rule already keeps only products with 10+ bought or 10+ rank drops a month; type a number to go stricter — saved for everyone who runs this.`;
  $('#floorClear').hidden=!lab;}
let floorT=null,relogT=null;
function onFloorInput(){if(!cur)return;clearTimeout(floorT);floorT=setTimeout(()=>{const f={};FLOORS.forEach(([k])=>{const el=$('#fl_'+k);if(!el)return;const v=el.value.trim();if(v!==''&&!isNaN(+v)&&+v>0)f[k]=+v;});
  const same=JSON.stringify(f)===JSON.stringify(cur.filters||{});if(same)return;
  if(Object.keys(f).length)cur.filters=f;else delete cur.filters;srcSave(cur);paintFloors();
  const fs=$('#floorSaved');fs.classList.add('flash');setTimeout(()=>fs.classList.remove('flash'),900);
  run();   /* re-run keeps the same sig, so nothing is re-logged on every keystroke… */
  clearTimeout(relogT);relogT=setTimeout(()=>{lastSig='';run();},2500);   /* …the run row + baseline catch up once typing stops */
  },900);}
/* the step strip: exactly what to do next, with ticks as it happens */
function renderGuide(){const g=$('#guide');if(!g||!cur)return;const r1=cur.rule===1;
  const have=MARKETS.filter(m=>files[m]).length,want=r1?cur.markets.filter(m=>m!=='UK'||!files.viewer).length:0;const anyFinder=MARKETS.some(m=>files[m]);
  const bar=$('#asinBar'),merged=(bar&&bar._all)?bar._all.length:0;
  const rev=result?result.out.filter(o=>o.QUEUE).length:0;
  const EXPORT=['At the bottom of the Keepa table, set rows per page to the biggest number, so every result is on one page. Keepa only exports the page you can see.',
    'One-off, once per browser: open the column picker and tick Variation Count, Variation ASINs and Variation Attributes; under Reviews tick Rating, Rating Count and Review Count - Format Specific; under Monthly Sales Trends tick Monthly Sold (Last Known) and Monthly Sold Date (Last Known). '
      +'Without them we cannot tell a listing with one option from one with ninety, and the sales figure belongs to the whole listing.',
    'Click Export (top right of the table). In the Export Data box choose: What to export → All active columns. Format → CSV. Leave "Include currency symbols" unticked. Press Export.',
    'The file lands in your Downloads. Do not open or rename it.'];
  const HOW={open:['Click the 🇬🇧 the filter button under step 1. Keepa opens with this saved search loaded.','Wait until the table has finished filling.'],
    exp:EXPORT,
    drop:['Drag the downloaded CSV onto the big box under step 1, or click the box and pick it from Downloads.','The numbers appear on the right straight away. If a yellow warning says a column is missing, switch that column on in Keepa (the columns button above the table) and export again.'],
    review:['Click Open all in Keepa — every lead on the page opens in one go.','Read each graph. Back here, click Y (buy), N (no) or M (maybe) on that lead\'s row. A No needs a reason chip.','When the To-review list is empty, press Next due →.'],
    openEach:['Click 🇬🇧 UK under step 1. Keepa opens the filter on the UK site. Wait for the table, then export (step 2).','Click 🇩🇪 DE. The same filter opens — now change Keepa\'s own country with the flag at the top right of Keepa to Germany and wait for the table to reload. Export again.','Repeat for each flag. One export per country.'],
    expEach:EXPORT.concat(['Do this once per country. File names do not matter — the app reads the country from inside the file.']),
    dropAll:['Drop all the country files on the box at once.','The chips under the box show which countries are in.'],
    viewer:['Click Open UK Product Viewer with them loaded. Every ASIN from the country files goes in, merged and de-duped.','Wait for the Viewer table to fill.'],
    viewerExp:EXPORT,
    viewerDrop:['Drop the Viewer file on the same box. Leads appear.']};
  let steps;
  if(r1&&ukOnly())steps=[
    ['Open the Keepa filter',FLAG.UK+' UK',!!files.viewer,HOW.open],
    ['Export CSV — all columns','one file · it has the sell side too',!!files.viewer,HOW.exp],
    ['Drop it here','leads appear',!!result,HOW.drop],
    ['Review what needs a look',result?`${rev} to review`:'',!!result&&rev===0,HOW.review]];
  else if(r1)steps=[
    ['Open the Keepa filter for each market',`${cur.markets.map(m=>FLAG[m]).join(' ')} · switch Keepa's country, run it`,anyFinder,HOW.openEach],
    ['Export CSV from each',`all columns · ${cur.markets.length} file${cur.markets.length===1?'':'s'}`,anyFinder,HOW.expEach],
    ['Drop them here',`${have} of ${cur.markets.length} in`,have>=cur.markets.length&&have>0,HOW.dropAll],
    ['Open the UK Product Viewer with the ASINs',merged?`${merged.toLocaleString()} ASINs merged — one click below`:'the app merges and de-dupes them',!!files.viewer,HOW.viewer],
    ['Export ALL columns from the Viewer','this is the UK selling side: sales, fees, offers',!!files.viewer,HOW.viewerExp],
    ['Drop the Viewer export here','leads appear',!!result,HOW.viewerDrop],
    ['Review what needs a look',result?`${rev} to review`:'',!!result&&rev===0,HOW.review]];
  else steps=[
    ['Open the Keepa filter',finderLink(cur)?FLAG.UK+' UK':'no link saved yet — Edit and paste it',!!files.one,HOW.open],
    ['Export CSV — all columns','one file',!!files.one,HOW.exp],
    ['Drop it here','leads appear',!!result,HOW.drop],
    ['Review what needs a look',result?`${rev} to review`:'',!!result&&rev===0,HOW.review]];
  let next=steps.findIndex(s=>!s[2]);
  const full=guideFull();g.classList.toggle('full',full);
  const intro=result?(rev?`<b>${rev} lead${rev===1?'':'s'} need a look.</b> Open them in Keepa, or mark Y / N / M on the row — every click is shared. <b>All leads</b> shows everything this run kept.`:`<b>Nothing new to review.</b> Everything here is the same as last time or already judged — <b>All leads</b> shows the full list.`)
    :`<b>How this works:</b> open the Keepa filter → export the CSV (all columns) → drop it here. The rules cut the list down; you judge what is left. Nothing here needs a login — pick your name top right and every click is saved for everyone.`;
  g.innerHTML=`<div class="ghead">${intro}<button type="button" class="linkbtn gtog" id="guideTog">${full?'Compact view':'Step-by-step'}</button></div>`+steps.map((s,i)=>`<div class="gs ${s[2]?'done':i===next?'now':''}"><span class="gn">${s[2]?'✓':i+1}</span><div><div class="gt">${escapeHtml(s[0])}</div>${s[1]?`<div class="gd">${escapeHtml(s[1])}</div>`:''}${full&&s[3]?`<ul class="gh">${(Array.isArray(s[3])?s[3]:[s[3]]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}</div></div>`).join('');
  $('#guideTog').addEventListener('click',()=>{lsSet(GUIDE_KEY,!guideFull());renderGuide();});}
/* b60: VAs get the full step-by-step by default; Jack gets the compact strip. Either can switch, remembered per browser. */
const GUIDE_KEY='bdl-sourcing-guidefull';
function guideFull(){const v=lsGet(GUIDE_KEY,null);return v==null?me()!=='Jack':!!v;}
function ukOnly(){return!!(cur&&cur.rule===1&&cur.markets.every(m=>m==='UK'));}
function sig(){return SLOTS.map(k=>files[k]?files[k].name+':'+files[k].rows.length:'').join('|')+'|'+(files.one?files.one.name+':'+files.one.rows.length:'');}
async function handleFiles(list){const arr=[...list];if(!arr.length||!cur)return;
  /* b131 (ShiftTrack, 21 Sep: 13 of 35 runs came back with a blank who). Judging always asked who you are, dropping an export
     never did — so a run could be saved with nobody's name on it, and ShiftTrack cannot say what Suz ran today. The export is
     held, the question is asked, and the drop replays itself the moment a name is set. */
  if(!me()){pendingFiles=arr;needMe();toast('Pick your name first — the export is waiting',true);return;}
  const notes=[];
  for(const file of arr){let d;try{d=describeExport(parseCSV(await readFileText(file)));}catch(e){d=null;}
    if(!d){notes.push(file.name+': no data rows');continue;}
    const f={name:file.name,rows:d.rows,hasFees:d.hasFees,asins:d.asins,domain:d.domain,hasSince:d.hasSince,missing:d.missing||[]};
    if(!d.full&&!d.hasFees){notes.push(file.name+': not a full-column export — needs Title and the demand columns at minimum');continue;}
    if(cur.rule!==1){if(d.domain&&d.domain!=='UK')notes.push(file.name+': this is a '+d.domain+' export — Rule '+cur.rule+' is UK only');
      /* b37 (Jack, 15 Sep: two variants of Suz's filter, 17 leads shared, 23 not) — a second UK export merges into the first, de-duped by ASIN.
         Clear files starts again. */
      if(files.one&&files.one.name!==file.name){const seen=new Set(files.one.rows.map(r=>(r.ASIN||'').trim()));const add=f.rows.filter(r=>!seen.has((r.ASIN||'').trim()));
        files.one={name:files.one.name+' + '+file.name,rows:files.one.rows.concat(add),hasFees:files.one.hasFees&&f.hasFees,asins:null,domain:f.domain,hasSince:files.one.hasSince&&f.hasSince,merged:(files.one.merged||1)+1};
        notes.push(`${file.name}: ${add.length} new ASIN${add.length===1?'':'s'} merged in · ${f.rows.length-add.length} already in the first export`);continue;}
      files.one=f;continue;}
    if(d.domain&&d.domain!=='UK'){files[d.domain]=f;continue;}
    if(ukOnly()){files.viewer=f;files.UK=null;continue;}   /* UK-only brand: the one UK export is buy side and sell side */
    /* UK: Keepa names the file — ProductViewer is the sell side, ProductFinder is the UK buy list.
       Unnamed files fall back to: the biggest UK file with the fee columns is the sell side. */
    const nm=file.name.toLowerCase(),v=files.viewer;
    if(nm.includes('productviewer'))files.viewer=f;
    else if(nm.includes('productfinder'))files.UK=f;
    else if(!v)files.viewer=f;
    else if(f.hasFees&&(!v.hasFees||f.rows.length>=v.rows.length)){files.UK=v;files.viewer=f;}
    else files.UK=f;}
  touched.clear();paintSlots();warn(notes);
  /* b123 (Jack: "we use exports so it should cost 0 tokens"): nothing is asked of Keepa on a drop — the option check is a button Jack presses */
  run();}
/* b128 (Jack, 20 Sep: "add a way where we do a Keepa tracker for all EU prices without export on drops — sometimes EU stuff is
   always profitable in the UK, very very rarely though"). A UK filter run only ever looks at the UK price. This asks Keepa what
   the same product costs in Germany, France, Italy and Spain and runs the brand-run maths on it: EU buy, UK sell, landed.
   Tokens, so it is Jack's button, it works on the leads he ticks, and it says the cost before it spends anything. */
const EU_MK=['DE','FR','IT','ES'];
function euLeadAsins(){if(!result||!result.out)return[];
  const picked=[...view.sel];const from=picked.length?result.out.filter(o=>view.sel.has(o.ASIN)):result.out;
  return from.map(o=>o.ASIN);}
function paintEuLeads(){const tb=document.querySelector('#results .toolbar');if(!tb)return;let b=$('#euLeadsBtn');
  const sellF=cur?(cur.rule===1?files.viewer:files.one):null;
  const show=!!(result&&result.out&&result.out.length&&sellF&&!sellF.fromKeepa&&isJack()&&typeof eupFetch==='function');
  if(!show){if(b)b.hidden=true;return;}
  if(!b){b=document.createElement('button');b.id='euLeadsBtn';b.type='button';b.className='btn ghost';tb.insertBefore(b,$('#judgedPill')||$('#moreMenu')||null);
    b.addEventListener('click',euCheckLeads);}
  b.hidden=false;const as=euLeadAsins(),cost=eupCost(as,EU_MK);
  b.textContent=`Check EU prices · ${as.length} lead${as.length===1?'':'s'}${cost?` · ${cost.toLocaleString()} tokens`:' · cached'}`;
  b.title=view.sel.size?'The leads you have ticked':'Every lead in this run — tick some rows to check only those';}
async function euCheckLeads(){const sellF=cur?(cur.rule===1?files.viewer:files.one):null;if(!sellF||!result)return;
  const asins=euLeadAsins();if(!asins.length)return;
  const cost=eupCost(asins,EU_MK),b=$('#euLeadsBtn');
  if(cost){const left=await eupBalance();
    if(left!=null&&left<cost){toast(`Only ${left} Keepa tokens left, this needs ${cost}`,true);return;}
    if(!confirm(`Ask Keepa what these ${asins.length} products cost in ${EU_MK.join(', ')}?\n\n${cost} tokens${left!=null?` · ${left} left, ${left-cost} after`:''}.\nAmazon's own price only — nothing is flattered.`))return;}
  const was=b.textContent;b.disabled=true;
  try{
    const got=await eupFetch(asins,EU_MK,(done,total,mk)=>{b.textContent=`${mk} · ${done}/${total}`;},rate());
    const set=new Set(asins);const sub={name:sellF.name,rows:sellF.rows.filter(r=>set.has((r.ASIN||'').trim())),hasFees:sellF.hasFees,asins,domain:'UK',hasSince:sellF.hasSince,missing:sellF.missing||[]};
    const R=rule1Compute({viewer:sub,UK:null,DE:got.DE||null,FR:got.FR||null,IT:got.IT||null,ES:got.ES||null},cur.name,rate(),null);
    euShow(R.out.filter(o=>o['Buy market']!=='UK'),asins.length);
  }catch(e){toast('Keepa did not answer — nothing was spent on the failed part',true);}
  b.disabled=false;paintEuLeads();}
function euShow(wins,n){const res=$('#results');if(!res)return;let el=$('#euPanel');
  if(!el){el=document.createElement('div');el.id='euPanel';el.className='eupanel';res.insertBefore(el,res.firstChild);
    el.addEventListener('click',e=>{if(e.target.closest('#euClose')){el.hidden=true;}});}
  el.hidden=false;
  if(!wins.length){el.innerHTML=`<span>Checked <b>${n}</b> lead${n===1?'':'s'} against ${EU_MK.join(', ')} — <b>none</b> are cheaper enough in the EU to work. The prices are cached, so checking again is free.</span><button type="button" class="btn ghost sm" id="euClose">Close</button>`;return;}
  wins.sort((a,b)=>b['ROI %']-a['ROI %']);
  el.innerHTML=`<div class="euph"><span>Checked <b>${n}</b> lead${n===1?'':'s'} in ${EU_MK.join(', ')} — <b>${wins.length}</b> work bought from the EU and sold in the UK.</span><button type="button" class="btn ghost sm" id="euClose">Close</button></div>`
    +`<div class="euprows">${wins.slice(0,12).map(o=>`<div class="euprow"><span class="mk">${FLAG[o['Buy market']]||''} ${o['Buy market']}</span><a href="${o.Keepa}" target="_blank" rel="noopener">${escapeHtml(o.ASIN)}</a><span class="t">${escapeHtml(String(o.Title).slice(0,52))}</span><span class="n">landed ${gbp(o['Landed £'])}</span><span class="n">sell ${gbp(o['Sell £ used'])}</span><b class="p">${gbp(o['Profit £'])}</b><b class="r">${Math.round(o['ROI %'])}%</b></div>`).join('')}</div>`
    +(wins.length>12?`<div class="eupmore">+${wins.length-12} more — they are in the EU alerts source too</div>`:'');}
/* b128 (Jack, 20 Sep: "where is magic link for them"). The sign-in only showed on the first-visit gate, so anyone who had
   already picked a name never saw it. It lives in Settings now, and Jack can send a VA her link from his own screen:
   Supabase emails the one-click link to an address he has already invited. */
function paintAuthBox(){const el=$('#authBox');if(!el||typeof authedName!=='function')return;
  const u=(typeof authUser==='function')?authUser():null;
  const send=`<div class="authsend"><input type="email" id="abEmail" placeholder="${u&&isJack()?'suz@… — send her a link':'you@… — your work email'}" autocomplete="email" spellcheck="false"><button type="button" class="btn solid sm" id="abSend">Send link</button></div><div class="wgmsg" id="abMsg"></div>`;
  el.innerHTML=u
    ? `<div class="authnow"><i></i><b>Signed in</b> as ${escapeHtml(u.name)} · ${escapeHtml(u.email)}<button type="button" class="btn ghost sm" id="abOut">Sign out</button></div>`
      +(isJack()?`<p class="ssub">Send Suz or Mera their sign-in link. They must already be invited in Supabase (Authentication → Users → Invite user) — a link cannot create an account.</p>${send}`:'')
    : `<p class="ssub"><b>Not signed in.</b> Signing in replaces picking a name, so a verdict can never carry the wrong person. Type your work email and we send a one-click link — no password. It stays signed in on this browser.</p>${send}`;
  const out=$('#abOut');if(out)out.addEventListener('click',()=>{if(confirm('Sign out of '+u.name+'?')){authSignOut();paintAuthBox();}});
  const b=$('#abSend');if(b)b.addEventListener('click',async()=>{const i=$('#abEmail'),m=$('#abMsg'),v=(i.value||'').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){m.textContent='That does not look like an email address.';m.className='wgmsg bad';return;}
    b.disabled=true;m.textContent='Sending…';m.className='wgmsg';
    try{await authSendLink(v);m.innerHTML=`Sent to <b>${escapeHtml(v)}</b>. The link only works in the browser it is opened in, so it has to be opened on that person's machine.`;m.className='wgmsg good';i.value='';}
    catch(e){m.textContent=String(e.message||e)+(/not allowed|not found|invalid/i.test(String(e.message||''))?' — invite this address in Supabase first.':'');m.className='wgmsg bad';}
    b.disabled=false;});}
/* b138: Run via Keepa API — Jack only. Counts first, prices it, asks, then builds the same files a drop would and runs the same rules. */
function paintApiRun(){const row=$('#keepaRow');if(!row||!cur)return;let b=$('#apiRunBtn');
  const ok=isJack()&&typeof apiSelection==='function'&&!!finderLink(cur);
  if(!ok){if(b)b.hidden=true;return;}
  if(!b){b=document.createElement('button');b.id='apiRunBtn';b.type='button';b.className='btn ghost sm apirun';b.addEventListener('click',apiRunSource);row.appendChild(b);}
  b.hidden=false;b.textContent='Run via Keepa API · priced first';b.title='Jack only. Asks Keepa for this filter\'s products and runs the same rules — no export. Counts and prices it before it spends a token.';}
async function apiRunSource(){if(!cur||!isJack())return;const b=$('#apiRunBtn');const link=finderLink(cur);const t=apiSelection({link});
  if(!t){toast('This source has no Keepa filter to run',true);return;}
  const markets=cur.rule===1?(cur.markets||['UK']):['UK'];const eu=markets.filter(m=>m!=='UK');
  b.disabled=true;b.textContent='Counting…';
  try{
    const left0=await eupBalance();
    const c=await apiQuery(Object.assign({},t.selection,{perPage:50,page:0}),2);const total=c.totalResults||0;
    if(!total){toast('Keepa finds nothing for this filter today',true);return;}
    const pages=Math.ceil(total/API_PAGE);
    const cache=apiCache(),now=Date.now();let cached=0;(c.asinList||[]).forEach(a=>{const k=cache['2|'+a];if(k&&now-k.at<API_CACHE_H*3600e3)cached++;});
    const est=pages*API_PER_PAGE+Math.round(total*(1-cached/Math.max(1,(c.asinList||[]).length)))*API_PER_PRODUCT+(eu.length?total*eu.length:0);
    const left=(c.tokensLeft!=null)?c.tokensLeft:left0;
    /* b138: when the whole list will not fit, offer the top slice the balance can afford — Keepa returns the filter's own sort order, so the first N are the ones worth having */
    const perProduct=API_PER_PRODUCT+eu.length;let limit=0,estRun=est;
    if(left!=null&&left-est<API_FLOOR){const room=left-API_FLOOR-API_PER_PAGE;limit=Math.max(0,Math.floor(room/perProduct));
      if(limit<25){toast(`Balance ${left.toLocaleString()} is too low for this list (needs about ${est.toLocaleString()}, floor ${API_FLOOR}) — it refills 21 a minute`,true);return;}
      estRun=API_PER_PAGE+limit*perProduct;}
    const msg=limit
      ?`"${cur.name}" finds ${total.toLocaleString()} products today — about ${est.toLocaleString()} tokens, more than the balance allows.\n\nRun the FIRST ${limit} instead (Keepa's own order, best first) for about ${estRun.toLocaleString()} tokens?\n\nBalance ${left.toLocaleString()} → about ${(left-estRun).toLocaleString()} after. Floor ${API_FLOOR}.`
      :`Run "${cur.name}" through Keepa?\n\n${total.toLocaleString()} products today · about ${est.toLocaleString()} tokens`+(eu.length?` (includes ${eu.join(', ')} prices)`:'')+(cached||plan.topUp.length?`\n${cached} of the first ${sample.length} are already here free${plan.topUp.length?`, ${plan.topUp.length} need only a 1-token refresh (averages still good)`:''}`:'')+`\n\nBalance ${left!=null?left.toLocaleString():'?'} → about ${left!=null?(left-est).toLocaleString():'?'} after. Floor ${API_FLOOR}.`;
    if(!confirm(msg+(plan.topUp.length?`\n\nEvery product that comes out as a LEAD is then pulled in full (${API_PER_PRODUCT} tokens each) so its live Buy Box and FBA prices are today's.`:'')))return;
    const L=await apiAllAsins(t.selection,2,(n,tot)=>{b.textContent=`Listing… ${n}${tot?'/'+tot:''}`;},limit||0);
    const R=await apiRows(L.asins,2,(n,tot)=>{b.textContent=`Fetching ${n}/${tot} products…`;});
    /* the exclusions the API could not take (brand, root category, binding), from the product itself */
    const rows=R.rows.filter(r=>apiKeep({brand:r.Brand,rootCategory:r.__rootId,binding:r.__binding},t.after));
    const stamp=new Date();const nm=`Keepa API · ${stamp.getDate()}/${String(stamp.getMonth()+1).padStart(2,'0')} ${String(stamp.getHours()).padStart(2,'0')}:${String(stamp.getMinutes()).padStart(2,'0')}`;
    const f={name:nm,rows,hasFees:true,asins:rows.map(r=>r.ASIN),domain:'UK',hasSince:true,missing:[],fromKeepa:true};
    clearRun();
    if(cur.rule===1){files.viewer=f;files.UK=null;
      if(eu.length){const got=await eupFetch(f.asins,eu,(done,tot,mk)=>{b.textContent=`${mk} prices · ${done}/${tot}`;},rate());eu.forEach(m=>{files[m]=got[m];});}}
    else files.one=f;
    touched.clear();paintSlots();
    const saved=(R.toppedUp||0)*(API_PER_PRODUCT-1)+(R.fromCache||0)*API_PER_PRODUCT;
    warn([`${nm}: ${rows.length.toLocaleString()} products from Keepa (${L.total.toLocaleString()} matched${limit?`, the first ${limit} taken`:''}, ${L.asins.length-rows.length} excluded by brand / category) · ${(L.spent+R.spent).toLocaleString()} tokens spent`
      +` · ${R.fromCache} free from cache, ${R.toppedUp||0} refreshed for 1 token each (averages up to ${Math.round(API_STABLE_H/24)} days old), ${R.fullPulls||0} pulled in full`
      +(saved?` · ${saved.toLocaleString()} tokens saved by caching`:'')]);run();
    /* b149: any lead whose row was refreshed for 1 token has no live Buy Box / FBA price yet. Pull those in full and run again,
       so every lead on the screen carries today's competition. Never below the floor: if the balance will not stretch, say so. */
    {const byA={};rows.forEach(r=>byA[r.ASIN]=r);
     const need=((result&&result.out)||[]).map(o=>o.ASIN).filter(a=>byA[a]&&byA[a].__avgAt);
     if(need.length){const left=await eupBalance();const cost=need.length*API_PER_PRODUCT;
       if(left!=null&&left-cost<API_FLOOR){warn([`${need.length} lead${need.length===1?'':'s'} still carry averages from up to ${Math.round(API_STABLE_H/24)} days ago and no live Buy Box or FBA price — confirming them would take the balance under the floor of ${API_FLOOR}. Check the live offer on Keepa before buying.`]);}
       else{b.textContent=`Confirming ${need.length} leads…`;
         const C=await apiConfirm(need,2,(n,tot)=>{b.textContent=`Live prices for leads · ${n}/${tot}`;});
         const fresh={};C.rows.forEach(r=>fresh[r.ASIN]=r);
         const merged=rows.map(r=>fresh[r.ASIN]||r);const sf=cur.rule===1?files.viewer:files.one;
         sf.rows=merged;sf.asins=merged.map(r=>r.ASIN);
         run();toast(`${need.length} leads confirmed with live prices · ${C.spent} tokens`);}}}
    toast(`Keepa run done — ${rows.length.toLocaleString()} products, ${(L.spent+R.spent).toLocaleString()} tokens`);
  }catch(e){toast('Keepa did not answer: '+String(e.message||e).slice(0,80)+' — nothing more was spent',true);}
  finally{b.disabled=false;paintApiRun();if(typeof paintTokens==='function')paintTokens();}}
/* b127 (Jack, 20 Sep: "somewhere they should be able to view past ones"): click a date in Last runs and that day's run opens —
   what went in, what came out, and what everyone decided. Read-only: the numbers are the ones recorded on the day. */
function openPastRun(day){if(!cur)return;const r=runsFor(cur.key).find(x=>(x.day||x.at.slice(0,10))===day);if(!r)return;
  const {rows}=storedRows(cur.key,cur.rule);const by={};rows.forEach(o=>by[o.ASIN]=o);const V=verdAll();
  const wasQueued=new Set(r.queue||[]);   /* b143: what actually needed a look that day */
  const out=(r.asins||[]).map((a,i)=>{const o=by[a];
    if(o)return Object.assign({},o,{'#':i+1,QUEUE:wasQueued.has(a)?'new':'',STATUS:'',verdict:V[a]||null});
    /* a lead that has since dropped off the list: the ASIN and what was decided is all that is left */
    const blank=cur.rule===1?{ASIN:a,Title:'(no longer a lead — kept for the record)','Buy market':'UK','Landed £':0,'Sell £ used':0,'Profit £':0,'ROI %':0,SPM:0,Score:1,Flags:'',Keepa:`https://keepa.com/#!product/2-${a}`}
      :{ASIN:a,Product:'(no longer a lead — kept for the record)',Score:1,'Buy at £':0,'After discount £':0,'Sell for £':0,'Profit £':0,'ROI %':0,'Sells /mo':0,chips:[],Keepa:`https://keepa.com/#!product/2-${a}`};
    return Object.assign(blank,{'#':i+1,QUEUE:wasQueued.has(a)?'new':'',STATUS:'',verdict:V[a]||null,gone:true});});
  const st=r.st||{};
  result={rule:cur.rule,out,all:out,dropped:[],reasons:{},blacklisted:[],floored:0,stored:true,past:r,at:r.at,gone:[],prevMap:{},prevStamp:null,
    st:cur.rule===1?{viewer:st.viewer==null?(r.rowsIn||'—'):st.viewer,demand:st.demand==null?'—':st.demand,sell:st.sell==null?'—':st.sell,buy:st.buy==null?'—':st.buy,kept:out.length,bbHiCol:true,capped:st.capped||0}
      :{rows:st.rows==null?(r.rowsIn||'—'):st.rows,priced:st.priced==null?'—':st.priced,demand:st.demand==null?'—':st.demand,kept:out.length}};
  view.page=1;view.sel.clear();renderResults();renderGuide();
  const res=$('#results');if(res)res.scrollIntoView({behavior:'smooth',block:'start'});}
/* b139: reopen the newest API look for this source — read-only, verdicts as they stand now */
function openApiLook(){if(!cur)return;const L=apiLookFor(cur.key);if(!L)return;const V=verdAll();
  const out=(L.rows||[]).map((o,i)=>Object.assign({},o,{'#':i+1,verdict:V[o.ASIN]||null,QUEUE:V[o.ASIN]?'':(o.QUEUE||'')}));
  result={rule:cur.rule,out,all:out,dropped:[],reasons:{},blacklisted:[],floored:0,stored:true,apiLook:true,reopened:true,at:L.at,gone:[],prevMap:{},prevStamp:null,st:L.st||(cur.rule===1?{viewer:L.rowsIn||'—',demand:'—',sell:'—',buy:'—',kept:out.length,bbHiCol:true,capped:0}:{rows:L.rowsIn||'—',priced:'—',demand:'—',kept:out.length})};
  view.page=1;view.sel.clear();renderResults();renderGuide();
  const res=$('#results');if(res)res.scrollIntoView({behavior:'smooth',block:'start'});}
function lookOwnerName(){const o=cur&&cur.owner;if(!o||o===NO_OWNER||o==='Jack')return 'the';if(o==='VAs')return 'the VAs\'';return escapeHtml(o)+'\'s';}
function paintPastBar(){const res=$('#results');if(!res)return;let el=$('#pastBar');if(!el){el=document.createElement('div');el.id='pastBar';el.className='pastbar';res.insertBefore(el,res.firstChild);
    el.addEventListener('click',e=>{if(e.target.closest('#pastBack')){const liveLook=!!(result&&result.apiLook&&!result.reopened);result=null;
      if(liveLook){SLOTS.forEach(k=>files[k]=null);files.one=null;lastSig='';touched.clear();paintSlots();}   /* b139: the API rows leave the slots with the look */
      if(!runStored())clearRun();}});}
  const p=result&&result.past;
  /* b139: the API look says what it is not — the run. The due date and the compare stay with the VA's last export. */
  if(!p&&result&&result.apiLook){el.hidden=false;el.classList.add('api');const own=lookOwnerName();const who=own==='the'?'':own.replace(/'s$|'$/,'');
    el.innerHTML=`<span><b>Your Keepa API look${result.at?' · '+escapeHtml(fmtWhen(result.at)):''}</b> · not saved as a run for ${escapeHtml(cur.name)}: ${own} due date and the new / better compare stay where the last export left them${who?`, until ${who} works it`:''}. Your Yes / No / Maybe are kept.</span><button type="button" class="btn ghost sm" id="pastBack">Back to the last run</button>`;return;}
  el.classList.remove('api');
  if(!p){el.hidden=true;el.innerHTML='';return;}el.hidden=false;
  const V=verdAll();let judged=0,yes=0;(p.asins||[]).forEach(a=>{const v=V[a];if(!v||!v.v)return;judged++;if(v.v==='Yes')yes++;});
  el.innerHTML=`<span><b>The run from ${escapeHtml(ukDate(p.at))}</b>${p.who?' · '+escapeHtml(p.who):''} · ${(p.rowsIn||0).toLocaleString()} products in, <b>${p.leads}</b> leads out, ${p.new||0} new${p.queue&&p.queue.length?`, <b>${p.queue.length}</b> needed a look that day`:''} · ${judged} judged since${judged?` (${yes} Yes)`:''}${p.goneAsins&&p.goneAsins.length?` · ${p.goneAsins.length} had fallen off since the run before`:''}. Nothing here changes what runs today.</span><button type="button" class="btn ghost sm" id="pastBack">Back to today</button>`;}
/* b123: the option check is a button, Jack-only, and the run tells you what it would cost */
function paintOptionBar(){const res=$('#results');if(!res)return;let el=$('#optBar');if(!el){el=document.createElement('div');el.id='optBar';el.className='optbar';res.insertBefore(el,res.firstChild);}
  const sellF=cur?(cur.rule===1?files.viewer:files.one):null;if(!result||!sellF||sellF.fromKeepa||typeof shareUnknown!=='function'){el.hidden=true;el.innerHTML='';return;}
  const by={};sellF.rows.forEach(r=>by[(r.ASIN||'').trim()]=r);const need=result.out.filter(o=>{const r=by[o.ASIN];return r&&shareUnknown(r);}).length;
  if(!need){el.hidden=true;el.innerHTML='';return;}el.hidden=false;
  el.innerHTML=`<span><b>${need} lead${need===1?'':'s'}</b> ${need===1?'is':'are'} on the family's drops with ${need===1?'its':'their'} own share unknown — siblings not in the export. Review them as they are, or ${isJack()?'':'ask Jack to '}have Keepa confirm each option's own sales.</span>${isJack()?`<button type="button" class="btn ghost sm" id="optAsk">Ask Keepa · ${need} token${need===1?'':'s'}</button>`:''}`;
  const b=$('#optAsk');if(b)b.addEventListener('click',async()=>{b.disabled=true;b.textContent='Asking Keepa…';
    try{const r=await fillUnknownShares(sellF);toast(`Keepa checked ${r.asked} option${r.asked===1?'':'s'} · ${r.asked} token${r.asked===1?'':'s'} · ${r.confirmed} confirmed`);run();}
    catch(e){toast('Keepa did not answer — nothing was spent',true);paintOptionBar();}});}
/* b123: judge with the keyboard. Click a row (or ↓ / ↑) to make it the active one; Y / N / M mark it and move to the next unjudged row. */
function activeRow(){return document.querySelector('.ltbl tbody tr.active');}
function setActive(tr,scroll){document.querySelectorAll('.ltbl tbody tr.active').forEach(x=>x.classList.remove('active'));if(!tr){view.active=null;return;}tr.classList.add('active');view.active=tr.dataset.asin;
  if(scroll){const r=tr.getBoundingClientRect();if(r.top<90||r.bottom>window.innerHeight-40)tr.scrollIntoView({block:'center',behavior:'smooth'});}}
function stepActive(dir,unjudgedOnly){const rows=[...document.querySelectorAll('.ltbl tbody tr[data-asin]')];if(!rows.length)return;const cur_=activeRow();let i=cur_?rows.indexOf(cur_):-1;
  for(let k=0;k<rows.length;k++){i+=dir;if(i<0||i>=rows.length)break;const tr=rows[i];if(unjudgedOnly&&/\b(Yes|No|Maybe)\b/.test(tr.className))continue;setActive(tr,true);return;}
  /* b140: off the end of the page, the keys carry on to the next page (and ↑ at the top goes back to the last row of the one before) —
     64 leads at 50 a page used to stop dead at row 50 with no sign there were 14 more. */
  const pages=Math.ceil(visible().length/PAGEN());
  if(dir>0&&view.page<pages){view.page++;touched.clear();renderTable();setActive(null);const rs=[...document.querySelectorAll('.ltbl tbody tr[data-asin]')];const first=rs.find(tr=>!unjudgedOnly||!/\b(Yes|No|Maybe)\b/.test(tr.className))||rs[0];if(first)setActive(first,true);}
  else if(dir<0&&view.page>1){view.page--;touched.clear();renderTable();const rs=document.querySelectorAll('.ltbl tbody tr[data-asin]');if(rs.length)setActive(rs[rs.length-1],true);}}
function paintJudged(){const tb=document.querySelector('#results .toolbar');if(!tb||!result)return;let el=$('#judgedPill');if(!el){el=document.createElement('span');el.id='judgedPill';el.className='judged';tb.insertBefore(el,$('#moreMenu')||null);}   /* b137: pill sits before More */
  const all=visible();const done=all.filter(o=>(verdGet(o.ASIN)||{}).v).length;const finished=all.length>0&&done===all.length;
  /* b140: when the last one is judged the pill says so and the Done button lights up — the VA should not have to count */
  el.classList.toggle('all',finished);const nx=$('#runNext2');if(nx)nx.classList.toggle('ready',finished&&!result.stored);
  el.innerHTML=finished?`<b>${done}</b> of ${all.length} judged ✓<i title="Everything on this list has a verdict — Done moves you to the next filter that is due">all done</i>`
    :`<b>${done}</b> of ${all.length} judged<i title="Click a row, then Y / N / M · ↓ ↑ move (↓ carries on to the next page) · Esc clears">Y · N · M · ↓ ↑</i>`;}
let keysReady=false;
function setupKeys(){if(keysReady)return;keysReady=true;
  document.addEventListener('keydown',e=>{const t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;if(e.metaKey||e.ctrlKey||e.altKey)return;
    const res=$('#results');if(!res||res.hidden||!result)return;const k=e.key.toLowerCase();
    if(k==='arrowdown'||k==='j'){e.preventDefault();stepActive(1,false);return;}
    if(k==='arrowup'||k==='k'){e.preventDefault();stepActive(-1,false);return;}
    if(k==='escape'){setActive(null);return;}
    const map={y:'Yes',n:'No',m:'Maybe'};if(!map[k])return;const tr=activeRow();if(!tr)return;
    const b=tr.querySelector(`button.vb[data-v="${map[k]}"]`);if(!b)return;e.preventDefault();const a=tr.dataset.asin;b.click();
    const again=document.querySelector(`.ltbl tbody tr[data-asin="${a}"]`);if(again){setActive(again,false);stepActive(1,true);}});
  document.addEventListener('click',e=>{const tr=e.target.closest('.ltbl tbody tr[data-asin]');if(!tr)return;if(e.target.closest('button,a,input,select,label'))return;setActive(tr,false);});}
/* b122: ask Keepa for the exact option's confirmed sales on every would-be lead whose share is unknown. One token each, cached a week. */
const UNK_KEY='bdl-sourcing-option-sales',UNK_TTL_H=24*7;
function optionStamp(r,c){if(!r||!c)return;if(c.n>=50)r['Monthly Sales Trends: Bought in past month']=String(c.n);
  else if(c.last&&c.last.n>0){r['Monthly Sales Trends: Monthly Sold (Last Known)']=String(c.last.n);r['Monthly Sales Trends: Monthly Sold Date (Last Known)']=c.last.date;}
  r.__optionChecked=true;}
function optionFromKeepa(p){const h=p.monthlySoldHistory||[];let last=null;for(let i=h.length-2;i>=0;i-=2){if(h[i+1]>0){const d=new Date((h[i]+21564000)*60000);last={n:h[i+1],date:d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0')};break;}}
  return{n:p.monthlySold>0?p.monthlySold:0,last,at:Date.now()};}
async function fillUnknownShares(f){if(!f||!f.rows||typeof shareUnknown!=='function'||!cur)return{asked:0,confirmed:0};
  stampShares(f.rows);const by={};f.rows.forEach(r=>by[(r.ASIN||'').trim()]=r);const cache=lsGet(UNK_KEY,{}),now=Date.now();
  /* which leads are standing on the family's drops with their own share unknown */
  const R=cur.rule===1?rule1Compute(files,cur.name,rate(),null):rule2Compute(f.rows,factsAll(),{vatFor:vatFor,rule:cur.rule});   /* b123: the normal run — unknown-share options are leads on the family's drops */
  const need=[];R.out.forEach(o=>{const r=by[o.ASIN];if(r&&shareUnknown(r)&&!need.includes(o.ASIN))need.push(o.ASIN);});
  let asked=0,confirmed=0;const ask=[];
  need.forEach(a=>{const c=cache[a];if(c&&now-c.at<UNK_TTL_H*3600e3){optionStamp(by[a],c);if(c.n>=50||(c.last&&c.last.n>0))confirmed++;}else ask.push(a);});
  for(let i=0;i<ask.length;i+=100){const part=ask.slice(i,i+100);
    const r=await fetch(WORKER+'/keepa?path=product&domain=2&stats=30&asin='+part.join(','));const j=await r.json();if(j.error)break;   /* history on: monthlySoldHistory only comes with it, same 1 token */
    (j.products||[]).forEach(p=>{const c=optionFromKeepa(p);cache[p.asin]=c;optionStamp(by[p.asin],c);asked++;if(c.n>=50||(c.last&&c.last.n>0))confirmed++;});}
  lsSet(UNK_KEY,cache);if(asked&&typeof paintTokens==='function')paintTokens();return{asked,confirmed,cached:need.length-ask.length};}
function warn(lines){const w=$('#warnRun');if(!lines||!lines.length){w.classList.remove('show');w.innerHTML='';return;}
  w.innerHTML=lines.map(l=>'<div>⚠ '+escapeHtml(l)+'</div>').join('');w.classList.add('show');}
function removeFile(k){files[k]=null;paintSlots();run();}
/* b101 (Jack, 18 Sep, the Keepa export box: "is this worth checking?"). Keepa exports ONLY the page on
   screen. Across his ~150 exports that had cut two short without anyone knowing — one a SanDisk/Seagate
   brand run that stopped at exactly 50 rows when SanDisk alone has hundreds of UK listings. The step-by-step
   already says to max out rows per page; nothing noticed when it was not done. A file that lands on exactly
   one of Keepa's page sizes is almost always a single page, so it now says so on the file itself. */
const KEEPA_PAGE_SIZES=[20,50,100,200,250,500,1000];
function onePage(n){return KEEPA_PAGE_SIZES.includes(n);}
/* b111 (Jack, 18 Sep: "should say error - pls tick these columns and name them"). The sell-side export must carry the six
   demand-ladder columns or the run does not start. Pure: takes the file, returns the message or null. */
function ladderBlock(f){if(!f||f.fromKeepa||!f.missing||!f.missing.length)return null;const n=f.missing.length;
  return `<b>Export error — ${escapeHtml(f.name)} is missing ${n} column${n===1?'':'s'} the demand rules need.</b> In Keepa's column picker tick: ${f.missing.map(escapeHtml).join(' · ')}. Then export again and drop the new file here. Without them every variation would be judged on its family's figures, so the run does not start.`;}
function paintSlots(){if(!cur)return;const r1=cur.rule===1;
  const chip=(k,label,f,need)=>{const cut=f&&!f.fromKeepa&&onePage(f.rows.length);
    /* b110: the UK sell-side file carries the variation / review / last-known columns the demand ladder needs. Say what is missing on the file. */
    const ukSide=k==='viewer'||k==='one'||(k==='UK'&&ukOnly());const miss=(ukSide&&f&&!f.fromKeepa&&f.missing&&f.missing.length)?f.missing:null;
    return `<div class="fchip ${f?'ok':''}${cut||miss?' cut':''}"><span class="dot"></span><span class="k">${label}</span><span class="n">${f?escapeHtml(f.name):need}</span><span class="r">${f?f.rows.length.toLocaleString()+' rows':''}</span>${f?`<button class="x" data-rm="${k}" title="Remove">×</button>`:''}</div>`
      +(cut?`<div class="cutwarn"><b>Exactly ${f.rows.length} rows — this may be one page, not the whole search.</b> Keepa only exports the page on screen. Set rows per page to the maximum at the bottom of the Keepa table, then export again.</div>`:'')
      +(miss?`<div class="cutwarn err"><b>Export error — missing ${miss.length} column${miss.length===1?'':'s'} the demand rules need. The run will not start.</b> In Keepa's column picker tick: ${miss.map(escapeHtml).join(' · ')}. Then export again.</div>`:'');};
  let h='';
  if(r1&&ukOnly()){h+=chip('viewer','🇬🇧 UK',files.viewer,'UK Product Finder export · required (no Viewer needed)');}
  else if(r1){cur.markets.forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],'Finder export · expected');});
    MARKETS.filter(m=>!cur.markets.includes(m)&&files[m]).forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],'');});
    h+=chip('viewer','Viewer',files.viewer,'UK Product Viewer · required');}
  else h+=chip('one','Export',files.one,'UK Product Finder · required');
  $('#fileChips').innerHTML=h;
  document.querySelectorAll('#keepaRow a[data-mk]').forEach(a=>a.classList.toggle('done',!!files[a.dataset.mk]));
  /* the ASIN hand-off: every ASIN the Finders found, minus the ones the Viewer already covers */
  const merged=new Set();MARKETS.forEach(k=>{if(files[k])files[k].asins.forEach(a=>merged.add(a));});
  const covered=new Set(files.viewer?files.viewer.asins:[]);const missing=[...merged].filter(a=>!covered.has(a));
  const bar=$('#asinBar');bar.hidden=!r1||ukOnly();bar.classList.toggle('idle',!merged.size);$('#asinCopy').disabled=!merged.size;$('#asinOpen').disabled=!merged.size;
  if(r1&&!merged.size){bar.classList.remove('done');$('#asinMsg').innerHTML=`<b>Step 4 happens here.</b> Drop the Finder exports above and this becomes one button that opens the UK Product Viewer with every ASIN merged and de-duplicated — no copying, no Keepa console.`;$('#asinN').textContent='0';bar._all=[];}
  if(r1&&merged.size){bar.classList.toggle('done',!missing.length);
    $('#asinMsg').innerHTML=!missing.length?`all ${merged.size.toLocaleString()} ASINs covered by the Viewer`
      :files.viewer?`Viewer covers ${covered.size.toLocaleString()} of ${merged.size.toLocaleString()} — the other <b>${missing.length.toLocaleString()}</b> aren't listed on Amazon UK, nothing to do`
      :`<b>${merged.size.toLocaleString()}</b> ASINs merged and de-duplicated from ${MARKETS.filter(k=>files[k]).length} file${MARKETS.filter(k=>files[k]).length===1?'':'s'} — now open the UK Product Viewer with them loaded, export all columns, drop that here`;
    $('#asinN').textContent=merged.size.toLocaleString();bar._all=[...merged];}
  else if(bar)bar._all=[];
  paintEu();
  const since=files.viewer?files.viewer.hasSince:(files.one?files.one.hasSince:true);$('#sinceNote').hidden=since;}
/* b76 (Jack, 17 Sep): a list of EU alert ASINs has no Finder exports behind it. Drop the UK Viewer
   and buy the EU buy-side from Keepa instead — 1 token per ASIN per market, measured on his account.
   The cost is shown BEFORE anything is spent, and a cached market costs nothing to run again. */
function euWant(){if(!cur||cur.rule!==1||!files.viewer)return[];
  return (cur.markets||[]).filter(m=>m!=='UK'&&!files[m]);}
function paintEu(){const bar=$('#euBar');if(!bar)return;
  const want=euWant(),asins=files.viewer?files.viewer.asins:[];
  bar.hidden=!want.length||!asins.length;
  if(bar.hidden)return;
  const cost=eupCost(asins,want),free=asins.length*want.length-cost;
  $('#euHead').textContent=cost?`Buy the EU prices · ${cost.toLocaleString()} token${cost===1?'':'s'}`:'EU prices are already cached';
  $('#euMsg').innerHTML=`${asins.length.toLocaleString()} ASINs × ${want.length} market${want.length===1?'':'s'} (${want.join(', ')})`
    +(free?` · ${free.toLocaleString()} already cached, free`:'')
    +` — Amazon's own price only, no Subscribe &amp; Save, so profit is never flattered`;
  const b=$('#euGo');b.disabled=false;b.querySelector('.lab').textContent=cost?'Get EU prices':'Load from cache';}

async function euRun(){const want=euWant(),asins=files.viewer?files.viewer.asins:[];
  if(!want.length||!asins.length)return;
  const cost=eupCost(asins,want),b=$('#euGo'),lab=b.querySelector('.lab');
  if(cost){const left=await eupBalance();
    if(left!=null&&left<cost){toast(`Only ${left} Keepa tokens left, this needs ${cost}`,true);return;}
    if(!confirm(`Buy EU prices for ${asins.length} ASINs across ${want.join(', ')}?\n\n`
      +`${cost} Keepa tokens${left!=null?` · ${left} left, ${left-cost} after`:''}.\n`
      +`Cached for 12 hours, so running this again today is free.`))return;}
  b.disabled=true;
  try{
    const got=await eupFetch(asins,want,(done,total,mk)=>{lab.textContent=`${mk} · ${done}/${total}`;},rate());
    let rows=0;want.forEach(m=>{files[m]=got[m];rows+=got[m].rows.length;});
    toast(`${rows.toLocaleString()} EU prices in — ${(asins.length*want.length-rows).toLocaleString()} had no Amazon offer`);
    paintSlots();run();
  }catch(e){toast('Keepa did not answer — nothing was spent on the failed part',true);}
  finally{b.disabled=false;lab.textContent='Get EU prices';}}
/* b29 (Jack, 15 Sep 00:50: "if it's done today and I press run surely I should see what it should be today"): a source that has been
   run opens on its saved leads — every number, the Keepa inputs and the compare status come from src_leads — and a fresh export on
   top re-runs it. Verdicts, prices and the Keepa/SAS links work exactly as on a live run. */
function storedRows(key,rule){const m=leadMap(key)||{};const rows=[];let last='';
  Object.entries(m).forEach(([a,e])=>{if(!e||!e.state)return;const s=e.state,k=s.k||{};const buy=+s.buy||0,sell=+s.sell||0,mk=s.mk||'UK';if(e.stamp>last)last=e.stamp;
    const links={Keepa:`https://keepa.com/#!product/2-${a}`,SAS:`https://sas.selleramp.com/sas/lookup?search_term=${a}&sas_cost_price=${buy.toFixed(2)}&sas_sale_price=${sell.toFixed(2)}`,'Buy link':`https://www.amazon.${(typeof BR_LINK!=='undefined'&&BR_LINK[mk])||'co.uk'}/dp/${a}`,'UK sell link':`https://www.amazon.co.uk/dp/${a}`};
    const o=rule===1
      ?Object.assign({ASIN:a,Title:s.title||'',Brand:s.brand||'','Buy market':mk,'Landed £':buy,'Discount applied':s.disc||'','Sell £ used':sell,'Sell used':k.why||'','Sell low £':k.bb90||0,'Profit £':+s.profit||0,'ROI %':+s.roi||0,SPM:+s.spm||0,'SPM from':'','Flags':'','LTD badge':'',Score:+s.score||r2score(+s.profit||0,+s.roi||0,+s.spm||0,sell<R2.LOW_TICKET),'Fees from':'',Category:''},links)
      :Object.assign({ASIN:a,Product:s.title||'',Brand:s.brand||'',Score:+s.score||1,'Potential score':0,'Potential via':'','Buy at £':k.amz||buy,'After discount £':buy,'Discount applied':s.disc||'','Sell for £':sell,'Sell from':k.why||'','Sell confidence':'','Buy Box 90d £':k.bb90||0,'Buy Box 180d £':k.bb180||0,'FBA 90d £':k.f90||0,'FBM 90d £':k.fbm90||0,'Buy Box high £':k.hi||0,'Profit £':+s.profit||0,'ROI %':+s.roi||0,'Sells /mo':+s.spm||0,'Demand from':'','£ per month':Math.round((+s.profit||0)*(+s.spm||0)),'Amazon 90d drop %':'',Reviews:0,'Age days':'','VAT %':20,'VAT from':'','Category kind':'general',Category:'',chips:[],pot:[],kept:true,'#':0},links);
    o.stamp=e.stamp;o._prev=e.prev||null;rows.push(o);});
  rows.sort((a,b)=>(b.Score||0)-(a.Score||0));rows.forEach((o,i)=>o['#']=i+1);return{rows,last};}
function runStored(){if(!cur)return false;const {rows,last}=storedRows(cur.key,cur.rule);if(!rows.length)return false;
  const prevMap={};rows.forEach(o=>{if(o._prev&&o._prev.state)prevMap[o.ASIN]={state:o._prev.state,stamp:o._prev.stamp};});
  const rl=runLast(cur.key)||{};const n=rl.rowsIn||rows.length;const rst=rl.st||{};   /* b127: runs saved from now on carry their own counts */
  const R={rule:cur.rule,out:rows,all:rows,dropped:[],reasons:{},blacklisted:[],floored:0,stored:true,at:last,
    st:cur.rule===1?{viewer:rst.viewer||n,demand:rst.demand==null?'—':rst.demand,sell:rst.sell==null?'—':rst.sell,buy:rst.buy==null?'—':rst.buy,kept:rows.length,bbHiCol:true,capped:rst.capped||0}
      :{rows:rst.rows||n,priced:rst.priced==null?'—':rst.priced,demand:rst.demand==null?'—':rst.demand,kept:rows.length}};
  R.gone=applyQueue(R.out,R.rule,prevMap,verdAll()).filter(([a])=>!blAll()[a]);R.prevMap=prevMap;const pst=Object.values(prevMap).map(p=>p.stamp).filter(Boolean).sort();R.prevStamp=pst.length?pst[pst.length-1]:null;result=R;
  renderResults();renderGuide();return true;}
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

/* b105 — each variation option's share of its family's reviews, and whether it is new, stamped onto the Viewer
   row before Rule 1 runs. A family = the options in Variation ASINs that share one Rating Count (one pool: the
   Lavazza family showed a listing can hold several pools, and only inside one are reviews comparable). Only
   stamped when the Reviews columns are in the export and the pool holds reviews; otherwise nothing changes. */
/* b122: stampShares moved to parse.js so the rules can call it themselves (checks and page then agree) */
/* b116: the levels under the sell price. rawRowOf finds the Keepa row behind a lead; lvlPicker draws the chips. */
function rawRowOf(asin){const pools=[files.viewer,files.one,files.UK].filter(Boolean);for(const f of pools){const r=(f.rows||[]).find(x=>(x.ASIN||'').trim()===asin);if(r)return r;}return null;}
function lvlPicker(asin,sellNow){if(typeof sellLevels!=='function')return'';const r=rawRowOf(asin);if(!r)return'';const lv=sellLevels(r);if(!lv.length)return'';
  const fact=factGet(asin);const shape=sellShape(r);const st=shape?lvlStats(factsAll(),shape):{n:0};
  const chips=lv.map(x=>{const on=fact.lvl===x.key||(!fact.lvl&&Math.abs(x.value-(sellNow||0))<0.005);
    /* b128: short codes so the levels take two lines, not six — the full name is in the tooltip */
    return `<button type="button" class="lv${on?' on':''}" data-lv="${x.key}" data-asin="${asin}" data-val="${x.value}" data-shape="${shape||''}" title="Sell at the ${x.label} level · £${x.value.toFixed(2)}${x.n!=null?` · ${x.n} FBA seller${x.n===1?'':'s'} there`:''}">${x.short} <b>${x.value>=100?Math.round(x.value):x.value.toFixed(2)}</b></button>`;}).join('');   /* b140: £100+ chips drop the pence so two fit a line */
  const learn=(st.n>=2&&st.top)?`<span class="lvlearn" title="What you have picked on this shape before">on this shape you take ${(SELL_LEVELS.find(z=>z[0]===st.top.lvl)||[])[1]||st.top.lvl} ${st.top.count} of ${st.n}</span>`:'';
  const stale=(typeof staleFba==='function'&&staleFba(r))?`<span class="lvstale" title="Keepa's FBA 90d average counts every FBA offer it tracked, including ones that vanished. On a thin listing it can be a ghost.">FBA avg may be stale · check the graph</span>`:'';
  return `<div class="lvls">${chips}${learn}${stale}</div>`;}
/* the app's pick becomes Jack's pick: hand the learned levels to sellPick before each run */
function stampLearned(){if(typeof UNIFIED_SELL==='undefined'||typeof learnedLevels!=='function')return;UNIFIED_SELL.learned=learnedLevels(factsAll());}
/* ============ the run ============ */
function run(){if(!cur)return;stampLearned();
  /* UK-only brand with just the Finder export: the Finder carries the same columns, so it IS the sell side */
  if(cur.rule===1&&!files.viewer&&files.UK&&files.UK.hasFees&&cur.markets.every(m=>m==='UK')){files.viewer=files.UK;files.UK=null;paintSlots();}
  const ready=cur.rule===1?!!files.viewer:!!files.one;
  if(!ready){if(runStored())return;result=null;$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;
    ['#story','#statusRow','#sumDetail','#fell'].forEach(id=>{const e=$(id);if(e){e.innerHTML='';if(id==='#story')e.hidden=true;}});['#brandNote','#storedNote'].forEach(id=>{const e=$(id);if(e)e.hidden=true;});const fw=$('#feeWarn');if(fw)fw.classList.remove('show');
    $('#sumEmpty').textContent=cur.rule===1?(MARKETS.some(m=>files[m])?'Finder exports in — drop the UK Product Viewer export and the leads appear here.':'Drop the exports and the numbers appear here.'):'Drop the export and the numbers appear here.';renderGuide();return;}
  /* b111: the file is in but lacks the ladder columns — say so where the numbers would be, and stop */
  {const sellF=cur.rule===1?files.viewer:files.one;const blk=ladderBlock(sellF);
    if(blk){result=null;$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;$('#sumEmpty').innerHTML=blk;$('#sumEmpty').classList.add('err');
      ['#story','#statusRow','#sumDetail','#fell'].forEach(id=>{const e=$(id);if(e){e.innerHTML='';if(id==='#story')e.hidden=true;}});['#brandNote','#storedNote'].forEach(id=>{const e=$(id);if(e)e.hidden=true;});return;}
    $('#sumEmpty').classList.remove('err');}
  const prevMap=baselineOf(leadMap(cur.key));
  let R;
  if(cur.rule===1){if(files.viewer)stampShares(files.viewer.rows);R=rule1Compute(files,cur.name,rate(),null);R.rule=1;R.out.forEach(o=>{if(!o.Brand)o.Brand=cur.name;o.Score=r2score(o['Profit £'],o['ROI %'],o.SPM,(o['Sell £ used']||0)<R2.LOW_TICKET);});}
  else{/* a tea & coffee filter: every row is 0% unless it reads like an appliance (machine, grinder…) or a VA has set it */
    const vf=cur.vat0?((row,fact)=>{if(fact&&fact.vat!=null&&fact.vat!=='')return vatFor(row,fact);
      const text=((row.Title||'')+' | '+(row['Categories: Sub']||'')).toLowerCase();if(r4isAppliance(text))return{rate:R4.STANDARD,why:'20% — reads like an appliance, not the drink',src:'rule'};
      return{rate:0,why:'0% VAT — everything on this filter is tea / coffee',src:'source'};}):vatFor;
    stampShares(files.one.rows);R=rule2Compute(files.one.rows,factsAll(),{vatFor:vf,rule:cur.rule});R.rule=cur.rule;
    const lowS=R.all.filter(o=>o.lowScore),noM=R.all.filter(o=>!o.kept&&!o.lowScore);
    R.dropped=noM.map(o=>[o.ASIN,o.Product,`needs ${o['Needs % off']}% off Amazon to reach ${R2.TARGET_ROI}% ROI (brand allows ${o['Brand discount %']||R2.DEFAULT_ALLOW}%)`])
      .concat(lowS.map(o=>[o.ASIN,o.Product,o.lowRoi?`ROI ${o['ROI %']}% — under ${R2.MIN_ROI_LOW}% even with a code`:`scored ${o.Score}${o['Potential score']>o.Score?' ('+o['Potential score']+' with a code)':''} — under ${R2.MIN_SCORE}, not worth a look`]));
    R.reasons={'Needs more discount than the brand gives':noM.length};const lr=lowS.filter(o=>o.lowRoi).length,ls=lowS.length-lr;if(lr)R.reasons['ROI under '+R2.MIN_ROI_LOW+'% even with a code']=lr;if(ls)R.reasons['Scored under '+R2.MIN_SCORE+' even with a code']=ls;}
  /* b79 (Jack, 17 Sep: "some spm are well off — if they are a var they aren't selling when we look").
     He is right, and Keepa can prove it for free: tick Variation Count / Variation ASINs / Variation
     Attributes in the Viewer and the export carries them. "Bought in past month" and the rank are the
     WHOLE LISTING's, shared by every option — 88 of his 100 alert ASINs were one option of many, one
     of them a family of 92. So the count rides on the lead and the demand figure says whose it is.
     Nothing is dropped for it: which option sells is a thing you read off the graph, not a rule. */
  /* b84 (Jack, 17 Sep): "confirmed sales > everything — confirmed sales is sales from Amazon themselves
     and confirmed a minimum of 50". So demand has an order of resort, and it is written down here once:

       1. CONFIRMED  Amazon's own "bought in past month". Per option, never below 50, always believed.
       2. SHARE      no confirmed figure: this option's share of the family's reviews. PROVEN on the
                     Logitech Lift family, 17 Sep — real sales 1000/300/200/100/100 against review
                     shares 68.7/13.9/10.5/6.7/0.3%. Same order, one miss: the Sand, listed in March,
                     has 11 reviews because it is new, not because nobody buys it.
       3. DROPS      nothing else: the rank, which every option on the listing shares. Weakest.

     The share needs the whole family in the same export, so it only appears when the siblings are
     there. Nothing is dropped or rescored — this labels the number, it does not change it. */
  (()=>{const src=(cur.rule===1?(files.viewer&&files.viewer.rows):(files.one&&files.one.rows))||[];
    if(!src.length)return;
    const byAsin={},vc={},rev={},listed={};
    src.forEach(r=>{const a=(r.ASIN||'').trim();if(!a)return;byAsin[a]=r;
      const n=kNum(r['Variation Count']);if(n>0)vc[a]=n;
      const rv=kNum(r['Reviews: Review Count - Format Specific']);rev[a]=rv>0?rv:0;
      listed[a]=r['Listed since']||'';});
    const sibsOf=a=>String((byAsin[a]||{})['Variation ASINs']||'').split(',').map(x=>x.trim()).filter(Boolean);
    const sixMonths=Date.now()-182*864e5;
    R.out.forEach(o=>{
      const a=o.ASIN,n=vc[a];
      const bought=kNum(o['Bought /mo'])||((o['SPM from']==='bought'||o['Demand from']==='confirmed')?(o.SPM||o['Sells /mo']):null);
      if(n>1){o.Options=n;o['Options on the listing']=n;}
      if(rev[a])o['Option reviews']=rev[a];
      /* 1 — Amazon said so. Nothing beats it. */
      if(bought>=50){o['Demand basis']='confirmed by Amazon';o['Demand belongs to']='this option';
        if(n>1)o.Flags=(o.Flags?o.Flags+'; ':'')+`1 of ${n} options, and the ${bought}/mo is Amazon's own confirmed figure for this one`;
        return;}
      /* b85 (Jack, 17 Sep): "something that doesn't even show 50 spm by amazon even if it says 40 drops —
         it isn't over 50 sales, and anything over 50 sales a month is confirmed via amazon themselves."
         So a missing figure is not missing information. It is a CEILING: under 50 a month, whatever the
         rank says. Drops are the backup for ordering them, never evidence of volume. */
      const dr=kNum(o.SPM)||kNum(o['Sells /mo'])||0;
      const lost=dr>LOST_FIGURE_DROPS;
      o['Under 50 a month']=lost?'probably not - see below':'yes';
      if(lost)o.Flags=(o.Flags?o.Flags+'; ':'')+`${dr} rank drops with no confirmed figure — Amazon's number has dropped off rather than this being a small seller, so treat it as 50+`;
      if(!(n>1)){o['Demand basis']=lost?'confirmed figure lost \u00b7 '+dr+' drops says 50+':'under 50 a month \u00b7 rank drops only';return;}
      /* 2 — no confirmed figure: split the family by its reviews, if the family is in this export */
      const sibs=sibsOf(a).filter(x=>byAsin[x]);
      /* b104 (Jack, 18 Sep: "is the var thing fixed — I'm unsure if they sold due to var and reviews").
         The single most telling fact about a variation with no figure is whether a SIBLING has one. The ASUS
         Chromebook lead (Misty Green 128GB) had none, while the Fabric Blue 64GB beside it sold a confirmed
         1,000 a month — so the family's drops were that one's, not ours. Said on the row, as a label: the
         lesson of b103 is that this kind of thing informs a person and never gates on its own. */
      const seller=sibs.map(x=>({x,b:kNum(byAsin[x]['Monthly Sales Trends: Bought in past month'])||0,
          name:String(byAsin[x]['Variation Attributes']||'').replace(/[A-Za-z]+:\s*/g,'').replace(/;\s*$/,'').replace(/;\s*/g,', ').slice(0,40)}))
        .filter(z=>z.x!==a&&z.b>=50).sort((p,q)=>q.b-p.b)[0];
      if(seller){o['Family seller']=seller.name+' · '+seller.b+'/mo';
        o.Flags=(o.Flags?o.Flags+'; ':'')+`the family's sales are ${seller.name||seller.x} (${seller.b}/mo confirmed) — this option has no figure of its own`;}
      const fam=sibs.reduce((t,x)=>t+(rev[x]||0),0);
      if(fam>0&&rev[a]!=null){
        const share=rev[a]/fam;
        o['Option share %']=r1(share*100);o['Demand basis']='under 50 a month \u00b7 '+r1(share*100)+'% of the family reviews';
        o['Demand belongs to']='this option (estimated)';
        /* Jack's call, 17 Sep: "anything with 10 keepa drops and a 50% or under % shouldn't be sold unless
           its profit and roi is really really good, where i'd buy 1 unit." So it is not binned - it is
           marked ONE UNIT, and only stays worth anything when the money is exceptional. */
        const spm=dr, roi=kNum(o['ROI %'])||0, prof=kNum(o['Profit \u00a3'])||0;
        if(!lost&&share<=ONE_UNIT.share&&spm<=ONE_UNIT.drops){
          o['Buy how many']=(roi>=ONE_UNIT.roi&&prof>=ONE_UNIT.profit)?'1 unit only':'leave it';
          o.Flags=(o.Flags?o.Flags+'; ':'')+(o['Buy how many']==='1 unit only'
            ?'ONE UNIT ONLY \u2014 under 50 a month and only '+r1(share*100)+'% of the listing, but '+roi+'% ROI at '+gbp(prof)+' a unit'
            :'LEAVE IT \u2014 under 50 a month, only '+r1(share*100)+'% of the listing, and '+roi+'% ROI is not enough to risk it');
        }
        const dt=Date.parse(String(listed[a]||'').replace(/\//g,'-'));
        const isNew=dt&&dt>sixMonths;
        o.Flags=(o.Flags?o.Flags+'; ':'')
          +`1 of ${n} options and no confirmed sales — this one holds ${r1(share*100)}% of the family's reviews`
          +(isNew?`, but it only went live ${listed[a]} so that share understates it`:'');
        return;}
      /* 3 — nothing to split it with */
      o['Demand basis']=lost?'confirmed figure lost \u00b7 '+dr+' drops says 50+':'under 50 a month \u00b7 rank drops only';o['Demand belongs to']='the whole listing';
      o.Flags=(o.Flags?o.Flags+'; ':'')+`1 of ${n} options, no confirmed sales, and no family reviews in this export — the ${o.SPM||o['Sells /mo']||''}/mo is the whole listing's rank`;
    });})();
  /* b102 (Jack, 18 Sep: "sell price is around 51.50 — as that is what it was selling when it last went to
     full price"). Rule 1's sell is the Buy Box 90-day average +8%, and when Amazon has been discounting that
     average is dragged down — the G321 White reads £47.51 against a £50.98 market. On 8 Sep Jack settled that
     this exception is the GRAPH's job, not the formula's. Rule 2 rows have always had a box to type the price
     you read off the graph; Rule 1 rows never did, so on a brand run there was no way to do that job. Now there
     is. The typed price is stored per ASIN, shared, and re-runs the numbers through Rule 1's own fee maths —
     the formula is not changed, and the rule's own price stays on the row for comparison. */
  if(cur.rule===1){const F=factsAll();R.out.forEach(o=>{const f=F[o.ASIN];const ys=f&&+f.sell;if(!(ys>0))return;
    const kg=+o.kg||0,ref=(+o['Referral %']||15)/100,fba=+o['FBA fee £']||BR.DEF_FBA;
    const [pf,roi]=brProfit(ys,+o['Landed £'],ref,fba,kg,null,o.Category||'');
    o['Rule sell £']=o['Sell £ used'];o['Rule profit £']=o['Profit £'];o['Rule ROI %']=o['ROI %'];
    o['Sell £ used']=ys;o['Sell used']='your price'+(f.who?' ('+f.who+')':'');o['Profit £']=pf;o['ROI %']=roi;
    o.Score=r2score(pf,roi,o.SPM,ys<R2.LOW_TICKET);o.yourSell=true;});}
  /* the central blacklists: an ASIN, or an approved brand, never shows — on any rule, any run, whatever Keepa filter found it */
  const B=blAll(),bl=[];R.out=R.out.filter(o=>{const b=B[o.ASIN];const bb=bbStatusFor(o.Brand||(cur.type==='brand'?cur.name:''));
    if(b){bl.push([o.ASIN,o.Title||o.Product||'','BLACKLISTED · '+b.reason+(b.note?' — '+b.note:'')+(b.who?' · '+b.who:'')]);return false;}
    if(bb==='approved'){bl.push([o.ASIN,o.Title||o.Product||'','BRAND BLACKLISTED · '+(o.Brand||cur.name)]);return false;}
    const cw=catBlockReason((o.Category||'')+' | '+(o.Title||o.Product||''));if(cw){bl.push([o.ASIN,o.Title||o.Product||'','NEVER-SELL CATEGORY · '+cw]);return false;}return true;});
  R.blacklisted=bl;R.dropped=bl.concat(R.dropped||[]);if(bl.length)R.reasons['Blacklisted']=bl.length;
  /* this source's own floors — the customisable Filter & Sort, saved on the source so it is the same for everyone */
  const fl=[];R.out=R.out.filter(o=>{const why=failsFloor(o,cur.filters,R.rule);if(why){fl.push([o.ASIN,o.Title||o.Product||'','Below the floors set for '+cur.name+': '+why]);return false;}return true;});
  if(fl.length){R.dropped=fl.concat(R.dropped);R.reasons['Below the floors set for '+cur.name]=fl.length;}R.floored=fl.length;
  /* b54 (Jack, 15 Sep: the WD SSD at −3% "not even a 1, wouldn't show as it's not profit at all") — a Rule 1 row that loses money at the
     buy price and can't reach 10% with any code is not a lead. rule1.js stays frozen; this is the same "not worth a look" cut Rule 2 has. */
  if(R.rule===1){const dead=[];R.out=R.out.filter(o=>{if(+o['ROI %']>=0)return true;const best=codeBestRoi(o);if(best>=10)return true;dead.push([o.ASIN,o.Title||'',`loses money at the ${o['Buy market']||'UK'} price (${o['ROI %']}% ROI) and no code gets it to 10%${best>-99?' (best '+Math.round(best)+'%)':''}`]);return false;});
    if(dead.length){R.dropped=dead.concat(R.dropped);R.reasons['Loses money, no code fixes it']=dead.length;}}
  if(R.rule!==1)R.out.forEach((o,i)=>o['#']=i+1);
  R.gone=applyQueue(R.out,R.rule,prevMap,verdAll()).filter(([a])=>!B[a]);   /* a blacklisted ASIN is not 'gone', it is banned */
  const stamps=Object.values(prevMap).map(p=>p.stamp).filter(Boolean).sort();R.prevStamp=stamps.length?stamps[stamps.length-1]:null;R.prevMap=prevMap;
  {const sellNow=cur.rule===1?files.viewer:files.one;R.apiLook=!!(sellNow&&sellNow.fromKeepa);}   /* b139: the sell side came from the API, not an export */
  result=R;
  const s=sig();const fresh=s!==lastSig;if(fresh){lastSig=s;view.page=1;view.sel.clear();logRun();}
  renderResults();renderGuide();paintNext();
  if(fresh&&R.out.length&&!R.stored){setTimeout(()=>{const t=$('#leadTop');if(t)t.scrollIntoView({behavior:'smooth',block:'start'});},250);}}
/* b145 (Jack, 22 Sep: should a second run the same day replace the list? "yeah — shouldn't really be ran 2 times a day really if I'm honest").
   So the day's list is set by the FIRST run of the day and only ever grows: anything new a later run finds is added, nothing already on the
   list is taken off, however it has moved since this morning. */
function dayQueueFor(R){const had=(runsFor(cur.key).find(r=>(r.day||String(r.at).slice(0,10))===today())||{}).queue||[];
  const now=R.out.filter(o=>o.QUEUE).map(o=>o.ASIN);
  return [...new Set([...had,...now])];}
function logRun(){const R=result,c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};R.out.forEach(o=>c[o.STATUS]++);
  /* b139: an API look is Jack's own. No runSave (no src_runs row, due date unmoved), no leadSave (the compare baseline stays the VA's). */
  if(R.apiLook){const sf=cur.rule===1?files.viewer:files.one;
    apiLookSave(cur.key,{at:nowIso(),source:cur.key,name:cur.name,rule:cur.rule,who:me(),rowsIn:sf?sf.rows.length:0,st:R.st,leads:R.out.length,new:c.NEW,better:c.BETTER,gone:R.gone.length,rows:R.out});
    paintRunStrip();return;}
  const names=cur.rule===1?SLOTS.filter(k=>files[k]).map(k=>files[k].name):[files.one.name];
  const rowsIn=cur.rule===1?files.viewer.rows.length:files.one.rows.length;
  /* b143: the run remembers WHICH leads needed a look and which fell off, not just how many — so "what was I looking at yesterday?" has an answer */
  runSave({at:nowIso(),day:today(),source:cur.key,name:cur.name,rule:cur.rule,files:names,rowsIn,st:R.st,leads:R.out.length,new:c.NEW,better:c.BETTER,worse:c.WORSE,gone:R.gone.length,blacklisted:R.blacklisted.length,
    asins:R.out.map(o=>o.ASIN),queue:dayQueueFor(R),goneAsins:(R.gone||[]).slice(0,400).map(g=>g[0]),who:me()});
  leadSave(cur.key,nextLeadMap(R.out,R.rule,leadMap(cur.key)));renderLog();
  paintRunStrip();}   /* b143: today's run joins Last runs straight away — it used to need a reopen before you could click back into it */

/* ============ results ============ */
function sumTile(v,l,cls){return`<div class="sum ${cls||''}"><span class="sv">${typeof v==='number'?v.toLocaleString():v}</span><span class="sl">${l}</span></div>`;}
/* b147 (Jack, 22 Sep: "it's A2A, but if we find something profitable then we still want it").
   Products Amazon sells nowhere are not leads — there is no buy price — but they are not rubbish either: they sell,
   and we know what they fetch. So the run hands them over as a shopping list with the price to beat. */
const OA_HDR=['ASIN','Title','Brand','Sells /mo','SPM from','Sell £','Sell from','Breakeven buy £','Buy under £ for 20%','Buy under £ for 30%','Keepa','UK sell link'];
function paintOaTargets(){const res=$('#results');if(!res)return;let el=$('#oaTargets');
  if(!el){el=document.createElement('div');el.id='oaTargets';el.className='oatarg';const anchor=$('#leadTop');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(el,anchor);else res.appendChild(el);
    el.addEventListener('click',e=>{if(e.target.closest('#oaCsv')){const R=result;if(!R||!R.oa)return;
        download(base()+'-OA-TARGETS.csv',rowsToCsv(OA_HDR,R.oa),'text/csv');toast(R.oa.length+' OA targets downloaded');return;}
      if(e.target.closest('#oaMore')){el.classList.toggle('open');paintOaTargets();}});}
  const list=(result&&result.oa)||[];
  if(!list.length||result.stored){el.hidden=true;el.innerHTML='';return;}
  el.hidden=false;
  const open=el.classList.contains('open');
  const rows=(open?list:list.slice(0,5)).map(o=>`<tr><td class="p"><a href="${o.Keepa}" target="_blank" rel="noopener">${escapeHtml((o.Title||'').slice(0,62))}</a><span class="a">${o.ASIN}</span></td>
    <td class="n">${(+o['Sells /mo']).toLocaleString()}<span class="s">/mo</span></td>
    <td class="n">${gbp(o['Sell £'])}<span class="s">${escapeHtml(shortSell(o['Sell from']))}</span></td>
    <td class="n want">${gbp(o['Buy under £ for 20%'])}<span class="s">for 20%</span></td>
    <td class="n">${gbp(o['Breakeven buy £'])}<span class="s">breakeven</span></td></tr>`).join('');
  el.innerHTML=`<div class="oah"><b>${list.length} sell well, but Amazon is not selling them anywhere</b>
      <span>Not leads — there is no buy price yet. Find one under the target and they are. Ordered by what they sell.</span>
      <button type="button" class="btn ghost sm" id="oaCsv">Download the list</button></div>
    <table class="oatbl"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"><col class="c5"></colgroup><thead><tr><th>Product</th><th class="r">Sells</th><th class="r">Sell for</th><th class="r">Buy under</th><th class="r">Breakeven</th></tr></thead><tbody>${rows}</tbody></table>
    ${list.length>5?`<button type="button" class="linkbtn" id="oaMore">${open?'Show fewer':'Show all '+list.length}</button>`:''}`;}
function renderResults(){const R=result,st=R.st,out=R.out;$('#sumEmpty').hidden=true;$('#results').hidden=false;
  paintOptionBar();paintPastBar();paintEuLeads();paintOaTargets();
  const rev=out.filter(o=>o.QUEUE).length;let tiles;
  if(cur.rule===1){const cnt=k=>out.filter(o=>o['Buy market']===k).length,euN=out.length-cnt('UK');
    tiles=sumTile(st.viewer,'in the Viewer')+sumTile(st.demand,'sell 10+/mo in the UK')+sumTile(st.buy,'Amazon selling it')+sumTile(out.length,'leads','lead')
      +sumTile(rev,'to review today',rev?'cool':'')+sumTile(out.filter(o=>o['ROI %']>=10).length,'ROI 10%+')+sumTile(cnt('UK'),'buy from UK')+sumTile(euN,euN?'from EU · '+['DE','FR','IT','ES'].map(k=>cnt(k)?k+' '+cnt(k):'').filter(Boolean).join(' · '):'buy from EU','warm');}
  else{const m=out.reduce((s,o)=>s+o['£ per month'],0);
    tiles=sumTile(st.rows,'in the export')+sumTile(st.priced,'Amazon selling it')+sumTile(st.demand,'sell 10+/month')+sumTile(out.length,'leads','lead')
      +sumTile(rev,'to review today',rev?'cool':'')+sumTile(out.filter(o=>o.Score>=60).length,'score 60+')+sumTile(out.filter(o=>o.Score>=40&&o.Score<60).length,'score 40–59','warm')+sumTile(out.filter(o=>o['ROI %']>=20).length,'ROI 20%+','jade');}
  $('#sumGrid').innerHTML=tiles;
  paintStory();
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]);
  $('#fell').innerHTML=`<span class="fl">Filtered out</span><span class="fr">${rs.length?rs.map(([k,n])=>`${escapeHtml(k)} ${n}`).join(' · '):'nothing'}</span><span class="fbar"><span style="width:${Math.min(100,R.dropped.length/((st.viewer||st.rows)||1)*100)}%"></span></span><span class="fn">${R.dropped.length} dropped</span>`;
  const est=cur.rule===1?out.filter(o=>(o['Fees from']||'').startsWith('ESTIMATED')).length:0;
  const fw=$('#feeWarn');const msgs=[];
  /* b23: what Jack knows about this brand's channel (the note on its discount row) — once per run, not on every row */
  let bn=$('#brandNote');if(!bn){bn=document.createElement('div');bn.id='brandNote';bn.className='brandnote';fw.parentNode.insertBefore(bn,fw);}
  const be=cur.rule===1?discForBrand((cur.brands&&cur.brands[0])||cur.name):null;
  if(be&&be.note){bn.innerHTML=`<b>${escapeHtml(be.name)}</b> · ${escapeHtml(be.note)}`;bn.hidden=false;}else bn.hidden=true;
  let sn=$('#storedNote');if(!sn){sn=document.createElement('div');sn.id='storedNote';sn.className='storednote';fw.parentNode.insertBefore(sn,fw);}
  if(R.stored&&!R.apiLook&&!R.past){let d=R.at?new Date(String(R.at).replace(' ','T')):null;   /* b139: the API look and a past run have their own bar */if(d&&isNaN(d))d=null;const day=String(R.at||'').slice(0,10);const when=d?(day===today()?'today '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})):(day?day:'the last run');
    const rv=out.filter(o=>o.QUEUE).length;
    sn.innerHTML=`<b>Showing the saved run from ${when}</b> · ${out.length} leads as they were scored then · ${rv?rv+' still to review':'all judged'} · verdicts and links work as normal.${view.status==='REVIEW'&&rv<out.length?` <button type="button" class="linkbtn" id="snAll">Show all ${out.length} leads</button>`:''} Drop today's export above to refresh.`;sn.hidden=false;
    const sa=$('#snAll');if(sa)sa.addEventListener('click',()=>{view.status='ALL';view.page=1;renderTable();$('#leadTop').scrollIntoView({behavior:'smooth',block:'start'});});}else sn.hidden=true;
  if(est)msgs.push('<b>'+est+' of '+out.length+' leads have estimated fees.</b> Tick <em>Referral Fee %</em> and <em>FBA Pick&amp;Pack Fee</em> on the export and the maths becomes exact.');
  if(R.rule===1&&R.st&&R.st.bbHiCol===false)msgs.push('<b>This export has no <em>Buy Box: Highest</em> column</b>, so sell prices could not be capped at the most the listing has ever sold for. Tick it on the Keepa export next time.');
  if(msgs.length){fw.innerHTML=msgs.join('<br>');fw.classList.add('show');}else{fw.classList.remove('show');}
  $('#fMarket').hidden=cur.rule!==1;
  const unseen=out.filter(o=>!verdGet(o.ASIN)).length;const sb=$('#seenAll');sb.hidden=!unseen||!isJack();sb.textContent=`Mark all ${unseen} as seen`;
  paintPutBack(sb);
  renderTable();}
/* the summary in words + the status pills — repainted after every verdict so the numbers never lie */
/* b48 (Jack, 15 Sep: "some type of analysis vs last but better… difference from yesterday… the overall assessment of the file") */
function ukDate(stamp){const s=String(stamp||'');
  /* b139: a full ISO stamp (what every run saves) is UTC — show it in the clock on the wall, not an hour behind all summer */
  if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(s)){const d=new Date(s);if(!isNaN(d))return `${d.toLocaleDateString('en-GB',{weekday:'short'})} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
  const m=/^(\d{4})-(\d{2})-(\d{2})(?:[T_ ](\d{2}):?(\d{2}))?/.exec(s);if(!m)return escapeHtml(s);
  const d=new Date(+m[1],+m[2]-1,+m[3],m[4]?+m[4]:0,m[5]?+m[5]:0);const wd=d.toLocaleDateString('en-GB',{weekday:'short'});
  return `${wd} ${m[3]}/${m[2]}/${m[1]}`+(m[4]?` · ${m[4]}:${m[5]}`:'');}
function paintCompare(R,c,rev){let el=$('#vsYest');const sr=$('#statusRow');if(!sr)return;if(!el){el=document.createElement('div');el.id='vsYest';el.className='vsyest';sr.parentNode.insertBefore(el,sr);}
  const pm=R.prevMap||{};const prev=Object.values(pm).map(p=>p.state).filter(Boolean);
  if(!R.prevStamp||!prev.length){el.hidden=true;return;}
  const out=R.out;const sc=o=>+o.Score||0,psc=s=>+s.score||0,roi=o=>+o['ROI %']||0,proi=s=>+s.roi||0;
  const hasPrevScore=prev.some(s=>s.score);
  const rows=[['Leads',prev.length,out.length],['To review',null,rev],['Score 70+',hasPrevScore?prev.filter(s=>psc(s)>=70).length:null,out.filter(o=>sc(o)>=70).length],['Score 50+',hasPrevScore?prev.filter(s=>psc(s)>=50).length:null,out.filter(o=>sc(o)>=50).length],['ROI 20%+',prev.filter(s=>proi(s)>=20).length,out.filter(o=>roi(o)>=20).length],['Average ROI',Math.round(prev.reduce((a,s)=>a+proi(s),0)/prev.length)+'%',Math.round(out.reduce((a,o)=>a+roi(o),0)/(out.length||1))+'%']];
  const delta=(a,b)=>{if(a==null||typeof a==='string')return'';const d=b-a;return d?`<i class="${d>0?'up':'down'}">${d>0?'+':''}${d}</i>`:'<i class="flat">=</i>';};
  const tbl=`<table class="vstbl"><thead><tr><th></th><th>yesterday</th><th>today</th><th></th></tr></thead><tbody>${rows.map(([k,a,b])=>`<tr><td>${k}</td><td class="num">${a==null?'—':a}</td><td class="num"><b>${b}</b></td><td class="num">${delta(a,b)}</td></tr>`).join('')}</tbody></table>`;
  const nm=o=>escapeHtml((o.Product||o.Title||'').slice(0,42));
  const newest=out.filter(o=>o.STATUS==='NEW').sort((a,b)=>sc(b)-sc(a))[0];
  const riser=out.filter(o=>o.STATUS==='BETTER').sort((a,b)=>(b.gain||0)-(a.gain||0))[0];
  const faller=out.filter(o=>o.STATUS==='WORSE').sort((a,b)=>(a.gain||0)-(b.gain||0))[0];
  const up=c.NEW+c.BETTER,dn=c.WORSE+R.gone.length;
  const tone=up>=dn?(up>dn*1.5?'A good day: more came in or improved than slipped.':'A steady day: gains and slips about even.'):(dn>up*2?'A softer day: prices moved against you on most of yesterday\'s list.':'A slightly softer day: more slipped than improved.');
  const lines=[tone];
  if(newest)lines.push(`Best new lead: <b>${nm(newest)}</b> — score ${sc(newest)}, ${Math.round(roi(newest))}% ROI.`);
  if(riser)lines.push(`Biggest improvement: <b>${nm(riser)}</b> — ${escapeHtml(riser.Changed||'')}.`);
  if(faller)lines.push(`Biggest fall: <b>${nm(faller)}</b> — ${escapeHtml(faller.Changed||'')}.`);
  const q50=out.filter(o=>o.QUEUE&&sc(o)>=50).length;if(rev)lines.push(`Of the ${rev} to review, <b>${q50}</b> score 50 or better.`);
  el.innerHTML=`<div class="vsh">vs ${ukDate(R.prevStamp)}</div><div class="vsbody">${tbl}<div class="vslines">${lines.map(l=>`<p>${l}</p>`).join('')}</div></div>`;el.hidden=false;}
/* b127: a stored or past run has no row-by-row counts — say so instead of printing NaN */
function numOrDash(v){return(v==null||v==='—'||v===''||isNaN(+v))?'<b>—</b>':`<b>${(+v).toLocaleString()}</b>`;}
function paintStory(){const R=result;if(!R||!cur)return;const st=R.st,out=R.out;const rev=out.filter(o=>o.QUEUE).length;
  const c={NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};out.forEach(o=>c[o.STATUS]++);
  const judged=out.filter(o=>o.verdict&&!o.QUEUE).length;const V=verdAll();const yes=out.filter(o=>(V[o.ASIN]||{}).v==='Yes').length,no=out.filter(o=>(V[o.ASIN]||{}).v==='No').length;
  const n=numOrDash;
  const story=cur.rule===1
    ?`${n(st.viewer)} products in the Viewer → ${n(st.demand)} sell 10+ a month in the UK → ${n(out.length)} come out as leads → ${n(rev)} need a look today.`
    :`${n(st.rows)} products in the export → ${n(st.priced)} sold by Amazon → ${n(st.demand)} sell 10+ a month → ${n(out.length)} come out as leads → ${n(rev)} need a look today.`;
  const story2=R.prevStamp
    ?`Against ${ukDate(R.prevStamp)}: ${n(c.NEW)} new, ${n(c.BETTER)} more profitable, ${n(c.WORSE)} worse, ${n(c.UNCHANGED)} the same, ${n(R.gone.length)} gone. ${judged?`${n(judged)} already have a verdict and have not improved since${yes||no?` (${n(yes)} Yes · ${n(no)} No)`:''}. `:''}${n(R.dropped.length)} dropped by the rule${R.blacklisted.length?`, ${n(R.blacklisted.length)} blacklisted`:''}.`
    :`First run for ${escapeHtml(cur.name)}, so everything counts as new. ${n(R.dropped.length)} dropped by the rule${R.blacklisted.length?`, ${n(R.blacklisted.length)} blacklisted`:''}.`;
  const carried=out.filter(o=>o.QUEUE==='new'&&o.STATUS!=='NEW').length;
  const parked=out.filter(o=>!o.QUEUE&&!o.verdict).length;
  const story3=parked?`<p class="s3">${n(parked)} lead${parked===1?' is':'s are'} the same or worse than the last run and ${parked===1?'has':'have'} no verdict, so ${parked===1?'it is':'they are'} not in today's queue — switch to <b>Everything</b> to see ${parked===1?'it':'them'}; ${parked===1?'it comes':'they come'} back the moment ${parked===1?'it improves':'they improve'}.</p>`:'';
  $('#story').innerHTML=`<p>${story}</p><p class="s2">${story2}</p>${story3}`;$('#story').hidden=false;
  /* detail: why things dropped, and what is left */
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]);const totIn=(st.viewer||st.rows)||1;
  const KEYS={'Not enough demand':'demand:','No sell price':'no sell price','Amazon not selling':'amazon not selling','EU plug in title':'eu plug','Appliance from EU':'mains appliance','ROI under breakeven':'roi ','Slow seller, thin margin':'slow seller','Wide-gap, still under -15%':'wide-gap','Needs more discount than the brand gives':'needs ','Blacklisted':'blacklisted'};
  const who=k=>{const key=(KEYS[k]||k.split(' ').slice(0,3).join(' ')).toLowerCase();const hits=(R.dropped||[]).filter(d=>(d[2]||'').toLowerCase().includes(key)).slice(0,12);return hits.length?hits.map(d=>d[0]+' — '+(d[1]||'').slice(0,40)).join('\n')+((R.dropped||[]).filter(d=>(d[2]||'').toLowerCase().includes(key)).length>12?'\n…full list in the Dropped list download':''):'';};
  const bar=(k,v,tot,cls)=>`<div class="dr" title="${escapeHtml(who(k))}"><span class="dk">${escapeHtml(k)}</span><span class="db"><span class="${cls||''}" style="width:${Math.max(2,Math.round(v/tot*100))}%"></span></span><span class="dv">${(+v).toLocaleString()}</span></div>`;
  let left='';
  if(cur.rule===1){const cnt=k=>out.filter(o=>o['Buy market']===k).length;left=['UK','DE','FR','IT','ES'].filter(k=>cnt(k)).map(k=>bar(`Buy from ${k}`,cnt(k),out.length||1,'m-'+k.toLowerCase())).join('');}
  else{const b=[['Score 70+',o=>o.Score>=70,'g'],['Score 50–69',o=>o.Score>=50&&o.Score<70,'i'],['Score 30–49',o=>o.Score>=30&&o.Score<50,'a'],['Under 30',o=>o.Score<30,'f']];left=b.map(([k,f,c])=>bar(k,out.filter(f).length,out.length||1,c)).join('');}
  const roi=[['ROI 20%+',o=>o['ROI %']>=20,'g'],['ROI 10–20%',o=>o['ROI %']>=10&&o['ROI %']<20,'i'],['ROI under 10%',o=>o['ROI %']<10,'a']].map(([k,f,c])=>bar(k,out.filter(f).length,out.length||1,c)).join('');
  $('#sumDetail').innerHTML=`<div class="dcol"><div class="dh">Why ${R.dropped.length.toLocaleString()} were dropped</div>${rs.length?rs.map(([k,v])=>bar(k,v,totIn,'d')).join(''):'<div class="dr"><span class="dk">nothing dropped</span></div>'}</div><div class="dcol"><div class="dh">The ${out.length} leads</div>${left}${roi}</div>`;
  paintCompare(R,c,rev);
  $('#statusRow').innerHTML=(R.prevStamp?`<span class="vs">vs ${ukDate(R.prevStamp)}</span>`:`<span class="vs">first run for ${escapeHtml(cur.name)} — everything is NEW</span>`)+
    [['TO REVIEW',rev,'rev'],['NEW',c.NEW,'new'],['BETTER',c.BETTER,'better'],['WORSE',c.WORSE,'worse'],['UNCHANGED',c.UNCHANGED,'same'],['GONE',R.gone.length,'gone'],['BLACKLISTED',R.blacklisted.length,'bl']].map(([l,n,k])=>`<span class="spill ${k}${n?'':' zero'}"><b>${n}</b>${l}</span>`).join('');
}
/* b144 (Jack, 22 Sep: "the 83 that was in the queue needs to be there for the day and marked done by x person").
   The queue used to be a live filter: judge a lead and it vanished, so you could not see what you had done, who had done
   it, or how much was left — and after a reload the list you started the day with was gone. Today's queue is now the
   day's list. It is fixed when the run is logged, every lead on it stays visible until tomorrow, and the ones that are
   answered sit at the bottom wearing the name of whoever answered them. */
function dayList(){if(!cur||!result||result.past||result.apiLook)return null;   /* b144: a reopened source still gets today's list — only an older run opened on purpose does not */
  const r=runLast(cur.key);if(!r||(r.day||String(r.at).slice(0,10))!==today()||!r.queue||!r.queue.length)return null;
  return new Set(r.queue);}
function paintDayBar(total,done){let el=$('#dayBar');const host=$('#leadTop');if(!host)return;
  if(!el){el=document.createElement('div');el.id='dayBar';el.className='daybar';host.appendChild(el);}
  if(!total){el.hidden=true;el.innerHTML='';return;}
  el.hidden=false;const pct=Math.round(done/total*100);
  el.innerHTML=`<span class="dbb"><i style="width:${pct}%"></i></span><span class="dbt">${done} of ${total} answered today${done===total?' — all done':''}</span>`;}
function visible(){const q=view.q.toLowerCase();const day=dayList();const list=result.out.filter(o=>{
  if(view.status==='REVIEW'){if(!o.QUEUE&&!touched.has(o.ASIN)&&!(day&&day.has(o.ASIN)))return false;}
  else if(view.status!=='ALL'&&o.STATUS!==view.status)return false;
  if(cur.rule===1&&view.market!=='ALL'&&o['Buy market']!==view.market)return false;
  if(view.hideNo){const v=verdGet(o.ASIN);if(v&&v.v==='No')return false;}
  if(q&&!((o.ASIN+' '+(o.Title||o.Product||'')+' '+(o.Brand||'')).toLowerCase().includes(q)))return false;return true;});
  const sc=o=>o.Score||0;
  if(view.sort==='default'&&cur.rule===1)list.sort((a,b)=>sc(b)-sc(a)||b['Profit £']-a['Profit £']);
  if(view.status==='REVIEW'&&day){const done=o=>(verdGet(o.ASIN)?1:0);list.sort((a,b)=>done(a)-done(b));}
  if(view.sort==='gain')list.sort((a,b)=>(b.gain||0)-(a.gain||0)||sc(b)-sc(a));
  else if(view.sort==='profit')list.sort((a,b)=>b['Profit £']-a['Profit £']);
  else if(view.sort==='roi')list.sort((a,b)=>b['ROI %']-a['ROI %']);
  else if(view.sort==='month')list.sort((a,b)=>(b['£ per month']||b['Profit £']*b.SPM)-(a['£ per month']||a['Profit £']*a.SPM));
  return list;}
function acts(o){const mk=cur.rule===1?(o['Buy market']||'UK'):'UK';
  return`<span class="rowacts"><a href="${o.Keepa}" target="_blank" rel="noopener" title="Keepa graph — the Track tab is on this page">Keepa</a><a href="${o.SAS}" target="_blank" rel="noopener" title="SellerAmp">SAS</a><a href="${o['Buy link']}" target="_blank" rel="noopener" title="Where we would buy it">Buy ${mk}</a><a href="${o['UK sell link']||o['Buy link']}" target="_blank" rel="noopener" title="The UK listing we would sell on">Sell UK</a></span>`;}
function verdCell(o){const v=verdGet(o.ASIN)||{};const b=x=>`<button type="button" class="vb ${x[0]}${v.v===x?' on':''}" data-v="${x}" data-asin="${o.ASIN}" title="${x}">${x[0]}</button>`;
  /* b140: once a reason is picked only that chip stays (click it to change) — five chips one under the other were 105px of every No row */
  const chips=v.v==='No'?`<div class="vreasons${v.reason?' picked':''}">${noReasons().filter(r=>!v.reason||r===v.reason).map(r=>`<button type="button" class="vr${v.reason===r?' on':''}" data-r="${r}" data-asin="${o.ASIN}">${escapeHtml(r)}</button>`).join('')}</div>`:'';
  const note=v.v&&v.v!=='Seen'?`<input class="vnote" data-asin="${o.ASIN}" placeholder="note…" value="${escapeHtml(v.note||'')}">`:'';
  const who=v.v?`<span class="chg" title="${escapeHtml((v.v==='Seen'?'Marked seen':v.v)+' by '+(v.who||'?')+' · '+fmtWhen(v.at)+(v.via?' · from '+v.via:''))}">${v.v==='Seen'?'seen':''} ${escapeHtml(v.who||'')} · ${fmtWhen(v.at)}${v.via&&v.v==='Seen'?` <i class="viab">${escapeHtml(v.via)}</i>`:''}</span>`:'';
  const pick=blPick===o.ASIN?`<div class="blpick"><span class="t">Never show again — why?</span>${BL_REASONS.map(r=>`<button type="button" class="vr" data-blr="${r}" data-asin="${o.ASIN}">${r}</button>`).join('')}<button type="button" class="brandb" data-blbrand="${o.ASIN}">Blacklist the whole brand instead…</button></div>`:'';
  return`<div class="verd">${b('Yes')}${b('No')}${b('Maybe')}<button type="button" class="vb B${blPick===o.ASIN?' on':''}" data-bl="${o.ASIN}" title="Blacklist — never show this ASIN again">⃠</button></div>${chips}${note}${who}${pick}`;}
function statusCell(o){const sp=`<span class="spill ${({NEW:'new',BETTER:'better',WORSE:'worse',UNCHANGED:'same'})[o.STATUS]}">${o.STATUS}</span>`
    /* b145: BETTER says HOW MUCH better. On the 11→12 Sep Mera pair, 25 leads were "more profitable" — 4 of them by £10+ and 13 by under 25p. Same word, very different news. */
    +(o.STATUS==='BETTER'&&Math.abs(o.gain||0)>=0.005?`<span class="gainb ${Math.abs(o.gain)>=1?'big':''}" title="How much more profit a unit than the last run">+${Math.abs(o.gain)>=1?'£'+Math.abs(o.gain).toFixed(2):Math.round(Math.abs(o.gain)*100)+'p'}</span>`:'');
  const first=(o.Changed||'').split('; ')[0]||'';
  const chg=o.Changed?`<span class="chg" title="${escapeHtml(o.Changed)}">${escapeHtml(first)}${o.Changed.includes('; ')?' …':''}</span>`:'';
  const since=o.QUEUE==='better'?`<span class="chg since" title="${escapeHtml(o.sinceVerdict)}">↑ since ${escapeHtml(o.verdict.v==='Seen'?'seen':o.verdict.v)}${o.verdict.who?' · '+escapeHtml(o.verdict.who):''}</span>`:'';
  const low=o.low?`<span class="chg" title="Lowest buy we saw, and when — set a Keepa track at it">low was £${o.low.buy.toFixed(2)} on ${escapeHtml(o.low.stamp.slice(8,10))}/${escapeHtml(o.low.stamp.slice(5,7))}</span>`:'';
  return sp+chg+since+low;}
function renderTable(){const all=visible();const pages=Math.max(1,Math.ceil(all.length/PAGEN()));if(view.page>pages)view.page=pages;
  const rows=all.slice((view.page-1)*PAGEN(),view.page*PAGEN());
  {const out=result.out,c={REVIEW:out.filter(o=>o.QUEUE).length,ALL:out.length,NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};out.forEach(o=>{if(c[o.STATUS]!=null)c[o.STATUS]++;});
    document.querySelectorAll('#fSeg button').forEach(b=>{b.classList.toggle('on',b.dataset.st===view.status);const n=b.querySelector('b');if(n)n.textContent=c[b.dataset.st]||0;});}
  {const day=dayList();const lc=$('#leadCount');
    if(view.status==='REVIEW'&&day){const inDay=result.out.filter(o=>day.has(o.ASIN));const doneRows=inDay.filter(o=>verdGet(o.ASIN));
      const byWho={};doneRows.forEach(o=>{const w=(verdGet(o.ASIN)||{}).who||'?';byWho[w]=(byWho[w]||0)+1;});
      const whoTxt=Object.entries(byWho).sort((a,b)=>b[1]-a[1]).map(([w,n])=>`${escapeHtml(w)} ${n}`).join(' · ');
      lc.innerHTML=`Today's list <b>${inDay.length-doneRows.length}</b> to do<span class="ldone"> · ${doneRows.length} done${whoTxt?' · '+whoTxt:''}</span>`;
      paintDayBar(inDay.length,doneRows.length);}
    else{paintDayBar(0,0);lc.textContent='';}}
  if($('#leadCount').textContent==='')$('#leadCount').textContent=({REVIEW:'To review',ALL:'All leads',NEW:'New',BETTER:'Better',WORSE:'Worse',UNCHANGED:'Unchanged'})[view.status]+(all.length===result.out.length?` (${all.length})`:` (${all.length} of ${result.out.length})`);
  const asin=o=>`<td class="asin">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></td>`;
  const sel=o=>`<td class="sel"><input type="checkbox" data-sel="${o.ASIN}"${view.sel.has(o.ASIN)?' checked':''}></td>`;
  const pend=b=>bbStatusFor(b)==='pending'?`<i class="ch pend" title="Brand blacklist requested — waiting for Jack">BRAND BLACKLIST PENDING</i>`:'';
  let h;
  if(!all.length){const n=result.out.length;
    /* b129: the empty To-review state was a dead end — a VA read "hit All leads above" and had to find it. One button. */
    $('#leads').innerHTML=`<tbody><tr><td class="emptyrow">${view.status==='REVIEW'?`<b>Nothing new to review.</b><span>Every lead on this run is the same as or worse than the last run, or already judged and not improved since.</span>${n?`<button type="button" class="btn solid sm" id="seeAll">See all ${n} lead${n===1?'':'s'}</button>`:''}`:'<b>Nothing matches.</b>'}</td></tr></tbody>`;
    const b=$('#seeAll');if(b)b.addEventListener('click',()=>{view.status='ALL';view.page=1;renderTable();});
    $('#pager').innerHTML='';$('#openSel').textContent='Open in Keepa';return;}
  const asinl=o=>`<span class="asinl">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></span>`;
  const roiCls=v=>v>=20?'pos':v>=10?'pos soft':v>=0?'warm':'neg';
  const mk=m=>`<i class="mk">${FLAG[m]||''} ${m}</i>`;
  /* Rule 1's flag strings are long; show a short label, keep the full text on hover */
  const SHORT=[[/^worst case \(Buy Box 90d (£[\d.,]+)/i,(m)=>['Worst case '+m[1],'info']],[/sell price volatile/i,()=>['Volatile sell','warn']],[/AMAZON OWNS THE BUY BOX/i,()=>['Amazon owns BB','warn']],[/UK buy: check OA/i,()=>['Check OA','good']],[/A2A->OA/i,()=>['OA only','info']],[/NOT A DROP/i,()=>['Not a drop','warn']],[/not in a drop/i,()=>['UK not in a drop','warn']],[/EU PLUG|PLUG/i,()=>['EU plug?','bad']],[/WIDE/i,()=>['Wide gap','warn']],[/no FBA/i,()=>['No FBA history','warn']],[/LIMITED|LTD/i,()=>['Ltd time deal','warn']],[/drops only/i,()=>['Demand from drops','warn']],[/tanked/i,()=>['FBA price falling','warn']],[/ZERO-RATED/i,()=>['0% VAT?','good']],[/price-match/i,()=>['Price-match','good']]];
  const shortFlag=f=>{for(const [re,fn] of SHORT){const m=re.exec(f);if(m)return fn(m);}return[f.length>26?f.slice(0,24)+'…':f,''];};
  const flagChip=f=>{const [l,c]=shortFlag(f);return`<i class="ch ${c}" title="${escapeHtml(f)}">${escapeHtml(l)}</i>`;};
  /* the OA check: which retailers to look at for THIS product, and the tick boxes for what the VA has confirmed */
  const hb=o=>/health|beauty|drugstore/i.test(o.Category||'');
  const pmOpts=o=>o['Category kind']==='grocery'?(hb(o)?['Boots','Superdrug','Brand direct']:['Tesco','Boots','Brand direct']):PM_OPTIONS;
  const oaCell=o=>{const fact=factGet(o.ASIN);const opts=pmOpts(o);const conf=(fact.pm||[]);
    /* b26 (Jack: "don't forget the discount on Shark and Ninja… tell us to go to OA check"): the brand's own code is named outright */
    let best='';const P=o.pot||[];if(P.length){const be=discForBrand(o.Brand);const bp=P.find(x=>be?x.who===be.name:/ direct$/.test(x.who));const b=P.reduce((m,x)=>x.roi>m.roi?x:m,P[0]);
      const parts=[];if(bp&&bp.roi>=5)parts.push(`<b>OA · ${escapeHtml(bp.who)} ${bp.pct}%</b> → ${pct(bp.roi)} ROI`);
      if(b.roi>=8&&(!bp||b.who!==bp.who))parts.push(`${bp?'or ':'<b>Check OA</b> · '}up to ${pct(b.roi)} ROI with a code`);
      if(parts.length)best=`<div class="oabest" title="${escapeHtml(P.map(x=>`${x.who} ${x.pct}% → ${pct(x.roi)} ROI`).join(' · '))}">${parts.join(' · ')}</div>`;}
    else if(o['Category kind']==='grocery')best=`<div class="oabest dim">${hb(o)?'Boots / Superdrug':'Tesco / Boots'} — check by eye, they don't price-match Amazon</div>`;
    return`${best}<div class="pms">${opts.map(x=>`<button type="button" class="pm${conf.includes(x)?' on':''}" data-pm="${x}" data-asin="${o.ASIN}" title="Tick when you have confirmed ${x} has it at a price that works">${pmLabel(x)}</button>`).join('')}</div>${pmHint(o.Brand)}`;};
  /* Rule 1, UK buy: what the same lead looks like taken to OA — landed less a price-matcher's code. Display only; rule1.js is frozen. */
  const oaChip=o=>{if(o['Buy market']!=='UK')return'';const landed=+o['Landed £'],p=+o['Profit £'];if(!landed)return'';const V=/ZERO-RATED/.test(o.Flags||'')?1:1.2;
    const list=[];const be=discForBrand((cur.brands&&cur.brands[0])||cur.name);if(be){const r=discRate(be,landed);if(r>0)list.push([be.name,r]);}
    discMatchers().forEach(e=>{const r=discRate(e,landed);if(r>0&&!list.some(x=>x[0]===e.name))list.push([e.name,r]);});
    const rows=list.map(([who,pct])=>{const c=landed*(1-pct/100);const pp=p+(landed-c)/V;return{who,pct,p:pp,roi:c?100*pp/c:0};}).sort((a,b)=>b.roi-a.roi);
    if(!rows.length)return'';const b=rows[0];const br=be?rows.find(x=>x.who===be.name):null;if(b.roi<8&&!(br&&br.roi>=5))return'';const fact=factGet(o.ASIN);const conf=(fact.pm||[]).length;
    const lab=(br&&br.roi>=5)?`OA · ${br.who} ${Math.round(br.pct*10)/10}% → ${Math.round(br.roi)}% ROI`:`Check OA · up to ${Math.round(b.roi)}% ROI`;
    return`<i class="ch ${conf?'good':'oa'}" title="${escapeHtml(rows.map(x=>`${x.who} ${Math.round(x.pct*10)/10}% → £${x.p.toFixed(2)} profit · ${Math.round(x.roi)}% ROI`).join(' · '))}">${escapeHtml(lab)}</i>`;};
  const pmRow=o=>o['Buy market']!=='UK'?'':`<div class="pms pms-r1">${PM_OPTIONS.map(x=>`<button type="button" class="pm${(factGet(o.ASIN).pm||[]).includes(x)?' on':''}" data-pm="${x}" data-asin="${o.ASIN}" title="Tick when you have confirmed ${x} price-matches">${pmLabel(x)}</button>`).join('')}</div>`;
  if(cur.rule===1){h=`<thead><tr><th></th><th>#</th><th>Score</th><th>Product</th><th>Verdict</th><th class="r">Landed £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">/mo</th><th>Flags · OA check</th></tr></thead><tbody>`;
    rows.forEach((o,i)=>{const fl=(o.Flags||'').split('; ').filter(Boolean);const band=bandOf(o.Score||1);h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''} band-${band}${verdGet(o.ASIN)?' rdone':''}" data-asin="${o.ASIN}">${sel(o)}<td class="idx">${(view.page-1)*PAGEN()+i+1}</td><td class="scorec"><span class="score ${band}">${o.Score||1}</span><div class="stat2">${statusCell(o)}</div></td>
      <td class="prod"><span class="t" title="${escapeHtml(o.Title)}">${escapeHtml(o.Title)}</span><span class="s">${asinl(o)}<span>${escapeHtml(o['Sell used'])}${o['LTD badge']?' · <b>LTD</b>':''}</span></span>${acts(o)}${pend(cur.name)}</td>
      <td class="vcell">${verdCell(o)}</td>
      <td class="num r buyc">${mk(o['Buy market'])} <b>${gbp(o['Landed £'])}</b>${o['Discount applied']?`<span class="sub">${escapeHtml(o['Discount applied'])}</span>`:''}</td>
      <td class="num r sellc"><b class="${o.yourSell?'yours':''}">${gbp(o['Sell £ used'])}</b>${o.yourSell?`<span class="sub">yours · rule said ${gbp(o['Rule sell £'])}</span>`:((o['Sell low £']||0)>0&&(o['Sell low £']||0)<(o['Sell £ used']||0)-0.005?`<span class="sub" title="If it only ever fetches the Buy Box 90d average">worst £${(o['Sell low £']).toFixed(2)}</span>`:'')}<input class="ysell" data-asin="${o.ASIN}" type="number" step="0.01" min="0" placeholder="your £" value="${o.yourSell?o['Sell £ used']:''}" title="Read the graph? Type what it really sells at and the profit re-works">${lvlPicker(o.ASIN,o['Sell £ used'])}</td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}"><b>${gbp(o['Profit £'])}</b></td><td class="num r ${roiCls(o['ROI %'])}"><b>${pct(o['ROI %'])}</b></td>
      <td class="num r demc">${o.SPM}<span class="sub">${o['SPM from']}${o.Options?` · 1 of ${o.Options}`:''}</span></td>
      <td class="flagc">${(()=>{const oa=oaChip(o),fx=flagPick(fl);return`<span class="chips">${oa}${fx.show.map(flagChip).join('')}${fx.rest.length?`<i class="ch more" title="${escapeHtml(fx.rest.join(' · '))}">+${fx.rest.length}</i>`:''}</span>`;})()}${pmRow(o)}</td></tr>`;});}
  else{h=`<thead><tr><th></th><th>#</th><th>Score</th><th>Product</th><th>Verdict</th><th class="r">Buy £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">Demand</th><th title="We cannot see other retailers' prices. These are the ones worth checking for this product — tick what you confirm.">OA check · you check</th></tr></thead><tbody>`;
    rows.forEach(o=>{const pot=o['Potential score']>o.Score+5?o['Potential score']:0;const band=bandOf(Math.max(o.Score,pot));
      const fact=factGet(o.ASIN);const alt=[['Buy Box 90d',o['Buy Box 90d £']],['Buy Box 180d',o['Buy Box 180d £']],['FBA 90d',o['FBA 90d £']],['FBM 90d',o['FBM 90d £']],['Buy Box high',o['Buy Box high £']]].filter(x=>x[1]).map(x=>`${x[0]} ${gbp(x[1])}`).join(' · ');
      const vcls=fact.vat==null?'':(+fact.vat===0?'z':'s');const vtxt=fact.vat==null?(o['VAT %']===0?(cur.vat0?'0% VAT · FILTER':'0% VAT · CONFIRM'):'VAT 20%'):(+fact.vat===0?'0% VAT ✓':'20% VAT ✓');
      h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''} band-${band}${verdGet(o.ASIN)?' rdone':''}" data-asin="${o.ASIN}">${sel(o)}<td class="idx">${o['#']}</td>
      <td class="scorec"><span class="score ${band}">${o.Score}</span>${pot?`<span class="potl" title="Potential score with ${escapeHtml(o['Potential via'])}">→ ${pot}</span>`:''}<div class="stat2">${statusCell(o)}</div></td>
      <td class="prod"><span class="t" title="${escapeHtml(o.Product)}">${escapeHtml(o.Product)}</span><span class="s">${asinl(o)}<span>${escapeHtml(o.Brand)} · ${o['Sells /mo']}/mo ${o['Demand from']}${o.Reviews?' · '+o.Reviews.toLocaleString()+' reviews':''}${o['Age days']!==''?' · '+o['Age days']+'d':''}</span></span>${acts(o)}<span class="chips">${(()=>{const cs=(o.chips||[]).filter(([t])=>!/VAT/.test(t));const show=cs.slice(0,4),more=cs.slice(4);return show.map(([t,c])=>`<i class="ch ${c}">${escapeHtml(t)}</i>`).join('')+(more.length?`<i class="ch more" title="${escapeHtml(more.map(x=>x[0]).join(' · '))}">+${more.length}</i>`:'');})()}<button type="button" class="ch vatb ${vcls}" data-vat="${o.ASIN}" title="Rule 3 — click to cycle: 0% VAT set by you → 20% set by you → back to the rule">${vtxt}</button>${pend(o.Brand)}</span></td>
      <td class="vcell">${verdCell(o)}</td>
      <td class="num r buyc"><b>${gbp(o['After discount £'])}</b><span class="sub">${o['Discount applied']?'Amazon '+gbp(o['Buy at £'])+' · '+escapeHtml(o['Discount applied']):(o['Amazon 90d drop %']!==''&&o['Amazon 90d drop %']!=null?o['Amazon 90d drop %']+'% under 90d avg':'')}</span></td>
      <td class="num r sellc"><b>${gbp(o['Sell for £'])}</b><span class="sub conf-${o['Sell confidence']}" title="${escapeHtml(o['Sell from']+' — '+alt)}">${escapeHtml(shortSell(o['Sell from']))}</span><input class="ysell" data-asin="${o.ASIN}" type="number" step="0.01" placeholder="your £" value="${fact.sell||''}" title="What the graph says it really sells for — saved, and used for the refit">${lvlPicker(o.ASIN,o['Sell for £'])}</td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}"><b>${gbp(o['Profit £'])}</b></td><td class="num r ${roiCls(o['ROI %'])}"><b>${pct(o['ROI %'])}</b></td>
      <td class="num r demc">${o['Sells /mo']}<span class="sub">/mo${o['Demand from']?' · '+escapeHtml(o['Demand from']):''}${o.Options?` · 1 of ${o.Options}`:''}</span></td>
      <td class="pmc">${oaCell(o)}</td></tr>`;});}
  $('#leads').innerHTML=h+'</tbody>';
  const from=all.length?(view.page-1)*PAGEN()+1:0,to=Math.min(all.length,view.page*PAGEN());
  let pg='';const win=[...new Set([1,2,view.page-1,view.page,view.page+1,pages-1,pages].filter(p=>p>=1&&p<=pages))].sort((a,b)=>a-b);
  let last=0;win.forEach(p=>{if(p-last>1)pg+='<span style="padding:0 4px;color:var(--faint)">…</span>';pg+=`<button data-pg="${p}" class="${p===view.page?'on':''}">${p}</button>`;last=p;});
  $('#pager').innerHTML=`<span>Showing ${from}–${to} of ${all.length}${view.sel.size?` · <b>${view.sel.size} selected</b>`:''}${pages>1&&view.page<pages?` · <span class="pghint">${all.length-to} more on the next page — ↓ carries on</span>`:''}</span><div class="pg"><button data-pg="${view.page-1}" ${view.page<=1?'disabled':''}>‹</button>${pg}<button data-pg="${view.page+1}" ${view.page>=pages?'disabled':''}>›</button></div>`;
  $('#openSel').textContent=view.sel.size?`Open ${view.sel.size} ticked in Keepa`:all.length<=OPEN_ALL_MAX?`Open all ${all.length} in Keepa`:`Open ${rows.length} on this page in Keepa`;
  $('#openSel').title='Opens them in one Keepa tab. Looking is not judging — nothing is marked, and they stay in To review until you press Y / N / M.';
  setupKeys();paintJudged();paintEuLeads();if(view.active){const tr=document.querySelector(`.ltbl tbody tr[data-asin="${view.active}"]`);if(tr)tr.classList.add('active');}}
/* b23 density pass (Jack, 14 Sep: "too busy") — the Sell cell already shows the worst case and the retailer buttons say
   "check OA", so those two flags are noise; the rest are ranked and only two show, the others sit behind "+n" on hover */
const FLAG_RANK=[/EU PLUG|PLUG CHECK/i,/tanked/i,/NOT A DROP/i,/no FBA seller/i,/LIMITED TIME/i,/AMAZON OWNS/i,/WIDE SELL/i,/volatile/i,/drops only/i,/not in a drop/i,/A2A->OA/i,/ZERO-RATED/i];
function flagPick(fl,max){max=max==null?2:max;const keep=(fl||[]).filter(f=>!/^worst case|^UK buy: check OA/i.test(f));
  const rank=f=>{const i=FLAG_RANK.findIndex(re=>re.test(f));return i<0?FLAG_RANK.length:i;};
  const sorted=keep.slice().sort((a,b)=>rank(a)-rank(b));return{show:sorted.slice(0,max),rest:sorted.slice(max)};}
function shortSell(w){if(!w)return'';return String(w)
  .replace(/^Buy Box 90d average \(180d is an old higher price\) · no uplift/,'BB 90d avg · 180d was an old price')
  .replace(/^Buy Box (90\/180d|90d) average · no uplift \(under £\d+\)/,'BB $1 avg · no uplift')
  .replace(/^Buy Box (90d|180d) \+(\d+)%/,'BB $1 +$2%')
  .replace(/capped at the FBA 90d average/,'capped at FBA 90d').replace(/capped at the Buy Box high/,'capped at BB high').replace(/capped at the 3P 90d average/,'capped at 3P 90d')
  .replace(/^3P holds the Buy Box today/,'3P holds the Buy Box').replace(/^3P 90d average \(no Buy Box history\)/,'3P 90d avg · no BB history');}
const PM_SHORT={};   /* b29: Jack — "why the fuck JL and Brand" — full names */
function pmLabel(x){return PM_SHORT[x]||x;}
/* what Jack knows about where a brand's stock really turns up — the note on the brand's discount row (Settings) */
function pmHint(brand){const e=typeof discForBrand==='function'?discForBrand(brand):null;if(!e||!e.note)return'';return`<div class="pmhint" title="${escapeHtml(e.name+': '+e.note)}">${escapeHtml(e.note)}</div>`;}
/* best ROI a Rule 1 UK row reaches with the brand's own code or a price-matcher's — the OA chip's maths, shared with run() */
function codeBestRoi(o){if(!cur||o['Buy market']!=='UK')return -99;const landed=+o['Landed £'],p=+o['Profit £'];if(!landed)return -99;const V=/ZERO-RATED/.test(o.Flags||'')?1:1.2;
  const list=[];const be=discForBrand((cur.brands&&cur.brands[0])||cur.name);if(be){const r=discRate(be,landed);if(r>0)list.push(r);}
  discMatchers().forEach(e=>{const r=discRate(e,landed);if(r>0)list.push(r);});
  return list.reduce((m,pct)=>{const c=landed*(1-pct/100);const pp=p+(landed-c)/V;return Math.max(m,c?100*pp/c:-99);},-99);}
function bandOf(sc){return sc>=70?'hi':sc>=50?'md':sc>=30?'lo':'weak';}
function leadOf(a){return result?result.out.find(o=>o.ASIN===a):null;}
/* b142: every lead this source marked SEEN today — what the old Open button stamped, and what "Mark all as seen" stamps.
   Yes / No / Maybe are never in here, so putting them back can only restore a queue, never lose a real answer. */
/* the NEWEST day that has seen-marks on this source, not just today — so the button is still there when Jack pushes this tomorrow */
function seenToday(){if(!result||!cur)return[];const V=verdAll();
  const mine=(result.out||[]).filter(o=>{const v=V[o.ASIN];return v&&v.v==='Seen'&&(!v.source||v.source===cur.key)&&v.at;});
  if(!mine.length)return[];
  const last=mine.map(o=>String(V[o.ASIN].at).slice(0,10)).sort().pop();
  return mine.filter(o=>String(V[o.ASIN].at).slice(0,10)===last).map(o=>o.ASIN);}
function seenTodayDay(){if(!result||!cur)return'';const V=verdAll();const a=seenToday();return a.length?String((V[a[0]]||{}).at||'').slice(0,10):'';}
function paintPutBack(sb){if(!sb||!sb.parentNode)return;let ub=$('#putBack');
  if(!ub){ub=document.createElement('button');ub.type='button';ub.id='putBack';ub.className='btn ghost sm putback';sb.parentNode.insertBefore(ub,sb.nextSibling);ub.addEventListener('click',putBackSeen);}
  const n=isJack()?seenToday().length:0;ub.hidden=!n;const day=seenTodayDay();
  ub.textContent=day===today()?`Put ${n} back in the queue`:`Put ${n} back in the queue · seen ${ukDate(day).replace(/^\w+ /,'')}`;
  ub.title=`${n} lead${n===1?'':'s'} on this source were marked SEEN on ${day===today()?'today':ukDate(day)} — by "Mark all as seen", or by the old Open in Keepa button which marked what it opened. This clears those marks so they are back in To review. Yes / No / Maybe are not touched.`;}
function putBackSeen(){const list=seenToday();if(!list.length)return;
  const day=seenTodayDay();
  if(!confirm(`Put ${list.length} lead${list.length===1?'':'s'} back in the queue?\n\nThey were marked SEEN on ${day===today()?'today':ukDate(day)} — by "Mark all as seen", or by the old Open in Keepa button which used to mark what it opened.\n\nYour Yes / No / Maybe are not touched.`))return;
  verdDelMany(list);
  result.gone=applyQueue(result.out,result.rule,result.prevMap||{},verdAll()).filter(([a])=>!blAll()[a]);
  touched.clear();renderResults();renderLog();toast(`${list.length} back in the queue`);}
function markAllSeen(){if(!result||!needMe())return;const list=result.out.filter(o=>!verdGet(o.ASIN));if(!list.length){toast('Everything already has a verdict');return;}
  if(!confirm(`Mark all ${list.length} leads without a verdict as SEEN by ${me()}? This is the baseline: from the next run only NEW leads and ones that got BETTER will be "to review".`))return;
  verdSetMany(list.map(o=>({asin:o.ASIN,v:{v:'Seen',reason:'',note:'',source:cur.key,state:o.state}})),'Mark all as seen');
  list.forEach(o=>{o.verdict=verdGet(o.ASIN);o.QUEUE='';o.sinceVerdict='';});touched.clear();renderResults();renderLog();toast(list.length+' marked as seen — baseline set');}
function onTableClick(e){const cp=e.target.closest('button[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');return;}
  const b=e.target.closest('button');if(!b)return;const a=b.dataset.asin||b.dataset.bl||b.dataset.blbrand||b.dataset.vat||b.dataset.track;if(!a)return;const o=leadOf(a);
  /* b116: a level chip = the sell for this lead, and a lesson for the shape. Tap the one that is on to clear it. */
  if(b.dataset.lv){const f=factGet(a);if(f.lvl===b.dataset.lv)factSet(a,{sell:null,lvl:null,shape:null});else factSet(a,{sell:parseFloat(b.dataset.val),lvl:b.dataset.lv,shape:b.dataset.shape||null});touched.add(a);
    const y=window.scrollY;run();window.scrollTo(0,y);const tr=document.querySelector(`tr[data-asin="${a}"]`)||[...document.querySelectorAll('button.lv')].find(x=>x.dataset.asin===a)?.closest('tr');if(tr)tr.classList.add('lvopen');return;}
  if(b.dataset.pm){const f=factGet(a);const pm=new Set(f.pm||[]);if(pm.has(b.dataset.pm))pm.delete(b.dataset.pm);else pm.add(b.dataset.pm);factSet(a,{pm:[...pm]});touched.add(a);run();return;}
  if(b.dataset.vat!=null){if(!needMe(b))return;const f=factGet(a);const next=f.vat==null?0:(+f.vat===0?20:null);factSet(a,{vat:next});toast(next==null?'Back to the Rule 3 keyword rule':next+'% VAT set on '+a+' — shared');touched.add(a);run();return;}
  if(b.dataset.track!=null){if(!o)return;const f=factGet(a);const sug=f.track?f.track.target:(o.low?o.low.buy:Math.round((o.state.buy*0.9)*100)/100);
    const t=prompt('Track '+a+' on Keepa — target buy price £ (blank to clear)',sug);if(t===null)return;const v=parseFloat(t);
    factSet(a,{track:v>0?{target:v}:null});renderTable();if(v>0){toast('Noted £'+v.toFixed(2)+' — now set the same in Keepa');window.open(o.Keepa,'_blank');}return;}
  if(b.dataset.bl!=null){if(!needMe(b))return;blPick=blPick===a?null:a;renderTable();return;}
  if(b.dataset.blr){if(!needMe(b))return;blSet(a,{reason:b.dataset.blr,title:o?(o.Title||o.Product||''):'',source:cur.key});blPick=null;touched.delete(a);toast(a+' blacklisted · '+b.dataset.blr+' — never shows again');run();return;}
  if(b.dataset.blbrand!=null){blPick=null;openBrandBlacklist(o?(o.Brand||(cur.type==='brand'?cur.name:'')):'',a);renderTable();return;}
  if(b.dataset.v){if(!needMe(b))return;const v=verdGet(a)||{};touched.add(a);
    if(v.v===b.dataset.v){verdSet(a,null);if(o){o.verdict=null;o.QUEUE='new';o.sinceVerdict='';}}
    else{verdSet(a,{v:b.dataset.v,reason:b.dataset.v==='No'?v.reason||'':'',note:v.note||'',source:cur.key,state:o?o.state:null});if(o){o.verdict=verdGet(a);o.QUEUE='';o.sinceVerdict='';}}}
  else if(b.dataset.r){const v=verdGet(a)||{};verdSet(a,Object.assign(v,{reason:v.reason===b.dataset.r?'':b.dataset.r}));}
  renderTable();paintStory();renderLog();}
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
const OPEN_ALL_MAX=250;
function openInKeepa(){if(!result){toast('Nothing to open',true);return;}
  const all=visible();const list=view.sel.size?[...view.sel]:(all.length<=OPEN_ALL_MAX?all:all.slice((view.page-1)*PAGEN(),view.page*PAGEN())).map(o=>o.ASIN);
  if(!list.length){toast('Nothing to open',true);return;}window.open(keepaLink(list,'2'),'_blank');
  /* b142 (Jack, 22 Sep: "why only 83 and then I opened KPV and it only shows 1 now — unless I upload new filters I should be able to
     see what I need to run"). b56 made this button ALSO mark every lead it opened as seen, because back then opening them WAS the review.
     It is not any more: he opens them in the Product Viewer to look at them, and the queue emptied under him — 83 to review became 1.
     Opening is looking, not judging. Nothing is marked now. Y / N / M still judge, and "Mark all as seen" still sets the baseline. */
  toast(`Opened ${list.length} in Keepa — nothing marked. Y / N / M judge a row; "Mark all as seen" sets the baseline.`);}

/* ============ runs log (the 7-day count) ============ */
/* b58 (Jack: "we should be getting a mega amount of data in this too"): the log is filterable, sortable, and rolls up by source / day / person */
const RLOG_KEY='bdl-sourcing-rlog';
const rlog=Object.assign({period:'7d',who:'ALL',rule:'ALL',src:'ALL',q:'',sort:'at',dir:-1,group:'runs',all:false},lsGet(RLOG_KEY,{})||{});
function rlogSave(){const {q,...rest}=rlog;lsSet(RLOG_KEY,rest);}
function periodFrom(p){const t=new Date();t.setHours(0,0,0,0);if(p==='today')return t.getTime();if(p==='7d')return Date.now()-7*864e5;if(p==='30d')return Date.now()-30*864e5;return 0;}
const PERIOD_LABEL={today:'Today',"7d":'Last 7 days',"30d":'Last 30 days',all:'All time'};
function runRows(){const V=verdAll();return runsAll().map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;});
  const tr=toReviewCount(r),rowsIn=r.rowsIn||0,leads=r.leads||0,cut=Math.max(0,rowsIn-leads);
  return{r,at:r.at,ms:new Date(r.at).getTime(),who:r.who||'',key:r.source,name:r.name||r.source,rule:r.rule,files:(r.files||[]).length,rowsIn,cut,pct:rowsIn?Math.round(cut/rowsIn*100):0,leads,new:r.new||0,better:r.better||0,worse:r.worse||0,gone:r.gone||0,y,n,m,tr,jp:leads?Math.round((y+n+m)/leads*100):0,day:String(r.day||r.at).slice(0,10)};});}
function runsFiltered(){const from=periodFrom(rlog.period),q=(rlog.q||'').toLowerCase();
  return runRows().filter(x=>x.ms>=from&&(rlog.who==='ALL'||x.who===rlog.who)&&(rlog.rule==='ALL'||String(x.rule)===rlog.rule)&&(rlog.src==='ALL'||x.key===rlog.src)&&(!q||(x.name+' '+x.who).toLowerCase().includes(q)));}
function cutCls(p){return p>=85?'jade':p>=60?'amber':'coral';}
function cutCell(cut,pct){return`<span class="cutn">${cut.toLocaleString()}</span><div class="cutbar ${cutCls(pct)}"><i style="width:${pct}%"></i></div><div class="chg">${pct}% cut</div>`;}
function znum(v,cls){return v?`<span class="${cls||''}">${v.toLocaleString()}</span>`:'<span class=z>0</span>';}
function renderLog(){const el=$('#runLog');if(!el)return;const all=runsAll();
  if(!all.length){el.innerHTML='<div class="empty"><span>No runs yet. Hit Run on a brand and drop its exports — every run lands here with its lead count and what was marked.</span></div>';return;}
  /* the source dropdown follows what has actually run */
  const sel=$('#rlSrc');if(sel){const have=new Set([...sel.options].map(o=>o.value));const names={};all.forEach(r=>names[r.source]=r.name||r.source);
    Object.entries(names).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([k,n])=>{if(!have.has(k)){const o=document.createElement('option');o.value=k;o.textContent=n;sel.appendChild(o);}});sel.value=rlog.src;if(sel.value!==rlog.src){rlog.src='ALL';sel.value='ALL';}}
  const rows=runsFiltered();
  const tot={runs:rows.length,rows:0,leads:0,new:0,better:0,y:0,n:0,m:0,tr:0};rows.forEach(x=>{tot.rows+=x.rowsIn;tot.leads+=x.leads;tot.new+=x.new;tot.better+=x.better;tot.y+=x.y;tot.n+=x.n;tot.m+=x.m;tot.tr+=x.tr;});
  const saved=tot.rows?Math.round((tot.rows-tot.leads)/tot.rows*100):0,lpr=tot.runs?(tot.leads/tot.runs):0;
  /* best source in the period = most leads per run, with at least one run */
  const bySrc={};rows.forEach(x=>{const b=bySrc[x.key]=bySrc[x.key]||{name:x.name,runs:0,leads:0};b.runs++;b.leads+=x.leads;});
  const best=Object.values(bySrc).sort((a,b)=>(b.leads/b.runs)-(a.leads/a.runs))[0];
  const byWho={};rows.forEach(x=>{const w=x.who||'no name';byWho[w]=(byWho[w]||0)+1;});const busiest=Object.entries(byWho).sort((a,b)=>b[1]-a[1])[0];
  const k=(v,l,sub,cls,ic)=>`<div class="kpi"><span class="ki ${cls||''}">${ic}</span><div><div class="kv">${v}</div><div class="kl">${l}</div>${sub?`<div class="ks">${sub}</div>`:''}</div></div>`;
  const kp=`<div class="kpis logkpis"><div class="kcap">${PERIOD_LABEL[rlog.period]||''}${rlog.src!=='ALL'||rlog.who!=='ALL'||rlog.rule!=='ALL'?' · filtered':''}</div>
      ${k(tot.runs,'Runs',busiest?`${busiest[0]} ran ${busiest[1]}`:'','',ICONS.hist)}${k(tot.rows.toLocaleString(),'ASINs put through the rules',`${saved}% cut`,'',ICONS.eye)}${k(tot.leads.toLocaleString(),'Leads produced',`${tot.new.toLocaleString()} new · ${tot.better.toLocaleString()} better`,'iris',ICONS.play)}
      ${k(lpr.toFixed(1),'Leads a run',best?`best: ${escapeHtml(best.name)} · ${(best.leads/best.runs).toFixed(1)}`:'',lpr>=20?'jade':'amber',ICONS.run)}${k(tot.y,'Marked Yes',`${tot.n} No · ${tot.m} Maybe`,tot.y?'jade':'',ICONS.edit)}${k(tot.tr.toLocaleString(),'Still to review',tot.leads?`${Math.round((tot.leads-tot.tr)/tot.leads*100)}% judged`:'',tot.tr?'amber':'jade',ICONS.eye)}</div>`;
  const th=(key,label,cls)=>`<th class="${cls||''} sortable${rlog.sort===key?' on':''}" data-sort="${key}" title="Sort by ${label}">${label}${rlog.sort===key?(rlog.dir<0?' ↓':' ↑'):''}</th>`;
  const numTh=[['rowsIn','In'],['cut','Cut by the rules'],['leads','Leads'],['new','New'],['better','Better'],['worse','Worse'],['gone','Gone'],['y','Yes'],['n','No'],['m','Maybe'],['tr','To review']];
  let body='',head='';
  if(rlog.group==='runs'){
    const dir=rlog.dir;const sk=rlog.sort;rows.sort((a,b)=>{const av=sk==='name'||sk==='who'?String(a[sk]).toLowerCase():+a[sk]||0,bv=sk==='name'||sk==='who'?String(b[sk]).toLowerCase():+b[sk]||0;return (av<bv?-1:av>bv?1:0)*dir||b.ms-a.ms;});
    const show=rlog.all?rows:rows.slice(0,60);
    head=`<tr>${th('at','When','')}${th('who','Who','')}${th('name','Source','')}${numTh.map(([k,l])=>th(k,l,'r')).join('')}</tr>`;
    body=show.map(x=>{const src=srcGet(x.key)||{key:x.key,name:x.name,type:'brand'};
      return`<tr class="rrow" data-key="${x.key}" title="Open ${escapeHtml(x.name)} on its saved leads">
      <td class="lwhen">${fmtWhen(x.at)}</td><td>${whoChip(x.who)}</td>
      <td class="lsrc"><div class="lrow">${avatar(src)}<div><b>${escapeHtml(x.name)}</b><div class="chg"><span class="rl r${x.rule}">Rule ${x.rule}</span> · ${x.files} file${x.files===1?'':'s'}</div></div></div></td>
      <td class="num">${x.rowsIn.toLocaleString()}</td><td class="num">${cutCell(x.cut,x.pct)}</td><td class="num lead"><b>${x.leads}</b></td>
      <td class="num"><span class="pill-new">${x.new}</span></td><td class="num"><span class="pill-better">${x.better}</span></td><td class="num"><span class="pill-worse">${x.worse}</span></td><td class="num"><span class="pill-gone">${x.gone}</span></td>
      <td class="num pos">${znum(x.y)}</td><td class="num neg">${znum(x.n)}</td><td class="num">${znum(x.m)}</td>
      <td class="num"><b class="${x.tr?'amber':'jade'}">${x.tr}</b><div class="chg">${x.jp}% judged</div></td></tr>`;}).join('');
    if(!rlog.all&&rows.length>60)body+=`<tr><td colspan="14" class="more">Newest 60 of ${rows.length} — tick “show every row” for the lot</td></tr>`;}
  else{
    const gk=x=>rlog.group==='source'?x.key:rlog.group==='day'?x.day:(x.who||'no name');
    const G={};rows.forEach(x=>{const g=G[gk(x)]=G[gk(x)]||{key:gk(x),name:rlog.group==='source'?x.name:rlog.group==='day'?x.day:(x.who||'no name'),rule:x.rule,runs:0,rowsIn:0,cut:0,leads:0,new:0,better:0,worse:0,gone:0,y:0,n:0,m:0,tr:0,last:0,srcs:new Set()};
      g.runs++;['rowsIn','cut','leads','new','better','worse','gone','y','n','m','tr'].forEach(f=>g[f]+=x[f]);g.last=Math.max(g.last,x.ms);g.srcs.add(x.key);});
    const list=Object.values(G).map(g=>Object.assign(g,{pct:g.rowsIn?Math.round(g.cut/g.rowsIn*100):0,lpr:g.runs?g.leads/g.runs:0,jp:g.leads?Math.round((g.y+g.n+g.m)/g.leads*100):0}));
    const sk=['at','who'].includes(rlog.sort)?'last':rlog.sort;const dir=rlog.dir;
    list.sort((a,b)=>{const av=sk==='name'?a.name.toLowerCase():+a[sk]||0,bv=sk==='name'?b.name.toLowerCase():+b[sk]||0;return (av<bv?-1:av>bv?1:0)*dir||b.leads-a.leads;});
    const glabel=rlog.group==='source'?'Source':rlog.group==='day'?'Day':'Person';
    head=`<tr>${th('name',glabel,'')}${th('runs','Runs','r')}${th('last','Last run','')}${numTh.map(([k,l])=>th(k,l,'r')).join('')}${th('lpr','Leads / run','r')}</tr>`;
    body=list.map(g=>{const src=rlog.group==='source'?(srcGet(g.key)||{key:g.key,name:g.name,type:'brand'}):null;
      const nameCell=rlog.group==='source'?`<div class="lrow">${avatar(src)}<div><b>${escapeHtml(g.name)}</b><div class="chg"><span class="rl r${g.rule}">Rule ${g.rule}</span></div></div></div>`
        :rlog.group==='day'?`<b>${ukDate(g.name).replace(/ · .*$/,'')}</b>`:`${whoChip(g.name==='no name'?'':g.name)}<div class="chg">${g.srcs.size} source${g.srcs.size===1?'':'s'}</div>`;
      return`<tr class="${rlog.group==='source'?'rrow':''}" data-key="${rlog.group==='source'?g.key:''}"><td class="lsrc">${nameCell}</td><td class="num"><b>${g.runs}</b></td><td class="lwhen">${fmtWhen(new Date(g.last).toISOString())}</td>
      <td class="num">${g.rowsIn.toLocaleString()}</td><td class="num">${cutCell(g.cut,g.pct)}</td><td class="num lead"><b>${g.leads.toLocaleString()}</b></td>
      <td class="num"><span class="pill-new">${g.new}</span></td><td class="num"><span class="pill-better">${g.better}</span></td><td class="num"><span class="pill-worse">${g.worse}</span></td><td class="num"><span class="pill-gone">${g.gone}</span></td>
      <td class="num pos">${znum(g.y)}</td><td class="num neg">${znum(g.n)}</td><td class="num">${znum(g.m)}</td>
      <td class="num"><b class="${g.tr?'amber':'jade'}">${g.tr.toLocaleString()}</b><div class="chg">${g.jp}% judged</div></td><td class="num"><b class="${g.lpr>=20?'jade':g.lpr>=5?'iris':'amber'}">${g.lpr.toFixed(1)}</b></td></tr>`;}).join('');}
  el.innerHTML=kp+`<div class="tablewrap show"><div class="tablescroll"><table class="logtbl"><thead>${head}</thead><tbody>${body||'<tr><td colspan="14" class="more">Nothing in this window — widen the period.</td></tr>'}</tbody></table></div></div>`;}
function runsLogInit(){const el=$('#runLog');if(!el)return;
  [['rlPeriod','period'],['rlWho','who'],['rlRule','rule'],['rlSrc','src']].forEach(([id,k])=>{const e=$('#'+id);if(!e)return;e.value=rlog[k];e.addEventListener('change',ev=>{rlog[k]=ev.target.value;rlogSave();renderLog();});});
  $('#rlQ').addEventListener('input',e=>{rlog.q=e.target.value;renderLog();});
  const ra=$('#rlAll');ra.checked=!!rlog.all;ra.addEventListener('change',e=>{rlog.all=e.target.checked;rlogSave();renderLog();});
  document.querySelectorAll('#rlGroup button').forEach(b=>{b.classList.toggle('on',b.dataset.g===rlog.group);b.addEventListener('click',()=>{document.querySelectorAll('#rlGroup button').forEach(x=>x.classList.remove('on'));b.classList.add('on');rlog.group=b.dataset.g;rlogSave();renderLog();});});
  el.addEventListener('click',e=>{const th=e.target.closest('th.sortable');if(th){const k=th.dataset.sort;if(rlog.sort===k)rlog.dir=-rlog.dir;else{rlog.sort=k;rlog.dir=['name','who'].includes(k)?1:-1;}rlogSave();renderLog();return;}
    const tr=e.target.closest('tr.rrow');if(tr&&tr.dataset.key&&srcGet(tr.dataset.key))openRun(tr.dataset.key);});}
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
  if(document.activeElement!==$('#catWords'))$('#catWords').value=catWords().join(', ');
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
  $('#vatSave').addEventListener('click',()=>{const sp=v=>v.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const w={zero:sp($('#vatZero').value),not:sp($('#vatNot').value)};if(!w.zero.length){toast('Need at least one zero-rated word',true);return;}vat0Save(w);toast('Rule 3 words saved for everyone');if(result)run();});
  $('#catSave').addEventListener('click',()=>{const list=$('#catWords').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);if(!list.length){toast('Need at least one word',true);return;}catSave(list);toast('Never-sell categories saved for everyone');if(result)run();});
  $('#catReset').addEventListener('click',()=>{catSave(CAT_DEFAULT.slice());renderSettings();toast('Category list reset');if(result)run();});
  $('#vatReset').addEventListener('click',()=>{vat0Save({zero:R4.ZERO.slice(),not:R4.NOT.slice()});renderSettings();toast('Rule 3 words reset');if(result)run();});
  $('#cloudPullBtn').addEventListener('click',async()=>{if(!cloudEnabled()){toast('Cloud is off in the sandbox',true);return;}toast('Refreshing…');const ok=await cloudPull();onCloudPulled(ok);toast(ok?'Up to date with the shared project':'Could not refresh — '+cloud.err,!ok);});
  $('#cloudSendBtn').addEventListener('click',()=>{if(!outbox().length){toast('Nothing queued');return;}cloudFlush();toast('Sending '+outbox().length+'…');});
  $('#dataExport').addEventListener('click',()=>{const o={};Object.keys(localStorage).filter(k=>k.startsWith('bdl-sourcing')).forEach(k=>o[k]=localStorage.getItem(k));download(today()+'-BDL-SOURCING-BACKUP.json',JSON.stringify(o),'application/json');});
  $('#dataImport').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await readFileText(f));if(!confirm('Replace this browser\'s sourcing data with the backup ('+Object.keys(o).length+' keys)? The shared copy is not touched until you change something.'))return;Object.entries(o).forEach(([k,v])=>{if(k.startsWith('bdl-sourcing'))localStorage.setItem(k,v);});toast('Imported — reloading');setTimeout(()=>location.reload(),600);}catch(err){toast('Not a backup file',true);}e.target.value='';});
  $('#dataReset').addEventListener('click',()=>{if(!confirm('Reset the brand list to the seed? Runs, history and verdicts are kept.'))return;localStorage.removeItem(SRC_KEY);const v=srcAll();cloudQueue('src_sources','upsert',v.map(srcRow));renderSettings();renderList();toast('Brand list reset');});}

/* after the shared copy lands: repaint everything from it */
function onCloudPulled(ok){whoPaint();renderList();renderLog();renderSettings();
  if(ok&&cur){cloudPullLeads(cur.key).then(()=>{if(result)run();});}}

/* ============ wiring ============ */
/* b31 (15 Sep 02:20): the Keepa key lives in Jack's Cloudflare Worker; the app only ever asks it for the token balance (free) —
   automation proper waits until the trial week is done */
/* Jack's one-unit rule, 17 Sep 2026. These four numbers are the whole of it - change them here.
     share  : this option holds this much of the family's reviews, or less
     drops  : and the listing only manages this many rank drops a month, or fewer
     roi    : then it is worth a single unit only if the ROI is at least this
     profit : and it clears at least this much a unit. Below either, leave it. */
const ONE_UNIT={share:0.50,drops:10,roi:50,profit:10};
/* The exception, Jack 17 Sep: "the odd one will still sell 50+ and slipped through as a bug... as a
   general rule, anything over 50 keepa drops though, sales over 50 times a month — those are the buggy
   ones, and it's not a lot of them." Measured on his own 1,404-row no-figure export: 60 of them, 4%.
   Above this many drops a missing figure is treated as LOST, not as proof of a small seller. */
const LOST_FIGURE_DROPS=50;
const WORKER='https://bdl-sourcing.jackbithellbusiness.workers.dev';
async function paintTokens(){let el=$('#tokPill');const cp=$('#cloudPill');if(!cp)return;if(!el){el=document.createElement('span');el.id='tokPill';el.className='pill tok';cp.parentNode.insertBefore(el,cp);}
  try{const r=await fetch(WORKER+'/health');const t=await r.json();if(t.ok&&t.tokensLeft!=null){el.textContent='Keepa · '+t.tokensLeft.toLocaleString()+' tokens';el.title=`Keepa API balance via the Worker · refills ${t.refillRate}/min · nothing runs automatically yet`;el.classList.remove('bad');}
    else{el.textContent='Keepa · no key';el.title=t.error||'Worker answered without a balance';el.classList.add('bad');}}
  catch(e){el.textContent='Keepa · offline';el.title='Could not reach the Worker';el.classList.add('bad');}}
/* b53: deep links for AVM HQ tasks — #run=<source key> opens that run screen, #due opens the Brands list on what's due */
function showTab(tab,quiet){if(!['brands','runs','leads'].includes(tab))tab='brands';lview.tab=tab;if(!quiet)lviewSave();
  document.querySelectorAll('#lvNav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  $('#cardBrands').hidden=tab!=='brands';$('#cardRuns').hidden=tab!=='runs';$('#cardLeads').hidden=tab!=='leads';
  if(tab==='runs')renderLog();if(tab==='leads'&&typeof renderHistory==='function')renderHistory();}
function openHash(){let h=location.hash||'';
  if(/^#audit/i.test(h)&&typeof auHash==='function'&&isJack()){auHash();return;}
  /* b61: AVM HQ links carry the VA's name (#run=key&who=Suz) so the who-are-you gate never appears */
  const wm=/[&?]who=([A-Za-z]+)/.exec(h);if(wm){const w=USERS.find(u=>u.toLowerCase()===wm[1].toLowerCase());if(w&&me()!==w){lsSet(ME_KEY,w);whoPaint();}const g=$('#whoGate');if(w&&g)g.hidden=true;h=h.replace(/[&?]who=[A-Za-z]+/,'');}
  const m=/^#run=([a-z0-9-]+)/i.exec(h);
  const lm=/^#leads=([a-z0-9-]+)/i.exec(h);if(lm&&srcGet(lm[1])){const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b&&!b.classList.contains('active'))b.click();if(cur&&!$('#viewRun').hidden)backToList();historyOpenFor(lm[1]);return;}
  if(/^#(runs|leads|history)\b/i.test(h)){const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b&&!b.classList.contains('active'))b.click();if(cur&&!$('#viewRun').hidden)backToList();showTab(/^#runs/i.test(h)?'runs':'leads');return;}const goBrands=()=>{const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b&&!b.classList.contains('active'))b.click();};
  if(m&&srcGet(m[1])){goBrands();openRun(m[1]);return;}
  if(/^#due/i.test(h)){goBrands();if(cur&&!$('#viewRun').hidden)backToList();const b=document.querySelector('#lSeg button[data-seg="due"]');if(b)b.click();}}
function brandsInit(){if(typeof bbSeed==='function')bbSeed();paintJackOnly();renderList();renderLog();if(!me())whoGate(true);setTimeout(openHash,50);window.addEventListener('hashchange',openHash);paintTokens();setInterval(paintTokens,10*60*1000);
  /* b30 (Jack: "still loads of dead space on ASUS"): the floors card lives under the run summary, so the two columns come out level */
  {const fr=$('#floorRow'),tc=document.querySelector('#viewRun .twocol');if(fr&&tc)tc.after(fr);}
  $('#brandTbl').addEventListener('click',onListClick);
  /* b52 (Jack: "make it easier to edit and change who the VA is") — owner and cadence change in the row and save for everyone */
  $('#brandTbl').addEventListener('change',e=>{const sel=e.target.closest('select.inl');if(!sel)return;const s=srcGet(sel.dataset.key);if(!s)return;if(sel.classList.contains('ownsel'))s.owner=sel.value;else if(sel.classList.contains('cadsel'))s.cadence=sel.value;else if(sel.classList.contains('stsel')){s.status=sel.value;s.paused=s.status==='paused';}
    srcSave(s);toast(`${s.name}: ${sel.classList.contains('ownsel')?'now '+s.owner+"'s":sel.classList.contains('stsel')?(STATUS_LABEL[s.status]||s.status):CADENCE_LABEL[s.cadence]} — saved for everyone`);renderList();});
  $('#brandTbl').addEventListener('click',e=>{if(e.target.closest('select.inl'))e.stopPropagation();},true);document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus();});
  $('#approvals').addEventListener('click',onApprovalClick);
  $('#addBrand').addEventListener('click',()=>openEdit(null));
  $('#lq').addEventListener('input',e=>{lview.q=e.target.value;renderList();});
  [['lMarket','market'],['lRule','rule'],['lOwner','owner'],['lType','type'],['lSort','sort']].forEach(([id,k])=>{const el=$('#'+id);if(!el)return;el.value=lview[k];if(el.value!==lview[k]){lview[k]=el.value;}el.addEventListener('change',e=>{lview[k]=e.target.value;lviewSave();renderList();});});
  document.querySelectorAll('#lSeg button').forEach(b=>{b.classList.toggle('on',b.dataset.seg===lview.seg);b.addEventListener('click',()=>{document.querySelectorAll('#lSeg button').forEach(x=>x.classList.remove('on'));b.classList.add('on');lview.seg=b.dataset.seg;lviewSave();renderList();});});
  /* b58 (Jack: "still so rigid on seeing history leads"): Brands · Runs · Lead history are three views of the same page */
  document.querySelectorAll('#lvNav button').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
  showTab(lview.tab||'brands',true);
  runsLogInit();historyInit();if(typeof auInit==='function')auInit();
  $('#drawer .veil').addEventListener('click',closeDrawer);
  $('#backBtn').addEventListener('click',backToList);
  $('#runEdit').addEventListener('click',()=>openEdit(cur));$('#runHist').addEventListener('click',()=>openHistory(cur));
  $('#clearRun').addEventListener('click',()=>{clearRun();toast('Files cleared');});
  const zone=$('#dropAny'),inp=$('#fileIn');dz(zone,inp);
  inp.addEventListener('change',e=>{handleFiles(e.target.files);e.target.value='';});
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('over');handleFiles(e.dataTransfer.files);});
  $('#fileChips').addEventListener('click',e=>{const b=e.target.closest('button[data-rm]');if(b)removeFile(b.dataset.rm);});
  $('#euGo').addEventListener('click',euRun);
  $('#asinCopy').addEventListener('click',e=>{const a=$('#asinBar')._all||[];copy(a.join(', '),a.length+' ASINs copied — paste into the UK Product Viewer',e.currentTarget,'Copied');});
  $('#asinOpen').addEventListener('click',()=>{const a=$('#asinBar')._all||[];if(!a.length){toast('Drop the Finder exports first',true);return;}window.open(keepaLink(a,'2'),'_blank');});
  $('#dlSheet').addEventListener('click',dlSheet);$('#dlCsv').addEventListener('click',dlCsv);$('#dlDropped').addEventListener('click',dlDropped);
  $('#seenAll').addEventListener('click',markAllSeen);
  /* b77 (Jack, 17 Sep): "add a copy kpv link here". The ASIN list is only half a hand-off — the
     Viewer link opens Keepa with every lead already loaded, which is what he actually sends people. */
  $('#copyKpv').addEventListener('click',e=>{if(!result||!result.out.length){toast('No leads to link to',true);return;}
    const a=result.out.map(o=>o.ASIN);
    copy(keepaLink(a,'2'),`Keepa Viewer link copied · ${a.length} lead${a.length===1?'':'s'}`,e.currentTarget,'Copied');});
  $('#copyKept').addEventListener('click',e=>{if(!result||!result.out.length){toast('Nothing to copy',true);return;}copy(result.out.map(o=>o.ASIN).join(', '),result.out.length+' ASINs copied',e.currentTarget,'Copied');});
  $('#openSel').addEventListener('click',openInKeepa);
  $('#leads').addEventListener('click',onTableClick);$('#leads').addEventListener('change',onTableChange);$('#leads').addEventListener('input',onTableInput);
  $('#pager').addEventListener('click',e=>{const b=e.target.closest('button[data-pg]');if(!b||b.disabled)return;view.page=parseInt(b.dataset.pg);touched.clear();renderTable();$('#leadTop').scrollIntoView({behavior:'smooth',block:'start'});});
  document.querySelectorAll('#fSeg button').forEach(b=>b.addEventListener('click',()=>{view.status=b.dataset.st;view.page=1;touched.clear();renderTable();}));
  /* b137: the More menu on the run toolbar */
  {const m=$('#moreMenu'),b=$('#moreBtn');if(m&&b){b.addEventListener('click',e=>{e.stopPropagation();const o=!m.classList.contains('open');m.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');});
    document.addEventListener('click',e=>{if(!m.contains(e.target)){m.classList.remove('open');b.setAttribute('aria-expanded','false');}});
    m.querySelector('.tbpop').addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>{m.classList.remove('open');b.setAttribute('aria-expanded','false');},0);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&m.classList.contains('open')){m.classList.remove('open');b.setAttribute('aria-expanded','false');}});}}
  ['#runNext','#runNext2'].forEach(id=>$(id).addEventListener('click',e=>{const k=e.currentTarget.dataset.key;if(k&&srcGet(k)){backToList();openRun(k);window.scrollTo({top:0,behavior:'smooth'});}}));
  $('#yourDay').addEventListener('click',e=>{const b=e.target.closest('button[data-start]');if(b)openRun(b.dataset.start);});
  $('#howToHide').addEventListener('click',()=>{lsSet(HOWTO_KEY,true);renderHowTo();});$('#howToShow').addEventListener('click',()=>{lsSet(HOWTO_KEY,false);renderHowTo();$('#howTo').scrollIntoView({behavior:'smooth',block:'center'});});
  $('#runStrip').addEventListener('click',e=>{const d=e.target.closest('[data-run]');if(d&&cur){openPastRun(d.dataset.run);return;}if(e.target.closest('[data-look]')&&cur){openApiLook();return;}if(e.target.closest('[data-act="hist"]')&&cur)openHistory(cur);});
  $('#runCopyLink').addEventListener('click',e=>{if(!cur)return;const w=USERS.includes(cur.owner)?'&who='+cur.owner:'';copy(location.origin+location.pathname+'#run='+cur.key+w,'Link copied — paste it into the AVM HQ task'+(w?' (opens as '+cur.owner+', no name prompt)':''),e.currentTarget,'Copied');});
  $('#runAllTime').addEventListener('click',()=>{if(!cur)return;const k=cur.key;backToList();historyOpenFor(k);});
  $('#fSort').addEventListener('change',e=>{view.sort=e.target.value;view.page=1;renderTable();});
  $('#fPer').addEventListener('change',e=>{view.per=parseInt(e.target.value);view.page=1;renderTable();});
  $('#fMarket').addEventListener('change',e=>{view.market=e.target.value;view.page=1;renderTable();});
  $('#floorRow').addEventListener('input',onFloorInput);
  $('#floorClear').addEventListener('click',()=>{if(!cur)return;delete cur.filters;srcSave(cur);paintFloors();lastSig='';run();});
  $('#fQ').addEventListener('input',e=>{view.q=e.target.value;view.page=1;if(result)renderTable();});
  $('#fHideNo').addEventListener('change',e=>{view.hideNo=e.target.checked;view.page=1;renderTable();});
  $('#logExport').addEventListener('click',exportLog);
  $('#rulesToggle').addEventListener('click',()=>{const o=$('#rulesBox');const open=o.classList.toggle('show');$('#rulesToggle').textContent=open?'Hide the rules':'Show the rules';});
  /* what other people change while the list is open: locks, runs, verdict counts */
  setInterval(()=>{if(!cloudEnabled()||!cloud.tables||!$('#page-brands').classList.contains('active')||$('#viewList').hidden)return;cloudPullLight().then(ok=>{if(ok){renderList();renderLog();}});},90000);
  window.addEventListener('beforeunload',()=>{if(cur&&ownLock(cur))srcUnlock(cur,true);});
  settingsInit();renderSettings();loadFx();}
