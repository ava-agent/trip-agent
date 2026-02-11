# GLM-4.7 API Integration Guide

智谱 AI GLM-4.7 API 集成指南

## Overview

The GLM service provides real API integration with Zhipu AI (智谱 AI) GLM-4.7 models for intelligent trip planning. It includes:

- **GLM Model Support**: glm-4-flash, glm-4-plus, glm-4-air, glm-4, glm-3-turbo
- **Streaming Responses**: Real-time streaming of LLM outputs using Server-Sent Events
- **Error Handling**: Automatic retry with exponential backoff (max 3 retries)
- **Graceful Fallback**: Falls back to mock responses when API fails
- **Multi-Agent Architecture**: Each agent uses specialized prompts optimized for GLM

## Configuration

### 1. Set up API Key

Copy `.env.example` to `.env` and add your GLM API key:

```bash
cp .env.example .env
```

For GLM (recommended for Chinese users):
```env
VITE_GLM_API_KEY=your-glm-api-key-here
```

Get your API key from: https://open.bigmodel.cn/usercenter/apikeys

### 2. Custom Configuration

You can also configure the service programmatically:

```typescript
import { GLMService } from '@/services/glmService'

GLMService.initialize({
  apiKey: 'your-api-key',
  model: 'glm-4-flash',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  maxTokens: 4000,
  temperature: 0.7,
  topP: 0.9,
})
```

### 3. Environment Variables

Available environment variables for GLM configuration:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GLM_API_KEY` | Your GLM API key | Required |
| `VITE_GLM_MODEL` | Model name | `glm-4-flash` |
| `VITE_GLM_BASE_URL` | API base URL | `https://open.bigmodel.cn/api/paas/v4` |
| `VITE_GLM_MAX_TOKENS` | Maximum tokens | `4000` |
| `VITE_GLM_TEMPERATURE` | Temperature (0-1) | `0.7` |
| `VITE_GLM_TOP_P` | Top P sampling (0-1) | `0.9` |

## Available Models

| Model | Description | Use Case |
|-------|-------------|----------|
| `glm-4-flash` | Fast response | Real-time chat, quick responses |
| `glm-4-plus` | Advanced reasoning | Complex planning, detailed analysis |
| `glm-4-air` | Lightweight | Basic tasks, cost-effective |
| `glm-4` | Standard version | General purpose |
| `glm-3-turbo` | Previous generation | Legacy compatibility |

## Usage Examples

### Basic Chat Completion

```typescript
import { GLMService } from '@/services/glmService'

const messages = [
  { role: 'system', content: '你是一个专业的旅行规划助手。' },
  { role: 'user', content: '东京有哪些热门景点？' }
]

const response = await GLMService.chatCompletion(messages)
console.log(response)
```

### Streaming Chat Completion

```typescript
import { GLMService } from '@/services/glmService'

const messages = [
  { role: 'system', content: GLM_PROMPTS.PLANNER },
  { role: 'user', content: '请为巴黎规划一个5天的旅行行程' }
]

let fullResponse = ''
for await (const chunk of GLMService.streamChat(messages, (content) => {
  console.log('Stream chunk:', content)
})) {
  if (!chunk.done) {
    fullResponse += chunk.content
    console.log('Current response:', fullResponse)
  }
}

console.log('Final response:', fullResponse)
```

### Using with Multi-Agent Service

The multi-agent service automatically uses GLM when configured (GLM is the highest priority provider):

```typescript
import { MultiAgentService, isLLMAvailable, getLLMProvider } from '@/services/multiAgentService'

// Check LLM status
console.log('LLM Available:', isLLMAvailable())
console.log('Provider:', getLLMProvider()) // Returns "glm" if GLM API key is set

const context = {
  userMessage: '我想去东京旅行5天',
  conversationHistory: [],
  userPreferences: {
    interests: ['观光', '美食'],
    accommodationType: ['mid-range'],
    transportationPreference: ['public'],
  }
}

// Process through agents (will use GLM if available)
for await (const result of MultiAgentService.processWithAgents(context)) {
  console.log(`[${result.message.agent}] ${result.message.content}`)
}
```

## Prompt Templates

The service includes pre-configured Chinese prompts optimized for GLM:

- **GLM_PROMPTS.SUPERVISOR**: Intent recognition and task distribution
- **GLM_PROMPTS.PLANNER**: Itinerary generation
- **GLM_PROMPTS.RECOMMENDER**: Personalized suggestions
- **GLM_PROMPTS.BOOKING**: Price comparison and booking advice
- **GLM_PROMPTS.DOCUMENT**: Itinerary formatting

