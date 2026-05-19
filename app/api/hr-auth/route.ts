import { NextResponse } from "next/server"

import { jsonError, jsonSuccess } from "@/lib/api-response"
import {
  clearHrSessionCookie,
  hasHrSession,
  isHrPasswordConfigured,
  setHrSessionCookie,
} from "@/lib/hr-auth"

export async function GET() {
  return jsonSuccess({ authenticated: hasHrSession() })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password } = body

    const correctPassword = process.env.HR_PASSWORD

    if (!isHrPasswordConfigured() || !correctPassword) {
      return jsonError("ยังไม่ได้ตั้งค่า HR_PASSWORD", 500)
    }

    if (password === correctPassword) {
      return setHrSessionCookie(jsonSuccess({ authenticated: true }))
    }

    return jsonError("รหัสผ่านไม่ถูกต้อง", 401)
  } catch (error) {
    console.error("Error authenticating:", error)
    return jsonError("ไม่สามารถเข้าสู่ระบบได้", 500)
  }
}

export async function DELETE() {
  return clearHrSessionCookie(
    NextResponse.json({ success: true, authenticated: false })
  )
}
