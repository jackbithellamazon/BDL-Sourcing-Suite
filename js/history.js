/* BDL Sourcing — LEAD HISTORY (b58). Jack, 15 Sep: "app is still so rigid on seeing history leads".
   Every stored lead state on every source, in one table: filter it any way, sort any column, judge from here, open in Keepa.
   Rows come from the shared lead states (src_leads) + run records (how many runs an ASIN showed in) + verdicts. Nothing is recomputed. */
const HS_KEY='bdl-sourcing-hsview';
const hs=Object.assign({q:'',src:'ALL',owner:'ALL',rule:'ALL',verd:'ALL',status:'ALL',seen:'all',band:'ALL',score:'0',roi:'-999',profit:'-999',per:50,sort:'score',dir:-1,page:1},lsGet(HS_KEY,{})||{});
function hsSave(){const {q,page,...rest}=hs;lsSet(HS_KEY,rest);}
let hsCache={sig:'',rows:[]},hsPulled=0;
function hsMs(stamp){const m=/^(\d{4})-(\d{2})-(\d{2})(?:[T_ ](\d{2}):?(\d{2}))?/.exec(String(stamp||''));if(!m)return 0;return new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0)).getTime();}
function hsDate(stamp){const m=/^(\d{4})-(\d{2})-(\d{2})(?:[T_ ](\d{2}):?(\d{2}))?/.exec(String(stamp||''));if(!m)return escapeHtml(stamp||'');return `${m[3]}/${m[2]}`+(m[4]?` ${m[4]}:${m[5]}`:'');}
function hsSig(){const LA=leadAll();let n=0,last='';Object.values(LA).forEach(m=>Object.values(m||{}).forEach(e=>{n++;if(e&&e.stamp>last)last=e.stamp;}));return n+'|'+last+'|'+runsAll().length+'|'+Object.keys(blAll()).length;}
function hsBuild(){const LA=leadAll(),B=blAll(),app={};
  runsAll().forEach(r=>{const d=String(r.day||r.at).slice(0,10);(r.asins||[]).forEach(a=>{const k=r.source+'|'+a;const e=app[k]=app[k]||{n:0,first:d,last:d};e.n++;if(d<e.first)e.first=d;if(d>e.last)e.last=d;});});
  const rows=[];
  Object.entries(LA).forEach(([key,m])=>{if(!m)return;const src=srcGet(key);const rule=src?src.rule:((runLast(key)||{}).rule||2);let R;try{R=storedRows(key,rule).rows;}catch(e){return;}
    R.forEach(o=>{if(B[o.ASIN])return;const now=leadState(o,rule);const st=o._prev&&o._prev.state?compareState(now,o._prev.state):{status:'NEW',why:[],gain:0};
      const a=app[key+'|'+o.ASIN]||{n:0,first:'',last:''};
      rows.push({o,state:now,asin:o.ASIN,key,src:src?src.name:key,owner:src?(src.owner||'VAs'):'VAs',rule,title:o.Title||o.Product||'',brand:o.Brand||'',
        buy:rule===1?+o['Landed £']||0:+o['After discount £']||0,sell:rule===1?+o['Sell £ used']||0:+o['Sell for £']||0,profit:+o['Profit £']||0,roi:+o['ROI %']||0,spm:rule===1?+o.SPM||0:+o['Sells /mo']||0,score:+o.Score||0,
        status:st.status,why:st.why.join('; '),gain:st.gain,stamp:o.stamp,ms:hsMs(o.stamp),runs:a.n,first:a.first,mk:o['Buy market']||'UK'});});});
  return rows;}
function hsRows(){const sig=hsSig();if(hsCache.sig!==sig){hsCache={sig,rows:hsBuild()};}return hsCache.rows;}
function hsFiltered(){const V=verdAll(),q=(hs.q||'').toLowerCase(),t0=new Date();t0.setHours(0,0,0,0);const now=Date.now();
  return hsRows().filter(x=>{
    if(hs.src!=='ALL'&&x.key!==hs.src)return false;
    if(hs.owner!=='ALL'&&x.owner!==hs.owner)return false;
    if(hs.rule!=='ALL'&&String(x.rule)!==hs.rule)return false;
    const v=V[x.asin];if(hs.verd==='none'&&v)return false;if(hs.verd!=='ALL'&&hs.verd!=='none'&&(!v||v.v!==hs.verd))return false;
    if(hs.status!=='ALL'&&x.status!==hs.status)return false;
    if(hs.seen==='today'&&x.ms<t0.getTime())return false;if(hs.seen==='7d'&&x.ms<now-7*864e5)return false;if(hs.seen==='30d'&&x.ms<now-30*864e5)return false;if(hs.seen==='older'&&x.ms>=now-7*864e5)return false;
    if(hs.band==='a'&&x.sell>=20)return false;if(hs.band==='b'&&(x.sell<20||x.sell>=60))return false;if(hs.band==='c'&&(x.sell<60||x.sell>=150))return false;if(hs.band==='d'&&x.sell<150)return false;
    if(+hs.score>0&&x.score<+hs.score)return false;if(+hs.roi>-999&&x.roi<+hs.roi)return false;if(+hs.profit>-999&&x.profit<+hs.profit)return false;
    if(q&&!((x.asin+' '+x.title+' '+x.brand+' '+x.src).toLowerCase().includes(q)))return false;return true;});}
