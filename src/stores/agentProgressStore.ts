import { create } from "zustand"

// ============================================================================
// Agent Progress Types
// ============================================================================

export type PhaseStatus = "pending" | "in_progress" | "completed" | "failed" | "skipped"
export type ToolStatus = "pending" | "running" | "completed" | "failed" | "cancelled"

export interface AgentPhase {
  id: string
  name: string
  description: string
  status: PhaseStatus
  progress: number // 0-100
  startTime?: Date
  endTime?: Date
  error?: string
  agentType: string
  metadata?: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  status: ToolStatus
  startTime: Date
  endTime?: Date
  duration?: number // in milliseconds
  input?: unknown
  output?: unknown
  error?: string
  phaseId: string
}

export interface AgentProgress {
  sessionId: string
  phases: AgentPhase[]
  toolCalls: ToolCall[]
  currentPhaseId: string | null
  isRunning: boolean
  totalProgress: number // 0-100
  startTime?: Date
  endTime?: Date
}

// ============================================================================
// Agent Progress Store State
// ============================================================================

interface AgentProgressState {
  // State
  progress: AgentProgress | null

  // Phase Management
  startSession: (sessionId: string, phases: Omit<AgentPhase, "status" | "progress">[]) => void
  startPhase: (phaseId: string) => void
  updatePhaseProgress: (phaseId: string, progress: number) => void
  completePhase: (phaseId: string, metadata?: Record<string, unknown>) => void
  failPhase: (phaseId: string, error: string) => void
  skipPhase: (phaseId: string) => void

  // Tool Call Management
  addToolCall: (toolCall: Omit<ToolCall, "id" | "status" | "startTime">) => string
  updateToolCall: (toolId: string, updates: Partial<ToolCall>) => void
  completeToolCall: (toolId: string, output?: unknown) => void
  failToolCall: (toolId: string, error: string) => void

  // Session Management
  completeSession: () => void
  failSession: (error: string) => void
  resetSession: () => void

  // Getters
  getCurrentPhase: () => AgentPhase | undefined
  getPhaseById: (phaseId: string) => AgentPhase | undefined
  getActiveToolCalls: () => ToolCall[]
  getCompletedPhases: () => AgentPhase[]
  getSessionDuration: () => number | undefined
}

// ============================================================================
// Helper Functions
// ============================================================================

const calculateTotalProgress = (phases: AgentPhase[]): number => {
  if (phases.length === 0) return 0
  const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0)
  return Math.round(totalProgress / phases.length)
}

// ============================================================================
// Agent Progress Store Implementation
// ============================================================================

