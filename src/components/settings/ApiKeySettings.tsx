/**
 * API Key Management Component
 * Allows users to configure their API keys through UI
 */

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Key, Check, X, TestTube, Eye, EyeOff, AlertCircle } from "lucide-react"
import { externalApiService } from "@/services/externalApiService"
import { LLMService, type LLMProvider } from "@/services/llmService"

type ConfigurableLLMProvider = Exclude<LLMProvider, "proxy">

interface ApiConfig {
  glm: string
  openai: string
  anthropic: string
  openWeatherMap: string
  googlePlaces: string
}

interface ValidationResult {
  isValid: boolean
  error?: string
}

const STORAGE_KEY = "trip-agent-api-keys"

// API Key validation patterns
const VALIDATION_PATTERNS = {
  glm: /^sk-[a-zA-Z0-9]{48,}$/,
  openai: /^sk-[a-zA-Z0-9]{48,}$/,
  anthropic: /^sk-ant-[a-zA-Z0-9]{95,}$/,
  openWeatherMap: /^[a-zA-Z0-9]{32}$/,
  googlePlaces: /^AIza[A-Za-z0-9_\-]{35,}$/
}

// Validate API key format
function validateApiKey(provider: Exclude<LLMProvider, "proxy"> | "openWeatherMap" | "googlePlaces", key: string): ValidationResult {
  if (!key) {
    return { isValid: false, error: "API 密钥不能为空" }
  }

  if (key.length < 8) {
    return { isValid: false, error: "API 密钥长度不足" }
  }

  const pattern = VALIDATION_PATTERNS[provider]
  if (pattern && !pattern.test(key)) {
    return { isValid: false, error: "API 密钥格式不正确" }
  }

  return { isValid: true }
}

interface ApiKeySettingsProps {
  className?: string
  onSave?: (keys: Partial<ApiConfig>) => void
}

