"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  FileText,
  KeyRound,
  LogOut,
  Package,
  QrCode,
  RefreshCw,
  ScrollText,
  Shield,
  ShieldCheck,
} from "lucide-react"
import QRCode from "qrcode"
import { motion, AnimatePresence } from "framer-motion"

import { BackToStockButton } from "@/components/BackToStockButton"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog"
import { MobileActionButton } from "@/components/MobileActionButton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"

import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "@/lib/client-api"
import { showApiErrorToast } from "@/lib/show-api-error-toast"
import { sortEquipmentById } from "@/lib/equipment-utils"
import type { Equipment } from "@/types"

import { EquipmentTable } from "@/components/hr/EquipmentTable"
import { HistoryTable, type RequisitionHistory, type RequisitionHistoryGroup } from "@/components/hr/HistoryTable"
import { EquipmentCrudDialog } from "@/components/hr/EquipmentCrudDialog"
import { HistoryEditDialog } from "@/components/hr/HistoryEditDialog"
import { QrDialog } from "@/components/hr/QrDialog"
import { AuditLogTable, type AdminAuditLog } from "@/components/hr/AuditLogTable"

const HR_IDLE_TIMEOUT_MS = 60 * 60 * 1000
const HR_SESSION_REFRESH_DEBOUNCE_MS = 60 * 1000
const HR_SESSION_REFRESH_DELAY_MS = 750

type AuthResponse = {
  success: boolean
  authenticated: boolean
}

type EquipmentResponse = {
  success: boolean
  equipment: Equipment
}

type HrDashboardDataResponse = {
  equipment: Equipment[]
  history: RequisitionHistory[]
  status: SystemStatus
}

type EnvCheck = {
  key: string
  configured: boolean
  required: boolean
}

type SystemStatus = {
  ok: boolean
  checkedAt: string
  googleSheetsReady: boolean
  blobReady: boolean
  error: string | null
  environment: EnvCheck[]
  inventory: {
    total: number
    available: number
    outOfStock: number
  } | null
  history: {
    total: number
  } | null
}

type HRDashboardProps = {
  onBackToStock?: () => void
}

