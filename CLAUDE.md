# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Trip Agent** is an AI travel planning application built with React + TypeScript that implements a Multi-Agent system for intelligent itinerary generation. Supports both **web deployment** (Vercel + Supabase) and **desktop** (Tauri). Uses LLM APIs (GLM-4-Flash / OpenAI / Anthropic) with real-time external data (weather, places, hotels).

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
pnpm test:run        # Run tests once (415 tests)
pnpm test:ui         # Run tests with UI
pnpm test:coverage   # Run tests with coverage report
```

### Deployment
```bash
vercel deploy --prod --yes   # Deploy to Vercel
pnpm tauri build             # Build desktop application
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
- **`tripStore`**: Manages trip data (localStorage fallback + Supabase for web)
- **`sessionStore`**: Handles user sessions

### Key Services

- **`llmService.ts`**: LLM API integration with multiple providers (GLM, OpenAI, Anthropic, proxy mode)
- **`externalApiService.ts`**: External API wrappers (OpenWeatherMap, Google Places) with proxy support
- **`streamService.ts`**: Real-time streaming for agent responses
- **`exportService.ts`**: PDF/Markdown itinerary export

### A2UI (Agent-to-User Interface)

- **Context Validation**: `src/services/contextValidator.ts` - Validates trip planning context (1-365 days)
- **Question Generation**: `src/services/questionGenerator.ts` - Generates follow-up questions for missing info
- The system proactively collects missing information (destination, days, budget, preferences) before starting agents

## Deployment

### Web (Vercel + Supabase)

**Production URL**: https://trip-agent-rho.vercel.app

**Architecture**:
- Frontend SPA deployed to Vercel CDN
- API proxy routes (`api/llm.ts`, `api/weather.ts`, `api/places.ts`) as Vercel Edge Functions
- Supabase PostgreSQL for data persistence with RLS
- API keys stored server-side in Vercel env vars (not exposed to browser)

**Vercel Environment Variables**:
| Variable | Purpose |
|----------|---------|
| `GLM_API_KEY` | Server-side LLM API key |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser, RLS protected) |

**Proxy Mode**: In production (`import.meta.env.PROD`), `llmService` and `externalApiService` automatically route through `/api/` proxy endpoints instead of making direct API calls.

### Desktop (Tauri)

Uses `@tauri-apps/api` for local file storage with localStorage fallback via `src/lib/mockTauri.ts`.

## Environment Variables

### Local Development (`.env`)
```env
VITE_GLM_API_KEY=              # Required for LLM features
VITE_OPENWEATHER_API_KEY=       # Weather data (optional)
VITE_GOOGLE_PLACES_API_KEY=     # Places/hotels/restaurants (optional)
```

### Vercel Production (server-side, set in Vercel Dashboard)
```env
GLM_API_KEY=                   # LLM API key (not exposed to browser)
OPENWEATHER_API_KEY=           # Weather API key
GOOGLE_PLACES_API_KEY=         # Places API key
VITE_SUPABASE_URL=             # Supabase project URL
VITE_SUPABASE_ANON_KEY=        # Supabase anon key
```

## Component Structure

```
src/
├── components/
│   ├── chat/           # Chat interface, message display
│   ├── itinerary/      # Trip itinerary display, map
│   ├── layout/         # Header, Sidebar, MainLayout
│   ├── settings/       # API key configuration
│   ├── user/           # User dashboard, onboarding
│   └── ui/             # shadcn/ui base components
├── services/
│   ├── multiAgentService.ts    # Core multi-agent orchestration
│   ├── llmService.ts           # LLM API integration (direct + proxy)
│   ├── externalApiService.ts   # External APIs (direct + proxy)
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
│   ├── supabase.ts            # Supabase client (web deployment)
│   └── export/                # Export utilities (PDF, Markdown)
├── hooks/
│   └── useAgentProcessing.ts  # Core agent processing hook
├── pages/                     # Route pages
└── types/                     # TypeScript definitions
api/
├── llm.ts                     # LLM proxy (Vercel Edge Function)
├── weather.ts                 # Weather proxy
└── places.ts                  # Places/hotels proxy
```

## Development Notes

- **Dual Mode**: Web deployment uses API proxy routes; desktop/dev uses direct API calls
- **No Mock Data**: LLM API must be configured for trip generation
- **Async Generator Pattern**: `MultiAgentService.processWithAgents()` yields messages progressively for real-time UX
- **Agent Progress Tracking**: All agent activity is tracked in `agentProgressStore` for visualization
- **External API Caching**: `externalApiService` caches responses to reduce API calls
- **Streaming**: LLM responses are streamed in real-time via `streamService`
- **Dark Mode**: Inline script in `index.html` prevents flash by reading localStorage before React loads

## Type Definitions

Key types in `src/types/`:
- `Trip`: Main trip structure with itinerary, preferences, duration
- `DayPlan`: Single day with activities, times, costs
- `UserPreferences`: Interests, accommodation, dietary restrictions
- `AgentMessage`: Agent communication with type (`thought`|`action`|`result`|`error`)
- `AgentContext`: Context passed between agents
