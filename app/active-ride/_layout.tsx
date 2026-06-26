import { Stack } from "expo-router/stack"
import { useRouter } from "expo-router"
import { CloseButton } from "@/components"

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
        }}
      />
    </Stack>
  )
}
