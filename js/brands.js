/* BDL Sourcing — the BRANDS page (b10): the list, the run view, the queue, verdicts, blacklists, the runs log, settings.
   Rule maths lives in rule1.js / rule2.js / rule4.js; the compare lives in queue.js; storage in sources.js + cloud.js.
   This file only moves data between the page and those. */
const SLOTS=['viewer','UK','DE','FR','IT','ES'];
const FX_KEY='bdl-sourcing-fx';
let cur=null,result=null,fx={rate:BR.FX_FALLBACK,src:'fallback'},lastSig='',blPick=null;
const touched=new Set();   /* rows judged this sitting stay visible in "To review" so the reason chips can be picked */
const files={viewer:null,UK:null,DE:null,FR:null,IT:null,ES:null,one:null};
/* b202 (Jack, 28 Sep: "add an ability to see all leads"): To review / All leads is remembered in this browser, so picking All sticks */
const LEADVIEW_KEY='bdl-sourcing-leadview';
/* b242 (Jack, 3 Oct: "default automatic To review, shouldn't it" · "default all on one page and only option pls"): every run opens on To review,
   and every lead is on one page — no paging, no per-page choice, so Open all and ✓ Done always mean all of them */
const view={status:'REVIEW',market:'ALL',q:'',hideNo:false,sort:'default',page:1,per:0,sel:new Set()};
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
  return`<span class="avatar" style="background:${c}" ${s.drop?'title="Drop & check — a one-off"':''}>${s.drop?'⇣':escapeHtml((s.name||'?').replace(/^Suz · /,'').slice(0,2).toUpperCase())}</span>`;}   /* b223: a one-off is ⇣, not "DR" */
const closeMenus=()=>document.querySelectorAll('.menu.open').forEach(m=>m.classList.remove('open'));

/* ============ identity ============ */
function whoPaint(){['#whoSel','#meIn'].forEach(id=>{const el=$(id);if(el&&el.value!==me())el.value=me();});
  if(typeof paintAuthBox==='function')paintAuthBox();
  /* b126: when the person is signed in the picker is theirs, not a choice — swap it for their name and a way out */
  const n=(typeof authedName==='function')?authedName():'';const sel=$('#whoSel');if(!sel)return;
  let pill=$('#authPill');
  if(n){sel.hidden=true;if(!pill){pill=document.createElement('button');pill.id='authPill';pill.type='button';pill.className='authpill';
      pill.addEventListener('click',async()=>{if(await uiConfirm('Sign out of '+authedName()+'?',{ok:'Sign out',tone:'warn'}))authSignOut();});sel.parentNode.insertBefore(pill,sel);}
    pill.hidden=false;pill.innerHTML=`<i></i>${escapeHtml(n)}`;pill.title=(authUser()||{}).email+' — click to sign out';}
  else{sel.hidden=false;if(pill)pill.hidden=true;}}
/* the storefront audit is Jack's page — the tile is not there for anyone else */
/* b176 (Jack, 27 Sep: "this is Jack only and so is Settings, Jack only"). Settings joins the audit: Suz and Mera see neither tile,
   and if one of them is somehow on either page they are moved to Brands / Filters. */
function paintJackOnly(){document.querySelectorAll('.jackonly').forEach(el=>{el.hidden=!isJack();});
  if(!isJack()){if(['#page-audit','#page-settings'].some(id=>{const p=$(id);return p&&p.classList.contains('active');})){document.querySelector('.pagebtn[data-page="page-brands"]').click();}}}
function whoSet(v){if(typeof lockOn==='function'&&lockOn()&&authedName()&&v!==authedName()&&!guestOn()){toast('You are signed in as '+authedName()+' — sign out first to be someone else',true);return;}
  lsSet(ME_KEY,v);whoPaint();paintJackOnly();if(typeof renderAudit==='function')renderAudit();renderList();if(result)renderTable();
  if(v&&pendingFiles){const f=pendingFiles;pendingFiles=null;whoGate(false);handleFiles(f);}   /* b131: the held export goes through */toast(v?'You are '+v+' — everything you mark carries your name':'No name set — nothing can be marked until you pick one',!v);}
/* b24 (14 Sep: Jack clicked Y/N/M all afternoon with no name picked — every click was refused by a toast he never saw and the
   work was lost). The question is now a gate you cannot miss: it opens on first visit and on any marking click, and the click
   that hit it is replayed once a name is picked. */
let whoPending=null,pendingFiles=null;
function needMe(target){if(me())return true;whoPending=target||null;whoGate(true);return false;}
function whoGate(show){let g=$('#whoGate');if(!g){g=document.createElement('div');g.id='whoGate';g.className='whogate';
    /* b126: sign in with a one-click email link. The name picker stays underneath, so nobody is ever locked out. */
    g.innerHTML=`<div class="wg"><div class="wgt">Sign in</div><div class="wgs"><b>Suz and Mera:</b> open the sign-in link Jack sent you — it signs this browser in, and every verdict then carries your name. <b>Jack:</b> your email and password.</div>
      <div class="wgmail"><input type="email" id="wgEmail" placeholder="you@…" autocomplete="username" spellcheck="false"></div>
      <div class="wgmail"><input type="password" id="wgPass" placeholder="Password" autocomplete="current-password"><button type="button" class="btn primary" id="wgSend">Sign in</button></div>
      <div class="wgmsg" id="wgMsg"></div>
      ${typeof lockSandbox==='function'&&!lockSandbox()?'':`<div class="wgor">or carry on without signing in <em>(test sandbox only)</em></div>
      <div class="wgb">${USERS.map(u=>`<button type="button" data-who="${u}">${u}</button>`).join('')}</div>`}</div>`;   /* b175: live = sign in or nothing */
    g.addEventListener('click',async e=>{
      const send=e.target.closest('#wgSend');
      if(send){const el=$('#wgEmail'),pw=($('#wgPass')||{}).value||'',msg=$('#wgMsg'),v=(el.value||'').trim();
        if(!pw&&authNoInbox(v)){msg.innerHTML='Type your password. <b>Suz and Mera:</b> open the link Jack sent you in Discord instead.';msg.className='wgmsg bad';return;}
        send.disabled=true;msg.textContent=pw?'Signing in…':'Sending…';msg.className='wgmsg';
        try{const got=await authSubmit(v,pw);if(got==='sent'){msg.innerHTML='Sent. Open the email on <b>this</b> machine and click the link — you will land back here signed in.';msg.className='wgmsg good';}}
        catch(err){msg.textContent=String(err.message||err)+(/not found|signups/i.test(String(err.message||''))?' — ask Jack to set this address up.':'');msg.className='wgmsg bad';}
        send.disabled=false;return;}
      const b=e.target.closest('button[data-who]');if(!b)return;whoSet(b.dataset.who);whoGate(false);const t=whoPending;whoPending=null;if(t)onTableClick({target:t});});
    g.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.target.id==='wgEmail'||e.target.id==='wgPass')){e.preventDefault();$('#wgSend').click();}});
    document.body.appendChild(g);}
  g.classList.toggle('open',!!show);}

/* ============ list view ============ */
function weekAgo(){return Date.now()-7*864e5;}
/* b231: the same rule as the run screen — the run's New + Better leads (its queue), less those answered since that run's day */
/* b232: answered by someone who works that filter (its owner, whoever ran it, or you) — another VA's answer elsewhere does not count */
function toReviewCount(run){if(!run)return 0;const V=verdAll(),B=blAll(),day=run.day||String(run.at||'').slice(0,10),P=new Set(peopleOf(run.source));if(run.who)P.add(run.who);
  const ans=a=>answeredSince(a,V[a],day,P);
  return(run.queue||run.asins||[]).filter(a=>!B[a]&&!ans(a)).length;}
/* b273 (Jack, 5 Oct, at "Drop & check · Jack — NOT FINISHED · 18 to review" in the list: "that a bug, drop and check in the filter and brands page?").
   A Drop & check is a one-off scratch check — it is saved like a source only so its runs are kept. It is not a filter: it never shows on Brands /
   Filters, never counts as due, mine or not finished, and Start / Next due never send anyone to it. It stays on the Keepa console and in Runs. */
function listSources(){return visibleSources().filter(s=>!s.drop&&!primeHidden(s));}   /* b285: + Prime-only filters after the event */
function renderKpis(){const all=listSources(),keys=new Set(visibleSources().map(s=>s.key));
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
  /* b154: "Seen" is not a judgement — on the live data 460 of 461 verdicts were bulk Seen stamps, and the tile called them "judged" */
  let checked=0,judged=0;asins.forEach(a=>{const x=V[a];if(!x)return;checked++;if(x.v!=='Seen')judged++;});
  const dueL=all.filter(s=>dueState(s).due),late=dueL.filter(s=>dueState(s).kind==='late').length,first=dueL.filter(s=>dueState(s).kind==='first').length,dToday=dueL.length-late-first;
  const wv=Object.values(V).filter(x=>x.at&&new Date(x.at).getTime()>=weekAgo());const yes=wv.filter(x=>x.v==='Yes').length,no=wv.filter(x=>x.v==='No').length,maybe=wv.filter(x=>x.v==='Maybe').length;
  const live=all.filter(s=>s.status!=='paused');const tr=live.reduce((n,s)=>n+toReviewCount(runLast(s.key)),0),trSrc=live.filter(s=>toReviewCount(runLast(s.key))>0).length;
  const k=(v,l,sub,cls,ic)=>`<div class="kpi"><span class="ki ${cls||''}">${ic}</span><div><div class="kv">${v}</div><div class="kl">${l}</div>${sub?`<div class="ks">${sub}</div>`:''}</div></div>`;
  $('#bKpis').innerHTML=`<div class="kcap">This week · what actually happened</div>`
    +k(rowsIn.toLocaleString(),'ASINs put through the rules',`${wk.length} run${wk.length===1?'':'s'}`,'',ICONS.hist)
    +k(cut.toLocaleString(),'Cut by the rules',rowsIn?`${saved}% of the work saved`:'','jade',ICONS.eye)
    +k(seen.size.toLocaleString(),'Leads found',`${newN.toLocaleString()} new · ${betterN.toLocaleString()} better`,'iris',ICONS.play)
    +k(hot.toLocaleString(),'Bangers · score 75+',`${warm.toLocaleString()} scored 50–74`,hot?'jade':'',ICONS.run)
    +k(yes.toLocaleString(),'Approved · Yes',`${no} No · ${maybe} Maybe`,yes?'jade':'',ICONS.edit)
    +k(asins.size?Math.round(checked/asins.size*100)+'%':'—','Looked at',asins.size?`${judged.toLocaleString()} judged · ${(checked-judged).toLocaleString()} only marked seen · of ${asins.size.toLocaleString()}`:'no leads yet',asins.size&&checked/asins.size<.5?'coral':'jade',ICONS.eye)
    +k(tr.toLocaleString(),'To review now',trSrc?`across ${trSrc} filter${trSrc===1?'':'s'}`:'','iris',ICONS.eye)
    +k(due,'Due now',due?[late?`${late} late`:'',dToday?`${dToday} today`:'',first?`${first} never run`:''].filter(Boolean).join(' · '):`${active} active · all run`,due?(late?'coral':'amber'):'jade',ICONS.cal);}
function listSorted(){const L=srcAll();const last=s=>runLast(s.key);const t=s=>{const l=last(s);return l?l.at:'';};
  const cmp={due:(a,b)=>(dueRank(a)-dueRank(b))||a.name.localeCompare(b.name),name:(a,b)=>a.name.localeCompare(b.name),
    owner:(a,b)=>(a.owner||'VAs').localeCompare(b.owner||'VAs')||a.name.localeCompare(b.name),
    last:(a,b)=>(t(b)>t(a)?1:t(b)<t(a)?-1:0)||a.name.localeCompare(b.name),
    leads:(a,b)=>(((last(b)||{}).leads||0)-((last(a)||{}).leads||0))||a.name.localeCompare(b.name),
    review:(a,b)=>(toReviewCount(last(b))-toReviewCount(last(a)))||a.name.localeCompare(b.name),
    cadence:(a,b)=>((CADENCE_DAYS[a.cadence]||99)-(CADENCE_DAYS[b.cadence]||99))||a.name.localeCompare(b.name)}[lview.sort]||null;
  if(!cmp)return srcSorted();
  return L.sort((a,b)=>(a.type===b.type?0:a.type==='filter'?-1:1)||cmp(a,b));}
function segCounts(){const all=listSources();const c={due:0,mine:0,all:all.length,active:0,paused:0};
  all.forEach(s=>{if(dueState(s).due)c.due++;if(s.status==='paused')c.paused++;else c.active++;if(ownsIt(s,me())||(lockFresh(s)&&ownLock(s)))c.mine++;});
  document.querySelectorAll('#lSeg button').forEach(b=>{const n=b.querySelector('b');if(n)n.textContent=c[b.dataset.seg]||0;});
  const nb=$('#lvnBrands'),nr=$('#lvnRuns'),nl=$('#lvnLeads');if(nb)nb.textContent=all.length;if(nr)nr.textContent=runsAll().length;
  if(nl){let n=0;const LA=leadAll();Object.values(LA).forEach(m=>n+=Object.keys(m||{}).length);nl.textContent=n.toLocaleString();}}
/* b60 (Jack: "needs to be smooth and easy for my VAs"): the next thing to run, for whoever is signed in */
/* b154: unowned is Jack's until he assigns it (the visibility rule), so on Jack's screen it counts as his — not "for others" */
function ownsIt(s,m){if(!m)return false;return s.owner===m||(m==='Jack'&&(!s.owner||s.owner===NO_OWNER));}
/* b260 (Jack, 4 Oct: "put UK and EU Prime at the top of these please — super super super important"): while the Prime event switch is on, the two Prime deals
   filters head the Brands / Filters list in their own group, whatever the sort, and are the first thing "Start with" / "Next due" offers their owner. */
function primeFirst(s){return s&&(s.primeOnly||s.key==='prime-uk'||s.key==='prime-eu')&&s.status!=='paused'&&typeof primeEventOn==='function'&&primeEventOn()?1:0;}
function nextDue(fromKey){const m=me();const L=listSources().filter(s=>s.status!=='paused'&&s.key!==fromKey&&dueState(s).due);
  L.sort((a,b)=>(ownsIt(b,m)-ownsIt(a,m))||(primeFirst(b)-primeFirst(a))||(dueRank(a)-dueRank(b))||a.name.localeCompare(b.name));return L[0]||null;}
function renderYourDay(){const el=$('#yourDay');if(!el)return;const m=me();if(!m){el.hidden=true;return;}
  const mine=srcAll().filter(s=>s.status!=='paused'&&!primeHidden(s)&&ownsIt(s,m));const due=mine.filter(s=>dueState(s).due);const what=m==='Jack'?'brands & filters':'filters';
  const tr=mine.reduce((n,s)=>n+toReviewCount(runLast(s.key)),0);const nx=nextDue(null);
  const dueAny=srcAll().filter(s=>s.status!=='paused'&&!primeHidden(s)&&dueState(s).due).length;
  el.innerHTML=`<div class="yd"><span class="ydn">${whoChip(m)}</span><span class="ydt">${mine.length?(due.length?`<b>${due.length}</b> of your ${mine.length} ${what} ${due.length===1?'is':'are'} due${(()=>{const l=due.filter(s=>dueState(s).kind==='late').length;return l?` · <b class="ydlate">${l} late</b>`:'';})()}`:`all ${mine.length} of your ${what} are done for today ✓`):`nothing is assigned to you yet`}${tr?` · <b>${tr.toLocaleString()}</b> lead${tr===1?'':'s'} waiting for a look`:''}${!due.length&&dueAny?` · ${dueAny} due for others`:''}</span>
    ${nx?`<button class="btn primary sm" type="button" data-start="${nx.key}">${ICONS.run}Start with ${escapeHtml(nx.name)}${!ownsIt(nx,m)?' ('+((!nx.owner||nx.owner===NO_OWNER)?'unassigned':(nx.owner==='VAs'?'VAs':escapeHtml(nx.owner)+"'s"))+')':''}</button>`:''}</div>`;el.hidden=false;}
