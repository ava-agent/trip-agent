/**
 * Vercel Edge Function: Google Places API Proxy
 * Proxies geocoding, place search, and hotel search with server-side API key
 */

export const config = {
  runtime: "edge",
}

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const action = url.searchParams.get("action") || "search"
  const query = url.searchParams.get("query") || ""
  const location = url.searchParams.get("location") || ""
  const type = url.searchParams.get("type") || "tourist_attraction"

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Google Places API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    if (action === "geocode") {
      const address = url.searchParams.get("address") || location
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
      const response = await fetch(geocodeUrl)
      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
        },
      })
    }

    if (action === "photo") {
      const photoRef = url.searchParams.get("ref") || ""
      const maxWidth = url.searchParams.get("maxwidth") || "400"
      if (!photoRef) {
        return new Response(JSON.stringify({ error: "ref parameter required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${apiKey}`
      const response = await fetch(photoUrl)
      return new Response(response.body, {
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=3600",
        },
      })
    }

    // Default: text search
    if (!location) {
      return new Response(JSON.stringify({ error: "location parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // First geocode the location
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()
    const coords = geocodeData.results?.[0]?.geometry?.location

    if (!coords) {
      return new Response(JSON.stringify({ error: "Could not geocode location", results: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Search for places
    const searchQuery = `${query} ${location}`.trim()
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${coords.lat},${coords.lng}&radius=10000&type=${type}&key=${apiKey}&language=zh`
    const placesResponse = await fetch(placesUrl)
    const placesData = await placesResponse.json()

    // Sanitize photo references - replace direct Google API URLs with our proxy
    if (placesData.results) {
      for (const place of placesData.results) {
        if (place.photos) {
          place.photos = place.photos.map((p: { photo_reference: string }) => ({
            ...p,
            proxy_url: `/api/places?action=photo&ref=${p.photo_reference}`,
          }))
        }
      }
    }

    return new Response(JSON.stringify(placesData), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=600",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
