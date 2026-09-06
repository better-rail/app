import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { AppState, Platform } from "react-native"
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getPendingTransactionsIOS,
  useIAP,
  type Product,
  type Purchase,
} from "expo-iap"
import * as Sentry from "@sentry/react-native"
import { toast } from "burnt"
import { translate } from "@/i18n"
import { useSettingsStore } from "@/models/settings/settings"
import { persistRootStore } from "@/models/root-store/setup-root-store"
import { trackPurchase } from "@/services/analytics"
import { createTipPurchaseProcessor, createTipPurchaseQueue, TIP_PRODUCT_IDS } from "./tip-purchases"

interface TipIAPContextValue {
  products: Product[]
  connected: boolean
  isPurchasing: boolean
  canTip: boolean
  showThanksModal: boolean
  dismissThanks: () => void
  requestTip: (sku: string) => Promise<void>
}

const TipIAPContext = createContext<TipIAPContextValue | null>(null)

function isDeferredPayment(error: unknown) {
  return (
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    (error.code === ErrorCode.DeferredPayment || error.code === ErrorCode.Pending)
  )
}

export function useTipIAP() {
  const context = useContext(TipIAPContext)
  if (!context) throw new Error("The tip jar requires TipIAPProvider on iOS")
  return context
}

export function TipIAPProvider({ children }: React.PropsWithChildren) {
  // Android uses the external support link and must not open a store connection.
  return Platform.OS === "ios" ? <IOSTipIAPProvider>{children}</IOSTipIAPProvider> : children
}