const HOWTO_KEY='bdl-sourcing-howto-hidden';
function renderHowTo(){const el=$('#howTo');if(!el)return;el.hidden=!!lsGet(HOWTO_KEY,false);}
function renderList(){renderKpis();renderApprovals();segCounts();renderYourDay();renderHowTo();const q=lview.q.toLowerCase();
  const rows=listSorted().filter(s=>{
    if(!canSee(s))return false;   /* b132: a VA sees her own sources and nobody else's */
    if(s.drop)return false;   /* b273: a Drop & check is not a filter */
    if(primeHidden(s))return false;   /* b285: the Prime event is over */
    if(lview.seg==='due'&&!dueState(s).due)return false;
    if(lview.seg==='paused'&&s.status!=='paused')return false;
    if(lview.seg==='active'&&s.status==='paused')return false;
    if(lview.type!=='ALL'&&(s.type==='filter'?'filter':'brand')!==lview.type)return false;
    if(lview.seg==='mine'&&!ownsIt(s,me())&&!(lockFresh(s)&&ownLock(s)))return false;
    if(lview.market!=='ALL'&&!s.markets.includes(lview.market))return false;
    if(lview.rule!=='ALL'&&String(s.rule)!==lview.rule)return false;
    if(lview.owner!=='ALL'&&(s.owner||NO_OWNER)!==lview.owner)return false;
    if(q&&!((s.name+' '+(s.note||'')).toLowerCase().includes(q)))return false;return true;});
  const tb=$('#brandTbl');
  if(!rows.length){tb.innerHTML=`<tbody><tr><td colspan="8" style="text-align:center;color:var(--faint);padding:22px">${lview.seg==='due'?'Nothing due — everything has been run inside its cadence.':lview.seg==='mine'?(me()?'Nothing is yours yet — Jack sets the owner in Edit.':'Pick who you are (top right) to see your list.'):'Nothing here.'}</td></tr></tbody>`;return;}
  const rowHtml=s=>{const d=dueState(s),last=runLast(s.key),nx=nextRun(s),tok=tokenEstimate(s),lk=lockFresh(s)?s.inProgress:null,mine=lk&&ownLock(s),tr=toReviewCount(last),op=openSinceRun(s),opToday=op&&new Date(op.at).toDateString()===new Date().toDateString(),kp=typeof keepaSinceRun==='function'?keepaSinceRun(s):null,kpToday=kp&&new Date(kp.at).toDateString()===new Date().toDateString();
    /* b241 (Jack, 3 Oct: "full row green saying DONE on it — bigger DONE so everyone knows — mention who did it — full row red if not done"):
       done = run inside its cadence (today, or not due again yet) · not done = due today, late or never run · paused = grey */
    const stK0=s.status==='paused'?'paused':d.due?'todo':(last&&(d.cls==='done'||d.cls==='ok'))?'done':'oneoff';
    const lastOk=typeof runLastOk==='function'?runLastOk(s.key):last,gone12=typeof runStale==='function'&&runStale(last);   /* b260: unfinished for over 12 hours = it does not count */
    const stK=stK0==='done'&&last.needDone&&!last.done&&!gone12?'part':stK0;   /* b244: run in, Done not pressed */
    return`<tr class="st-${stK} ${s.status==='paused'?'paused':(d.due?'isdue is'+d.kind:d.cls==='done'?'isdone':'')}${kpToday&&d.cls!=='done'?' inkeepa':opToday&&d.cls!=='done'?' isopened':''}" data-key="${s.key}">
      <td class="namec"><div class="brandcell">${avatar(s)}<div class="ntext"><div class="nline"><span class="bname">${escapeHtml(s.name)}</span><span class="rl r${s.rule}" title="${RULE_LABEL[s.rule]||''}">Rule ${s.rule}</span></div><span class="note" title="${escapeHtml(s.note||'')}">${escapeHtml(s.note||(s.type==='filter'?'Saved Keepa filter':'Brand run · UK sell side'))}</span>${typeof primeNoteChip==='function'?primeNoteChip(s):''}</div></div></td>
      <td class="ownc">${isJack()?`<select class="inl ownsel ${ownCls(s.owner||NO_OWNER)}" data-key="${s.key}" title="Who runs this — saves straight away">${OWNER_OPTS.map(u=>`<option${(s.owner||'VAs')===u?' selected':''}>${u}</option>`).join('')}</select>`:whoChip(s.owner||'VAs')}</td>
      <td><div class="flags" title="${s.markets.join(' · ')}">${s.markets.map(m=>`<span class="f">${FLAG[m]}</span>`).join('')}</div></td>
      <td class="stc">${isJack()?`<select class="inl stsel s-${s.status}" data-key="${s.key}" title="Active runs on its cadence · Testing = trial · Paused = off the list — saves straight away">${Object.entries(STATUS_LABEL).map(([k,l])=>`<option value="${k}"${s.status===k?' selected':''}>${l}</option>`).join('')}</select><select class="inl cadsel" data-key="${s.key}" title="How often it should run — saves straight away">${Object.entries(CADENCE_LABEL).map(([k,l])=>`<option value="${k}"${s.cadence===k?' selected':''}>${l}</option>`).join('')}</select>`:`<span class="st ${s.status}"><i></i>${STATUS_LABEL[s.status]||s.status}</span><span class="l2">${CADENCE_LABEL[s.cadence]||s.cadence}</span>`}${lk?`<div class="inprog" title="${mine?'You have this open':escapeHtml(lk.who)+' opened this '+fmtWhen(lk.at)+' and is working through it'}"><i></i>${mine?'you':escapeHtml(lk.who)} on it · ${new Date(lk.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>`:''}</td>
      <td class="lastc" title="${last?`${last.leads} leads · ${last.new} new · ${last.better} better · ${last.worse} worse · ${last.gone} gone`:''}">${last?`<span class="l1">${fmtWhen(last.at)}${last.who?` ${whoChip(last.who)}`:''}</span><span class="l2">${last.leads} leads · <span class="tr ${tr?'':'zero'}">${tr?tr+' to review':'all reviewed'}</span></span>${gone12?`<span class="opened kp stale" title="The files went in ${escapeHtml(fmtWhen(last.at))} but nobody pressed ✓ Done within ${STALE_H} hours, so this run does not count. Run the filter again with today's export.">✕ not finished within ${STALE_H} hours — <b>it does not count, run it again</b></span>`:''}`:`<span class="l1 dim">Not run yet</span>`}${(()=>{const w=isJack()&&typeof weekLeads==='function'?weekLeads(s.key):{n:0};   /* Jack only */return w.n?`<span class="wkleads" title="${w.n} product${w.n===1?'':'s'} this filter found went on the lead sheet (or got a Yes) in the last 7 days: ${escapeHtml(w.asins.join(', '))}">${w.n} on the lead sheet this week${w.who.length?' · '+escapeHtml(w.who.join(' + ')):''}</span>`:'';})()}${kp?(()=>{   /* b243 (Jack, 3 Oct: "what does In Keepa mean — are they both logged in?"): it is a PRESS of the Open in Keepa button, nothing more. Under 2 hours old it may still be in hand; after that it says what happened — she opened Keepa and no file came back. */
        const fresh=Date.now()-new Date(kp.at).getTime()<2*3600e3,when=fmtWhen(kp.at).replace(/^(Today|Yesterday)/,m=>m.toLowerCase());
        return fresh?`<span class="opened kp" title="${escapeHtml(kp.who)} pressed the Open in Keepa button (${escapeHtml(kp.mk||'')}) ${fmtWhen(kp.at)}. That is all this means — a button press, not a login. It goes green once the export is dropped back in."><i></i>${whoChip(kp.who)} pressed Open in Keepa ${when} · <b>${escapeHtml(kp.mk||'')}</b> · file not back yet</span>`
          :`<span class="opened kp stale" title="${escapeHtml(kp.who)} pressed the Open in Keepa button (${escapeHtml(kp.mk||'')}) ${fmtWhen(kp.at)} and never dropped the export back in — so no run was saved. Nobody is working on this now.">✕ ${whoChip(kp.who)} opened Keepa ${when} (<b>${escapeHtml(kp.mk||'')}</b>) — <b>no file came back</b></span>`;})():''}${op&&!kp?`<span class="opened" title="${escapeHtml(op.who)} opened this ${fmtWhen(op.at)} but no Keepa export has been dropped in since — so nothing is saved and the row stays late. Drop the export into the run to finish it."><i></i>Opened ${fmtWhen(op.at).replace(/^(Today|Yesterday)/,m=>m.toLowerCase())} · ${whoChip(op.who)} · <b>not run yet — no Keepa file dropped back in</b></span>`:''}</td>
      <td class="nextc">${dstateHtml(s,d,gone12?lastOk:last,stK,kpToday?kp:null,opToday?op:null)}</td>
      <td class="actc"><div class="acts">${finderLink(s)?`<a class="ib" href="${finderLink(s)}" target="_blank" rel="noopener" title="${s.link?'Open the saved Keepa filter'+(s.link2?' — '+escapeHtml(s.linkLab||'1 of 2'):''):'Open the generated Keepa filter (edit to paste your own)'}">${ICONS.ext}</a>${s.link2?`<a class="ib" href="${rollRankMonth(s.link2)}" target="_blank" rel="noopener" title="Open the second Keepa filter — ${escapeHtml(s.link2Lab||'2 of 2')}">${ICONS.ext}</a>`:''}`:`<span class="ib nolink" title="No Keepa link saved yet — Edit and paste it">?</span>`}<button class="btn run xs" data-act="run" ${s.status==='paused'?'disabled':''} title="${lk&&!mine?'Someone else has it open — you can still join':''}">${ICONS.run}${lk&&!mine?'Join':'Run'}</button>${isJack()?`<button class="ib" data-act="edit" title="Edit">${ICONS.edit}</button>`:''}
        <div class="menu"><button class="ib" data-act="menu" aria-label="More">⋮</button>
          <div class="pop"><button data-act="history">${ICONS.hist}History</button>${isJack()?`<button data-act="pause">${s.status==='paused'?ICONS.play:ICONS.pause}${s.status==='paused'?'Set active':'Pause'}</button>`:''}${lk?`<button data-act="unlock">${ICONS.eye}Clear "on it"</button>`:''}${isJack()?`<button data-act="delete" class="danger">${ICONS.trash}Delete</button>`:''}</div></div></div></td></tr>`;};
  const head=`<thead><tr><th>Name</th><th>Owner</th><th>Buy from</th><th>Status · cadence</th><th>Last run</th><th>Done?</th><th></th></tr></thead>`;
  const filters=rows.filter(s=>s.type==='filter'),brands=rows.filter(s=>s.type!=='filter');
  const group=(label,list)=>list.length?`<tr class="grp"><td colspan="8"><span class="gl">${label}</span><span class="gn">${list.length}</span></td></tr>`+list.map(rowHtml).join(''):'';
  const primeF=filters.filter(primeFirst).sort((a,b)=>((b.markets||[]).includes('UK')-(a.markets||[]).includes('UK'))||a.name.localeCompare(b.name)),restF=filters.filter(s=>!primeFirst(s));   /* b260 */
  tb.innerHTML=head+'<tbody>'+group('★ Prime event — do these first',primeF)+group('Saved filters',restF)+group('Brands',brands)+'</tbody>';}
/* b241: the Done? cell — one big word, who and when underneath, then what comes next */
/* b248 (Jack, 4 Oct: "add a better last done by X and date/time on the rows"): the last run that was FINISHED — who, the full date and time, how long ago */
function lastDoneOf(key){const R=runsFor(key);for(let i=R.length-1;i>=0;i--){const r=R[i];if(!r.needDone||r.done){const at=(r.done&&r.done.at)||r.at,who=(r.done&&r.done.who)||r.who||'';return{who,at,auto:!!(r.done&&r.done.auto)};}}return null;}
function lastDoneHtml(key,lab){const x=lastDoneOf(key);if(!x)return'';const d=new Date(x.at),days=Math.floor((new Date(today())-new Date(stamp(d).slice(0,10)))/864e5);
  const dt=d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+' · '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return`<span class="dlast">${lab||'Last done'} by ${x.who?whoChip(x.who):'—'} <b>${escapeHtml(dt)}</b><i>${days<=0?'today':days===1?'yesterday':days+' days ago'}</i></span>`;}
function dstateHtml(s,d,last,stK,kp,op){const when=last?fmtWhen(last.at).replace(/^(Today|Yesterday)/,m=>m.toLowerCase()):'';
  const by=last&&last.who?`by ${whoChip(last.who)} · ${escapeHtml(when)}`:last?escapeHtml(when):'';
  const ic={done:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
    todo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'};
  if(stK==='paused')return`<div class="dstate paused"><span class="dbig">PAUSED</span><span class="dsub">off the list</span></div>`;
  if(stK==='oneoff')return`<div class="dstate oneoff"><span class="dbig">ONE-OFF</span>${by?`<span class="dsub">${by}</span>`:''}</div>`;
  if(stK==='part'){const tr=typeof toReviewCount==='function'?toReviewCount(last):0;
    const prevDone=(()=>{const R=runsFor(s.key).filter(r=>r!==last&&(!r.needDone||r.done));const p=R[R.length-1];if(!p)return'';const at=(p.done&&p.done.at)||p.at,who=(p.done&&p.done.who)||p.who||'',dd=new Date(at);
      return`<span class="dlast">Last done by ${who?whoChip(who):'—'} <b>${escapeHtml(dd.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})+' · '+dd.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}</b></span>`;})();
    return`<div class="dstate part" title="The files are in, but nobody has pressed ✓ Done on this filter"><span class="dbig">◐ NOT FINISHED</span><span class="dsub">files in ${by}</span><span class="dnext">${tr?`<b>${tr}</b> to review left · `:''}<b>✓ Done not pressed</b> (next to Open in Keepa)</span>${prevDone}${runsTodayHtml(last)}</div>`;}
  if(stK==='done'&&last&&last.done&&last.done.who){const dw=fmtWhen(last.done.at).replace(/^(Today|Yesterday)/,m=>m.toLowerCase());
    return`<div class="dstate done" title="${last.done.auto?'0 leads — nothing to do':'Done pressed by '+escapeHtml(last.done.who)}"><span class="dbig">${ic.done}${d.cls==='done'?'DONE TODAY':'DONE'}</span><span class="dsub">by ${whoChip(last.done.who)} · ${escapeHtml(dw)}${last.done.auto?' · 0 leads':''}</span><span class="dnext">next ${escapeHtml(d.cls==='done'?String(d.sub||'').replace(/^next /,''):d.label+(d.sub?' · '+d.sub:''))}</span>${runsTodayHtml(last)}</div>`;}
  if(stK==='done')return`<div class="dstate done" title="Run inside its cadence${d.sub?' · '+escapeHtml(d.sub):''}"><span class="dbig">${ic.done}${d.cls==='done'?'DONE TODAY':'DONE'}</span><span class="dsub">${by}</span><span class="dnext">next ${escapeHtml(d.cls==='done'?String(d.sub||'').replace(/^next /,''):d.label+(d.sub?' · '+d.sub:''))}</span></div>`;
  /* b260: two short lines that wrap — it was one long line running under the Run button */
  const stl=d.stale?`not finished within ${STALE_H} hours`:'',stl2=d.stale?`<span class="dnext stale2">files in ${escapeHtml(fmtWhen(d.stale.at).replace(/^(Today|Yesterday)/,m=>m.toLowerCase()))}${d.stale.who?' · '+whoChip(d.stale.who):''} · <b>run it again</b></span>`:'';
  const why=stl?stl+(d.kind==='late'?` · ${escapeHtml(d.label)}`:''):d.kind==='first'?'never run':d.kind==='late'?`${escapeHtml(d.label)} · ${escapeHtml(d.sub||'')}`:'due today';
  const busy=kp?`<span class="dbusy kp"><i></i>${escapeHtml(kp.who)} pressed Open in Keepa ${escapeHtml(fmtWhen(kp.at).replace(/^Today /,''))} — file not back</span>`:op?`<span class="dbusy op"><i></i>${escapeHtml(op.who)} opened it ${escapeHtml(fmtWhen(op.at).replace(/^Today /,''))}</span>`:'';
  return`<div class="dstate todo${d.stale?' stale':''}"><span class="dbig">${ic.todo}NOT DONE</span><span class="dsub">${why}</span>${stl2}${lastDoneHtml(s.key)}${busy}</div>`;}
/* b267: a filter run more than once today says so — "2 runs today: 06:10 Mera ✓ · 10:15 Jack ✓" (✓ = Done pressed) */
function runsTodayHtml(r){if(!r||String(r.day||r.at).slice(0,10)!==today())return'';const L=runsOfDay(r);if(L.length<2)return'';const hm=x=>new Date(x).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  return`<span class="druns" title="Every run of this filter today — who and when; ✓ = Done pressed">${L.length} runs today: ${L.map(x=>`${hm(x.at)} ${escapeHtml(x.who||'?')}${x.done?' ✓':' …'}`).join(' · ')}</span>`;}
async function onListClick(e){const b=e.target.closest('button[data-act]');if(!b){closeMenus();return;}
  const tr=b.closest('tr'),key=tr&&tr.dataset.key,s=key&&srcGet(key);if(!s)return;const act=b.dataset.act;
  if(act==='menu'){const m=b.closest('.menu');const open=m.classList.contains('open');closeMenus();if(!open)m.classList.add('open');e.stopPropagation();return;}
  closeMenus();
  if(act==='run')openRun(key);
  else if(act==='edit'){if(!isJack()){toast('Only Jack edits filters — ask him',true);return;}openEdit(s);}
  else if(act==='history')openHistory(s);
  else if(act==='unlock'){srcUnlock(s);renderList();toast('Cleared');}
  else if(act==='pause'){if(!isJack()){toast('Only Jack pauses filters',true);return;}s.status=s.status==='paused'?'active':'paused';s.paused=s.status==='paused';srcSave(s);renderList();toast(s.name+(s.status==='paused'?' paused':' set active'));}
  else if(act==='delete'){if(!isJack()){toast('Only Jack deletes filters',true);return;}if(!await uiConfirm('Delete '+s.name+' for everyone?\n\nIt goes off the list for everyone. Its run history is kept.',{ok:'Delete '+s.name,tone:'danger'}))return;srcRemove(key);renderList();toast(s.name+' deleted');}}
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
      <div class="field"><label>Second filter link <span class="dim">(optional — e.g. £-off coupons next to %-off)</span></label>
        <input class="full" id="eLink2" value="${escapeHtml(s.link2||'')}" placeholder="optional — a second keepa.com/#!finder/… link; both exports drop into one run" autocomplete="off"></div>
      <div class="field"><label>Skip these brands on this filter <span class="dim">(the app drops them — Keepa only takes 50 a filter)</span></label>
        <textarea class="full" id="eNoBrands" rows="2" placeholder="optional — comma separated, e.g. dior, chanel, amazon basics">${escapeHtml((s.noBrands||[]).join(', '))}</textarea></div>
      <div class="field"><label>Skip these categories on this filter <span class="dim">(the app drops any product with these words in its Keepa category tree)</span></label>
        <textarea class="full" id="eNoCats" rows="3" placeholder="optional — one per line, e.g.&#10;helmets&#10;curtains &amp; drapes">${escapeHtml((s.noCats||[]).join('\n'))}</textarea></div>
      <div class="field" id="fBrands"><label>Brand names as Keepa spells them</label><input class="full" id="eBrands" value="${escapeHtml((s.brands||[]).join(', '))}" placeholder="Logitech, Logitech G, Logitech for Creators"><p class="hintline">Keepa's brand filter is exact. Leave blank to use the name.</p></div>
      <div class="field" id="fVat"><label class="chk"><input type="checkbox" id="eVat0"${s.vat0?' checked':''}> Everything on this filter is 0% VAT (tea &amp; coffee)</label><p class="hintline">Every row is worked at 0% unless it reads like a machine. A VA's 20% click on a row still wins.</p></div>
    </div>
    <div class="fsec"><div class="fst">Notes</div>
      <div class="field"><textarea id="eNote" placeholder="anything the VA should know before running it">${escapeHtml(s.note||'')}</textarea></div>
      ${!isNew?`<p class="hintline">Limits (minimum sales, ROI, profit) are typed on the run screen and last for that look only — nothing is saved on the filter.</p>`:''}
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
  if(!isNew)$('#dDelete').addEventListener('click',async()=>{if(!await uiConfirm('Delete '+s.name+' for everyone?\n\nIt goes off the list for everyone. Its run history is kept.',{ok:'Delete '+s.name,tone:'danger'}))return;srcRemove(s.key);closeDrawer();if(cur&&cur.key===s.key){cur=null;backToList();}renderList();toast(s.name+' deleted');});
  $('#dSave').addEventListener('click',()=>{const name=$('#eName').value.trim();if(!name){toast('Name needed',true);$('#eName').focus();return;}
    const type=$('#eType').value,r=rule();
    const markets=r===1?[...document.querySelectorAll('#drawerBody .mks input[type=checkbox][value]:checked')].map(c=>c.value):['UK'];if(!markets.length){toast('Tick at least one marketplace',true);return;}
    const key=isNew?srcKeyFor(name):s.key;if(isNew&&srcGet(key)){toast(name+' is already in the list',true);return;}
    const status=(document.querySelector('input[name=eStatus]:checked')||{}).value||'testing';
    const out=Object.assign({},s,{key,name,type,rule:r,markets,cadence:$('#eCad').value,owner:$('#eOwner').value||'VAs',note:$('#eNote').value.trim(),status,paused:status==='paused',
      brands:type==='brand'?$('#eBrands').value.split(',').map(x=>x.trim()).filter(Boolean):[],link:$('#eLink').value.trim(),link2:$('#eLink2').value.trim(),noBrands:$('#eNoBrands').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean),noCats:$('#eNoCats').value.split(/\n|;/).map(x=>x.trim().toLowerCase()).filter(Boolean),vat0:type==='filter'&&$('#eVat0').checked});
    srcSave(out);closeDrawer();renderList();toast(isNew?name+' added — everyone sees it':'Saved for everyone');if(cur&&cur.key===key){cur=out;paintRunHead();paintFloors();renderGuide();}});
  paint();setTimeout(()=>$('#eName').focus(),50);}
function openHistory(s){const runs=runsFor(s.key).slice().reverse(),V=verdAll();
  openDrawer(`<h3>${escapeHtml(s.name)} · history</h3><p class="dsub">${runs.length} run${runs.length===1?'':'s'} · shared</p>
    <div class="hist">${runs.length?runs.map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;});
      return`<div class="h"><span class="w">${fmtWhen(r.at)}${r.who?'<br>'+escapeHtml(r.who):''}</span><span class="l"><b>${r.leads}</b> leads · ${r.new} new · ${r.better} better · ${r.worse} worse · ${r.gone} gone${r.blacklisted?' · '+r.blacklisted+' blacklisted':''}</span><span class="v">${y}Y ${n}N ${m}M</span></div>`;}).join(''):'<div class="empty"><span>Not run yet.</span></div>'}</div>
    <div class="dfoot"><button class="btn ghost danger" id="dForget">Forget history</button><button class="btn ghost" id="dClose">Close</button></div>`);
  $('#dClose').addEventListener('click',closeDrawer);
  $('#dForget').addEventListener('click',async()=>{if(!await uiConfirm('Forget every saved run for '+s.name+'?\n\nFor everyone: the saved runs and the compare baseline go, so the next run shows everything as NEW. Verdicts are kept.',{ok:'Forget the runs',tone:'danger'}))return;histForget(s.key);runsForget(s.key);apiLookForget(s.key);closeDrawer();renderList();renderLog();toast('History cleared for '+s.name);});}
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
async function openRun(key){const s=srcGet(key);if(!s)return;tmpFloors=null;const frr=$('#floorRow');if(frr)frr._open=false;   /* b211: limits reset to the default every time a source is opened */
  if(cur&&cur.key!==key){srcUnlock(cur);clearRun();view.q='';view.page=1;const fq=$('#fQ');if(fq)fq.value='';}
  {const was=cur&&cur.key===key?cur:null;cur=s;if(was)Object.keys(was).forEach(k=>{if(k[0]==='_')cur[k]=was[k];});}   /* b260: the open run's scratch (Replen's kept list) lives in memory only — keep it when the same filter is re-opened */
  touched.clear();blPick=null;
  if(typeof awaitDrop!=='undefined'&&awaitDrop&&awaitDrop.key&&awaitDrop.key!==key)awaitDrop=null;   /* b260: "pressed Open in Keepa" on another filter does not follow you here */
  if(s.drop)view.status='ALL';else view.status='REVIEW';   /* b242: every run opens on To review */   /* b223: a one-off shows every lead it kept; the remembered choice is for real sources */
  if(!(lockFresh(s)&&ownLock(s)))srcLock(cur);
  if(!me()){toast('Pick who you are (top right) so this run carries your name',true);const w=$('#whoSel');if(w){w.classList.add('shake');setTimeout(()=>w.classList.remove('shake'),600);}}
  $('#viewList').hidden=true;$('#viewRun').hidden=false;paintRunHead();paintSlots();paintFloors();renderGuide();
  {const tc=document.querySelector('#viewRun .twocol');if(tc)tc.classList.add('one');}   /* b48/b55: every source stacks — no dead column either side (Jack, ASUS run) */
  $('#sumEmpty').textContent='Loading the shared compare baseline…';
  const gotBase=await cloudPullLeads(key);
  /* b250: never silent again — if the last run's leads could not be fetched, say so before a file is dropped */
  if(!gotBase&&typeof cloudEnabled==='function'&&cloudEnabled()&&cloud.tables&&cur&&cur.key===key)toast('Could not load the last run of this filter to compare against — leads may all show as New. Check the internet, then open the filter again.',true);
  run();window.scrollTo({top:0,behavior:'smooth'});}
/* b228 (Jack's video, 1 Oct: "✓ 18 to review · 20 leads — show me ↓" still floating on the Brands list after leaving the run) */
function pillOff(){const p=$('#leadsReady');if(p)p.hidden=true;}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.pagebtn,#homeBtn'))pillOff();},true);
function backToList(){if(cur&&ownLock(cur))srcUnlock(cur);pillOff();$('#viewRun').hidden=true;$('#viewList').hidden=false;renderList();}
/* b223 (Jack, 1 Oct: "it should also tick the countries"): on Drop & check the flags tick as each country's file lands */
function paintRunMk(){const s=cur;if(!s)return;const inF=m=>!!(files[m]||(m==='UK'&&files.viewer&&!files.viewer.__alias));
  $('#runMk').innerHTML=s.markets.map(m=>`<i class="mk ${m==='UK'?'uk':''}${s.drop&&inF(m)?' in':''}" ${s.drop?`title="${inF(m)?'file in':'no file yet'}"`:''}>${m}${s.drop&&inF(m)?' ✓':''}</i>`).join(' ');}
function paintRunHead(){const s=cur;$('#runAvatar').innerHTML=avatar(s);$('#runName').textContent=s.name;$('#runEdit').hidden=!isJack();
  $('#viewRun').classList.toggle('oneoff',!!s.drop);$('#runCopyLink').hidden=!!s.drop;   /* b223: a one-off has no "since last run", no AVM link */
  paintRunMk();
  const ol=otherLock(s);const lk=ol?` · <span class="lock">${escapeHtml(ol.who)} is also on this (since ${new Date(ol.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})})</span>`:'';
  $('#runMeta').innerHTML=`${whoChip(s.owner||'VAs')} <span class="rl r${s.rule}">Rule ${s.rule} · ${RULE_LABEL[s.rule]||''}</span> <span class="st ${s.status}"><i></i>${STATUS_LABEL[s.status]||''}</span> <span class="mchip">${CADENCE_LABEL[s.cadence]||s.cadence}</span>`+(s.note?` <span class="mnote" title="${escapeHtml(s.note)}">${escapeHtml(s.note)}</span>`:'')+lk
    +(typeof primeEventOn==='function'&&primeEventOn()?`<span class="pnrun">${escapeHtml(PRIME_NOTE_FULL)}</span>`:'');   /* b217 */   /* b217 */
  paintRunStrip();paintNext();
  const r1=s.rule===1;
  const uk1=r1&&s.markets.every(m=>m==='UK');
  const listed=isListed(s);   /* b202: a storefront or pasted list is Viewer files only — say so */
  $('#step1Title').textContent=s.list==='finder'?'Drop your storefront export, then the EU Viewer files':listed?'Drop the Product Viewer files':r1&&!uk1?'Drop the Product Finder exports':"Drop this morning's export";
  $('#step1Sub').innerHTML=escapeHtml(s.list==='finder'?`First the Product Finder export of everything you have sold — the app keeps what sells and that is your UK file. Then one Viewer file per EU flag (${s.markets.filter(k=>k!=='UK').join(' · ')}), any order.`:listed?`One Viewer file per flag (${s.markets.join(' · ')}). Any order — the app knows which is which.`:r1&&!uk1?`One file per flag, plus the UK Product Viewer file. Any order — the app knows which is which.`:uk1?'UK Product Finder, all columns. One file — it carries the UK sell side too, so no Viewer is needed.':'UK Product Finder, all columns. One file.')+' <button type="button" class="linkbtn" data-cols="1">Keepa columns to tick (once)</button>';
  if(!r1&&s.link2){$('#step1Title').textContent='Drop both exports';   /* b234 */
    $('#step1Sub').innerHTML=`One UK Product Finder export from each filter — <b>${escapeHtml(s.linkLab||'filter 1')}</b> and <b>${escapeHtml(s.link2Lab||'filter 2')}</b>, all columns. Drop them together or one after the other — they add up. <button type="button" class="linkbtn" data-cols="1">Keepa columns to tick (once)</button>`;}
  if(s.drop){$('#step1Title').textContent='Drop any Keepa exports';
    $('#step1Sub').innerHTML='Product Finder or Viewer, any country, as many as you like — they add up. UK files on their own are priced straight away. EU files in? Press <b>Open UK Product Viewer</b> below, export it, drop it. <button type="button" class="linkbtn" data-cols="1">Keepa columns to tick (once)</button>';
    $('#keepaRow').innerHTML='<span class="nolinkmsg">Drop &amp; check — no Keepa link here: export whatever you like from Keepa and drop it on the box below. <b>Clear files</b> (top right) starts a fresh check.</span>';
    const de=$('#doneEmpty');if(de)de.hidden=true;return;}   /* b222 */
  paintDoneEmpty();
  const link=finderLink(s);
  if(isListed(s)){paintStorefrontRow(s);return;}   /* b183 / b184 */
  if(!link){$('#keepaRow').innerHTML=`<span class="nolinkmsg">No Keepa link saved for this yet — <button type="button" class="linkbtn" id="keepaEdit">Edit</button> and paste the Finder link. Exports can still be dropped below.</span>`;$('#keepaEdit').addEventListener('click',()=>openEdit(cur));return;}
  $('#keepaRow').innerHTML=`<span class="lab">Open in Keepa:</span>`+(r1&&!uk1?s.markets.map(m=>`<a href="${(s.links&&s.links[m])||link}" data-mk="${m}" target="_blank" rel="noopener" title="${s.links&&s.links[m]?`This is the ${m} filter — its own categories. Set Keepa to ${m} FIRST (flag, top right of Keepa), then press this: a link that opens on another country loses 'sold by Amazon'. Then rows per page to the maximum, export all columns`:`Same filter for every market — set Keepa's flag (top right) to ${m} FIRST, then press this, export`}">${FLAG[m]} ${m}<span class="tick">✓</span>${ICONS.ext}</a>`).join('')+`<a href="#" data-mk="viewer" class="vwbtn" title="Step 2 — the UK Product Viewer with every ASIN from your country files loaded. Export all columns and drop it in; it ticks when it is in.">${FLAG.UK} UK Viewer<span class="tick">✓</span>${ICONS.ext}</a>`+`<span class="mkhint">${s.links?'One file per flag. Each button is that country\'s own filter — set Keepa to that flag (top right of Keepa) <b>before</b> you press the button. Switched after it opened? Press the button again.':'One file per flag — set Keepa to that country\'s flag (top right) <b>before</b> you press its button.'}</span>`:s.link2?finderLinks(s).map((L,i)=>`<a href="${L.url}" data-l2="${i}" target="_blank" rel="noopener" title="Filter ${i+1} of 2 — export all columns and drop it in; the two files add up">${FLAG.UK} ${escapeHtml(L.lab)}<span class="tick">✓</span>${ICONS.ext}</a>`).join('')+`<span class="mkhint">Two Keepa filters — export both and drop both in. They add up into one run.</span>`   /* b234 */
    :`<a href="${link}" target="_blank" rel="noopener">${FLAG.UK} the filter${ICONS.ext}</a>`)+(s.link?'':`<span class="lab" style="margin-left:6px">generated from the brand name — edit to paste your own</span>`);paintApiRun();}   /* b138: inside the painter, not after it */
/* b213 (Jack, 30 Sep: "for anything that has 0 leads — a done button to show it's been run and done"). When Keepa shows nothing (so there
   is no file to export), one press saves an empty run under your name: the row goes green, Last run says who and when, next due moves on.
   A run that came back with 0 leads is already saved the same way — the guide says "done, 0 leads". */
function paintDoneEmpty(){if(!cur)return;let b=$('#doneEmpty');const host=$('#keepaRow');if(!host)return;
  if(cur.drop){if(b)b.hidden=true;return;}   /* b260: never on a Drop & check */
  if(!b){b=document.createElement('button');b.type='button';b.id='doneEmpty';b.className='btn ghost sm doneempty';host.parentNode.insertBefore(b,host.nextSibling);b.addEventListener('click',doneEmpty);}
  const ran=runsFor(cur.key).some(r=>(r.day||String(r.at).slice(0,10))===today());
  b.hidden=!!result||ran;b.innerHTML='✓ Keepa showed <b>0 results</b>? Mark this done for today';}
async function doneEmpty(){if(!cur||!needMe())return;
  /* b260: the button was painted when the filter opened and never again, so it was still on screen after the files went in — one press (and an OK) would have
     saved today's run as "0 leads, done" over the real one. It now hides the moment there are leads, and refuses if today already has a run. */
  if(result||runsFor(cur.key).some(r=>(r.day||String(r.at).slice(0,10))===today())){paintDoneEmpty();toast('Today\'s run is already saved for this filter — use ✓ Done next to Open in Keepa');return;}
  if(!await uiConfirm(`Keepa showed 0 results for ${cur.name}?\n\nThen there is nothing to export today. This marks ${cur.name} as done for today with 0 leads, under ${me()}.`,{ok:'Yes — mark it done',tone:'info'}))return;
  runSave({at:nowIso(),day:today(),source:cur.key,name:cur.name,rule:cur.rule,files:[],rowsIn:0,st:{},leads:0,new:0,better:0,worse:0,gone:0,blacklisted:0,asins:[],queue:[],goneAsins:[],who:me(),empty:true,needDone:true,done:{who:me(),at:nowIso(),auto:true}});
  if(typeof actLog==='function')actLog('drop','Done — Keepa showed 0 results');
  paintRunStrip();paintNext();paintDoneEmpty();renderGuide();toast(`${cur.name} marked done for today — 0 leads`);
  const nx=$('#runNext');if(nx&&!nx.hidden)nx.classList.add('ready');}
function paintNext(){const nx=cur?nextDue(cur.key):null;['#runNext','#runNext2'].forEach(id=>{const b=$(id);if(!b)return;
    if(cur&&cur.drop){b.hidden=id!=='#runNext2';b.innerHTML='Back to Brands / Filters →';delete b.dataset.key;return;}   /* b223: a one-off has no next due · b251: Done is next to Open all */
    /* b244 (Jack, 4 Oct: "they need to be pressing Done once they did it"): #runNext2 is THE Done button — there whenever today's run is saved,
       even with nothing else due. Pressing it stamps the run (who, when) and that is what turns the row green. */
    b.hidden=!nx;if(nx){b.innerHTML='Next due: '+escapeHtml(nx.name)+' →';b.dataset.key=nx.key;}});}
/* b244: how many To review leads nobody on this filter has done today, and the Done stamp itself */
function runDoneLeft(){return result?result.out.filter(o=>o.QUEUE&&!(typeof doneToday==='function'&&doneToday(o))).length:0;}
function runMarkDone(){if(!cur||cur.drop||!result||result.past||result.apiLook||!me())return false;
  const r=runLast(cur.key);if(!r||(r.day||String(r.at).slice(0,10))!==today())return false;   /* only today's saved run can be finished */
  if(r.done&&!r.done.auto)return true;
  const left=runDoneLeft();
  if(left){toast(`Not finished — ${left} lead${left===1?'':'s'} in To review ${left===1?'has':'have'} not been looked at. Press ✓ Done next to Open in Keepa.`,true);return false;}
  runSave(runDoneStamp(r,{who:me(),at:nowIso(),left}));
  if(typeof actLog==='function')actLog('done','Done pressed · '+cur.name+(left?' · '+left+' left':''),cur.key);
  toast(`${cur.name} — marked DONE by ${me()}`);return true;}
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
/* b211 (Jack, 29 Sep: "default of 9 spm — they can change it, but it always comes back to 9. Discount codes (OA codes, Amazon discounts) aren't
   factored in fully, and a code can turn something from a bad lead to a banger quickly"). Limits are for THIS run only — never saved. */
let tmpFloors=null;
function paintFloors(){if(!cur)return;const f=tmpFloors||{};const r1=cur.rule===1;
  FLOORS.forEach(([k,l,scope])=>{const el=$('#fl_'+k);if(!el)return;el.parentElement.hidden=(scope==='r2'&&r1);if(document.activeElement!==el)el.value=f[k]==null?'':f[k];});
  const lab=floorsLabel(f);$('#floorSaved').innerHTML=lab?`<b>${escapeHtml(cur.name)}:</b> ${escapeHtml(lab)} · saved for everyone`:`Default 9 a month. Type a number to go stricter for this run only.`;
  $('#floorClear').hidden=!lab;
  /* b210 (Jack: "wtf is this and why is it default here"): folded to one line; open it with Change */
  const fr=$('#floorRow');if(fr){fr.classList.toggle('folded',!fr._open);let t=$('#floorTog');if(!t){t=document.createElement('button');t.type='button';t.id='floorTog';t.className='linkbtn';$('#floorSaved').after(t);t.addEventListener('click',()=>{fr._open=!fr._open;paintFloors();});}
    t.textContent=fr._open?'Done':'Change for this run';$('#floorSaved').innerHTML=lab?`<b>This run only:</b> ${escapeHtml(lab)} · <b>goes back to the default (9 sales a month) next time you open it</b> — Jack's advice is to leave it on the default unless you're doing a specific sourcing method`:`<b>Default: 9 sales a month</b> and nothing else. <b>Jack's advice: leave it on the default</b> unless you're doing a specific sourcing method — codes (OA codes, Amazon vouchers) aren't fully counted, and a code can turn a bad lead into a banger. Anything you change here is for this run only and goes back to 9 next time.`;}}
let floorT=null,relogT=null;
function onFloorInput(){if(!cur)return;clearTimeout(floorT);floorT=setTimeout(()=>{const f={};FLOORS.forEach(([k])=>{const el=$('#fl_'+k);if(!el)return;const v=el.value.trim();if(v!==''&&!isNaN(+v)&&+v>0)f[k]=+v;});
  const same=JSON.stringify(f)===JSON.stringify(tmpFloors||{});if(same)return;
  const had=!!tmpFloors;tmpFloors=Object.keys(f).length?f:null;paintFloors();
  if(tmpFloors&&!had)toast('Limit set for THIS run only — it goes back to the default (9 sales a month) next time. Jack\'s advice: leave it on the default unless you\'re doing a specific sourcing method.');
  const fs=$('#floorSaved');fs.classList.add('flash');setTimeout(()=>fs.classList.remove('flash'),900);
  run();   /* re-run keeps the same sig, so nothing is re-logged. b260: and nothing 'catches up' afterwards — a limit is for looking, the saved run and the
              compare baseline keep every lead (the old 2.5 s re-log saved the cut-down list: hidden leads left the baseline and came back as NEW) */
  },900);}
/* the step strip: exactly what to do next, with ticks as it happens */
/* b202 (Jack, 28 Sep: "make the steps and the guide dumb and child-proof — super, super simple"; and "why is 6 already ticked" on a
   saved run). Three steps, never seven. Only the step you are on is spelled out — a 1-2-3 of what to press — and the thing to press
   glows below. A tick can never sit behind an empty step: done cascades backwards (a result means every step that made it happened,
   even in a browser that never held the files — the saved-run case). The long "exactly how" bullets sit behind one link, off by default. */
function guideSteps(){if(!cur)return{steps:[],now:0,saved:false};const r1=cur.rule===1,F=m=>FLAG[m]||m;
  const rev=result?result.out.filter(o=>o.QUEUE).length:0;
  const anyFile=SLOTS.some(k=>files[k])||!!files.one,saved=!!result&&!anyFile;
  const EXPORT=['At the bottom of the Keepa table, set rows per page to the biggest number, so every result is on one page. Keepa only exports the page you can see.',
    'Once per computer: press Configure Columns (top left of the Keepa table) and tick the columns on the list — the "Keepa columns to tick" link under the drop box shows all 49, in Keepa\'s own groups. Keepa remembers them.',
    'Click Export (top right of the table). What to export → All active columns. Format → CSV. Leave "Include currency symbols" unticked. Press Export.',
    'The file lands in your Downloads. Do not open or rename it.'];
  const DROP=['Drag the file from Downloads onto the big box, or click the box and pick it.','The numbers appear on the right straight away. A yellow warning about a missing column means: switch that column on in Keepa (the columns button above the table) and export again.'];
  const JUDGE=['Scroll down — the leads are under the summary, best score first, in To review.','Click "Open all in Keepa" — every lead opens in one go.','Read each graph. Back here, click Y (buy), N (no) or M (maybe) on that lead\'s row.','When you have looked at them all, press ✓ Done (next to Open all in Keepa). Until you do, the filter shows as NOT FINISHED for everyone.'];
  /* b243: one sentence everyone sees under each file step */
  const SAVE='<b class="gsave">⚠ Pressing Open in Keepa saves nothing — the file has to come back in here.</b>';
  const judge={t:'Judge',h:'Judge the leads',d:result?(rev?`${rev} to review`:'all judged ✓'):'',done:!!result&&rev===0,
    dos:['<b>Scroll down</b> ↓ — your leads are under the summary, the best ones first, in <b>To review</b>','Press <b>Open all in Keepa</b> and read each graph · back here <b>Y</b> (buy) · <b>N</b> (no — pick a reason) · <b>M</b> (maybe) if you want','Looked at them all? <b>Press ✓ Done</b> — right next to Open all in Keepa. That is what turns this filter green with your name on it. Then <b>Next due →</b>'],how:JUDGE,hot:'#leadTop'};
  const rest=(list,skip)=>list.filter(m=>m!==skip&&!files[m]).map(m=>F(m)+' '+m).join(', ');
  let steps;
  if(cur.drop){const eu=['DE','FR','IT','ES'].filter(m=>files[m]).length,n=SLOTS.filter(k=>files[k]&&!(k==='viewer'&&files.viewer.__alias)).length;   /* b222 */
    steps=[{t:'Your files',h:'Drop any Keepa exports',d:n?`${n} file${n===1?'':'s'} in${eu&&!files.viewer?' · EU files in — the UK Viewer is next':''}`:'Finder or Viewer, any country',done:!!files.viewer||!!result,
        dos:['Export anything from Keepa — Product Finder or Viewer, any country, <b>All active columns → CSV</b>','Drop the files anywhere on this page — as many as you like','EU files in? Press <b>Open UK Product Viewer</b> below, export it, drop it'],how:[],hot:'#dropAny'},judge];}
  else if(r1&&isListed(cur)){const eu=cur.markets.filter(m=>m!=='UK'),euIn=eu.filter(m=>files[m]).length,nextEu=eu.find(m=>!files[m])||eu[0];
    const what=cur.list==='adhoc'?'the ASINs you pasted':cur.list==='finder'?'the products the app kept':'your storefront';
    if(cur.list==='finder'){const mi=cur._sfMini,m=Object.assign({spm:9,sell:7},cur.mini||{});   /* b249 */
      steps=[{t:'Storefront export',h:'Export everything you have sold',d:mi&&files.viewer?`${mi.all.toLocaleString()} in → ${mi.kept.toLocaleString()} kept`:'one Product Finder export — it is the UK file too',done:!!files.viewer,   /* b260: ticked by TODAY's export, not by a saved run */
        dos:[`Press <b>${F('UK')} Everything I’ve sold · Product Finder</b> below → Keepa opens your storefront, every product you have ever sold`,'In Keepa: rows per page → <b>biggest</b> · <b>Export → All active columns → CSV</b> <button type="button" class="linkbtn gcols" data-cols="1">first time? columns to tick</button>',`Drag that file onto the box below — the app keeps what sells <b>${m.spm}+ a month</b> with a 90-day sell price of <b>£${m.sell}+</b>, and the EU buttons appear`],
        how:EXPORT.concat(DROP),hot:'#keepaRow a[data-mk="viewer"]'}];}
    else steps=[{t:'UK file',h:'Get the UK file',d:`${(cur._sf||[]).length?(cur._sf.length.toLocaleString()+' products · '):''}the Viewer opens with ${what} already loaded`,done:!!files.viewer||!!result,
        dos:[`Press <b>${F('UK')} UK</b> below → the Keepa Product Viewer opens with ${what} in it`,'In Keepa: <b>Export → All active columns → CSV</b> <button type="button" class="linkbtn gcols" data-cols="1">first time? columns to tick</button>','Drag that file from Downloads onto the box below'],
        how:['Over 250 products? There are two or three UK buttons — do each one, one file each.'].concat(EXPORT,DROP),hot:'#keepaRow a[data-mk="viewer"]'}];
    if(eu.length)steps.push({t:'EU files',h:'Get a file from each EU flag',d:`${eu.map(m=>F(m)+(files[m]?' ✓':'')).join(' · ')} · ${euIn} of ${eu.length} in`,done:euIn>=eu.length,
        dos:[`Press <b>${F(nextEu)} ${nextEu}</b> below → the Viewer opens on that country with the same products`,'In Keepa: <b>Export → All active columns → CSV</b> <button type="button" class="linkbtn gcols" data-cols="1">first time? columns to tick</button>','Drag that file onto the box below'+(eu.length>1&&rest(eu,nextEu)?` — then the same for ${rest(eu,nextEu)}`:'')],
        how:['Each flag button opens the Viewer on that country with the same list. File names do not matter — the app reads the country from inside the file.'].concat(EXPORT,DROP),hot:'#keepaRow a[data-mk]:not([data-mk="viewer"])'});
    steps.push(judge);}
  else if(r1&&!ukOnly()){const have=MARKETS.filter(m=>files[m]).length,tot=cur.markets.length,nextMk=cur.markets.find(m=>!files[m])||cur.markets[0],own=!!cur.links;
    const bar=$('#asinBar'),merged=(bar&&bar._all)?bar._all.length:0,vLeft=viewerPartsLeft();
    steps=[{t:'Country files',h:'Get a file from every flag',d:`${cur.markets.map(m=>F(m)+(files[m]?' ✓':'')).join(' · ')} · ${have} of ${tot} in`,done:have>=tot&&tot>0,
        dos:[own?`In Keepa, set the flag (top right) to <b>${nextMk}</b> first — <b>then</b> press <b>${F(nextMk)} ${nextMk}</b> below. Flag switched after it opened? Press the button again`:`In Keepa, set the flag (top right) to <b>${nextMk}</b> first — <b>then</b> press <b>${F(nextMk)} ${nextMk}</b> below`,'In Keepa: rows per page → <b>biggest</b> · <b>Export → All active columns → CSV</b> <button type="button" class="linkbtn gcols" data-cols="1">first time? columns to tick</button>','<b>Drag the file from Downloads onto the box below</b>'+(tot>1&&rest(cur.markets,nextMk)?` — then the same for ${rest(cur.markets,nextMk)}`:'')+'<br>'+SAVE],
        how:(own?['Each button is that country\'s own filter with its own categories — always use the matching button.','Keepa has to be on that country BEFORE the button is pressed. When a link opens on another country Keepa drops "sold by Amazon" and keeps it dropped after you switch the flag — the list fills with other sellers\' products (Germany, 4 Oct: 3,861 instead of about 1,300). List looks wrong? Set the flag, press the button again.']:['Keepa opens the same filter each time; it cannot take the country from a link. Set the flag at the top right of Keepa to that country FIRST, then press the button.']).concat(EXPORT,DROP),hot:'#keepaRow a[data-mk]:not([data-mk="viewer"])'},
      {t:'UK Viewer file',h:'Get the UK selling side',d:vLeft?`${vLeft} Viewer part${vLeft===1?'':'s'} still to do — press the button below for the next one`:merged?`${merged.toLocaleString()} ASINs merged from your files — one press below`:'the app merges every ASIN from the country files for you',done:(!!files.viewer||!!result)&&!vLeft,
        dos:['<b>The merge:</b> press <b>Open UK Product Viewer</b> below → Keepa opens with every product from your country files already merged in','In Keepa: <b>Export → All active columns → CSV</b> — the Viewer keeps <b>its own column list</b>, so the first time tick them there too: <button type="button" class="linkbtn gcols" data-cols="1">columns to tick in the Viewer</button>','<b>Drag that file onto the box below</b> → your leads appear — no merge file, no leads'+(vLeft?' · <b>too many for one go: do every part</b> (the button says which)':'')],how:['Wait for the Viewer table to fill before you export.'].concat(EXPORT,DROP),hot:'#asinOpen'},
      judge];}
  else{steps=[{t:'The file',h:r1?'Get the UK file':'Get this morning\'s file',d:'one file — it has the selling side too',done:!!(r1?files.viewer:files.one)||!!result,
        dos:[`Press <b>${F('UK')} the filter</b> below → Keepa opens it`,'In Keepa: rows per page → <b>biggest</b> · <b>Export → All active columns → CSV</b> <button type="button" class="linkbtn gcols" data-cols="1">first time? columns to tick</button>','<b>Drag the file from Downloads onto the box below</b> → your leads appear<br>'+SAVE],how:EXPORT.concat(DROP),hot:'#keepaRow a'},judge];}
  /* done cascades backwards: nothing can be ticked behind an empty step */
  let last=-1;steps.forEach((s,i)=>{if(s.done)last=i;});steps.forEach((s,i)=>{s.done=i<=last;});
  if(saved){const j=steps[steps.length-1];const at=result.at?String(result.at):'';j.d=(j.d?j.d+' · ':'')+'this is the saved run'+(at?' from '+ukDate(at):'')+' — drop today\'s file on the box below to refresh it';}
  return{steps,now:last+1,saved};}
function renderGuide(){const g=$('#guide');if(!g||!cur)return;const G=guideSteps(),steps=G.steps;if(!steps.length){g.innerHTML='';return;}
  const n=steps.length,now=G.now,all=now>=n,s=all?null:steps[now];
  /* b218: in Prime mode the box grid is the file steps; the guide shows again once it is time to judge */
  const pm=!!(typeof primeOn==='function'&&primeOn()&&!isListed(cur));g.classList.toggle('pmhide',pm&&!!s&&s.t!=='Judge');const full=guideFull();g.classList.toggle('full',full);
  /* a segmented progress bar (green = done, glowing = now, grey = still to come) and one compact panel: the 1-2-3 sits in a row */
  const bar=`<div class="gbar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${Math.min(now,n)}" aria-label="Step ${Math.min(now+1,n)} of ${n}">${steps.map((x,i)=>`<div class="gseg ${x.done?'done':i===now?'now':''}"><b></b><span><i>${x.done?'✓':i+1}</i>${escapeHtml(x.t)}</span></div>`).join('')}</div>`;
  /* two slim rows: the bar and the step title share row one; the 1-2-3 is row two (three columns on a laptop) */
  const zero=!!result&&result.out.length===0;
  const head=all?`<div class="ghead2"><span class="gbig">✓</span><span class="gtitle">${zero?'Done — this run found 0 leads, nothing to judge':'All done — every lead has an answer'}</span><span class="gsub">${(()=>{const r=typeof todayRun==='function'?todayRun():null;return r&&!r.done?'Press <b>✓ Done</b> — next to Open all in Keepa — to finish this filter, then <b>Next due →</b>':'Press <b>Next due →</b> at the top';})()}${result&&result.out.length?` · <b>All leads</b> shows the ${result.out.length} this run kept`:''}</span></div>`
    :`<div class="ghead2"><span class="gbig">${now+1}</span><span class="gkick">Step ${now+1} of ${n}</span><span class="gtitle">${escapeHtml(s.h)}</span>${s.d?`<span class="gsub">· ${escapeHtml(s.d)}</span>`:''}<button type="button" class="linkbtn gtog" id="guideTog">${full?'Hide the detail':'Show me exactly how'}</button></div>`;
  const dos=all?'':`<ol class="gdo">${s.dos.map(x=>`<li>${x}</li>`).join('')}</ol>${full&&s.how?`<ul class="gh">${s.how.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}`;
  g.classList.toggle('alldone',all);g.innerHTML=`<div class="grow1">${bar}${head}</div>${dos}`;
  const tg=$('#guideTog');if(tg)tg.addEventListener('click',()=>{lsSet(GUIDE_KEY,!guideFull());renderGuide();});
  /* the thing to press glows — one target per step, cleared first; flag buttons whose file is already in do not glow */
  document.querySelectorAll('#viewRun .gohot').forEach(e=>e.classList.remove('gohot'));
  if(s&&s.hot){let els=[...document.querySelectorAll(s.hot)];if(s.hot.startsWith('#keepaRow'))els=els.filter(a=>{const k=a.dataset.mk;return!k||!(k==='viewer'?files.viewer&&!viewerPartsLeft():files[k]);});els.forEach(e=>e.classList.add('gohot'));}}
/* b60: VAs get the full step-by-step by default; Jack gets the compact strip. Either can switch, remembered per browser. */
const GUIDE_KEY='bdl-sourcing-guidefull';
function guideFull(){return!!lsGet(GUIDE_KEY,false);}   /* b202: off for everyone — the 1-2-3 is the guide; the detail is one link away */
function ukOnly(){return!!(cur&&cur.rule===1&&cur.markets.every(m=>m==='UK'));}
function sig(){return SLOTS.map(k=>files[k]?files[k].name+':'+files[k].rows.length:'').join('|')+'|'+(files.one?files.one.name+':'+files.one.rows.length:'');}
/* b215 (EU drops, 30 Sep: 10,193 ASINs for the UK Viewer — Keepa exports stop at 4,999 rows, so one Viewer cannot carry it). Over 4,000
   ASINs the Viewer goes in equal parts, sorted so a part never changes under you. A part counts as in once its own ASINs show up in the
   Viewer file — a handful is enough, because many EU ASINs are not listed in the UK at all. */
/* b222 (Jack, 1 Oct, 1,027 ASINs → an EMPTY Viewer: "major bug — it's not merging, why not?"). b185 guessed 800 as the most a Viewer link
   could carry and copied anything bigger to the clipboard for pasting — a toast nobody reads. Keepa's own Viewer page says "Bookmarks work
   up to about 3,000 products", and a Viewer link is a bookmark. So: links up to 3,000, and the parts are 3,000 too — every part opens
   with its ASINs already loaded, nothing to paste. */
const VIEWER_PART=3000,VIEWER_LINK_MAX=3000;
function viewerParts(all){if(all.length<=VIEWER_PART)return[all];const n=Math.ceil(all.length/VIEWER_PART),size=Math.ceil(all.length/n);
  return Array.from({length:n},(_,i)=>all.slice(i*size,(i+1)*size));}
function partDone(part,covered){let n=0;for(const a of part)if(covered.has(a))n++;return n>=Math.max(1,Math.ceil(part.length*0.02));}
function viewerPartsLeft(){const a=($('#asinBar')||{})._all||[];const P=viewerParts(a);if(P.length<2)return 0;
  const covered=new Set(files.viewer?files.viewer.asins||[]:[]);return P.filter(p=>!partDone(p,covered)).length;}
/* b215: a second file for the same slot that is mostly NEW products is another part (a Viewer part, or the storefront's 2/3 and 3/3
   buttons — those used to replace each other, so only the last part was ever priced). It joins the first, de-duplicated, the newer row
   winning. A file that is mostly the SAME products is a fresh export of the same list and replaces the old one, as before. */
function partMerge(old,f,notes){if(!old||old.name===f.name||old.fromKeepa||f.fromKeepa)return f;
  const had=new Set(old.rows.map(r=>(r.ASIN||'').trim()));const same=f.rows.filter(r=>had.has((r.ASIN||'').trim())).length;
  const again=same/Math.max(1,f.rows.length)>=0.5;
  if(again&&!((old.parts||1)>1))return f;   /* the same list exported again replaces it */
  const by=new Map();old.rows.forEach(r=>by.set((r.ASIN||'').trim(),r));f.rows.forEach(r=>by.set((r.ASIN||'').trim(),r));
  const rows=[...by.values()],parts=again?old.parts:(old.parts||1)+1;   /* one part of several exported again: its rows refresh, the other parts stay */
  notes.push(again?`${f.name}: a part exported again — its ${f.rows.length.toLocaleString()} products refreshed, the other parts kept (${rows.length.toLocaleString()} in all)`
    :`${f.name}: part ${parts} — ${(rows.length-old.rows.length).toLocaleString()} more products joined the ${old.rows.length.toLocaleString()} already in (${rows.length.toLocaleString()} now)`);
  return Object.assign({},old,{name:(old.base||old.name)+` + ${parts-1} more part${parts===2?'':'s'}`,base:old.base||old.name,rows,asins:[...by.keys()].filter(Boolean),
    hasFees:old.hasFees&&f.hasFees,hasSince:old.hasSince&&f.hasSince,parts,missing:f.missing,missingAll:f.missingAll});}
/* b225 (Jack, 1 Oct: "improve smoothness and user experience"). Measured on a 549-product run: a Y/N/M click shoved the row you were on down
   18px, the first drop after opening a run moved the drop box 38px. Cause: the lead table and the guide are rebuilt with innerHTML, which
   throws away the browser's own scroll anchor, so anything that grows or shrinks ABOVE what you are looking at moves the page. keepStill()
   measures the thing you just touched, lets the page redraw, then scrolls by exactly the difference — before the browser paints. */
function keepStill(find,fn){let t0=null;try{const e=find();if(e&&e.isConnected){const r=e.getBoundingClientRect();if(r.height)t0=r.top;}}catch(x){}
  const fix=()=>{if(t0==null)return;let e=null;try{e=find();}catch(x){}if(!e||!e.isConnected)return;const d=e.getBoundingClientRect().top-t0;if(Math.abs(d)>1)window.scrollBy({top:d,left:0,behavior:'instant'});};
  let r;try{r=fn();}catch(x){fix();throw x;}
  if(r&&typeof r.then==='function')return r.then(v=>{fix();return v;},x=>{fix();throw x;});fix();return r;}
const rowOf=a=>()=>document.querySelector(`.ltbl tbody tr[data-asin="${a}"]`);
/* b282 (Jack, 7 Oct: "once I put in the Viewer it just goes still for a second, then it works — let there be an interactive loading
   screen"). A big drop (200 KB+, ~150+ products) shows what it is doing: each file read with its product count, the country boxes, then
   pricing / scoring / drawing — and how many leads came out. The spinner and the bar are CSS transforms, so they keep moving while the
   maths holds the page. Small drops are instant and show nothing. It sits under every popup (a refused file still says why). */
const BUSY={el:null,on:false,steps:[],hideT:null};
function busyPaint(){return new Promise(r=>{let d=false;const go=()=>{if(!d){d=true;r();}};try{requestAnimationFrame(()=>setTimeout(go,0));}catch(e){}setTimeout(go,80);});}
function busyRender(){const el=BUSY.el;if(!el)return;el.querySelector('.bsteps').innerHTML=BUSY.steps.map(s=>`<li class="${s.st}"><span class="bi">${s.st==='done'?'✓':s.st==='now'?'<i class="bspin"></i>':'·'}</span><span class="bt">${s.t}${s.d?`<small>${s.d}</small>`:''}</span></li>`).join('');}
function busyOpen(n){clearTimeout(BUSY.hideT);if(!BUSY.el){const el=document.createElement('div');el.id='busyOv';el.className='busyov';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
    el.innerHTML=`<div class="busycard"><div class="bhead"><i class="bspin big"></i><div><b class="btitle"></b><span class="bsub">A big run takes a second or two — nothing is stuck.</span></div></div><div class="bbar"><i></i></div><ol class="bsteps"></ol></div>`;document.body.appendChild(el);BUSY.el=el;}
  BUSY.steps=[{t:`Reading ${n} file${n===1?'':'s'}`,st:'now',d:''},{t:'Putting each file in its country box',st:'todo',d:''},{t:'Pricing, scoring and drawing your leads',st:'todo',d:''}];
  BUSY.el.querySelector('.btitle').textContent='Working on your files';BUSY.el.classList.remove('ok');BUSY.el.hidden=false;BUSY.on=true;busyRender();}
function busyNote(i,d){if(!BUSY.on)return;BUSY.steps.forEach((s,k)=>{s.st=k<i?'done':k===i?'now':'todo';});if(d!=null)BUSY.steps[i].d=d;busyRender();}
function busyDone(msg){if(!BUSY.on)return;BUSY.steps.forEach(s=>s.st='done');busyRender();BUSY.el.classList.add('ok');BUSY.el.querySelector('.btitle').textContent=msg||'Done';BUSY.on=false;BUSY.hideT=setTimeout(busyClose,900);}
function busyClose(){clearTimeout(BUSY.hideT);BUSY.on=false;if(BUSY.el)BUSY.el.hidden=true;}
function handleFiles(list){const p=keepStill(()=>$('#dropAny'),()=>handleFilesRaw(list));if(p&&typeof p.then==='function')p.then(()=>{if(BUSY.on)busyClose();},()=>{if(BUSY.on)busyClose();});return p;}   /* b225: the drop box stays where it was · b282: the loading card never outlives the drop */
async function handleFilesRaw(list){const arr=[...list];if(!arr.length||!cur)return;
  /* b131 (ShiftTrack, 21 Sep: 13 of 35 runs came back with a blank who). Judging always asked who you are, dropping an export
     never did — so a run could be saved with nobody's name on it, and ShiftTrack cannot say what Suz ran today. The export is
     held, the question is asked, and the drop replays itself the moment a name is set. */
  if(!me()){pendingFiles=arr;needMe();toast('Pick your name first — the export is waiting',true);return;}
  const bigDrop=arr.reduce((n,f)=>n+(f.size||0),0)>=200000;if(bigDrop){busyOpen(arr.length);await busyPaint();}let bi=0;   /* b282 */
  const notes=[],accepted=[],refused=[];let colsPop=null;   /* b203: after the drop, the popup lists every column this file has not got · b260: refused = why each file was not taken */
  if(typeof primeStrip==='function')primeStrip();   /* b214: the ★ Prime rows come off while files land, and go back on below */
  if(files.viewer&&(files.viewer.__alias||files.viewer.__aug))files.viewer=files.viewer.__pure||null;   /* b222 / b223 / b242: the pure Viewer takes new parts */
  for(const file of arr){bi++;if(bigDrop){busyNote(0,`${bi} of ${arr.length} · ${escapeHtml(file.name)}`);await busyPaint();}
    /* b266 (Jack, 5 Oct: "make sure she's putting a fresh export in"): a VA's export made on an earlier day is not taken — Keepa names
       every file with its day. Jack can drop anything (he re-runs old exports on purpose). */
    if(typeof exportIsOld==='function'&&!isJack()&&exportIsOld(file.name)){const dd=exportDay(file.name);notes.push(`${file.name}: not taken — Keepa made it on ${ukDate(dd)}, not today. Export it again now and drop the new file.`);refused.push({f:file.name,why:'old',day:dd});continue;}
    let d;try{d=describeExport(parseCSV(await readFileText(file)));}catch(e){d=null;}
    if(bigDrop&&d)busyNote(0,`${bi} of ${arr.length} · ${escapeHtml(file.name)} · ${d.rows.length.toLocaleString()} products`);
    if(!d){notes.push(file.name+': no data rows — Keepa found 0 products for this filter');refused.push({f:file.name,why:'empty'});continue;}
    const f={name:file.name,rows:d.rows,hasFees:d.hasFees,asins:d.asins,domain:d.domain,hasSince:d.hasSince,missing:d.missing||[],missingAll:d.missingAll||[]};
    /* b203: name the exact columns, in Keepa's own words, instead of "not a full-column export" */
    if(!d.full&&!d.hasFees){const must=(d.missingAll||[]).filter(c=>c.m==='must');notes.push(file.name+': Keepa did not export the columns the rules need. In Keepa press Configure Columns (top left of the table) and tick '+(must.length?must.map(colPath).join(', '):'Product → Title and Categories & Rank → Sales Rank → Drops last 30 days')+((d.missingAll||[]).length>must.length?' — plus the rest of the list under "Keepa columns to tick" below ('+(d.missingAll.length-must.length)+' more)':'')+'. Then export again and drop the new file.');if(!colsPop)colsPop={name:file.name,missing:d.missingAll||[]};if(typeof primeRefused==='function')primeRefused(file,d);
      {const isV0=/productviewer/i.test(file.name),n0=(d.missingAll||[]).length;if(isV0&&typeof vneedSet==='function')vneedSet(d.missingAll||[],cur.key);refused.push({f:file.name,why:'cols',kind:isV0?'viewer':'finder',n:n0,cols:(d.missingAll||[]).slice(0,20).map(c=>c.h)});}   /* b260 */
      continue;}
    /* b209 (Jack, 29 Sep: "everything has to be ticked before a KPF or KPV export goes into the app"): every one of the 49 columns, or the file is refused */
    if(!f.fromKeepa&&(d.missingAll||[]).length){const n=d.missingAll.length,isV=/productviewer/i.test(file.name);
      /* b245 (Jack, 4 Oct: "tell them why the Viewer hasn't [gone in] — say which columns they need to tick") */
      if(isV){viewerRefused={key:cur.key,name:file.name,missing:d.missingAll,at:Date.now()};if(typeof vneedSet==='function')vneedSet(d.missingAll,cur.key);}
      refused.push({f:file.name,why:'cols',kind:isV?'viewer':'finder',n,cols:d.missingAll.slice(0,20).map(c=>c.h)});
      notes.push(isV?`${file.name}: not taken — this is the UK Viewer (merge) file and ${n} column${n===1?' is':'s are'} not ticked IN THE VIEWER. The Viewer has its own column list — ticking them in the Product Finder does not count. Tick in the Viewer's Configure Columns: ${d.missingAll.slice(0,6).map(colPath).join(' · ')}${n>6?' … (the popup lists all '+n+')':''}. Export again, drop the new file.`
        :`${file.name}: not taken — ${n} Keepa column${n===1?' is':'s are'} not ticked (${d.missingAll.slice(0,3).map(colPath).join(' · ')}${n>3?' …':''}). Tick ${n===1?'it':'them'} in Keepa (Configure Columns), export again, drop the new file.`);if(!colsPop)colsPop={name:file.name,missing:d.missingAll};if(typeof primeRefused==='function')primeRefused(file,d);continue;}
    /* b218: while Prime deals are on, every export needs Keepa's Prime price — without it a Prime-only deal is priced at Amazon's normal price */
    if(typeof primeOn==='function'&&primeOn()&&!f.fromKeepa&&!primeHasCol(d.rows)){refused.push({f:file.name,why:'prime-col'});notes.push(`${file.name}: not taken — Prime deals are on, so every export needs the Prime price. In Keepa press Configure Columns and tick New, Prime exclusive → Current (once — Keepa remembers), export again, drop the new file.`);
      if(!colsPop)colsPop={name:file.name,missing:[{g:'New, Prime exclusive',s:'',n:'Current',h:'New, Prime exclusive: Current',m:'prime'}]};if(typeof primeRefused==='function')primeRefused(file,d);continue;}
    /* b214: Jack's Prime switch — a ★ Prime deals file goes in its own box (or is refused / ignored with a note), never over the normal file */
    {const pt=typeof primeTake==='function'?primeTake(file,d,f,notes):false;
      if(pt){if(pt==='cols'){refused.push({f:file.name,why:'prime-col'});if(!colsPop)colsPop={name:file.name,missing:[{g:'New, Prime exclusive',s:'',n:'Current',h:'New, Prime exclusive: Current',m:'prime'}]};}else if(pt===true&&pfiles[d.domain||'UK']&&(pfiles[d.domain||'UK']===f||(pfiles[d.domain||'UK'].name||'').includes(f.name)||(pfiles[d.domain||'UK'].parts||1)>1))accepted.push(f);else refused.push({f:file.name,why:'prime-market'});continue;}}
    accepted.push(f);if(typeof primeAccepted==='function')primeAccepted(file,d);
    if(/productviewer/i.test(file.name)){viewerRefused=null;if(typeof vneedClear==='function')vneedClear('viewer in');}   /* b245: a Viewer file that went in clears the refusal · b260: and her reminder */
    if(cur.rule!==1){if(d.domain&&d.domain!=='UK')notes.push(file.name+': this is a '+d.domain+' export — Rule '+cur.rule+' is UK only');
      /* b37 (Jack, 15 Sep: two variants of Suz's filter, 17 leads shared, 23 not) — a second UK export merges into the first, de-duped by ASIN.
         Clear files starts again. */
      if(files.one&&files.one.name!==file.name){const seen=new Set(files.one.rows.map(r=>(r.ASIN||'').trim()));const add=f.rows.filter(r=>!seen.has((r.ASIN||'').trim()));
        files.one={name:files.one.name+' + '+file.name,rows:files.one.rows.concat(add),hasFees:files.one.hasFees&&f.hasFees,asins:null,domain:f.domain,hasSince:files.one.hasSince&&f.hasSince,merged:(files.one.merged||1)+1};
        notes.push(`${file.name}: ${add.length} new ASIN${add.length===1?'':'s'} merged in · ${f.rows.length-add.length} already in the first export`);continue;}
      files.one=f;continue;}
    if(d.domain&&d.domain!=='UK'){files[d.domain]=partMerge(files[d.domain],f,notes);continue;}
    if(ukOnly()){files.viewer=f;files.UK=null;continue;}   /* UK-only brand: the one UK export is buy side and sell side */
    /* UK: Keepa names the file — ProductViewer is the sell side, ProductFinder is the UK buy list.
       Unnamed files fall back to: the biggest UK file with the fee columns is the sell side. */
    const nm=file.name.toLowerCase(),v=files.viewer;
    /* b249: Replen — the storefront's Finder export is mini-filtered and becomes the UK file (buy side and sell side); its ASINs feed the EU Viewer buttons */
    if(cur.list==='finder'&&nm.includes('productfinder')){const keep=sfMini(f.rows,cur.mini),m=Object.assign({spm:9,sell:7},cur.mini||{});
      if(typeof soldSave==='function')soldSave(f.rows.map(r=>(r.ASIN||'').trim()));   /* b283: everything you have ever sold — the 'you've sold this' boost */
      files.viewer=Object.assign({},f,{rows:keep,asins:keep.map(r=>(r.ASIN||'').trim()).filter(Boolean)});files.UK=null;
      cur._sf=files.viewer.asins.slice();cur._sfMini={all:f.rows.length,kept:keep.length};
      notes.push(`${file.name}: ${f.rows.length.toLocaleString()} products you have sold → ${keep.length.toLocaleString()} kept (sell ${m.spm}+ a month · 90-day sell price £${m.sell}+). This is your UK file. Now press each EU flag above — the Viewer opens with those ${keep.length.toLocaleString()} loaded — export, drop.`);continue;}
    if(nm.includes('productviewer'))files.viewer=partMerge(files.viewer,f,notes);
    else if(nm.includes('productfinder'))files.UK=partMerge(files.UK,f,notes);   /* b222: a second UK Finder export of new products joins the first */
    else if(!v)files.viewer=f;
    else if(f.hasFees&&(!v.hasFees||f.rows.length>=v.rows.length)){files.UK=v;files.viewer=f;}
    else files.UK=f;}
  if(bigDrop)busyNote(1);
  if(typeof primeApply==='function')primeApply();
  dropAlias();   /* b222 */
  if(cur.list==='finder')paintStorefrontRow(cur);   /* b249: the EU buttons follow the list the export produced */
  touched.clear();paintSlots();warn(notes);if(typeof dropNudgeOff==='function')dropNudgeOff();
  /* b260 (Jack: "add in why — the log says why"): the reason for every refused file goes into the line Jack reads on the Activity page */
  if(typeof actLog==='function')actLog('drop',`${arr.length} file${arr.length===1?'':'s'} dropped · ${accepted.length} accepted${refused.length?' · NOT TAKEN: '+refused.map(r=>typeof refusedShort==='function'?refusedShort(r):r.why).join('; '):''}`,undefined,
    {n:arr.length,ok:accepted.length,prime:typeof pfiles!=='undefined'?accepted.filter(f=>Object.values(pfiles).includes(f)).length:0,refused:refused.map(r=>Object.assign({},r,{f:String(r.f).slice(0,60)}))});   /* b219 */
  if(!colsPop){const g=accepted.find(f=>f.missingAll&&f.missingAll.length);if(g)colsPop={name:g.name,missing:g.missingAll};}
  if(colsPop&&colsPop.missing.length)openColsPanel(colsPop.missing,colsPop.name);   /* b203 (Jack, 29 Sep: "the popup should say each one that needs ticking") */
  else if(refused.length&&typeof refusedPop==='function')refusedPop(refused);   /* b260: no column list to show — say why the file was not taken */
  /* b123 (Jack: "we use exports so it should cost 0 tokens"): nothing is asked of Keepa on a drop — the option check is a button Jack presses */
  if(bigDrop){const sell=cur.rule===1?files.viewer:files.one,mk=MARKETS.filter(k=>files[k]).length;busyNote(2,sell?`${(sell.rows||[]).length.toLocaleString()} products${cur.rule===1&&mk>1?` · buy prices in ${mk} countries`:''} — about a second`:'');await busyPaint();}
  try{run();}finally{if(bigDrop){const n=result&&result.out&&!result.stored?result.out.length:null;busyDone(n!=null?`✓ ${n.toLocaleString()} lead${n===1?'':'s'} ready`:(cur&&cur.rule===1&&!files.viewer&&MARKETS.some(k=>files[k])?'✓ Files in — now the UK Viewer':'✓ Files in'));}}}
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
    if(!await uiConfirm(`Ask Keepa what these ${asins.length} products cost in ${EU_MK.join(', ')}?\n\n${cost} tokens${left!=null?` · ${left} left, ${left-cost} after`:''}.\nAmazon's own price only — nothing is flattered.`,{ok:`Spend ${cost} tokens`,tone:'token'}))return;}
  const was=b.textContent;b.disabled=true;
  try{
    const got=await eupFetch(asins,EU_MK,(done,total,mk)=>{b.textContent=`${mk} · ${done}/${total}`;},rate());
    const set=new Set(asins);const sub={name:sellF.name,rows:sellF.rows.filter(r=>set.has((r.ASIN||'').trim())),hasFees:sellF.hasFees,asins,domain:'UK',hasSince:sellF.hasSince,missingAll:sellF.missingAll||[],missing:sellF.missing||[]};
    const NB=euNoBuy({viewer:sub,UK:null,DE:got.DE||null,FR:got.FR||null,IT:got.IT||null,ES:got.ES||null,plugOk:cur.plugOk||null});const R=rule1Compute(NB.F,cur.name,rate(),null);euNoBuyNote(R,NB);   /* b279 */
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
/* b153 (Jack, 25 Sep: "build it then please"): the sign-in panel. Everyone sees whether they are signed in. Jack also gets the Team —
   one email per person, a Send link button each and when they last signed in — and the lock, which will not switch on until he
   is signed in on this browser himself. */
function seenWhen(iso){const d=new Date(iso);const t=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});const days=Math.round((new Date(new Date().toDateString())-new Date(d.toDateString()))/864e5);return days<=0?'today '+t:days===1?'yesterday '+t:d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+t;}
function paintAuthBox(){const el=$('#authBox');if(!el||typeof authedName!=='function')return;
  const u=(typeof authUser==='function')?authUser():null;const jack=isJack();const lk=lockState();const sand=lockSandbox();
  const when=iso=>{if(!iso)return'';const d=new Date(iso);return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});};
  const si=signinsAll();const team=teamAll();
  const me_=u?`<div class="authnow"><i></i><span><b>Signed in</b> as ${escapeHtml(u.name)} <em>${escapeHtml(u.email)}</em></span><button type="button" class="btn ghost sm" id="abOut">Sign out</button></div>`
    :`<div class="authnow off"><i></i><span><b>Not signed in on this computer.</b> Your login and password signs you straight in. Suz and Mera don't sign in here — you send them a link from Team below.</span></div>
      <div class="authsend"><input type="email" id="abEmail" placeholder="you@… — your login email" autocomplete="username" spellcheck="false"><input type="password" id="abPass" placeholder="Password" autocomplete="current-password"><button type="button" class="btn solid sm" id="abSend">Sign in</button></div><div class="wgmsg" id="abMsg"></div>`;
  const allIn=team.every(t=>si[t.name]);
  const teamHtml=!jack?'':`<div class="teambox"><div class="tbh"><b>Team</b><span>Each person's email. The name on everything they mark comes from here, never from a dropdown.</span></div>
    ${team.map(t=>{const s_=si[t.name];return`<div class="trow"><span class="tn"><i class="pdot ${ownCls(t.name)}"></i>${escapeHtml(t.name)}</span>
      <input type="email" class="temail" data-team="${escapeHtml(t.name)}" value="${escapeHtml(t.email||'')}" placeholder="${escapeHtml(t.name.toLowerCase())}@…" autocomplete="off" spellcheck="false">
      ${t.name==='Jack'?`<span class="tpw" title="You sign in with your email and password">Password login</span>`
        :`<span class="tbtns"><button type="button" class="btn solid sm" data-tcopy="${escapeHtml(t.name)}" ${t.email&&u?'':'disabled'} title="${!t.email?'Type their email first':!u?'Sign yourself in first (above)':'Make a one-time sign-in link and copy it — paste it to them in Discord'}">Copy link</button>${t.email&&!authNoInbox(t.email)?`<button type="button" class="btn ghost sm" data-tsend="${escapeHtml(t.name)}" title="Email the link to ${escapeHtml(t.email)} instead">Email it</button>`:''}</span>`}
      <span class="tstat ${s_?'in':''}">${s_?`<i class="tdot"></i><b>Signed in ${when(s_.at)}</b>${[s_.dev,s_.ip?'IP '+escapeHtml(s_.ip):'',s_.seenAt?'seen '+seenWhen(s_.seenAt):''].filter(Boolean).map(x=>`<em>${x}</em>`).join('')}`:'<i class="tdot off"></i>Not signed in yet — Copy link and send it to them'}</span></div>`;}).join('')}
    ${(()=>{const w=team.filter(t=>si[t.name]&&!si[t.name].ip).map(t=>t.name);return w.length?`<div class="tipnote">${w.join(' and ')} signed in before this version — ${w.length===1?'their':'their'} device and IP show the next time ${w.length===1?'they open':'they open'} the app (or press Cmd+R).</div>`:'';})()}
    <div class="wgmsg" id="tMsg"></div></div>`;
  /* b175: sign-in is always required on the live app — the switch is gone, this just says so */
  const lockHtml=!jack?'':`<div class="lockbox on"><div class="lkh"><b>Sign-in required for everyone</b><span class="lkalways">Always on</span></div>
    <p>Anyone not signed in sees the sign-in screen and nothing else — Suz and Mera get in with the link you send them, you with your email and password. ${allIn?'Everyone has signed in.':`${team.filter(t=>!si[t.name]).map(t=>t.name).join(' and ')} ${team.filter(t=>!si[t.name]).length===1?'has':'have'} not signed in yet — send a link.`}
    ${sand?' <em>(This is the test sandbox — the lock never applies here.)</em>':''}</p>
    <details class="lksteps"><summary>Set-up, once (yours)</summary><ol>
      <li><b>You:</b> your login is <code>jack@bdl.local</code> — type it with your password above. No email needed.</li>
      <li><b>Suz and Mera</b> are already in Supabase as <code>suz@bdl.local</code> and <code>mera@bdl.local</code> (you made them, 25 Sep) and already in the Team above. Anyone new: Supabase → Authentication → Users → Add user → <b>Create new user</b> (any email, any password, tick <b>Auto Confirm User</b>), then type it in their Team row.</li>
      <li><b>The link-maker, once</b> — Supabase → <b>Edge Functions</b> → Deploy a new function → <b>Via Editor</b> → name it <code>sourcing-link</code> → paste <code>2026-09-25-SUPABASE-FUNCTION-sourcing-link-PASTE-THIS.ts</code> (Downloads) over everything → <b>Deploy</b>. No keys to copy — Supabase gives it its own.</li>
      <li>Then <b>Copy link</b> next to Suz or Mera, paste it to them in Discord, and they are in. Each link works once, within 24 hours (Supabase → Authentication → Sign In / Providers → Email → Email OTP Expiration = 86400).</li>
      <li>Emailing links instead (only for real inboxes): Authentication → URL Configuration → Redirect URLs → add <code>${escapeHtml(location.origin+location.pathname)}</code>.</li></ol></details></div>`;
  el.innerHTML=me_+teamHtml+lockHtml;
  const out=$('#abOut');if(out)out.addEventListener('click',async()=>{if(await uiConfirm('Sign out of '+u.name+'?',{ok:'Sign out',tone:'warn'})){authSignOut();paintAuthBox();}});
  const sendTo=async(v,msgEl,btn)=>{if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){msgEl.textContent='That does not look like an email address.';msgEl.className='wgmsg bad';return;}
    btn.disabled=true;const was=btn.textContent;btn.textContent='Sending…';msgEl.textContent='';
    try{await authSendLink(v);msgEl.innerHTML=`Sent to <b>${escapeHtml(v)}</b>. It signs in whichever browser it is opened in — so open it on the computer you work on, not your phone.`;msgEl.className='wgmsg good';}
    catch(e){msgEl.textContent=/not allowed|not found|signups/i.test(String(e.message||''))?`${v} is not in Supabase yet — Authentication → Users → Add user → Create new user (tick Auto Confirm User).`:String(e.message||e);msgEl.className='wgmsg bad';}
    btn.disabled=false;btn.textContent=was;};
  /* b156: email + password = in now (Jack's jack@bdl.local); email alone = the one-click link */
  const b=$('#abSend');if(b){const pwIn=$('#abPass');
    const go=async()=>{const v=($('#abEmail').value||'').trim(),pw=pwIn?pwIn.value:'',msgEl=$('#abMsg');
      if(!pw){if(authNoInbox(v)){msgEl.textContent=v+' has no inbox, so a link cannot reach it — type your password too.';msgEl.className='wgmsg bad';return;}sendTo(v,msgEl,b);return;}
      b.disabled=true;b.textContent='Signing in…';msgEl.textContent='';
      try{await authSubmit(v,pw);}catch(e){msgEl.textContent=String(e.message||e);msgEl.className='wgmsg bad';b.disabled=false;b.textContent='Sign in';}};
    b.addEventListener('click',go);

    [$('#abEmail'),pwIn].forEach(x=>x&&x.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();go();}}));}
  el.querySelectorAll('.temail').forEach(i=>i.addEventListener('change',()=>{const list=teamAll().map(t=>t.name===i.dataset.team?Object.assign({},t,{email:i.value.trim().toLowerCase()}):t);
    teamSave(list);toast(i.dataset.team+(i.value.trim()?' — email saved':' — email cleared'));paintAuthBox();}));
  el.querySelectorAll('[data-tsend]').forEach(btn=>btn.addEventListener('click',()=>{const t=teamAll().find(x=>x.name===btn.dataset.tsend);if(t)sendTo(t.email,$('#tMsg'),btn);}));
  /* b156: the link Jack copies and sends himself */
  el.querySelectorAll('[data-tcopy]').forEach(btn=>btn.addEventListener('click',async()=>{const t=teamAll().find(x=>x.name===btn.dataset.tcopy),msgEl=$('#tMsg');if(!t)return;
    btn.disabled=true;const was=btn.textContent;btn.textContent='Making…';msgEl.textContent='';msgEl.className='wgmsg';
    try{const link=await authMakeLink(t.email);
      try{await navigator.clipboard.writeText(link);}catch(e){}
      msgEl.innerHTML=`<b>${escapeHtml(t.name)}'s link is copied</b> — paste it to ${escapeHtml(t.name)} in Discord. It works <b>once</b>, within 24 hours, and signs in whichever browser opens it, so tell ${escapeHtml(t.name)} to open it on the work computer. <input class="tlink" readonly value="${escapeHtml(link)}">`;msgEl.className='wgmsg good';
      const li=msgEl.querySelector('.tlink');if(li){li.addEventListener('focus',()=>li.select());}
      btn.textContent='Copied ✓';setTimeout(()=>{btn.textContent=was;btn.disabled=false;},2200);}
    catch(e){msgEl.textContent=String(e.message||e);msgEl.className='wgmsg bad';btn.textContent=was;btn.disabled=false;}}));
  const tg=$('#lkToggle');if(tg)tg.addEventListener('click',async()=>{const on=!lockState().on;
    if(on){const missing=teamAll().filter(t=>!signinsAll()[t.name]).map(t=>t.name);
      if(!await uiConfirm(`Switch the lock on?\n\nEvery browser that is not signed in will see only the sign-in screen.${missing.length?`\n\n${missing.join(' and ')} ${missing.length===1?'has':'have'} not signed in yet.`:''}`,{ok:'Switch the lock on',tone:'warn'}))return;}
    if(lockSet(on)){toast(on?'Locked — sign-in required for everyone':'Unlocked — anyone with the link can use it again');paintAuthBox();}});}
