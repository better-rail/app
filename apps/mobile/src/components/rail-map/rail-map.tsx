import { useCallback, useEffect, useMemo, useState } from "react"
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle, useColorScheme } from "react-native"
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  LinearGradient,
  Paragraph,
  Path,
  RoundedRect,
  Skia,
  TextAlign,
  TextDirection,
  type SkParagraph,
  type SkPath,
  useFonts,
  vec,
} from "@shopify/react-native-skia"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { userLocale } from "@/i18n"
import { stationsObject } from "@/data/stations"
import type { RailLineId } from "@/data/rail-lines"
import { type CityBox, LABEL_TEXT_OVERRIDES } from "@/data/rail-map-layout"
import type { ServiceStatusSnapshot } from "@/services/api"
import {
  BADGE_SIZE,
  CITY_BOX_RADIUS,
  CITY_BOX_STROKE,
  CITY_FONT_SIZE,
  IRREGULAR_STOP_STROKE,
  IRREGULAR_STRIPE_WIDTH,
  LABEL_LINE_HEIGHT,
  LATIN_SCALE,
  LINE_CASING,
  LINE_DRAW_ORDER,
  LINE_STROKE,
  MARKER_RADIUS,
  SHORE_BLUR,
  SHORE_WIDTH,
  TERMINAL_RING_RADIUS,
  TERMINAL_RING_WIDTH,
  type LinePath,
  type MarkerKind,
  type Point,
  type RailMapModel,
  type StationLabel,
  type TerminalBadge,
  buildRailMapModel,
  linePathBetween,
  lineStationPoints,
  isRtlScript,
  mapStationName,
  nameFontSize,
  nearestLine,
} from "./rail-map-model"
import { RAIL_MAP_PALETTE, type RailMapPalette, paleColor } from "./rail-map-theme"

const HEEBO_FONTS = {
  Heebo: [require("../../../assets/fonts/Heebo-Regular.otf"), require("../../../assets/fonts/Heebo-Medium.otf")],
}

/** Blank margin around the drawing, in map units, so edge labels are not clipped. */
const PAD = { left: 3, right: 3, top: 3, bottom: 4 }
const MIN_ZOOM = 0.9
const MAX_ZOOM = 4
/** How close (in map units) a tap must be to a line to select it. */
const TAP_TOLERANCE = 3

