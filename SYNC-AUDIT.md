# ตรวจ Web → Master วันที่ 9 ต.ค. 2569

สถานะ: ซ่อมซอร์สในเครื่องและทดสอบแล้ว ยังไม่ deploy และยังไม่ยืนยันแถวเข้า Master จริง

## ของเดิมที่ตรวจพบ

- Repository: manoosaki65-rgb/uttaradit-announcement-register, main ที่ da0f77f919317cee065f8b11882b81096f1ef4d5
- Commit 8fccffc (7 ต.ค. 2569 11:29): POST/PUT ของทะเบียนเรียก syncMaster ส่ง token/system/action/item ไป MASTER_SYNC_URL พร้อม retry 3 ครั้ง
- Commit da0f77f (7 ต.ค. 2569 11:30): เพิ่ม google-apps-script/MasterSync.gs
- Branch codex/w804-migration ไม่มี webhook นี้ ห้ามนำไปทับ main
- Master เดิม: 1eFV9JbOBkTYeg25vyVxiiZ8MA7KadHh7EHg03fodeHQ
- แท็บเป้าหมาย: ออกเลขประกาศ 70, sheetId 1467185553
- อ่าน A1:J40 พบแบบฟอร์มเดิม 4 บล็อก เริ่มแถว 4, 11, 18, 25 ยังเป็นข้อความจุดไข่ปลา
- Metadata ณ เวลาตรวจมี 3 แท็บเดิม ไม่มี WEB_ประกาศ_70
- Apps Script เดิมผูกกับ Master: 1p_Fov1lA_C9UPc_yAlOTa2RdiuCct6Sbve-Pnd9bPU9cXn77_dGlNkDs
- ไฟล์ใน Script จริงชื่อ รหัส.gs มีทะเบียนเดิมเป็น doPostLegacy และมี doPost dispatcher ไป doPostPosting สำหรับระบบติดประกาศด้วย ต้องเก็บ dispatcher และโค้ดติดประกาศ/SheetJS ทั้งหมด
- Deployment ใช้งานอยู่เวอร์ชัน 3 วันที่ 9 ต.ค. 2569 06:20 ชื่อ “แก้การแนบและเปลี่ยน PDF/รูปในรายการเดิม”
- Endpoint เดิมที่ใช้งานอยู่: https://script.google.com/macros/s/AKfycbwls2UG4DvqjTFCTvY09lcJrTKc7ItB8LXOe_hfQwq9p7pwQ_wWDvUFjhNR_BBLu_BV/exec
- Execute as owner; access ทุกคน ตั้งไว้เดิมแล้ว
- Script Properties ที่พบมี POSTING_ACCESS_CODE และ POSTING_SCRIPT_SECRET แต่ไม่มี SYNC_TOKEN ไม่เก็บค่าลับในเอกสารนี้

## จุดที่ซ่อมในซอร์สเท่านั้น

- server.js ตรวจ JSON acknowledgement ว่า ok, system, id, verified, spreadsheet_id และ sheet ตรงทั้งหมด ก่อนแจ้ง master_sync=true; ไม่ถือ HTTP 200/HTML เป็นสำเร็จ
- src/App.tsx แสดง master_warning เมื่อบันทึกทะเบียนแล้วแต่ Master ไม่ยืนยัน
- MasterSync.gs เพิ่ม lock, ตรวจบล็อกแบบฟอร์มจริง, ไม่เขียนทับข้อมูลที่มีอยู่แม้เลขยังว่าง, error หากแท็บหายหรือบล็อกเต็ม, อ่านค่ากลับก่อนออก verified receipt
- คงขั้นตอน webhook และค่าจับคู่เดิม ไม่สร้าง Sync อีกระบบหรือ Master ใหม่

## ผลทดสอบ

- npm run build ผ่าน
- npm test: ผ่าน 5 รายการ; ข้าม database ordering 1 รายการเพราะไม่ได้ตั้ง DATABASE_URL สำหรับทดสอบนี้
- master-sync.test.js ตรวจ HTTP 200 HTML/error JSON/receipt ผิด และตรวจการรักษาข้อมูลเดิมกับ upsert ตาม id
- ยังไม่ได้เขียนข้อมูลทดสอบเข้าเว็บหรือ Master

## งานค้างที่ต้องทำต่อก่อนถือว่าสำเร็จ

