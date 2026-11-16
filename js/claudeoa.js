/* ============ b333 (Jack, 16 Nov) — Storefront audits: "Export for Claude" out, "Drop Claude's results" back in ============
   Jack's page only: a VA never sees a button, a line or a chip from this file, and never stores the results.
   OUT: a CSV of what is left to judge (one row per ASIN) for Claude to source from. No tokens, no network, nothing saved.
   IN:  Claude's results file, in one fixed format. Per ASIN the newest result wins. It is kept in this browser and shared as one
        settings row ('claude-oa') so it follows Jack to another browser. A result is NEVER a verdict: it shows as a line on the row
        and, for an OA lead only, changes the suggested answer. Jack still presses. */
const CLAUDE_KEY='bdl-sourcing-claude-oa',CLAUDE_SKIP='bdl-sourcing-claude-skip',CLAUDE_CAP=3000;
const CLAUDE_HDR=['ASIN','Result','Shop','Link','Price £','Delivery £','Code','Price after code £','Sell £','Profit £','ROI %','Checked at','Where looked','Note'];
const CLAUDE_RES={'oa lead':'lead','too dear':'dear','not found':'none','check':'check'};
const CLAUDE_WORD={lead:'OA lead',dear:'too dear',none:'not found',check:'check'};
const CLAUDE_EXP_HDR=['Rival(s)','Seller ID(s)','Rival listed it','ASIN','Title','Brand','EAN','Root category','Amazon link','Keepa link','Price now £','Sell £ (Suite)','Most you can pay for 10% £','VAT %','Referral %','FBA fee £','Weight kg','Lead on Amazon UK today?','EU price if known','Why','Suggested answer','Suggested because','OA check','Numbers checked on','Claude result','Claude checked at'];
function claudeCan(){return typeof isJack==='function'&&isJack()&&!(typeof audIsVA==='function'&&audIsVA());}

/* ---------- IN · pure parts ---------- */
const clNum=v=>{const s=String(v==null?'':v).replace(/[£,\s%]/g,'');if(s==='')return null;const n=+s;return isFinite(n)?n:null;};
/* pure: the file's text → {ok:false,msg} | {ok:true,rows:[{a,r,…}],skipped}. The first row has to be the fixed header, exactly. */
function claudeParse(text){const T=typeof parseCSV==='function'?parseCSV(String(text||'')):[];const rows=T.filter(r=>r&&r.some(c=>String(c).trim()!==''));
  const want=CLAUDE_HDR.join(','),got=rows.length?rows[0].map(c=>String(c).trim()).join(','):'';
  if(got!==want)return{ok:false,msg:'That is not a Claude results file. Its first row has to be exactly: '+want};
  const out=[];let skipped=0;
  rows.slice(1).forEach(c=>{const g=i=>String(c[i]==null?'':c[i]).trim();const a=g(0).toUpperCase(),r=CLAUDE_RES[g(1).toLowerCase()];
    if(!/^[A-Z0-9]{10}$/.test(a)||!r){skipped++;return;}
    const at=g(11),ok=at&&!isNaN(Date.parse(at));const o={a,r};
    const put=(k,v)=>{if(v!=null&&v!=='')o[k]=v;};
    put('s',g(2).slice(0,60));put('l',/^https?:\/\//i.test(g(3))?g(3).slice(0,400):'');put('p',clNum(g(4)));put('d',clNum(g(5)));put('c',g(6).slice(0,40));put('af',clNum(g(7)));
    put('sl',clNum(g(8)));put('pf',clNum(g(9)));put('roi',clNum(g(10)));put('at',ok?new Date(at).toISOString():'');put('w',g(12).slice(0,160));put('n',g(13).slice(0,200));
    out.push(o);});
  return{ok:true,rows:out,skipped};}
/* pure: newest wins per ASIN (a tie goes to the row that came in later). Returns a NEW map + what came in. */
function claudeMerge(map,rows){const m=Object.assign({},map&&typeof map==='object'?map:{});const c={n:0,lead:0,dear:0,none:0,check:0};
  (rows||[]).forEach(x=>{if(!x||!x.a||!CLAUDE_WORD[x.r])return;c.n++;c[x.r]++;const cur=m[x.a];const o=Object.assign({},x);delete o.a;
    if(!cur||String(o.at||'')>=String(cur.at||''))m[x.a]=o;});
  return{map:m,counts:c};}
function claudeCapMap(m,cap){let e=Object.entries(m||{});cap=cap||CLAUDE_CAP;if(e.length>cap)e=e.sort((x,y)=>String(y[1].at||'').localeCompare(String(x[1].at||''))).slice(0,cap);return Object.fromEntries(e);}
/* pure: "37 results in: 4 OA leads · 21 too dear · 10 not found · 2 check" */
function claudeToastText(c){return`${c.n} result${c.n===1?'':'s'} in: ${c.lead} OA lead${c.lead===1?'':'s'} · ${c.dear} too dear · ${c.none} not found · ${c.check} check`;}
const clGbp=v=>'£'+(Math.round(+v*100)/100).toFixed(2).replace(/\.00$/,'');
function clWhen(at,time){if(!at)return'';const d=new Date(at);if(isNaN(d))return'';const o={day:'numeric',month:'short',timeZone:'Europe/London'};
  let s=d.toLocaleDateString('en-GB',o);if(time)s+=' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'});return s;}
