/* BDL Sourcing — ASIN AUDIT / TRACE (b239, 3 Oct 2026). Jack's only (it lives on Storefront audits).
   Jack: "If I later find a really good product manually, I want to paste the ASIN into the audit and immediately answer: DID OUR SYSTEM
   FIND THIS? If yes — when, which filter, what score, was it exported, did the VA put it on the lead sheet?" Four answers:
     not found · found but cut by the rules · shown as a lead but never led · worked (and who got there first — the system or the VA).

   Where each part comes from
     · shown as a lead (= "exported": in To review or All leads)   src_runs — every run since 13 Sep keeps its leads (asins), its To review
                                                                    list (queue) and, from b239, each lead's buy / score / ROI (nb)
     · in the export but cut by the rules                          src_seen — NEW (b239): one row per ASIN per filter, written after every
                                                                    run: first / last day, how many days, last buy / score / ROI, why it was cut.
                                                                    Needs the SQL file run once. Until then rows wait in this browser (big store).
     · opened by a VA                                              the activity log (src_settings act:<name>:<day>)
     · Y / N / M                                                   src_verdicts
     · lead sheet — whose, when                                    AVM HQ's `leads` table, read only */
const SEEN_PEND='bdl-sourcing-seen-pending',TRACE_Q='bdl-sourcing-trace-q';
const trState={seenDone:{},q:'',rows:null,busy:false,open:new Set(),sheet:null,sheetAt:0,sheetBusy:null,seenOk:null,ri:null,riSig:'',expand:new Set(),seen:{},seenAt:{}};

/* ============ capture: every product a run saw, cut ones included ============ */
/* pure — R is the run result, F the files that went in. One row per ASIN: a = ASIN, s = filter, d = day, k = 1 if it came out as a lead,
   b / sc / r = buy £ / score / ROI %, w = why it was cut, u = who ran it */
function seenRows(R,F,src,day,who){const out=new Map();if(!R||!src)return[];const rule=R.rule;
  const n2=x=>{const v=+x;return isFinite(v)&&v?Math.round(v*100)/100:null;};
  const buyOf=o=>rule===1?o['Landed £']:(o['After discount £']||o['Buy at £']);
  /* b300 (Jack, 13 Oct: "we are future proofing this now — most of these should have an answer for where they found it and when"): the country it
     was cheapest in and the sell price go too. With the 13 Oct SQL run, src_seen keeps them day by day (hist), not just the last day. */
  const mkOf=o=>rule===1?(o['Buy market']||''):'UK',sellOf=o=>rule===1?o['Sell £ used']:o['Sell for £'];
  const put=(a,k,b,sc,roi,w,m,sl)=>{a=String(a||'').trim().toUpperCase();if(!/^B[0-9A-Z]{9}$/.test(a))return;if(out.has(a)&&!k)return;
    out.set(a,{a,s:src,d:day,k:k?1:0,b:n2(b),sc:sc==null||sc===''?null:Math.round(+sc)||0,r:roi==null||roi===''?null:Math.round(+roi*10)/10,w:String(w||'').slice(0,140),u:who||'',m:m||'',sl:n2(sl)});};
  const why={};(R.dropped||[]).forEach(d=>{if(d&&d[0]&&!why[d[0]])why[d[0]]=d[2];});
  const all={};(R.all||[]).forEach(o=>{if(o&&o.ASIN)all[o.ASIN]=o;});
  ['one','viewer','UK','DE','FR','IT','ES'].forEach(k=>{const f=F&&F[k];if(!f||!f.rows)return;f.rows.forEach(r=>{const a=String(r.ASIN||'').trim();if(!a||out.has(a))return;const o=all[a];
    if(o)put(a,false,buyOf(o),o.Score,o['ROI %'],why[a]||'cut by the rules',mkOf(o),sellOf(o));
    else if(rule===1&&/^(DE|FR|IT|ES)$/.test(k))put(a,false,null,null,null,why[a]||'cut by the rules',k,null);   /* b300: an EU file's price is in € — no £ figure rather than a wrong one */
    else put(a,false,kNum(r['Amazon: Current'])||kNum(r['Buy Box: Current']),null,null,why[a]||(rule===1?'cut by the rules':'sells under 9 a month, or no sell price'),k==='UK'||rule!==1?'UK':'',null);});});
  (R.out||[]).forEach(o=>put(o.ASIN,true,buyOf(o),o.Score,o['ROI %'],'',mkOf(o),sellOf(o)));
  return[...out.values()];}
