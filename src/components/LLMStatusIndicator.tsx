/**
 * LLM Status Indicator Component
 * Displays the current status of LLM integration
 */

import { useEffect, useState } from 'react'
import { isLLMAvailable } from '@/services/multiAgentService'
import { LLMService } from '@/services/llmService'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'

export function LLMStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')

  useEffect(() => {
    // Check LLM status
    const available = isLLMAvailable()
    setStatus(available ? 'available' : 'unavailable')

    // Listen for configuration changes
    const checkInterval = setInterval(() => {
      setStatus(isLLMAvailable() ? 'available' : 'unavailable')
    }, 5000)

    return () => clearInterval(checkInterval)
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span>检查 LLM 状态...</span>
      </div>
    )
  }

  const config = LLMService.getConfig()

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'available' ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600 dark:text-green-400">
            LLM 已连接 ({config?.provider === 'openai' ? 'OpenAI' : 'Anthropic'})
          </span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-orange-500" />
          <span className="text-orange-600 dark:text-orange-400">
            LLM 未配置 (使用模拟模式)
          </span>
        </>
      )}
    </div>
  )
}

/**
 * LLM Configuration Panel
 * Allows users to configure LLM API settings
 */

interface LLMConfigPanelProps {
  onClose?: () => void
}

export function LLMConfigPanel({ onClose }: LLMConfigPanelProps) {
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const testConnection = async () => {
    if (!apiKey.trim()) {
      setStatus('error')
      setStatusMessage('请输入 API Key')
      return
    }

    setStatus('testing')
    setStatusMessage('正在测试连接...')

    try {
      LLMService.initialize({
        provider,
        apiKey: apiKey.trim(),
        maxTokens: 100,
        temperature: 0.7,
      })

      // Try a simple test call
      const testMessage = 'Test'
      let success = false

      try {
        for await (const chunk of LLMService.streamChat([
          { role: 'user', content: testMessage },
        ])) {
          if (chunk.content) {
            success = true
            break
          }
        }
      } catch {
        success = false
      }

      if (success) {
        setStatus('success')
        setStatusMessage('连接成功！LLM 已配置。')
      } else {
        setStatus('error')
        setStatusMessage('连接失败，请检查 API Key 是否正确。')
      }
    } catch (error) {
      setStatus('error')
      setStatusMessage(error instanceof Error ? error.message : '未知错误')
    }
  }

  const saveConfig = () => {
    // In a real app, you would save this to secure storage
    // For now, just initialize the service
    LLMService.initialize({
      provider,
      apiKey: apiKey.trim(),
    })
    setStatus('success')
    setStatusMessage('配置已保存')
    setTimeout(() => onClose?.(), 1500)
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-background">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">LLM API 配置</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">API 提供商</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'openai' | 'anthropic')}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="openai">OpenAI (GPT-4, GPT-3.5)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
            className="w-full px-3 py-2 border rounded-md bg-background"
          />
          <p className="text-xs text-muted-foreground mt-1">
            API Key 将仅存储在本地，不会上传到服务器
          </p>
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{statusMessage}</span>
          </div>
        )}

        {status === 'success' && (
          <div className="text-sm text-green-600 dark:text-green-400">
            {statusMessage}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={testConnection}
            disabled={status === 'testing'}
            className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50"
          >
            {status === 'testing' ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={saveConfig}
            disabled={!apiKey || status === 'testing'}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            保存配置
          </button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p>提示:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>OpenAI API Key: 在 platform.openai.com 获取</li>
          <li>Anthropic API Key: 在 console.anthropic.com 获取</li>
          <li>也可以在 .env 文件中配置 VITE_OPENAI_API_KEY</li>
        </ul>
      </div>
    </div>
  )
}
