import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {migrate} from 'drizzle-orm/node-postgres/migrator';
import {sql} from 'drizzle-orm';
import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL_UNPOOLED)throw Error('Direct migration connection is required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL_UNPOOLED,max:1});
const db=drizzle(pool);
try{
 await migrate(db,{migrationsFolder:'./drizzle'});
 const file=process.argv[2];
 if(file){
  const {items}=JSON.parse(await readFile(file,'utf8'));
  const fields=['id','announcement_no','announcement_date','subject','amount','budget_year','project_no','note','inventory_no','inventory_date','department','status','deleted','created_at','updated_at'];
  await db.transaction(async tx=>{
   const count=(await tx.execute(sql`SELECT count(*)::int AS n FROM announcements`)).rows[0].n;
   if(count!==0)throw Error('Import requires an empty database; existing records were not modified');
   for(const item of items)await tx.execute(sql`INSERT INTO announcements(${sql.raw(fields.join(','))}) VALUES(${sql.join(fields.map(f=>sql`${item[f]??null}`),sql`,`)})`);
  });
  console.log('Imported backup records:',items.length);
 }
 console.log('Database migration complete');
}finally{await pool.end();}
