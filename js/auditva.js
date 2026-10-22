/* BDL Sourcing — VA STOREFRONT AUDIT (b288, 8 Oct 2026).
   Jack, 8 Oct, after Prime Big Deal Days: "I want my VAs to audit a storefront each — to see what they missed and how — for the Prime
   event". What other sellers ran → did we find it → if not, how and why did we miss it → what did they see that we didn't → how do we
   source better next time. Two weeks, then it is talked about again.

   · Mera and Suz work the same audit screen as Jack, on the storefronts he gives them (or any storefront added to OA Overview after the
     event ended — Chris FBA, CJS Enterprise UK), and only what those storefronts listed from 7 Oct. Day-1 stock and every answer from
     before 7 Oct is OLD DATA — the system says so, nobody picks it.
   · Each VA's answers are hers: Jack's page never shows them as his, and the other VA never sees them. A product on both their
     storefronts is in both their lists — "I want their individual opinions". Inside one VA's list a product is one answer.
   · Jack sees it all here, at the top of his Storefront audits page: each VA's progress, why we missed things, and every product
     side by side — his answer, Mera's, Suz's — the disagreements first.
   · VAs never spend Keepa tokens: details come from a free Keepa Viewer export, graphs from Keepa itself. */

function auVaChip(r){if(!r)return'<span class="auvan">—</span>';const t=audType(r.verdict);if(!t)return'<span class="auvan">'+escapeHtml(r.verdict)+'</span>';
  return`<span class="auvach" style="--c:${t.hex}" title="${escapeHtml(t.label+(r.reason?' · '+r.reason:'')+(r.note?' · '+r.note:'')+' · '+auUk(r.at))}"><i class="sq"></i>${escapeHtml(t.short||t.label)}${r.reason?`<em> · ${escapeHtml(r.reason)}</em>`:''}</span>`;}
/* one VA's workload: her storefronts, the products they listed from 8 Oct (one per product), her answers on them */
function auVaWork(w){const V=audAllOf(w),items=new Map();
  (audState.sellers||[]).filter(s=>audVaFor(s.seller_id).includes(w)).forEach(s=>(audState.shelf[s.seller_id]||[]).forEach(it=>{if(!it.base&&it.first>=AUD_VA.START&&!items.has(it.a))items.set(it.a,s.seller_id);}));
  const c={todo:0};let done=0;items.forEach((sid,a)=>{const v=V[a];const st=v&&v.verdict?v.verdict:(audSells(sid,a)?'jointauto':'todo');if(st==='todo')c.todo++;else{done++;c[st]=(c[st]||0)+1;}});
  const last=Object.values(V).reduce((m,r)=>r&&r.at>m?r.at:m,'');
  return{w,V,items,done,c,last,shelves:(audState.sellers||[]).filter(s=>audVaFor(s.seller_id).includes(w))};}
const auVaUi={all:false,asked:{}};
/* b298 (Jack, 13 Oct, "can it start to do it now?"): the VAs never spend tokens, so their storefronts used to open on bare ASINs until
   someone dropped a Keepa Viewer export. Now Jack's own page fills them in — the shared cache first (free), then the Worker for what is
   left (about 1 token a product, inside his usual token floor and his "load automatically" setting) — at most every 30 minutes. What it
   loads is shared, so Mera and Suz open their storefronts with pictures, titles and prices. Only products listed since 7 Oct. */
const AUD_VA_PRE={at:0,busy:false};
function audVaWant(){const want=new Set();(audState.sellers||[]).filter(s=>audVaFor(s.seller_id).length).forEach(s=>(audState.shelf[s.seller_id]||[]).forEach(it=>{if(!it.base&&String(it.first||'')>=AUD_VA.START)want.add(it.a);}));return[...want];}
async function audVaPreload(force){if(!isJack()||audIsVA()||AUD_VA_PRE.busy||(!force&&Date.now()-AUD_VA_PRE.at<30*60e3)||typeof cloudReadable!=='function'||!cloudReadable())return 0;
  const asins=audVaWant();if(!asins.length)return 0;AUD_VA_PRE.busy=true;AUD_VA_PRE.at=Date.now();let got=0;
  try{await audPullProducts(asins);const need=asins.filter(a=>{const p=audState.prod[a];return!p||p.source==='ours'||!p.asked;});
    if(need.length&&audAuto()){const left=await audTokensLeft();const n=left==null?0:Math.max(0,Math.min(AUD_AUTO_CAP,left-AUD_TOKEN_FLOOR));if(n)got=await audLoadDetails(need.slice(0,n),true);}}
  catch(e){}finally{AUD_VA_PRE.busy=false;}return got;}
