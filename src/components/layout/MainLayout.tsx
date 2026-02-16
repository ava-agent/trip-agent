import { useEffect, useCallback } from "react"
import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { ApiKeySettings } from "@/components/settings"
import { useUiStore } from "@/stores/uiStore"
import { AnimatePresence, motion } from "framer-motion"

function SettingsPanel({ onClose }: { onClose: () => void }) {
  // ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop - click to close */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <motion.div
        className="relative bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col mx-4"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">API 密钥配置</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-accent"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ApiKeySettings />
        </div>
      </motion.div>
    </motion.div>
  )
}

export function MainLayout() {
  const settingsOpen = useUiStore((state) => state.settingsOpen)
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <AnimatePresence>
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
