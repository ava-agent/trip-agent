import { useState } from "react"
import { useSessionStore } from "@/stores/sessionStore"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react"

const ONBOARDING_STEPS = [
  {
    id: "interests",
    title: "选择你的兴趣",
    description: "我们可以根据你的兴趣推荐更合适的行程",
    icon: "🎯",
  },
  {
    id: "budget",
    title: "设置预算范围",
    description: "帮助我们推荐符合你预算的酒店和活动",
    icon: "💰",
  },
  {
    id: "accommodation",
    title: "住宿偏好",
    description: "你更喜欢什么类型的住宿？",
    icon: "🏨",
  },
  {
    id: "transportation",
    title: "交通方式",
    description: "旅行时你更倾向使用什么交通方式？",
    icon: "🚗",
  },
]

const INTEREST_OPTIONS = [
  "历史古迹", "自然风光", "美食体验", "购物",
  "夜生活", "艺术", "冒险", "休闲度假",
  "家庭亲子", "摄影", "宗教文化", "体育活动",
]

const ACCOMMODATION_OPTIONS = [
  { value: "budget", label: "经济型", icon: "💰", desc: "青旅、经济型酒店" },
  { value: "mid-range", label: "舒适型", icon: "🏨", desc: "四星酒店、精品民宿" },
  { value: "luxury", label: "豪华型", icon: "🌟", desc: "五星酒店、度假村" },
]

const TRANSPORT_OPTIONS = [
  { value: "public", label: "公共交通", icon: "🚌" },
  { value: "walking", label: "步行", icon: "🚶" },
  { value: "rental", label: "租车", icon: "🚗" },
  { value: "taxi", label: "出租车", icon: "🚕" },
]

interface OnboardingFlowProps {
  onComplete?: () => void
  className?: string
}

export function OnboardingFlow({ onComplete, className }: OnboardingFlowProps) {
  const { updatePreferences, completeOnboarding } = useSessionStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    interests: [] as string[],
    budgetMin: "",
    budgetMax: "",
    accommodation: [] as string[],
    transportation: [] as string[],
  })

  const currentStepData = ONBOARDING_STEPS[currentStep]

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Save all preferences
    updatePreferences({
      interests: formData.interests,
      budget:
        formData.budgetMin && formData.budgetMax
          ? {
              min: parseInt(formData.budgetMin),
              max: parseInt(formData.budgetMax),
              currency: "CNY",
            }
          : undefined,
      accommodationType: formData.accommodation.length > 0 ? (formData.accommodation as any) : undefined,
      transportationPreference: formData.transportation.length > 0 ? (formData.transportation as any) : undefined,
    })

    completeOnboarding()
    onComplete?.()
  }

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const toggleAccommodation = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      accommodation: prev.accommodation.includes(value)
        ? prev.accommodation.filter((v) => v !== value)
        : [...prev.accommodation, value],
    }))
  }

  const toggleTransport = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      transportation: prev.transportation.includes(value)
        ? prev.transportation.filter((v) => v !== value)
        : [...prev.transportation, value],
    }))
  }

  const canProceed = () => {
    switch (currentStepData.id) {
      case "interests":
        return formData.interests.length > 0
      case "budget":
        return true // Optional
      case "accommodation":
        return formData.accommodation.length > 0
      case "transportation":
        return formData.transportation.length > 0
      default:
        return true
    }
  }

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case "interests":
        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${formData.interests.includes(interest)
                      ? "bg-primary text-primary-foreground scale-105"
                      : "bg-muted hover:bg-muted/80"
                    }
                  `}
                >
                  {formData.interests.includes(interest) && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {interest}
                </button>
              ))}
            </div>
            {formData.interests.length === 0 && (
              <p className="text-sm text-muted-foreground">请至少选择一个兴趣</p>
            )}
          </div>
        )

      case "budget":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              设置你的单次旅行预算范围（人民币）。这是可选的，但有助于我们推荐合适的选择。
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">最低预算</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ¥
                  </span>
                  <Input
                    type="number"
                    placeholder="500"
                    value={formData.budgetMin}
                    onChange={(e) => setFormData({ ...formData, budgetMin: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              <span className="text-muted-foreground pt-6">-</span>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">最高预算</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ¥
                  </span>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={formData.budgetMax}
                    onChange={(e) => setFormData({ ...formData, budgetMax: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, budgetMin: "500", budgetMax: "2000" })}
              >
                经济 (¥500-2000)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, budgetMin: "2000", budgetMax: "5000" })}
              >
                舒适 (¥2000-5000)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFormData({ ...formData, budgetMin: "5000", budgetMax: "15000" })}
              >
                豪华 (¥5000+)
              </Button>
            </div>
          </div>
        )

      case "accommodation":
        return (
          <div className="space-y-3">
            {ACCOMMODATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleAccommodation(option.value)}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all
                  ${formData.accommodation.includes(option.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.desc}</div>
                    </div>
                  </div>
                  {formData.accommodation.includes(option.value) && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )

      case "transportation":
        return (
          <div className="grid grid-cols-2 gap-3">
            {TRANSPORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => toggleTransport(option.value)}
                className={`
                  p-4 rounded-xl border-2 text-center transition-all
                  ${formData.transportation.includes(option.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                  }
                `}
              >
                <div className="text-3xl mb-2">{option.icon}</div>
                <div className="font-medium text-sm">{option.label}</div>
                {formData.transportation.includes(option.value) && (
                  <Check className="w-4 h-4 text-primary mx-auto mt-2" />
                )}
              </button>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={className}>
      <Card className="p-8 max-w-lg mx-auto">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {ONBOARDING_STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => index <= currentStep && setCurrentStep(index)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all
                ${index < currentStep
                  ? "bg-primary text-primary-foreground"
                  : index === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground"
                }
              `}
              disabled={index > currentStep}
            >
              {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">{currentStepData.icon}</div>
          <h2 className="text-2xl font-bold mb-2">{currentStepData.title}</h2>
          <p className="text-muted-foreground">{currentStepData.description}</p>
        </div>

        {/* Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentStep > 0 ? (
            <Button variant="outline" onClick={handlePrevious} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" />
              上一步
            </Button>
          ) : (
            <div className="flex-1" />
          )}

          <Button
            onClick={handleNext}
            className="flex-1"
            disabled={!canProceed()}
          >
            {currentStep === ONBOARDING_STEPS.length - 1 ? (
              <>
                <Sparkles className="w-4 h-4 mr-1" />
                开始使用
              </>
            ) : (
              <>
                下一步
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Skip link */}
        {currentStep < ONBOARDING_STEPS.length - 1 && (
          <button
            onClick={handleComplete}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            跳过设置，稍后配置
          </button>
        )}
      </Card>
    </div>
  )
}

interface QuickTemplateCardProps {
  name: string
  description: string
  destination: string
  days: number
  estimatedBudget: number
  interests: string[]
  onSelect: () => void
}

export function QuickTemplateCard({
  name,
  description,
  destination,
  days,
  estimatedBudget,
  interests,
  onSelect,
}: QuickTemplateCardProps) {
  return (
    <Card
      className="p-4 hover:border-primary transition-colors cursor-pointer group"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold group-hover:text-primary transition-colors">{name}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">{days}天</Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          📍 {destination}
        </span>
        <span className="flex items-center gap-1">
          💰 ¥{estimatedBudget}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {interests.slice(0, 3).map((interest) => (
          <Badge key={interest} variant="outline" className="text-xs">
            {interest}
          </Badge>
        ))}
      </div>
    </Card>
  )
}
