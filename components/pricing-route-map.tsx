"use client"

import * as React from "react"
import type { Feature, Polygon } from "geojson"
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl"
import { MapPin } from "lucide-react"
import {
  Map,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MapRoute,
  MapControls,
  useMap,
} from "@/components/ui/map"
import type { RoutePricingStop } from "@/lib/along-route-stops"
import { selectVisiblePriceStops } from "@/lib/pricing-route-visibility"
import type { LngLat } from "@/lib/trips"
import { cn } from "@/lib/utils"

const DEFAULT_CENTER: [number, number] = [-98.5, 39.5]
const DEFAULT_ZOOM = 6
const SINGLE_POINT_ZOOM = 13
const FLY_DURATION_MS = 600
const DEFAULT_PADDING = 100

const ROUTE_LINE_SELECTED = "#2563eb"
const ROUTE_LINE_ALT = "#64748b"

const EARTH_RADIUS_M = 6_371_000

/** Closed ring [lng, lat] for a geodesic circle on the sphere */
function ringGeodesicCircle(
  centerLng: number,
  centerLat: number,
  radiusMeters: number,
  steps = 72
): [number, number][] {
  const ring: [number, number][] = []
  const δ = radiusMeters / EARTH_RADIUS_M
  const φ1 = (centerLat * Math.PI) / 180
  const λ1 = (centerLng * Math.PI) / 180

  for (let i = 0; i <= steps; i++) {
    const θ = (i / steps) * 2 * Math.PI
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    )
    const λ2 =
      λ1 +
      Math.atan2(
        Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
        Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
      )
    ring.push([(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI])
  }
  return ring
}

function circlePolygonGeoJson(
  centerLng: number,
  centerLat: number,
  radiusMeters: number
): Feature<Polygon> {
  const ring = ringGeodesicCircle(centerLng, centerLat, radiusMeters)
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  }
}

function formatGalAria(price: number): string {
  const whole = Math.floor(price)
  const cents = Math.round((price - whole) * 100)
  return `${whole} dollars and ${cents} cents per gallon`
}

function FitSinglePoint({ coords }: { coords: LngLat }) {
  const { map, isLoaded } = useMap()
  const lng = coords[0]
  const lat = coords[1]

  React.useEffect(() => {
    if (!isLoaded || !map) return
    map.resize()
    map.flyTo({
      center: [lng, lat],
      zoom: SINGLE_POINT_ZOOM,
      duration: FLY_DURATION_MS,
    })
  }, [map, isLoaded, lng, lat])

  return null
}

function FitRouteBounds({
  originCoords,
  destinationCoords,
  /** All polyline vertices (e.g. every alternative) for bbox */
  boundsPathCoordinates,
  priceCoords = [],
  mapLeftPadding = 0,
  mapBottomPadding = 0,
}: {
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  boundsPathCoordinates: LngLat[]
  priceCoords?: LngLat[]
  mapLeftPadding?: number
  mapBottomPadding?: number
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return
    if (!originCoords || !destinationCoords) return

    map.resize()

    let minLng = Math.min(originCoords[0], destinationCoords[0])
    let maxLng = Math.max(originCoords[0], destinationCoords[0])
    let minLat = Math.min(originCoords[1], destinationCoords[1])
    let maxLat = Math.max(originCoords[1], destinationCoords[1])

    if (boundsPathCoordinates.length >= 2) {
      for (const [lng, lat] of boundsPathCoordinates) {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    }

    for (const [lng, lat] of priceCoords) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: {
          left: mapLeftPadding,
          right: DEFAULT_PADDING,
          top: DEFAULT_PADDING,
          bottom: Math.max(DEFAULT_PADDING, mapBottomPadding),
        },
        // Keep initial framing relatively zoomed out so price pills stay sparse;
        // users zoom in for more stations (see selectVisiblePriceStops).
        maxZoom: 9,
        duration: FLY_DURATION_MS,
      }
    )
  }, [
    map,
    isLoaded,
    originCoords,
    destinationCoords,
    boundsPathCoordinates,
    priceCoords,
    mapLeftPadding,
    mapBottomPadding,
  ])

  return null
}

