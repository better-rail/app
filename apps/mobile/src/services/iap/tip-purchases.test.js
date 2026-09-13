import { expect, mock, test } from "bun:test"
import { createTipPurchaseProcessor, createTipPurchaseQueue } from "./tip-purchases"

const purchase = {
  id: "transaction-1",
  productId: "better_rail_tip_1",
  store: "apple",
  purchaseState: "purchased",
}
const product = { id: purchase.productId, price: 10, currency: "ILS" }

function setup(recorded = new Set()) {
  const events = []
  let total = 0
  const deps = {
    hasRecordedTip: (id) => recorded.has(id),
    recordTip: mock((id, amount) => {
      recorded.add(id)
      total += amount
      events.push("record")
    }),
    persist: mock(async () => {
      events.push("persist")
    }),
    fetchProduct: mock(async () => product),
    finish: mock(async () => {
      events.push("finish")
    }),
    track: mock(() => {
      events.push("track")
    }),
    onTrackingError: mock(() => {}),
  }
  return { deps, recorded, events, total: () => total, process: createTipPurchaseProcessor(deps) }
}

test("live events racing recovery record, track, and finish a tip only once", async () => {
  const s = setup()
  await Promise.all([s.process(purchase), s.process(purchase)])
  expect(await s.process(purchase)).toBe(false)

  expect(s.total()).toBe(10)
  expect(s.deps.fetchProduct).toHaveBeenCalledTimes(1)
  expect(s.events).toEqual(["record", "persist", "track", "finish"])
})

test("the same consumable can be tipped again with a new transaction ID", async () => {
  const s = setup()
  await s.process(purchase)
  await s.process({ ...purchase, id: "transaction-2" })
  expect(s.total()).toBe(20)
  expect(s.deps.track).toHaveBeenCalledTimes(2)
  expect(s.deps.finish).toHaveBeenCalledTimes(2)
})

test("pending, unrelated, and non-Apple purchases are never counted or finished", async () => {
  const s = setup()
  for (const update of [{ purchaseState: "pending" }, { productId: "a-subscription" }, { store: "google" }, { id: "" }]) {
    expect(await s.process({ ...purchase, ...update })).toBe(false)
  }
  expect(s.deps.recordTip).not.toHaveBeenCalled()
  expect(s.deps.finish).not.toHaveBeenCalled()
})

test("a missing product price leaves the purchase recoverable", async () => {
  const s = setup()
  s.deps.fetchProduct.mockResolvedValueOnce(undefined)
  await expect(s.process(purchase)).rejects.toThrow("Missing price")
  expect(s.deps.finish).not.toHaveBeenCalled()
  expect(s.total()).toBe(0)

  await s.process(purchase)
  expect(s.total()).toBe(10)
  expect(s.deps.finish).toHaveBeenCalledTimes(1)
})

test("failed persistence prevents finishing, and a retry does not double the total", async () => {
  const s = setup()
  s.deps.persist.mockRejectedValueOnce(new Error("disk unavailable"))
  await expect(s.process(purchase)).rejects.toThrow("disk unavailable")
  expect(s.deps.finish).not.toHaveBeenCalled()
  expect(s.deps.track).not.toHaveBeenCalled()

  await s.process(purchase)
  expect(s.total()).toBe(10)
  expect(s.deps.persist).toHaveBeenCalledTimes(2)
  expect(s.deps.finish).toHaveBeenCalledTimes(1)
})

test("failed finishing can be retried without counting or tracking the purchase again", async () => {
  const s = setup()
  s.deps.finish.mockRejectedValueOnce(new Error("StoreKit disconnected"))
  await expect(s.process(purchase)).rejects.toThrow("StoreKit disconnected")
  await s.process(purchase)

  expect(s.total()).toBe(10)
  expect(s.deps.track).toHaveBeenCalledTimes(1)
  expect(s.deps.finish).toHaveBeenCalledTimes(2)
})

test("relaunch recovers an already recorded tip without needing a product lookup", async () => {
  const s = setup(new Set([purchase.id]))
  expect(await s.process(purchase)).toBe(false)
  expect(s.deps.fetchProduct).not.toHaveBeenCalled()
  expect(s.deps.recordTip).not.toHaveBeenCalled()
  expect(s.deps.track).not.toHaveBeenCalled()
  expect(s.deps.finish).toHaveBeenCalledTimes(1)
})

