"use client"

import * as React from "react"
import type {
  DealLocationComparisonRow,
  DealLocationMetricCard,
  DealVerdict,
} from "@/lib/deal-analyzer-types"
import {
  Map as GeoMap,
  MapClusterLayer,
  MapControls,
  MapRoute,
  useMap,
} from "@/components/ui/map"
import {
  MAP_US_CENTER,
  MAP_US_ZOOM_NARROW_VIEWPORT,
} from "@/lib/map-us-defaults"
import {
  buildLocationComparisonMapModel,
  dealRowForMapComparisonCard,
  getDealRowMapPins,
  verdictTierToProposedMapColor,
} from "@/lib/deal-analyzer-location-map"
import { mapPaint } from "@/lib/map-paint-colors"
import { fetchDrivingRoutes, pickDrivingRoutePolyline } from "@/lib/osrm-route"
import type { FuelTransaction } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import {
  ActualVsOptimizedCard,
  type ComparisonCardLabels,
} from "@/components/actual-vs-optimized-card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const DEAL_COMPARISON_LABELS: ComparisonCardLabels = {
  legendPrimary: "Baseline",
  legendSecondary: "Proposed",
  legendTertiary: "Optimized",
  columnLeft: "Baseline",
  columnRight: "Proposed",
  columnTertiary: "Optimized (illustrative)",
  savingsFooter: "Modeled savings",
}

/** Baseline pin sizes: &lt;100 gal / 100–500 / &gt;500 (MapClusterLayer step). */
const DEAL_MAP_BASELINE_VOLUME_RADIUS = {
  gallonsProperty: "baselineGallons",
  lowPx: 5,
  mediumPx: 8,
  highPx: 12,
} as const

/** One line "Chain · City, ST" for the optimized column (matches row subtitle shape). */
function optimizedColumnHeadline(card: DealLocationMetricCard): string {
  const title = card.title || "—"
  const prefix = `${title}, `
  const loc = card.subtitle.startsWith(prefix)
    ? card.subtitle.slice(prefix.length)
    : card.subtitle
  return `${title} · ${loc}`
}

type MapLayerFilterId = "baseline" | "proposed" | "optimized"

const DEFAULT_MAP_LAYER_FILTERS: Record<MapLayerFilterId, boolean> = {
  baseline: true,
  proposed: true,
  optimized: true,
}

function featureMatchesLayerFilters(
  feature: GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>,
  filters: Record<MapLayerFilterId, boolean>,
  showOptimizedLayer: boolean
): boolean {
  const role = feature.properties?.role
  if (role === "baseline") return filters.baseline
  if (role === "optimized") return showOptimizedLayer && filters.optimized
  if (role === "proposed") return filters.proposed
  return true
}

function filterPointsByLayers(
  collection: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    Record<string, unknown>
  >,
  filters: Record<MapLayerFilterId, boolean>,
  showOptimizedLayer: boolean
): GeoJSON.FeatureCollection<GeoJSON.Point, Record<string, unknown>> {
  return {
    ...collection,
    features: collection.features.filter((f) =>
      featureMatchesLayerFilters(f, filters, showOptimizedLayer)
    ),
  }
}

function countPinsByLayer(
  collection: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    Record<string, unknown>
  >
): Record<MapLayerFilterId, number> {
  let baseline = 0
  let proposed = 0
  let optimized = 0
  for (const f of collection.features) {
    const role = f.properties?.role
    if (role === "baseline") baseline++
    else if (role === "optimized") optimized++
    else if (role === "proposed") proposed++
  }
  return { baseline, proposed, optimized }
}

