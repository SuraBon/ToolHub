"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  Copy,
  Download,
  Edit,
  FileText,
  Info,
  KeyRound,
  LogOut,
  Package,
  Plus,
  QrCode,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import Image from "next/image"
import QRCode from "qrcode"

import { BackToStockButton } from "@/components/BackToStockButton"
import { Button } from "@/components/ui/button"
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog"
import { EquipmentCombobox } from "@/components/EquipmentCombobox"
import { MobileActionButton } from "@/components/MobileActionButton"
import { PaginationControls } from "@/components/PaginationControls"
import { UnitSelector } from "@/components/UnitSelector"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "@/lib/client-api"
import { showApiErrorToast } from "@/lib/show-api-error-toast"
import {
  type StockFilter,
  equipmentMatchesFilter,
  equipmentMatchesSearch,
  formatRemainingQuantity,
  sortEquipmentById,
  stockFilterLabels,
} from "@/lib/equipment-utils"
import { paginateItems } from "@/lib/pagination"
import type { Equipment } from "@/types"

const INVENTORY_PAGE_SIZE = 10
const HISTORY_PAGE_SIZE = 12
const HR_IDLE_TIMEOUT_MS = 60 * 60 * 1000
const HR_SESSION_REFRESH_DEBOUNCE_MS = 60 * 1000
const HR_SESSION_REFRESH_DELAY_MS = 750

interface RequisitionHistory {
  rowNumber: number
  requisitionNumber: string
  date: string
  name: string
  department: string
  equipmentName: string
  amount: number
  unit: string
}

type AuthResponse = {
  success: boolean
  authenticated: boolean
}

type EquipmentResponse = {
  success: boolean
  equipment: Equipment
}

type UploadResponse = {
  success: boolean
  url: string
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

type EquipmentDraft = {
  id: string
  image: string
  name: string
  totalStock: string
  stockMainUnit: string
  stockBaseUnit: string
  used: string
  baseUnit: string
  mainUnit: string
  ratio: string
}

type ImageEditorState = {
  file: File
  previewUrl: string
  zoom: number
  offsetX: number
  offsetY: number
}

type RequisitionHistoryDraft = {
  rowNumber: number
  requisitionNumber: string
  date: string
  name: string
  department: string
  equipmentId: string
  amount: string
  isMainUnit: boolean
}

const emptyEquipmentDraft: EquipmentDraft = {
  id: "",
  image: "",
  name: "",
  totalStock: "",
  stockMainUnit: "",
  stockBaseUnit: "",
  used: "0",
  baseUnit: "",
  mainUnit: "",
  ratio: "",
}

function historyMatchesSearch(item: RequisitionHistory, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    item.requisitionNumber,
    item.date,
    item.name,
    item.department,
    item.equipmentName,
    String(item.amount),
    item.unit,
    `${item.amount} ${item.unit}`,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery)
}

function toEquipmentDraft(equipment: Equipment | null): EquipmentDraft {
  if (!equipment) return emptyEquipmentDraft
  const ratio = equipment.ratio && equipment.ratio > 0 ? equipment.ratio : 0
  const hasMainUnit = Boolean(equipment.mainUnit && ratio)
  const stockMainUnit = hasMainUnit
    ? String(Math.floor(equipment.totalStock / ratio))
    : ""
  const stockBaseUnit = hasMainUnit
    ? String(equipment.totalStock % ratio)
    : String(equipment.totalStock)

  return {
    id: equipment.id,
    image: equipment.image || "",
    name: equipment.name,
    totalStock: String(equipment.totalStock),
    stockMainUnit,
    stockBaseUnit,
    used: String(equipment.used),
    baseUnit: equipment.baseUnit,
    mainUnit: equipment.mainUnit || "",
    ratio: equipment.ratio ? String(equipment.ratio) : "",
  }
}

type HRDashboardProps = {
  onBackToStock?: () => void
}

