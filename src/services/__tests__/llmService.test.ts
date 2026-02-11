/**
 * LLM Service Tests
 * Tests for LLM API integration functionality
 */

// Note: Tests are disabled until vitest is added to devDependencies
// To enable tests, run: npm install --save-dev vitest
// Then uncomment the test code below

/*
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LLMService, LLMAPIError, loadLLMConfigFromEnv, PROMPTS } from '../llmService'

// Mock fetch for testing
declare const global: any
global.fetch = vi.fn()

describe('LLMService', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    LLMService.reset()
  })

  describe('Configuration', () => {
    it('should initialize with config', () => {
      LLMService.initialize({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      })

      expect(LLMService.isConfigured()).toBe(true)
    })

    it('should not be configured without initialization', () => {
      expect(LLMService.isConfigured()).toBe(false)
    })

    it('should return current config', () => {
      const config = {
        provider: 'openai' as const,
        apiKey: 'test-key',
      }
      LLMService.initialize(config)
      expect(LLMService.getConfig()).toEqual(
        expect.objectContaining({
          provider: 'openai',
          apiKey: 'test-key',
        })
      )
    })

    it('should reset configuration', () => {
      LLMService.initialize({
        provider: 'openai',
        apiKey: 'test-key',
      })
      expect(LLMService.isConfigured()).toBe(true)

      LLMService.reset()
      expect(LLMService.isConfigured()).toBe(false)
    })
  })

  describe('OpenAI Streaming', () => {
    it('should stream OpenAI responses', async () => {
      const mockStreamChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[0])
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[1])
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[2])
              })
              .mockResolvedValueOnce({ done: true }),
          }),
          releaseLock: vi.fn(),
        },
      } as unknown as Response)

      LLMService.initialize({
        provider: 'openai',
        apiKey: 'test-key',
      })

      const chunks: string[] = []
      for await (const chunk of LLMService.streamChat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello' },
      ])) {
        if (!chunk.done) {
          chunks.push(chunk.content)
        }
      }

      expect(chunks).toEqual(['Hello', ' world'])
    })

    it('should handle OpenAI errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      } as unknown as Response)

      LLMService.initialize({
        provider: 'openai',
        apiKey: 'invalid-key',
      })

      await expect(async () => {
        const chunks = []
        for await (const chunk of LLMService.streamChat([
          { role: 'user', content: 'Test' },
        ])) {
          chunks.push(chunk)
        }
      }).rejects.toThrow()
    })
  })

  describe('Anthropic Streaming', () => {
    it('should stream Anthropic responses', async () => {
      const mockStreamChunks = [
        'data: {"type":"content_block_delta","delta":{"text":"Hello"}}\n\n',
        'data: {"type":"content_block_delta","delta":{"text":" world"}}\n\n',
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[0])
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[1])
              })
              .mockResolvedValueOnce({ done: true }),
          }),
          releaseLock: vi.fn(),
        },
      } as unknown as Response)

      LLMService.initialize({
        provider: 'anthropic',
        apiKey: 'test-key',
      })

      const chunks: string[] = []
      for await (const chunk of LLMService.streamChat([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello' },
      ])) {
        if (!chunk.done) {
          chunks.push(chunk.content)
        }
      }

      expect(chunks).toEqual(['Hello', ' world'])
    })
  })

  describe('Non-streaming Chat', () => {
    it('should aggregate streaming response', async () => {
      const mockStreamChunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n',
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[0])
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[1])
              })
              .mockResolvedValueOnce({
                done: false,
                value: new TextEncoder().encode(mockStreamChunks[2])
              })
              .mockResolvedValueOnce({ done: true }),
          }),
          releaseLock: vi.fn(),
        },
      } as unknown as Response)

      LLMService.initialize({
        provider: 'openai',
        apiKey: 'test-key',
      })

      const response = await LLMService.chatCompletion([
        { role: 'user', content: 'Say hello' },
      ])

      expect(response).toBe('Hello world')
    })
  })

  describe('Error Handling', () => {
    it('should handle rate limit errors with retry', async () => {
      // First call fails with rate limit
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'Rate limit exceeded' } }),
        } as unknown as Response)
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          body: {
            getReader: () => ({
              read: vi.fn().mockResolvedValueOnce({ done: true }),
              releaseLock: vi.fn(),
            }),
          },
        } as unknown as Response)

      LLMService.initialize({
        provider: 'openai',
        apiKey: 'test-key',
      })

      const chunks = []
      for await (const chunk of LLMService.streamChat([{ role: 'user', content: 'Test' }])) {
        chunks.push(chunk)
      }

      // Should eventually succeed after retry
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    })

    it('should give up after max retries for non-retryable errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      } as unknown as Response)

      LLMService.initialize({
        provider: 'openai',
        apiKey: 'invalid-key',
      })

      await expect(async () => {
        for await (const chunk of LLMService.streamChat([{ role: 'user', content: 'Test' }])) {
          // consume
        }
      }).rejects.toThrow()
    })
  })

  describe('LLMAPIError', () => {
    it('should create error with code and retryable flag', () => {
      const error = new LLMAPIError('Test error', 'rate_limit', true)

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('rate_limit')
      expect(error.retryable).toBe(true)
      expect(error.name).toBe('LLMAPIError')
    })

    it('should convert to LLMError', () => {
      const error = new LLMAPIError('Test error', 'network', true)
      const llmError = error.toLLMError()

      expect(llmError).toEqual({
        message: 'Test error',
        code: 'network',
        retryable: true,
      })
    })
  })

  describe('Prompts', () => {
    it('should have supervisor prompt', () => {
      expect(PROMPTS.SUPERVISOR).toBeDefined()
      expect(PROMPTS.SUPERVISOR).toContain('主管')
    })

    it('should have planner prompt', () => {
      expect(PROMPTS.PLANNER).toBeDefined()
      expect(PROMPTS.PLANNER).toContain('规划')
    })

    it('should have recommender prompt', () => {
      expect(PROMPTS.RECOMMENDER).toBeDefined()
      expect(PROMPTS.RECOMMENDER).toContain('推荐')
    })

    it('should have booking prompt', () => {
      expect(PROMPTS.BOOKING).toBeDefined()
      expect(PROMPTS.BOOKING).toContain('预订')
    })

    it('should have document prompt', () => {
      expect(PROMPTS.DOCUMENT).toBeDefined()
      expect(PROMPTS.DOCUMENT).toContain('文档')
    })

    it('should generate trip planning template', () => {
      const template = PROMPTS.TRIP_PLANNING_TEMPLATE('我想去东京旅行5天', {
        destination: '东京',
        days: 5,
        preferences: ['观光', '美食'],
      })

      expect(template).toContain('东京')
      expect(template).toContain('5')
      expect(template).toContain('观光')
      expect(template).toContain('美食')
    })
  })

  describe('Environment Configuration', () => {
    it('should load config from environment', () => {
      // Mock import.meta.env
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_OPENAI_API_KEY: 'test-env-key',
            VITE_OPENAI_MODEL: 'gpt-4o-mini',
          },
        },
      })

      const config = loadLLMConfigFromEnv()

      expect(config).toEqual({
        provider: 'openai',
        apiKey: 'test-env-key',
        model: 'gpt-4o-mini',
      })

      vi.unstubAllGlobals()
    })

    it('should return null when no API keys are set', () => {
      vi.stubGlobal('import', {
        meta: { env: {} },
      })

      const config = loadLLMConfigFromEnv()
      expect(config).toBeNull()

      vi.unstubAllGlobals()
    })

    it('should prefer OpenAI over Anthropic', () => {
      vi.stubGlobal('import', {
        meta: {
          env: {
            VITE_OPENAI_API_KEY: 'openai-key',
            VITE_ANTHROPIC_API_KEY: 'anthropic-key',
          },
        },
      })

      const config = loadLLMConfigFromEnv()
      expect(config?.provider).toBe('openai')

      vi.unstubAllGlobals()
    })
  })
})
*/
