import { create } from "zustand"

interface UiState {
  sidebarOpen: boolean
  selectedTripId: string | null
  darkMode: boolean
  toggleSidebar: () => void
  setSelectedTripId: (tripId: string | null) => void
  setDarkMode: (darkMode: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  selectedTripId: null,
  darkMode: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSelectedTripId: (tripId) => set({ selectedTripId: tripId }),

  setDarkMode: (darkMode) => set({ darkMode }),
}))
