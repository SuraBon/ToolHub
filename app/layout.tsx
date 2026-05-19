import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "คลังอุปกรณ์",
  description: "ระบบตรวจสต๊อก เบิกอุปกรณ์ และจัดการคลัง",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
