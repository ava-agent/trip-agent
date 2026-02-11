/**
 * A2UI Context Validator Service
 *
 * 验证 TripContext 完整性并识别缺失信息
 * 按优先级排序缺失字段（required > recommended）
 */

import { extractTripInfo } from './agentUtils'
import type { UserPreferences, BudgetRange } from '../types'

/**
 * 可验证的行程上下文字段
 */
export type TripContextField = 'destination' | 'days' | 'budget' | 'startDate' | 'preferences'

/**
 * 缺失信息项
 */
export interface MissingInfo {
  /** 字段名称 */
  field: TripContextField
  /** 优先级：required 为必需，recommended 为推荐 */
  priority: 'required' | 'recommended'
  /** 问题文本（由 QuestionGenerator 填充） */
  question: string
  /** 快速回复选项 */
  quickReplies?: string[]
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 上下文是否完整 */
  isComplete: boolean
  /** 缺失信息列表（按优先级排序） */
  missingInfo: MissingInfo[]
  /** 当前上下文（可能不完整） */
  context: Partial<TripContext>
}

/**
 * 行程上下文 - 用于行程规划的最小信息集
 */
export interface TripContext {
  /** 目的地城市 */
  destination: string
  /** 行程天数 */
  days: number
  /** 预算范围（可选但推荐） */
  budget?: BudgetRange
  /** 出发日期（可选） */
  startDate?: Date
  /** 用户偏好（兴趣标签） */
  preferences: string[]
}

/**
 * 上下文验证选项
 */
export interface ValidationOptions {
  /** 是否将偏好视为必需项 */
  preferencesRequired?: boolean
  /** 是否将预算视为必需项 */
  budgetRequired?: boolean
  /** 是否将出发日期视为必需项 */
  startDateRequired?: boolean
  /** 默认天数（未指定时使用） */
  defaultDays?: number
  /** 最少天数 */
  minDays?: number
  /** 最多天数 */
  maxDays?: number
}

/**
 * 默认验证选项
 */
const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  preferencesRequired: false,
  budgetRequired: false,
  startDateRequired: false,
  defaultDays: 5,
  minDays: 1,
  maxDays: 30,
} as const

/**
 * 上下文验证器服务
 *
 * 负责验证 TripContext 的完整性，识别缺失信息并按优先级排序。
 * 使用现有的 extractTripInfo 工具从消息中提取信息。
 *
 * @example
 * ```ts
 * const validator = new ContextValidator()
 * const result = validator.validateFromMessage("我想去东京5天", undefined, userPrefs)
 * if (!result.isComplete) {
 *   const questions = generateQuestions(result.missingInfo)
 *   // 显示问题给用户
 * }
 * ```
 */
export class ContextValidator {
  private readonly options: Required<ValidationOptions>

