import { Platform, View, type NativeSyntheticEvent, type ViewProps } from "react-native"
import { requireNativeViewManager } from "expo-modules-core"

export type DivisionRegion = { x: number; y: number; width: number; height: number }

export type DivisionsChangeEvent = NativeSyntheticEvent<{ divisions: DivisionRegion[] }>

export interface ReservedRegionsViewProps extends ViewProps {
  /** Called with the active division regions in this view's coordinate space, e.g. iPhone Duo's fold while it's partially open. */
  onDivisionsChange?: (event: DivisionsChangeEvent) => void
}

const NativeReservedRegionsView =
  Platform.OS === "ios" ? requireNativeViewManager<ReservedRegionsViewProps>("ReservedRegions") : null

/** A plain view that also reports the reserved regions dividing it. Elsewhere than iOS it never reports any. */
export function ReservedRegionsView({ onDivisionsChange, ...props }: ReservedRegionsViewProps) {
  if (!NativeReservedRegionsView) return <View {...props} />
  return <NativeReservedRegionsView {...props} onDivisionsChange={onDivisionsChange} />
}
