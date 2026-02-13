import { create } from "zustand"

interface UiState {
  sidebarOpen: boolean
  selectedTripId: string | null
  darkMode: boolean
  settingsOpen: boolean
  toggleSidebar: () => void
  setSelectedTripId: (tripId: string | null) => void
  setDarkMode: (darkMode: boolean) => void
  toggleSettings: () => void
  setSettingsOpen: (settingsOpen: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  selectedTripId: null,
  darkMode: false,
  settingsOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSelectedTripId: (tripId) => set({ selectedTripId: tripId }),

  setDarkMode: (darkMode) => set({ darkMode }),

  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}))
