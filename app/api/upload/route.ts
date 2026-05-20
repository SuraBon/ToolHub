import { put } from "@vercel/blob"

import { jsonError, jsonSuccess } from "@/lib/api-response"
import { logAdminEvent } from "@/lib/audit-log"
import { refreshHrSessionCookie, requireHrSession } from "@/lib/hr-auth"
import { generateSafeImageName, validateImageFile } from "@/lib/image-upload"
import { hasEnv } from "@/lib/env"

export async function POST(request: Request) {
  try {
    const unauthorized = await requireHrSession()
    if (unauthorized) return unauthorized

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return jsonError("กรุณาเลือกไฟล์รูปภาพ", 400)
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      return jsonError(validationError, 400)
    }

    if (!hasEnv("BLOB_READ_WRITE_TOKEN")) {
      return jsonError("ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN", 500)
    }

    const safeName = generateSafeImageName(file.name)
    const blob = await put(`equipment/${safeName}`, file, {
      access: "public",
    })
    await logAdminEvent({
      action: "upload_image",
      detail: `อัปโหลดรูปภาพ ${safeName}`,
    })

    return refreshHrSessionCookie(jsonSuccess({ url: blob.url }))
  } catch (error) {
    console.error("Error uploading equipment image:", error)
    return jsonError("ไม่สามารถอัปโหลดรูปภาพได้", 500)
  }
}
