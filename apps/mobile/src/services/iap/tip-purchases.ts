import type { Product, Purchase } from "expo-iap"

export const TIP_PRODUCT_IDS = ["better_rail_tip_1", "better_rail_tip_2", "better_rail_tip_3", "better_rail_tip_4"]

function isPaidTip(purchase: Purchase) {
  return (
    purchase.store === "apple" &&
    purchase.purchaseState === "purchased" &&
    Boolean(purchase.id) &&
    TIP_PRODUCT_IDS.includes(purchase.productId)
  )
}

interface TipPurchaseDependencies {
  hasRecordedTip: (transactionId: string) => boolean
  recordTip: (transactionId: string, amount: number) => void
  persist: () => Promise<void>
  fetchProduct: (productId: string) => Promise<Product | undefined>
  finish: (purchase: Purchase) => Promise<void>
  track: (product: Product & { price: number }) => void
  onTrackingError: (error: unknown) => void
}

/** Shared by live purchase events and unfinished-transaction recovery. */
export function createTipPurchaseProcessor(deps: TipPurchaseDependencies) {
  const inFlight = new Map<string, Promise<boolean>>()
  const finished = new Set<string>()

  return function processTip(purchase: Purchase): Promise<boolean> {
    if (!isPaidTip(purchase)) {
      return Promise.resolve(false)
    }

    if (finished.has(purchase.id)) return Promise.resolve(false)
    const existing = inFlight.get(purchase.id)
    if (existing) return existing

    const processing = (async () => {
      let product: (Product & { price: number }) | undefined
      if (!deps.hasRecordedTip(purchase.id)) {
        const fetchedProduct = await deps.fetchProduct(purchase.productId)
        if (fetchedProduct?.price == null || !Number.isFinite(fetchedProduct.price) || fetchedProduct.price <= 0) {
          // Leave the transaction unfinished so a later connection can retry it.
          throw new Error(`Missing price for tip product ${purchase.productId}`)
        }
        product = { ...fetchedProduct, price: fetchedProduct.price }
        deps.recordTip(purchase.id, product.price)
      }

      // Save the total and transaction ID together before acknowledging the purchase.
      // Retry persistence even if an earlier attempt updated memory but failed to save.
      await deps.persist()
      if (product) {
        try {
          deps.track(product)
        } catch (error) {
          deps.onTrackingError(error)
        }
      }
      await deps.finish(purchase)
      finished.add(purchase.id)
      // A replay of an already recorded tip must not confirm a newer purchase in the UI.
      return product !== undefined
    })().finally(() => inFlight.delete(purchase.id))

    inFlight.set(purchase.id, processing)
    return processing
  }
}

interface TipPurchaseQueueDependencies {
  process: (purchase: Purchase) => Promise<boolean>
  hasRecordedTip: (transactionId: string) => boolean
  onPaid: (purchase: Purchase) => void
  onPendingChange: (pending: boolean) => void
  onProcessingError: (error: unknown) => void
}

/** A confirmed payment stays successful even if its local accounting needs a retry. */
export function createTipPurchaseQueue(deps: TipPurchaseQueueDependencies) {
  const pending = new Map<string, Purchase>()
  const inFlight = new Map<string, Promise<void>>()
  const received = new Set<string>()
  const finished = new Set<string>()

  function handlePurchase(purchase: Purchase): Promise<void> {
    if (!isPaidTip(purchase) || finished.has(purchase.id)) return Promise.resolve()
    const existing = inFlight.get(purchase.id)
    if (existing) return existing

    pending.set(purchase.id, purchase)
    deps.onPendingChange(true)
    if (!received.has(purchase.id)) {
      received.add(purchase.id)
      if (!deps.hasRecordedTip(purchase.id)) deps.onPaid(purchase)
    }

    const processing = (async () => {
      try {
        await deps.process(purchase)
        pending.delete(purchase.id)
        finished.add(purchase.id)
      } catch (error) {
        // Keep the paid transaction queued and further tips blocked. Never report a payment failure here.
        deps.onProcessingError(error)
      } finally {
        deps.onPendingChange(pending.size > 0)
      }
    })().finally(() => inFlight.delete(purchase.id))
    inFlight.set(purchase.id, processing)
    return processing
  }

  return {
    handlePurchase,
    retry: () => Promise.all([...pending.values()].map(handlePurchase)),
    get hasPending() {
      return pending.size > 0
    },
  }
}