/* b138: Run via Keepa API — Jack only. Counts first, prices it, asks, then builds the same files a drop would and runs the same rules. */
function paintApiRun(){const row=$('#keepaRow');if(!row||!cur)return;let b=$('#apiRunBtn');
  const ok=isJack()&&typeof apiSelection==='function'&&(isListed(cur)||!!finderLink(cur));
  if(!ok){if(b)b.hidden=true;return;}
  if(!b){b=document.createElement('button');b.id='apiRunBtn';b.type='button';b.className='btn ghost sm apirun';b.addEventListener('click',()=>cur&&isListed(cur)?apiRunStorefront():apiRunSource());row.appendChild(b);}
  b.hidden=false;b.textContent='Run via Keepa API · priced first';b.title='Jack only. Asks Keepa for this filter\'s products and runs the same rules — no export. Counts and prices it before it spends a token.';}
/* b183: the storefront run through Keepa. The Product Viewer route is free; this is the one-button route — every product on the
   storefront priced in the UK today (6 tokens each, cached a day) and in each EU market (1 token each), then Rule 1. */
const VIEWER_DOMAIN={UK:'2',DE:'3',FR:'4',IT:'8',ES:'9'};
/* b184 (Jack, 28 Sep: "add a third thing for Keepa console — like the brands, it finds me profitable only for the ones I want — I've got
   stuff I wanna send over to see if it's profitable; nobody can check it via tokens for now, just me"). A "listed" source is one whose
   ASINs come from the app, not a Keepa search: the storefront (b183) or a pasted list. Both get Viewer buttons and the API button. */
function isListed(s){return!!(s&&(s.list==='storefront'||s.list==='adhoc'||s.list==='finder'));}
/* b249: Replen's mini filter — from the storefront's Finder export keep what is worth pricing abroad: sells 9+ a month (Amazon's "bought in past
   month" or Keepa's rank drops, whichever is higher — Rule 1 does the exact demand check afterwards) and a 90-day sell price of £7+ (Buy Box
   90-day average; FBA or New 90-day average when a listing has no Buy Box average). */
function sfMini(rows,mini){const m=Object.assign({spm:9,sell:7},mini||{}),n=v=>{const x=kNum(v);return x==null||isNaN(x)?0:x;};
  return rows.filter(r=>Math.max(n(r['Monthly Sales Trends: Bought in past month']),n(r['Sales Rank: Drops last 30 days']))>=m.spm
    &&(n(r['Buy Box: 90 days avg.'])||n(r['New, 3rd Party FBA: 90 days avg.'])||n(r['New: 90 days avg.']))>=m.sell);}
/* b202 (Jack, 28 Sep: "3 should work for everyone — it's basically for any filter or brand they want to check, similar to how all the
   brands and filters work"). Everyone gets their own "Check these · <name>" source (VAs never see each other's). It opens as a normal run:
   a free Keepa Product Viewer button per market with the pasted ASINs loaded → export → drop the files → the rules keep what pays, with
   Y / N and the graphs. Keepa tokens stay Jack's: only he sees the API button on that run screen. */
function adhocKey(){const m=me();return !m||isJack()?'adhoc-check':'adhoc-'+m.toLowerCase().replace(/[^a-z0-9]+/g,'-');}
async function adhocCheck(asins,markets){const m=me();if(!m){toast('Pick who you are (top right) first — the check is saved under your name',true);return;}
  asins=[...new Set(asins)];if(!asins.length){toast('No ASINs found in that',true);return;}
  const key=adhocKey();
  let s=srcGet(key)||{key,name:'Check these · '+m,type:'filter',rule:1,cadence:'adhoc',owner:m,status:'active',migV:12,link:'',
    note:'Pasted on the Keepa console → Check a list. Open the Viewer per market, export, drop the files in; Rule 1 keeps what pays.'};
  s.list='adhoc';s.asins=asins;s.markets=markets&&markets.length?markets:['UK'];s.owner=m;s.status='active';s._sf=null;s.name='Check these · '+m;srcSave(s);
  const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b)b.click();
  if(cur&&cur.key===key)clearRun();   /* b226: a new list never sits on the last check's Viewer files */
  await openRun(key);if(cur&&cur.key===key)cur._sf=asins;}
/* b222 (Jack, 1 Oct: "I want it to work like the brands, but I just put in random exports"). Drop & check: any Keepa exports — Finder or
   Viewer, any country — dropped on Keepa console → Check a list open in your own one-off run and are worked exactly like a brand run (Rule 1).
   UK files on their own are priced straight away (a Finder export with every column is its own UK sell side, as on a UK-only brand);
   once an EU file is in, the UK Viewer is needed — the usual Open UK Viewer button. More files keep adding in; Clear files starts again. */
function dropKey(){const m=me();return !m||isJack()?'drop-check':'drop-'+m.toLowerCase().replace(/[^a-z0-9]+/g,'-');}
async function dropCheck(list){const m=me();if(!m){toast('Pick who you are (top right) first — the run is saved under your name',true);return;}
  const key=dropKey();const s=srcGet(key)||{key,type:'filter',rule:1,cadence:'adhoc',migV:12,link:''};
  s.drop=true;s.name='Drop & check · '+m;s.markets=['UK','DE','FR','IT','ES'];s.owner=m;s.status='active';s.link='';
  s.note='Any Keepa exports dropped on Keepa console → Check a list — worked like a brand run (Rule 1).';srcSave(s);
  const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b)b.click();
  /* b226 (Jack, 1 Oct: "dropped an export into 3 — nothing loaded, just went to Brands / Filters, wtf"). Done / back hides the run but keeps it
     as the current one, so this used to skip opening it: the file went into the hidden run, on top of the last check's files, and the list
     showed. Now the run always opens, and a check you had left starts fresh. Still open on screen = the new files add to it. */
  const openNow=!!(cur&&cur.key===key&&!$('#viewRun').hidden);
  if(!openNow){if(cur&&cur.key===key)clearRun();await openRun(key);}
  if(list&&list.length)await handleFiles(list);}
/* the UK Finder file doubles as the UK sell side while no EU file is in (never over a real Viewer) */
/* b242 (Jack, 3 Oct, Bialetti: 3,654 products, a Viewer in 2 parts, only part 1 in → 3 leads; "loads more Bialetti leads than you're making out"):
   on EVERY multi-country Rule 1 run the UK Finder export (all columns) is the UK sell side for its own products, like Drop & check (b223).
   The Viewer is only asked for what the UK file has not got (2,876 of 3,654 on Bialetti → 778, one part), and its row still wins.
   The UK file standing in as the WHOLE sell side before any Viewer stays a Drop & check thing (b222: a brand run waits for its Viewer). */
function dropAlias(){if(!cur||cur.rule!==1)return;const eu=['DE','FR','IT','ES'].some(m=>files[m]);
  if(files.viewer&&files.viewer.__alias)files.viewer=null;
  if(files.viewer&&files.viewer.__aug)files.viewer=files.viewer.__pure;
  if(!cur.drop&&typeof ukOnly==='function'&&ukOnly())return;
  if(cur.drop&&!files.viewer&&files.UK&&files.UK.hasFees&&!eu){files.viewer=Object.assign({},files.UK,{__alias:true,__prime:false,__base:null,name:files.UK.name+' — also the UK sell side'});return;}
  /* b278 (Jack, 6 Oct, Drop & check: UK Finder 3,973 + the four EU Viewers → "all 3,952 products are priced from your UK file — no Viewer
     needed", the Viewer button hidden … and no leads, ever: "think it's broke / crashed"). The screen knew no Viewer was needed; the run
     still waited for one. When the UK file (all columns) has every product the EU files have, it IS the whole sell side — any multi-country run. */
  if(!files.viewer&&files.UK&&files.UK.hasFees&&eu&&!ukOnly()&&!isListed(cur)){const uk=new Set(files.UK.asins||[]);
    if(['DE','FR','IT','ES'].every(m=>!files[m]||(files[m].asins||[]).every(a=>uk.has(a)))){files.viewer=Object.assign({},files.UK,{__alias:true,__allUk:true,__prime:false,__base:null,name:files.UK.name+' — also the UK sell side'});return;}}
  /* b223: the Viewer file + the UK Finder = one sell side (the Viewer's row wins) */
  if(files.viewer&&files.UK&&files.UK.hasFees){const pure=files.viewer;const by=new Map();files.UK.rows.forEach(r=>by.set((r.ASIN||'').trim(),r));pure.rows.forEach(r=>by.set((r.ASIN||'').trim(),r));
    files.viewer=Object.assign({},pure,{__aug:true,__pure:pure,rows:[...by.values()],asins:[...by.keys()].filter(Boolean),name:pure.name+' + your UK file',hasFees:pure.hasFees&&files.UK.hasFees,hasSince:pure.hasSince&&files.UK.hasSince});}}
/* b203: the one-off Keepa column checklist, grouped exactly like Keepa's Configure Columns box; opened from any "columns to tick" link */
function keepaColsHtml(need){const groups=[];KEEPA_COLS.forEach(c=>{let g=groups.find(x=>x.g===c.g);if(!g){g={g:c.g,subs:[]};groups.push(g);}let s=g.subs.find(x=>x.s===c.s);if(!s){s={s:c.s,cols:[]};g.subs.push(s);}s.cols.push(c);});
  return groups.map(g=>`<div class="kcg"><h4>${escapeHtml(g.g)}</h4>${g.subs.map(s=>`<div class="kcs">${s.s?`<span class="kss">${escapeHtml(s.s)}</span>`:`<span class="kss dim">no sub-heading — the plain list</span>`}<span class="kcl">${s.cols.map(c=>`<i class="${need?(need.has(c.h)?'need':'have'):c.m}" title="${escapeHtml(c.h)}">${need&&!need.has(c.h)?'✓':'☐'} ${escapeHtml(c.n)}</i>`).join('')}</span></div>`).join('')}</div>`).join('');}
function keepaColsText(missing){if(missing&&missing.length)return 'TICK THESE IN KEEPA — Configure Columns (top left of the table), then export again:\n'+missing.map(c=>'  ☐ '+colPath(c)).join('\n')+'\n';
  let out='KEEPA COLUMNS TO TICK — once per computer\nIn Keepa press Configure Columns (top left of the table) and tick these, group by group. Quicker: type each name in the "Filter columns…" box.\nEVERY column below must be ticked — a file missing any of them is not taken. The Product Viewer has its own list: tick them there too.\n★ / ◆ = the ones the maths cannot run without\n';let g='';
  KEEPA_COLS.forEach(c=>{if(c.g!==g){g=c.g;out+='\n'+g.toUpperCase()+'\n';}out+='  '+(c.m==='must'?'★ ':c.m==='sell'?'◆ ':'   ')+(c.s?c.s+' → ':'')+c.n+'\n';});return out;}
