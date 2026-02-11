import { create } from 'zustand'

/**
 * 工具执行结果存储
 */
export interface ToolResult {
  toolName: string
  result: any
  timestamp: number
  status: 'success' | 'error' | 'loading'
  error?: string
}

/**
 * 工具结果状态管理
 */
interface ToolResultState {
  results: Map<string, ToolResult>

  // 获取工具结果
  getResult: (key: string) => ToolResult | undefined

  // 设置工具结果
  setResult: (key: string, result: Omit<ToolResult, 'timestamp'>) => void

  // 清除指定结果
  clearResult: (key: string) => void

  // 清除所有结果
  clearAll: () => void

  // 获取按工具名称分组的所有结果
  getResultsByTool: (toolName: string) => ToolResult[]

  // 检查结果是否存在且有效
  hasValidResult: (key: string, maxAge?: number) => boolean
}

/**
 * 生成结果缓存键
 */
export function generateResultKey(toolName: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${JSON.stringify(params[key])}`)
    .join('|')
  return `${toolName}:${sortedParams}`
}

/**
 * 工具结果存储 - Zustand Store
 */
export const useToolResultStore = create<ToolResultState>((set, get) => ({
  results: new Map(),

  getResult: (key: string) => {
    return get().results.get(key)
  },

  setResult: (key: string, result: Omit<ToolResult, 'timestamp'>) => {
    set(state => {
      const newResults = new Map(state.results)
      newResults.set(key, {
        ...result,
        timestamp: Date.now()
      })
      return { results: newResults }
    })
  },

  clearResult: (key: string) => {
    set(state => {
      const newResults = new Map(state.results)
      newResults.delete(key)
      return { results: newResults }
    })
  },

  clearAll: () => {
    set({ results: new Map() })
  },

  getResultsByTool: (toolName: string) => {
    const allResults = Array.from(get().results.values())
    return allResults.filter(result => result.toolName === toolName)
  },

  hasValidResult: (key: string, maxAge: number = 5 * 60 * 1000) => {
    const result = get().results.get(key)
    if (!result || result.status !== 'success') {
      return false
    }
    const age = Date.now() - result.timestamp
    return age < maxAge
  }
}))

/**
 * 便捷 hook：获取或执行工具调用
 */
export function useToolCall<T = any>(
  toolName: string,
  params: Record<string, any>,
  executor: () => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
  }
): { data: T | undefined; error: string | undefined; isLoading: boolean; refetch: () => Promise<void> } {
  const key = generateResultKey(toolName, params)
  const { getResult, setResult, hasValidResult } = useToolResultStore()

  const cached = getResult(key)
  const isValid = options?.enabled !== false && hasValidResult(key, options?.staleTime)

  const refetch = async () => {
    setResult(key, { toolName, result: undefined, status: 'loading' })
    try {
      const result = await executor()
      setResult(key, { toolName, result, status: 'success' })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setResult(key, { toolName, result: undefined, status: 'error', error: errorMessage })
    }
  }

  // 如果没有有效缓存，立即执行
  if (!isValid && options?.enabled !== false) {
    refetch()
  }

  return {
    data: cached?.result,
    error: cached?.error,
    isLoading: cached?.status === 'loading' || (!isValid && options?.enabled !== false),
    refetch
  }
}
