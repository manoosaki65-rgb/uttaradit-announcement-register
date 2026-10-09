import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const gas = readFileSync(new URL('./google-apps-script/MasterSync.gs', import.meta.url), 'utf8');
function sheetFixture() {
  const cells = new Map();
  const cell = (r,c) => {
    const key = `${r},${c}`;
    if (!cells.has(key)) cells.set(key,{value:'',note:''});
    return cells.get(key);
  };
  const sheet = {
    getLastRow:()=>28, getMaxRows:()=>1000,
    getRange(r,c,rows=1) {
      return {
        getValue:()=>cell(r,c).value,
        getDisplayValue:()=>String(cell(r,c).value),
        getDisplayValues:()=>Array.from({length:rows},(_,i)=>[String(cell(r+i,c).value)]),
        getNote:()=>cell(r,c).note,
        setValue(value){cell(r,c).value=value;return this;},
        setNote(note){cell(r,c).note=note;return this;},
        setNumberFormat(){return this;},
      };
    },
  };
  for (const r of [4,11,18,25]) {
    cell(r,3).value='เลขที่';
    cell(r,4).value='…………………....……………/ 2570  ลงวันที่';
    for(const offset of [1,2,3])cell(r+offset,4).value='………………....................';
    cell(r+3,6).value='………………...............';
  }
  return {sheet,cell};
}
test('Master write uses only template blocks, preserves occupied data, and updates the same id',()=>{
  const {sheet,cell}=sheetFixture();
  cell(5,4).value='ข้อมูลเดิมไม่มีเลข';
  const context=vm.createContext({SpreadsheetApp:{flush(){}},sheet});
  vm.runInContext(gas,context);
  const item={id:'verified-test',announcement_no:'99',announcement_date:'2026-10-09',subject:'ทดสอบ',amount:100,budget_year:2570,project_no:'P1',department:'พัสดุ'};
  context.item=item;
  const receipt=vm.runInContext('syncAnnouncementPrint_(sheet,item)',context);
  assert.equal(receipt.row,11);
  assert.equal(receipt.verified,true);
  assert.equal(cell(5,4).value,'ข้อมูลเดิมไม่มีเลข');
  item.subject='แก้รายการเดิม';
  assert.equal(vm.runInContext('syncAnnouncementPrint_(sheet,item)',context).row,11);
  assert.equal(cell(12,4).value,'แก้รายการเดิม');
  for(const r of [18,25])cell(r,4).value='1/2570 ลงวันที่';
  context.item={...item,id:'another-id'};
  assert.throws(()=>vm.runInContext('syncAnnouncementPrint_(sheet,item)',context),/No empty/);
  assert.equal(cell(32,4).value,'');
  assert.throws(()=>vm.runInContext('syncAnnouncementPrint_(null,item)',context),/Missing/);
});

test('server rejects HTTP 200 HTML, error JSON, unverified receipts and wrong ids',async()=>{
  const source=readFileSync(new URL('./server.js',import.meta.url),'utf8');
  const fn=source.slice(source.indexOf('async function syncMaster('),source.indexOf("app.get('/api/announcements'"));
  const item={id:'test-id'};
  const valid={ok:true,system:'announcement',id:item.id,verified:true,spreadsheet_id:'1eFV9JbOBkTYeg25vyVxiiZ8MA7KadHh7EHg03fodeHQ',sheet:'ออกเลขประกาศ 70'};
  for(const [body,expected] of [['<html>Error</html>',false],[JSON.stringify({error:'Unauthorized'}),false],[JSON.stringify({...valid,verified:false}),false],[JSON.stringify({...valid,id:'other'}),false],[JSON.stringify(valid),true]]) {
    const context=vm.createContext({process:{env:{MASTER_SYNC_URL:'https://example.test/exec',MASTER_SYNC_TOKEN:'test'}},AbortController,setTimeout:(f,ms)=>ms===30000?1:setTimeout(f,0),clearTimeout:()=>{},console:{error(){}},fetch:async()=>({ok:true,status:200,text:async()=>body}),item});
    vm.runInContext(fn,context);
    assert.equal((await vm.runInContext("syncMaster('upsert',item)",context)).ok,expected);
  }
});