let viewerRefused=null;   /* b245: the last Viewer export this run refused, and the columns it lacked */
function openColsPanel(missing,fname,opts){opts=opts||{};let ov=$('#colsOv');   /* b260: opts.head / opts.foot — the Viewer-columns reminder for a VA */const need=missing&&missing.length?new Set(missing.map(c=>c.h)):null;ov&&(ov._missing=need?missing:null);
  if(!ov){ov=document.createElement('div');ov.id='colsOv';ov.className='colsov';document.body.appendChild(ov);
    ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-close]'))ov.hidden=true;
      if(e.target.closest('#colsCopy')){navigator.clipboard.writeText(keepaColsText(ov._missing)).then(()=>toast('Copied — paste it into Discord or a note'),()=>toast('Could not copy',true));}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)ov.hidden=true;});}
  ov._missing=need?missing:null;const n=need?missing.length:0;
  ov.innerHTML=`<div class="colsbox ${need?'missing':''}" role="dialog" aria-label="Keepa columns to tick"><div class="colshead"><div>
      ${opts.head?opts.head:need&&/productviewer/i.test(fname||'')?`<h3>Your Product <u>Viewer</u> export was not taken — <span class="bad">${n} column${n===1?' is':'s are'} not ticked in the Viewer</span>.</h3>
      <p class="colswhy"><b>Why:</b> Keepa's Product Viewer keeps <b>its own column list</b>. Ticking a column in the Product Finder does <b>not</b> tick it in the Viewer — that is why your country files went in and this one did not. No Viewer file = no leads.</p>
      <p><b>What to do (once):</b> in the <b>Viewer</b> press <b>Configure Columns</b> (top left, above the table) and tick every <b class="bad">red</b> box below — type its name into the <b>Filter columns…</b> box and tick it. Grey ✓ = already in your export. Keepa remembers. Then <b>Export → All active columns → CSV</b> and drop the new Viewer file here — your leads appear straight after.</p>`
      :need?`<h3>${escapeHtml(fname||'This file')} — <span class="bad">${n} column${n===1?'':'s'} missing</span>. Tick these in Keepa, then export again.</h3>
      <p>In Keepa press <b>Configure Columns</b> (top left, above the table). Every <b class="bad">red</b> box below needs ticking — type its name into the <b>Filter columns…</b> box at the top of that window and tick it. Grey ✓ = already in your export. Keepa remembers, so it is once. Then <b>Export → All active columns → CSV</b> and drop the new file.</p>`
      :`<h3>Keepa columns to tick — once per computer</h3>
      <p>In Keepa press <b>Configure Columns</b> (top left, above the table). Tick everything below, group by group — the tabs along the top of that box are the same groups. Quicker: type each name into the <b>Filter columns…</b> box at the top of it and tick. Keepa remembers, so it is once. <b>${KEEPA_COLS.length} columns.</b></p>`}</div>
      <div class="right"><button class="btn ghost sm" id="colsCopy" type="button">${need?'Copy the missing ones':'Copy the list'}</button><button class="btn ghost sm" data-close="1" type="button">Close</button></div></div>
    ${need?`<div class="colsneed"><b>Needs ticking (${n}) — in Keepa's order:</b>${missing.map(c=>`<i title="${escapeHtml(c.h)}">☐ ${escapeHtml(colPath(c))}</i>`).join('')}</div>`:''}
    <div class="colsgrid">${keepaColsHtml(need)}</div>
    ${opts.foot||''}<p class="colsfoot">${need?`<i class="need">red ☐</i> = needs ticking · <i class="have">grey ✓</i> = already in this export`:`Every one of these ${KEEPA_COLS.length} must be ticked — a file missing any of them is not taken (and the Product Viewer has its own list, tick them there too). <i class="must">red</i> / <i class="sell">amber</i> = the ones the maths cannot run without.`}</p></div>`;ov.hidden=false;ov.scrollTop=0;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-cols]');if(!b)return;e.preventDefault();e.stopPropagation();const k=b.dataset.cols;const f=(k&&k!=='1'&&typeof files!=='undefined')?files[k]:null;openColsPanel(f&&f.missingAll&&f.missingAll.length?f.missingAll:null,f?f.name:'');});
document.addEventListener('DOMContentLoaded',()=>{const ta=$('#kcAsins'),btn=$('#kcCheckBtn'),n=$('#kcAsinN');if(!ta||!btn)return;
  const found=()=>[...new Set((ta.value.toUpperCase().match(/\bB0[0-9A-Z]{8}\b/g)||[]))];
  ta.addEventListener('input',()=>{const a=found();n.textContent=a.length+' ASIN'+(a.length===1?'':'s');btn.disabled=!a.length;});
  document.querySelectorAll('#kcCheck .kccmk input').forEach(c=>c.addEventListener('change',()=>c.closest('label').classList.toggle('on',c.checked)));
  btn.addEventListener('click',()=>{const mk=['UK'].concat([...document.querySelectorAll('#kcCheck .kccmk input:checked')].map(c=>c.value).filter(v=>v!=='UK'));adhocCheck(found(),mk);});});
/* b222: Drop & check — the zone on Keepa console → Check a list */
document.addEventListener('DOMContentLoaded',()=>{const z=$('#kcDrop'),inp=$('#kcDropIn');if(!z||!inp)return;
  z.addEventListener('click',()=>inp.click());z.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click();}});
  inp.addEventListener('change',e=>{const f=[...e.target.files];e.target.value='';if(f.length)dropCheck(f);});
  ['dragenter','dragover'].forEach(t=>z.addEventListener(t,e=>{e.preventDefault();e.stopPropagation();z.classList.add('over');}));
  z.addEventListener('dragleave',()=>z.classList.remove('over'));
  z.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();z.classList.remove('over');const f=[...(e.dataTransfer&&e.dataTransfer.files||[])];if(f.length)dropCheck(f);});
  /* b226: a file copied in Finder and pasted (Cmd+V) anywhere on Check a list goes the same way; pasted TEXT still fills the ASIN box */
  const tab=$('#kcCheck');if(tab)tab.addEventListener('paste',e=>{const f=[...(e.clipboardData&&e.clipboardData.files||[])].filter(x=>/\.csv$/i.test(x.name)||/csv/.test(x.type));if(!f.length)return;e.preventDefault();dropCheck(f);});});
async function sfAsins(){if(cur&&cur._sf&&cur._sf.length)return cur._sf;if(cur&&cur.list==='finder')return cur._sf||[];if(cur&&cur.list==='adhoc'){cur._sf=(cur.asins||[]).slice();return cur._sf;}let list=[];
  try{if(typeof cloudReadable==='function'&&cloudReadable()){const rows=await cloudGetAll('bdl_my_shelf','select=asin,on_now');list=rows.sort((a,b)=>(b.on_now?1:0)-(a.on_now?1:0)).map(r=>r.asin);}}catch(e){}
  if(!list.length&&typeof audState!=='undefined')list=[...audState.mineNow,...[...audState.mineEver].filter(a=>!audState.mineNow.has(a))];
  if(cur)cur._sf=list;return list;}
async function paintStorefrontRow(s){const row=$('#keepaRow');if(!row)return;
  /* b249: list:'finder' — step 1 is the Finder export of the storefront; once it is in, the EU flags open the Viewer with what the mini filter kept */
  if(s.list==='finder'){const kept=(cur&&cur.key===s.key&&cur._sf)||[],mi=cur&&cur._sfMini,m=Object.assign({spm:9,sell:7},s.mini||{}),P=kept.length?viewerParts(kept):[];
    row.innerHTML=`<span class="lab">1 · your storefront:</span><a href="${rollRankMonth(s.link||'')}" data-mk="viewer" target="_blank" rel="noopener" title="Keepa Product Finder — everything your storefront has ever sold. Rows per page biggest, Export → All active columns → CSV, drop the file here.">${FLAG.UK} Everything I’ve sold · Product Finder<span class="tick">✓</span>${ICONS.ext}</a>`
      +(kept.length?`<span class="lab" style="margin-left:8px">2 · the ${kept.length.toLocaleString()} kept, in the Product Viewer:</span>`+s.markets.filter(k=>k!=='UK').map(k=>P.map((part,i)=>`<a href="${keepaLink(part,VIEWER_DOMAIN[k])}" data-mk="${k}" target="_blank" rel="noopener" title="Keepa Product Viewer on ${k} with ${part.length.toLocaleString()} of the kept products loaded — Export → All active columns → CSV, drop the file here">${FLAG[k]} ${k}${P.length>1?' '+(i+1)+'/'+P.length:''}<span class="tick">✓</span>${ICONS.ext}</a>`).join('')).join('')
          +`<span class="mkhint">${mi?`<b>${mi.all.toLocaleString()}</b> products in your export → <b>${mi.kept.toLocaleString()}</b> kept (sell ${m.spm}+ a month · 90-day sell price £${m.sell}+) · ${(mi.all-mi.kept).toLocaleString()} left out. `:''}Your export is the UK file — no UK Viewer needed. One Viewer export per EU flag; drop each one here.</span>`
        :`<span class="mkhint">Export it (rows per page biggest → Export → All active columns → CSV) and drop it here. The app keeps what sells ${m.spm}+ a month with a 90-day sell price of £${m.sell}+ — then the DE / FR / IT / ES buttons appear with those products loaded.</span>`)
      +`<span class="apihint">or</span>`;
    paintApiRun();paintSlots();renderGuide();return;}
  row.innerHTML='<span class="lab">Loading your storefront…</span>';
  const asins=await sfAsins();if(!cur||cur.key!==s.key)return;
  if(!asins.length){row.innerHTML=s.list==='adhoc'?'<span class="nolinkmsg">No ASINs on this check yet — paste some on the Keepa console → Check a list.</span>':'<span class="nolinkmsg">Your storefront list is empty here — OA Overview keeps it (bdl_my_shelf); open this on the live app, signed in.</span>';renderGuide();return;}
  const per=250,batches=Math.ceil(asins.length/per);
  row.innerHTML=`<span class="lab">Open the Product Viewer with ${s.list==='adhoc'?'these':'your storefront ·'} ${asins.length.toLocaleString()} products:</span>`+s.markets.map(m=>Array.from({length:batches},(_,i)=>{const part=asins.slice(i*per,(i+1)*per);
    return`<a href="${keepaLink(part,VIEWER_DOMAIN[m])}" data-mk="${m==='UK'?'viewer':m}" target="_blank" rel="noopener" title="Keepa Product Viewer on ${m} with ${part.length} of your products loaded — export all columns, drop the file here">${FLAG[m]} ${m}${batches>1?' '+(i+1)+'/'+batches:''}<span class="tick">✓</span>${ICONS.ext}</a>`;}).join('')).join('')
    +`<span class="apihint">or</span>`;
  paintApiRun();paintSlots();renderGuide();}
async function apiRunStorefront(){if(!cur||!isJack())return;const b=$('#apiRunBtn');const eu=(cur.markets||[]).filter(m=>m!=='UK');
  b.disabled=true;b.textContent='Counting…';
  try{const asins=await sfAsins();if(!asins.length){toast('Your storefront list is empty — OA Overview has not saved it yet',true);return;}
    const left=await eupBalance();const cache=apiCache(),now=Date.now();let cached=0;asins.forEach(a=>{const k=cache['2|'+a];if(k&&now-k.at<API_CACHE_H*3600e3)cached++;});
    const est=(asins.length-cached)*API_PER_PRODUCT+cached+eupCost(asins,eu);
    if(left!=null&&left-est<API_FLOOR){toast(`Balance ${left.toLocaleString()} is too low for your storefront (needs about ${est.toLocaleString()}, floor ${API_FLOOR}) — it refills 21 a minute. The Viewer buttons are free.`,true);return;}
    if(!await uiConfirm(`${cur.list==='adhoc'?'Price these through Keepa?':'Price your whole storefront through Keepa?'}\n\n${asins.length.toLocaleString()} products · UK today${eu.length?' plus '+eu.join(', '):''} · about ${est.toLocaleString()} tokens\nBalance ${left!=null?left.toLocaleString():'?'} → about ${left!=null?(left-est).toLocaleString():'?'}`,{ok:`Spend ~${est.toLocaleString()} tokens`,tone:'token'}))return;
    const R=await apiRows(asins,2,(n,tot)=>{b.textContent=`Fetching ${n}/${tot} products…`;});
    const stamp=new Date();const nm=`Keepa API · ${cur.list==='adhoc'?'check':'storefront'} · ${stamp.getDate()}/${String(stamp.getMonth()+1).padStart(2,'0')} ${String(stamp.getHours()).padStart(2,'0')}:${String(stamp.getMinutes()).padStart(2,'0')}`;
    const f={name:nm,rows:R.rows,hasFees:true,asins:R.rows.map(r=>r.ASIN),domain:'UK',hasSince:true,missing:[],fromKeepa:true};
    clearRun();files.viewer=f;files.UK=null;
    if(eu.length){const got=await eupFetch(f.asins,eu,(done,tot,mk)=>{b.textContent=`${mk} prices · ${done}/${tot}`;},rate());eu.forEach(m=>{files[m]=got[m];});}
    touched.clear();paintSlots();warn([`${nm}: ${R.rows.length.toLocaleString()} of ${asins.length.toLocaleString()} ${cur.list==='adhoc'?'pasted':'storefront'} products from Keepa · about ${est.toLocaleString()} tokens`]);run();}
  catch(e){toast('Keepa run failed — '+(e&&e.message||e),true);}
  finally{b.disabled=false;b.textContent='Run via Keepa API · priced first';}}
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
    if(!await uiConfirm(msg+(plan.topUp.length?`\n\nEvery product that comes out as a LEAD is then pulled in full (${API_PER_PRODUCT} tokens each) so its live Buy Box and FBA prices are today's.`:''),{ok:'Run it through Keepa',tone:'token'}))return;
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
/* b231: done = answered TODAY (a VA's Seen too) or in this sitting — an old verdict never makes a New / Better lead done.
   b232 (Jack, 1 Oct: "If X1 qualifies for the filter being worked and needs reviewing, SHOW IT — don't hide it from Mera because Suz saw it
   somewhere else"): only an answer by someone who works THIS filter ticks it off — its owner (both VAs for "VAs", Jack for an unowned one)
   or you. Another VA's answer on another filter still shows on the row; it just does not count here. */
function filterPeople(src){const o=src&&src.owner;const p=new Set(o==='VAs'?['Mera','Suz']:!o||o===NO_OWNER?['Jack']:[o]);if(me())p.add(me());return p;}
const PEOPLE={};let peopleTick=false;   /* one look-up per source per paint — the Brands list sorts by To review */
function peopleOf(key){if(!peopleTick){peopleTick=true;queueMicrotask(()=>{for(const k in PEOPLE)delete PEOPLE[k];peopleTick=false;});}
  return PEOPLE[key]||(PEOPLE[key]=filterPeople(srcGet(key)));}
/* b233: answered on/after `day` by one of P — the answer itself, or a looked-at stamp (Open in Keepa / Done) on a real answer — or by you today */
const dayOf=x=>x?stamp(new Date(x)).slice(0,10):'';
function answeredSince(a,v,day,P){if(!v||!v.v)return false;if(v.at&&dayOf(v.at)>=day&&P.has(v.who||''))return true;
  const sn=v.state&&v.state.seen;if(sn)for(const w in sn){if(P.has(w)&&sn[w]&&dayOf(sn[w].at)>=day)return true;}
  return myToday().has(a);}
/* b268 (Jack, 5 Oct: "if they do it and then I export and run it — will my review just be stuff that is better or new, or would my review still
   be all of it?"). New — yes. Better — it was hidden: a lead the VA looked at this morning that is cheaper again by the time Jack runs it carried
   "↑ better since Mera looked" but still counted as done, because she looked TODAY. A lead that got better than at the last look is to review
   again, whenever that look was — To review is new or better (b231). Opening it / ✓ Done stamps the new price, so it is done again. */
function doneToday(o){const v=verdGet(o.ASIN);if(!v||!v.v)return false;if(touched.has(o.ASIN))return true;
  const L=o.QUEUE!==undefined?o:leadRow(o.ASIN);if(L&&L.QUEUE==='better'&&L.sinceVerdict)return false;   /* callers that pass {ASIN} get the lead's own row */
  return answeredSince(o.ASIN,v,today(),filterPeople(cur));}
function leadRow(a){if(!result||!result.out)return null;if(!result._byA||result._byA.n!==result.out.length){const m={};result.out.forEach(x=>{m[x.ASIN]=x;});result._byA={n:result.out.length,m};}return result._byA.m[a]||null;}
/* who did it today — for the "25 done (Suz 24 · Jack 1)" headline */
function doneBy(o){if(myToday().has(o.ASIN)||touched.has(o.ASIN))return me()||'?';const v=verdGet(o.ASIN)||{},P=filterPeople(cur),t=today();
  if(v.at&&dayOf(v.at)===t&&P.has(v.who||''))return v.who;const sn=v.state&&v.state.seen;if(sn)for(const w in sn){if(P.has(w)&&sn[w]&&dayOf(sn[w].at)===t)return w;}return v.who||'?';}
/* b233: what carries over — the To review list of this filter's last run before today, and "done since" = answered by this filter's people since that run */
function carryFor(src){if(!src)return null;const t=today();const prev=runsFor(src.key).filter(r=>(r.day||String(r.at).slice(0,10))<t).pop();
  if(!prev||!prev.queue||!prev.queue.length)return null;const day=prev.day||String(prev.at).slice(0,10),P=new Set(filterPeople(src));if(prev.who)P.add(prev.who);
  const V=verdAll();return{q:new Set(prev.queue),day,done:a=>answeredSince(a,V[a],day,P)};}
function paintJudged(){const tb=document.querySelector('#results .toolbar');if(!tb||!result)return;let el=$('#judgedPill');if(!el){el=document.createElement('span');el.id='judgedPill';el.className='jpill';   /* b152: was 'judged' — the same class every judged AUDIT row carries, so each judged row picked up this pill's mono font, grey colour and 11px size */tb.insertBefore(el,$('#moreMenu')||null);}   /* b137: pill sits before More */
  const all=visible();const done=all.filter(o=>view.status==='REVIEW'?doneToday(o):!!(verdGet(o.ASIN)||{}).v).length;   /* b211: a lead back in the queue (new, or better since its old mark) is not judged until someone answers it again */const finished=all.length>0&&done===all.length;
  /* b140: when the last one is judged the pill says so and the Done button lights up — the VA should not have to count */
  /* b260: the button that lights up when everything is answered is ✓ Done (b248) — it used to light Next due, which the leave popup then blocked */
  {const r=typeof todayRun==='function'?todayRun():null,needs=!!(r&&!r.done);el.classList.toggle('all',finished);
    const nx=$('#runNext2');if(nx)nx.classList.toggle('ready',finished&&!result.stored&&!needs);const dn=$('#doneSel');if(dn)dn.classList.toggle('ready',finished&&!result.stored&&needs);
    el.innerHTML=finished?`<b>${done}</b> of ${all.length} judged ✓<i title="${needs?'Everything on this list has an answer — press ✓ Done (next to Open all in Keepa) to finish the filter':'Everything on this list has an answer — Next due takes you to the next filter'}">all done</i>`
      :`<b>${done}</b> of ${all.length} judged<i title="Click a row, then Y / N / M · ↓ ↑ move · Esc clears">Y · N · M · ↓ ↑</i>`;}}
let keysReady=false;
function setupKeys(){if(keysReady)return;keysReady=true;
  document.addEventListener('keydown',e=>{const t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;if(e.metaKey||e.ctrlKey||e.altKey)return;
    /* b228: only while the lead list is ON SCREEN. A run you left keeps its results, and pressing N on the Brands list used to judge its
       active lead No (synced), and the arrow keys stopped scrolling every page. offsetParent is null when any parent is hidden. */
    const res=$('#results');if(!res||res.hidden||!result||res.offsetParent===null)return;const k=e.key.toLowerCase();
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
  const pOn=typeof primeOn==='function'&&primeOn();
  const R=cur.rule===1?(()=>{const NB=euNoBuy(Object.assign({},files,{prime:pOn,plugOk:cur.plugOk||null}));const X=rule1Compute(NB.F,cur.name,rate(),null);euNoBuyNote(X,NB);return X;})():rule2Compute(f.rows,factsAll(),{vatFor:vatFor,rule:cur.rule,prime:pOn});   /* b123: the normal run — unknown-share options are leads on the family's drops */
  const need=[];R.out.forEach(o=>{const r=by[o.ASIN];if(r&&shareUnknown(r)&&!need.includes(o.ASIN))need.push(o.ASIN);});
  let asked=0,confirmed=0;const ask=[];
  need.forEach(a=>{const c=cache[a];if(c&&now-c.at<UNK_TTL_H*3600e3){optionStamp(by[a],c);if(c.n>=50||(c.last&&c.last.n>0))confirmed++;}else ask.push(a);});
  for(let i=0;i<ask.length;i+=100){const part=ask.slice(i,i+100);
    const r=await fetch(WORKER+'/keepa?path=product&domain=2&stats=30&asin='+part.join(','));const j=await r.json();if(j.error)break;   /* history on: monthlySoldHistory only comes with it, same 1 token */
    (j.products||[]).forEach(p=>{const c=optionFromKeepa(p);cache[p.asin]=c;optionStamp(by[p.asin],c);asked++;if(c.n>=50||(c.last&&c.last.n>0))confirmed++;});}
  lsSet(UNK_KEY,cache);if(asked&&typeof paintTokens==='function')paintTokens();return{asked,confirmed,cached:need.length-ask.length};}
function warn(lines){const w=$('#warnRun');if(!lines||!lines.length){w.classList.remove('show');w.innerHTML='';return;}
  w.innerHTML=lines.map(l=>'<div>⚠ '+escapeHtml(l)+'</div>').join('');w.classList.add('show');}
function removeFile(k){if(typeof primeStrip==='function')primeStrip();if(k==='viewer'&&files.viewer&&files.viewer.__alias)k='UK';if(k==='viewer'&&files.viewer&&files.viewer.__aug)files.viewer=files.viewer.__pure;files[k]=null;if(typeof primeApply==='function')primeApply();dropAlias();paintSlots();run();}
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
  return `<b>Export error — ${escapeHtml(f.name)} is missing ${n} column${n===1?'':'s'} the demand rules need.</b> In Keepa press Configure Columns (top left of the table) and tick: ${f.missing.map(h=>escapeHtml(colPathH(h))).join(' · ')}. Then export again and drop the new file here. Without them every variation would be judged on its family's figures, so the run does not start.`;}
function paintSlots(){if(!cur)return;const r1=cur.rule===1;
  const chip=(k,label,f,need)=>{const cut=f&&!f.fromKeepa&&onePage(f.rows.length);
    /* b110: the UK sell-side file carries the variation / review / last-known columns the demand ladder needs. Say what is missing on the file. */
    const ukSide=k==='viewer'||k==='one'||(k==='UK'&&ukOnly());const miss=(ukSide&&f&&!f.fromKeepa&&f.missing&&f.missing.length)?f.missing:null;
    /* b203: the other columns the rules read that this file has not got — a warning, not a stop; names them the way Keepa's box does */
    const more=(f&&!f.fromKeepa&&f.missingAll)?f.missingAll.filter(c=>c.m!=='must'&&!(miss&&miss.includes(c.h))&&!(c.m==='sell'&&!ukSide)):[];
    /* b258 (Jack, 4 Oct: "should show 2 links dropped — I dropped in 2 UK Product Finder links"): two exports in one slot read as one cut-off name.
       Now the chip says how many files and names each one short — "2 files · ProductFinder (2) · ★ ProductFinder (3)" — full names on hover. */
    const parts=f?String(f.name||'').split(' + '):[],short=x=>String(x).replace(/KeepaExport-\d{4}-\d{2}-\d{2}-/,'').replace(/\.csv$/i,'');
    const nm=!f?need:parts.length>1?`<b>${parts.length} files</b> · ${parts.map(x=>escapeHtml(short(x))).join(' · ')}`:escapeHtml(f.name);
    return `<div class="fchip ${f?'ok':''}${cut||miss?' cut':''}${parts.length>1?' multi':''}"><span class="dot"></span><span class="k">${label}</span><span class="n" title="${f?escapeHtml(parts.join('\n')):''}">${nm}</span><span class="r">${f?f.rows.length.toLocaleString()+' rows':''}</span>${f?`<button class="x" data-rm="${k}" title="Remove">×</button>`:''}</div>`
      +(cut?`<div class="cutwarn"><b>Exactly ${f.rows.length} rows — this may be one page, not the whole search.</b> Keepa only exports the page on screen. Set rows per page to the maximum at the bottom of the Keepa table, then export again.</div>`:'')
      +(miss?`<div class="cutwarn err"><b>Export error — missing ${miss.length} column${miss.length===1?'':'s'} the demand rules need. The run will not start.</b> In Keepa press Configure Columns (top left of the table) and tick: ${miss.map(h=>escapeHtml(colPathH(h))).join(' · ')}. Then export again.</div>`:'')
      +(more.length?`<div class="cutwarn"><b>${more.length} column${more.length===1?'':'s'} the rules read ${more.length===1?'is':'are'} not in this file — leads can be missed or priced wrong.</b> In Keepa: Configure Columns → tick ${more.slice(0,5).map(c=>escapeHtml(colPath(c))).join(' · ')}${more.length>5?` · and ${more.length-5} more`:''} — <button type="button" class="linkbtn" data-cols="${k}">show all ${more.length} to tick</button>. Then export again.</div>`:'');};
  let h='';
  if(r1&&ukOnly()){h+=chip('viewer','🇬🇧 UK',files.viewer,'UK Product Finder export · required (no Viewer needed)');}
  else if(r1&&cur.drop){const any=MARKETS.some(m=>files[m])||!!files.viewer;   /* b222: Drop & check lists only what was dropped */
    MARKETS.filter(m=>files[m]).forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],'');});
    if(files.viewer&&!files.viewer.__alias)h+=chip('viewer','Viewer',files.viewer,'');
    else if(!any)h+=chip('viewer','Files',null,'drop any Keepa exports — Finder or Viewer, any country');
    else if(!files.viewer)h+=chip('viewer','Viewer',null,'UK Product Viewer · needed once an EU file is in');
    paintRunMk();}
  else if(r1){cur.markets.filter(m=>!(isListed(cur)&&m==='UK')).forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],isListed(cur)?'Viewer export · expected':'Finder export · expected');});
    MARKETS.filter(m=>!cur.markets.includes(m)&&files[m]).forEach(m=>{h+=chip(m,FLAG[m]+' '+m,files[m],'');});
    h+=chip('viewer',cur.list==='finder'?FLAG.UK+' UK':'Viewer',files.viewer,cur.list==='finder'?'your storefront export (Product Finder) · required':'UK Product Viewer · required');}
  else h+=chip('one','Export',files.one,'UK Product Finder · required');
  $('#fileChips').innerHTML=h;
  /* the ASIN hand-off: every ASIN the Finders found, minus the ones the Viewer already covers */
  const merged=new Set();MARKETS.forEach(k=>{if(files[k])files[k].asins.forEach(a=>merged.add(a));});
  const covered=new Set(files.viewer?files.viewer.asins:[]);
  /* b223 (Jack, 1 Oct: "I still need a Viewer"): on Drop & check a UK Finder with every column IS the UK sell side for its own products — the
     Viewer is asked only for the EU products it has not got. The Viewer file then joins it (dropAlias), the Viewer's row winning. */
  const ukCov=(files.UK&&files.UK.hasFees&&!(typeof ukOnly==='function'&&ukOnly()))?new Set(files.UK.asins||[]):null;   /* b242: every multi-country run, not just Drop & check */const need=ukCov?[...merged].filter(a=>!ukCov.has(a)):[...merged];
  if(ukCov)ukCov.forEach(a=>covered.add(a));const missing=need.filter(a=>!covered.has(a));
  const P=viewerParts(need.sort()),pIn=P.map(p=>partDone(p,covered)),pNext=pIn.indexOf(false);   /* b215 */
  /* b215: the UK Viewer button only ticks when every part is in */
  {const n=files.one?String(files.one.name||'').split(' + ').length:0;document.querySelectorAll('#keepaRow a[data-l2]').forEach(a=>a.classList.toggle('done',n>+a.dataset.l2));}   /* b234: one tick per export dropped */
  document.querySelectorAll('#keepaRow a[data-mk]').forEach(a=>a.classList.toggle('done',a.dataset.mk==='viewer'&&!isListed(cur)?!!files.viewer&&(P.length<2||pNext<0):!!files[a.dataset.mk]));
  const bar=$('#asinBar');bar.hidden=!r1||ukOnly()||isListed(cur);bar.classList.toggle('idle',!merged.size);$('#asinCopy').disabled=!merged.size;$('#asinOpen').disabled=!merged.size;
  if(r1&&!merged.size){bar.classList.remove('done');$('#asinMsg').innerHTML=`<b>Step 4 happens here.</b> Drop the Finder exports above and this becomes one button that opens the UK Product Viewer with every ASIN merged and de-duplicated — no copying, no Keepa console.`;$('#asinN').textContent='0';bar._all=[];}
  if(r1&&merged.size&&P.length>1&&pNext>=0){bar.classList.remove('done');const nIn=pIn.filter(Boolean).length;
    $('#asinMsg').innerHTML=`<b>${merged.size.toLocaleString()}</b> ASINs — too many for one Keepa export, so the Viewer goes in <b>${P.length} parts</b> of about ${P[0].length.toLocaleString()}. `
      +P.map((p,i)=>`<span class="vpart${pIn[i]?' in':i===pNext?' now':''}">${pIn[i]?'✓ ':''}Part ${i+1}</span>`).join(' ')
      +(nIn?` · ${covered.size.toLocaleString()} products in so far`:' · press the button (the Viewer opens with that part loaded), Load list, export all columns, drop it here — then the next part');
    $('#asinN').textContent=need.length.toLocaleString();bar._all=need.sort();$('#asinOpenLab').textContent=`Open part ${pNext+1} of ${P.length} in the UK Viewer`;}
  else if(r1&&merged.size&&ukCov&&!need.length){bar.classList.add('done');$('#asinOpenLab').textContent='Open UK Product Viewer with them loaded';
    $('#asinMsg').innerHTML=`all <b>${merged.size.toLocaleString()}</b> products are priced from your UK file — no Viewer needed`;$('#asinN').textContent='0';bar._all=[];}
  else if(r1&&merged.size){bar.classList.toggle('done',!missing.length);$('#asinOpenLab').textContent='Open UK Product Viewer with them loaded';
    const ukTxt=ukCov?` — the other <b>${(merged.size-need.length).toLocaleString()}</b> are priced from your UK file`:'';
    $('#asinMsg').innerHTML=!missing.length?`all ${need.length.toLocaleString()} ASINs covered by the Viewer${ukTxt}`
      :(files.viewer&&!files.viewer.__alias)?`Viewer covers ${(covered.size-(ukCov?ukCov.size:0)).toLocaleString()} of ${need.length.toLocaleString()} — the other <b>${missing.length.toLocaleString()}</b> aren't listed on Amazon UK, nothing to do${ukTxt}`
      :ukCov?`<b>${need.length.toLocaleString()}</b> of ${merged.size.toLocaleString()} ASINs need the UK Viewer${ukTxt} — press the button, export all columns, drop that here`
      :`<b>${merged.size.toLocaleString()}</b> ASINs merged and de-duplicated from ${MARKETS.filter(k=>files[k]).length} file${MARKETS.filter(k=>files[k]).length===1?'':'s'} — now open the UK Product Viewer with them loaded, export all columns, drop that here`;
    $('#asinN').textContent=need.length.toLocaleString();bar._all=need.sort();}
  else if(bar){bar._all=[];$('#asinOpenLab').textContent='Open UK Product Viewer with them loaded';}
  /* b258 (Jack's Drop & check: "all 108 are priced from your UK file — no Viewer needed" next to "Copy 0 ASINs" and an Open button): nothing to
     open, so no buttons */
  {const none=r1&&merged.size&&ukCov&&!need.length&&!(P.length>1&&pNext>=0);$('#asinCopy').hidden=!!none;$('#asinOpen').hidden=!!none;}
  paintEu();
  const since=files.viewer?files.viewer.hasSince:(files.one?files.one.hasSince:true);$('#sinceNote').hidden=since;
  if(typeof paintPrime==='function')paintPrime();}
/* b76 (Jack, 17 Sep): a list of EU alert ASINs has no Finder exports behind it. Drop the UK Viewer
   and buy the EU buy-side from Keepa instead — 1 token per ASIN per market, measured on his account.
   The cost is shown BEFORE anything is spent, and a cached market costs nothing to run again. */
function euWant(){if(!cur||cur.rule!==1||!files.viewer)return[];
  return (cur.markets||[]).filter(m=>m!=='UK'&&!files[m]);}
function paintEu(){const bar=$('#euBar');if(!bar)return;
  const want=euWant(),asins=files.viewer?files.viewer.asins:[];
  bar.hidden=!want.length||!asins.length||!isJack();   /* b260: it spends Keepa tokens — Jack only (a VA saw it whenever a country file was missing) */
  if(bar.hidden)return;
  const cost=eupCost(asins,want),free=asins.length*want.length-cost;
  $('#euHead').textContent=cost?`Buy the EU prices · ${cost.toLocaleString()} token${cost===1?'':'s'}`:'EU prices are already cached';
  $('#euMsg').innerHTML=`${asins.length.toLocaleString()} ASINs × ${want.length} market${want.length===1?'':'s'} (${want.join(', ')})`
    +(free?` · ${free.toLocaleString()} already cached, free`:'')
    +` — Amazon's own price only, no Subscribe &amp; Save, so profit is never flattered`;
  const b=$('#euGo');b.disabled=false;b.querySelector('.lab').textContent=cost?'Get EU prices':'Load from cache';}

async function euRun(){const want=euWant(),asins=files.viewer?files.viewer.asins:[];
  if(!want.length||!asins.length||!isJack())return;
  const cost=eupCost(asins,want),b=$('#euGo'),lab=b.querySelector('.lab');
  if(cost){const left=await eupBalance();
    if(left!=null&&left<cost){toast(`Only ${left} Keepa tokens left, this needs ${cost}`,true);return;}
    if(!await uiConfirm(`Buy EU prices for ${asins.length} ASINs across ${want.join(', ')}?\n\n`
      +`${cost} Keepa tokens${left!=null?` · ${left} left, ${left-cost} after`:''}.\n`
      +`Cached for 12 hours, so running this again today is free.`,{ok:`Spend ${cost} tokens`,tone:'token'}))return;}
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
    o.BuyType=s.bt||'';o.stamp=e.stamp;o._prev=e.prev||null;if(s.sp)o['Prep fee £']=0;rows.push(o);});   /* b219 · b274: PREP OFF survives the saved view */
  rows.sort((a,b)=>(b.Score||0)-(a.Score||0));rows.forEach((o,i)=>o['#']=i+1);return{rows,last};}
function runStored(){if(!cur)return false;const {rows,last}=storedRows(cur.key,cur.rule);if(!rows.length)return false;
  const prevMap={};rows.forEach(o=>{if(o._prev&&o._prev.state)prevMap[o.ASIN]={state:o._prev.state,stamp:o._prev.stamp};});
  const rl=runLast(cur.key)||{};const n=rl.rowsIn||rows.length;const rst=rl.st||{};   /* b127: runs saved from now on carry their own counts */
  const R={rule:cur.rule,out:rows,all:rows,dropped:[],reasons:{},blacklisted:[],floored:0,stored:true,at:last,
    st:cur.rule===1?{viewer:rst.viewer||n,demand:rst.demand==null?'—':rst.demand,sell:rst.sell==null?'—':rst.sell,buy:rst.buy==null?'—':rst.buy,kept:rows.length,bbHiCol:true,capped:rst.capped||0}
      :{rows:rst.rows||n,priced:rst.priced==null?'—':rst.priced,demand:rst.demand==null?'—':rst.demand,kept:rows.length}};
  R.gone=applyQueue(R.out,R.rule,prevMap,verdAll(),carryFor(cur)).filter(([a])=>!blAll()[a]);R.prevMap=prevMap;backNote(R);const pst=Object.values(prevMap).map(p=>p.stamp).filter(Boolean).sort();R.prevStamp=pst.length?pst[pst.length-1]:null;result=R;
  renderResults();renderGuide();return true;}
function clearRun(){pillOff();viewerRefused=null;if(cur&&cur.list==='finder'){cur._sf=null;cur._sfMini=null;setTimeout(()=>{if(cur&&cur.list==='finder')paintStorefrontRow(cur);},0);}SLOTS.forEach(k=>files[k]=null);files.one=null;if(typeof primeClear==='function')primeClear();result=null;lastSig='';$('#fileIn').value='';view.sel.clear();view.page=1;touched.clear();blPick=null;
  warn([]);$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;if(cur){paintSlots();renderGuide();if($('#doneEmpty'))paintDoneEmpty();}}

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
/* b275: what was picked on each shape — worked out once per facts store, not once per row (it walks all ~7,000 products) */
const LVL_C=new WeakMap();function lvlStatsFor(F,shape){let m=LVL_C.get(F);if(!m){m={};LVL_C.set(F,m);}return m[shape]||(m[shape]=lvlStats(F,shape));}
function lvlPicker(asin,sellNow){if(typeof sellLevels!=='function')return'';const r=rawRowOf(asin);if(!r)return'';const lv=sellLevels(r);if(!lv.length)return'';
  const fact=factGet(asin);const shape=sellShape(r);const st=shape?lvlStatsFor(factsAll(),shape):{n:0};
  const chips=lv.map(x=>{const on=fact.lvl===x.key||(!fact.lvl&&Math.abs(x.value-(sellNow||0))<0.005);
    /* b128: short codes so the levels take two lines, not six — the full name is in the tooltip */
    return `<button type="button" class="lv${on?' on':''}" data-lv="${x.key}" data-asin="${asin}" data-val="${x.value}" data-shape="${shape||''}" title="Sell at the ${x.label} level · £${x.value.toFixed(2)}${x.n!=null?` · ${x.n} FBA seller${x.n===1?'':'s'} there`:''}">${x.short} <b>${x.value>=100?Math.round(x.value):x.value.toFixed(2)}</b></button>`;}).join('');   /* b140: £100+ chips drop the pence so two fit a line */
  const learn=(st.n>=2&&st.top)?`<span class="lvlearn" title="What you have picked on this shape before">on this shape you take ${(SELL_LEVELS.find(z=>z[0]===st.top.lvl)||[])[1]||st.top.lvl} ${st.top.count} of ${st.n}</span>`:'';
  const stale=(typeof staleFba==='function'&&staleFba(r))?`<span class="lvstale" title="Keepa's FBA 90d average counts every FBA offer it tracked, including ones that vanished. On a thin listing it can be a ghost.">FBA avg may be stale · check the graph</span>`:'';
  return `<div class="lvls">${chips}${learn}${stale}</div>`;}
/* the app's pick becomes Jack's pick: hand the learned levels to sellPick before each run */
function stampLearned(){if(typeof UNIFIED_SELL==='undefined'||typeof learnedLevels!=='function')return;UNIFIED_SELL.learned=learnedLevels(factsAll());}
/* b279 (Jack, 6 Oct, at Bulk Pure Whey bought from Italy: "can't buy from EU"; 4 Oct: nappies / Pampers and washing tablets like Finish
   "can't come to the UK from the EU"). The Prime EU links already leave these out, but Drop & check and brand runs had nothing stopping them.
   A product whose UK category is one of these is priced from Amazon UK only — its EU rows never reach the maths (rule1.js untouched). */
const EU_NO_BUY=[['sports supplements','sports nutrition'],['nappies','nappies'],['home care & cleaning','household cleaning']];
function euNoBuy(F){const tree=new Map();[F.UK,F.viewer].forEach(f=>{if(f&&f.rows)f.rows.forEach(r=>{const a=(r.ASIN||'').trim();if(a&&!tree.has(a))tree.set(a,String(r['Categories: Tree']||[r['Categories: Root'],r['Categories: Sub']].filter(Boolean).join(' › ')).toLowerCase());});});
  const block=new Map();tree.forEach((t,a)=>{const h=EU_NO_BUY.find(([w])=>t.includes(w));if(h)block.set(a,h[1]);});if(!block.size)return{F,block};
  const G=Object.assign({},F);['DE','FR','IT','ES'].forEach(m=>{const f=F[m];if(!f||!f.rows)return;const rows=f.rows.filter(r=>!block.has((r.ASIN||'').trim()));
    if(rows.length!==f.rows.length)G[m]=Object.assign({},f,{rows,asins:(f.asins||[]).filter(a=>!block.has(a))});});return{F:G,block};}