/* after a real run (brands.js logRun): queue the rows and try to send them. Nothing goes anywhere on localhost or in guest mode. */
function seenRecord(R,F,src,who){if(typeof cloudEnabled!=='function'||!cloudEnabled())return 0;
  const rows=seenRows(R,F,src,today(),who);if(!rows.length)return 0;
  const P=lsGet(SEEN_PEND,[])||[];P.push({at:nowIso(),src,rows});
  /* at most 40 runs / 60,000 rows wait here — the oldest go first if the SQL is never run */
  while(P.length>40||P.reduce((n,x)=>n+x.rows.length,0)>60000)P.shift();
  lsSet(SEEN_PEND,P);seenFlush();return rows.length;}
let seenBusy=false;
async function seenFlush(){if(seenBusy||window.TAB_PAUSED||typeof cloudEnabled!=='function'||!cloudEnabled())return;   /* b306 */seenBusy=true;
  try{let P=lsGet(SEEN_PEND,[])||[];
    while(P.length){const b=P[0];
      for(let i=0;i<b.rows.length;i+=500)await cloudReq('POST','rpc/src_seen_add',{rows:b.rows.slice(i,i+500)});
      P=(lsGet(SEEN_PEND,[])||[]).filter(x=>!(x.at===b.at&&x.src===b.src));lsSet(SEEN_PEND,P);}
    trState.seenOk=true;}
  catch(e){if(typeof missingTables==='function'&&missingTables(e))trState.seenOk=false;}   /* not set up yet, or offline: they wait and go next time */
  finally{seenBusy=false;}}
document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{seenFlush().catch(()=>{});},20000);});

/* ============ the data, per ASIN ============ */
const trVa=v=>{const s=String(v||'').trim();return/^suz/i.test(s)?'Suz':/^mera/i.test(s)?'Mera':s.charAt(0).toUpperCase()+s.slice(1);};
/* b312 (Jack, 22 Oct: "is it seen if they are in any lead sheets"): the sheet's date is sometimes read the wrong way round — a June lead
   saved as 6 Sep, a May one as 5 Jul (the tab says the month). Day and month swap back when that matches the tab; a date more than 3 days
   after the row was added cannot be right, so the day it was added wins. */
