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
  /* b183 (Jack, 27 Sep: "Durex — 5% VAT as it's condoms"). HMRC's reduced rate for contraceptives. A VA's own setting on the row still wins. */
  REDUCED:0.05,REDUCED_WORDS:['condom','condoms','contraceptive','contraceptives','durex','skyn'],
  /* whole words — 'pods' alone would catch AirPods, so capsules/pods only count next to a coffee word */
  ZERO:['coffee','tea','teabags','teabag','espresso','matcha','earl grey','english breakfast','nespresso','dolce gusto','tassimo','decaf','ristretto','lungo','cocoa','hot chocolate','drinking chocolate',
    /* b333 (Jack, 16 Nov: baby bottles are 0% VAT "like tea and coffee"): the feeding bottle itself — never its warmer, steriliser, brush or rack (those are in NOT) */
    'baby bottle','baby bottles','feeding bottle','feeding bottles','anti-colic bottle','anti-colic bottles'],
  /* the drink is zero-rated; anything made FROM it or NAMED after it is not: machines, syrups, perfumes, cosmetics, supplements */
  NOT:['machine','maker','brewer','grinder','kettle','mug','cup','flask','filter','descal','frother','cafeti','tumbler','teapot','infuser','towel','tree oil','light','holder','storage','canister','jar','caddy','spoon','press','tamper','scale','cleaner','tablet','tablets','set of','gift set','warmer','milk jug',
    'syrup','edt','edp','eau de','perfume','fragrance','parfum','cologne','shampoo','conditioner','candle','soap','body wash','lotion','cream','scrub','serum','mask','diffuser','scented','supplement','caffeine','vitamin','protein','energy drink','liqueur','wine','beer','spirit','biscuit','biscuits','cake','sweets','chocolate bar','makeup','make-up','lip','lipstick','gloss','nail','mascara','eyeshadow','foundation','blush','hair','skin','toner','moisturis','cleanser',
    /* b333: a feeding bottle's accessories, and the bottle that is not a feeding bottle */
    'bottle warmer','steriliser','sterilizer','bottle brush','drying rack','water bottle','bottle nipple','teats for']};   /* the last two: spare teats sold "for baby bottles" (NUK B08V79VFYJ) are not the bottle */
/* b333: the ZERO words that are a feeding bottle, not a drink — they never take the drink-form short cut ("instant", "refill", a weight) and the why line names them */
const R4_BOTTLE=['baby bottle','baby bottles','feeding bottle','feeding bottles','anti-colic bottle','anti-colic bottles'];
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
/* b333: the saved list is ADDED TO the built-in one, never used instead of it. Live's list was saved on 13 Sep and so never got the words added since
   (syrup, perfume, shampoo, scrub, cocoa…): "coffee body scrub" could be worked at 0%. Nothing is written back here. */
function vat0Union(saved,base){return[...new Set((saved||[]).concat(base||[]).map(x=>String(x==null?'':x).trim().toLowerCase()).filter(Boolean))];}
function vat0Words(){const v=lsGet(VAT0_KEY,null);return v&&v.zero&&v.not?{zero:vat0Union(v.zero,R4.ZERO),not:vat0Union(v.not,R4.NOT)}:{zero:R4.ZERO.slice(),not:R4.NOT.slice()};}
/* b242 (Jack, 3 Oct: "Bialetti is all 20% VAT"): moka pots sat in Keepa's "Coffee Makers" — plural, so the singular 'maker' never matched and
   they went 0% as if they were coffee. The appliance words now match their plural too, and a brand that only makes the hardware is always 20%. */
const R4_STD_BRANDS=['bialetti'];
function r4hasPl(text,words){return words.some(w=>{w=w.trim().toLowerCase();if(!w)return false;return new RegExp('(^|[^a-z])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(e?s)?([^a-z]|$)').test(text);});}
function r4has(text,words){return words.some(w=>{w=w.trim().toLowerCase();if(!w)return false;return new RegExp('(^|[^a-z])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^a-z]|$)').test(text);});}
/* row = a Keepa export row (Title, Categories…); fact = what a VA has stored for the ASIN ({vat:0|20}).
   → {rate, why, src:'va'|'rule'|'default'} */
function vatFor(row,fact){
  if(fact&&fact.vat!=null&&fact.vat!=='')return{rate:(+fact.vat)/100,why:(+fact.vat===0?'0%':fact.vat+'%')+' VAT set by '+(fact.who||'a VA'),src:'va'};
  const text=((row.Title||'')+' | '+(row['Categories: Root']||'')+' | '+(row['Categories: Sub']||'')+' | '+(row['Categories: Tree']||'')).toLowerCase();
  const w=vat0Words(),drink=w.zero.filter(x=>!R4_BOTTLE.includes(x)),bottle=w.zero.filter(x=>R4_BOTTLE.includes(x));
  if(R4.REDUCED_WORDS.some(x=>new RegExp('(^|[^a-z])'+x+'([^a-z]|$)').test(text)))return{rate:R4.REDUCED,why:'5% VAT — contraceptives, HMRC reduced rate',src:'rule'};
  if(r4has(text,drink)&&r4isDrinkForm(text))return{rate:0,why:'0% VAT — tea / coffee, the product not the machine',src:'rule'};
  /* b242: the brand rule comes AFTER the coffee itself — Bialetti's own ground coffee (Omni Ground Espresso) is still food at 0%; its pots are 20% */
  if(R4_STD_BRANDS.includes(String(row.Brand||'').trim().toLowerCase()))return{rate:R4.STANDARD,why:'',src:'brand'};
  if(r4has(text,drink)&&!r4hasPl(text,w.not))return{rate:0,why:'0% VAT assumed (tea / coffee) — confirm on the row',src:'rule'};
  /* b333: a baby's feeding bottle — only when the title names the bottle and none of the accessory words */
  if(r4has(text,bottle)&&!r4hasPl(text,w.not))return{rate:0,why:'0% VAT assumed (baby bottle) — confirm on the row',src:'rule'};
  return{rate:R4.STANDARD,why:'',src:'default'};}