function FitAreaBounds({
  center,
  radiusMeters,
  priceCoords = [],
  mapLeftPadding = 0,
  mapBottomPadding = 0,
}: {
  center: LngLat
  radiusMeters: number
  priceCoords?: LngLat[]
  mapLeftPadding?: number
  mapBottomPadding?: number
}) {
  const { map, isLoaded } = useMap()
  const centerLng = center[0]
  const centerLat = center[1]

  const ring = React.useMemo(
    () => ringGeodesicCircle(centerLng, centerLat, radiusMeters),
    [centerLng, centerLat, radiusMeters]
  )

  React.useEffect(() => {
    if (!isLoaded || !map) return

    map.resize()

    let minLng = Infinity
    let maxLng = -Infinity
    let minLat = Infinity
    let maxLat = -Infinity

    for (const [lng, lat] of ring) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }

    for (const [lng, lat] of priceCoords) {
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    }

    if (!Number.isFinite(minLng)) return

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: {
          left: mapLeftPadding,
          right: DEFAULT_PADDING,
          top: DEFAULT_PADDING,
          bottom: Math.max(DEFAULT_PADDING, mapBottomPadding),
        },
        maxZoom: 11,
        duration: FLY_DURATION_MS,
      }
    )
  }, [map, isLoaded, ring, priceCoords, mapLeftPadding, mapBottomPadding])

  return null
}

function MapSearchRadiusCircle({
  center,
  radiusMeters,
}: {
  center: LngLat
  radiusMeters: number
}) {
  const { map, isLoaded } = useMap()
  const sourceId = "pricing-search-radius-geo"
  const fillLayerId = "pricing-search-radius-fill"
  const outlineLayerId = "pricing-search-radius-outline"
  const centerLng = center[0]
  const centerLat = center[1]

  const geojson = React.useMemo(
    () => circlePolygonGeoJson(centerLng, centerLat, radiusMeters),
    [centerLng, centerLat, radiusMeters]
  )

  React.useEffect(() => {
    if (!isLoaded || !map) return

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[]] },
      },
    })

    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": ROUTE_LINE_SELECTED,
        "fill-opacity": 0.1,
      },
    })

    map.addLayer({
      id: outlineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": ROUTE_LINE_SELECTED,
        "line-width": 2,
        "line-opacity": 0.55,
      },
    })

    return () => {
      try {
        if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId)
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {
        // ignore
      }
    }
  }, [isLoaded, map])

  React.useEffect(() => {
    if (!isLoaded || !map) return
    const source = map.getSource(sourceId) as GeoJSONSource | undefined
    if (source) {
      source.setData(geojson)
    }
  }, [isLoaded, map, geojson])

  return null
}

/** Tap/click a route line to select it (like Google Maps). */
function PricingRouteLinePicker({
  routeCount,
  onSelectRoute,
}: {
  routeCount: number
  onSelectRoute: (index: number) => void
}) {
  const { map, isLoaded } = useMap()
  const onSelectRef = React.useRef(onSelectRoute)

  React.useEffect(() => {
    onSelectRef.current = onSelectRoute
  }, [onSelectRoute])

  React.useEffect(() => {
    if (!map || !isLoaded || routeCount < 2) return

    const layers = Array.from(
      { length: routeCount },
      (_, i) => `route-layer-pricing-alt-${i}`
    )

    const handleClick = (e: MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, { layers })
      if (!feats.length) return
      const lid = feats[0]?.layer?.id
      if (!lid || typeof lid !== "string") return
      const m = /^route-layer-pricing-alt-(\d+)$/.exec(lid)
      if (m) {
        const idx = Number(m[1])
        if (Number.isFinite(idx) && idx >= 0 && idx < routeCount) {
          onSelectRef.current(idx)
        }
      }
    }

    map.on("click", handleClick)
    return () => {
      map.off("click", handleClick)
    }
  }, [map, isLoaded, routeCount])

  return null
}

