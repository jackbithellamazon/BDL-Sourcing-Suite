/* BDL Sourcing — STOREFRONT AUDIT (b64, 16 Sep 2026).
   Jack goes down a rival's shelf and gives every product one answer. The answer belongs to the PRODUCT, not the shelf:
   judge it on LVRO's shelf and it shows as judged on everyone else's. He audits a rival once; after that only their NEW
   lines come back. Nothing here changes a filter or a rule — an audit is a judgement, not a source.

   Where the data comes from
     · shelves        OA Overview's saved rivals (bdl_sellers, bdl_competitor_shelf) — read only, 0 Keepa tokens
     · joint leads    bdl_competitor_asins.shared_asins — what Jack already sells, auto-marked green
     · our leads      this app's own src_runs / src_leads / src_verdicts — "was our lead, nobody said Yes"
     · titles etc     a Keepa Viewer export dropped in (free) or the Worker at ~1 token an ASIN, cached in src_products
     · any seller     the Worker's seller route with storefront=1 (~10 tokens), or a pasted list of ASINs

   Storage rule: the audit has its OWN outbox. A missing audit table must never block the main outbox (one 404 there stops
   every other sync), so nothing is queued to the cloud until the tables are proven to exist. */
const AUD={V:'bdl-sourcing-audit-v',OUT:'bdl-sourcing-audit-out',SHELF:'bdl-sourcing-audit-shelves',VIEW:'bdl-sourcing-audit-view',
  COLLAPSE_MIN:15,   /* the same person pressing again within 15 minutes corrects the row instead of writing a new one */
  PAGE:120};
const AUDIT_TYPES=[
  /* b175 (Jack, 27 Sep: "colours very similar"). Tinted, amber Unsure and orange Missed it came out the same brown, and red / orange /
     pink sat together. Seven hues spread round the wheel now: red · yellow · purple · cyan · green · orange · blue. */
  {code:'not',label:'Not lead',short:'Not lead',hex:'#FF4D5E',icon:'x'},
  {code:'unsure',label:"Can't find / unsure",short:'Unsure',hex:'#FDE047',icon:'help'},
  {code:'discord',label:'Discord',short:'Discord',hex:'#A78BFA',icon:'msg',vaHide:true,prompt:'Which Discord?',reasons:['PS','THC','FFB']},
  {code:'ws',label:'WS',short:'WS',hex:'#22D3EE',icon:'box',vaHide:true},
  {code:'joint',label:'Joint lead',short:'Joint',hex:'#2CE38B',icon:'check',vaHide:true},
  {code:'missed',label:'Missed it',short:'Missed it',hex:'#FF8A3D',icon:'clock'},   /* b175 (Jack: "make missed it just one button too — cba with 2 clicks"). Auto-marked ones still carry their reason. */   /* b164 (Jack, 26 Sep: yes to trimming — only these were ever used; Q W E R) */
  /* b161 (Jack, 26 Sep: "a new option — diff method — e.g. wholesale or PL stuff, not stuff I would sell and source for").
     Key 7, so 1–6 stay where his hands already are. Three reasons, so the bulk bar shows them inline like Discord's. */
  {code:'diff',label:'Diff method',short:'Diff method',hex:'#3B82F6',icon:'tag'},
  /* b288 (Jack, 8 Oct: "add PRIME EVENT alongside Discord / Missed it — on my audit too — only for about two weeks"). The second press
     says WHY we missed it — the whole point of the post-Prime audit. b289: it stays until Jack says (an `until` date would take it off the buttons; answers given always stay). */
  {code:'prime',label:'Prime event',short:'Prime event',hex:'#F472B6',icon:'star',vaHide:true,prompt:'Why did we miss it?',
    reasons:['No filter covers it','Filter covers it — drop / price not enough','Prime-only price — Keepa / filter didn\u2019t show it','Had it as a lead — didn\u2019t buy','Our rules block it','Other — say in the note']},
  /* b293 (Jack, 12 Oct: "add in LOS — lead on sheet"): the product is already on the lead sheet — we found it. Answer 9, for Jack and the VAs. */
  {code:'los',label:'Lead on sheet',short:'LOS',hex:'#A3E635',icon:'sheet'},
  /* b294 (Jack, 12 Oct: "on mine there is a button pls"): Old — old stock not worth judging. Jack's own button (key 0); the VAs never see it —
     on their storefronts OLD DATA is automatic (before 7 Oct), never picked. It lasts (not one of the 90-day answers). */
  {code:'na',label:'Old — not worth judging',short:'Old',hex:'#9AA4B5',icon:'box',jackOnly:true}];   /* b289 (Jack, 8 Oct: "stay until I say so") — no end date; it comes off when he says */   /* b169 (Jack, 27 Sep: "get rid of the double click on diff method") — one press, no which */
/* b91 (Jack, 17 Sep): "never found it" is a different answer from "never looked at", and it is the one that
   points at a filter rather than at a person. Never looked at = it reached our list and nobody judged it.
   Never found it = our filters never surfaced it at all, and the rival is selling it anyway. Slotted before
   Other so the list still ends on the catch-all; Other moves from Y to U, every other key stays put. */
const AU_RKEYS=['q','w','e','r','t','y','u'];
/* b96 (Jack: "discord not having the 2nd click"). The six verdicts can be overridden by a list saved in the
   browser — a hook for when he names extra ones. Nothing in the app writes it, but a list saved before a
   feature existed used to win outright, so his Discord had no reasons array and the PS/THC/FFB step simply
   never appeared. A saved list may say WHICH verdicts exist and what they are called; how one BEHAVES always
   comes from the code. Otherwise every future change is invisible to whoever has an old list stored. */
function audTypes(){return audTypesBase();}   /* b297 (Jack, 13 Oct: "just keep Missed it as one click") — no why step for anyone; the Our filters line says why */
function audTypesBase(){const v=lsGet('bdl-sourcing-audit-types',null);
  if(!Array.isArray(v)||!v.length)return AUDIT_TYPES;
  const out=v.map(t=>{const base=AUDIT_TYPES.find(b=>b.code===t.code);if(!base)return t;
    return Object.assign({},base,t,{reasons:base.reasons,prompt:base.prompt,hex:base.hex});});   /* b175: colours come from the code too */
  /* b161: an answer added in the code (Diff method) always appears, even under an older saved list */
  AUDIT_TYPES.forEach(b=>{if(!out.some(t=>t.code===b.code))out.push(b);});
  return out;}
function audType(code){return audTypes().find(t=>t.code===code)||null;}
/* b288: the answers you can press today (PRIME EVENT goes on PRIME_UNTIL); audTypes() still knows it, so old answers keep their colour */
/* b295 (Jack, 12 Oct, at the nine buttons: "less options — as easy as possible — get rid of Prime event (they're only doing this because of the
   event), Discord too, WS is the same as Diff method, Joint too for the VAs as LOS is them saying joint"). A VA has five: Not lead · Unsure ·
   Missed it · Diff method · LOS — and her Missed it asks WHY we missed it (that was Prime event's second press). Jack keeps all of his. */
const AUD_VA_WHY=['Our filters never showed it','A filter showed it — I didn\u2019t think it was a lead','Prime-only price — Keepa didn\u2019t show it','Something else'];   /* b296 (Jack: "don't want them to do any typing at all") */
function audPick(){const t=today(),j=typeof isJack==='function'&&isJack(),va=audIsVA();return audTypes().filter(x=>(!x.until||t<=x.until)&&(!x.jackOnly||j)&&!(va&&x.vaHide));}   /* b294: Old is Jack's · b295: the VAs' five */
function auKey(n){return n===9?0:n+1;}   /* b294: the 10th answer is key 0 */
/* b288 (Jack, 8 Oct: Mera and Suz each audit a few storefronts after Prime — "I want their individual opinions"). Their answers live
   apart from Jack's — his page never shows a VA's answer as his — and apart from each other (a VA never sees the other's work). Their
   list is only what a storefront listed from AUD_VA.START (Jack's OA Overview push): everything before it is OLD DATA. */
/* b314 (Jack, 5 Nov: "get rid of the VAs' storefront audit now — back to just me"): ON:false takes it away — no Storefront audits page for Mera
   and Suz, no #audit link for them, no "Mera & Suz · Prime event audit" card on Jack's page. Their answers stay in the cloud; nothing is deleted.
   The OLD DATA split on the two storefronts that were theirs (Chris FBA, CJS) stays as it is on Jack's page. */
const AUD_VAS=['Mera','Suz'],AUD_VA={ON:false,START:'2026-10-07',   /* b293 (Jack, 12 Oct: "remember — stuff since 7th October only should show for the VAs") — was 8 Oct */KEY:'bdl-sourcing-audit-va',NEW_SHELF:'2026-10-07T21:30'};
function audIsVA(){const m=typeof me==='function'?me():'';return!!m&&AUD_VAS.includes(m)&&!(typeof isJack==='function'&&isJack());}
function audKeyFor(who){return who&&AUD_VAS.includes(who)?AUD.V+'-'+who.toLowerCase():AUD.V;}
function audAllOf(who){return lsGet(audKeyFor(who),{})||{};}
/* which VAs audit a storefront: Jack's picker, else any storefront added to OA Overview after the Prime event ended goes to both */
function audVaMap(){const v=lsGet(AUD_VA.KEY,null);return(v&&v.map)||{};}
function audVaFor(id){const m=audVaMap();if(Array.isArray(m[id]))return m[id];const s=(audState.sellers||[]).find(x=>x.seller_id===id);
  return s&&String(s.created_at||'')>=AUD_VA.NEW_SHELF?AUD_VAS.slice():[];}
/* b291 (Jack, 11 Oct, at Chris FBA — 158 products, 118 left to judge — on his own page: "what did I say about these — most of it until x
   date should be n/a"). On a storefront given to the VAs, what was on it before 7 Oct is OLD DATA on Jack's page too: out of "left to
   judge", out of the counts and the token loader, in its own Old data tab. The rest of his rivals are untouched. */
/* b317 (Jack, 6 Nov: "any I bring back — I just want to bring back 30 days worth of data, I don't want to judge 6-months-old ASINs"). Bringing a
   rival back from the archive stamps a "judge from" day (30 days back) on it; what it listed before that is OLD DATA — out of "left to judge" and
   the counts, still in its Old data tab. Saved for everyone (src_settings 'audit-from'). */
const AUD_FROM='bdl-sourcing-audit-from',AUD_FROM_DAYS=30;
function audFromMap(){const v=lsGet(AUD_FROM,null);return(v&&v.map)||{};}
function audFromFor(id){return audFromMap()[id]||'';}
function audFromSet(id,day){const v=Object.assign({map:{}},lsGet(AUD_FROM,null)||{});v.map=Object.assign({},v.map);if(day)v.map[id]=day;else delete v.map[id];v.at=nowIso();v.who=me();lsSet(AUD_FROM,v);
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('audit-from',v)]);return v;}
function audFromDay(){const d=new Date();d.setDate(d.getDate()-AUD_FROM_DAYS);return stamp(d).slice(0,10);}
function audOldWhy(sh){const f=[sh?audFromFor(sh.seller||sh.id):'',audFromDay()].sort().pop();return'listed more than '+AUD_FROM_DAYS+' days ago (before '+ukDate(f)+') or already on their shelf when we started tracking them';}
function audIsOld(it,sh){if(!it||!sh||sh.kind!=='rival'||audIsVA())return false;
  {const f=[audFromFor(sh.seller||sh.id),audFromDay()].sort().pop();if(it.base)return true;if(it.first&&String(it.first)<f)return true;}   /* b317: Jack, 6 Nov: "yes" — every rival, only what it listed in the last 30 days */if(!audVaFor(sh.seller||sh.id).length)return false;return!!it.base||String(it.first||'')<AUD_VA.START;}
function audVaSet(id,list){const v=Object.assign({map:{}},lsGet(AUD_VA.KEY,null)||{});v.map=Object.assign({},v.map,{[id]:list});v.at=nowIso();v.who=me();lsSet(AUD_VA.KEY,v);
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('audit-va',v)]);return v;}
const AU_ICON={sheet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01"/></svg>',
  msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>'};

/* ---------- pure bits (the checks lock these) ---------- */
/* a verdict row. id is stable so a correction overwrites instead of piling up */
function audRow(asin,code,who,sellerId,at){const t=at||nowIso();
  return{id:asin+'|'+(who||'?')+'|'+new Date(t).getTime().toString(36),asin,domain:2,verdict:code,reason:'',note:'',seller_id:sellerId||'',who:who||'',at:t,expires_at:null};}
/* what the app should show for one product: a verdict, a joint lead it detected, or nothing yet */
/* b163 (Jack, 26 Sep: "maybe expires after 90 days? just in case it comes back and the price drops again").
   The "not now" answers — Not lead, Missed it, Unsure — stop counting 90 days after they were given, and the product is to check
   again (a chip says what was said and when). Discord / WS / Diff method / Joint describe the product, so they last. Worked out
   from the answer's date, not stored, so the 271 answers already given follow the same rule. */
const AUD_EXPIRE_DAYS=90,AUD_EXPIRE_CODES=['not','missed','unsure'];
function audExpired(v){if(!v||!v.verdict||!AUD_EXPIRE_CODES.includes(v.verdict)||!v.at)return false;return(Date.now()-new Date(v.at).getTime())/864e5>AUD_EXPIRE_DAYS;}
function audStatus(cur,sells){if(cur&&cur.verdict&&!audExpired(cur))return cur.verdict;if(sells)return'jointauto';return'todo';}
/* press → {row, replaced, same}. Your own press inside the collapse window corrects that row; anyone else's writes a new one. */
function audPress(asin,cur,code,who,sellerId,now){now=now||new Date().toISOString();
  const mine=!!(cur&&cur.who===who&&(new Date(now)-new Date(cur.at))/60000<AUD.COLLAPSE_MIN);
  if(cur&&cur.verdict===code&&mine)return{row:cur,replaced:true,same:true};
  if(mine)return{row:Object.assign({},cur,{verdict:code,reason:'',at:now,seller_id:sellerId||cur.seller_id||''}),replaced:true};
  return{row:audRow(asin,code,who,sellerId,now),replaced:false};}
/* a Keepa product from the API → the row we cache */
function audFromKeepa(p){if(!p||!p.asin)return null;const st=(p.stats&&p.stats.current)||[];
  const cents=v=>v==null||v<0?null:Math.round(v)/100;
  const img=(p.imagesCSV||'').split(',')[0]||((p.images&&p.images[0]&&(p.images[0].l||p.images[0].m))||'');
  return{asin:p.asin,domain:2,title:(p.title||'').slice(0,300),brand:(p.brand||'').slice(0,80),
    image:img?('https://m.media-amazon.com/images/I/'+img):'',
    /* b141 (Jack, 22 Sep: "sell price isn't going on all of them"). It only ever read the Buy Box, then Amazon.
       A listing with no Buy Box and no Amazon offer — 3P only, or suppressed — came back blank, and a blank row
       reads as broken. The cheapest live NEW offer is the third resort, and the row says which one it is. */
    price:cents(st[18]!=null&&st[18]>0?st[18]:(st[0]!=null&&st[0]>0?st[0]:st[1])),
    pricefrom:(st[18]!=null&&st[18]>0)?'bb':(st[0]!=null&&st[0]>0)?'amz':(st[1]!=null&&st[1]>0)?'3p':'',
    rank:st[3]!=null&&st[3]>0?st[3]:null,root:(p.categoryTree&&p.categoryTree[0]&&p.categoryTree[0].name)||'',
    mo:p.monthlySold||null,fba:null,offers:st[11]!=null&&st[11]>0?st[11]:null,
    /* b88 (Jack: "sellers on it is — why tho"). A dash meant two different things: Keepa says nobody is
       listed, and we never asked. Records written before the offer count existed fell in the second camp
       and counted as loaded forever, so the dash never cleared. asked:1 says we have been. */
    asked:1,source:'keepa',fetched_at:nowIso()};}
/* b300 (Jack, 13 Oct: "automate it as much as possible — we hold so much data — is it still profitable / a good lead now"). Every time the
   app gets a product's Keepa numbers for the audit — the 1-token call it already makes (now the 90-day stats, same token) or an export
   dropped on the page (free) — it runs the same Rule 2 maths as the filters (UK buy, UK sell) and remembers the answer here: buy, sell,
   profit, ROI, score, and whether the rules would keep it as a lead TODAY. Jack's browser only; his audit rows show it as a chip. */
const AUD_NOW='bdl-sourcing-audit-now';let AUD_NOW_C=null;
function audNowAll(){if(!AUD_NOW_C)AUD_NOW_C=lsGet(AUD_NOW,{})||{};return AUD_NOW_C;}
function audNowSave(m){let e=Object.entries(m);if(e.length>3000)e=e.sort((x,y)=>String(y[1].at).localeCompare(String(x[1].at))).slice(0,3000);AUD_NOW_C=Object.fromEntries(e);lsSet(AUD_NOW,AUD_NOW_C);}
function audNowFresh(a){const r=audNowAll()[a];return!!r&&!r.none&&Date.now()-new Date(r.at).getTime()<3*864e5;}   /* b317: "could not price it" is not a check */
function audNowRow(row){try{if(typeof rule2Compute!=='function'||!row||!row.ASIN)return null;const a=String(row.ASIN).trim();
    const R=rule2Compute([Object.assign({},row)],typeof factsAll==='function'?factsAll():{},{vatFor:typeof vatFor==='function'?vatFor:undefined,rule:2});
    const kept=(R.out||[]).find(x=>x.ASIN===a),o=kept||(R.all||[]).find(x=>x.ASIN===a);
    const ref=(kNum(row['Referral Fee %'])||15)/100,fba=kNum(row['FBA Pick&Pack Fee'])||null,kg=(kNum(row['Package: Weight (g)'])||kNum(row['Item: Weight (g)'])||0)/1000;
    if(!o)return{at:nowIso(),lead:false,none:true,ref,fba,kg};const q=Object.assign({},o);if(kept&&typeof proofScore==='function')proofScore(q,2);
    /* b317 (Jack, 6 Nov: "to make my life easier to see if it's a lead or not"): at today's sell price, the most it can cost anywhere (a shop, OA) to make 10% */
    const sell=+o['Sell for £']||null;let max10=null;if(sell&&fba!=null&&typeof brProfit==='function'){let lo=0.01,hi=sell;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(brProfit(sell,mid,ref,fba,kg,null,'')[1]>=10)lo=mid;else hi=mid;}max10=brProfit(sell,lo,ref,fba,kg,null,'')[1]>=10?Math.floor(lo*100)/100:null;}
    return{at:nowIso(),lead:!!kept,root:String(row['Categories: Root']||'').slice(0,60),buy:+o['After discount £']||+o['Buy at £']||null,disc:o['Discount applied']||'',sell,p:o['Profit £']!=null?+o['Profit £']:null,roi:o['ROI %']!=null?+o['ROI %']:null,sc:+(q.Score||o.Score||0),ref,fba,kg,max10};}
  catch(e){return null;}}
function audNowRecord(rows){if(!(typeof isJack==='function'&&isJack())||audIsVA())return 0;const m=Object.assign({},audNowAll());let n=0;
  (rows||[]).forEach(r=>{const x=audNowRow(r);if(x){m[String(r.ASIN).trim()]=x;n++;}});if(n)audNowSave(m);return n;}
/* b310 (Jack, 15 Oct, at his storefront audit: "some of these I know we saw in an export"). A product NO export ever had is usually not a
   miss — our own filters left it out: the brand is on the blacklist (HP), or blocked in the Keepa links / a filter's skip list. The row says so. */
let AUD_BBX=null,AUD_BBX_SIG='';
function audBrandBlocks(){const S=srcAll().filter(s=>s.status!=='paused');const sig=S.length+'|'+S.map(s=>s.key+(s.updatedAt||'')).join(',');if(AUD_BBX&&AUD_BBX_SIG===sig)return AUD_BBX;
  const m=new Map(),add=(b,name)=>{b=String(b||'').trim().toLowerCase();if(!b)return;if(!m.has(b))m.set(b,new Set());m.get(b).add(name);};
  S.forEach(s=>{[s.link,s.link2].concat(s.links?Object.values(s.links):[]).filter(Boolean).forEach(l=>{try{const j=JSON.parse(decodeURIComponent(String(l).split('#!finder/')[1]));const br=j&&j.f&&j.f.brand;
      if(br&&br.type==='isNoneOf')String(br.filter||'').split('###').forEach(b=>add(b,s.name));}catch(e){}});
    (s.noBrands||[]).forEach(x=>{if(!String(x).includes('|'))add(x,s.name);});});
  AUD_BBX=m;AUD_BBX_SIG=sig;return m;}
function audNeverWhy(a){const p=audState.prod[a]||{},b=String(p.brand||'').trim();if(!b)return'';
  if(typeof bbStatusFor==='function'&&bbStatusFor(b)==='approved')return`${b} is on our brand blacklist`;
  const m=audBrandBlocks().get(b.toLowerCase());if(m&&m.size)return`${b} is blocked in ${m.size===1?'our '+[...m][0]+' filter':m.size+' of our filters'}`;
  return'';}
/* the EU side, from what people already exported (Jack: "we should be getting data from people who export EU prices on x date"): the
   newest EU landed price any Rule 1 run saw for this product — kept leads carry the country, cut rows the price — no tokens */
function audEuSeen(a){let best=null;const take=x=>{if(x&&x.buy>0&&x.day&&(!best||x.day>best.day||(x.day===best.day&&x.mk&&!best.mk)))best=x;};
  const LA=typeof leadAll==='function'?leadAll():{};
  Object.entries(LA).forEach(([key,m])=>{const s=(typeof srcGet==='function'&&srcGet(key))||{};if(s.rule!==1||!m||!m[a])return;const e=m[a];
    [[e.state,e.stamp],[e.prev&&e.prev.state,e.prev&&e.prev.stamp]].forEach(([st,stamp])=>{if(st&&st.mk&&st.mk!=='UK'&&+st.buy>0)take({mk:st.mk,buy:+st.buy,day:String(stamp||'').slice(0,10),src:s.name||key,kept:true});});});
  ((typeof trState!=='undefined'&&trState.seen[a])||[]).forEach(r=>{const s=(typeof srcGet==='function'&&srcGet(r.source_key))||{};if(s.rule===1&&+r.buy>0&&(s.markets||[]).some(m=>m!=='UK'))take({mk:'',buy:+r.buy,day:String(r.last_day||'').slice(0,10),src:s.name||r.source_key,kept:false});});
  return best;}
