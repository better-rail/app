import { useCallback, useEffect, useMemo, useState } from "react"
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle, useColorScheme } from "react-native"
import {
  Canvas,
  Circle,
  Fill,
  Group,
  Paragraph,
  Path,
  Skia,
  TextAlign,
  TextDirection,
  type SkParagraph,
  type SkPath,
  useFonts,
} from "@shopify/react-native-skia"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { isRTL } from "@/i18n"
import { getStationById } from "@/data/stations"
import type { RailLineId } from "@/data/rail-lines"
import type { ServiceStatusSnapshot } from "@/services/api"
import {
  LABEL_FONT_SIZE,
  LABEL_LINE_HEIGHT,
  LINE_STROKE,
  MARKER_RADIUS,
  type LinePath,
  type Point,
  type RailMapModel,
  type StationLabel,
  buildRailMapModel,
  linePathBetween,
  lineStationPoints,
  nearestLine,
  stationLabelLines,
} from "./rail-map-model"
import { RAIL_MAP_PALETTE, paleColor } from "./rail-map-theme"

const HEEBO_FONTS = {
  Heebo: [require("../../../assets/fonts/Heebo-Regular.otf"), require("../../../assets/fonts/Heebo-Medium.otf")],
}

/** Blank margin around the drawing, in layout units, so edge labels are not clipped. */
const PAD = { left: 12, right: 10, top: 4, bottom: 6 }
const MIN_ZOOM = 0.9
const MAX_ZOOM = 4
/** How close (in layout units) a tap must be to a line to select it. */
const TAP_TOLERANCE = 3.5

export type RailMapProps = {
  /** Live status: flags the stations of every disrupted stretch on the map. */
  status?: ServiceStatusSnapshot | null
  /** Draw this line in colour and everything else in grey. */
  selectedLineId?: RailLineId | null
  /** Called with the tapped line, or null when tapping empty ground. */
  onSelectLine?: (lineId: RailLineId | null) => void
  /** Scroll and zoom the initial view to this line. */
  focusLineId?: RailLineId | null
  style?: ViewStyle
}

type Size = { width: number; height: number }

type Viewport = {
  /** Layout units → pixels. */
  scale: number
  translateX: number
  translateY: number
}

/** The view that shows the whole map width from the top, or the line's extent when focusing. */
const initialViewport = (model: RailMapModel, size: Size, focus?: LinePath): Viewport => {
  const contentWidth = model.bounds.width + PAD.left + PAD.right
  const fitWidth = size.width / contentWidth
  if (!focus || size.height === 0) return { scale: fitWidth, translateX: PAD.left * fitWidth, translateY: PAD.top * fitWidth }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const v of focus.vertices) {
    minX = Math.min(minX, v.x)
    minY = Math.min(minY, v.y)
    maxX = Math.max(maxX, v.x)
    maxY = Math.max(maxY, v.y)
  }
  // Room for the labels on either side of the line.
  const margin = 28
  const width = maxX - minX + margin * 2
  const height = maxY - minY + margin
  const scale = Math.min(Math.max(Math.min(size.width / width, size.height / height), fitWidth * MIN_ZOOM), fitWidth * MAX_ZOOM)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return { scale, translateX: size.width / 2 - centerX * scale, translateY: size.height / 2 - centerY * scale }
}

