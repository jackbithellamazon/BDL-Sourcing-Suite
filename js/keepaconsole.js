/* BDL Sourcing — Keepa console page (Combine ASINs · Filter & sort). From the Suite; b154 adds the Lead / Not a lead column (kcjudge.js). */
let combinedSet=new Map(),combinedCount=0,filesC=[];
function renderC(){const uniq=[...combinedSet.keys()],has=uniq.length>0;
  $('#yieldC').classList.toggle('show',has);$('#setC').style.display=has?'flex':'none';
  $('#barC').style.display=has?'flex':'none';$('#outC').classList.toggle('show',has);
  $('#hintC').style.display=has?'block':'none';
  $('#cTotalLbl').textContent=combinedCount.toLocaleString()+' read';
  const dupes=combinedCount-uniq.length;countUp($('#cUnique'),uniq.length);countUp($('#cDupes'),dupes);
  $('#cPct').textContent=has?Math.round(uniq.length/combinedCount*100)+'% unique':'';
  setBar($('#cKeepSeg'),$('#cDropSeg'),uniq.length,dupes);$('#outC').value=uniq.join(', ');
  $('#filesC').innerHTML=filesC.map(f=>`<span class="f">${escapeHtml(f)}</span>`).join('');}
function handleCFiles(list){const arr=[...list];if(!arr.length)return;let done=0;
  arr.forEach(file=>{filesC.push(file.name);const r=new FileReader();
    r.onload=e=>{const rows=parseCSV(e.target.result);
      if(rows.length){const header=rows[0],body=rows.slice(1);
        const headerIsAsin=asinRe.test((header[0]||'').trim());const all=headerIsAsin?rows:body;
        let col=findAsinCol(header,body);if(col<0)col=0;
        all.forEach(rw=>{const v=(rw[col]||rw[0]||'').trim();
          if(asinRe.test(v)){combinedCount++;if(!combinedSet.has(v))combinedSet.set(v,true);}});}
      if(++done===arr.length)renderC();};r.readAsText(file);});}
dz($('#dropC'),$('#fileC'));
$('#fileC').addEventListener('change',e=>handleCFiles(e.target.files));
$('#dropC').addEventListener('drop',e=>{e.preventDefault();$('#dropC').classList.remove('over');handleCFiles(e.dataTransfer.files);});
$('#copyC').addEventListener('click',e=>copy($('#outC').value,combinedSet.size+' ASINs copied',e.currentTarget,'Copied'));
$('#openC').addEventListener('click',()=>{const a=[...combinedSet.keys()];
  if(!a.length){toast('Nothing to open',true);return;}window.open(keepaLink(a,$('#domainC').value),'_blank');});
$('#dlC').addEventListener('click',()=>download('unique-asins.txt',$('#outC').value));

/* ============ KEEPA · FILTER ============ */
let viewerRows=[],viewerHeader=[],idxAsin=-1,idxDrops=-1,idxBought=-1,idxTitle=-1,idxOffers=-1,idxBuyBox=-1,idxAmazon90Drop=-1,showAll=false,keptAsins=[];
function num(v){if(v==null)return 0;v=(''+v).trim().replace(/,/g,'').replace(/\+/g,'').replace(/£/g,'').replace(/€/g,'').replace(/\$/g,'');
  if(v==='')return 0;const n=parseFloat(v);return isNaN(n)?0:n;}
function findCol(names){for(const n of names){const i=viewerHeader.findIndex(h=>h.trim().toLowerCase()===n);if(i>=0)return i;}
  for(const n of names){const i=viewerHeader.findIndex(h=>h.trim().toLowerCase().includes(n));if(i>=0)return i;}return -1;}
function updateRuleText(){
  const thD=num($('#thDrops').value),thB=num($('#thBought').value),thO=num($('#thOffers').value),thBB=num($('#thBuyBox').value);
  const amazon90Active=$('#thAmazon90Drop').value.trim()!=='';
  const thAmazon90=num($('#thAmazon90Drop').value);
  const chip=v=>`<span class="chip">${v}</span>`,or=`<span class="or">OR</span>`,and=`<span class="or" style="color:var(--jade)">AND</span>`;
  let salesPart=`<span class="grp">Keep when ${chip('drops ≥ '+thD)} ${or} ${chip('bought > '+thB)}</span>`;
  let parts=[salesPart];
  if(thO>0) parts.push(`${chip('offers ≥ '+thO)}`);
  if(thBB>0) parts.push(`${chip('buy box ≥ £'+thBB.toFixed(2))}`);
  if(amazon90Active) parts.push(`${chip('Amazon 90d drop ≥ '+thAmazon90+'%')}`);
  const joined=parts.length===1?parts[0]:parts[0]+' '+parts.slice(1).map(p=>`${and} ${p}`).join(' ');
  const noteCols=[];
  if(thO>0&&idxOffers<0)noteCols.push('offer count');
  if(thBB>0&&idxBuyBox<0)noteCols.push('buy box price');
  if(amazon90Active&&idxAmazon90Drop<0)noteCols.push('Amazon 90 days drop %');
  const note=noteCols.length?' <span style="color:var(--amber)">⚠ '+noteCols.join(' & ')+' column not found in CSV — filter ignored</span>':'';
  $('#ruleText').innerHTML=joined+'.'+note;}