function audNowChips(a){if(!(typeof isJack==='function'&&isJack())||audIsVA())return'';const r=audNowAll()[a],e=escapeHtml,d=x=>typeof trD==='function'?trD(String(x).slice(0,10)):String(x).slice(0,10);let h='';
  const pf=v=>v<0?'loses '+gbp(-v):gbp(v);
  if(r&&!r.none&&r.p!=null){const tip=`Checked ${d(r.at)} — buy ${gbp(r.buy)}${r.disc?' ('+r.disc+')':''} on Amazon UK → sell ${gbp(r.sell)}: the same maths as your filters`;
    h+=r.lead?`<span class="ofl now lead" title="${e(tip)}"><b class="oft">★ Still a lead today</b><span class="ofx">${gbp(r.p)} profit · ${r.roi}% ROI · score ${r.sc}</span></span>`
      :`<span class="ofl now" title="${e(tip+' — the rules would not keep it today'+(r.max10?`. At today's sell (${gbp(r.sell)}) it has to cost under ${gbp(r.max10)} anywhere to make 10%`:''))}"><b class="oft">Today</b><span class="ofx">not a lead on Amazon UK — buy ${gbp(r.buy)} → sell ${gbp(r.sell)}: ${r.p<0?pf(r.p):gbp(r.p)+' profit'} · ${r.roi}% ROI${r.max10?` · <b>a lead if you can buy it under ${gbp(r.max10)}</b>`:''}</span></span>`;}
  const eu=audEuSeen(a);if(eu){let pr=null;if(r&&r.sell&&r.fba&&typeof brProfit==='function'){try{pr=brProfit(r.sell,eu.buy,r.ref,r.fba,r.kg||0,null,'');}catch(x){pr=null;}}
    const good=pr&&pr[0]>0&&pr[1]>=10;
    h+=`<span class="ofl eu${good?' lead':''}" title="${e('From '+eu.src+'\u2019s export on '+d(eu.day)+(eu.mk?' — cheapest country '+eu.mk:'')+': '+gbp(eu.buy)+' landed'+(pr?' · at today\u2019s UK sell '+gbp(r.sell)+' that is '+gbp(pr[0])+' profit, '+pr[1]+'% ROI':' · today\u2019s UK sell is not checked yet'))}"><b class="oft">EU</b><span class="ofx">${eu.mk?e(eu.mk)+' ':''}${gbp(eu.buy)} landed on ${e(d(eu.day))}${pr?' → '+(pr[0]<0?pf(pr[0]):gbp(pr[0])+' profit')+' · '+pr[1]+'% ROI at today\u2019s sell':''}</span></span>`;}
  if(typeof oaLine==='function')h+=oaLine(a);   /* b321: not an Amazon UK lead — is it an OA one? */
  return h;}
/* a Keepa CSV export row → the same shape, free */
function audFromCsv(r){const a=(r.ASIN||'').trim();if(!/^B[0-9A-Z]{9}$/.test(a))return null;
  const img=((r.Image||'').split(';')[0]||'').trim();
  return{asin:a,domain:2,title:(r.Title||'').slice(0,300),brand:(r.Brand||'').slice(0,80),image:/^https?:/.test(img)?img:'',
    price:kNum(r['Buy Box: Current'])||kNum(r['Amazon: Current'])||kNum(r['New: Current'])||null,
    pricefrom:kNum(r['Buy Box: Current'])?'bb':kNum(r['Amazon: Current'])?'amz':kNum(r['New: Current'])?'3p':'',
    asked:1,rank:kNum(r['Sales Rank: Current'])||null,
    root:r['Categories: Root']||'',mo:kNum(r['Monthly Sales Trends: Bought in past month'])||null,
    fba:kNum(r['Buy Box Eligible Offer Counts: New FBA'])||null,offers:kNum(r['Total Offer Count'])||null,source:'export',fetched_at:nowIso()};}
/* every ASIN this business has ever kept as a lead: source, day, who, the numbers, and what we said */
function audOurIndex(runs,leadsAll,verds){const out={};
  (runs||[]).forEach(r=>{(r.asins||[]).forEach(a=>{const e=out[a]=out[a]||{runs:0,first:'',last:'',src:'',owner:'',day:''};
    e.runs++;const d=String(r.day||r.at).slice(0,10);if(!e.first||d<e.first)e.first=d;if(d>e.last){e.last=d;e.src=r.name||r.source;e.day=d;e.owner=r.who||'';}});});
  Object.entries(leadsAll||{}).forEach(([key,m])=>{Object.entries(m||{}).forEach(([a,e])=>{if(!out[a]||!e||!e.state)return;
    const s=e.state,cur=out[a];const score=+s.score||0;if(score>=(cur.score||0)){cur.score=score;cur.roi=+s.roi||0;cur.profit=+s.profit||0;cur.buy=+s.buy||0;cur.sell=+s.sell||0;cur.key=key;}});});
  Object.entries(verds||{}).forEach(([a,v])=>{if(out[a]){out[a].said=v.v;out[a].saidBy=v.who||'';out[a].saidAt=v.at||'';}});
  return out;}

/* ---------- local state ---------- */
function audAll(){return audAllOf(audIsVA()?me():null);}   /* b288: a VA's own answers; Jack's are only his (and 'auto') */
function audSave(m){lsSet(audKeyFor(audIsVA()?me():null),m);}
function audGet(asin){return audAll()[asin]||null;}
function audOut(){return lsGet(AUD.OUT,[]);}
function audQueue(op){if(typeof guestOn==='function'&&guestOn())return;   /* b155: guest mode queues nothing, so nothing can be sent later */
  const q=audOut();q.push(op);lsSet(AUD.OUT,q);audFlush();}
const AUD_PROD='bdl-sourcing-audit-prod';   /* b178: read again in boot.js once the big store is in — this line runs before it is */
const audState={tables:null,pulled:0,shelfAt:0,sellers:[],shelf:{},shared:{},mineNow:new Set(),mineEver:new Set(),mineLast:{},mineLatest:'',prod:lsGet(AUD_PROD,{})||{},checking:false};
/* the picture cache also lives in this browser, capped, so a refresh never blanks the list */
function audProdSaveLocal(){const e=Object.entries(audState.prod);const keep=e.length>1500?e.slice(e.length-1500):e;   /* b177: was 4000 — the product cache was the biggest thing in a shared 5 MB; Supabase holds them all anyway */
  lsSet(AUD_PROD,Object.fromEntries(keep));}
function audShelvesLocal(){return lsGet(AUD.SHELF,{});}
function audShelvesSave(v){lsSet(AUD.SHELF,v);}
/* ---------- cloud (its own outbox, never the app's) ---------- */
async function audCheckTables(){if(!cloudReadable()||audState.checking)return audState.tables;audState.checking=true;
  try{await cloudGetAll('src_audit_verdicts','select=id&limit=1');audState.tables=true;}
  catch(e){audState.tables=missingTables(e)?false:audState.tables;}
  audState.checking=false;return audState.tables;}
/* b106 — every audit table gets exactly the columns it was created with (2026-09-16-BDL-SOURCING-AUDIT-SUPABASE.sql).
   Product rows carry two local-only fields, `offers` and `asked`, which src_products does not have; sending them
   got every product upsert rejected, and that one rejected row blocked the whole queue. Applied at SEND time, so
   the rows already stuck in the outbox are cleaned on the way out too. The offer count is kept, in the table's
   own `fba` column, which is what that column is for. */
const AUD_COLS={
  src_products:['asin','domain','title','brand','image','price','rank','root','mo','fba','source','fetched_at'],
  src_audit_verdicts:['id','asin','domain','verdict','reason','note','seller_id','who','at','expires_at'],
  src_audit_shelves:['seller_id','name','kind','asins','pulled_at','pulled_by']};
function audShape(table,rows){const c=AUD_COLS[table];if(!c)return rows;
  return rows.map(r=>{const o={};c.forEach(k=>{if(r[k]!==undefined)o[k]=r[k];});
    if(table==='src_products'&&(o.fba==null||o.fba==='')&&r.offers!=null)o.fba=r.offers;return o;});}
async function audFlush(){if(!cloudEnabled())return;if(audState.tables===null)await audCheckTables();if(!audState.tables)return;
  let q=audOut();let guard=0;
  while(q.length&&guard++<50){const it=q[0];
    try{
      if(it.op==='up')for(let i=0;i<it.rows.length;i+=200)await cloudReq('POST',it.table,audShape(it.table,it.rows.slice(i,i+200)),'resolution=merge-duplicates,return=minimal');
      else if(it.op==='del')await cloudReq('DELETE',it.table+'?id=in.('+it.ids.map(v=>'"'+encodeURIComponent(v)+'"').join(',')+')',null,'return=minimal');
      q=audOut();q.shift();lsSet(AUD.OUT,q);
    }catch(e){if(missingTables(e)){audState.tables=false;return;}
      it.tries=(it.tries||0)+1;q[0]=it;lsSet(AUD.OUT,q);if(it.tries>=3){q.shift();lsSet(AUD.OUT,q);console.warn('audit: dropped a change',it,e.message);}return;}}
  audPaintSync();}
async function audPullVerdicts(force){if(!cloudReadable()||!(await audCheckTables()))return false;
  if(!force&&Date.now()-audState.pulled<600e3)return true;
  /* b288: src_audit_current is the newest answer per product from ANYONE — so a VA's answer must never become Jack's. Jack's map is
     his own newest answer (VA rows swapped for his own from the table); each VA's map is hers, from 7 Oct; Jack's browser keeps both VAs'. */
  const latest=rows=>{const m={};rows.forEach(r=>{if(!m[r.asin]||new Date(r.at)>new Date(m[r.asin].at))m[r.asin]=r;});return m;};
  const merge=(m,key)=>{const local=lsGet(key,{})||{};Object.entries(local).forEach(([a,r])=>{if(!m[a]||new Date(r.at)>new Date(m[a].at))m[a]=r;});lsSet(key,m);};
  const vaIn='('+AUD_VAS.join(',')+')';
  try{if(audIsVA()){const w=me();merge(latest(await cloudGetAll('src_audit_verdicts','select=*&who=eq.'+encodeURIComponent(w)+'&at=gte.'+AUD_VA.START)),audKeyFor(w));}
    else{const rows=await cloudGetAll('src_audit_current','select=*');const m={},vaA=[];rows.forEach(r=>{if(AUD_VAS.includes(r.who))vaA.push(r.asin);else m[r.asin]=r;});
      for(let i=0;i<vaA.length;i+=150)Object.assign(m,latest(await cloudGetAll('src_audit_verdicts','select=*&asin=in.('+vaA.slice(i,i+150).join(',')+')&who=not.in.'+vaIn)));
      merge(m,AUD.V);
      if(isJack()){const va=await cloudGetAll('src_audit_verdicts','select=*&who=in.'+vaIn+'&at=gte.'+AUD_VA.START);AUD_VAS.forEach(w=>merge(latest(va.filter(r=>r.who===w)),audKeyFor(w)));}}
    audState.pulled=Date.now();return true;}catch(e){return false;}}
/* OA Overview's saved rivals and shelves — read only */
async function audPullShelves(force){if(!cloudReadable())return false;if(!force&&Date.now()-audState.shelfAt<600e3&&audState.sellers.length)return true;
  try{const [sellers,shelf]=await Promise.all([cloudGetAll('bdl_sellers','select=seller_id,name,seller_order,created_at&order=seller_order'),
      cloudGetAll('bdl_competitor_shelf','select=seller_id,asin,first_seen,baseline,created_at&gone_on=is.null')]);
    const by={},addAt={};let oaAt='';shelf.forEach(r=>{(by[r.seller_id]=by[r.seller_id]||[]).push({a:r.asin,first:String(r.first_seen||'').slice(0,10),base:!!r.baseline});
      const c=String(r.created_at||'');if(c>(addAt[r.seller_id]||''))addAt[r.seller_id]=c;if(c>oaAt)oaAt=c;});
    audState.addAt=addAt;
    audState.sellers=sellers;audState.shelf=by;audState._first={};
    /* b158: EVERY overlap row, not the last 400 — "yours" is anything Keepa has ever shown in your catalogue (see audMineWhy) */
    const ca=await cloudGetAll('bdl_competitor_asins','select=seller_id,date,shared_asins&order=date.desc');
    const sh={},now=new Set(),ever=new Set(),last={},sday={};let latest='';
    ca.forEach(r=>{const list=r.shared_asins||[];const d=String(r.date||'').slice(0,10);if(d>latest)latest=d;if(d>(sday[r.seller_id]||''))sday[r.seller_id]=d;
      list.forEach(a=>{ever.add(a);if(!last[a]||d>last[a])last[a]=d;});if(!sh[r.seller_id]){sh[r.seller_id]=new Set(list);list.forEach(a=>now.add(a));}});
    audState.sellerDay=sday;audState.shared=sh;audState.mineNow=now;audState.mineEver=ever;audState.mineLast=last;audState.mineLatest=latest;audState.mineSrc='overlap';
    /* b165: OA Overview now keeps Lavarion's own storefront (bdl_my_shelf — built 26 Sep from the handover): on_now = seen on it in the
       last 2 days, last_seen = the last day it was on it (Keepa's own per-listing date). That is the truth for "yours" — the pieced-together
       overlap rows above stay only as the fallback if the table is missing or empty, and still fill any gap it has. */
    try{const my=await cloudGetAll('bdl_my_shelf','select=asin,last_seen,on_now,updated_at');
      if(my.length){const n2=new Set(),l2={};let lt='';
        my.forEach(r=>{const u=String(r.updated_at||'');if(u>oaAt)oaAt=u;const d=String(r.last_seen||'').slice(0,10);if(r.on_now)n2.add(r.asin);if(d){l2[r.asin]=d;if(d>lt)lt=d;}});
        Object.keys(last).forEach(a=>{if(!l2[a]||last[a]>l2[a])l2[a]=last[a];});   /* keep the later of the two dates */
        audState.mineNow=n2;audState.mineLast=l2;audState.mineEver=new Set([...Object.keys(l2),...ever]);audState.mineLatest=lt>latest?lt:latest;audState.mineSrc='storefront';}}
    catch(e){/* table not there — the overlap rows carry on */}
    /* b201 (Jack, 28 Sep: "get a last updated thing — just pushed it in the other app for competitors, unsure if it's updated or not").
       oaAt = the newest write OA Overview made (a shelf line added, or its daily pass over your own storefront); sellerDay = the last day
       it checked each rival. Shown on the page so a push in OA Overview can be seen landing here. */
    audState.oaAt=oaAt;audState.shelfAt=Date.now();return true;}
  catch(e){audState.shelfErr=e.message;return false;}}
async function audPullProducts(asins){if(!cloudReadable()||!(await audCheckTables()))return;
  const want=asins.filter(a=>!audState.prod[a]);if(!want.length)return;
  for(let i=0;i<want.length;i+=150){const part=want.slice(i,i+150);
    try{const rows=await cloudGetAll('src_products','select=*&asin=in.('+part.join(',')+')');rows.forEach(r=>{if(r.source==='keepa'){r.asked=1;if(r.offers==null&&r.fba!=null)r.offers=r.fba;}audState.prod[r.asin]=r;});audProdSaveLocal();}catch(e){return;}}}
function audSaveProducts(rows){rows.forEach(r=>{audState.prod[r.asin]=r;});audProdSaveLocal();if(cloudEnabled())audQueue({op:'up',table:'src_products',rows});}

/* b65 (Jack: "as automated as possible"): opening a shelf fills in the details by itself.
   Free first — anything we have already seen as a lead carries its title — then the Worker tops the rest up,
   inside a token budget, unless Jack turns it off. */
const AUD_AUTO='bdl-sourcing-audit-auto',AUD_AUTO_CAP=500,AUD_TOKEN_FLOOR=250;
function audAuto(){if(audIsVA())return false;   /* b288: never Keepa tokens for a VA — the Viewer export is free */
  const v=lsGet(AUD_AUTO,null);return v==null?true:!!v;}
function audAutoSet(v){lsSet(AUD_AUTO,!!v);}
/* titles we already own, from our own runs — costs nothing */
function audFillFromOurs(asins){const LA=leadAll();const have=new Set(asins);const add=[];
  Object.values(LA).forEach(m=>Object.entries(m||{}).forEach(([a,e])=>{if(!have.has(a)||audState.prod[a]||!e||!e.state)return;
    const st=e.state;if(!st.title)return;
    add.push({asin:a,domain:2,title:String(st.title).slice(0,300),brand:String(st.brand||'').slice(0,80),image:'',
      price:+st.buy||null,rank:null,root:'',mo:+st.spm||null,fba:null,source:'ours',fetched_at:nowIso()});}));
  if(add.length){add.forEach(r=>audState.prod[r.asin]=r);audProdSaveLocal();}
  return add.length;}
async function audTokensLeft(){try{const r=await fetch(WORKER+'/health');const j=await r.json();return j&&j.tokensLeft!=null?j.tokensLeft:null;}catch(e){return null;}}
/* returns how many it loaded. quiet:true = no confirm, used by the automatic pass */
/* b317 (Jack, 6 Nov: "we should be caching a lot more — we use Keepa for multiple apps"). The still-a-lead check reuses the averages the Suite
   already paid for in the last 72 hours — its own earlier checks, or a filter's Keepa API run — and then only needs today's Amazon price (1 token,
   stats only). Only a product with nothing cached pays for the Buy Box (about 3). Averages barely move in 3 days; a current price is never reused. */
const AUD_AVG='bdl-sourcing-audit-avg';
function audAvgCols(){return typeof API_FROM_CACHE!=='undefined'?API_FROM_CACHE:['Buy Box: 30 days avg.','Buy Box: 90 days avg.','Buy Box: 180 days avg.','Buy Box: Highest'];}
function audAvgGet(a){const now=Date.now(),H=(typeof API_STABLE_H!=='undefined'?API_STABLE_H:72)*3600e3,x=(lsGet(AUD_AVG,{})||{})[a];if(x&&now-x.at<H)return x.avg;
  const c=(typeof apiCache==='function'?apiCache():{})['2|'+a];if(c&&c.row&&now-c.at<H&&c.row['Buy Box: 90 days avg.'])return Object.fromEntries(audAvgCols().map(k=>[k,c.row[k]]));return null;}
function audAvgSave(rows,kc){const m=lsGet(AUD_AVG,{})||{},now=Date.now(),H=(typeof API_STABLE_H!=='undefined'?API_STABLE_H:72)*3600e3;let n=0;
  rows.forEach(r=>{if(r&&r.ASIN&&r['Buy Box: 90 days avg.']){const t=kc&&kc[r.ASIN]?new Date(kc[r.ASIN].at).getTime():now;if(m[r.ASIN]&&m[r.ASIN].at>t)return;m[r.ASIN]={at:t,avg:Object.fromEntries(audAvgCols().map(k=>[k,r[k]]))};n++;}});   /* b319: a shared-cache row keeps its own age */
  Object.keys(m).forEach(k=>{if(now-m[k].at>H)delete m[k];});if(n)lsSet(AUD_AVG,m);}
function audNowCost(asins){return asins.reduce((t,a)=>t+(audAvgGet(a)?1:3),0);}
async function audLoadDetails(asins,quiet,onBatch,again){const need=again?asins.slice():asins.filter(a=>!audState.prod[a]||audState.prod[a].source==='ours'||!audState.prod[a].asked);   /* b300: again = Jack's still-a-lead button */
  if(!need.length)return 0;let got=0;
  for(let i=0;i<need.length;i+=100){const part=need.slice(i,i+100);
    /* b317: on the still-a-lead check, a product with cached averages goes in the 1-token batch, the rest ask for the Buy Box too */
    if(again){let n2=0;
      /* b319: the shared Keepa cache first — a Buy Box answer under 2 hours old from any of our apps is used as it is (0 tokens);
         an older one (under 72 h) still gives the averages, so today's price is the only thing bought (1 token) */
      const kc=typeof kcGet==='function'?await kcGet(2,part,'bb',KC_AVG_H):{};if(typeof oaIdsSave==='function')oaIdsSave(Object.values(kc).map(x=>x.p));   /* b321: barcode + model for the OA check */
      const now0=part.filter(a=>kc[a]&&kcAge(kc[a])<=KC_NOW_H);
      if(now0.length){const rows=now0.map(a=>apiRow(kc[a].p,2)).filter(Boolean);audAvgSave(rows,kc);audNowRecord(rows);n2+=rows.length;}
      const rest=part.filter(a=>!now0.includes(a));audAvgSave(rest.filter(a=>kc[a]).map(a=>apiRow(kc[a].p,2)).filter(Boolean),kc);
      const cheap=rest.filter(a=>audAvgGet(a)),dear=rest.filter(a=>!audAvgGet(a));
      for(const [L,bb] of [[cheap,false],[dear,true]]){if(!L.length)continue;
        try{const j=await (await fetch(WORKER+'/keepa?path=product&domain=2&stats=90&history=0'+(bb?'&buybox=1':'')+'&asin='+L.join(','))).json();if(typeof kcPut==='function')kcPut(2,j.products,bb?'bb':'stats');if(typeof oaIdsSave==='function')oaIdsSave(j.products);   /* b319: saved for every app */
          const rows=(j.products||[]).map(p=>{const row=typeof apiRow==='function'?apiRow(p,2):null;if(row&&!bb){const av=audAvgGet(p.asin)||{};Object.keys(av).forEach(k=>{if((row[k]==null||row[k]==='')&&av[k]!=null&&av[k]!=='')row[k]=av[k];});}return row;}).filter(Boolean);
          if(bb)audAvgSave(rows);audNowRecord(rows);
          const det=(j.products||[]).map(audFromKeepa).filter(Boolean);if(det.length){audSaveProducts(det);}n2+=(j.products||[]).length;if(j.error)break;}
        catch(e){break;}}
      got+=n2;if(onBatch)onBatch(got,need.length,part);continue;}
    /* b319: titles, pictures and rank another of our apps fetched in the last 7 days come from the shared cache — 0 tokens */
    {const kcI=typeof kcGet==='function'?await kcGet(2,part,'stats',KC_INFO_H):{};if(typeof oaIdsSave==='function')oaIdsSave(Object.values(kcI).map(x=>x.p));const hit=part.filter(a=>kcI[a]);
      if(hit.length){const det=hit.map(a=>audFromKeepa(kcI[a].p)).filter(Boolean);if(det.length){audSaveProducts(det);got+=det.length;if(onBatch)onBatch(got,need.length,det.map(r=>r.asin));}
        audNowRecord(hit.filter(a=>kcAge(kcI[a])<=KC_NOW_H).map(a=>apiRow(kcI[a].p,2)).filter(Boolean));}
      const miss=part.filter(a=>!kcI[a]);if(!miss.length)continue;part.length=0;part.push(...miss);}
    try{const r=await fetch(WORKER+'/keepa?path=product&domain=2&stats=90&history=0&asin='+part.join(','));const j=await r.json();if(typeof kcPut==='function')kcPut(2,j.products,'stats');if(typeof oaIdsSave==='function')oaIdsSave(j.products);   /* b300: 90-day stats — 1 token (titles, pictures) · b319: saved for every app */
      const rows=(j.products||[]).map(audFromKeepa).filter(Boolean);
      if(typeof apiRow==='function')audNowRecord((j.products||[]).map(p=>apiRow(p,2)).filter(Boolean));   /* b300: is it a lead today */
      if(rows.length){audSaveProducts(rows);got+=rows.length;if(onBatch)onBatch(got,need.length,rows.map(r=>r.asin));}   /* b168: which rows, so the screen repaints only those */
      if(j.error)break;}
    catch(e){break;}}
  return got;}
/* b66 (Jack: "if we find the lead but don't sell it, can that be automated?") — yes: a product that was a lead on one of
   our filters, that nobody bought, sitting on a rival's shelf we do not sell on, IS a missed lead. Marked for him as
   'auto' with the reason filled in; one key press overrides it. Never touches a product that already has an answer. */
function audAutoMissed(sh){if(audIsVA())return 0;   /* b288: a VA gives every answer herself — that is what is being learnt */
  const V=audAll();const O=auOurs();const now=nowIso();const rows=[];
  sh.items.forEach(it=>{if(V[it.a]||audSells(sh.id,it.a)||audIsOld(it,sh))return;const o=O[it.a];if(!o||o.said==='Yes')return;
    const reason=o.said==='No'?'Passed on it':o.said?'Passed on it':'Never looked at';
    const row=audRow(it.a,'missed','auto',sh.seller||sh.id,now);row.reason=reason;row.note=(o.src||'')+(o.saidBy?' · '+o.saidBy+' said '+o.said:'');
    V[it.a]=row;rows.push(row);});
  if(rows.length){audSave(V);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows});}
  return rows.length;}
