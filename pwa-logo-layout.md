# Implementation Plan: PWA Support, Web Logo, and Stock Input Alignment

Implement Progressive Web App (PWA) installation support, generate a professional brand logo for the headers, and fix the alignment issue of stock input stepper fields in the Equipment Dialog.

## User Review Required

Documenting layout, PWA, and logo decisions:
- **PWA Installation:** A static `manifest.json` and a lightweight `sw.js` (service worker) will be added to enable PWA installation on mobile/desktop. Next.js App Router will automatically serve and register them.
- **Logo Asset:** A modern minimalist icon will be generated via `generate_image` and saved as `app/icon.png` (auto-generating favicons/PWA icons) and `public/logo.png` (used in headers).
- **Layout Adjustments:**
  - `QuantityStepper` width will be changed from `max-w-36` to `max-w-full` inside `EquipmentCrudDialog.tsx` for perfect grid alignment.

---

## Proposed Changes

### PWA Configuration

#### [NEW] [manifest.json](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/public/manifest.json)
- Define PWA settings: short name, description, start URL, theme color (`#2563eb`), display mode (`standalone`), and icons pointing to Next.js auto-generated app icons.

#### [NEW] [sw.js](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/public/sw.js)
- Implement a basic service worker for offline capabilities and caching.

#### [MODIFY] [layout.tsx](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/app/layout.tsx)
- Add manifest meta tags and register the service worker on client load.

---

### Brand Logo & UI Integration

#### [NEW] [icon.png](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/app/icon.png)
- A high-resolution logo generated to serve as the app icon.

#### [NEW] [logo.png](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/public/logo.png)
- Web logo generated for headers.

#### [MODIFY] [page.tsx](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/app/page.tsx)
- Integrate logo in header next to "คลังอุปกรณ์" with sleek sizing.

#### [MODIFY] [page.tsx](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/app/form/page.tsx)
- Integrate logo in form header.

#### [MODIFY] [HRDashboard.tsx](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/components/HRDashboard.tsx)
- Integrate logo in HR dashboard header.

---

### Layout Polish

#### [MODIFY] [EquipmentCrudDialog.tsx](file:///c:/Users/Desktop/Documents/GI/web/Withdrawal/components/hr/EquipmentCrudDialog.tsx)
- Override `QuantityStepper` classes by passing `className="max-w-full w-full"` to make inputs expand and align perfectly with standard `Input` components.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify standard Next.js build succeeds with PWA metadata and styling modifications.

### Manual Verification
- Open page in browser, open DevTools -> Application tab to inspect Service Worker registration and PWA manifest.
- Open "เพิ่มอุปกรณ์" (Add Equipment) and "แก้ไข" (Edit Equipment) modals to verify that the stock quantity steppers take up the full column width and align perfectly.
