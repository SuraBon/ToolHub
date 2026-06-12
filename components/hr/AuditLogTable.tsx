"use client"

import * as React from "react"
import {
  AlertTriangle,
  ChevronDown,
  Edit,
  FileText,
  LogOut,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
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

export interface AdminAuditLog {
  rowNumber: number
  timestamp: string
  action: string
  detail: string
  equipmentId: string
  equipmentName: string
}

export interface AdminAuditLogGroup {
  key: string
  latestTimestamp: string
  action: string
  detail: string
  equipmentId: string
  equipmentName: string
  items: AdminAuditLog[]
}

interface AuditLogTableProps {
  auditLogs: AdminAuditLog[]
  loadingLogs: boolean
  onRefresh: () => void
}

const LOG_PAGE_SIZE = 20

function getAuditLogIcon(action: string) {
  if (action.startsWith("add_")) return Plus
  if (action.startsWith("update_")) return Edit
  if (action.startsWith("delete_") || action.startsWith("cancel_")) return Trash2
  if (action === "upload_image") return Upload
  if (action === "hr_login_success") return ShieldCheck
  if (action === "hr_logout") return LogOut
  if (action === "hr_login_failed" || action === "hr_login_rate_limited") {
    return AlertTriangle
  }
  return FileText
}

function auditLogMatchesSearch(item: AdminAuditLog, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [
    item.timestamp,
    item.action,
    item.detail,
    item.equipmentId,
    item.equipmentName,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery)
}

function groupAuditLogs(items: AdminAuditLog[]) {
  const groups = new Map<string, AdminAuditLogGroup>()

  items.forEach((item) => {
    const key = [
      item.action.trim().toLowerCase(),
      item.detail.trim().toLowerCase(),
      item.equipmentId.trim().toLowerCase(),
      item.equipmentName.trim().toLowerCase(),
    ].join("|")
    const existingGroup = groups.get(key)

    if (existingGroup) {
      existingGroup.items.push(item)
      return
    }

    groups.set(key, {
      key,
      latestTimestamp: item.timestamp,
      action: item.action,
      detail: item.detail,
      equipmentId: item.equipmentId,
      equipmentName: item.equipmentName,
      items: [item],
    })
  })

  return Array.from(groups.values())
}

export function AuditLogTable({
  auditLogs,
  loadingLogs,
  onRefresh,
}: AuditLogTableProps) {
  const [logSearch, setLogSearch] = React.useState("")
  const [logPage, setLogPage] = React.useState(1)
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    setLogPage(1)
  }, [logSearch])

  const groupedLogs = React.useMemo(() => {
    return groupAuditLogs(auditLogs)
  }, [auditLogs])

  const filteredGroups = React.useMemo(() => {
    return groupedLogs.filter((group) =>
      group.items.some((item) => auditLogMatchesSearch(item, logSearch))
    )
  }, [groupedLogs, logSearch])

  const { currentPage, items: paginatedGroups } = paginateItems(
    filteredGroups,
    logPage,
    LOG_PAGE_SIZE
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
              <ScrollText className="h-5 w-5 text-blue-600" />
              Log การจัดการ
            </CardTitle>
            <CardDescription>
              ดูประวัติการเข้าสู่ระบบ การเพิ่ม แก้ไข ลบ และยกเลิกรายการ
            </CardDescription>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="ค้นหาเวลา ประเภท รายละเอียด รหัส หรือชื่ออุปกรณ์"
                className="h-11 rounded-xl border-slate-200 bg-white pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              className="h-11 w-full gap-2 rounded-xl sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" />
              รีเฟรช
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingLogs ? (
          <div className="py-8 text-center text-sm text-slate-600">
            กำลังโหลด Log...
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
            ยังไม่มี Log การจัดการ
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
            ไม่พบ Log ที่ตรงกับคำค้น
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/70">
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-center w-[180px]">
                      เวลา
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[120px]">
                      ชุด
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[150px]">
                      ประเภท
                    </TableHead>
                    <TableHead className="whitespace-nowrap">รายละเอียด</TableHead>
                    <TableHead className="whitespace-nowrap text-center w-[100px]">
                      รหัส
                    </TableHead>
                    <TableHead className="whitespace-nowrap w-[180px]">อุปกรณ์</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.key)
                    const LogIcon = getAuditLogIcon(group.action)

                    return (
                      <React.Fragment key={group.key}>
                        <TableRow className="hover:bg-slate-50/50">
                          <TableCell className="whitespace-nowrap text-center text-sm">
                            {group.latestTimestamp}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.key)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-default disabled:hover:bg-blue-50"
                              disabled={group.items.length <= 1}
                              aria-expanded={isExpanded}
                            >
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              {group.items.length} รายการ
                            </button>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              <LogIcon className="h-3.5 w-3.5 text-slate-500" />
                              {group.action || "-"}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-64">{group.detail || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap text-center">
                            {group.equipmentId || "-"}
                          </TableCell>
                          <TableCell className="min-w-48">{group.equipmentName || "-"}</TableCell>
                        </TableRow>
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <TableRow className="bg-slate-50/30 border-none">
                              <TableCell colSpan={6} className="p-0">
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
                                          key={item.rowNumber}
                                          className="bg-slate-50/50 hover:bg-slate-100/60"
                                        >
                                          <TableCell className="whitespace-nowrap text-center text-sm w-[180px]">
                                            {item.timestamp}
                                          </TableCell>
                                          <TableCell className="text-center text-xs text-slate-500 w-[120px]">
                                            แถว {item.rowNumber}
                                          </TableCell>
                                          <TableCell className="whitespace-nowrap text-center w-[150px] text-xs text-slate-500">
                                            {item.action || "-"}
                                          </TableCell>
                                          <TableCell className="min-w-64 text-slate-600">
                                            {item.detail || "-"}
                                          </TableCell>
                                          <TableCell className="whitespace-nowrap text-center w-[100px] text-xs text-slate-500">
                                            {item.equipmentId || "-"}
                                          </TableCell>
                                          <TableCell className="min-w-48 text-slate-600">
                                            {item.equipmentName || "-"}
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
              pageSize={LOG_PAGE_SIZE}
              totalItems={filteredGroups.length}
              onPageChange={setLogPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
