import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareAnnouncements} from './ordering.js';
test('database and UI use number DESC, creation DESC, insertion order DESC',async()=>{
 process.env.SQLITE_PATH=':memory:';
 const {list,insert,close}=await import('./database.js');
 const base={announcement_no:'903',announcement_date:'2025-01-01',subject:'Ordering test',amount:null,budget_year:null,project_no:null,note:null,inventory_no:null,inventory_date:null,department:null,status:null};
 const older=insert(base);
 const newer=insert({...base,announcement_date:'2024-01-01',subject:'Newer same number'});
 const highest=insert({...base,announcement_no:'1000',announcement_date:'2020-01-01'});
 const rows=list();
 assert.equal(rows[0].id,highest.id);
 assert.equal(rows[1].id,newer.id);
 assert.equal(rows[2].id,older.id);
 assert.deepEqual([...rows].reverse().sort(compareAnnouncements).map(r=>r.id),rows.map(r=>r.id));
 assert(compareAnnouncements({announcement_no:'5',created_at:'2026-01-01T01:00:00Z'},{announcement_no:'5',created_at:'2026-01-01 00:00:00'})<0);
 close();
});