const TR_MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
function trSheetDay(l){const d=String(l.date||'').slice(0,10),c=String(l.created_at||'').slice(0,10),p=n=>String(n).padStart(2,'0');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return c;const[y,mo,da]=d.split('-').map(Number),tm=TR_MON.indexOf(String(l.tab||'').trim().toLowerCase().slice(0,3))+1;
  if(tm&&mo!==tm&&da===tm)return`${y}-${p(da)}-${p(mo)}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(c)&&Date.UTC(y,mo-1,da)-Date.parse(c+'T00:00:00Z')>3*864e5)return c;
  return d;}
const trD=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return'—';return new Date(+m[1],+m[2]-1,+m[3]).toLocaleDateString('en-GB',{day:'numeric',month:'short'});};
/* every day an ASIN came out as a lead: filter, whose filter, who ran it, To review or not, the numbers that day */
function trRunIdx(){const runs=runsAll();const sig=runs.length+'|'+((runs[runs.length-1]||{}).at||'');if(trState.ri&&trState.riSig===sig)return trState.ri;
  const LA=leadAll(),S={};srcAll().forEach(s=>S[s.key]=s);const m={};
  runs.forEach(r=>{if(!r||!r.asins||!r.asins.length)return;const day=String(r.day||r.at).slice(0,10),q=new Set(r.queue||[]),src=S[r.source]||{};
    r.asins.forEach((a,i)=>{let n=r.nb&&r.nb[i];
      if(!n){const e=LA[r.source]&&LA[r.source][a];const st=e&&String(e.stamp||'').slice(0,10)===day?e.state:(e&&e.prev&&String(e.prev.stamp||'').slice(0,10)===day?e.prev.state:null);
        if(st)n=[+st.buy||null,st.score!=null?+st.score:null,st.roi!=null?+st.roi:null];}   /* runs before b239: the numbers only survive for the last day on each filter */
      (m[a]=m[a]||[]).push({day,key:r.source,name:r.name||src.name||r.source,owner:src.owner&&src.owner!=='—'?src.owner:'Jack',who:r.who||'',rev:q.has(a),
        buy:n?n[0]:null,score:n?n[1]:null,roi:n?n[2]:null});});});
  Object.values(m).forEach(x=>x.sort((p,q)=>p.day<q.day?-1:p.day>q.day?1:0));
  trState.ri=m;trState.riSig=sig;return m;}
/* the lead sheet, all of it for a year, kept 30 minutes. Jack's browser only, read only. */
async function trSheetLoad(force){if(typeof cloudReadable!=='function'||!cloudReadable())return trState.sheet||{};
  if(!force&&trState.sheet&&Date.now()-trState.sheetAt<30*60e3)return trState.sheet;if(trState.sheetBusy)return trState.sheetBusy;
  trState.sheetBusy=(async()=>{try{const since=new Date(Date.now()-365*864e5).toISOString().slice(0,10);
      const rows=await cloudGetAll('leads','select=asin,va,date,created_at,tab,superseded&created_at=gte.'+since);const m={};   /* b312: + tab, and by the day it was added — some dates are read the wrong way round */
      rows.forEach(l=>{const a=String(l.asin||'').trim().toUpperCase();if(!/^B[0-9A-Z]{9}$/.test(a)||l.superseded||!l.va)return;
        (m[a]=m[a]||[]).push({va:trVa(l.va),date:trSheetDay(l)});});
      Object.values(m).forEach(x=>x.sort((p,q)=>p.date<q.date?-1:1));trState.sheet=m;trState.sheetAt=Date.now();}catch(e){}
    trState.sheetBusy=null;return trState.sheet||{};})();
  return trState.sheetBusy;}
/* the export rows the rules cut (src_seen) — only for the ASINs asked about */
async function trSeenFor(asins){if(typeof cloudReadable!=='function'||!cloudReadable())return{};const m={};
  try{for(let i=0;i<asins.length;i+=80){const rows=await cloudGetAll('src_seen','select=*&asin=in.('+asins.slice(i,i+80).join(',')+')');
      rows.forEach(r=>(m[r.asin]=m[r.asin]||[]).push(r));}trState.seenOk=true;asins.forEach(a=>{trState.seen[a]=m[a]||[];trState.seenAt[a]=Date.now();});}
  catch(e){if(typeof missingTables==='function'&&missingTables(e))trState.seenOk=false;}
  return m;}
/* what the VAs opened, the last 45 days of the activity log */
async function trOpensFor(asins){const want=new Set(asins),m={};let rows=[];
  try{rows=typeof actPullRange==='function'?await actPullRange(new Date(Date.now()-45*864e5).toISOString().slice(0,10)):[];}catch(e){}
  (rows||[]).forEach(r=>(r.ev||[]).forEach(e=>{const x=e.x||{};const hit=new Set();if(x.a&&want.has(x.a))hit.add(x.a);if(Array.isArray(x.as))x.as.forEach(a=>{if(want.has(a))hit.add(a);});
    hit.forEach(a=>(m[a]=m[a]||[]).push({who:r.who,day:r.day,k:e.k,d:e.d}));}));
  return m;}

/* ============ the answer ============ */
/* ok = worked (the system had it first) · late = the VA had it first · miss = led, our filters never had it · shown = a lead, never led ·
   cut = in an export, the rules cut it · none = not found */
function trOutcome(a,seen){const R=trRunIdx()[a]||[],S=(trState.sheet||{})[a]||[],seenL=seen||[];
  const sys=[...R.map(x=>x.day),...seenL.map(s=>String(s.first_day||'').slice(0,10))].filter(Boolean).sort()[0]||'';
  const sh=S[0];
  if(sh){if(sys&&sys<=sh.date)return{k:'ok',t:`Found ${trD(sys)} → on ${sh.va}'s lead sheet ${trD(sh.date)}`};
    if(sys)return{k:'late',t:`${sh.va} had it first (${trD(sh.date)}) — our filters only found it ${trD(sys)}`};
    return{k:'miss',t:`On ${sh.va}'s lead sheet ${trD(sh.date)} — our filters never had it`};}
  if(R.length)return{k:'shown',t:`A lead on ${R.length} day${R.length===1?'':'s'}${R.some(x=>x.rev)?' (To review on '+R.filter(x=>x.rev).length+')':''} — never on a lead sheet`};
  if(seenL.length){const s=seenL.slice().sort((p,q)=>String(p.last_day)<String(q.last_day)?1:-1)[0];
    const nm=((typeof srcGet==='function'&&srcGet(s.source_key))||{}).name||s.source_key;
    return{k:'cut',t:`${seenL.length>1?seenL.length+' filters had it':nm+' had it'}${s.days>1?' on '+s.days+' days':''} — ${s.why||'no reason saved'}`};}
  return{k:'none',t:trState.seenOk===false?'Never a lead (cut rows are not being remembered yet — run the SQL file)':'Not found by any of our filters'};}
const TR_OUT_LAB={ok:'Worked',late:'VA first',miss:'System missed',shown:'Shown, not led',cut:'Cut by the rules',none:'Not found'};

/* b240 (Jack, 3 Oct: "make it a chip"): the cut rows for a whole shelf, loaded once when the shelf opens (80 ASINs a request, 4 at a time) */
async function trSeenLoad(asins){if(typeof cloudReadable!=='function'||!cloudReadable()||trState.seenOk===false)return false;
  const need=[...new Set(asins)].filter(a=>!trState.seenAt[a]);if(!need.length)return false;need.forEach(a=>trState.seenAt[a]=Date.now());let got=false;
  for(let i=0;i<need.length;i+=320){await Promise.all([0,1,2,3].map(j=>{const ch=need.slice(i+j*80,i+(j+1)*80);if(!ch.length)return null;
      return cloudGetAll('src_seen','select=*&asin=in.('+ch.join(',')+')').then(rows=>{trState.seenOk=true;ch.forEach(a=>trState.seenDone[a]=1);rows.forEach(r=>{(trState.seen[r.asin]=trState.seen[r.asin]||[]).push(r);});got=true;})   /* b297: done even with no rows — that is the 'never on our filters' answer */
        .catch(e=>{if(typeof missingTables==='function'&&missingTables(e))trState.seenOk=false;});}));if(trState.seenOk===false)break;}
  return got||need.length>0;}   /* b297: redraw once it has looked, found or not */
