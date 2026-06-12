"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Package, Upload } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
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
import { QuantityStepper } from "@/components/QuantityStepper"
import { useToast } from "@/components/ui/use-toast"
import { apiPost, apiDelete } from "@/lib/client-api"
import { showApiErrorToast } from "@/lib/show-api-error-toast"
import type { Equipment } from "@/types"

const equipmentSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่ออุปกรณ์"),
  image: z.string().optional(),
  baseUnit: z.string().min(1, "กรุณากรอกหน่วยย่อย"),
  mainUnit: z.string().optional(),
  ratio: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true
      const num = Number(val)
      return !isNaN(num) && num >= 1
    }, "อัตราส่วนต้องเป็นตัวเลขตั้งแต่ 1 ขึ้นไป"),
  stockMainUnit: z.string().optional(),
  stockBaseUnit: z
    .string()
    .refine((val) => {
      const num = Number(val)
      return !isNaN(num) && num >= 0
    }, "จำนวนหน่วยย่อยต้องไม่ต่ำกว่า 0")
    .default("0"),
  used: z.string().optional(),
})

type EquipmentFormValues = z.infer<typeof equipmentSchema>

interface ImageEditorState {
  file: File
  previewUrl: string
  zoom: number
  offsetX: number
  offsetY: number
}

interface EquipmentCrudDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingEquipment: Equipment | null
  onSave: (payload: any) => Promise<void>
  saving: boolean
  handleAuthenticatedError: (error: unknown) => boolean
}

type UploadResponse = {
  success: boolean
  url: string
}

