import { jsonError, jsonSuccess } from "@/lib/api-response"
import { logAdminEvent } from "@/lib/audit-log"
import { requireEnv } from "@/lib/env"
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit"
import {
  clearHrSessionCookie,
  hasHrSession,
  isHrPasswordConfigured,
  refreshHrSessionCookie,
  setHrSessionCookie,
} from "@/lib/hr-auth"

const LOGIN_LIMIT = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()

  return `hr-login:${forwardedFor || realIp || "unknown"}`
}

export async function GET() {
  const authenticated = await hasHrSession()
  const response = jsonSuccess({ authenticated })

  return authenticated ? refreshHrSessionCookie(response) : response
}

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request)
    const limit = checkRateLimit(clientKey, LOGIN_LIMIT, LOGIN_WINDOW_MS)

    if (!limit.allowed) {
      await logAdminEvent({
        action: "hr_login_rate_limited",
        detail: `ลองเข้าสู่ระบบถี่เกินไป รอ ${limit.retryAfterSeconds} วินาที`,
      })
      return jsonError(
        `ลองรหัสผ่านถี่เกินไป กรุณารอ ${limit.retryAfterSeconds} วินาที`,
        429
      )
    }

    const body = await request.json()
    const { password } = body

    if (!isHrPasswordConfigured()) {
      return jsonError("ยังไม่ได้ตั้งค่า HR_PASSWORD", 500)
    }

    const correctPassword = requireEnv("HR_PASSWORD")

    if (password === correctPassword) {
      clearRateLimit(clientKey)
      await logAdminEvent({
        action: "hr_login_success",
        detail: "เข้าสู่ระบบจัดการสต๊อกสำเร็จ",
      })
      return setHrSessionCookie(jsonSuccess({ authenticated: true }))
    }

    await logAdminEvent({
      action: "hr_login_failed",
      detail: "เข้าสู่ระบบจัดการสต๊อกไม่สำเร็จ",
    })
    return jsonError("รหัสผ่านไม่ถูกต้อง", 401)
  } catch (error) {
    console.error("Error authenticating:", error)
    return jsonError("ไม่สามารถเข้าสู่ระบบได้", 500)
  }
}

export async function DELETE() {
  await logAdminEvent({
    action: "hr_logout",
    detail: "ออกจากระบบจัดการสต๊อก",
  })

  return clearHrSessionCookie(
    jsonSuccess({ authenticated: false })
  )
}