/** Material's "flight" glyph, 24 × 24, nose up. */
const PLANE_D =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"

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
  /** Map units → pixels. */
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

  const stripes = useMemo(() => model.irregular.map((s) => Skia.Path.MakeFromSVGString(s.d) as SkPath), [model])

  const extras = useMemo(() => model.extras.map((e) => ({ ...e, path: Skia.Path.MakeFromSVGString(e.d) as SkPath })), [model])

  const water = useMemo(
    () => ({
      sea: Skia.Path.MakeFromSVGString(model.water.sea) as SkPath,
      shore: Skia.Path.MakeFromSVGString(model.water.shore) as SkPath,
      lakes: model.water.lakes.map((d) => Skia.Path.MakeFromSVGString(d) as SkPath),
    }),
    [model],
  )

  const disrupted = useMemo(() => collectDisruptedSections(model, status), [model, status])

  const labels = useMemo(() => {
    if (!fontMgr) return []
    return model.labels.map((label) => buildLabel(label, fontMgr, palette))
  }, [fontMgr, model, palette])

  const cityLabels = useMemo(() => {
    if (!fontMgr) return []
    return model.cities.map((city) => buildCityLabel(city, fontMgr, palette))
  }, [fontMgr, model, palette])

  const badges = useMemo(() => {
    if (!fontMgr) return []
    return model.badges.map((badge) => buildBadge(badge, fontMgr, palette))
  }, [fontMgr, model, palette])

  const plane = useMemo(() => {
    const airportLabel = labels.find((l) => l.stationId === "8600")
    const bottom = airportLabel ? airportLabel.y - 0.3 : model.airport.y
    return planePath(model.airport.x, bottom, model.airport.height)
  }, [labels, model])

  const isDimmed = (lineId: RailLineId) => selectedLineId != null && lineId !== selectedLineId
  // The original's stacking at crossings, with the selected line lifted on top.
  const orderedLines = useMemo(() => {
    const rank = (line: LinePath) =>
      line.lineId === selectedLineId ? LINE_DRAW_ORDER.length : LINE_DRAW_ORDER.indexOf(line.lineId)
    return [...model.lines].sort((a, b) => rank(a) - rank(b))
  }, [model, selectedLineId])
  const selectedStations = useMemo(
    () => new Set(selectedLineId ? (model.lines.find((l) => l.lineId === selectedLineId)?.line.stationIds ?? []) : []),
    [model, selectedLineId],
  )
  // Lanes shared by two lines (5 and 25) carry one dot: draw each spot once, coloured for the selection.
  const markers = useMemo(() => {
    const rank: Record<MarkerKind, number> = { terminal: 2, stop: 1, irregular: 0 }
    const seen = new Map<string, (typeof model.markers)[number] & { dim: boolean }>()
    for (const marker of model.markers) {
      const key = `${marker.point.x.toFixed(1)}:${marker.point.y.toFixed(1)}`
      const dim = selectedLineId != null && marker.lineId !== selectedLineId
      const previous = seen.get(key)
      if (!previous || (previous.dim && !dim) || (previous.dim === dim && rank[marker.kind] > rank[previous.kind])) {
        seen.set(key, { ...marker, dim })
      }
    }
    return [...seen.values()]
  }, [model, selectedLineId])

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.container, { backgroundColor: palette.background }, style]} onLayout={onLayout} testID="rail-map">
        {laidOut && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill color={palette.background} />
            <Group transform={transform}>
              {/* The sea, deeper blue away from the coast, its shoreline, and the lakes. */}
              <Path path={water.sea}>
                <LinearGradient
                  start={vec(model.water.seaLeft, 0)}
                  end={vec(model.water.seaRight, 0)}
                  colors={[palette.seaFar, palette.seaNear]}
                />
              </Path>
              <Path path={water.shore} color={palette.shore} style="stroke" strokeWidth={SHORE_WIDTH} strokeJoin="round">
                <BlurMask blur={SHORE_BLUR} style="normal" />
              </Path>
              {water.lakes.map((lake, i) => (
                <Path key={`lake-${i}`} path={lake} color={palette.lake} />
              ))}

              {/* City frames. */}
              {model.cities.map((city) => (
                <RoundedRect
                  key={city.id}
                  x={city.x}
                  y={city.y}
                  width={city.width}
                  height={city.height}
                  r={CITY_BOX_RADIUS}
                  color={palette.frame}
                  style="stroke"
                  strokeWidth={CITY_BOX_STROKE}
                />
              ))}

              {/*
                Lines on their casings: the casing keeps the gap between lanes and outlines a line crossing
                another. A line's extra strokes go with it: an express lane beside the line sits under it (the
                line's casing keeps the gap), a terminal stub is painted over it so the two join without a seam.
              */}
              {orderedLines.map((line) => {
                const color = isDimmed(line.lineId) ? palette.dimLine : line.line.color
                const own = extras.filter((e) => e.lineId === line.lineId)
                const stroke = (path: SkPath, key: string, casing: boolean) => (
                  <Path
                    key={key}
                    path={path}
                    color={casing ? palette.background : color}
                    style="stroke"
                    strokeWidth={casing ? LINE_CASING : LINE_STROKE}
                    strokeCap="round"
                    strokeJoin="round"
                  />
                )
                return (
                  <Group key={line.lineId}>
                    {own.map((e, i) => stroke(e.path, `extra-casing-${i}`, true))}
                    {own.filter((e) => !e.terminal).map((e, i) => stroke(e.path, `express-${i}`, false))}
                    {stroke(paths.get(line.lineId) as SkPath, "casing", true)}
                    {stroke(paths.get(line.lineId) as SkPath, "line", false)}
                    {own.filter((e) => e.terminal).map((e, i) => stroke(e.path, `stub-${i}`, false))}
                  </Group>
                )
              })}

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

              {/* Stretches served at irregular intervals: a stripe along the line, as in the original's legend. */}
              {model.irregular.map((stretch, i) =>
                isDimmed(stretch.lineId) ? null : (
                  <Path
                    key={`irregular-${i}`}
                    path={stripes[i]}
                    color={palette.background}
                    style="stroke"
                    strokeWidth={IRREGULAR_STRIPE_WIDTH}
                    strokeCap="butt"
                  />
                ),
              )}

              {/* Station markers: a dot where a line calls, a hollow circle where trains may pass, a ringed dot at a terminal. */}
              {markers.map((marker) => {
                const color = marker.dim ? palette.dimInk : palette.dot
                const key = `${marker.lineId}:${marker.stationId}`
                if (marker.kind === "irregular") {
                  return (
                    <Circle
                      key={key}
                      c={marker.point}
                      r={MARKER_RADIUS - IRREGULAR_STOP_STROKE / 2}
                      color={color}
                      style="stroke"
                      strokeWidth={IRREGULAR_STOP_STROKE}
                    />
                  )
                }
                return (
                  <Group key={key}>
                    <Circle c={marker.point} r={MARKER_RADIUS} color={color} />
                    {marker.kind === "terminal" && (
                      <Circle
                        c={marker.point}
                        r={TERMINAL_RING_RADIUS}
                        color={palette.background}
                        style="stroke"
                        strokeWidth={TERMINAL_RING_WIDTH}
                      />
                    )}
                  </Group>
                )
              })}

              {/* Terminal dots at the ends of the stubs. */}
              {extras.map((e, i) =>
                e.terminal ? (
                  <Group key={`extra-terminal-${i}`}>
                    <Circle c={e.terminal} r={MARKER_RADIUS} color={isDimmed(e.lineId) ? palette.dimInk : palette.dot} />
                    <Circle
                      c={e.terminal}
                      r={TERMINAL_RING_RADIUS}
                      color={palette.background}
                      style="stroke"
                      strokeWidth={TERMINAL_RING_WIDTH}
                    />
                  </Group>
                ) : null,
              )}

              {/* Line numbers beside the terminals. */}
              {badges.map((badge) => {
                const dim = isDimmed(badge.lineId)
                const outline = badge.line.badgeStyle === "outline"
                const fill = dim ? palette.dimLine : badge.line.color
                return (
                  <Group key={`${badge.lineId}:${badge.x}:${badge.y}`}>
                    <RoundedRect
                      x={badge.x}
                      y={badge.y}
                      width={BADGE_SIZE.width}
                      height={BADGE_SIZE.height}
                      r={BADGE_SIZE.radius}
                      color={outline ? palette.background : fill}
                    />
                    {outline && (
                      <RoundedRect
                        x={badge.x + 0.08}
                        y={badge.y + 0.08}
                        width={BADGE_SIZE.width - 0.16}
                        height={BADGE_SIZE.height - 0.16}
                        r={BADGE_SIZE.radius}
                        color={fill}
                        style="stroke"
                        strokeWidth={0.16}
                      />
                    )}
                    <Paragraph
                      paragraph={dim ? badge.dimParagraph : badge.paragraph}
                      x={badge.x}
                      y={badge.textY}
                      width={BADGE_SIZE.width}
                    />
                  </Group>
                )
              })}

              {/* The aeroplane over Ben Gurion Airport. */}
              <Path path={plane} color={palette.cityInk} />

              {/* Disruption badges on the affected stations. */}
              {disrupted.flatMap((section) =>
                isDimmed(section.lineId)
                  ? []
                  : section.points.map((p, i) => (
                      <Group key={`${section.key}-${i}`}>
                        <Circle c={p} r={1.5} color={palette.badge} />
                        <Circle c={p} r={1.5} color={palette.background} style="stroke" strokeWidth={0.3} />
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

              {/* City names in the corner of their frames. */}
              {cityLabels.map((label) => (
                <Paragraph key={label.id} paragraph={label.paragraph} x={label.x} y={label.y} width={label.width} />
              ))}
            </Group>
          </Canvas>
        )}
      </View>
    </GestureDetector>
  )
}

// --- helpers ----------------------------------------------------------------------------

type FontManager = NonNullable<ReturnType<typeof useFonts>>

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
  path.addRRect(Skia.RRectXY(Skia.XYWHRect(p.x - 0.25, p.y - 1, 0.5, 1.2), 0.25, 0.25))
  path.addCircle(p.x, p.y + 0.65, 0.28)
  return path
}

