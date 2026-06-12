"use client"

import * as React from "react"
import { Edit, Package, Plus, Search, Trash2 } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MobileActionButton } from "@/components/MobileActionButton"
import { PaginationControls } from "@/components/PaginationControls"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  type StockFilter,
  equipmentMatchesFilter,
  equipmentMatchesSearch,
  formatRemainingQuantity,
  stockFilterLabels,
} from "@/lib/equipment-utils"
import { paginateItems } from "@/lib/pagination"
import type { Equipment } from "@/types"

interface EquipmentTableProps {
  equipment: Equipment[]
  loading: boolean
  onAddClick: () => void
  onEditClick: (item: Equipment) => void
  onDeleteClick: (item: Equipment) => void
}

const INVENTORY_PAGE_SIZE = 10

export function EquipmentTable({
  equipment,
  loading,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: EquipmentTableProps) {
  const [managementSearch, setManagementSearch] = React.useState("")
  const [managementFilter, setManagementFilter] = React.useState<StockFilter>("all")
  const [inventoryPage, setInventoryPage] = React.useState(1)

  React.useEffect(() => {
    setInventoryPage(1)
  }, [managementFilter, managementSearch])

  const filteredEquipment = React.useMemo(() => {
    return equipment.filter(
      (item) =>
        equipmentMatchesFilter(item, managementFilter) &&
        equipmentMatchesSearch(item, managementSearch)
    )
  }, [equipment, managementFilter, managementSearch])

  const { currentPage, items: paginatedEquipment } = paginateItems(
    filteredEquipment,
    inventoryPage,
    INVENTORY_PAGE_SIZE
  )

  return (
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
            onClick={onAddClick}
            className="h-11 w-full gap-2 rounded-xl sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            เพิ่มอุปกรณ์
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
            onValueChange={(value) => setManagementFilter(value as StockFilter)}
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
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-center w-[80px]">รูปภาพ</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">รหัส</TableHead>
                    <TableHead className="whitespace-nowrap">ชื่ออุปกรณ์</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">จำนวนรวม</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">เบิกไปแล้ว</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[120px]">คงเหลือ</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">หน่วยย่อย</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">หน่วยใหญ่</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">อัตราส่วน</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEquipment.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex justify-center">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-md object-cover border border-slate-100"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-slate-600">{item.id}</TableCell>
                      <TableCell className="font-semibold text-slate-800">{item.name}</TableCell>
                      <TableCell className="text-center">{item.totalStock}</TableCell>
                      <TableCell className="text-center text-slate-500">{item.used}</TableCell>
                      <TableCell className="text-center font-bold text-slate-900">
                        {formatRemainingQuantity(item)}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">{item.baseUnit}</TableCell>
                      <TableCell className="text-center text-slate-600">{item.mainUnit || "-"}</TableCell>
                      <TableCell className="text-center text-slate-600">{item.ratio || "-"}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditClick(item)}
                            className="h-8 w-8 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">แก้ไข</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteClick(item)}
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
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
              page={currentPage}
              pageSize={INVENTORY_PAGE_SIZE}
              totalItems={filteredEquipment.length}
              onPageChange={setInventoryPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
