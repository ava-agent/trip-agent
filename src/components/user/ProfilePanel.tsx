import { useState, useEffect } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import type { UserPreferences, BehaviorAnalytics } from "@/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Settings,
  Download,
  Trash2,
  Heart,
  MapPin,
  Wallet,
  Home,
  Car,
  Utensils,
  Activity,
  Check,
} from "lucide-react"

const INTEREST_OPTIONS = [
  "历史古迹", "自然风光", "美食体验", "购物",
  "夜生活", "艺术", "冒险", "休闲度假",
  "家庭亲子", "商务", "摄影", "宗教文化",
]

const ACCOMMODATION_OPTIONS = [
  { value: "budget", label: "经济型", icon: "💰", description: "青旅、经济型酒店" },
  { value: "mid-range", label: "舒适型", icon: "🏨", description: "四星酒店、精品民宿" },
  { value: "luxury", label: "豪华型", icon: "🌟", description: "五星酒店、度假村" },
]

const TRANSPORT_OPTIONS = [
  { value: "public", label: "公共交通", icon: "🚌" },
  { value: "walking", label: "步行", icon: "🚶" },
  { value: "rental", label: "租车", icon: "🚗" },
  { value: "taxi", label: "出租车/网约车", icon: "🚕" },
]

interface ProfilePanelProps {
  className?: string
}

