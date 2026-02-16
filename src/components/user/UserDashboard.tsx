/**
 * User Dashboard - Main component integrating all user-related features
 */

import { useEffect, useState, useMemo } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { OnboardingFlow } from "./OnboardingFlow"
import { ProfilePanel } from "./ProfilePanel"
import { QuickTemplates, DestinationHistory } from "./QuickTemplates"
import { PrivacySettings } from "./PrivacySettings"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { User, Sparkles, History, Shield, X } from "lucide-react"

type TabValue = "templates" | "history" | "profile" | "privacy"

interface UserDashboardProps {
  onTripSelect?: (destination: string, days: number) => void
  onClose?: () => void
  className?: string
}

export function UserDashboard({ onTripSelect, onClose, className }: UserDashboardProps) {
  const { session, isInitialized, initializeSession } = useSessionStore()
  const [activeTab, setActiveTab] = useState<TabValue>("templates")

  useEffect(() => {
    if (!isInitialized) {
      initializeSession()
    }
  }, [isInitialized, initializeSession])

  const maturityScore = useMemo(() => Math.round(
    (session.preferences.interests.length > 0 ? 0.2 : 0) +
    (session.preferences.budget ? 0.2 : 0) +
    (session.preferences.accommodationType?.length ? 0.2 : 0) +
    (session.favoriteDestinations.length > 0 ? 0.2 : 0) +
    (session.conversationHistory.length > 5 ? 0.2 : 0)
  ) * 100, [session.preferences, session.favoriteDestinations, session.conversationHistory])

  // Show onboarding if not completed
  if (!session.onboardingCompleted) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">欢迎来到 Trip Agent!</h2>
            <p className="text-muted-foreground">让我们先了解你的旅行偏好</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
        <OnboardingFlow onComplete={() => setActiveTab("templates")} />
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6" />
            旅行助手
          </h2>
          <p className="text-muted-foreground">
            个性化体验 · 资料完整度 {maturityScore}%
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {maturityScore < 50 && (
        <Card className="p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                完善你的旅行档案
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                填写更多偏好信息，让我们为你提供更精准的推荐！
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-blue-700 dark:text-blue-300"
                onClick={() => setActiveTab("profile")}
              >
                前往设置 →
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">快速模板</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">浏览历史</span>
            {session.destinationInteractions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {session.destinationInteractions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">偏好设置</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">隐私</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <QuickTemplates
            onSelectTemplate={(template) => {
              onTripSelect?.(template.destination, template.days)
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DestinationHistory
            onSelectDestination={(destination) => {
              onTripSelect?.(destination, 5)
            }}
          />
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <ProfilePanel />
        </TabsContent>

        <TabsContent value="privacy" className="mt-4">
          <PrivacySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Compact User Menu - For use in sidebar or header
 */
interface UserMenuProps {
  onOpenDashboard?: () => void
  className?: string
}

export function UserMenu({ onOpenDashboard, className }: UserMenuProps) {
  const { session } = useSessionStore()

  return (
    <div className={className}>
      <Button
        variant="ghost"
        className="justify-start w-full"
        onClick={onOpenDashboard}
      >
        <User className="w-4 h-4 mr-2" />
        旅行助手
        {session.favoriteDestinations.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {session.favoriteDestinations.length}
          </Badge>
        )}
      </Button>
    </div>
  )
}
