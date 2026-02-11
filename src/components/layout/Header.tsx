import { Plane, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUiStore } from "@/stores/uiStore"

export function Header() {
  const darkMode = useUiStore((state) => state.darkMode)
  const setDarkMode = useUiStore((state) => state.setDarkMode)

  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Plane className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold">Trip Agent</h1>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">MVP</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="sm">设置</Button>
        <Button variant="outline" size="sm">新旅行</Button>
      </div>
    </header>
  )
}