/* pure: the words of the row line (no "open" link — that is added where it is drawn). max10 = the most the Suite says he can pay. */
function claudeLineText(x,max10){if(!x||!CLAUDE_WORD[x.r])return'';const head='CLAUDE'+(x.at?' · '+clWhen(x.at,x.r==='lead'):'');
  const best=x.af!=null?x.af:x.p;
  if(x.r==='lead'){const b=[];let sh=x.s||'a shop';if(x.p!=null)sh+=' '+clGbp(x.p);if(x.af!=null&&x.af!==x.p)sh+=' → '+clGbp(x.af)+' after '+(x.c||'the code');b.push(sh);
    if(x.pf!=null)b.push(clGbp(x.pf));if(x.roi!=null)b.push(x.roi+'%');return head+' · OA lead · '+b.join(' · ');}
  if(x.r==='none')return head+' · not found'+(x.w?' — looked: '+x.w:'');
  if(x.r==='dear')return head+' · too dear'+(x.s||best!=null?' — best '+[x.s,best!=null?clGbp(best):''].filter(Boolean).join(' '):'')+(max10>0?' (most you can pay '+clGbp(max10)+')':'');
  return head+' · check'+(x.n?' — '+x.n:'');}
/* pure: the reason shown with the suggestion — an OA lead only, anything else gives '' */
function claudeSugWhy(x){if(!x||x.r!=='lead')return'';const cost=x.af!=null?x.af:x.p;return'Claude found it at '+(x.s||'a shop')+(cost!=null?' '+clGbp(cost):'')+(x.roi!=null?' · '+x.roi+'%':'');}

/* ---------- IN · storage ---------- */
let CLAUDE_C=null;
function claudeAll(){if(!claudeCan())return{};if(!CLAUDE_C){const v=lsGet(CLAUDE_KEY,null);CLAUDE_C=v&&v.rows&&typeof v.rows==='object'?v.rows:{};}return CLAUDE_C;}
function claudeOf(a){return claudeAll()[a]||null;}
function claudeSave(map,share){const v={rows:claudeCapMap(map),at:nowIso(),who:me()};CLAUDE_C=v.rows;lsSet(CLAUDE_KEY,v);
  if(share&&typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('claude-oa',v)]);}
/* the shared row arriving from the cloud: merged in, newest wins, Jack's browser only */
function claudeFromCloud(v){if(!claudeCan()||!v||!v.rows||typeof v.rows!=='object')return;
  const rows=Object.entries(v.rows).map(([a,x])=>Object.assign({a},x));const M=claudeMerge(lsGet(CLAUDE_KEY,{rows:{}}).rows||{},rows);claudeSave(M.map,false);}
