# 会话管理与个性化功能

本文档介绍了 Trip Agent 的用户会话管理和个性化推荐功能。

## 概述

会话管理系统提供了以下功能：

- **用户偏好管理**：存储和管理用户的旅行偏好
- **对话历史追踪**：记录用户与 AI 的对话历史
- **行为分析**：从用户行为中学习并改进推荐
- **快速模板**：基于历史生成个性化行程模板
- **隐私保护**：支持数据导出和删除（GDPR 合规）

## 架构

### 核心文件

| 文件 | 描述 |
|------|------|
| `src/stores/sessionStore.ts` | Zustand 状态管理，处理用户会话数据 |
| `src/services/preferenceService.ts` | 偏好学习算法和分析 |
| `src/services/sessionService.ts` | 会话管理的高层 API |
| `src/components/user/` | 用户界面组件 |

### 数据流

```
用户交互 → SessionService → SessionStore → PreferenceService → 个性化推荐
```

## 使用方法

### 1. 初始化会话

在应用启动时初始化会话：

```tsx
import { initializeSession } from '@/services/sessionService'

function App() {
  useEffect(() => {
    initializeSession(userId) // userId 可选
  }, [])
}
```

### 2. 追踪用户消息

自动从用户消息中提取和学习偏好：

```tsx
import { trackUserMessage } from '@/services/sessionService'

trackUserMessage(
  message,
  tripId,
  ['东京', '大阪'] // 相关目的地
)
```

### 3. 记录反馈

收集用户对推荐的反馈：

```tsx
import { recordFeedback } from '@/services/sessionService'

recordFeedback(
  'trip-123',
  'destination',
  '东京',
  'positive',
  '非常棒的行程！'
)
```

### 4. 获取个性化推荐

```tsx
import { getPersonalizedContext, getUserPreferences } from '@/services/sessionService'

const preferences = getUserPreferences()
const context = getPersonalizedContext()

// 在 Agent 提示词中使用
const prompt = `
用户上下文：
${context}

用户消息：${userMessage}
`
```

## UI 组件

### UserDashboard

主要的用户仪表板组件，包含所有用户功能：

```tsx
import { UserDashboard } from '@/components/user'

<UserDashboard
  onTripSelect={(destination, days) => {
    // 处理模板选择
  }}
  onClose={() => setShowDashboard(false)}
/>
```

### ProfilePanel

用户偏好设置面板：

```tsx
import { ProfilePanel } from '@/components/user'

<ProfilePanel className="w-80" />
```

### FeedbackButton

在推荐项上添加反馈按钮：

```tsx
import { FeedbackButton, SaveDestinationButton } from '@/components/user'

<FeedbackButton
  tripId="trip-123"
  itemName="东京"
  recommendationType="destination"
  onFeedbackGiven={(feedback) => console.log(feedback)}
/>

<SaveDestinationButton destination="东京" />
```

### OnboardingFlow

新用户引导流程：

```tsx
import { OnboardingFlow } from '@/components/user'

<OnboardingFlow onComplete={() => {
  console.log('Onboarding completed')
}} />
```

## 数据存储

### 本地存储（Web）

数据存储在浏览器的 localStorage 中，键名为 `trip-agent-session`。

### Tauri 文件系统（桌面）

在桌面应用中，数据存储在应用数据目录：

```
~/AppData/Roaming/trip-agent/session-data.json  (Windows)
~/Library/Application Support/trip-agent/session-data.json  (macOS)
~/.config/trip-agent/session-data.json  (Linux)
```

## 隐私与合规

### 数据导出

用户可以导出所有个人数据：

```tsx
import { exportUserData } from '@/services/sessionService'

const jsonData = exportUserData()
// 下载为 JSON 文件
```

### 数据删除

支持完全删除用户数据：

```tsx
import { deleteUserData } from '@/services/sessionService'

deleteUserData() // 不可逆操作
```