export function ProfilePanel({ className }: ProfilePanelProps) {
  const { session, updatePreferences, exportData, clearData, getBehaviorAnalytics } = useSessionStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrefs, setEditedPrefs] = useState<UserPreferences>(session.preferences)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [analytics, setAnalytics] = useState<BehaviorAnalytics | null>(null)

  useEffect(() => {
    setAnalytics(getBehaviorAnalytics())
  }, [session, getBehaviorAnalytics])

  const handleSavePreferences = () => {
    updatePreferences(editedPrefs)
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditedPrefs(session.preferences)
    setIsEditing(false)
  }

  const toggleInterest = (interest: string) => {
    setEditedPrefs((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const toggleAccommodation = (type: "budget" | "mid-range" | "luxury") => {
    setEditedPrefs((prev) => ({
      ...prev,
      accommodationType: prev.accommodationType?.includes(type)
        ? prev.accommodationType.filter((t) => t !== type)
        : [...(prev.accommodationType || []), type],
    }))
  }

  const toggleTransport = (type: "public" | "rental" | "walking" | "taxi") => {
    setEditedPrefs((prev) => ({
      ...prev,
      transportationPreference: prev.transportationPreference?.includes(type)
        ? prev.transportationPreference.filter((t) => t !== type)
        : [...(prev.transportationPreference || []), type],
    }))
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `trip-agent-data-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportDialog(false)
  }

  const handleClearData = () => {
    clearData()
    setShowDeleteDialog(false)
  }

  const maturityScore = analytics
    ? Math.round(
        (analytics.topInterests.length > 0 ? 0.2 : 0) +
        (analytics.preferredDestinations.length > 0 ? 0.2 : 0) +
        (analytics.totalTripsPlanned > 0 ? 0.2 : 0) +
        (session.preferences.budget ? 0.2 : 0) +
        (session.preferences.accommodationType?.length ? 0.1 : 0) +
        (session.preferences.transportationPreference?.length ? 0.1 : 0)
      ) * 100
    : 0

  return (
    <div className={className}>
      <Card className="p-6 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">旅行偏好</h2>
              <p className="text-sm text-muted-foreground">
                资料完整度 {maturityScore}%
              </p>
            </div>
          </div>
          {!isEditing && (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-240px)]">
          {/* Analytics Summary */}
          {analytics && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                行为分析
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">已规划行程:</span>
                  <span className="ml-2 font-medium">{analytics.totalTripsPlanned} 次</span>
                </div>
                <div>
                  <span className="text-muted-foreground">平均天数:</span>
                  <span className="ml-2 font-medium">{analytics.averageTripDuration} 天</span>
                </div>
              </div>
            </div>
          )}

          {/* Current Preferences Display */}
          {!isEditing ? (
            <div className="space-y-6">
              {/* Interests */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  兴趣偏好
                </h3>
                {session.preferences.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.preferences.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未设置兴趣偏好</p>
                )}
              </div>

              <Separator />

              {/* Budget */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-500" />
                  预算范围
                </h3>
                {session.preferences.budget ? (
                  <p className="text-sm">
                    ¥{session.preferences.budget.min} - ¥{session.preferences.budget.max}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">未设置预算</p>
                )}
              </div>

              <Separator />

              {/* Accommodation */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4 text-blue-500" />
                  住宿偏好
                </h3>
                {session.preferences.accommodationType && session.preferences.accommodationType.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.preferences.accommodationType.map((type) => {
                      const option = ACCOMMODATION_OPTIONS.find((o) => o.value === type)
                      return (
                        <Badge key={type} variant="outline">
                          {option?.icon} {option?.label}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未设置住宿偏好</p>
                )}
              </div>

              <Separator />

              {/* Transportation */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4 text-yellow-500" />
                  交通偏好
                </h3>
                {session.preferences.transportationPreference && session.preferences.transportationPreference.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.preferences.transportationPreference.map((type) => {
                      const option = TRANSPORT_OPTIONS.find((o) => o.value === type)
                      return (
                        <Badge key={type} variant="outline">
                          {option?.icon} {option?.label}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未设置交通偏好</p>
                )}
              </div>

              <Separator />

              {/* Favorite Destinations */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  收藏目的地
                </h3>
                {session.favoriteDestinations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.favoriteDestinations.map((dest) => (
                      <Badge key={dest} variant="secondary">
                        <Heart className="w-3 h-3 mr-1 fill-current" />
                        {dest}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无收藏</p>
                )}
              </div>

              <Separator />

              {/* Data Management */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">数据管理</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowExportDialog(true)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出我的数据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除所有数据
                </Button>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="space-y-6">
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  取消
                </Button>
                <Button size="sm" onClick={handleSavePreferences}>
                  <Check className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </div>

              {/* Interests */}
              <div>
                <h3 className="text-sm font-medium mb-3">选择你的兴趣</h3>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm transition-all
                        ${editedPrefs.interests.includes(interest)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                        }
                      `}
                    >
                      {editedPrefs.interests.includes(interest) && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Budget */}
              <div>
                <h3 className="text-sm font-medium mb-3">预算范围 (CNY)</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">最低</label>
                    <Input
                      type="number"
                      value={editedPrefs.budget?.min || ""}
                      onChange={(e) =>
                        setEditedPrefs((prev) => ({
                          ...prev,
                          budget: { ...prev.budget, min: parseInt(e.target.value) || 0, max: prev.budget?.max || 10000, currency: "CNY" },
                        }))
                      }
                      placeholder="500"
                    />
                  </div>
                  <span className="text-muted-foreground">-</span>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">最高</label>
                    <Input
                      type="number"
                      value={editedPrefs.budget?.max || ""}
                      onChange={(e) =>
                        setEditedPrefs((prev) => ({
                          ...prev,
                          budget: { ...prev.budget, min: prev.budget?.min || 500, max: parseInt(e.target.value) || 10000, currency: "CNY" },
                        }))
                      }
                      placeholder="10000"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Accommodation */}
              <div>
                <h3 className="text-sm font-medium mb-3">住宿类型</h3>
                <div className="space-y-2">
                  {ACCOMMODATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleAccommodation(option.value as any)}
                      className={`
                        w-full p-3 rounded-lg border-2 text-left transition-all
                        ${editedPrefs.accommodationType?.includes(option.value as any)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{option.icon}</span>
                          <div>
                            <div className="font-medium text-sm">{option.label}</div>
                            <div className="text-xs text-muted-foreground">{option.description}</div>
                          </div>
                        </div>
                        {editedPrefs.accommodationType?.includes(option.value as any) && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Transportation */}
              <div>
                <h3 className="text-sm font-medium mb-3">交通方式</h3>
                <div className="grid grid-cols-2 gap-2">
                  {TRANSPORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleTransport(option.value as any)}
                      className={`
                        p-3 rounded-lg border-2 text-center transition-all
                        ${editedPrefs.transportationPreference?.includes(option.value as any)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/50"
                        }
                      `}
                    >
                      <div className="text-2xl mb-1">{option.icon}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                      {editedPrefs.transportationPreference?.includes(option.value as any) && (
                        <Check className="w-4 h-4 text-primary mx-auto mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Dietary Restrictions */}
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Utensils className="w-4 h-4" />
                  饮食限制 (可选)
                </h3>
                <Input
                  placeholder="如：素食、清真、无麸质等"
                  value={editedPrefs.dietaryRestrictions?.join(", ") || ""}
                  onChange={(e) =>
                    setEditedPrefs((prev) => ({
                      ...prev,
                      dietaryRestrictions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                />
              </div>
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-96">
            <h3 className="text-lg font-semibold mb-2">导出数据</h3>
            <p className="text-sm text-muted-foreground mb-4">
              导出你的偏好、历史记录和反馈数据。数据将以 JSON 格式下载。
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowExportDialog(false)}>
                取消
              </Button>
              <Button className="flex-1" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                导出
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-96">
            <h3 className="text-lg font-semibold mb-2 text-destructive">清除所有数据</h3>
            <p className="text-sm text-muted-foreground mb-4">
              此操作将删除你的所有偏好、历史记录和反馈。此操作无法撤销。
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteDialog(false)}>
                取消
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleClearData}>
                <Trash2 className="w-4 h-4 mr-2" />
                确认删除
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
