import { create } from "zustand"
import type { Trip, DayPlan, Activity, TripMetadata } from "@/types"

interface TripState {
  currentTrip: Trip | null
  trips: TripMetadata[]
  isLoading: boolean
  error: string | null
  setCurrentTrip: (trip: Trip | null) => void
  updateTripDay: (dayNumber: number, dayPlan: DayPlan) => void
  addActivity: (dayNumber: number, activity: Activity) => void
  setTrips: (trips: TripMetadata[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useTripStore = create<TripState>((set) => ({
  currentTrip: null,
  trips: [
    {
      id: "1",
      name: "东京之旅",
      destination: "东京, 日本",
      duration: 5,
      status: "planning",
      createdAt: new Date("2025-01-15"),
      updatedAt: new Date("2025-01-15"),
    },
    {
      id: "2",
      name: "巴黎探索",
      destination: "巴黎, 法国",
      duration: 7,
      status: "confirmed",
      createdAt: new Date("2025-01-10"),
      updatedAt: new Date("2025-01-12"),
    },
    {
      id: "3",
      name: "纽约周末",
      destination: "纽约, 美国",
      duration: 3,
      status: "completed",
      createdAt: new Date("2024-12-20"),
      updatedAt: new Date("2024-12-25"),
    },
  ],
  isLoading: false,
  error: null,

  setCurrentTrip: (trip) => set({ currentTrip: trip }),

  updateTripDay: (dayNumber, dayPlan) =>
    set((state) => ({
      currentTrip: state.currentTrip
        ? {
            ...state.currentTrip,
            itinerary: state.currentTrip.itinerary.map((day) =>
              day.dayNumber === dayNumber ? dayPlan : day
            ),
            updatedAt: new Date(),
          }
        : null,
    })),

  addActivity: (dayNumber, activity) =>
    set((state) => ({
      currentTrip: state.currentTrip
        ? {
            ...state.currentTrip,
            itinerary: state.currentTrip.itinerary.map((day) =>
              day.dayNumber === dayNumber
                ? { ...day, activities: [...day.activities, activity] }
                : day
            ),
            updatedAt: new Date(),
          }
        : null,
    })),

  setTrips: (trips) => set({ trips }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),
}))
