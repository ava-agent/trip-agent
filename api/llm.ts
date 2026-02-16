/**
 * Vercel Edge Function: LLM API Proxy
 * Proxies LLM requests to GLM/OpenAI/Anthropic with server-side API keys
 */

export const config = {
  runtime: "edge",
}

type Provider = "glm" | "openai" | "anthropic"

interface ChatRequest {
  messages: Array<{ role: string; content: string }>
  provider?: Provider
  model?: string
  stream?: boolean
  maxTokens?: number
  temperature?: number
}

function getProviderConfig(provider: Provider) {
  switch (provider) {
    case "glm":
      return {
        apiKey: process.env.GLM_API_KEY || "",
        baseURL: "https://open.bigmodel.cn/api/paas/v4",
        defaultModel: "glm-4-flash",
        authHeader: (key: string) => ({ Authorization: `Bearer ${key}` }),
      }
    case "openai":
      return {
        apiKey: process.env.OPENAI_API_KEY || "",
        baseURL: "https://api.openai.com/v1",
        defaultModel: "gpt-4o-mini",
        authHeader: (key: string) => ({ Authorization: `Bearer ${key}` }),
      }
    case "anthropic":
      return {
        apiKey: process.env.ANTHROPIC_API_KEY || "",
        baseURL: "https://api.anthropic.com",
        defaultModel: "claude-3-5-sonnet-20241022",
        authHeader: (key: string) => ({
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        }),
      }
  }
}

function detectProvider(): Provider | null {
  if (process.env.GLM_API_KEY) return "glm"
  if (process.env.OPENAI_API_KEY) return "openai"
  if (process.env.ANTHROPIC_API_KEY) return "anthropic"
  return null
}

async function handleAnthropicRequest(
  config: ReturnType<typeof getProviderConfig>,
  messages: ChatRequest["messages"],
  model: string,
  stream: boolean,
  maxTokens: number,
  temperature: number
) {
  const systemMessage = messages.find((m) => m.role === "system")?.content || ""
  const chatMessages = messages.filter((m) => m.role !== "system")

  return fetch(`${config.baseURL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.authHeader(config.apiKey),
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage,
      messages: chatMessages,
      stream,
    }),
  })
}

async function handleOpenAIStyleRequest(
  config: ReturnType<typeof getProviderConfig>,
  messages: ChatRequest["messages"],
  model: string,
  stream: boolean,
  maxTokens: number,
  temperature: number
) {
  return fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.authHeader(config.apiKey),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream,
    }),
  })
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    })
  }

  try {
    const body = (await request.json()) as ChatRequest
    const { messages, model, maxTokens = 4000, temperature = 0.7 } = body
    const stream = body.stream !== false // default to streaming

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages is required" }), {
        status: 400,
      })
    }

    // Determine provider
    const provider = body.provider || detectProvider()
    if (!provider) {
      return new Response(
        JSON.stringify({ error: "No LLM API key configured on server" }),
        { status: 500 }
      )
    }

    const providerConfig = getProviderConfig(provider)
    if (!providerConfig.apiKey) {
      return new Response(
        JSON.stringify({ error: `API key not configured for provider: ${provider}` }),
        { status: 500 }
      )
    }

    const finalModel = model || providerConfig.defaultModel

    // Call the actual LLM API
    let response: Response

    if (provider === "anthropic") {
      response = await handleAnthropicRequest(
        providerConfig, messages, finalModel, stream, maxTokens, temperature
      )
    } else {
      response = await handleOpenAIStyleRequest(
        providerConfig, messages, finalModel, stream, maxTokens, temperature
      )
    }

    if (!response.ok) {
      const errorData = await response.text()
      return new Response(
        JSON.stringify({ error: `LLM API error: ${response.status}`, details: errorData }),
        { status: response.status }
      )
    }

    if (stream && response.body) {
      // Pass through the streaming response
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    // Non-streaming: parse and return
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), { status: 500 })
  }
}
