/* BDL Sourcing — THE QUEUE (b10). What a VA actually has to look at.
   Jack, 13 Sep 2026: no more full passes. Show NEW + anything that has got MORE PROFITABLE, however small — 2p cheaper,
   5p more profit, ROI 11→12, a business price / coupon / S&S appearing. A lead stays in the queue until someone gives it a
   verdict; after that it only comes back when it is better than it was when they judged it. Blacklisted never shows.
   The compare baseline is shared (src_leads), so it does not matter whose machine ran it last. */
const Q={EPS_GBP:0.005,EPS_ROI:0.05,SELL_DROP:0.95};
/* the numbers a lead is judged on — one shape for every rule so the compare is one function */
/* b25: the Keepa inputs behind the sell price ride along in `k`, so a call of Jack's can be refitted from Supabase without the export */
function leadKeepa(o,rule){const src=rule===1
  ?{amz:o['UK Amazon now £'],bb90:o['Sell BB 90d £'],fnow:o['Sell FBA now £'],f30:o['Sell FBA 30d £'],f90:o['Sell FBA 90d £'],why:o['Sell used']}
  :{amz:o['Buy at £'],bb30:o['Buy Box 30d £'],bb90:o['Buy Box 90d £'],bb180:o['Buy Box 180d £'],hi:o['Buy Box high £'],f30:o['FBA 30d £'],f90:o['FBA 90d £'],fbm90:o['FBM 90d £'],off:o.Offers,why:o['Sell from']};
  const k={};Object.entries(src).forEach(([a,v])=>{if(v!=null&&v!==''&&v!==0)k[a]=typeof v==='number'?Math.round(v*100)/100:String(v).slice(0,60);});return k;}
function leadState(o,rule){const id={brand:(o.Brand||'').slice(0,60),title:(o.Title||o.Product||'').slice(0,90),k:leadKeepa(o,rule)};return rule===1
  ?Object.assign({buy:o['Landed £'],sell:o['Sell £ used'],profit:o['Profit £'],roi:o['ROI %'],spm:o.SPM,disc:o['Discount applied']||'',mk:o['Buy market']||'UK'},id)
  :Object.assign({buy:o['After discount £'],sell:o['Sell for £'],profit:o['Profit £'],roi:o['ROI %'],spm:o['Sells /mo'],score:o.Score,disc:o['Discount applied']||'',mk:'UK'},id);}
function discSet(s){return new Set((s||'').split(';').map(x=>x.trim().toLowerCase()).filter(Boolean));}
function fmtP(v){return Math.abs(v)<1?Math.round(Math.abs(v)*100)+'p':'£'+Math.abs(v).toFixed(2);}
/* now vs then → {status, why[], gain}. Mixed moves are decided by profit, because "more profitable" is the point. */
function compareState(now,then){if(!then)return{status:'NEW',why:[],gain:0};
  const why=[];let better=false,worse=false;const n=x=>+x||0;
  if(n(now.buy)<n(then.buy)-Q.EPS_GBP){better=true;why.push(`buy £${n(then.buy).toFixed(2)}→£${n(now.buy).toFixed(2)} (−${fmtP(n(then.buy)-n(now.buy))})`);}
  else if(n(now.buy)>n(then.buy)+Q.EPS_GBP){worse=true;why.push(`buy £${n(then.buy).toFixed(2)}→£${n(now.buy).toFixed(2)} (+${fmtP(n(now.buy)-n(then.buy))})`);}
  const nd=discSet(now.disc),td=discSet(then.disc);const gained=[...nd].filter(x=>!td.has(x)),lost=[...td].filter(x=>!nd.has(x));
  if(gained.length){better=true;why.push('new: '+gained.join(', '));}
  if(lost.length){worse=true;why.push('lost: '+lost.join(', '));}
  if(n(now.profit)>n(then.profit)+Q.EPS_GBP){better=true;why.push(`profit £${n(then.profit).toFixed(2)}→£${n(now.profit).toFixed(2)}`);}
  else if(n(now.profit)<n(then.profit)-Q.EPS_GBP){worse=true;why.push(`profit £${n(then.profit).toFixed(2)}→£${n(now.profit).toFixed(2)}`);}
  if(n(now.roi)>n(then.roi)+Q.EPS_ROI){better=true;if(!why.some(w=>w.startsWith('profit')))why.push(`ROI ${n(then.roi)}→${n(now.roi)}%`);}
  else if(n(now.roi)<n(then.roi)-Q.EPS_ROI){worse=true;if(!why.some(w=>w.startsWith('profit')))why.push(`ROI ${n(then.roi)}→${n(now.roi)}%`);}
  if(then.sell&&n(now.sell)<n(then.sell)*Q.SELL_DROP){worse=true;why.push(`sell £${n(then.sell).toFixed(2)}→£${n(now.sell).toFixed(2)}`);}
  else if(then.sell&&n(now.sell)>n(then.sell)*1.01)why.push(`sell £${n(then.sell).toFixed(2)}→£${n(now.sell).toFixed(2)}`);
  if(n(now.spm)>n(then.spm)*1.25&&n(now.spm)-n(then.spm)>=10)why.push(`selling ${n(then.spm)}→${n(now.spm)}/mo`);
  const gain=Math.round((n(now.profit)-n(then.profit))*100)/100;
  const status=better&&!worse?'BETTER':worse&&!better?'WORSE':better&&worse?(gain>=0?'BETTER':'WORSE'):'UNCHANGED';
  return{status,why,gain};}