function MapLayerFilterCard({
  label,
  pinCount,
  selected,
  swatchColor,
  onToggle,
}: {
  label: string
  pinCount: number
  selected: boolean
  swatchColor: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={selected}
      aria-label={`${label}: ${selected ? "shown on map" : "hidden from map"}, ${pinCount} pins`}
      onClick={onToggle}
      style={
        selected
          ? { borderColor: swatchColor }
          : undefined
      }
      className={cn(
        "flex min-h-11 min-w-[10rem] shrink-0 snap-start flex-col gap-1 rounded-2xl border-2 bg-card p-3 text-left shadow-sm outline-none transition-[border-color,box-shadow,opacity]",
        "focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "shadow-md"
          : "border-border opacity-[0.92] hover:border-muted-foreground/35 hover:opacity-100"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <span
            className="mt-0.5 size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: swatchColor }}
            aria-hidden
          />
          <span className="text-muted-foreground min-w-0 text-[11px] font-medium leading-snug">
            {label}{" "}
            <span className="tabular-nums">({pinCount})</span>
          </span>
        </div>
      </div>
    </button>
  )
}

function FitLocationMapBounds({
  points,
  routeCoordinates,
}: {
  points: GeoJSON.FeatureCollection
  routeCoordinates?: [number, number][] | null
}) {
  const { map, isLoaded } = useMap()

  React.useEffect(() => {
    if (!isLoaded || !map) return
    const lngs: number[] = []
    const lats: number[] = []
    for (const f of points.features) {
      if (f.geometry.type === "Point") {
        const [lng, lat] = f.geometry.coordinates
        lngs.push(lng)
        lats.push(lat)
      }
    }
    if (routeCoordinates?.length) {
      for (const [lng, lat] of routeCoordinates) {
        lngs.push(lng)
        lats.push(lat)
      }
    }
    if (lngs.length === 0) return
    const padding =
      routeCoordinates && routeCoordinates.length >= 2 ? 80 : 52
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding, maxZoom: 11 }
    )
  }, [map, isLoaded, points, routeCoordinates])

  return null
}

/** Join consecutive driving polylines, dropping duplicate junction vertices. */
function mergeRoutePolylines(
  segments: [number, number][][]
): [number, number][] {
  if (segments.length === 0) return []
  const first = segments[0]
  if (!first?.length) return []
  const out: [number, number][] = [...first]
  for (let s = 1; s < segments.length; s++) {
    const next = segments[s]
    if (!next?.length) continue
    const last = out[out.length - 1]
    const head = next[0]
    const skipFirst =
      last[0] === head[0] && last[1] === head[1]
    out.push(...(skipFirst ? next.slice(1) : next))
  }
  return out
}

/** Pin order for routing; only includes coordinates whose layer is turned on. */
function buildVisiblePinChainForRow(
  pins: NonNullable<ReturnType<typeof getDealRowMapPins>>,
  layerFilters: Record<MapLayerFilterId, boolean>,
  showOptimizedLayer: boolean
): [number, number][] {
  const chain: [number, number][] = []
  if (layerFilters.baseline) chain.push(pins.baseline)
  if (layerFilters.proposed && pins.proposed) chain.push(pins.proposed)
  if (showOptimizedLayer && layerFilters.optimized && pins.optimized) {
    chain.push(pins.optimized)
  }
  return chain
}