/* ---------- shelves in this browser (pasted lists and pulled sellers) ---------- */
function audShelfList(){const out=[];const va=audIsVA()?me():null;
  audState.sellers.forEach(s=>{let items=audState.shelf[s.seller_id]||[];
    /* b288: a VA sees only the storefronts Jack gave her, and only what they listed from 8 Oct (Day 1 stock is OLD DATA) */
    if(va){if(!audVaFor(s.seller_id).includes(va))return;items=items.filter(it=>!it.base&&it.first>=AUD_VA.START);}
    else if(!items.length)return;
    out.push({id:s.seller_id,name:s.name||s.seller_id,seller:s.seller_id,kind:'rival',items});});
  if(va)return out;
  Object.values(audShelvesLocal()).forEach(s=>{const pulled=s.kind==='pulled';out.push({id:s.id,name:s.name,seller:s.seller||'',kind:s.kind||'list',
    items:(s.asins||[]).map(a=>({a,first:pulled?String(s.at||'').slice(0,10):'',base:!pulled}))});});
  return out;}
function audShelf(id){return audShelfList().find(s=>s.id===id)||null;}
/* b313: the open shelf's listing for an ASIN (its first-seen day is "the day they listed it") — one map per shelf, rebuilt when the shelf changes */
let auItemMemo={k:'',m:null};
function auItemOf(a){const id=auView.shelf;if(!id)return null;const items=(audState.shelf||{})[id];const k=id+'|'+(items?items.length:'l');
  if(auItemMemo.k!==k){const sh=audShelf(id);auItemMemo={k,m:new Map((sh?sh.items:[]).map(it=>[it.a,it]))};}return auItemMemo.m.get(a)||null;}
/* b158 (Jack, 26 Sep: "how are you storing my ASINs — there is stuff I'm selling that hasn't been auto done as joint").
   It never had a list of Jack's catalogue. It borrowed OA Overview's overlap for THAT rival, latest day only — and that comes
   from Keepa's list of Lavarion's storefront, which drops a listing Keepa hasn't seen for about a week (out of stock between
   restocks). On 25 Sep: 280 ASINs on Keepa's list that day, 473 ever seen since 20 Aug — 236 shelf products Jack has sold
   were sitting in "to judge". Now "yours" = on Keepa's list now, OR on the inventory list Jack pastes, OR ever seen. */
const AUD_MINE='bdl-sourcing-audit-mine',AUD_ARCH='bdl-sourcing-audit-archived';
/* read once per paint, not once per product — a rival grid asks this ~8,000 times */
let audMineCache=null;function audMineBust(){audMineCache=null;}
function audMineList(){if(!audMineCache){const m=lsGet(AUD_MINE,null);audMineCache=new Set(m&&Array.isArray(m.asins)?m.asins:[]);}return audMineCache;}
/* b159 (Jack, 26 Sep: "joint covers how long for us — if I sold out yesterday but they still have it, joint or new to look at?").
   Sold out lately = still yours (you know it, you'll restock). Gone longer than the window = back to look at, with a chip
   saying when you last had it — a rival still selling something you dropped is a restock lead. Window is Jack's (default 45 — b161). */
const AUD_JDAYS='bdl-sourcing-audit-jointdays';
/* b161 (Jack: "make it 45 days instead of 30 — 45 days once it clears off my sheet") */
function audJointDays(){const d=lsGet(AUD_JDAYS,45);return d==='always'?'always':(+d||45);}
function audMineDaysAgo(asin){const d=audState.mineLast[asin];if(!d||!audState.mineLatest)return null;return Math.round((new Date(audState.mineLatest)-new Date(d))/864e5);}
/* b162 (Jack, 26 Sep: "anything on my storefront joint — if it leaves my storefront then for 45 days it's still down as joint —
   if a competitor adds it within the 45 days it auto does joint; if they add it after my 45 days it becomes new and to check again").
   So on a RIVAL's shelf the question is WHEN THEY ADDED IT, against the last day it was on Jack's storefront:
     on his storefront now (or on his pasted inventory)          → Joint
     they added it no later than 45 days after he last had it    → Joint (they had it while it was his, or within his 45 days)
     they added it more than 45 days after he last had it        → new — to check again
   With no shelf in view (the catalogue summary) it falls back to "45 days from today". */
function audFirstOn(shelfId,asin){if(!shelfId)return'';let m=audState._first&&audState._first[shelfId];
  if(!m){const items=audState.shelf[shelfId];if(!items)return'';m=new Map(items.map(it=>[it.a,it.first||'']));(audState._first=audState._first||{})[shelfId]=m;}
  return m.get(asin)||'';}
function audDaysBetween(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);}
function audMineWhy(asin,shelfId){if(audState.mineNow.has(asin))return'now';if(audMineList().has(asin))return'list';
  if(!audState.mineEver.has(asin))return'';const w=audJointDays();if(w==='always')return'recent';
  const last=audState.mineLast[asin];if(!last)return'recent';
  const added=audFirstOn(shelfId,asin);
  if(added)return audDaysBetween(last,added)<=w?'recent':'before';          /* the rival's add date decides */
  const ago=audMineDaysAgo(asin);return ago==null||ago<=w?'recent':'before';}
/* 'before' is information, not "yours": the product goes back to "to judge" with a chip */
function audSells(shelfId,asin){const s=audState.shared[shelfId];if(s&&s.has&&s.has(asin))return true;const w=audMineWhy(asin,shelfId);return w==='now'||w==='list'||w==='recent';}
function audMineLastNice(asin){const d=audState.mineLast[asin];return d?new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';}
const AUD_MINE_WORDS={now:'You sell this',list:'On your list',recent:'You sold this',before:'You used to sell this'};   /* b167: short enough for the result pill */
function audAddedNice(shelfId,asin){const f=audFirstOn(shelfId,asin);return f?new Date(f+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';}
function audMineSave(asins){const v={asins:[...new Set(asins)],at:nowIso(),who:me()};lsSet(AUD_MINE,v);audMineBust();
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('audit-mine',v)]);return v.asins.length;}
function audAsinsIn(text){return[...new Set((String(text||'').toUpperCase().match(/\b(B0[0-9A-Z]{8}|\d{9}[\dX])\b/g)||[]))];}
/* b158 (Jack: "can I archive some I'm not bothered about auditing?"). Hidden from the list, the counts and "carry on" —
   never deleted, one click brings a rival back. Shared, so it follows Jack to any browser. */
function audArchived(){const v=lsGet(AUD_ARCH,null);return new Set(v&&Array.isArray(v.ids)?v.ids:[]);}
function audArchSet(id,on){const a=audArchived();on?a.add(id):a.delete(id);const v={ids:[...a],at:nowIso(),who:me()};lsSet(AUD_ARCH,v);
  if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('audit-archived',v)]);return a.size;}

/* ---------- judging ---------- */
let audUndoStack=[];
/* b151: `reason` lets one press set the verdict AND which Discord / why missed — so a bulk "Discord · PS" is one batch and one undo */
function audJudge(asins,code,sellerId,reason){if(!needMe())return;const who=me();const now=nowIso();const batch=[];const m=audAll();
  asins.forEach(a=>{const cur=m[a]||null;const p=audPress(a,cur,code,who,sellerId,now);
    if(p.same){if(!reason||(cur&&cur.reason===reason))return;
      const row=Object.assign({},cur,{reason,at:now});batch.push({asin:a,prev:Object.assign({},cur),row});m[a]=row;return;}
    let row=reason?Object.assign({},p.row,{reason}):p.row;
    /* b313: Jack's Missed it saves WHY by itself — the line on the row (our lead not taken · rules cut · no filter · found) — no typing */
    if(code==='missed'&&!reason&&!audIsVA()&&typeof audWhyInfo==='function'&&row.verdict==='missed'){const it=auItemOf(a),w=audWhyInfo(a,it&&!it.base?it.first||'':'');if(w)row=Object.assign({},row,{reason:w.reason,note:row.note||w.txt.slice(0,200)});}
    batch.push({asin:a,prev:cur?Object.assign({},cur):null,row});m[a]=row;});
  if(!batch.length)return;
  audSave(m);audUndoStack.push(batch);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:batch.map(b=>b.row)});
  return batch;}
function audUndo(){const b=audUndoStack.pop();if(!b)return false;const m=audAll();const del=[],up=[];
  b.forEach(({asin,prev,row})=>{if(prev){m[asin]=prev;up.push(prev);}else{delete m[asin];del.push(row.id);}});
  audSave(m);if(cloudEnabled()){if(up.length)audQueue({op:'up',table:'src_audit_verdicts',rows:up});if(del.length)audQueue({op:'del',table:'src_audit_verdicts',ids:del});}
  return b;}
function audSetReason(asin,reason){const m=audAll();const r=m[asin];if(!r)return;r.reason=r.reason===reason?'':reason;r.at=nowIso();
  audSave(m);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:[r]});}
function audSetReasonMany(asins,reason){const m=audAll();const batch=[];const now=nowIso();
  asins.forEach(a=>{const r=m[a];if(!r||r.reason===reason)return;const row=Object.assign({},r,{reason,at:now});batch.push({asin:a,prev:Object.assign({},r),row});m[a]=row;});
  if(!batch.length)return null;audSave(m);audUndoStack.push(batch);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:batch.map(b=>b.row)});return batch;}
function audSetNote(asin,note){const m=audAll();const r=m[asin];if(!r)return;r.note=(note||'').slice(0,200);
  audSave(m);if(cloudEnabled())audQueue({op:'up',table:'src_audit_verdicts',rows:[r]});}

/* ============ the page ============ */
const AU_SORTS=[['sold','Sells the most a month'],['shelf','Newest on their shelf'],['price','Dearest first · high ticket'],['cheap','Cheapest first'],['rank','Best sales rank'],['few','Fewest sellers on it'],['many','Most sellers on it'],['title','Name A–Z']];
const auView=Object.assign({mode:'list',shelf:null,tab:{},focus:0,q:'',order:null,stay:new Set(),sel:new Set(),secs:[],lastAt:0,follow:false,sort:'sold',band:'ALL',vol:'0',sellers:'0',ofl:'0',cards:null},lsGet(AUD.VIEW,{})||{});
function auSave(){lsSet(AUD.VIEW,{cards:auView.cards,tab:auView.tab,secs:auView.secs.slice(-40),follow:!!auView.follow,sort:auView.sort,band:auView.band,vol:auView.vol,sellers:auView.sellers,ofl:auView.ofl});}
/* b66: "Keepa follows me" — one Keepa tab, reused, showing whatever product you are on. Opened from a key or click, so no popup block. */
function auFollow(){if(!auView.follow||auView.mode!=='audit')return;const sh=audShelf(auView.shelf);if(!sh)return;const it=auVisible(sh)[auView.focus];if(!it)return;
  try{window.open('https://keepa.com/#!product/2-'+it.a,'bdl-audit-keepa');}catch(e){}}
function auUk(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return'';const x=new Date(+m[1],+m[2]-1,+m[3]);
  return x.toLocaleDateString('en-GB',{day:'numeric',month:'short'});}
function auDays(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return 999;return Math.round((new Date(today())-new Date(+m[1],+m[2]-1,+m[3]))/864e5);}
function auClock(iso){const d=new Date(iso);return isNaN(d)?'':d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function auWhenFull(iso){if(!iso)return'';const d=new Date(iso),n=auDays(String(iso).slice(0,10));const mins=Math.round((Date.now()-d)/60e3);
  const ago=mins<1?'just now':mins<60?mins+' min ago':mins<24*60?Math.round(mins/60)+' h ago':'';return(n<=0?'today ':n===1?'yesterday ':auUk(iso)+' ')+auClock(iso)+(ago?' ('+ago+')':'');}
/* one line on each rival card: when OA Overview last checked that shelf, and what it added today */
function auShelfFresh(sh){if(sh.kind!=='rival')return'';const d=(audState.sellerDay||{})[sh.seller]||'',add=(audState.addAt||{})[sh.seller]||'';
  const t=today(),nt=sh.items.filter(i=>i.first===t).length,fresh=d===t||String(add).slice(0,10)===t;
  const when=d===t?'today'+(add&&String(add).slice(0,10)===t?' '+auClock(add):''):d?auUk(d)+' ('+auAgo(d)+')':add?auUk(add):'';
  return when?`<div class="aufresh ${fresh?'ok':'old'}" title="When OA Overview last checked this rival's shelf${add?' · newest line it added: '+auWhenFull(add):''}"><i></i>Shelf checked ${when}${nt?` · <b>+${nt} new today</b>`:''}</div>`:'';}
function auAgo(d){const n=auDays(d);return n<=0?'today':n===1?'yesterday':n+' days ago';}
function auOurs(){if(!auView._ours||auView._oursAt!==runsAll().length+'|'+Object.keys(verdAll()).length){auView._ours=audOurIndex(runsAll(),leadAll(),verdAll());auView._oursAt=runsAll().length+'|'+Object.keys(verdAll()).length;}return auView._ours;}
function auCounts(sh){const V=audAll();const c={todo:0,all:sh.items.length,had:0,sell:0,judged:0,byHand:0,auto:0,old:0,cutx:0,mera:0,suz:0};audTypes().forEach(t=>c[t.code]=0);const O=auOurs();
  sh.items.forEach(it=>{if(audIsOld(it,sh)){c.old++;c.all--;return;}   /* b291: OLD DATA is not part of this audit */
    const sells=audSells(sh.id,it.a);const st=audStatus(V[it.a],sells);
    if(st==='todo')c.todo++;else{c.judged++;if(st==='jointauto'){c.joint++;c.auto++;}else{if(V[it.a]&&V[it.a].who==='auto')c.auto++;else c.byHand++;if(c[st]!=null)c[st]++;}}
    if(sells)c.sell++;if(O[it.a])c.had++;
    /* b313 (Jack, 23 Oct: "x many were in exports but no lead · x on Mera's sheet but not joint · x on Suz's sheet but not joint") — Jack's page */
    if(!audIsVA()&&typeof trState!=='undefined'){const S=(trState.sheet||{})[it.a]||[];if(!O[it.a]&&(trState.seen[it.a]||[]).length&&!(trState.seen[it.a]||[]).some(s=>s.ever_kept))c.cutx++;
      if(!sells){if(S.some(x=>x.va==='Mera'))c.mera++;if(S.some(x=>x.va==='Suz'))c.suz++;}}});return c;}
function auLastAudit(sh){let at='';const V=audAll();sh.items.forEach(it=>{const v=V[it.a];if(v&&v.seller_id===sh.seller&&v.at>at)at=v.at;});return at?at.slice(0,10):'';}
function auNewSince(sh){const la=auLastAudit(sh);if(!la)return 0;const V=audAll();return sh.items.filter(it=>!it.base&&it.first>la&&!audIsOld(it,sh)&&audStatus(V[it.a],audSells(sh.id,it.a))==='todo').length;}
function auAv(name){const cs=['#A78BFA','#22D3EE','#2CE38B','#FFB224','#FF8A3D','#8C95FF','#F472B6'];let h=0;for(const ch of String(name))h=(h*31+ch.charCodeAt(0))>>>0;return cs[h%cs.length];}
function auIni(n){return String(n).split(/[\s·]+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';}
function auDonut(c,size){const segs=audTypes().map(t=>[c[t.code]||0,t.hex]).concat([[c.todo,'rgba(255,255,255,.10)']]);
  const tot=segs.reduce((a,[n])=>a+n,0)||1;let off=25;const R=15.9155;
  return`<svg class="audonut" viewBox="0 0 42 42" style="width:${size||78}px;height:${size||78}px">${segs.filter(([n])=>n).map(([n,col])=>{const p=n/tot*100;const el=`<circle cx="21" cy="21" r="${R}" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${p} ${100-p}" stroke-dashoffset="${off}"/>`;off-=p;return el;}).join('')}<text x="21" y="21.6" text-anchor="middle" font-size="9" font-weight="800" fill="currentColor">${c.todo.toLocaleString()}</text><text x="21" y="26.4" text-anchor="middle" font-size="3.4" font-weight="700" fill="currentColor" opacity=".6">LEFT</text></svg>`;}
function auSyncNote(){const n=audOut().length;if(!cloudEnabled())return guestOn()?'<span class="ausync guest">Guest mode · nothing you do is saved</span>':location.protocol==='file:'?'<span class="ausync bad">A copy on this Mac — not the live app</span>':'<span class="ausync off">Sandbox · nothing leaves this browser</span>';   /* b182: says which */
  if(audState.tables===false)return'<span class="ausync bad">Audit tables not created yet — run the SQL once. Your answers are saved here and will send themselves.</span>';
  return n?`<span class="ausync">${n} answer${n===1?'':'s'} to send</span>`:'<span class="ausync ok">Saved for everyone</span>';}
function audPaintSync(){const el=$('#auSync');if(el)el.outerHTML=auSyncNote().replace('<span class="','<span id="auSync" class="');}

const AU_ANCHOR={top:null,want:false};
/* called by the things that move the cursor, so only a deliberate press pins the page */
function auPin(){const el=document.querySelector('.aurow.focus');
  AU_ANCHOR.top=el?el.getBoundingClientRect().top:null;AU_ANCHOR.want=!!el;}
/* b141 (Jack, 22 Sep: "still very jumpy whenever I press anything"). Two causes, both gone now.
   (1) The row's buttons appeared only on the row you were on, so every press grew one row and shrank another and
       the list shuffled under your hand. b92 and b99 tried to CORRECT that with scroll maths; the row simply does
       not change height any more, so there is nothing to correct.
   (2) Every press rebuilt the entire page — header, tabs, selects, list, panel. Now a press repaints the list, the
       panel and the numbers, and leaves everything else alone. */
function auPaintCounts(sh){const c=auCounts(sh);const host=$('#page-audit');if(!host)return;
  const bar=host.querySelector('.auprog .aubar');
  if(bar)bar.innerHTML=audTypes().map(t=>c[t.code]?`<i style="width:${c[t.code]/c.all*100}%;background:${t.hex}" title="${c[t.code]} ${escapeHtml(t.label)}"></i>`:'').join('');
  const secs=auView.secs.length?auView.secs.reduce((a,b)=>a+b,0)/auView.secs.length:6;
  const line=host.querySelector('.aupline');
  if(line){const b=line.querySelector('b'),s=line.querySelector('span');
    if(b)b.textContent=`${c.todo.toLocaleString()} left of ${c.all.toLocaleString()}`;
    if(s)s.textContent=c.todo?`about ${Math.max(1,Math.round(c.todo*secs/60))} min · ${c.byHand.toLocaleString()} judged${c.auto?` · ${c.auto.toLocaleString()} marked for you`:''}`:'all done';}
  host.querySelectorAll('.autabs [data-tab]').forEach(el=>{const k=el.dataset.tab;const n=k==='all'?c.all:(c[k]||0);
    const b=el.querySelector('b');if(b)b.textContent=n;el.classList.toggle('zero',!n);});}
/* b152 (Jack, 25 Sep: "still very jumping when I click it"). Measured: judging the row near the bottom of the screen moved the
   focus to the next row, which was off-screen, and the page scrolled 230px under the mouse. A CLICK never scrolls now — you are
   looking at the row you clicked, and the next row's buttons are right there. The KEYBOARD still keeps its row on screen, but
   when it has to scroll it puts the row a third of the way down, so the next few presses do not scroll at all (it used to nudge
   on every press once you reached the bottom). */
/* b166 (Jack, 26 Sep: "I scrolled down and it sent me back to the top — why is this"). Measured: the list redrew itself when
   the next 120 rows arrived, and again every time a batch of Keepa details landed — and every redraw "kept the focus row on
   screen". The focus row was row 1, so the page shot back up to it. Only a KEY you just pressed may move the page now, and
   only within 400ms of pressing it. Rows, details and refreshes that arrive by themselves never scroll anything. */
function auKeyed(){return!!auView.keyAt&&Date.now()-auView.keyAt<400;}
function auKeepFocusVisible(){if(!auKeyed())return;auView.keyAt=0;
  const el=document.querySelector('.aurow.focus');if(!el)return;
  const r=el.getBoundingClientRect();if(r.top>=64&&r.bottom<=innerHeight-20)return;
  window.scrollTo({top:Math.max(0,r.top+window.scrollY-Math.round(innerHeight/3)),behavior:'smooth'});}
/* b160 (Jack, 26 Sep: "how do I see the rest haha"). The list stopped at 120 — "judge these and the rest follow" — with no way
   to get the rest. Now: a button for the next 120 or all of them, more load by themselves as the bottom scrolls into view, and
   moving down with the keys never runs off the end of what is drawn. Adding rows BELOW never moves the ones you are looking at. */
function auLim(){return Math.max(AUD.PAGE,auView.limit||0);}
function auPageHtml(vis,sh){if(auView.focus>=auLim()-2)auView.limit=Math.min(vis.length,auView.focus+AUD.PAGE);const lim=auLim();
  return vis.slice(0,lim).map((it,i)=>auRow(it,i,sh)).join('')+(vis.length>lim?`<div class="aumore" id="auMore"><span>Showing ${lim.toLocaleString()} of ${vis.length.toLocaleString()}</span><button type="button" class="btn ghost sm" data-more="${AUD.PAGE}">Show ${Math.min(AUD.PAGE,vis.length-lim).toLocaleString()} more</button><button type="button" class="btn ghost sm" data-more="all">Show all ${vis.length.toLocaleString()}</button></div>`:'');}
let auMoreObs=null;
function auWatchMore(){const m=document.getElementById('auMore');if(!m||typeof IntersectionObserver==='undefined')return;
  if(!auMoreObs)auMoreObs=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting))auExtend(AUD.PAGE);},{rootMargin:'400px 0px'});
  auMoreObs.disconnect();auMoreObs.observe(m);}