  constructor(options: ValidationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * 从用户消息中提取并验证行程上下文
   *
   * @param message - 用户消息
   * @param existingContext - 已有的上下文（可选）
   * @param preferences - 用户偏好（从用户会话中获取）
   * @returns 验证结果
   */
  validateFromMessage(
    message: string,
    existingContext?: Partial<TripContext>,
    preferences?: UserPreferences
  ): ValidationResult {
    // 从消息中提取基本信息，传递 existingContext 以保留 A2UI 收集的数据
    const extractedInfo = extractTripInfo(message, existingContext)

    // 合并已有上下文和提取的信息
    const mergedContext: Partial<TripContext> = this.mergeContext(
      extractedInfo,
      existingContext,
      preferences
    )

    // 验证完整性
    return this.validate(mergedContext)
  }

  /**
   * 验证给定的上下文是否完整
   *
   * @param context - 待验证的上下文
   * @returns 验证结果
   */
  validate(context: Partial<TripContext>): ValidationResult {
    const missingInfo: MissingInfo[] = []

    // 检查目的地（必需）
    if (!this.isValidDestination(context.destination)) {
      missingInfo.push({
        field: 'destination',
        priority: 'required',
        question: '', // 由 QuestionGenerator 填充
        quickReplies: ['东京', '巴黎', '纽约', '上海', '北京', '新加坡'],
      })
    }

    // 检查天数（必需，但可以有默认值）
    if (!this.isValidDays(context.days)) {
      missingInfo.push({
        field: 'days',
        priority: 'required',
        question: '',
        quickReplies: ['3天', '5天', '7天', '10天'],
      })
    }

    // 检查出发日期（可选）
    if (this.options.startDateRequired && !context.startDate) {
      missingInfo.push({
        field: 'startDate',
        priority: 'required',
        question: '',
      })
    } else if (!context.startDate) {
      missingInfo.push({
        field: 'startDate',
        priority: 'recommended',
        question: '',
        quickReplies: ['明天', '下周', '下个月', '暂不确定'],
      })
    }

    // 检查预算（可选但推荐）
    if (this.options.budgetRequired && !this.isValidBudget(context.budget)) {
      missingInfo.push({
        field: 'budget',
        priority: 'required',
        question: '',
      })
    } else if (!this.isValidBudget(context.budget)) {
      missingInfo.push({
        field: 'budget',
        priority: 'recommended',
        question: '',
        quickReplies: ['经济型（<5000元）', '舒适型（5000-15000元）', '豪华型（>15000元）'],
      })
    }

    // 检查偏好（推荐）
    const prefs = context.preferences || []
    if (this.options.preferencesRequired && prefs.length === 0) {
      missingInfo.push({
        field: 'preferences',
        priority: 'required',
        question: '',
      })
    } else if (prefs.length === 0) {
      missingInfo.push({
        field: 'preferences',
        priority: 'recommended',
        question: '',
        quickReplies: [
          '历史文化', '自然风光', '美食体验',
          '购物娱乐', '艺术博物馆', '户外运动'
        ],
      })
    }

    // 按优先级排序（required 优先）
    missingInfo.sort((a, b) => {
      const priorityOrder = { required: 0, recommended: 1 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return {
      isComplete: missingInfo.filter(m => m.priority === 'required').length === 0,
      missingInfo,
      context,
    }
  }

  /**
   * 检查目的地是否有效
   * @private
   */
  private isValidDestination(destination?: string): boolean {
    return destination !== undefined && destination !== null && destination.trim().length > 0
  }

  /**
   * 检查天数是否有效
   * @private
   */
  private isValidDays(days?: number): boolean {
    if (days === undefined || days === null) {
      return false
    }
    const numDays = Number(days)
    return !isNaN(numDays) && numDays >= this.options.minDays && numDays <= this.options.maxDays
  }

  /**
   * 检查预算是否有效
   * @private
   */
  private isValidBudget(budget?: BudgetRange): boolean {
    if (!budget) {
      return false
    }
    const { min, max, currency } = budget
    return (
      typeof min === 'number' && min >= 0 &&
      typeof max === 'number' && max > min &&
      typeof currency === 'string' && currency.trim().length > 0
    )
  }

  /**
   * 合并上下文信息
   * @private
   */
  private mergeContext(
    extractedInfo: { destination: string | null; days: number },
    existingContext?: Partial<TripContext>,
    preferences?: UserPreferences
  ): Partial<TripContext> {
    const merged: Partial<TripContext> = {
      ...existingContext,
    }

    // 使用提取的目的地（如果有）
    if (extractedInfo.destination) {
      merged.destination = extractedInfo.destination
    }

    // 使用提取的天数（如果有）
    if (extractedInfo.days > 0) {
      merged.days = extractedInfo.days
    }

    // 合并偏好
    if (preferences) {
      merged.preferences = preferences.interests || []
      if (preferences.budget && !merged.budget) {
        merged.budget = preferences.budget
      }
    }

    return merged
  }

  /**
   * 获取默认上下文（当用户提供最少信息时）
   *
   * @param destination - 目的地
   * @returns 默认的 TripContext
   */
  getDefaultContext(destination: string): TripContext {
    return {
      destination,
      days: this.options.defaultDays,
      preferences: [],
    }
  }

  /**
   * 检查上下文是否可以开始规划
   * （即使有推荐字段缺失）
   *
   * @param validationResult - 验证结果
   * @returns 是否可以开始规划
   */
  canStartPlanning(validationResult: ValidationResult): boolean {
    // 只有当所有必需字段都存在时才能开始规划
    const requiredMissing = validationResult.missingInfo.filter(m => m.priority === 'required')
    return requiredMissing.length === 0
  }
}

/**
 * 单例实例 - 用于简单场景
 */
export const contextValidator = new ContextValidator()

/**
 * 便捷函数：从消息验证上下文
 *
 * @param message - 用户消息
 * @param existingContext - 已有上下文
 * @param preferences - 用户偏好
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateTripContext(
  message: string,
  existingContext?: Partial<TripContext>,
  preferences?: UserPreferences,
  options?: ValidationOptions
): ValidationResult {
  const validator = options ? new ContextValidator(options) : contextValidator
  return validator.validateFromMessage(message, existingContext, preferences)
}
