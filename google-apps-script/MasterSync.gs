// Google Apps Script web app used by bothทะเบียนเลขประกาศ andทะเบียนเลขที่สัญญา.
// Deploy this script as a Web app (Execute as: Me, Who has access: Anyone).
// Set Script Property SYNC_TOKEN to the same secret used by Render/Cloudflare.

const MASTER_SPREADSHEET_ID = '1eFV9JbOBkTYeg25vyVxiiZ8MA7KadHh7EHg03fodeHQ';
const ANNOUNCEMENT_SHEET = 'ออกเลขประกาศ 70';
const CONTRACT_SHEET = 'สัญญา 70';
const ANNOUNCEMENT_DATA_SHEET = 'WEB_ประกาศ_70';
const CONTRACT_DATA_SHEET = 'WEB_สัญญา_70';

// This handler is named doPostLegacy in the existing shared Apps Script project.
// Keep its existing posting dispatcher and all posting functions when applying this file.
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    return syncMasterRequest_(e);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(error.message||error)}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function syncMasterRequest_(e) {
  const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  const expected = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
  if (!expected || payload.token !== expected) throw new Error('Unauthorized');
  if (!payload.item || !payload.system || !String(payload.item.id||'')) throw new Error('Missing payload');

  const ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
  let receipt = {};
  if (payload.system === 'announcement') {
    receipt = syncAnnouncementPrint_(ss.getSheetByName(ANNOUNCEMENT_SHEET), payload.item);
    upsertDataSheet_(ss, ANNOUNCEMENT_DATA_SHEET,
      ['id','เลขประกาศ','วันที่','เรื่อง','วงเงิน','ปีงบประมาณ','เลขที่โครงการ','หมายเหตุ','Inventory','วันที่รับ','หน่วยงาน','สถานะ'],
      announcementRow_(payload.item));
  } else if (payload.system === 'contract') {
    upsertDataSheet_(ss, CONTRACT_DATA_SHEET,
      ['id','เลขที่สัญญา','ปีงบประมาณ','วันที่สัญญา','รายการ','ผู้ขาย/ผู้รับจ้าง','วงเงิน','Inventory','เจ้าหน้าที่/หน่วยงาน','แหล่งเงิน','หมายเหตุ'],
      contractRow_(payload.item));
    syncContractPrint_(ss.getSheetByName(CONTRACT_SHEET), payload.item);
  } else {
    throw new Error('Unknown system');
  }

  SpreadsheetApp.flush();
  return ContentService.createTextOutput(JSON.stringify({ok:true,system:payload.system,id:String(payload.item.id||''),...receipt}))
    .setMimeType(ContentService.MimeType.JSON);
}

function announcementRow_(x) {
  return [String(x.id||''), String(x.announcement_no||''), String(x.announcement_date||''), String(x.subject||''),
    x.amount==null?'':Number(x.amount), x.budget_year==null?'':Number(x.budget_year), String(x.project_no||''),
    String(x.note||''), String(x.inventory_no||''), String(x.inventory_date||''), String(x.department||''), String(x.status||'')];
}

function contractRow_(x) {
  return [String(x.id||''), String(x.contract_no||''), x.fiscal_year==null?'':Number(x.fiscal_year), String(x.contract_date||''),
    String(x.subject||''), String(x.vendor||''), x.amount==null?'':Number(x.amount), String(x.inventory_no||''),
    String(x.buyer||''), String(x.fund_source||''), String(x.note||'')];
}