/* b166: the next rows are ADDED under the ones on screen. The list is not rebuilt for it, so nothing flickers and the page stays put. */
function auExtend(n){const sh=audShelf(auView.shelf);if(!sh)return false;const m=document.getElementById('auMore');if(!m)return false;
  const vis=auVisible(sh);const from=auLim();const lim=n==='all'?vis.length:Math.min(vis.length,from+(+n||AUD.PAGE));if(lim<=from)return false;auView.limit=lim;
  m.insertAdjacentHTML('beforebegin',vis.slice(from,lim).map((it,i)=>auRow(it,from+i,sh)).join(''));
  if(lim>=vis.length){m.remove();if(auMoreObs)auMoreObs.disconnect();}
  else{const s=m.querySelector('span');if(s)s.textContent=`Showing ${lim.toLocaleString()} of ${vis.length.toLocaleString()}`;
    const b=m.querySelector('[data-more]:not([data-more="all"])');if(b)b.textContent=`Show ${Math.min(AUD.PAGE,vis.length-lim).toLocaleString()} more`;}
  return true;}
function auQuickRender(){if(auView.mode!=='audit')return false;const sh=audShelf(auView.shelf);if(!sh)return false;
  const host=$('#page-audit');const list=host&&host.querySelector('.aulist');if(!list)return false;
  const tab=auView.tab[sh.id]||'todo';const c=auCounts(sh);
  if(tab==='todo'&&!c.todo&&!auView.q)return false;                 /* the shelf is finished — that screen is a different page */
  const vis=auVisible(sh);if(!vis.length)return false;
  if(auView.focus>=vis.length)auView.focus=Math.max(0,vis.length-1);
  list.innerHTML=auPageHtml(vis,sh);auView._visLen=vis.length;
  const panel=host.querySelector('.aupanel');if(panel)panel.innerHTML=auPanel(vis[auView.focus],sh);
  auPaintCounts(sh);auKeepFocusVisible();auWatchMore();
  const cur=vis[auView.focus];if(cur)auLoadGraph(cur.a,vis[auView.focus+1]&&vis[auView.focus+1].a);
  return true;}
/* b167: a press repaints only the rows it touched — the one you judged, the one you left and the one you moved to — and the
   panel and counts. The list used to be rebuilt wholesale on every key (120 rows and their pictures), which read as a flicker.
   A full redraw still happens whenever the SET of rows changes: a tab, a filter, a search, a row leaving its tab, more rows. */
function auPatch(rows){if(auView.mode!=='audit')return false;const sh=audShelf(auView.shelf);if(!sh)return false;
  const host=$('#page-audit');const list=host&&host.querySelector('.aulist');if(!list)return false;
  const tab=auView.tab[sh.id]||'todo';const c=auCounts(sh);if(tab==='todo'&&!c.todo&&!auView.q)return false;
  const osig=auView._osig;const vis=auVisible(sh);if(!vis.length||vis.length!==auView._visLen||auView._osig!==osig)return false;   /* b168: a re-sort (prices landing under "dearest first") is a full draw */
  if(auView.focus>=vis.length)auView.focus=Math.max(0,vis.length-1);
  const idx={};vis.forEach((it,i)=>idx[it.a]=i);
  const fa=vis[auView.focus].a;if(!list.querySelector(`.aurow[data-a="${fa}"]`))return false;   /* the row you are on must be drawn */
  const want=new Set(rows||[]);const cur=list.querySelector('.aurow.focus');if(cur)want.add(cur.dataset.a);want.add(fa);
  for(const a of want){if(idx[a]==null)continue;const el=list.querySelector(`.aurow[data-a="${a}"]`);if(!el){if(idx[a]>=auLim())continue;return false;}el.outerHTML=auRow(vis[idx[a]],idx[a],sh);}   /* b168: filtered-out or not-yet-drawn rows are simply skipped */
  const panel=host.querySelector('.aupanel');if(panel)panel.innerHTML=auPanel(vis[auView.focus],sh);
  auPaintCounts(sh);auKeepFocusVisible();
  const it=vis[auView.focus];if(it)auLoadGraph(it.a,vis[auView.focus+1]&&vis[auView.focus+1].a);
  return true;}
function auRefresh(rows){if(!(rows&&auPatch(rows))&&!auQuickRender())renderAudit();auPaintBulk();}
/* b151 (Jack, 24 Sep: "add a way to bulk audit and click — a load of these are lead group, Discord, and I know which one").
   Tick rows on their picture (shift-click ticks a run), and a bar pinned to the bottom of the screen judges every ticked row in
   one press — including WHICH Discord, as one click. It floats over the page, so ticking never moves a single row. One press is
   one undo. The keyboard already worked this way (shift + arrow, then 1-6); now the mouse does too, and Q / W / E set the reason
   on every ticked row. */
/* b159: the filter bar's own "Tick all N shown / N ticked · Clear" — repainted in place, so ticking never redraws the list */
function auTickHtml(shown){const n=auView.sel.size;
  return`${n?`<b>${n.toLocaleString()}</b> ticked <button type="button" class="bl2" data-tclear="1">Clear</button>`:''}${shown&&n<shown?`<button type="button" class="bl2 tall" data-tall="1" title="Tick every row shown — then press 1–6, or use the bar at the bottom">Tick all ${shown.toLocaleString()} shown</button>`:''}`;}
function auPaintTick(){const el=document.querySelector('#page-audit .autick');if(!el)return;const sh=audShelf(auView.shelf);if(!sh)return;el.innerHTML=auTickHtml(auVisible(sh).length);}
function auPaintBulk(){auPaintTick();let el=document.getElementById('auBulk');const pg=document.getElementById('page-audit');
  const on=!!(pg&&pg.classList.contains('active'))&&auView.mode==='audit'&&auView.sel&&auView.sel.size>0&&!!audShelf(auView.shelf);
  document.body.classList.toggle('au-selecting',on);
  if(!on){if(el){el.hidden=true;el.innerHTML='';}return;}
  if(!el){el=document.createElement('div');el.id='auBulk';el.className='aubulk';document.body.appendChild(el);
    el.addEventListener('click',e=>{const t=e.target;const sh=audShelf(auView.shelf);if(!sh)return;
      if(t.closest('[data-bclear]')){auView.sel=new Set();auView.lastSel=null;auRefresh();return;}
      if(t.closest('[data-ball]')){auView.sel=new Set(auVisible(sh).map(it=>it.a));auRefresh();return;}
      const more=t.closest('[data-bmore]');if(more){auView.bulkOpen=auView.bulkOpen===more.dataset.bmore?null:more.dataset.bmore;auPaintBulk();return;}
      const b=t.closest('[data-bv]');if(b){auView.bulkOpen=null;auJudgeNow([...auView.sel],b.dataset.bv,b.dataset.br||'');}});}
  const sh=audShelf(auView.shelf);const n=auView.sel.size,shown=auVisible(sh).length;
  const btn=(t,idx)=>{const k=`<kbd>${auKey(idx)}</kbd>`;
    if(t.reasons&&t.reasons.length<=3)return`<span class="bgrp" style="--c:${t.hex}"><span class="bl">${AU_ICON[t.icon]||''}${escapeHtml(t.short||t.label)}</span>${t.reasons.map(r=>`<button type="button" class="bb" data-bv="${t.code}" data-br="${escapeHtml(r)}" title="Mark all ${n} ${escapeHtml(t.label)} · ${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}</span>`;
    if(t.reasons)return`<button type="button" class="bb${auView.bulkOpen===t.code?' open':''}" style="--c:${t.hex}" data-bmore="${t.code}" title="${escapeHtml(t.label)} — pick why">${k}${AU_ICON[t.icon]||''}${escapeHtml(t.short||t.label)} ▾</button>`;
    return`<button type="button" class="bb" style="--c:${t.hex}" data-bv="${t.code}" title="Mark all ${n} ${escapeHtml(t.label)} · key ${idx+1}">${k}${AU_ICON[t.icon]||''}${escapeHtml(t.short||t.label)}</button>`;};
  const types=audPick();const open=types.find(t=>t.code===auView.bulkOpen);
  el.hidden=false;
  el.innerHTML=`<div class="bmain"><span class="bn"><b>${n}</b> ticked</span><span class="bsep"></span>${types.map(btn).join('')}<span class="bsep"></span>
      ${n<shown?`<button type="button" class="bl2" data-ball="1">Tick all ${shown} shown</button>`:''}<button type="button" class="bl2" data-bclear="1">Clear <kbd>Esc</kbd></button></div>
    ${open?`<div class="bwhy" style="--c:${open.hex}"><span>${escapeHtml(open.prompt||'Why?')}</span>${open.reasons.map(r=>`<button type="button" class="bb" data-bv="${open.code}" data-br="${escapeHtml(r)}">${escapeHtml(r)}</button>`).join('')}</div>`:''}`;
  /* b153: the toast sits exactly above the bar, however tall the bar is */
  document.documentElement.style.setProperty('--bulk-h',el.offsetHeight+'px');}
function auToggleSel(asin,i,range){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);
  const touched=[asin];
  if(range&&auView.lastSel!=null){const a=Math.min(auView.lastSel,i),b=Math.max(auView.lastSel,i);for(let k=a;k<=b;k++)if(vis[k]){auView.sel.add(vis[k].a);touched.push(vis[k].a);}}
  else{if(auView.sel.has(asin))auView.sel.delete(asin);else auView.sel.add(asin);}
  auView.lastSel=i;auRefresh(touched);}
function renderAudit(){const host=$('#page-audit');if(!host)return;audMineBust();
  document.body.classList.toggle('auditing',auView.mode==='audit');
  if(!isJack()&&!(audIsVA()&&AUD_VA.ON)){auView._listHtml=null;host.innerHTML=`<div class="card"><div class="empty"><span>The storefront audit is Jack's. Pick your name top right if this is you.</span></div></div>`;return;}
  if(auView.mode==='audit'&&auView.shelf&&audShelf(auView.shelf))auRenderOne();else auRenderList();
  if(auView.mode!=='audit'&&typeof trMount==='function')trMount(host);   /* b239: ASIN audit box, top of the landing page */
  /* b240: CUT chips — the shelf's cut rows load once, then the rows redraw */
  if(auView.mode==='audit'&&auView.shelf&&typeof trSeenLoad==='function'){const sh=audShelf(auView.shelf);if(sh)trSeenLoad(sh.items.map(it=>it.a)).then(got=>{if(got&&auView.mode==='audit'&&auView.shelf===sh.id)renderAudit();}).catch(()=>{});}
  /* b313: on Jack's rival list the cards count "in our exports, no lead" — every rival's export log loads once (80 ASINs a request), then the cards redraw */
  if(auView.mode!=='audit'&&!audIsVA()&&typeof trSeenLoad==='function'&&cloudReadable()){const all=[...new Set(audShelfList().filter(s=>s.kind==='rival').flatMap(s=>s.items.map(it=>it.a)))];
    trSeenLoad(all).then(got=>{if(got&&auView.mode!=='audit'&&$('#page-audit').classList.contains('active'))renderAudit();}).catch(()=>{});}
  if(!audIsVA()&&typeof trSheetLoad==='function'&&!trState.sheet&&!trState.sheetBusy&&cloudReadable())trSheetLoad().then(m=>{if(m&&Object.keys(m).length&&$('#page-audit').classList.contains('active'))renderAudit();});
  if(typeof auPaintBulk==='function')auPaintBulk();}
/* b69 (Jack: "highest % of products I sell too") — the rival you overlap with most is the one worth auditing,
   because everything on their shelf you do not sell is a lead you have not found yet. */
function auOverlap(c){return c.all?c.sell/c.all:0;}
/* b100 (Jack: "add a sort by"). 39 rivals was one fixed order — most overlap first — and no way to ask a
   different question of the list. These are the questions worth asking, in the words of the answer. */
const AU_RSORTS=[['overlap','You sell the most of theirs'],['leads','Most were our leads'],
  ['todo','Fewest left to judge'],['most','Most left to judge'],['size','Biggest shelf'],
  ['done','Least recently audited'],['name','Name A-Z']];
function auRsort(){return AU_RSORTS.some(x=>x[0]===auView.rsort)?auView.rsort:'overlap';}
function auRankRivals(rows){const by={
  overlap:(a,b)=>auOverlap(b.c)-auOverlap(a.c)||b.c.todo-a.c.todo,
  leads:(a,b)=>(b.c.had||0)-(a.c.had||0)||auOverlap(b.c)-auOverlap(a.c),
  todo:(a,b)=>(a.c.todo||0)-(b.c.todo||0)||auOverlap(b.c)-auOverlap(a.c),
  most:(a,b)=>(b.c.todo||0)-(a.c.todo||0)||auOverlap(b.c)-auOverlap(a.c),
  size:(a,b)=>(b.c.all||0)-(a.c.all||0),
  /* never audited first — those are the ones with everything still to find */
  done:(a,b)=>String(a.la||'').localeCompare(String(b.la||''))||auOverlap(b.c)-auOverlap(a.c),
  name:(a,b)=>String(a.sh.name||'').localeCompare(String(b.sh.name||''))}[auRsort()];
  return rows.sort(by);}
function auNextShelf(fromId){const arch=audArchived();const L=audShelfList().filter(sh=>!arch.has(sh.id)).map(sh=>({sh,c:auCounts(sh)})).filter(x=>x.sh.id!==fromId&&x.c.todo>0)
  .sort((a,b)=>auOverlap(b.c)-auOverlap(a.c)||b.c.todo-a.c.todo);return L[0]?L[0].sh:null;}
/* b174 (Jack, 27 Sep: "it flickers here" / "shows me my Keepa … first then flickers"). After a fresh load the list drew at once from
   an empty browser — "from Keepa's list" in amber, zeros, "No shelves yet" — and redrew half a second later when the shelves arrived.
   Until the first shelves are in, it now shows the page's own shape with soft placeholders, then the real thing once. */
function auSkeleton(){const card=`<div class="auskc"><i class="sk a"></i><i class="sk b"></i><i class="sk c"></i><i class="sk d"></i></div>`;
  return`<div class="card auskel"><div class="cardhead"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg></span><h2>Storefront audits</h2><span class="sub">Getting the rivals' shelves…</span></div>
    <div class="kpis aukpis">${'<div class="kpi"><div><i class="sk kvs"></i><i class="sk kls"></i></div></div>'.repeat(5)}</div>
    <div class="aumine2 ok"><i class="amdot"></i><b class="amt">Your storefront</b><i class="sk strip"></i></div>
    <div class="aucards">${card.repeat(8)}</div></div>`;}
