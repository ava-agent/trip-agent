/**
 * Tests for agentProgressStore.ts
 * Testing agent progress tracking with Zustand
 */

import { describe, it, expect, beforeEach } from "vitest"
import { useAgentProgressStore } from "../agentProgressStore"
import type { AgentPhase } from "../agentProgressStore"

describe("agentProgressStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useAgentProgressStore.getState().resetSession()
  })

  describe("initial state", () => {
    it("should have null progress initially", () => {
      const state = useAgentProgressStore.getState()

      expect(state.progress).toBe(null)
    })
  })

  describe("startSession", () => {
    it("should initialize a new session", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Supervisor", description: "Analyzing intent", agentType: "supervisor" },
        { id: "phase-2", name: "Planner", description: "Planning trip", agentType: "planner" },
      ]

      useAgentProgressStore.getState().startSession("session-123", phases)

      const state = useAgentProgressStore.getState()
      expect(state.progress).toBeDefined()
      expect(state.progress?.sessionId).toBe("session-123")
      expect(state.progress?.phases).toHaveLength(2)
      expect(state.progress?.phases[0].status).toBe("pending")
      expect(state.progress?.phases[1].status).toBe("pending")
      expect(state.progress?.currentPhaseId).toBe(null)
      expect(state.progress?.isRunning).toBe(true)
      expect(state.progress?.totalProgress).toBe(0)
      expect(state.progress?.startTime).toBeDefined()
    })

    it("should set current phase to null", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Test", description: "Test phase", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      expect(useAgentProgressStore.getState().progress?.currentPhaseId).toBe(null)
    })
  })

  describe("startPhase", () => {
    it("should start a phase by id", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First phase", agentType: "test" },
        { id: "phase-2", name: "Phase 2", description: "Second phase", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().startPhase("phase-2")

      const state = useAgentProgressStore.getState()
      expect(state.progress?.currentPhaseId).toBe("phase-2")

      const phase1 = state.progress?.phases[0]
      const phase2 = state.progress?.phases[1]

      expect(phase1?.status).toBe("pending")
      expect(phase2?.status).toBe("in_progress")
      expect(phase2?.startTime).toBeDefined()
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().startPhase("phase-1")

      const state = useAgentProgressStore.getState()
      expect(state.progress).toBe(null)
    })

    it("should calculate total progress", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
        { id: "phase-2", name: "Phase 2", description: "Second", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().startPhase("phase-1")

      // Starting phase sets progress to 0, total is calculated
      const totalProgress = useAgentProgressStore.getState().progress?.totalProgress
      expect(totalProgress).toBe(0) // (0 + 0) / 2 = 0
    })
  })

  describe("updatePhaseProgress", () => {
    it("should update phase progress", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().updatePhaseProgress("phase-1", 50)

      const phase = useAgentProgressStore.getState().progress?.phases[0]
      expect(phase?.progress).toBe(50)
      expect(useAgentProgressStore.getState().progress?.totalProgress).toBe(50)
    })

    it("should clamp progress to 100", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().updatePhaseProgress("phase-1", 150)

      const phase = useAgentProgressStore.getState().progress?.phases[0]
      expect(phase?.progress).toBe(100) // Clamped to 100
    })

    it("should clamp progress to 0", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().updatePhaseProgress("phase-1", -10)

      const phase = useAgentProgressStore.getState().progress?.phases[0]
      expect(phase?.progress).toBe(0) // Clamped to 0
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().updatePhaseProgress("phase-1", 50)

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("completePhase", () => {
    it("should mark phase as completed", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().completePhase("phase-1", { result: "success" })

      const phase = useAgentProgressStore.getState().progress?.phases[0]
      expect(phase?.status).toBe("completed")
      expect(phase?.progress).toBe(100)
      expect(phase?.endTime).toBeDefined()
      expect(phase?.metadata).toEqual({ result: "success" })
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().completePhase("phase-1", {})

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("failPhase", () => {
    it("should mark phase as failed", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().failPhase("phase-1", "API Error")

      const state = useAgentProgressStore.getState()
      const phase = state.progress?.phases[0]

      expect(phase?.status).toBe("failed")
      expect(phase?.error).toBe("API Error")
      expect(phase?.endTime).toBeDefined()
      expect(state.progress?.isRunning).toBe(false)
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().failPhase("phase-1", "Error")

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("skipPhase", () => {
    it("should mark phase as skipped", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().skipPhase("phase-1")

      const phase = useAgentProgressStore.getState().progress?.phases[0]
      expect(phase?.status).toBe("skipped")
      expect(phase?.progress).toBe(100)
      expect(phase?.endTime).toBeDefined()
    })
  })

  describe("addToolCall", () => {
    it("should add a tool call and return id", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const toolCallId = useAgentProgressStore.getState().addToolCall({
        name: "search_places",
        phaseId: "phase-1",
        input: { query: "Tokyo" },
      })

      expect(typeof toolCallId).toBe("string")
      expect(toolCallId).toMatch(/^tool-\d+-[a-z0-9]+$/)

      const state = useAgentProgressStore.getState()
      expect(state.progress?.toolCalls).toHaveLength(1)
      expect(state.progress?.toolCalls[0].name).toBe("search_places")
      expect(state.progress?.toolCalls[0].status).toBe("pending")
      expect(state.progress?.toolCalls[0].startTime).toBeDefined()
    })

    it("should not change state if no active session", () => {
      const toolCallId = useAgentProgressStore.getState().addToolCall({
        name: "test_tool",
        phaseId: "phase-1",
        input: {},
      })

      expect(typeof toolCallId).toBe("string")
      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("updateToolCall", () => {
    it("should update tool call properties", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const toolCallId = useAgentProgressStore.getState().addToolCall({
        name: "test_tool",
        phaseId: "phase-1",
        input: {},
      })

      useAgentProgressStore.getState().updateToolCall(toolCallId, {
        status: "running",
        output: { result: "data" },
      })

      const state = useAgentProgressStore.getState()
      const toolCall = state.progress?.toolCalls[0]

      expect(toolCall?.status).toBe("running")
      expect(toolCall?.output).toEqual({ result: "data" })
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().updateToolCall("tool-1", {})

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("completeToolCall", () => {
    it("should mark tool call as completed", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const toolCallId = useAgentProgressStore.getState().addToolCall({
        name: "test_tool",
        phaseId: "phase-1",
        input: {},
      })

      useAgentProgressStore.getState().completeToolCall(toolCallId, { done: true })

      const toolCall = useAgentProgressStore.getState().progress?.toolCalls[0]

      expect(toolCall?.status).toBe("completed")
      expect(toolCall?.output).toEqual({ done: true })
      expect(toolCall?.endTime).toBeDefined()
    })

    it("should set duration when endTime exists", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const toolCallId = useAgentProgressStore.getState().addToolCall({
        name: "test_tool",
        phaseId: "phase-1",
        input: {},
      })

      // Set startTime, then complete - duration should be calculated from startTime to now
      const now = Date.now()
      const startTime = new Date(now - 5000) // 5 seconds ago
      useAgentProgressStore.getState().updateToolCall(toolCallId, {
        status: "running",
        startTime: startTime,
      })

      useAgentProgressStore.getState().completeToolCall(toolCallId, {})

      const toolCall = useAgentProgressStore.getState().progress?.toolCalls[0]
      // Duration should be approximately 5000ms (from startTime to completion)
      expect(toolCall?.duration).toBeGreaterThanOrEqual(4900)
      expect(toolCall?.duration).toBeLessThanOrEqual(6000)
    })
  })

  describe("failToolCall", () => {
    it("should mark tool call as failed", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const toolCallId = useAgentProgressStore.getState().addToolCall({
        name: "test_tool",
        phaseId: "phase-1",
        input: {},
      })

      useAgentProgressStore.getState().failToolCall(toolCallId, "Network error")

      const toolCall = useAgentProgressStore.getState().progress?.toolCalls[0]

      expect(toolCall?.status).toBe("failed")
      expect(toolCall?.error).toBe("Network error")
      expect(toolCall?.endTime).toBeDefined()
      expect(toolCall?.duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe("completeSession", () => {
    it("should mark session as completed", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      expect(useAgentProgressStore.getState().progress?.isRunning).toBe(true)

      useAgentProgressStore.getState().completeSession()

      const state = useAgentProgressStore.getState()
      expect(state.progress?.isRunning).toBe(false)
      expect(state.progress?.totalProgress).toBe(100)
      expect(state.progress?.endTime).toBeDefined()
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().completeSession()

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("failSession", () => {
    it("should mark session as failed with error", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        {
          id: "phase-1",
          name: "Phase 1",
          description: "First",
          agentType: "test",
        },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().startPhase("phase-1")

      expect(useAgentProgressStore.getState().progress?.phases[0].status).toBe("in_progress")

      useAgentProgressStore.getState().failSession("Critical error")

      const state = useAgentProgressStore.getState()
      expect(state.progress?.isRunning).toBe(false)
      expect(state.progress?.currentPhaseId).toBe(null)

      const phase = state.progress?.phases[0]
      expect(phase?.status).toBe("failed")
      expect(phase?.error).toBe("Critical error")
    })

    it("should not change state if no active session", () => {
      useAgentProgressStore.getState().failSession("Error")

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("resetSession", () => {
    it("should clear all progress", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      expect(useAgentProgressStore.getState().progress).toBeDefined()

      useAgentProgressStore.getState().resetSession()

      expect(useAgentProgressStore.getState().progress).toBe(null)
    })
  })

  describe("getCurrentPhase", () => {
    it("should return current phase", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
        { id: "phase-2", name: "Phase 2", description: "Second", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().startPhase("phase-2")

      const currentPhase = useAgentProgressStore.getState().getCurrentPhase()

      expect(currentPhase?.id).toBe("phase-2")
    })

    it("should return undefined if no session", () => {
      const phase = useAgentProgressStore.getState().getCurrentPhase()

      expect(phase).toBeUndefined()
    })

    it("should return undefined if no current phase", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      // currentPhaseId is null initially

      const phase = useAgentProgressStore.getState().getCurrentPhase()

      expect(phase).toBeUndefined()
    })
  })

  describe("getPhaseById", () => {
    it("should return phase by id", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
        { id: "phase-2", name: "Phase 2", description: "Second", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const phase = useAgentProgressStore.getState().getPhaseById("phase-2")

      expect(phase?.id).toBe("phase-2")
      expect(phase?.name).toBe("Phase 2")
    })

    it("should return undefined if phase not found", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const phase = useAgentProgressStore.getState().getPhaseById("non-existent")

      expect(phase).toBeUndefined()
    })

    it("should return undefined if no session", () => {
      const phase = useAgentProgressStore.getState().getPhaseById("phase-1")

      expect(phase).toBeUndefined()
    })
  })

  describe("getActiveToolCalls", () => {
    it("should return running tool calls", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)

      const toolId = useAgentProgressStore.getState().addToolCall({
        name: "tool_1",
        phaseId: "phase-1",
        input: {},
      })

      const active = useAgentProgressStore.getState().getActiveToolCalls()
      expect(active).toHaveLength(0) // pending, not running

      useAgentProgressStore.getState().updateToolCall(toolId, { status: "running" })

      const activeRunning = useAgentProgressStore.getState().getActiveToolCalls()
      expect(activeRunning).toHaveLength(1)
    })

    it("should return empty array if no session", () => {
      const active = useAgentProgressStore.getState().getActiveToolCalls()

      expect(active).toEqual([])
    })
  })

  describe("getCompletedPhases", () => {
    it("should return completed phases", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
        { id: "phase-2", name: "Phase 2", description: "Second", agentType: "test" },
        { id: "phase-3", name: "Phase 3", description: "Third", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().completePhase("phase-1", {})
      useAgentProgressStore.getState().completePhase("phase-3", {})

      const completed = useAgentProgressStore.getState().getCompletedPhases()

      expect(completed).toHaveLength(2)
      expect(completed[0]?.id).toBe("phase-1")
      expect(completed[1]?.id).toBe("phase-3")
    })

    it("should return empty array if no session", () => {
      const completed = useAgentProgressStore.getState().getCompletedPhases()

      expect(completed).toEqual([])
    })
  })

  describe("getSessionDuration", () => {
    it("should calculate session duration", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      useAgentProgressStore.getState().startPhase("phase-1") // Mark as in_progress

      // Small delay to ensure non-zero duration
      // Note: In real usage, there would be actual time elapsed
      // For testing, we just verify duration is set
      useAgentProgressStore.getState().completeSession()

      const duration = useAgentProgressStore.getState().getSessionDuration()

      // Duration should be set (may be 0 in fast tests)
      expect(duration).toBeGreaterThanOrEqual(0)
    })

    it("should return undefined if no session", () => {
      const duration = useAgentProgressStore.getState().getSessionDuration()

      expect(duration).toBeUndefined()
    })

    it("should handle session with no in_progress phase", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Phase 1", description: "First", agentType: "test" },
      ]

      useAgentProgressStore.getState().startSession("session-1", phases)
      // Complete without starting any phase - all phases remain pending
      useAgentProgressStore.getState().completeSession()

      const duration = useAgentProgressStore.getState().getSessionDuration()

      // Duration should be calculated from startTime to endTime
      expect(duration).toBeGreaterThanOrEqual(0)
    })
  })

  describe("store integration", () => {
    it("should handle complete agent workflow", () => {
      const phases: Omit<AgentPhase, "status" | "progress">[] = [
        { id: "phase-1", name: "Supervisor", description: "Intent analysis", agentType: "supervisor" },
        { id: "phase-2", name: "Planner", description: "Trip planning", agentType: "planner" },
        { id: "phase-3", name: "Recommender", description: "Recommendations", agentType: "recommender" },
      ]

      // Start session
      useAgentProgressStore.getState().startSession("session-workflow", phases)
      expect(useAgentProgressStore.getState().progress?.phases[0].status).toBe("pending")

      // Start first phase
      useAgentProgressStore.getState().startPhase("phase-1")
      expect(useAgentProgressStore.getState().getCurrentPhase()?.id).toBe("phase-1")

      // Add tool call
      const toolId = useAgentProgressStore.getState().addToolCall({
        name: "analyze_intent",
        phaseId: "phase-1",
        input: { message: "Tokyo trip" },
      })

      // Update tool to running
      useAgentProgressStore.getState().updateToolCall(toolId, { status: "running" })

      // Complete tool
      useAgentProgressStore.getState().completeToolCall(toolId, { intent: "travel_plan" })

      // Complete phase 1
      useAgentProgressStore.getState().completePhase("phase-1", { intentResult: "travel" })

      // Start phase 2
      useAgentProgressStore.getState().startPhase("phase-2")
      useAgentProgressStore.getState().updatePhaseProgress("phase-2", 50)
      useAgentProgressStore.getState().completePhase("phase-2", { tripGenerated: true })

      // Start and complete phase 3
      useAgentProgressStore.getState().startPhase("phase-3")
      useAgentProgressStore.getState().completePhase("phase-3", {})

      // Complete session
      useAgentProgressStore.getState().completeSession()

      const state = useAgentProgressStore.getState()
      expect(state.progress?.phases[0].status).toBe("completed")
      expect(state.progress?.phases[1].status).toBe("completed")
      expect(state.progress?.phases[2].status).toBe("completed")
      expect(state.progress?.isRunning).toBe(false)
      expect(state.progress?.totalProgress).toBe(100)
    })
  })
})
