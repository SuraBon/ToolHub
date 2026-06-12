"use client"

import { Copy, Download, QrCode } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface QrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestFormUrl: string
  requestFormQr: string
  onCopyUrl: () => void
}

export function QrDialog({
  open,
  onOpenChange,
  requestFormUrl,
  requestFormQr,
  onCopyUrl,
}: QrDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600" />
            QR
          </DialogTitle>
          <DialogDescription>
            สแกนเพื่อเปิดหน้าหลักคลังอุปกรณ์ หรือคัดลอกลิงก์ไปส่งให้ผู้ใช้งาน
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 break-all">
              {requestFormUrl || "กำลังเตรียมลิงก์..."}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={onCopyUrl}
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl"
                disabled={!requestFormUrl}
              >
                <Copy className="h-4 w-4" />
                คัดลอกลิงก์
              </Button>
              {requestFormQr ? (
                <Button
                  asChild
                  className="h-11 w-full gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
                >
                  <a href={requestFormQr} download="request-form-qr.png">
                    <Download className="h-4 w-4" />
                    ดาวน์โหลด QR
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full gap-2 rounded-xl bg-blue-600 hover:bg-blue-700"
                  disabled
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลด QR
                </Button>
              )}
            </div>
          </div>

          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-inner">
            {requestFormQr ? (
              <Image
                src={requestFormQr}
                alt="QR สำหรับเปิดหน้าหลักคลังอุปกรณ์"
                width={196}
                height={196}
                unoptimized
                className="h-full w-full"
              />
            ) : (
              <QrCode className="h-16 w-16 text-slate-300" />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