/* the exports it was CUT from: filters where it never came out as a lead (a filter where it was a lead is already in EXPORTED) */
function trCutOf(a){return(trState.seen[a]||[]).filter(s=>!s.ever_kept);}
/* ============ storefront row: EXPORTED ×N, CUT ×N and the lead-sheet tiles ============ */
function trChips(a,o){const R=(o&&o.sheetOnly)?[]:(trRunIdx()[a]||[]),S=(trState.sheet||{})[a]||[],v=typeof verdGet==='function'?verdGet(a):null;let h='';   /* b299: sheetOnly — the Our filters chip says the rest */
  if(R.length){const keys=[...new Set(R.map(x=>x.key))],last=R[R.length-1];const said=v&&v.v&&v.v!=='Seen'?` · ${escapeHtml(v.who||'we')} said ${escapeHtml(v.v)}`:'';
    const tip=`Exported on ${R.length} day${R.length===1?'':'s'} — ${keys.length} filter${keys.length===1?'':'s'}, first ${trD(R[0].day)}, last ${trD(last.day)}. Click for every day.`;
    h+=`<button type="button" class="trx${trState.open.has(a)?' on':''}" data-trx="${a}" title="${escapeHtml(tip)}"><i class="sq" style="background:${typeof auAv==='function'?auAv(last.owner||'VAs'):'var(--iris)'}"></i>EXPORTED${R.length>1?' ×'+R.length:''}<span class="trsrc">${keys.length>1?keys.length+' filters':escapeHtml(typeof auSrcShort==='function'?auSrcShort(last.name):last.name)}${said}</span><span class="trcar">▾</span></button>`;}
  const C=(o&&o.sheetOnly)?[]:trCutOf(a);if(C.length){const days=C.reduce((n,s)=>n+(+s.days||1),0),last=C.slice().sort((p,q)=>String(p.last_day)<String(q.last_day)?1:-1)[0];
    const nm=s=>((typeof srcGet==='function'&&srcGet(s.source_key))||{}).name||s.source_key;
    const tip=C.map(s=>`${nm(s)}: in the export ${s.days>1?s.days+' days ('+trD(s.first_day)+' → '+trD(s.last_day)+')':trD(s.last_day)} — cut: ${s.why||'no reason saved'}${s.buy!=null?' · '+gbp(+s.buy):''}${s.score!=null?' · score '+s.score:''}`).join('\n')+'\nClick for every day.';
    h+=`<button type="button" class="trx cut${trState.open.has(a)?' on':''}" data-trx="${a}" title="${escapeHtml(tip)}">CUT${days>1?' ×'+days:''}<span class="trsrc">${escapeHtml(String(last.why||'').slice(0,46))}</span><span class="trcar">▾</span></button>`;}
  [...new Set(S.map(x=>x.va))].forEach(va=>{const d=S.find(x=>x.va===va);
    h+=`<span class="trsheet ${va==='Suz'?'suz':va==='Mera'?'mera':'oth'}" title="${escapeHtml('On '+va+'’s lead sheet '+trD(d.date))}">${escapeHtml(va.toUpperCase())} LEAD SHEET</span>`;});
  return h;}
/* b297 (Jack, 13 Oct: "on Jack's storefront audit and the VAs' — show what filters it would show on"). Not a guess at what WOULD have shown
   (by audit time the Prime price is gone) — what DID: the filter that kept it as a lead, or the export it was in and the rule that cut it, or
   never on any of our filters (exports logged since 3 Oct, leads since 13 Sep). A VA sees her own (and the VAs') filters by name; the other
   VA's and Jack's are 'another of our filters' — she never sees the other VA's work. Jack sees every name. */
/* b300: one day of one filter's log (src_seen.hist, from the 13 Oct SQL) */
function trHistAt(a,key,day){const s=(trState.seen[a]||[]).find(x=>x.source_key===key);return s&&Array.isArray(s.hist)?s.hist.find(h=>h&&h.d===day)||null:null;}
/* b300: the point nearest the day they listed it — the last one on or before it (they bought it before it went live), else the first after */
function trNear(L,when){if(!L.length)return null;L=L.slice().sort((p,q)=>p.day<q.day?-1:p.day>q.day?1:0);if(!/^\d{4}-\d{2}-\d{2}$/.test(String(when||'')))return L[L.length-1];
  const b=L.filter(x=>x.day<=when);return b.length?b[b.length-1]:L[0];}
