import { useEffect, useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import type { QuickTripTemplate } from "@/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Clock, MapPin } from "lucide-react"
import { QuickTemplateCard } from "./OnboardingFlow"

interface QuickTemplatesProps {
  onSelectTemplate?: (template: QuickTripTemplate) => void
  className?: string
}

export function QuickTemplates({ onSelectTemplate, className }: QuickTemplatesProps) {
  const { getQuickTripTemplates, session } = useSessionStore()
  const [templates, setTemplates] = useState<QuickTripTemplate[]>([])

  useEffect(() => {
    setTemplates(getQuickTripTemplates())
  }, [session, getQuickTripTemplates])

  if (templates.length === 0) {
    return (
      <div className={className}>
        <Card className="p-6">
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">暂无快捷模板</h3>
            <p className="text-sm text-muted-foreground mb-4">
              开始规划你的第一次旅行，我们将为你生成个性化模板
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              快捷行程模板
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              基于你的偏好和历史生成的个性化模板
            </p>
          </div>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-3 pr-4">
            {templates.map((template) => (
              <QuickTemplateCard
                key={template.id}
                name={template.name}
                description={template.description}
                destination={template.destination}
                days={template.days}
                estimatedBudget={template.estimatedBudget}
                interests={template.interests}
                onSelect={() => onSelectTemplate?.(template)}
              />
            ))}
          </div>
        </ScrollArea>

        {templates.some((t) => t.basedOnHistory) && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 这些模板是根据你的旅行历史和偏好生成的，选择一个开始快速规划！
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

interface TripHistoryCardProps {
  destination: string
  queryCount: number
  lastQueried: Date
  positiveFeedback: number
  saved: boolean
  onSelect: () => void
}

export function TripHistoryCard({
  destination,
  queryCount,
  lastQueried,
  positiveFeedback,
  saved,
  onSelect,
}: TripHistoryCardProps) {
  const daysSince = Math.floor((Date.now() - lastQueried.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card
      className="p-4 hover:border-primary transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{destination}</span>
          {saved && (
            <Badge variant="secondary" className="text-xs">
              已收藏
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {daysSince === 0 ? "今天" : daysSince === 1 ? "昨天" : `${daysSince}天前`}
        </span>
        <span>查询 {queryCount} 次</span>
        {positiveFeedback > 0 && (
          <span className="text-green-600">👍 {positiveFeedback}</span>
        )}
      </div>
    </Card>
  )
}

interface DestinationHistoryProps {
  onSelectDestination?: (destination: string) => void
  className?: string
}

export function DestinationHistory({ onSelectDestination, className }: DestinationHistoryProps) {
  const { session } = useSessionStore()

  const sortedInteractions = [...session.destinationInteractions]
    .sort((a, b) => b.lastQueried.getTime() - a.lastQueried.getTime())
    .slice(0, 10)

  if (sortedInteractions.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              最近浏览
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              继续规划你之前查询过的目的地
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {sortedInteractions.map((interaction) => (
            <TripHistoryCard
              key={interaction.destination}
              destination={interaction.destination}
              queryCount={interaction.queryCount}
              lastQueried={interaction.lastQueried}
              positiveFeedback={interaction.positiveFeedback}
              saved={interaction.saved}
              onSelect={() => onSelectDestination?.(interaction.destination)}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
