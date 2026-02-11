/**
 * GLM Service Usage Examples
 * 智谱 AI GLM-4.7 API 使用示例
 */

import { GLMService, GLM_PROMPTS } from "./glmService"
import { LLMService } from "./llmService"
import { isLLMAvailable, getLLMProvider, getLLMProviderName, MultiAgentService } from "./multiAgentService"
import type { AgentMessage } from "./multiAgentService"
import type { Question } from "./questionGenerator"
import type { UserPreferences } from "@/types"

// ============================================================================
// Type Guards for Union Types
// ============================================================================

/**
 * 类型守卫：检查是否是 agent 消息响应
 */
function isAgentMessageResponse(response: { message: AgentMessage; done?: boolean } | { type: "need_more_info"; questions: Question[] }): response is { message: AgentMessage; done?: boolean } {
  return 'message' in response
}

// ============================================================================
// Example 1: Check LLM Status
// ============================================================================

export function example1_CheckLLMStatus() {
  console.log("=== LLM Status Check ===")
  console.log("LLM Available:", isLLMAvailable())
  console.log("Provider:", getLLMProvider())
  console.log("Provider Name:", getLLMProviderName())

  const config = LLMService.getConfig()
  if (config) {
    console.log("Model:", config.model)
    console.log("Base URL:", config.baseURL)
  }
}

// ============================================================================
// Example 2: Basic Chat Completion
// ============================================================================

export async function example2_BasicChatCompletion() {
  if (!isLLMAvailable()) {
    console.log("LLM not available. Please set VITE_GLM_API_KEY in .env")
    return
  }

  const messages = [
    { role: "system" as const, content: "你是一个专业的旅行规划助手。" },
    { role: "user" as const, content: "东京有哪些必去的景点？" },
  ]

  try {
    const response = await LLMService.chatCompletion(messages)
    console.log("Response:", response)
  } catch (error) {
    console.error("Error:", error)
  }
}

// ============================================================================
// Example 3: Streaming Chat Completion
// ============================================================================

export async function example3_StreamingChatCompletion() {
  if (!isLLMAvailable()) {
    console.log("LLM not available. Please set VITE_GLM_API_KEY in .env")
    return
  }

  const messages = [
    { role: "system" as const, content: GLM_PROMPTS.PLANNER },
    { role: "user" as const, content: "请为巴黎规划一个5天的旅行行程" },
  ]

  let fullResponse = ""

  try {
    for await (const chunk of LLMService.streamChat(messages, (content) => {
      console.log("Chunk:", content)
    })) {
      if (!chunk.done) {
        fullResponse += chunk.content
        console.log("Current:", fullResponse)
      }
    }

    console.log("Full Response:", fullResponse)
  } catch (error) {
    console.error("Error:", error)
  }
}

// ============================================================================
// Example 4: Multi-Agent Processing
// ============================================================================

export async function example4_MultiAgentProcessing() {
  const userPreferences: UserPreferences = {
    interests: ["观光", "美食"],
    accommodationType: ["mid-range"],
    transportationPreference: ["public"],
    dietaryRestrictions: [],
    accessibilityNeeds: [],
  }

  const context = {
    userMessage: "我想去东京旅行5天",
    conversationHistory: [] as Array<{ role: string; content: string }>,
    userPreferences,
  }

  console.log("=== Multi-Agent Processing ===")
  console.log("LLM Available:", isLLMAvailable())
  console.log("Provider:", getLLMProviderName())

  const agentResults: string[] = []

  for await (const result of MultiAgentService.processWithAgents(context)) {
    if (isAgentMessageResponse(result)) {
      const { message, done } = result
      const msg = `[${message.agent}] ${message.content}`
      console.log(msg)
      agentResults.push(msg)

      if (done) {
        console.log("=== Processing Complete ===")
      }
    }
  }

  return agentResults
}

// ============================================================================
// Example 5: Trip Planning with User Preferences
// ============================================================================