const clamp = (value: number, min: number, max: number): number => {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

export function RailMap({ status, selectedLineId, onSelectLine, focusLineId, style }: RailMapProps) {
  const scheme = useColorScheme()
  const palette = RAIL_MAP_PALETTE[scheme === "dark" ? "dark" : "light"]
  const model = useMemo(() => buildRailMapModel(), [])
  const fontMgr = useFonts(HEEBO_FONTS)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  // --- viewport (pan & pinch) ------------------------------------------------------
  const scale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedScale = useSharedValue(1)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)
  const minScale = useSharedValue(1)
  const maxScale = useSharedValue(4)
  const viewportWidth = useSharedValue(0)
  const viewportHeight = useSharedValue(0)
  const contentWidth = model.bounds.width + PAD.left + PAD.right
  const contentHeight = model.bounds.height + PAD.top + PAD.bottom

  const showViewport = useCallback(
    (view: Viewport, animated: boolean) => {
      scale.value = animated ? withTiming(view.scale) : view.scale
      translateX.value = animated ? withTiming(view.translateX) : view.translateX
      translateY.value = animated ? withTiming(view.translateY) : view.translateY
      savedScale.value = view.scale
      savedTranslateX.value = view.translateX
      savedTranslateY.value = view.translateY
    },
    [scale, translateX, translateY, savedScale, savedTranslateX, savedTranslateY],
  )

  const focusLine = useMemo(
    () => (focusLineId ? model.lines.find((l) => l.lineId === focusLineId) : undefined),
    [model, focusLineId],
  )
  const laidOut = size.width > 0

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width === size.width && height === size.height) return
    setSize({ width, height })
    const fitWidth = width / contentWidth
    minScale.value = fitWidth * MIN_ZOOM
    maxScale.value = fitWidth * MAX_ZOOM
    viewportWidth.value = width
    viewportHeight.value = height
    showViewport(initialViewport(model, { width, height }, focusLine), false)
  }

  // Glide to the focused line when it changes after the first layout.
  useEffect(() => {
    if (laidOut && focusLine) showViewport(initialViewport(model, size, focusLine), true)
    // `size` is deliberately not a dependency: layout changes are handled by onLayout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLine, laidOut, model, showViewport])

  const clampTranslation = (s: number, tx: number, ty: number): [number, number] => {
    "worklet"
    // Keep the drawing on screen: allow half a viewport of overscroll at most.
    const w = (contentWidth + PAD.left) * s
    const h = contentHeight * s
    const minX = Math.min(viewportWidth.value - w, viewportWidth.value / 2)
    const maxX = Math.max(PAD.left * s, viewportWidth.value / 2)
    const minY = Math.min(viewportHeight.value - h, viewportHeight.value / 2)
    const maxY = Math.max(0, viewportHeight.value / 2)
    return [clamp(tx, minX, maxX), clamp(ty, minY, maxY)]
  }

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })
    .onUpdate((e) => {
      const [tx, ty] = clampTranslation(
        scale.value,
        savedTranslateX.value + e.translationX,
        savedTranslateY.value + e.translationY,
      )
      translateX.value = tx
      translateY.value = ty
    })

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })
    .onUpdate((e) => {
      const next = clamp(savedScale.value * e.scale, minScale.value, maxScale.value)
      const ratio = next / savedScale.value
      // Zoom around the fingers' focal point.
      const [tx, ty] = clampTranslation(
        next,
        e.focalX - (e.focalX - savedTranslateX.value) * ratio,
        e.focalY - (e.focalY - savedTranslateY.value) * ratio,
      )
      scale.value = next
      translateX.value = tx
      translateY.value = ty
    })

  const handleTap = (x: number, y: number) => {
    if (!onSelectLine) return
    const hit = nearestLine(model, { x, y }, TAP_TOLERANCE)
    onSelectLine(hit?.lineId ?? null)
  }

  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((e) => {
      const x = (e.x - translateX.value) / scale.value
      const y = (e.y - translateY.value) / scale.value
      scheduleOnRN(handleTap, x, y)
    })

  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pan, pinch))

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ])

  // --- drawing data --------------------------------------------------------------------
  const paths = useMemo(() => new Map(model.lines.map((l) => [l.lineId, Skia.Path.MakeFromSVGString(l.d) as SkPath])), [model])

  const disrupted = useMemo(() => collectDisruptedSections(model, status), [model, status])

  const labels = useMemo(() => {
    if (!fontMgr) return []
    return model.labels.map((label) => buildLabel(label, fontMgr, palette.ink, palette.dimInk))
  }, [fontMgr, model, palette])

  const isDimmed = (lineId: RailLineId) => selectedLineId != null && lineId !== selectedLineId
  const orderedLines = useMemo(
    () => [...model.lines].sort((a, b) => Number(a.lineId === selectedLineId) - Number(b.lineId === selectedLineId)),
    [model, selectedLineId],
  )
  const selectedStations = useMemo(
    () => new Set(selectedLineId ? (model.lines.find((l) => l.lineId === selectedLineId)?.line.stationIds ?? []) : []),
    [model, selectedLineId],
  )

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.container, { backgroundColor: palette.background }, style]} onLayout={onLayout} testID="rail-map">
        {laidOut && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill color={palette.background} />
            <Group transform={transform}>
              {/* Lines, the selected one on top. */}
              {orderedLines.map((line) => (
                <Path
                  key={line.lineId}
                  path={paths.get(line.lineId) as SkPath}
                  color={isDimmed(line.lineId) ? palette.dimLine : line.line.color}
                  style="stroke"
                  strokeWidth={LINE_STROKE}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}

              {/* Disrupted stretches: the line fades out where trains do not run. */}
              {disrupted.map((section) =>
                isDimmed(section.lineId) ? null : (
                  <Group key={section.key}>
                    <Path
                      path={section.path}
                      color={palette.background}
                      style="stroke"
                      strokeWidth={LINE_STROKE + 0.3}
                      strokeCap="butt"
                    />
                    <Path
                      path={section.path}
                      color={paleColor(section.color, palette.background)}
                      style="stroke"
                      strokeWidth={LINE_STROKE}
                      strokeCap="butt"
                    />
                  </Group>
                ),
              )}

              {/* Station markers. */}
              {model.markers.map((marker) => {
                const dim = selectedLineId != null && !selectedStations.has(marker.stationId)
                const ink = dim ? palette.dimInk : palette.ink
                if (marker.kind === "single") {
                  return (
                    <Group key={marker.stationId}>
                      <Circle c={marker.center} r={marker.radius} color={palette.background} />
                      <Circle c={marker.center} r={marker.radius} color={ink} style="stroke" strokeWidth={0.5} />
                    </Group>
                  )
                }
                const capsule = Skia.Path.Make()
                capsule.moveTo(marker.a.x, marker.a.y)
                capsule.lineTo(marker.b.x, marker.b.y)
                return (
                  <Group key={marker.stationId}>
                    <Path path={capsule} color={ink} style="stroke" strokeWidth={marker.radius * 2 + 0.6} strokeCap="round" />
                    <Path
                      path={capsule}
                      color={dim ? palette.background : palette.markerFill}
                      style="stroke"
                      strokeWidth={marker.radius * 2}
                      strokeCap="round"
                    />
                    {!dim &&
                      marker.lanePoints.map((p, i) => <Circle key={i} c={p} r={MARKER_RADIUS * 0.5} color={palette.badgeInk} />)}
                  </Group>
                )
              })}

              {/* Disruption badges on the affected stations. */}
              {disrupted.flatMap((section) =>
                isDimmed(section.lineId)
                  ? []
                  : section.points.map((p, i) => (
                      <Group key={`${section.key}-${i}`}>
                        <Circle c={p} r={1.7} color={palette.badge} />
                        <Circle c={p} r={1.7} color={palette.background} style="stroke" strokeWidth={0.35} />
                        <Path path={exclamationPath(p)} color={palette.badgeInk} />
                      </Group>
                    )),
              )}

              {/* Station names. */}
              {labels.map((label) => {
                const dim = selectedLineId != null && !selectedStations.has(label.stationId)
                const paragraph = dim ? label.dimParagraph : label.paragraph
                return <Paragraph key={label.stationId} paragraph={paragraph} x={label.x} y={label.y} width={label.width} />
              })}
            </Group>
          </Canvas>
        )}
      </View>
    </GestureDetector>
  )
}