test("analytics failure does not prevent finishing a paid tip", async () => {
  const s = setup()
  s.deps.track.mockImplementationOnce(() => {
    throw new Error("analytics unavailable")
  })
  await s.process(purchase)
  expect(s.total()).toBe(10)
  expect(s.deps.onTrackingError).toHaveBeenCalledTimes(1)
  expect(s.deps.finish).toHaveBeenCalledTimes(1)
})

function setupQueue(s) {
  const onPaid = mock(() => {})
  const onPendingChange = mock(() => {})
  const onProcessingError = mock(() => {})
  const queue = createTipPurchaseQueue({
    process: s.process,
    hasRecordedTip: s.deps.hasRecordedTip,
    onPaid,
    onPendingChange,
    onProcessingError,
  })
  return { queue, onPaid, onPendingChange, onProcessingError }
}

test("confirms payment immediately, before processing finishes, and blocks another tip", async () => {
  const s = setup()
  let finish
  s.deps.finish.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const q = setupQueue(s)
  const processing = q.queue.handlePurchase(purchase)

  expect(q.onPaid).toHaveBeenCalledTimes(1)
  expect(q.queue.hasPending).toBe(true)
  expect(q.onPendingChange).toHaveBeenLastCalledWith(true)
  // Allow the product lookup and persistence to complete, leaving only StoreKit finishing pending.
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(s.deps.finish).toHaveBeenCalledTimes(1)
  expect(q.queue.hasPending).toBe(true)
  finish()
  await processing

  expect(q.queue.hasPending).toBe(false)
  expect(q.onPendingChange).toHaveBeenLastCalledWith(false)
})

for (const operation of ["fetchProduct", "persist", "finish"]) {
  test(`a post-payment ${operation} failure preserves success and stays blocked until retry succeeds`, async () => {
    const s = setup()
    const error = new Error(`${operation} unavailable`)
    s.deps[operation].mockRejectedValueOnce(error)
    const q = setupQueue(s)

    await q.queue.handlePurchase(purchase)
    expect(q.onPaid).toHaveBeenCalledTimes(1)
    expect(q.onProcessingError).toHaveBeenCalledWith(error)
    expect(q.queue.hasPending).toBe(true)
    expect(q.onPendingChange).toHaveBeenLastCalledWith(true)

    await q.queue.retry()
    expect(q.queue.hasPending).toBe(false)
    expect(q.onPendingChange).toHaveBeenLastCalledWith(false)
    expect(q.onPaid).toHaveBeenCalledTimes(1)
    expect(s.total()).toBe(10)
  })
}

test("duplicate callbacks and recovery retries do not show another thank-you", async () => {
  const s = setup()
  const q = setupQueue(s)
  await Promise.all([q.queue.handlePurchase(purchase), q.queue.handlePurchase(purchase), q.queue.retry()])
  await q.queue.handlePurchase(purchase)
  expect(q.onPaid).toHaveBeenCalledTimes(1)
  expect(s.deps.finish).toHaveBeenCalledTimes(1)
  expect(q.queue.hasPending).toBe(false)
})

test("recovered recorded transactions stay blocked until finished without confirming a newer tip", async () => {
  const s = setup(new Set([purchase.id]))
  s.deps.finish.mockRejectedValueOnce(new Error("StoreKit disconnected"))
  const q = setupQueue(s)
  await q.queue.handlePurchase(purchase)
  expect(q.queue.hasPending).toBe(true)
  expect(q.onPaid).not.toHaveBeenCalled()
  await q.queue.retry()
  expect(q.queue.hasPending).toBe(false)
  expect(q.onPaid).not.toHaveBeenCalled()
})

test("finishing one transaction cannot unlock tipping while another paid transaction needs recovery", async () => {
  const s = setup()
  s.deps.finish.mockRejectedValueOnce(new Error("StoreKit disconnected"))
  const q = setupQueue(s)
  await q.queue.handlePurchase(purchase)
  await q.queue.handlePurchase({ ...purchase, id: "transaction-2" })
  expect(q.queue.hasPending).toBe(true)
  expect(q.onPendingChange).toHaveBeenLastCalledWith(true)
  await q.queue.retry()
  expect(q.queue.hasPending).toBe(false)
})

test("pending and unrelated purchases do not display a thank-you or enter paid recovery", async () => {
  const q = setupQueue(setup())
  await q.queue.handlePurchase({ ...purchase, purchaseState: "pending" })
  await q.queue.handlePurchase({ ...purchase, productId: "a-subscription" })
  expect(q.queue.hasPending).toBe(false)
  expect(q.onPaid).not.toHaveBeenCalled()
  expect(q.onProcessingError).not.toHaveBeenCalled()
})
