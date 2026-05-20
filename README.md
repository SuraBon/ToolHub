# ระบบเบิกอุปกรณ์ (Equipment Requisition System)
<!-- GitHub: SuraBon -->

ระบบเบิกอุปกรณ์ที่ใช้ Next.js (App Router), Tailwind CSS, shadcn/ui ผสานกับ ReUI และเชื่อมต่อฐานข้อมูลผ่าน Google Sheets API
<!-- GitHub: SuraBon -->

## ผู้จัดทำ
<!-- GitHub: SuraBon -->

- **ผู้จัดทำ**: SuraBon
- **GitHub**: [SuraBon](https://github.com/SuraBon)

## Features
<!-- GitHub: SuraBon -->

- 📝 แบบฟอร์มเบิกอุปกรณ์แบบ dynamic (เพิ่ม/ลบรายการได้)
- 🔄 แปลงหน่วยอัตโนมัติ (หน่วยย่อย/หน่วยใหญ่)
- 📊 แสดงรูปภาพอุปกรณ์ใน dropdown และรายการเบิก
- 🔒 HR Dashboard พร้อมรหัสผ่านความปลอดภัยง่ายๆ
- 📈 ตรวจสอบ concurrency ก่อนตัดสต๊อก
- 🎨 UI สวยงามด้วย ReUI theme
- 📅 แสดงวันที่แบบไทย

## Getting Started
<!-- GitHub: SuraBon -->

### 1. ติดตั้ง Dependencies
<!-- GitHub: SuraBon -->

```bash
npm install
```

### 2. ตั้งค่า Google Sheets API
<!-- GitHub: SuraBon -->

1. สร้าง Google Cloud Project
2. เปิดใช้งาน Google Sheets API
3. สร้าง Service Account และดาวน์โหลด JSON key
4. แชร์ Google Sheets ให้ Service Account (Editor)
5. คัดลอกข้อมูลลงใน `.env.local`

### 3. ตั้งค่า Environment Variables
<!-- GitHub: SuraBon -->

คัดลอก `.env.local.example` เป็น `.env.local` และกรอกข้อมูล:

```env
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
SPREADSHEET_ID=your-spreadsheet-id-here
HR_PASSWORD=1234
```

### 4. ตั้งค่า Google Sheets
<!-- GitHub: SuraBon -->

สร้าง Google Sheets พร้อม 2 tabs:

**Tab 1: สต๊อกอุปกรณ์**
- Columns: รหัสอุปกรณ์ | รูปภาพ | ชื่ออุปกรณ์ | สต๊อกรวม(หน่วยย่อย) | ใช้ไป(หน่วยย่อย) | คงเหลือ(หน่วยย่อย) | หน่วยย่อย | หน่วยใหญ่ | อัตราส่วน

**Tab 2: ประวัติการเบิก**
- Columns: เลขที่ใบเบิก | วันที่เบิก | ชื่อ-นามสกุล | แผนก | ชื่ออุปกรณ์ | จำนวนที่เบิก | หน่วยที่เบิก

### 5. Run Development Server
<!-- GitHub: SuraBon -->

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ [http://localhost:3000](http://localhost:3000)

## Pages
<!-- GitHub: SuraBon -->

- `/` - หน้าเบิกอุปกรณ์สำหรับพนักงาน
- `/hr` - HR Dashboard (ต้องใช้รหัสผ่าน)

## Tech Stack
<!-- GitHub: SuraBon -->

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + ReUI
- **Form Management**: react-hook-form + zod
- **Database**: Google Sheets API
- **Icons**: Lucide React
- **Date Formatting**: date-fns

## License
<!-- GitHub: SuraBon -->

MIT