function euNoBuyNote(R,NB){if(!NB||!NB.block.size||!R)return;R.out.forEach(o=>{const w=NB.block.get(o.ASIN);if(w)o.Flags=(o.Flags?o.Flags+'; ':'')+`UK ONLY — ${w} can't be bought from the EU (Jack), so it is priced from Amazon UK`;});}
/* ============ the run ============ */
function run(){if(!cur)return;stampLearned();
  /* UK-only brand with just the Finder export: the Finder carries the same columns, so it IS the sell side */
  if(cur.rule===1&&!files.viewer&&files.UK&&files.UK.hasFees&&cur.markets.every(m=>m==='UK')){files.viewer=files.UK;files.UK=null;paintSlots();}
  const ready=cur.rule===1?!!files.viewer:!!files.one;
  /* b222 (Jack, 1 Oct, eight country files in and no Viewer: "it shouldn't be able to show without the Viewer being in play"): the saved run
     only stands in while NOTHING has been dropped. Once a file is in, the leads area waits for the Viewer and says so. */
  if(!ready){if(!SLOTS.some(k=>files[k])&&!files.one&&runStored())return;result=null;$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;
    ['#story','#statusRow','#sumDetail','#fell'].forEach(id=>{const e=$(id);if(e){e.innerHTML='';if(id==='#story')e.hidden=true;}});['#brandNote','#storedNote'].forEach(id=>{const e=$(id);if(e)e.hidden=true;});const fw=$('#feeWarn');if(fw)fw.classList.remove('show');
    $('#sumEmpty').textContent=cur.rule===1?(MARKETS.some(m=>files[m])?(cur.list==='finder'?'Country files in — now drop your storefront\'s Product Finder export (step 1): it is the UK file, and the leads appear here.':'Finder exports in — drop the UK Product Viewer export and the leads appear here.'):'Drop the exports and the numbers appear here.'):'Drop the export and the numbers appear here.';renderGuide();return;}
  /* b111: the file is in but lacks the ladder columns — say so where the numbers would be, and stop */
  {const sellF=cur.rule===1?files.viewer:files.one;const blk=ladderBlock(sellF);
    if(blk){result=null;$('#results').hidden=true;$('#sumGrid').innerHTML='';$('#sumEmpty').hidden=false;$('#sumEmpty').innerHTML=blk;$('#sumEmpty').classList.add('err');
      ['#story','#statusRow','#sumDetail','#fell'].forEach(id=>{const e=$(id);if(e){e.innerHTML='';if(id==='#story')e.hidden=true;}});['#brandNote','#storedNote'].forEach(id=>{const e=$(id);if(e)e.hidden=true;});return;}
    $('#sumEmpty').classList.remove('err');}
  const prevMap=baselineOf(leadMap(cur.key));
  let R;
  if(cur.rule===1){if(files.viewer)stampShares(files.viewer.rows);const NB=euNoBuy(Object.assign({},files,{prime:typeof primeOn==='function'&&primeOn(),plugOk:cur.plugOk||null}));R=rule1Compute(NB.F,cur.name,rate(),null);R.rule=1;euNoBuyNote(R,NB);R.out.forEach(o=>{if(!o.Brand)o.Brand=cur.name;o.Score=r2score(o['Profit £'],o['ROI %'],o.SPM,(o['Sell £ used']||0)<R2.LOW_TICKET);});}
  else{/* a tea & coffee filter: every row is 0% unless it reads like an appliance (machine, grinder…) or a VA has set it */
    const vf=cur.vat0?((row,fact)=>{if(fact&&fact.vat!=null&&fact.vat!=='')return vatFor(row,fact);
      const text=((row.Title||'')+' | '+(row['Categories: Sub']||'')).toLowerCase();if(r4isAppliance(text))return{rate:R4.STANDARD,why:'20% — reads like an appliance, not the drink',src:'rule'};
      return{rate:0,why:'0% VAT — everything on this filter is tea / coffee',src:'source'};}):vatFor;
    stampShares(files.one.rows);if(typeof snsLearn==='function')snsLearn(files.one.rows);   /* b206: learn S&S before the maths reads it */
    R=rule2Compute(files.one.rows,factsAll(),{vatFor:vf,rule:cur.rule,prime:typeof primeOn==='function'&&primeOn()});R.rule=cur.rule;
    const lowS=R.all.filter(o=>o.lowScore),noM=R.all.filter(o=>!o.kept&&!o.lowScore);
    /* b260: the dropped list gives the real reason. "brand allows X%" printed the brand's own % when the rule allows max(10, brand) (Lego 5% read as 5, the
       rule used 10); a £100+ bar miss read "scored 50 — under 35"; a too-thin-for-its-pace row read "under 10% even with a code" when the bar slides with pace. */
    const whyCut=o=>o.cutWhy==='bar'?`sells for £${BAR100.SELL}+ but the best it makes is ${o.bestRoi}% ROI / £${(+o.bestP).toFixed(2)} — that bar needs ${BAR100.ROI}% or £${BAR100.PROFIT}`
      :o.cutWhy==='thin'?`thin for ${o['Sells /mo']}/mo: best ROI ${o.bestRoi}% and profit £${(+o.bestP).toFixed(2)} — at that pace it needs ROI ${o.velBar.roi}%+ or profit £${o.velBar.profit}+`
      :`scored ${o.Score}${o['Potential score']>o.Score?' ('+o['Potential score']+' with a code)':''} — under ${R2.MIN_SCORE}, not worth a look`;
    R.dropped=noM.map(o=>[o.ASIN,o.Product,`needs ${o['Needs % off']}% off Amazon to reach ${R2.TARGET_ROI}% ROI (the rule allows ${Math.max(R2.DEFAULT_ALLOW,+o['Brand discount %']||0)}%)`])
      .concat(lowS.map(o=>[o.ASIN,o.Product,whyCut(o)]));
    R.reasons={'Needs more discount than the brand gives':noM.length};{const nb=lowS.filter(o=>o.cutWhy==='bar').length,nt=lowS.filter(o=>o.cutWhy==='thin').length,ns=lowS.length-nb-nt;
      if(nb)R.reasons['Under the £'+BAR100.SELL+'+ bar ('+BAR100.ROI+'% or £'+BAR100.PROFIT+')']=nb;if(nt)R.reasons['Too thin for how fast it sells']=nt;if(ns)R.reasons['Scored under '+R2.MIN_SCORE+' even with a code']=ns;}}
  if(typeof stampBuyTypes==='function')stampBuyTypes(R.out);   /* b219: ★ Prime price / Amazon offer / Amazon price, before the state is taken */
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
    const [pf,roi]=brProfit(ys,+o['Landed £'],ref,fba,kg,zeroVatLead(o)?0:null,o.Category||'');   /* b260: a 0%-VAT lead stays 0% when you type its sell price */
    o['Rule sell £']=o['Sell £ used'];o['Rule profit £']=o['Profit £'];o['Rule ROI %']=o['ROI %'];
    o['Sell £ used']=ys;o['Sell used']='your price'+(f.who?' ('+f.who+')':'');o['Profit £']=pf;o['ROI %']=roi;
    o.Score=r2score(pf,roi,o.SPM,ys<R2.LOW_TICKET);o.yourSell=true;});}
  R.out.forEach(o=>proofScore(o,R.rule));   /* b247: Jack's proof rule, after every other score is settled */
  if(R.rule===1&&R.oa&&R.oa.length)oaElse(R.oa);   /* b251: what the not-Amazon seller's price makes */
  /* the central blacklists: an ASIN, or an approved brand, never shows — on any rule, any run, whatever Keepa filter found it */
  /* b214: Rule 1 leads carry the SOURCE's name as their brand, so on a mixed-brand Rule 1 filter (EU drops) a blacklisted brand's product
     sailed through. The product's own Keepa brand is checked as well (Jack, 30 Sep: blacklist Amazon devices and Blink "in the app"). */
  const rawBrand={},rawTree={};[files.viewer,files.one,files.UK].forEach(f=>{if(f&&f.rows)f.rows.forEach(r=>{const a=(r.ASIN||'').trim();if(a&&r.Brand&&!rawBrand[a])rawBrand[a]=r.Brand;if(a&&r['Categories: Tree']&&!rawTree[a])rawTree[a]=r['Categories: Tree'];});});
  /* b234: BuzzBallz cocktails got through Suz's coupon run — Rule 2's Category is root › sub ("Grocery › Pre-mixed & Ready to Drink") and
     the "Beer, Wine & Spirits" in the middle was never looked at. Alcohol is full stop (b17), so that one Amazon node blocks on the whole
     path. Only that node: matching every never-sell word on the whole path also caught cat trees ("Beds, Bedding & Furniture"), play
     kitchens ("Dress Up & Pretend Play") and wardrobes — 13,348 test products, 24 real alcohol hits vs ~90 wrong ones. */
  /* b235: a filter's own skip list (cur.noBrands) — for brands past Keepa's 50-a-filter limit, dropped here whatever the link let through */
  const NBL=(cur.noBrands||[]).map(x=>String(x).trim().toLowerCase()).filter(Boolean);
  /* b272: "brand|word" = that brand only where the product's category says so (Jack: "only high end ones" — Calvin Klein perfume, not Calvin Klein) */
  const NB=new Set(NBL.filter(x=>!x.includes('|'))),NBS=NBL.filter(x=>x.includes('|')).map(x=>x.split('|').map(y=>y.trim()));
  /* b253 (Jack, 4 Oct, screenshots of helmets, envelopes, curtains, rugs, wheelchairs in the Keepa results: "get rid of these"): a filter's own
     category skip list (cur.noCats) — words looked for in the export's category tree. Keepa's category exclusion may only catch a product listed
     directly in the node, so whatever it lets through is dropped here. */
  const NC=(cur.noCats||[]).concat(cur.type==='filter'&&typeof NO_CATS_FILTERS!=='undefined'?NO_CATS_FILTERS:[]).map(x=>String(x).trim().toLowerCase()).filter(Boolean);   /* b255: curtains are off every filter */
  const B=blAll(),bl=[];R.out=R.out.filter(o=>{const b=B[o.ASIN];const own=rawBrand[o.ASIN];const bb=(own&&bbStatusFor(own)==='approved')?'approved':bbStatusFor(o.Brand||(cur.type==='brand'?cur.name:''));
    if(b){bl.push([o.ASIN,o.Title||o.Product||'','BLACKLISTED · '+b.reason+(b.note?' — '+b.note:'')+(b.who?' · '+b.who:'')]);return false;}
    if(bb==='approved'){bl.push([o.ASIN,o.Title||o.Product||'','BRAND BLACKLISTED · '+(own&&bbStatusFor(own)==='approved'?own:(o.Brand||cur.name))]);return false;}
    if(NB.size&&NB.has(String(own||o.Brand||'').trim().toLowerCase())){bl.push([o.ASIN,o.Title||o.Product||'','NOT ON THIS FILTER · '+(own||o.Brand)]);return false;}   /* b235 */
    if(NBS.length){const ob=String(own||o.Brand||'').trim().toLowerCase(),tr=String(rawTree[o.ASIN]||o.Category||'').toLowerCase(),h=NBS.find(([x,w])=>x===ob&&w&&tr.includes(w));
      if(h){bl.push([o.ASIN,o.Title||o.Product||'','NOT ON THIS FILTER · '+(own||o.Brand)+' '+h[1]]);return false;}}   /* b272 */
    if(NC.length){const tr=String(rawTree[o.ASIN]||o.Category||'').toLowerCase(),hit=tr?NC.find(w=>tr.includes(w)):'';if(hit){bl.push([o.ASIN,o.Title||o.Product||'','NOT ON THIS FILTER · category: '+hit]);return false;}}   /* b253 */
    const cw=catBlockReason((o.Category||'')+' | '+(o.Title||o.Product||''))||(/beer, wine (&|and) spirits/i.test(rawTree[o.ASIN]||'')?'alcohol (Beer, Wine & Spirits)':'');if(cw){bl.push([o.ASIN,o.Title||o.Product||'','NEVER-SELL CATEGORY · '+cw]);return false;}return true;});
  R.blacklisted=bl;R.dropped=bl.concat(R.dropped||[]);if(bl.length)R.reasons['Blacklisted']=bl.length;
  /* b54 (Jack, 15 Sep: the WD SSD at −3% "not even a 1, wouldn't show as it's not profit at all") — a Rule 1 row that loses money at the
     buy price and can't reach 10% with any code is not a lead. rule1.js stays frozen; this is the same "not worth a look" cut Rule 2 has. */
  if(R.rule===1){const dead=[];R.out=R.out.filter(o=>{if(+o['ROI %']>=0)return true;const best=codeBestRoi(o);if(best>=10)return true;dead.push([o.ASIN,o.Title||'',`loses money at the ${o['Buy market']||'UK'} price (${o['ROI %']}% ROI) and no code gets it to 10%${best>-99?' (best '+Math.round(best)+'%)':''}`]);return false;});
    if(dead.length){R.dropped=dead.concat(R.dropped);R.reasons['Loses money, no code fixes it']=dead.length;}}
  /* the limits typed on the run screen — for THIS look only. b260: they hide leads on screen; R.floorCut keeps them so the saved run and the
     compare baseline still hold every lead (they ran before the money-losing cut and were saved as the run, so hidden leads came back as NEW) */
  const fl=[];R.floorCut=[];R.out=R.out.filter(o=>{const why=failsFloor(o,tmpFloors,R.rule);if(why){fl.push([o.ASIN,o.Title||o.Product||'','Below the limits you set for this run: '+why]);R.floorCut.push(o);return false;}return true;});
  if(fl.length){R.dropped=fl.concat(R.dropped);R.reasons['Below the limits you set for this run']=fl.length;}R.floored=fl.length;
  if(R.rule!==1)R.out.forEach((o,i)=>o['#']=i+1);
  {const FC=new Set((R.floorCut||[]).map(o=>o.ASIN));R.gone=applyQueue(R.out,R.rule,prevMap,verdAll(),carryFor(cur)).filter(([a])=>!B[a]&&!FC.has(a));}   /* a blacklisted ASIN is not 'gone', it is banned · b260: nor is one a limit is hiding */
  backNote(R);   /* b252 */
  const stamps=Object.values(prevMap).map(p=>p.stamp).filter(Boolean).sort();R.prevStamp=stamps.length?stamps[stamps.length-1]:null;R.prevMap=prevMap;
  {const sellNow=cur.rule===1?files.viewer:files.one;R.apiLook=!!(sellNow&&sellNow.fromKeepa);}   /* b139: the sell side came from the API, not an export */
  result=R;
  const s=sig();const fresh=s!==lastSig;if(fresh){lastSig=s;view.page=1;view.sel.clear();logRun();}
  renderResults();renderGuide();paintNext();
  /* b210 (Jack, 29 Sep: "once I do this why does it shoot me down"): the page no longer jumps to the leads — a pill says they're ready */
  if(fresh&&R.out.length&&!R.stored)leadsReadyPill(R.out.filter(o=>o.QUEUE).length,R.out.length);}
function leadsReadyPill(rev,all){let p=$('#leadsReady');if(!p){p=document.createElement('button');p.type='button';p.id='leadsReady';p.className='leadsready';document.body.appendChild(p);
    p.addEventListener('click',()=>{const t=$('#leadTop');if(t&&t.offsetParent!==null)t.scrollIntoView({behavior:'smooth',block:'start'});p.hidden=true;});
    window.addEventListener('scroll',()=>{const t=$('#leadTop');if(!p.hidden&&t&&t.getBoundingClientRect().top<window.innerHeight*0.6)p.hidden=true;},{passive:true});}
  p.innerHTML=`✓ <b>${rev}</b> to review · ${all} leads — show me ↓`;p.hidden=false;}
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
  const GW=goneWhy(R);   /* b252: of the leads that left today — Amazon had no price (out of stock) vs still there but cut by the rules */
  const allOut=R.out.concat(R.floorCut||[]);   /* b260: every lead the rules kept, whatever a limit is hiding on screen */
  /* b143: the run remembers WHICH leads needed a look and which fell off, not just how many — so "what was I looking at yesterday?" has an answer */
  /* b267: every run of the day is kept on the day's record (who, when, leads, Done). A new run starts once the last one was finished;
     more files for an unfinished run (another country, the Viewer, the same file again) are still that run. */
  const prevT=runsFor(cur.key).find(x=>(x.day||String(x.at).slice(0,10))===today());
  const runDone=(()=>{const p=prevT;if(p&&p.done&&(p.asins||[]).join()===allOut.map(o=>o.ASIN).join()&&runDoneLeft()===0)return p.done;return allOut.length?null:{who:me(),at:nowIso(),auto:true};})();   /* b268: the same leads keep the Done stamp only while nothing in them is to review again (one got better since it was looked at = a new run) */
  const dayRuns=(()=>{const L=prevT?runsOfDay(prevT).slice():[],one={at:nowIso(),who:me(),leads:allOut.length,new:c.NEW,better:c.BETTER,files:names.length,done:runDone};
    if(prevT&&prevT.done&&runDone===prevT.done)return L;   /* the same files again: still the finished run */
    if(L.length&&!L[L.length-1].done)L[L.length-1]=Object.assign(one,{at:L[L.length-1].at});else L.push(one);return L.slice(-16);})();
  runSave({at:nowIso(),day:today(),source:cur.key,name:cur.name,rule:cur.rule,files:names,rowsIn,st:R.st,leads:allOut.length,new:c.NEW,better:c.BETTER,worse:c.WORSE,gone:R.gone.length,blacklisted:R.blacklisted.length,
    asins:allOut.map(o=>o.ASIN),queue:dayQueueFor(R),goneAsins:(R.gone||[]).slice(0,400).map(g=>g[0]),goneOos:GW.oos,goneCut:GW.cut,who:me(),
    /* b244: the run is in — it is FINISHED when someone presses Done (0 leads = nothing to do, done by itself). The same files dropped again keep the stamp. */
    needDone:true,done:runDone,runs:dayRuns,
    /* b239 (Jack's ASIN audit: "buy price at the time, score at the time"): each lead's buy £ / score / ROI, in the same order as asins */
    nb:allOut.map(o=>{const b=+(cur.rule===1?o['Landed £']:o['After discount £'])||0;return[b?Math.round(b*100)/100:null,o.Score!=null?Math.round(+o.Score):null,o['ROI %']!=null?Math.round(+o['ROI %']*10)/10:null];})});
  /* b239: every product the export had — cut ones too — goes to src_seen, so the audit can tell "never found" from "found and cut" */
  if(typeof seenRecord==='function')try{seenRecord(R.floorCut&&R.floorCut.length?Object.assign({},R,{out:allOut}):R,files,cur.key,me());}catch(e){}   /* b260: a lead a limit is hiding is still a lead in the audit */
  leadSave(cur.key,nextLeadMap(allOut,R.rule,leadMap(cur.key)));renderLog();
  paintRunStrip();}   /* b143: today's run joins Last runs straight away — it used to need a reopen before you could click back into it */

/* b247 (Jack, 4 Oct, after going through the top of his £60+ run: the 44-day-old Zenbook the app scored 91 = "not loads of data, wouldn't
   buy it yet"; laptops with estimated sales = "not enough proof, hard to read"; the Prime-priced Philips irons and Shark CarpetXpert the app
   scored 73–76 = "bangers"). His rule, both his words: "anything under a confirmed 50 spm is a score 60 max" and "add 5" when Amazon confirms
   100+ a month AND other FBA sellers are already selling it. Applies to every rule's leads; which leads exist does not change, only the number. */
/* b252 (Jack, 4 Oct: "call it new but mention how it went out of stock — and only mention OOS and then back in stock in the past 15 days only").
   A lead that fell off a run and is back is still NEW and still To review — nothing about the queue changes. It only carries a note:
   · SURE   — the run it left on still had it on the export and Amazon had no price there ("Amazon out of stock 30 Sep · back in stock")
   · LIKELY — it was not on that export at all. Keepa leaves a product out when Amazon has no price, but also when the price moves back
              up, so it says so with a question mark ("off the 30 Sep export · back — out of stock?")
   · it was still on Amazon that day and the rules cut it for another reason → no note (that is not an out-of-stock)
   Only when it left within the last 15 days. Each run now remembers which of the two it was (goneOos / goneCut); runs saved before this
   build remember neither, so their comebacks are LIKELY. */
const BACK_DAYS=15;
function goneWhy(R){const oos=[],cut=[],rows={};if(!R)return{oos,cut};
  ['one','viewer','UK','DE','FR','IT','ES'].forEach(k=>{const f=files[k];if(f&&f.rows)f.rows.forEach(r=>{const a=String(r.ASIN||'').trim();if(a&&!rows[a])rows[a]=r;});});
  const why={};(R.dropped||[]).forEach(d=>{if(d&&d[0]&&!why[d[0]])why[d[0]]=String(d[2]||'');});
  (R.gone||[]).forEach(g=>{const a=g[0],r=rows[a];if(!r)return;   /* not on today's export at all — nothing certain to say */
    if(R.rule===1){if(/OA target|not selling it anywhere/i.test(why[a]||''))oos.push(a);else cut.push(a);}
    else if(!(kNum(r['Amazon: Current'])>0))oos.push(a);else cut.push(a);});
  return{oos:oos.slice(0,400),cut:cut.slice(0,400)};}
function backNote(R){if(!R||!R.out)return;R.out.forEach(o=>{if(o.back){delete o.back;if(o.STATUS==='NEW')o.Changed='';}});
  if(!cur||cur.drop)return;const t=today(),dOf=r=>r.day||String(r.at).slice(0,10);
  const runs=runsFor(cur.key).filter(r=>dOf(r)<t).sort((a,b)=>a.at<b.at?-1:1);if(runs.length<2)return;
  const c=new Date(t+'T12:00:00');c.setDate(c.getDate()-BACK_DAYS);const from=c.getFullYear()+'-'+String(c.getMonth()+1).padStart(2,'0')+'-'+String(c.getDate()).padStart(2,'0');
  const d=x=>typeof trD==='function'?trD(x):String(x).slice(5);
  R.out.forEach(o=>{if(o.STATUS!=='NEW')return;let k=-1;for(let i=runs.length-1;i>=0;i--){if((runs[i].asins||[]).includes(o.ASIN)){k=i;break;}}
    if(k<0||k===runs.length-1)return;   /* never a lead on this filter — or it was one on the very last run (then it never left) */
    const L=runs[k],G=runs[k+1],gd=dOf(G);if(gd<from)return;
    if((G.goneCut||[]).includes(o.ASIN))return;
    const sure=(G.goneOos||[]).includes(o.ASIN);
    o.back={last:dOf(L),gone:gd,sure,missed:runs.length-1-k};
    o.Changed=sure?`↩ Amazon out of stock ${d(gd)} · back in stock`:`↩ off the ${d(gd)} export · back — out of stock?`;});}
const PROOF={MIN:50,CAP:60,BOOST:5,BOOST_SPM:100,FBA:4,FBM:2,FAST:1,NONE:-3,SOLD:3,SOLD_MIN:70};
/* b283 (Jack, 7 Oct, at the Galaxy Fit3 — 78, "a banger": "if there has been history with FBA or FBM it should add a few points, and
   without history it should stay the same or lower — something we are unsure we can sell … tweak it slightly, not a massive change").
   Proof points: FBA sellers in the last 90 days +4 · FBM sellers +2 · confirmed 100+ a month with that history +1 (so FBA + 100+/mo is
   still +5, as before) · nobody but Amazon has ever sold it −3. Still never lifts a lead into 95+. */
function proofHist(o,rule){if(rule===1){const r=typeof rawRowOf==='function'?rawRowOf(o.ASIN):null;return{fba:+o['Sell FBA 90d £']>0,fbm:!!(r&&kNum(r['New, 3rd Party FBM: 90 days avg.'])>0)};}
  return{fba:o['FBA resale proven?']==='yes',fbm:+o['FBM 90d £']>0};}
function proofScore(o,rule){const from=String((rule===1?o['SPM from']:o['Demand from'])||'').toLowerCase(),spm=+(rule===1?o.SPM:o['Sells /mo'])||0;
  const confirmed=/^(bought|confirmed)/.test(from),H=proofHist(o,rule);
  let sc=+o.Score||0;o.proof='';
  if(!(confirmed&&spm>=PROOF.MIN)){if(sc>PROOF.CAP){sc=PROOF.CAP;o.proof=confirmed?`max ${PROOF.CAP} · only ${Math.round(spm)}/mo`:`max ${PROOF.CAP} · unconfirmed`;}
    if(+o['Potential score']>PROOF.CAP)o['Potential score']=PROOF.CAP;}
  else if((H.fba||H.fbm)&&sc<95){const pts=(H.fba?PROOF.FBA:0)+(H.fbm?PROOF.FBM:0)+(spm>=PROOF.BOOST_SPM?PROOF.FAST:0),to=Math.min(sc>90?94:90,sc+pts);   /* b281: never a world-class 95+ on its own · b283: never makes a lead 'unreal' (91+) — only adds on top of one that already is */
    if(to>sc){o.proof=`+${to-sc} · others sell it`;o.proofWhy=H.fba&&H.fbm?'FBA and FBM sellers in the last 90 days':H.fba?'FBA sellers in the last 90 days':'FBM sellers in the last 90 days';sc=to;}}
  if(!H.fba&&!H.fbm&&sc>1){sc=Math.max(1,sc+PROOF.NONE);o.proof=(o.proof?o.proof+' · ':'')+`${PROOF.NONE} · only Amazon`;o.proofWhy='Nobody but Amazon has sold it in the last 90 days — no FBA or FBM history, so less sure we can sell it';}
  /* b283: you have sold this exact ASIN before = we know we can sell it — +3, but only on a lead that is already good (70+), never into 95+ */
  if(sc>=PROOF.SOLD_MIN&&sc<95&&typeof soldBefore==='function'&&soldBefore(o.ASIN)){const to=Math.min(sc>90?94:90,sc+PROOF.SOLD);if(to>sc){o.proof=(o.proof?o.proof+' · ':'')+`+${to-sc} · you sold it`;sc=to;}}
  o.Score=sc;return o;}
/* ============ results ============ */
function sumTile(v,l,cls,attrs){return`<div class="sum ${cls||''}"${attrs||''}><span class="sv">${typeof v==='number'?v.toLocaleString():v}</span><span class="sl">${l}</span></div>`;}
/* b147 (Jack, 22 Sep: "it's A2A, but if we find something profitable then we still want it").
   Products Amazon sells nowhere are not leads — there is no buy price — but they are not rubbish either: they sell,
   and we know what they fetch. So the run hands them over as a shopping list with the price to beat. */
const OA_HDR=['ASIN','Title','Brand','Sells /mo','SPM from','Sell £','Sell from','Someone else £','Sold by','Profit £ there','ROI % there','Breakeven buy £','Buy under £ for 20%','Buy under £ for 30%','Keepa','UK sell link'];
/* b247 (Jack, 4 Oct: "merge these rows in here but just mention it in the notes"): the products that sell well but Amazon sells nowhere are rows
   at the end of All leads — no score, no buy price, the note says what they are and the price to buy under. The separate table above the leads
   is gone; its CSV is in More. They are not leads: not counted, not in To review, never opened or marked by the bulk buttons. */
function oaRowsList(){if(!result||!result.oa||!result.oa.length||result.stored||!cur||cur.rule!==1||view.status!=='ALL')return[];const q=(view.q||'').toLowerCase();
  return result.oa.filter(o=>!q||((o.ASIN+' '+(o.Title||'')+' '+(o.Brand||'')).toLowerCase().includes(q)));}
/* b251 (Jack, 3 Oct, at the "sell well, but Amazon is not selling them" rows: "thought these were merging and it was just saying in notes it's
   someone else — if it's still profitable I'm buying"). Amazon being out is not the end of it: somebody else has the Buy Box on Amazon UK. Each of
   these rows now carries that price (UK Buy Box, else the lowest FBA / new offer), who it is, and what it makes at that price — worked from the
   rule's own breakeven and 20% targets (profit is a straight line in the buy price: profit = (breakeven − buy) / VAT), so rule1.js is not touched.
   Still profitable = ROI 10%+ at that price; those sit first. They are not scored leads — nothing here changes what the rule keeps. */
const OA_OK_ROI=10;
function oaElse(list){const rows={};[files.viewer,files.UK,files.one].forEach(f=>{if(f&&f.rows)f.rows.forEach(r=>{const a=String(r.ASIN||'').trim();if(a&&!rows[a])rows[a]=r;});});
  const num=v=>{const x=kNum(v);return x>0?x:0;};
  list.forEach(o=>{delete o.else;['Someone else £','Sold by','Profit £ there','ROI % there'].forEach(k=>{o[k]='';});const r=rows[o.ASIN];if(!r)return;
    const bb=num(r['Buy Box: Current']),fba=num(r['New, 3rd Party FBA: Current']),nw=num(r['New: Current']),p=bb||fba||nw;if(!p)return;
    const b0=+o['Breakeven buy £'],b20=+o['Buy under £ for 20%'];if(!(b0>0&&b20>0&&b0>b20))return;
    const Vs=(b0-b20)/(0.2*b20)>1.1?1.2:1;   /* the rule's VAT divisor, read back off its own two targets */
    const be=b0*(1-0.0005*Vs);   /* the rule finds its breakeven on ROI rounded to 0.1%, so it stops at −0.05% — this is the true zero */
    const who=bb?String(r['Buy Box: Buy Box Seller']||'').split(' / ')[0].replace(/\s*\(\d+%\)\s*$/,'').trim():'';
    const profit=Math.round((be-p)/Vs*100)/100,roi=Math.round(1000*profit/p)/10;
    o.else={p,who,from:bb?'Buy Box':fba?'lowest FBA offer':'lowest new offer',profit,roi,ok:roi>=OA_OK_ROI};
    o['Someone else £']=p;o['Sold by']=who||o.else.from;o['Profit £ there']=profit;o['ROI % there']=roi;});
  /* still profitable first, then the ones that make a little at that price, then the rest in the order they sell */
  const ok=list.filter(o=>o.else&&o.else.ok).sort((a,b)=>b.else.roi-a.else.roi),thin=list.filter(o=>o.else&&!o.else.ok&&o.else.profit>0).sort((a,b)=>b.else.roi-a.else.roi),rest=list.filter(o=>!(o.else&&(o.else.ok||o.else.profit>0)));
  list.length=0;ok.concat(thin,rest).forEach(o=>list.push(o));return list;}
function oaRowsHtml(){const L=oaRowsList();if(!L.length)return'';const e=escapeHtml;
  return L.map(o=>{const keepa=o.Keepa||'https://keepa.com/#!product/2-'+o.ASIN,sell=o['UK sell link']||'https://www.amazon.co.uk/dp/'+o.ASIN,x=o.else||null,who=x?(x.who||'another seller'):'';
    const note=x?(x.ok
        ?`<b>Not Amazon — ${e(who)}</b> has it at <b>${gbp(x.p)}</b> (${e(x.from)}). At that price: <b>${gbp(x.profit)} profit · ${pct(x.roi)} ROI</b> — still profitable. Check the seller and the stock before you buy.`
        :`<b>Not Amazon — ${e(who)}</b> has it at ${gbp(x.p)} (${e(x.from)}): ${x.profit>0?gbp(x.profit)+' profit · '+pct(x.roi)+' ROI — thin (under '+OA_OK_ROI+'%)':'a loss of '+gbp(Math.abs(x.profit))+' at that price'}. <b>Buy under ${gbp(o['Buy under £ for 20%'])}</b> for 20% ROI (breakeven ${gbp(o['Breakeven buy £'])}).`)
      :`<b>Amazon isn’t selling this anywhere</b> and nobody else has a price on it — not a lead yet. <b>Buy under ${gbp(o['Buy under £ for 20%'])}</b> elsewhere for 20% ROI (breakeven ${gbp(o['Breakeven buy £'])}).`;
    return`<tr class="oarow${x&&x.ok?' oaok':''}" data-oa="${o.ASIN}"><td></td><td class="idx">–</td>
      <td class="scorec"><span class="score none" title="No score — Amazon is not selling it, so the rule has no buy price of its own">–</span><div class="stat2"><span class="spill ${x&&x.ok?'better':'same'}">${x?(x.ok?'STILL PROFITABLE':x.profit>0?'THIN':'NOT AMAZON'):'NO PRICE'}</span></div></td>
      <td class="prod"><span class="t" title="${e(o.Title||'')}">${e(o.Title||o.ASIN)}</span><span class="s"><span class="asinl">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></span><span>${e(typeof shortSell==='function'?shortSell(o['Sell from']):'')}</span></span>
        <span class="rowacts"><a href="${e(keepa)}" target="_blank" rel="noopener">Keepa</a><a href="${e(sell)}" target="_blank" rel="noopener">${x?'Buy / Sell UK':'Sell UK'}</a></span></td>
      <td class="vcell"><span class="oanot">${x&&x.ok?'not Amazon — your call':'not a lead yet'}</span></td>
      <td class="num r buyc">${x?`<b>${gbp(x.p)}</b><span class="sub">${e(who)} · not Amazon</span>`:'<span class="oanot">no price</span>'}<span class="sub want">buy under ${gbp(o['Buy under £ for 20%'])}</span></td>
      <td class="num r sellc"><b>${gbp(o['Sell £'])}</b></td>
      <td class="num r ${x?(x.profit>=0?'pos':'neg'):''}">${x?`<b>${gbp(x.profit)}</b>`:'<span class="oanot">–</span>'}</td><td class="num r ${x?(x.roi>=20?'pos':x.roi>=10?'pos soft':x.roi>=0?'warm':'neg'):''}">${x?`<b>${pct(x.roi)}</b>`:'<span class="oanot">–</span>'}</td>
      <td class="num r demc">${(+o['Sells /mo']||0).toLocaleString()}<span class="sub">${e(String(o['SPM from']||'').split(' ')[0])}</span></td>
      <td class="flagc"><span class="oanote${x&&x.ok?' ok':''}" title="Amazon is not selling it in any country, so the rule has no Amazon price to buy at. The price shown is what another seller on Amazon UK is asking right now.">${note}</span></td></tr>`;}).join('');}