export default function HRDashboard({ onBackToStock }: HRDashboardProps = {}) {
  const router = useRouter()
  const { toast } = useToast()

  // Authentications
  const [checkingAuth, setCheckingAuth] = React.useState(true)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [password, setPassword] = React.useState("")

  // Master Data
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [history, setHistory] = React.useState<RequisitionHistory[]>([])
  const [auditLogs, setAuditLogs] = React.useState<AdminAuditLog[]>([])
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus | null>(null)

  // Loading States
  const [loading, setLoading] = React.useState(false)
  const [loadingLogs, setLoadingLogs] = React.useState(false)
  const [savingEquipment, setSavingEquipment] = React.useState(false)
  const [savingHistory, setSavingHistory] = React.useState(false)
  const [deletingEquipment, setDeletingEquipment] = React.useState(false)
  const [cancelingHistory, setCancelingHistory] = React.useState(false)

  // Modals / Dialogs State
  const [activeTab, setActiveTab] = React.useState<"equipment" | "history" | "monitoring" | "logs">("equipment")
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false)
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)

  const [editingEquipment, setEditingEquipment] = React.useState<Equipment | null>(null)
  const [editingHistoryItem, setEditingHistoryItem] = React.useState<RequisitionHistory | null>(null)

  // Action Targets for ConfirmActionDialog
  const [deleteTarget, setDeleteTarget] = React.useState<Equipment | null>(null)
  const [cancelHistoryTarget, setCancelHistoryTarget] = React.useState<RequisitionHistory | null>(null)
  const [cancelHistoryGroupTarget, setCancelHistoryGroupTarget] = React.useState<RequisitionHistoryGroup | null>(null)

  const [cancelHistoryProgress, setCancelHistoryProgress] = React.useState({ completed: 0, total: 0 })

  // Session & Timeout Refs
  const idleTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefreshAtRef = React.useRef(0)

  // URLs
  const [requestFormUrl, setRequestFormUrl] = React.useState("")
  const [requestFormQr, setRequestFormQr] = React.useState("")

  React.useEffect(() => {
    setRequestFormUrl(`${window.location.origin}/`)
  }, [])

  React.useEffect(() => {
    if (!requestFormUrl) return

    QRCode.toDataURL(requestFormUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 320,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then(setRequestFormQr)
      .catch((error) => {
        console.error("Error generating request form QR:", error)
        setRequestFormQr("")
      })
  }, [requestFormUrl])

  const clearSessionTimers = React.useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [])

  const expireHrSession = React.useCallback(
    (showIdleMessage = false) => {
      clearSessionTimers()
      setIsAuthenticated(false)
      setCheckingAuth(false)
      setPassword("")
      setEditDialogOpen(false)
      setHistoryDialogOpen(false)
      setDeleteTarget(null)
      setCancelHistoryTarget(null)
      setCancelHistoryGroupTarget(null)

      if (showIdleMessage) {
        toast({
          title: "ออกจากระบบแล้ว",
          description: "ออกจากระบบแล้ว เนื่องจากไม่มีการใช้งานเกิน 1 ชั่วโมง",
        })
      }
    },
    [clearSessionTimers, toast]
  )

  const handleAuthenticatedError = React.useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        expireHrSession(true)
        return true
      }
      return false
    },
    [expireHrSession]
  )

  const refreshHrSession = React.useCallback(async () => {
    try {
      const result = await apiGet<AuthResponse>("/api/hr-auth", {
        cache: "no-store",
      })

      if (result.authenticated) {
        lastRefreshAtRef.current = Date.now()
        return
      }

      expireHrSession(true)
    } catch (error) {
      if (!handleAuthenticatedError(error)) {
        console.error("Error refreshing HR session:", error)
      }
    }
  }, [expireHrSession, handleAuthenticatedError])

  const handleIdleLogout = React.useCallback(async () => {
    try {
      await apiDelete<AuthResponse>("/api/hr-auth")
    } catch (error) {
      console.error("Error clearing idle HR session:", error)
    } finally {
      expireHrSession(true)
    }
  }, [expireHrSession])

  const resetIdleTimer = React.useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }

    idleTimeoutRef.current = setTimeout(() => {
      void handleIdleLogout()
    }, HR_IDLE_TIMEOUT_MS)
  }, [handleIdleLogout])

  const handleUserActivity = React.useCallback(() => {
    resetIdleTimer()

    const now = Date.now()
    if (now - lastRefreshAtRef.current < HR_SESSION_REFRESH_DEBOUNCE_MS) {
      return
    }

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null
      void refreshHrSession()
    }, HR_SESSION_REFRESH_DELAY_MS)
  }, [refreshHrSession, resetIdleTimer])

  const fetchData = React.useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true)
      }
      try {
        const data = await apiGet<HrDashboardDataResponse>("/api/hr-dashboard-data", {
          cache: "no-store",
        })
        setEquipment(Array.isArray(data.equipment) ? sortEquipmentById(data.equipment) : [])
        setHistory(Array.isArray(data.history) ? data.history : [])
        setSystemStatus(data.status)
      } catch (error) {
        if (handleAuthenticatedError(error)) return
        console.error("Error fetching HR data:", error)
        showApiErrorToast({
          toast,
          error,
          fallback: "ไม่สามารถดึงข้อมูลได้",
        })
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [handleAuthenticatedError, toast]
  )

  const fetchAuditLogs = React.useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoadingLogs(true)
      }
      try {
        const data = await apiGet<AdminAuditLog[]>("/api/audit-log", {
          cache: "no-store",
        })
        setAuditLogs(Array.isArray(data) ? data : [])
      } catch (error) {
        if (handleAuthenticatedError(error)) return
        console.error("Error fetching audit logs:", error)
        showApiErrorToast({
          toast,
          error,
          fallback: "ไม่สามารถดึงข้อมูล Log ได้",
        })
      } finally {
        if (showLoading) {
          setLoadingLogs(false)
        }
      }
    },
    [handleAuthenticatedError, toast]
  )

  React.useEffect(() => {
    let cancelled = false

    async function checkHrSession() {
      setCheckingAuth(true)
      try {
        const result = await apiGet<AuthResponse>("/api/hr-auth", {
          cache: "no-store",
        })

        if (!cancelled && result.authenticated) {
          setIsAuthenticated(true)
          void fetchData()
        }
      } catch (error) {
        console.error("Error checking HR session:", error)
      } finally {
        if (!cancelled) {
          setCheckingAuth(false)
        }
      }
    }

    void checkHrSession()

    return () => {
      cancelled = true
    }
  }, [fetchData])

  React.useEffect(() => {
    if (!isAuthenticated || activeTab !== "logs" || auditLogs.length > 0) {
      return
    }
    void fetchAuditLogs()
  }, [activeTab, auditLogs.length, fetchAuditLogs, isAuthenticated])

  React.useEffect(() => {
    if (!isAuthenticated || checkingAuth) {
      clearSessionTimers()
      return
    }

    lastRefreshAtRef.current = Date.now()
    resetIdleTimer()

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "scroll", "touchstart", "mousemove"]

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, {
        passive: eventName !== "keydown",
      })
    })

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity)
      })
      clearSessionTimers()
    }
  }, [checkingAuth, clearSessionTimers, handleUserActivity, isAuthenticated, resetIdleTimer])

  const handleLogin = async () => {
    try {
      const result = await apiPost<AuthResponse>("/api/hr-auth", { password })
      if (result.success) {
        setIsAuthenticated(true)
        fetchData()
      }
    } catch (error) {
      console.error("Error authenticating:", error)
      showApiErrorToast({
        toast,
        error,
        title: "เข้าสู่ระบบไม่สำเร็จ",
        fallback: "เกิดข้อผิดพลาด",
      })
    }
  }

  const handleLogout = async () => {
    try {
      await apiDelete<AuthResponse>("/api/hr-auth")
    } catch (error) {
      console.error("Error clearing HR session:", error)
    }

    clearSessionTimers()
    setIsAuthenticated(false)
    if (onBackToStock) {
      onBackToStock()
      return
    }
    router.push("/")
  }

  const handleCopyRequestFormUrl = async () => {
    if (!requestFormUrl) return
    try {
      await navigator.clipboard.writeText(requestFormUrl)
      toast({
        title: "คัดลอกลิงก์สำเร็จ",
        description: "นำลิงก์หน้าหลักคลังอุปกรณ์ไปใช้งานได้ทันที",
      })
    } catch (error) {
      console.error("Error copying request form URL:", error)
      toast({
        variant: "destructive",
        title: "ไม่สามารถคัดลอกลิงก์ได้",
        description: requestFormUrl,
      })
    }
  }

  const handleSaveEquipment = async (payload: any) => {
    setSavingEquipment(true)
    try {
      const result = editingEquipment
        ? await apiPut<EquipmentResponse>("/api/equipment", payload)
        : await apiPost<EquipmentResponse>("/api/equipment", payload)

      toast({
        title: "บันทึกข้อมูลสำเร็จ",
        description: editingEquipment ? "แก้ไขข้อมูลอุปกรณ์แล้ว" : "เพิ่มรายการอุปกรณ์ใหม่แล้ว",
      })

      const savedEquipment = result.equipment as Equipment | undefined
      if (savedEquipment) {
        setEquipment((current) => {
          const itemExists = current.some((item) => item.id === savedEquipment.id)
          if (itemExists) {
            return current.map((item) => (item.id === savedEquipment.id ? savedEquipment : item))
          }
          return [...current, savedEquipment]
        })
      }
      setEditDialogOpen(false)
      setEditingEquipment(null)
      void fetchData(false)
    } catch (error) {
      if (handleAuthenticatedError(error)) return
      showApiErrorToast({
        toast,
        error,
        title: "ไม่สามารถบันทึกข้อมูลได้",
        fallback: "ไม่สามารถบันทึกอุปกรณ์ได้",
      })
    } finally {
      setSavingEquipment(false)
    }
  }

  const handleSaveHistory = async (payload: any) => {
    setSavingHistory(true)
    try {
      await apiPut<{ success: boolean; history: RequisitionHistory }>("/api/requisition-history", payload)
      toast({
        title: "แก้ไขประวัติการเบิกอุปกรณ์สำเร็จ",
        description: payload.requisitionNumber,
      })
      setHistoryDialogOpen(false)
      setEditingHistoryItem(null)
      void fetchData(false)
    } catch (error) {
      if (handleAuthenticatedError(error)) return
      showApiErrorToast({
        toast,
        error,
        title: "ไม่สามารถแก้ไขประวัติการเบิกอุปกรณ์ได้",
        fallback: "ไม่สามารถแก้ไขประวัติการเบิกอุปกรณ์ได้",
      })
    } finally {
      setSavingHistory(false)
    }
  }

  const handleCancelHistory = async () => {
    if (!cancelHistoryTarget) return
    setCancelHistoryProgress({ completed: 0, total: 1 })
    setCancelingHistory(true)
    try {
      await apiDelete<{ success: boolean; history: RequisitionHistory }>(
        `/api/requisition-history?rowNumber=${encodeURIComponent(String(cancelHistoryTarget.rowNumber))}`
      )
      toast({
        title: "ยกเลิกการเบิกสำเร็จ",
        description: `${cancelHistoryTarget.requisitionNumber} (1/1 รายการ)`,
      })
      setCancelHistoryProgress({ completed: 1, total: 1 })
      setCancelHistoryTarget(null)
      void fetchData(false)
    } catch (error) {
      if (handleAuthenticatedError(error)) return
      showApiErrorToast({
        toast,
        error,
        title: "ไม่สามารถยกเลิกการเบิกได้",
        fallback: "ไม่สามารถยกเลิกการเบิกได้",
      })
    } finally {
      setCancelingHistory(false)
      setCancelHistoryProgress({ completed: 0, total: 0 })
    }
  }

  const handleCancelHistoryGroup = async () => {
    if (!cancelHistoryGroupTarget) return
    const totalItems = cancelHistoryGroupTarget.items.length
    setCancelHistoryProgress({ completed: 0, total: totalItems })
    setCancelingHistory(true)
    try {
      const result = await apiDelete<{
        success: boolean
        requisitionNumber: string
        canceledCount: number
      }>(`/api/requisition-history?requisitionNumber=${encodeURIComponent(cancelHistoryGroupTarget.requisitionNumber)}`)
      setCancelHistoryProgress({
        completed: result.canceledCount || totalItems,
        total: totalItems,
      })

      toast({
        title: "ยกเลิกคำขอเบิกสำเร็จ",
        description: `${cancelHistoryGroupTarget.requisitionNumber} (${result.canceledCount || totalItems}/${totalItems} รายการ)`,
      })
      setCancelHistoryGroupTarget(null)
      void fetchData(false)
    } catch (error) {
      if (handleAuthenticatedError(error)) return
      showApiErrorToast({
        toast,
        error,
        title: "ไม่สามารถยกเลิกคำขอเบิกได้",
        fallback: "ไม่สามารถยกเลิกคำขอเบิกได้",
      })
    } finally {
      setCancelingHistory(false)
      setCancelHistoryProgress({ completed: 0, total: 0 })
    }
  }

  const handleDeleteEquipment = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    const name = deleteTarget.name
    setDeletingEquipment(true)
    try {
      await apiDelete<{ success: boolean }>(`/api/equipment?id=${encodeURIComponent(id)}`)
      toast({
        title: "ลบข้อมูลอุปกรณ์สำเร็จ",
        description: `ลบแล้ว 1 รายการ: ${name}`,
      })
      await fetchData(false)
      setEquipment((current) => current.filter((item) => item.id !== id))
      setDeleteTarget(null)
    } catch (error) {
      if (handleAuthenticatedError(error)) return
      showApiErrorToast({
        toast,
        error,
        title: "ไม่สามารถลบข้อมูลได้",
        fallback: "ไม่สามารถลบอุปกรณ์ได้",
      })
    } finally {
      setDeletingEquipment(false)
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0,#f8fafc_42%,#eef2ff_100%)] p-4">
        <Card className="w-full max-w-md border-white/80 bg-white/90 shadow-2xl shadow-blue-200/60 backdrop-blur">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-300">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">กำลังตรวจสอบสิทธิ์</h1>
              <p className="mt-2 text-sm text-slate-600">ระบบกำลังตรวจสอบสถานะการเข้าสู่ระบบจัดการคลังอุปกรณ์</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0,#f8fafc_42%,#eef2ff_100%)] p-4">
        <Toaster />
        <Card className="w-full max-w-md overflow-hidden border-white/80 bg-white/90 shadow-2xl shadow-blue-200/60 backdrop-blur">
          <div className="h-1.5 bg-blue-600" />
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-300">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">เข้าสู่ระบบจัดการคลังอุปกรณ์</CardTitle>
              <CardDescription className="mt-2">
                สำหรับเจ้าหน้าที่ที่ต้องเพิ่ม แก้ไข และตรวจสอบประวัติการเบิกอุปกรณ์
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p>กรุณาใช้รหัสผ่านผู้ดูแลระบบก่อนแก้ไขข้อมูลคลังอุปกรณ์</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hrPassword">รหัสผ่าน</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="hrPassword"
                  type="password"
                  placeholder="กรอกรหัสผ่านผู้ดูแล"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleLogin()}
                  className="h-12 rounded-xl pl-10"
                />
              </div>
            </div>
            <div className="grid w-full gap-3 sm:justify-items-center">
              <MobileActionButton type="button" onClick={handleLogin} className="h-11 w-full max-w-80 px-4 text-sm sm:w-full">
                <ShieldCheck className="h-4 w-4" />
                เข้าสู่ระบบจัดการคลังอุปกรณ์
              </MobileActionButton>
              <BackToStockButton
                onBack={onBackToStock}
                className="h-11 w-full max-w-80 gap-2 rounded-xl border-slate-200 bg-white/90 px-4 text-sm font-medium shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 sm:w-full"
              />
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#f1f5f9_100%)]">
      <Toaster />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="โลโก้จัดการคลังอุปกรณ์"
                width={56}
                height={56}
                className="rounded-full object-cover shadow-sm"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">จัดการคลังอุปกรณ์</h1>
                <p className="mt-2 text-sm text-slate-600">เพิ่ม แก้ไข ลบอุปกรณ์ ดูประวัติการเบิกอุปกรณ์ และตรวจสถานะระบบ</p>
              </div>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <BackToStockButton onBack={onBackToStock} className="h-11 w-full gap-2 rounded-xl" />
              <MobileActionButton type="button" variant="outline" onClick={handleLogout} className="h-11 w-full gap-2 rounded-xl">
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </MobileActionButton>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            variant={activeTab === "equipment" ? "default" : "outline"}
            onClick={() => setActiveTab("equipment")}
            className="h-11 gap-2 rounded-xl"
          >
            <Package className="h-4 w-4" />
            อุปกรณ์
          </Button>
          <Button
            type="button"
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="h-11 gap-2 rounded-xl"
          >
            <FileText className="h-4 w-4" />
            <span className="sm:hidden">ประวัติ</span>
            <span className="hidden sm:inline">ประวัติการเบิกอุปกรณ์</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === "monitoring" ? "default" : "outline"}
            onClick={() => setActiveTab("monitoring")}
            className="h-11 gap-2 rounded-xl"
          >
            <Shield className="h-4 w-4" />
            <span className="sm:hidden">สถานะ</span>
            <span className="hidden sm:inline">สถานะระบบ</span>
          </Button>
          <Button
            type="button"
            variant={activeTab === "logs" ? "default" : "outline"}
            onClick={() => setActiveTab("logs")}
            className="h-11 gap-2 rounded-xl"
          >
            <ScrollText className="h-4 w-4" />
            Log
          </Button>
          <Button type="button" variant="outline" onClick={() => setQrDialogOpen(true)} className="h-11 gap-2 rounded-xl">
            <QrCode className="h-4 w-4" />
            <span className="sm:hidden">QR</span>
            <span className="hidden sm:inline">QR หน้าหลักคลังอุปกรณ์</span>
          </Button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {activeTab === "equipment" && (
              <EquipmentTable
                equipment={equipment}
                loading={loading}
                onAddClick={() => {
                  setEditingEquipment(null)
                  setEditDialogOpen(true)
                }}
                onEditClick={(item) => {
                  setEditingEquipment(item)
                  setEditDialogOpen(true)
                }}
                onDeleteClick={(item) => setDeleteTarget(item)}
              />
            )}

            {activeTab === "history" && (
              <HistoryTable
                history={history}
                equipment={equipment}
                loading={loading}
                onEditClick={(item) => {
                  setEditingHistoryItem(item)
                  setHistoryDialogOpen(true)
                }}
                onCancelClick={(item) => setCancelHistoryTarget(item)}
                onCancelGroupClick={(group) => setCancelHistoryGroupTarget(group)}
              />
            )}

            {activeTab === "monitoring" && systemStatus && (
              <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-xl">สถานะระบบ</CardTitle>
                      <CardDescription>ตรวจความพร้อมของการตั้งค่า การเชื่อมต่อ และข้อมูลหลัก</CardDescription>
                    </div>
                    <Button type="button" variant="outline" onClick={() => fetchData(false)} className="h-11 w-full gap-2 rounded-xl sm:w-auto">
                      <RefreshCw className="h-4 w-4" />
                      รีเฟรช
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div
                      className={`rounded-2xl border p-4 ${
                        systemStatus.ok
                          ? "border-emerald-100 bg-emerald-50 text-emerald-900"
                          : "border-red-100 bg-red-50 text-red-900"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                          {systemStatus.ok ? <Shield className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                          {systemStatus.ok ? "ระบบพร้อมใช้งาน" : "พบจุดที่ต้องตรวจสอบ"}
                        </div>
                        <span className="text-sm">อัปเดตล่าสุด: {systemStatus.checkedAt}</span>
                      </div>
                      {systemStatus.error && <p className="mt-2 text-sm">{systemStatus.error}</p>}
                    </div>

                    <section className="grid gap-3 md:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">Google Sheets</p>
                        <p className="mt-2 text-lg font-semibold">{systemStatus.googleSheetsReady ? "พร้อม" : "มีปัญหา"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">อัปโหลดรูป</p>
                        <p className="mt-2 text-lg font-semibold">{systemStatus.blobReady ? "พร้อม" : "ยังไม่ตั้งค่า"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">อุปกรณ์ทั้งหมด</p>
                        <p className="mt-2 text-lg font-semibold">{systemStatus.inventory?.total ?? "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">ประวัติการเบิกอุปกรณ์</p>
                        <p className="mt-2 text-lg font-semibold">{systemStatus.history?.total ?? "-"}</p>
                      </div>
                    </section>

                    {systemStatus.inventory && (
                      <section className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-xs font-medium text-emerald-700">พร้อมเบิก</p>
                          <p className="mt-2 text-2xl font-bold text-emerald-800">{systemStatus.inventory.available}</p>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                          <p className="text-xs font-medium text-red-700">หมดสต๊อก</p>
                          <p className="mt-2 text-2xl font-bold text-red-800">{systemStatus.inventory.outOfStock}</p>
                        </div>
                      </section>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 px-4 py-3 font-semibold">การตั้งค่าระบบ</div>
                      <div className="divide-y divide-slate-100">
                        {systemStatus.environment.map((item) => (
                          <div key={item.key} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <div>
                              <p className="font-medium">{item.key}</p>
                              <p className="text-xs text-slate-500">{item.required ? "จำเป็น" : "ทางเลือก"}</p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                item.configured
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.required
                                    ? "bg-red-50 text-red-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.configured ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "monitoring" && !systemStatus && (
              <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
                <CardContent className="py-10 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลสถานะล่าสุด กรุณากดปุ่มรีเฟรชด้านบน
                </CardContent>
              </Card>
            )}

            {activeTab === "logs" && (
              <AuditLogTable
                auditLogs={auditLogs}
                loadingLogs={loadingLogs}
                onRefresh={() => fetchAuditLogs(false)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dialog Modals */}
        <QrDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          requestFormUrl={requestFormUrl}
          requestFormQr={requestFormQr}
          onCopyUrl={handleCopyRequestFormUrl}
        />

        <EquipmentCrudDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          editingEquipment={editingEquipment}
          onSave={handleSaveEquipment}
          saving={savingEquipment}
          handleAuthenticatedError={handleAuthenticatedError}
        />

        <HistoryEditDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          editingHistoryItem={editingHistoryItem}
          equipment={equipment}
          onSave={handleSaveHistory}
          saving={savingHistory}
        />

        {/* Confirmations Action Dialogs */}
        <ConfirmActionDialog
          open={Boolean(cancelHistoryGroupTarget)}
          onOpenChange={(open) => !open && setCancelHistoryGroupTarget(null)}
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              ยืนยันการยกเลิกคำขอเบิก
            </span>
          }
          description="รายการทั้งหมดในคำขอนี้จะถูกยกเลิก และระบบจะคืนจำนวนที่เบิกกลับเข้าคลังอุปกรณ์"
          cancelLabel="ไม่ดำเนินการ"
          confirmLabel="ยืนยันการยกเลิกคำขอ"
          loadingLabel={
            cancelHistoryProgress.total > 0
              ? `กำลังยกเลิก... ${cancelHistoryProgress.completed}/${cancelHistoryProgress.total}`
              : "กำลังยกเลิก..."
          }
          variant="destructive"
          loading={cancelingHistory}
          onConfirm={handleCancelHistoryGroup}
          onCancel={() => setCancelHistoryGroupTarget(null)}
        >
          {cancelHistoryGroupTarget && (
            <div className="space-y-2 rounded-lg border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-950">
              <p className="font-semibold">{cancelHistoryGroupTarget.requisitionNumber}</p>
              <p>{cancelHistoryGroupTarget.name} · {cancelHistoryGroupTarget.department}</p>
              <p className="font-semibold text-rose-700">จำนวนที่จะลบ: {cancelHistoryGroupTarget.items.length} รายการ</p>
              <div className="space-y-1 mt-2 text-xs divide-y divide-rose-100/50">
                {cancelHistoryGroupTarget.items.map((item) => (
                  <p key={item.rowNumber} className="pt-1">
                    {item.equipmentName} · {item.amount} {item.unit}
                  </p>
                ))}
              </div>
            </div>
          )}
        </ConfirmActionDialog>

        <ConfirmActionDialog
          open={Boolean(cancelHistoryTarget)}
          onOpenChange={(open) => !open && setCancelHistoryTarget(null)}
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              ยืนยันการยกเลิกการเบิก
            </span>
          }
          description="รายการนี้จะถูกยกเลิก และระบบจะคืนจำนวนที่เบิกกลับเข้าคลังอุปกรณ์"
          cancelLabel="ไม่ดำเนินการ"
          confirmLabel="ยืนยันการยกเลิก"
          loadingLabel="กำลังยกเลิก..."
          variant="destructive"
          loading={cancelingHistory}
          onConfirm={handleCancelHistory}
          onCancel={() => setCancelHistoryTarget(null)}
        >
          {cancelHistoryTarget && (
            <div className="space-y-1 rounded-lg border border-rose-100 bg-rose-50/70 p-4 text-sm text-rose-950">
              <p className="font-semibold">{cancelHistoryTarget.requisitionNumber}</p>
              <p>{cancelHistoryTarget.equipmentName}</p>
              <p>จำนวน {cancelHistoryTarget.amount} {cancelHistoryTarget.unit}</p>
            </div>
          )}
        </ConfirmActionDialog>

        <ConfirmActionDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              ยืนยันการลบข้อมูลอุปกรณ์
            </span>
          }
          description="รายการนี้จะถูกลบออกจากระบบ รวมถึงรูปภาพที่บันทึกไว้ในระบบจะถูกลบอย่างสมบูรณ์"
          confirmLabel="ลบข้อมูลอุปกรณ์"
          loadingLabel="กำลังโหลด..."
          variant="destructive"
          loading={deletingEquipment}
          onConfirm={handleDeleteEquipment}
          onCancel={() => setDeleteTarget(null)}
        >
          {deleteTarget && (
            <div className="rounded-lg border border-red-100 bg-red-50/70 p-4 text-sm">
              <p className="font-semibold text-red-950">{deleteTarget.name}</p>
              <p className="mt-1 text-red-800">รหัส: {deleteTarget.id}</p>
            </div>
          )}
        </ConfirmActionDialog>
      </div>
    </main>
  )
}
