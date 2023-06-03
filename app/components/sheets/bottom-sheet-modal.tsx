import { forwardRef, useCallback, useMemo } from "react"
import { ViewStyle } from "react-native"
import BottomSheet, { BottomSheetBackdrop, BottomSheetProps } from "@gorhom/bottom-sheet"

interface BottomSheetModalProps {
  children: React.ReactNode
  style: ViewStyle
  snapPoints?: BottomSheetProps["snapPoints"]
}

export const BottomSheetModal = forwardRef<BottomSheet, BottomSheetModalProps>(({ children, snapPoints, ...rest }, ref) => {
  const sheetSnapPoints = useMemo(() => snapPoints || ["55%"], [])

  const renderBackdrop = useCallback((props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={2} />, [])

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      enablePanDownToClose
      snapPoints={sheetSnapPoints}
      backdropComponent={renderBackdrop}
      handleComponent={null}
      {...rest}
    >
      {children}
    </BottomSheet>
  )
})