// --- helpers ----------------------------------------------------------------------------

type DisruptedSection = {
  key: string
  lineId: RailLineId
  color: string
  path: SkPath
  /** Where the "!" badges go: every station of the stretch. */
  points: Point[]
}

const collectDisruptedSections = (model: RailMapModel, status?: ServiceStatusSnapshot | null): DisruptedSection[] => {
  if (!status) return []
  const sections: DisruptedSection[] = []
  for (const lineStatus of status.lines) {
    const line = model.lines.find((l) => l.lineId === lineStatus.lineId)
    if (!line) continue
    for (const disruption of lineStatus.disruptions) {
      if (!disruption.section) continue
      const { fromStationId, toStationId, stationIds } = disruption.section
      const d = linePathBetween(line, fromStationId, toStationId)
      if (!d) continue
      sections.push({
        key: `${line.lineId}:${disruption.id}`,
        lineId: line.lineId,
        color: line.line.color,
        path: Skia.Path.MakeFromSVGString(d) as SkPath,
        points: lineStationPoints(line, stationIds),
      })
    }
  }
  return sections
}

/** A small "!" centred on `p`, sized for the badge disc. */
const exclamationPath = (p: Point): SkPath => {
  const path = Skia.Path.Make()
  path.addRRect(Skia.RRectXY(Skia.XYWHRect(p.x - 0.28, p.y - 1.15, 0.56, 1.35), 0.28, 0.28))
  path.addCircle(p.x, p.y + 0.75, 0.32)
  return path
}

type BuiltLabel = {
  stationId: string
  paragraph: SkParagraph
  dimParagraph: SkParagraph
  x: number
  y: number
  width: number
}

const buildLabel = (
  label: StationLabel,
  fontMgr: NonNullable<ReturnType<typeof useFonts>>,
  ink: string,
  dimInk: string,
): BuiltLabel => {
  const name = getStationById(label.stationId)?.name ?? label.stationId
  const text = stationLabelLines(name).join("\n")
  const textAlign = label.side === "left" ? TextAlign.Right : label.side === "right" ? TextAlign.Left : TextAlign.Center
  const make = (color: string): SkParagraph => {
    const paragraph = Skia.ParagraphBuilder.Make(
      {
        textAlign,
        textDirection: isRTL ? TextDirection.RTL : TextDirection.LTR,
        heightMultiplier: LABEL_LINE_HEIGHT,
        maxLines: 2,
      },
      fontMgr,
    )
      .pushStyle({
        color: Skia.Color(color),
        fontFamilies: ["Heebo"],
        fontSize: LABEL_FONT_SIZE,
        heightMultiplier: LABEL_LINE_HEIGHT,
      })
      .addText(text)
      .pop()
      .build()
    paragraph.layout(label.maxWidth)
    return paragraph
  }
  const paragraph = make(ink)
  const height = paragraph.getHeight()
  const x =
    label.side === "left"
      ? label.anchor.x - label.maxWidth
      : label.side === "right"
        ? label.anchor.x
        : label.anchor.x - label.maxWidth / 2
  const y =
    label.side === "above" ? label.anchor.y - height : label.side === "below" ? label.anchor.y : label.anchor.y - height / 2
  return { stationId: label.stationId, paragraph, dimParagraph: make(dimInk), x, y, width: label.maxWidth }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
})
