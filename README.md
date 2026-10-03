# ทะเบียนเลขประกาศจังหวัด — Render ทดลอง

ข้อมูลตัวอย่างเท่านั้น ไม่ใช่ Master จริง ระบบนี้แยกจาก AppDeploy เดิมและไม่เปลี่ยน Hub

Node.js 24 + React + Neon PostgreSQL + Drizzle. Set DATABASE_URL (pooled), EDITOR_PASSWORD and SESSION_SECRET; npm ci --include=dev; npm run build; npm start.

ผู้ชมอ่านได้ ผู้แก้ไขใช้รหัสระบบทดสอบ ลบแบบ soft delete และดาวน์โหลด JSON สำรองได้รวมรายการที่ลบ เลขประกาศเรียง DESC แล้วเวลาสร้างล่าสุดก่อน และป้องกันเลขซ้ำในปีเดียวกัน

Render Service เดิมใช้ Free ใน Singapore; ฐานข้อมูลถาวร Neon Free อยู่ Singapore ใน Project uttaradit-neon-test โดยแยก database announcement_register ออกจาก neondb ไม่ใช้ disk หรือ PostgreSQL แบบเสียเงิน

Schema migration อยู่ใน drizzle/ ใช้ DATABASE_URL_UNPOOLED และ `node --env-file=.env migrate-postgres.mjs backups/pre-neon-current.json` สำหรับสร้าง schema และนำสำเนาข้อมูลเข้าเฉพาะฐานว่าง รักษา ID และทุกช่อง ไม่สร้างข้อมูลตัวอย่างซ้ำเมื่อเริ่มโปรแกรม ไม่มี SQLite fallback เก็บ .env และ backups/ นอก Git

Inventory lookup ใช้ GET https://uttaradit-inventory.pages.dev/api/current เท่านั้น ไม่แก้ไข Master ข้อมูลในทะเบียนยังเป็นตัวอย่าง ยังไม่เปลี่ยน Hub

ทดสอบ CRUD ด้วย TEST_URL และ TEST_PASSWORD ผ่าน node verify.mjs; ทดสอบการเรียงจริงด้วย node --env-file=.env --test ordering.test.js

