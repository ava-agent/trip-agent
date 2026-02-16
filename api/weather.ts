/**
 * Vercel Serverless Function: Weather API Proxy
 * Proxies OpenWeatherMap requests with server-side API key
 */

export const config = {
  runtime: "edge",
}

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const city = url.searchParams.get("city")

  if (!city) {
    return new Response(JSON.stringify({ error: "city parameter is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OpenWeatherMap API key not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    // Fetch current weather
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=zh_cn`
    const currentResponse = await fetch(currentUrl)

    if (!currentResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Weather API error: ${currentResponse.statusText}` }),
        { status: currentResponse.status, headers: { "Content-Type": "application/json" } }
      )
    }

    const currentData = await currentResponse.json()

    // Fetch 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=zh_cn`
    const forecastResponse = await fetch(forecastUrl)
    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null

    return new Response(
      JSON.stringify({ current: currentData, forecast: forecastData }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