function auRenderList(){auView.mode='list';setTimeout(auFixHash,0);
  const host0=$('#page-audit');
  if(cloudReadable()&&!audState.shelfAt&&!audState.shelfErr){
    if(!host0.querySelector('.auskel')){host0.innerHTML=auSkeleton();auView._listHtml=null;}
    if(!auView._pulling){auView._pulling=true;audPullShelves().then(()=>{auView._pulling=false;if(auView.mode==='list')renderAudit();});}
    return;}if(audIsVA()&&typeof auRenderVaList==='function'){auRenderVaList();return;}   /* b288 */const arch=audArchived();const allShelves=audShelfList();const shelves=allShelves.filter(sh=>!arch.has(sh.id));
  const archRows=auRankRivals(allShelves.filter(sh=>arch.has(sh.id)).map(sh=>({sh,c:auCounts(sh),la:auLastAudit(sh),nw:auNewSince(sh)})));
  const mineN=[...new Set([...audState.mineEver,...audState.mineNow,...audMineList()])].filter(a=>{const w=audMineWhy(a);return w&&w!=='before';}).length,mineList=audMineList().size;
  if(auView.cards===null)auView.cards=shelves.length<=8;   /* a few rivals read better as cards, 39 do not */const V=audAll();const O=auOurs();
  const rowsAll=auRankRivals(shelves.map(sh=>({sh,c:auCounts(sh),la:auLastAudit(sh),nw:auNewSince(sh)})));
  /* b320 (Jack, 6 Nov, at CJS Enterprise UK — 0 left: "if this has 0 should it go elsewhere"): a rival with nothing left to judge folds into
     "Up to date" under the list; it comes back up by itself the day they list something new */
  const doneRows=rowsAll.filter(x=>x.la&&!x.c.todo),rows=rowsAll.filter(x=>!doneRows.includes(x));
  const seen=new Set();let todo=0,had=0,sell=0,missed=0;
  shelves.forEach(sh=>sh.items.forEach(it=>{if(seen.has(it.a)||audIsOld(it,sh))return;seen.add(it.a);const st=audStatus(V[it.a],audSells(sh.id,it.a));
    if(st==='todo')todo++;if(st==='missed')missed++;if(audSells(sh.id,it.a))sell++;const o=O[it.a];if(o&&o.said!=='Yes')had++;}));
  /* b167: each number wears its colour (Jack's KPI-card taste), and "Still to judge" opens the next rival */
  const nextSh=auNextShelf(null);
  const k=(v,l,s,cls,go)=>`<div class="kpi k-${cls||'plain'}${go?' go':''}"${go?` data-open="${escapeHtml(go)}" role="button" tabindex="0" title="Carry on with the next rival"`:''}><div><div class="kv">${v}</div><div class="kl">${l}</div>${s?`<div class="ks">${s}</div>`:''}</div></div>`;
  const stat=x=>!x.la?`<span class="aupill p-todo">Never audited</span>`:x.nw?`<span class="aupill p-todo">${x.nw} new since your audit</span>`:x.c.todo?`<span class="aupill p-todo">${x.c.todo} to do</span>`:`<span class="aupill p-joint">Up to date</span>`;
  const h=(typeof auVaCard==='function'?auVaCard():'')+`<div class="card">
    <div class="cardhead"><span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg></span><h2>Storefront audits</h2>
      <span class="sub">One pass per rival. After that only their new lines come back. An answer belongs to the product, so it counts on every shelf.</span>
      <div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}<label class="ausortby"><span>Order</span><select id="auRsort">${AU_RSORTS.map(([v,l])=>`<option value="${v}"${auRsort()===v?' selected':''}>${l}</option>`).join('')}</select></label><button class="btn ghost sm" id="auCards" type="button">${auView.cards?'Show as a list':'Show as cards'}</button><button class="btn ghost sm" id="auRefresh" type="button">Refresh shelves</button>${(()=>{const n=auNextShelf(null);const c=n?auCounts(n):null;return n?`<button class="btn primary sm" type="button" data-open="${escapeHtml(n.id)}">${ICONS.run}${c.byHand?'Carry on':'Start'} · ${escapeHtml(n.name)} · ${c.todo.toLocaleString()} left</button>`:'';})()}</div></div>
    ${cloudReadable()?(()=>{const t=today(),nNew=shelves.filter(x=>x.kind==='rival').reduce((n,x)=>n+x.items.filter(i=>i.first===t).length,0),oa=audState.oaAt,fresh=oa&&String(oa).slice(0,10)===t;
      return`<div class="auoa ${fresh?'ok':'old'}"><i></i><span><b>OA Overview last updated the shelves</b> ${oa?auWhenFull(oa):'— nothing from it yet'}</span>${nNew?`<span class="auoan"><b>+${nNew.toLocaleString()}</b> new lines on rival shelves today</span>`:''}<span class="auoap">pulled into this page ${auClock(new Date(audState.shelfAt||Date.now()).toISOString())}</span><button class="btn ghost xs" id="auRefresh2" type="button" title="Pull the latest from OA Overview now">Refresh</button></div>`;})():''}
    ${shelves.length?`<div class="kpis aukpis">
      ${k(shelves.length,'Rivals with a saved shelf','from OA Overview, plus any you add','violet')}
      ${k(seen.size.toLocaleString(),'Products','each judged once, everywhere','sky')}
      ${k(todo.toLocaleString(),'Still to judge',nextSh?'next: '+escapeHtml(nextSh.name)+' →':'','iris',nextSh?nextSh.id:'')}
      ${k(had.toLocaleString(),'Were our leads','on one of our filters, nobody said Yes','amber')}
      ${k(sell.toLocaleString(),'You already sell',`auto-marked · your catalogue ${mineN.toLocaleString()}`,'jade')}</div>`:''}
    ${(()=>{let rec=0,old=0;audState.mineEver.forEach(a=>{if(audState.mineNow.has(a))return;const w=audMineWhy(a);if(w==='recent')rec++;else if(w==='before')old++;});
      /* b166 (Jack, 26 Sep: "wtf is this grey shit and why is this here"). The paste box was the fallback for when Keepa's list
         missed something; OA Overview now saves the storefront every day, so the box is folded away behind one link and the
         strip just says what it knows: how many are on it, how many left recently and still count as Joint, and the window. */
      const tracked=audState.mineSrc==='storefront';const jd=audJointDays();
      return`<div class="aumine2 ${tracked?'ok':'warn'}"><i class="amdot"></i><b class="amt">Your storefront</b><span class="amsrc">${tracked?'tracked daily by OA Overview · anything on it is Joint everywhere':!cloudReadable()?'not loaded — this copy is not connected to Supabase':'from Keepa’s list — OA Overview is not saving your storefront yet'}</span>
        <span class="amn"><b>${audState.mineNow.size.toLocaleString()}</b> on it now</span><span class="amn"><b>${rec.toLocaleString()}</b> ${jd==='always'?'sold before · still Joint':`left it in the last ${jd} days · still Joint`}</span>${mineList?`<span class="amn"><b>${mineList.toLocaleString()}</b> on your pasted list</span>`:''}${old?`<span class="amn old" title="A rival added these more than ${jd} days after your storefront last had them — so they come back to judge"><b>${old.toLocaleString()}</b> left over ${jd} days ago · to judge</span>`:''}
        <label class="aujd" title="A rival that adds it inside this window is Joint automatically; one that adds it after is new, to check">Still Joint for <select id="auJointDays">${[14,30,45,60,90,'always'].map(d=>`<option value="${d}"${String(audJointDays())===String(d)?' selected':''}>${d==='always'?'ever':d+' days'}</option>`).join('')}</select> after it leaves</label>
        <details class="ampaste"><summary>Paste inventory</summary><div class="ampbox">
          <textarea class="txt" id="auMineIn" rows="3" placeholder="Only if Keepa missed something you sell — paste your Seller Central inventory export, or any list with ASINs in it"></textarea>
          <div class="row"><button class="btn primary sm" id="auMineSave" type="button">Save as my inventory list</button>${mineList?`<button class="btn ghost sm" id="auMineClear" type="button">Clear the list (${mineList.toLocaleString()})</button>`:''}<span class="ssub" id="auMineMsg"></span></div></div></details></div>`;})()}
    ${shelves.length?(auView.cards?`<div class="aucards">${rows.map(x=>`<button class="aucard" type="button" data-open="${escapeHtml(x.sh.id)}">
      <span class="auarch" role="button" tabindex="0" data-arch="${escapeHtml(x.sh.id)}" title="Archive ${escapeHtml(x.sh.name)} — hide it from the audit (one click brings it back)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/></svg></span>
      <div><div class="top"><span class="auav" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span>
        <div><div class="nm">${escapeHtml(x.sh.name)}</div><div class="meta">${x.c.all.toLocaleString()} products${x.c.old?` · <span class="auold" title="${escapeHtml(audOldWhy(x.sh).replace(/^./,c=>c.toUpperCase()))} — OLD DATA, not part of the audit">${x.c.old.toLocaleString()} OLD DATA</span>`:''} · ${x.la?'last audited '+auUk(x.la)+' ('+auAgo(x.la)+')':'not audited yet'}</div>${auShelfFresh(x.sh)}</div></div>
        <div class="facts">${stat(x)}${x.c.sell?`<span class="aupill p-joint">${Math.round(auOverlap(x.c)*100)}% you sell too · ${x.c.sell}</span>`:''}${x.c.had?`<span class="aupill p-had">${x.c.had} were our leads</span>`:''}${x.c.cutx?`<span class="aupill p-cutx" title="In one of our exports, never a lead — our rules cut it">${x.c.cutx} in our exports, no lead</span>`:''}${x.c.mera?`<span class="aupill p-mera" title="On Mera's lead sheet, and you don't sell it (not joint)">${x.c.mera} on Mera's sheet · not joint</span>`:''}${x.c.suz?`<span class="aupill p-suz" title="On Suz's lead sheet, and you don't sell it (not joint)">${x.c.suz} on Suz's sheet · not joint</span>`:''}</div>
        <div class="prog"><b>${x.c.todo.toLocaleString()}</b> left to judge${x.c.byHand?` · ${x.c.byHand.toLocaleString()} you judged`:''}${x.c.auto?` · ${x.c.auto.toLocaleString()} marked for you`:''}</div></div>${auDonut(x.c)}</button>`).join('')}</div>`
      :`<div class="tablewrap show"><div class="tablescroll"><table class="logtbl autbl"><thead><tr><th>Rival</th><th class="r">You sell too</th><th class="r">Were our leads</th><th class="r">In exports, no lead</th><th class="r">Mera sheet · not joint</th><th class="r">Suz sheet · not joint</th><th class="r">Left to judge</th><th class="r">Products</th><th>Last audited</th><th></th></tr></thead><tbody>
        ${rows.map(x=>`<tr data-open="${escapeHtml(x.sh.id)}"><td class="lsrc"><div class="lrow"><span class="auav sm" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span><div><b>${escapeHtml(x.sh.name)}</b><div class="chg">${x.la?'audited '+auUk(x.la):'never audited'}${x.nw?' · '+x.nw+' new since':''}</div></div></div></td>
        <td class="num"><b class="${auOverlap(x.c)>=0.15?'jade':''}">${Math.round(auOverlap(x.c)*100)}%</b><div class="chg">${x.c.sell}</div></td>
        <td class="num"><b class="${x.c.had?'amber':''}">${x.c.had}</b></td>
        <td class="num">${x.c.cutx||'<span class="cutn">0</span>'}</td><td class="num">${x.c.mera?`<b class="aumera">${x.c.mera}</b>`:'<span class="cutn">0</span>'}</td><td class="num">${x.c.suz?`<b class="ausuz">${x.c.suz}</b>`:'<span class="cutn">0</span>'}</td>
        <td class="num"><b>${x.c.todo.toLocaleString()}</b>${x.c.byHand?`<div class="chg">${x.c.byHand} judged</div>`:''}</td>
        <td class="num">${x.c.all.toLocaleString()}</td>
        <td class="lwhen">${x.la?auAgo(x.la):'—'}</td>
        <td class="num"><span class="auarch inl" role="button" tabindex="0" data-arch="${escapeHtml(x.sh.id)}" title="Archive — hide it from the audit">Archive</span> <span class="btn primary xs">Audit →</span></td></tr>`).join('')}</tbody></table></div></div>`)
      :`<div class="empty"><span>${cloudEnabled()?'No shelves yet. OA Overview saves each rival’s shelf on its next fetch, or add a list below.':'Cloud is off in the sandbox, so OA Overview’s rival shelves are not here. Paste a list of ASINs below to try the screen.'}</span></div>`}
    ${doneRows.length?`<div class="auarchbar audonebar"><span>✓ ${doneRows.length} rival${doneRows.length===1?'':'s'} up to date — nothing left to judge · back up here by themselves when they list something new</span><button class="btn ghost sm" id="auShowDone" type="button">${auView.showDone?'Hide them':'Show them'}</button></div>
      ${auView.showDone?`<div class="auarchlist">${doneRows.map(x=>`<div class="auarchrow"><span class="auav sm" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span><b>${escapeHtml(x.sh.name)}</b><span class="ssub">${x.c.all.toLocaleString()} products · last audited ${escapeHtml(auUk(x.la))}</span><button class="btn ghost sm" type="button" data-open="${escapeHtml(x.sh.id)}">Open →</button></div>`).join('')}</div>`:''}`:''}
    ${archRows.length?`<div class="auarchbar"><span>${archRows.length} rival${archRows.length===1?'':'s'} archived — not in the counts or "carry on"</span><button class="btn ghost sm" id="auShowArch" type="button">${auView.showArch?'Hide them':'Show them'}</button></div>
      ${auView.showArch?`<div class="auarchlist">${archRows.map(x=>{const cut=audFromDay(),n=x.sh.items.filter(it=>!it.base&&String(it.first||'')>=cut).length;   /* b317: what coming back would bring */
        return`<div class="auarchrow"><span class="auav sm" style="background:${auAv(x.sh.name)}">${auIni(x.sh.name)}</span><b>${escapeHtml(x.sh.name)}</b><span class="ssub">${x.sh.items.length.toLocaleString()} products · <b>${n.toLocaleString()}</b> listed in the last ${AUD_FROM_DAYS} days</span><button class="btn ghost sm" type="button" data-unarch="${escapeHtml(x.sh.id)}" title="Back in the audit with only what they listed since ${escapeHtml(ukDate(cut))} — everything older is OLD DATA">Bring back · last ${AUD_FROM_DAYS} days (${n.toLocaleString()})</button></div>`;}).join('')}</div>`:''}`:''}
    <details class="auadd"><summary>Add a shelf that is not on the list</summary>
    <div class="ausplit">
      <div class="aubox"><h3>Pull any storefront</h3><p class="ssub">A seller who is not on OA Overview's list. Keepa returns their whole shelf through your Worker.</p>
        <div class="row"><input class="txt" id="auSeller" placeholder="Seller ID, e.g. A3P5ROKL5A1OLE" autocomplete="off"><button class="btn solid sm" id="auPull" type="button">Pull · about 10 tokens</button></div></div>
      <div class="aubox"><h3>Audit a list of ASINs</h3><p class="ssub">Paste ASINs, or drop any Keepa export here. An export brings the titles and pictures with it, free.</p>
        <div class="row"><input class="txt" id="auName" placeholder="Name this list" autocomplete="off" style="max-width:170px"><textarea class="txt" id="auAsins" placeholder="B0CNXZYW75, B07X63KLLH …" rows="2"></textarea><button class="btn solid sm" id="auAdd" type="button">Start</button></div>
        <div class="audrop" id="auDrop">Drop a Keepa export here</div><input type="file" id="auFile" accept=".csv,text/csv" multiple hidden></div>
    </div></details></div>`;
  /* b174: the same page twice is not drawn twice — a redraw with nothing new used to blink every card and donut */
  const host=$('#page-audit');if(auView._listHtml===h&&host.querySelector('.card'))return;auView._listHtml=h;host.innerHTML=h;}

function auVisible(sh){const V=audAll();const q=auView.q.toLowerCase();const tab=auView.tab[sh.id]||'todo';const O=auOurs();
  /* b141 (Jack, 22 Sep: "how is highest ticket first showing a 16 pound lead?"). The order is frozen on purpose so rows
     do not leap about as you judge them — but it was frozen BEFORE the prices arrived, so "dearest first" ranked a shelf
     where almost every price was still 0. It now re-freezes when the sort, the tab or the number of loaded prices changes.
     Judging changes none of those, so the list still holds still while you work. */
  const AU_SORTF={price:'price',cheap:'price',sold:'mo',rank:'rank',few:'sellers',many:'sellers',title:'title'};
  const kf=AU_SORTF[auView.sort];   /* count only what THIS sort reads, so the order re-freezes the moment those numbers land */
  const known=kf?sh.items.filter(it=>{const p=audState.prod[it.a];if(!p)return false;
    return kf==='sellers'?!!(+p.fba||+p.offers):(kf==='title'?!!p.title:!!+p[kf]);}).length:sh.items.length;
  const osig=[sh.id,auView.sort,tab,known].join('|');
  if(auView._osig!==osig){auView.order=null;auView._osig=osig;}
  if(!auView.order){const P=audState.prod;const num=(a,f)=>{const x=P[a.a]||{};return +x[f]||0;};
    const by={shelf:(a,b)=>String(b.first||'').localeCompare(String(a.first||'')),
      sold:(a,b)=>num(b,'mo')-num(a,'mo'),price:(a,b)=>num(b,'price')-num(a,'price'),
      cheap:(a,b)=>(num(a,'price')||1e9)-(num(b,'price')||1e9),
      rank:(a,b)=>(num(a,'rank')||1e9)-(num(b,'rank')||1e9),
      few:(a,b)=>((num(a,'fba')||num(a,'offers')||1e9)-(num(b,'fba')||num(b,'offers')||1e9)),
      many:(a,b)=>((num(b,'fba')||num(b,'offers')||0)-(num(a,'fba')||num(a,'offers')||0)),
      title:(a,b)=>String((P[a.a]||{}).title||a.a).localeCompare(String((P[b.a]||{}).title||b.a))}[auView.sort]||((a,b)=>0);
    const o=sh.items.slice().sort((a,b)=>{const sa=audStatus(V[a.a],audSells(sh.id,a.a))==='todo'?0:1,sb=audStatus(V[b.a],audSells(sh.id,b.a))==='todo'?0:1;
      return (sa-sb)||by(a,b);});auView.order={};o.forEach((it,i)=>auView.order[it.a]=i);}
  const list=sh.items.filter(it=>{const od=audIsOld(it,sh);if(tab==='old')return od;if(od)return false;   /* b291 */
    const st=audStatus(V[it.a],audSells(sh.id,it.a));
    if(tab==='todo'&&st!=='todo'&&!auView.stay.has(it.a))return false;
    if(tab==='had'&&!O[it.a])return false;
    if(tab==='sell'&&!(audSells(sh.id,it.a)||st==='joint'))return false;
    if(audType(tab)&&st!==tab&&!(tab==='joint'&&st==='jointauto'))return false;
    const p=audState.prod[it.a]||{};const pr=+p.price||0,mo=+p.mo||0;
    if(auView.band==='u10'&&!(pr&&pr<10))return false;   /* b159: the "under" filters only keep products whose number is KNOWN — a bulk Not lead must never sweep up an unloaded row */
    if(auView.band==='a'&&!(pr&&pr<20))return false;
    if(auView.band==='b'&&!(pr>=20&&pr<60))return false;
    if(auView.band==='c'&&!(pr>=60))return false;
    if(/^u\d+$/.test(auView.vol)){if(!(p.mo!=null&&p.mo!==''&&mo<+auView.vol.slice(1)))return false;}
    else if(+auView.vol>0&&!(mo>=+auView.vol))return false;
    const sellers=+p.fba||+p.offers||0;
    if(+auView.sellers>0&&sellers&&sellers>=+auView.sellers)return false;   /* unknown counts stay: they are not "many sellers", they are "not loaded" */
    if(auView.ofl&&auView.ofl!=='0'&&!audIsVA()&&!auOflKeep(it.a,auView.ofl))return false;   /* b301 */
    if(q){if(!((it.a+' '+(p.title||'')+' '+(p.brand||'')).toLowerCase().includes(q)))return false;}return true;});
  list.sort((a,b)=>(auView.order[a.a]==null?1e9:auView.order[a.a])-(auView.order[b.a]==null?1e9:auView.order[b.a]));
  return list;}
/* b301 (Jack, 14 Oct: "if they add 20 leads I'm thinking wow, they're sourcing good leads and loads of them — they might have been cut, but at
   least I know"). One line over the list: of what is showing, how many our filters had as a lead, had and cut (money / blacklisted brand /
   other), never had at all, and are still a lead today. Each number filters the list; pressing it again shows everything. Jack's page only. */
function auOflWhy(w){w=String(w||'');return/blacklist/i.test(w)?'black':/ROI|profit|under the £|% off|scored \d+|bar:/i.test(w)?'money':'other';}
function auOflKeep(a,f){if(f==='now')return!!(audNowAll()[a]||{}).lead;if(f==='oa'){const v=typeof oaVerdict==='function'?oaVerdict(a):null;return!!v&&(v.k==='lead'||v.k==='maybe');}   /* b321 */
  if(/^why-/.test(f)){const it=auItemOf(a),w=typeof audWhyInfo==='function'?audWhyInfo(a,it&&!it.base?it.first||'':''):null;if(!w)return false;const k=f.slice(4);   /* b313 */
    if(k==='mera'||k==='suz')return w.k==='person'&&w.who.length===1&&w.who[0]===(k==='mera'?'Mera':'Suz');if(k==='both')return w.k==='person'&&w.who.includes('Mera')&&w.who.includes('Suz');
    if(k==='stale')return/really run since/.test(w.txt);if(k==='none')return w.k==='none'||w.k==='block';return w.k===k;}const h=typeof audHistInfo==='function'?audHistInfo(a):null;
  if(f==='wait')return!h;if(!h)return false;if(f==='cut-money'||f==='cut-black'||f==='cut-other')return h.k==='cut'&&'cut-'+auOflWhy(h.why)===f;
  if(f==='never-bl')return h.k==='never'&&!!audNeverWhy(a);   /* b310 */
  return h.k===f;}
function auOflSum(sh){if(audIsVA()||!(typeof isJack==='function'&&isJack())||typeof audHistInfo!=='function')return'';
  const was=auView.ofl;auView.ofl='0';const L=auVisible(sh);auView.ofl=was;if(!L.length)return'';
  const c={kept:0,cut:0,never:0,wait:0,now:0,oa:0,'cut-money':0,'cut-black':0,'cut-other':0,'never-bl':0},N=audNowAll();
  L.forEach(it=>{const h=audHistInfo(it.a);if(!h)c.wait++;else{c[h.k]++;if(h.k==='cut')c['cut-'+auOflWhy(h.why)]++;if(h.k==='never'&&audNeverWhy(it.a))c['never-bl']++;}if((N[it.a]||{}).lead)c.now++;const ov=typeof oaVerdict==='function'&&oaWants(it.a)?oaVerdict(it.a):null;if(ov&&(ov.k==='lead'||ov.k==='maybe'))c.oa++;});
  const b=(f,cls,txt,tip)=>`<button type="button" class="ofsb ${cls}${auView.ofl===f?' on':''}" data-ofl="${f}" title="${escapeHtml(tip+(auView.ofl===f?' · press again to show everything':' · press to show only these'))}">${txt}</button>`;
  const sub=[c['cut-money']?b('cut-money','cut sub',`${c['cut-money']} on money`,'Cut because the money did not work that day (ROI / profit too low)'):'',c['cut-black']?b('cut-black','cut sub',`${c['cut-black']} blacklisted brand`,'Cut because the brand is on our blacklist'):'',c['cut-other']?b('cut-other','cut sub',`${c['cut-other']} other`,'Cut for another reason — sales, category, plug, no sell price'):''].filter(Boolean).join('');
  /* b313: why we missed them — the same buttons, by the plain reason (Jack: "how and why did we miss this") */
  const W={found:0,person:0,mera:0,suz:0,both:0,rules:0,none:0,stale:0};L.forEach(it=>{const w=audWhyInfo(it.a,it.base?'':it.first||'');if(!w)return;W[w.k==='block'?'none':w.k]++;
    if(w.k==='person'){const m=w.who.includes('Mera'),s=w.who.includes('Suz');if(m&&s)W.both++;else if(m)W.mera++;else if(s)W.suz++;}if(/really run since/.test(w.txt))W.stale++;});
  const whyRow=`<div class="auofsum auwhysum"><span class="l">Why we missed these</span>
    ${b('why-person','w-person',`<b>${W.person}</b> our lead, not taken`,'One of our filters had it as a lead and nobody put it on the lead sheet')}${W.person?`<span class="ofsubs">${W.mera?b('why-mera','w-person sub',`Mera ${W.mera}`,'Mera\u2019s lead only'):''}${W.suz?b('why-suz','w-person sub',`Suz ${W.suz}`,'Suz\u2019s lead only'):''}${W.both?b('why-both','w-person sub',`both ${W.both}`,'Mera and Suz both had it as a lead'):''}</span>`:''}
    ${b('why-rules','w-rules',`<b>${W.rules}</b> our rules cut`,'In our export, the rules cut it')}
    ${b('why-none','w-none',`<b>${W.none}</b> no filter had it`,'None of our filters ever had it')}
    ${b('why-found','w-found',`<b>${W.found}</b> found — on a lead sheet`,'On Mera\u2019s or Suz\u2019s lead sheet')}
    ${W.stale?b('why-stale','w-stale',`<b>${W.stale}</b> filter not really run`,'The filter that had it has only run on wrong files since'):''}</div>`;
  return whyRow+`<div class="auofsum"><span class="l">Our filters on these ${L.length.toLocaleString()}</span>
    ${b('kept','kept',`<b>${c.kept}</b> were our leads`,'One of our filters kept it as a lead')}
    ${b('cut','cut',`<b>${c.cut}</b> we had and cut`,'In one of our exports, cut by the rules')}${sub?`<span class="ofsubs">${sub}</span>`:''}
    ${b('never','never',`<b>${c.never}</b> never in our exports`,'None of our filter or brand exports had it')}${c['never-bl']?`<span class="ofsubs">${b('never-bl','never sub',`${c['never-bl']} our own brand blocks`,'Never exported because the brand is on our blacklist or blocked in our Keepa filters')}</span>`:''}
    ${c.now?b('now','now',`<b>★ ${c.now}</b> still a lead today`,'Your filter maths on today\u2019s Keepa numbers says it is a lead now'):''}
    ${c.oa?b('oa','oa',`<b>🛒 ${c.oa}</b> OA lead${c.oa===1?'':'s'} at a shop`,'Not a lead on Amazon UK, but a UK shop on Google Shopping has it cheap enough once your code is off'):''}
    ${c.wait?`<span class="ofsw" title="Our export records for these are still loading (or the cloud is off here)">${c.wait} still checking…</span>`:''}</div>`;}
