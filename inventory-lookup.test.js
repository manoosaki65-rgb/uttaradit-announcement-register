import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lookupInventory,mapInventory,INVENTORY_API} from './inventory-lookup.js';
test('read-only exact match, pagination and correct field mapping',async()=>{
 let calls=0;
 const result=await lookupInventory('69-05508',async(url,options)=>{
  assert.equal(url.origin+url.pathname,INVENTORY_API);assert.equal(options.method,'GET');assert.equal(url.searchParams.get('inventory'),'69-05508');
  calls++;return {ok:true,json:async()=>({pages:2,items:calls===1?[{inventory:'69-055080'}]:[{inventory:'69-05508',item:'Auto CPAP',unit:'ENT',amount:54000,fundYear:'70',year:69,month:9,day:30,note:''}]})};
 });
 assert.equal(calls,2);assert.deepEqual(result.fields,{inventory_no:'69-05508',subject:'Auto CPAP',department:'ENT',amount:54000,budget_year:2570,inventory_date:'2026-09-30'});
 assert(!('announcement_date' in result.fields));assert(!('announcement_no' in result.fields));
});
test('missing inventory supports manual entry; empty master values do not erase fields',async()=>{
 const result=await lookupInventory('69-99999',async()=>({ok:true,json:async()=>({items:[],pages:1})}));
 assert.equal(result.message,'ไม่พบเลข Inventory');assert.equal(result.found,false);
 assert.deepEqual(mapInventory({inventory:'69-99999',amount:null,fundYear:'',day:31,month:13,year:69}),{inventory_no:'69-99999'});
});
test('invalid input makes no upstream call and upstream failure is explicit',async()=>{
 await assert.rejects(()=>lookupInventory('https://other.site',()=>{throw Error('must not call');}),/รูปแบบ/);
 await assert.rejects(()=>lookupInventory('69-05508',async()=>({ok:false})),/เชื่อมต่อ/);
});