function IOSTipIAPProvider({ children }: React.PropsWithChildren) {
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isDeferred, setIsDeferred] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasRecovered, setHasRecovered] = useState(false)
  const [showThanksModal, setShowThanksModal] = useState(false)
  const requestedSku = useRef<string | null>(null)
  const [processTip] = useState(() =>
    createTipPurchaseProcessor({
      hasRecordedTip: (id) => useSettingsStore.getState().recordedTipTransactionIds.includes(id),
      recordTip: (id, amount) => useSettingsStore.getState().recordTip(id, amount),
      persist: persistRootStore,
      fetchProduct: async (sku) => {
        const products = await fetchProducts({ skus: [sku], type: "in-app" })
        for (const product of products ?? []) {
          if (product.type === "in-app" && product.id === sku) return product
        }
        return undefined
      },
      finish: (purchase) => finishTransaction({ purchase, isConsumable: true }),
      track: (product) => {
        trackPurchase({
          value: product.price,
          currency: product.currency,
          tax: 15,
          items: [{ item_name: product.title, item_id: product.id, price: product.price, quantity: 1 }],
        })
      },
      onTrackingError: (error) => console.error("Failed to track purchase:", error),
    }),
  )

  const [purchaseQueue] = useState(() =>
    createTipPurchaseQueue({
      process: processTip,
      hasRecordedTip: (id) => useSettingsStore.getState().recordedTipTransactionIds.includes(id),
      onPaid: (purchase) => {
        if (requestedSku.current === purchase.productId) {
          requestedSku.current = null
          setIsDeferred(false)
          setIsPurchasing(false)
          setShowThanksModal(true)
        }
      },
      onPendingChange: setIsProcessing,
      onProcessingError: (error) => Sentry.captureException(error),
    }),
  )

  const handlePurchase = useCallback(
    async (purchase: Purchase) => {
      if (purchase.purchaseState === "pending" && requestedSku.current === purchase.productId) {
        setIsDeferred(true)
        setIsPurchasing(false)
      }
      await purchaseQueue.handlePurchase(purchase)
    },
    [purchaseQueue],
  )

  const {
    connected,
    products,
    requestPurchase,
    fetchProducts: loadProducts,
  } = useIAP({
    onPurchaseSuccess: handlePurchase,
    onPurchaseError: (error) => {
      // Finishing a paid transaction can also emit a native error. Only an active
      // payment request may show a payment failure; background errors stay in diagnostics.
      if (!requestedSku.current) {
        if (error.code !== ErrorCode.UserCancelled) Sentry.captureException(error)
        return
      }
      if (isDeferredPayment(error)) {
        setIsDeferred(true)
        setIsPurchasing(false)
        return
      }
      requestedSku.current = null
      setIsDeferred(false)
      setIsPurchasing(false)
      if (error.code !== ErrorCode.UserCancelled) {
        toast({ title: translate("settings.purchaseFailed") ?? "", message: error.message, preset: "error" })
      }
    },
    onError: (error) => Sentry.captureException(error),
  })

  const hasCompleteCatalog = TIP_PRODUCT_IDS.every((sku) => products.some((product) => product.id === sku))

  useEffect(() => {
    if (!connected || hasCompleteCatalog) return undefined
    let loading = false
    const loadCatalog = async () => {
      if (loading) return
      loading = true
      try {
        await loadProducts({ skus: TIP_PRODUCT_IDS, type: "in-app" })
      } catch {
        // useIAP reports the error through onError. Retry empty/partial results too.
      } finally {
        loading = false
      }
    }
    void loadCatalog()
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadCatalog()
    })
    const retryTimer = setInterval(() => {
      if (AppState.currentState === "active") void loadCatalog()
    }, 5000)
    return () => {
      clearInterval(retryTimer)
      subscription.remove()
    }
  }, [connected, hasCompleteCatalog, loadProducts])

  useEffect(() => {
    setHasRecovered(false)
    if (!connected) return undefined

    let active = true
    let recovered = false
    let recovering = false

    const recover = async () => {
      if (recovering) return
      recovering = true
      try {
        await purchaseQueue.retry()
        // Unfinished consumables are separate from restorable entitlements in StoreKit 2.
        const purchases = await getPendingTransactionsIOS()
        if (!active) return
        await Promise.all(purchases.map(purchaseQueue.handlePurchase))
        recovered = true
        if (active) setHasRecovered(true)
      } catch (error) {
        Sentry.captureException(error)
      } finally {
        recovering = false
      }
    }

    void recover()
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void recover()
    })
    const retryTimer = setInterval(() => {
      if (AppState.currentState !== "active") return
      if (!recovered) void recover()
      else if (purchaseQueue.hasPending) void purchaseQueue.retry()
    }, 5000)
    return () => {
      active = false
      clearInterval(retryTimer)
      subscription.remove()
    }
  }, [connected, purchaseQueue])

  const requestTip = async (sku: string) => {
    if (!connected || !hasRecovered || requestedSku.current || purchaseQueue.hasPending || !TIP_PRODUCT_IDS.includes(sku)) return
    requestedSku.current = sku
    setIsPurchasing(true)
    try {
      await requestPurchase({ request: { apple: { sku } }, type: "in-app" })
    } catch (error) {
      const needsMessage = requestedSku.current === sku
      // StoreKit's Ask to Buy result rejects with deferred-payment, rather than
      // delivering a pending Purchase. Preserve the request until its terminal event.
      if (needsMessage && isDeferredPayment(error)) {
        setIsDeferred(true)
        setIsPurchasing(false)
        return
      }
      if (needsMessage) {
        requestedSku.current = null
        setIsDeferred(false)
        setIsPurchasing(false)
      }
      if (error && typeof error === "object" && "code" in error && error.code === ErrorCode.UserCancelled) return
      Sentry.captureException(error)
      // Validation/dispatch failures can reject without emitting onPurchaseError.
      if (needsMessage) {
        toast({
          title: translate("settings.purchaseFailed") ?? "",
          message: error instanceof Error ? error.message : undefined,
          preset: "error",
        })
      }
    }
  }

  return (
    <TipIAPContext.Provider
      value={{
        products,
        connected,
        isPurchasing,
        canTip: connected && hasRecovered && !isPurchasing && !isDeferred && !isProcessing,
        showThanksModal,
        dismissThanks: () => setShowThanksModal(false),
        requestTip,
      }}
    >
      {children}
    </TipIAPContext.Provider>
  )
}
