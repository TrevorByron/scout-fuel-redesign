/**
 * Default viewport when a map has no route polyline to frame (continental US).
 * MapLibre / GeoJSON use [longitude, latitude].
 */
export const MAP_US_CENTER: [number, number] = [-98.35, 39.5]
export const MAP_US_ZOOM = 3.75
/**
 * Narrow viewports show less geographic extent at the same zoom (smaller map area).
 * Use a slightly lower zoom so the default continental framing matches wider screens.
 */
export const MAP_US_ZOOM_NARROW_VIEWPORT = 3.2

/** Leaflet `center` is [latitude, longitude]. */
export const MAP_US_CENTER_LEAFLET: [number, number] = [
  MAP_US_CENTER[1],
  MAP_US_CENTER[0],
]
export const MAP_US_ZOOM_LEAFLET = 4
