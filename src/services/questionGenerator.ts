/**
 * A2UI Question Generator Service
 *
 * 将缺失信息转换为自然语言问题
 * 支持快速回复选项和多语言（中文/英文）
 */

import type { MissingInfo, TripContextField } from './contextValidator'

/**
 * 问题类型
 */
export type QuestionType = 'text' | 'choice' | 'date' | 'number' | 'multi-choice'

/**
 * 单个问题
 */
export interface Question {
  /** 问题唯一标识 */
  id: string
  /** 问题文本 */
  text: string
  /** 关联的字段 */
  field: string
  /** 问题类型 */
  type: QuestionType
  /** 选项（用于 choice 类型） */
  options?: string[]
  /** 是否必需 */
  required: boolean
  /** 快速回复建议 */
  quickReplies?: string[]
  /** 优先级 */
  priority: 'required' | 'recommended'
}

/**
 * 问题序列
 */
export interface QuestionSequence {
  /** 问题列表 */
  questions: Question[]
  /** 当前问题索引 */
  currentIndex: number
  /** 是否已完成 */
  isComplete: boolean
}

/**
 * 问题生成选项
 */
export interface QuestionGeneratorOptions {
  /** 语言 */
  language?: 'zh-CN' | 'en-US'
  /** 是否包含快速回复 */
  includeQuickReplies?: boolean
  /** 每批最多问题数 */
  maxQuestions?: number
  /** 是否合并相关问题 */
  mergeRelated?: boolean
}

/**
 * 字段到问题类型的映射
 */
const FIELD_QUESTION_TYPE_MAP: Record<TripContextField, QuestionType> = {
  destination: 'choice',
  days: 'choice',
  budget: 'choice',
  startDate: 'date',
  preferences: 'multi-choice',
}

/**
 * 问题模板 - 中文
 */
const CHINESE_TEMPLATES: Record<TripContextField, { question: string; quickReplies?: string[] }> = {
  destination: {
    question: '请问您想去哪里旅游？',
    quickReplies: ['东京', '巴黎', '纽约', '上海', '北京', '新加坡', '曼谷', '迪拜'],
  },
  days: {
    question: '您计划旅行多少天？',
    quickReplies: ['3天', '5天', '7天', '10天', '14天'],
  },
  budget: {
    question: '您的预算大概是多少？',
    quickReplies: ['经济型（<5000元）', '舒适型（5000-15000元）', '豪华型（>15000元）'],
  },
  startDate: {
    question: '您计划什么时候出发？',
    quickReplies: ['明天', '本周', '下周', '下个月', '暂不确定'],
  },
  preferences: {
    question: '您对什么类型的内容感兴趣？（可多选）',
    quickReplies: ['历史文化', '自然风光', '美食体验', '购物娱乐', '艺术博物馆', '户外运动'],
  },
}

/**
 * 问题模板 - 英文
 */
const ENGLISH_TEMPLATES: Record<TripContextField, { question: string; quickReplies?: string[] }> = {
  destination: {
    question: 'Where would you like to travel?',
    quickReplies: ['Tokyo', 'Paris', 'New York', 'Shanghai', 'Beijing', 'Singapore', 'Bangkok', 'Dubai'],
  },
  days: {
    question: 'How many days are you planning to travel?',
    quickReplies: ['3 days', '5 days', '7 days', '10 days', '14 days'],
  },
  budget: {
    question: 'What is your approximate budget?',
    quickReplies: ['Budget (<$1000)', 'Mid-range ($1000-$3000)', 'Luxury (>$3000)'],
  },
  startDate: {
    question: 'When are you planning to start your trip?',
    quickReplies: ['Tomorrow', 'This week', 'Next week', 'Next month', 'Not sure yet'],
  },
  preferences: {
    question: 'What are you interested in? (Select all that apply)',
    quickReplies: ['History', 'Nature', 'Food', 'Shopping', 'Art & Museums', 'Outdoor Activities'],
  },
}

/**
 * 问题生成器服务
 *
 * 负责将缺失信息转换为自然语言问题，
 * 支持快速回复选项和多语言。
 *
 * @example
 * ```ts
 * const generator = new QuestionGenerator({ language: 'zh-CN' })
 * const sequence = generator.generateFromMissingInfo(missingInfo)
 * const firstQuestion = generator.getNextQuestion(sequence)
 * // 显示问题给用户
 * ```
 */
export class QuestionGenerator {
  private readonly options: Required<QuestionGeneratorOptions>
  private readonly templates: Record<TripContextField, { question: string; quickReplies?: string[] }>

