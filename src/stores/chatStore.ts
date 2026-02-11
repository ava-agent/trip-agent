import { create } from "zustand"
import type { ChatMessage } from "@/types"

interface ChatState {
  messages: ChatMessage[]
  currentTripId: string | null
  isProcessing: boolean
  addMessage: (message: ChatMessage) => void
  updateMessage: (id: string, content: string) => void
  setMessages: (messages: ChatMessage[]) => void
  setCurrentTripId: (tripId: string | null) => void
  setProcessing: (processing: boolean) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: "welcome",
      role: "assistant",
      content: "你好！我是 Trip Agent，你的私人 AI 旅游规划师。我可以帮你：\n\n• 规划详细的旅行行程\n• 推荐景点、酒店和餐厅\n• 安排交通和预算\n• 导出旅行计划 PDF\n\n请告诉我你想去哪里旅行，我将为你制定完美的行程计划！",
      timestamp: new Date(),
      status: "completed",
    },
  ],
  currentTripId: null,
  isProcessing: false,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    })),

  setMessages: (messages) => set({ messages }),

  setCurrentTripId: (tripId) => set({ currentTripId: tripId }),

  setProcessing: (processing) => set({ isProcessing: processing }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: "welcome",
          role: "assistant",
          content: "你好！我是 Trip Agent，你的私人 AI 旅游规划师。",
          timestamp: new Date(),
          status: "completed",
        },
      ],
    }),
}))
