"use client"

import * as React from "react"
import {
  AlertTriangle,
  Edit,
  FileText,
  Lock,
  Package,
  Plus,
  Shield,
  Trash2,
} from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import type { Equipment } from "@/types"

interface RequisitionHistory {
  requisitionNumber: string
  date: string
  name: string
  department: string
  equipmentName: string
  amount: number
  unit: string
}

type EquipmentDraft = {
  id: string
  image: string
  name: string
  totalStock: string
  used: string
  baseUnit: string
  mainUnit: string
  ratio: string
}

const emptyEquipmentDraft: EquipmentDraft = {
  id: "",
  image: "",
  name: "",
  totalStock: "",
  used: "0",
  baseUnit: "",
  mainUnit: "",
  ratio: "",
}

function toEquipmentDraft(equipment: Equipment | null): EquipmentDraft {
  if (!equipment) return emptyEquipmentDraft

  return {
    id: equipment.id,
    image: equipment.image || "",
    name: equipment.name,
    totalStock: String(equipment.totalStock),
    used: String(equipment.used),
    baseUnit: equipment.baseUnit,
    mainUnit: equipment.mainUnit || "",
    ratio: equipment.ratio ? String(equipment.ratio) : "",
  }
}

export default function HRDashboard() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [equipment, setEquipment] = React.useState<Equipment[]>([])
  const [history, setHistory] = React.useState<RequisitionHistory[]>([])
  const [loading, setLoading] = React.useState(false)
  const [savingEquipment, setSavingEquipment] = React.useState(false)
  const [deletingEquipment, setDeletingEquipment] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"equipment" | "history">(
    "equipment"
  )
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingEquipment, setEditingEquipment] =
    React.useState<Equipment | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Equipment | null>(null)
  const [equipmentDraft, setEquipmentDraft] =
    React.useState<EquipmentDraft>(emptyEquipmentDraft)
  const { toast } = useToast()

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [eqRes, histRes] = await Promise.all([
        fetch("/api/equipment?scope=all"),
        fetch("/api/requisition-history"),
      ])
      const eqData = await eqRes.json()
      const histData = await histRes.json()
      setEquipment(Array.isArray(eqData) ? eqData : [])
      setHistory(Array.isArray(histData) ? histData : [])
    } catch (error) {
      console.error("Error fetching HR data:", error)
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลได้",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/hr-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const result = await response.json()
      if (result.success) {
        setIsAuthenticated(true)
        fetchData()
      } else {
        toast({
          variant: "destructive",
          title: "รหัสผ่านไม่ถูกต้อง",
        })
      }
    } catch (error) {
      console.error("Error authenticating:", error)
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
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

  const handleSaveEquipment = async () => {
    setSavingEquipment(true)
    try {
      const response = await fetch("/api/equipment", {
        method: editingEquipment ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(equipmentDraft),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถบันทึกอุปกรณ์ได้")
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: editingEquipment
          ? "แก้ไขข้อมูลอุปกรณ์แล้ว"
          : "เพิ่มอุปกรณ์ใหม่แล้ว",
      })
      setEditDialogOpen(false)
      setEditingEquipment(null)
      setEquipmentDraft(emptyEquipmentDraft)
      await fetchData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "บันทึกไม่สำเร็จ",
        description:
          error instanceof Error ? error.message : "ไม่สามารถบันทึกอุปกรณ์ได้",
      })
    } finally {
      setSavingEquipment(false)
    }
  }

  const handleDeleteEquipment = async () => {
    if (!deleteTarget) return

    setDeletingEquipment(true)
    try {
      const response = await fetch(
        `/api/equipment?id=${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" }
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "ไม่สามารถลบอุปกรณ์ได้")
      }

      toast({
        title: "ลบอุปกรณ์แล้ว",
        description: deleteTarget.name,
      })
      setDeleteTarget(null)
      await fetchData()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ลบไม่สำเร็จ",
        description:
          error instanceof Error ? error.message : "ไม่สามารถลบอุปกรณ์ได้",
      })
    } finally {
      setDeletingEquipment(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#dbeafe_0,#f8fafc_42%,#eef2ff_100%)] p-4">
        <Toaster />
        <Card className="w-full max-w-md border-white/80 bg-white/85 shadow-2xl shadow-blue-200/60 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-300">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl">HR Dashboard</CardTitle>
            <CardDescription>กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleLogin()}
              className="h-12"
            />
            <Button onClick={handleLogin} className="h-12 w-full text-base">
              เข้าสู่ระบบ
            </Button>
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
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              <Shield className="h-4 w-4" />
              Equipment Requisition System
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              HR Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              จัดการสต๊อกอุปกรณ์และดูประวัติการเบิก
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <Lock className="h-4 w-4" />
              หน้านี้เข้ารหัสด้วยรหัสผ่าน HR ก่อนเพิ่ม แก้ไข หรือลบอุปกรณ์
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsAuthenticated(false)}
            className="gap-2"
          >
            <Lock className="h-4 w-4" />
            ออกจากระบบ
          </Button>
          </div>
        </header>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "equipment" ? "default" : "outline"}
            onClick={() => setActiveTab("equipment")}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            สต๊อกอุปกรณ์
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            ประวัติการเบิก
          </Button>
        </div>

        {activeTab === "equipment" ? (
          <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl">สต๊อกอุปกรณ์</CardTitle>
                  <CardDescription>
                    HR เห็นทุกรายการ รวมถึงรายการที่สต๊อกหมด
                  </CardDescription>
                </div>
                <Button onClick={openAddDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  เพิ่มอุปกรณ์
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-600">
                  กำลังโหลด...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">รูปภาพ</TableHead>
                        <TableHead className="whitespace-nowrap">รหัส</TableHead>
                        <TableHead className="whitespace-nowrap">
                          ชื่ออุปกรณ์
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          สต๊อกรวม
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          ใช้ไป
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          คงเหลือ
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          หน่วยย่อย
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          หน่วยใหญ่
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          อัตราส่วน
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          จัดการ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
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
                          </TableCell>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">
                            {item.totalStock}
                          </TableCell>
                          <TableCell className="text-right">{item.used}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.remaining}
                          </TableCell>
                          <TableCell>{item.baseUnit}</TableCell>
                          <TableCell>{item.mainUnit || "-"}</TableCell>
                          <TableCell className="text-right">
                            {item.ratio || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(item)}
                                className="text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">แก้ไข</span>
                              </Button>
                              <Button
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
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">ประวัติการเบิก</CardTitle>
              <CardDescription>ดูประวัติการเบิกอุปกรณ์ทั้งหมด</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-sm text-slate-600">
                  กำลังโหลด...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">
                          เลขที่ใบเบิก
                        </TableHead>
                        <TableHead className="whitespace-nowrap">วันที่</TableHead>
                        <TableHead className="whitespace-nowrap">
                          ชื่อ-นามสกุล
                        </TableHead>
                        <TableHead className="whitespace-nowrap">แผนก</TableHead>
                        <TableHead className="whitespace-nowrap">
                          อุปกรณ์
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-right">
                          จำนวน
                        </TableHead>
                        <TableHead className="whitespace-nowrap">หน่วย</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item, index) => (
                        <TableRow key={`${item.requisitionNumber}-${index}`}>
                          <TableCell className="font-semibold">
                            {item.requisitionNumber}
                          </TableCell>
                          <TableCell>{item.date}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.department}</TableCell>
                          <TableCell>{item.equipmentName}</TableCell>
                          <TableCell className="text-right">
                            {item.amount}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEquipment ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์"}
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูลอุปกรณ์ ระบบจะคำนวณคงเหลือจากสต๊อกรวมและใช้ไป
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="id">รหัสอุปกรณ์</Label>
                <Input
                  id="id"
                  placeholder="ปล่อยว่างเพื่อสร้างอัตโนมัติ"
                  value={equipmentDraft.id}
                  onChange={(event) => updateDraft("id", event.target.value)}
                  disabled={Boolean(editingEquipment)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">ชื่ออุปกรณ์</Label>
                <Input
                  id="name"
                  value={equipmentDraft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="image">URL รูปภาพ</Label>
                <Input
                  id="image"
                  placeholder="https://example.com/image.jpg"
                  value={equipmentDraft.image}
                  onChange={(event) => updateDraft("image", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalStock">สต๊อกรวม</Label>
                <Input
                  id="totalStock"
                  type="number"
                  min="0"
                  value={equipmentDraft.totalStock}
                  onChange={(event) =>
                    updateDraft("totalStock", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="used">ใช้ไป</Label>
                <Input
                  id="used"
                  type="number"
                  min="0"
                  value={equipmentDraft.used}
                  onChange={(event) => updateDraft("used", event.target.value)}
                />
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
              <div className="space-y-2 sm:col-span-2">
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
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={savingEquipment}
              >
                ยกเลิก
              </Button>
              <Button onClick={handleSaveEquipment} disabled={savingEquipment}>
                {savingEquipment ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                ยืนยันการลบอุปกรณ์
              </DialogTitle>
              <DialogDescription>
                รายการนี้จะถูกลบออกจาก Google Sheets และไม่แสดงใน Dashboard หรือฟอร์มเบิก
              </DialogDescription>
            </DialogHeader>

            {deleteTarget && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm">
                <p className="font-semibold text-red-950">{deleteTarget.name}</p>
                <p className="mt-1 text-red-800">รหัส: {deleteTarget.id}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingEquipment}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteEquipment}
                disabled={deletingEquipment}
              >
                {deletingEquipment ? "กำลังลบ..." : "ลบอุปกรณ์"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