function paintOaTargets(){const res=$('#results');if(!res)return;let el=$('#oaTargets');
  {const b=$('#oaCsv2');if(b){const n=(result&&result.oa&&!result.stored)?result.oa.length:0;b.hidden=!n;b.textContent=`Amazon-not-selling list · CSV (${n})`;}
    if(el){el.hidden=true;el.innerHTML='';}return;}
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
    tiles=sumTile(st.viewer,'in the Viewer')+sumTile(st.demand,'sell 9+/mo in the UK')+sumTile(st.buy,'Amazon selling it')+sumTile(out.length,'leads · show all','lead go',' data-showall="1" role="button" tabindex="0" title="Show every lead this run kept"')
      +sumTile(rev,'to review today',rev?'cool':'')+sumTile(out.filter(o=>o['ROI %']>=10).length,'ROI 10%+')+sumTile(cnt('UK'),'buy from UK')+sumTile(euN,euN?'from EU · '+['DE','FR','IT','ES'].map(k=>cnt(k)?k+' '+cnt(k):'').filter(Boolean).join(' · '):'buy from EU','warm');}
  else{const m=out.reduce((s,o)=>s+o['£ per month'],0);
    tiles=sumTile(st.rows,'in the export')+sumTile(st.priced,'Amazon selling it')+sumTile(st.demand,'sell 9+/month')+sumTile(out.length,'leads · show all','lead go',' data-showall="1" role="button" tabindex="0" title="Show every lead this run kept"')
      +sumTile(rev,'to review today',rev?'cool':'')+sumTile(out.filter(o=>o.Score>=60).length,'score 60+')+sumTile(out.filter(o=>o.Score>=40&&o.Score<60).length,'score 40–59','warm')+sumTile(out.filter(o=>o['ROI %']>=20).length,'ROI 20%+','jade');}
  $('#sumGrid').innerHTML=tiles;
  paintStory();
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]);
  $('#fell').innerHTML=`<span class="fl">Filtered out</span><span class="fr">${rs.length?rs.map(([k,n])=>`${escapeHtml(k)} ${n}`).join(' · '):'nothing'}</span><span class="fbar"><span style="width:${Math.min(100,R.dropped.length/((st.viewer||st.rows)||1)*100)}%"></span></span><span class="fn">${R.dropped.length} dropped</span>`;
  const est=cur.rule===1?out.filter(o=>(o['Fees from']||'').startsWith('ESTIMATED')).length:0;
  const fw=$('#feeWarn');const msgs=[];
  /* b242 (Bialetti, 3 Oct: part 1 of 2 in, the run looked finished at 3 leads): while a Viewer part is missing, the results say so first */
  if(R.rule===1&&!R.stored&&typeof viewerPartsLeft==='function'&&viewerPartsLeft()>0){const all=($('#asinBar')||{})._all||[],P=viewerParts(all),cov=new Set(files.viewer?files.viewer.asins||[]:[]);
    const miss=all.filter(a=>!cov.has(a)).length,next=P.findIndex(p=>!partDone(p,cov));
    msgs.push(`<span class="vpwarn"><b>⚠ These leads are incomplete — UK Viewer part ${next+1} of ${P.length} is not in.</b> ${miss.toLocaleString()} products have no UK price yet, so none of them can be a lead. Press <b>Open part ${next+1} of ${P.length}</b> in the Viewer bar, export all columns, drop it here — the leads update by themselves.</span>`);}
  /* b23: what Jack knows about this brand's channel (the note on its discount row) — once per run, not on every row */
  let bn=$('#brandNote');if(!bn){bn=document.createElement('div');bn.id='brandNote';bn.className='brandnote';fw.parentNode.insertBefore(bn,fw);}
  const be=cur.rule===1?discForBrand((cur.brands&&cur.brands[0])||cur.name):null;
  if(be&&be.note){bn.innerHTML=`<b>${escapeHtml(be.name)}</b> · ${escapeHtml(be.note)}`;bn.hidden=false;}else bn.hidden=true;
  let sn=$('#storedNote');if(!sn){sn=document.createElement('div');sn.id='storedNote';sn.className='storednote';fw.parentNode.insertBefore(sn,fw);}
  if(R.stored&&!R.apiLook&&!R.past){let d=R.at?new Date(String(R.at).replace(' ','T')):null;   /* b139: the API look and a past run have their own bar */if(d&&isNaN(d))d=null;const day=String(R.at||'').slice(0,10);const when=d?(day===today()?'today '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})):(day?day:'the last run');
    const rv=out.filter(o=>o.QUEUE).length;
    sn.innerHTML=`<b>Showing the saved run from ${when}</b> · ${out.length} leads as they were scored then · ${rv?rv+' still to review':'all judged'} · verdicts and links work as normal.${view.status==='REVIEW'&&rv<out.length?` <button type="button" class="linkbtn" id="snAll">Show all ${out.length} leads</button>`:''} Drop today's export above to refresh.`;sn.hidden=false;
    const sa=$('#snAll');if(sa)sa.addEventListener('click',()=>{view.status='ALL';view.page=1;renderTable();$('#leadTop').scrollIntoView({behavior:'smooth',block:'start'});});}else sn.hidden=true;
  if(est){const fv=files.viewer||files.one;const hasCols=!!(fv&&fv.hasFees);   /* b209: with every column ticked, a missing fee is Keepa not knowing it yet — say that */
    /* b259 (Jack, 4 Oct: "is this a bug? I exported the UK version"): not a bug — his UK Viewer had 3 Logitech G products with no fee, no weight and no
       FBA seller on Amazon UK. The note now names them (click = jump to the row) and says why; each row carries a "fees estimated" chip. */
    const estL=out.filter(o=>(o['Fees from']||'').startsWith('ESTIMATED')),names=estL.slice(0,4).map(o=>`<a href="#" class="feejump" data-asin="${o.ASIN}">${escapeHtml(String(o.Title||o.Product||o.ASIN).slice(0,34))}</a>`).join(' · ')+(estL.length>4?` · +${estL.length-4} more`:'');
    msgs.push(hasCols?'<b>'+est+' of '+out.length+' lead'+(est===1?' has':'s have')+' estimated fees:</b> '+names+'. Not a problem with your export — '+(est===1?'this product has':'these products have')+' no fee figure on Amazon UK yet (no FBA seller, no size on the listing), so Keepa has nothing to give. The app works the fees out from the category and weight instead — '+(()=>{const o=estL[0];return`${o['Referral %']}% referral + £${(+o['FBA fee £']||0).toFixed(2)} FBA on the first`;})()+'. Check '+(est===1?'it':'them')+' in SAS before buying.':'<b>'+est+' of '+out.length+' leads have estimated fees.</b> Tick <em>Referral Fee %</em> and <em>FBA Pick&amp;Pack Fee</em> on the export and the maths becomes exact.');}
  if(R.rule===1&&R.st&&R.st.bbHiCol===false)msgs.push('<b>This export has no <em>Buy Box: Highest</em> column</b>, so sell prices could not be capped at the most the listing has ever sold for. Tick it on the Keepa export next time.');
  if(msgs.length){fw.innerHTML=msgs.join('<br>');fw.classList.add('show');}else{fw.classList.remove('show');}
  $('#fMarket').hidden=cur.rule!==1;
  const unseen=out.filter(o=>!verdGet(o.ASIN)).length;const sb=$('#seenAll');sb.hidden=true;void unseen;   /* b260: retired — ✓ Done (next to Open all) marks them looked at AND finishes the run; this one did half of that */
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
    ?`${n(st.viewer)} products in the Viewer → ${n(st.demand)} sell 9+ a month in the UK → ${n(out.length)} come out as leads → ${n(rev)} need a look today.`
    :`${n(st.rows)} products in the export → ${n(st.priced)} sold by Amazon → ${n(st.demand)} sell 9+ a month → ${n(out.length)} come out as leads → ${n(rev)} need a look today.`;
  const story2=R.prevStamp
    ?`Against ${ukDate(R.prevStamp)}: ${n(c.NEW)} new, ${n(c.BETTER)} more profitable, ${n(c.WORSE)} worse, ${n(c.UNCHANGED)} the same, ${n(R.gone.length)} gone. ${judged?`${n(judged)} already have a verdict and have not improved since${yes||no?` (${n(yes)} Yes · ${n(no)} No)`:''}. `:''}${n(R.dropped.length)} dropped by the rule${R.blacklisted.length?`, ${n(R.blacklisted.length)} blacklisted`:''}.`
    :`First run for ${escapeHtml(cur.name)}, so everything counts as new. ${n(R.dropped.length)} dropped by the rule${R.blacklisted.length?`, ${n(R.blacklisted.length)} blacklisted`:''}.`;
  const carried=out.filter(o=>o.QUEUE==='new'&&o.STATUS!=='NEW').length;
  const parked=out.filter(o=>!o.QUEUE&&!o.verdict).length;
  const story3=parked?`<p class="s3">${n(parked)} lead${parked===1?' is':'s are'} the same or worse than the last run and ${parked===1?'has':'have'} no verdict, so ${parked===1?'it is':'they are'} not in today's queue; ${parked===1?'it comes':'they come'} back the moment ${parked===1?'it improves':'they improve'}. <button class="btn ghost xs showall" type="button" data-showall="1">Show all ${n(out.length)} leads</button></p>`:'';
  /* b211 (Jack: "in the notes section look at stuff that might be able to turn something into a banger with Argos, Currys, the brand"): the leads
     a code or a price-match would lift — Rule 2's potential score (Currys / Argos / John Lewis / brand direct), Rule 1's OA price-match note */
  const pot=(R.all||out).filter(o=>(o['Potential score']||0)>=Math.max(60,(o.Score||0)+8)).sort((a,b)=>b['Potential score']-a['Potential score']);
  /* b257 (Jack's laptop check, 4 Oct: "Could be a banger with a code (46)" listed Alienware at "£-18.59 / -2%" and Dell at "-1%"). Every Rule 1 lead
     with a price-match NOTE was counted, losses included. Now a price-match only counts when it lifts the lead the same way Rule 2's codes must:
     its score at the price-match price is 60+ and at least 8 above today's — best first, and the score shown like Rule 2's (40 → 66). */
  const pmOf=o=>{const m=/-> £(-?[\d.]+) \/ (-?\d+)%/.exec(o['OA price-match']||'');if(!m)return null;const p=+m[1],roi=+m[2];
    return p>0&&roi>0?r2score(p,roi,o.SPM,(o['Sell £ used']||0)<R2.LOW_TICKET):null;};
  const pm=R.rule===1?out.map(o=>({o,s:pmOf(o)})).filter(x=>x.s!=null&&x.s>=Math.max(60,(x.o.Score||0)+8)).sort((a,b)=>b.s-a.s).map(x=>Object.assign(x.o,{_pmScore:x.s})):[];
  const nameOf=o=>escapeHtml(String(o.Product||o.Title||o.ASIN).slice(0,48));
  const story4=pot.length||pm.length?`<div class="s4"><b>Could be a banger with a code (${pot.length+pm.length}):</b> ${pot.slice(0,5).map(o=>`<span class="bg" title="${escapeHtml(o.ASIN)}${o.kept===false?' · dropped by the rules at its Amazon price':''}">${nameOf(o)} <i>${o.Score} → <b>${o['Potential score']}</b> with ${escapeHtml(o['Potential via']||'a code')}</i>${o.kept===false?' <em>(dropped — check it)</em>':''}</span>`).concat(pm.slice(0,5-Math.min(5,pot.length)).map(o=>`<span class="bg" title="${escapeHtml(o.ASIN)}">${nameOf(o)} <i>${o.Score} → <b>${o._pmScore}</b> ${escapeHtml(o['OA price-match'])}</i></span>`)).join('')}${pot.length+pm.length>5?`<span class="more">+${pot.length+pm.length-5} more — the → numbers on the Score column</span>`:''}</div>`:'';
  $('#story').innerHTML=`<p>${story}</p><p class="s2">${story2}</p>${story3}${story4}`;$('#story').hidden=false;
  /* detail: why things dropped, and what is left */
  const rs=Object.entries(R.reasons).sort((a,b)=>b[1]-a[1]);const totIn=(st.viewer||st.rows)||1;
  const KEYS={'Not enough demand':'demand:','No sell price':'no sell price','Amazon not selling':'amazon not selling','EU plug in title':'eu plug','Appliance from EU':'mains appliance','ROI under breakeven':'roi ','Slow seller, thin margin':'slow seller','Wide-gap, still under -15%':'wide-gap','Needs more discount than the brand gives':'needs ','Blacklisted':'blacklisted','Too thin for how fast it sells':'thin for','Scored under 35 even with a code':'scored ','Below the limits you set for this run':'below the limits','Loses money, no code fixes it':'loses money'};const keyOf=k=>/^Under the £/.test(k)?'that bar needs':KEYS[k];
  const who=k=>{const key=(keyOf(k)||k.split(' ').slice(0,3).join(' ')).toLowerCase();const hits=(R.dropped||[]).filter(d=>(d[2]||'').toLowerCase().includes(key)).slice(0,12);return hits.length?hits.map(d=>d[0]+' — '+(d[1]||'').slice(0,40)).join('\n')+((R.dropped||[]).filter(d=>(d[2]||'').toLowerCase().includes(key)).length>12?'\n…full list in the Dropped list download':''):'';};
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
  el.hidden=false;const pct=Math.round(done/total*100);const k=total+'|'+done;if(el._k===k)return;el._k=k;   /* b224: unchanged = untouched, so the bar does not re-animate on every keystroke */
  el.innerHTML=`<span class="dbb"><i style="width:${pct}%"></i></span><span class="dbt">${done} of ${total} done${done===total?' — all done':''}</span>`;}
/* b240: the lead list's country + deal filter, remembered per filter (Germany-only on one source never empties another) */
const LF_KEY='bdl-sourcing-leadfilter';
function leadFilt(){const all=lsGet(LF_KEY,{})||{};
  /* b270: a "Buy from" choice saved by the old ★ UK·DE·FR chip (Prime was three countries until 5 Oct) would now hide every Italian / Spanish lead
     behind a chip that is gone — dropped once */
  if(!all._b270){Object.keys(all).forEach(k=>{const x=all[k];if(x&&Array.isArray(x.mks)&&x.mks.length===3&&['UK','DE','FR'].every(m=>x.mks.includes(m)))x.mks=[];});all._b270=1;lsSet(LF_KEY,all);}
  const f=(cur&&all[cur.key])||{};
  return{mks:Array.isArray(f.mks)?f.mks:[],deals:Array.isArray(f.deals)?f.deals:(f.deal&&f.deal!=='ALL'?[f.deal]:[]),rest:!!f.rest};}
const MK_NAME={UK:'UK',DE:'Germany',FR:'France',IT:'Italy',ES:'Spain'},DEAL_LAB={prime:'★ Prime exclusive',offer:'On offer',amazon:'Normal price'};
/* is a lead in the current country + deal choice? (nothing ticked = everything) */
function lfHit(o,LF){if(cur&&cur.rule===1&&LF.mks.length&&!LF.mks.includes(o['Buy market']||'UK'))return false;if(LF.deals.length&&!LF.deals.includes(leadDeal(o)))return false;return true;}
function lfOn(LF){return!!((cur&&cur.rule===1&&LF.mks.length)||LF.deals.length);}
function leadFiltSet(ch){if(!cur)return;const all=lsGet(LF_KEY,{})||{};all[cur.key]=Object.assign(leadFilt(),ch);lsSet(LF_KEY,all);}
function leadDeal(o){const t=o&&o.BuyType;if(t==='prime'||t==='offer'||t==='amazon')return t;return typeof buyTypeOf==='function'?buyTypeOf(o,null):'amazon';}
/* the chips, with how many leads each would show (everything else in the view applied) */
function paintLeadFilt(){if(!cur||!result)return;const F=leadFilt(),host=$('#fMks'),dl=$('#fDeals');
  const base=visible({mks:[],deals:F.deals,rest:false}),baseD=visible({mks:F.mks,deals:[],rest:false});
  if(host&&cur.rule===1){const n={};base.forEach(o=>{const m=o['Buy market']||'UK';n[m]=(n[m]||0)+1;});
    const mks=MARKETS.filter(m=>n[m]||(cur.markets||[]).includes(m)||F.mks.includes(m));const p=(typeof PRIME_MK!=='undefined'?PRIME_MK:MARKETS).filter(m=>mks.includes(m)),pOn=p.length&&F.mks.length===p.length&&p.every(x=>F.mks.includes(x));   /* b269: the Prime countries — all five now */
    host.innerHTML=`<button type="button" data-mk="ALL" class="${F.mks.length?'':'on'}">All</button>`+mks.map(m=>`<button type="button" data-mk="${m}" class="${F.mks.includes(m)?'on':''}${n[m]?'':' zero'}" title="${F.mks.length===1&&F.mks[0]===m?'Click again to show every country':`Just ${MK_NAME[m]||m}`} · ⇧ Shift-click to ${F.mks.includes(m)?'take it off':'add it alongside the others'}">${m}<b>${n[m]||0}</b></button>`).join('')
      +(p.length&&p.length<mks.length?`<button type="button" data-mk="PRIME" class="pr${pOn?' on':''}" title="The countries with Prime exclusive prices">★ ${p.join('·')}</button>`:'');}   /* b269: no chip when every country here has Prime (it would be the same as All) */
  if(dl){const n={prime:0,offer:0,amazon:0};baseD.forEach(o=>{const d=leadDeal(o);if(n[d]!=null)n[d]++;});
    const tip={prime:'Bought at a Prime exclusive price — Prime members only (UK, Germany, France, Italy, Spain)',offer:'Amazon has it on offer — a coupon, Subscribe & Save, a Business price, a deal badge, or 9%+ under its 90-day average',amazon:'Amazon\'s normal price'};
    dl.innerHTML=`<button type="button" data-deal="ALL" class="${F.deals.length?'':'on'}">All</button>`+['prime','offer','amazon'].map(k=>`<button type="button" data-deal="${k}" class="${k==='prime'?'pr ':''}${F.deals.includes(k)?'on':''}${n[k]?'':' zero'}" title="${tip[k]}">${DEAL_LAB[k]}<b>${n[k]}</b></button>`).join('');}
  paintLfNote(F);}
/* the "still missing" line: what the choice hides, and how much of it is not done yet */
function paintLfNote(F){const el=$('#lfNote');if(!el)return;if(!lfOn(F)){el.hidden=true;el.innerHTML='';return;}
  const all=visible({mks:[],deals:[],rest:false}),hit=all.filter(o=>lfHit(o,F)),hid=all.filter(o=>!lfHit(o,F));const word=view.status==='REVIEW'?'to review':'leads';
  const what=[cur.rule===1&&F.mks.length?F.mks.map(m=>MK_NAME[m]||m).join(' + '):'',F.deals.length?F.deals.map(d=>DEAL_LAB[d]).join(' + '):''].filter(Boolean).join(' · ');
  const left=L=>view.status==='REVIEW'&&typeof doneToday==='function'?L.filter(o=>!doneToday(o)).length:null;
  /* two groups that never overlap: leads in the countries you did not tick, then leads in your countries the deal choice hides */
  const brk=L=>{const mkOn=cur.rule===1&&F.mks.length,inMk=o=>!mkOn||F.mks.includes(o['Buy market']||'UK');const out=[];
    if(mkOn){const n={};L.filter(o=>!inMk(o)).forEach(o=>{const m=o['Buy market']||'UK';n[m]=(n[m]||0)+1;});const p=MARKETS.filter(m=>n[m]).map(m=>`${MK_NAME[m]} ${n[m]}`);if(p.length)out.push('other countries — '+p.join(' · '));}
    if(F.deals.length){const n={};L.filter(inMk).forEach(o=>{const d=leadDeal(o);n[d]=(n[d]||0)+1;});const p=['prime','offer','amazon'].filter(d=>n[d]&&!F.deals.includes(d)).map(d=>`${DEAL_LAB[d].toLowerCase()} ${n[d]}`);
      if(p.length)out.push((mkOn?F.mks.map(m=>MK_NAME[m]||m).join(' + ')+' ':'')+'not '+F.deals.map(d=>DEAL_LAB[d]).join(' / ')+' — '+p.join(' · '));}
    return out.join('; ');};
  const lh=left(hid),ls=left(hit);el.hidden=false;
  el.innerHTML=F.rest
    ?`<span><b>Showing the rest</b> — the ${hid.length} ${word} that are not ${escapeHtml(what)}${lh!=null?` · <b>${lh} not done</b>`:''}.</span><span class="lfbtns"><button type="button" class="btn ghost xs" data-lf="rest">Back to ${escapeHtml(what)} (${hit.length})</button><button type="button" class="btn ghost xs" data-lf="all">Show all ${all.length}</button></span>`
    :`<span><b>Showing only ${escapeHtml(what)}</b> — ${hit.length} of ${all.length} ${word}${ls!=null?` (${ls} not done)`:''}. ${hid.length?`<b class="miss">Still missing ${hid.length}</b>${lh!=null?` (${lh} not done)`:''}: ${escapeHtml(brk(hid))}.`:'Nothing else here.'}</span>${hid.length?`<span class="lfbtns"><button type="button" class="btn ghost xs" data-lf="rest">Show the rest ${hid.length}</button><button type="button" class="btn ghost xs" data-lf="all">Show all ${all.length}</button></span>`:''}`;}
function visible(over){const q=view.q.toLowerCase();const LF=over||leadFilt();const day=dayList();const list=result.out.filter(o=>{
  if(view.status==='REVIEW'){if(!o.QUEUE&&!touched.has(o.ASIN)&&!(day&&day.has(o.ASIN)))return false;}
  else if(view.status!=='ALL'&&o.STATUS!==view.status)return false;
  /* b240 (Jack, 3 Oct: "maybe I just wanna see Germany Prime exclusive leads atm — want the ability to customise and filter it more") */
  if(lfOn(LF)){const hit=lfHit(o,LF);if(LF.rest?hit:!hit)return false;}   /* "the rest" = exactly what the choice hides */
  if(view.hideNo){const v=verdGet(o.ASIN);if(v&&v.v==='No')return false;}
  if(q&&!((o.ASIN+' '+(o.Title||o.Product||'')+' '+(o.Brand||'')).toLowerCase().includes(q)))return false;return true;});
  const sc=o=>o.Score||0;
  if(view.sort==='default'&&cur.rule===1)list.sort((a,b)=>sc(b)-sc(a)||b['Profit £']-a['Profit £']);
  /* b153 (Jack, 25 Sep: "no rigid or buggy or jumpy"): b144 sent every answered lead to the bottom on EVERY redraw, so the one you
     had just clicked Y on jumped from row 1 to row 63 — page 2 — and vanished from under the mouse. Anything answered in this
     sitting now holds its place; only leads answered earlier (or by someone else) sit at the bottom. */
  if(view.status==='REVIEW'&&day){const done=o=>(doneToday(o)&&!touched.has(o.ASIN)?1:0);   /* b210: a lead back because it got better sorts by score, not with the done ones */list.sort((a,b)=>done(a)-done(b));}
  if(view.sort==='gain')list.sort((a,b)=>(b.gain||0)-(a.gain||0)||sc(b)-sc(a));
  else if(view.sort==='profit')list.sort((a,b)=>b['Profit £']-a['Profit £']);
  else if(view.sort==='roi')list.sort((a,b)=>b['ROI %']-a['ROI %']);
  else if(view.sort==='month')list.sort((a,b)=>(b['£ per month']||b['Profit £']*b.SPM)-(a['£ per month']||a['Profit £']*a.SPM));
  return list;}
function acts(o){const mk=cur.rule===1?(o['Buy market']||'UK'):'UK';
  return`<span class="rowacts"><a href="${o.Keepa}" target="_blank" rel="noopener" title="Keepa graph — the Track tab is on this page">Keepa</a><a href="${o.SAS}" target="_blank" rel="noopener" title="SellerAmp">SAS</a><a href="${amzBuyLink(o['Buy link'])}" target="_blank" rel="noopener" title="Where we would buy it">Buy ${mk}</a><a href="${o['UK sell link']||o['Buy link']}" target="_blank" rel="noopener" title="The UK listing we would sell on">Sell UK</a></span>`;}
function verdCell(o){const v=verdGet(o.ASIN)||{};const b=x=>`<button type="button" class="vb ${x[0]}${v.v===x?' on':''}" data-v="${x}" data-asin="${o.ASIN}" title="${x}">${x[0]}</button>`;
  /* b140: once a reason is picked only that chip stays (click it to change) — five chips one under the other were 105px of every No row */
  const chips=v.v==='No'?`<div class="vreasons${v.reason?' picked':''}">${noReasons().filter(r=>!v.reason||r===v.reason).map(r=>`<button type="button" class="vr${v.reason===r?' on':''}" data-r="${r}" data-asin="${o.ASIN}">${escapeHtml(r)}</button>`).join('')}</div>`:'';
  /* b153: a No still waiting for its reason shows the reasons IN PLACE of the note box and the name line, not on top of them —
     all three together made the row 15px taller and shoved every row below it down on every N */
  const waiting=v.v==='No'&&!v.reason;
  const note=v.v&&v.v!=='Seen'&&!waiting?`<input class="vnote" data-asin="${o.ASIN}" placeholder="note…" value="${escapeHtml(v.note||'')}">`:'';
  const who=v.v&&!waiting?`<span class="chg" title="${escapeHtml((v.v==='Seen'?'Marked seen':v.v)+' by '+(v.who||'?')+' · '+fmtWhen(v.at)+(v.via?' · from '+v.via:''))}">${v.v==='Seen'?'seen':''} ${escapeHtml(v.who||'')} · ${fmtWhen(v.at)}${v.via&&v.v==='Seen'?` <i class="viab">${escapeHtml(v.via)}</i>`:''}</span>`:'';
  const pick=blPick===o.ASIN?`<div class="blpick"><span class="t">Never show again — why?</span>${BL_REASONS.map(r=>`<button type="button" class="vr" data-blr="${r}" data-asin="${o.ASIN}">${r}</button>`).join('')}<button type="button" class="brandb" data-blbrand="${o.ASIN}">Blacklist the whole brand instead…</button></div>`:'';
  return`<div class="verd">${b('Yes')}${b('No')}${b('Maybe')}<button type="button" class="vb B${blPick===o.ASIN?' on':''}" data-bl="${o.ASIN}" title="Blacklist — never show this ASIN again">⃠</button></div>${chips}${note}${who}${pick}`;}
/* b260 (Jack, 4 Oct, at WORSE · "buy £48.71→£4… (−£1.96) …": "why is it worse — improve row"). The reasons under BETTER / WORSE, as short lines that fit
   the column and never cut off: "sell −£3.29", "buy −£1.96". What decided the status comes first (on WORSE the bad news, on BETTER the good), each line
   coloured for good / bad, and the profit move sits next to the pill ("WORSE −£1.96"). Read from the Changed text, so a saved run shows the same. */
function whyParts(changed,status){
  const parts=String(changed||'').split('; ').filter(Boolean).map(raw=>{const t=raw.replace(/^but /,'');let m,tone='',txt=t,key='';
    if((m=t.match(/^(buy|profit|sell) £([\d.]+)→£([\d.]+)/))){const d=+m[3]-+m[2];key=m[1];tone=(m[1]==='buy'?d<0:d>0)?'good':'bad';txt=`${m[1]} ${d<0?'−':'+'}${fmtP(d)}`;}
    else if((m=t.match(/^ROI (-?[\d.]+)→(-?[\d.]+)%/))){key='roi';tone=+m[2]>+m[1]?'good':'bad';}
    else if(/^new: /.test(t)){key='new';tone='good';}
    else if(/^lost: /.test(t)){key='lost';tone='bad';}
    else if(/^selling /.test(t)){key='spm';tone='good';}
    return{raw:t,txt,tone,key};});
  const rank=x=>status==='WORSE'?(x.tone==='bad'?0:x.tone==='good'?1:2):(x.tone==='good'?0:x.tone==='bad'?1:2);
  return parts.map((x,i)=>[x,i]).sort((A,B)=>rank(A[0])-rank(B[0])||((B[0].key==='profit')-(A[0].key==='profit'))||A[1]-B[1]).map(x=>x[0]);}