function PricingPriceMarkers({
  stops,
  lowestYourPrice,
  mapContainerRef,
}: {
  stops: RoutePricingStop[]
  lowestYourPrice: number | null
  mapContainerRef: React.RefObject<HTMLDivElement | null>
}) {
  const { map, isLoaded } = useMap()
  const [zoom, setZoom] = React.useState(6)
  const [containerWidth, setContainerWidth] = React.useState(400)

  React.useEffect(() => {
    const el = mapContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth)
    })
    ro.observe(el)
    setContainerWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [mapContainerRef])

  React.useEffect(() => {
    if (!map || !isLoaded) return

    let raf = 0
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setZoom(map.getZoom())
      })
    }

    sync()
    // `zoom` fires during wheel / pinch / zoomTo animations; moveend alone can miss updates.
    map.on("zoom", sync)
    map.on("moveend", sync)
    map.on("zoomend", sync)
    map.on("pitchend", sync)

    return () => {
      cancelAnimationFrame(raf)
      map.off("zoom", sync)
      map.off("moveend", sync)
      map.off("zoomend", sync)
      map.off("pitchend", sync)
    }
  }, [map, isLoaded])

  const visibleStops = React.useMemo(
    () => selectVisiblePriceStops(stops, zoom, containerWidth),
    [stops, zoom, containerWidth]
  )

  const total = stops.length
  const showingPartial = total > 0 && visibleStops.length < total

  return (
    <>
      {showingPartial ? (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-[15] max-w-[min(100%,20rem)] -translate-x-1/2 px-3">
          <p className="rounded-full border border-border bg-background/90 px-3 py-1.5 text-center text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm sm:text-xs">
            Zoom in to see more prices
            <span className="sr-only">
              {`, showing ${visibleStops.length} of ${total} stations`}
            </span>
          </p>
        </div>
      ) : null}
      {visibleStops.map((stop) => {
        const isLowest =
          lowestYourPrice != null && Math.abs(stop.yourPrice - lowestYourPrice) < 1e-6
        const stationTitle = stop.stationName ?? stop.label
        const address = stop.addressLine
        const aria = `Fuel option, ${formatGalAria(stop.yourPrice)}, ${stop.label}`
        return (
          <MapMarker key={stop.id} longitude={stop.lng} latitude={stop.lat}>
            <MarkerContent>
              <div
                role="img"
                aria-label={aria}
                className={cn(
                  "max-w-[min(92px,22vw)] truncate rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold leading-tight tabular-nums text-foreground shadow-md sm:text-[11px]",
                  isLowest &&
                    "ring-2 ring-[var(--success)] ring-offset-1 ring-offset-background"
                )}
              >
                ${stop.yourPrice.toFixed(2)}
                <span className="text-muted-foreground">/gal</span>
              </div>
            </MarkerContent>
            <MarkerPopup closeButton className="max-w-[min(90vw,240px)]">
              <div className="min-w-0 text-xs">
                <p className="font-semibold leading-snug text-foreground">{stationTitle}</p>
                {address ? (
                  <p className="mt-1.5 leading-snug text-muted-foreground">{address}</p>
                ) : null}
                <p className="mt-2 font-mono text-sm font-semibold tabular-nums text-foreground">
                  ${stop.yourPrice.toFixed(2)}
                  <span className="text-muted-foreground">/gal</span>
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )
      })}
    </>
  )
}

export type PricingRouteMapProps = {
  /** Route: A→B. Area: single place + radius */
  searchMode?: "route" | "area"
  /** Area mode: search center and radius (meters) */
  areaCenterCoords?: LngLat | null
  areaRadiusMeters?: number
  originCoords: LngLat | null
  destinationCoords: LngLat | null
  /** Active route geometry (fuel stops / summary) */
  routeCoordinates: LngLat[]
  /** All OSRM alternatives; each drawn on the map, selected index emphasized */
  routeAlternatives?: LngLat[][]
  selectedRouteIndex?: number
  onSelectRoute?: (index: number) => void
  routeLoading?: boolean
  stops: RoutePricingStop[]
  lowestYourPrice: number | null
  mapLeftPadding?: number
  mapBottomPadding?: number
}

