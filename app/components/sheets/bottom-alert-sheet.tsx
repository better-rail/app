import { forwardRef, useCallback, useMemo } from "react"
import { ViewStyle } from "react-native"
import BottomSheet, { BottomSheetBackdrop, BottomSheetProps } from "@gorhom/bottom-sheet"

interface BottomSheetModalProps extends BottomSheetProps {
  children: React.ReactNode
  style: ViewStyle
}

export const BottomSheetModal = forwardRef<BottomSheet, BottomSheetModalProps>(({ children, ...rest }, ref) => {
  const snapPoints = useMemo(() => ["55%"], [])

  const renderBackdrop = useCallback((props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={2} />, [])

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      enablePanDownToClose
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      {...rest}
    >
      {children}
    </BottomSheet>
  )
})
