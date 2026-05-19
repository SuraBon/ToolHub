import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ToolHub Stock",
  description: "Stock, Request Form และ Management สำหรับอุปกรณ์",
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
