import { NextResponse } from "next/server"
import { put } from "@vercel/blob"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "กรุณาเลือกไฟล์รูปภาพ" },
        { status: 400 }
      )
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น" },
        { status: 400 }
      )
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "รูปภาพต้องมีขนาดไม่เกิน 5MB" },
        { status: 400 }
      )
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN" },
        { status: 500 }
      )
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const safeName = `${Date.now()}-${crypto.randomUUID()}.${extension}`
    const blob = await put(`equipment/${safeName}`, file, {
      access: "public",
    })

    return NextResponse.json({
      success: true,
      url: blob.url,
    })
  } catch (error) {
    console.error("Error uploading equipment image:", error)
    return NextResponse.json(
      { error: "ไม่สามารถอัปโหลดรูปภาพได้" },
      { status: 500 }
    )
  }
}