const trGap=(day,when)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(when||''))||!day)return null;return Math.round((Date.UTC(...day.split('-').map((v,i)=>i===1?v-1:+v))-Date.UTC(...when.split('-').map((v,i)=>i===1?v-1:+v)))/864e5);};
function audHistInfo(a,when){const R=trRunIdx()[a]||[],C=(trState.seen[a]||[]).filter(s=>!s.ever_kept);const va=typeof audIsVA==='function'&&audIsVA()?me():'';
  const nm=(key,fallback)=>{const s=(typeof srcGet==='function'&&srcGet(key))||{};const own=!s.owner||s.owner==='—'?'Jack':s.owner;if(va&&own!==va&&own!=='VAs')return'another of our filters';return s.name||fallback||key;};
  const all=[...new Set(R.map(y=>nm(y.key,y.name)).concat(C.map(y=>nm(y.source_key))))];   /* b299: every filter / brand that had it */
  /* b312 (Jack, 22 Oct: "was it in the exports from x VA or both VAs"): who ran the exports that had it — Jack's page only (a VA never sees the other's work) */
  const W=new Set();if(!va){R.forEach(y=>{if(y.who)W.add(trVa(y.who));});C.forEach(s=>{if(Array.isArray(s.hist))s.hist.forEach(h=>{if(h&&h.u)W.add(trVa(h.u));});if(s.who)W.add(trVa(s.who));});}
  const people=[...W].filter(Boolean).sort((p,q)=>(p==='Jack')-(q==='Jack')||p.localeCompare(q));
  if(R.length){const x=trNear(R,when),h=trHistAt(a,x.key,x.day)||{};
    return{k:'kept',name:nm(x.key,x.name),day:x.day,score:x.score,buy:x.buy!=null?x.buy:(h.b!=null?h.b:null),mk:h.m||'',gap:trGap(x.day,when),more:all.length-1,all,by:va?'':trVa(x.who||h.u||''),people};}
  if(C.length){const P=[];C.forEach(s=>{const last=String(s.last_day||'').slice(0,10),first=String(s.first_day||'').slice(0,10);
      if(Array.isArray(s.hist)&&s.hist.length)s.hist.forEach(h=>{if(h&&h.d)P.push({s,day:h.d,buy:h.b!=null?h.b:null,mk:h.m||'',roi:h.r!=null?h.r:null,why:h.d===last?s.why||'':(h.r!=null?'ROI '+h.r+'%':''),u:h.u||(h.d===last?s.who:'')||''});});
      else{P.push({s,day:last,buy:s.buy!=null?+s.buy:null,mk:s.mk||'',roi:s.roi,why:s.why||'',u:s.who||''});if(first&&first!==last)P.push({s,day:first,buy:null,mk:'',roi:null,why:s.why||'',u:''});}});   /* before the 13 Oct SQL: last day's numbers only */
    const x=trNear(P,when);return{k:'cut',name:nm(x.s.source_key),day:x.day,why:x.why,buy:x.buy,mk:x.mk,gap:trGap(x.day,when),more:all.length-1,all,by:va?'':trVa(x.u||''),people};}
  if(trState.seenOk===true&&trState.seenDone[a])return{k:'never'};return null;}
/* b299 (Jack, 13 Oct, on his own audit: "I want to know if it was in anyone's export — their brand or filter too"): one chip that names the
   filter / brand — a lead, or in the export and cut (why) — "+N more" when several had it; on Jack's page it opens the full day-by-day list */