/* Jack's section, top of Storefront audits */
function auVaCard(){if(!isJack()||audIsVA())return'';setTimeout(()=>{audVaPreload();},0);   /* b298 */const pr=audType('prime'),on=!!pr&&(!pr.until||today()<=pr.until);
  const P=AUD_VAS.map(auVaWork),J=audAllOf(null);
  const why={};const add=(r,who)=>{if(!r||!['prime','missed'].includes(r.verdict)||String(r.at).slice(0,10)<AUD_VA.START)return;
    const k=(r.verdict==='prime'?'★ ':'Missed it · ')+(r.reason||'no reason picked yet');(why[k]=why[k]||{n:0,who:{}}).n++;why[k].who[who]=(why[k].who[who]||0)+1;};
  P.forEach(p=>Object.values(p.V).forEach(r=>add(r,p.w)));Object.values(J).forEach(r=>{if(r&&r.who!=='auto')add(r,'Jack');});
  const asins=new Set();P.forEach(p=>Object.keys(p.V).forEach(a=>asins.add(a)));
  const rows=[...asins].map(a=>{const ans={Jack:J[a]&&String(J[a].at).slice(0,10)>=AUD_VA.START&&J[a].who!=='auto'?J[a]:null};P.forEach(p=>ans[p.w]=p.V[a]||null);
    const codes=Object.values(ans).filter(Boolean).map(r=>r.verdict),differ=new Set(codes).size>1;const at=Object.values(ans).filter(Boolean).reduce((m,r)=>r.at>m?r.at:m,'');
    const sid=P.map(p=>p.items.get(a)).find(Boolean)||'';return{a,ans,differ,at,sid};}).sort((x,y)=>(y.differ-x.differ)||String(y.at).localeCompare(String(x.at)));
  if(rows.length&&typeof trSeenLoad==='function')trSeenLoad(rows.map(r=>r.a)).then(got=>{if(got&&auView.mode==='list'&&$('#page-audit').classList.contains('active')){auView._listHtml=null;renderAudit();}});   /* b297 */
  const need=rows.map(r=>r.a).filter(a=>!audState.prod[a]&&!auVaUi.asked[a]);
  if(need.length&&typeof audPullProducts==='function'){need.forEach(a=>auVaUi.asked[a]=1);audPullProducts(need).then(()=>{if(auView.mode==='list'&&$('#page-audit').classList.contains('active')){auView._listHtml=null;renderAudit();}});}
  const sellers=audState.sellers||[],given=sellers.filter(s=>audVaFor(s.seller_id).length),free=sellers.filter(s=>!audVaFor(s.seller_id).length);
  const nm=id=>escapeHtml((sellers.find(s=>s.seller_id===id)||{}).name||id);
  const pick=s=>{const v=audVaFor(s.seller_id),val=v.length===2?'both':v[0]||'';return`<select class="inl" data-vafor="${escapeHtml(s.seller_id)}" title="Who audits ${escapeHtml(s.name)}">${[['both','Mera + Suz'],['Mera','Mera'],['Suz','Suz'],['','Take off']].map(([k,l])=>`<option value="${k}"${val===k?' selected':''}>${l}</option>`).join('')}</select>`;};
  const per=P.map(p=>{const n=p.items.size,pc=n?Math.round(p.done/n*100):0;
    return`<div class="auvap"><div class="auvah"><span class="auav sm" style="background:${auAv(p.w)}">${p.w[0]}</span><b>${p.w}</b><span class="ssub">${p.shelves.length} storefront${p.shelves.length===1?'':'s'}${p.last?' · last answer '+escapeHtml(auWhenFull(p.last)):' · not started'}</span></div>
      <div class="auvabar"><i style="width:${pc}%"></i></div>
      <div class="auvan2"><b>${p.done}</b> of ${n} answered${p.c.todo?` · <b>${p.c.todo}</b> to do`:n?' · all done':''}</div>
      <div class="aucounts">${audTypes().map(t=>p.c[t.code]?`<span style="--c:${t.hex}"><i style="background:${t.hex}"></i><b>${p.c[t.code]}</b> ${escapeHtml(t.short||t.label)}</span>`:'').join('')}${p.c.jointauto?`<span style="--c:#2CE38B"><i style="background:#2CE38B"></i><b>${p.c.jointauto}</b> you sell</span>`:''}</div></div>`;}).join('');
  const whyL=Object.entries(why).sort((a,b)=>b[1].n-a[1].n);
  const shown=auVaUi.all?rows:rows.slice(0,25);
  return`<div class="card auva" id="auVaCard">
    <div class="cardhead"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg></span><h2>Mera &amp; Suz · Prime event audit</h2>
      <span class="sub">What other sellers listed from 7 Oct → did we find it → if not, why. Each VA answers on her own; you see all three side by side.${on?' The PRIME EVENT button stays on until you say.':' The PRIME EVENT button has finished — the answers stay.'}</span></div>
    <div class="auvagrid">${per}</div>
    ${whyL.length?`<div class="auvawhy"><b>Why we missed it</b>${whyL.map(([k,x])=>`<span class="auvaw" title="${escapeHtml(Object.entries(x.who).map(([w,n])=>w+' '+n).join(' · '))}"><b>${x.n}</b> ${escapeHtml(k)}</span>`).join('')}</div>`:''}
    ${rows.length?`<div class="tablewrap show"><div class="tablescroll"><table class="logtbl auvat"><thead><tr><th>Product</th><th>Storefront</th><th>Our filters</th><th>You</th>${AUD_VAS.map(w=>`<th>${w}</th>`).join('')}</tr></thead><tbody>
      ${shown.map(r=>{const p=audState.prod[r.a]||{};return`<tr class="${r.differ?'differ':''}"><td class="lsrc"><a href="https://keepa.com/#!product/2-${r.a}" target="_blank" rel="noopener" title="Open on Keepa">${escapeHtml((p.title||r.a).slice(0,70))}</a><div class="chg">${r.a}${p.price?' · '+gbp(p.price):''}${r.differ?' · <b class="amber">answers differ</b>':''}</div></td>
        <td>${r.sid?nm(r.sid):'—'}</td><td>${typeof audHistChip==='function'?(audHistChip(r.a,true)||'<span class="auvan">…</span>'):''}</td><td>${auVaChip(r.ans.Jack)}</td>${AUD_VAS.map(w=>`<td>${auVaChip(r.ans[w])}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div></div>
      ${rows.length>25?`<button class="btn ghost sm" id="auVaAll" type="button">${auVaUi.all?'Show the first 25':'Show all '+rows.length}</button>`:''}`
      :`<div class="empty"><span>${given.length?'No answers yet. Their lists fill as these storefronts list new stock from 7 Oct.':'No storefront is given to Mera or Suz yet — add one below.'}</span></div>`}
    <details class="auvashelves"${given.length?'':' open'}><summary>Storefronts for Mera &amp; Suz · ${given.length}</summary>
      <div class="auvalist">${given.map(s=>{const n=(audState.shelf[s.seller_id]||[]).filter(it=>!it.base&&it.first>=AUD_VA.START).length;
        return`<div class="auvarow"><span class="auav sm" style="background:${auAv(s.name)}">${auIni(s.name)}</span><b>${escapeHtml(s.name)}</b><span class="ssub">${n} listed since 7 Oct</span>${pick(s)}</div>`;}).join('')||'<div class="ssub">None yet.</div>'}</div>
      ${free.length?`<div class="row auvaadd"><span class="ssub">Give another storefront to</span><select class="inl" id="auVaWho"><option value="both">Mera + Suz</option><option value="Mera">Mera</option><option value="Suz">Suz</option></select>
        <select class="inl" id="auVaSeller">${free.map(s=>`<option value="${escapeHtml(s.seller_id)}">${escapeHtml(s.name)}</option>`).join('')}</select><button class="btn primary sm" id="auVaAdd" type="button">Add</button></div>`:''}
      <div class="ssub">A storefront added to OA Overview after the Prime event goes to both automatically. Only what it lists from 7 Oct is in their lists.</div></details></div>`;}
/* the VA's own landing page */
function auRenderVaList(){const host=$('#page-audit');const w=me();const shelves=audShelfList();
  const rows=shelves.map(sh=>({sh,c:auCounts(sh)}));const all=new Set(),todo=new Set();const V=audAll();
  rows.forEach(x=>x.sh.items.forEach(it=>{all.add(it.a);if(audStatus(V[it.a],audSells(x.sh.id,it.a))==='todo')todo.add(it.a);}));
  const next=rows.find(x=>x.c.todo>0);const pr=audType('prime'),on=!!pr&&(!pr.until||today()<=pr.until);
  const k=(v,l,s,cls,go)=>`<div class="kpi k-${cls||'plain'}${go?' go':''}"${go?` data-open="${escapeHtml(go)}" role="button" tabindex="0"`:''}><div><div class="kv">${v}</div><div class="kl">${l}</div>${s?`<div class="ks">${s}</div>`:''}</div></div>`;
  const h=`<div class="card"><div class="cardhead"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg></span><h2>Your storefront audit · Prime event</h2>
      <span class="sub">${escapeHtml(w)} — these sellers went big on Prime. Go through what they listed from 7 Oct and give every product one answer.</span><div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}</div></div>
    <ol class="auvasteps"><li><b>Open a storefront</b> below and go down the list — the graph is on the right.</li>
      <li><b>Press 1–${audPick().length}</b> for each product: <b>Not lead</b>, <b>Unsure</b>, <b>Missed it</b> (a good one we didn\u2019t get), <b>Diff method</b> (wholesale / PL — not our kind of buy), or <b>LOS</b> (it\u2019s already on your lead sheet).</li>
      <li>Each product says whether one of our filters had it — <b>✓ kept as a lead</b>, <b>✂ cut</b> by our rules, or <b>✗ never on our filters</b>. That is how we find out what to fix.</li>
      <li>No pictures? Press <b>Keepa Viewer (free)</b> on the storefront, Export → All columns, and drop the file on the page.</li></ol>
    ${shelves.length?`<div class="kpis aukpis">${k(shelves.length,'Your storefronts','given to you by Jack','violet')}${k(all.size.toLocaleString(),'New products','listed since 7 Oct','sky')}${k(todo.size.toLocaleString(),'To do',next?'next: '+escapeHtml(next.sh.name)+' →':'','iris',next?next.sh.id:'')}${k((all.size-todo.size).toLocaleString(),'Answered','by you','jade')}</div>
      <div class="aucards">${rows.map(x=>`<button class="aucard" type="button" data-open="${escapeHtml(x.sh.id)}"><div><div class="top"><span class="auav" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span>
        <div><div class="nm">${escapeHtml(x.sh.name)}</div><div class="meta">${x.sh.items.length.toLocaleString()} listed since 7 Oct</div></div></div>
        <div class="facts">${!x.sh.items.length?'<span class="aupill p-had">Nothing new yet — it fills as they list</span>':x.c.todo?`<span class="aupill p-todo">${x.c.todo} to do</span>`:'<span class="aupill p-joint">All answered</span>'}</div>
        <div class="prog"><b>${x.c.todo.toLocaleString()}</b> left${x.c.byHand?` · ${x.c.byHand} answered`:''}</div></div>${auDonut(x.c)}</button>`).join('')}</div>`
      :`<div class="empty"><span>Jack hasn't given you a storefront yet.</span></div>`}</div>`;
  if(auView._listHtml===h&&host.querySelector('.card'))return;auView._listHtml=h;host.innerHTML=h;}
/* Jack's picker */
document.addEventListener('change',e=>{const s=e.target&&e.target.closest&&e.target.closest('[data-vafor]');if(!s||!isJack())return;
  const v=s.value,list=v==='both'?AUD_VAS.slice():v?[v]:[];audVaSet(s.dataset.vafor,list);auView._listHtml=null;renderAudit();
  toast(list.length?`${(audState.sellers.find(x=>x.seller_id===s.dataset.vafor)||{}).name||'Storefront'} → ${list.join(' + ')}`:'Taken off the VAs’ audit');});
document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
  if(t.closest('#auVaAll')){auVaUi.all=!auVaUi.all;auView._listHtml=null;renderAudit();return;}
  if(t.closest('#auVaAdd')&&isJack()){const id=($('#auVaSeller')||{}).value,who=($('#auVaWho')||{}).value;if(!id)return;
    audVaSet(id,who==='both'?AUD_VAS.slice():[who]);auView._listHtml=null;renderAudit();toast(((audState.sellers.find(x=>x.seller_id===id)||{}).name||'Storefront')+' → '+(who==='both'?'Mera + Suz':who));}});