```typescript
import { GLM_PROMPTS } from '@/services/glmService'

const messages = [
  { role: 'system', content: GLM_PROMPTS.PLANNER },
  { role: 'user', content: '请为罗马规划一个3天的旅行行程' }
]
```

## Error Handling

The service includes comprehensive error handling with automatic retry:

```typescript
import { GLMService, GLMAPIError } from '@/services/glmService'

try {
  const response = await GLMService.chatCompletion(messages)
} catch (error) {
  if (error instanceof GLMAPIError) {
    console.error(`GLM Error (${error.code}): ${error.message}`)
    if (error.retryable) {
      // The service already retried 3 times
      console.log('This was a retryable error')
    }
  }
}
```

### Error Types

| Code | Description | Retryable |
|------|-------------|-----------|
| `rate_limit` | API rate limit exceeded | Yes |
| `auth` | Invalid API key | No |
| `network` | Network error | Yes |
| `server` | API server error | Yes |
| `context_length` | Request too large | No |
| `quota` | API quota exceeded | No |
| `invalid_model` | Invalid model name | No |
| `unknown` | Other errors | No |

## Fallback Behavior

When GLM is not configured or API calls fail, the system automatically falls back to mock responses. This ensures the application remains functional even without API access.

The multi-agent service handles this seamlessly:

1. Try GLM API first (if configured)
2. On error, fall back to mock responses with a warning message
3. User sees a warning but can continue using the app

## Provider Priority

The LLM service checks for API keys in the following order:

1. **GLM** (VITE_GLM_API_KEY) - Highest priority
2. **OpenAI** (VITE_OPENAI_API_KEY)
3. **Anthropic** (VITE_ANTHROPIC_API_KEY)

If multiple API keys are set, GLM will be used as the primary provider.

## Best Practices

1. **API Key Security**: Never commit API keys to version control
2. **Rate Limiting**: GLM has rate limits, implement proper throttling
3. **Cost Management**: Use `glm-4-flash` for development to reduce costs
4. **Error Logging**: Monitor API errors to identify configuration issues
5. **Fallback Testing**: Test your app with and without GLM enabled

## Troubleshooting

### GLM Not Working

1. Check if API key is set in `.env`
2. Verify the key has proper permissions at https://open.bigmodel.cn
3. Check browser console for error messages
4. Try using the `isLLMAvailable()` function to debug

### Rate Limit Errors

If you hit rate limits:
- Reduce the frequency of requests
- Check your GLM account quota
- Consider upgrading your API plan
- Use streaming responses for better user experience

### API Key Issues

Common API key problems:
- Make sure you're using the correct API key format
- Check that the key is active and not expired
- Verify the key has API access permissions

## Development Tips

### Toggle GLM Integration

You can programmatically check the provider:

```typescript
import { getLLMProvider, getLLMProviderName } from '@/services/multiAgentService'

const provider = getLLMProvider()
console.log('Current provider:', provider) // 'glm', 'openai', 'anthropic', or null
console.log('Provider name:', getLLMProviderName()) // '智谱 GLM', 'OpenAI', etc.
```

### Mock Mode

To test without using API quota:
1. Don't set any API key
2. The system will automatically use mock responses

### Debug Mode

Set `VITE_DEBUG=true` in your `.env` file to see detailed logs.

## API Reference

See `src/services/glmService.ts` for complete API documentation.

### Classes

- **GLMService**: Main service class for GLM operations
- **GLMAPIError**: Custom error class for GLM-specific errors

### Functions

- `initializeGLMFromEnv()`: Initialize from environment variables
- `loadGLMConfigFromEnv()`: Load config from environment
- `createMockResponse()`: Generate mock response for fallback
- `GLMService.getAvailableModels()`: Get list of available models

### Utility Functions

```typescript
// Check configuration status
GLMService.isConfigured()

// Get current configuration
GLMService.getConfig()

// Get available models
GLMService.getAvailableModels()

// Reset configuration (for testing)
GLMService.reset()
```

## License

This integration is part of the Trip Agent MVP project.

## Links

- GLM API Documentation: https://open.bigmodel.cn/dev/api
- GLM Platform: https://open.bigmodel.cn/
- API Key Management: https://open.bigmodel.cn/usercenter/apikeys
