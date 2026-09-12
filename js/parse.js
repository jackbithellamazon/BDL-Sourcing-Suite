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
function describeExport(rows){if(!rows||rows.length<2)return null;
  const hdr=rows[0].map(x=>x.trim().toLowerCase());const has=n=>hdr.includes(n.toLowerCase());
  const objs=toObjs(rows);
  return{rows:objs,domain:rowDomain(objs[0]||{}),
    hasFees:has('FBA Pick&Pack Fee')||has('Referral Fee %'),
    full:has('Sales Rank: Drops last 30 days')&&has('Title'),
    hasSince:has('Tracking since')||has('Listed since'),
    asins:objs.map(o=>(o.ASIN||'').trim()).filter(a=>/^B[0-9A-Z]{9}$/.test(a))};}