export function EquipmentCrudDialog({
  open,
  onOpenChange,
  editingEquipment,
  onSave,
  saving,
  handleAuthenticatedError,
}: EquipmentCrudDialogProps) {
  const { toast } = useToast()
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const [imageEditor, setImageEditor] = React.useState<ImageEditorState | null>(null)
  const uploadedImageUrlsRef = React.useRef<Set<string>>(new Set())

  const toFormValues = (eq: Equipment | null): EquipmentFormValues => {
    if (!eq) {
      return {
        name: "",
        image: "",
        baseUnit: "",
        mainUnit: "",
        ratio: "",
        stockMainUnit: "",
        stockBaseUnit: "0",
        used: "0",
      }
    }
    const ratio = eq.ratio && eq.ratio > 0 ? eq.ratio : 0
    const hasMainUnit = Boolean(eq.mainUnit && ratio)
    const stockMainUnit = hasMainUnit
      ? String(Math.floor(eq.totalStock / ratio))
      : ""
    const stockBaseUnit = hasMainUnit
      ? String(eq.totalStock % ratio)
      : String(eq.totalStock)

    return {
      name: eq.name,
      image: eq.image || "",
      baseUnit: eq.baseUnit,
      mainUnit: eq.mainUnit || "",
      ratio: eq.ratio ? String(eq.ratio) : "",
      stockMainUnit,
      stockBaseUnit,
      used: String(eq.used),
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: toFormValues(editingEquipment),
  })

  React.useEffect(() => {
    if (open) {
      reset(toFormValues(editingEquipment))
      setImageEditor(null)
      uploadedImageUrlsRef.current.clear()
    }
  }, [open, editingEquipment, reset])

  const name = watch("name")
  const image = watch("image")
  const baseUnit = watch("baseUnit")
  const mainUnit = watch("mainUnit")
  const ratioStr = watch("ratio")
  const stockMainUnitStr = watch("stockMainUnit")
  const stockBaseUnitStr = watch("stockBaseUnit")
  const usedStr = watch("used")

  const parsedRatio = Number(ratioStr) || 0
  const hasMainStockUnit = Boolean(mainUnit?.trim() && parsedRatio > 0)
  const computedTotalStock =
    (Number(stockBaseUnitStr) || 0) +
    (hasMainStockUnit ? (Number(stockMainUnitStr) || 0) * parsedRatio : 0)

  const cleanupUploadedImages = async (keepUrl = "") => {
    const urlsToDelete = Array.from(uploadedImageUrlsRef.current).filter(
      (url) => url !== keepUrl
    )
    urlsToDelete.forEach((url) => uploadedImageUrlsRef.current.delete(url))
    await Promise.all(
      urlsToDelete.map(async (url) => {
        try {
          await apiDelete(`/api/upload?url=${encodeURIComponent(url)}`)
        } catch (error) {
          if (!handleAuthenticatedError(error)) {
            console.error("Error cleaning up draft image:", error)
          }
        }
      })
    )
  }

  const handleClose = async () => {
    onOpenChange(false)
    await cleanupUploadedImages(editingEquipment?.image || "")
  }

  const resetImageEditor = React.useCallback(() => {
    setImageEditor((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl)
      }
      return null
    })
  }, [])

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
      const img = new window.Image()
      img.onload = () => {
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

        const coverScale = Math.max(size / img.width, size / img.height)
        const scale = coverScale * editor.zoom
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        const maxOffsetX = Math.max(0, (drawWidth - size) / 2)
        const maxOffsetY = Math.max(0, (drawHeight - size) / 2)
        const drawX =
          (size - drawWidth) / 2 + (editor.offsetX / 100) * maxOffsetX
        const drawY =
          (size - drawHeight) / 2 + (editor.offsetY / 100) * maxOffsetY

        context.drawImage(img, drawX, drawY, drawWidth, drawHeight)
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
      img.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"))
      img.src = editor.previewUrl
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

      setValue("image", result.url)
      uploadedImageUrlsRef.current.add(result.url)
      if (image) {
        void cleanupUploadedImages(result.url)
      }
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

  const onSubmit = async (values: EquipmentFormValues) => {
    const totalStock = String(computedTotalStock)
    const payload = {
      id: editingEquipment?.id || "",
      name: values.name,
      image: values.image || "",
      baseUnit: values.baseUnit,
      mainUnit: values.mainUnit || "",
      ratio: values.ratio || "",
      totalStock,
      used: editingEquipment ? values.used || "0" : "0",
    }
    await onSave(payload)
    uploadedImageUrlsRef.current.delete(values.image || "")
    void cleanupUploadedImages(values.image || "")
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {editingEquipment ? "แก้ไขข้อมูลอุปกรณ์" : "เพิ่มรายการอุปกรณ์"}
          </DialogTitle>
          <DialogDescription>
            กรอกข้อมูลอุปกรณ์ ระบบจะคำนวณจำนวนรวมและยอดคงเหลือให้อัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid min-w-0 gap-4 py-2 sm:grid-cols-2">
            {editingEquipment && (
              <div className="space-y-2">
                <Label>รหัสอุปกรณ์</Label>
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  {editingEquipment.id}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">ชื่ออุปกรณ์</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-xs font-semibold text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="min-w-0 space-y-3 sm:col-span-2">
              <Label htmlFor="imageUpload">รูปภาพอุปกรณ์</Label>
              <div className="grid min-w-0 gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                <Label
                  htmlFor="imageUpload"
                  className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt={name || "รูปอุปกรณ์"}
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
                                updateImageEditor("zoom", Number(event.target.value))
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
                                updateImageEditor("offsetX", Number(event.target.value))
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
                                updateImageEditor("offsetY", Number(event.target.value))
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
                          {uploadingImage ? "กำลังอัปโหลด..." : "อัปโหลดรูปที่ปรับแล้ว"}
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
                    {...register("image")}
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
              <Input id="baseUnit" {...register("baseUnit")} />
              {errors.baseUnit && (
                <p className="text-xs font-semibold text-red-600">
                  {errors.baseUnit.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mainUnit">หน่วยใหญ่</Label>
              <Input id="mainUnit" {...register("mainUnit")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratio">อัตราส่วน (จำนวนหน่วยย่อยต่อ 1 หน่วยใหญ่)</Label>
              <Input id="ratio" type="number" min="1" {...register("ratio")} />
              {errors.ratio && (
                <p className="text-xs font-semibold text-red-600">
                  {errors.ratio.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockMainUnit">
                จำนวนหน่วยใหญ่
                {mainUnit ? ` (${mainUnit})` : ""}
              </Label>
              <QuantityStepper
                id="stockMainUnit"
                min={0}
                value={stockMainUnitStr || "0"}
                onValueChange={(val) => setValue("stockMainUnit", val)}
                disabled={!hasMainStockUnit}
                className="max-w-full w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockBaseUnit">
                จำนวนหน่วยย่อย
                {baseUnit ? ` (${baseUnit})` : ""}
              </Label>
              <QuantityStepper
                id="stockBaseUnit"
                min={0}
                value={stockBaseUnitStr || "0"}
                onValueChange={(val) => setValue("stockBaseUnit", val)}
                className="max-w-full w-full"
              />
              {errors.stockBaseUnit && (
                <p className="text-xs font-semibold text-red-600">
                  {errors.stockBaseUnit.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalStock">จำนวนรวม (หน่วยย่อย)</Label>
              <Input
                id="totalStock"
                type="number"
                value={computedTotalStock}
                readOnly
                className="bg-slate-50 font-semibold"
              />
            </div>
            {editingEquipment && (
              <div className="space-y-2">
                <Label htmlFor="used">เบิกไปแล้ว</Label>
                <QuantityStepper
                  id="used"
                  min={0}
                  value={usedStr || "0"}
                  onValueChange={(val) => setValue("used", val)}
                  className="max-w-full w-full"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลอุปกรณ์"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