export const useAgentProgressStore = create<AgentProgressState>((set, get) => ({
  // Initial State
  progress: null,

  // Start a new agent session
  startSession: (sessionId, phases) =>
    set({
      progress: {
        sessionId,
        phases: phases.map(
          (phase) =>
            ({
              ...phase,
              status: "pending",
              progress: 0,
            }) as AgentPhase
        ),
        toolCalls: [],
        currentPhaseId: null,
        isRunning: true,
        totalProgress: 0,
        startTime: new Date(),
      },
    }),

  // Start a phase
  startPhase: (phaseId) =>
    set((state) => {
      if (!state.progress) return state

      const phases = state.progress.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              status: "in_progress" as const,
              progress: 0,
              startTime: new Date(),
            }
          : phase
      )

      return {
        progress: {
          ...state.progress,
          phases,
          currentPhaseId: phaseId,
          totalProgress: calculateTotalProgress(phases),
        },
      }
    }),

  // Update phase progress
  updatePhaseProgress: (phaseId, progress) =>
    set((state) => {
      if (!state.progress) return state

      const phases = state.progress.phases.map((phase) =>
        phase.id === phaseId ? { ...phase, progress: Math.min(100, Math.max(0, progress)) } : phase
      )

      return {
        progress: {
          ...state.progress,
          phases,
          totalProgress: calculateTotalProgress(phases),
        },
      }
    }),

  // Complete a phase
  completePhase: (phaseId, metadata) =>
    set((state) => {
      if (!state.progress) return state

      const phases = state.progress.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              status: "completed" as const,
              progress: 100,
              endTime: new Date(),
              metadata: metadata ? { ...phase.metadata, ...metadata } : phase.metadata,
            }
          : phase
      )

      return {
        progress: {
          ...state.progress,
          phases,
          totalProgress: calculateTotalProgress(phases),
        },
      }
    }),

  // Fail a phase
  failPhase: (phaseId, error) =>
    set((state) => {
      if (!state.progress) return state

      const phases = state.progress.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              status: "failed" as const,
              endTime: new Date(),
              error,
            }
          : phase
      )

      return {
        progress: {
          ...state.progress,
          phases,
          totalProgress: calculateTotalProgress(phases),
          isRunning: false,
        },
      }
    }),

  // Skip a phase
  skipPhase: (phaseId) =>
    set((state) => {
      if (!state.progress) return state

      const phases = state.progress.phases.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              status: "skipped" as const,
              progress: 100,
              endTime: new Date(),
            }
          : phase
      )

      return {
        progress: {
          ...state.progress,
          phases,
          totalProgress: calculateTotalProgress(phases),
        },
      }
    }),

  // Add a tool call
  addToolCall: (toolCall) => {
    const id = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newToolCall: ToolCall = {
      ...toolCall,
      id,
      status: "pending",
      startTime: new Date(),
    }

    set((state) => {
      if (!state.progress) return state

      return {
        progress: {
          ...state.progress,
          toolCalls: [...state.progress.toolCalls, newToolCall],
        },
      }
    })

    return id
  },

  // Update a tool call
  updateToolCall: (toolId, updates) =>
    set((state) => {
      if (!state.progress) return state

      const toolCalls = state.progress.toolCalls.map((tool) =>
        tool.id === toolId ? { ...tool, ...updates } : tool
      )

      return {
        progress: {
          ...state.progress,
          toolCalls,
        },
      }
    }),

  // Complete a tool call
  completeToolCall: (toolId, output) =>
    set((state) => {
      if (!state.progress) return state

      const toolCalls = state.progress.toolCalls.map((tool) =>
        tool.id === toolId
          ? {
              ...tool,
              status: "completed" as const,
              endTime: new Date(),
              output,
              duration: tool.endTime
                ? new Date(tool.endTime).getTime() - new Date(tool.startTime).getTime()
                : undefined,
            }
          : tool
      )

      return {
        progress: {
          ...state.progress,
          toolCalls,
        },
      }
    }),

  // Fail a tool call
  failToolCall: (toolId, error) =>
    set((state) => {
      if (!state.progress) return state

      const toolCalls = state.progress.toolCalls.map((tool) =>
        tool.id === toolId
          ? {
              ...tool,
              status: "failed" as const,
              endTime: new Date(),
              error,
              duration: new Date().getTime() - new Date(tool.startTime).getTime(),
            }
          : tool
      )

      return {
        progress: {
          ...state.progress,
          toolCalls,
        },
      }
    }),

  // Complete the session
  completeSession: () =>
    set((state) => {
      if (!state.progress) return state

      return {
        progress: {
          ...state.progress,
          isRunning: false,
          totalProgress: 100,
          endTime: new Date(),
        },
      }
    }),

  // Fail the session
  failSession: (error) =>
    set((state) => {
      if (!state.progress) return state

      const phases = state.progress.phases.map((phase) =>
        phase.status === "in_progress"
          ? {
              ...phase,
              status: "failed" as const,
              endTime: new Date(),
              error,
            }
          : phase
      )

      return {
        progress: {
          ...state.progress,
          phases,
          isRunning: false,
          currentPhaseId: null,
          endTime: new Date(),
        },
      }
    }),

  // Reset the session
  resetSession: () => set({ progress: null }),

  // Get current phase
  getCurrentPhase: () => {
    const state = get()
    if (!state.progress || !state.progress.currentPhaseId) return undefined
    return state.progress.phases.find((phase) => phase.id === state.progress?.currentPhaseId)
  },

  // Get phase by ID
  getPhaseById: (phaseId) => {
    const state = get()
    return state.progress?.phases.find((phase) => phase.id === phaseId)
  },

  // Get active tool calls
  getActiveToolCalls: () => {
    const state = get()
    return state.progress?.toolCalls.filter((tool) => tool.status === "running") || []
  },

  // Get completed phases
  getCompletedPhases: () => {
    const state = get()
    return state.progress?.phases.filter((phase) => phase.status === "completed") || []
  },

  // Get session duration
  getSessionDuration: () => {
    const state = get()
    if (!state.progress || !state.progress.startTime) return undefined

    const endTime = state.progress.endTime || new Date()
    return endTime.getTime() - state.progress.startTime.getTime()
  },
}))