function audHistChip(a,when){when=typeof when==='string'?when:'';const h=audHistInfo(a,when);if(!h)return'';const e=escapeHtml,va=typeof audIsVA==='function'&&audIsVA();
  const tag2=(cls,tip,inner)=>va?`<span class="ofl ${cls}" title="${e(tip)}">${inner}</span>`:`<button type="button" class="ofl ${cls}${trState.open.has(a)?' on':''}" data-trx="${a}" data-when="${e(when)}" title="${e(tip+' · click for every day')}">${inner}<span class="trcar">▾</span></button>`;
  /* b300: what it cost that day, and how that day sits next to the day they listed it */
  const price=h.buy!=null?` · ${h.mk&&h.mk!=='UK'?h.mk+' ':''}${gbp(h.buy)}`:(h.mk&&h.mk!=='UK'?' · '+h.mk:'');   /* b301: the country only when it is not UK */
  const dd=n=>n===1?'1 day':n+' days';
  const gap=h.gap==null?'':h.gap<0?`, ${dd(-h.gap)} before they listed`:h.gap===0?', the day they listed':`, ${dd(h.gap)} after they listed`;
  /* b301 (Jack, 14 Oct: "I can't read it at all"): a coloured tag word, then plain text in the normal text colour, full width under the row */
  const why=String(h.why||'').replace(/^([A-Z][A-Z\- ]{3,})(?=\s*[:·]|$)/,m=>m.toLowerCase());
  const pill=(cls,tag,txt,tip)=>tag2(cls,tip,`<b class="oft">${tag}</b><span class="ofx">${txt}</span>`);
  if(h.k==='never'){const nw=typeof audNeverWhy==='function'?audNeverWhy(a):'';   /* b310: our own filters left it out? */
    return pill('never','✗ Never',`in any of our exports — ${e(nw||'no filter or brand pulled it')}`,'None of our filter or brand exports had it (exports are logged from 3 Oct, leads from 13 Sep)'+(nw?' — '+nw:''));}
  const more=h.more?` · +${h.more} more`:'',list=h.all&&h.all.length>1?' — also: '+h.all.filter(x=>x!==h.name).join(', '):'';
  /* b312: on Jack's page — whose export that was, and everyone whose exports had it ("Mera + Suz both had it") */
  const P=h.people||[],vas=P.filter(p=>p==='Mera'||p==='Suz');
  const byTxt=h.by?` (${h.by}\u2019s export)`:'',ppl=vas.length>1?` · Mera + Suz both had it${P.includes('Jack')?' (and you)':''}`:P.length>1?` · also in ${P.filter(p=>p!==h.by).map(p=>p==='Jack'?'your':p+'\u2019s').join(' + ')} export${P.length>2?'s':''}`:'';
  if(h.k==='kept')return pill('kept','✓ Lead',`${e(h.name)} had it ${e(trD(h.day))}${e(byTxt)}${e(gap)}${e(price)}${h.score!=null?' · score '+h.score:''}${e(ppl)}${e(more)}`,h.name+' kept it as a lead on '+trD(h.day)+byTxt+gap+price+(h.score!=null?' · score '+h.score:'')+ppl+list);
  return pill('cut','✂ Cut',`${e(h.name)} had it ${e(trD(h.day))}${e(byTxt)}${e(gap)}${e(price)}${why?' · '+e(why.length>80?why.slice(0,78)+'…':why):''}${e(ppl)}${e(more)}`,h.name+' had it in the export on '+trD(h.day)+byTxt+gap+price+(h.why?' — cut: '+h.why:'')+ppl+list);}
function trDrop(a,when){return trState.open.has(a)?`<div class="trdrop" data-stop>${trTimeline(a,{seen:trState.seen[a]||[],listed:typeof when==='string'?when:''})}</div>`:'';}
/* one line per thing that happened, oldest first */
function trTimeline(a,X){X=X||{};const R=trRunIdx()[a]||[],S=(trState.sheet||{})[a]||[],v=typeof verdGet==='function'?verdGet(a):null;const ev=[];const e=escapeHtml;
  const num=x=>[x.buy!=null?gbp(x.buy):'',x.score!=null?'score '+x.score:'',x.roi!=null?x.roi+'% ROI':''].filter(Boolean).join(' · ');
  R.forEach(x=>ev.push({d:x.day,c:x.rev?'rev':'lead',h:`<b>${e(x.name)}</b> <span class="trwho">${e(x.owner)}${x.who&&x.who!==x.owner?' · run by '+e(x.who):''}</span> <span class="trtag ${x.rev?'rev':''}">${x.rev?'To review':'All leads'}</span> ${num(x)||'<span class="dim">numbers not kept for this day</span>'}`}));
  /* b300: the day-by-day price log (from the 13 Oct SQL) — country, buy £, ROI, ✓ on the days it was a lead */
  const hl=s=>Array.isArray(s.hist)&&s.hist.length?`<div class="trhist">${s.hist.map(h=>`<span class="${h.k?'k':''}">${e(trD(h.d))}${h.u?' '+e(trVa(h.u)):''}${h.m?' '+e(h.m):''}${h.b!=null?' '+gbp(+h.b):''}${h.r!=null?' · '+h.r+'%':''}${h.k?' ✓':''}</span>`).join('')}</div>`:'';
  (X.seen||[]).forEach(s=>{const src=(typeof srcGet==='function'&&srcGet(s.source_key))||{};
    if(s.ever_kept&&R.some(x=>x.key===s.source_key)){if(hl(s))ev.push({d:String(s.first_day||'').slice(0,10),c:'lead',h:`<b>${e(src.name||s.source_key)}</b> day by day${hl(s)}`});return;}
    ev.push({d:String(s.first_day||'').slice(0,10),c:'cut',h:`<b>${e(src.name||s.source_key)}</b>${s.who?` <span class="trwho">last run by ${e(trVa(s.who))}</span>`:''} in the export ${s.days>1?s.days+' days ('+trD(s.first_day)+' → '+trD(s.last_day)+')':'once'} — <span class="trtag cut">cut</span> ${e(s.why||'')}${s.buy!=null?' · '+(s.mk?e(s.mk)+' ':'')+gbp(+s.buy):''}${s.score!=null?' · score '+s.score:''}${s.roi!=null?' · '+s.roi+'% ROI':''}${hl(s)}`});});
  if(X.listed)ev.push({d:X.listed,c:'listed',h:'<b>They listed it</b> — it showed up on their storefront'});
  (X.opens||[]).forEach(o=>ev.push({d:o.day,c:'open',h:`<b>${e(o.who)}</b> ${o.k==='open'?'opened it in Keepa (Open all)':'clicked it'} <span class="dim">${e(o.d||'')}</span>`}));
  if(v&&v.v)ev.push({d:String(v.at||'').slice(0,10),c:'said',h:`<b>${e(v.who||'?')}</b> ${v.v==='Seen'?'marked it Seen':'said '+e(v.v)}${v.reason?' · '+e(v.reason):''}${v.note?' · '+e(v.note):''}`});
  S.forEach(x=>ev.push({d:x.date,c:'sheet',h:`<span class="trsheet ${x.va==='Suz'?'suz':x.va==='Mera'?'mera':'oth'}">${e(x.va.toUpperCase())} LEAD SHEET</span>`}));
  if(!ev.some(x=>x.c!=='listed'))return'<div class="trnone">Nothing on record for this ASIN.</div>';   /* b300: their listing day alone is not a record of ours */
  ev.sort((p,q)=>p.d<q.d?-1:p.d>q.d?1:0);
  return`<ol class="trtl">${ev.map(x=>`<li class="${x.c}"><span class="trd">${trD(x.d)}</span><span class="trdot"></span><span class="trtx">${x.h}</span></li>`).join('')}</ol>`;}

