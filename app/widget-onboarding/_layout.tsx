import { Stack } from "expo-router/stack"

export default function WidgetOnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#ffffff55",
        title: "",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="step-1" />
      <Stack.Screen name="step-2" />
      <Stack.Screen name="step-3" />
    </Stack>
  )
}
