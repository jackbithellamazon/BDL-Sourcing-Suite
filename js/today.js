/* ============ b333 (Jack, 16 Nov: "L yes · N yes · S ok") — thin fold lines + the Today panel ============
   Nothing here fetches, saves to the cloud or spends a token. It only reads what the page already holds
   (the filters, the run records, the lists last night's pull already loaded) and remembers, per person and in this
   browser only, which thin lines that person has clicked open. Closed is the default for everyone. */
const FOLD_KEY='bdl-sourcing-fold';
/* pure: is line k open for this person? all = {person:{k:1}} */
function foldRead(all,who,k){const m=all&&typeof all==='object'?all[who||'—']:null;return!!(m&&typeof m==='object'&&m[k]);}
/* pure: a new map with line k open / closed for this person — the old map is never changed, an empty person is dropped */
function foldWrite(all,who,k,open){const o={};Object.keys(all&&typeof all==='object'?all:{}).forEach(p=>{if(all[p]&&typeof all[p]==='object')o[p]=Object.assign({},all[p]);});
  const w=who||'—';o[w]=o[w]||{};if(open)o[w][k]=1;else delete o[w][k];if(!Object.keys(o[w]).length)delete o[w];return o;}
function foldOpen(k){return foldRead(lsGet(FOLD_KEY,null),me(),k);}
function foldSet(k,open){lsSet(FOLD_KEY,foldWrite(lsGet(FOLD_KEY,null),me(),k,open));}

/* ---------- L · Brands / Filters: the guide and the week's tiles behind one thin line ---------- */
const tdN=n=>(+n||0).toLocaleString('en-GB');
/* pure: the week's key numbers, readable while the tiles are shut. k = the same counts the tiles show */
function weekLineParts(k){k=k||{};return[[tdN(k.rowsIn),'through the rules'],[tdN(k.leads),(+k.leads===1?'lead':'leads')],[tdN(k.hot),(+k.hot===1?'banger':'bangers')],[tdN(k.tr),'to review'],[tdN(k.due),'due']];}
function weekLineText(k){return weekLineParts(k).map(p=>p[0]+' '+p[1]).join(' · ');}
function renderListFold(){const el=$('#listFold'),kp=$('#bKpis'),how=$('#howTo');if(!el)return;
  const ko=foldOpen('kpis'),ho=foldOpen('how');if(kp)kp.hidden=!ko;if(how)how.hidden=!ho;
  const prime=typeof primeEventOn==='function'&&primeEventOn()&&typeof PRIME_NOTE_SHORT!=='undefined';
  el.innerHTML=`<button class="lfb${ko?' on':''}" type="button" data-fold="kpis" aria-expanded="${ko}" title="${ko?'Hide the tiles':'Show the eight tiles — what actually happened this week'}"><i class="lfa">${ko?'▾':'▸'}</i><span class="lfl">This week</span><span class="lfv">${weekLineParts(window.KPI_NOW).map(p=>`<b>${p[0]}</b> ${p[1]}`).join('<i class="lfd">·</i>')}</span></button>`+
    `<button class="lfb${ho?' on':''}" type="button" data-fold="how" aria-expanded="${ho}" title="${ho?'Hide the guide':'Show the four steps of a day'}"><i class="lfa">${ho?'▾':'▸'}</i><span class="lfl">How a day works</span></button>`+
    (prime?`<b class="pnchip lfp" title="${escapeHtml(PRIME_NOTE_FULL)}">${escapeHtml(PRIME_NOTE_SHORT)}</b>`:'');}

