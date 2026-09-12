/* BDL Sourcing — sheet outputs: CSV, xlsx (hand-rolled, no library), dropped list. */
const R1_HDR=['STATUS','Changed','ASIN','Title','Sell range','ROI low %','ROI high %','SAS','Keepa','Buy link','UK sell link','Buy market','Landed £','Discount applied','Sell £ used','Sell used','Breakeven sell £','Profit £','ROI %','Best case','GOOD LEAD?','HAPPY ON SHEET?','WHY','SPM','SPM from','Buy price (local)','Basket qty','ROI at BuyBox90 %','Sell low £','Sell high £','Sell FBA now £','Sell FBA 30d £','Sell FBA 90d £','Sell BB 90d £','UK Amazon now £','Phase 2 (ROI>=10%)','OA price-match','All Amazon prices','Dropped in','Referral %','FBA fee £','kg','Fees from','LTD badge','Category','Flags','Last seen','Tracking since','Listed since'];
const R2_HDR=['#','STATUS','Changed','Score','ASIN','Product','Brand','Buy at £','After discount £','Discount applied','Sell for £','Profit £','ROI %','Sells /mo','Demand from','£ per month','Needs % off','Brand discount %','Check OA?','FBA resale proven?','Limited time deal?','Amazon 90d drop %','Offers','Reviews','GOOD LEAD?','WHY','Keepa','Buy link','SAS','Tracking since','Listed since','Last seen'];
function csvEsc(v){v=v==null?'':''+v;return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function rowsToCsv(hdr,out){return[hdr,...out.map(o=>hdr.map(h=>o[h]))].map(r=>r.map(csvEsc).join(',')).join('\r\n');}
function droppedCsv(R){const rows=[['ASIN','Title','Why dropped']];
  (R.gone||[]).forEach(([a,w])=>rows.push([a,'','GONE from the sheet: '+w]));(R.dropped||[]).forEach(d=>rows.push(d));
  return rows.map(r=>r.map(csvEsc).join(',')).join('\r\n');}
function buildXlsx(hdr,out,sheetName){const n=out.length;
  const col=i=>{let s='';i+=1;while(i){const rem=(i-1)%26;i=Math.floor((i-1)/26);s=String.fromCharCode(65+rem)+s;}return s;};
  const xe=s=>(''+s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
  const LABEL={SAS:'SAS',Keepa:'Keepa','Buy link':'BUY','UK sell link':'UK'};
  const cell=(ref,v,h,s)=>{if(v==null||v==='')return s?`<c r="${ref}" s="${s}"/>`:`<c r="${ref}"/>`;
    if(typeof v==='string'&&v.startsWith('http')){const lab=LABEL[h]||'link';return`<c r="${ref}" s="2" t="str"><f>HYPERLINK("${xe(v)}","${lab}")</f><v>${lab}</v></c>`;}
    if(typeof v==='number')return`<c r="${ref}"${s?` s="${s}"`:''}><v>${v}</v></c>`;
    if(typeof v==='boolean')return`<c r="${ref}" t="inlineStr"><is><t>${v?'yes':'no'}</t></is></c>`;
    return`<c r="${ref}"${s?` s="${s}"`:''} t="inlineStr"><is><t>${xe(v)}</t></is></c>`;};
  const gi=hdr.indexOf('GOOD LEAD?'),hi=hdr.indexOf('HAPPY ON SHEET?'),last=col(hdr.length-1);
  const W={Title:52,Product:52,Changed:22,Flags:60,'Sell range':16,'Discount applied':16,'Sell used':24,'OA price-match':34,'All Amazon prices':26,WHY:28,'Last seen':16,STATUS:11,ASIN:12};
  const cols='<cols>'+hdr.map((h,i)=>`<col min="${i+1}" max="${i+1}" width="${W[h]||11}" customWidth="1"/>`).join('')+'</cols>';
  const rows=['<row r="1">'+hdr.map((h,i)=>cell(col(i)+'1',h,null,1)).join('')+'</row>'];
  out.forEach((o,ri)=>{ri+=2;rows.push(`<row r="${ri}">`+hdr.map((h,i)=>cell(col(i)+ri,o[h],h)).join('')+'</row>');});
  let dv='';const dvs=[];
  if(gi>=0)dvs.push(`<dataValidation type="list" allowBlank="1" sqref="${col(gi)}2:${col(gi)}${n+1}"><formula1>"Yes,No,Maybe"</formula1></dataValidation>`);
  if(hi>=0)dvs.push(`<dataValidation type="list" allowBlank="1" sqref="${col(hi)}2:${col(hi)}${n+1}"><formula1>"Happy,Not happy"</formula1></dataValidation>`);
  if(dvs.length)dv=`<dataValidations count="${dvs.length}">${dvs.join('')}</dataValidations>`;
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane xSplit="4" ySplit="1" topLeftCell="E2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${rows.join('')}</sheetData><autoFilter ref="A1:${last}${n+1}"/>${dv}</worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8ECF7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const wb=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xe((sheetName||'Leads').slice(0,30))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbrels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  return zipStore([['[Content_Types].xml',ct],['_rels/.rels',rels],['xl/workbook.xml',wb],['xl/_rels/workbook.xml.rels',wbrels],['xl/styles.xml',styles],['xl/worksheets/sheet1.xml',sheet]]);}
/* minimal ZIP writer (stored, no compression) */
const ZIP_CRC=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=ZIP_CRC[(c^u[i])&0xFF]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
function zipStore(entries){const enc=new TextEncoder(),parts=[],cd=[];let off=0;const d=new Date();
  const dosT=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dosD=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  const u16=v=>[v&255,(v>>8)&255],u32=v=>[v&255,(v>>8)&255,(v>>16)&255,(v>>>24)&255];
  entries.forEach(([name,text])=>{const nm=enc.encode(name),data=enc.encode(text),crc=crc32(data);
    const lh=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(dosT),...u16(dosD),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0)]);
    parts.push(lh,nm,data);
    cd.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(dosT),...u16(dosD),...u32(crc),...u32(data.length),...u32(data.length),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=lh.length+nm.length+data.length;});
  const cdLen=cd.reduce((s,p)=>s+p.length,0);
  const eocd=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(cdLen),...u32(off),...u16(0)]);
  return new Blob([...parts,...cd,eocd],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
