const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const SAFE_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"])

export function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return "รองรับเฉพาะไฟล์รูปภาพเท่านั้น"
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "รูปภาพต้องมีขนาดไม่เกิน 5MB"
  }

  return null
}

export function generateSafeImageName(fileName: string) {
  const rawExtension = fileName.split(".").pop()?.toLowerCase() || "jpg"
  const extension = SAFE_IMAGE_EXTENSIONS.has(rawExtension)
    ? rawExtension
    : "jpg"

  return `${Date.now()}-${crypto.randomUUID()}.${extension}`
}
