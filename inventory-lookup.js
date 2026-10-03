export const INVENTORY_API='https://uttaradit-inventory.pages.dev/api/current';
function receivedDate(row){
 let year=Number(row.year),month=Number(row.month),day=Number(row.day);
 if(year<100)year+=2500;if(year>=2400)year-=543;
 if(!Number.isInteger(year)||year<1900||!month||!day)return null;
 const iso=String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 const date=new Date(iso+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso?iso:null;
}
export function mapInventory(row){
 const fields={inventory_no:String(row.inventory).trim()};
 for(const [target,source]of [['subject','item'],['department','unit'],['note','note']])if(typeof row[source]==='string'&&row[source].trim())fields[target]=row[source].trim();
 if(row.amount!==null&&row.amount!==undefined&&row.amount!==''&&Number.isFinite(Number(row.amount)))fields.amount=Number(row.amount);
 const year=String(row.fundYear??'').trim();if(/^\d{2}$/.test(year))fields.budget_year=2500+Number(year);else if(/^25\d{2}$/.test(year))fields.budget_year=Number(year);
 const date=receivedDate(row);if(date)fields.inventory_date=date;
 return fields;
}
export async function lookupInventory(number,fetcher=fetch){
 if(!/^\d{2}-\d{4,8}$/.test(number))throw Object.assign(new Error('รูปแบบเลข Inventory ไม่ถูกต้อง'),{status:400});
 for(let page=1;page<=20;page++){
  const url=new URL(INVENTORY_API);url.search=new URLSearchParams({inventory:number,page:String(page),pageSize:'100'}).toString();
  const response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Object.assign(new Error('เชื่อมต่อ Inventory ไม่สำเร็จ กรุณากรอกข้อมูลเองหรือลองใหม่'),{status:502});
  const payload=await response.json();
  if(!Array.isArray(payload.items))throw Object.assign(new Error('ข้อมูล Inventory ไม่ถูกต้อง'),{status:502});
  const matches=payload.items.filter(row=>String(row.inventory||'').trim()===number);
  if(matches.length>1)throw Object.assign(new Error('พบเลข Inventory ซ้ำ กรุณาตรวจสอบ Master และกรอกข้อมูลเอง'),{status:409});
  if(matches.length===1)return {found:true,source:INVENTORY_API,inventory:matches[0],fields:mapInventory(matches[0])};
  if(page>=Number(payload.pages||1))return {found:false,source:INVENTORY_API,message:'ไม่พบเลข Inventory'};
 }
 throw Object.assign(new Error('ผลค้นหา Inventory มากเกินไป กรุณากรอกข้อมูลเอง'),{status:502});
}
