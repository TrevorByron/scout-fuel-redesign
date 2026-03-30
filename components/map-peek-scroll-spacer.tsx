/**
 * Mobile map peek: center column scrolls the parent `aside`; left/right gutters
 * use `pointer-events-none` so touches reach the map (pan + pinch). Two-finger
 * gestures in the center strip may still hit the scroll layer—use gutters for map.
 */
export function MapPeekScrollSpacer() {
  return (
    <div
      className="sticky top-0 z-0 flex h-[33.333vh] min-h-[140px] max-h-[33.333vh] w-full shrink-0 md:hidden"
      aria-hidden
    >
      <div className="w-11 min-w-11 shrink-0 pointer-events-none" />
      <div className="min-h-[140px] h-full min-w-0 flex-1 touch-pan-y pointer-events-auto" />
      <div className="w-11 min-w-11 shrink-0 pointer-events-none" />
    </div>
  )
}
