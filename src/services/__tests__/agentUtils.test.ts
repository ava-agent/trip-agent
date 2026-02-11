/**
 * agentUtils function tests
 * Test extractTripInfo and normalizeDestination functions
 */

import { describe, it, expect } from 'vitest'
import { extractTripInfo } from '../agentUtils'

// We need to access normalizeDestination for testing
// Since it's not exported, we'll test it indirectly through extractTripInfo

describe('extractTripInfo', () => {
  describe('Chinese destinations', () => {
    it('should extract "花桥" from pure destination input', () => {
      const result = extractTripInfo('花桥')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(0)
    })

    it('should extract "花桥" with days', () => {
      const result = extractTripInfo('花桥5天')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(5)
    })

    it('should extract "花桥" with variant day format', () => {
      const result = extractTripInfo('花桥5日')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(5)
    })

    it('should extract "花桥" with travel suffix', () => {
      const result = extractTripInfo('花桥旅游')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(0)
    })

    it('should extract "花桥" with trip plan', () => {
      const result = extractTripInfo('花桥旅游计划')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(0)
    })
  })

  describe('Other Chinese destinations', () => {
    it('should extract "上海" from pure destination input', () => {
      const result = extractTripInfo('上海')
      expect(result.destination).toBe('上海')
      expect(result.days).toBe(0)
    })

    it('should extract "北京" with days', () => {
      const result = extractTripInfo('北京5天')
      expect(result.destination).toBe('北京')
      expect(result.days).toBe(5)
    })

    it('should extract "东京" with travel plan', () => {
      const result = extractTripInfo('东京旅游计划')
      expect(result.destination).toBe('东京')
      expect(result.days).toBe(0)
    })

    it('should extract "巴黎" with days and plan', () => {
      const result = extractTripInfo('巴黎7天旅游')
      expect(result.destination).toBe('巴黎')
      expect(result.days).toBe(7)
    })
  })

  describe('English destinations', () => {
    it('should extract "Tokyo" (English input)', () => {
      const result = extractTripInfo('Tokyo')
      expect(result.destination).toBe('东京')
      expect(result.days).toBe(0)
    })

    it('should extract "Paris" with days', () => {
      const result = extractTripInfo('Paris 5 days')
      expect(result.destination).toBe('巴黎')
      expect(result.days).toBe(5)
    })

    it('should extract "Shanghai" with variant spacing', () => {
      const result = extractTripInfo('Shanghai 5天')
      expect(result.destination).toBe('上海')
      expect(result.days).toBe(5)
    })

    it('should handle "Hua Qiao" (pinyin input)', () => {
      const result = extractTripInfo('Hua Qiao')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(0)
    })

    it('should handle "huaqiao" (lowercase pinyin)', () => {
      const result = extractTripInfo('huaqiao')
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(0)
    })
  })

  describe('Edge cases', () => {
    it('should return null for unknown destination', () => {
      const result = extractTripInfo('UnknownCity')
      expect(result.destination).toBeNull()
      expect(result.days).toBe(0)
    })

    it('should handle days without destination', () => {
      const result = extractTripInfo('5天')
      expect(result.destination).toBeNull()
      expect(result.days).toBe(5)
    })

    it('should handle empty string', () => {
      const result = extractTripInfo('')
      expect(result.destination).toBeNull()
      expect(result.days).toBe(0)
    })

    it('should handle whitespace only', () => {
      const result = extractTripInfo('   ')
      expect(result.destination).toBeNull()
      expect(result.days).toBe(0)
    })
  })

  describe('Existing context integration', () => {
    it('should use existingContext.destination when provided', () => {
      const result = extractTripInfo('some message', {
        destination: '花桥',
        days: 5
      })
      expect(result.destination).toBe('花桥')
      expect(result.days).toBe(5)
    })

    it('should prioritize extracted destination over existingContext when message contains destination', () => {
      const result = extractTripInfo('上海', {
        destination: '花桥',
        days: 3
      })
      // When message contains a destination, it should override existingContext
      // This allows users to change their mind
      expect(result.destination).toBe('上海')
      expect(result.days).toBe(3)
    })
  })
})
