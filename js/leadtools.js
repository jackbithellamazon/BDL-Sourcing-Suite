/* BDL Sourcing — Lead tools page (score a lead · promo price). Unchanged from the Suite. */
function analyzeLead(){
  const spm=parseFloat($('#laSpm').value)||0,profit=parseFloat($('#laProfit').value)||0;
  const roi=parseFloat($('#laRoi').value)||0;
  if(!spm||!profit){$('#leadResults').style.display='none';$('#emptyL').style.display='flex';return;}
  $('#emptyL').style.display='none';
  let tier,tierClass;
  if(profit>=9){tier='High profit';tierClass='keep';}
  else if(profit>=3){tier='Mid profit';tierClass='mid';}
  else{tier='Low profit';tierClass='drop';}
  let score=0,note='';
  if(spm<10){score=1;note='Below minimum volume.';}
  else if(spm>=300){
    if(profit>=9){score=10;note='Absolute banger! Buy as many as possible.';}
    else if(profit>=3){score=9;note='Rare find. Fast SPM + mid profit. Buy as many as possible.';}
    else{score=7;note='Fast SPM but low profit. Still solid.';}}
  else if(spm>=100){
    if(profit>=9){score=9;note='Rare find. Strong volume + high profit. Buy as many as possible.';}
    else if(profit>=3){score=8;note='Strong buy. Good volume + mid profit.';}
    else{score=6;note='Decent volume but low profit.';}}
  else if(spm>=50){
    if(profit>=9){score=8;note='Good profit + decent volume. Strong buy.';}
    else if(profit>=3){score=7;note='Bread & butter mid-ticket. Solid buy.';}
    else{score=5;note='Borderline. Only if graphs look good.';}}
  else if(spm>=30){
    if(profit>=9){score=8;note='High profit + decent volume. Buy 7-15 units.';}
    else if(profit>=3){score=6;note='Will buy. Aim for 7-15 units depending on competition.';}
    else{score=3;note='Low priority. Pass.';}}
  else if(spm>=10){
    if(profit>=9){score=7;note='High profit! Borderline. Only if graphs look good.';}
    else if(profit>=3){score=5;note='Borderline. Only if graphs look good.';}
    else{score=2;note='Low priority. Pass.';}}
  let dock='';
  if(roi<10&&score>3){score=Math.max(score-2,3);dock=' <span class="dock">(ROI below 10% — docked 2 points)</span>';}
  else if(roi<10){score=1;note='ROI below 10%. Pass.';}
  $('#laSpmV').textContent=Math.round(spm).toLocaleString();
  $('#laProfitV').textContent='£'+profit.toFixed(2);
  $('#laRoiV').textContent=Math.round(roi)+'%';
  const pill=$('#laTierPill');pill.textContent=tier.toUpperCase();pill.className='pill '+tierClass;
  $('#laTierV').innerHTML='<span class="pill '+tierClass+'">'+tier.toUpperCase()+'</span>';
  const band=score>=8?'hi':score>=5?'md':'lo';
  const sn=$('#laScore');sn.className='scorenum '+band;
  sn.innerHTML=score.toFixed(1)+'<span class="of"> /10</span>';
  const fill=$('#laFill');fill.className='fill '+band;fill.style.width=(score/10*100)+'%';
  $('#laNote').innerHTML=escapeHtml(note)+dock;
  $('#leadResults').style.display='block';}
function clearLead(){['#laSpm','#laCost','#laProfit','#laRoi'].forEach(id=>$(id).value='');
  $('#leadResults').style.display='none';$('#emptyL').style.display='flex';}
function calcPromo(){
  const fullPrice=parseFloat($('#prPrice').value);
  const p5off4=$('#pr5off4').checked,pSS5=$('#prSS5').checked,pSS15=$('#prSS15').checked;
  if(!fullPrice||fullPrice<=0){$('#promoBox').classList.remove('show');$('#emptyP').style.display='flex';return;}
  $('#emptyP').style.display='none';
  let price=fullPrice;const rows=[];
  rows.push(`<div>Full price<span>£${fullPrice.toFixed(2)}</span></div>`);
  if(p5off4){price*=0.95;rows.push(`<div class="minus">5% off any 4<span>−5%</span></div>`);}
  if(pSS5){price*=0.95;rows.push(`<div class="minus">5% Subscribe &amp; Save<span>−5%</span></div>`);}
  if(pSS15){price*=0.85;rows.push(`<div class="minus">15% Subscribe &amp; Save<span>−15%</span></div>`);}
  price=Math.ceil(price*100)/100;
  rows.push(`<div class="final">Final price<span>£${price.toFixed(2)}</span></div>`);
  $('#prFinal').textContent='£'+price.toFixed(2);
  const saved=fullPrice-price;
  $('#prSave').textContent=saved>0.004?('saves £'+saved.toFixed(2)+' · '+Math.round(saved/fullPrice*100)+'% off'):'';
  $('#prBreakdown').innerHTML=rows.join('');
  $('#promoBox').classList.add('show');}
function clearPromo(){$('#prPrice').value='';['#pr5off4','#prSS5','#prSS15'].forEach(id=>$(id).checked=false);
  $('#promoBox').classList.remove('show');$('#emptyP').style.display='flex';}
function leadToolsInit(){
  ['#laSpm','#laCost','#laProfit','#laRoi'].forEach(id=>$(id).addEventListener('input',analyzeLead));
  $('#clearL').addEventListener('click',clearLead);
  ['#prPrice','#pr5off4','#prSS5','#prSS15'].forEach(id=>$(id).addEventListener('input',calcPromo));
  $('#copyP').addEventListener('click',e=>{const v=$('#prFinal').textContent;
    if(!$('#promoBox').classList.contains('show')){toast('Nothing to copy',true);return;}
    copy(v,'Final price copied',e.currentTarget,'Copied');});
  $('#clearP').addEventListener('click',clearPromo);}
