import { useState } from "react"
import { useStores } from "../../models"
import { Button, Text } from "../../components"

export const TestPurchases: React.FC = () => {
  const { purchases } = useStores()
  const [isLoading, setIsLoading] = useState(false)

  return (
    <>
      <Text>Is Pro: {String(!!purchases.isPro)}</Text>
      <Button
        title="Buy Pro"
        loading={isLoading}
        onPress={async () => {
          setIsLoading(true)
          try {
            await purchases.purchaseMonthly()
          } catch {
          } finally {
            setIsLoading(false)
          }
        }}
      />
    </>
  )
}