function hsSort(list){const k=hs.sort,d=hs.dir;const V=verdAll();const val=x=>k==='verdict'?((V[x.asin]||{}).v||''):k==='src'?x.src.toLowerCase():k==='title'?x.title.toLowerCase():k==='status'?({NEW:3,BETTER:2,UNCHANGED:1,WORSE:0})[x.status]:k==='seen'?x.ms:+x[k]||0;
  return list.sort((a,b)=>{const av=val(a),bv=val(b);return (av<bv?-1:av>bv?1:0)*d||b.score-a.score;});}
function hsRoiCls(r){return r>=30?'jade':r>=10?'':r>=0?'amber':'coral';}
function hsVerdCell(x){const v=verdGet(x.asin)||{};const b=y=>`<button type="button" class="vb ${y[0]}${v.v===y?' on':''}" data-v="${y}" data-asin="${x.asin}" data-key="${x.key}" title="${y}">${y[0]}</button>`;
  const who=v.v?`<div class="chg">${v.v==='Seen'?'seen · ':''}${whoChip(v.who||'')} ${fmtWhen(v.at)}${v.reason?' · '+escapeHtml(v.reason):''}</div>`:'';
  return`<div class="verd">${b('Yes')}${b('No')}${b('Maybe')}</div>${who}`;}
