import { create } from "zustand"
import { persist } from "zustand/middleware"

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

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      selectedTripId: null,
      darkMode: false,
      settingsOpen: false,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSelectedTripId: (tripId) => set({ selectedTripId: tripId }),

      setDarkMode: (darkMode) => {
        // Apply dark mode class immediately
        if (darkMode) {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
        return set({ darkMode })
      },

      toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: "trip-agent-ui",
      partialize: (state) => ({
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore dark mode class on page load
        if (state?.darkMode) {
          document.documentElement.classList.add("dark")
        }
      },
    }
  )
)