export function ApiKeySettings({ className, onSave }: ApiKeySettingsProps) {
  const [apiKeys, setApiKeys] = useState<ApiConfig>({
    glm: "",
    openai: "",
    anthropic: "",
    openWeatherMap: "",
    googlePlaces: ""
  })
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [validation, setValidation] = useState<Record<string, ValidationResult>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({})

  // Load saved keys on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const keys = JSON.parse(saved)
        setApiKeys(keys)

        // Also apply to services
        if (keys.openWeatherMap || keys.googlePlaces) {
          externalApiService.setApiKeys({
            openWeatherMap: keys.openWeatherMap || "",
            googlePlaces: keys.googlePlaces || ""
          })
        }

        // Set LLM config if available
        if (keys.glm || keys.openai || keys.anthropic) {
          const provider = keys.glm ? "glm" : keys.openai ? "openai" : "anthropic"
          const key = keys[provider] || ""
          if (key) {
            LLMService.initialize({ provider, apiKey: key, model: undefined })
          }
        }
      } catch {
        if (import.meta.env.DEV) console.error("Failed to parse saved API keys")
      }
    }

    // Set validation state based on current keys
    const initialValidation: Record<string, ValidationResult> = {}
    for (const [key, value] of Object.entries(apiKeys)) {
      if (value) {
        const provider = key as ConfigurableLLMProvider | "openWeatherMap" | "googlePlaces"
        initialValidation[provider] = validateApiKey(provider, value)
      }
    }
    setValidation(initialValidation)
  }, [])

  const toggleVisibility = (key: string): void => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleKeyChange = (provider: string, value: string): void => {
    const newKeys = { ...apiKeys, [provider]: value }
    setApiKeys(newKeys)

    // Validate the new key
    const result = validateApiKey(provider as ConfigurableLLMProvider | "openWeatherMap" | "googlePlaces", value)
    setValidation(prev => ({ ...prev, [provider]: result }))
  }

  const handleSave = (): void => {
    // Validate all keys before saving
    const hasValidKeys = Object.entries(apiKeys).some(([key, value]) => {
      if (!value) return true // Empty keys are ok
      const provider = key as ConfigurableLLMProvider | "openWeatherMap" | "googlePlaces"
      return validateApiKey(provider, value).isValid
    })

    if (!hasValidKeys) {
      return // At least one valid key required
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys))

    // Apply to services
    const validKeys: Partial<ApiConfig> = {}
    if (apiKeys.openWeatherMap) {
      validKeys.openWeatherMap = apiKeys.openWeatherMap
      externalApiService.setApiKeys({ openWeatherMap: apiKeys.openWeatherMap })
    }
    if (apiKeys.googlePlaces) {
      validKeys.googlePlaces = apiKeys.googlePlaces
      externalApiService.setApiKeys({ googlePlaces: apiKeys.googlePlaces })
    }

    // Set LLM provider
    if (apiKeys.glm || apiKeys.openai || apiKeys.anthropic) {
      const provider = apiKeys.glm ? "glm" as const : apiKeys.openai ? "openai" as const : "anthropic" as const
      const key = apiKeys[provider] || ""
      LLMService.initialize({ provider, apiKey: key, model: undefined })
      validKeys[provider] = key
    }

    onSave?.(validKeys)

    // Show success message
    setTestResult({
      ...testResult,
      save: { success: true, message: "API 密钥已保存" }
    })

    setTimeout(() => {
      setTestResult(prev => {
        const { save, ...rest } = prev
        return rest
      })
    }, 3000)
  }

  const handleTestConnection = async (provider: string): Promise<void> => {
    const key = apiKeys[provider as keyof ApiConfig]
    if (!key) {
      return
    }

    setTesting(prev => ({ ...prev, [provider]: true }))

    try {
      if (provider === "openWeatherMap") {
        await externalApiService.getWeather("Tokyo")
        setTestResult(prev => ({
          ...prev,
          [provider]: { success: true, message: "连接成功！" }
        }))
      } else if (provider === "googlePlaces") {
        await externalApiService.searchPlaces("test", "Tokyo", "attraction")
        setTestResult(prev => ({
          ...prev,
          [provider]: { success: true, message: "连接成功！" }
        }))
      } else {
        // LLM providers - test with a simple completion
        const llmProvider = provider as ConfigurableLLMProvider
        LLMService.initialize({ provider: llmProvider, apiKey: key, model: undefined })
        // Note: We can't actually test without making a request, which costs money
        // So we just validate the format
        const result = validateApiKey(llmProvider, key)
        if (result.isValid) {
          setTestResult(prev => ({
            ...prev,
            [provider]: { success: true, message: "密钥格式有效" }
          }))
        } else {
          setTestResult(prev => ({
            ...prev,
            [provider]: { success: false, message: result.error || "验证失败" }
          }))
        }
      }
    } catch (error) {
      setTestResult(prev => ({
        ...prev,
        [provider]: {
          success: false,
          message: error instanceof Error ? error.message : "连接失败"
        }
      }))
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }))
    }
  }

  const handleClear = (): void => {
    if (confirm("确定要清除所有 API 密钥吗？")) {
      localStorage.removeItem(STORAGE_KEY)
      setApiKeys({
        glm: "",
        openai: "",
        anthropic: "",
        openWeatherMap: "",
        googlePlaces: ""
      })
      setValidation({})
      setTestResult({})
    }
  }

  const llmProviders: Array<{ id: Exclude<LLMProvider, "proxy">; name: string; nameZh: string; description: string; icon: string }> = [
    {
      id: "glm",
      name: "GLM (智谱 AI)",
      nameZh: "智谱 GLM",
      description: "推荐使用 - 国内访问快速，支持中文",
      icon: "🇨🇳"
    },
    {
      id: "openai",
      name: "OpenAI (GPT)",
      nameZh: "OpenAI",
      description: "需要国际网络访问",
      icon: "🤖"
    },
    {
      id: "anthropic",
      name: "Anthropic (Claude)",
      nameZh: "Anthropic Claude",
      description: "需要国际网络访问",
      icon: "🧠"
    }
  ]

  const currentLLM = apiKeys.glm ? "glm" : apiKeys.openai ? "openai" : apiKeys.anthropic ? "anthropic" : null

  return (
    <div className={className}>
      <Card className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Key className="w-5 h-5" />
              API 密钥配置
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              配置您的 API 密钥以启用 AI 规划和外部数据功能
            </p>
          </div>
          <Badge variant={currentLLM ? "default" : "outline"}>
            {currentLLM ? "LLM 已配置" : "未配置 LLM"}
          </Badge>
        </div>

        {/* API Key Tabs */}
        <Tabs defaultValue="llm" className="w-full">
          {/* LLM Providers Tab */}
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="llm">AI 模型</TabsTrigger>
            <TabsTrigger value="weather">天气 API</TabsTrigger>
            <TabsTrigger value="places">地图 API</TabsTrigger>
            <TabsTrigger value="about">关于</TabsTrigger>
          </TabsList>

          {/* LLM Providers */}
          <TabsContent value="llm" className="space-y-4 mt-4">
            {llmProviders.map(provider => {
              const key = apiKeys[provider.id]
              const validationResult = validation[provider.id]
              const testingResult = testing[provider.id]
              const testResultForProvider = testResult[provider.id]

              return (
                <div key={provider.id} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <Label htmlFor={`${provider.id}-key`} className="text-base font-medium">
                          {provider.nameZh}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    {key && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={testingResult}
                      >
                        <TestTube className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id={`${provider.id}-key`}
                        type={visibility[provider.id] ? "text" : "password"}
                        placeholder={`输入 ${provider.name} API 密钥`}
                        value={key}
                        onChange={e => handleKeyChange(provider.id, e.target.value)}
                        className={validationResult?.isValid === false ? "border-destructive" : ""}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0"
                        onClick={() => toggleVisibility(provider.id)}
                      >
                        {visibility[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Validation Status */}
                    {key && validationResult && (
                      <div className="flex items-center gap-2 text-sm">
                        {validationResult.isValid ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                        <span className={validationResult.isValid ? "text-green-600" : "text-destructive"}>
                          {validationResult.isValid ? "密钥格式正确" : validationResult.error}
                        </span>
                      </div>
                    )}

                    {/* Test Result */}
                    {testResultForProvider && (
                      <div className={`flex items-center gap-2 text-sm ${
                        testResultForProvider.success ? "text-green-600" : "text-destructive"
                      }`}>
                        {testResultForProvider.success ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span>{testResultForProvider.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </TabsContent>

          {/* Weather API */}
          <TabsContent value="weather" className="space-y-4 mt-4">
            <div className="p-4 border rounded-lg">
              <Label htmlFor="openweathermap-key" className="text-base font-medium mb-2">
                OpenWeatherMap API
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (天气数据)
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                用于获取目的地天气信息。免费注册: https://openweathermap.org/api
              </p>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="openweathermap-key"
                    type={visibility.openWeatherMap ? "text" : "password"}
                    placeholder="输入 OpenWeatherMap API 密钥"
                    value={apiKeys.openWeatherMap}
                    onChange={e => handleKeyChange("openWeatherMap", e.target.value)}
                    className={validation.openWeatherMap?.isValid === false ? "border-destructive" : ""}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => toggleVisibility("openWeatherMap")}
                  >
                    {visibility.openWeatherMap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>

                {apiKeys.openWeatherMap && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection("openWeatherMap")}
                    disabled={testing.openWeatherMap}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing.openWeatherMap ? "测试中..." : "测试连接"}
                  </Button>
                )}

                {testResult.openWeatherMap && (
                  <div className={`flex items-center gap-2 text-sm ${
                    testResult.openWeatherMap.success ? "text-green-600" : "text-destructive"
                  }`}>
                    {testResult.openWeatherMap.success ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{testResult.openWeatherMap.message}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Places API */}
          <TabsContent value="places" className="space-y-4 mt-4">
            <div className="p-4 border rounded-lg">
              <Label htmlFor="googleplaces-key" className="text-base font-medium mb-2">
                Google Places API
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (景点、餐厅、酒店搜索)
                </span>
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                用于搜索景点、餐厅和酒店。需要启用 Maps JavaScript API: https://console.cloud.google.com
              </p>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="googleplaces-key"
                    type={visibility.googlePlaces ? "text" : "password"}
                    placeholder="输入 Google Places API 密钥"
                    value={apiKeys.googlePlaces}
                    onChange={e => handleKeyChange("googlePlaces", e.target.value)}
                    className={validation.googlePlaces?.isValid === false ? "border-destructive" : ""}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => toggleVisibility("googlePlaces")}
                  >
                    {visibility.googlePlaces ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>

                {apiKeys.googlePlaces && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection("googlePlaces")}
                    disabled={testing.googlePlaces}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    {testing.googlePlaces ? "测试中..." : "测试连接"}
                  </Button>
                )}

                {testResult.googlePlaces && (
                  <div className={`flex items-center gap-2 text-sm ${
                    testResult.googlePlaces.success ? "text-green-600" : "text-destructive"
                  }`}>
                    {testResult.googlePlaces.success ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{testResult.googlePlaces.message}</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* About */}
          <TabsContent value="about" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">关于 API 密钥</h3>
                <p className="text-sm text-muted-foreground space-y-1">
                  <p>• API 密钥仅存储在您的本地浏览器中，不会上传到服务器</p>
                  <p>• 请妥善保管您的 API 密钥，不要分享给他人</p>
                  <p>• 不同服务提供商有各自的免费配额和计费政策</p>
                </p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  获取 API 密钥
                </h3>
                <ul className="text-sm space-y-2">
                  <li>
                    <strong>智谱 AI (GLM):</strong>
                    <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener" className="text-primary hover:underline">
                      https://open.bigmodel.cn/
                    </a>
                  </li>
                  <li>
                    <strong>OpenAI:</strong>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-primary hover:underline">
                      https://platform.openai.com/api-keys
                    </a>
                  </li>
                  <li>
                    <strong>Anthropic:</strong>
                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener" className="text-primary hover:underline">
                      https://console.anthropic.com/
                    </a>
                  </li>
                  <li>
                    <strong>OpenWeatherMap:</strong>
                    <a href="https://openweathermap.org/api" target="_blank" rel="noopener" className="text-primary hover:underline">
                      https://openweathermap.org/api
                    </a>
                  </li>
                  <li>
                    <strong>Google Places:</strong>
                    <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="text-primary hover:underline">
                      https://console.cloud.google.com/
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button onClick={handleSave} className="flex-1">
            <Check className="w-4 h-4 mr-2" />
            保存配置
          </Button>
          <Button variant="outline" onClick={handleClear} className="flex-1 text-destructive hover:text-destructive">
            <X className="w-4 h-4 mr-2" />
            清除所有
          </Button>
        </div>

        {/* Global Save Result */}
        {testResult.save && (
          <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
            testResult.save.success ? "bg-green-50 text-green-700" : "bg-destructive/10 text-destructive"
          }`}>
            {testResult.save.success ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{testResult.save.message}</span>
          </div>
        )}
      </Card>
    </div>
  )
}