function rowPassesFilter(r,thD,thB,thO,thBB,amazon90Active,thAmazon90){
  const d=num(r[idxDrops]),b=num(r[idxBought]);
  const salesOk=d>=thD||b>thB;
  const offersOk=thO===0||idxOffers<0||num(r[idxOffers])>=thO;
  const buyBoxOk=thBB===0||idxBuyBox<0||num(r[idxBuyBox])>=thBB;
  const amazon90Ok=!amazon90Active||idxAmazon90Drop<0||num(r[idxAmazon90Drop])>=thAmazon90;
  return salesOk&&offersOk&&buyBoxOk&&amazon90Ok;}
function runFilter(){if(!viewerRows.length)return;
  const thD=num($('#thDrops').value),thB=num($('#thBought').value),thO=num($('#thOffers').value),thBB=num($('#thBuyBox').value);
  const amazon90Active=$('#thAmazon90Drop').value.trim()!=='';
  const thAmazon90=num($('#thAmazon90Drop').value);
  updateRuleText();
  if(idxDrops<0||idxBought<0||idxAsin<0){const miss=[];
    if(idxAsin<0)miss.push('ASIN');if(idxDrops<0)miss.push('Sales Rank: Drops last 30 days');
    if(idxBought<0)miss.push('Monthly Sales Trends: Bought in past month');
    $('#warnF').innerHTML='<b>This doesn\'t look like a Product Viewer export.</b> Missing column'+(miss.length>1?'s':'')+': '+miss.join(', ')+'. This tab needs the full export with all columns — a plain ASIN list belongs in Combine ASINs.';
    $('#warnF').classList.add('show');$('#yieldF').classList.remove('show');$('#barF').style.display='none';$('#tableWrap').classList.remove('show');if($('#kcBar'))$('#kcBar').hidden=true;return;}
  $('#warnF').classList.remove('show');let kept=[],dropped=[];
  viewerRows.forEach(r=>{
    const d=num(r[idxDrops]),b=num(r[idxBought]);
    const offers=idxOffers>=0?num(r[idxOffers]):null;
    const buyBox=idxBuyBox>=0?num(r[idxBuyBox]):null;
    const amazon90Drop=idxAmazon90Drop>=0?num(r[idxAmazon90Drop]):null;
    const keep=rowPassesFilter(r,thD,thB,thO,thBB,amazon90Active,thAmazon90);
    (keep?kept:dropped).push({asin:(r[idxAsin]||'').trim(),title:idxTitle>=0?(r[idxTitle]||''):'',drops:d,bought:b,offers,buyBox,amazon90Drop,keep});});
  $('#yieldF').classList.add('show');$('#barF').style.display='flex';
  $('#fTotalLbl').textContent=viewerRows.length.toLocaleString()+' rows';
  countUp($('#fKept'),kept.length);countUp($('#fDropped'),dropped.length);
  $('#fPct').textContent=Math.round(kept.length/viewerRows.length*100)+'% kept';
  setBar($('#fKeepSeg'),$('#fDropSeg'),kept.length,dropped.length);
  keptAsins=kept.map(k=>k.asin);$('#outF').value=keptAsins.join(', ');
  const listArr=showAll?[...kept,...dropped]:kept;
  const showOfferCol=idxOffers>=0,showBbCol=idxBuyBox>=0,showAmazon90Col=idxAmazon90Drop>=0;
  let h='<thead><tr><th>ASIN</th><th>Title</th><th class="r">Drops 30d</th><th class="r">Bought</th>'+(showOfferCol?'<th class="r">Offers</th>':'')+(showBbCol?'<th class="r">Buy Box</th>':'')+(showAmazon90Col?'<th class="r">Amazon drop 90d</th>':'')+'<th class="r">Status</th>'+(typeof kcHead==='function'?kcHead():'')+'</tr></thead><tbody>';
  /* b154: each row carries what Lead / Not a lead saves with it (kcjudge.js) */
  const kcOn=typeof kcCell==='function';
  listArr.slice(0,1000).forEach(k=>{const ok=asinRe.test(k.asin);h+=`<tr${ok?` data-asin="${k.asin}" data-title="${escapeHtml((k.title||'').slice(0,80))}" data-bb="${k.buyBox||''}" data-bought="${k.bought||''}" data-drops="${k.drops||''}"`:''}><td class="asin">${k.asin}</td><td class="title">${escapeHtml(k.title)}</td>`+
    `<td class="num">${k.drops?k.drops.toLocaleString():'<span class=z>0</span>'}</td>`+
    `<td class="num">${k.bought?k.bought.toLocaleString():'<span class=z>—</span>'}</td>`+
    (showOfferCol?`<td class="num">${k.offers?k.offers.toLocaleString():'<span class=z>0</span>'}</td>`:'')+
    (showBbCol?`<td class="num">${k.buyBox!=null&&k.buyBox>0?'£'+k.buyBox.toFixed(2):'<span class=z>—</span>'}</td>`:'')+
    (showAmazon90Col?`<td class="num">${k.amazon90Drop!=null?k.amazon90Drop.toLocaleString()+'%':'<span class=z>—</span>'}</td>`:'')+
    `<td class="st"><span class="pill ${k.keep?'keep':'drop'}">${k.keep?'KEEP':'DROP'}</span></td>`+(kcOn?(ok?kcCell(k):'<td class="kcj"></td>'):'')+`</tr>`;});
  h+='</tbody>';$('#tableF').innerHTML=h;$('#tableWrap').classList.add('show');if(typeof kcAfterRender==='function')kcAfterRender();
  $('#toggleAll').textContent=showAll?'Show kept only':'Show all rows';
  if(listArr.length>1000)toast('Showing first 1,000 rows');}