function statusCell(o){const sp=`<span class="spill ${({NEW:'new',BETTER:'better',WORSE:'worse',UNCHANGED:'same'})[o.STATUS]}">${o.STATUS}</span>`
    /* b145: BETTER says HOW MUCH better. On the 11→12 Sep Mera pair, 25 leads were "more profitable" — 4 of them by £10+ and 13 by under 25p. Same word, very different news. */
    +(o.STATUS==='BETTER'&&(o.gain||0)>=0.005?`<span class="gainb ${o.gain>=1?'big':''}" title="How much more profit a unit than the last run">+${fmtP(o.gain)}</span>`
      :o.STATUS==='WORSE'&&(o.gain||0)<=-0.005?`<span class="gainb down" title="How much less profit a unit than the last run">−${fmtP(o.gain)}</span>`:'');   /* b260: WORSE says how much worse too */
  const chg=o.back?`<span class="chg back${o.back.sure?' sure':''}" title="${escapeHtml(o.back.sure
      ?`It was a lead on this filter on ${ukDate(o.back.last)}. On the ${ukDate(o.back.gone)} run it was still on the export but Amazon had no price — out of stock. It is back in stock now. Still New: nothing else has changed about how it is treated.`
      :`It was a lead on this filter on ${ukDate(o.back.last)}, then it was not on the ${ukDate(o.back.gone)} export at all. Keepa leaves a product out when Amazon has no price (out of stock) — but also when the price goes back up, so this one is not certain. It is back now. Still New.`)}">${escapeHtml(o.Changed)}</span>`
    :o.Changed?(()=>{const badge=(o.STATUS==='BETTER'&&(o.gain||0)>=0.005)||(o.STATUS==='WORSE'&&(o.gain||0)<=-0.005);
        const L=whyParts(o.Changed,o.STATUS).filter(x=>!(badge&&x.key==='profit'));if(!L.length)return'';const show=L.slice(0,3);
        return`<span class="chg why" title="${escapeHtml(whyParts(o.Changed,o.STATUS).map(x=>x.raw).join(' · '))}">${show.map(x=>`<b class="${x.tone}">${escapeHtml(x.txt)}</b>`).join('')}${L.length>show.length?`<b>+${L.length-show.length} more</b>`:''}</span>`;})():'';
  /* b247 (Jack, 4 Oct, at "↑ since seen · Jack": "fuck is this"): it says what it means — better than when that person last looked, and what moved */
  const since=o.QUEUE==='better'&&o.verdict?(()=>{const v=o.verdict,who=v.who||'someone',when=v.at?new Date(v.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'',what=String(o.sinceVerdict||'').split('; ')[0];
    return`<span class="chg since" title="${escapeHtml('Better than when '+who+(v.v==='Seen'?' last looked at it':' said '+v.v)+(when?' on '+when:'')+': '+(o.sinceVerdict||''))}">↑ better since ${escapeHtml(who)} ${v.v==='Seen'?'looked':'said '+escapeHtml(v.v)}${when?' ('+escapeHtml(when)+')':''}${what?'<br>'+escapeHtml(what):''}</span>`;})():'';
  const low=o.low?`<span class="chg" title="Lowest buy we saw, and when — set a Keepa track at it">low was £${o.low.buy.toFixed(2)} on ${escapeHtml(o.low.stamp.slice(8,10))}/${escapeHtml(o.low.stamp.slice(5,7))}</span>`:'';
  const wait=o.QUEUE==='waiting'&&o.waitSince?`<span class="chg wait" title="On the To review list from the ${escapeHtml(ukDate(o.waitSince))} run and nobody on this filter has done it yet — it stays until it is answered, opened in Keepa or marked Done">not done since ${escapeHtml(o.waitSince.slice(8,10))}/${escapeHtml(o.waitSince.slice(5,7))}</span>`:'';   /* b233 */
  /* b283: one hover that explains every part of the note — proof points, the only-Amazon take-off, you sold it, the 60 cap */
  const proofTip=o=>{const p=String(o.proof||''),t=[];if(/max 60/.test(p))t.push('Under 50 CONFIRMED sales a month — the score cannot go above 60 until Amazon confirms 50+ a month (Jack, 4 Oct)');
    if(/others sell it/.test(p))t.push((o.proofWhy||'Other sellers have sold it')+' — we know it sells: FBA +4, FBM +2, 100+ a month +1 (never past 90)');
    if(/only Amazon/.test(p))t.push(o.proofWhy||'Nobody but Amazon has sold it — less sure we can sell it: −3');
    if(/you sold it/.test(p))t.push('You have sold this exact ASIN before (your Replen storefront list) — +3 on a lead that is already 70+');return t.join('\n');};
  const proof=o.proof?`<span class="chg proof ${o.proof[0]==='+'?'up':'cap'}" title="${escapeHtml(proofTip(o))}">${escapeHtml(o.proof)}</span>`:'';
  return sp+chg+since+wait+proof+low;}   /* b260: the reasons sit right under the pill they explain */
function renderTable(){{const lt=$('#leads');if(lt){if(lt.style.minHeight)lt.style.minHeight='';const hb=lt.parentElement;if(hb&&hb.style.minHeight&&!view.q)hb.style.minHeight='';}}   /* b260 */
  paintLeadFilt();const all=visible();const pages=Math.max(1,Math.ceil(all.length/PAGEN()));if(view.page>pages)view.page=pages;
  const rows=all.slice((view.page-1)*PAGEN(),view.page*PAGEN());
  /* b229 (Jack, 1 Oct: "have we improved this — I have asked about clarification on this before"). The header said one thing four ways
     ("46 to do", "To review 71", "25 of 71 answered", "25 done") and never said how 71 and 85 relate — and the tab counted o.QUEUE while the
     headline counted today's list, so after a reload they could disagree. Now ONE set (exactly what the To review tab shows) feeds the tab,
     the headline and the bar, and the line under it says how the numbers add up: 71 = 45 new + 26 better · 85 = those + 14 worse + 0 same. */
  const day=dayList(),inRev=o=>!!(o.QUEUE||touched.has(o.ASIN)||(day&&day.has(o.ASIN)));
  {const out=result.out,revRows=out.filter(inRev),c={REVIEW:revRows.length,ALL:out.length,NEW:0,BETTER:0,WORSE:0,UNCHANGED:0};out.forEach(o=>{if(c[o.STATUS]!=null)c[o.STATUS]++;});
    document.querySelectorAll('#fSeg button').forEach(b=>{b.classList.toggle('on',b.dataset.st===view.status);const n=b.querySelector('b');if(n)n.textContent=c[b.dataset.st]||0;});
    const h=$('#lvHelp');if(h){const rest=out.filter(o=>!inRev(o)),cn=st=>revRows.filter(o=>o.STATUS===st).length,rn=st=>rest.filter(o=>o.STATUS===st).length;
      const nN=cn('NEW'),nB=cn('BETTER'),nW=revRows.length-nN-nB;   /* b233: + the ones still waiting from an earlier run */
      h.innerHTML=`<b>To review ${c.REVIEW}</b> = the <b>${nN} new</b> + <b>${nB} better</b> since the last run`+(nW?` + <b>${nW} not done yet</b> from an earlier run`:'')+` — do these.`
        +(rest.length?` <b>All leads ${c.ALL}</b> = those + ${rn('WORSE')} worse${rn('UNCHANGED')?' + '+rn('UNCHANGED')+' the same':''} — look if you want.`:'')
        +` Y / N / M saves as you click · ⃠ = never show again`;}
    /* b251: its own line, so a one-off check (which has its own fixed help text) says it too */
    {const ol=$('#oaLine');if(ol){const on=!!(result.oa&&result.oa.length&&!result.stored&&cur.rule===1);ol.hidden=!on;
      if(on){const k=result.oa.filter(o=>o.else&&o.else.ok).length,t=result.oa.filter(o=>o.else&&!o.else.ok&&o.else.profit>0).length;
        ol.innerHTML=`At the bottom of All leads: <b>${result.oa.length.toLocaleString()}</b> more that sell well but Amazon is not selling`+(k?` — <b class="oak">${k} still profitable from another seller</b>`:` — none make ${OA_OK_ROI}%+ from another seller right now`)+(t?` (${t} make a little)`:'')+` · <a href="#" id="oaJump">show me ↓</a>`;}}}
    const lc=$('#leadCount');
    if(view.status==='REVIEW'){const doneRows=revRows.filter(doneToday);   /* an answer TODAY by this filter's people (owner or you) — a VA's Seen (opened in Keepa) is her review */
      const byWho={};doneRows.forEach(o=>{const w=doneBy(o);byWho[w]=(byWho[w]||0)+1;});
      const whoTxt=Object.entries(byWho).sort((a,b)=>b[1]-a[1]).map(([w,n])=>`${escapeHtml(w)} ${n}`).join(' · ');
      lc.innerHTML=`To review · <b>${revRows.length-doneRows.length} left</b><span class="ldone"> of ${revRows.length} · ${doneRows.length} done${whoTxt?' ('+whoTxt+')':''}</span>`;
      paintDayBar(revRows.length,doneRows.length);}
    else{paintDayBar(0,0);lc.textContent='';}}
  if($('#leadCount').textContent==='')$('#leadCount').textContent=({REVIEW:'To review',ALL:'All leads',NEW:'New',BETTER:'Better',WORSE:'Worse',UNCHANGED:'Unchanged'})[view.status]+(all.length===result.out.length?` (${all.length})`:` (${all.length} of ${result.out.length})`);
  const asin=o=>`<td class="asin">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></td>`;
  const sel=o=>`<td class="sel"><input type="checkbox" data-sel="${o.ASIN}"${view.sel.has(o.ASIN)?' checked':''}></td>`;
  const pend=b=>bbStatusFor(b)==='pending'?`<i class="ch pend" title="Brand blacklist requested — waiting for Jack">BRAND BLACKLIST PENDING</i>`:'';
  let h;const RH=[];let H0=-1;   /* b276: each row's HTML, so a redraw swaps in only the rows that changed */
  if(!all.length){const n=result.out.length;
    /* b129: the empty To-review state was a dead end — a VA read "hit All leads above" and had to find it. One button. */
    $('#leads')._paint=null;$('#leads').innerHTML=`<tbody><tr><td class="emptyrow">${view.status==='REVIEW'?`<b>Nothing new to review.</b><span>Every lead on this run is the same as or worse than the last run, or already judged and not improved since.</span>${n?`<button type="button" class="btn solid sm" id="seeAll">See all ${n} lead${n===1?'':'s'}</button>`:''}`:'<b>Nothing matches.</b>'}</td></tr></tbody>`;
    const b=$('#seeAll');if(b)b.addEventListener('click',()=>{view.status='ALL';view.page=1;renderTable();});
    $('#pager').innerHTML='';$('#openSel').textContent='Open in Keepa';paintDoneBtn();return;}   /* b248: Done stays, even with nothing left to review */
  const asinl=o=>`<span class="asinl">${o.ASIN}<button type="button" data-copy="${o.ASIN}" title="Copy ASIN">${ICONS.copy}</button></span>`;
  const roiCls=v=>v>=20?'pos':v>=10?'pos soft':v>=0?'warm':'neg';
  const mk=m=>`<i class="mk">${FLAG[m]||''} ${m}</i>`;
  /* Rule 1's flag strings are long; show a short label, keep the full text on hover */
  const SHORT=[[/PRIME DEAL/,()=>['★ Prime deal','prime']],[/^worst case \(Buy Box 90d (£[\d.,]+)/i,(m)=>['Worst case '+m[1],'info']],[/sell price volatile/i,()=>['Volatile sell','warn']],[/AMAZON OWNS THE BUY BOX/i,()=>['Amazon owns BB','warn']],[/UK buy: check OA/i,()=>['Check OA','good']],[/A2A->OA/i,()=>['OA only','info']],[/NOT A DROP/i,()=>['Not a drop','warn']],[/not in a drop/i,()=>['UK not in a drop','warn']],[/EU PLUG|PLUG/i,()=>['EU plug?','bad']],[/WIDE/i,()=>['Wide gap','warn']],[/no FBA/i,()=>['No FBA history','warn']],[/LIMITED|LTD/i,()=>['Ltd time deal','warn']],[/drops only/i,()=>['Demand from drops','warn']],[/tanked/i,()=>['FBA price falling','warn']],[/^0% VAT/i,()=>['0% VAT','good']],[/price-match/i,()=>['Price-match','good']]];
  const shortFlag=f=>{for(const [re,fn] of SHORT){const m=re.exec(f);if(m)return fn(m);}return[f.length>26?f.slice(0,24)+'…':f,''];};
  const flagChip=f=>{f=String(f).replace(/^0% VAT — 0% VAT —/,'0% VAT —');const [l,c]=shortFlag(f);return`<i class="ch ${c}" title="${escapeHtml(f)}">${escapeHtml(l)}</i>`;};   /* b260: rule 1 (frozen) doubles the prefix */
  /* the OA check: which retailers to look at for THIS product, and the tick boxes for what the VA has confirmed */
  const hb=o=>/health|beauty|drugstore/i.test(o.Category||'');
  const pmOpts=o=>o['Category kind']==='grocery'?(hb(o)?['Boots','Superdrug','Brand direct']:['Tesco','Boots','Brand direct']):PM_OPTIONS;
  /* b230 (Jack, 1 Oct, on a Logitech mouse bought at £13.99 with Business 30%, ROI 78%: "remember cost price is what we can buy it for" —
     the cell said "OA · Logitech 10% → 42% ROI", i.e. £17.99, DEARER than what we already pay). A route only shows when it beats the real
     cost; when the brand's own route is dearer it says so in grey, so nobody goes checking it. "up to" for a promo brand (Jack: "Logitech is
     up to 10% off — unsure on exact amount"). */
  const oaCell=o=>{const fact=factGet(o.ASIN);const opts=pmOpts(o);const conf=(fact.pm||[]);
    /* b26 (Jack: "don't forget the discount on Shark and Ninja… tell us to go to OA check"): the brand's own code is named outright */
    let best='';const P=o.pot||[];const cost=+o['After discount £']||0,roiNow=+o['ROI %']||0;
    if(P.length){const be=discForBrand(o.Brand);const bp=P.find(x=>be?x.who===be.name:/ direct$/.test(x.who));const better=P.filter(x=>x.roi>roiNow+0.05&&(!cost||x.cost<cost-0.005));
      const b=better.length?better.reduce((m,x)=>x.roi>m.roi?x:m,better[0]):null;const bpOk=bp&&better.includes(bp);
      const parts=[];if(bpOk&&bp.roi>=5)parts.push(`<b>OA · ${escapeHtml(bp.who)} ${discPctLab(bp.who,bp.pct)}</b> → ${pct(bp.roi)} ROI`);
      if(b&&b.roi>=8&&(!bpOk||b.who!==bp.who))parts.push(`${bpOk?'or ':'<b>Check OA</b> · '}up to ${pct(b.roi)} ROI with a code`);
      if(parts.length)best=`<div class="oabest" title="${escapeHtml(better.map(x=>`${x.who} ${discPctLab(x.who,x.pct)} → £${x.cost.toFixed(2)} · ${pct(x.roi)} ROI`).join(' · '))}">${parts.join(' · ')}</div>`;
      else if(bp&&cost&&bp.cost>=cost-0.005)best=`<div class="oabest dim" title="${escapeHtml(bp.who)} ${discPctLab(bp.who,bp.pct)} off Amazon's £${(+o['Buy at £']||0).toFixed(2)}">${escapeHtml(bp.who)} ${discPctLab(bp.who,bp.pct)} = £${bp.cost.toFixed(2)} — dearer than your £${cost.toFixed(2)}, skip</div>`;}
    else if(o['Category kind']==='grocery')best=`<div class="oabest dim">${hb(o)?'Boots / Superdrug':'Tesco / Boots'} — check by eye, they don't price-match Amazon</div>`;
    return`${best}<div class="pms">${opts.map(x=>`<button type="button" class="pm${conf.includes(x)?' on':''}" data-pm="${x}" data-asin="${o.ASIN}" title="Tick when you have confirmed ${x} has it at a price that works">${pmLabel(x)}</button>`).join('')}</div>${pmHint(o.Brand)}`;};
  /* Rule 1, UK buy: what the same lead looks like taken to OA — landed less a price-matcher's code. Display only; rule1.js is frozen. */
  const oaChip=o=>{if(o['Buy market']!=='UK')return'';const landed=+o['Landed £'],p=+o['Profit £'];if(!landed)return'';const V=zeroVatLead(o)?1:1.2;
    const list=[];const be=discForBrand((cur.brands&&cur.brands[0])||cur.name);if(be){const r=discRate(be,landed);if(r>0)list.push([be.name,r]);}
    discMatchers().forEach(e=>{const r=discRate(e,landed);if(r>0&&!list.some(x=>x[0]===e.name))list.push([e.name,r]);});
    const rows=list.map(([who,pct])=>{const c=landed*(1-pct/100);const pp=p+(landed-c)/V;return{who,pct,p:pp,roi:c?100*pp/c:0};}).sort((a,b)=>b.roi-a.roi);
    if(!rows.length)return'';const b=rows[0];const br=be?rows.find(x=>x.who===be.name):null;if(b.roi<8&&!(br&&br.roi>=5))return'';const fact=factGet(o.ASIN);const conf=(fact.pm||[]).length;
    const lab=(br&&br.roi>=5)?`OA · ${br.who} ${discPctLab(br.who,Math.round(br.pct*10)/10)} → ${Math.round(br.roi)}% ROI`:`Check OA · up to ${Math.round(b.roi)}% ROI`;
    return`<i class="ch ${conf?'good':'oa'}" title="${escapeHtml(rows.map(x=>`${x.who} ${Math.round(x.pct*10)/10}% → £${x.p.toFixed(2)} profit · ${Math.round(x.roi)}% ROI`).join(' · '))}">${escapeHtml(lab)}</i>`;};
  const pmRow=o=>o['Buy market']!=='UK'?'':`<div class="pms pms-r1">${PM_OPTIONS.map(x=>`<button type="button" class="pm${(factGet(o.ASIN).pm||[]).includes(x)?' on':''}" data-pm="${x}" data-asin="${o.ASIN}" title="Tick when you have confirmed ${x} price-matches">${pmLabel(x)}</button>`).join('')}</div>`;
  if(cur.rule===1){h=`<thead><tr><th></th><th>#</th><th>Score</th><th>Product</th><th>Verdict</th><th class="r">Landed £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">/mo</th><th>Flags · OA check</th></tr></thead><tbody>`;
    rows.forEach((o,i)=>{const s0=h.length;if(H0<0)H0=s0;const fl=(o.Flags||'').split('; ').filter(Boolean);const band=bandOf(o.Score||1);h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''} band-${band}${verdGet(o.ASIN)?' rdone':''}" data-asin="${o.ASIN}">${sel(o)}<td class="idx">${(view.page-1)*PAGEN()+i+1}</td><td class="scorec"><span class="score ${band}">${o.Score||1}</span><div class="stat2">${statusCell(o)}</div></td>
      <td class="prod"><span class="t" title="${escapeHtml(o.Title)}">${escapeHtml(o.Title)}</span><span class="s">${asinl(o)}<span>${escapeHtml(o['Sell used'])}${o['LTD badge']?' · <b>LTD</b>':''}</span></span>${acts(o)}${pend(cur.name)}</td>
      <td class="vcell">${verdCell(o)}</td>
      <td class="num r buyc">${mk(o['Buy market'])} <b>${gbp(o['Landed £'])}</b>${o['Discount applied']?`<span class="sub">${escapeHtml(o['Discount applied'])}</span>`:''}</td>
      <td class="num r sellc"><b class="${o.yourSell?'yours':''}">${gbp(o['Sell £ used'])}</b>${o.yourSell?`<span class="sub">yours · rule said ${gbp(o['Rule sell £'])}</span>`:((o['Sell low £']||0)>0&&(o['Sell low £']||0)<(o['Sell £ used']||0)-0.005?`<span class="sub" title="If it only ever fetches the Buy Box 90d average">worst £${(o['Sell low £']).toFixed(2)}</span>`:'')}<input class="ysell" data-asin="${o.ASIN}" type="number" step="0.01" min="0" placeholder="your £" value="${o.yourSell?o['Sell £ used']:''}" title="Read the graph? Type what it really sells at and the profit re-works">${lvlPicker(o.ASIN,o['Sell £ used'])}</td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}"><b>${gbp(o['Profit £'])}</b></td><td class="num r ${roiCls(o['ROI %'])}"><b>${pct(o['ROI %'])}</b></td>
      <td class="num r demc">${o.SPM}<span class="sub">${o['SPM from']}${o.Options?` · 1 of ${o.Options}`:''}</span></td>
      <td class="flagc">${typeof primeNote==='function'?primeNote(o):''}${(()=>{const oa=oaChip(o),fx=flagPick(fl.filter(f=>!/★ PRIME DEAL|^PREP FEE OFF/.test(f)));const fe=String(o['Fees from']||'').startsWith('ESTIMATED')?`<i class="ch feeest" title="Keepa has no fee figure for this product on Amazon UK (no FBA seller and no size on the listing yet), so the fees are worked out from the category and weight: ${o['Referral %']}% referral + £${(+o['FBA fee £']||0).toFixed(2)} FBA. The profit is an estimate — check it in SAS before buying.">fees estimated · check SAS</i>`:'';   /* b259 */
        return`<span class="chips">${fe}${prepChip(o)}${codeNote(o,1)}${oa}${fx.show.map(flagChip).join('')}${fx.rest.length?`<i class="ch more" title="${escapeHtml(fx.rest.join(' · '))}">+${fx.rest.length}</i>`:''}</span>`;})()}${pmRow(o)}</td></tr>`;RH.push(h.slice(s0));});}
  else{h=`<thead><tr><th></th><th>#</th><th>Score</th><th>Product</th><th>Verdict</th><th class="r">Buy £</th><th class="r">Sell £</th><th class="r">Profit £</th><th class="r">ROI</th><th class="r">Demand</th><th title="We cannot see other retailers' prices. These are the ones worth checking for this product — tick what you confirm.">OA check · you check</th></tr></thead><tbody>`;
    rows.forEach(o=>{const s0=h.length;if(H0<0)H0=s0;const pot=o['Potential score']>o.Score+5?o['Potential score']:0;const band=bandOf(Math.max(o.Score,pot));
      const fact=factGet(o.ASIN);const alt=[['Buy Box 90d',o['Buy Box 90d £']],['Buy Box 180d',o['Buy Box 180d £']],['FBA 90d',o['FBA 90d £']],['FBM 90d',o['FBM 90d £']],['Buy Box high',o['Buy Box high £']]].filter(x=>x[1]).map(x=>`${x[0]} ${gbp(x[1])}`).join(' · ');
      const vcls=fact.vat==null?'':(+fact.vat===0?'z':'s');const vtxt=fact.vat==null?(o['VAT %']===0?(cur.vat0?'0% VAT · FILTER':'0% VAT · CONFIRM'):'VAT '+(o['VAT %']!=null&&o['VAT %']!==''?o['VAT %']:20)+'%'):(+fact.vat===0?'0% VAT ✓':'20% VAT ✓');
      h+=`<tr class="${(verdGet(o.ASIN)||{}).v||''} band-${band}${verdGet(o.ASIN)?' rdone':''}" data-asin="${o.ASIN}">${sel(o)}<td class="idx">${o['#']}</td>
      <td class="scorec"><span class="score ${band}">${o.Score}</span>${pot?`<span class="potl" title="Potential score with ${escapeHtml(o['Potential via'])}">→ ${pot}</span>`:''}<div class="stat2">${statusCell(o)}</div></td>
      <td class="prod"><span class="t" title="${escapeHtml(o.Product)}">${escapeHtml(o.Product)}</span><span class="s">${asinl(o)}<span>${escapeHtml(o.Brand)} · ${o['Sells /mo']}/mo ${o['Demand from']}${o.Reviews?' · '+o.Reviews.toLocaleString()+' reviews':''}${o['Age days']!==''?' · '+o['Age days']+'d':''}</span></span>${acts(o)}<span class="chips">${prepChip(o)}${(()=>{const cs=(o.chips||[]).filter(([t])=>!/VAT/.test(t)&&!/★ PRIME DEAL/.test(t));const show=cs.slice(0,4),more=cs.slice(4);return show.map(([t,c])=>`<i class="ch ${c}">${escapeHtml(t)}</i>`).join('')+(more.length?`<i class="ch more" title="${escapeHtml(more.map(x=>x[0]).join(' · '))}">+${more.length}</i>`:'');})()}<button type="button" class="ch vatb ${vcls}" data-vat="${o.ASIN}" title="Rule 3 — click to cycle: 0% VAT set by you → 20% set by you → back to the rule">${vtxt}</button>${pend(o.Brand)}</span></td>
      <td class="vcell">${verdCell(o)}</td>
      <td class="num r buyc"><b>${gbp(o['After discount £'])}</b><span class="sub">${o['Discount applied']?'Amazon '+gbp(o['Buy at £'])+' · '+escapeHtml(o['Discount applied']):(o['Amazon 90d drop %']!==''&&o['Amazon 90d drop %']!=null?o['Amazon 90d drop %']+'% under 90d avg':'')}</span></td>
      <td class="num r sellc"><b>${gbp(o['Sell for £'])}</b><span class="sub conf-${o['Sell confidence']}" title="${escapeHtml(o['Sell from']+' — '+alt)}">${escapeHtml(shortSell(o['Sell from']))}</span><input class="ysell" data-asin="${o.ASIN}" type="number" step="0.01" placeholder="your £" value="${fact.sell||''}" title="What the graph says it really sells for — saved, and used for the refit">${lvlPicker(o.ASIN,o['Sell for £'])}</td>
      <td class="num r ${o['Profit £']>=0?'pos':'neg'}"><b>${gbp(o['Profit £'])}</b></td><td class="num r ${roiCls(o['ROI %'])}"><b>${pct(o['ROI %'])}</b></td>
      <td class="num r demc">${o['Sells /mo']}<span class="sub">/mo${o['Demand from']?' · '+escapeHtml(o['Demand from']):''}${o.Options?` · 1 of ${o.Options}`:''}</span></td>
      <td class="pmc">${typeof primeNote==='function'?primeNote(o):''}${codeNote(o,2)}${oaCell(o)}</td></tr>`;RH.push(h.slice(s0));});}
  const T0=h.length;h+=oaRowsHtml();   /* b247 */
  leadsPaint(h+'</tbody>',H0<0||RH.reduce((n,x)=>n+x.length,0)!==T0-H0?null:h.slice(0,H0),RH,h.slice(T0)+'</tbody>');   /* anything between the rows = draw it whole */
  const from=all.length?(view.page-1)*PAGEN()+1:0,to=Math.min(all.length,view.page*PAGEN());
  let pg='';const win=[...new Set([1,2,view.page-1,view.page,view.page+1,pages-1,pages].filter(p=>p>=1&&p<=pages))].sort((a,b)=>a-b);
  let last=0;win.forEach(p=>{if(p-last>1)pg+='<span style="padding:0 4px;color:var(--faint)">…</span>';pg+=`<button data-pg="${p}" class="${p===view.page?'on':''}">${p}</button>`;last=p;});
  $('#pager').innerHTML=`<span>Showing ${from}–${to} of ${all.length}${view.sel.size?` · <b>${view.sel.size} selected</b>`:''}${pages>1&&view.page<pages?` · <span class="pghint">${all.length-to} more on the next page — ↓ carries on</span>`:''}</span><div class="pg"><button data-pg="${view.page-1}" ${view.page<=1?'disabled':''}>‹</button>${pg}<button data-pg="${view.page+1}" ${view.page>=pages?'disabled':''}>›</button></div>`;
  {const n=view.sel.size||all.length,P=Math.ceil(n/OPEN_ALL_MAX),p=(view.openPart||0)%Math.max(1,P);
    $('#openSel').textContent=view.sel.size?`Open ${view.sel.size} ticked in Keepa`:n<=OPEN_ALL_MAX?`Open all ${n} in Keepa`:`Open ${(p*OPEN_ALL_MAX+1).toLocaleString()}–${Math.min(n,(p+1)*OPEN_ALL_MAX).toLocaleString()} of ${n.toLocaleString()} in Keepa`;}
  $('#openSel').title=isJack()?'Opens them in one Keepa tab. Your opens mark nothing — press ✓ Done when you have looked.':'Opens them in one Keepa tab — and counts them as done by you (Put back undoes it).';
  paintDoneBtn();   /* b248 */
  setupKeys();paintJudged();paintEuLeads();document.querySelectorAll('.ltbl tbody tr.active').forEach(r=>r.classList.remove('active'));if(view.active){const tr=document.querySelector(`.ltbl tbody tr[data-asin="${view.active}"]`);if(tr)tr.classList.add('active');}}
/* b276 (Jack, 6 Oct: "any way to improve it at all"): every Y / N / M press redrew all the rows (328 rows = 27,000 elements) and the
   browser laid the whole table out again — ~0.3 s a click. Same header, same rows below = only the rows whose HTML changed are swapped in.
   Anything else (a new run, a filter, a different page, rows added or gone) is drawn whole, exactly as before. */
function leadsPaint(full,head,rows,tail){const lt=$('#leads');if(!lt)return;const P=lt._paint,tb=lt.tBodies[0];
  if(head!=null&&P&&P.head===head&&P.tail===tail&&P.rows.length===rows.length&&tb&&lt.tBodies.length===1&&tb.rows.length>=rows.length){
    let n=0;const tmp=document.createElement('tbody');
    for(let i=0;i<rows.length;i++){if(rows[i]===P.rows[i])continue;tmp.innerHTML=rows[i];const nr=tmp.firstElementChild;if(!nr){n=-1;break;}tb.rows[i].replaceWith(nr);n++;}
    if(n>=0){lt._paint={head,tail,rows,swapped:n};return;}}
  lt.innerHTML=full;lt._paint=head!=null?{head,tail,rows,swapped:'all'}:null;}
/* b23 density pass (Jack, 14 Sep: "too busy") — the Sell cell already shows the worst case and the retailer buttons say
   "check OA", so those two flags are noise; the rest are ranked and only two show, the others sit behind "+n" on hover */
const FLAG_RANK=[/PRIME DEAL/,/EU PLUG|PLUG CHECK/i,/tanked/i,/NOT A DROP/i,/no FBA seller/i,/LIMITED TIME/i,/AMAZON OWNS/i,/WIDE SELL/i,/volatile/i,/drops only/i,/not in a drop/i,/A2A->OA/i,/^0% VAT/i];
/* b274: a lead that sells under £11 carries no £1 handling (Jack preps it himself) — say so on the row, because SAS will show £1 less */
/* b280 (Jack, 6 Oct: "write in what a discount code would be — ROI, profit and score — show normal, then notes with x% off — remember we
   said flat 5%ish"). The row stays at the normal price. The note is the same lead bought 5% under Amazon's normal UK price (a retailer
   price-match + code). Only when that beats what the row already pays (a Prime or S&S price can be cheaper) and never on grocery. */
const OA_FLAT=5;
function codeNote(o,rule){if(!o)return'';let base,real,sell,spm,low,p,roi;
  if(rule===1){base=+o['UK Amazon now £']||0;real=+o['Landed £']||0;sell=+o['Sell £ used']||0;spm=+o.SPM||0;if(/grocery/i.test(o.Category||''))return'';}
  else{base=+o['Buy at £']||0;real=+o['After discount £']||base;sell=+o['Sell for £']||0;spm=+o['Sells /mo']||0;if(o['Category kind']==='grocery')return'';}
  if(!base||!sell)return'';const c=Math.round(base*(1-OA_FLAT/100)*100)/100;if(c>=real-0.005)return'';low=sell<R2.LOW_TICKET;
  if(rule===1){const kg=+o.kg||0,ref=(+o['Referral %']||15)/100,fba=+o['FBA fee £']||BR.DEF_FBA;[p,roi]=brProfit(sell,c,ref,fba,kg,zeroVatLead(o)?0:null,o.Category||'');}
  else{const r=rawRowOf(o.ASIN)||{},ref=(kNum(r['Referral Fee %'])||R2.DEF_REF)/100,fba=kNum(r['FBA Pick&Pack Fee'])||R2.DEF_FBA,vat=o['VAT %']!=null&&o['VAT %']!==''?(+o['VAT %'])/100:R2.VAT;[p,roi]=r2prof(sell,c,ref,fba,vat);}
  const sc=proofScore(Object.assign({},o,{Score:r2score(p,roi,spm,low),'Potential score':0}),rule).Score;
  return`<i class="ch code" title="If a retailer price-matches Amazon's normal price (${gbp(base)}) and a ${OA_FLAT}% code goes on top — the flat ${OA_FLAT}% we work to. The row above is the normal buy; this is the same lead with the code.">${OA_FLAT}% code: ${gbp(c)} → ${gbp(p)} · ${pct(roi)} · score ${sc}</i>`;}
function prepChip(o){return o&&o['Prep fee £']===0?`<i class="ch good" title="${escapeHtml((typeof SELF_PREP_NOTE!=='undefined'&&SELF_PREP_NOTE)||'')}">PREP OFF · +£1 vs SAS</i>`:'';}
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
/* b230: a promo brand's % is a ceiling, not a promise — "up to 10%" */
function discPctLab(who,pct){const e=typeof discAll==='function'?discAll().find(x=>x.name===who):null;return(e&&(e.promo||e.upTo)?'up to ':'')+pct+'%';}
function pmHint(brand){const e=typeof discForBrand==='function'?discForBrand(brand):null;if(!e||!e.note)return'';return`<div class="pmhint" title="${escapeHtml(e.name+': '+e.note)}">${escapeHtml(e.note)}</div>`;}
/* best ROI a Rule 1 UK row reaches with the brand's own code or a price-matcher's — the OA chip's maths, shared with run() */
/* b260: Rule 1 flags a 0%-VAT lead "0% VAT — …" (since b103); the code-price maths below was still looking for the old word ZERO-RATED, so on tea / coffee
   a code's saving was divided by 1.2 and a lead that reached 10% with a code could be cut as "no code gets it to 10%" */
function zeroVatLead(o){return/(^|; )0% VAT/.test((o&&o.Flags)||'');}
function codeBestRoi(o){if(!cur||o['Buy market']!=='UK')return -99;const landed=+o['Landed £'],p=+o['Profit £'];if(!landed)return -99;const V=zeroVatLead(o)?1:1.2;
  const list=[];const be=discForBrand((cur.brands&&cur.brands[0])||cur.name);if(be){const r=discRate(be,landed);if(r>0)list.push(r);}
  discMatchers().forEach(e=>{const r=discRate(e,landed);if(r>0)list.push(r);});
  return list.reduce((m,pct)=>{const c=landed*(1-pct/100);const pp=p+(landed-c)/V;return Math.max(m,c?100*pp/c:-99);},-99);}
function bandOf(sc){return sc>=70?'hi':sc>=50?'md':sc>=30?'lo':'weak';}
function leadOf(a){return result?result.out.find(o=>o.ASIN===a):null;}
/* b142: every lead this source marked SEEN today — what the old Open button stamped, and what "Mark all as seen" stamps.
   Yes / No / Maybe are never in here, so putting them back can only restore a queue, never lose a real answer. */
/* the NEWEST day that has seen-marks on this source, not just today — so the button is still there when Jack pushes this tomorrow */
/* b233: + the looked-at stamps (Open in Keepa / ✓ Done) this source put on leads that keep a real Yes / No / Maybe */
function seenMarkDay(v){if(!v)return'';if(v.v==='Seen')return(!v.source||v.source===cur.key)&&v.at?String(v.at).slice(0,10):'';
  const sn=v.state&&v.state.seen;if(!sn)return'';return Object.values(sn).filter(e=>e&&e.src===cur.key&&e.at).map(e=>String(e.at).slice(0,10)).sort().pop()||'';}
function seenToday(){if(!result||!cur)return[];const V=verdAll();
  const mine=(result.out||[]).filter(o=>seenMarkDay(V[o.ASIN]));
  if(!mine.length)return[];
  const last=mine.map(o=>seenMarkDay(V[o.ASIN])).sort().pop();
  return mine.filter(o=>seenMarkDay(V[o.ASIN])===last).map(o=>o.ASIN);}
function seenTodayDay(){if(!result||!cur)return'';const V=verdAll();const a=seenToday();return a.length?seenMarkDay(V[a[0]]):'';}
function paintPutBack(sb){if(!sb||!sb.parentNode)return;let ub=$('#putBack');
  if(!ub){ub=document.createElement('button');ub.type='button';ub.id='putBack';ub.className='btn ghost sm putback';sb.parentNode.insertBefore(ub,sb.nextSibling);ub.addEventListener('click',putBackSeen);}
  const n=seenToday().length;ub.hidden=!n;   /* b208: VAs can undo their own Seen marks too */const day=seenTodayDay();
  ub.textContent=day===today()?`Put ${n} back in the queue`:`Put ${n} back in the queue · seen ${ukDate(day).replace(/^\w+ /,'')}`;
  ub.title=`${n} lead${n===1?'':'s'} on this source were marked SEEN on ${day===today()?'today':ukDate(day)} — by Open in Keepa or ✓ Done. This clears those marks so they are back in To review. Yes / No / Maybe are not touched.`;}
async function putBackSeen(){const list=seenToday();if(!list.length)return;
  const day=seenTodayDay();
  if(!await uiConfirm(`Put ${list.length} lead${list.length===1?'':'s'} back in the queue?\n\nThey were marked SEEN on ${day===today()?'today':ukDate(day)} — by Open in Keepa or ✓ Done.\n\nYour Yes / No / Maybe are not touched.`))return;
  const V=verdAll();verdDelMany(list.filter(a=>V[a]&&V[a].v==='Seen'));seenUnstampMany(list.filter(a=>V[a]&&V[a].v!=='Seen'),cur.key);   /* b233: a real answer keeps itself — only the look comes off */
  result.gone=applyQueue(result.out,result.rule,result.prevMap||{},verdAll(),carryFor(cur)).filter(([a])=>!blAll()[a]);backNote(result);
  touched.clear();renderResults();renderLog();toast(`${list.length} back in the queue`);}
async function markAllSeen(){if(!result||!needMe())return;const list=result.out.filter(o=>!verdGet(o.ASIN));if(!list.length){toast('Everything already has a verdict');return;}
  if(!await uiConfirm(`Mark all ${list.length} leads without a verdict as seen by ${me()}?\n\nThis is the baseline: from the next run only NEW leads and ones that got BETTER are "to review".`,{ok:'Mark them seen'}))return;
  verdSetMany(list.map(o=>({asin:o.ASIN,v:{v:'Seen',reason:'',note:'',source:cur.key,state:o.state}})),'Mark all as seen');
  list.forEach(o=>{o.verdict=verdGet(o.ASIN);o.QUEUE='';o.sinceVerdict='';});touched.clear();renderResults();renderLog();toast(list.length+' marked as seen — baseline set');}
async function onTableClick(e){const cp=e.target.closest('button[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');return;}
  const b=e.target.closest('button');if(!b)return;const a=b.dataset.asin||b.dataset.bl||b.dataset.blbrand||b.dataset.vat||b.dataset.track;if(!a)return;const o=leadOf(a);
  /* b116: a level chip = the sell for this lead, and a lesson for the shape. Tap the one that is on to clear it. */
  if(b.dataset.lv){const f=factGet(a);if(f.lvl===b.dataset.lv)factSet(a,{sell:null,lvl:null,shape:null});else factSet(a,{sell:parseFloat(b.dataset.val),lvl:b.dataset.lv,shape:b.dataset.shape||null});touched.add(a);
    const y=window.scrollY;run();window.scrollTo(0,y);const tr=document.querySelector(`tr[data-asin="${a}"]`)||[...document.querySelectorAll('button.lv')].find(x=>x.dataset.asin===a)?.closest('tr');if(tr)tr.classList.add('lvopen');return;}
  if(b.dataset.pm){const f=factGet(a);const pm=new Set(f.pm||[]);if(pm.has(b.dataset.pm))pm.delete(b.dataset.pm);else pm.add(b.dataset.pm);factSet(a,{pm:[...pm]});touched.add(a);run();return;}
  if(b.dataset.vat!=null){if(!needMe(b))return;const f=factGet(a);const next=f.vat==null?0:(+f.vat===0?20:null);factSet(a,{vat:next});toast(next==null?'Back to the Rule 3 keyword rule':next+'% VAT set on '+a+' — shared');touched.add(a);run();return;}
  if(b.dataset.track!=null){if(!o)return;const f=factGet(a);const sug=f.track?f.track.target:(o.low?o.low.buy:Math.round((o.state.buy*0.9)*100)/100);
    const t=await uiPrompt('Track '+a+' on Keepa — target buy price £',sug,{body:'<p>Leave it blank to stop tracking.</p>',ok:'Save the target',input:{value:sug,mode:'decimal',placeholder:'e.g. 24.99'}});if(t===null)return;const v=parseFloat(t);
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
  if(i.classList.contains('ysell')){clearTimeout(i._t);i._t=setTimeout(()=>keepStill(rowOf(i.dataset.asin),()=>{const v=parseFloat(i.value);factSet(i.dataset.asin,{sell:v>0?v:null});touched.add(i.dataset.asin);run();}),700);return;}
  if(!i.classList.contains('vnote'))return;const v=verdGet(i.dataset.asin);if(v){clearTimeout(i._t);i._t=setTimeout(()=>{v.note=i.value;verdSet(i.dataset.asin,v);},600);}}

/* ============ outputs ============ */
function base(){return today()+'-RULE'+cur.rule+'-'+cur.key;}
function withVerdicts(out){const V=verdAll();return out.map(o=>{const v=V[o.ASIN];const c=Object.assign({},o);if(v){c['GOOD LEAD?']=v.v;c.WHY=[v.reason,v.note,v.who].filter(Boolean).join(' — ');}return c;});}
function dlSheet(){if(!result||!result.out.length){toast('Nothing on the sheet yet',true);return;}
  const hdr=cur.rule===1?R1_HDR:R2_HDR;downloadBlob(base()+'-REVIEW.xlsx',buildXlsx(hdr,withVerdicts(result.out),cur.name+' Rule '+cur.rule));toast(result.out.length+' leads on the sheet');}
function dlCsv(){if(!result||!result.out.length){toast('Nothing on the sheet yet',true);return;}download(base()+'-REVIEW.csv',rowsToCsv(cur.rule===1?R1_HDR:R2_HDR,withVerdicts(result.out)),'text/csv');}
function dlDropped(){if(!result){toast('Run something first',true);return;}download(base()+'-DROPPED.csv',droppedCsv(result),'text/csv');}
const OPEN_ALL_MAX=3000;   /* b242: Keepa's Viewer takes about 3,000 in one link (b215) — was 250, so a big run only ever opened one page */
function openInKeepa(){if(!result){toast('Nothing to open',true);return;}
  const all=visible();const every=view.sel.size?[...view.sel]:all.map(o=>o.ASIN);const part=every.length>OPEN_ALL_MAX?(view.openPart||0)%Math.ceil(every.length/OPEN_ALL_MAX):0;
  const list=every.slice(part*OPEN_ALL_MAX,(part+1)*OPEN_ALL_MAX);view.openPart=every.length>OPEN_ALL_MAX?part+1:0;
  if(!list.length){toast('Nothing to open',true);return;}window.open(keepaLink(list,'2'),'_blank');
  if(typeof actLog==='function'){const by={};result.out.forEach(o=>{by[o.ASIN]=o;});const bt={};list.forEach(a=>{const t=(by[a]&&by[a].BuyType)||'untagged';bt[t]=(bt[t]||0)+1;});
    actLog('open',`Open ${list.length} in Keepa`,cur.key,{as:list.slice(0,400),bt});}   /* b219: which leads were looked at, and how they are bought */
  /* b142 (Jack, 22 Sep: "why only 83 and then I opened KPV and it only shows 1 now — unless I upload new filters I should be able to
     see what I need to run"). b56 made this button ALSO mark every lead it opened as seen, because back then opening them WAS the review.
     It is not any more: he opens them in the Product Viewer to look at them, and the queue emptied under him — 83 to review became 1.
     Opening is looking, not judging. Nothing is marked now. Y / N / M still judge, and "Mark all as seen" still sets the baseline. */
  /* b208 (Jack, 29 Sep: "they won't do Y/N/M on the app but will open it in the Keepa Product Viewer" → "yes, but remember they can view the
     history of it too, as they might have clicked by mistake"). For a VA, opening IS the review: the leads she opened with no verdict are
     marked Seen under her name — they stay on screen this session, "Put N back in the queue" undoes it, and the Lead history shows who and
     when. Jack's own opens still mark nothing (b142). */
  /* b233: every lead opened that is not done today counts — one with an old Yes / No / Maybe too (it keeps that answer; the look is stamped on it) */
  if(!isJack()&&me()){const fresh=list.filter(a=>!doneToday({ASIN:a}));const by={};result.out.forEach(o=>{by[o.ASIN]=o;});
    if(fresh.length){seenStampMany(fresh.map(a=>({asin:a,v:{v:'Seen',reason:'',note:'opened in Keepa',source:cur.key,state:(by[a]||{}).state}})),'Open all in Keepa');
      fresh.forEach(a=>{touched.add(a);const o=by[a];if(o){o.verdict=verdGet(a);o.QUEUE='';}});renderResults();
      toast(`Opened ${list.length} in Keepa · ${fresh.length} marked Seen by ${me()} — clicked by mistake? "Put ${fresh.length} back in the queue" undoes it`);return;}}
  toast(`Opened ${list.length} in Keepa — nothing marked. Y / N / M judge a row; ✓ Done finishes the filter.`);}
/* b233 (Jack, 1 Oct: "add a Done button next to Open in Keepa"). Marks the same leads Open in Keepa would open (ticked, or all, or this page) as done
   by you — for leads looked at without opening them from here, and for Jack, whose opens mark nothing (b142). Same stamp as a VA's open; undo = Put back. */
function doneList(){const all=visible();return(view.sel.size?[...view.sel]:all.map(o=>o.ASIN)).filter(a=>!doneToday({ASIN:a}));}   /* b242: every lead shown, or the ticked ones */
/* b284 (Jack, 7 Oct, with Buy from: UK on and the toast "0 marked looked at — 19 more in To review are hidden by your ticks or filters, so the
   filter is not finished yet": "should be a quick click and be fine — marked as done"). ✓ Done on today's run finishes the WHOLE filter: what is
   on screen (or ticked) plus every To review lead a country / deal chip, the search or the tab was hiding. */
function doneAllList(){const L=doneList();if(!todayRun())return L;const s=new Set(L);result.out.forEach(o=>{if(o.QUEUE&&!doneToday(o))s.add(o.ASIN);});return[...s];}
/* b248 (Jack, 4 Oct, after pressing the small "✓ All looked at" and finding the row still amber: "I pressed this button — why is it yellow?").
   Two buttons was one too many. There is ONE Done, next to Open in Keepa, as he first asked (b233): it marks the leads shown as looked at by you
   and stamps today's run finished — name, time, green row. With leads ticked, or a country / deal filter hiding some, it marks those and says
   how many are still left; the stamp lands when nothing in To review is left. The button on the right is only "Next due →" again. */
/* b251 (Jack, 3 Oct, on a Drop & check run with only "Done — back to Brands / Filters" far right: "want the done next to open pls"):
   a one-off gets the same ONE Done next to Open all — it marks the leads looked at and stamps the check done; the button on the right is only the way back. */
function todayRun(){if(!cur||!result||result.past||result.apiLook)return null;const r=runLast(cur.key);return r&&(r.day||String(r.at).slice(0,10))===today()?r:null;}
function paintDoneBtn(){{const de=$('#doneEmpty');if(de&&!de.hidden&&result)de.hidden=true;}   /* b260: "Keepa showed 0 results" goes as soon as there are leads */
  const db=$('#doneSel');if(!db)return;if(!result){db.hidden=true;db.classList.remove('notyet');return;}
  /* b265 (Mera, 5 Oct: "do I need to tick Done here? I can't see where the button is" — on the 14 Sep run of a filter she had not exported today;
     Jack: "fix that mini bug so it's fully a done button"). An older run (opened from history, or the saved run shown because nothing has been
     dropped today) had no Done at all, or a "✓ Mark the 5 left of 28 as looked at" button in its place. Now the ONE Done is always there, in the
     same place, and on an older run it says what to do: Done finishes TODAY's run, so today's export goes in first. */
  {const old=result.past||(!todayRun()&&!result.apiLook&&!(cur&&cur.drop));db.classList.toggle('notyet',!!old);
    if(old){const at=result.past?result.past.at:(runLast(cur.key)||{}).at;db.hidden=false;db.disabled=false;db.classList.remove('isdone');
      db.textContent="✓ Done — drop today's export first";db.title=`This list is the run from ${at?ukDate(at):'an earlier day'}. ✓ Done finishes TODAY's run: drop today's Keepa export in step 1 at the top, then press ✓ Done here.`;return;}}
  {const r0=todayRun();if(r0&&typeof runStale==='function'&&runStale(r0)){db.hidden=false;db.disabled=true;db.classList.remove('isdone');db.textContent=`Over ${STALE_H} hours old — drop today's export to run it again`;db.title=`The files went in ${fmtWhen(r0.at)} and ✓ Done was not pressed within ${STALE_H} hours, so this run no longer counts.`;return;}}   /* b260 */
  const r=todayRun(),n=(()=>{try{return doneList().length;}catch(e){return 0;}})(),left=runDoneLeft(),fin=!!(r&&r.done)&&!left;
  db.hidden=false;db.classList.toggle('isdone',fin);
  /* b250 (Jack, 3 Oct, at "Open all 255 in Keepa" next to "✓ Leads looked at (242)" under "242 left · 13 done": "math not matching up").
     The number read as "242 have been looked at". The button now says what it does to which leads, in the header's own words: N left of T. */
  const tot=(()=>{try{return visible().length;}catch(e){return 0;}})(),what=view.sel.size?`the ${n} ticked`:n===tot?`all ${tot}`:`the ${n} left of ${tot}`;
  if(!r){db.disabled=!n;db.textContent=n?`✓ Mark ${what} as looked at`:'✓ All looked at';db.title='Marks them as looked at by you. This is not today\'s run, so there is nothing to finish.';return;}
  db.disabled=fin;
  const na=(()=>{try{return doneAllList().length;}catch(e){return n;}})(),hid=na-n;   /* b284: Done finishes the whole filter, hidden leads too */
  db.textContent=fin?`✓ Done by ${r.done.who||''} · ${new Date(r.done.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}`:hid>0?`✓ Done — marks the ${na} left as looked at`:n?`✓ Done — marks ${what} as looked at`:'✓ Done';
  db.title=fin?'This filter is finished for today':`Press when you have looked at ${na?'these '+na+' lead'+(na===1?'':'s'):'the leads'}${hid>0?` (${hid} of them are hidden by the Buy from / Deal chips, the search or the tab — Done marks those too)`:''}: marks them looked at by ${me()||'you'} and this filter as DONE — your name and the time go on it, and the row turns green.`;}
/* b265: ✓ Done on an older run: nothing is marked — it takes you to where today's export goes */
function doneNotYet(){const at=result&&result.past?result.past.at:(cur&&runLast(cur.key)||{}).at,when=at?ukDate(at):'an earlier day';
  const eu=cur&&(cur.markets||[]).some(m=>m!=='UK');
  if(typeof actLog==='function')actLog('click','✓ Done pressed on an older run — asked for today\'s export');
  uiDialog({tone:'warn',title:"Put today's export in first",ok:'Take me to the drop box',cancel:'Close',
    body:`<p>This list is the run from <b>${escapeHtml(when)}</b>. <b>✓ Done</b> finishes <b>today's</b> run, so it needs a <b>fresh export from today</b>.</p>
      <ol class="uisteps"><li><span>Press <b>Open in Keepa</b> in step 1 at the top${eu?' — Germany / France: set Keepa\'s flag first':''}</span></li>
      <li><span>In Keepa: <b>Export → All active columns → CSV</b></span></li><li><span>Drop the new file in the box — then press <b>✓ Done</b></span></li></ol>`})
  .then(go=>{if(!go)return;if(result&&result.past){const b=$('#pastBack');if(b)b.click();}
    const z=$('#dropAny');if(z){z.scrollIntoView({behavior:'smooth',block:'center'});z.classList.add('flash');setTimeout(()=>z.classList.remove('flash'),1800);}});}
function finishRun(){if(!result||!cur||!needMe())return;if($('#doneSel')&&$('#doneSel').classList.contains('notyet')){doneNotYet();return;}const r=todayRun();
  if(r&&typeof runStale==='function'&&runStale(r)){toast(`This run is over ${STALE_H} hours old — drop today's export to run it again`,true);return;}   /* b260 */
  const vis=new Set(visible().map(o=>o.ASIN)),list=doneAllList(),hid=list.filter(a=>!vis.has(a)).length;   /* b284: hidden To review leads too */
  if(list.length){const by={};result.out.forEach(o=>{by[o.ASIN]=o;});
    seenStampMany(list.map(a=>({asin:a,v:{v:'Seen',reason:'',note:'marked done',source:cur.key,state:(by[a]||{}).state}})),'Done button');
    list.forEach(a=>{touched.add(a);const o=by[a];if(o)o.verdict=verdGet(a);});view.sel.clear();}
  const left=runDoneLeft();
  if(r&&!left){if(!(r.done&&!r.done.auto)){runSave(runDoneStamp(r,{who:me(),at:nowIso()}));if(typeof actLog==='function')actLog('done','Done pressed · '+cur.name+(list.length?' · '+list.length+' leads marked':''),cur.key);}
    renderResults();paintNext();toast(`${cur.name} — DONE by ${me()}${list.length?` · ${list.length} lead${list.length===1?'':'s'} marked looked at${hid?` (${hid} of them hidden by your filter)`:''}`:''}`);return;}
  renderResults();paintNext();
  toast(r?`${list.length} marked looked at — ${left} more in To review ${left===1?'is':'are'} hidden by your ticks or filters, so the filter is not finished yet`:`${list.length} marked looked at by ${me()}`,!!r);}
function markDone(){if(!result||!cur||!needMe())return;const list=doneList();if(!list.length){toast('All of these are done already');return;}
  const by={};result.out.forEach(o=>{by[o.ASIN]=o;});
  seenStampMany(list.map(a=>({asin:a,v:{v:'Seen',reason:'',note:'marked done',source:cur.key,state:(by[a]||{}).state}})),'Done button');
  list.forEach(a=>{touched.add(a);const o=by[a];if(o)o.verdict=verdGet(a);});view.sel.clear();renderResults();
  toast(`${list.length} marked done by ${me()} — pressed by mistake? "Put ${list.length} back in the queue" undoes it`);}

/* ============ runs log (the 7-day count) ============ */
/* b58 (Jack: "we should be getting a mega amount of data in this too"): the log is filterable, sortable, and rolls up by source / day / person */
const RLOG_KEY='bdl-sourcing-rlog';
const rlog=Object.assign({period:'7d',who:'ALL',rule:'ALL',src:'ALL',q:'',sort:'at',dir:-1,group:'runs',all:false},lsGet(RLOG_KEY,{})||{});
function rlogSave(){const {q,...rest}=rlog;lsSet(RLOG_KEY,rest);}
function periodFrom(p){const t=new Date();t.setHours(0,0,0,0);if(p==='today')return t.getTime();if(p==='7d')return Date.now()-7*864e5;if(p==='30d')return Date.now()-30*864e5;return 0;}
const PERIOD_LABEL={today:'Today',"7d":'Last 7 days',"30d":'Last 30 days',all:'All time'};
function runRows(){const V=verdAll();return runsAll().map(r=>{let y=0,n=0,m=0;(r.asins||[]).forEach(a=>{const v=V[a];if(!v)return;if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;});
  const tr=toReviewCount(r),rowsIn=r.rowsIn||0,leads=r.leads||0,cut=Math.max(0,rowsIn-leads);
  const times=(r.runs&&r.runs.length)||1;   /* b267: runs on the day's record */
  return{r,times,whoRuns:runsOfDay(r).map(x=>x.who||''),at:r.at,ms:new Date(r.at).getTime(),who:r.who||'',key:r.source,name:r.name||r.source,rule:r.rule,files:(r.files||[]).length,rowsIn,cut,pct:rowsIn?Math.round(cut/rowsIn*100):0,leads,new:r.new||0,better:r.better||0,worse:r.worse||0,gone:r.gone||0,y,n,m,tr,jp:leads?Math.round((y+n+m)/leads*100):0,day:String(r.day||r.at).slice(0,10)};});}
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
  const tot={runs:0,rows:0,leads:0,new:0,better:0,y:0,n:0,m:0,tr:0};rows.forEach(x=>{tot.runs+=x.times||1;tot.rows+=x.rowsIn;tot.leads+=x.leads;tot.new+=x.new;tot.better+=x.better;tot.y+=x.y;tot.n+=x.n;tot.m+=x.m;tot.tr+=x.tr;});
  const saved=tot.rows?Math.round((tot.rows-tot.leads)/tot.rows*100):0,lpr=tot.runs?(tot.leads/tot.runs):0;
  /* best source in the period = most leads per run, with at least one run */
  const bySrc={};rows.forEach(x=>{const b=bySrc[x.key]=bySrc[x.key]||{name:x.name,runs:0,leads:0};b.runs++;b.leads+=x.leads;});
  const best=Object.values(bySrc).sort((a,b)=>(b.leads/b.runs)-(a.leads/a.runs))[0];
  const byWho={};rows.forEach(x=>{(x.whoRuns&&x.whoRuns.length?x.whoRuns:[x.who]).forEach(w0=>{const w=w0||'no name';byWho[w]=(byWho[w]||0)+1;});});const busiest=Object.entries(byWho).sort((a,b)=>b[1]-a[1])[0];
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
      <td class="lwhen">${fmtWhen(x.at)}${x.times>1?`<div class="chg" title="${escapeHtml(runsOfDay(x.r).map(z=>new Date(z.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+' '+(z.who||'?')+(z.done?' ✓':'')).join(' · '))}">${x.times} runs that day</div>`:''}</td><td>${whoChip(x.who)}</td>
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
  const u=lsUsage();
  $('#dataInfo').textContent=`${srcAll().length} sources · ${runsAll().length} runs · ${Object.keys(verdAll()).length} verdicts · ${Object.keys(blAll()).length} blacklisted · ${(u.ours/1024).toFixed(0)} KB small store + ${(u.big/1048576).toFixed(1)} MB big store in this browser`;
  paintStoreMeter();}
/* b178: the meter. The small store is the shared 5 MB pot; the big store is where the heavy things went. */
function paintStoreMeter(){const el=$('#storeMeter');if(!el||typeof lsUsage!=='function')return;const u=lsUsage();
  const mb=n=>(n/1048576).toFixed(2)+' MB';const pct=n=>Math.min(100,Math.round(n/u.cap*1000)/10);const full=u.all>u.cap*0.8;
  el.innerHTML=`<div class="smh"><b>This browser's small store</b><span>${mb(u.all)} of about 5 MB — one pot shared by every app on ${escapeHtml(location.hostname)}</span></div>
    <div class="smbar ${full?'warn':''}"><i class="ours" style="width:${pct(u.ours)}%" title="Sourcing"></i><i class="theirs" style="width:${pct(u.others)}%" title="Your other apps"></i></div>
    <div class="smleg"><span><i class="ours"></i>Sourcing ${mb(u.ours)}</span><span><i class="theirs"></i>Your other apps here ${mb(u.others)}</span><span class="big">Pictures, prices, lead history, runs: <b>${mb(u.big)}</b> in the big store, which has no 5 MB limit</span></div>
    ${full?'<div class="smwarn">Nearly full. If a save ever fails a red bar says so and Sourcing keeps working from memory — but another app on this address is using most of the pot.</div>':''}
    ${(()=>{const apps=lsByApp();return apps.length>1?`<div class="smapps"><b>Who is using the pot</b>${apps.slice(0,8).map(a=>`<div class="smapp"><span class="nm">${escapeHtml(a.name)}</span><i style="width:${Math.max(1,Math.round(a.bytes/u.cap*100))}%"></i><span class="sz">${mb(a.bytes)}</span></div>`).join('')}</div>`:'';})()}
    ${(()=>{const it=storeItems();const tot=it.reduce((a,x)=>a+x.bytes,0);const copy=it.filter(x=>x.kind==='copy').reduce((a,x)=>a+x.bytes,0);
      return`<div class="smitems"><b>What Sourcing keeps in this browser</b><span class="smsum">${mb(tot)} in all · <em class="k-copy">${Math.round(copy/Math.max(1,tot)*100)}% is a copy of Supabase</em></span>
        ${it.map(x=>`<div class="smitem"><span class="nm">${escapeHtml(x.name)}</span><span class="kind k-${x.kind}">${STORE_KIND[x.kind]}</span><span class="where">${x.big?'big store':'small pot'}</span><span class="sz">${mb(x.bytes)}</span></div>`).join('')}
        <div class="smclear"><button type="button" class="btn ghost sm" id="storeClearCopies">Clear the Supabase copies and reload them</button><span>Throws away every <b>copy of Supabase</b> in this browser and brings it back fresh. Keepa results, your settings and anything still waiting to send are kept.</span></div></div>`;})()}`;}
/* b180 (Jack, 27 Sep: "can you figure out what is storing the most in MB — most things should be Supabase for this app").
   Every item Sourcing keeps in this browser, in plain words, biggest first, with what it is:
     copy  — a copy of what is in Supabase, kept so the app opens instantly; safe to throw away, it comes back on the next load
     keepa — Keepa results cached for a few hours; not in Supabase, costs tokens to fetch again
     queue — changes waiting to go to Supabase; never thrown away
     local — this browser's own settings (who you are, your sign-in, what view you left open) */
const STORE_KIND={copy:'copy of Supabase',keepa:'Keepa results',queue:'waiting to send',local:'this browser only'};
const STORE_CAT=[
  ['audit-prod','Audit product details (pictures, prices)','copy'],['leadstate','Lead history','copy'],['runs','Run results','copy'],
  ['audit-v','Audit answers','copy'],['sources','Brands & filters','copy'],['verdicts','Yes / No on leads','copy'],['kc','Keepa console Lead / Not a lead','copy'],
  ['audit-shelves','Pasted and pulled audit lists','copy'],['history','Old lead history (from before 13 Sep)','copy'],
  ['facts','Rules, lists and team settings','copy'],['blacklist','Rules, lists and team settings','copy'],['brandbl','Rules, lists and team settings','copy'],['discounts','Rules, lists and team settings','copy'],
  ['catblock','Rules, lists and team settings','copy'],['vat0','Rules, lists and team settings','copy'],['reasons','Rules, lists and team settings','copy'],['team','Rules, lists and team settings','copy'],
  ['signins','Rules, lists and team settings','copy'],['lock','Rules, lists and team settings','copy'],['audit-mine','Rules, lists and team settings','copy'],['audit-archived','Rules, lists and team settings','copy'],['audit-jointdays','Rules, lists and team settings','copy'],
  ['api-rows','Keepa API results (kept 24 hours)','keepa'],['eu-price','EU prices from Keepa (kept 12 hours)','keepa'],['option-sales','Keepa sales lookups (kept 7 days)','keepa'],['api-looks','Keepa sales lookups (kept 7 days)','keepa'],
  ['outbox','Changes waiting to send','queue'],['audit-out','Changes waiting to send','queue'],
  ['session','Your sign-in','local']];
function storeCat(k){const id=k.replace(/^bdl-sourcing-/,'').replace(/^sourcing-suite-/,'');const c=STORE_CAT.find(x=>x[0]===id);return c?{name:c[1],kind:c[2]}:{name:'View settings for this browser',kind:'local'};}
function storeItems(){const by={};lsKeys().filter(k=>/^(bdl-sourcing|sourcing-suite)/.test(k)).forEach(k=>{const raw=lsRaw(k);if(raw==null)return;const c=storeCat(k);const id=c.name;
    const x=by[id]||(by[id]={name:c.name,kind:c.kind,bytes:0,big:false,keys:[]});x.bytes+=k.length+raw.length;x.keys.push(k);if(isBig(k))x.big=true;});
  return Object.values(by).sort((a,b)=>b.bytes-a.bytes);}
async function storeClearCopies(btn){
  if(typeof guestOn==='function'&&guestOn()){toast('Guest mode — leave it first',true);return;}
  if(!cloudEnabled()){toast('The shared database is off in this browser, so there is nothing to reload the copies from',true);return;}
  const left=outbox().length+(typeof audOut==='function'?audOut().length:0);
  if(left){toast(left+' change'+(left===1?' is':'s are')+' still waiting to send — try again in a moment',true);return;}
  btn.disabled=true;btn.textContent='Checking Supabase…';
  try{await cloudGetAll('src_sources','select=key&limit=1');}catch(e){btn.disabled=false;btn.textContent='Clear the Supabase copies and reload them';toast('Supabase is not answering — nothing cleared',true);return;}
  const it=storeItems().filter(x=>x.kind==='copy');const n=it.reduce((a,x)=>a+x.bytes,0);
  if(!await uiConfirm(`Throw away ${(n/1048576).toFixed(2)} MB of copies and reload them from Supabase?\n\nNothing is lost — it all comes straight back. Keepa results, your settings and your sign-in stay.`,{ok:'Clear and reload',tone:'warn'})){btn.disabled=false;btn.textContent='Clear the Supabase copies and reload them';return;}
  it.forEach(x=>x.keys.forEach(k=>lsRemove(k)));if(typeof audState!=='undefined')audState.prod={};
  btn.textContent='Reloading…';setTimeout(()=>location.reload(),700);}
document.addEventListener('click',e=>{const b=e.target.closest('#storeClearCopies');if(b)storeClearCopies(b);});
/* b179 (Jack, 27 Sep: "what apps are taking the most"). Every key in the pot belongs to some app; the first word or two of the key
   says which. Grouped and sorted, biggest first. */
const LS_APP_NAMES={'st':'AVM HQ (ShiftTrack)','bdl-decisions':'AVM HQ (ShiftTrack)','bdl-saved':'AVM HQ (ShiftTrack)','bdl-reimb':'SellerFuse reimbursements','sd':'Spend / A2A dashboard','lv3':'PrepHub (Lavarion)','bdl-sourcing':'Sourcing','sourcing-suite':'Sourcing','bdl-oa':'OA Overview','oa':'OA Overview','bdl-prephub':'PrepHub','prephub':'PrepHub','prep':'PrepHub','a2a':'A2A / OA dashboard','ub':'UB Bundle Tracker','bdl-pl':'PL Sourcing','pl':'PL Sourcing','spend':'spend.dash','sellerfuse':'SellerFuse','removals':'Removals','bdl-hq':'Business HQ','hq':'Business HQ','shifttrack':'AVM HQ (ShiftTrack)','avm':'AVM HQ','shift':'AVM HQ (ShiftTrack)','keepa':'Keepa alerts','loan':'Loan Tracker','shipment':'Shipment Deck','webapp':'Web App Tracker','woj':'World of Jack'};
function lsByApp(){const by={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);const n=k.length+(localStorage.getItem(k)||'').length;
    const m=/^([a-z0-9]+)(?:[-_:.]([a-z0-9]+))?/i.exec(k)||[];let id=(m[1]||k).toLowerCase();if(id==='bdl'&&m[2])id='bdl-'+m[2].toLowerCase();
    const name=LS_APP_NAMES[id]||(id.charAt(0).toUpperCase()+id.slice(1));by[name]=(by[name]||0)+n;}}catch(e){}
  return Object.entries(by).map(([name,bytes])=>({name,bytes})).sort((a,b)=>b.bytes-a.bytes);}
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
  $('#discTbl').addEventListener('click',async e=>{const b=e.target.closest('button[data-di]');if(!b)return;const L=discAll();const x=L[+b.dataset.di];if(!await uiConfirm('Remove '+x.name+' from the discount list?\n\nFor everyone.',{ok:'Remove '+x.name,tone:'danger'}))return;L.splice(+b.dataset.di,1);discSave(L);renderDiscounts();if(result)run();});
  $('#dAdd').addEventListener('click',()=>{const name=$('#dName').value.trim();if(!name){toast('Name needed',true);return;}
    const e={name,type:$('#dType').value,verified:true};const p=parseFloat($('#dPct').value);if(p>0)e.pct=p;const sp=parseFloat($('#dSale').value);if(sp>0)e.salePct=sp;
    if($('#dFull').checked)e.fullPriceOnly=true;const mn=parseFloat($('#dMin').value);if(mn>0)e.minSpend=mn;const n=$('#dNote').value.trim();if(n)e.note=n;
    const L=discAll().filter(x=>x.name.toLowerCase()!==name.toLowerCase());L.push(e);L.sort((a,b)=>a.name.localeCompare(b.name));discSave(L);
    ['dName','dPct','dSale','dMin','dNote'].forEach(id=>$('#'+id).value='');$('#dFull').checked=false;renderDiscounts();toast(name+' added — live on the next run, for everyone');if(result)run();});
  $('#dReset').addEventListener('click',async()=>{if(!await uiConfirm('Reset the discount list?\n\nBack to the 6 Sep reference (+ Gtech, Kenwood), for everyone. Additions go.',{ok:'Reset it',tone:'danger'}))return;discReset();renderDiscounts();toast('Discount list reset');if(result)run();});
  $('#meIn').addEventListener('change',e=>whoSet(e.target.value));
  $('#whoSel').addEventListener('change',e=>whoSet(e.target.value));
  $('#fxIn').addEventListener('input',()=>{if(result)run();});$('#fxRefresh').addEventListener('click',()=>{try{localStorage.removeItem(FX_KEY);}catch(e){}loadFx();});
  $('#reasonAdd').addEventListener('click',()=>{const v=$('#reasonIn').value.trim();if(!v)return;const r=noReasons();if(!r.includes(v))r.push(v);reasonsSave(r);$('#reasonIn').value='';renderSettings();});
  $('#reasonChips').addEventListener('click',e=>{const b=e.target.closest('button[data-rr]');if(!b)return;reasonsSave(noReasons().filter(x=>x!==b.dataset.rr));renderSettings();});
  $('#blTbl').addEventListener('click',async e=>{const b=e.target.closest('button[data-blx]');if(!b)return;if(!needMe())return;const a=b.dataset.blx;if(!await uiConfirm('Take '+a+' off the blacklist?\n\nIt shows again from the next run.',{ok:'Take it off'}))return;blRemove(a);renderBlacklists();toast(a+' removed from the blacklist by '+me());if(result)run();});
  $('#bbTbl').addEventListener('click',async e=>{const d=e.target.closest('button[data-bbd]');if(d){if(!isJack()){toast('Only Jack decides',true);return;}bbDecide(d.dataset.k,d.dataset.bbd);renderBlacklists();renderList();if(result)run();toast(d.dataset.k+' '+d.dataset.bbd);return;}
    const x=e.target.closest('button[data-bbx]');if(!x)return;if(!await uiConfirm('Remove the '+x.dataset.bbx+' request / block?',{ok:'Remove it',tone:'danger'}))return;bbRemove(x.dataset.bbx);renderBlacklists();renderList();if(result)run();});
  $('#bbAdd').addEventListener('click',()=>{if(!needMe())return;const b=$('#bbName').value.trim(),w=$('#bbReason').value.trim();if(!b||!w){toast('Brand and reason both needed',true);return;}bbRequest(b,w,isJack());$('#bbName').value='';$('#bbReason').value='';renderBlacklists();renderList();toast(isJack()?b+' blacklisted':'Sent to Jack');});
  $('#vatSave').addEventListener('click',()=>{const sp=v=>v.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);const w={zero:sp($('#vatZero').value),not:sp($('#vatNot').value)};if(!w.zero.length){toast('Need at least one zero-rated word',true);return;}vat0Save(w);toast('Rule 3 words saved for everyone');if(result)run();});
  $('#catSave').addEventListener('click',()=>{const list=$('#catWords').value.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);if(!list.length){toast('Need at least one word',true);return;}catSave(list);toast('Never-sell categories saved for everyone');if(result)run();});
  $('#catReset').addEventListener('click',()=>{catSave(CAT_DEFAULT.slice());renderSettings();toast('Category list reset');if(result)run();});
  $('#vatReset').addEventListener('click',()=>{vat0Save({zero:R4.ZERO.slice(),not:R4.NOT.slice()});renderSettings();toast('Rule 3 words reset');if(result)run();});
  $('#cloudPullBtn').addEventListener('click',async()=>{if(!cloudEnabled()){toast('Cloud is off in the sandbox',true);return;}toast('Refreshing…');const ok=await cloudPull();onCloudPulled(ok);toast(ok?'Up to date with the shared project':'Could not refresh — '+cloud.err,!ok);});
  $('#cloudSendBtn').addEventListener('click',()=>{if(!outbox().length){toast('Nothing queued');return;}cloudFlush();toast('Sending '+outbox().length+'…');});
  $('#dataExport').addEventListener('click',()=>{const o={};lsKeys().filter(k=>k.startsWith('bdl-sourcing')).forEach(k=>{const v=lsRaw(k);if(v!=null)o[k]=v;});download(today()+'-BDL-SOURCING-BACKUP.json',JSON.stringify(o),'application/json');});   /* b178: both stores */
  $('#dataImport').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await readFileText(f));if(!await uiConfirm('Replace this browser\'s sourcing data with the backup ('+Object.keys(o).length+' keys)?\n\nThe shared copy is not touched until you change something.',{ok:'Replace this browser\'s data',tone:'danger'}))return;Object.entries(o).forEach(([k,v])=>{if(k.startsWith('bdl-sourcing'))lsRawSet(k,v);});toast('Imported — reloading');setTimeout(()=>location.reload(),900);}catch(err){toast('Not a backup file',true);}e.target.value='';});
  /* b260: this sat under "The shared database is not touched by any of these" and then pushed the built-in list over everyone's filters (owners, cadences,
     links, statuses). Now it does what the heading says: this browser's copy is dropped and the shared list is loaded again. Nothing is sent. */
  $('#dataReset').addEventListener('click',async()=>{if(!await uiConfirm('Reload the filter list in this browser from the shared copy?\n\nNothing is sent anywhere — the shared list, runs, history and verdicts are not touched.',{ok:'Reload the list'}))return;
    if(cloudEnabled()&&cloud.tables){if(outbox().length){toast('There are changes still waiting to send — try again in a moment',true);return;}lsRemove(SRC_KEY);toast('Reloading the shared filter list…');const ok=await cloudPull();onCloudPulled(ok);toast(ok?'Filter list reloaded from the shared copy':'Could not reach the shared copy — the built-in list is showing until it can',!ok);}
    else{lsRemove(SRC_KEY);srcAll();renderSettings();renderList();toast('Filter list reset to the built-in one (sandbox — no shared copy here)');}});}

