/**
 * GeoJSON + route polyline for Deal Analyzer “top locations” map (MapLibre literals via mapPaint).
 */

import { representativeTxnWithBetterOption } from "@/lib/deal-analyzer-engine"
import type {
  DealLocationComparisonRow,
  DealVerdict,
} from "@/lib/deal-analyzer-types"
import { mapPaint } from "@/lib/map-paint-colors"
import {
  getFuelTransactionLocationKey,
  type FuelTransaction,
} from "@/lib/mock-data"

export type LocationMapPointRole = "baseline" | "proposed" | "optimized"

export type LocationMapPointProps = {
  color: string
  role: LocationMapPointRole
  locationKey: string
}

export type LocationComparisonMapModel = {
  points: GeoJSON.FeatureCollection<GeoJSON.Point, LocationMapPointProps>
}

function groupTransactionsByLocationKey(slice: FuelTransaction[]) {
  const groups = new Map<string, FuelTransaction[]>()
  for (const t of slice) {
    const k = getFuelTransactionLocationKey(t.stationBrand, t.location)
    const arr = groups.get(k)
    if (arr) arr.push(t)
    else groups.set(k, [t])
  }
  return groups
}

function centroidLngLat(txs: FuelTransaction[]): [number, number] | null {
  const valid = txs.filter(
    (t) => Number.isFinite(t.lat) && Number.isFinite(t.lng)
  )
  if (valid.length === 0) return null
  let slat = 0
  let slng = 0
  for (const t of valid) {
    slat += t.lat
    slng += t.lng
  }
  return [slng / valid.length, slat / valid.length]
}

/** Whether this row can show a modeled proposed stop on the map. */
function rowHasProposedMapPin(row: DealLocationComparisonRow): boolean {
  if (
    !row.match.hasData ||
    row.match.netCpg == null ||
    row.current.netCpg == null
  ) {
    return false
  }
  return true
}

/**
 * Proposed pins use the overall deal verdict color (matches results hero styling).
 * MapLibre literals only — keep aligned with `app/globals.css` semantic tokens.
 */
export function verdictTierToProposedMapColor(
  tier: DealVerdict["tier"]
): string {
  switch (tier) {
    case "excellent":
    case "good":
      return mapPaint.success
    case "marginal":
      return mapPaint.warning
    case "bad":
      return mapPaint.destructive
  }
}

/** Illustrative offset for synthetic optimized tier (not a real station coordinate). */
function offsetOptimized(
  locationKey: string,
  anchorLng: number,
  anchorLat: number
): [number, number] {
  let h = 2166136261
  for (let i = 0; i < locationKey.length; i++) {
    h ^= locationKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const u = ((h >>> 0) % 360) / 360
  const dist = 0.02 + (((h >> 8) >>> 0) % 800) / 10000
  const angle = u * 2 * Math.PI
  return [
    anchorLng + Math.cos(angle) * dist,
    anchorLat + Math.sin(angle) * dist,
  ]
}

/**
 * Builds point features (baseline / proposed / optimized) per fuel stop cluster.
 */
export function buildLocationComparisonMapModel(
  slice: FuelTransaction[],
  rows: DealLocationComparisonRow[],
  showOptimizedColumn: boolean,
  verdictTier: DealVerdict["tier"]
): LocationComparisonMapModel {
  const groups = groupTransactionsByLocationKey(slice)
  const features: GeoJSON.Feature<GeoJSON.Point, LocationMapPointProps>[] = []
  const proposedPinColor = verdictTierToProposedMapColor(verdictTier)

  for (const row of rows) {
    const txs = groups.get(row.locationKey)
    if (!txs?.length) continue

    const baseline = centroidLngLat(txs)
    if (!baseline) continue

    const [blLng, blLat] = baseline

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [blLng, blLat] },
      properties: {
        color: mapPaint.laneBaseline,
        role: "baseline",
        locationKey: row.locationKey,
      },
    })

    const rep = representativeTxnWithBetterOption(txs)
    if (rowHasProposedMapPin(row) && rep?.betterOption) {
      const bo = rep.betterOption
      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [bo.lng, bo.lat],
        },
        properties: {
          color: proposedPinColor,
          role: "proposed",
          locationKey: row.locationKey,
        },
      })
    }

    if (showOptimizedColumn && row.optimized) {
      const anchorLng = rep?.betterOption ? rep.betterOption.lng : blLng
      const anchorLat = rep?.betterOption ? rep.betterOption.lat : blLat
      const [oLng, oLat] = offsetOptimized(
        row.locationKey,
        anchorLng,
        anchorLat
      )
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [oLng, oLat] },
        properties: {
          color: mapPaint.success,
          role: "optimized",
          locationKey: row.locationKey,
        },
      })
    }
  }

  return {
    points: { type: "FeatureCollection", features },
  }
}