/** The aeroplane glyph, `height` tall, centred on `x` with its bottom at `bottom`. */
const planePath = (x: number, bottom: number, height: number): SkPath => {
  const path = Skia.Path.MakeFromSVGString(PLANE_D) as SkPath
  const s = height / 20 // the glyph's ink spans y 2…22 of its 24-unit box
  const matrix = Skia.Matrix()
  matrix.translate(x - 12 * s, bottom - 22 * s)
  matrix.scale(s, s)
  path.transform(matrix)
  return path
}

/** The station's name in the app's language, as the map sets it. */
const stationName = (stationId: string, stationNameOnly: boolean): string => {
  const station = stationsObject[stationId]
  const override = LABEL_TEXT_OVERRIDES[stationId] ?? {}
  const localized = { he: station?.hebrew, en: station?.english, ru: station?.russian, ar: station?.arabic }
  return mapStationName(override[userLocale] ?? localized[userLocale] ?? stationId, stationNameOnly)
}

type BuiltLabel = {
  stationId: string
  paragraph: SkParagraph
  dimParagraph: SkParagraph
  x: number
  y: number
  width: number
}

type TextRun = { text: string; size: number; color: string; weight?: number }

const makeParagraph = (fontMgr: FontManager, runs: TextRun[], textAlign: TextAlign, maxWidth: number): SkParagraph => {
  const builder = Skia.ParagraphBuilder.Make(
    {
      textAlign,
      textDirection: isRtlScript(runs[runs.length - 1].text) ? TextDirection.RTL : TextDirection.LTR,
      maxLines: 6,
    },
    fontMgr,
  )
  runs.forEach((run, i) => {
    builder
      .pushStyle({
        color: Skia.Color(run.color),
        fontFamilies: ["Heebo"],
        fontSize: run.size,
        fontStyle: { weight: run.weight ?? 400 },
        heightMultiplier: LABEL_LINE_HEIGHT,
      })
      .addText(i < runs.length - 1 ? `${run.text}\n` : run.text)
      .pop()
  })
  const paragraph = builder.build()
  paragraph.layout(maxWidth)
  return paragraph
}