### 匿名化

导出数据时自动移除敏感信息：

- 电子邮件地址
- 电话号码
- 其他 PII（个人身份信息）

## 偏好学习算法

### 兴趣检测

从用户消息中自动检测旅行兴趣：

```tsx
import { PreferenceLearningService } from '@/services/preferenceService'

const interests = PreferenceLearningService.extractInterestsFromMessage(
  "我喜欢历史古迹和美食体验"
)
// 返回: ["历史古迹", "美食体验"]
```

### 行为分析

分析用户行为模式：

```tsx
const analytics = getBehaviorAnalytics()
// {
//   topInterests: [{ interest: "美食", score: 15 }],
//   preferredDestinations: [{ destination: "东京", score: 25 }],
//   averageTripDuration: 5,
//   ...
// }
```

### 会话成熟度

计算系统对用户的了解程度（0-1）：

```tsx
import { getSessionMaturity } from '@/services/sessionService'

const maturity = getSessionMaturity()
// 0.8 表示系统对用户有 80% 的了解
```

## API 参考

### SessionService

| 方法 | 描述 |
|------|------|
| `initializeSession(userId?)` | 初始化会话 |
| `trackUserMessage(msg, tripId, destinations)` | 追踪用户消息 |
| `trackAssistantMessage(content, tripId)` | 追踪 AI 回复 |
| `recordFeedback(...)` | 记录反馈 |
| `toggleFavoriteDestination(dest)` | 切换收藏 |
| `getPersonalizedContext()` | 获取个性化上下文 |
| `getUserPreferences()` | 获取用户偏好 |
| `exportUserData()` | 导出用户数据 |
| `deleteUserData()` | 删除用户数据 |

### SessionStore

| 状态 | 描述 |
|------|------|
| `session` | 当前用户会话数据 |
| `isInitialized` | 是否已初始化 |

| 操作 | 描述 |
|------|------|
| `initializeSession(userId)` | 初始化会话 |
| `updatePreferences(prefs)` | 更新偏好 |
| `addConversationMessage(msg)` | 添加对话消息 |
| `trackDestinationInteraction(dest, feedback)` | 追踪目的地互动 |
| `saveDestination(dest)` | 保存目的地 |
| `unsaveDestination(dest)` | 取消保存 |
| `addFeedback(feedback)` | 添加反馈 |
| `exportData()` | 导出数据 |
| `clearData()` | 清除数据 |

## 示例：完整集成

```tsx
import { useEffect } from 'react'
import { UserDashboard } from '@/components/user'
import { ChatWindow } from '@/components/chat'
import { initializeSession } from '@/services/sessionService'

function App() {
  useEffect(() => {
    initializeSession()
  }, [])

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r p-4">
        <UserDashboard />
      </aside>
      <main className="flex-1">
        <ChatWindow />
      </main>
    </div>
  )
}
```

## 最佳实践

1. **隐私优先**：所有数据默认本地存储
2. **渐进式学习**：系统逐渐了解用户，不要求立即填写所有信息
3. **透明度**：向用户展示如何使用他们的数据
4. **用户控制**：用户可以随时查看、修改或删除数据
5. **无敏感数据**：不存储密码、支付信息等敏感数据

## 扩展

### 添加新的兴趣类型

在 `preferenceService.ts` 中修改 `INTEREST_KEYWORDS`：

```tsx
const INTEREST_KEYWORDS: Record<string, string[]> = {
  // ... 现有兴趣
  "摄影": ["拍照", "照片", "摄影", "相机"],
}
```

### 自定义存储后端

修改 `sessionStore.ts` 中的 `storageAdapter` 以支持自定义存储：

```tsx
const storageAdapter = {
  async getItem(name: string) {
    // 自定义实现
  },
  async setItem(name: string, value: string) {
    // 自定义实现
  },
  async removeItem(name: string) {
    // 自定义实现
  },
}
```