1. รอผู้ใช้ยืนยัน Render workspace Maki's workspace (tea-datsmkojo6nc73cbearg) ตามข้อกำหนด connector ที่ไม่อนุญาตให้เลือกแทน
2. ตรวจ Render service/branch/deploy SHA และ MASTER_SYNC_URL/MASTER_SYNC_TOKEN โดยไม่แสดงค่าลับ เทียบ endpoint กับ deployment เดิม รวมทั้ง endpoint ที่เก็บแล้วหากค่าฝั่ง Render อ้างถึงตัวนั้น
3. จับคู่ SYNC_TOKEN ใน Script เดิมกับค่าฝั่ง Render โดยคง POSTING_* เดิม
4. ใช้การแก้เฉพาะฟังก์ชันทะเบียนใน รหัส.gs เดิม: โค้ด local doPost ใน MasterSync.gs ต้องใช้ชื่อ doPostLegacy เมื่อรวมเข้าโปรเจ็กต์นี้ ห้ามวางทั้งไฟล์ทับ รหัส.gs ห้ามสร้างโปรเจ็กต์ใหม่ ห้ามแก้ dispatcher/tิดประกาศ
5. ปรับ deployment ที่จับคู่จริงไปเวอร์ชันใหม่โดยคง deployment ID/URL/สิทธิ์เดิม แล้ว deploy server/UI ที่ซ่อมไป service เดิม
6. เลือกรายการทดสอบที่ระบุชัด ตรวจข้อมูลก่อนเขียน แล้วบันทึกผ่านเว็บ/API เดิม ตรวจ response และอ่าน Master ที่ id เดิม/แท็บเดิม/บล็อกที่ระบุ ยืนยันเลข วันที่ เรื่อง วงเงิน และ id note; ทดสอบแก้รายการเดิมไม่เกิดซ้ำ และตรวจข้อมูลก่อนหน้าไม่เปลี่ยน

ห้ามสรุปว่าซิงก์สำเร็จจาก build, unit test, HTTP 200 หรือข้อมูลในฐานเว็บเพียงอย่างเดียว

## ผลการดำเนินงานจริง 9 ตุลาคม 2569

รายการงานค้างด้านบนเป็นสถานะตอนตรวจครั้งแรก ปัจจุบันดำเนินการครบแล้ว:
- Render service เดิม deploy commit 2bc6773e565c0ed2844366423dac36cf6b69398e, deployment dep-db4fklhsrm7s738lngo0 LIVE
- ผู้ใช้บันทึก SYNC_TOKEN ใน Apps Script แล้ว อ่านกลับยืนยันตรงกับ MASTER_SYNC_TOKEN โดยไม่บันทึกค่าลับในรายงาน
- Apps Script project และ endpoint เดิมอัปเดตเวอร์ชัน 5 เวลา 21:49 โดยรักษา dispatcher, posting, SheetJS และสิทธิ์เดิม
- ทดสอบจริงผ่านเว็บ เลข 999999999970/2570, id 6248bf5c-9a6a-4794-a731-ce90dbf6cf07
- พบวันที่ถูก Sheets แปลงเป็น Date อัตโนมัติ ทำให้ receipt ไม่ผ่าน จึงแก้เฉพาะ E ของบล็อกให้เป็นข้อความก่อน setValue
- แก้รายการทดสอบเดิมผ่านเว็บ: เรื่อง 'ทดสอบ Web → Master Codex 20261009 แก้ไขเดิม ไม่ใช่ประกาศจริง', วงเงิน 234.56
- เว็บแสดง 'แก้ไขข้อมูลเรียบร้อยแล้ว — เขียน Master Google Sheet แล้ว'
- อ่าน Master จริง D4:F7 พบเลข 999999999970/2570, วันที่ 9 ต.ค. 2569, เรื่องและวงเงินตรง, D4 note ตรง id เดิม
- WEB_ประกาศ_70 เป็นแท็บข้อมูลตามโค้ดเดิม พบ id เดียวในแถว 2 ไม่มีแถวซ้ำ
- คืนเฉพาะ 6 เซลล์ทดสอบ พร้อมหมายเหตุ/รูปแบบเดิม และล้างเฉพาะข้อมูลทดสอบแถว 2 ของแท็บ WEB
- อ่าน A1:J40 หลังคืนแล้วเปรียบเทียบ CellData ทั้งหมดตรงกับก่อนทดสอบ
- นำรายการทดสอบออกจากเว็บผ่าน endpoint soft-delete เดิม ได้ ok:true
- ทดสอบ master-sync.test.js หลังแก้วันที่ผ่าน 2 รายการ
