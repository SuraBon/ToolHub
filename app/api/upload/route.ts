import { put } from "@vercel/blob"

import { jsonError, jsonSuccess } from "@/lib/api-response"
import { requireHrSession } from "@/lib/hr-auth"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const unauthorized = requireHrSession()
    if (unauthorized) return unauthorized

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return jsonError("กรุณาเลือกไฟล์รูปภาพ", 400)
    }

    if (!file.type.startsWith("image/")) {
      return jsonError("รองรับเฉพาะไฟล์รูปภาพเท่านั้น", 400)
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return jsonError("รูปภาพต้องมีขนาดไม่เกิน 5MB", 400)
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return jsonError("ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN", 500)
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const safeName = `${Date.now()}-${crypto.randomUUID()}.${extension}`
    const blob = await put(`equipment/${safeName}`, file, {
      access: "public",
    })

    return jsonSuccess({ url: blob.url })
  } catch (error) {
    console.error("Error uploading equipment image:", error)
    return jsonError("ไม่สามารถอัปโหลดรูปภาพได้", 500)
  }
}