export default function HRDashboard({ onBackToStock }: HRDashboardProps = {}) {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = React.useState(true)
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [history, setHistory] = React.useState<RequisitionHistory[]>([])
  const [loading, setLoading] = React.useState(false)
  const [savingEquipment, setSavingEquipment] = React.useState(false)
  const [savingHistory, setSavingHistory] = React.useState(false)
  const [deletingEquipment, setDeletingEquipment] = React.useState(false)
  const [cancelingHistory, setCancelingHistory] = React.useState(false)
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const [imageEditor, setImageEditor] =
    React.useState<ImageEditorState | null>(null)
  const [requestFormUrl, setRequestFormUrl] = React.useState("")
  const [requestFormQr, setRequestFormQr] = React.useState("")
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)
  const [managementSearch, setManagementSearch] = React.useState("")
  const [managementFilter, setManagementFilter] =
    React.useState<StockFilter>("all")
  const [historySearch, setHistorySearch] = React.useState("")
  const [inventoryPage, setInventoryPage] = React.useState(1)
  const [historyPage, setHistoryPage] = React.useState(1)
  const [activeTab, setActiveTab] =
    React.useState<"equipment" | "history" | "monitoring">("equipment")
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false)
  const [editingEquipment, setEditingEquipment] =
    React.useState<Equipment | null>(null)
  const [historyDraft, setHistoryDraft] =
    React.useState<RequisitionHistoryDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Equipment | null>(null)
  const [cancelHistoryTarget, setCancelHistoryTarget] =
    React.useState<RequisitionHistory | null>(null)
  const [equipmentDraft, setEquipmentDraft] =
    React.useState<EquipmentDraft>(emptyEquipmentDraft)
  const [systemStatus, setSystemStatus] = React.useState<SystemStatus | null>(
    null
  )
  const idleTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefreshAtRef = React.useRef(0)
  const { toast } = useToast()
  const parsedRatio = Number(equipmentDraft.ratio) || 0
  const hasMainStockUnit = Boolean(equipmentDraft.mainUnit.trim() && parsedRatio > 0)
  const computedTotalStock =
    (Number(equipmentDraft.stockBaseUnit) || 0) +
    (hasMainStockUnit ? (Number(equipmentDraft.stockMainUnit) || 0) * parsedRatio : 0)
  const selectedHistoryEquipment = historyDraft
    ? equipment.find((item) => item.id === historyDraft.equipmentId) || null
    : null

  const filteredEquipment = React.useMemo(() => {
    return equipment.filter(
      (item) =>
        equipmentMatchesFilter(item, managementFilter) &&
        equipmentMatchesSearch(item, managementSearch)
    )
  }, [equipment, managementFilter, managementSearch])
  const filteredHistory = React.useMemo(() => {
    return history.filter((item) => historyMatchesSearch(item, historySearch))
  }, [history, historySearch])
  const {
    currentPage: currentInventoryPage,
    items: paginatedEquipment,
  } = paginateItems(filteredEquipment, inventoryPage, INVENTORY_PAGE_SIZE)
  const {
    currentPage: currentHistoryPage,
    items: paginatedHistory,
  } = paginateItems(filteredHistory, historyPage, HISTORY_PAGE_SIZE)

  React.useEffect(() => {
    setInventoryPage(1)
  }, [managementFilter, managementSearch])

  React.useEffect(() => {
    setHistoryPage(1)
  }, [historySearch])

  React.useEffect(() => {
    setRequestFormUrl(`${window.location.origin}/form`)
  }, [])

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
      setImageEditor(null)

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

  const fetchData = React.useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true)
    }
    try {
      const [eqRes, histRes] = await Promise.all([
        apiGet<Equipment[]>("/api/equipment?scope=all"),
        apiGet<RequisitionHistory[]>("/api/requisition-history", {
          cache: "no-store",
        }),
      ])
      setEquipment(Array.isArray(eqRes) ? sortEquipmentById(eqRes) : [])
      setHistory(Array.isArray(histRes) ? histRes : [])
      try {
        const status = await apiGet<SystemStatus>("/api/management-status", {
          cache: "no-store",
        })
        setSystemStatus(status)
      } catch (error) {
        if (handleAuthenticatedError(error)) return
        console.error("Error fetching system status:", error)
        setSystemStatus(null)
      }
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
  }, [handleAuthenticatedError, toast])

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
    if (!isAuthenticated || checkingAuth) {
      clearSessionTimers()
      return
    }

    lastRefreshAtRef.current = Date.now()
    resetIdleTimer()

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ]

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
  }, [
    checkingAuth,
    clearSessionTimers,
    handleUserActivity,
    isAuthenticated,
    resetIdleTimer,
  ])

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
        description: "นำลิงก์ฟอร์มเบิกอุปกรณ์ไปใช้งานได้ทันที",
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

  const openAddDialog = () => {
    setEditingEquipment(null)
    setEquipmentDraft(emptyEquipmentDraft)
    setEditDialogOpen(true)
  }

  const openEditDialog = (item: Equipment) => {
    setEditingEquipment(item)
    setEquipmentDraft(toEquipmentDraft(item))
    setEditDialogOpen(true)
  }

  const updateDraft = (field: keyof EquipmentDraft, value: string) => {
    setEquipmentDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resetImageEditor = React.useCallback(() => {
    setImageEditor((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl)
      }
      return null
    })
  }, [])

  React.useEffect(() => resetImageEditor, [resetImageEditor])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพเท่านั้น",
      })
      event.target.value = ""
      return
    }

    resetImageEditor()
    setImageEditor({
      file,
      previewUrl: URL.createObjectURL(file),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    })
    event.target.value = ""
  }

  const updateImageEditor = (
    field: "zoom" | "offsetX" | "offsetY",
    value: number
  ) => {
    setImageEditor((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    )
  }

  const createAdjustedImageBlob = (editor: ImageEditorState) => {
    return new Promise<Blob>((resolve, reject) => {
      const image = new window.Image()
      image.onload = () => {
        const size = 800
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")

        if (!context) {
          reject(new Error("ไม่สามารถเตรียมรูปภาพได้"))
          return
        }

        canvas.width = size
        canvas.height = size
        context.fillStyle = "#f8fafc"
        context.fillRect(0, 0, size, size)

        const coverScale = Math.max(size / image.width, size / image.height)
        const scale = coverScale * editor.zoom
        const drawWidth = image.width * scale
        const drawHeight = image.height * scale
        const maxOffsetX = Math.max(0, (drawWidth - size) / 2)
        const maxOffsetY = Math.max(0, (drawHeight - size) / 2)
        const drawX =
          (size - drawWidth) / 2 + (editor.offsetX / 100) * maxOffsetX
        const drawY =
          (size - drawHeight) / 2 + (editor.offsetY / 100) * maxOffsetY

        context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error("ไม่สามารถสร้างไฟล์รูปภาพได้"))
            }
          },
          "image/jpeg",
          0.9
        )
      }
      image.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"))
      image.src = editor.previewUrl
    })
  }

  const handleAdjustedImageUpload = async () => {
    if (!imageEditor) return

    setUploadingImage(true)
    try {
      const blob = await createAdjustedImageBlob(imageEditor)
      const formData = new FormData()
      const fileName = imageEditor.file.name.replace(/\.[^.]+$/, ".jpg")
      formData.append("file", blob, fileName)

      const result = await apiPost<UploadResponse>("/api/upload", formData)

      updateDraft("image", result.url)
      toast({
        title: "อัปโหลดรูปภาพสำเร็จ",
        description: "ระบบบันทึก URL รูปภาพเรียบร้อยแล้ว",
      })
      resetImageEditor()
    } catch (error) {
      if (handleAuthenticatedError(error)) return
      showApiErrorToast({
        toast,
        error,
        title: "ไม่สามารถอัปโหลดรูปภาพได้",
        fallback: "ไม่สามารถอัปโหลดรูปภาพได้",
      })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSaveEquipment = async () => {
    setSavingEquipment(true)
    try {
      const equipmentPayload = {
        ...equipmentDraft,
        totalStock: String(computedTotalStock),
        used: editingEquipment ? equipmentDraft.used : "0",
      }
      const result = editingEquipment
        ? await apiPut<EquipmentResponse>("/api/equipment", equipmentPayload)
        : await apiPost<EquipmentResponse>("/api/equipment", equipmentPayload)

      toast({
        title: "บันทึกข้อมูลสำเร็จ",
        description: editingEquipment
          ? "แก้ไขข้อมูลอุปกรณ์แล้ว"
          : "เพิ่มรายการอุปกรณ์ใหม่แล้ว",
      })
      const savedEquipment = result.equipment as Equipment | undefined
      if (savedEquipment) {
        setEquipment((current) => {
          const itemExists = current.some((item) => item.id === savedEquipment.id)

          if (itemExists) {
            return current.map((item) =>
              item.id === savedEquipment.id ? savedEquipment : item
            )
          }

          return [...current, savedEquipment]
        })
      }
      setEditDialogOpen(false)
      setEditingEquipment(null)
      setEquipmentDraft(emptyEquipmentDraft)
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

  const openHistoryDialog = (item: RequisitionHistory) => {
    const matchedEquipment = equipment.find(
      (eq) =>
        eq.name.trim().toLowerCase() === item.equipmentName.trim().toLowerCase()
    )

    setHistoryDraft({
      rowNumber: item.rowNumber,
      requisitionNumber: item.requisitionNumber,
      date: item.date,
      name: item.name,
      department: item.department,
      equipmentId: matchedEquipment?.id || "",
      amount: String(item.amount),
      isMainUnit: Boolean(
        matchedEquipment?.mainUnit &&
          item.unit.trim() === matchedEquipment.mainUnit.trim()
      ),
    })
    setHistoryDialogOpen(true)
  }

  const updateHistoryDraft = (
    field: keyof RequisitionHistoryDraft,
    value: string | number | boolean
  ) => {
    setHistoryDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    )
  }

  const handleHistoryEquipmentSelect = (equipmentId: string) => {
    const nextEquipment = equipment.find((item) => item.id === equipmentId)

    setHistoryDraft((current) =>
      current
        ? {
            ...current,
            equipmentId,
            isMainUnit:
              current.isMainUnit &&
              Boolean(nextEquipment?.mainUnit && nextEquipment.ratio),
          }
        : current
    )
  }

  const handleSaveHistory = async () => {
    if (!historyDraft) return

    setSavingHistory(true)
    try {
      await apiPut<{ success: boolean; history: RequisitionHistory }>(
        "/api/requisition-history",
        {
          ...historyDraft,
          amount: Number(historyDraft.amount),
        }
      )

      toast({
        title: "แก้ไขประวัติการเบิกอุปกรณ์สำเร็จ",
        description: historyDraft.requisitionNumber,
      })
      setHistoryDialogOpen(false)
      setHistoryDraft(null)
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

    setCancelingHistory(true)
    try {
      await apiDelete<{ success: boolean; history: RequisitionHistory }>(
        `/api/requisition-history?rowNumber=${encodeURIComponent(
          String(cancelHistoryTarget.rowNumber)
        )}`
      )

      toast({
        title: "ยกเลิกการเบิกสำเร็จ",
        description: cancelHistoryTarget.requisitionNumber,
      })
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
    }
  }

  const handleDeleteEquipment = async () => {
    if (!deleteTarget) return

    setDeletingEquipment(true)
    try {
      await apiDelete<{ success: boolean }>(
        `/api/equipment?id=${encodeURIComponent(deleteTarget.id)}`
      )

      toast({
        title: "ลบข้อมูลอุปกรณ์สำเร็จ",
        description: deleteTarget.name,
      })
      setEquipment((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      )
      setDeleteTarget(null)
      void fetchData(false)
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
              <h1 className="text-xl font-semibold text-slate-950">
                กำลังตรวจสอบสิทธิ์
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                ระบบกำลังตรวจสอบสถานะการเข้าสู่ระบบจัดการคลังอุปกรณ์
              </p>
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
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
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
            <MobileActionButton
              type="button"
              onClick={handleLogin}
              className="h-12 w-full text-base"
            >
              <ShieldCheck className="h-4 w-4" />
              เข้าสู่ระบบจัดการคลังอุปกรณ์
            </MobileActionButton>
            {onBackToStock ? (
              <BackToStockButton
                onBack={onBackToStock}
                className="h-11 w-full gap-2 rounded-xl border-slate-200 bg-white/90 font-semibold shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              />
            ) : (
              <BackToStockButton className="h-11 w-full gap-2 rounded-xl border-slate-200 bg-white/90 font-semibold shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" />
            )}
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              จัดการคลังอุปกรณ์
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              เพิ่ม แก้ไข ลบอุปกรณ์ ดูประวัติการเบิกอุปกรณ์ และตรวจสถานะระบบ
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            {onBackToStock ? (
              <BackToStockButton
                onBack={onBackToStock}
                className="h-11 w-full gap-2 rounded-xl"
              />
            ) : (
              <BackToStockButton className="h-11 w-full gap-2 rounded-xl" />
            )}
            <MobileActionButton
              type="button"
              variant="outline"
              onClick={handleLogout}
              className="h-11 w-full gap-2 rounded-xl"
            >
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
            ประวัติการเบิกอุปกรณ์
          </Button>
          <Button
            type="button"
            variant={activeTab === "monitoring" ? "default" : "outline"}
            onClick={() => setActiveTab("monitoring")}
            className="h-11 gap-2 rounded-xl"
          >
            <Shield className="h-4 w-4" />
            สถานะระบบ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setQrDialogOpen(true)}
            className="h-11 gap-2 rounded-xl"
          >
            <QrCode className="h-4 w-4" />
            QR ฟอร์มเบิกอุปกรณ์
          </Button>
        </div>

        {activeTab === "equipment" ? (
          <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">รายการอุปกรณ์</CardTitle>
                  <CardDescription>
                    จัดการรายการอุปกรณ์ทั้งหมด รวมถึงรายการที่หมดสต๊อก
                  </CardDescription>
                </div>
                <MobileActionButton
                  type="button"
                  onClick={openAddDialog}
                  className="h-11 w-full gap-2 rounded-xl sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มรายการอุปกรณ์
                </MobileActionButton>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={managementSearch}
                    onChange={(event) => setManagementSearch(event.target.value)}
                    placeholder="ค้นหารหัส ชื่อ หน่วย หรือสถานะ"
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10"
                  />
                </div>
                <Select
                  value={managementFilter}
                  onValueChange={(value) =>
                    setManagementFilter(value as StockFilter)
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{stockFilterLabels.all}</SelectItem>
                    <SelectItem value="available">
                      {stockFilterLabels.available}
                    </SelectItem>
                    <SelectItem value="out">{stockFilterLabels.out}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-600">
                  กำลังโหลด...
                </div>
              ) : equipment.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  ยังไม่มีอุปกรณ์ในระบบ
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  ไม่พบรายการที่ตรงกับคำค้น
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap text-center">รูปภาพ</TableHead>
                        <TableHead className="whitespace-nowrap text-center">รหัส</TableHead>
                        <TableHead className="whitespace-nowrap">
                          ชื่ออุปกรณ์
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          จำนวนรวม
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          เบิกไปแล้ว
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          คงเหลือ
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          หน่วยย่อย
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          หน่วยใหญ่
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          อัตราส่วน
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          จัดการ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEquipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex justify-center">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-md object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                                <Package className="h-5 w-5 text-slate-500" />
                              </div>
                            )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{item.id}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">
                            {item.totalStock}
                          </TableCell>
                          <TableCell className="text-center">{item.used}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {formatRemainingQuantity(item)}
                          </TableCell>
                          <TableCell className="text-center">{item.baseUnit}</TableCell>
                          <TableCell className="text-center">{item.mainUnit || "-"}</TableCell>
                          <TableCell className="text-center">
                            {item.ratio || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(item)}
                                className="text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">แก้ไข</span>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteTarget(item)}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">ลบ</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                  <PaginationControls
                    page={currentInventoryPage}
                    pageSize={INVENTORY_PAGE_SIZE}
                    totalItems={filteredEquipment.length}
                    onPageChange={setInventoryPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ) : activeTab === "history" ? (
          <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-xl">ประวัติการเบิกอุปกรณ์</CardTitle>
                  <CardDescription>
                    ดูและค้นหาประวัติการเบิกอุปกรณ์ทั้งหมด
                  </CardDescription>
                </div>
                <div className="relative w-full lg:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={historySearch}
                    onChange={(event) => setHistorySearch(event.target.value)}
                    placeholder="ค้นหาเลขที่ใบเบิก ชื่อ แผนก อุปกรณ์ หรือหน่วย"
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-600">
                  กำลังโหลด...
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  ยังไม่มีประวัติการเบิกอุปกรณ์
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  ไม่พบประวัติการเบิกอุปกรณ์ที่ตรงกับคำค้น
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap text-center">
                          เลขที่ใบเบิก
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">วันที่</TableHead>
                        <TableHead className="whitespace-nowrap">
                          ชื่อ-นามสกุล
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">แผนก</TableHead>
                        <TableHead className="whitespace-nowrap">
                          อุปกรณ์
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          จำนวน
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">หน่วย</TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          แก้ไข
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          ยกเลิก
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHistory.map((item) => (
                        <TableRow key={`${item.requisitionNumber}-${item.rowNumber}`}>
                          <TableCell className="text-center font-semibold">
                            {item.requisitionNumber}
                          </TableCell>
                          <TableCell className="text-center">{item.date}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-center">{item.department}</TableCell>
                          <TableCell>{item.equipmentName}</TableCell>
                          <TableCell className="text-center">
                            {item.amount}
                          </TableCell>
                          <TableCell className="text-center">{item.unit}</TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => openHistoryDialog(item)}
                              aria-label="แก้ไขประวัติการเบิกอุปกรณ์"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setCancelHistoryTarget(item)}
                              aria-label="ยกเลิกการเบิก"
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                  <PaginationControls
                    page={currentHistoryPage}
                    pageSize={HISTORY_PAGE_SIZE}
                    totalItems={filteredHistory.length}
                    onPageChange={setHistoryPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-xl">สถานะระบบ</CardTitle>
                  <CardDescription>
                    ตรวจความพร้อมของการตั้งค่า การเชื่อมต่อ และข้อมูลหลัก
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchData(false)}
                  className="h-11 w-full gap-2 rounded-xl sm:w-auto"
                >
                  <Shield className="h-4 w-4" />
                  ตรวจอีกครั้ง
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!systemStatus ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  ยังไม่มีข้อมูลสถานะล่าสุด
                </div>
              ) : (
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
                        {systemStatus.ok ? (
                          <Shield className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                        {systemStatus.ok ? "ระบบพร้อมใช้งาน" : "พบจุดที่ต้องตรวจสอบ"}
                      </div>
                      <span className="text-sm">อัปเดตล่าสุด: {systemStatus.checkedAt}</span>
                    </div>
                    {systemStatus.error ? (
                      <p className="mt-2 text-sm">{systemStatus.error}</p>
                    ) : null}
                  </div>

                  <section className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">Google Sheets</p>
                      <p className="mt-2 text-lg font-semibold">
                        {systemStatus.googleSheetsReady ? "พร้อม" : "มีปัญหา"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">อัปโหลดรูป</p>
                      <p className="mt-2 text-lg font-semibold">
                        {systemStatus.blobReady ? "พร้อม" : "ยังไม่ตั้งค่า"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">อุปกรณ์ทั้งหมด</p>
                      <p className="mt-2 text-lg font-semibold">
                        {systemStatus.inventory?.total ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-medium text-slate-500">ประวัติการเบิกอุปกรณ์</p>
                      <p className="mt-2 text-lg font-semibold">
                        {systemStatus.history?.total ?? "-"}
                      </p>
                    </div>
                  </section>

                  {systemStatus.inventory ? (
                    <section className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-xs font-medium text-emerald-700">พร้อมเบิก</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-800">
                          {systemStatus.inventory.available}
                        </p>
                      </div>
                      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                        <p className="text-xs font-medium text-red-700">หมดสต๊อก</p>
                        <p className="mt-2 text-2xl font-bold text-red-800">
                          {systemStatus.inventory.outOfStock}
                        </p>
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-4 py-3 font-semibold">
                      การตั้งค่าระบบ
                    </div>
                    <div className="divide-y divide-slate-100">
                      {systemStatus.environment.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">{item.key}</p>
                            <p className="text-xs text-slate-500">
                              {item.required ? "จำเป็น" : "ทางเลือก"}
                            </p>
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
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-600" />
                QR ฟอร์มเบิกอุปกรณ์
              </DialogTitle>
              <DialogDescription>
                สแกนเพื่อเปิดฟอร์มเบิกอุปกรณ์ หรือคัดลอกลิงก์ไปส่งให้ผู้ใช้งาน
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 sm:grid-cols-[1fr_220px] sm:items-center">
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                  {requestFormUrl || "กำลังเตรียมลิงก์..."}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={handleCopyRequestFormUrl}
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
                    alt="QR สำหรับเปิดฟอร์มเบิกอุปกรณ์"
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

        <Dialog
          open={historyDialogOpen}
          onOpenChange={(open) => {
            setHistoryDialogOpen(open)
            if (!open) {
              setHistoryDraft(null)
            }
          }}
        >
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>แก้ไขประวัติการเบิกอุปกรณ์</DialogTitle>
              <DialogDescription>
                แก้ไขรายการที่เบิกผิด ระบบจะปรับจำนวนที่เบิกไปแล้วและยอดคงเหลือให้ตามข้อมูลใหม่
              </DialogDescription>
            </DialogHeader>

            {historyDraft ? (
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>เลขที่ใบเบิก</Label>
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                    {historyDraft.requisitionNumber}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historyDate">วันที่เบิก</Label>
                  <Input
                    id="historyDate"
                    value={historyDraft.date}
                    onChange={(event) =>
                      updateHistoryDraft("date", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historyName">ชื่อ-นามสกุล</Label>
                  <Input
                    id="historyName"
                    value={historyDraft.name}
                    onChange={(event) =>
                      updateHistoryDraft("name", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historyDepartment">แผนก</Label>
                  <Input
                    id="historyDepartment"
                    value={historyDraft.department}
                    onChange={(event) =>
                      updateHistoryDraft("department", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>อุปกรณ์</Label>
                  <EquipmentCombobox
                    equipment={equipment}
                    value={historyDraft.equipmentId}
                    onSelect={handleHistoryEquipmentSelect}
                    disableUnavailable={false}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historyAmount">จำนวน</Label>
                  <Input
                    id="historyAmount"
                    type="number"
                    min="1"
                    value={historyDraft.amount}
                    onChange={(event) =>
                      updateHistoryDraft("amount", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>หน่วย</Label>
                  <UnitSelector
                    equipment={selectedHistoryEquipment}
                    value={historyDraft.isMainUnit}
                    onValueChange={(value) =>
                      updateHistoryDraft("isMainUnit", value)
                    }
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHistoryDialogOpen(false)}
                disabled={savingHistory}
                className="w-full sm:w-auto"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleSaveHistory}
                disabled={savingHistory}
                className="w-full sm:w-auto"
              >
                {savingHistory ? "กำลังบันทึก..." : "บันทึกประวัติการเบิก"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingEquipment ? "แก้ไขข้อมูลอุปกรณ์" : "เพิ่มรายการอุปกรณ์"}
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูลอุปกรณ์ ระบบจะคำนวณจำนวนรวมและยอดคงเหลือให้อัตโนมัติ
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-w-0 gap-4 py-2 sm:grid-cols-2">
              {editingEquipment ? (
                <div className="space-y-2">
                  <Label>รหัสอุปกรณ์</Label>
                  <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                    {editingEquipment.id}
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="name">ชื่ออุปกรณ์</Label>
                <Input
                  id="name"
                  value={equipmentDraft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                />
              </div>
              <div className="min-w-0 space-y-3 sm:col-span-2">
                <Label htmlFor="imageUpload">รูปภาพอุปกรณ์</Label>
                <div className="grid min-w-0 gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                  <Label
                    htmlFor="imageUpload"
                    className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    {equipmentDraft.image ? (
                      <Image
                        src={equipmentDraft.image}
                        alt={equipmentDraft.name || "รูปอุปกรณ์"}
                        width={112}
                        height={112}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <Package className="h-8 w-8 text-slate-400" />
                    )}
                    <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-950/70 px-2 py-1 text-center text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                      คลิกเพื่อเลือกรูป
                    </span>
                  </Label>
                  <div className="min-w-0 space-y-2">
                    <Input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      disabled={uploadingImage}
                      className="sr-only"
                    />
                    {imageEditor && (
                      <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-blue-200 bg-white">
                            <Image
                              src={imageEditor.previewUrl}
                              alt="ตัวอย่างรูปที่กำลังจัดตำแหน่ง"
                              width={144}
                              height={144}
                              unoptimized
                              className="h-full w-full object-cover"
                              style={{
                                transform: `translate(${imageEditor.offsetX}%, ${imageEditor.offsetY}%) scale(${imageEditor.zoom})`,
                              }}
                            />
                            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />
                          </div>
                          <div className="grid flex-1 gap-2">
                            <div className="space-y-1">
                              <Label htmlFor="imageZoom">ซูม</Label>
                              <Input
                                id="imageZoom"
                                type="range"
                                min="1"
                                max="3"
                                step="0.05"
                                value={imageEditor.zoom}
                                onChange={(event) =>
                                  updateImageEditor(
                                    "zoom",
                                    Number(event.target.value)
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="imageOffsetX">เลื่อนซ้าย-ขวา</Label>
                              <Input
                                id="imageOffsetX"
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={imageEditor.offsetX}
                                onChange={(event) =>
                                  updateImageEditor(
                                    "offsetX",
                                    Number(event.target.value)
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="imageOffsetY">เลื่อนขึ้น-ลง</Label>
                              <Input
                                id="imageOffsetY"
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={imageEditor.offsetY}
                                onChange={(event) =>
                                  updateImageEditor(
                                    "offsetY",
                                    Number(event.target.value)
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAdjustedImageUpload}
                            disabled={uploadingImage}
                            className="h-10 w-full gap-2"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingImage
                              ? "กำลังอัปโหลด..."
                              : "อัปโหลดรูปที่ปรับแล้ว"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={resetImageEditor}
                            disabled={uploadingImage}
                            className="h-10 w-full"
                          >
                            ยกเลิกการปรับรูป
                          </Button>
                        </div>
                      </div>
                    )}
                    <Input
                      id="image"
                      placeholder="หรือวาง URL รูปภาพ"
                      value={equipmentDraft.image}
                      onChange={(event) =>
                        updateDraft("image", event.target.value)
                      }
                      className="min-w-0"
                    />
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <Upload className="h-3.5 w-3.5" />
                      เลือกรูปแล้วปรับซูม/ตำแหน่งก่อนอัปโหลด หรือใส่ URL เอง
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUnit">หน่วยย่อย</Label>
                <Input
                  id="baseUnit"
                  value={equipmentDraft.baseUnit}
                  onChange={(event) =>
                    updateDraft("baseUnit", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainUnit">หน่วยใหญ่</Label>
                <Input
                  id="mainUnit"
                  value={equipmentDraft.mainUnit}
                  onChange={(event) =>
                    updateDraft("mainUnit", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ratio">
                  อัตราส่วน (จำนวนหน่วยย่อยต่อ 1 หน่วยใหญ่)
                </Label>
                <Input
                  id="ratio"
                  type="number"
                  min="1"
                  value={equipmentDraft.ratio}
                  onChange={(event) => updateDraft("ratio", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockMainUnit">
                  จำนวนหน่วยใหญ่
                  {equipmentDraft.mainUnit ? ` (${equipmentDraft.mainUnit})` : ""}
                </Label>
                <Input
                  id="stockMainUnit"
                  type="number"
                  min="0"
                  value={equipmentDraft.stockMainUnit}
                  onChange={(event) =>
                    updateDraft("stockMainUnit", event.target.value)
                  }
                  disabled={!hasMainStockUnit}
                  placeholder={
                    hasMainStockUnit ? "0" : "กรอกหน่วยใหญ่และอัตราส่วนก่อน"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockBaseUnit">
                  จำนวนหน่วยย่อย
                  {equipmentDraft.baseUnit ? ` (${equipmentDraft.baseUnit})` : ""}
                </Label>
                <Input
                  id="stockBaseUnit"
                  type="number"
                  min="0"
                  value={equipmentDraft.stockBaseUnit}
                  onChange={(event) =>
                    updateDraft("stockBaseUnit", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalStock">จำนวนรวม</Label>
                <Input
                  id="totalStock"
                  type="number"
                  value={computedTotalStock}
                  readOnly
                  className="bg-slate-50 font-semibold"
                />
              </div>
              {editingEquipment ? (
                <div className="space-y-2">
                  <Label htmlFor="used">เบิกไปแล้ว</Label>
                  <Input
                    id="used"
                    type="number"
                    min="0"
                    value={equipmentDraft.used}
                    onChange={(event) => updateDraft("used", event.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={savingEquipment}
                className="w-full sm:w-auto"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleSaveEquipment}
                disabled={savingEquipment}
                className="w-full sm:w-auto"
              >
                {savingEquipment ? "กำลังบันทึก..." : "บันทึกข้อมูลอุปกรณ์"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmActionDialog
          open={Boolean(cancelHistoryTarget)}
          onOpenChange={(open) => !open && setCancelHistoryTarget(null)}
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              ยืนยันการยกเลิกการเบิก
            </span>
          }
          description="รายการนี้จะถูกลบออกจากประวัติ และระบบจะคืนจำนวนที่เบิกกลับเข้าคลังอุปกรณ์"
          cancelLabel="ไม่ดำเนินการ"
          confirmLabel="ยืนยันการยกเลิก"
          loadingLabel="กำลังยกเลิก..."
          variant="destructive"
          loading={cancelingHistory}
          onConfirm={handleCancelHistory}
          onCancel={() => setCancelHistoryTarget(null)}
        >
          {cancelHistoryTarget && (
            <div className="space-y-1 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-950">
              <p className="font-semibold">
                {cancelHistoryTarget.requisitionNumber}
              </p>
              <p>{cancelHistoryTarget.equipmentName}</p>
              <p>
                จำนวน {cancelHistoryTarget.amount} {cancelHistoryTarget.unit}
              </p>
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
          description="รายการนี้จะถูกลบออกจาก Google Sheets และไม่แสดงในหน้าคลังอุปกรณ์หรือฟอร์มเบิกอุปกรณ์"
          confirmLabel="ลบข้อมูลอุปกรณ์"
          loadingLabel="กำลังลบ..."
          variant="destructive"
          loading={deletingEquipment}
          onConfirm={handleDeleteEquipment}
          onCancel={() => setDeleteTarget(null)}
        >
          {deleteTarget && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm">
              <p className="font-semibold text-red-950">{deleteTarget.name}</p>
              <p className="mt-1 text-red-800">รหัส: {deleteTarget.id}</p>
            </div>
          )}
        </ConfirmActionDialog>
      </div>
    </main>
  )
}
