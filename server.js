import express from 'express';
import {lookupInventory} from './inventory-lookup.js';
import {list,all,insert,update,remove,close,fields} from './database.js';
const app=express(); app.disable('x-powered-by'); app.use(express.json({limit:'32kb'}));
app.use((req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Referrer-Policy','same-origin');if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)&& req.get('origin') && new URL(req.get('origin')).host!==req.get('host'))return res.status(403).json({error:'Origin rejected'});next();});
app.get('/api/health',async(req,res)=>res.json({ok:true,environment:'sample-test',storage:'neon-postgresql',count:(await list()).length}));
app.get('/api/inventory-lookup',async(req,res)=>{
 try{res.json(await lookupInventory(String(req.query.number||'').trim()));}
 catch(e){res.status(e.status||502).json({error:e.status?e.message:'เชื่อมต่อ Inventory ไม่สำเร็จ กรุณากรอกข้อมูลเองหรือลองใหม่'});}
});
function parse(b){const r={};for(const f of fields)r[f]=b?.[f]??null;
 for(const f of fields.filter(x=>!['amount','budget_year'].includes(x))){if(r[f]!==null&&typeof r[f]!=='string')throw Error('ข้อมูลต้องเป็นข้อความ');r[f]=r[f]?.trim()||null;if(r[f]?.length>1000)throw Error('ข้อความยาวเกินกำหนด');}
 r.announcement_no=r.announcement_no||'';if(r.announcement_no&&!/^\d{1,12}$/.test(r.announcement_no))throw Error('เลขประกาศต้องเป็นตัวเลข');
 if(!r.subject)throw Error('กรุณากรอกเรื่อง');
 for(const f of ['announcement_date','inventory_date'])if(r[f]&&(!/^\d{4}-\d{2}-\d{2}$/.test(r[f])||new Date(r[f]).toISOString().slice(0,10)!==r[f]))throw Error('วันที่ไม่ถูกต้อง');
 if(r.announcement_no&&!r.announcement_date)throw Error('กรุณาระบุวันที่ประกาศ');
 for(const f of ['amount','budget_year']){r[f]=r[f]===null||r[f]===''?null:Number(r[f]);if(r[f]!==null&&(!Number.isFinite(r[f])||r[f]<0))throw Error('ตัวเลขไม่ถูกต้อง');}
 if(r.amount>999999999999)throw Error('วงเงินเกินกำหนด');if(r.budget_year!==null&&(!Number.isInteger(r.budget_year)||r.budget_year<2400||r.budget_year>2700))throw Error('ปีงบประมาณไม่ถูกต้อง');return r;}
app.get('/api/announcements',async(req,res)=>res.json({items:await list(),nextToken:null}));
app.get('/api/export',async(req,res)=>{res.set('Content-Disposition','attachment; filename=announcement-test-backup.json');res.json({environment:'sample-test',exported_at:new Date().toISOString(),items:await all()});});
app.post('/api/announcements',async(req,res)=>{let r;try{r=parse(req.body);}catch(e){return res.status(400).json({error:e.message});}res.status(201).json({item:await insert(r)});});
app.put('/api/announcements/:id',async(req,res)=>{let r;try{r=parse(req.body);}catch(e){return res.status(400).json({error:e.message});}const item=await update(req.params.id,r);if(!item)return res.status(404).json({error:'ไม่พบรายการ'});res.json({item});});
app.delete('/api/announcements/:id',async(req,res)=>{if(!await remove(req.params.id))return res.status(404).json({error:'ไม่พบรายการ'});res.json({ok:true});});
app.use('/api',(req,res)=>res.status(404).json({error:'ไม่พบเส้นทาง'}));
app.use(express.static('dist'));
app.use((err,req,res,next)=>{console.error(err.code||err.message);res.status((err.code||err.cause?.code)==='23505'?409:err.code==='22P02'?400:500).json({error:(err.code||err.cause?.code)==='23505'?'เลขประกาศซ้ำในปีเดียวกัน':'ไม่สามารถบันทึกข้อมูลได้'});});
const server=app.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Announcement test service listening'));
process.on('SIGTERM',()=>server.close(()=>{close().finally(()=>process.exit(0));}));