export function PricingRouteMap({
  searchMode = "route",
  areaCenterCoords = null,
  areaRadiusMeters,
  originCoords,
  destinationCoords,
  routeCoordinates,
  routeAlternatives,
  selectedRouteIndex = 0,
  onSelectRoute,
  routeLoading = false,
  stops,
  lowestYourPrice,
  mapLeftPadding = 0,
  mapBottomPadding = 0,
}: PricingRouteMapProps) {
  const [mounted, setMounted] = React.useState(false)
  const mapContainerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isAreaMode = searchMode === "area"
  const hasAreaSearch =
    isAreaMode &&
    areaCenterCoords != null &&
    areaRadiusMeters != null &&
    areaRadiusMeters > 0

  const alternatives = React.useMemo(() => {
    if (routeAlternatives && routeAlternatives.length > 0) return routeAlternatives
    if (routeCoordinates.length >= 2) return [routeCoordinates]
    return []
  }, [routeAlternatives, routeCoordinates])

  const hasRoute = !isAreaMode && alternatives.some((c) => c.length >= 2)

  const boundsPathCoordinates = React.useMemo(
    () => alternatives.flat(),
    [alternatives]
  )

  const routeDrawOrder = React.useMemo(() => {
    const n = alternatives.length
    if (n < 2) return [...Array(n).keys()]
    return [...Array(n).keys()].sort((a, b) => {
      if (a === selectedRouteIndex) return 1
      if (b === selectedRouteIndex) return -1
      return a - b
    })
  }, [alternatives, selectedRouteIndex])

  const priceCoords = React.useMemo(
    () => stops.map((s) => [s.lng, s.lat] as LngLat),
    [stops]
  )

  if (!mounted) {
    return (
      <div
        className="flex h-full min-h-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground"
        aria-label={isAreaMode ? "Fuel prices near a location" : "Route pricing map"}
      >
        Loading map…
      </div>
    )
  }

  const mapAriaLabel = isAreaMode ? "Fuel prices near a location" : "Route pricing map"

  return (
    <div
      ref={mapContainerRef}
      className="box-content h-full min-h-0 w-full overflow-hidden rounded-none"
      aria-label={mapAriaLabel}
    >
      <Map
        className="h-full w-full min-h-[160px] rounded-none"
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
      >
        {hasAreaSearch && areaCenterCoords && areaRadiusMeters != null ? (
          <>
            <FitAreaBounds
              center={areaCenterCoords}
              radiusMeters={areaRadiusMeters}
              priceCoords={priceCoords}
              mapLeftPadding={mapLeftPadding}
              mapBottomPadding={mapBottomPadding}
            />
            <MapSearchRadiusCircle
              center={areaCenterCoords}
              radiusMeters={areaRadiusMeters}
            />
            <MapMarker longitude={areaCenterCoords[0]} latitude={areaCenterCoords[1]}>
              <MarkerContent>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: "var(--chart-2)" }}
                  aria-hidden
                >
                  <MapPin className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
                </div>
              </MarkerContent>
            </MapMarker>
          </>
        ) : null}
        {!isAreaMode && originCoords && !destinationCoords ? (
          <FitSinglePoint coords={originCoords} />
        ) : null}
        {!isAreaMode && destinationCoords && !originCoords ? (
          <FitSinglePoint coords={destinationCoords} />
        ) : null}
        {!isAreaMode && originCoords && destinationCoords ? (
          <FitRouteBounds
            originCoords={originCoords}
            destinationCoords={destinationCoords}
            boundsPathCoordinates={boundsPathCoordinates}
            priceCoords={priceCoords}
            mapLeftPadding={mapLeftPadding}
            mapBottomPadding={mapBottomPadding}
          />
        ) : null}
        {!isAreaMode && originCoords ? (
          <MapMarker longitude={originCoords[0]} latitude={originCoords[1]}>
            <MarkerContent>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: "var(--chart-2)" }}
                aria-hidden
              >
                <span className="text-[var(--text-2xs)] font-bold text-primary-foreground">A</span>
              </div>
            </MarkerContent>
          </MapMarker>
        ) : null}
        {!isAreaMode && destinationCoords ? (
          <MapMarker longitude={destinationCoords[0]} latitude={destinationCoords[1]}>
            <MarkerContent>
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: "var(--destructive)" }}
                aria-hidden
              >
                <span className="text-[var(--text-2xs)] font-bold text-primary-foreground">B</span>
              </div>
            </MarkerContent>
          </MapMarker>
        ) : null}
        {hasRoute
          ? routeDrawOrder.map((i) => {
              const coords = alternatives[i]
              if (!coords || coords.length < 2) return null
              const isSelected =
                alternatives.length < 2 || i === selectedRouteIndex
              return (
                <MapRoute
                  key={`pricing-alt-${i}`}
                  id={`pricing-alt-${i}`}
                  coordinates={coords}
                  color={isSelected ? ROUTE_LINE_SELECTED : ROUTE_LINE_ALT}
                  width={isSelected ? 6 : 3}
                  opacity={isSelected ? 1 : 0.5}
                  interactive={false}
                />
              )
            })
          : null}
        {hasRoute && alternatives.length >= 2 && onSelectRoute ? (
          <PricingRouteLinePicker
            routeCount={alternatives.length}
            onSelectRoute={onSelectRoute}
          />
        ) : null}
        {!isAreaMode &&
        routeLoading &&
        !hasRoute &&
        originCoords &&
        destinationCoords ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
            <span className="text-xs text-muted-foreground">Loading route…</span>
          </div>
        ) : null}
        <PricingPriceMarkers
          stops={stops}
          lowestYourPrice={lowestYourPrice}
          mapContainerRef={mapContainerRef}
        />
        <MapControls showZoom showLocate position="bottom-right" />
      </Map>
    </div>
  )
}
