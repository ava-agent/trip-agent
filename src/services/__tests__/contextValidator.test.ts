/**
 * ContextValidator Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ContextValidator, type TripContext } from '../contextValidator'

describe('ContextValidator', () => {
  let validator: ContextValidator

  beforeEach(() => {
    validator = new ContextValidator()
  })

  describe('validateFromMessage', () => {
    it('should detect destination as valid and days as missing when only destination provided', () => {
      const validation = validator.validateFromMessage('花桥')

      // Destination should be in context
      expect(validation.context.destination).toBe('花桥')

      // Days should be missing (undefined or 0)
      expect(validation.context.days).toBeUndefined()

      // Should be incomplete because days is required
      expect(validation.isComplete).toBe(false)

      // Only days should be in missingInfo
      const missingFields = validation.missingInfo.map(m => m.field)
      expect(missingFields).toContain('days')
      expect(missingFields).not.toContain('destination')
    })

    it('should detect both destination and days as valid when both provided', () => {
      const validation = validator.validateFromMessage('花桥5天')

      // Both should be in context
      expect(validation.context.destination).toBe('花桥')
      expect(validation.context.days).toBe(5)

      // Should be complete
      expect(validation.isComplete).toBe(true)

      // No required fields should be missing
      const requiredMissing = validation.missingInfo.filter(m => m.priority === 'required')
      expect(requiredMissing).toHaveLength(0)
    })

    it('should detect destination as missing when only days provided', () => {
      const validation = validator.validateFromMessage('5天')

      // Days should be in context
      expect(validation.context.days).toBe(5)

      // Destination should be missing
      expect(validation.context.destination).toBeUndefined()

      // Should be incomplete
      expect(validation.isComplete).toBe(false)

      // Destination should be in missingInfo
      const missingFields = validation.missingInfo.map(m => m.field)
      expect(missingFields).toContain('destination')
    })

    it('should preserve existing context when validating with existingContext', () => {
      const existingContext: Partial<TripContext> = {
        destination: '东京',
        days: 3,
      }

      const validation = validator.validateFromMessage('花桥', existingContext)

      // Should override destination with new value
      expect(validation.context.destination).toBe('花桥')

      // Should preserve days from existing context
      expect(validation.context.days).toBe(3)

      // Should be complete (both required fields present)
      expect(validation.isComplete).toBe(true)
    })

    it('should merge extracted info with existing context correctly', () => {
      const existingContext: Partial<TripContext> = {
        destination: '东京',
        // days not provided in existing
      }

      const validation = validator.validateFromMessage('5天', existingContext)

      // Should preserve destination from existing context
      expect(validation.context.destination).toBe('东京')

      // Should add days from extracted info
      expect(validation.context.days).toBe(5)

      // Should be complete
      expect(validation.isComplete).toBe(true)
    })
  })

  describe('validate', () => {
    it('should return isComplete=true when all required fields are present', () => {
      const context: Partial<TripContext> = {
        destination: '东京',
        days: 5,
        preferences: [],
      }

      const validation = validator.validate(context)

      expect(validation.isComplete).toBe(true)
    })

    it('should return isComplete=false when destination is missing', () => {
      const context: Partial<TripContext> = {
        days: 5,
        preferences: [],
      }

      const validation = validator.validate(context)

      expect(validation.isComplete).toBe(false)
      expect(validation.missingInfo.some(m => m.field === 'destination')).toBe(true)
    })

    it('should return isComplete=false when days is missing', () => {
      const context: Partial<TripContext> = {
        destination: '东京',
        preferences: [],
      }

      const validation = validator.validate(context)

      expect(validation.isComplete).toBe(false)
      expect(validation.missingInfo.some(m => m.field === 'days')).toBe(true)
    })

    it('should return isComplete=false when days is 0', () => {
      const context: Partial<TripContext> = {
        destination: '东京',
        days: 0,
        preferences: [],
      }

      const validation = validator.validate(context)

      expect(validation.isComplete).toBe(false)
      expect(validation.missingInfo.some(m => m.field === 'days')).toBe(true)
    })

    it('should return isComplete=false when days is outside valid range', () => {
      const context: Partial<TripContext> = {
        destination: '东京',
        days: 100, // > maxDays (30)
        preferences: [],
      }

      const validation = validator.validate(context)

      expect(validation.isComplete).toBe(false)
      expect(validation.missingInfo.some(m => m.field === 'days')).toBe(true)
    })
  })
})
