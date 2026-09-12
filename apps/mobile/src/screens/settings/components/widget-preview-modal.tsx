import React, { useEffect, useRef, useState } from "react"
import { Dimensions, I18nManager, Modal, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { TxKeyPath } from "@/i18n"
import { WidgetFamily } from "@/utils/widget-helpers"
import { WidgetPreviewCompact, WidgetPreviewLarge, WidgetPreviewWide } from "./widget-previews"

const CARD_WIDTH = Math.min(Dimensions.get("window").width - 48, 340)

interface WidgetOption {
  family: WidgetFamily
  titleTx: TxKeyPath
  descTx: TxKeyPath
  component: React.ComponentType
}

const WIDGETS: WidgetOption[] = [
  {
    family: "compact",
    titleTx: "settings.widgetSizeCompact",
    descTx: "settings.widgetCompactDesc",
    component: WidgetPreviewCompact,
  },
  {
    family: "wide",
    titleTx: "settings.widgetSizeWide",
    descTx: "settings.widgetWideDesc",
    component: WidgetPreviewWide,
  },
  {
    family: "large",
    titleTx: "settings.widgetSizeLarge",
    descTx: "settings.widgetLargeDesc",
    component: WidgetPreviewLarge,
  },
]

interface WidgetPreviewModalProps {
  visible: boolean
  onClose: () => void
  onPin: (family: WidgetFamily) => void
}

export function WidgetPreviewModal({ visible, onClose, onPin }: WidgetPreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const isRTLAndroid = Platform.OS === "android" && I18nManager.isRTL

  const getScrollXForIndex = (index: number) => {
    return isRTLAndroid
      ? (WIDGETS.length - 1 - index) * CARD_WIDTH
      : index * CARD_WIDTH
  }

  const getIndexFromScrollEvent = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    const rawX = contentOffset.x
    const totalWidth = contentSize?.width && contentSize.width > 0 ? contentSize.width : WIDGETS.length * CARD_WIDTH
    const viewWidth = layoutMeasurement?.width && layoutMeasurement.width > 0 ? layoutMeasurement.width : CARD_WIDTH
    const maxScroll = Math.max(0, totalWidth - viewWidth)

    let scrollX = rawX
    if (isRTLAndroid) {
      if (rawX < 0) {
        scrollX = Math.abs(rawX)
      } else if (maxScroll > 0) {
        scrollX = maxScroll - rawX
      } else {
        scrollX = (WIDGETS.length - 1) * CARD_WIDTH - rawX
      }
    }
    const nextIndex = Math.round(scrollX / CARD_WIDTH)
    return Math.max(0, Math.min(WIDGETS.length - 1, nextIndex))
  }

  useEffect(() => {
    if (visible) {
      setActiveIndex(0)
      const initialX = isRTLAndroid ? getScrollXForIndex(0) : 0
      scrollRef.current?.scrollTo({ x: initialX, animated: false })
    }
  }, [visible])

  const scrollTo = (index: number) => {
    setActiveIndex(index)
    scrollRef.current?.scrollTo({ x: getScrollXForIndex(index), animated: true })
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = getIndexFromScrollEvent(e)
    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex)
    }
  }

  const handleClose = () => {
    setActiveIndex(0)
    const initialX = isRTLAndroid ? getScrollXForIndex(0) : 0
    scrollRef.current?.scrollTo({ x: initialX, animated: false })
    onClose()
  }

  const handlePin = () => {
    const selected = WIDGETS[activeIndex]?.family ?? "compact"
    onPin(selected)
    handleClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.headerTitle} tx="settings.chooseWidgetSize" />

          <View style={styles.carouselWrapper}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScroll}
              onScrollEndDrag={handleScroll}
              scrollEventThrottle={16}
              nestedScrollEnabled
            >
              {WIDGETS.map((w) => {
                const PreviewComponent = w.component
                return (
                  <View key={w.family} style={styles.card}>
                    <View style={styles.imageWrapper}>
                      <PreviewComponent />
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle} tx={w.titleTx} />
                      <Text style={styles.cardDesc} tx={w.descTx} />
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          </View>

          <View style={styles.indicatorRow}>
            {WIDGETS.map((w, idx) => (
              <Pressable key={w.family} onPress={() => scrollTo(idx)}>
                <View style={[styles.dot, idx === activeIndex && styles.dotActive]} />
              </Pressable>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText} tx="common.cancel" />
            </Pressable>
            <Pressable style={styles.selectButton} onPress={handlePin}>
              <Text style={styles.selectText} tx="common.select" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  sheet: {
    width: CARD_WIDTH + theme.spacing[4] * 2,
    backgroundColor: theme.colors.modalBackground,
    borderRadius: Platform.select({ ios: 16, android: 12 }),
    padding: theme.spacing[4],
    alignItems: "center",
    elevation: 6,
    shadowColor: theme.colors.palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  carouselWrapper: {
    width: CARD_WIDTH,
    height: 300,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[2],
  },
  imageWrapper: {
    width: "100%",
    height: 214,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing[2],
  },
  cardInfo: {
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: theme.colors.label,
    textAlign: "center",
    paddingHorizontal: theme.spacing[2],
  },
  indicatorRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: theme.spacing[2],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.separator,
  },
  dotActive: {
    width: 16,
    backgroundColor: theme.colors.primary,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing[3],
    width: "100%",
    marginTop: theme.spacing[3],
  },
  cancelButton: {
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.label,
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    borderRadius: 8,
  },
  selectText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.palette.white,
  },
}))
