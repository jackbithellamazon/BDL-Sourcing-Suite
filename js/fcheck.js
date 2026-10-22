/* BDL Sourcing — Filter check (b311).
   Jack, 22 Oct 2026, on the week's audit: "what does she have — do it on a table and I'll move them" · "we going to look at the table every
   day now to see what is what and make and improve changes". One row per filter: how often it should run, how often it REALLY ran, what an
   export holds, what it finds, and what reached the lead sheet and got bought. A run on a Viewer file only, on exactly one Keepa page (100 rows)
   or marked "0 results" on a search that usually has 20+ counted as done but searched nothing (Mera's £95+: 1 real run in 14 days, 7-Day Drops
   none since 5 Oct) — those are "wrong file". Who, how often and on/off change in the row and save for everyone, like the Brands list. Jack only. */
const FC={days:14,who:'all',paused:false,sort:'status',dir:1,sheet:null,sheetAt:0,busy:null};
const FC_WORK={daily:1,'2 days':2,'3 days':3,weekly:5};   /* in working days — the VAs work Monday to Friday */
function fcDayAdd(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function fcWorkdays(from,to){let n=0;for(let d=from;d<=to;d=fcDayAdd(d,1)){const w=new Date(d+'T12:00:00Z').getUTCDay();if(w&&w<6)n++;}return n;}
function fcOneSearch(s){return!s.drop&&!(typeof isListed==='function'&&isListed(s))&&(s.rule!==1||(s.markets||['UK']).every(m=>m==='UK'));}
/* what a saved run really was: real · viewer (a Viewer file and no Finder) · page (exactly 100 on one search) · zero (0 results on a big search) */
function fcKind(r,s,usual){const f=(r.files||[]).map(String);
  if(r.empty)return fcOneSearch(s)&&usual>=20?'zero':'real';
  if(s.drop||(typeof isListed==='function'&&isListed(s))||!f.length)return'real';   /* API runs and pasted lists have no Keepa file */
  const fin=f.some(n=>/finder/i.test(n)),vw=f.some(n=>/viewer/i.test(n));
  if(vw&&!fin)return'viewer';
  if(fcOneSearch(s)&&+r.rowsIn===100)return'page';
  return'real';}
const FC_KIND={viewer:'Viewer file only',page:'exactly 100 rows (one Keepa page)',zero:'marked 0 results'};
/* the lead sheet since the window opened, with BOUGHT / NOT — Jack's browser, read only, kept 30 minutes */
async function fcSheet(since,force){if(typeof cloudReadable!=='function'||!cloudReadable())return null;
  if(!force&&FC.sheet&&FC.sheet.since<=since&&Date.now()-FC.sheetAt<30*60e3)return FC.sheet;if(FC.busy)return FC.busy;
  FC.busy=(async()=>{try{const rows=await cloudGetAll('leads','select=asin,va,status,created_at,superseded&created_at=gte.'+since+'T00:00:00Z');   /* created_at: some sheet dates are read the wrong way round */
      FC.sheet={since,rows:rows.filter(l=>!l.superseded&&/^B[0-9A-Z]{9}$/.test(String(l.asin||'').trim().toUpperCase())).map(l=>({a:String(l.asin).trim().toUpperCase(),va:typeof trVa==='function'?trVa(l.va):l.va,st:String(l.status||'').toUpperCase(),d:String(l.created_at).slice(0,10)}))};FC.sheetAt=Date.now();}
    catch(e){}FC.busy=null;return FC.sheet;})();
  return FC.busy;}
function fcRows(sheet){const t=today(),from=fcDayAdd(t,-(FC.days-1)),wd=fcWorkdays(from,t);
  const R=lsView(RUN_KEY,[]),by={};R.forEach(r=>{(by[r.source]=by[r.source]||[]).push(r);});
  /* a sheet lead belongs to a filter when it was one of that filter's leads in the 7 days before it went on the sheet */
  const idx={};R.forEach(r=>{const d=String(r.day||r.at).slice(0,10);if(d<fcDayAdd(from,-7))return;(r.asins||[]).forEach(a=>(idx[a]=idx[a]||[]).push({k:r.source,d}));});
  const sh={};((sheet&&sheet.rows)||[]).forEach(l=>{if(l.d<from)return;const ks=new Set((idx[l.a]||[]).filter(x=>x.d<=l.d&&x.d>=fcDayAdd(l.d,-7)).map(x=>x.k));
    ks.forEach(k=>{const o=sh[k]=sh[k]||{n:0,b:0,who:{}};o.n++;if(l.st==='BOUGHT')o.b++;o.who[l.va]=(o.who[l.va]||0)+1;});});
  return srcAll().filter(s=>FC.paused||s.status!=='paused').map(s=>{const all=(by[s.key]||[]).slice().sort((a,b)=>a.at<b.at?-1:1);
    const sizes=all.filter(r=>!r.empty&&fcKind(r,s,0)==='real').map(r=>+r.rowsIn||0).filter(n=>n>0).sort((a,b)=>a-b),usual=sizes.length?sizes[Math.floor(sizes.length/2)]:0;
    const kinds=all.map(r=>({r,k:fcKind(r,s,usual),d:String(r.day||r.at).slice(0,10)}));
    const win=kinds.filter(x=>x.d>=from&&x.d<=t),real=win.filter(x=>x.k==='real'),wrong=win.filter(x=>x.k!=='real'),lastReal=kinds.filter(x=>x.k==='real').pop();
    const cw=FC_WORK[s.cadence],due=s.status==='paused'||!cw?0:Math.max(1,Math.round(wd/cw)),days=new Set(real.map(x=>x.d)).size;
    const lr=(real.length?real:kinds.filter(x=>x.k==='real').slice(-5)).filter(x=>!x.r.empty).map(x=>+x.r.leads||0);
    const since=lastReal?fcWorkdays(fcDayAdd(lastReal.d,1),t):null;
    let st='ok';if(s.status==='paused')st='off';else if(!cw)st='oneoff';else if(!win.length)st='none';else if(!days)st='fake';else if(days/due<0.4)st='bad';else if(days/due<0.8)st='behind';
    const o=sh[s.key]||{n:0,b:0,who:{}};
    return{s,usual,due,days,runs:win.length,wrong,lastReal,since,late:cw&&since!=null&&since>cw*2,leads:lr.length?Math.round(lr.reduce((a,b)=>a+b,0)/lr.length):null,
      sheet:o.n,bought:o.b,sheetWho:o.who,st,who:s.owner||'VAs',rank:{fake:0,none:1,bad:2,behind:3,ok:4,oneoff:5,off:6}[st]};});}
const FC_ST={ok:['On track','ok'],behind:['Behind','mid'],bad:['Way behind','bad'],fake:['Not really run','bad'],none:['Not run','bad'],oneoff:['One-off','off'],off:['Paused','off']};
async function renderFc(force){const el=$('#fcBody');if(!el)return;if(!isJack()){el.innerHTML='<div class="empty">Only Jack sees this.</div>';return;}
  const t=today(),from=fcDayAdd(t,-(FC.days-1));
  const paint=sheet=>{let L=fcRows(sheet);if(FC.who!=='all')L=L.filter(x=>x.who===FC.who);
    const v=(x,k)=>k==='status'?x.rank*1000+(x.due?x.days/x.due:1)*100:k==='name'?x.s.name.toLowerCase():k==='who'?x.who:k==='real'?(x.due?x.days/x.due:9):k==='wrong'?-x.wrong.length:k==='last'?(x.since==null?-1e9:-x.since):k==='size'?-x.usual:k==='leads'?-(x.leads||0):k==='sheet'?-x.sheet:k==='bought'?-x.bought:0;
    L.sort((a,b)=>{const p=v(a,FC.sort),q=v(b,FC.sort);return(p<q?-1:p>q?1:a.s.name.localeCompare(b.s.name))*FC.dir;});
    const sum=['Mera','Suz','VAs','Jack'].map(w=>{const M=fcRows(sheet).filter(x=>x.who===w&&x.s.status!=='paused');if(!M.length)return'';const due=M.reduce((n,x)=>n+x.due,0),rd=M.reduce((n,x)=>n+Math.min(x.days,x.due||x.days),0),wr=M.reduce((n,x)=>n+x.wrong.length,0),sl=M.reduce((n,x)=>n+x.sheet,0),bt=M.reduce((n,x)=>n+x.bought,0);
      return`<div class="fcsum ${ownCls(w)}"><div class="fcsh">${whoChip(w)}<span>${M.length} filter${M.length===1?'':'s'}</span></div><div class="fcsn"><b class="${due&&rd/due>=0.8?'jade':due&&rd/due>=0.4?'amber':'coral'}">${due?Math.round(rd/due*100):'—'}%</b><small>really run · ${rd} of ${due} due</small></div><div class="fcsn"><b class="${wr?'coral':'jade'}">${wr}</b><small>wrong-file runs</small></div><div class="fcsn"><b>${sl}</b><small>on the lead sheet · ${bt} bought</small></div></div>`;}).join('');
    const th=(k,l,c)=>`<th class="${c||''}${FC.sort===k?' on':''}" data-fcs="${k}">${l}${FC.sort===k?(FC.dir>0?' ↓':' ↑'):''}</th>`;
    const sel=(cls,key,opts,val)=>`<select class="inl ${cls}" data-key="${key}">${opts.map(([k,l])=>`<option value="${k}"${val===k?' selected':''}>${l}</option>`).join('')}</select>`;
    const body=L.map(x=>{const s=x.s,[stl,stc]=FC_ST[x.st];const pct=x.due?Math.min(100,Math.round(x.days/x.due*100)):0;
      const wt=x.wrong.map(w=>`${ukDate(w.d).replace(/ · .*$/,'')}: ${FC_KIND[w.k]}${w.r.who?' ('+w.r.who+')':''}`).join('\n');
      const sw=Object.entries(x.sheetWho).map(([w,n])=>`${w} ${n}`).join(' · ');
      return`<tr class="fc-${x.st}" data-key="${s.key}"><td class="lsrc"><div class="lrow">${avatar(s)}<div><button type="button" class="linkbtn fcopen" data-key="${s.key}"><b>${escapeHtml(s.name)}</b></button><div class="chg"><span class="rl r${s.rule}">Rule ${s.rule}</span> ${(s.markets||[]).map(m=>FLAG[m]).join('')}</div></div></div></td>
        <td>${sel('ownsel '+ownCls(s.owner||NO_OWNER),s.key,OWNER_OPTS.map(u=>[u,u]),s.owner||'VAs')}</td>
        <td>${sel('cadsel',s.key,Object.entries(CADENCE_LABEL),s.cadence)}${sel('stsel s-'+s.status,s.key,Object.entries(STATUS_LABEL),s.status)}</td>
        <td><span class="fcst ${stc}">${stl}</span></td>
        <td class="num">${x.due?`<b>${x.days}</b> <span class="cutn">of ${x.due}</span><div class="fcbar"><i class="${stc}" style="width:${pct}%"></i></div>`:x.runs?`<b>${x.days}</b>`:'<span class="cutn">—</span>'}</td>
        <td class="num" title="${escapeHtml(wt)}">${x.wrong.length?`<b class="coral">${x.wrong.length}</b><div class="chg">${[...new Set(x.wrong.map(w=>w.k==='viewer'?'Viewer':w.k==='page'?'100 rows':'0 results'))].join(' · ')}</div>`:'<span class="cutn">0</span>'}</td>
        <td class="lwhen">${x.lastReal?`<span class="${x.late?'coral':''}">${ukDate(x.lastReal.d).replace(/ · .*$/,'')}</span>${x.lastReal.r.who?' '+whoChip(x.lastReal.r.who):''}<div class="chg">${x.since===0?'today':x.since===1?'1 working day ago':x.since+' working days ago'}</div>`:'<span class="coral">never</span>'}</td>
        <td class="num">${x.usual?x.usual.toLocaleString():'<span class="cutn">—</span>'}</td>
        <td class="num">${x.leads!=null?`<b>${x.leads.toLocaleString()}</b>`:'<span class="cutn">—</span>'}</td>
        <td class="num" title="${escapeHtml(sw)}">${x.sheet?`<b>${x.sheet}</b>`:'<span class="cutn">0</span>'}</td>
        <td class="num">${x.bought?`<b class="jade">${x.bought}</b>`:'<span class="cutn">0</span>'}</td></tr>`;}).join('');
    el.innerHTML=`<div class="fcsums">${sum}</div>${sheet?'':`<p class="fcnote">The lead sheet could not be read here, so Lead sheet and Bought show 0.</p>`}
      <div class="tablewrap show"><div class="tablescroll"><table class="logtbl fctbl"><thead><tr>${th('name','Filter')}${th('who','Who')}<th>How often</th>${th('status','Status')}${th('real','Really run','r')}${th('wrong','Wrong file','r')}${th('last','Last real run')}${th('size','Products / export','r')}${th('leads','Leads / run','r')}${th('sheet','Lead sheet','r')}${th('bought','Bought','r')}</tr></thead>
      <tbody>${body||'<tr><td colspan="11" class="more">No filters for this person.</td></tr>'}</tbody></table></div></div>
      <p class="fcnote"><b>Really run</b> = days with a run on that day’s Product Finder export, out of the runs due in the last ${FC.days} days (working days, Mon–Fri). <b>Wrong file</b> = a run on a Viewer file only, exactly 100 rows (one Keepa page), or marked “0 results” on a search that usually has 20+ — it counted as done but searched nothing; from b311 those files are refused, so this column should fall to 0. <b>Products / export</b> = a normal real export. <b>Lead sheet</b> = leads that went on the sheet within 7 days of being a lead on this filter (any VA; hover to see who). Who, how often and on/off save for everyone as soon as you change them.</p>`;};
  paint(FC.sheet&&FC.sheet.since<=from?FC.sheet:null);
  const sh=await fcSheet(from,force);if($('#fcBody')===el&&!$('#cardFc').hidden)paint(sh);}
document.addEventListener('DOMContentLoaded',()=>{const c=$('#cardFc');if(!c)return;
  c.addEventListener('click',e=>{const b=e.target.closest('[data-fcd]');if(b){FC.days=+b.dataset.fcd;c.querySelectorAll('[data-fcd]').forEach(x=>x.classList.toggle('on',x===b));renderFc();return;}
    const w=e.target.closest('[data-fcw]');if(w){FC.who=w.dataset.fcw;c.querySelectorAll('[data-fcw]').forEach(x=>x.classList.toggle('on',x===w));renderFc();return;}
    const h=e.target.closest('th[data-fcs]');if(h){const k=h.dataset.fcs;FC.dir=FC.sort===k?-FC.dir:1;FC.sort=k;renderFc();return;}
    const o=e.target.closest('.fcopen');if(o&&typeof openRun==='function'){openRun(o.dataset.key);return;}
    if(e.target.closest('#fcRefresh'))renderFc(true);});
  c.addEventListener('change',e=>{if(e.target.id==='fcPaused'){FC.paused=e.target.checked;renderFc();return;}
    const sel=e.target.closest('select.inl');if(!sel)return;const s=srcGet(sel.dataset.key);if(!s)return;
    if(sel.classList.contains('ownsel'))s.owner=sel.value;else if(sel.classList.contains('cadsel'))s.cadence=sel.value;else if(sel.classList.contains('stsel')){s.status=sel.value;s.paused=s.status==='paused';}
    srcSave(s);toast(`${s.name}: ${sel.classList.contains('ownsel')?'now '+s.owner+"'s":sel.classList.contains('stsel')?(STATUS_LABEL[s.status]||s.status):CADENCE_LABEL[s.cadence]} — saved for everyone`);
    if(typeof renderList==='function')renderList();renderFc();});});
