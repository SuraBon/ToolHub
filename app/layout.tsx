import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "คลังอุปกรณ์",
  description: "ระบบตรวจสอบคลังอุปกรณ์และบันทึกคำขอเบิกอุปกรณ์",
  manifest: "/manifest.json",
}

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('PWA ServiceWorker registered with scope:', reg.scope);
                    },
                    function(err) {
                      console.error('PWA ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}

