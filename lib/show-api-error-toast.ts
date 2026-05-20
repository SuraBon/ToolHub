import type { useToast } from "@/components/ui/use-toast"

type ToastFunction = ReturnType<typeof useToast>["toast"]

type ShowApiErrorToastOptions = {
  toast: ToastFunction
  title?: string
  fallback: string
  error: unknown
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function showApiErrorToast({
  toast,
  title = "เกิดข้อผิดพลาด",
  fallback,
  error,
}: ShowApiErrorToastOptions) {
  toast({
    variant: "destructive",
    title,
    description: getErrorMessage(error, fallback),
  })
}
