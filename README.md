# ระบบเบิกอุปกรณ์ (Equipment Requisition System)
<!-- GitHub: SuraBon -->

ระบบเบิกอุปกรณ์ที่ใช้ Next.js App Router, Tailwind CSS, shadcn/ui และ Google Sheets API เป็นแหล่งเก็บข้อมูล

## ผู้จัดทำ
<!-- GitHub: SuraBon -->

- **ผู้จัดทำ**: SuraBon
- **GitHub**: [SuraBon](https://github.com/SuraBon)

## Features
<!-- GitHub: SuraBon -->

- แบบฟอร์มเบิกอุปกรณ์แบบ dynamic เพิ่มหรือลบรายการได้
- แปลงหน่วยอัตโนมัติระหว่างหน่วยย่อยและหน่วยใหญ่
- แสดงรูปภาพอุปกรณ์ใน dropdown และรายการเบิก
- HR Dashboard สำหรับจัดการคลังอุปกรณ์
- ตรวจสอบ stock ก่อนตัดยอด และจัดคิวการเขียนใบเบิกใน process เดียว
- เก็บประวัติใบเบิกล่าสุดในเครื่องผู้ใช้
- แสดงวันที่แบบไทย

## Getting Started
<!-- GitHub: SuraBon -->

### 1. ติดตั้ง dependencies
<!-- GitHub: SuraBon -->

```bash
npm install
```

### 2. ตั้งค่า Google Sheets API
<!-- GitHub: SuraBon -->

1. สร้าง Google Cloud Project
2. เปิดใช้งาน Google Sheets API
3. สร้าง Service Account และดาวน์โหลด JSON key
4. แชร์ Google Sheets ให้ Service Account ด้วยสิทธิ์ Editor
5. คัดลอกข้อมูลลงใน `.env.local`

### 3. ตั้งค่า environment variables
<!-- GitHub: SuraBon -->

คัดลอก `.env.local.example` เป็น `.env.local` แล้วกรอกข้อมูล:

```env
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=your-spreadsheet-id-here
HR_PASSWORD=change-this-password
HR_SESSION_SECRET=change-this-to-a-long-random-secret
BLOB_READ_WRITE_TOKEN=vercel-blob-token-if-image-upload-is-enabled
```

หมายเหตุ: `BLOB_READ_WRITE_TOKEN` จำเป็นเมื่อใช้งานการอัปโหลดรูปภาพอุปกรณ์ผ่าน Vercel Blob

### 4. ตั้งค่า Google Sheets
<!-- GitHub: SuraBon -->

สร้าง Google Sheets พร้อม 2 tabs:

**Tab 1: สต๊อกอุปกรณ์**

Columns: รหัสอุปกรณ์ | รูปภาพ | ชื่ออุปกรณ์ | สต๊อกรวม(หน่วยย่อย) | ใช้ไป(หน่วยย่อย) | คงเหลือ(หน่วยย่อย) | หน่วยย่อย | หน่วยใหญ่ | อัตราส่วน

**Tab 2: ประวัติการเบิก**

Columns: เลขที่ใบเบิก | วันที่เบิก | ชื่อ-นามสกุล | แผนก | ชื่ออุปกรณ์ | จำนวนที่เบิก | หน่วยที่เบิก | requestId

### 5. Run development server
<!-- GitHub: SuraBon -->

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## Scripts
<!-- GitHub: SuraBon -->

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Pages
<!-- GitHub: SuraBon -->

- `/` - หน้าคลังอุปกรณ์และหน้าเบิกสำหรับพนักงาน
- `/form` - ฟอร์มเบิกอุปกรณ์
- `/hr` - redirect ไปยัง HR Dashboard

## Tech Stack
<!-- GitHub: SuraBon -->

- **Framework**: Next.js 16 App Router
- **React**: React 19
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Management**: react-hook-form + zod
- **Database**: Google Sheets API
- **Storage**: Vercel Blob สำหรับรูปภาพอุปกรณ์
- **Icons**: Lucide React
- **Date Formatting**: date-fns
- **Testing**: Vitest

## License
<!-- GitHub: SuraBon -->

MIT
