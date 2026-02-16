/**
 * Tests for chatStore.ts
 * Testing chat state management with Zustand
 */

import { describe, it, expect, beforeEach } from "vitest"
import { useChatStore } from "../chatStore"
import type { ChatMessage } from "@/types"

describe("chatStore", () => {
  beforeEach(() => {
    // Reset store before each test by clearing to welcome message
    useChatStore.getState().clearMessages()
  })

  describe("initial state", () => {
    it("should have welcome message", () => {
      const state = useChatStore.getState()

      expect(state.messages.length).toBe(1)
      expect(state.messages[0].id).toBe("welcome")
      expect(state.messages[0].role).toBe("assistant")
      expect(state.messages[0].status).toBe("completed")
      expect(state.currentTripId).toBe(null)
      expect(state.isProcessing).toBe(false)
    })
  })

  describe("addMessage", () => {
    it("should add user message", () => {
      const message: ChatMessage = {
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: new Date(),
        status: "completed",
      }

      useChatStore.getState().addMessage(message)

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(2) // welcome + new message
      expect(state.messages[1]).toEqual(message)
    })

    it("should add assistant message", () => {
      const message: ChatMessage = {
        id: "msg-2",
        role: "assistant",
        content: "Hi there!",
        timestamp: new Date(),
        status: "completed",
      }

      useChatStore.getState().addMessage(message)

      const state = useChatStore.getState()
      expect(state.messages.length).toBe(2)
      expect(state.messages[1].role).toBe("assistant")
    })

    it("should add message with streaming status", () => {
      const message: ChatMessage = {
        id: "msg-3",
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "streaming",
      }

      useChatStore.getState().addMessage(message)

      const state = useChatStore.getState()
      expect(state.messages[1].status).toBe("streaming")
    })

    it("should preserve existing messages", () => {
      useChatStore.getState().addMessage({
        id: "msg-1",
        role: "user",
        content: "First",
        timestamp: new Date(),
        status: "completed",
      })

      useChatStore.getState().addMessage({
        id: "msg-2",
        role: "user",
        content: "Second",
        timestamp: new Date(),
        status: "completed",
      })

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(3) // welcome + 2 messages
      expect(state.messages[1].content).toBe("First")
      expect(state.messages[2].content).toBe("Second")
    })
  })

  describe("updateMessage", () => {
    it("should update message content by id", () => {
      const messageId = "msg-update"
      useChatStore.getState().addMessage({
        id: messageId,
        role: "assistant",
        content: "Initial content",
        timestamp: new Date(),
        status: "streaming",
      })

      useChatStore.getState().updateMessage(messageId, "Updated content")

      const state = useChatStore.getState()
      const updatedMessage = state.messages.find((m) => m.id === messageId)
      expect(updatedMessage?.content).toBe("Updated content")
    })

    it("should preserve other message properties", () => {
      const messageId = "msg-update-props"
      const originalMessage: ChatMessage = {
        id: messageId,
        role: "assistant",
        content: "Initial",
        timestamp: new Date("2024-01-01T10:00:00"),
        status: "streaming",
      }

      useChatStore.getState().addMessage(originalMessage)
      useChatStore.getState().updateMessage(messageId, "Updated")

      const updatedMessage = useChatStore.getState().messages.find((m) => m.id === messageId)
      expect(updatedMessage?.role).toBe("assistant")
      expect(updatedMessage?.timestamp).toEqual(originalMessage.timestamp)
      expect(updatedMessage?.content).toBe("Updated")
    })

    it("should not update other messages", () => {
      useChatStore.getState().addMessage({
        id: "msg-1",
        role: "user",
        content: "User message",
        timestamp: new Date(),
        status: "completed",
      })

      useChatStore.getState().addMessage({
        id: "msg-2",
        role: "assistant",
        content: "Assistant message",
        timestamp: new Date(),
        status: "completed",
      })

      useChatStore.getState().updateMessage("msg-1", "Updated user")

      const state = useChatStore.getState()
      const msg2 = state.messages.find((m) => m.id === "msg-2")
      expect(msg2?.content).toBe("Assistant message") // Should not change
    })

    it("should update streaming message to completed", () => {
      const messageId = "msg-stream"
      useChatStore.getState().addMessage({
        id: messageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "streaming",
      })

      useChatStore.getState().updateMessage(messageId, "Full response")

      // Note: updateMessage only updates content, not status
      // This would typically be followed by a status update or new message
      const updatedMessage = useChatStore.getState().messages.find((m) => m.id === messageId)
      expect(updatedMessage?.content).toBe("Full response")
    })
  })

  describe("setMessages", () => {
    it("should replace all messages", () => {
      const newMessages: ChatMessage[] = [
        {
          id: "msg-1",
          role: "user",
          content: "First",
          timestamp: new Date(),
          status: "completed",
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Second",
          timestamp: new Date(),
          status: "completed",
        },
      ]

      useChatStore.getState().setMessages(newMessages)

      const state = useChatStore.getState()
      expect(state.messages).toEqual(newMessages)
      expect(state.messages).toHaveLength(2)
    })

    it("should include welcome message in new set", () => {
      const messagesWithWelcome: ChatMessage[] = [
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome back!",
          timestamp: new Date(),
          status: "completed",
        },
      ]

      useChatStore.getState().setMessages(messagesWithWelcome)

      const state = useChatStore.getState()
      expect(state.messages).toEqual(messagesWithWelcome)
    })
  })

  describe("setCurrentTripId", () => {
    it("should set current trip ID", () => {
      useChatStore.getState().setCurrentTripId("trip-123")

      expect(useChatStore.getState().currentTripId).toBe("trip-123")
    })

    it("should clear current trip ID with null", () => {
      useChatStore.getState().setCurrentTripId("trip-123")
      expect(useChatStore.getState().currentTripId).toBe("trip-123")

      useChatStore.getState().setCurrentTripId(null)

      expect(useChatStore.getState().currentTripId).toBe(null)
    })
  })

  describe("setProcessing", () => {
    it("should set processing to true", () => {
      useChatStore.getState().setProcessing(true)

      expect(useChatStore.getState().isProcessing).toBe(true)
    })

    it("should set processing to false", () => {
      useChatStore.getState().setProcessing(true)
      useChatStore.getState().setProcessing(false)

      expect(useChatStore.getState().isProcessing).toBe(false)
    })
  })

  describe("clearMessages", () => {
    it("should clear all messages and restore welcome", () => {
      useChatStore.getState().addMessage({
        id: "msg-1",
        role: "user",
        content: "Test",
        timestamp: new Date(),
        status: "completed",
      })

      useChatStore.getState().addMessage({
        id: "msg-2",
        role: "assistant",
        content: "Response",
        timestamp: new Date(),
        status: "completed",
      })

      expect(useChatStore.getState().messages.length).toBe(3) // welcome + 2

      useChatStore.getState().clearMessages()

      const state = useChatStore.getState()
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].id).toBe("welcome")
      expect(state.messages[0].content).toBe("你好！我是 Trip Agent，你的私人 AI 旅游规划师。我可以帮你：\n\n- **规划详细的旅行行程**\n- **推荐景点、酒店和餐厅**\n- **安排交通和预算**\n- **导出旅行计划 PDF**\n\n请告诉我你想去哪里旅行，我将为你制定完美的行程计划！")
    })
  })

  describe("store integration", () => {
    it("should handle complete chat flow", () => {
      // User sends message
      useChatStore.getState().addMessage({
        id: "msg-1",
        role: "user",
        content: "我想去东京旅游",
        timestamp: new Date(),
        status: "completed",
      })

      expect(useChatStore.getState().messages.length).toBe(2)

      // Assistant starts processing
      useChatStore.getState().setProcessing(true)
      expect(useChatStore.getState().isProcessing).toBe(true)

      // Assistant responds with streaming
      useChatStore.getState().addMessage({
        id: "msg-2",
        role: "assistant",
        content: "",
        timestamp: new Date(),
        status: "streaming",
      })

      expect(useChatStore.getState().messages.length).toBe(3)

      // Update streaming message
      useChatStore.getState().updateMessage("msg-2", "好的，让我帮你规划东京之旅")

      const streamingMsg = useChatStore.getState().messages.find((m) => m.id === "msg-2")
      expect(streamingMsg?.content).toBe("好的，让我帮你规划东京之旅")

      // Done processing
      useChatStore.getState().setProcessing(false)
      useChatStore.getState().setCurrentTripId("trip-tokyo-123")

      expect(useChatStore.getState().isProcessing).toBe(false)
      expect(useChatStore.getState().currentTripId).toBe("trip-tokyo-123")
    })
  })
})
