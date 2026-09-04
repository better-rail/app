import { Stack } from "expo-router/stack"

export default function PaywallLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerTransparent: true }} />
    </Stack>
  )
}
