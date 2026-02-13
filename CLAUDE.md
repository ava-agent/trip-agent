# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trip Agent** is a desktop application built with React + TypeScript + Tauri that implements a sophisticated Multi-Agent system for intelligent travel planning. The system uses LLM APIs (primarily GLM-4-Flash) to generate personalized trip itineraries with real-time external data (weather, places, hotels).

## Commands

### Development
```bash
pnpm dev              # Start Vite dev server (web mode)
pnpm tauri dev       # Start Tauri desktop app
pnpm build           # Build for production (tsc + vite)
pnpm lint            # Run ESLint
```

### Testing
```bash
pnpm test            # Run tests in watch mode (Vitest)
pnpm test:run        # Run tests once
pnpm test:ui         # Run tests with UI
pnpm test:coverage   # Run tests with coverage report
```

### Desktop Build
```bash
pnpm tauri build     # Build desktop application
```

## Architecture

### Multi-Agent System

The core architecture is a **Multi-Agent orchestration system** in `src/services/multiAgentService.ts`. There are 5 specialized agents:

| Agent | Responsibility | Key Tools |
|-------|----------------|-----------|
| **SupervisorAgent** | Intent recognition, task distribution, context validation | `analyze_intent`, `delegate_agents` |
| **PlannerAgent** | Generate detailed itinerary with LLM | `search_attractions`, `calculate_route` |
| **RecommenderAgent** | Personalized recommendations (weather, hotels, restaurants) | `get_weather`, `search_hotels`, `search_restaurants` |
| **BookingAgent** | Price comparison, booking links | `check_availability`, `get_price`, `generate_booking_link` |
| **DocumentAgent** | Itinerary formatting for export | `format_itinerary` |

### Agent Orchestration Flow

1. **Context Validation** (A2UI): Before starting agents, `contextValidator` checks if required trip info is complete. If missing, `questionGenerator` creates questions for the user.
2. **Supervisor Phase**: Analyzes user intent, delegates to specialist agents
3. **Specialist Phases**: Each agent processes sequentially, yielding messages with delays for UX
4. **Session Completion**: `agentProgressStore` session completes, final trip generated

### State Management (Zustand)

- **`agentProgressStore`** (`src/stores/agentProgressStore.ts`): Tracks agent execution phases, tool calls, and overall progress
  - Phases have status: `pending` | `in_progress` | `completed` | `failed` | `skipped`
  - Tool calls track: input, output, status, duration, error
- **`chatStore`**: Manages conversation history
- **`tripStore`**: Manages trip data
- **`sessionStore`**: Handles user sessions

### Key Services

- **`llmService.ts`**: LLM API integration with multiple providers (GLM, OpenAI, Anthropic)
- **`externalApiService.ts`**: External API wrappers (OpenWeatherMap, Google Places)
- **`streamService.ts`**: Real-time streaming for agent responses
- **`exportService.ts`**: PDF/Markdown itinerary export

### A2UI (Agent-to-User Interface)

- **Context Validation**: `src/services/contextValidator.ts` - Validates trip planning context
- **Question Generation**: `src/services/questionGenerator.ts` - Generates follow-up questions for missing info
- The system proactively collects missing information (destination, days, budget, preferences) before starting agents

## Environment Variables

Required in `.env`:
```env
VITE_GLM_API_KEY=              # Required for LLM features
VITE_OPENWEATHER_API_KEY=       # Weather data
VITE_GOOGLE_PLACES_API_KEY=     # Places/hotels/restaurants
```

**Important**: The system **requires** LLM API configuration. Mock data fallbacks have been removed - all trip generation must use the LLM API.

## Component Structure

```
src/
├── components/
│   ├── chat/           # Chat interface, message display
│   ├── itinerary/      # Trip itinerary display
│   ├── layout/         # Header, Sidebar, MainLayout
│   └── ui/             # shadcn/ui base components
├── services/
│   ├── multiAgentService.ts    # Core multi-agent orchestration
│   ├── llmService.ts           # LLM API integration
│   ├── externalApiService.ts   # External APIs (weather, places)
│   ├── agentUtils.ts           # Intent analysis, trip info extraction
│   ├── streamService.ts        # Response streaming
│   ├── exportService.ts        # PDF/Markdown export
│   ├── contextValidator.ts     # A2UI context validation
│   └── questionGenerator.ts    # A2UI question generation
├── stores/
│   ├── agentProgressStore.ts   # Agent execution tracking
│   ├── chatStore.ts            # Chat messages
│   ├── sessionStore.ts         # User sessions
│   └── tripStore.ts            # Trip data
├── lib/
│   └── export/                # Export utilities (PDF, Markdown)
└── types/                     # TypeScript definitions
```

## Development Notes

- **No Mock Data**: The system intentionally removed mock fallbacks. LLM API must be configured for trip generation.
- **Async Generator Pattern**: `MultiAgentService.processWithAgents()` yields messages progressively for real-time UX
- **Agent Progress Tracking**: All agent activity is tracked in `agentProgressStore` for visualization in AGUI components
- **External API Caching**: `externalApiService` caches responses to reduce API calls
- **Streaming**: LLM responses are streamed in real-time via `streamService`

## Type Definitions

Key types in `src/types/`:
- `Trip`: Main trip structure with itinerary, preferences, duration
- `DayPlan`: Single day with activities, times, costs
- `UserPreferences`: Interests, accommodation, dietary restrictions
- `AgentMessage`: Agent communication with type (`thought`|`action`|`result`|`error`)
- `AgentContext`: Context passed between agents