const AU_LINK_ICON={amazon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h2l2.4 10.5a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 9H7"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>',
  keepa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 4-6 5 4"/><path d="M3 21h18"/></svg>',
  sas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M9 11h4M11 9v4"/></svg>'};
/* b81 (Jack, 17 Sep): "can we have a mini tile for if things were found via our brand or filter thingy".
   The chip already knew it was ours; it just would not say WHICH of ours. Now it names the source and
   wears that person's colour, so a shelf reads at a glance: purple dot = Mera found it, yellow = Suz.
   Source names are long ("Mera · electricals £60+"), so the owner half is dropped — the dot says who. */
function auSrcShort(name){const s=String(name||'').trim();
  const i=s.indexOf('\u00b7');                       /* "Suz · A2A £10-40" -> "A2A £10-40" */
  let out=(i>=0?s.slice(i+1):s).trim();
  out=out.replace(/\s*\((retired|weak|dead)\)\s*$/i,'').trim();
  return out.length>22?out.slice(0,21).trim()+'\u2026':out;}
/* b82 (Jack, 17 Sep): "what if it was on the filter or brands that was ran and stored as being a lead but
   we haven't sold it or bought it — that way i can see how and why the analysis was right or wrong".
   This is the feedback loop the app never had. A rival is selling the thing we found and passed on, so the
   one number that settles it is TODAY'S price against the sell price the rule promised at the time.
   Nothing here is a rule. It reports, it does not judge, and it never changes a lead. */
function auReview(o,nowPrice){
  if(!o||!o.sell)return null;
  if(!(nowPrice>0))return{tone:'flat',line:'No price on their shelf yet, so there is nothing to check it against.'};
  const sell=+o.sell,buy=+o.buy||0,gap=nowPrice/sell;
  const spread=buy?r2(nowPrice-buy):null;
  const over=Math.round((1-gap)*100);        /* + = our sell was above today */
  let tone,line;
  if(gap>=0.95&&gap<=1.15){tone='good';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — that call held.`;}
  else if(gap>1.15){tone='good';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — we were ${Math.round((gap-1)*100)}% UNDER, the lead was better than we scored it.`;}
  else if(gap>=0.5){tone='warn';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — ${over}% high, so the ROI we quoted was flattering.`;}
  else {tone='bad';line=`The rule said sell ${gbp(sell)} and it is ${gbp(nowPrice)} today — ${gap?(1/gap).toFixed(1):'?'}\u00d7 out. That ROI never existed.`;}
  const now=buy?(spread>0
      ?`At ${gbp(buy)} buy and ${gbp(nowPrice)} sell that is ${gbp(spread)} gross a unit before fees.`
      :`At ${gbp(buy)} buy it loses ${gbp(Math.abs(spread))} a unit at today's price before any fees — passing was right.`):'';
  return{tone,line,now};
}
function auLinks(asin){return[['Amazon','https://www.amazon.co.uk/dp/'+asin,'O','amazon'],['Keepa','https://keepa.com/#!product/2-'+asin,'K','keepa'],['SellerAmp','https://sas.selleramp.com/sas/lookup?search_term='+asin,'S','sas']]
    .map(([l,h,key,ic])=>`<a class="aulk ${ic}" href="${h}" target="_blank" rel="noopener" title="Open on ${l} · key ${key}" data-stop>${AU_LINK_ICON[ic]}<span>${l}</span></a>`).join('');}
function auRow(it,i,sh){const V=audAll();let v=V[it.a];const vOld=audExpired(v)?v:null;if(vOld)v=null;   /* b163: an expired answer shows as a chip, not as the answer */
  const p=audState.prod[it.a]||{};const sells=audSells(sh.id,it.a);const st=audStatus(v,sells);
  const o=auOurs()[it.a];const t=audType(st);const newShelf=!it.base&&auDays(it.first)<=14;
  /* b166 (Jack, 26 Sep: "everything is jumping around", "I wanna be able to open and click SAS and stuff", "rows are too small to
     bulk edit", "can't read grey on black"). ONE row, ONE size: tick · picture · title and facts · Amazon / Keepa / SellerAmp ·
     the seven answers — on every row, whether or not the mouse is over it, so nothing appears, grows or shifts under your hand.
     b167 (Jack, live on b166: "they are all confusing buttons — write what they are"; "prefer the thicker rows with the 1–7 buttons
     under it, then the right of the row says the result when it has one"; "make the whole row the colour once it's had the
     decision"). So: line one is the title, the facts and the three sites by name; line two is the seven answers by name, and at
     its right end the result — what, why, who, when. A judged row is tinted in its answer's colour (--edge), the lit button too. */
  const elsewhere=v&&v.seller_id&&sh.seller&&v.seller_id!==sh.seller;
  const fromShelf=elsewhere?((audShelf(v.seller_id)||{}).name||v.seller_id):'';
  const why=audMineWhy(it.a,sh.id);
  const sug=!v&&st==='todo'&&typeof audSuggest==='function'?audSuggest(it):null;   /* b318: the answer the facts point to — Enter takes it */
  const btns=audPick().map((x,n)=>{const auto=st==='jointauto'&&x.code==='joint';const on=auto||(v&&v.verdict===x.code);const sg=!!(sug&&sug.code===x.code);
    const tip=auto?({now:'On your storefront now',list:'On the inventory list you pasted',recent:'Your storefront last had it on '+audMineLastNice(it.a)+(audAddedNice(sh.id,it.a)?'; '+sh.name+' added it on '+audAddedNice(sh.id,it.a):'')+' — inside your '+audJointDays()+' days, so it is Joint'}[why]||'On OA Overview’s overlap for this rival')
      :on?x.label+' · '+(v.who==='auto'?'marked for you':v.who+' · '+auUk(v.at))+(v.reason?' · '+v.reason:'')+(v.note?' · '+v.note:'')+' · press again to change'
      :sg?`Suggested — ${sug.why} · press Enter (or key ${auKey(n)})`:x.label+' · key '+auKey(n);
    return`<button type="button" class="aub${on?' on':''}${auto?' auto':''}${sg?' sug':''}" style="--c:${x.hex}" data-v="${x.code}" data-a="${it.a}" title="${escapeHtml(tip)}"><kbd>${sg?'↵':auKey(n)}</kbd>${AU_ICON[x.icon]||''}<span class="lab">${escapeHtml(x.short||x.label)}</span></button>`;}).join('');
  /* b141: the reason chips take the buttons' place instead of opening a new line under them, so the row keeps its height */
  const reasons=v&&audType(v.verdict)&&audType(v.verdict).reasons&&!v.reason
    ?`<div class="aureasons" style="--c:${audType(v.verdict).hex}">${audType(v.verdict).prompt||'Why?'}${audType(v.verdict).reasons.map((x,n)=>`<button type="button" class="aurs ${v.reason===x?'on':''}" data-r="${escapeHtml(x)}" data-a="${it.a}"><kbd>${AU_RKEYS[n].toUpperCase()}</kbd>${escapeHtml(x)}</button>`).join('')}</div>`:'';
  /* the result, at the right end of the answers line: what · why · who · when */
  const tv=v?audType(v.verdict):null;
  const mark=v&&tv?`<span class="aumark" style="--c:${tv.hex}" title="${escapeHtml(tv.label+' · '+(v.who==='auto'?'marked for you':v.who+' · '+auUk(v.at))+(v.reason?' · '+v.reason:'')+(v.note?' · '+v.note:'')+(elsewhere?' · you gave this answer on '+fromShelf+' — one answer per product, it shows on every shelf':''))}"><i class="sq"></i>${escapeHtml(tv.short||tv.label)}${v.reason?' · '+escapeHtml(v.reason):''}<span class="who${v.who==='auto'?'':' date'}">${v.who==='auto'?'marked for you':auUk(v.at)}</span>${elsewhere?`<i class="auelse">on ${escapeHtml(auSrcShort(fromShelf))}</i>`:''}</span>`
    :st==='jointauto'?`<span class="aumark" style="--c:#2CE38B" title="${escapeHtml({now:'On your storefront now',list:'On the inventory list you pasted',recent:'Your storefront last had it on '+audMineLastNice(it.a)+' — inside your '+audJointDays()+' days, so it is Joint'}[why]||'On OA Overview’s overlap for this rival')}"><i class="sq"></i>${escapeHtml(audIsVA()?'We sell this':(AUD_MINE_WORDS[why]||'You sell this'))}${why==='recent'?' · until '+escapeHtml(audMineLastNice(it.a)):''}<span class="who">auto</span></span>`:'';
  const ourChip=o?(o.said==='Yes'?`<span class="aupill p-yes src" title="${escapeHtml('Found by '+o.src+' · '+o.day+' · score '+(o.score||0))}"><i class="sq" style="background:${auAv(o.owner||o.saidBy||'VAs')}"></i>${escapeHtml(auSrcShort(o.src))} · ${escapeHtml(o.saidBy||'we')} said Yes</span>`
      :`<span class="aupill p-had src" title="${escapeHtml('Found by '+o.src+' · '+o.owner+' · '+o.day+' · score '+(o.score||0)+' · buy '+gbp(o.buy)+' → sell '+gbp(o.sell)+' · '+(o.roi||0)+'% ROI'+(o.runs>1?' · seen on '+o.runs+' runs':''))}"><i class="sq" style="background:${auAv(o.owner||'VAs')}"></i>${escapeHtml(auSrcShort(o.src))}${o.roi!=null&&o.roi!==''?' · '+o.roi+'%':''}${o.said?' · they said '+escapeHtml(o.said):' · nobody said Yes'}</span>`):'';
  const links=auLinks(it.a);
  const sellers=+p.fba||+p.offers||0;
  /* b141: a missing price now says which kind of missing it is, instead of showing nothing at all */
  const priceBit=p.price?`<b class="aup">${gbp(p.price)}</b>${p.pricefrom==='3p'?'<i class="aupf p3" title="No Buy Box and Amazon is not selling it — this is the cheapest live third-party offer">3P</i>':p.pricefrom==='amz'?'<i class="aupf amz" title="No Buy Box — this is Amazon’s own price">AMZ</i>':''}`
    :(p.asked||p.source?'<i class="aunop" title="Keepa has no Buy Box, no Amazon and no live offer for this ASIN right now">no price on Keepa</i>':'<i class="aunop dim" title="The title, picture and price have not been fetched yet — they load by themselves while you work, as Keepa tokens allow">details on their way</i>');
  /* b141: short units so the whole line fits one row at laptop width — "1,000/mo" not "1,000 a month" */
  const money=[priceBit,p.rank?`<span class="aurk">#${(+p.rank).toLocaleString()}</span>`:'',p.mo?`<b class="aumo">${(+p.mo).toLocaleString()}/mo</b>`:'',sellers?`<span class="ausl">${sellers}${sellers===1?' seller':' sellers'}</span>`:''].filter(Boolean).join('<i class="sep">·</i>');
  const landed=auView.landed&&auView.landed.a===it.a&&Date.now()-auView.landed.at<600?' landed':'';
  const old=why==='before'?`<span class="aupill p-had" title="Your storefront last had it on ${escapeHtml(audMineLastNice(it.a))}. ${escapeHtml(sh.name)} added it ${audAddedNice(sh.id,it.a)?'on '+escapeHtml(audAddedNice(sh.id,it.a)):'later'} — more than ${audJointDays()} days after — so it's new to check">You had it until ${escapeHtml(audMineLastNice(it.a))} · they added it ${escapeHtml(audAddedNice(sh.id,it.a)||'after')}</span>`:'';
  const again=vOld?`<span class="aupill p-had" title="${escapeHtml((audType(vOld.verdict)||{}).label+' · '+vOld.who+' · '+auUk(vOld.at)+(vOld.reason?' · '+vOld.reason:'')+' — answers like this stop counting after '+AUD_EXPIRE_DAYS+' days, in case the price has come back')}">You said ${escapeHtml((audType(vOld.verdict)||{}).short||vOld.verdict)} ${Math.round((Date.now()-new Date(vOld.at).getTime())/864e5)} days ago · check again</span>`:'';
  const sellChip=sells&&st!=='jointauto'?`<span class="aupill p-joint">${escapeHtml(AUD_MINE_WORDS[why]||'You sell this')}${why==='recent'?' · until '+escapeHtml(audMineLastNice(it.a)):''}</span>`:'';   /* the result already says it on an auto row */
  /* b239 (Jack, 3 Oct: "EXPORTED ×3 — click it for which exports, date, filter, buy, score, whose · a very obvious SUZ / MERA LEAD SHEET tile") */
  /* b288: a VA sees our-filter chips only for her own runs (never the other VA's work); Jack's answers from before 8 Oct say OLD DATA */
  const vv=v||vOld,oldData=!audIsVA()&&vv&&vv.who!=='auto'&&vv.at&&String(vv.at).slice(0,10)<AUD_VA.START?'<span class="aupill p-old" title="Answered before the Prime event audit started on 7 Oct — old data, not part of the new audit">OLD DATA</span>':'';
  const oldStock=audIsOld(it,sh)?`<span class="aupill p-old" title="${escapeHtml(audOldWhy(sh).replace(/^./,c=>c.toUpperCase()))} — OLD DATA, not part of the audit">OLD DATA</span>`:'';   /* b317: says which cut-off */
  /* b313: on Jack's page the "why we missed it" line says it all (export, whose, lead sheet) — it replaces the Our filters chip and the sheet tile */
  const whyL=typeof audWhyLine==='function'&&!audIsVA()?audWhyLine(it.a,it.base?'':it.first||''):'';
  const hist=whyL||(typeof audHistChip==='function'?audHistChip(it.a,it.base?'':it.first||''):'');   /* b300: + the day they listed it */   /* b297: which of our filters had it */
  const chips=oldStock+again+sellChip+old+(audIsVA()||whyL?'':(typeof trChips==='function'?trChips(it.a,{sheetOnly:true}):ourChip))+oldData;   /* b299: the Our filters chip has its own line */
  return`<div class="aurow ${i===auView.focus?'focus':''} ${auView.sel.has(it.a)?'sel':''} ${st!=='todo'?'judged':''}${reasons?' reasoning':''}${elsewhere?' elsewhere':''}${landed}" data-i="${i}" data-a="${it.a}" style="--edge:${st==='todo'?'var(--iris)':(t?t.hex:(st==='jointauto'?'#2CE38B':'var(--line2)'))}">
    <button type="button" class="ausel" data-sel="${it.a}" data-i="${i}" aria-label="Select ${it.a}" title="Tick to judge several at once · shift-click ticks a run · drag down the ticks"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></button>
    <div class="auimg" title="Click the picture to tick it">${p.image?`<img loading="lazy" src="${escapeHtml(p.image)}" alt="">`:escapeHtml(it.a.slice(0,2))}</div>
    <div class="aumain">
      <div class="aut" title="${escapeHtml(p.title||it.a)}">${escapeHtml(p.title||it.a)}</div>
      <div class="aufacts">
        <button type="button" class="auasin" data-copy="${it.a}" title="Copy ${it.a}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>${it.a}</button>
        ${money?`<span class="aumoney">${money}</span>`:''}
        ${(()=>{if(it.base)return`<span class="auadded old" title="It was already on their shelf when we started tracking them — we do not know the day they listed it">on their shelf before we tracked them</span>`;if(!it.first)return'';const n=auDays(it.first);   /* b320 (Jack, 6 Nov: "date it was added on storefront and how many days ago") */
          return`<span class="auadded${newShelf?' new':''}" title="The day OA Overview first saw it on their storefront">added ${escapeHtml(auUk(it.first))} · ${n<=0?'today':n===1?'yesterday':n+' days ago'}</span>`;})()}
        ${chips?`<span class="auchips">${chips}</span>`:''}
      </div></div>
    <div class="aulinks">${links}</div>
    <div class="auhistl">${hist}${audNowChips(it.a)}</div>
    <div class="aubtns">${btns}${mark}</div>${reasons}${typeof trDrop==='function'?trDrop(it.a,it.base?'':it.first||''):''}</div>`;}
function auRenderOne(){auView._listHtml=null;const sh=audShelf(auView.shelf);const c=auCounts(sh);const vis=auVisible(sh);const tab=auView.tab[sh.id]||'todo';
  if(auView.focus>=vis.length)auView.focus=Math.max(0,vis.length-1);
  const secs=auView.secs.length?auView.secs.reduce((a,b)=>a+b,0)/auView.secs.length:6;
  const la=auLastAudit(sh);const loaded=sh.items.filter(it=>audState.prod[it.a]).length;
  /* b87 (Jack: "improve these buttons"). Three jobs the old strip did badly: an empty verdict looked
     the same as a full one, the strip read as ten equal things when it is really three groups, and the
     one you are on barely stood out. Now: a colour dot only where the count means something, empty ones
     fade back, the count is a proper badge, and thin rules separate where you are / what we know / what
     you decided. The dot colour is the verdict's own, matching the 1-6 buttons on the row. */
  /* b166: the answer tabs carry their key number, so the tab row doubles as the legend for the 1–7 buttons on every row */
  const tb=(key,label,n,col,dot,k)=>`<button type="button" class="${tab===key?'on':''}${n?'':' zero'}" data-tab="${key}" style="--c:${col||'var(--muted)'}" title="${escapeHtml(label+' · '+n+(k?' · key '+k+' marks a product '+label:''))}">`
    +`${k?`<kbd>${k}</kbd>`:dot?'<i class="d"></i>':''}<span>${label}</span><b>${n}</b></button>`;
  const page=vis;auView._visLen=vis.length;   /* b160: auPageHtml decides how many are drawn */
  $('#page-audit').innerHTML=`<div class="card">
    <div class="auhead"><button class="back" id="auBack" type="button" aria-label="Back to audits">${ICONS.back}</button>
      <span class="auav" style="background:${auAv(sh.name)}">${auIni(sh.name)}</span>
      <div><h2>${escapeHtml(sh.name)}</h2><div class="meta">${c.all.toLocaleString()} products${c.old?` · ${c.old.toLocaleString()} OLD DATA (before 7 Oct)`:''} · ${la?'last audited '+auUk(la)+' ('+auAgo(la)+')':'first audit'}${sh.seller?' · seller '+escapeHtml(sh.seller):''}</div></div>
      <div class="right">${auSyncNote().replace('<span class="','<span id="auSync" class="')}
        ${sh.seller?`<a class="btn ghost sm" href="https://www.amazon.co.uk/s?me=${escapeHtml(sh.seller)}" target="_blank" rel="noopener">Their shelf</a><a class="btn ghost sm" href="https://keepa.com/#!seller/2-${escapeHtml(sh.seller)}" target="_blank" rel="noopener">Keepa seller</a>`:''}
        <button class="btn ${auView.follow?'primary':'ghost'} sm" id="auFollow" type="button" title="Opens whatever product you land on in one Keepa tab, so you never click Keepa">${auView.follow?'Keepa follows me · on':'Keepa follows me'}</button>
        <button class="btn ghost sm" id="auRest" type="button">Mark the rest Not lead</button>${(()=>{const n=auNextShelf(sh.id);return n?`<button class="btn primary sm" type="button" data-open="${escapeHtml(n.id)}" title="${escapeHtml(n.name)} · ${auCounts(n).todo} to do">Next rival →</button>`:'';})()}</div></div>
    <div class="auprog"><div class="aubar">${audTypes().map(t=>c[t.code]?`<i style="width:${c[t.code]/c.all*100}%;background:${t.hex}" title="${c[t.code]} ${escapeHtml(t.label)}"></i>`:'').join('')}</div>
      <div class="aupline"><b>${c.todo.toLocaleString()} left of ${c.all.toLocaleString()}</b><span>${c.todo?`about ${Math.max(1,Math.round(c.todo*secs/60))} min · ${c.byHand.toLocaleString()} judged${c.auto?` · ${c.auto.toLocaleString()} marked for you`:''}`:'all done'}</span>
        <span class="audet">${loaded} of ${sh.items.length} have pictures${loaded<sh.items.length?` · <button type="button" class="linkbtn" id="auViewer">Keepa Viewer (free)</button>${audIsVA()?'':' · <button type="button" class="linkbtn" id="auTokens">load with tokens</button>'}`:''}${(()=>{const n=auNowNeed(sh).length;return n?` · <button type="button" class="linkbtn" id="auNowChk" title="Runs your filter maths (UK buy → UK sell) on today's Keepa numbers. Free instead: Keepa Viewer → Export → drop the file on this page">★ still a lead today? check ${n} to do · up to ${audNowCost(auNowNeed(sh))} tokens${typeof OA!=='undefined'&&OA.ready?' + shop prices':''}</button>`:'';})()}${typeof oaBtn==='function'?oaBtn(sh):''}</span></div></div>
    <div class="aunote" id="auNote2">${auView.noteHtml||''}</div>
    <div class="autabs">${tb('todo','To do',c.todo,'var(--iris)')}${c.old?tb('old','Old data',c.old,'#9AA4B5'):''}<i class="sep"></i>${tb('had','We had it',c.had,'#93A3BC',1)}${tb('sell','You sell',c.sell,'#2CE38B',1)}<i class="sep"></i>${audPick().map((t,n)=>tb(t.code,t.short||t.label,c[t.code],t.hex,1,auKey(n))).join('')}<i class="sep"></i>${tb('all','All',c.all)}
      <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="auQ" placeholder="Search title or ASIN" value="${escapeHtml(auView.q)}" autocomplete="off"><kbd>/</kbd></label></div>
    <div class="autools"><span class="l">Order</span><select id="auSort">${AU_SORTS.map(([v,l])=>`<option value="${v}"${auView.sort===v?' selected':''}>${l}</option>`).join('')}</select>
      <span class="l">Price</span><select id="auBand"><option value="ALL"${auView.band==='ALL'?' selected':''}>Any</option><option value="u10"${auView.band==='u10'?' selected':''}>Under £10</option><option value="a"${auView.band==='a'?' selected':''}>Under £20</option><option value="b"${auView.band==='b'?' selected':''}>£20 – £60</option><option value="c"${auView.band==='c'?' selected':''}>£60+</option></select>
      <span class="l">Sells</span><select id="auVol"><option value="0"${auView.vol==='0'?' selected':''}>Any</option><option value="u20"${auView.vol==='u20'?' selected':''}>Under 20 a month</option><option value="u50"${auView.vol==='u50'?' selected':''}>Under 50 a month</option><option value="100"${auView.vol==='100'?' selected':''}>100+ a month</option><option value="500"${auView.vol==='500'?' selected':''}>500+ a month</option><option value="1000"${auView.vol==='1000'?' selected':''}>1,000+ a month</option></select>
      <span class="l">Sellers</span><select id="auSell"><option value="0"${auView.sellers==='0'?' selected':''}>Any</option><option value="3"${auView.sellers==='3'?' selected':''}>Under 3</option><option value="6"${auView.sellers==='6'?' selected':''}>Under 6</option><option value="11"${auView.sellers==='11'?' selected':''}>Under 11</option></select>
      <span class="autick">${auTickHtml(vis.length)}</span>
      <span class="autoolsn">${vis.length.toLocaleString()} shown${(()=>{if(auView.sellers==='0')return'';const n=vis.filter(it=>{const p=audState.prod[it.a]||{};return !(+p.fba||+p.offers);}).length;return n?` · ${n} with no seller count yet`:'';})()}</span></div>
    ${loaded===0&&!audAuto()?`<div class="aunodet"><div><b>These are just ASINs so far.</b> Load the titles, pictures and prices and this list becomes readable.</div>
      <div class="row"><button class="btn primary sm" id="auViewer2" type="button">Open ${Math.min(250,sh.items.length)} in the Keepa Viewer · free</button>${audIsVA()?'':`<button class="btn ghost sm" id="auTokens2" type="button">Or load them now · about ${sh.items.length} tokens</button>`}</div>
      <div class="ssub">The Viewer opens with the ASINs already in. Export all columns, then drop the file anywhere on this page.</div></div>`:''}
    ${tab==='todo'&&!c.todo&&!auView.q?auDone(sh,c):''}
    ${auOflSum(sh)}
    ${!vis.length?(tab==='todo'&&!c.todo&&!auView.q?'':'<div class="empty"><span>Nothing in this tab.</span></div>'):
      `<div class="augrid"><div class="aulist">${auPageHtml(page,sh)}</div>
        <aside class="aupanel">${auPanel(vis[auView.focus],sh)}</aside></div>`}
    <div class="aukeys"><span><kbd>1</kbd>–<kbd>${Math.min(9,audPick().length)}</kbd>${audPick().length>9?' · <kbd>0</kbd> Old':''} judge</span><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>X</kbd> tick · <kbd>⇧↓</kbd> tick a run</span><span><kbd>G</kbd> back to the next one waiting</span><span><kbd>U</kbd> undo</span><span><kbd>O</kbd><kbd>K</kbd><kbd>S</kbd> Amazon · Keepa · SellerAmp</span><span><kbd>/</kbd> search</span></div></div>`;
  /* b92 (Jack: "isn't smooth at all - very very jumpy"). Judging changes a row's height — the six
     buttons appear, a reason row opens, both close again — and every row below it jumped. The list is
     re-rendered wholesale, so the cure is to pin the row you are ON: remember where it sat on screen
     before the render and scroll by exactly the difference after it. The page then never moves under
     your hand, however much the row grows. scrollIntoView only ran when the row left the viewport,
     which is why it felt fine sometimes and awful others. */
  /* b99 (Jack: "it's jittering when i press discord now"). b92 corrected the scroll on EVERY render and
     stored the result as the next target. The panel's Keepa graph arrives a moment later, the page grows,
     another render lands — and each one tried to re-pin against a target it could no longer reach, so it
     nudged, and nudged again. The correction is now armed only by an actual keypress, runs ONCE after the
     browser has laid the page out, and disarms itself. Renders that nobody asked for leave the scroll alone. */
  /* b166: a full redraw scrolls only for a key you just pressed, or the moment a shelf opens (to land on its first product).
     Redraws that arrive by themselves — details landing, a refresh — leave the page exactly where you scrolled it. */
  const f=document.querySelector('.aurow.focus');
  if(f&&(auKeyed()||auView.opened)){auView.keyAt=0;
    const top=f.getBoundingClientRect().top;
    if(top<0||top>innerHeight-120)f.scrollIntoView({block:'nearest',behavior:'auto'});}
  auView.opened=false;
  auWatchMore();const cur=vis[auView.focus];if(cur)auLoadGraph(cur.a,vis[auView.focus+1]&&vis[auView.focus+1].a);}
/* b71: the price graph. Keepa's free chart is limited by IP address, and when it trips it returns a small PNG that says
   "blocked" rather than an error — so a real chart is judged by its width, never by onload alone. It loads only for the
   product you are sitting on, after a moment, and a chart already fetched is reused. */
const AU_GRAPH={cache:{},pending:{},worker:null,MAX_FREE:6,free:0};
const AU_GRAPH_Q='domain=2&range=90&width=600&height=230&amazon=1&new=1&bb=1&salesrank=1';
/* Keepa's free chart is limited by IP address and, when it trips, answers with a small PNG that reads "blocked" rather than
   failing — so a chart is judged by its size. The Worker's chart costs about 1 token and does not care about the address,
   so that is tried first once the Worker knows the route. */
async function auFetchGraph(asin){
  if(AU_GRAPH.worker!==false&&!audIsVA()){try{   /* b288: the Worker chart costs a token — not for a VA */
      const r=await fetch(`${WORKER}/keepa?path=graphimage&asin=${asin}&${AU_GRAPH_Q}`);
      const ct=r.headers.get('content-type')||'';
      if(r.ok&&/image/.test(ct)){const b=await r.blob();if(b.size>8000){AU_GRAPH.worker=true;return URL.createObjectURL(b);}}
      else AU_GRAPH.worker=false;   /* the Worker does not allow this route yet */
    }catch(e){AU_GRAPH.worker=false;}}
  if(AU_GRAPH.free<AU_GRAPH.MAX_FREE){AU_GRAPH.free++;
    const url=`https://graph.keepa.com/pricehistory.png?asin=${asin}&domain=co.uk&${AU_GRAPH_Q.replace('domain=2&','')}`;
    const ok=await new Promise(res=>{const img=new Image();img.onload=()=>res(img.naturalWidth>=400?url:null);img.onerror=()=>res(null);img.src=url;});
    if(ok)return ok;}
  return null;}
let auGraphT=null;
/* b160 (Jack: "look at the graph and move on quickly"): a graph already fetched shows at once, and the next product's graph is
   fetched while you look at this one — going down the list in order costs nothing extra, it just arrives before you do. */
function auPrefetchGraph(asin){if(!asin||AU_GRAPH.cache[asin]!==undefined||AU_GRAPH.pending[asin])return;AU_GRAPH.pending[asin]=1;
  auFetchGraph(asin).then(u=>{AU_GRAPH.cache[asin]=u||false;delete AU_GRAPH.pending[asin];}).catch(()=>{delete AU_GRAPH.pending[asin];});}
function auGraphShow(box,url){box.classList.add('has');box.classList.remove('stale');box.innerHTML=`<img class="augin" src="${url}" alt="Keepa price history">`;auView.lastGraph=url;}
function auLoadGraph(asin,next){clearTimeout(auGraphT);if(!asin)return;
  const box0=$('#auGraph');if(box0&&box0.dataset.a===asin&&AU_GRAPH.cache[asin]){if(!box0.classList.contains('has')||box0.classList.contains('stale'))auGraphShow(box0,AU_GRAPH.cache[asin]);else auView.lastGraph=AU_GRAPH.cache[asin];setTimeout(()=>auPrefetchGraph(next),250);return;}
  auGraphT=setTimeout(async()=>{const box=$('#auGraph');if(!box||box.dataset.a!==asin)return;
    if(AU_GRAPH.cache[asin]===false){box.classList.remove('has','stale');box.innerHTML=auGraphFallback(asin);return;}
    if(AU_GRAPH.cache[asin]){auGraphShow(box,AU_GRAPH.cache[asin]);return;}
    if(!box.classList.contains('stale'))box.innerHTML='<span class="auglab">Loading the price history…</span>';   /* b173: a faded last graph stays up while this one comes */
    const url=AU_GRAPH.pending[asin]?await new Promise(res=>{const w=()=>AU_GRAPH.pending[asin]?setTimeout(w,120):res(AU_GRAPH.cache[asin]||null);w();}):await auFetchGraph(asin);AU_GRAPH.cache[asin]=url||false;
    const b=$('#auGraph');if(!b||b.dataset.a!==asin)return;auPrefetchGraph(next);
    if(url)auGraphShow(b,url);
    else{b.classList.remove('has','stale');b.innerHTML=auGraphFallback(asin,AU_GRAPH.worker===false?'Charts need one line adding to your Keepa Worker — the file is in Downloads.':'Keepa is holding the free charts back for a moment.');}},250);}
function auGraphFallback(asin,why){return`<span class="auglab">${why?escapeHtml(why)+' ':''}<a class="aulk keepa" href="https://keepa.com/#!product/2-${asin}" target="_blank" rel="noopener" data-stop>Open the full graph on Keepa <kbd>K</kbd></a></span>`;}
function auPanel(it,sh){if(!it)return'<div class="empty"><span>Pick a product.</span></div>';const p=audState.prod[it.a]||{};
  if(!p.title)return`<div class="aupimg none">${escapeHtml(it.a.slice(0,2))}</div><h3>${it.a}</h3>
    <div class="ssub">No details loaded yet, so there is nothing to look at here. Load them once and every audit after this is instant.</div>
    <div class="aulinksbig" style="margin-top:12px">${auLinks(it.a)}</div>
    ${(()=>{const o=auOurs()[it.a];return o?`<div class="ausec"><div class="h">On our filters</div><div class="auours ${o.said==='Yes'?'yes':''}"><b>${o.said?escapeHtml((o.saidBy||'we')+' said '+o.said):'Was a lead · nobody said Yes'}</b><div>${escapeHtml(o.src||'')} · ${auUk(o.day)}${o.score?' · score '+o.score:''}</div></div></div>`:'';})()}`;const v=audGet(it.a);const o=auOurs()[it.a];
  const also=audShelfList().filter(x=>x.id!==sh.id&&x.items.some(y=>y.a===it.a)).map(x=>x.name);
  const fact=(k,val)=>`<div><div class="k">${k}</div><div class="v">${val}</div></div>`;
  /* b160: the graph is what Jack reads — it comes first and big; the picture shrinks to a thumbnail beside the title */
  /* b173 (Jack, 27 Sep: "still see a flash of that grey box"). The panel is rebuilt on every move, and the graph box came back empty
     until the new graph arrived. Now it starts with this product's graph if we have it, or the last graph faded with a small
     "loading" tag, and the new one fades in over it. */
  const gHave=AU_GRAPH.cache[it.a],gPrev=auView.lastGraph;
  const gInner=gHave?`<img src="${gHave}" alt="Keepa price history">`:gPrev?`<img src="${gPrev}" alt=""><span class="augwait">Loading this graph…</span>`:'';
  return`<div class="ausec aug1"><div class="augraph big${gHave?' has':gPrev?' has stale':''}" id="auGraph" data-a="${it.a}">${gInner}</div></div>
    <div class="auphead"><div class="aupimg sm ${p.image?'':'none'}">${p.image?`<img src="${escapeHtml(p.image)}" alt="">`:escapeHtml(it.a.slice(0,2))}</div>
      <div><h3>${escapeHtml(p.title||it.a)}</h3><div class="ssub">${escapeHtml(p.brand||'')}${p.root?' · '+escapeHtml(p.root):''} · ${it.a}</div></div></div>
    <div class="aufgrid">${fact('Buy Box',gbp(p.price))}${fact('Sales rank',p.rank?'#'+(+p.rank).toLocaleString():'—')}${fact('Bought / month',p.mo?(+p.mo).toLocaleString():'—')}
      ${fact('Sellers on it',(p.fba||p.offers)||(p.asked?'none listed':'<span class="pend">loading\u2026</span>'))}${fact('On their shelf',it.base?'<span title="On the shelf since before OA Overview started watching it">Day 1</span>':auDays(it.first)+'d')}${fact('Other shelves',also.length)}</div>
    <div class="aulinksbig sticky">${auLinks(it.a)}</div>
    <div class="ausec"><div class="h">${audIsVA()?'Our filters':'Our filters &amp; brands'}</div>${audIsVA()?(typeof audHistChip==='function'?audHistChip(it.a,it.base?'':it.first||'')||'<div class="ssub">Checking our exports…</div>':''):`<div class="trdrop inpanel">${typeof trTimeline==='function'?trTimeline(it.a,{seen:trState.seen[it.a]||[],listed:it.base?'':it.first||''}):''}</div>`}   <!-- b299 -->${audIsVA()?'</div><div hidden>':''}${o?`<div class="auours ${o.said==='Yes'?'yes':''}"><b>${o.said?escapeHtml((o.saidBy||'we')+' said '+o.said):'Was a lead · nobody said Yes'}</b>
      <div>${escapeHtml(o.src||'')} · ${escapeHtml(o.owner||'')} · ${auUk(o.day)} · ${o.runs} run${o.runs===1?'':'s'}${o.score?' · score '+o.score:''}${o.buy?' · buy '+gbp(o.buy)+' → sell '+gbp(o.sell)+' · '+o.roi+'% ROI':''}</div>
      ${(()=>{const rv=auReview(o,+p.price);return rv?`<div class="aurev ${rv.tone}"><b>Marking our own homework</b><span>${escapeHtml(rv.line)}</span>${rv.now?`<span>${escapeHtml(rv.now)}</span>`:''}</div>`:'';})()}</div>`
      :''}</div>
    ${also.length?`<div class="ausec"><div class="h">Also sold by</div><div class="ssub">${also.map(escapeHtml).join(', ')}</div></div>`:''}
    ${audIsVA()?'':`<div class="ausec"><div class="h">Note</div><input class="txt" id="auNote" placeholder="${v?'one line, saved with the answer':'judge it first, then add a note'}" value="${escapeHtml(v&&v.note||'')}" ${v?'':'disabled'} data-a="${it.a}"></div>`}`;}   /* b296: no typing for the VAs */
/* b169 (Jack, 27 Sep: the done screen "looks a bit shit and very rigid — very jumpy"). Judging the last product used to swap the whole
   list for a card, so the page collapsed under you. Now a banner slides in above the rows you just judged, which stay where they are. */
function auDone(sh,c){const disc=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='discord');const ws=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='ws');
  const nx=auNextShelf(sh.id);
  return`<div class="audone2"><div class="tick">${CHECK}</div>
    <div class="txt"><h3>${escapeHtml(sh.name)} is done</h3><p>${c.all.toLocaleString()} products judged · ${sh.items.filter(it=>!it.base).length} appeared since we started watching · ${c.sell} you already sell</p>
      <div class="aucounts">${audTypes().map(t=>c[t.code]?`<button type="button" data-tab="${t.code}" style="--c:${t.hex}"><i style="background:${t.hex}"></i><b>${c[t.code]}</b> ${escapeHtml(t.short||t.label)}</button>`:'').join('')}</div></div>
    <div class="acts">${disc.length?`<button class="btn solid sm" id="auDisc" type="button">Open the ${disc.length} Discord one${disc.length===1?'':'s'} in Keepa</button>`:''}${ws.length?`<button class="btn solid sm" id="auWs" type="button">Copy ${ws.length} WS ASIN${ws.length===1?'':'s'}</button>`:''}${nx?`<button class="btn primary sm" type="button" data-open="${escapeHtml(nx.id)}">Next rival · ${escapeHtml(nx.name)} · ${auCounts(nx).todo} to do →</button>`:''}<button class="btn ghost sm" id="auBack2" type="button">Back to audits</button></div>
    ${auDonut(c,96)}</div>`;}