function renderHistory(){const el=$('#hsTbl');if(!el)return;
  /* live site: pull the whole shared lead table the first time the view opens (and every 10 min after) */
  if(typeof cloudEnabled==='function'&&cloudEnabled()&&typeof cloud!=='undefined'&&cloud.tables&&Date.now()-hsPulled>600e3){hsPulled=Date.now();cloudPullLeadsAll().then(ok=>{if(ok){hsCache.sig='';renderHistory();}});}
  const all=hsRows();
  const sel=$('#hsSrc');if(sel){const have=new Set([...sel.options].map(o=>o.value));const names={};all.forEach(x=>names[x.key]=x.src);
    Object.entries(names).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([k,n])=>{if(!have.has(k)){const o=document.createElement('option');o.value=k;o.textContent=n;sel.appendChild(o);}});sel.value=hs.src;if(sel.value!==hs.src){hs.src='ALL';sel.value='ALL';}}
  const list=hsSort(hsFiltered());const V=verdAll();
  let y=0,n=0,m=0,none=0,hot=0,roiSum=0,profitSum=0;const srcs=new Set();list.forEach(x=>{const v=V[x.asin];if(!v)none++;else if(v.v==='Yes')y++;else if(v.v==='No')n++;else if(v.v==='Maybe')m++;if(x.score>=75)hot++;roiSum+=x.roi;profitSum+=x.profit;srcs.add(x.key);});
  const k=(v,l,sub,cls,ic)=>`<div class="kpi"><span class="ki ${cls||''}">${ic}</span><div><div class="kv">${v}</div><div class="kl">${l}</div>${sub?`<div class="ks">${sub}</div>`:''}</div></div>`;
  const filtered=list.length!==all.length;
  $('#hsKpis').innerHTML=`<div class="kcap">${filtered?`${list.length.toLocaleString()} of ${all.length.toLocaleString()} stored leads match`:'Every stored lead'}</div>`
    +k(list.length.toLocaleString(),'Leads',`across ${srcs.size} source${srcs.size===1?'':'s'}`,'iris',ICONS.play)
    +k(none.toLocaleString(),'No verdict yet',list.length?`${Math.round((list.length-none)/list.length*100)}% judged`:'',none?'amber':'jade',ICONS.eye)
    +k(y.toLocaleString(),'Yes',`${n} No · ${m} Maybe`,y?'jade':'',ICONS.edit)
    +k(hot.toLocaleString(),'Bangers · 75+',list.length?`avg ROI ${Math.round(roiSum/list.length)}%`:'',hot?'jade':'',ICONS.run)
    +k(list.length?'£'+Math.round(profitSum/list.length):'—','Avg profit a unit','','',ICONS.hist);
  const per=hs.per>0?+hs.per:1e9;const pages=Math.max(1,Math.ceil(list.length/per));if(hs.page>pages)hs.page=pages;const page=list.slice((hs.page-1)*per,hs.page*per);
  el._page=page;
  const th=(key,label,cls)=>`<th class="${cls||''} sortable${hs.sort===key?' on':''}" data-sort="${key}">${label}${hs.sort===key?(hs.dir<0?' ↓':' ↑'):''}</th>`;
  const head=`<thead><tr>${th('score','Score','r')}${th('title','Lead','')}${th('src','Source','')}${th('buy','Buy','r')}${th('sell','Sell','r')}${th('profit','Profit','r')}${th('roi','ROI','r')}${th('spm','/mo','r')}${th('status','Move','')}${th('seen','Seen','')}${th('verdict','Verdict','')}<th></th></tr></thead>`;
  const body=page.map(x=>{const src=srcGet(x.key)||{key:x.key,name:x.src,type:'brand'};const band=bandOf(x.score);const v=V[x.asin];
    return`<tr class="${v?'judged':''}" data-asin="${x.asin}">
      <td class="num"><span class="sc ${band}">${x.score}</span></td>
      <td class="ttl"><div class="t" title="${escapeHtml(x.title)}">${escapeHtml(x.title||x.asin)}</div><div class="chg">${x.brand?escapeHtml(x.brand)+' · ':''}<button type="button" class="cp" data-copy="${x.asin}" title="Copy ASIN">${x.asin}</button>${x.mk!=='UK'?' · buy '+FLAG[x.mk]:''}</div></td>
      <td class="lsrc"><div class="lrow">${avatar(src)}<div><b>${escapeHtml(x.src)}</b><div class="chg">${whoChip(x.owner)} <span class="rl r${x.rule}">Rule ${x.rule}</span></div></div></div></td>
      <td class="num">${gbp(x.buy)}</td><td class="num">${gbp(x.sell)}</td><td class="num"><b class="${x.profit>0?'jade':'coral'}">${gbp(x.profit)}</b></td><td class="num"><b class="${hsRoiCls(x.roi)}">${pct(x.roi)}</b></td><td class="num">${x.spm.toLocaleString()}</td>
      <td><span class="spill ${({NEW:'new',BETTER:'better',WORSE:'worse',UNCHANGED:'same'})[x.status]||'same'}">${x.status}</span>${x.why?`<div class="chg" title="${escapeHtml(x.why)}">${escapeHtml(x.why.split('; ')[0])}</div>`:''}</td>
      <td class="lwhen">${hsDate(x.stamp)}<div class="chg">${x.runs?`${x.runs} run${x.runs===1?'':'s'}${x.first?' · since '+hsDate(x.first):''}`:'no run record'}</div></td>
      <td>${hsVerdCell(x)}</td>
      <td class="lnks"><a href="${x.o.Keepa}" target="_blank" rel="noopener" title="Keepa">K</a><a href="${x.o.SAS}" target="_blank" rel="noopener" title="SAS">S</a><a href="${x.o['Buy link']}" target="_blank" rel="noopener" title="Amazon buy page">A</a></td></tr>`;}).join('');
  el.innerHTML=head+`<tbody>${body||`<tr><td colspan="12" class="more">${all.length?'Nothing matches — loosen a filter or hit Reset.':'No leads stored yet. Run a source and its kept leads land here.'}</td></tr>`}</tbody>`;
  const pg=$('#hsPager');if(pg){let btns='';for(let i=1;i<=pages;i++){if(pages>9&&Math.abs(i-hs.page)>3&&i!==1&&i!==pages){if(!btns.endsWith('…'))btns+='…';continue;}btns+=`<button type="button" data-pg="${i}"${i===hs.page?' class="on"':''}>${i}</button>`;}
    pg.innerHTML=`<span>${list.length.toLocaleString()} lead${list.length===1?'':'s'} · page ${hs.page} of ${pages}</span><div class="pg"><button type="button" data-pg="${hs.page-1}"${hs.page<=1?' disabled':''}>‹</button>${btns.replace(/…/g,'<span class="dots">…</span>')}<button type="button" data-pg="${hs.page+1}"${hs.page>=pages?' disabled':''}>›</button></div>`;}}
function hsExport(){const list=hsSort(hsFiltered());if(!list.length){toast('Nothing to export',true);return;}const V=verdAll();
  const hdr=['asin','title','brand','source','owner','rule','buy_market','buy','sell','profit','roi','sells_per_month','score','move','changed','last_seen','runs_seen_in','first_seen','verdict','verdict_by','verdict_at','verdict_reason','keepa'];
  download(today()+'-LEAD-HISTORY.csv',rowsToCsv(hdr,list.map(x=>{const v=V[x.asin]||{};return{asin:x.asin,title:x.title,brand:x.brand,source:x.src,owner:x.owner,rule:x.rule,buy_market:x.mk,buy:x.buy,sell:x.sell,profit:x.profit,roi:x.roi,sells_per_month:x.spm,score:x.score,move:x.status,changed:x.why,last_seen:x.stamp,runs_seen_in:x.runs,first_seen:x.first,verdict:v.v||'',verdict_by:v.who||'',verdict_at:v.at||'',verdict_reason:v.reason||'',keepa:x.o.Keepa};})),'text/csv');}