function upsertDataSheet_(ss, name, headers, row) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  const id = String(row[0]||'');
  let target = 0;
  if (id && sh.getLastRow() >= 2) {
    const ids = sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues();
    for (let i=0;i<ids.length;i++) if (String(ids[i][0]) === id) { target = i+2; break; }
  }
  if (!target) target = Math.max(2, sh.getLastRow()+1);
  sh.getRange(target,1,1,row.length).setValues([row]);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function syncAnnouncementPrint_(sh, x) {
  if (!sh) throw new Error('Missing announcement sheet');
  const id = String(x.id||'');
  const starts = [];
  for (let r=4;r<=Math.min(sh.getLastRow()-3,sh.getMaxRows()-3);r+=7) {
    if (sh.getRange(r,3).getDisplayValue() === 'เลขที่') starts.push(r);
  }
  let start = findByNote_(sh, starts, 4, id);
  if (!start) start = findAnnouncementBlank_(sh, starts);
  if (!start) throw new Error('No empty announcement block; existing data preserved');

  const year = x.budget_year || 2570;
  sh.getRange(start,4).setValue(`${x.announcement_no||''}/${year}  ลงวันที่`).setNote('web_id:'+id);
  sh.getRange(start,5).setNumberFormat('@').setValue(thaiDate_(x.announcement_date));
  sh.getRange(start+1,4).setValue(x.subject||'');
  sh.getRange(start+2,4).setValue(x.amount==null?'':Number(x.amount)).setNumberFormat('#,##0.00');
  sh.getRange(start+3,4).setValue(x.project_no||'');
  sh.getRange(start+3,6).setValue(x.department||'');
  SpreadsheetApp.flush();
  if (sh.getRange(start,4).getNote() !== 'web_id:'+id ||
      sh.getRange(start,4).getValue() !== `${x.announcement_no||''}/${year}  ลงวันที่` ||
      sh.getRange(start,5).getValue() !== thaiDate_(x.announcement_date) ||
      sh.getRange(start+1,4).getValue() !== (x.subject||'') ||
      sh.getRange(start+2,4).getValue() !== (x.amount==null?'':Number(x.amount)) ||
      sh.getRange(start+3,4).getValue() !== (x.project_no||'') ||
      sh.getRange(start+3,6).getValue() !== (x.department||'')) {
    throw new Error('Announcement readback failed');
  }
  return {verified:true,spreadsheet_id:MASTER_SPREADSHEET_ID,sheet:ANNOUNCEMENT_SHEET,row:start};
}

function syncContractPrint_(sh, x) {
  if (!sh) return;
  const id = String(x.id||'');
  const starts = [];
  for (let r=2;r<=sh.getMaxRows();r+=13) starts.push(r);
  let start = findByNote_(sh, starts, 3, id);
  if (!start) start = findContractBlank_(sh, starts);
  if (!start) return; // full formatted page: data is still safely kept in WEB_สัญญา_70

  sh.getRange(start+1,3).setValue(x.contract_no||'').setNote('web_id:'+id);
  sh.getRange(start+1,4).setValue('ลงวันที่ '+thaiDate_(x.contract_date));
  sh.getRange(start+4,3).setValue(x.subject||'');
  sh.getRange(start+6,3).setValue(x.fund_source||'');
  sh.getRange(start+8,5).setValue(x.amount==null?'':Number(x.amount)).setNumberFormat('#,##0.00');
  sh.getRange(start+10,3).setValue(x.vendor||'');
  sh.getRange(start+11,4).setValue('เจ้าหน้าที่จัดซื้อ '+String(x.buyer||''));
}

function findByNote_(sh, starts, valueColumn, id) {
  if (!id) return 0;
  for (const start of starts) {
    const cell = sh.getRange(start,valueColumn);
    if (cell.getNote() === 'web_id:'+id) return start;
  }
  return 0;
}

function findAnnouncementBlank_(sh, starts) {
  for (const start of starts) {
    const note = sh.getRange(start,4).getNote();
    const v = sh.getRange(start,4).getDisplayValue();
    const values = [v,...sh.getRange(start+1,4,3,1).getDisplayValues().map(row=>row[0]),sh.getRange(start+3,6).getDisplayValue()];
    if (!note && values.every(value=>!value || /^[\s.…/\dลงวันที่]+$/.test(value) && /[.…]/.test(value))) return start;
  }
  return 0;
}

function findContractBlank_(sh, starts) {
  for (const start of starts) {
    const cell = sh.getRange(start+1,3);
    const note = cell.getNote();
    const v = cell.getDisplayValue();
    if (!note && (!v || v.indexOf('....') >= 0 || v.indexOf('…') >= 0)) return start;
  }
  return 0;
}

function thaiDate_(iso) {
  if (!iso) return '';
  const p = String(iso).split('-');
  if (p.length !== 3) return String(iso);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const y = Number(p[0]) + 543;
  return `${Number(p[2])} ${months[Number(p[1])-1]} ${y}`;
}
