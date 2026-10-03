import express from 'express';
import pg from 'pg';
import {randomUUID,createHmac,timingSafeEqual} from 'node:crypto';
const {Pool}=pg;
pg.types.setTypeParser(1700, Number);
if(!process.env.DATABASE_URL || !process.env.EDITOR_PASSWORD || !process.env.SESSION_SECRET) throw new Error('Missing database or editor configuration');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5});
const app=express(); app.disable('x-powered-by'); app.use(express.json({limit:'32kb'}));
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&& req.get('origin') && new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Origin rejected'});next();});
const sign=v=>createHmac('sha256',process.env.SESSION_SECRET).update(v).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length && timingSafeEqual(x,y);};
function signedIn(req){const c=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('editor='))?.slice(7)||'';const [expiry,sig]=c.split('.');return Number(expiry)>Date.now()&&equal(sig,sign(expiry));}
const attempts=new Map();
app.get('/api/session',(req,res)=>res.json({user:signedIn(req)?{userId:'test-editor',name:'ผู้ทดสอบ Render'}:null}));
app.post('/api/session',(req,res)=>{const ip=req.ip;const now=Date.now();const previous=attempts.get(ip);const a=previous&&previous.until>now?previous:{count:0,until:now+600000};if(a.count>=10)return res.status(429).json({error:'ลองใหม่ในอีก 10 นาที'});if(!equal(req.body?.password,process.env.EDITOR_PASSWORD)){a.count++;attempts.set(ip,a);return res.status(401).json({error:'รหัสไม่ถูกต้อง'});}attempts.delete(ip);const expiry=String(now+8*3600000);res.set('Set-Cookie','editor='+expiry+'.'+sign(expiry)+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800'+(process.env.NODE_ENV==='production'?'; Secure':''));res.json({user:{userId:'test-editor',name:'ผู้ทดสอบ Render'}});});
app.delete('/api/session',(req,res)=>{res.set('Set-Cookie','editor=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');res.json({ok:true});});
app.get('/api/health',async(req,res)=>{await pool.query('SELECT 1');res.json({ok:true,environment:'sample-test'});});
const fields=['announcement_no','announcement_date','subject','amount','budget_year','project_no','note','inventory_no','inventory_date','department','status'];
function parse(b){const r={};for(const f of fields)r[f]=b?.[f]??null;
 for(const f of fields.filter(x=>!['amount','budget_year'].includes(x))){if(r[f]!==null&&typeof r[f]!=='string')throw Error('ข้อมูลต้องเป็นข้อความ');r[f]=r[f]?.trim()||null;if(r[f]?.length>1000)throw Error('ข้อความยาวเกินกำหนด');}
 r.announcement_no=r.announcement_no||'';if(r.announcement_no&&!/^\d{1,12}$/.test(r.announcement_no))throw Error('เลขประกาศต้องเป็นตัวเลข');
 if(!r.subject)throw Error('กรุณากรอกเรื่อง');
 for(const f of ['announcement_date','inventory_date'])if(r[f]&&(!/^\d{4}-\d{2}-\d{2}$/.test(r[f])||new Date(r[f]).toISOString().slice(0,10)!==r[f]))throw Error('วันที่ไม่ถูกต้อง');
 if(r.announcement_no&&!r.announcement_date)throw Error('กรุณาระบุวันที่ประกาศ');
 for(const f of ['amount','budget_year']){r[f]=r[f]===null||r[f]===''?null:Number(r[f]);if(r[f]!==null&&(!Number.isFinite(r[f])||r[f]<0))throw Error('ตัวเลขไม่ถูกต้อง');}
 if(r.amount>999999999999)throw Error('วงเงินเกินกำหนด');if(r.budget_year!==null&&(!Number.isInteger(r.budget_year)||r.budget_year<2400||r.budget_year>2700))throw Error('ปีงบประมาณไม่ถูกต้อง');return r;}
app.get('/api/announcements',async(req,res)=>{const {rows}=await pool.query("SELECT *, to_char(announcement_date,'YYYY-MM-DD') AS announcement_date, to_char(inventory_date,'YYYY-MM-DD') AS inventory_date FROM announcements WHERE deleted=false ORDER BY CASE WHEN announcement_no IN ('','000','001') THEN 1 ELSE 0 END, EXTRACT(YEAR FROM announcement_date) DESC NULLS LAST, NULLIF(announcement_no,'')::bigint DESC NULLS LAST, created_at DESC");res.json({items:rows,nextToken:null});});
app.use('/api/announcements',(req,res,next)=>{if(!signedIn(req))return res.status(401).json({error:'กรุณาเข้าสู่ระบบเพื่อเพิ่มหรือแก้ไข'});next();});
app.post('/api/announcements',async(req,res)=>{let r;try{r=parse(req.body);}catch(e){return res.status(400).json({error:e.message});}const {rows}=await pool.query('INSERT INTO announcements (id,'+fields.join(',')+') VALUES ($1,'+fields.map((_,i)=>'$'+(i+2)).join(',')+') RETURNING *',[randomUUID(),...fields.map(f=>r[f])]);res.status(201).json({item:rows[0]});});
app.put('/api/announcements/:id',async(req,res)=>{let r;try{r=parse(req.body);}catch(e){return res.status(400).json({error:e.message});}const {rows}=await pool.query('UPDATE announcements SET '+fields.map((f,i)=>f+'=$'+(i+1)).join(',')+', updated_at=now() WHERE id=$12 AND deleted=false RETURNING *',[...fields.map(f=>r[f]),req.params.id]);if(!rows.length)return res.status(404).json({error:'ไม่พบรายการ'});res.json({item:rows[0]});});
app.delete('/api/announcements/:id',async(req,res)=>{const r=await pool.query('UPDATE announcements SET deleted=true,updated_at=now() WHERE id=$1 AND deleted=false RETURNING id',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'ไม่พบรายการ'});res.json({ok:true});});
app.use('/api',(req,res)=>res.status(404).json({error:'ไม่พบเส้นทาง'}));
app.use(express.static('dist'));
app.use((err,req,res,next)=>{console.error(err.code||err.message);res.status(err.code==='23505'?409:err.code==='22P02'?400:500).json({error:err.code==='23505'?'เลขประกาศซ้ำในปีเดียวกัน':'ไม่สามารถบันทึกข้อมูลได้'});});
await pool.query(`CREATE TABLE IF NOT EXISTS announcements (id uuid PRIMARY KEY,announcement_no text NOT NULL DEFAULT '',announcement_date date,subject text NOT NULL,amount numeric(16,2),budget_year integer,project_no text,note text,inventory_no text,inventory_date date,department text,status text,deleted boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`);
await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS announcements_number_year ON announcements(announcement_no,(EXTRACT(YEAR FROM announcement_date))) WHERE deleted=false AND announcement_no NOT IN ('','000','001')");
await pool.query('CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY,applied_at timestamptz DEFAULT now())');
const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(76329001)');const found=await client.query("SELECT name FROM app_migrations WHERE name='sample-v1'");if(!found.rowCount){for(const [no,date,subject,amount,department] of [['902','2026-10-02','ข้อมูลตัวอย่าง: จัดซื้ออุปกรณ์สำนักงาน',12500,'หน่วยงานตัวอย่าง A'],['901','2026-10-01','ข้อมูลตัวอย่าง: ซ่อมบำรุงอุปกรณ์',4800,'หน่วยงานตัวอย่าง B'],['',null,'ข้อมูลตัวอย่าง: รายการรอออกเลข',null,'หน่วยงานตัวอย่าง C']])await client.query("INSERT INTO announcements(id,announcement_no,announcement_date,subject,amount,budget_year,department,status,note) VALUES($1,$2,$3,$4,$5,2570,$6,'ข้อมูลทดสอบ','ไม่ใช่ Master จริง')",[randomUUID(),no,date,subject,amount,department]);await client.query("INSERT INTO app_migrations(name) VALUES('sample-v1')");}await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
const server=app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Announcement test service listening'));
process.on('SIGTERM',()=>server.close(()=>pool.end().then(()=>process.exit(0))));