function handleFFile(file){$('#filesF').innerHTML=`<span class="f">${escapeHtml(file.name)}</span>`;
  const r=new FileReader();r.onload=e=>{const rows=parseCSV(e.target.result);
    if(rows.length<2){toast('No data rows found',true);return;}
    viewerHeader=rows[0];viewerRows=rows.slice(1);idxAsin=findCol(['asin']);
    idxDrops=findCol(['sales rank: drops last 30 days','drops last 30 days','drops']);
    idxBought=findCol(['monthly sales trends: bought in past month','bought in past month','bought']);
    idxTitle=findCol(['title']);
    idxOffers=findCol(['offer count','new offer count','total offer count','offers','# sellers','sellers']);
    idxBuyBox=findCol(['buy box: current','current buy box price','buy box price','buybox','buy box']);
    idxAmazon90Drop=findCol(['amazon: 90 days drop %','amazon 90 days drop %','amazon: 90 day drop %','amazon 90d drop %']);
    updateRuleText();runFilter();};r.readAsText(file);}
dz($('#dropF'),$('#fileF'));
$('#fileF').addEventListener('change',e=>{if(e.target.files[0])handleFFile(e.target.files[0]);});
$('#dropF').addEventListener('drop',e=>{e.preventDefault();$('#dropF').classList.remove('over');if(e.dataTransfer.files[0])handleFFile(e.dataTransfer.files[0]);});
['#thDrops','#thBought','#thOffers','#thBuyBox','#thAmazon90Drop'].forEach(id=>$(id).addEventListener('input',runFilter));
$('#copyF').addEventListener('click',e=>copy($('#outF').value,$('#fKept').textContent+' ASINs copied',e.currentTarget,'Copied'));
$('#openKeepa').addEventListener('click',()=>{if(!keptAsins.length){toast('No ASINs to open',true);return;}window.open(keepaLink(keptAsins,$('#domainF').value),'_blank');});
$('#copyKeepa').addEventListener('click',e=>{if(!keptAsins.length){toast('No ASINs',true);return;}copy(keepaLink(keptAsins,$('#domainF').value),'Keepa link copied',e.currentTarget,'Link copied');});
$('#toggleAll').addEventListener('click',()=>{showAll=!showAll;runFilter();});
$('#dlCsvF').addEventListener('click',()=>{if(idxDrops<0||idxBought<0){toast('No valid export loaded',true);return;}
  const thD=num($('#thDrops').value),thB=num($('#thBought').value),thO=num($('#thOffers').value),thBB=num($('#thBuyBox').value);
  const amazon90Active=$('#thAmazon90Drop').value.trim()!=='';
  const thAmazon90=num($('#thAmazon90Drop').value);
  const keptRaw=viewerRows.filter(r=>rowPassesFilter(r,thD,thB,thO,thBB,amazon90Active,thAmazon90));
  const esc=v=>{v=v==null?'':''+v;return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const out=[viewerHeader,...keptRaw].map(r=>r.map(esc).join(',')).join('\r\n');download('keepa-filtered.csv',out,'text/csv');});


/* ============ KEEPA · BRAND RUN (Phase 1 rules, frozen 8 Sep 2026) ============ */
function clearCombine(){combinedSet=new Map();combinedCount=0;filesC=[];$('#fileC').value='';renderC();}
function clearFilter(){viewerRows=[];keptAsins=[];showAll=false;$('#fileF').value='';
  $('#thDrops').value='10';$('#thBought').value='10';$('#thOffers').value='0';$('#thBuyBox').value='0';$('#thAmazon90Drop').value='';$('#domainF').value='2';updateRuleText();
  $('#yieldF').classList.remove('show');$('#barF').style.display='none';$('#tableWrap').classList.remove('show');
  $('#warnF').classList.remove('show');$('#filesF').innerHTML='';$('#outF').classList.remove('show');$('#outF').value='';$('#tableF').innerHTML='';if($('#kcBar'))$('#kcBar').hidden=true;}
$('#clearC').addEventListener('click',clearCombine);$('#clearF').addEventListener('click',clearFilter);
updateRuleText();