/* out = a rule's kept rows (mutated). prevMap = {asin:{state,stamp}} from the last previous-day run. verdicts = {asin:{v,state,...}}.
   Sets STATUS / Changed / Last seen (vs last run) and QUEUE / Review? (vs the verdict). Returns the GONE list. */
function applyQueue(out,rule,prevMap,verdicts){prevMap=prevMap||{};verdicts=verdicts||{};const seen=new Set();
  out.forEach((o,i)=>{o._i=i;const s=leadState(o,rule);const p=prevMap[o.ASIN];const c=compareState(s,p?p.state:null);
    o.STATUS=c.status;o.Changed=c.why.join('; ');o['Last seen']=p?p.stamp:'';o.gain=c.gain;o.state=s;seen.add(o.ASIN);
    if(p&&p.state&&c.status==='WORSE'&&+p.state.buy<+s.buy)o.low={buy:+p.state.buy,stamp:p.stamp};
    const v=verdicts[o.ASIN];o.verdict=v||null;
    if(!v){o.QUEUE='new';o['Review?']='no verdict yet';o.sinceVerdict='';}
    else{const cv=v.state?compareState(s,v.state):{status:'UNCHANGED',why:[]};
      if(cv.status==='BETTER'){o.QUEUE='better';o.sinceVerdict=cv.why.join('; ');o['Review?']='better since '+v.v+(v.who?' by '+v.who:'')+': '+o.sinceVerdict;}
      else{o.QUEUE='';o.sinceVerdict='';o['Review?']='';}}});
  return Object.entries(prevMap).filter(([a])=>!seen.has(a)).map(([a,p])=>[a,(p.state.title||'')+(p.state.title?' · ':'')+`was £${(+p.state.buy).toFixed(2)} ROI ${p.state.roi}%`+(p.state.score?' score '+p.state.score:'')]);}
/* the next lead-state map for a source: today's states, each remembering the last previous-day state as its `prev`
   (a second run on the same day compares against yesterday again, not against this morning) */
function nextLeadMap(out,rule,prevAll,stampNow){const t=(stampNow||stamp()).slice(0,10);const m={};
  out.forEach(o=>{const e=prevAll[o.ASIN];const base=e?(e.stamp.slice(0,10)===t?e.prev:{state:e.state,stamp:e.stamp}):null;
    m[o.ASIN]={state:o.state||leadState(o,rule),stamp:stampNow||stamp(),prev:base||null};});return m;}
/* the previous-day baseline out of a lead map */
function baselineOf(map){const t=today();const b={};Object.entries(map||{}).forEach(([a,e])=>{if(!e)return;
  if(e.stamp&&e.stamp.slice(0,10)!==t)b[a]={state:e.state,stamp:e.stamp};else if(e.prev)b[a]=e.prev;});return b;}
