/* BDL Sourcing — the automated pull's link signature and 1-token cut (b330, 10 Nov 2026).
   Keepa Discord chat, "automated filters final decisions": the keepa Worker pulls the automated filters overnight and, after a
   1-token look (stats=90&history=1) at every product, cuts ONLY on rules that can never drift from the Suite:
     · the exclusions Keepa's API cannot take (brand / root category / binding / product group) — the filter's own `after`
     · no Amazon price (Rule 2 skips a product with no 'Amazon: Current')
     · demand under 9 a month — exactly Rule 2's ladder for an API row: Amazon's "bought in past month" if > 0, else the last
       confirmed monthly figure if it is under 90 days old, else the 30-day rank drops (the API has no per-option review
       counts, so the review-share step never applies — never stricter than an export)
   PURE FUNCTIONS — no page code, no globals but AUTOCUT. The Worker carries an exact copy; the Suite's checks lock the copy
   to Rule 2 (R2.MIN_SPM, RECENT_CONFIRMED_DAYS, apiRow) so the two can never quietly disagree. If any of this changes,
   send the Keepa Discord chat an md with the new copy. */
const AUTOCUT={MIN_SPM:9,LAST_KNOWN_DAYS:90,KEEPA_MIN0:21564000};
/* FNV-1a, 32-bit, over link + "\n" + link2 (UTF-16 code units) → 8 hex characters */
function linkSig(link,link2){const s=String(link||'')+'\n'+String(link2||'');let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}
  return('0000000'+h.toString(16)).slice(-8);}
/* why a product is excluded by the filter's `after` lists ('' = not excluded). p = a Keepa product object. */
function apiKeepWhy(p,after){if(!after||!p)return'';const low=v=>String(v==null?'':v).toLowerCase().trim();
  if((after.brandNot||[]).includes(low(p.brand)))return'brand excluded';
  if((after.rootNot||[]).map(Number).includes(Number(p.rootCategory)))return'root category excluded';
  if((after.bindingNot||[]).includes(low(p.binding)))return'binding excluded';
  if((after.groupNot||[]).includes(low(p.productGroup)))return'product group excluded';
  return'';}
function apiKeep(p,after){return!apiKeepWhy(p,after);}
/* Rule 2's demand for an API row → {spm, from: 'bought' | 'last known' | 'drops'}. now = ms since 1970. */
function apiDemand(p,now){const ms=+(p&&p.monthlySold)||0;if(ms>0)return{spm:ms,from:'bought'};
  const h=(p&&p.monthlySoldHistory)||[];
  for(let i=h.length-2;i>=0;i-=2){if(h[i+1]>0){const t=(h[i]+AUTOCUT.KEEPA_MIN0)*60000;
      if(now-t<=AUTOCUT.LAST_KNOWN_DAYS*864e5)return{spm:h[i+1],from:'last known'};break;}}
  const d=+((p&&p.stats&&p.stats.salesRankDrops30)||0);return{spm:d>0?d:0,from:'drops'};}
/* the whole 1-token cut → {keep, why, spm, from}. after = one link's `after` (an ASIN two links found is kept if either keeps it). */
function autoCut(p,after,now){if(!p||!p.asin)return{keep:false,why:'no product',spm:0,from:''};
  const x=apiKeepWhy(p,after);if(x)return{keep:false,why:x,spm:0,from:''};
  const cur=(p.stats&&p.stats.current)||[];if(!(cur[0]>0))return{keep:false,why:'no Amazon price',spm:0,from:''};
  const d=apiDemand(p,now);
  if(d.spm<AUTOCUT.MIN_SPM)return{keep:false,why:`demand ${d.spm}/mo (${d.from}) under ${AUTOCUT.MIN_SPM}`,spm:d.spm,from:d.from};
  return{keep:true,why:'',spm:d.spm,from:d.from};}
