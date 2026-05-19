Equipment Requisition System Implementation Plan
Implement a complete equipment requisition system using Next.js, Tailwind CSS, shadcn/ui with ReUI theme, and Google Sheets API integration.

Project Setup
Create Next.js project with App Router at c:\Users\Desktop\Documents\GI\web\Withdrawal
Install Tailwind CSS and configure with ReUI theme (modern color palette, smooth animations, clean design)
Install shadcn/ui components: button, input, form, label, select, command, popover, card, skeleton, toast, table
Install react-hook-form and zod for form management and validation
Create folder structure as specified in implementation_plan.md
Google Sheets Integration
Create Google Sheets with two tabs:
"สต๊อกอุปกรณ์": columns (รหัสอุปกรณ์, รูปภาพ, ชื่ออุปกรณ์, สต๊อกรวม(หน่วยย่อย), ใช้ไป(หน่วยย่อย), คงเหลือ(หน่วยย่อย), หน่วยย่อย, หน่วยใหญ่, อัตราส่วน)
"ประวัติการเบิก": columns (เลขคำขอเบิก, ชื่อ, แผนก, อุปกรณ์, จำนวน)
Set up Google Service Account with Sheets API access
Configure .env.local with credentials
Implement auto-fill sample data functionality if sheets are empty
Utility Functions
lib/unit-conversion.ts: formatUnit(), toBaseUnit() for unit conversion
lib/date-format.ts: formatThaiDate() for Thai date formatting
lib/google-sheets.ts: Google Sheets API integration (batch update/append)
lib/utils.ts: Utility functions (tailwind-merge, clsx)
API Routes
GET /api/equipment: Fetch equipment stock data
POST /api/requisition: Handle requisition submission with concurrency check
POST /api/hr-auth: Simple password authentication (e.g., "1234") for HR dashboard
UI Components
components/RequisitionForm.tsx: Main form with react-hook-form and useFieldArray, displays equipment thumbnails in dynamic rows
components/EquipmentCombobox.tsx: Searchable combobox with equipment thumbnails displayed next to names
components/UnitSelector.tsx: Dropdown for unit selection (main/sub units)
shadcn/ui components in components/ui/
Pages
/ (User page): Requisition form with validation, loading states, toast notifications, equipment thumbnails in combobox and dynamic rows
/hr (HR dashboard): Password-protected page with equipment management (add/edit with image URL input), stock table with thumbnail column, and requisition history
Testing
Test equipment fetching and display
Test unit conversion functionality
Test requisition submission and stock deduction
Test HR dashboard authentication and data viewing


Please implement the Equipment Requisition System based on the following comprehensive plan. Act as an expert Full-Stack Developer.

**Project Setup**
- Create Next.js project with App Router at c:\Users\Desktop\Documents\GI\web\Withdrawal 
- Install Tailwind CSS and configure with ReUI theme (modern color palette, smooth animations, clean design).
- Install shadcn/ui components: button, input, form, label, select, command, popover, card, skeleton, toast, table.
- Install react-hook-form and zod for form management and validation.
- Create the standard App Router folder structure.

**Google Sheets Integration**
- The database uses Google Sheets with two exact tabs and schemas:
  1. "สต๊อกอุปกรณ์": columns (รหัสอุปกรณ์, รูปภาพ, ชื่ออุปกรณ์, สต๊อกรวม(หน่วยย่อย), ใช้ไป(หน่วยย่อย), คงเหลือ(หน่วยย่อย), หน่วยย่อย, หน่วยใหญ่, อัตราส่วน) 
  2. "ประวัติการเบิก": columns (เลขที่ใบเบิก, วันที่เบิก, ชื่อ-นามสกุล, แผนก, ชื่ออุปกรณ์, จำนวนที่เบิก, หน่วยที่เบิก) 
- Set up Google Service Account with Sheets API access.
- Configure .env.local with credentials (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, SPREADSHEET_ID).
- Implement an auto-fill sample data functionality if the sheets are empty to help with initial testing.

**Utility Functions**
- lib/unit-conversion.ts: formatUnit(), toBaseUnit() for unit conversion (no floating point decimals; all database calculations must use the base integer unit).
- lib/date-format.ts: formatThaiDate() for Thai date formatting (e.g., "12 มีนาคม 2569").
- lib/google-sheets.ts: Google Sheets API integration (batch update/append).
- lib/utils.ts: Utility functions (tailwind-merge, clsx).

**API Routes**
- GET /api/equipment: Fetch equipment stock data.
- POST /api/requisition: Handle requisition submission with concurrency check (always fetch the latest "คงเหลือ" before deducting).
- POST /api/hr-auth: Simple password authentication (e.g., "1234") for the HR dashboard.

**UI Components**
- components/RequisitionForm.tsx: Main form using react-hook-form and useFieldArray. Must display equipment thumbnails in the dynamic rows.
- components/EquipmentCombobox.tsx: Searchable combobox showing equipment thumbnails next to names, filtering out items with 0 stock.
- components/UnitSelector.tsx: Dropdown for selecting main/sub units based on the selected equipment.
- shadcn/ui components should be placed in components/ui/.

**Pages**
- / (User page): Dynamic requisition form with Zod validation, skeleton loading states, toast notifications, equipment thumbnails in the combobox and rows.
- /hr (HR dashboard): Password-protected page. Includes an equipment management table (Add/Edit with image URL input) and a requisition history table. History must group by "เลขที่ใบเบิก" and allow expanding to see items.

**Testing & Execution**
- Start by scaffolding the project, applying the ReUI design tokens, and building the utilities.
- Then, implement the Google Sheets API connection.
- Finally, build the frontend pages step-by-step. Let me know when you need to pause or proceed to the next step.