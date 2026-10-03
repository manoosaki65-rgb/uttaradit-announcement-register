import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
const db=new DatabaseSync(process.env.SQLITE_PATH || 'announcement-test.sqlite');
db.exec("PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS announcements(id TEXT PRIMARY KEY,announcement_no TEXT NOT NULL DEFAULT '',announcement_date TEXT,subject TEXT NOT NULL,amount REAL,budget_year INTEGER,project_no TEXT,note TEXT,inventory_no TEXT,inventory_date TEXT,department TEXT,status TEXT,deleted INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE UNIQUE INDEX IF NOT EXISTS number_year ON announcements(announcement_no,substr(announcement_date,1,4)) WHERE deleted=0 AND announcement_no NOT IN ('','000','001'); CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY);");
export const fields=['announcement_no','announcement_date','subject','amount','budget_year','project_no','note','inventory_no','inventory_date','department','status'];
const row=r=>r?{...r,deleted:Boolean(r.deleted)}:null;
export const list=()=>db.prepare("SELECT * FROM announcements WHERE deleted=0 ORDER BY CASE WHEN announcement_no IN ('','000','001') THEN 1 ELSE 0 END, substr(announcement_date,1,4) DESC, CAST(announcement_no AS INTEGER) DESC, created_at DESC").all().map(row);
export const all=()=>db.prepare('SELECT * FROM announcements ORDER BY created_at,id').all().map(row);
export function insert(r){const id=randomUUID();db.prepare('INSERT INTO announcements(id,'+fields.join(',')+') VALUES('+Array(12).fill('?').join(',')+')').run(id,...fields.map(f=>r[f]));return row(db.prepare('SELECT * FROM announcements WHERE id=?').get(id));}
export function update(id,r){const result=db.prepare('UPDATE announcements SET '+fields.map(f=>f+'=?').join(',')+',updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted=0').run(...fields.map(f=>r[f]),id);return result.changes?row(db.prepare('SELECT * FROM announcements WHERE id=?').get(id)):null;}
export const remove=id=>db.prepare('UPDATE announcements SET deleted=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted=0').run(id).changes;
db.exec('BEGIN IMMEDIATE');
try{
 if(!db.prepare("SELECT name FROM app_migrations WHERE name='sample-v1'").get()){
  for(const [no,date,subject,amount,department] of [['902','2026-10-02','ข้อมูลตัวอย่าง: จัดซื้ออุปกรณ์สำนักงาน',12500,'หน่วยงานตัวอย่าง A'],['901','2026-10-01','ข้อมูลตัวอย่าง: ซ่อมบำรุงอุปกรณ์',4800,'หน่วยงานตัวอย่าง B'],['',null,'ข้อมูลตัวอย่าง: รายการรอออกเลข',null,'หน่วยงานตัวอย่าง C']]) insert({announcement_no:no,announcement_date:date,subject,amount,budget_year:2570,department,project_no:null,note:'ไม่ใช่ Master จริง',inventory_no:null,inventory_date:null,status:'ข้อมูลทดสอบ'});
  db.prepare('INSERT INTO app_migrations(name) VALUES(?)').run('sample-v1');
 }
 db.exec('COMMIT');
}catch(e){db.exec('ROLLBACK');throw e;}
export const close=()=>db.close();