function claudeTakeText(text){if(!claudeCan())return false;const P=claudeParse(text);if(!P.ok){toast(P.msg,true);return false;}
  if(!P.rows.length){toast('That file has the right first row but no result rows'+(P.skipped?' ('+P.skipped+' could not be read)':''),true);return false;}
  const M=claudeMerge(claudeAll(),P.rows);claudeSave(M.map,true);if(typeof auView!=='undefined')auView._listHtml=null;if(typeof renderAudit==='function')renderAudit();
  toast(claudeToastText(M.counts)+(P.skipped?' · '+P.skipped+' row'+(P.skipped===1?'':'s')+' could not be read':''));return true;}
/* a file dropped anywhere on Storefront audits: Claude's results are taken here, everything else goes on to the Keepa-export path */
const claudeLooks=t=>/^﻿?\s*"?ASIN"?\s*,\s*"?Result"?\s*(,|$)/i.test(String(t||'').slice(0,200));
async function claudeSift(list){const rest=[];for(const f of[...list]){let t='';if(/\.csv$/i.test(f.name)){try{t=await readFileText(f);}catch(e){}}
    if(t&&claudeLooks(t)){if(claudeCan())claudeTakeText(t);}else rest.push(f);}return rest;}
async function claudePick(files){for(const f of[...files]){let t='';try{t=await readFileText(f);}catch(e){toast('Could not read '+f.name,true);continue;}claudeTakeText(t);}}

/* ---------- OUT · the export ---------- */
/* pure: shelves + a few look-ups → {hdr, rows (arrays), noSell (ASINs with no sell price), left (already checked by Claude, left out)}.
   X = {status(sh,it), old(it,sh), prod(a), now(a), ids(a), oa(a), eu(a), why(a,when), sug(it), claude(a), light}. Blank when unknown. */
function claudeExportBuild(shelves,X,opt){opt=opt||{};const by=new Map(),bad=new Set();
  (shelves||[]).forEach(sh=>(sh.items||[]).forEach(it=>{if(X.old(it,sh))return;if(X.status(sh,it)!=='todo'){bad.add(it.a);return;}
    let g=by.get(it.a);if(!g)by.set(it.a,g={it,sh:[]});g.sh.push({sh,it});}));
  const rows=[],noSell=[];let left=0;const n2=v=>v==null||v===''||isNaN(v)?'':(Math.round(+v*100)/100).toFixed(2),pc=v=>v==null||v===''||isNaN(v)?'':String(Math.round(+v*1000)/10);
  by.forEach((g,a)=>{if(bad.has(a))return;const cl=X.claude(a);if(opt.skipChecked&&cl){left++;return;}
    const p=X.prod(a)||{},N=X.now(a),now=N&&!N.none?N:null;if(!(now&&now.sell>0))noSell.push(a);
    if(X.light){rows.push([a]);return;}
    const when=g.it.base?'':String(g.it.first||''),w=X.why(a,when),sg=X.sug(g.it),oa=X.oa(a),eu=X.eu(a),ids=X.ids(a)||{};
    rows.push([g.sh.map(x=>x.sh.name).join(' | '),g.sh.map(x=>x.sh.seller||'').join(' | '),g.sh.map(x=>x.it.base?'':String(x.it.first||'')).join(' | '),a,p.title||'',p.brand||'',ids.e||p.ean||'',
      p.root!=null&&p.root!==''?String(p.root):(now&&now.root!=null?String(now.root):''),'https://www.amazon.co.uk/dp/'+a,'https://keepa.com/#!product/2-'+a,
      n2(p.price),now?n2(now.sell):'',now?n2(now.max10):'',now&&now.vat!=null?pc(now.vat):'',now&&now.ref!=null?pc(now.ref):'',now?n2(now.fba):'',now&&now.kg!=null&&now.kg!==''?String(now.kg):'',
      now&&now.p!=null?(now.lead?'yes':'no')+(now.buy>0?' · buy £'+n2(now.buy):'')+(now.roi!=null&&now.roi!==''?' · ROI '+now.roi+'%':''):'',
      eu&&eu.buy>0?[eu.mk,'£'+n2(eu.buy),eu.day,eu.src].filter(Boolean).join(' · '):'',
      w?w.txt||'':'',sg?sg.label||sg.code:'',sg?sg.why||'':'',
      oa?(oa.k==='none'?'no shop found':[oa.k==='lead'?'OA lead':oa.k==='maybe'?'maybe':'not a lead',oa.h&&oa.h.s,oa.h&&oa.h.c>0?'£'+n2(oa.h.c)+' after code':'',oa.h&&oa.h.roi!=null?'ROI '+oa.h.roi+'%':''].filter(Boolean).join(' · ')):'',
      now&&now.at?String(now.at).slice(0,10):'',cl?CLAUDE_WORD[cl.r]||'':'',cl&&cl.at?cl.at:'']);});
  return{hdr:CLAUDE_EXP_HDR.slice(),rows,noSell,left};}