export function DealAnalyzerLocationComparisonSection({
  rows,
  transactionSlice,
  verdictTier,
  showOptimizedColumn,
}: {
  rows: DealLocationComparisonRow[]
  transactionSlice: FuelTransaction[]
  verdictTier: DealVerdict["tier"]
  showOptimizedColumn: boolean
}) {
  const [mounted, setMounted] = React.useState(false)
  const [focusedLocationKey, setFocusedLocationKey] = React.useState<
    string | null
  >(null)
  const [routeCoords, setRouteCoords] = React.useState<
    [number, number][] | null
  >(null)
  const [layerFilters, setLayerFilters] =
    React.useState<Record<MapLayerFilterId, boolean>>(DEFAULT_MAP_LAYER_FILTERS)

  React.useEffect(() => setMounted(true), [])

  const { points } = React.useMemo(
    () =>
      buildLocationComparisonMapModel(
        transactionSlice,
        rows,
        showOptimizedColumn,
        verdictTier
      ),
    [transactionSlice, rows, showOptimizedColumn, verdictTier]
  )

  const layerPinCounts = React.useMemo(
    () =>
      countPinsByLayer(
        points as GeoJSON.FeatureCollection<
          GeoJSON.Point,
          Record<string, unknown>
        >
      ),
    [points]
  )

  const proposedFilterSwatchColor = verdictTierToProposedMapColor(verdictTier)

  const dealMapPinAccents = React.useMemo(
    () => ({
      baseline: mapPaint.laneBaseline,
      proposed: proposedFilterSwatchColor,
      optimized: mapPaint.success,
    }),
    [proposedFilterSwatchColor]
  )

  const filteredPoints = React.useMemo(
    () =>
      filterPointsByLayers(
        points as GeoJSON.FeatureCollection<
          GeoJSON.Point,
          Record<string, unknown>
        >,
        layerFilters,
        showOptimizedColumn
      ),
    [points, layerFilters, showOptimizedColumn]
  )

  /**
   * Map pins always respect layer filters. Overview: all clusters. Focused: one
   * cluster’s pins that remain visible under the current filter toggles.
   */
  const mapDisplayPoints = React.useMemo(() => {
    const base = filteredPoints as GeoJSON.FeatureCollection<
      GeoJSON.Point,
      Record<string, unknown>
    >
    if (!focusedLocationKey) return base

    return {
      ...base,
      features: base.features.filter(
        (f) => f.properties?.locationKey === focusedLocationKey
      ),
    }
  }, [filteredPoints, focusedLocationKey])

  /** Same source as map pins so bounds match visible markers. */
  const fitBoundsPoints = React.useMemo(() => {
    if (!focusedLocationKey) return filteredPoints
    const base = filteredPoints as GeoJSON.FeatureCollection<
      GeoJSON.Point,
      Record<string, unknown>
    >
    return {
      ...base,
      features: base.features.filter(
        (f) => f.properties?.locationKey === focusedLocationKey
      ),
    }
  }, [filteredPoints, focusedLocationKey])

  const rowByKey = React.useMemo(() => {
    const m = new Map<string, DealLocationComparisonRow>()
    for (const r of rows) m.set(r.locationKey, r)
    return m
  }, [rows])

  const focusedRow = focusedLocationKey
    ? rowByKey.get(focusedLocationKey)
    : undefined

  const clearMapSelection = React.useCallback(() => {
    setFocusedLocationKey(null)
    setRouteCoords(null)
  }, [])

  React.useEffect(() => {
    if (!focusedLocationKey || !focusedRow) {
      setRouteCoords(null)
      return
    }
    const pins = getDealRowMapPins(
      transactionSlice,
      focusedRow,
      showOptimizedColumn
    )
    if (!pins) {
      setRouteCoords(null)
      return
    }

    const chain = buildVisiblePinChainForRow(
      pins,
      layerFilters,
      showOptimizedColumn
    )
    if (chain.length < 2) {
      setRouteCoords(null)
      return
    }

    const ac = new AbortController()
    setRouteCoords(chain)

    ;(async () => {
      try {
        const segments: [number, number][][] = []
        for (let i = 0; i < chain.length - 1; i++) {
          const routes = await fetchDrivingRoutes(chain[i], chain[i + 1], {
            signal: ac.signal,
          })
          const poly = pickDrivingRoutePolyline(routes) as
            | [number, number][]
            | null
          if (poly?.length) segments.push(poly)
          else segments.push([chain[i], chain[i + 1]])
        }
        if (ac.signal.aborted) return
        setRouteCoords(mergeRoutePolylines(segments))
      } catch {
        /* keep straight-line chain */
      }
    })()

    return () => ac.abort()
  }, [
    focusedLocationKey,
    focusedRow,
    transactionSlice,
    showOptimizedColumn,
    layerFilters,
  ])

  React.useEffect(() => {
    if (!focusedLocationKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearMapSelection()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [focusedLocationKey, clearMapSelection])

  const focusedDealCard = React.useMemo(() => {
    if (!focusedRow) return null
    return dealRowForMapComparisonCard(focusedRow)
  }, [focusedRow])

  const dealColumnGaps = React.useMemo(() => {
    if (!focusedRow || !focusedDealCard) return undefined
    const proposed = focusedDealCard.proposedMissing
      ? (focusedDealCard.proposedMissingReason ??
          "No modeled alternate for this stop.")
      : undefined
    let optimized: string | undefined
    if (showOptimizedColumn && focusedRow.optimized) {
      optimized = undefined
    } else if (!showOptimizedColumn) {
      optimized = "Optimized tier is not included in this analysis."
    } else {
      optimized = "No illustrative optimized stop for this cluster."
    }
    return { proposed, optimized }
  }, [focusedRow, focusedDealCard, showOptimizedColumn])

  function toggleLayer(id: MapLayerFilterId, checked: boolean) {
    setLayerFilters((prev) => ({ ...prev, [id]: checked }))
  }

  if (!mounted) {
    return (
      <section className="flex flex-col gap-3 overflow-visible pt-2">
        <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border bg-muted/25 text-muted-foreground text-xs">
          Loading map…
        </div>
      </section>
    )
  }

  if (points.features.length === 0) {
    return (
      <section className="flex flex-col gap-3 overflow-visible pt-2">
        <header className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Top fuel locations</h3>
          <p className="text-muted-foreground text-sm">
            No stops with map coordinates in this period for the comparison slice.
          </p>
        </header>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 overflow-visible pt-2">
      <header>
        <h3 className="text-base font-semibold">Top fuel locations</h3>
      </header>

      <div
        className="relative overflow-hidden rounded-lg border border-border"
        role="region"
        aria-label="Fuel stops vs proposed and optimized map"
      >
        <GeoMap
          className="h-[min(52vh,420px)] w-full min-h-[260px]"
          center={MAP_US_CENTER}
          zoom={MAP_US_ZOOM_NARROW_VIEWPORT}
        >
          <FitLocationMapBounds
            points={fitBoundsPoints}
            routeCoordinates={routeCoords}
          />
          <MapControls showCompass showZoom position="top-right" />
          {routeCoords && routeCoords.length >= 2 ? (
            <MapRoute
              coordinates={routeCoords}
              color={mapPaint.connector}
              width={3}
              opacity={0.85}
            />
          ) : null}
          <MapClusterLayer
            data={mapDisplayPoints}
            cluster={false}
            pointColorProperty="color"
            baselineVolumeRadius={DEAL_MAP_BASELINE_VOLUME_RADIUS}
            onPointClick={(feature) => {
              const p = feature.properties
              if (!p || typeof p.locationKey !== "string") return
              setFocusedLocationKey(p.locationKey)
            }}
          />
        </GeoMap>
      </div>

      {focusedLocationKey && focusedRow ? (
        <div
          className="flex flex-col gap-2 overflow-visible"
          aria-label="Selected stop comparison"
        >
          <div className="relative mx-auto w-full max-w-2xl space-y-2">
            {focusedDealCard ? (
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={clearMapSelection}
                        className="absolute -top-1 right-0 z-20 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Close comparison"
                      >
                        <X className="size-4" />
                      </button>
                    }
                  />
                  <TooltipContent side="left">Close comparison</TooltipContent>
                </Tooltip>
                <ActualVsOptimizedCard
                  variant="comparison"
                  comparison={focusedDealCard.comparison}
                  layout="embedded"
                  labels={DEAL_COMPARISON_LABELS}
                  mapPinAccents={dealMapPinAccents}
                  dealColumnGaps={dealColumnGaps}
                  illustrativeOptimized={
                    showOptimizedColumn && focusedRow.optimized
                      ? {
                          headline: optimizedColumnHeadline(
                            focusedRow.optimized
                          ),
                          netCpg: focusedRow.optimized.netCpg,
                          distanceMiles: focusedRow.optimized.distanceMiles,
                          avgDiscountPerGal:
                            focusedRow.optimized.avgDiscountPerGal,
                        }
                      : undefined
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-foreground">Map filters</p>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory"
          role="group"
          aria-label="Choose which pins appear on the map"
        >
          <MapLayerFilterCard
            label="Baseline stops"
            pinCount={layerPinCounts.baseline}
            selected={layerFilters.baseline}
            swatchColor={mapPaint.laneBaseline}
            onToggle={() => toggleLayer("baseline", !layerFilters.baseline)}
          />
          <MapLayerFilterCard
            label="Proposed stops"
            pinCount={layerPinCounts.proposed}
            selected={layerFilters.proposed}
            swatchColor={proposedFilterSwatchColor}
            onToggle={() => toggleLayer("proposed", !layerFilters.proposed)}
          />
          {showOptimizedColumn ? (
            <MapLayerFilterCard
              label="Optimized stops"
              pinCount={layerPinCounts.optimized}
              selected={layerFilters.optimized}
              swatchColor={mapPaint.success}
              onToggle={() => toggleLayer("optimized", !layerFilters.optimized)}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