/* ============ actions and wiring ============ */
function auOpen(id){auView.pendingOpen=null;auView.mode='audit';auView.shelf=id;auView.q='';auView.limit=0;auView.order=null;auView.stay=new Set();auView.sel=new Set();auView.lastAt=0;
  location.hash='#audit='+id;const sh=audShelf(id);if(!sh)return;
  const vis=auVisible(sh);const V=audAll();const first=vis.findIndex(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo');
  const autoN=audAutoMissed(sh);if(autoN)toast(autoN+' marked Missed it for you — leads we had and never bought');
  auView.focus=Math.max(0,first);auView.opened=true;auView.noteHtml='';clearTimeout(AU_TRICKLE.t);renderAudit();
  (async()=>{const asins=sh.items.map(i=>i.a);
    await audPullProducts(asins);                                   /* what the shared cache already holds */
    if(audFillFromOurs(asins))if(auView.shelf===id)renderAudit();   /* titles from our own runs, free */
    if(auView.shelf===id)renderAudit();
    auTrickle(id);})();}
/* b166 (Jack, 26 Sep: "stuff not loading either"). The loader was all-or-nothing: 349 tokens in the bank, a floor of 250 kept for
   the VAs' runs, so a shelf needing 165 details loaded NOTHING and said so in a note at the top of the page — which he had
   scrolled past. Now it loads what the tokens allow straight away, in the order of the rows on screen, keeps the floor, and
   comes back every minute for the next batch as Keepa refills (21 a minute) until the shelf is done or you leave it. The note
   sits just above the list. "Load the rest now" is the one thing that spends past the floor, and only when Jack presses it. */
const AU_TRICKLE={t:null,busy:false};
function auNeed(sh){const seen=new Set();return auVisible(sh).filter(it=>!audIsOld(it,sh)).map(it=>it.a).concat(sh.items.filter(it=>!audIsOld(it,sh)).map(it=>it.a)).filter(a=>{if(seen.has(a))return false;seen.add(a);
  const p=audState.prod[a];return!p||p.source==='ours'||!p.asked;});}
/* b300: Jack's to-do rows with no "is it a lead today" answer from the last 3 days. Never automatic — his button (1 token each). */
function auNowNeed(sh){if(!sh||!(typeof isJack==='function'&&isJack())||audIsVA())return[];const V=audAll();
  return sh.items.filter(it=>!audIsOld(it,sh)&&!audNowFresh(it.a)&&audStatus(V[it.a],audSells(sh.id,it.a))==='todo').map(it=>it.a);}
async function auNowCheck(id){const sh=audShelf(id);const list=auNowNeed(sh);if(!list.length){toast('Every to-do row was checked in the last 3 days');return;}
  auNote(`Is it still a lead today? Checking ${list.length} on Keepa · 0 of ${list.length}`,0);
  const got=await audLoadDetails(list,true,(n,t)=>auNote(`Is it still a lead today? Checking on Keepa · ${n} of ${t}`,n/t*100),true);
  const N=audNowAll(),lead=list.filter(a=>N[a]&&N[a].lead).length;
  /* b321 (Jack, 6 Nov: "automate it as much as humanly possible"): the same press reads Google Shopping for the rows that are not a lead on Amazon UK */
  let oa=null;if(got&&typeof oaCheck==='function'&&oaNeed(list).length&&await oaReady()){const n0=oaNeed(list).length;auNote(`Shop prices on Google · 0 of ${n0}`,0);
    oa=await oaCheck(list,(n,t)=>auNote(`Shop prices on Google · ${n} of ${t}`,n/t*100));}
  auNote('');if(auView.shelf===id)renderAudit();
  toast(got?`${got} checked · ${lead} still a lead today (gold chip)${oa&&oa.n?` · ${oa.lead} OA lead${oa.lead===1?'':'s'} (green)`:''}`:'Keepa did not answer — try again in a minute',!got);}
async function auTrickle(id,force){clearTimeout(AU_TRICKLE.t);const sh=audShelf(id);if(!sh||auView.shelf!==id||auView.mode!=='audit'||AU_TRICKLE.busy)return;
  const need=auNeed(sh);if(!need.length){auNote('');return;}
  const rest=`<button type="button" class="linkbtn" id="auLoadRest">load the rest now · about ${need.length} tokens</button>`;
  if(audIsVA()){auNote(`${need.length} product${need.length===1?' has':'s have'} no picture or price yet · <button type="button" class="linkbtn" id="auViewer">open them in the Keepa Viewer (free)</button> → Export → All columns → drop the file anywhere on this page`);return;}   /* b288 */
  if(!force&&!audAuto()){auNote(`${need.length} products have no details yet · ${rest}`);return;}
  const left=await audTokensLeft();
  if(left==null){auNote(`Could not reach the Keepa Worker, so the details are not loading by themselves · <button type="button" class="linkbtn" id="auLoadRest">try again</button>`);return;}
  const batch=need.slice(0,force?need.length:Math.max(0,Math.min(AUD_AUTO_CAP,left-AUD_TOKEN_FLOOR)));
  if(!batch.length){const mins=Math.max(1,Math.ceil((AUD_TOKEN_FLOOR+Math.min(need.length,20)-left)/21));
    auNote(`${need.length} products still need details · Keepa has ${left.toLocaleString()} tokens and ${AUD_TOKEN_FLOOR} stay back for the VAs' runs · the next batch loads itself in about ${mins} min · ${rest}`);
    AU_TRICKLE.t=setTimeout(()=>auTrickle(id),60e3);return;}
  AU_TRICKLE.busy=true;
  /* b173: a handful of new lines load in a second — no box pops up for that, the rows just fill in. The note only appears for a
     real load (over 20), and the "loaded" line fades away by itself after a few seconds. */
  const loud=batch.length>20;
  try{const more=need.length>batch.length?` · ${(need.length-batch.length).toLocaleString()} more as the tokens refill`:'';
    if(loud)auNote(`Getting the pictures, prices and sales ranks from Keepa · 0 of ${batch.length}${more}`,0);
    const got=await audLoadDetails(batch,true,(n,t,landed)=>{if(loud)auNote(`Getting the pictures, prices and sales ranks from Keepa · ${n} of ${t}${more}`,n/t*100);if(auView.shelf===id)auRefresh(landed||[]);});   /* b168: no blink — only the rows that just got details repaint */
    if(auView.shelf===id&&loud)renderAudit();
    const left2=auNeed(sh).length;
    if(left2)auNote(`${left2.toLocaleString()} products still need details · the next batch loads itself in about a minute as Keepa refills · <button type="button" class="linkbtn" id="auLoadRest">load the rest now · about ${left2} tokens</button>`);
    else if(loud){auNote(`Details loaded · about ${got} tokens · <button type="button" class="linkbtn" id="auAutoOff">stop doing this automatically</button>`);
      const said=auView.noteHtml;setTimeout(()=>{if(auView.noteHtml===said)auNote('');},6000);}
    else auNote('');
    if(left2&&auView.shelf===id)AU_TRICKLE.t=setTimeout(()=>auTrickle(id),60e3);}
  finally{AU_TRICKLE.busy=false;}}
function auNote(html,pct){auView.noteHtml=(pct!=null?`<span class="auload"><i style="width:${Math.round(pct)}%"></i></span>`:'')+(html||'');
  const el=$('#auNote2');if(el)el.innerHTML=auView.noteHtml;}   /* b166: remembered, so a redraw does not wipe it */
function auBack(){auView.mode='list';auView.shelf=null;auView.sel=new Set();clearTimeout(AU_TRICKLE.t);location.hash='#audit';renderAudit();auPaintBulk();}
function auJudgeNow(asins,code,reason){const sh=audShelf(auView.shelf);if(!sh)return;
  const b=audJudge(asins,code,sh.seller||sh.id,reason);
  if(!b){
    /* b97 (Jack: "still not working bro"). audJudge treats pressing the verdict a row ALREADY has as a
       no-op and returns nothing — and this bailed out before anything redrew. So once a row was on
       Discord, pressing 3 again did precisely nothing: no picker, no feedback, no clue why. Pressing it
       again is how you reach or change the destination, so it has to redraw even when the verdict itself
       has not moved. This is why it looked broken on rows he had already pressed Discord on. */
    const t0=audType(code);
    if(asins.length===1&&(audGet(asins[0])||{}).verdict===code){
      const vis=auVisible(sh);const k=vis.findIndex(it=>it.a===asins[0]);if(k>=0)auView.focus=k;
      auRefresh(asins);auFollow();
      if(!(t0&&t0.reasons))toast('Already marked '+(t0?t0.label:code)+' — press U to undo');
    }
    return;}
  asins.forEach(a=>auView.stay.add(a));
  const gap=(Date.now()-auView.lastAt)/1000;if(auView.lastAt&&gap<60){auView.secs=auView.secs.concat([gap]).slice(-40);auSave();}auView.lastAt=Date.now();
  const t=audType(code);
  const waitReason=!!(t&&t.reasons&&!reason&&asins.length>1);
  toast(waitReason?`Marked ${t.label} on ${asins.length} — now pick which: ${t.reasons.slice(0,3).map((r,n)=>AU_RKEYS[n].toUpperCase()+' '+r).join(' · ')}${t.reasons.length>3?' …':''}`
    :`Marked ${t?t.label:code}${reason?' · '+reason:''}${asins.length>1?' on '+asins.length+' products':''}`,false,
    {label:'Undo',fn:()=>{const u=audUndo();if(u){const vis=auVisible(sh);const back=vis.findIndex(x=>x.a===u[0].asin);if(back>=0)auView.focus=back;auView.sel=new Set();auView.bulkOpen=null;auRefresh(u.map(x=>x.asin));toast('Undone');}}});
  /* b94 (Jack: "improve smoothness when i tick it and how it reacts when it's ticked and where it goes").
     Pressing a key redrew the list and that was the entire feedback — nothing told you it had landed. The
     row that was just judged is now marked for one render, so it can flash its own verdict colour once and
     the chip can pop in. The mark clears itself, so scrolling past later never replays it. */
  auView.landed={a:asins[0],at:Date.now()};   /* b98: `asin` never existed here — the parameter is `asins`, and the ReferenceError killed the redraw on EVERY press */
  clearTimeout(auView._landT);auView._landT=setTimeout(()=>{auView.landed=null;},600);
  /* b153: bulk "Discord" with no group yet keeps the rows ticked and opens their reasons, so Q / W / E (or one click) finishes ALL of them
     — it used to clear the ticks, and the next Q only reached the one row you were on */
  if(waitReason){auView.sel=new Set(asins);auView.bulkOpen=t.reasons.length>3?code:null;}else{   /* Discord's three groups are already on the bar */auView.sel=new Set();auView.lastSel=null;auView.bulkOpen=null;}
  if(!(t&&t.reasons)||reason)auAdvance();auRefresh(asins);auFollow();}
/* b95 (Jack: "why does unsure take us to the top — i want to bulk go through them rapid without being moved").
   It was not Unsure. auAdvance searched DOWN for the next unjudged row and, finding none, wrapped round and
   searched from the top — so the moment everything below you was done, one keypress teleported you to row 1
   and you lost your place completely. It only ever goes down now. Run out of work below and you stay exactly
   where you are, and it tells you how many are left above and which key goes back to them. */
function auAdvance(){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const V=audAll();
  const todo=i=>audStatus(V[vis[i].a],audSells(sh.id,vis[i].a))==='todo';
  for(let i=auView.focus+1;i<vis.length;i++){if(todo(i)){auView.focus=i;return;}}
  let above=0;for(let i=0;i<auView.focus;i++)if(todo(i))above++;
  if(auView.focus<vis.length-1)auView.focus=vis.length-1;      /* settle on the last row, never the first */
  toast(above?`That is the bottom — ${above} still to judge above you, press G to go back to them`
             :'That is every product on this shelf judged');}
/* G — back to the first thing still waiting, for when you have skipped some on the way down */
function auFirstTodo(){const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const V=audAll();
  for(let i=0;i<vis.length;i++){if(audStatus(V[vis[i].a],audSells(sh.id,vis[i].a))==='todo'){auView.focus=i;auRefresh([]);auFollow();return;}}
  toast('Nothing left to judge on this shelf');}
function auOpenKeepaViewer(){const sh=audShelf(auView.shelf);if(!sh)return;const need=sh.items.filter(it=>!audState.prod[it.a]).map(it=>it.a).slice(0,250);
  if(!need.length){toast('Every product already has its details');return;}
  copy(need.join(', '),need.length+' ASINs copied — they are also loading in the Viewer');window.open(keepaLink(need,'2'),'_blank');
  toast('Export ALL columns from the Viewer, then drop the file on this page');}
async function auLoadTokens(){const sh=audShelf(auView.shelf);if(!sh)return;
  const need=sh.items.map(it=>it.a).filter(a=>!audState.prod[a]||audState.prod[a].source==='ours'||!audState.prod[a].asked);
  if(!need.length){toast('Every product already has its details');return;}
  if(!await uiConfirm(`Load titles, pictures and prices for ${need.length} product${need.length===1?'':'s'}?\n\nThat costs about ${need.length} Keepa tokens, once. They are saved for good.`,{ok:`Load them · ~${need.length} tokens`,tone:'token'}))return;
  auNote('Loading details…');const got=await audLoadDetails(need,true,(n,t)=>auNote(`Loading details… ${n} of ${t}`));
  renderAudit();auNote('');toast(got?got+' products loaded':'Nothing came back',!got);}
async function auPullSeller(id){id=(id||'').trim().toUpperCase();if(!/^A[0-9A-Z]{5,}$/.test(id)){toast('That does not look like a seller ID',true);return;}
  if(!await uiConfirm('Pull this seller\'s whole shelf from Keepa?\n\nThat costs about 10 tokens.',{ok:'Pull the shelf · ~10 tokens',tone:'token'}))return;
  toast('Asking Keepa…');
  try{const r=await fetch(WORKER+'/keepa?path=seller&domain=2&storefront=1&seller='+id);const j=await r.json();
    const s=j.sellers&&j.sellers[id];const asins=(s&&(s.asinList||[]))||[];
    if(!asins.length){toast('Keepa returned no products for that seller',true);return;}
    const all=audShelvesLocal();all[id]={id,name:(s.sellerName||id),seller:id,kind:'pulled',asins,at:today(),by:me()};audShelvesSave(all);
    if(cloudEnabled())audQueue({op:'up',table:'src_audit_shelves',rows:[{seller_id:id,name:all[id].name,kind:'pulled',asins,pulled_at:nowIso(),pulled_by:me()}]});
    toast(asins.length+' products in — opening the audit');auOpen(id);}
  catch(e){toast('Could not reach the Worker',true);}}
function auAddList(){const name=($('#auName')&&$('#auName').value.trim())||'Pasted list '+today();
  const raw=($('#auAsins')&&$('#auAsins').value)||'';const asins=[...new Set((raw.match(/B[0-9A-Z]{9}/g)||[]))];
  if(!asins.length){toast('No ASINs found in that box',true);return;}
  const id='list-'+srcKeyFor(name);const all=audShelvesLocal();all[id]={id,name,seller:'',kind:'list',asins,at:today(),by:me()};audShelvesSave(all);
  if(cloudEnabled())audQueue({op:'up',table:'src_audit_shelves',rows:[{seller_id:id,name,kind:'list',asins,pulled_at:nowIso(),pulled_by:me()}]});
  toast(asins.length+' ASINs ready');auOpen(id);}
async function auTakeFiles(list){const files=[...list].filter(f=>/\.csv$/i.test(f.name));if(!files.length)return;
  let rows=[];for(const f of files){try{const t=await readFileText(f);const ex=describeExport(parseCSV(t));if(ex&&ex.rows)rows=rows.concat(ex.rows);}catch(e){}}
  const prods=rows.map(audFromCsv).filter(Boolean);
  if(!prods.length){toast('No ASINs in that export',true);return;}
  audNowRecord(rows.filter(r=>/amazon\.co\.uk/i.test(String(r['URL: Amazon']||''))||!r['URL: Amazon']));   /* b300: free NOW from a UK export */
  const seen={};prods.forEach(p=>seen[p.asin]=p);const uniq=Object.values(seen);
  audSaveProducts(uniq);
  if(auView.mode==='audit'){renderAudit();toast(uniq.length+' products now have their details');}
  else{const name='Export '+today();const id='list-'+srcKeyFor(name);const all=audShelvesLocal();
    all[id]={id,name,seller:'',kind:'list',asins:uniq.map(p=>p.asin),at:today(),by:me()};audShelvesSave(all);
    if(cloudEnabled())audQueue({op:'up',table:'src_audit_shelves',rows:[{seller_id:id,name,kind:'list',asins:all[id].asins,pulled_at:nowIso(),pulled_by:me()}]});
    toast(uniq.length+' products in — opening the audit');auOpen(id);}}
/* b159 (Jack: "better and easier to bulk do it"): press on a picture and drag down — every row you pass is ticked
   (or unticked, if the first one was already ticked). One sweep instead of twenty clicks. */
let auDrag=null;
function auDragRowAt(t){const r=t&&t.closest&&t.closest('.aulist .aurow');return r&&r.dataset.a?r:null;}
function auInit(){const host=$('#page-audit');if(!host)return;
  host.addEventListener('mousedown',e=>{if(e.button!==0||e.shiftKey||e.metaKey||e.ctrlKey)return;const img=e.target.closest('.aulist .aurow > .auimg,.aulist .aurow > .ausel');if(!img)return;
    const row=auDragRowAt(img);if(!row)return;auDrag={add:!auView.sel.has(row.dataset.a),seen:new Set([row.dataset.a]),moved:false};});
  host.addEventListener('mouseover',e=>{if(!auDrag)return;const row=auDragRowAt(e.target);if(!row||auDrag.seen.has(row.dataset.a))return;
    if(!auDrag.moved){auDrag.moved=true;const first=[...auDrag.seen][0];auDrag.add?auView.sel.add(first):auView.sel.delete(first);}
    auDrag.seen.add(row.dataset.a);auDrag.add?auView.sel.add(row.dataset.a):auView.sel.delete(row.dataset.a);
    row.classList.toggle('sel',auView.sel.has(row.dataset.a));const f=document.querySelector(`.aulist .aurow[data-a="${[...auDrag.seen][0]}"]`);if(f)f.classList.toggle('sel',auView.sel.has(f.dataset.a));auPaintBulk();});
  document.addEventListener('mouseup',()=>{if(!auDrag)return;const moved=auDrag.moved;auDrag=null;if(moved){auView.dragJustEnded=Date.now();auRefresh();}});
  host.addEventListener('click',async e=>{const t=e.target;
    if(typeof trClick==='function'&&trClick(e))return;   /* b239: EXPORTED chip, the ASIN audit box */
    if(t.closest('[data-stop]')){e.stopPropagation();return;}
    const mo=t.closest('[data-more]');if(mo){auExtend(mo.dataset.more);return;}
    if(t.closest('#auLoadRest')){auTrickle(auView.shelf,true);return;}
    if(t.closest('#auNowChk')){auNowCheck(auView.shelf);return;}   /* b300 */
    if(t.closest('#auShopChk')){if(typeof OA!=='undefined'&&!OA.busy)oaRun(auView.shelf);return;}   /* b321 */
    const ofb=t.closest('[data-ofl]');if(ofb){auView.ofl=auView.ofl===ofb.dataset.ofl?'0':ofb.dataset.ofl;auView.order=null;auView.focus=0;auView.limit=0;auSave();renderAudit();return;}   /* b301 */
    /* b159: tick all shown / clear, from the filter bar */
    if(t.closest('[data-tall]')){const sh=audShelf(auView.shelf);if(sh){auView.sel=new Set(auVisible(sh).map(it=>it.a));auRefresh();}return;}
    if(t.closest('[data-tclear]')){auView.sel=new Set();auView.lastSel=null;auRefresh();return;}
    /* b158: archive / bring back a rival, your inventory list */
    const ar=t.closest('[data-arch]');if(ar){e.stopPropagation();const sh=audShelf(ar.dataset.arch);audArchSet(ar.dataset.arch,true);renderAudit();
      toast((sh?sh.name:'Rival')+' archived',false,{label:'Undo',fn:()=>{audArchSet(ar.dataset.arch,false);renderAudit();}});return;}
    const un=t.closest('[data-unarch]');if(un){const id=un.dataset.unarch,cut=audFromDay();audArchSet(id,false);audFromSet(id,cut);renderAudit();toast(`Back in the audit — only what they listed since ${ukDate(cut)}; older ones are OLD DATA`);return;}   /* b317 */
    if(t.closest('#auShowArch')){auView.showArch=!auView.showArch;auSave();renderAudit();return;}
    if(t.closest('#auShowDone')){auView.showDone=!auView.showDone;renderAudit();return;}   /* b320 */
    if(t.closest('#auMineSave')){const a=audAsinsIn($('#auMineIn').value);const msg=$('#auMineMsg');
      if(!a.length){msg.textContent='No ASINs found in that — paste the export or a list of ASINs.';return;}
      const n=audMineSave([...audMineList(),...a]);renderAudit();toast(n.toLocaleString()+' products on your inventory list — they are marked You sell this everywhere');return;}
    if(t.closest('#auMineClear')){if(!await uiConfirm('Clear your inventory list?\n\nKeepa\'s list and everything seen before still count.',{ok:'Clear it',tone:'danger'}))return;audMineSave([]);renderAudit();toast('Inventory list cleared');return;}
    const cp=t.closest('[data-copy]');if(cp){copy(cp.dataset.copy,cp.dataset.copy+' copied');e.stopPropagation();return;}
    const op=t.closest('[data-open]');if(op){auOpen(op.dataset.open);return;}
    const trOpen=t.closest('tr[data-open]');if(trOpen){auOpen(trOpen.dataset.open);return;}
    if(t.closest('#auBack')||t.closest('#auBack2')){auBack();return;}
    if(t.closest('#auCards')){auView.cards=!auView.cards;auSave();renderAudit();return;}
    if(t.closest('#auRsort'))return;   /* the select handles itself, below */
    if(t.closest('#auRefresh')||t.closest('#auRefresh2')){toast('Refreshing…');await audPullShelves(true);await audPullVerdicts(true);renderAudit();toast('Up to date');return;}
    if(t.closest('#auPull')){auPullSeller($('#auSeller').value);return;}
    if(t.closest('#auAdd')){auAddList();return;}
    if(t.closest('#auFollow')){auView.follow=!auView.follow;auSave();renderAudit();if(auView.follow){toast('Keepa will follow you — it opens the product you are on');auFollow();}return;}
    if(t.closest('#auAutoOff')){audAutoSet(false);toast('Details will not load automatically any more — the two buttons above still do it');renderAudit();return;}
    if(t.closest('#auViewer')||t.closest('#auViewer2')){auOpenKeepaViewer();return;}
    if(t.closest('#auTokens')||t.closest('#auTokens2')){auLoadTokens();return;}
    if(t.closest('#auDisc')){const sh=audShelf(auView.shelf);const a=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='discord').map(it=>it.a);window.open(keepaLink(a,'2'),'_blank');return;}
    if(t.closest('#auWs')){const sh=audShelf(auView.shelf);const a=sh.items.filter(it=>(audGet(it.a)||{}).verdict==='ws').map(it=>it.a);copy(a.join(', '),a.length+' WS ASINs copied');return;}
    if(t.closest('#auRest')){const sh=audShelf(auView.shelf);const V=audAll();const left=auVisible(sh).filter(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo').map(it=>it.a);
      if(!left.length){toast('Nothing left to judge in this tab');return;}
      if(await uiConfirm(`Mark ${left.length} product${left.length===1?'':'s'} Not lead?`,{ok:'Mark them Not lead'}))auJudgeNow(left,'not');return;}
    const tab=t.closest('[data-tab]');if(tab){const sh=audShelf(auView.shelf);auView.tab[sh.id]=tab.dataset.tab;auView.order=null;auView.stay=new Set();auView.focus=0;auSave();
      const vis=auVisible(sh);const V=audAll();const f=vis.findIndex(it=>audStatus(V[it.a],audSells(sh.id,it.a))==='todo');auView.focus=Math.max(0,f);renderAudit();return;}
    const vb=t.closest('[data-v]');if(vb){const sh=audShelf(auView.shelf);const vis=auVisible(sh);const k=vis.findIndex(it=>it.a===vb.dataset.a);if(k>=0)auView.focus=k;
      auJudgeNow(auView.sel.size?[...auView.sel]:[vb.dataset.a],vb.dataset.v);return;}
    if(t.closest('[data-next]')){const sh=audShelf(auView.shelf);const vis=auVisible(sh);if(auView.focus<vis.length-1)auView.focus++;auRefresh([]);auFollow();return;}
    if(auView.dragJustEnded&&Date.now()-auView.dragJustEnded<300&&t.closest('.aulist .aurow > .auimg,.aulist .aurow > .ausel'))return;   /* b159: the mouse-up of a drag is not a click */
    const tick=t.closest('[data-sel]')||(t.closest('.aulist .aurow > .auimg')&&t.closest('.aurow'));
    if(tick){e.preventDefault();const r=tick.closest('.aurow')||tick;auToggleSel(r.dataset.a||tick.dataset.sel,+(r.dataset.i||tick.dataset.i),e.shiftKey);return;}   /* b153: the whole picture ticks, not just the little box */
    const rs=t.closest('[data-r]');if(rs){audSetReason(rs.dataset.a,rs.dataset.r);auAdvance();auRefresh([rs.dataset.a]);return;}
    const row=t.closest('.aurow');if(row){if(e.metaKey||e.ctrlKey){auToggleSel(row.dataset.a,+row.dataset.i,false);return;}auView.focus=+row.dataset.i;auRefresh([]);auFollow();return;}});
  host.addEventListener('change',e=>{const id=e.target.id;
    const map={auSort:'sort',auBand:'band',auVol:'vol',auSell:'sellers'};
    if(map[id]){auView[map[id]]=e.target.value;auView.order=null;auView.focus=0;auView.limit=0;auSave();renderAudit();}
    if(id==='auJointDays'){const v=e.target.value==='always'?'always':+e.target.value;lsSet(AUD_JDAYS,v);
      if(typeof cloudQueue==='function'&&typeof settingRow==='function')cloudQueue('src_settings','upsert',[settingRow('audit-jointdays',v)]);
      auView.order=null;renderAudit();toast(v==='always'?'Anything you have ever sold counts as yours':'Sold out within '+v+' days still counts as yours');}});
  host.addEventListener('input',e=>{if(e.target.id==='auQ'){auView.q=e.target.value;auView.focus=0;auView.order=null;const pos=e.target.selectionStart;renderAudit();
      const q=$('#auQ');if(q){q.focus();q.setSelectionRange(pos,pos);}}
    if(e.target.id==='auNote')audSetNote(e.target.dataset.a,e.target.value);});
  host.addEventListener('dragover',e=>{e.preventDefault();const d=$('#auDrop');if(d)d.classList.add('over');});
  host.addEventListener('dragleave',()=>{const d=$('#auDrop');if(d)d.classList.remove('over');});
  host.addEventListener('drop',e=>{e.preventDefault();const d=$('#auDrop');if(d)d.classList.remove('over');auTakeFiles(e.dataTransfer.files);});
  host.addEventListener('click',e=>{if(e.target.closest('#auDrop'))$('#auFile').click();});
  host.addEventListener('change',e=>{if(e.target.id==='auFile'){auTakeFiles(e.target.files);e.target.value='';}});
  document.addEventListener('keydown',e=>{
    if(!$('#page-audit')||!$('#page-audit').classList.contains('active')||auView.mode!=='audit')return;
    const tg=e.target;if(tg&&tg.closest&&tg.closest('input,textarea,select'))return;
    const sh=audShelf(auView.shelf);if(!sh)return;const vis=auVisible(sh);const it=vis[auView.focus];
    auView.keyAt=Date.now();   /* b166: a key you pressed may scroll the page to its row for the next 400ms; nothing else ever may */
    if(e.key==='/'){e.preventDefault();const q=$('#auQ');if(q)q.focus();return;}
    if(e.key==='Escape'){if(auView.sel.size){auView.sel=new Set();auView.lastSel=null;auView.bulkOpen=null;auRefresh();}return;}
    if((e.key==='x'||e.key==='X')&&it&&!e.metaKey&&!e.ctrlKey){e.preventDefault();auToggleSel(it.a,auView.focus,e.shiftKey);return;}   /* b153: X ticks the row you are on, like Gmail */
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const d=e.key==='ArrowDown'?1:-1;const nf=Math.min(vis.length-1,Math.max(0,auView.focus+d));
      /* b159: moving no longer wipes the ticks (tick six with the mouse, press ↓, all six were gone). Esc clears. */
      if(e.shiftKey){if(it)auView.sel.add(it.a);if(vis[nf])auView.sel.add(vis[nf].a);}
      auView.focus=nf;auRefresh(e.shiftKey?null:[]);auFollow();return;}
    /* b318 (Jack, 6 Nov: "happy yeah"): Enter takes the suggested answer — the row you are on, or each ticked row's own */
    if(e.key==='Enter'&&!e.metaKey&&!e.ctrlKey&&typeof audSuggest==='function'&&(it||auView.sel.size)){const V0=audAll();
      const L=(auView.sel.size?[...auView.sel].map(a=>vis.find(x=>x.a===a)).filter(Boolean):[it]).filter(x=>!V0[x.a]);const by={};
      L.forEach(x=>{const s=audSuggest(x);if(s)(by[s.code]=by[s.code]||[]).push(x.a);});const codes=Object.keys(by);
      if(codes.length){e.preventDefault();codes.forEach(c=>auJudgeNow(by[c],c));if(auView.sel.size){auView.sel=new Set();auView.lastSel=null;}return;}}
    const types=audPick();const n=e.key==='0'?10:parseInt(e.key,10);   /* b294: 0 = the 10th answer (Old) */
    if(n>=1&&n<=types.length&&it){e.preventDefault();auJudgeNow(auView.sel.size?[...auView.sel]:[it.a],types[n-1].code);return;}
    const rk=AU_RKEYS.indexOf(String(e.key).toLowerCase());
    if((e.key==='g'||e.key==='G')&&!e.metaKey&&!e.ctrlKey){e.preventDefault();auFirstTodo();return;}
    if(rk>=0&&auView.sel.size){const byType={};[...auView.sel].forEach(a=>{const v=audGet(a);const ty=v&&audType(v.verdict);if(ty&&ty.reasons&&ty.reasons[rk])(byType[ty.reasons[rk]]=byType[ty.reasons[rk]]||[]).push(a);});
      const keys=Object.keys(byType);if(keys.length){e.preventDefault();let n=0;keys.forEach(r=>{const b=audSetReasonMany(byType[r],r);if(b)n+=b.length;});
        auView.sel=new Set();auView.lastSel=null;toast(`${n} set to ${keys.join(' / ')} — press U to undo`);auRefresh();return;}}
    if(rk>=0&&it){const v=audGet(it.a);const ty=v&&audType(v.verdict);if(ty&&ty.reasons&&ty.reasons[rk]){audSetReason(it.a,ty.reasons[rk]);auAdvance();auRefresh([it.a]);auFollow();return;}}
    if(e.key==='u'||e.key==='U'){const b=audUndo();toast(b?(b.length>1?'Undone — '+b.length+' products back':'Undone'):'Nothing to undo');auView.bulkOpen=null;
      if(b){const back=auVisible(sh).findIndex(x=>x.a===b[0].asin);if(back>=0)auView.focus=back;auRefresh(b.map(x=>x.asin));}return;}
    if(!it)return;
    if(e.key==='o'||e.key==='O')window.open('https://www.amazon.co.uk/dp/'+it.a,'_blank');
    else if(e.key==='k'||e.key==='K')window.open('https://keepa.com/#!product/2-'+it.a,'_blank');
    else if(e.key==='s'||e.key==='S')window.open('https://sas.selleramp.com/sas/lookup?search_term='+it.a,'_blank');});
  document.addEventListener('click',e=>{if(e.target.closest('.pagebtn'))setTimeout(auPaintBulk,0);});   /* b151: the bulk bar belongs to the audit page only */
  /* first paint + shared data when the page opens */
  const btn=document.querySelector('.pagebtn[data-page="page-audit"]');
  if(btn)btn.addEventListener('click',async()=>{renderAudit();if(cloudReadable()){await audPullShelves();await audPullVerdicts();renderAudit();}});
  renderAudit();}
