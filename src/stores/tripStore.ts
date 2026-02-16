import { create } from "zustand"
import type { Trip, DayPlan, Activity, TripMetadata } from "@/types"
import { tauriStorageService } from "@/services/tauriService"
import { toast } from "sonner"

interface TripState {
  currentTrip: Trip | null
  trips: TripMetadata[]
  isLoading: boolean
  error: string | null
  initialized: boolean
  setCurrentTrip: (trip: Trip | null) => void
  updateTripDay: (dayNumber: number, dayPlan: DayPlan) => void
  addActivity: (dayNumber: number, activity: Activity) => void
  setTrips: (trips: TripMetadata[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  loadTripsFromStorage: () => Promise<void>
  loadTripById: (id: string) => Promise<Trip | null>
  saveTripToStorage: (trip: Trip) => Promise<void>
  deleteTripFromStorage: (id: string) => Promise<void>
}

function tripToMetadata(trip: Trip): TripMetadata {
  return {
    id: trip.id,
    name: trip.name,
    destination: `${trip.destination.name}, ${trip.destination.country}`,
    duration: trip.duration.days,
    status: trip.status,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  }
}

export const useTripStore = create<TripState>((set, get) => ({
  currentTrip: null,
  trips: [],
  isLoading: false,
  error: null,
  initialized: false,

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

  loadTripsFromStorage: async (force?: boolean) => {
    if (get().initialized && !force) return
    set({ isLoading: true, error: null })
    try {
      const trips = await tauriStorageService.loadTrips()
      const metadata = trips.map(tripToMetadata)
      set({ trips: metadata, isLoading: false, initialized: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载行程失败"
      set({ isLoading: false, error: message, initialized: true })
      if (import.meta.env.DEV) {
        console.warn("[tripStore] Failed to load trips from storage:", message)
      }
    }
  },

  loadTripById: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const trip = await tauriStorageService.loadTrip(id)
      if (trip) {
        set({ currentTrip: trip, isLoading: false })
      } else {
        set({ currentTrip: null, isLoading: false })
      }
      return trip
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载行程失败"
      set({ isLoading: false, error: message })
      if (import.meta.env.DEV) {
        console.warn("[tripStore] Failed to load trip:", message)
      }
      return null
    }
  },

  saveTripToStorage: async (trip) => {
    try {
      await tauriStorageService.saveTrip(trip)
      // Update trips list
      const metadata = tripToMetadata(trip)
      set((state) => ({
        trips: [
          metadata,
          ...state.trips.filter((t) => t.id !== trip.id),
        ],
        currentTrip: trip,
      }))
      toast.success("行程已保存")
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存行程失败"
      toast.error(message)
    }
  },

  deleteTripFromStorage: async (id) => {
    try {
      await tauriStorageService.deleteTrip(id)
      set((state) => ({
        trips: state.trips.filter((t) => t.id !== id),
        currentTrip: state.currentTrip?.id === id ? null : state.currentTrip,
      }))
      toast.success("行程已删除")
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除行程失败"
      toast.error(message)
    }
  },
}))