  constructor(options: QuestionGeneratorOptions = {}) {
    this.options = {
      language: options.language || 'zh-CN',
      includeQuickReplies: options.includeQuickReplies !== false,
      maxQuestions: options.maxQuestions || 3,
      mergeRelated: options.mergeRelated !== false,
    }
    this.templates = this.options.language === 'zh-CN' ? CHINESE_TEMPLATES : ENGLISH_TEMPLATES
  }

  /**
   * 从缺失信息生成问题序列
   *
   * @param missingInfo - 缺失信息列表
   * @returns 问题序列
   */
  generateFromMissingInfo(missingInfo: MissingInfo[]): QuestionSequence {
    let questions = missingInfo.map((info, index) => this.createQuestion(info, index))

    // 合并相关问题（可选）
    if (this.options.mergeRelated && questions.length > 1) {
      questions = this.mergeRelatedQuestions(questions)
    }

    return {
      questions: questions.slice(0, this.options.maxQuestions),
      currentIndex: 0,
      isComplete: missingInfo.length === 0,
    }
  }

  /**
   * 创建单个问题
   * @private
   */
  private createQuestion(info: MissingInfo, index: number): Question {
    const template = this.templates[info.field]
    const quickReplies = this.options.includeQuickReplies
      ? (info.quickReplies || template.quickReplies)
      : undefined

    return {
      id: `q-${info.field}-${Date.now()}-${index}`,
      text: info.question || template.question,
      field: info.field,
      type: FIELD_QUESTION_TYPE_MAP[info.field],
      options: quickReplies,
      required: info.priority === 'required',
      quickReplies,
      priority: info.priority,
    }
  }

  /**
   * 合并相关问题
   * 例如：将出发日期和预算合并为一个问题
   * @private
   */
  private mergeRelatedQuestions(questions: Question[]): Question[] {
    const merged: Question[] = []
    const skipIndices = new Set<number>()

    for (let i = 0; i < questions.length; i++) {
      if (skipIndices.has(i)) continue

      const current = questions[i]

      // 检查是否可以与下一个问题合并
      if (i + 1 < questions.length) {
        const next = questions[i + 1]
        const mergedQuestion = this.tryMergeQuestions(current, next)

        if (mergedQuestion) {
          merged.push(mergedQuestion)
          skipIndices.add(i + 1)
          continue
        }
      }

      merged.push(current)
    }

    return merged
  }

  /**
   * 尝试合并两个问题
   * @private
   */
  private tryMergeQuestions(q1: Question, q2: Question): Question | null {
    // 可以合并的字段组合
    const mergablePairs: Array<[string, string]> = [
      ['budget', 'startDate'],
      ['days', 'startDate'],
    ]

    const canMerge = mergablePairs.some(
      ([f1, f2]) =>
        (q1.field === f1 && q2.field === f2) ||
        (q1.field === f2 && q2.field === f1)
    )

    if (!canMerge) return null

    // 创建合并后的问题
    const isZh = this.options.language === 'zh-CN'
    const fieldNames = isZh
      ? { budget: '预算', startDate: '出发日期', days: '天数' }
      : { budget: 'budget', startDate: 'start date', days: 'days' }

    return {
      id: `q-merged-${q1.field}-${q2.field}-${Date.now()}`,
      text: isZh
        ? `请告诉我您的${fieldNames[q1.field as keyof typeof fieldNames]}和${fieldNames[q2.field as keyof typeof fieldNames]}？`
        : `What's your ${fieldNames[q1.field as keyof typeof fieldNames]} and ${fieldNames[q2.field as keyof typeof fieldNames]}?`,
      field: `${q1.field},${q2.field}`,
      type: 'text',
      required: q1.required || q2.required,
      priority: q1.priority === 'required' || q2.priority === 'required' ? 'required' : 'recommended',
    }
  }

  /**
   * 获取下一个问题
   *
   * @param sequence - 问题序列
   * @returns 下一个问题，如果没有则返回 null
   */
  getNextQuestion(sequence: QuestionSequence): Question | null {
    if (sequence.currentIndex >= sequence.questions.length) {
      return null
    }
    return sequence.questions[sequence.currentIndex]
  }

  /**
   * 移动到下一个问题
   *
   * @param sequence - 问题序列
   * @returns 更新后的问题序列
   */
  advanceToNext(sequence: QuestionSequence): QuestionSequence {
    const newIndex = sequence.currentIndex + 1
    return {
      ...sequence,
      currentIndex: newIndex,
      isComplete: newIndex >= sequence.questions.length,
    }
  }

