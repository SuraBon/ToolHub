"use client"

import * as React from "react"
import { useState } from "react"
import { Lock, Unlock, Package, FileText, Plus, Edit, Trash2 } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Equipment } from "@/types"

interface RequisitionHistory {
  requisitionNumber: string
  date: string
  name: string
  department: string
  equipmentName: string
  amount: number
  unit: string
}

export default function HRDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [history, setHistory] = useState<RequisitionHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"equipment" | "history">("equipment")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
  const { toast } = useToast()

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
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
      })
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [eqRes, histRes] = await Promise.all([
        fetch("/api/equipment"),
        fetch("/api/requisition-history"),
      ])
      const eqData = await eqRes.json()
      const histData = await histRes.json()
      setEquipment(eqData)
      setHistory(histData)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลได้",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveEquipment = async () => {
    // TODO: Implement save equipment logic
    toast({
      title: "บันทึกสำเร็จ",
    })
    setEditDialogOpen(false)
    fetchData()
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <Toaster />
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-4 text-purple-600" />
            <CardTitle>HR Dashboard</CardTitle>
            <CardDescription>
              กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              เข้าสู่ระบบ
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Toaster />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                HR Dashboard
              </h1>
              <p className="text-gray-600">
                จัดการอุปกรณ์และประวัติการเบิก
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsAuthenticated(false)}
            >
              <Lock className="h-4 w-4 mr-2" />
              ออกจากระบบ
            </Button>
          </div>

          <div className="flex gap-4 mb-6">
            <Button
              variant={activeTab === "equipment" ? "default" : "outline"}
              onClick={() => setActiveTab("equipment")}
            >
              <Package className="h-4 w-4 mr-2" />
              สต๊อกอุปกรณ์
            </Button>
            <Button
              variant={activeTab === "history" ? "default" : "outline"}
              onClick={() => setActiveTab("history")}
            >
              <FileText className="h-4 w-4 mr-2" />
              ประวัติการเบิก
            </Button>
          </div>

          {activeTab === "equipment" && (
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>สต๊อกอุปกรณ์</CardTitle>
                    <CardDescription>
                      จัดการข้อมูลอุปกรณ์และสต๊อก
                    </CardDescription>
                  </div>
                  <Button onClick={() => setEditingEquipment({} as Equipment)}>
                    <Plus className="h-4 w-4 mr-2" />
                    เพิ่มอุปกรณ์
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">กำลังโหลด...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>รูปภาพ</TableHead>
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่ออุปกรณ์</TableHead>
                        <TableHead>สต๊อกรวม</TableHead>
                        <TableHead>ใช้ไป</TableHead>
                        <TableHead>คงเหลือ</TableHead>
                        <TableHead>หน่วยย่อย</TableHead>
                        <TableHead>หน่วยใหญ่</TableHead>
                        <TableHead>อัตราส่วน</TableHead>
                        <TableHead>จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {equipment.map((eq) => (
                        <TableRow key={eq.id}>
                          <TableCell>
                            {eq.image ? (
                              <Image
                                src={eq.image}
                                alt={eq.name}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{eq.id}</TableCell>
                          <TableCell>{eq.name}</TableCell>
                          <TableCell>{eq.totalStock}</TableCell>
                          <TableCell>{eq.used}</TableCell>
                          <TableCell className="font-semibold">{eq.remaining}</TableCell>
                          <TableCell>{eq.baseUnit}</TableCell>
                          <TableCell>{eq.mainUnit || "-"}</TableCell>
                          <TableCell>{eq.ratio || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingEquipment(eq)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "history" && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>ประวัติการเบิก</CardTitle>
                <CardDescription>
                  ดูประวัติการเบิกอุปกรณ์ทั้งหมด
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">กำลังโหลด...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>เลขที่ใบเบิก</TableHead>
                        <TableHead>วันที่</TableHead>
                        <TableHead>ชื่อ-นามสกุล</TableHead>
                        <TableHead>แผนก</TableHead>
                        <TableHead>อุปกรณ์</TableHead>
                        <TableHead>จำนวน</TableHead>
                        <TableHead>หน่วย</TableHead>
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
                          <TableCell>{item.amount}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingEquipment?.id ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์"}
                </DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลอุปกรณ์
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="image">URL รูปภาพ</Label>
                  <Input
                    id="image"
                    placeholder="https://example.com/image.jpg"
                    defaultValue={editingEquipment?.image || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">ชื่ออุปกรณ์</Label>
                  <Input
                    id="name"
                    defaultValue={editingEquipment?.name || ""}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseUnit">หน่วยย่อย</Label>
                    <Input
                      id="baseUnit"
                      defaultValue={editingEquipment?.baseUnit || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mainUnit">หน่วยใหญ่</Label>
                    <Input
                      id="mainUnit"
                      defaultValue={editingEquipment?.mainUnit || ""}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ratio">อัตราส่วน (หน่วยย่อยต่อหน่วยใหญ่)</Label>
                  <Input
                    id="ratio"
                    type="number"
                    defaultValue={editingEquipment?.ratio || ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSaveEquipment}>
                  บันทึก
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  )
}
