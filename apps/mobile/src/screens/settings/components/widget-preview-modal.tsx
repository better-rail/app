import React, { useEffect, useRef, useState } from "react"
import {
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { TxKeyPath } from "@/i18n"
import { WidgetFamily } from "@/utils/widget-helpers"

const CARD_WIDTH = Math.min(Dimensions.get("window").width - 48, 340)

interface WidgetOption {
  family: WidgetFamily
  titleTx: TxKeyPath
  descTx: TxKeyPath
  image: number
}

const WIDGETS: WidgetOption[] = [
  {
    family: "wide",
    titleTx: "settings.widgetSizeWide",
    descTx: "settings.widgetWideDesc",
    image: require("../../../../assets/widget-preview-4x2.png"),
  },
  {
    family: "compact",
    titleTx: "settings.widgetSizeCompact",
    descTx: "settings.widgetCompactDesc",
    image: require("../../../../assets/widget-preview-2x2.png"),
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

  useEffect(() => {
    if (visible) {
      setActiveIndex(0)
      scrollRef.current?.scrollTo({ x: 0, animated: false })
    }
  }, [visible])

  const scrollTo = (index: number) => {
    setActiveIndex(index)
    scrollRef.current?.scrollTo({ x: index * CARD_WIDTH, animated: true })
  }

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH)
    if (nextIndex >= 0 && nextIndex < WIDGETS.length && nextIndex !== activeIndex) {
      setActiveIndex(nextIndex)
    }
  }

  const handleClose = () => {
    setActiveIndex(0)
    scrollRef.current?.scrollTo({ x: 0, animated: false })
    onClose()
  }

  const handlePin = () => {
    const selected = WIDGETS[activeIndex]?.family ?? "wide"
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
              onMomentumScrollEnd={handleScroll}
              onScrollEndDrag={handleScroll}
              scrollEventThrottle={16}
              nestedScrollEnabled
            >
              {WIDGETS.map((w) => (
                <View key={w.family} style={styles.card}>
                  <View style={styles.imageWrapper}>
                    <Image source={w.image} style={styles.previewImage} resizeMode="contain" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} tx={w.titleTx} />
                    <Text style={styles.cardDesc} tx={w.descTx} />
                  </View>
                </View>
              ))}
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
    height: 236,
  },
  card: {
    width: CARD_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[2],
  },
  imageWrapper: {
    width: "100%",
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.spacing[2],
  },
  previewImage: {
    width: "100%",
    height: "100%",
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
