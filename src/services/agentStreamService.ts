/**
 * Agent Streaming Service
 * Combines Mock Agent with streaming for real-time trip planning
 */

import { MockAgentService } from "./mockAgent"
import type { AgentRequest } from "./mockAgent"

export interface AgentStreamChunk {
  content: string
  done: boolean
  trip?: unknown
}

export class AgentStreamService {
  /**
   * 流式处理 Agent 请求
   */
  static async *processRequestStream(
    request: AgentRequest
  ): AsyncGenerator<AgentStreamChunk, void, unknown> {
    // 发送思考状态
    yield { content: "🤔", done: false }

    // 模拟 AI 思考
    await this.delay(800)

    // 获取 Agent 响应
    const response = await MockAgentService.processRequest(request)

    // 流式输出响应内容
    const words = this.splitIntoWords(response.message)
    for (const word of words) {
      await this.delay(50)
      yield { content: word, done: false, trip: response.trip }
    }

    yield { content: "", done: true, trip: response.trip }
  }

  /**
   * 从聊天消息生成智能规划
   */
  static async *chatToPlan(userMessage: string): AsyncGenerator<AgentStreamChunk, void, unknown> {
    // 提取目的地和天数
    const { destination, days } = this.extractTripInfo(userMessage)

    if (!destination) {
      // 没有目的地，询问用户
      const clarifications = [
        "请",
        "告诉我",
        "你想",
        "去哪里",
        "旅行？",
        "\n\n",
        "例如：\n",
        "• \"我想去东京旅行5天\"\n",
        "• \"帮我规划巴黎3日游\"",
      ]
      for (const chunk of clarifications) {
        await this.delay(80)
        yield { content: chunk, done: false }
      }
      yield { content: "", done: true }
      return
    }

    // 有目的地，生成行程
    yield* this.processRequestStream({
      type: "plan_trip",
      data: {
        destination,
        days: days || 5,
        preferences: {
          interests: ["观光", "美食", "文化"],
        },
      },
    })
  }

  /**
   * 从消息中提取旅行信息
   */
  private static extractTripInfo(message: string): { destination: string | null; days: number } {
    const destinations = ["东京", "巴黎", "纽约", "伦敦", "北京", "上海", "香港", "首尔", "新加坡", "曼谷", "迪拜", "悉尼", "罗马", "巴塞罗那"]

    let destination: string | null = null
    for (const dest of destinations) {
      if (message.includes(dest)) {
        destination = dest
        break
      }
    }

    // 提取天数
    const daysMatch = message.match(/(\d+)\s*天/)
    const days = daysMatch ? parseInt(daysMatch[1]) : 5

    return { destination, days }
  }

  /**
   * 将文本分割成词块
   */
  private static *splitIntoWords(text: string): Generator<string> {
    // 按字符分割以获得更流畅的流式效果
    for (const char of text) {
      yield char
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
