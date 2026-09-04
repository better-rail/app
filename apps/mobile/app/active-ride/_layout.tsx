import { Stack } from "expo-router/stack"
import { useRouter } from "expo-router"
import { CloseButton } from "@/components"
import { translate } from "@/i18n"

export default function ActiveRideLayout() {
  const router = useRouter()

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTransparent: true,
          title: "",
          headerLeft: () => <CloseButton onPress={() => router.back()} iconStyle={{ tintColor: "white" }} />,
          unstable_headerLeftItems: () => [
            {
              type: "button",
              label: translate("common.close") ?? "Close",
              icon: { type: "sfSymbol", name: "xmark" },
              tintColor: "white",
              onPress: () => router.back(),
            },
          ],
        }}
      />
    </Stack>
  )
}
