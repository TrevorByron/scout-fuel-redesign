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
  MapPopup,
  useMap,
} from "@/components/ui/map"
import {
  MAP_US_CENTER,
  MAP_US_ZOOM_NARROW_VIEWPORT,
} from "@/lib/map-us-defaults"
import {
  buildLocationComparisonMapModel,
  verdictTierToProposedMapColor,
} from "@/lib/deal-analyzer-location-map"
import type { LocationMapPointRole } from "@/lib/deal-analyzer-location-map"
import { mapPaint } from "@/lib/map-paint-colors"
import type { FuelTransaction } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { MapPin } from "lucide-react"

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

function fmtCpg(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}

function fmtDiscount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium text-foreground">{value}</span>
    </div>
  )
}

/** Lower net CPG than baseline = better proposed deal for this cluster. */
function proposedVersusBaseline(
  row: DealLocationComparisonRow
): "better" | "worse" | "unknown" {
  if (
    !row.match.hasData ||
    row.match.netCpg == null ||
    row.current.netCpg == null
  ) {
    return "unknown"
  }
  if (row.match.netCpg < row.current.netCpg) return "better"
  if (row.match.netCpg > row.current.netCpg) return "worse"
  return "unknown"
}

function LocationMetricCardView({
  variant,
  card,
  showTotalGallons,
  matchOutcome,
}: {
  variant: "current" | "match" | "optimized"
  card: DealLocationMetricCard
  showTotalGallons?: boolean
  /** Compared to baseline net CPG; only used when `variant` is `match`. */
  matchOutcome?: "better" | "worse" | "unknown"
}) {
  const shell =
    variant === "current"
      ? "border-border bg-muted/35"
      : variant === "optimized"
        ? "border-[var(--success)]/45 bg-[var(--success)]/10"
        : matchOutcome === "better"
          ? "border-[var(--success)]/45 bg-[var(--success)]/10"
          : matchOutcome === "worse"
            ? "border-destructive/35 bg-destructive/10"
            : "border-border bg-muted/35"

  const empty = Boolean(card.emptyReason)

  return (
    <div
      className={cn(
        "relative rounded-lg border p-3 pt-3.5",
        shell,
        empty && "border-dashed border-border bg-muted/20"
      )}
    >
      <MapPin
        className="absolute top-2.5 right-2.5 size-3.5 text-muted-foreground/70"
        aria-hidden
      />
      <div className="pr-6">
        <p className="text-sm font-semibold leading-tight">{card.title || "—"}</p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
          {card.subtitle || "\u00a0"}
        </p>
      </div>
      {showTotalGallons && card.totalGallons != null ? (
        <p className="mt-2 text-right text-xs font-medium tabular-nums text-foreground">
          Total gallons: {card.totalGallons.toLocaleString("en-US")}
        </p>
      ) : null}

      {empty ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          {card.emptyReason}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <MetricLine
            label="Net CPG"
            value={card.netCpg != null ? fmtCpg(card.netCpg) : "—"}
          />
          <MetricLine
            label="Distance"
            value={
              card.distanceMiles != null ? `${card.distanceMiles} mi` : "—"
            }
          />
          <MetricLine
            label="Avg discount"
            value={
              card.avgDiscountPerGal != null
                ? fmtDiscount(card.avgDiscountPerGal)
                : "—"
            }
          />
        </div>
      )}
    </div>
  )
}

function FitLocationMapBounds({ points }: { points: GeoJSON.FeatureCollection }) {
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
    if (lngs.length === 0) return
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 52, maxZoom: 11 }
    )
  }, [map, isLoaded, points])

  return null
}

type PopupSelection = {
  longitude: number
  latitude: number
  locationKey: string
  role: LocationMapPointRole
}

