"use client"

import * as React from "react"
import { ChevronDown, Edit, FileText, Search, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

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
import { PaginationControls } from "@/components/PaginationControls"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { paginateItems } from "@/lib/pagination"
import type { Equipment } from "@/types"

export interface RequisitionHistory {
  rowNumber: number
  requisitionNumber: string
  date: string
  name: string
  department: string
  equipmentId: string
  equipmentName: string
  amount: number
  unit: string
}

export interface RequisitionHistoryGroup {
  key: string
  requisitionNumber: string
  date: string
  name: string
  department: string
  items: RequisitionHistory[]
}

interface HistoryTableProps {
  history: RequisitionHistory[]
  equipment: Equipment[]
  loading: boolean
  onEditClick: (item: RequisitionHistory) => void
  onCancelClick: (item: RequisitionHistory) => void
  onCancelGroupClick: (group: RequisitionHistoryGroup) => void
}

const HISTORY_PAGE_SIZE = 12

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

function groupRequisitionHistory(items: RequisitionHistory[]) {
  const groups = new Map<string, RequisitionHistoryGroup>()

  items.forEach((item) => {
    const key = [
      item.requisitionNumber,
      item.date,
      item.name,
      item.department,
    ].join("|")
    const existingGroup = groups.get(key)

    if (existingGroup) {
      existingGroup.items.push(item)
      return
    }

    groups.set(key, {
      key,
      requisitionNumber: item.requisitionNumber,
      date: item.date,
      name: item.name,
      department: item.department,
      items: [item],
    })
  })

  return Array.from(groups.values())
}

export function HistoryTable({
  history,
  loading,
  onEditClick,
  onCancelClick,
  onCancelGroupClick,
}: HistoryTableProps) {
  const [historySearch, setHistorySearch] = React.useState("")
  const [historyPage, setHistoryPage] = React.useState(1)
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    setHistoryPage(1)
  }, [historySearch])

  const groupedHistory = React.useMemo(() => {
    return groupRequisitionHistory(history)
  }, [history])

  const filteredGroups = React.useMemo(() => {
    return groupedHistory.filter((group) =>
      group.items.some((item) => historyMatchesSearch(item, historySearch))
    )
  }, [groupedHistory, historySearch])

  const { currentPage, items: paginatedGroups } = paginateItems(
    filteredGroups,
    historyPage,
    HISTORY_PAGE_SIZE
  )

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  return (
    <Card className="border-white/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              ประวัติการเบิกอุปกรณ์
            </CardTitle>
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
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
            ไม่พบประวัติการเบิกอุปกรณ์ที่ตรงกับคำค้น
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-center w-[150px]">
                      เลขที่ใบเบิก
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[120px]">วันที่</TableHead>
                    <TableHead className="whitespace-nowrap">ชื่อ-นามสกุล</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[120px]">แผนก</TableHead>
                    <TableHead className="whitespace-nowrap">อุปกรณ์</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[80px]">จำนวน</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[80px]">หน่วย</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[80px]">แก้ไข</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[80px]">ยกเลิก</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.key)
                    const firstItem = group.items[0]

                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="hover:bg-slate-50/50">
                          <TableCell className="text-center font-semibold text-slate-700">
                            {group.requisitionNumber}
                          </TableCell>
                          <TableCell className="text-center text-slate-600">{group.date}</TableCell>
                          <TableCell className="font-semibold text-slate-800">{group.name}</TableCell>
                          <TableCell className="text-center text-slate-600">{group.department}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.key)}
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium text-slate-800">
                                  {firstItem
                                    ? `${firstItem.equipmentName} ${firstItem.amount} ${firstItem.unit}`
                                    : "-"}
                                </span>
                                <span className="text-xs text-slate-500">
                                  ทั้งหมด {group.items.length} รายการ
                                </span>
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="text-center text-slate-400">-</TableCell>
                          <TableCell className="text-center text-slate-400">-</TableCell>
                          <TableCell className="text-center text-slate-400">-</TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onCancelGroupClick(group)}
                              aria-label="ยกเลิกคำขอเบิกทั้งหมด"
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <TableRow className="bg-slate-50/30 border-none">
                              <TableCell colSpan={9} className="p-0">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="overflow-hidden border-t border-b border-slate-100"
                                >
                                  <Table className="w-full">
                                    <TableBody>
                                      {group.items.map((item) => (
                                        <TableRow
                                          key={`${item.requisitionNumber}-${item.rowNumber}`}
                                          className="bg-slate-50/50 hover:bg-slate-100/60"
                                        >
                                          <TableCell colSpan={4} className="p-0" />
                                          {/* Use same column structure internally */}
                                          <TableCell className="pl-10 text-slate-600">{item.equipmentName}</TableCell>
                                          <TableCell className="text-center font-semibold text-slate-800 w-[80px]">
                                            {item.amount}
                                          </TableCell>
                                          <TableCell className="text-center text-slate-600 w-[80px]">{item.unit}</TableCell>
                                          <TableCell className="text-center w-[80px]">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => onEditClick(item)}
                                              aria-label="แก้ไขประวัติการเบิกอุปกรณ์"
                                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                          <TableCell className="text-center w-[80px]">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => onCancelClick(item)}
                                              aria-label="ยกเลิกรายการเบิก"
                                              className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </motion.div>
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <PaginationControls
              page={currentPage}
              pageSize={HISTORY_PAGE_SIZE}
              totalItems={filteredGroups.length}
              onPageChange={setHistoryPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
