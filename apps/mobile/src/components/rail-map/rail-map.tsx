import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type LayoutChangeEvent, StyleSheet, View, type ViewStyle, useColorScheme } from "react-native"
import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  Line,
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
import { useDerivedValue, useSharedValue, withDecay, withTiming } from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"
import { userLocale } from "@/i18n"
import { stationName } from "@/data/stations"
import type { RailLineId } from "@/data/rail-lines"
import type { LabelSide } from "@/data/rail-map-layout"
import { LANE_RANK, MAP_NAME_OVERRIDES } from "@/data/rail-map-layout"
import type { LineStatus, ServiceStatusSnapshot } from "@/services/api"
import {
  BADGE_RADIUS,
  CAPSULE_RING,
  CAPSULE_WIDTH,
  CITY_FONT_SIZE,
  FRAME_RADIUS,
  FRAME_STROKE,
  LABEL_LINE_HEIGHT,
  LATIN_SCALE,
  LINE_CASING,
  LINE_STROKE,
  TERMINAL_DOT_RADIUS,
  TICK_WIDTH,
  type CityFrameBox,
  type DayType,
  type LinePath,
  type Point,
  type RailMapModel,
  type PlacedLabel,
  type StationMark,
  type TextSize,
  buildRailMapModel,
  currentDayType,
  linePathBetween,
  isRtlScript,
  mapStationName,
  nameFontSize,
  nearestLine,
  nearestStation,
  placeLabels,
  stationPoint,
  tickFor,
} from "./rail-map-model"
import { RAIL_MAP_PALETTE, type RailMapPalette, paleColor } from "./rail-map-theme"

const HEEBO_FONTS = {
  Heebo: [require("../../../assets/fonts/Heebo-Regular.otf"), require("../../../assets/fonts/Heebo-Medium.otf")],
}

/** Blank margin around the drawing, in map units. */
const PAD = { left: 1, right: 1, top: 2, bottom: 3 }
const MIN_ZOOM = 0.9
const MAX_ZOOM = 6
/** How close (in map units) a tap must be to a line to select it. */
const TAP_TOLERANCE = 2.5
/** How close (in map units) a tap must be to a station's marker to select the station; markers sit on lines, so they come first. */
const STATION_TAP_TOLERANCE = 1.8
/** How far in the map zooms on a station, relative to the whole width fitting the view. */
const STATION_ZOOM = 3
/** The halo around a selected station: a soft disc over its marker, with a crisp rim; `pad` is the room past the marker. */
const SELECTED_STATION_HALO = { pad: 1.1, rim: 0.24, glow: 1.4 }

/** Material's "flight" glyph, 24 × 24, nose up. */
const PLANE_D =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"

export type RailMapProps = {
  /** Live status: flags the stations of every disrupted stretch on the map. */
  status?: ServiceStatusSnapshot | null
  /** Whose timetable to draw (which lines run, where they call and end); defaults to today's. */
  dayType?: DayType
  /** Draw this line in colour and everything else in grey, and scroll and zoom the view to it. */
  selectedLineId?: RailLineId | null
  /** Called with the tapped line, or null when tapping empty ground. */
  onSelectLine?: (lineId: RailLineId | null) => void
  /** Ring this station's marker, and scroll and zoom the view to it. */
  selectedStationId?: string | null
  /** Called with the tapped station: its marker, or its name. Stations win over the lines their markers sit on. */
  onSelectStation?: (stationId: string) => void
  /** Edges of the view covered by other UI (a translucent header, a sheet): the initial and focused views keep clear of them. */
  insets?: RailMapInsets
  style?: ViewStyle
}

export type RailMapInsets = { top?: number; bottom?: number }

type Size = { width: number; height: number }

type Viewport = {
  /** Map units → pixels. */
  scale: number
  translateX: number
  translateY: number
}