/* after the shared copy lands: repaint everything from it */
function onCloudPulled(ok){whoPaint();renderList();renderLog();renderSettings();if(typeof vneedCheck==='function')setTimeout(()=>vneedCheck(),600);   /* b260 */
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
/* b173: the pill is born with the last number it showed, so it never pops in empty and grows on every page load */
async function paintTokens(){let el=$('#tokPill');const cp=$('#cloudPill');if(!cp)return;if(!el){el=document.createElement('span');el.id='tokPill';el.className='pill tok';el.textContent=lsGet('bdl-sourcing-tokens-last','Keepa · … tokens');cp.parentNode.insertBefore(el,cp);}
  try{const r=await fetch(WORKER+'/health');const t=await r.json();if(t.ok&&t.tokensLeft!=null){el.textContent='Keepa · '+t.tokensLeft.toLocaleString()+' tokens';lsSet('bdl-sourcing-tokens-last',el.textContent);el.title=`Keepa API balance via the Worker · refills ${t.refillRate}/min · nothing runs automatically yet`;el.classList.remove('bad');}
    else{el.textContent='Keepa · no key';el.title=t.error||'Worker answered without a balance';el.classList.add('bad');}}
  catch(e){el.textContent='Keepa · offline';el.title='Could not reach the Worker';el.classList.add('bad');}}
/* b53: deep links for AVM HQ tasks — #run=<source key> opens that run screen, #due opens the Brands list on what's due */
function showTab(tab,quiet){if(!['brands','runs','leads','act'].includes(tab)||(tab==='act'&&!isJack()))tab='brands';lview.tab=tab;if(!quiet)lviewSave();
  document.querySelectorAll('#lvNav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  $('#cardBrands').hidden=tab!=='brands';$('#cardRuns').hidden=tab!=='runs';$('#cardLeads').hidden=tab!=='leads';const ca=$('#cardAct');if(ca)ca.hidden=tab!=='act';if(tab==='act'&&typeof renderActivity==='function')renderActivity();
  if(tab==='runs')renderLog();if(tab==='leads'&&typeof renderHistory==='function')renderHistory();}
function openHash(){let h=location.hash||'';
  if(/^#audit/i.test(h)&&typeof auHash==='function'&&isJack()){auHash();return;}
  /* b61: AVM HQ links carry the VA's name (#run=key&who=Suz) so the who-are-you gate never appears */
  const wm=/[&?]who=([A-Za-z]+)/.exec(h);if(wm&&!(typeof lockOn==='function'&&lockOn())){const w=USERS.find(u=>u.toLowerCase()===wm[1].toLowerCase());if(w&&me()!==w){lsSet(ME_KEY,w);whoPaint();}const g=$('#whoGate');if(w&&g)g.hidden=true;}
  if(wm)h=h.replace(/[&?]who=[A-Za-z]+/,'');   /* b153: the name in a link is ignored while the lock is on, but it still comes out of the address */
  const m=/^#run=([a-z0-9-]+)/i.exec(h);
  const lm=/^#leads=([a-z0-9-]+)/i.exec(h);if(lm&&srcGet(lm[1])){const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b&&!b.classList.contains('active'))b.click();if(cur&&!$('#viewRun').hidden)backToList();historyOpenFor(lm[1]);return;}
  if(/^#(runs|leads|history)\b/i.test(h)){const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b&&!b.classList.contains('active'))b.click();if(cur&&!$('#viewRun').hidden)backToList();showTab(/^#runs/i.test(h)?'runs':'leads');return;}const goBrands=()=>{const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b&&!b.classList.contains('active'))b.click();};
  if(m&&srcGet(m[1])){goBrands();openRun(m[1]);return;}
  if(/^#due/i.test(h)){goBrands();if(cur&&!$('#viewRun').hidden)backToList();const b=document.querySelector('#lSeg button[data-seg="due"]');if(b)b.click();}}
function brandsInit(){if(typeof primeEndOnce==='function')primeEndOnce();   /* b285 */if(typeof bbSeed==='function')bbSeed();if(typeof blSeed==='function')blSeed();paintJackOnly();renderList();renderLog();if(!me())whoGate(true);setTimeout(openHash,50);window.addEventListener('hashchange',openHash);paintTokens();setInterval(paintTokens,10*60*1000);
  /* b30 (Jack: "still loads of dead space on ASUS"): the floors card lives under the run summary, so the two columns come out level */
  {const fr=$('#floorRow'),tc=document.querySelector('#viewRun .twocol');if(fr&&tc)tc.after(fr);}
  $('#brandTbl').addEventListener('click',onListClick);
  /* b52 (Jack: "make it easier to edit and change who the VA is") — owner and cadence change in the row and save for everyone */
  $('#brandTbl').addEventListener('change',e=>{const sel=e.target.closest('select.inl');if(!sel)return;const s=srcGet(sel.dataset.key);if(!s)return;if(sel.classList.contains('ownsel'))s.owner=sel.value;else if(sel.classList.contains('cadsel'))s.cadence=sel.value;else if(sel.classList.contains('stsel')){s.status=sel.value;s.paused=s.status==='paused';}
    srcSave(s);toast(`${s.name}: ${sel.classList.contains('ownsel')?'now '+s.owner+"'s":sel.classList.contains('stsel')?(STATUS_LABEL[s.status]||s.status):CADENCE_LABEL[s.cadence]} — saved for everyone`);renderList();});
  $('#brandTbl').addEventListener('click',e=>{if(e.target.closest('select.inl'))e.stopPropagation();},true);document.addEventListener('click',e=>{if(!e.target.closest('.menu'))closeMenus();});
  $('#approvals').addEventListener('click',onApprovalClick);
  $('#addBrand').addEventListener('click',()=>openEdit(null));
  {let lqT=null;$('#lq').addEventListener('input',e=>{lview.q=e.target.value;clearTimeout(lqT);lqT=setTimeout(renderList,140);});}   /* b228: redraw once typing pauses, like the lead search */
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
  /* b210 (Jack: "easy to drag and drop"): drop a Keepa file ANYWHERE on the run screen, not just the box */
  {const vr=$('#viewRun');let depth=0;const ov=document.createElement('div');ov.id='dropAll';ov.className='dropall';ov.hidden=true;ov.innerHTML='<div><b>Drop your Keepa files</b><span>anywhere — the app works out which country is which</span></div>';document.body.appendChild(ov);
    const isFiles=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
    document.addEventListener('dragenter',e=>{if(!isFiles(e)||vr.hidden)return;depth++;ov.hidden=false;});
    document.addEventListener('dragleave',e=>{if(!isFiles(e)||vr.hidden)return;depth=Math.max(0,depth-1);if(!depth)ov.hidden=true;});
    document.addEventListener('dragover',e=>{if(isFiles(e)&&!vr.hidden)e.preventDefault();});
    document.addEventListener('drop',e=>{if(!isFiles(e)||vr.hidden)return;e.preventDefault();depth=0;ov.hidden=true;if(!e.target.closest('#dropAny'))handleFiles(e.dataTransfer.files);});}
  inp.addEventListener('change',e=>{handleFiles(e.target.files);e.target.value='';});
  zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('over');handleFiles(e.dataTransfer.files);});
  $('#fileChips').addEventListener('click',e=>{const b=e.target.closest('button[data-rm]');if(b)removeFile(b.dataset.rm);});
  $('#euGo').addEventListener('click',euRun);
  $('#asinCopy').addEventListener('click',e=>{const a=$('#asinBar')._all||[];copy(a.join(', '),a.length+' ASINs copied — paste into the UK Product Viewer',e.currentTarget,'Copied');});
  /* b185: thousands of ASINs make a link too long for the browser — copy them and open an empty UK Viewer to paste into */
  document.addEventListener('click',e=>{const v=e.target.closest('#keepaRow a.vwbtn');if(!v)return;e.preventDefault();$('#asinOpen').click();});   /* b209 */
  $('#asinOpen').addEventListener('click',e=>{const a=$('#asinBar')._all||[];if(!a.length){toast('Drop the Finder exports first',true);return;}
    {const P=viewerParts(a);if(P.length>1){const cov=new Set(files.viewer?files.viewer.asins||[]:[]);let i=P.findIndex(p=>!partDone(p,cov));if(i<0)i=0;   /* b215 */
      window.open(keepaLink(P[i],'2'),'_blank');toast(`Part ${i+1} of ${P.length} · ${P[i].length.toLocaleString()} ASINs — the Viewer opens with them loaded: Load list, export all columns, drop the file here`);return;}}
    if(a.length<=VIEWER_LINK_MAX){window.open(keepaLink(a,'2'),'_blank');return;}
    copy(a.join('\n'),`${a.length.toLocaleString()} ASINs copied — in the Viewer that just opened, click in the ASIN box and paste (Cmd+V), then Load`,e.currentTarget,'Copied');
    const am=$('#asinMsg');if(am)am.innerHTML=`<b>${a.length.toLocaleString()} ASINs are on your clipboard</b> — too many for one Keepa link, so the Viewer opened empty on purpose: click in Keepa's ASIN box, <b>Cmd+V</b>, then <b>Load list</b>. Export all columns and drop the file here.`;
    window.open('https://keepa.com/#!viewer','_blank');});
  $('#dlSheet').addEventListener('click',dlSheet);$('#dlCsv').addEventListener('click',dlCsv);$('#dlDropped').addEventListener('click',dlDropped);
  $('#oaCsv2').addEventListener('click',()=>{const R=result;if(!R||!R.oa||!R.oa.length)return;download(base()+'-OA-TARGETS.csv',rowsToCsv(OA_HDR,R.oa),'text/csv');toast(R.oa.length+' downloaded');});   /* b247 */
  $('#seenAll').addEventListener('click',markAllSeen);
  /* b77 (Jack, 17 Sep): "add a copy kpv link here". The ASIN list is only half a hand-off — the
     Viewer link opens Keepa with every lead already loaded, which is what he actually sends people. */
  $('#copyKpv').addEventListener('click',e=>{if(!result||!result.out.length){toast('No leads to link to',true);return;}
    const a=result.out.map(o=>o.ASIN);
    copy(keepaLink(a,'2'),`Keepa Viewer link copied · ${a.length} lead${a.length===1?'':'s'}`,e.currentTarget,'Copied');});
  $('#copyKept').addEventListener('click',e=>{if(!result||!result.out.length){toast('Nothing to copy',true);return;}copy(result.out.map(o=>o.ASIN).join(', '),result.out.length+' ASINs copied',e.currentTarget,'Copied');});
  $('#openSel').addEventListener('click',openInKeepa);
  $('#doneSel').addEventListener('click',()=>keepStill(()=>$('#doneSel'),finishRun));   /* b233 / b248: the one Done */
  /* b225: whatever you press in a row, that row stays exactly where it was */
  const anch=f=>e=>{const tr=e.target.closest&&e.target.closest('tr[data-asin]');if(!tr)return f(e);return keepStill(rowOf(tr.dataset.asin),()=>f(e));};
  $('#leads').addEventListener('click',anch(onTableClick));$('#leads').addEventListener('change',anch(onTableChange));$('#leads').addEventListener('input',onTableInput);
  $('#pager').addEventListener('click',e=>{const b=e.target.closest('button[data-pg]');if(!b||b.disabled)return;view.page=parseInt(b.dataset.pg);touched.clear();renderTable();$('#leadTop').scrollIntoView({behavior:'smooth',block:'start'});});
  document.querySelectorAll('#fSeg button').forEach(b=>b.addEventListener('click',()=>{view.status=b.dataset.st;if(view.status==='ALL'||view.status==='REVIEW'){try{localStorage.setItem(LEADVIEW_KEY,view.status);}catch(e){}}view.page=1;touched.clear();renderTable();}));
  /* b202: "Show all leads" from the run summary (the leads tile and the parked line) */
  document.addEventListener('click',e=>{const t=e.target.closest('[data-showall]');if(!t||!result)return;view.status='ALL';try{localStorage.setItem(LEADVIEW_KEY,'ALL');}catch(x){}view.page=1;touched.clear();renderTable();const lt=$('#leadTop');if(lt)lt.scrollIntoView({behavior:'smooth',block:'start'});});
  /* b259: a lead named in the estimated-fees note → its row */
  document.addEventListener('click',e=>{const t=e.target.closest('.feejump');if(!t)return;e.preventDefault();if(!result)return;
    let r=document.querySelector(`.ltbl tbody tr[data-asin="${t.dataset.asin}"]`);if(!r){view.status='ALL';view.page=1;touched.clear();renderTable();r=document.querySelector(`.ltbl tbody tr[data-asin="${t.dataset.asin}"]`);}
    if(r){r.scrollIntoView({behavior:'smooth',block:'center'});r.classList.add('flash');setTimeout(()=>r.classList.remove('flash'),1600);}});
  /* b251: "show me ↓" on the header line → the not-Amazon rows at the bottom of All leads */
  document.addEventListener('click',e=>{const t=e.target.closest('#oaJump');if(!t)return;e.preventDefault();if(!result)return;
    if(view.status!=='ALL'){view.status='ALL';view.page=1;touched.clear();renderTable();}
    const r=document.querySelector('#leads tr.oarow');if(r)r.scrollIntoView({behavior:'smooth',block:'center'});});
  /* b137: the More menu on the run toolbar */
  {const m=$('#moreMenu'),b=$('#moreBtn');if(m&&b){b.addEventListener('click',e=>{e.stopPropagation();const o=!m.classList.contains('open');m.classList.toggle('open',o);b.setAttribute('aria-expanded',o?'true':'false');});
    document.addEventListener('click',e=>{if(!m.contains(e.target)){m.classList.remove('open');b.setAttribute('aria-expanded','false');}});
    m.querySelector('.tbpop').addEventListener('click',e=>{if(e.target.closest('button'))setTimeout(()=>{m.classList.remove('open');b.setAttribute('aria-expanded','false');},0);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&m.classList.contains('open')){m.classList.remove('open');b.setAttribute('aria-expanded','false');}});}}
  ['#runNext','#runNext2'].forEach(id=>$(id).addEventListener('click',e=>{const k=e.currentTarget.dataset.key;
    if(k&&srcGet(k)){backToList();openRun(k);window.scrollTo({top:0,behavior:'smooth'});}
    else if(cur&&cur.drop){backToList();window.scrollTo({top:0,behavior:'smooth'});}}));   /* b223 */
  $('#yourDay').addEventListener('click',e=>{const b=e.target.closest('button[data-start]');if(b)openRun(b.dataset.start);});
  $('#howToHide').addEventListener('click',()=>{lsSet(HOWTO_KEY,true);renderHowTo();});$('#howToShow').addEventListener('click',()=>{lsSet(HOWTO_KEY,false);renderHowTo();$('#howTo').scrollIntoView({behavior:'smooth',block:'center'});});
  $('#runStrip').addEventListener('click',e=>{const d=e.target.closest('[data-run]');if(d&&cur){openPastRun(d.dataset.run);return;}if(e.target.closest('[data-look]')&&cur){openApiLook();return;}if(e.target.closest('[data-act="hist"]')&&cur)openHistory(cur);});
  $('#runCopyLink').addEventListener('click',e=>{if(!cur)return;const w=USERS.includes(cur.owner)?'&who='+cur.owner:'';copy(location.origin+location.pathname+'#run='+cur.key+w,'Link copied — paste it into the AVM HQ task'+(w?' (opens as '+cur.owner+', no name prompt)':''),e.currentTarget,'Copied');});
  $('#runAllTime').addEventListener('click',()=>{if(!cur)return;const k=cur.key;backToList();historyOpenFor(k);});
  $('#fSort').addEventListener('change',e=>{view.sort=e.target.value;view.page=1;renderTable();});
  {const fp=$('#fPer');if(fp)fp.addEventListener('change',e=>{view.per=parseInt(e.target.value);view.page=1;renderTable();});}
  /* b240: Buy from = tick countries (none = all; the ★ chip = the Prime countries — all five since b269, so it only shows when a run has a country without Prime); Deal = ★ Prime exclusive / on offer / normal price */
  /* b282 (Jack, 7 Oct: "make this smoother — sometimes I want to look at 2 countries, sometimes just one"): a click shows JUST that country
     (click it again = All); ⇧ Shift / ⌘ click adds or takes away one, for two or more. It used to add on every click, so going from
     Germany to France took two clicks. Same on the Deal chips. */
  const lfAdd=e=>!!(e&&(e.shiftKey||e.metaKey||e.ctrlKey));
  $('#fMarket').addEventListener('click',e=>{const b=e.target.closest('button[data-mk]');if(!b||!cur)return;const F=leadFilt();let m=new Set(F.mks);const k=b.dataset.mk;
    if(k==='ALL')m=new Set();else if(k==='PRIME'){const p=typeof PRIME_MK!=='undefined'?PRIME_MK:MARKETS;m=(m.size===p.length&&p.every(x=>m.has(x)))?new Set():new Set(p);}else if(lfAdd(e)){m.has(k)?m.delete(k):m.add(k);}else{m=(m.size===1&&m.has(k))?new Set():new Set([k]);}
    leadFiltSet({mks:[...m],rest:false});view.page=1;renderTable();});
  $('#fDeal').addEventListener('click',e=>{const b=e.target.closest('button[data-deal]');if(!b||!cur)return;const F=leadFilt();let d=new Set(F.deals);const k=b.dataset.deal;
    if(k==='ALL')d=new Set();else if(lfAdd(e)){d.has(k)?d.delete(k):d.add(k);}else{d=(d.size===1&&d.has(k))?new Set():new Set([k]);}leadFiltSet({deals:[...d],deal:null,rest:false});view.page=1;renderTable();});
  $('#lfNote').addEventListener('click',e=>{const b=e.target.closest('[data-lf]');if(!b||!cur)return;
    if(b.dataset.lf==='all')leadFiltSet({mks:[],deals:[],deal:null,rest:false});else leadFiltSet({rest:!leadFilt().rest});view.page=1;renderTable();});
  $('#floorRow').addEventListener('input',onFloorInput);
  $('#floorClear').addEventListener('click',()=>{if(!cur)return;tmpFloors=null;paintFloors();lastSig='';run();});
  /* b224 (Jack, 1 Oct: "improve smoothness and jumpiness of searching a title / brand / ASIN"): the table was rebuilt on every keystroke and the
     page shrank and grew with the matches. Now it redraws 160ms after you stop typing, and the list keeps its height while a search is on. */
  {let qT=null;const host=$('#leads').parentElement;   /* b260: the height is pinned on the scroll box — it was pinned on the TABLE (#leads is the .ltbl), and a table with a
       min-height stretches its rows: two leads left on screen became two rows half a screen tall each (Jack's "improve row"). It was also never released
       when the filter changed without the search box being cleared by hand. */
    $('#fQ').addEventListener('input',e=>{view.q=e.target.value;view.page=1;clearTimeout(qT);
      if(view.q&&host&&!host.style.minHeight)host.style.minHeight=host.offsetHeight+'px';if(!view.q&&host)host.style.minHeight='';
      qT=setTimeout(()=>{if(result)renderTable();},160);});}
  $('#fHideNo').addEventListener('change',e=>{view.hideNo=e.target.checked;view.page=1;renderTable();});
  $('#logExport').addEventListener('click',exportLog);
  $('#rulesToggle').addEventListener('click',()=>{const o=$('#rulesBox');const open=o.classList.toggle('show');$('#rulesToggle').textContent=open?'Hide the rules':'Show the rules';});
  /* what other people change while the list is open: locks, runs, verdict counts */
  setInterval(()=>{if(!cloudEnabled()||!cloud.tables||!$('#page-brands').classList.contains('active')||$('#viewList').hidden)return;cloudPullLight().then(ok=>{if(ok){renderList();renderLog();}});},90000);
  window.addEventListener('beforeunload',()=>{if(cur&&ownLock(cur))srcUnlock(cur,true);});
  settingsInit();renderSettings();loadFx();}