/* ---------- N · run screen: the Run summary as one line ---------- */
/* pure: "170 in · 80 leads · 24 to review" */
function sumLineText(inN,leads,rev){const a=[tdN(inN)+' in',tdN(leads)+(+leads===1?' lead':' leads')];if(+rev>0)a.push(tdN(rev)+' to review');return a.join(' · ');}
function paintSumLine(){const el=$('#sumLine');if(!el)return;const card=el.closest('.stepcard');
  const R=typeof result!=='undefined'?result:null;
  if(!R||!R.st||!R.out){el.hidden=true;if(card)card.classList.remove('sumfold');return;}
  const r1=typeof cur!=='undefined'&&cur&&cur.rule===1,inN=r1?R.st.viewer:R.st.rows,rev=R.out.filter(o=>o.QUEUE).length;   /* the same first tile as the full summary: in the Viewer (Rule 1) / in the export (Rule 2) */
  const open=foldOpen('sum');el.hidden=false;if(card)card.classList.toggle('sumfold',!open);el.setAttribute('aria-expanded',String(open));
  el.innerHTML=`<i class="lfa">${open?'▾':'▸'}</i><span class="lfv"><b>${escapeHtml(sumLineText(inN,R.out.length,rev))}</b></span><span class="lfs">${open?'hide the numbers':'show the numbers'}</span>`;}

/* ---------- S · Home: Today ---------- */
/* what the page already knows about each filter this person may see — no fetch */
function todayItems(){const m=me();if(!m||typeof listSources!=='function')return[];const jack=isJack(),t=today();
  return listSources().filter(s=>canSee(s)&&s.status!=='paused').map(s=>{const d=dueState(s),last=runLast(s.key),ld=typeof lastDoneOf==='function'?lastDoneOf(s.key):null;
    const doneToday=!!(ld&&stamp(new Date(ld.at)).slice(0,10)===t);
    const part=!!(last&&last.needDone&&!last.done&&!runStale(last));
    let auto='',autoAt='';if(typeof autoOn==='function'&&autoOn(s)){const c=AUTO.cache[s.key];if(!c)auto='wait';else if(autoFresh(c.row)){auto='ready';autoAt=autoHM(c.row.finished_at);}else auto='none';}
    return{key:s.key,name:s.name,owner:s.owner&&s.owner!=='—'?s.owner:'',due:!!d.due,kind:d.kind||'',label:d.label||'',late:d.late||0,doneToday,doneBy:doneToday&&(jack||ld.who===m)?(ld.who||''):'',doneAt:doneToday?ld.at:'',part,
      partBy:part&&(jack||last.who===m)?(last.who||''):'',rev:toReviewCount(last),leads:last?(+last.leads||0):0,auto,autoAt};});}
/* pure: the four lists of the panel. Each = {n, show (the first cap, 5 unless told), more}. Due: started-not-finished first, then the latest, then today, then never run. */
function todayModel(items,cap){cap=cap||5;const L=Array.isArray(items)?items:[];
  const dr=x=>x.part?-1e6:x.kind==='late'?-(+x.late||0):x.kind==='today'?1:2;
  const pack=a=>({n:a.length,show:a.slice(0,cap),more:Math.max(0,a.length-cap)});
  const due=L.filter(x=>x.due||x.part).sort((a,b)=>dr(a)-dr(b));   /* a tie keeps the list's own order (Prime first, then the saved filters, then the brands) */
  const done=L.filter(x=>x.doneToday&&!x.part).sort((a,b)=>String(b.doneAt).localeCompare(String(a.doneAt)));
  const lists=L.filter(x=>x.auto).sort((a,b)=>(a.auto==='ready'?0:1)-(b.auto==='ready'?0:1)||String(a.name).localeCompare(String(b.name)));
  const review=L.filter(x=>+x.rev>0).sort((a,b)=>b.rev-a.rev||String(a.name).localeCompare(String(b.name)));
  return{due:pack(due),done:pack(done),lists:pack(lists),review:pack(review),revTotal:review.reduce((n,x)=>n+(+x.rev||0),0)};}