/**
 * A two-part name ("Petah Tikva - Segula") that does not fit on one line is
 * set as two lines without the dash, the way the original wraps its names.
 */
const wrappedName = (fontMgr: FontManager, text: string, size: number, maxWidth: number): string => {
  if (!/\s[-–]\s/.test(text)) return text
  const probe = makeParagraph(fontMgr, [{ text, size, color: "#000" }], TextAlign.Left, maxWidth)
  return probe.getLineMetrics().length > 1 ? text.replace(/\s+[-–]\s+/g, "\n") : text
}

const buildLabel = (label: StationLabel, fontMgr: FontManager, palette: RailMapPalette): BuiltLabel => {
  const name = stationName(label.stationId, label.stationNameOnly)
  const size = nameFontSize(name)
  const text = wrappedName(fontMgr, name, size, label.maxWidth)
  const textAlign = label.side === "left" ? TextAlign.Right : label.side === "right" ? TextAlign.Left : TextAlign.Center
  const make = (ink: string) => makeParagraph(fontMgr, [{ text, size, color: ink, weight: 500 }], textAlign, label.maxWidth)
  const paragraph = make(palette.ink)
  const height = paragraph.getHeight()
  const x =
    label.side === "left"
      ? label.anchor.x - label.maxWidth
      : label.side === "right"
        ? label.anchor.x
        : label.anchor.x - label.maxWidth / 2
  const y =
    label.side === "above" ? label.anchor.y - height : label.side === "below" ? label.anchor.y : label.anchor.y - height / 2
  return {
    stationId: label.stationId,
    paragraph,
    dimParagraph: make(palette.dimInk),
    x,
    y,
    width: label.maxWidth,
  }
}

type BuiltCityLabel = { id: string; paragraph: SkParagraph; x: number; y: number; width: number }

const buildCityLabel = (city: CityBox, fontMgr: FontManager, palette: RailMapPalette): BuiltCityLabel => {
  const name = city.name[userLocale] ?? city.name.en
  const width = city.width - 2
  const size = CITY_FONT_SIZE * (isRtlScript(name) ? 1 : LATIN_SCALE)
  const paragraph = makeParagraph(fontMgr, [{ text: name, size, color: palette.cityInk, weight: 500 }], TextAlign.Left, width)
  return { id: city.id, paragraph, x: city.labelX, y: city.labelY - paragraph.getHeight(), width }
}

type BuiltBadge = {
  lineId: RailLineId
  line: TerminalBadge["line"]
  paragraph: SkParagraph
  dimParagraph: SkParagraph
  x: number
  y: number
  textY: number
}

const buildBadge = (badge: TerminalBadge, fontMgr: FontManager, palette: RailMapPalette): BuiltBadge => {
  const outline = badge.line.badgeStyle === "outline"
  const make = (color: string) => {
    const paragraph = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center, maxLines: 1 }, fontMgr)
      .pushStyle({ color: Skia.Color(color), fontFamilies: ["Heebo"], fontSize: BADGE_SIZE.fontSize, fontStyle: { weight: 500 } })
      .addText(badge.line.badge)
      .pop()
      .build()
    paragraph.layout(BADGE_SIZE.width)
    return paragraph
  }
  const paragraph = make(outline ? badge.line.color : badge.line.textColor)
  const x = badge.center.x - BADGE_SIZE.width / 2
  const y = badge.center.y - BADGE_SIZE.height / 2
  return {
    lineId: badge.lineId,
    line: badge.line,
    paragraph,
    dimParagraph: make(outline ? palette.dimLine : palette.background),
    x,
    y,
    textY: badge.center.y - paragraph.getHeight() / 2,
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
})