function rolePopupTitle(role: LocationMapPointRole): string {
  switch (role) {
    case "baseline":
      return "Where you fueled (baseline)"
    case "proposed":
      return "Modeled proposed deal"
    case "optimized":
      return "Optimized stop (illustrative)"
    default:
      return ""
  }
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
  const [popup, setPopup] = React.useState<PopupSelection | null>(null)
  const [focusedLocationKey, setFocusedLocationKey] = React.useState<
    string | null
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
   * Filters apply to other clusters only; the focused cluster always shows every
   * related pin (baseline + proposed + optimized) so comparisons stay readable.
   */
  const mapDisplayPoints = React.useMemo(() => {
    const pts = points as GeoJSON.FeatureCollection<
      GeoJSON.Point,
      Record<string, unknown>
    >
    if (!focusedLocationKey) return filteredPoints

    const focusedAll = pts.features.filter(
      (f) => f.properties?.locationKey === focusedLocationKey
    )
    const othersFiltered = filteredPoints.features.filter(
      (f) => f.properties?.locationKey !== focusedLocationKey
    )
    return {
      ...pts,
      features: [...othersFiltered, ...focusedAll],
    }
  }, [points, filteredPoints, focusedLocationKey])

  /** Overview: filtered pins. Selected cluster: full trio for bounds / zoom. */
  const fitBoundsPoints = React.useMemo(() => {
    const pts = points as GeoJSON.FeatureCollection<
      GeoJSON.Point,
      Record<string, unknown>
    >
    if (!focusedLocationKey) return filteredPoints
    return {
      ...pts,
      features: pts.features.filter(
        (f) => f.properties?.locationKey === focusedLocationKey
      ),
    }
  }, [points, filteredPoints, focusedLocationKey])

  function toggleLayer(id: MapLayerFilterId, checked: boolean) {
    setLayerFilters((prev) => ({ ...prev, [id]: checked }))
  }

  const rowByKey = React.useMemo(() => {
    const m = new Map<string, DealLocationComparisonRow>()
    for (const r of rows) m.set(r.locationKey, r)
    return m
  }, [rows])

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
          popupPortalToBody
        >
          <FitLocationMapBounds points={fitBoundsPoints} />
          <MapControls showCompass showZoom position="top-right" />
          <MapClusterLayer
            data={mapDisplayPoints}
            cluster={false}
            pointColorProperty="color"
            onPointClick={(feature, coordinates) => {
              const p = feature.properties
              if (
                !p ||
                typeof p.locationKey !== "string" ||
                typeof p.role !== "string"
              ) {
                return
              }
              const role = p.role as LocationMapPointRole
              setFocusedLocationKey(p.locationKey)
              setPopup({
                longitude: coordinates[0],
                latitude: coordinates[1],
                locationKey: p.locationKey,
                role,
              })
            }}
          />
          {popup ? (
            <MapPopup
              key={`${popup.locationKey}-${popup.role}`}
              longitude={popup.longitude}
              latitude={popup.latitude}
              closeButton
              onClose={() => {
                setPopup(null)
                setFocusedLocationKey(null)
              }}
              className="max-w-[min(100vw-2rem,20rem)] p-0"
            >
              <DetailsPopup
                row={rowByKey.get(popup.locationKey)}
                role={popup.role}
                showOptimizedColumn={showOptimizedColumn}
              />
            </MapPopup>
          ) : null}
        </GeoMap>
      </div>

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

function clusterPopupHint(role: LocationMapPointRole): string {
  switch (role) {
    case "baseline":
      return "Baseline reflects actual stops. Proposed pins share the deal verdict color; per-location cards still compare net CPG vs baseline."
    case "proposed":
      return "Map color follows overall deal verdict; detail cards show green or red vs baseline net CPG per stop."
    case "optimized":
      return "Optimized pin stays bright green (illustrative offset). Proposed layer color matches deal verdict."
    default:
      return ""
  }
}

function DetailsPopup({
  row,
  role,
  showOptimizedColumn,
}: {
  row: DealLocationComparisonRow | undefined
  role: LocationMapPointRole
  showOptimizedColumn: boolean
}) {
  if (!row) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        Location data unavailable.
      </div>
    )
  }

  return (
    <div className="flex max-h-[min(70vh,360px)] flex-col gap-2 overflow-y-auto p-3">
      <p className="text-xs font-semibold text-foreground">
        {rolePopupTitle(role)}
      </p>
      <p className="text-muted-foreground text-[11px] leading-snug">
        {clusterPopupHint(role)}
      </p>
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Baseline (actual transaction location)
          </p>
          <LocationMetricCardView
            variant="current"
            card={row.current}
            showTotalGallons
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Proposed deal
          </p>
          <LocationMetricCardView
            variant="match"
            card={row.match}
            matchOutcome={proposedVersusBaseline(row)}
          />
        </div>
        {showOptimizedColumn ? (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Optimized
            </p>
            {row.optimized ? (
              <LocationMetricCardView variant="optimized" card={row.optimized} />
            ) : (
              <p className="text-muted-foreground text-xs">
                No optimized stop for this run.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