  /**
   * 解析用户回答并更新上下文
   *
   * @param question - 当前问题
   * @param answer - 用户回答
   * @param existingContext - 现有上下文
   * @returns 更新后的上下文
   */
  parseAnswer(
    question: Question,
    answer: string,
    existingContext: Record<string, unknown> = {}
  ): Record<string, unknown> {
    const fields = question.field.split(',')
    const updates: Record<string, unknown> = { ...existingContext }

    for (const field of fields) {
      switch (field as TripContextField) {
        case 'destination':
          updates.destination = answer.trim()
          break

        case 'days':
          updates.days = this.extractNumber(answer)
          break

        case 'budget':
          updates.budget = this.parseBudget(answer)
          break

        case 'startDate':
          updates.startDate = this.parseDate(answer)
          break

        case 'preferences':
          updates.preferences = this.parsePreferences(answer, existingContext.preferences as string[] || [])
          break
      }
    }

    return updates
  }

  /**
   * 从文本中提取数字
   * @private
   */
  private extractNumber(text: string): number {
    const match = text.match(/\d+/)
    return match ? parseInt(match[0], 10) : 5
  }

  /**
   * 解析预算文本
   * @private
   */
  private parseBudget(text: string): { min: number; max: number; currency: string } | undefined {
    // 检测货币
    const currency = text.includes('¥') || text.includes('元') ? 'CNY' : 'USD'

    // 提取数字范围
    const numbers = text.match(/\d+/g)
    if (!numbers || numbers.length === 0) {
      return undefined
    }

    const values = numbers.map(n => parseInt(n, 10))

    if (values.length >= 2) {
      return {
        min: Math.min(...values),
        max: Math.max(...values),
        currency,
      }
    }

    // 单个数字，根据上下文推断范围
    const value = values[0]
    if (text.includes('以下') || text.includes('<') || text.toLowerCase().includes('less')) {
      return { min: 0, max: value, currency }
    }
    if (text.includes('以上') || text.includes('>') || text.toLowerCase().includes('more')) {
      return { min: value, max: value * 2, currency }
    }

    // 默认：±20%
    return {
      min: Math.round(value * 0.8),
      max: Math.round(value * 1.2),
      currency,
    }
  }

  /**
   * 解析日期文本
   * @private
   */
  private parseDate(text: string): Date | undefined {
    const now = new Date()

    if (text.includes('明天') || text.toLowerCase().includes('tomorrow')) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }
    if (text.includes('后天')) {
      return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    }
    if (text.includes('本周') || text.toLowerCase().includes('this week')) {
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    }
    if (text.includes('下周') || text.toLowerCase().includes('next week')) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
    if (text.includes('下个月') || text.toLowerCase().includes('next month')) {
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth
    }
    if (text.includes('暂不确定') || text.toLowerCase().includes('not sure')) {
      return undefined
    }

    // 尝试解析标准日期格式
    const parsed = new Date(text)
    if (!isNaN(parsed.getTime())) {
      return parsed
    }

    return undefined
  }

  /**
   * 解析偏好（支持多选）
   * @private
   */
  private parsePreferences(answer: string, existing: string[]): string[] {
    const isZh = this.options.language === 'zh-CN'
    const separators = isZh ? ['、', '，', ','] : [',', ' and ', ' & ']

    let items: string[] = [answer]

    for (const sep of separators) {
      items = items.flatMap(item => item.split(sep))
    }

    const trimmed = items.map(s => s.trim()).filter(s => s.length > 0)

    // 去重
    const combined = [...new Set([...existing, ...trimmed])]

    return combined
  }

  /**
   * 根据用户输入自动生成跟进问题
   * （可用于未来的 LLM 增强）
   *
   * @param lastAnswer - 上一个回答
   * @param lastField - 上一个字段
   * @param context - 当前上下文
   * @returns 跟进问题，如果不需要则返回 null
   */
  generateFollowUpQuestion(
    lastAnswer: string,
    lastField: TripContextField,
    context: Record<string, unknown>
  ): Question | null {
    void lastAnswer
    void lastField
    void context

    // 这里可以添加更复杂的逻辑
    // 目前返回 null，表示不需要跟进问题

    // 未来可以用 LLM 生成更智能的跟进问题
    return null
  }
}

/**
 * 单例实例 - 用于简单场景
 */
export const questionGenerator = new QuestionGenerator()

/**
 * 便捷函数：从缺失信息生成问题
 *
 * @param missingInfo - 缺失信息列表
 * @param options - 生成选项
 * @returns 问题序列
 */
export function generateQuestions(
  missingInfo: MissingInfo[],
  options?: QuestionGeneratorOptions
): QuestionSequence {
  const generator = options ? new QuestionGenerator(options) : questionGenerator
  return generator.generateFromMissingInfo(missingInfo)
}
