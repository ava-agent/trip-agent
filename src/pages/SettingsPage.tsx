import { ApiKeySettings } from "@/components/settings"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </div>
        <h1 className="text-2xl font-bold mb-6">设置</h1>
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">API 密钥配置</h2>
            <ApiKeySettings />
          </section>
        </div>
      </div>
    </div>
  )
}