/** The view that shows the whole map width from below the top inset, or the line's extent between the insets when focusing. */
const initialViewport = (model: RailMapModel, size: Size, focus?: LinePath, insets?: RailMapInsets): Viewport => {
  const top = insets?.top ?? 0
  const bottom = insets?.bottom ?? 0
  const contentWidth = model.bounds.width + PAD.left + PAD.right
  const fitWidth = size.width / contentWidth
  if (!focus || size.height === 0) {
    return { scale: fitWidth, translateX: PAD.left * fitWidth, translateY: PAD.top * fitWidth + top }
  }

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
  // Room for the names on either side of the line.
  const margin = 26
  const width = maxX - minX + margin * 2
  const height = maxY - minY + margin
  // What the insets leave uncovered, never less than a quarter of the view should they be excessive.
  const visibleHeight = Math.max(size.height - top - bottom, size.height / 4)
  const scale = Math.min(Math.max(Math.min(size.width / width, visibleHeight / height), fitWidth * MIN_ZOOM), fitWidth * MAX_ZOOM)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  return { scale, translateX: size.width / 2 - centerX * scale, translateY: top + visibleHeight / 2 - centerY * scale }
}

/** The view zoomed in on a point, centred in the part of the view the insets leave uncovered. */
const pointViewport = (model: RailMapModel, size: Size, point: Point, insets?: RailMapInsets): Viewport => {
  const top = insets?.top ?? 0
  const bottom = insets?.bottom ?? 0
  const fitWidth = size.width / (model.bounds.width + PAD.left + PAD.right)
  const scale = Math.min(Math.max(fitWidth * STATION_ZOOM, fitWidth * MIN_ZOOM), fitWidth * MAX_ZOOM)
  const visibleHeight = Math.max(size.height - top - bottom, size.height / 4)
  return { scale, translateX: size.width / 2 - point.x * scale, translateY: top + visibleHeight / 2 - point.y * scale }
}

const clamp = (value: number, min: number, max: number): number => {
  "worklet"
  return Math.min(Math.max(value, min), max)
}

