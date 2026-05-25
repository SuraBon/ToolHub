import { beforeEach, describe, expect, it, vi } from "vitest"

const validPayload = {
  name: "Tester",
  department: "IT",
  requestId: "request-123",
  items: [
    {
      equipmentId: "EQ001",
      amount: 1,
      isMainUnit: false,
    },
  ],
}

async function setupRoute({
  existingRequestHistory = [],
  existingNumberHistory = [],
}: {
  existingRequestHistory?: Array<{ requisitionNumber: string }>
  existingNumberHistory?: Array<{ requisitionNumber: string }>
} = {}) {
  const saveRequisition = vi.fn().mockResolvedValue(undefined)
  const findRequisitionHistoryByRequestId = vi
    .fn()
    .mockResolvedValue(existingRequestHistory)
  const findRequisitionHistoryByNumber = vi
    .fn()
    .mockResolvedValue(existingNumberHistory)

  vi.doMock("@/lib/google-sheets", () => ({
    findRequisitionHistoryByNumber,
    findRequisitionHistoryByRequestId,
    saveRequisition,
  }))

  const route = await import("@/app/api/requisition/route")

  return {
    ...route,
    saveRequisition,
    findRequisitionHistoryByRequestId,
    findRequisitionHistoryByNumber,
  }
}

function createPostRequest(body: unknown) {
  return new Request("http://localhost/api/requisition", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/requisition", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it("saves a requisition with a collision-resistant requisition number", async () => {
    const { POST, saveRequisition } = await setupRoute()

    const response = await POST(createPostRequest(validPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.requisitionNumber).toMatch(/^REQ\d+-[A-F0-9]{10}$/)
    expect(saveRequisition).toHaveBeenCalledWith(
      expect.objectContaining({
        requisition: expect.objectContaining({
          name: validPayload.name,
          department: validPayload.department,
        }),
        requisitionNumber: body.requisitionNumber,
        requestId: validPayload.requestId,
      })
    )
  })

  it("returns the existing requisition for a repeated request id without writing again", async () => {
    const { POST, saveRequisition } = await setupRoute({
      existingRequestHistory: [{ requisitionNumber: "REQ-existing" }],
    })

    const response = await POST(createPostRequest(validPayload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.requisitionNumber).toBe("REQ-existing")
    expect(saveRequisition).not.toHaveBeenCalled()
  })

  it("rejects invalid requisition payloads", async () => {
    const { POST, saveRequisition } = await setupRoute()

    const response = await POST(
      createPostRequest({
        ...validPayload,
        name: "",
      })
    )

    expect(response.status).toBe(400)
    expect(saveRequisition).not.toHaveBeenCalled()
  })
})