/* ============ the lookup box (top of Storefront audits) ============ */
function trCardHtml(){return`<div class="card trcard" id="trCard">
  <div class="cardhead"><span class="ico iris"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M8 11h6M11 8v6"/></svg></span><h2>ASIN audit</h2>
    <span class="sub">Paste ASINs — any text, they get picked out. Did our filters find them, what did they score, were they exported, did they reach a lead sheet?</span></div>
  <div class="trin"><textarea id="trIn" rows="2" placeholder="B0CHW48WSC  B0C44TKR5W …" spellcheck="false">${escapeHtml(trState.q||'')}</textarea><button class="btn primary" id="trGo" type="button">Run audit</button></div>
  <div id="trOut">${trResultsHtml()}</div></div>`;}
function trMount(host){if(!host||!isJack())return;if(!trState.q)trState.q=lsGet(TRACE_Q,'')||'';let c=host.querySelector('#trCard');
  if(!c){host.insertAdjacentHTML('afterbegin',trCardHtml());c=host.querySelector('#trCard');}
  else if(host.firstElementChild!==c)host.insertBefore(c,host.firstElementChild);}
function trResultsHtml(){const rows=trState.rows;if(trState.busy)return'<div class="trbusy">Checking runs, the cut rows, the activity log and the lead sheet…</div>';if(!rows)return'';
  if(!rows.length)return'<div class="trnone">No ASINs in that.</div>';const e=escapeHtml;
  const c={};rows.forEach(r=>c[r.o.k]=(c[r.o.k]||0)+1);
  const sum=Object.keys(TR_OUT_LAB).filter(k=>c[k]).map(k=>`<span class="trout ${k}">${c[k]} ${TR_OUT_LAB[k]}</span>`).join('');
  const note=trState.seenOk===false?'<p class="trnote">Cut rows are not being remembered yet — run <b>2026-10-03-BDL-SOURCING-ASIN-AUDIT-SUPABASE.sql</b> (Downloads) once in Supabase. Until then “Not found” can also mean “found and cut”.</p>'
    :!cloudReadable()?'<p class="trnote">Not connected — only what this browser has: runs and Y/N/M. Lead sheet, cut rows and VA clicks need the live app.</p>':'';
  return`<div class="trsum">${sum}</div>${note}<div class="trwrap"><table class="trtbl"><thead><tr><th>ASIN</th><th>Outcome</th><th>First found</th><th class="r">Filters</th><th class="r">Exported</th><th class="r">To review</th><th class="r">Best score</th><th class="r">Buy (last)</th><th>Opened</th><th>Said</th><th>Lead sheet</th></tr></thead><tbody>${rows.map(r=>{
    const R=r.R,S=r.S,last=R[R.length-1]||null,best=R.reduce((m,x)=>x.score!=null&&(m==null||x.score>m)?x.score:m,null);
    const first=r.first?`${trD(r.first.day)} · ${e(typeof auSrcShort==='function'?auSrcShort(r.first.name):r.first.name)}`:'—';
    const filters=new Set([...R.map(x=>x.key),...(r.seen||[]).map(s=>s.source_key)]).size;
    const op=[...new Set((r.opens||[]).map(o=>o.who))];const v=r.v;
    const t=r.title?`<span class="trtitle" title="${e(r.title)}">${e(r.title)}</span>`:'';
    return`<tr class="trrow${trState.expand.has(r.a)?' open':''}" data-trrow="${r.a}"><td class="tra"><a href="https://keepa.com/#!product/2-${r.a}" target="_blank" rel="noopener" data-stop>${r.a}</a>${t}</td>
      <td><span class="trout ${r.o.k}" title="${e(r.o.t)}">${TR_OUT_LAB[r.o.k]}</span><span class="trwhy">${e(r.o.t)}</span></td>
      <td>${first}</td><td class="r">${filters||'—'}</td><td class="r">${R.length?'×'+R.length:'no'}</td><td class="r">${R.filter(x=>x.rev).length||'—'}</td>
      <td class="r">${best!=null?best:'—'}</td><td class="r">${last&&last.buy!=null?gbp(last.buy):(r.seen&&r.seen[0]&&r.seen[0].buy!=null?gbp(+r.seen[0].buy):'—')}</td>
      <td>${op.length?e(op.join(' · ')):'—'}</td><td>${v&&v.v?e((v.who||'?')+' '+v.v):'—'}</td>
      <td>${[...new Set(S.map(x=>x.va))].map(va=>`<span class="trsheet ${va==='Suz'?'suz':va==='Mera'?'mera':'oth'}">${e(va.toUpperCase())}</span>`).join(' ')||'—'}</td></tr>
      ${trState.expand.has(r.a)?`<tr class="trexp"><td colspan="11">${trTimeline(r.a,{seen:r.seen,opens:r.opens})}</td></tr>`:''}`;}).join('')}</tbody></table></div>`;}
