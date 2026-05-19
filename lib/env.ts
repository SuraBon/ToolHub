const REQUIRED_ENV = [
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "SPREADSHEET_ID",
  "HR_PASSWORD",
] as const

const OPTIONAL_ENV = ["BLOB_READ_WRITE_TOKEN", "HR_SESSION_SECRET"] as const

export type EnvCheck = {
  key: string
  configured: boolean
  required: boolean
}

export function getEnvChecks(): EnvCheck[] {
  return [
    ...REQUIRED_ENV.map((key) => ({
      key,
      configured: Boolean(process.env[key]),
      required: true,
    })),
    ...OPTIONAL_ENV.map((key) => ({
      key,
      configured: Boolean(process.env[key]),
      required: false,
    })),
  ]
}

export function getMissingRequiredEnv() {
  return getEnvChecks()
    .filter((item) => item.required && !item.configured)
    .map((item) => item.key)
}

export function requireEnv(key: string) {
  const value = process.env[key]

  if (!value) {
    throw new Error(`ยังไม่ได้ตั้งค่า ${key}`)
  }

  return value
}

export function hasEnv(key: string) {
  return Boolean(process.env[key])
}
