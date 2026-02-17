import type { Trip, Activity, DayPlan } from "@/types"

/**
 * Generate iCalendar (.ics) file content from a trip
 * RFC 5545 compliant
 */
function formatICSDate(date: Date, time?: string): string {
  const d = new Date(date)
  if (time) {
    const [hours, minutes] = time.split(":").map(Number)
    d.setHours(hours, minutes, 0, 0)
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

function createEvent(
  activity: Activity,
  dayPlan: DayPlan,
  tripName: string
): string {
  const startDate = formatICSDate(dayPlan.date, activity.time.start)
  const endDate = formatICSDate(dayPlan.date, activity.time.end)
  const uid = `${activity.id}@tripagent`

  const description = [
    activity.description,
    activity.cost !== undefined ? `预算: ¥${activity.cost}` : "",
    activity.rating !== undefined ? `评分: ${activity.rating}/5` : "",
    activity.bookingUrl ? `预订: ${activity.bookingUrl}` : "",
    activity.notes,
  ]
    .filter(Boolean)
    .join("\\n")

  const location = [activity.location.name, activity.location.address]
    .filter(Boolean)
    .join(", ")

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${escapeICS(`[${tripName}] ${activity.name}`)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(location)}`,
    `CATEGORIES:${escapeICS(activity.type)}`,
    "STATUS:CONFIRMED",
    `CREATED:${formatICSDate(new Date())}`,
    "END:VEVENT",
  ].join("\r\n")
}

export function generateICS(trip: Trip): string {
  const events = trip.itinerary.flatMap((dayPlan) =>
    dayPlan.activities.map((activity) =>
      createEvent(activity, dayPlan, trip.name)
    )
  )

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trip Agent//Trip Planner//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeICS(trip.name)}`,
    `X-WR-CALDESC:${escapeICS(`${trip.destination.name} ${trip.duration.days}天行程`)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n")

  return calendar
}

export function downloadICS(trip: Trip): void {
  const icsContent = generateICS(trip)
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${trip.name}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
