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
  ZERO:['coffee','tea','teabags','teabag','espresso','matcha','earl grey','english breakfast','nespresso','dolce gusto','tassimo','decaf','ristretto','lungo','cocoa','hot chocolate','drinking chocolate'],
  /* the drink is zero-rated; anything made FROM it or NAMED after it is not: machines, syrups, perfumes, cosmetics, supplements */
  NOT:['machine','maker','brewer','grinder','kettle','mug','cup','flask','filter','descal','frother','cafeti','tumbler','teapot','infuser','towel','tree oil','light','holder','storage','canister','jar','caddy','spoon','press','tamper','scale','cleaner','tablet','tablets','set of','gift set','warmer','milk jug',
    'syrup','edt','edp','eau de','perfume','fragrance','parfum','cologne','shampoo','conditioner','candle','soap','body wash','lotion','cream','scrub','serum','mask','diffuser','scented','supplement','caffeine','vitamin','protein','energy drink','liqueur','wine','beer','spirit','biscuit','biscuits','cake','sweets','chocolate bar','makeup','make-up','lip','lipstick','gloss','nail','mascara','eyeshadow','foundation','blush','hair','skin','toner','moisturis','cleanser']};
/* b59 (15 Sep, tea & coffee export: 14 of 84 rows went 20% on "Jar", "Caddy", "Biscuit Brew", "ideal for espresso machine"):
   a title that names the DRINK'S FORM — beans, ground, instant, pods, bags, a weight — is the drink, whatever else it mentions.
   Only a descaler / cleaner overrides that. */
const R4_STRONG=/(^|[^a-z])(beans|ground|instant|pods?|capsules?|sachets?|tea ?bags?|teabags?|loose leaf|leaf tea|refill|t-?discs|discs)([^a-z]|$)/;
const R4_WEAK=/(^|[^a-z])(multipack|pack of \d+|\d+ ?g|\d+ ?kg|\d+ ?x ?\d+)([^a-z]|$)/;
const R4_HARD=/(^|[^a-z])(descal|cleaner|cleaning|tablets?|supplements?|caffeine|diffuser|candle|fragrance|perfume|scented|edt|edp|syrup|concentrate|kombucha|oat drink|milk|creamer)/;
const R4_CORE=/(^|[^a-z])(machines?|makers?|brewers?|grinders?|kettles?|frothers?|cafeti[eè]res?)([^a-z]|$)/g;
/* an appliance word that is NOT inside a "for / ideal for / compatible with …" phrase means the row IS the appliance */
function r4coreOutsideCompat(text){const re=new RegExp(R4_CORE.source,'g');let m;while((m=re.exec(text))){const before=text.slice(Math.max(0,m.index-50),m.index+1);if(!/(^|[^a-z])(for|with|fits?|suits?|compatible|ideal|suitable|use in|works? in|in your)([^a-z])[^.,|;]*$/.test(before))return true;}return false;}
function r4isDrinkForm(text){text=String(text||'').replace(/caffeine[- ]free|decaffeinated|decaf/g,'');if(R4_HARD.test(text)||r4coreOutsideCompat(text))return false;return R4_STRONG.test(text)||(R4_WEAK.test(text)&&!r4has(text,vat0Words().not));}
/* the appliance test the tea & coffee FILTER uses (every row is the drink unless it reads like a machine) */
function r4isAppliance(text){return r4has(text,vat0Words().not)&&!r4isDrinkForm(text);}
function vat0Words(){const v=lsGet(VAT0_KEY,null);return v&&v.zero&&v.not?v:{zero:R4.ZERO.slice(),not:R4.NOT.slice()};}
function r4has(text,words){return words.some(w=>{w=w.trim().toLowerCase();if(!w)return false;return new RegExp('(^|[^a-z])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(text);});}
/* row = a Keepa export row (Title, Categories…); fact = what a VA has stored for the ASIN ({vat:0|20}).
   → {rate, why, src:'va'|'rule'|'default'} */
function vatFor(row,fact){
  if(fact&&fact.vat!=null&&fact.vat!=='')return{rate:(+fact.vat)/100,why:(+fact.vat===0?'0%':fact.vat+'%')+' VAT set by '+(fact.who||'a VA'),src:'va'};
  const text=((row.Title||'')+' | '+(row['Categories: Root']||'')+' | '+(row['Categories: Sub']||'')+' | '+(row['Categories: Tree']||'')).toLowerCase();
  const w=vat0Words();
  if(r4has(text,w.zero)&&r4isDrinkForm(text))return{rate:0,why:'0% VAT — tea / coffee, the product not the machine',src:'rule'};
  if(r4has(text,w.zero)&&!r4has(text,w.not))return{rate:0,why:'0% VAT assumed (tea / coffee) — confirm on the row',src:'rule'};
  return{rate:R4.STANDARD,why:'',src:'default'};}
