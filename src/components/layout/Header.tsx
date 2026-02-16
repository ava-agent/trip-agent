import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Plane, Moon, Sun, Settings, Plus, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUiStore } from "@/stores/uiStore"
import { useChatStore } from "@/stores/chatStore"
import { useTripStore } from "@/stores/tripStore"
import { AnimatePresence, motion } from "framer-motion"

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const darkMode = useUiStore((state) => state.darkMode)
  const settingsOpen = useUiStore((state) => state.settingsOpen)
  const setDarkMode = useUiStore((state) => state.setDarkMode)
  const toggleSettings = useUiStore((state) => state.toggleSettings)
  const clearMessages = useChatStore((state) => state.clearMessages)
  const currentTrip = useTripStore((state) => state.currentTrip)
  const saveTripToStorage = useTripStore((state) => state.saveTripToStorage)
  const setCurrentTrip = useTripStore((state) => state.setCurrentTrip)
  const [isNewTripAnimating, setIsNewTripAnimating] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const handleNewTrip = async () => {
    setIsNewTripAnimating(true)

    // Save current trip to sidebar before clearing
    if (currentTrip) {
      try {
        await saveTripToStorage(currentTrip)
      } catch {
        // Continue even if save fails
      }
    }

    clearMessages()
    setCurrentTrip(null)
    navigate("/")
    setTimeout(() => setIsNewTripAnimating(false), 300)
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6 transition-colors duration-300">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="返回首页"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold">Trip Agent</h1>
        </button>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          Beta
        </span>
      </div>

      <nav className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className={location.pathname === "/dashboard" ? "bg-accent" : ""}
        >
          <User className="h-4 w-4 mr-1" />
          面板
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
          className="transition-colors"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={darkMode ? "dark" : "light"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.div>
          </AnimatePresence>
        </Button>

        <Button
          variant={settingsOpen ? "default" : "ghost"}
          size="icon"
          onClick={toggleSettings}
          title="设置"
        >
          {settingsOpen ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
        </Button>

        <motion.div
          animate={isNewTripAnimating ? { scale: [1, 0.95, 1] } : {}}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="default"
            size="sm"
            onClick={handleNewTrip}
            className="ml-1"
          >
            <Plus className="h-4 w-4 mr-1" />
            新旅行
          </Button>
        </motion.div>
      </nav>
    </header>
  )
}
