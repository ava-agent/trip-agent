import { useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, Eye, EyeOff, Download, Trash2, AlertTriangle } from "lucide-react"

interface PrivacySettingsProps {
  className?: string
}

export function PrivacySettings({ className }: PrivacySettingsProps) {
  const { session, exportData, clearData } = useSessionStore()
  const [showDataPreview, setShowDataPreview] = useState(false)

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trip-agent-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    if (confirm("确定要清除所有数据吗？此操作无法撤销。\n\n将被清除：\n• 你的偏好设置\n• 对话历史\n• 收藏的目的地\n• 反馈记录")) {
      clearData()
    }
  }

  // Calculate what data is stored
  const dataSummary = {
    preferences: Object.keys(session.preferences).filter(
      (key) => {
        const value = session.preferences[key as keyof typeof session.preferences]
        return value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true)
      }
    ).length,
    conversations: session.conversationHistory.length,
    destinations: session.destinationInteractions.length,
    feedback: session.feedback.length,
    favorites: session.favoriteDestinations.length,
  }

  const totalDataPoints = Object.values(dataSummary).reduce((a, b) => a + b, 0)

  return (
    <div className={className}>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">隐私设置</h2>
            <p className="text-sm text-muted-foreground">控制你的数据</p>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-6">
            {/* Data Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                存储的数据概览
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">偏好设置:</span>
                  <span className="font-medium">{dataSummary.preferences} 项</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">对话记录:</span>
                  <span className="font-medium">{dataSummary.conversations} 条</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">浏览记录:</span>
                  <span className="font-medium">{dataSummary.destinations} 个</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">反馈记录:</span>
                  <span className="font-medium">{dataSummary.feedback} 条</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">收藏目的地:</span>
                  <span className="font-medium">{dataSummary.favorites} 个</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">数据总量:</span>
                  <span className="font-medium">{totalDataPoints} 项</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                我们如何使用你的数据
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• 偏好设置：用于个性化推荐</li>
                <li>• 对话记录：用于上下文理解（本地存储）</li>
                <li>• 浏览记录：用于改善推荐算法</li>
                <li>• 反馈：用于学习你的喜好</li>
              </ul>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                所有数据仅存储在你的本地设备上，我们不会上传到服务器。
              </p>
            </div>

            {/* Data Storage Location */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium mb-2">存储位置</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Web 版本：浏览器的 localStorage</p>
                <p>• 桌面版本：本地应用数据文件夹</p>
              </div>
              <div className="mt-3 p-2 bg-muted rounded text-xs font-mono">
                ~/trip-agent/session-data.json
              </div>
            </div>

            {/* Data Preview */}
            <div>
              <button
                onClick={() => setShowDataPreview(!showDataPreview)}
                className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {showDataPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    查看原始数据
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {showDataPreview ? "隐藏" : "显示"}
                  </Badge>
                </div>
              </button>

              {showDataPreview && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(
                      {
                        preferences: session.preferences,
                        favoriteDestinations: session.favoriteDestinations,
                        conversationCount: session.conversationHistory.length,
                        interactionCount: session.destinationInteractions.length,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

            {/* GDPR Rights */}
            <div className="p-4 border rounded-lg">
              <h3 className="text-sm font-medium mb-3">你的数据权利</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Download className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">数据导出权</div>
                    <div className="text-muted-foreground text-xs">
                      你可以随时导出你的所有数据
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">数据删除权</div>
                    <div className="text-muted-foreground text-xs">
                      你可以要求删除所有存储的数据
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Eye className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">数据访问权</div>
                    <div className="text-muted-foreground text-xs">
                      你可以随时查看存储的数据
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                导出我的数据 (JSON)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={handleClear}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除所有数据
              </Button>
            </div>

            {/* Warning Notice */}
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>重要提示：</strong>
                删除数据是不可逆的操作。在删除前，建议先导出数据作为备份。
              </div>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}
