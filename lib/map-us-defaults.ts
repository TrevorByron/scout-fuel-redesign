/**
 * Default viewport when a map has no route polyline to frame (continental US).
 * MapLibre / GeoJSON use [longitude, latitude].
 */
export const MAP_US_CENTER: [number, number] = [-98.35, 39.5]
export const MAP_US_ZOOM = 3.75

/** Leaflet `center` is [latitude, longitude]. */
export const MAP_US_CENTER_LEAFLET: [number, number] = [
  MAP_US_CENTER[1],
  MAP_US_CENTER[0],
]
export const MAP_US_ZOOM_LEAFLET = 4
