/**
 * Vitest Test Setup
 */

import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock import.meta.env for Vite environment variables
// Vite's import.meta.env is transformed at build time
// For vitest, we need to define it on the global scope
// const originalEnv = import.meta.env
Object.defineProperty(import.meta, 'env', {
  value: {
    MODE: 'test',
    BASE: '/',
    DEV: true,
    PROD: false,
    SSR: false,
    // LLM API Keys
    VITE_GLM_API_KEY: '',
    VITE_GLM_MODEL: '',
    VITE_GLM_BASE_URL: '',
    VITE_OPENAI_API_KEY: '',
    VITE_OPENAI_MODEL: '',
    VITE_OPENAI_BASE_URL: '',
    VITE_ANTHROPIC_API_KEY: '',
    VITE_ANTHROPIC_MODEL: '',
    // External API Keys
    VITE_OPENWEATHER_API_KEY: '',
    VITE_GOOGLE_PLACES_API_KEY: '',
    VITE_BOOKING_API_KEY: '',
  },
  writable: true,
  configurable: true,
})

