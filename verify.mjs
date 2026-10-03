import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:3010';
let cookie='';
async function call(method,path,body,expected=200){
 const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json();assert.equal(res.status,expected,JSON.stringify(data));return {res,data};
}
const before=(await call('GET','/api/announcements')).data.items;
assert.equal(before.length,3);
assert.equal(before[0].announcement_no,'902');
assert.equal(before.reduce((s,r)=>s+(r.amount||0),0),17300);
const entry={announcement_no:'999123',announcement_date:'2026-10-03',subject:'CRUD disposable test',amount:123.45,budget_year:2570,project_no:'TEST-123',note:'Disposable',inventory_no:'TEST-INV',inventory_date:'2026-10-01',department:'Test department',status:'ข้อมูลทดสอบ'};
const created=(await call('POST','/api/announcements',entry,201)).data.item;
try{
 await call('POST','/api/announcements',entry,409);
 const edited={...entry,subject:'CRUD edited test',amount:567.89};
 await call('PUT','/api/announcements/'+created.id,edited);
 const fresh=(await call('GET','/api/announcements')).data.items;
 assert.equal(fresh.length,4);assert.equal(fresh[0].id,created.id);
 const saved=fresh.find(r=>r.id===created.id);
 for(const [k,v] of Object.entries(edited))assert.equal(saved[k],v,k);
 console.log('PASS anonymous create, duplicate protection, edit all fields, fresh-read persistence and latest-number sorting');
}finally{await call('DELETE','/api/announcements/'+created.id);}
const after=(await call('GET','/api/announcements')).data.items;
assert.deepEqual(after,before);
const backup=(await call('GET','/api/export')).data;
assert(backup.items.find(r=>r.id===created.id)?.deleted);
console.log('PASS delete, baseline unchanged, export including recoverable deleted record');
