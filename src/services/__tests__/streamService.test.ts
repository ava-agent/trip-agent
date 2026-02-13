/**
 * Tests for streamService.ts
 * Testing StreamService (mock AI streaming responses)
 */

import { describe, it, expect } from "vitest"
import { StreamService, type StreamChunk } from "../streamService"

describe("StreamService", () => {
  // Note: StreamService uses setTimeout for delays, tests may take longer

  async function collectChunks(generator: AsyncGenerator<StreamChunk, void, unknown>): Promise<StreamChunk[]> {
    const chunks: StreamChunk[] = []
    for await (const chunk of generator) {
      chunks.push(chunk)
    }
    return chunks
  }

  describe("streamResponse", () => {
    it("should yield response chunks with delays", async () => {
      const generator = StreamService.streamResponse("test")
      const chunks = await collectChunks(generator)

      expect(chunks).toHaveLength(7) // 6 response chunks + 1 final empty chunk
      expect(chunks[0]).toEqual({ content: "好的，我来为你规划", done: false })
      expect(chunks[chunks.length - 1]).toEqual({ content: "", done: true })
    })

    it("should yield complete trip plan", async () => {
      const generator = StreamService.streamResponse("test")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("第一天：抵达东京")
      expect(fullContent).toContain("第五天：秋叶原动漫购物")
      expect(fullContent).toContain("需要我帮你预订酒店和门票吗？")
    })

    it("should mark final chunk as done", async () => {
      const generator = StreamService.streamResponse("test")
      const chunks = await collectChunks(generator)

      const doneChunks = chunks.filter(c => c.done)
      const notDoneChunks = chunks.filter(c => !c.done)

      expect(doneChunks).toHaveLength(1)
      expect(notDoneChunks).toHaveLength(6)
    })

    it("should work with any prompt input", async () => {
      const generator1 = StreamService.streamResponse("prompt1")
      const generator2 = StreamService.streamResponse("prompt2")

      const chunks1 = await collectChunks(generator1)
      const chunks2 = await collectChunks(generator2)

      // Both should yield same mock response
      expect(chunks1.length).toBe(chunks2.length)
    })
  })

  describe("generateStreamingResponse", () => {
    it("should ask for destination when not detected", async () => {
      const generator = StreamService.generateStreamingResponse("随便聊聊")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("请告诉我你想去哪里旅行")
    })

    it("should detect Tokyo destination", async () => {
      const generator = StreamService.generateStreamingResponse("我想去东京旅游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("东京")
      expect(fullContent).toContain("5天4夜")
    })

    it("should detect Paris destination", async () => {
      const generator = StreamService.generateStreamingResponse("去巴黎玩玩")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("巴黎")
    })

    it("should detect New York destination", async () => {
      const generator = StreamService.generateStreamingResponse("纽约旅游计划")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("纽约")
    })

    it("should detect London destination", async () => {
      const generator = StreamService.generateStreamingResponse("伦敦旅行")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("伦敦")
    })

    it("should detect Beijing destination", async () => {
      const generator = StreamService.generateStreamingResponse("北京游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("北京")
    })

    it("should detect Shanghai destination", async () => {
      const generator = StreamService.generateStreamingResponse("上海游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("上海")
    })

    it("should detect Hong Kong destination", async () => {
      const generator = StreamService.generateStreamingResponse("香港旅游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("香港")
    })

    it("should detect Seoul destination", async () => {
      const generator = StreamService.generateStreamingResponse("首尔游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("首尔")
    })

    it("should detect Singapore destination", async () => {
      const generator = StreamService.generateStreamingResponse("新加坡旅游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("新加坡")
    })

    it("should yield destination response with day-by-day itinerary", async () => {
      const generator = StreamService.generateStreamingResponse("东京旅游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("**第1天** - 抵达与初探")
      expect(fullContent).toContain("**第2天** - 标志性景点")
      expect(fullContent).toContain("**第3天** - 文化体验")
      expect(fullContent).toContain("**第4天** - 自由活动")
      expect(fullContent).toContain("**第5天** - 返程")
    })

    it("should include budget estimate", async () => {
      const generator = StreamService.generateStreamingResponse("巴黎旅游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("¥15,000 - ¥25,000")
    })

    it("should ask about hotel and flight booking", async () => {
      const generator = StreamService.generateStreamingResponse("纽约旅游")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("需要我帮你预订酒店和机票吗？")
    })

    it("should mark final chunk as done", async () => {
      const generator = StreamService.generateStreamingResponse("东京旅游")
      const chunks = await collectChunks(generator)

      const lastChunk = chunks[chunks.length - 1]
      expect(lastChunk.done).toBe(true)
      expect(lastChunk.content).toBe("")
    })

    it("should have all non-final chunks marked as not done", async () => {
      const generator = StreamService.generateStreamingResponse("新加坡旅游")
      const chunks = await collectChunks(generator)

      const nonFinalChunks = chunks.slice(0, -1)
      nonFinalChunks.forEach(chunk => {
        expect(chunk.done).toBe(false)
      })
    })
  })

  describe("extractDestination behavior", () => {
    it("should return ask response when no destination found", async () => {
      const generator = StreamService.generateStreamingResponse("随便聊聊")
      const chunks = await collectChunks(generator)

      const fullContent = chunks.map(c => c.content).join("")
      expect(fullContent).toContain("请告诉我你想去哪里旅行")
    })

    it("should extract destination from various message formats", async () => {
      const testCases = [
        "我想去东京旅游",
        "东京5天游",
        "计划去巴黎",
        "去纽约玩",
        "去伦敦旅游",
        "北京游",
        "想去上海",
        "准备去香港",
        "去首尔旅游",
        "计划去新加坡",
      ]

      for (const message of testCases) {
        const generator = StreamService.generateStreamingResponse(message)
        const chunks = await collectChunks(generator)

        const fullContent = chunks.map(c => c.content).join("")

        // Should have destination-specific content (not "ask where" message)
        if (!message.includes("随便") && !message.includes("聊聊")) {
          expect(fullContent).not.toContain("请告诉我你想去哪里旅行")
        }
      }
    })
  })

  describe("StreamChunk type", () => {
    it("should support chunk structure", () => {
      const chunk: StreamChunk = {
        content: "test content",
        done: false,
      }

      expect(chunk).toHaveProperty("content")
      expect(chunk).toHaveProperty("done")
      expect(typeof chunk.content).toBe("string")
      expect(typeof chunk.done).toBe("boolean")
    })

    it("should support completed chunk", () => {
      const chunk: StreamChunk = {
        content: "",
        done: true,
      }

      expect(chunk.content).toBe("")
      expect(chunk.done).toBe(true)
    })
  })
})
