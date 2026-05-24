import { NextResponse } from "next/server"
import { ZodError } from "zod"

import {
  GOOGLE_SHEETS_QUOTA_MESSAGE,
  isGoogleSheetsQuotaError,
} from "@/lib/google-sheets-errors"

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function jsonSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200
) {
  return NextResponse.json({ success: true, ...data }, { status })
}

export function jsonData<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function formatApiErrorMessage(error: unknown, fallback: string) {
  if (isGoogleSheetsQuotaError(error)) {
    return GOOGLE_SHEETS_QUOTA_MESSAGE
  }

  if (error instanceof ZodError) {
    return error.issues[0]?.message || fallback
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function isValidationError(error: unknown) {
  return error instanceof ZodError
}