/* pure: UTF-8 BOM, comma, every cell quoted */
function claudeCsv(hdr,rows){const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';return'﻿'+[hdr].concat(rows).map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';}
function claudeFileName(name,day){const s=String(name||'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30).replace(/-+$/,'');return'SOURCING-SUITE-for-Claude-'+(s||'all-rivals')+'-'+day+'.csv';}
function claudeSkipOn(){return lsGet(CLAUDE_SKIP,true)!==false;}
function claudeCtx(light){const V=audAll(),N=audNowAll(),I=typeof oaIdsAll==='function'?oaIdsAll():{},C=claudeAll();
  return{light:!!light,status:(sh,it)=>audStatus(V[it.a],audSells(sh.id,it.a)),old:(it,sh)=>audIsOld(it,sh),prod:a=>audState.prod[a],now:a=>N[a],ids:a=>I[a],claude:a=>C[a]||null,
    oa:a=>typeof oaVerdict==='function'?oaVerdict(a):null,eu:a=>typeof audEuSeen==='function'?audEuSeen(a):null,why:(a,when)=>typeof audWhyInfo==='function'?audWhyInfo(a,when):null,
    sug:it=>{const s=typeof audSuggest==='function'?audSuggest(it):null;if(!s)return null;const t=audPick().find(x=>x.code===s.code);return{code:s.code,label:t?t.label:s.code,why:s.why};}};}
function claudeShelves(id){if(id){const sh=audShelf(id);return sh?[sh]:[];}const arch=audArchived();return audShelfList().filter(s=>s.kind==='rival'&&!arch.has(s.id));}
function claudeExportGo(id){if(!claudeCan())return;const sh=id?audShelf(id):null;const B=claudeExportBuild(claudeShelves(id),claudeCtx(false),{skipChecked:claudeSkipOn()});
  if(!B.rows.length){toast(B.left?'Nothing new to export — Claude has already checked all '+B.left+' (untick the box to export them again)':'Nothing is left to judge here',true);return;}
  const name=claudeFileName(sh?sh.name:'',today());download(name,claudeCsv(B.hdr,B.rows),'text/csv;charset=utf-8');
  toast(B.rows.length.toLocaleString()+' product'+(B.rows.length===1?'':'s')+' exported for Claude'+(B.left?' · '+B.left+' already checked left out':''));}
function claudeViewerGo(id){if(!claudeCan())return;const B=claudeExportBuild(claudeShelves(id),claudeCtx(true),{skipChecked:claudeSkipOn()});const need=B.noSell.slice(0,250);
  if(!need.length){toast('Every product here already has a sell price');return;}
  copy(need.join(', '),need.length+' ASINs copied — they are also loading in the Viewer');window.open(keepaLink(need,'2'),'_blank');
  toast('Export ALL columns from the Viewer, then drop the file on this page');}

/* ---------- what is drawn (Jack only) ---------- */
function claudeHeadBtns(){if(!claudeCan())return'';
  return`<button class="btn ghost sm" id="auExport" type="button" title="A CSV of everything left to judge on every rival — one row per product — for Claude to source from. No tokens.">⬇ Export for Claude</button><button class="btn ghost sm" id="auClaudeDrop" type="button" title="Drop Claude’s results file here, or click to choose it. A result is never an answer: it shows on the row and you still press.">⬆ Drop Claude’s results</button><input type="file" id="auClaudeFile" accept=".csv" hidden>`;}
function claudeShelfBtn(){if(!claudeCan())return'';return`<button class="btn ghost sm" id="auExportSh" type="button" title="A CSV of what is left to judge on this rival only, for Claude to source from. No tokens.">⬇ Export for Claude</button>`;}
function claudeBar(id){if(!claudeCan())return'';const B=claudeExportBuild(claudeShelves(id),claudeCtx(true),{skipChecked:claudeSkipOn()});const n=B.noSell.length,on=claudeSkipOn(),tot=Object.keys(claudeAll()).length;
  if(!B.rows.length&&!B.left&&!tot)return'';
  return`<div class="clbar"><span class="clt"><b>For Claude:</b> ${B.rows.length.toLocaleString()} to export${B.left?` · ${B.left.toLocaleString()} already checked left out`:''}</span>
    <label class="clchk" title="On: a second export does not repeat what Claude has already checked"><input type="checkbox" id="auClaudeSkip"${on?' checked':''}> Leave out ones Claude already checked</label>
    ${n?`<span class="clwarn"><b>${n.toLocaleString()}</b> ${n===1?'has':'have'} no sell price yet — open them in Keepa Viewer (free) and drop the export here first</span><button class="btn ghost xs" id="auClaudeViewer" type="button" data-id="${escapeHtml(id||'')}">Open in Keepa Viewer</button>`:''}</div>`;}
function claudeRowLine(a){if(!claudeCan())return'';const x=claudeOf(a);if(!x)return'';const N=audNowAll()[a],e=escapeHtml,txt=claudeLineText(x,N&&!N.none?+N.max10||0:0);
  return`<div class="clline cl-${x.r}" title="${e('Claude’s check'+(x.at?' on '+clWhen(x.at,true):'')+(x.w?' · looked: '+x.w:'')+(x.n?' · '+x.n:'')+' — a result, not an answer: you still press')}"><span>${e(txt)}</span>${x.l?` · <a href="${e(x.l)}" target="_blank" rel="noopener">open ↗</a>`:''}</div>`;}
function claudeKeep(a,f){const x=claudeOf(a);return f==='cl-lead'?!!x&&x.r==='lead':!!x;}
function claudeChips(list,btn){if(!claudeCan())return'';let l=0,n=0;const C=claudeAll();(list||[]).forEach(it=>{const x=C[it.a];if(x){n++;if(x.r==='lead')l++;}});
  return(l?btn('cl-lead','oa',`Claude: OA leads (${l})`,'Claude found these at a UK shop cheap enough'):'')+(n?btn('cl-any','sub',`Claude checked (${n})`,'Every product here that Claude has a result for'):'');}

document.addEventListener('click',ev=>{const t=ev.target;if(!t||!t.closest||!t.closest('#page-audit'))return;
  if(t.closest('#auExport')){claudeExportGo('');return;}
  if(t.closest('#auExportSh')){claudeExportGo(typeof auView!=='undefined'?auView.shelf:'');return;}
  if(t.closest('#auClaudeDrop')){const f=document.getElementById('auClaudeFile');if(f)f.click();return;}
  const v=t.closest('#auClaudeViewer');if(v){claudeViewerGo(v.dataset.id||'');return;}});
document.addEventListener('change',ev=>{const t=ev.target;if(!t)return;
  if(t.id==='auClaudeSkip'){lsSet(CLAUDE_SKIP,!!t.checked);if(typeof renderAudit==='function')renderAudit();return;}
  if(t.id==='auClaudeFile'){if(claudeCan())claudePick(t.files);t.value='';}});
/* the button is a drop target of its own, so a results file dropped on it never goes down the Keepa-export path */
document.addEventListener('dragover',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#auClaudeDrop');if(b){ev.preventDefault();ev.stopPropagation();b.classList.add('over');}},true);
document.addEventListener('dragleave',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#auClaudeDrop');if(b)b.classList.remove('over');},true);
document.addEventListener('drop',ev=>{const b=ev.target&&ev.target.closest&&ev.target.closest('#auClaudeDrop');if(!b)return;ev.preventDefault();ev.stopPropagation();b.classList.remove('over');if(claudeCan())claudePick(ev.dataTransfer.files);},true);