function historyOpenFor(key){Object.assign(hs,{src:key,verd:'ALL',status:'ALL',seen:'all',band:'ALL',score:'0',roi:'-999',profit:'-999',q:'',page:1});hsSave();if(historyInit._sync)historyInit._sync();const q=$('#hsQ');if(q)q.value='';showTab('leads');
  const sel=$('#hsSrc');if(sel&&sel.value!==key){renderHistory();sel.value=key;}renderHistory();$('#cardLeads').scrollIntoView({behavior:'smooth',block:'start'});}
function historyInit(){const el=$('#hsTbl');if(!el)return;
  [['hsSrc','src'],['hsOwner','owner'],['hsRule','rule'],['hsVerd','verd'],['hsStatus','status'],['hsSeen','seen'],['hsBand','band'],['hsScore','score'],['hsRoi','roi'],['hsProfit','profit'],['hsPer','per']].forEach(([id,k])=>{const e=$('#'+id);if(!e)return;e.value=String(hs[k]);if(e.value!==String(hs[k]))hs[k]=e.value;e.addEventListener('change',ev=>{hs[k]=ev.target.value;hs.page=1;hsSave();renderHistory();});});
  $('#hsQ').addEventListener('input',e=>{hs.q=e.target.value;hs.page=1;renderHistory();});
  $('#hsReset').addEventListener('click',()=>{Object.assign(hs,{q:'',src:'ALL',owner:'ALL',rule:'ALL',verd:'ALL',status:'ALL',seen:'all',band:'ALL',score:'0',roi:'-999',profit:'-999',page:1});$('#hsQ').value='';hsSave();historyInit._sync();renderHistory();});
  historyInit._sync=()=>{[['hsSrc','src'],['hsOwner','owner'],['hsRule','rule'],['hsVerd','verd'],['hsStatus','status'],['hsSeen','seen'],['hsBand','band'],['hsScore','score'],['hsRoi','roi'],['hsProfit','profit'],['hsPer','per']].forEach(([id,k])=>{const e=$('#'+id);if(e)e.value=String(hs[k]);});};
  $('#hsCsv').addEventListener('click',hsExport);
  $('#hsKeepa').addEventListener('click',()=>{const p=$('#hsTbl')._page||[];if(!p.length){toast('Nothing on this page',true);return;}if(p.length>OPEN_ALL_MAX){toast('Keepa takes '+OPEN_ALL_MAX+' at a time — use a smaller page',true);return;}window.open(keepaLink(p.map(x=>x.asin),'2'),'_blank');});
  $('#hsRefresh').addEventListener('click',async()=>{if(!(typeof cloudEnabled==='function'&&cloudEnabled())){toast('Cloud is off here (sandbox) — showing this browser\'s leads');hsCache.sig='';renderHistory();return;}
    toast('Pulling the shared leads…');const ok=await cloudPullLeadsAll();hsCache.sig='';hsPulled=Date.now();renderHistory();toast(ok?'Lead history refreshed':'Could not pull — '+(cloud.err||'try again'),!ok);});
  $('#hsPager').addEventListener('click',e=>{const b=e.target.closest('button[data-pg]');if(!b||b.disabled)return;hs.page=parseInt(b.dataset.pg);renderHistory();$('#cardLeads').scrollIntoView({behavior:'smooth',block:'start'});});
  el.addEventListener('click',e=>{const th=e.target.closest('th.sortable');if(th){const k=th.dataset.sort;if(hs.sort===k)hs.dir=-hs.dir;else{hs.sort=k;hs.dir=['title','src','verdict'].includes(k)?1:-1;}hs.page=1;hsSave();renderHistory();return;}
    const cp=e.target.closest('button[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');return;}
    const b=e.target.closest('button[data-v]');if(!b)return;if(!needMe(b))return;const a=b.dataset.asin;const x=(hsCache.rows||[]).find(r=>r.asin===a&&r.key===b.dataset.key);const v=verdGet(a)||{};
    if(v.v===b.dataset.v){verdSet(a,null);toast('Verdict cleared on '+a);}else{verdSet(a,{v:b.dataset.v,reason:'',note:v.note||'',source:b.dataset.key,state:x?x.state:null});toast(a+' → '+b.dataset.v+' — shared');}
    renderHistory();if(typeof renderList==='function')segCounts();});}