function renderToday(){const el=$('#todayPanel');if(!el)return;const m=me();if(!m){el.hidden=true;el.innerHTML='';return;}
  const jack=isJack(),M=todayModel(todayItems(),5),e=escapeHtml;
  const line=(x,right,cls)=>`<button class="tdl${cls?' '+cls:''}" type="button" data-today="${e(x.key)}" title="Open ${e(x.name)}"><span class="tdn">${e(x.name)}</span><span class="tdr">${right}</span></button>`;
  const more=(p,seg)=>p.more?`<button class="tdm" type="button" data-todaylist="${seg}">+ ${p.more} more — open the list</button>`:'';
  const col=(h,n,cls,body,empty)=>`<div class="tdc"><div class="tdh"><span>${h}</span><b class="${cls}">${n}</b></div>${body||`<div class="tde">${empty}</div>`}</div>`;
  const who=n=>n&&n!=='—'?whoChip(n):'';
  const dueH=M.due.show.map(x=>line(x,x.part?`<i class="tdt amber">started${x.partBy?' · '+e(x.partBy):''} · not finished</i>`:`<i class="tdt ${x.kind==='late'?'coral':x.kind==='today'?'amber':'dim'}">${e(x.kind==='first'?'never run':x.label)}</i>${jack&&x.owner?who(x.owner):''}`)).join('')+more(M.due,'due');
  const doneH=M.done.show.map(x=>line(x,`${x.doneBy?who(x.doneBy):''}<i class="tdt jade">✓ ${e(new Date(x.doneAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}))}</i><i class="tdt dim">${tdN(x.leads)} leads</i>`)).join('')+more(M.done,'all');
  const listH=M.lists.show.map(x=>line(x,x.auto==='ready'?`<i class="tdt jade">🌙 ready ${e(x.autoAt)} · no export</i>`:x.auto==='none'?`<i class="tdt amber">no list today · export as usual</i>`:`<i class="tdt dim">🌙 automated · no list loaded yet</i>`)).join('')+more(M.lists,'all');
  const revH=M.review.show.map(x=>line(x,`<b class="tdb">${tdN(x.rev)}</b><i class="tdt dim">to review</i>`)).join('')+more(M.review,'all');
  el.hidden=false;
  el.innerHTML=`<div class="tdhead"><h2>Today</h2><span class="sub">${jack?'everyone’s filters':'your filters'} · from what this page already holds — click a line to open the filter</span></div><div class="tdgrid">`+
    col('Due today',M.due.n,M.due.n?'amber':'jade',dueH,jack?'Nothing is due — every filter is done for today ✓':'Nothing is due — all of yours are done for today ✓')+
    col('Done today',M.done.n,M.done.n?'jade':'dim',doneH,'Nothing finished yet today')+
    col('Last night’s lists',M.lists.show.filter(x=>x.auto==='ready').length+(M.lists.n?' of '+M.lists.n:''),M.lists.show.some(x=>x.auto==='ready')?'jade':'dim',listH,jack?'No filter is automated yet — nothing is pulled overnight':'None of your filters is automated yet — export from Keepa as usual')+
    col('Waiting to review',tdN(M.revTotal),M.revTotal?'amber':'dim',revH,'No leads are waiting for a look')+`</div>`;}
/* a line opens its filter on Brands / Filters; "+ N more" opens the list on that pill */
function todayGo(key,seg){const b=document.querySelector('.pagebtn[data-page="page-brands"]');if(b)b.click();
  if(key){if(typeof openRun==='function')openRun(key);return;}
  if(typeof cur!=='undefined'&&cur&&$('#viewRun')&&!$('#viewRun').hidden&&typeof backToList==='function')backToList();
  const s=document.querySelector('#lSeg button[data-seg="'+(seg||'all')+'"]');if(s)s.click();}
document.addEventListener('click',ev=>{const t=ev.target;if(!t||!t.closest)return;
  const f=t.closest('#listFold [data-fold]');if(f){foldSet(f.dataset.fold,!foldOpen(f.dataset.fold));renderListFold();return;}
  if(t.closest('#sumLine')){foldSet('sum',!foldOpen('sum'));paintSumLine();return;}
  const l=t.closest('#todayPanel [data-today]');if(l){todayGo(l.dataset.today);return;}
  const mo=t.closest('#todayPanel [data-todaylist]');if(mo){todayGo('',mo.dataset.todaylist);return;}
  if(t.closest('.pagebtn[data-page="page-lead"]'))setTimeout(renderToday,0);});