export function RailMap({
  status,
  dayType,
  selectedLineId,
  onSelectLine,
  selectedStationId,
  onSelectStation,
  insets,
  style,
}: RailMapProps) {
  const scheme = useColorScheme()
  const palette = RAIL_MAP_PALETTE[scheme === "dark" ? "dark" : "light"]
  const model = useMemo(() => buildRailMapModel(dayType ?? currentDayType()), [dayType])
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
  const insetTop = useSharedValue(insets?.top ?? 0)
  const insetBottom = useSharedValue(insets?.bottom ?? 0)
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
    () => (selectedLineId ? model.lines.find((l) => l.lineId === selectedLineId) : undefined),
    [model, selectedLineId],
  )
  const focusPoint = useMemo(
    () => (selectedStationId ? stationPoint(model, selectedStationId) : undefined),
    [model, selectedStationId],
  )
  const laidOut = size.width > 0
  // The insets in force when a view is next chosen: a change of insets on its own does not move the map.
  const insetsRef = useRef(insets)
  useEffect(() => {
    insetsRef.current = insets
    insetTop.value = insets?.top ?? 0
    insetBottom.value = insets?.bottom ?? 0
  }, [insets, insetTop, insetBottom])

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width === size.width && height === size.height) return
    setSize({ width, height })
    const fitWidth = width / contentWidth
    minScale.value = fitWidth * MIN_ZOOM
    maxScale.value = fitWidth * MAX_ZOOM
    viewportWidth.value = width
    viewportHeight.value = height
    const view = focusPoint
      ? pointViewport(model, { width, height }, focusPoint, insetsRef.current)
      : initialViewport(model, { width, height }, focusLine, insetsRef.current)
    showViewport(view, false)
  }

  // Glide to the focused line or station when it changes after the first layout, and back to the whole network once it clears.
  const wasFocused = useRef(false)
  useEffect(() => {
    if (!laidOut) return
    if (focusPoint) {
      wasFocused.current = true
      showViewport(pointViewport(model, size, focusPoint, insetsRef.current), true)
    } else if (focusLine) {
      wasFocused.current = true
      showViewport(initialViewport(model, size, focusLine, insetsRef.current), true)
    } else if (wasFocused.current) {
      wasFocused.current = false
      showViewport(initialViewport(model, size, undefined, insetsRef.current), true)
    }
    // `size` is deliberately not a dependency: layout changes are handled by onLayout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLine, focusPoint, laidOut, model, showViewport])

  // The names as laid out, for taps on them; filled in once the fonts are loaded (below).
  const labelsRef = useRef<BuiltLabel[]>([])

  const handleTap = (x: number, y: number) => {
    const p = { x, y }
    if (onSelectStation) {
      const station = nearestStation(model, p, STATION_TAP_TOLERANCE)?.stationId ?? labelAt(labelsRef.current, p)
      if (station) {
        onSelectStation(station)
        return
      }
    }
    if (!onSelectLine) return
    const hit = nearestLine(model, p, TAP_TOLERANCE)
    onSelectLine(hit?.lineId ?? null)
  }

  // The tap handler reads the latest props through a ref, so the gestures need not be rebuilt on every render.
  const handleTapRef = useRef(handleTap)
  handleTapRef.current = handleTap
  const tapAt = useCallback((x: number, y: number) => handleTapRef.current(x, y), [])

  // Built once: the worklets read the shared values, which are stable, and the content size, which is constant.
  const gesture = useMemo(() => {
    /** How far the drawing may be moved at scale `s`: it stays in the uncovered part of the view, with half of it as overscroll at most. */
    const translationBounds = (s: number) => {
      "worklet"
      const w = (contentWidth + PAD.left) * s
      const h = contentHeight * s
      const visibleTop = insetTop.value
      const visibleBottom = viewportHeight.value - insetBottom.value
      const visibleMid = (visibleTop + visibleBottom) / 2
      return {
        minX: Math.min(viewportWidth.value - w, viewportWidth.value / 2),
        maxX: Math.max(PAD.left * s, viewportWidth.value / 2),
        minY: Math.min(visibleBottom - h, visibleMid),
        maxY: Math.max(visibleTop, visibleMid),
      }
    }

    const clampTranslation = (s: number, tx: number, ty: number): [number, number] => {
      "worklet"
      const b = translationBounds(s)
      return [clamp(tx, b.minX, b.maxX), clamp(ty, b.minY, b.maxY)]
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
      // Let go and the map glides on a little, slowing down, and stops at the edges.
      .onEnd((e) => {
        const b = translationBounds(scale.value)
        translateX.value = withDecay({ velocity: e.velocityX, clamp: [b.minX, b.maxX], deceleration: 0.995 })
        translateY.value = withDecay({ velocity: e.velocityY, clamp: [b.minY, b.maxY], deceleration: 0.995 })
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

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd((e) => {
        const x = (e.x - translateX.value) / scale.value
        const y = (e.y - translateY.value) / scale.value
        scheduleOnRN(tapAt, x, y)
      })

    return Gesture.Race(tap, Gesture.Simultaneous(pan, pinch))
  }, [
    contentWidth,
    contentHeight,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    minScale,
    maxScale,
    viewportWidth,
    viewportHeight,
    insetTop,
    insetBottom,
    tapAt,
  ])

  const transform = useDerivedValue(() => [
    { translateX: translateX.value },
    { translateY: translateY.value },
    { scale: scale.value },
  ])

  // --- drawing data --------------------------------------------------------------------
  const paths = useMemo(() => new Map(model.lines.map((l) => [l.lineId, Skia.Path.MakeFromSVGString(l.d) as SkPath])), [model])

  // Keyed on the lines, not the snapshot: a refresh that changes nothing keeps them the same objects.
  const lineStatuses = status?.lines
  const disrupted = useMemo(() => collectDisruptedSections(model, lineStatuses), [model, lineStatuses])

  // The names' places and the city frames: measured with the real text, once per map and font.
  const placement = useMemo(() => {
    if (!fontMgr) return { labels: [], frames: [] }
    const probes = new Map<string, TextSize>()
    const measure = (stationId: string, maxWidth: number): TextSize => {
      const key = `${stationId}@${maxWidth}`
      const known = probes.get(key)
      if (known) return known
      const nameOnly = model.labels.find((l) => l.stationId === stationId)?.stationNameOnly ?? false
      const name = labelText(stationId, nameOnly)
      const size = nameFontSize(name)
      const paragraph = makeParagraph(
        fontMgr,
        [{ text: wrappedName(fontMgr, name, size, maxWidth), size, color: "#000", weight: 500 }],
        TextAlign.Left,
        maxWidth,
      )
      const lines = Math.max(1, paragraph.getLineMetrics().length)
      const measured = {
        width: Math.min(paragraph.getLongestLine(), maxWidth),
        height: blockHeight(paragraph.getHeight() / lines, lines, size),
      }
      probes.set(key, measured)
      return measured
    }
    return placeLabels(model, measure)
  }, [fontMgr, model])
  const labelSides = useMemo(() => new Map(placement.labels.map((l) => [l.stationId, l.side])), [placement])

  const labels = useMemo(() => {
    if (!fontMgr) return []
    return placement.labels.map((label) => buildLabel(label, fontMgr, palette))
  }, [fontMgr, placement, palette])
  labelsRef.current = labels

  const cityLabels = useMemo(() => {
    if (!fontMgr) return []
    return placement.frames.map((frame) => buildCityLabel(frame, fontMgr, palette))
  }, [fontMgr, placement, palette])

  // The aeroplane after the airport's name.
  const plane = useMemo(() => {
    const label = labels.find((l) => l.stationId === model.airport.stationId)
    if (!label) return undefined
    const x = label.side === "left" ? label.ink.left - model.airport.height * 0.7 : label.ink.right + model.airport.height * 0.7
    return planePath(x, (label.ink.top + label.ink.bottom) / 2, model.airport.height)
  }, [labels, model])

  const isDimmed = (lineId: RailLineId) => selectedLineId != null && lineId !== selectedLineId
  // On an affected line, the badge takes the marker's place on that lane; neighbouring affected lanes share one
  // badge capsule (lines dimmed by a selection get none).
  const badges = useMemo(() => {
    const affected = new Map<string, Set<RailLineId>>()
    for (const section of disrupted) {
      if (selectedLineId != null && section.lineId !== selectedLineId) continue
      for (const id of section.stationIds) affected.set(id, (affected.get(id) ?? new Set()).add(section.lineId))
    }
    const out: { key: string; from: Point; to: Point; glyph: SkPath }[] = []
    for (const mark of model.marks) {
      const lines = affected.get(mark.stationId)
      if (!lines) continue
      let run: Point[] = []
      const flush = () => {
        if (run.length) {
          const from = run[0]
          const to = run[run.length - 1]
          const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
          out.push({ key: `${mark.stationId}:${out.length}`, from, to, glyph: exclamationPath(mid, BADGE_RADIUS) })
        }
        run = []
      }
      for (const lane of mark.lanes) {
        if (!lane.calls || !lines.has(lane.lineId)) {
          if (lane.calls) flush()
          continue
        }
        const last = run[run.length - 1]
        if (!last || last.x !== lane.point.x || last.y !== lane.point.y) run.push(lane.point)
      }
      flush()
    }
    return out
  }, [disrupted, model, selectedLineId])
  // West to east, so a line crossing its neighbours is drawn over the ones it leaves behind; the selected line on top.
  const orderedLines = useMemo(
    () =>
      [...model.lines].sort((a, b) => {
        if (a.lineId === selectedLineId) return 1
        if (b.lineId === selectedLineId) return -1
        return LANE_RANK[a.lineId] - LANE_RANK[b.lineId]
      }),
    [model, selectedLineId],
  )
  /** Whether the station is on the selected line (all are, with none selected). */
  const onSelectedLine = (mark: StationMark) =>
    selectedLineId == null || mark.lanes.some((l) => l.calls && l.lineId === selectedLineId)

  const selectedStation = useMemo(() => {
    if (!selectedStationId) return undefined
    const mark = model.marks.find((m) => m.stationId === selectedStationId)
    if (!mark) return undefined
    const radius = Math.hypot(mark.box.right - mark.box.left, mark.box.bottom - mark.box.top) / 2
    return { centre: mark.centre, radius: radius + SELECTED_STATION_HALO.pad }
  }, [model, selectedStationId])

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.container, { backgroundColor: palette.background }, style]} onLayout={onLayout} testID="rail-map">
        {laidOut && (
          <Canvas style={StyleSheet.absoluteFill}>
            <Fill color={palette.background} />
            <Group transform={transform}>
              {/* The frames around the big cities. */}
              {placement.frames.map((frame) => (
                <RoundedRect
                  key={frame.id}
                  x={frame.box.left}
                  y={frame.box.top}
                  width={frame.box.right - frame.box.left}
                  height={frame.box.bottom - frame.box.top}
                  r={FRAME_RADIUS}
                  color={palette.frame}
                  style="stroke"
                  strokeWidth={FRAME_STROKE}
                />
              ))}

              {/* Lines on their casings: the casing outlines a line where it crosses another. */}
              {orderedLines.map((line) => {
                const path = paths.get(line.lineId) as SkPath
                const color = isDimmed(line.lineId) ? palette.dimLine : line.line.color
                return (
                  <Group key={line.lineId}>
                    <Path
                      path={path}
                      color={palette.background}
                      style="stroke"
                      strokeWidth={LINE_CASING}
                      strokeCap="round"
                      strokeJoin="round"
                    />
                    <Path
                      path={path}
                      color={color}
                      style="stroke"
                      strokeWidth={LINE_STROKE}
                      strokeCap="round"
                      strokeJoin="round"
                    />
                  </Group>
                )
              })}

              {/* Disrupted stretches: the line fades out where trains do not run. */}
              {disrupted.map((section) =>
                isDimmed(section.lineId) || !section.fade ? null : (
                  <Group key={section.key}>
                    <Path
                      path={section.path}
                      color={palette.background}
                      style="stroke"
                      strokeWidth={LINE_STROKE + 0.2}
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

              {/* Station markers: a tick beside a lone line, a capsule across the lanes that call, dashed where trains may pass. */}
              {model.marks.map((mark) => {
                const ink = onSelectedLine(mark) ? palette.marker : palette.dimInk
                return (
                  <Group key={mark.stationId}>
                    {mark.lone &&
                      (() => {
                        const tick = tickFor(mark, labelSides.get(mark.stationId) ?? "left")
                        return (
                          <Line
                            p1={vec(tick.from.x, tick.from.y)}
                            p2={vec(tick.to.x, tick.to.y)}
                            color={ink}
                            strokeWidth={TICK_WIDTH}
                          />
                        )
                      })()}
                    {mark.capsules.map((c, i) => (
                      <Group key={i}>
                        <Line
                          p1={vec(c.from.x, c.from.y)}
                          p2={vec(c.to.x, c.to.y)}
                          color={ink}
                          strokeWidth={CAPSULE_WIDTH}
                          strokeCap="round"
                        />
                        <Line
                          p1={vec(c.from.x, c.from.y)}
                          p2={vec(c.to.x, c.to.y)}
                          color={palette.markerFill}
                          strokeWidth={CAPSULE_WIDTH - CAPSULE_RING * 2}
                          strokeCap="round"
                        />
                      </Group>
                    ))}
                    {mark.irregular.map((p, i) => (
                      <Group key={`irregular-${i}`}>
                        <Circle c={p} r={(CAPSULE_WIDTH - CAPSULE_RING) / 2} color={palette.markerFill} />
                        <Circle
                          c={p}
                          r={(CAPSULE_WIDTH - CAPSULE_RING) / 2}
                          color={onSelectedLine(mark) ? palette.dimInk : palette.dimLine}
                          style="stroke"
                          strokeWidth={CAPSULE_RING}
                        />
                      </Group>
                    ))}
                    {mark.terminals.map((p, i) => (
                      <Circle key={`terminal-${i}`} c={p} r={TERMINAL_DOT_RADIUS} color={ink} />
                    ))}
                  </Group>
                )
              })}

              {/* The selected station: a soft glow under a translucent disc over its marker, with a crisp rim. */}
              {selectedStation && (
                <Group>
                  <Circle
                    c={selectedStation.centre}
                    r={selectedStation.radius + SELECTED_STATION_HALO.glow}
                    color={palette.selection}
                    opacity={0.22}
                  >
                    <BlurMask blur={SELECTED_STATION_HALO.glow} style="normal" />
                  </Circle>
                  <Circle c={selectedStation.centre} r={selectedStation.radius} color={palette.selection} opacity={0.18} />
                  <Circle
                    c={selectedStation.centre}
                    r={selectedStation.radius}
                    color={palette.selection}
                    style="stroke"
                    strokeWidth={SELECTED_STATION_HALO.rim}
                  />
                </Group>
              )}

              {/* Disruption badges, in place of the markers on the affected lanes. */}
              {badges.map(({ key, from, to, glyph }) => (
                <Group key={key}>
                  <Line
                    p1={vec(from.x, from.y)}
                    p2={vec(to.x, to.y)}
                    color={palette.background}
                    strokeWidth={BADGE_RADIUS * 2 + 0.44}
                    strokeCap="round"
                  />
                  <Line
                    p1={vec(from.x, from.y)}
                    p2={vec(to.x, to.y)}
                    color={palette.badge}
                    strokeWidth={BADGE_RADIUS * 2}
                    strokeCap="round"
                  />
                  <Path path={glyph} color={palette.badgeInk} />
                </Group>
              ))}

              {/* Station names. */}
              {labels.flatMap((label) => {
                const mark = model.marks.find((m) => m.stationId === label.stationId)
                const dim = mark ? !onSelectedLine(mark) : false
                return label.lines.map((line, i) => (
                  <Paragraph
                    key={`${label.stationId}-${i}`}
                    paragraph={dim ? line.dimParagraph : line.paragraph}
                    x={label.x}
                    y={line.y}
                    width={label.width}
                  />
                ))
              })}

              {/* The aeroplane beside Ben Gurion Airport. */}
              {plane && <Path path={plane} color={palette.cityInk} />}

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
  /** Whether the line fades along the stretch: trains do not run it. Skipped stops only get badges. */
  fade: boolean
  /** The stations the disruption concerns. */
  stationIds: string[]
}

const collectDisruptedSections = (model: RailMapModel, lines?: LineStatus[]): DisruptedSection[] => {
  if (!lines) return []
  const sections: DisruptedSection[] = []
  for (const lineStatus of lines) {
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
        fade: disruption.kind !== "skippedStops",
        stationIds,
      })
    }
  }
  return sections
}

/** A small "!" centred on `p`, sized for a badge disc of radius `r`. */
const exclamationPath = (p: Point, r: number): SkPath => {
  const s = r / 1.4
  const path = Skia.Path.Make()
  path.addRRect(Skia.RRectXY(Skia.XYWHRect(p.x - 0.24 * s, p.y - 0.95 * s, 0.48 * s, 1.15 * s), 0.24 * s, 0.24 * s))
  path.addCircle(p.x, p.y + 0.62 * s, 0.27 * s)
  return path
}

/** The aeroplane glyph, `height` tall, centred on (`x`, `y`). */
const planePath = (x: number, y: number, height: number): SkPath => {
  const path = Skia.Path.MakeFromSVGString(PLANE_D) as SkPath
  const s = height / 20 // the glyph's ink spans y 2…22 of its 24-unit box
  const matrix = Skia.Matrix()
  matrix.translate(x - 12 * s, y - 12 * s)
  matrix.scale(s, s)
  path.transform(matrix)
  return path
}

/** The station's name as the app shows it (the airport's shortened), less the city inside a city frame. */
const labelText = (stationId: string, stationNameOnly: boolean): string =>
  mapStationName(MAP_NAME_OVERRIDES[stationId]?.[userLocale] ?? stationName(stationId), stationNameOnly)

type BuiltLabel = {
  stationId: string
  side: LabelSide
  /** One paragraph per line, set at a tight pitch (see blockHeight), each with its top. */
  lines: { paragraph: SkParagraph; dimParagraph: SkParagraph; y: number }[]
  x: number
  width: number
  /** Where the name's ink is, within the paragraph's box (it is aligned towards the station), for taps on it. */
  ink: { left: number; top: number; right: number; bottom: number }
}

/** The station whose name is under `p`, with a little slack around the letters. */
const labelAt = (labels: BuiltLabel[], p: Point): string | undefined => {
  const slack = 0.6
  return labels.find(
    (l) => p.x >= l.ink.left - slack && p.x <= l.ink.right + slack && p.y >= l.ink.top - slack && p.y <= l.ink.bottom + slack,
  )?.stationId
}

type TextRun = { text: string; size: number; color: string; weight?: number; letterSpacing?: number }

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
        // No height multiplier: with one, Skia reports a baseline other than the one it draws at, and names sit high.
        // Only when set: Skia rejects an undefined value for a key that is present.
        ...(run.letterSpacing === undefined ? {} : { letterSpacing: run.letterSpacing }),
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
 * set as two lines without the dash, as the Tube map wraps its names.
 */
const wrappedName = (fontMgr: FontManager, text: string, size: number, maxWidth: number): string => {
  if (!/\s[-–]\s/.test(text)) return text
  const probe = makeParagraph(fontMgr, [{ text, size, color: "#000" }], TextAlign.Left, maxWidth)
  return probe.getLineMetrics().length > 1 ? text.replace(/\s+[-–]\s+/g, "\n") : text
}

/** How far above the marker's centre the letters still read on device once centred on their ink, in font sizes. */
const LETTERS_OPTICAL_SHIFT = 0.1

/** Where the middle of the text's ink is, relative to its baseline (negative: above it), in map units. */
const inkMiddle = (fontMgr: FontManager, text: string, size: number): number => {
  const typeface = fontMgr.matchFamilyStyle("Heebo", { weight: 500 })
  if (!typeface) return -size * 0.3
  const bounds = Skia.Font(typeface, size).measureText(text)
  return bounds.y + bounds.height / 2
}

/** The pitch between the lines of a wrapped name: tighter than the font's natural line box. */
const linePitch = (size: number): number => size * LABEL_LINE_HEIGHT

/** The height a name of `lines` lines fills, each line's box `lineHeight` tall, set at the tight pitch. */
const blockHeight = (lineHeight: number, lines: number, size: number): number => lineHeight + (lines - 1) * linePitch(size)

const buildLabel = (label: PlacedLabel, fontMgr: FontManager, palette: RailMapPalette): BuiltLabel => {
  const name = labelText(label.stationId, label.stationNameOnly)
  const size = nameFontSize(name)
  const text = wrappedName(fontMgr, name, size, label.maxWidth)
  // Towards the marker: Skia's Left and Right are absolute, whichever way the script runs.
  const textAlign = label.side === "left" ? TextAlign.Right : label.side === "right" ? TextAlign.Left : TextAlign.Center
  const make = (line: string, ink: string) =>
    makeParagraph(fontMgr, [{ text: line, size, color: ink, weight: 500 }], textAlign, label.maxWidth)
  // The lines the name wraps to at this width, each set as a paragraph of its own so their pitch can be tight.
  const whole = make(text, palette.ink)
  const lineTexts = whole.getLineMetrics().map((m) => text.slice(m.startIndex, m.endIndex).replace(/\s+$/, ""))
  if (lineTexts.length === 0) lineTexts.push(text)
  const paragraphs = lineTexts.map((line) => ({ paragraph: make(line, palette.ink), dimParagraph: make(line, palette.dimInk) }))
  const lineHeight = paragraphs[0].paragraph.getHeight()
  const height = blockHeight(lineHeight, paragraphs.length, size)
  const x =
    label.side === "left"
      ? label.anchor.x - label.maxWidth
      : label.side === "right"
        ? label.anchor.x
        : label.anchor.x - label.maxWidth / 2
  // Beside a marker the letters, not the line box, are centred on it: the letters' middle is measured from their ink
  // bounds relative to the baseline, and the block's middle is between the first and last lines' letters.
  const baseline = paragraphs[0].paragraph.getLineMetrics()[0]?.baseline ?? lineHeight / 2
  const ink = inkMiddle(fontMgr, lineTexts[0], size)
  const lettersMiddle = baseline + ((paragraphs.length - 1) * linePitch(size)) / 2 + ink - LETTERS_OPTICAL_SHIFT * size
  const top =
    label.side === "above" ? label.anchor.y - height : label.side === "below" ? label.anchor.y : label.anchor.y - lettersMiddle
  const inkWidth = Math.min(Math.max(...paragraphs.map((p) => p.paragraph.getLongestLine())), label.maxWidth)
  const inkLeft =
    label.side === "left" ? x + label.maxWidth - inkWidth : label.side === "right" ? x : x + (label.maxWidth - inkWidth) / 2
  return {
    stationId: label.stationId,
    side: label.side,
    lines: paragraphs.map((p, i) => ({ ...p, y: top + i * linePitch(size) })),
    x,
    width: label.maxWidth,
    ink: { left: inkLeft, top, right: inkLeft + inkWidth, bottom: top + height },
  }
}

type BuiltCityLabel = { id: string; paragraph: SkParagraph; x: number; y: number; width: number }

/** A city's name inside its frame: left edge and baseline at the frame's caption point. */
const buildCityLabel = (frame: CityFrameBox, fontMgr: FontManager, palette: RailMapPalette): BuiltCityLabel => {
  const name = frame.name[userLocale] ?? frame.name.en
  const width = frame.box.right - frame.box.left - 2
  const size = CITY_FONT_SIZE * (isRtlScript(name) ? 1 : LATIN_SCALE)
  const paragraph = makeParagraph(fontMgr, [{ text: name, size, color: palette.cityInk, weight: 500 }], TextAlign.Left, width)
  return { id: frame.id, paragraph, x: frame.caption.x, y: frame.caption.y - paragraph.getHeight() * 0.82, width }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
})
