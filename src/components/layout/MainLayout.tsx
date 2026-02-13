import { type ReactNode } from "react"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { ApiKeySettings } from "@/components/settings"
import { useUiStore } from "@/stores/uiStore"

interface MainLayoutProps {
  children: ReactNode
}

interface SettingsPanelProps {
  onClose: () => void
}

function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">API 密钥配置</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ApiKeySettings />
        </div>
      </div>
    </div>
  )
}

export function MainLayout({ children }: MainLayoutProps) {
  const settingsOpen = useUiStore((state) => state.settingsOpen)
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
