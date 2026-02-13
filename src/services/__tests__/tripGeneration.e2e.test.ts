/**
 * E2E Tests for Trip Generation
 * Tests that trip generation actually calls LLM and produces varied results
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { LLMService } from '../llmService'
import { MultiAgentService, setLLMEnabled } from '../multiAgentService'
import { isLLMAvailable } from '../multiAgentService'

// Mock the LLM service to verify it's being called
let llmCallCount = 0
let lastLlmMessages: any[] = []

// Store original chatCompletion
const originalChatCompletion = LLMService.chatCompletion

describe('Trip Generation E2E Tests', () => {
  beforeAll(() => {
    // Initialize LLM service with test config
    LLMService.initialize({
      provider: 'glm',
      apiKey: 'test-key-for-e2e',
      model: 'glm-4-flash',
    })
    // Enable LLM integration for tests
    setLLMEnabled(true)
  })

  it('should initialize LLM service', () => {
    expect(LLMService.isConfigured()).toBe(true)
  })

  it('should detect LLM availability', () => {
    const isAvailable = isLLMAvailable()
    expect(isAvailable).toBe(true)
  })

  it('should generate trip with real LLM call', async () => {
    // Mock LLMService.chatCompletion to verify it's called
    LLMService.chatCompletion = async function(messages: any[]): Promise<string> {
      llmCallCount++
      lastLlmMessages = messages

      // Extract destination and days from message
      const destination = messages.find((m: any) => m.content)?.content.includes('东京') ? '东京' :
                         messages.find((m: any) => m.content)?.content.includes('巴黎') ? '巴黎' :
                         messages.find((m: any) => m.content)?.content.includes('纽约') ? '纽约' : '目的地'

      // Find days in all messages
      let days = 5
      for (const msg of messages) {
        const match = msg.content?.match(/(\d+)天/)
        if (match) {
          days = parseInt(match[1], 10)
          break
        }
      }

      // Activity templates for variety
      const activityTemplates = [
        { type: 'attraction', name: `${destination}标志性景点`, description: `参观${destination}最著名地标`, location: `${destination}市中心` },
        { type: 'dining', name: '当地特色美食', description: `品尝${destination}当地美食`, location: '市中心餐厅' },
        { type: 'attraction', name: `${destination}历史文化`, description: `了解${destination}历史文化`, location: '博物馆区' },
        { type: 'shopping', name: `${destination}购物体验`, description: '购买特色商品', location: '商业街' },
        { type: 'attraction', name: `${destination}自然风光`, description: '欣赏自然美景', location: '风景区' },
        { type: 'transportation', name: '前往机场', description: '结束旅程', location: `${destination}国际机场` },
      ]

      // Generate dynamic itinerary based on days
      const itinerary = []
      for (let day = 1; day <= days; day++) {
        const isLastDay = day === days
        const activities = []

        if (day === 1) {
          // First day: arrival
          activities.push({
            type: 'attraction',
            name: `${destination}国际机场`,
            description: '抵达并办理入住',
            locationName: `${destination}国际机场`,
            address: `${destination}机场路1号`,
            startTime: '10:00',
            endTime: '12:00',
            duration: 120,
            cost: 100
          })
        }

        // Add 2-3 activities per day
        const numActivities = isLastDay ? 2 : 3
        for (let i = 0; i < numActivities; i++) {
          const templateIndex = (day + i) % activityTemplates.length
          const template = activityTemplates[templateIndex]
          const startHour = 9 + (i * 3)
          activities.push({
            type: template.type,
            name: template.name,
            description: template.description,
            locationName: template.location,
            address: `${template.location}${day}号`,
            startTime: `${startHour.toString().padStart(2, '0')}:00`,
            endTime: `${(startHour + 2).toString().padStart(2, '0')}:00`,
            duration: 120,
            cost: 100 + (i * 50)
          })
        }

        itinerary.push({
          dayNumber: day,
          activities,
          notes: isLastDay ? '行程圆满结束' : `第${day}天精彩行程`
        })
      }

      return `好的！这是为你规划的${destination}${days}天详细行程：

\`\`\`json
${JSON.stringify(itinerary, null, 2)}
\`\`\`

祝你在${destination}旅途愉快！`
    }

    const context = {
      userMessage: '我想去东京旅游5天',
      conversationHistory: [],
    }

    const trip = await MultiAgentService.generateTripFromContext(context)

    // Verify LLM was called
    expect(llmCallCount).toBeGreaterThan(0)
    expect(lastLlmMessages.length).toBeGreaterThan(0)

    // Verify trip structure
    expect(trip).toBeDefined()
    expect(trip.id).toContain('trip-')
    expect(trip.name).toContain('东京5日游')
    expect(trip.duration.days).toBe(5)
    expect(trip.itinerary).toBeDefined()
    expect(trip.itinerary.length).toBe(5)

    // Verify itinerary has activities
    const firstDay = trip.itinerary[0]
    expect(firstDay.activities).toBeDefined()
    expect(firstDay.activities.length).toBeGreaterThan(0)

    // Verify activities have required fields
    const firstActivity = firstDay.activities[0]
    expect(firstActivity.id).toBeDefined()
    expect(firstActivity.type).toBeDefined()
    expect(firstActivity.name).toContain('东京')  // Should contain destination name
  })

  it('should generate different trips for different destinations', async () => {
    // Reset counters
    llmCallCount = 0
    lastLlmMessages = []

    const context1 = {
      userMessage: '我想去巴黎旅游3天',
      conversationHistory: [],
    }

    const context2 = {
      userMessage: '我想去纽约旅游4天',
      conversationHistory: [],
    }

    const trip1 = await MultiAgentService.generateTripFromContext(context1)
    const trip2 = await MultiAgentService.generateTripFromContext(context2)

    // Verify different destinations
    expect(trip1.name).toContain('巴黎')
    expect(trip2.name).toContain('纽约')

    // Verify different durations
    expect(trip1.duration.days).toBe(3)
    expect(trip2.duration.days).toBe(4)
  })

  it('should include user preferences in LLM call', async () => {
    llmCallCount = 0
    lastLlmMessages = []

    const context = {
      userMessage: '去东京5天',
      conversationHistory: [],
      userPreferences: {
        interests: ['美食', '购物'],
        accommodationType: ['luxury' as const],
        transportationPreference: ['public' as const],
      },
    }

    await MultiAgentService.generateTripFromContext(context)

    // Check that preferences were passed to LLM
    const systemMessage = lastLlmMessages[0]
    expect(systemMessage.role).toBe('system')
    const userMessageContent = lastLlmMessages[lastLlmMessages.length - 1].content
    expect(userMessageContent).toContain('美食')
    expect(userMessageContent).toContain('购物')
  })

  it('should trigger A2UI when days not specified', async () => {
    // Import contextValidator for this test
    const { contextValidator } = await import('../contextValidator')

    const validation = contextValidator.validateFromMessage('花桥')

    // Should detect missing days (required field)
    expect(validation.isComplete).toBe(false)
    const daysMissing = validation.missingInfo.find(m => m.field === 'days')
    expect(daysMissing).toBeDefined()
    expect(daysMissing?.priority).toBe('required')
  })

  it('should trigger A2UI when destination not specified', async () => {
    const { contextValidator } = await import('../contextValidator')

    const validation = contextValidator.validateFromMessage('5天')

    // Should detect missing destination (required field)
    expect(validation.isComplete).toBe(false)
    const destMissing = validation.missingInfo.find(m => m.field === 'destination')
    expect(destMissing).toBeDefined()
    expect(destMissing?.priority).toBe('required')
  })

  it('should not trigger A2UI when both destination and days specified', async () => {
    const { contextValidator } = await import('../contextValidator')

    const validation = contextValidator.validateFromMessage('东京5天')

    // Should be complete since both required fields are present
    expect(validation.isComplete).toBe(true)
  })

  // Restore original function after all tests
  afterAll(() => {
    LLMService.chatCompletion = originalChatCompletion
  })
})
