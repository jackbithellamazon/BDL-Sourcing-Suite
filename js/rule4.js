/* ============================================================================
   RULE 4 — VAT  (13 Sep 2026, Jack's brief)
   Anything HMRC zero-rates is worked at 0% VAT on BOTH sides (no VAT to reclaim on the buy, none to hand over on the sale).
   The recurring ones for us are TEA and COFFEE — the product, never the appliance: coffee 0%, coffee MACHINE 20%.
   Order of trust: what a VA has set on the ASIN (Settings › facts, the 0% VAT chip on the row) beats the keyword rule;
   the keyword rule beats the 20% default. The keyword lists are editable in Settings and shared.
   Applies to Rule 2 and Rule 3 rows. Rule 1 keeps its own frozen ZERO_VAT check (rule1.js is not touched).
   ============================================================================ */
const VAT0_KEY='bdl-sourcing-vat0';
const R4={
  STANDARD:0.20,
  /* whole words — 'pods' alone would catch AirPods, so capsules/pods only count next to a coffee word */
  ZERO:['coffee','tea','teabags','teabag','espresso','matcha','earl grey','english breakfast','nespresso','dolce gusto','tassimo','decaf','ristretto','lungo'],
  NOT:['machine','maker','brewer','grinder','kettle','mug','cup','flask','filter','descal','frother','cafeti','tumbler','teapot','infuser','towel','tree oil','light','holder','storage','canister','jar','caddy','spoon','press','tamper','scale','cleaner','tablet','tablets','set of','gift set','warmer','milk jug']};
function vat0Words(){const v=lsGet(VAT0_KEY,null);return v&&v.zero&&v.not?v:{zero:R4.ZERO.slice(),not:R4.NOT.slice()};}
function r4has(text,words){return words.some(w=>{w=w.trim().toLowerCase();if(!w)return false;return new RegExp('(^|[^a-z])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(text);});}
/* row = a Keepa export row (Title, Categories…); fact = what a VA has stored for the ASIN ({vat:0|20}).
   → {rate, why, src:'va'|'rule'|'default'} */
function vatFor(row,fact){
  if(fact&&fact.vat!=null&&fact.vat!=='')return{rate:(+fact.vat)/100,why:(+fact.vat===0?'0%':fact.vat+'%')+' VAT set by '+(fact.who||'a VA'),src:'va'};
  const text=((row.Title||'')+' | '+(row['Categories: Root']||'')+' | '+(row['Categories: Sub']||'')+' | '+(row['Categories: Tree']||'')).toLowerCase();
  const w=vat0Words();
  if(r4has(text,w.zero)&&!r4has(text,w.not))return{rate:0,why:'0% VAT assumed (tea / coffee) — confirm on the row',src:'rule'};
  return{rate:R4.STANDARD,why:'',src:'default'};}
