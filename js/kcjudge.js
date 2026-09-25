/* BDL Sourcing — Keepa console: Lead / Not a lead (b154).
   Jack, 25 Sep 2026: "want a way to do it on keepa console like for them to have the lead and not leads".
   Mon–Fri that week the VAs worked ~41 hours each and put 136 leads in their sheets, straight off Keepa searches — and
   this app recorded none of it. Now, after a Product Viewer export goes into Filter & sort, every row gets Lead /
   Not a lead, saved under the person's name with the day and the filter it came from, so "what did they do" has an answer.

   Kept apart from the run verdicts ON PURPOSE. A run verdict carries the rule maths and hides a lead from later runs until
   it gets better; a console call has no maths to compare against, so letting it hide leads from the rules would bury ones
   that later turn profitable ("if we find something profitable then we still want it").
   Storage: one shared row per person per day in src_settings, key 'kc:<Name>:<YYYY-MM-DD>' — no new table, nothing to
   run in Supabase. A VA pulls only her own rows (VAs never see each other's work); Jack pulls everyone's. */
const KC_KEY='bdl-sourcing-kc',KC_SRC_KEY='bdl-sourcing-kc-src',KC_DAYS=35;
let kcDirty=new Set(),kcT=null,kcIdx={},kcView='all';
function kcAll(){return lsGet(KC_KEY,{});}
function kcRowKey(who,day){return who+'|'+day;}
function kcCloudKey(who,day){return'kc:'+who+':'+day;}
function kcDayNice(day){const d=new Date(day+'T12:00:00');return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
/* my latest call per ASIN across my own days — built once per paint, not per row */
function kcIndex(who){const out={};if(!who)return out;const all=kcAll();
  for(const k in all){const r=all[k];if(!r||r.who!==who||!r.items)continue;
    for(const a in r.items){const it=r.items[a];if(!out[a]||(it.at||'')>(out[a].at||''))out[a]=Object.assign({day:r.day},it);}}
  return out;}
function kcSrcPick(){const m=me()||'_';return(lsGet(KC_SRC_KEY,{})||{})[m]||'other';}
function kcSrcSet(v){const m=me()||'_';const o=lsGet(KC_SRC_KEY,{})||{};o[m]=v;lsSet(KC_SRC_KEY,o);}
function kcSrcName(key){if(!key||key==='other')return'Another Keepa search';const s=srcGet(key);return s?s.name:key;}
/* v = 'lead' | 'not' | null (clear). Clearing takes it off the day it was made, so an older call can show through again. */
function kcSet(asin,v,extra){const who=me();if(!who)return;const all=kcAll();let k=kcRowKey(who,today());
  if(v==null){const cur=kcIndex(who)[asin];if(!cur)return;k=kcRowKey(who,cur.day);const r=all[k];if(!r||!r.items)return;delete r.items[asin];r.updatedAt=nowIso();}
  else{const r=all[k]||(all[k]={who,day:today(),items:{}});const prev=r.items[asin]||{};
    r.items[asin]=Object.assign({},prev,extra||{},{v,at:nowIso()});if(v==='lead')r.items[asin].reason='';r.updatedAt=nowIso();}
  lsSet(KC_KEY,all);kcDirty.add(k);clearTimeout(kcT);kcT=setTimeout(kcFlush,1200);}
function kcReason(asin,reason){const who=me();if(!who)return;const cur=kcIndex(who)[asin];if(!cur||cur.v!=='not')return;
  const all=kcAll(),k=kcRowKey(who,cur.day),r=all[k];if(!r||!r.items||!r.items[asin])return;
  r.items[asin].reason=r.items[asin].reason===reason?'':reason;r.updatedAt=nowIso();lsSet(KC_KEY,all);kcDirty.add(k);clearTimeout(kcT);kcT=setTimeout(kcFlush,1200);}
function kcFlush(){clearTimeout(kcT);if(!kcDirty.size)return;const all=kcAll();
  const rows=[...kcDirty].map(k=>all[k]).filter(Boolean).map(r=>settingRow(kcCloudKey(r.who,r.day),r));kcDirty.clear();
  if(rows.length&&typeof cloudQueue==='function')cloudQueue('src_settings','upsert',rows);}
window.addEventListener('pagehide',kcFlush);
async function kcPull(){if(typeof cloudEnabled!=='function'||!cloudEnabled())return false;const who=me();if(!who)return false;
  const since=new Date(Date.now()-KC_DAYS*864e5).toISOString();
  const q=(isJack()?'key=like.kc:*':'key=like.'+encodeURIComponent('kc:'+who+':')+'*')+'&updated_at=gte.'+since;
  try{const rows=await cloudGetAll('src_settings',q);const all=kcAll();let changed=false;
    rows.forEach(r=>{const v=r.value;if(!v||!v.who||!v.day)return;const k=kcRowKey(v.who,v.day);if(kcDirty.has(k))return;
      const loc=all[k];if(!loc||(v.updatedAt||'')>(loc.updatedAt||'')){all[k]=v;changed=true;}});
    const cut=new Date(Date.now()-KC_DAYS*864e5).toISOString().slice(0,10);
    Object.keys(all).forEach(k=>{if((all[k].day||'')<cut){delete all[k];changed=true;}});
    if(changed){lsSet(KC_KEY,all);kcRepaint();}return true;}catch(e){return false;}}

/* ---- the table: one more column on Filter & sort ---- */
function kcHead(){kcIdx=kcIndex(me());return'<th class="kcj">Lead?</th>';}   /* the cells are drawn right after this — index first */
function kcCellInner(asin){const x=kcIdx[asin];const on=x&&x.v;
  const old=x&&x.day!==today()?`<span class="kcold" title="Your call on ${kcDayNice(x.day)}">${kcDayNice(x.day)}</span>`:'';
  return`<div class="kcb"><button type="button" class="kcl${on==='lead'?' on':''}" data-kc="lead" data-asin="${asin}" title="Lead (Y)">Lead</button>`
    +`<button type="button" class="kcn${on==='not'?' on':''}${on==='not'&&!x.reason?' waiting':''}" data-kc="not" data-asin="${asin}" title="${on==='not'&&!x.reason?'Not a lead — pick why':'Not a lead (N)'}">${on==='not'?(x.reason?'Not · '+escapeHtml(x.reason):'Not a lead · why?'):'Not a lead'}</button>${old}</div>`;}
function kcCell(k){return`<td class="kcj" data-asin="${k.asin}">${kcCellInner(k.asin)}</td>`;}
function kcRowCls(asin){const x=kcIdx[asin];return x&&x.v?'kc-done kc-'+x.v:'kc-todo';}
/* rows the list is showing right now (the console keeps them in keptAsins / its own table) */
function kcRows(){return[...document.querySelectorAll('#tableF tbody tr[data-asin]')];}
function kcStats(){const rows=kcRows();let lead=0,not=0;rows.forEach(tr=>{const x=kcIdx[tr.dataset.asin];if(x&&x.v==='lead')lead++;else if(x&&x.v==='not')not++;});return{n:rows.length,lead,not};}
function kcPaintBar(){const el=$('#kcBar');if(!el)return;const rows=kcRows();if(!rows.length){el.hidden=true;return;}
  const m=me(),st=kcStats(),pick=kcSrcPick();
  const opts=[['other','Another Keepa search']].concat((typeof visibleSources==='function'?visibleSources():[]).slice().sort((a,b)=>(a.type===b.type?0:a.type==='filter'?-1:1)||a.name.localeCompare(b.name)).map(s=>[s.key,s.name+(s.status==='paused'?' (paused)':'')]));
  const seg=[['all','All',st.n],['todo','To judge',st.n-st.lead-st.not],['lead','Leads',st.lead],['not','Not',st.not]];
  el.innerHTML=`<div class="kcbar">
    <div class="kcwho">${m?whoChip(m):`<button type="button" class="btn ghost sm" data-kcme>Pick your name to save</button>`}
      <label class="kcsrc"><span>From</span><select id="kcSrc" title="Which search these came from — saved with every Lead / Not a lead">${opts.map(([v,l])=>`<option value="${escapeHtml(v)}"${v===pick?' selected':''}>${escapeHtml(l)}</option>`).join('')}</select></label></div>
    <div class="kcprog"><b>${(st.lead+st.not).toLocaleString()}</b> of ${st.n.toLocaleString()} judged<span class="kcmeter"><i class="l" style="width:${st.n?st.lead/st.n*100:0}%"></i><i class="n" style="width:${st.n?st.not/st.n*100:0}%"></i></span><span class="kcl2">${st.lead} lead${st.lead===1?'':'s'} · ${st.not} not</span></div>
    <div class="segs kcseg" role="tablist">${seg.map(([v,l,n])=>`<button type="button" data-kcv="${v}" class="${kcView===v?'on':''}">${l} <b>${n.toLocaleString()}</b></button>`).join('')}</div>
    <button type="button" class="btn primary sm" id="kcCopy"${st.lead?'':' disabled'}><span class="lab">Copy ${st.lead||''} lead${st.lead===1?'':'s'}</span></button></div>`;
  el.hidden=false;}
function kcApplyView(){const t=$('#tableF');if(!t)return;t.dataset.kcv=kcView;}
function kcPaintRow(asin){const tr=document.querySelector(`#tableF tbody tr[data-asin="${asin}"]`);if(!tr)return;
  const td=tr.querySelector('td.kcj');if(td)td.innerHTML=kcCellInner(asin);
  tr.classList.remove('kc-todo','kc-done','kc-lead','kc-not');kcRowCls(asin).split(' ').forEach(c=>tr.classList.add(c));}
/* called by the console after it draws its table */
function kcAfterRender(){kcIdx=kcIndex(me());kcRows().forEach(tr=>{kcRowCls(tr.dataset.asin).split(' ').forEach(c=>tr.classList.add(c));});kcApplyView();kcPaintBar();}
function kcRepaint(){if(kcRows().length&&typeof runFilter==='function')runFilter();kcPaintTeam();}
/* one reasons pop-over, floating — the row never grows, so nothing below it moves */
function kcPopClose(){const p=$('#kcPop');if(p)p.remove();}
function kcPopOpen(btn,asin){kcPopClose();const x=kcIdx[asin]||{};const p=document.createElement('div');p.id='kcPop';p.className='kcpop';
  p.innerHTML=`<span class="t">Why not?</span>${noReasons().map((r,i)=>`<button type="button" class="vr${x.reason===r?' on':''}" data-kcr="${escapeHtml(r)}" data-asin="${asin}"><kbd>${i+1}</kbd>${escapeHtml(r)}</button>`).join('')}`;
  document.body.appendChild(p);const b=btn.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  let top=b.bottom+6;if(top+h>innerHeight-8)top=b.top-h-6;p.style.top=Math.max(8,top)+'px';p.style.left=Math.max(8,Math.min(b.left,innerWidth-w-8))+'px';p.dataset.asin=asin;}
function kcJudge(asin,v){const x=kcIdx[asin];const r=keptRowFor(asin);
  if(x&&x.v===v&&x.day===today()){kcSet(asin,null);}
  /* the same call again on an OLDER day re-confirms it today and keeps its reason */
  else kcSet(asin,v,{src:kcSrcPick(),title:(r.title||'').slice(0,80),bb:r.buyBox||null,bought:r.bought||null,drops:r.drops||null,reason:x&&x.v===v?x.reason||'':''});
  kcIdx=kcIndex(me());const tr=document.querySelector(`#tableF tbody tr[data-asin="${asin}"]`);if(tr)tr.classList.add('kc-held');
  kcPaintRow(asin);kcPaintBar();   /* not the team card: it sits above the table, and growing it would push the rows down mid-click */
  const now=kcIdx[asin];if(now&&now.v==='not'&&!now.reason){const b=document.querySelector(`#tableF tbody tr[data-asin="${asin}"] button.kcn`);if(b)kcPopOpen(b,asin);}else kcPopClose();}
/* the console's own row data for an ASIN (title / buy box / bought / drops) — read from the table it drew */
function keptRowFor(asin){const tr=document.querySelector(`#tableF tbody tr[data-asin="${asin}"]`);if(!tr)return{};
  const d=tr.dataset;return{title:d.title||'',buyBox:+d.bb||null,bought:+d.bought||null,drops:+d.drops||null};}

/* ---- Jack: who did what in the console, last 7 days ---- */
function kcPaintTeam(){const el=$('#kcTeam');if(!el)return;if(!isJack()){el.hidden=true;return;}
  const all=kcAll(),days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toLocaleDateString('en-CA'));}
  const people=[...new Set(Object.values(all).map(r=>r.who).filter(Boolean))].sort((a,b)=>a==='Jack'?1:b==='Jack'?-1:a.localeCompare(b));
  const cell=(who,day)=>{const r=all[kcRowKey(who,day)];const it=r&&r.items?Object.values(r.items):[];const l=it.filter(x=>x.v==='lead').length;
    return it.length?`<td><b>${it.length}</b><span class="${l?'kl':''}">${l} lead${l===1?'':'s'}</span></td>`:'<td class="z">—</td>';};
  const leads=[];Object.values(all).forEach(r=>{if(!r.items||!days.includes(r.day))return;Object.entries(r.items).forEach(([a,x])=>{if(x.v==='lead')leads.push(Object.assign({asin:a,who:r.who},x));});});
  leads.sort((a,b)=>(b.at||'').localeCompare(a.at||''));
  el.innerHTML=`<div class="kcteam"><div class="kct-h"><span class="t">Team · Lead / Not a lead in this console</span><span class="s">last 7 days · only you see this</span></div>
    ${people.length?`<table class="kct"><thead><tr><th></th>${days.map(d=>`<th>${kcDayNice(d).replace(/ \w+$/,'')}</th>`).join('')}</tr></thead><tbody>${people.map(p=>`<tr><th>${whoChip(p)}</th>${days.map(d=>cell(p,d)).join('')}</tr>`).join('')}</tbody></table>
    ${leads.length?`<div class="kct-l"><span class="t">Latest leads</span>${leads.slice(0,8).map(x=>`<a class="kcla" href="https://keepa.com/#!product/2-${x.asin}" target="_blank" rel="noopener" title="${escapeHtml(x.title||'')}">${whoChip(x.who)}<code>${x.asin}</code><span class="tt">${escapeHtml(x.title||'')}</span><span class="fr">${escapeHtml(kcSrcName(x.src))} · ${kcDayNice(String(x.at).slice(0,10))}</span></a>`).join('')}</div>`:''}`
    :`<p class="kct-e">Nobody has marked anything here yet. When Suz or Mera drop a Keepa export in and click Lead / Not a lead, their day shows up here.</p>`}</div>`;
  el.hidden=false;}

