import pg from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {sql} from 'drizzle-orm';
import {randomUUID} from 'node:crypto';
if(!process.env.DATABASE_URL) throw Error('DATABASE_URL is required; SQLite fallback is disabled');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:30000});
pool.on('error',e=>console.error('Database connection error',e.code));
const db=drizzle(pool);
export const fields=['announcement_no','announcement_date','subject','amount','budget_year','project_no','note','inventory_no','inventory_date','department','status'];
const columns=sql.raw('id,'+fields.join(',')+',deleted,created_at,updated_at,created_order');
const rows=async query=>(await db.execute(query)).rows.map(r=>({...r,created_order:Number(r.created_order)}));
export const list=()=>rows(sql`SELECT ${columns} FROM announcements WHERE deleted=false ORDER BY COALESCE(NULLIF(announcement_no,''),'0')::bigint DESC, created_at::timestamptz DESC, created_order DESC`);
export const all=()=>rows(sql`SELECT ${columns} FROM announcements ORDER BY created_at::timestamptz,id`);
export async function insert(r){return (await rows(sql`INSERT INTO announcements(id,created_at,${sql.raw(fields.join(','))}) VALUES(${randomUUID()},${new Date().toISOString()},${sql.join(fields.map(f=>sql`${r[f]}`),sql`,`)}) RETURNING ${columns}`))[0];}
export async function update(id,r){return (await rows(sql`UPDATE announcements SET ${sql.join(fields.map(f=>sql`${sql.identifier(f)}=${r[f]}`),sql`,`)},updated_at=${new Date().toISOString()} WHERE id=${id} AND deleted=false RETURNING ${columns}`))[0]||null;}
export async function remove(id){return (await rows(sql`UPDATE announcements SET deleted=true,updated_at=${new Date().toISOString()} WHERE id=${id} AND deleted=false RETURNING id`)).length;}
export const close=()=>pool.end();