function trPaint(){const o=document.querySelector('#trOut');if(o)o.innerHTML=trResultsHtml();}
async function trRun(text){const asins=typeof audAsinsIn==='function'?audAsinsIn(text):[...new Set((String(text||'').toUpperCase().match(/\bB0[0-9A-Z]{8}\b/g)||[]))];
  trState.q=text;lsSet(TRACE_Q,String(text||'').slice(0,4000));trState.expand=new Set();
  if(!asins.length){trState.rows=[];trPaint();return trState.rows;}
  trState.busy=true;trPaint();
  const [sheet,seen,opens]=await Promise.all([trSheetLoad(),trSeenFor(asins),trOpensFor(asins)]);
  const LA=leadAll(),P=(typeof audState!=='undefined'&&audState.prod)||{};
  trState.rows=asins.map(a=>{const R=trRunIdx()[a]||[],sv=seen[a]||[];
    let title=(P[a]&&P[a].title)||'';if(!title)Object.values(LA).some(m=>{const x=m&&m[a];if(x&&x.state&&x.state.title){title=x.state.title;return true;}return false;});
    const sysFirst=[...R.map(x=>({day:x.day,name:x.name})),...sv.map(s=>({day:String(s.first_day||'').slice(0,10),name:((typeof srcGet==='function'&&srcGet(s.source_key))||{}).name||s.source_key}))].filter(x=>x.day).sort((p,q)=>p.day<q.day?-1:1)[0]||null;
    return{a,R,S:(sheet||{})[a]||[],seen:sv,opens:opens[a]||[],v:typeof verdGet==='function'?verdGet(a):null,o:trOutcome(a,sv),first:sysFirst,title};});
  trState.busy=false;trPaint();return trState.rows;}
/* called first by the audit page's click handler; true = handled */
function trClick(e){const t=e.target;
  const x=t.closest('[data-trx]');if(x){e.stopPropagation();e.preventDefault();const a=x.dataset.trx;trState.open.has(a)?trState.open.delete(a):trState.open.add(a);
    const row=x.closest('.aurow');if(row){const d=row.querySelector(':scope > .trdrop');if(d)d.remove();if(trState.open.has(a))row.insertAdjacentHTML('beforeend',trDrop(a,x.dataset.when||''));x.classList.toggle('on',trState.open.has(a));}
    return true;}
  if(t.closest('#trGo')){const i=document.querySelector('#trIn');trRun(i?i.value:'');return true;}
  const r=t.closest('[data-trrow]');if(r&&!t.closest('a')){const a=r.dataset.trrow;trState.expand.has(a)?trState.expand.delete(a):trState.expand.add(a);trPaint();return true;}
  if(t.closest('#trCard'))return true;
  return false;}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)&&e.target&&e.target.id==='trIn'){e.preventDefault();trRun(e.target.value);}});
document.addEventListener('input',e=>{if(e.target&&e.target.id==='trIn'){trState.q=e.target.value;}});
