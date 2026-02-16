import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ChatMessage } from "@/types"

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "你好！我是 Trip Agent，你的私人 AI 旅游规划师。我可以帮你：\n\n- **规划详细的旅行行程**\n- **推荐景点、酒店和餐厅**\n- **安排交通和预算**\n- **导出旅行计划 PDF**\n\n请告诉我你想去哪里旅行，我将为你制定完美的行程计划！",
  timestamp: new Date(),
  status: "completed",
}

const MAX_PERSISTED_MESSAGES = 100

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

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [WELCOME_MESSAGE],
      currentTripId: null,
      isProcessing: false,

      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message]
          // Keep only the most recent messages for persistence
          if (newMessages.length > MAX_PERSISTED_MESSAGES) {
            return { messages: [WELCOME_MESSAGE, ...newMessages.slice(-MAX_PERSISTED_MESSAGES + 1)] }
          }
          return { messages: newMessages }
        }),

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
          messages: [{ ...WELCOME_MESSAGE, timestamp: new Date() }],
          currentTripId: null,
        }),
    }),
    {
      name: "trip-agent-chat",
      partialize: (state) => ({
        messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
        currentTripId: state.currentTripId,
      }),
      // Deserialize dates from JSON
      onRehydrateStorage: () => (state) => {
        if (state?.messages) {
          state.messages = state.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        }
      },
    }
  )
)
