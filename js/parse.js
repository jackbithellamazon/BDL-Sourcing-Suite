/* BDL Sourcing — Keepa CSV parsing. DOM-free so the rules and the tests can share it. */
function parseCSV(text){text=text.replace(/^﻿/,'');const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=c;}
    else{if(c==='"')q=true;else if(c===','){row.push(cur);cur='';}
      else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(c==='\r'){}else cur+=c;}}
  if(cur!==''||row.length){row.push(cur);rows.push(row);}
  return rows.filter(r=>r.length&&!(r.length===1&&r[0].trim()==='')); }
/* rows -> array of {Header: value} */
function toObjs(rows){const h=rows[0].map(x=>x.trim());return rows.slice(1).map(r=>{const o={};h.forEach((k,i)=>o[k]=r[i]==null?'':r[i]);return o;});}
/* Keepa number cell -> number or null. Handles "£1,049.00", "27 %", "-", "". */
function kNum(s){if(s==null)return null;s=(''+s).trim().replace(/,/g,'').replace(/\+/g,'').replace(/[£€$%]/g,'').trim();
  if(s===''||s==='-')return null;const n=parseFloat(s);return isNaN(n)?null:n;}
const DOMS={2:'UK',3:'DE',4:'FR',8:'IT',9:'ES'},TLD={'co.uk':'UK',de:'DE',fr:'FR',it:'IT',es:'ES'},AMZ_TLD={UK:'co.uk',DE:'de',FR:'fr',IT:'it',ES:'es'};
/* Which marketplace an export came from — the Keepa URL column says product/<domainId>- */
function rowDomain(o){let m=/product\/(\d+)-/.exec(o['URL: Keepa']||'');if(m&&DOMS[m[1]])return DOMS[m[1]];
  m=/amazon\.([a-z.]+)\//.exec(o['URL: Amazon']||'');return m?(TLD[m[1]]||null):null;}
/* Describe a parsed export: domain, whether it carries the fee columns, whether it is a full export */
/* b110 (Jack, 18 Sep: "the export has it now"). The demand ladder (b105-b109) needs these columns to judge a
   variation on its own; without them every option is scored on the family's figures and nobody notices.
   describeExport lists what a file is missing so the run screen can say so on the file itself. */
const LADDER_COLS=['Variation Count','Variation ASINs','Reviews: Rating Count','Reviews: Review Count - Format Specific',
  'Monthly Sales Trends: Monthly Sold (Last Known)','Monthly Sales Trends: Monthly Sold Date (Last Known)'];
function missingLadderCols(rows){const r=rows&&rows[0];if(!r)return LADDER_COLS.slice();
  const have=new Set(Object.keys(r).map(k=>k.trim().toLowerCase()));
  return LADDER_COLS.filter(c=>!have.has(c.toLowerCase()));}
function describeExport(rows){if(!rows||rows.length<2)return null;
  const hdr=rows[0].map(x=>x.trim().toLowerCase());const has=n=>hdr.includes(n.toLowerCase());
  const objs=toObjs(rows);
  return{rows:objs,domain:rowDomain(objs[0]||{}),
    hasFees:has('FBA Pick&Pack Fee')||has('Referral Fee %'),
    full:has('Sales Rank: Drops last 30 days')&&has('Title'),
    hasSince:has('Tracking since')||has('Listed since'),
    missing:missingLadderCols(objs),
    asins:objs.map(o=>(o.ASIN||'').trim()).filter(a=>/^B[0-9A-Z]{9}$/.test(a))};}

/* b108 (Jack, 18 Sep: "if it's had monthly sales it should stay"). Amazon's confirmed "bought in past month" drops
   off now and then while the product keeps selling — the Shark Matrix Plus showed 50-100 a month from May to
   28 Aug, then a blank. Keepa's export can carry the LAST confirmed figure and when it was seen ("Monthly Sold
   (Last Known)" / "Monthly Sold Date (Last Known)" under Monthly Sales Trends). If the current figure is blank but
   Amazon confirmed one within RECENT_CONFIRMED_DAYS, that figure counts as confirmed. Shared by Rules 1 and 2. */
const RECENT_CONFIRMED_DAYS=90;
function confirmedSales(r){
  const now=kNum(r['Monthly Sales Trends: Bought in past month']);
  if(now>0)return{n:now,lapsed:false};
  const key=Object.keys(r).find(k=>/monthly sold \(last known\)/i.test(k)&&!/date/i.test(k));
  const dkey=Object.keys(r).find(k=>/monthly sold date \(last known\)/i.test(k));
  const last=key?kNum(r[key]):null;if(!(last>0))return null;
  const raw=dkey?String(r[dkey]||'').trim():'';
  const t=Date.parse(raw.replace(/\//g,'-').replace(' ','T'));
  if(!t||Date.now()-t>RECENT_CONFIRMED_DAYS*864e5)return null;
  return{n:last,lapsed:true,since:raw.slice(0,10)};}

/* b109 (Jack, 18 Sep: "has to have a confirmed spm in the last 365 days if the review % puts it under 10 spm").
   The review share is an estimate; a confirmed figure is proof. When the share would drop an option under the
   10-a-month floor, one Amazon-confirmed figure at any point in the past year overrules it and keeps the option.
   It only ever KEEPS - it can never remove a lead. Returns the figure and its date, or null. */
/* b122 (Jack, 20 Sep, on the M190: "it's a var and looks like it doesn't sell"). A variation whose own share of the family's sales cannot
   be worked out - its siblings are not in the export, or nobody has reviewed anything yet - used to be handed the whole family's drops.
   Now it is "share unknown": the page asks Keepa for that exact option's confirmed sales (one token), and without a confirmed figure
   the lead goes, with the reason. DEMAND.unknownOk=true is the dry run the page uses to find which rows to ask about. */
/* moved here from brands.js in b122: a family = the options in Variation ASINs that share one Rating Count pool; each option's share = its format-specific reviews / the pool's */
function stampShares(rows){const by={};rows.forEach(r=>{const a=(r.ASIN||'').trim();if(a)by[a]=r;});
  const cut=Date.now()-182*864e5;let n=0;
  rows.forEach(r=>{delete r.__share;delete r.__new;
    const own=kNum(r['Reviews: Review Count - Format Specific']);
    const pool=String(r['Reviews: Rating Count']||'').trim();
    const sibs=String(r['Variation ASINs']||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(sibs.length<2||!pool)return;
    let tot=0;sibs.forEach(a=>{const s=by[a];if(s&&String(s['Reviews: Rating Count']||'').trim()===pool)tot+=kNum(s['Reviews: Review Count - Format Specific'])||0;});
    if(!(tot>0))return;
    r.__share=(own||0)/tot;n++;
    const ls=Date.parse(String(r['Listed since']||'').replace(/\//g,'-'));if(ls&&ls>cut)r.__new=true;});
  return n;}
const DEMAND={unknownOk:false};
function shareUnknown(r){const vc=kNum(r['Variation Count'])||1;if(vc<2)return false;
  if(!('Reviews: Review Count - Format Specific' in r)||!('Variation ASINs' in r))return false;   /* an export without the review columns cannot know; b111 refuses those at the door anyway */if(r.__share!=null||r.__new||r.__optionChecked)return false;
  if(kNum(r['Monthly Sales Trends: Bought in past month']))return false;return true;}
const CONFIRMED_RESCUE_DAYS=365;
function confirmedWithin(r,days){
  const key=Object.keys(r).find(k=>/monthly sold \(last known\)/i.test(k)&&!/date/i.test(k));
  const dkey=Object.keys(r).find(k=>/monthly sold date \(last known\)/i.test(k));
  const last=key?kNum(r[key]):null;if(!(last>0))return null;
  const raw=dkey?String(r[dkey]||'').trim():'';
  const t=Date.parse(raw.replace(/\//g,'-').replace(' ','T'));
  if(!t||Date.now()-t>(days||CONFIRMED_RESCUE_DAYS)*864e5)return null;
  return{n:last,since:raw.slice(0,10)};}
