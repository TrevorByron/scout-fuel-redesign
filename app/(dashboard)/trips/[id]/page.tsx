"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function TripDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === "string" ? params.id : null

  useEffect(() => {
    if (id) {
      router.replace(`/trips?id=${encodeURIComponent(id)}`)
    } else {
      router.replace("/trips")
    }
  }, [id, router])

  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Loading…
    </div>
  )
}
