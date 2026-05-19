import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { jsonError } from "@/lib/api-response"

const HR_SESSION_COOKIE = "hr_session"
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

type HrSessionPayload = {
  exp: number
  nonce: string
}

function getSessionSecret() {
  return process.env.HR_SESSION_SECRET || process.env.HR_PASSWORD || ""
}

export function isHrPasswordConfigured() {
  return Boolean(process.env.HR_PASSWORD)
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url")
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(value: string) {
  const secret = getSessionSecret()

  if (!secret) {
    throw new Error("ยังไม่ได้ตั้งค่า HR_PASSWORD")
  }

  return createHmac("sha256", secret).update(value).digest("base64url")
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function createHrSessionToken() {
  const payload: HrSessionPayload = {
    exp: Date.now() + SESSION_TTL_MS,
    nonce: crypto.randomUUID(),
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))

  return `${encodedPayload}.${sign(encodedPayload)}`
}

function verifyHrSessionToken(token: string | undefined) {
  if (!token) return false

  const [encodedPayload, signature, extra] = token.split(".")

  if (!encodedPayload || !signature || extra) return false

  let payload: HrSessionPayload

  try {
    if (!signaturesMatch(sign(encodedPayload), signature)) return false
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as HrSessionPayload
  } catch {
    return false
  }

  return Number.isFinite(payload.exp) && payload.exp > Date.now()
}

export async function hasHrSession() {
  const cookieStore = await cookies()

  return verifyHrSessionToken(cookieStore.get(HR_SESSION_COOKIE)?.value)
}

export async function requireHrSession() {
  if (await hasHrSession()) return null

  return jsonError("กรุณาเข้าสู่ระบบจัดการสต๊อกก่อน", 401)
}

export function setHrSessionCookie(response: NextResponse) {
  response.cookies.set(HR_SESSION_COOKIE, createHrSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  })

  return response
}

export function clearHrSessionCookie(response: NextResponse) {
  response.cookies.set(HR_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}