export async function example5_TripPlanningWithPreferences() {
  const userPreferences: UserPreferences = {
    interests: ["美食体验", "夜市", "当地特色"],
    accommodationType: ["budget"],
    transportationPreference: ["public", "walking"],
    dietaryRestrictions: [],
    accessibilityNeeds: [],
  }

  const context = {
    userMessage: "帮我规划一个新加坡3天2夜的美食之旅，预算3000元",
    conversationHistory: [] as Array<{ role: string; content: string }>,
    userPreferences,
    personalizedContext: "用户偏好性价比高的美食和当地夜市体验",
  }

  console.log("=== Trip Planning with Preferences ===")
  console.log("Destination: 新加坡")
  console.log("Duration: 3天2夜")
  console.log("Budget: 3000元")
  console.log("Interests: 美食体验、夜市、当地特色")

  const trip = await MultiAgentService.generateTripFromContext(context)
  console.log("Generated Trip:", trip.name)
  console.log("Days:", trip.duration.days)

  return trip
}

// ============================================================================
// Example 6: Initialize GLM Service Manually
// ============================================================================

export function example6_ManualInitialization() {
  // Initialize GLM service with custom config
  GLMService.initialize({
    apiKey: "your-api-key-here", // Replace with actual API key
    model: "glm-4-flash",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    maxTokens: 4000,
    temperature: 0.7,
    topP: 0.9,
  })

  console.log("GLM Service Initialized")
  console.log("Is Configured:", GLMService.isConfigured())
  console.log("Config:", GLMService.getConfig())

  // Get available models
  console.log("Available Models:", GLMService.getAvailableModels())
}

// ============================================================================
// Example 7: Error Handling
// ============================================================================

export async function example7_ErrorHandling() {
  if (!isLLMAvailable()) {
    console.log("LLM not available, showing demo of error handling...")
    return
  }

  const messages = [
    { role: "system" as const, content: "You are a helpful assistant." },
    { role: "user" as const, content: "Hello" },
  ]

  try {
    const response = await LLMService.chatCompletion(messages)
    console.log("Success:", response)
  } catch (error) {
    console.error("Error occurred:")
    if (error instanceof Error) {
      console.error("  Name:", error.name)
      console.error("  Message:", error.message)
      // GLMAPIError has additional properties
      if ("code" in error) {
        console.error("  Code:", (error as { code?: string }).code)
      }
      if ("retryable" in error) {
        console.error("  Retryable:", (error as { retryable?: boolean }).retryable)
      }
    }
  }
}

// ============================================================================
// Usage in React Components
// ============================================================================

export function reactComponentExample() {
  // This is how you would use the service in a React component
  const code = `
import { useState } from 'react'
import { isLLMAvailable, MultiAgentService } from '@/services/multiAgentService'

export function TravelPlanner() {
  const [messages, setMessages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (userMessage: string) => {
    setIsLoading(true)

    const context = {
      userMessage,
      conversationHistory: [],
      userPreferences: {
        interests: ['观光', '美食'],
        accommodationType: ['mid-range'],
        transportationPreference: ['public'],
        dietaryRestrictions: [],
        accessibilityNeeds: [],
      },
    }

    const results: string[] = []

    for await (const result of MultiAgentService.processWithAgents(context)) {
      results.push(\`[\${result.message.agent}] \${result.message.content}\`)
      setMessages([...results])
    }

    setIsLoading(false)
  }

  return (
    <div>
      <div>LLM Status: {isLLMAvailable() ? 'Connected' : 'Not Configured'}</div>
      {/* Your UI components */}
    </div>
  )
}
  `

  console.log("React Component Example:")
  console.log(code)
}

// ============================================================================
// Export all examples
// ============================================================================

export const examples = {
  checkLLMStatus: example1_CheckLLMStatus,
  basicChatCompletion: example2_BasicChatCompletion,
  streamingChatCompletion: example3_StreamingChatCompletion,
  multiAgentProcessing: example4_MultiAgentProcessing,
  tripPlanningWithPreferences: example5_TripPlanningWithPreferences,
  manualInitialization: example6_ManualInitialization,
  errorHandling: example7_ErrorHandling,
  reactComponentExample,
}

// ============================================================================
// Main execution (for Node.js testing)
// ============================================================================

if (typeof window === "undefined") {
  // Running in Node.js environment
  console.log("GLM Service Examples")
  console.log("===================")
  console.log("")
  console.log("Available examples:")
  Object.keys(examples).forEach((key) => {
    console.log(`  - ${key}`)
  })
  console.log("")
  console.log("To run an example:")
  console.log("  import { exampleX_XXX } from '@/services/glmExample'")
  console.log("  await exampleX_XXX()")
}