/* b171 (Jack, 27 Sep: "why is the audit seller ID like this still?" — the list on screen, #audit=A3MFSZUHG9XVSC in the address).
   A refresh on a shelf ran this 50ms after load, before the shelves had come from the database, so it could not find the rival,
   showed the list and left the ID behind. Now it shows the list, waits for the shelves, then opens the rival you were on. If that
   rival really is gone, the address is put back to #audit. It also no longer opens a shelf twice (auOpen's own hash change came
   back through here). */
function auHash(){const m=/^#audit(?:=([\w-]+))?/i.exec(location.hash||'');if(!m)return false;
  const b=document.querySelector('.pagebtn[data-page="page-audit"]');if(b&&!b.classList.contains('active'))b.click();
  const id=m[1];
  if(id&&auView.mode==='audit'&&auView.shelf===id)return true;          /* already there */
  if(id&&audShelf(id)){auOpen(id);return true;}
  auView.mode='list';auView.pendingOpen=id||null;renderAudit();
  if(id&&cloudReadable())(async()=>{try{await audPullShelves();}catch(e){}
    if(auView.pendingOpen!==id)return;auView.pendingOpen=null;
    if(audShelf(id)&&auView.mode==='list')auOpen(id);else auFixHash();})();
  else{auView.pendingOpen=null;auFixHash();}
  return true;}
/* the address says what is on screen: #audit on the list, #audit=<id> inside a rival. replaceState, so no history entry and no hashchange */
function auFixHash(){if(auView.mode!=='list'||auView.pendingOpen)return;if(/^#audit=/i.test(location.hash||''))try{history.replaceState(null,'','#audit');}catch(e){}}

/* b100: the rival order, saved so it is still there tomorrow */
document.addEventListener('change',e=>{const sel=e.target&&e.target.closest&&e.target.closest('#auRsort');
  if(!sel)return;auView.rsort=sel.value;auSave();renderAudit();});