/* ---- wiring ---- */
document.addEventListener('click',e=>{
  const pop=$('#kcPop');if(pop&&!e.target.closest('#kcPop')&&!e.target.closest('button.kcn'))kcPopClose();
  const b=e.target.closest('[data-kc]');if(b){if(!needMe(b))return;kcJudge(b.dataset.asin,b.dataset.kc);return;}
  const r=e.target.closest('[data-kcr]');if(r){kcReason(r.dataset.asin,r.dataset.kcr);kcIdx=kcIndex(me());kcPaintRow(r.dataset.asin);kcPopClose();return;}
  const v=e.target.closest('[data-kcv]');if(v){kcView=v.dataset.kcv;document.querySelectorAll('#tableF tr.kc-held').forEach(x=>x.classList.remove('kc-held'));kcApplyView();kcPaintBar();return;}
  if(e.target.closest('[data-kcme]')){needMe(null);return;}
  const c=e.target.closest('#kcCopy');if(c){const a=kcRows().map(tr=>tr.dataset.asin).filter(x=>kcIdx[x]&&kcIdx[x].v==='lead');copy(a.join(', '),a.length+' lead ASIN'+(a.length===1?'':'s')+' copied',c,'Copied');}});
document.addEventListener('change',e=>{if(e.target&&e.target.id==='kcSrc')kcSrcSet(e.target.value);});
/* the table scrolls inside its own box — a floating pop-over left behind would point at the wrong row */
document.addEventListener('scroll',e=>{if($('#kcPop')&&!(e.target.closest&&e.target.closest('#kcPop')))kcPopClose();},true);
/* keys on the console: the row under the mouse (or the last one clicked) — Y lead, N not, 1–5 the reason while the pop-over is open */
let kcHover=null;
document.addEventListener('mouseover',e=>{const tr=e.target.closest&&e.target.closest('#tableF tbody tr[data-asin]');if(tr)kcHover=tr.dataset.asin;});
document.addEventListener('keydown',e=>{if(!$('#filter')||!$('#filter').classList.contains('active')||!$('#page-keepa').classList.contains('active'))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'))return;
  const pop=$('#kcPop');
  if(pop&&/^[1-9]$/.test(e.key)){const bs=pop.querySelectorAll('[data-kcr]');const b=bs[+e.key-1];if(b){e.preventDefault();b.click();}return;}
  if(e.key==='Escape'&&pop){kcPopClose();return;}
  const k=e.key.toLowerCase();if((k==='y'||k==='n')&&kcHover){if(!needMe(null))return;e.preventDefault();kcJudge(kcHover,k==='y'?'lead':'not');}});
/* pull the day rows when the page opens, and again whenever someone opens the Keepa console (at most once a minute) */
let kcPulledAt=0;function kcMaybePull(){if(Date.now()-kcPulledAt<60000)return;kcPulledAt=Date.now();kcPull();}
document.addEventListener('DOMContentLoaded',()=>{kcPaintTeam();setTimeout(kcMaybePull,2500);
  const pb=document.querySelector('.pagebtn[data-page="page-keepa"]');if(pb)pb.addEventListener('click',()=>{kcPaintTeam();kcMaybePull();});});
