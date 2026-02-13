/**
 * Tests for streamService.ts
 * Testing streaming response simulation for AI interactions
 */

import { describe, it, expect } from "vitest"
import { StreamService } from "../streamService"

describe("StreamService", () => {
  describe("streamResponse", () => {
    it("should yield streaming chunks", async () => {
      const chunks: string[] = []
      const generator = StreamService.streamResponse("测试")

      for await (const chunk of generator) {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join("")).toContain("东京之旅")
    })

    it("should yield final done chunk", async () => {
      const generator = StreamService.streamResponse("测试")
      const chunks: Array<{ content: string; done: boolean }> = []

      for await (const chunk of generator) {
        chunks.push(chunk)
      }

      const lastChunk = chunks[chunks.length - 1]
      expect(lastChunk?.done).toBe(true)
      expect(lastChunk?.content).toBe("")
    })

    it("should yield complete travel itinerary", async () => {
      const chunks: string[] = []
      const generator = StreamService.streamResponse("东京")

      for await (const chunk of generator) {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }

      const fullResponse = chunks.join("")
      expect(fullResponse).toContain("第一天")
      expect(fullResponse).toContain("迪士尼乐园")
      expect(fullResponse).toContain("富士山")
      expect(fullResponse).toContain("返程")
    })
  })

  describe("generateStreamingResponse", () => {
    it("should detect destination in message", async () => {
      const chunks: string[] = []
      const generator = StreamService.generateStreamingResponse("我想去巴黎旅游")

      for await (const chunk of generator) {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }

      const fullResponse = chunks.join("")
      expect(fullResponse).toContain("巴黎")
    })

    it("should ask for destination when not detected", async () => {
      const chunks: string[] = []
      const generator = StreamService.generateStreamingResponse("你好")

      for await (const chunk of generator) {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }

      const fullResponse = chunks.join("")
      expect(fullResponse).toContain("请告诉我你想去哪里旅行")
    })

    it("should generate structured itinerary for destination", async () => {
      const chunks: string[] = []
      const generator = StreamService.generateStreamingResponse("东京5天")

      for await (const chunk of generator) {
        if (chunk.content) {
          chunks.push(chunk.content)
        }
      }

      const fullResponse = chunks.join("")
      expect(fullResponse).toContain("**建议行程（5天4夜）**")
      expect(fullResponse).toContain("第1天")
      expect(fullResponse).toContain("第5天")
      expect(fullResponse).toContain("预估预算")
    })
  })

  describe("extractDestination", () => {
    it("should extract destination from message", () => {
      const message = "我想去纽约旅游"
      // @ts-ignore - accessing private method for testing
      const result = (StreamService as any).extractDestination(message)
      expect(result).toBe("纽约")
    })

    it("should return null for unknown destination", () => {
      const message = "我想去火星旅游"
      // @ts-ignore - accessing private method for testing
      const result = (StreamService as any).extractDestination(message)
      expect(result).toBeNull()
    })

    it("should detect multiple destinations", () => {
      const destinations = ["东京", "巴黎", "伦敦", "北京", "上海", "香港"]
      destinations.forEach((dest) => {
        const message = `我想去${dest}旅游`
        // @ts-ignore
        const result = (StreamService as any).extractDestination(message)
        expect(result).toBe(dest)
      })
    })
  })
})
