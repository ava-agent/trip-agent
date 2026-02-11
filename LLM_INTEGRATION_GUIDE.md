# LLM API Integration Guide

This guide explains how to use the LLM service integration in the Trip Agent MVP.

## Overview

The LLM service provides real API integration with multiple LLM providers for intelligent trip planning. It includes:

- **Multi-Provider Support**: GLM (智谱 AI), OpenAI, and Anthropic Claude APIs
- **Streaming Responses**: Real-time streaming of LLM outputs using Server-Sent Events
- **Error Handling**: Automatic retry with exponential backoff (max 3 retries)
- **Graceful Fallback**: Falls back to mock responses when API fails
- **Multi-Agent Architecture**: Each agent uses specialized prompts

## Provider Priority

The LLM service checks for API keys in the following order:

1. **GLM** (VITE_GLM_API_KEY) - Highest priority, recommended for Chinese users
2. **OpenAI** (VITE_OPENAI_API_KEY)
3. **Anthropic** (VITE_ANTHROPIC_API_KEY)

## Configuration

### 1. Set up API Key

Copy `.env.example` to `.env` and add your API key:

```bash
cp .env.example .env
```

**Option 1: GLM (Recommended for Chinese users)**
```env
VITE_GLM_API_KEY=your-glm-api-key-here
```

Get your API key from: https://open.bigmodel.cn/usercenter/apikeys

**Option 2: OpenAI**
```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Option 3: Anthropic Claude**
```env
VITE_ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

### 2. Custom Configuration

You can also configure the service programmatically:

```typescript
import { LLMService } from '@/services/llmService'

LLMService.initialize({
  provider: 'openai',
  apiKey: 'your-api-key',
  model: 'gpt-4o-mini',
  maxTokens: 4000,
  temperature: 0.7,
})
```

### 3. Check if LLM is Available

```typescript
import { isLLMAvailable } from '@/services/multiAgentService'

if (isLLMAvailable()) {
  // LLM integration is active
} else {
  // Using mock responses
}
```

## Usage Examples

### Basic Chat Completion

```typescript
import { LLMService } from '@/services/llmService'

const messages = [
  { role: 'system', content: 'You are a helpful travel assistant.' },
  { role: 'user', content: 'What are the top attractions in Tokyo?' }
]

const response = await LLMService.chatCompletion(messages)
console.log(response)
```

### Streaming Chat Completion

```typescript
import { LLMService } from '@/services/llmService'

const messages = [
  { role: 'system', content: PROMPTS.PLANNER },
  { role: 'user', content: 'Plan a 5-day trip to Paris' }
]

for await (const chunk of LLMService.streamChat(messages)) {
  if (!chunk.done) {
    console.log(chunk.content) // Stream each chunk
  }
}
```

### Using with Multi-Agent Service

The multi-agent service automatically uses LLM when configured:

```typescript
import { MultiAgentService } from '@/services/multiAgentService'

const context = {
  userMessage: '我想去东京旅行5天',
  conversationHistory: [],
  userPreferences: {
    interests: ['观光', '美食'],
    accommodationType: ['mid-range'],
    transportationPreference: ['public'],
  }
}

// Process through agents (will use LLM if available)
for await (const result of MultiAgentService.processWithAgents(context)) {
  console.log(`[${result.message.agent}] ${result.message.content}`)
}
```

## Prompt Templates

The service includes pre-configured prompts for each agent:

- **PROMPTS.SUPERVISOR**: Intent recognition and task distribution
- **PROMPTS.PLANNER**: Itinerary generation
- **PROMPTS.RECOMMENDER**: Personalized suggestions
- **PROMPTS.BOOKING**: Price comparison and booking advice
- **PROMPTS.DOCUMENT**: Itinerary formatting

```typescript
import { PROMPTS } from '@/services/llmService'

const messages = [
  { role: 'system', content: PROMPTS.PLANNER },
  { role: 'user', content: 'Create a 3-day itinerary for Rome' }
]
```

## Error Handling

The service includes comprehensive error handling with automatic retry:

```typescript
try {
  const response = await LLMService.chatCompletion(messages)
} catch (error) {
  if (error instanceof LLMAPIError) {
    console.error(`LLM Error (${error.code}): ${error.message}`)
    if (error.retryable) {
      // The service already retried, but you could add custom logic
    }
  }
}
```

### Error Types

- **rate_limit**: API rate limit exceeded (retryable)
- **auth**: Invalid API key (not retryable)
- **network**: Network error (retryable)
- **server**: API server error (retryable)
- **context_length**: Request too large (not retryable)
- **unknown**: Other errors (not retryable)

## Fallback Behavior

When LLM is not configured or API calls fail, the system automatically falls back to mock responses. This ensures the application remains functional even without API access.

The multi-agent service handles this seamlessly:

1. Try LLM API first (if configured)
2. On error, fall back to mock responses
3. User sees a warning message but can continue using the app

## Best Practices

1. **API Key Security**: Never commit API keys to version control
2. **Rate Limiting**: The service includes rate limiting, but be mindful of API quotas
3. **Cost Management**: Use `gpt-4o-mini` for development to reduce costs
4. **Error Logging**: Monitor API errors to identify configuration issues
5. **Fallback Testing**: Test your app with and without LLM enabled

## Troubleshooting

### LLM Not Working

1. Check if API key is set in `.env`
2. Verify the key has proper permissions
3. Check browser console for error messages
4. Try using the `isLLMAvailable()` function to debug

### Rate Limit Errors

If you hit rate limits:
- Reduce the frequency of requests
- Consider upgrading your API plan
- Use streaming responses for better user experience

### CORS Issues

If you encounter CORS errors:
- For browser-based apps, use a proxy server
- Consider using a backend API route
- Some APIs have CORS restrictions

## Development Tips

### Toggle LLM Integration

You can programmatically enable/disable LLM:

```typescript
import { setLLMEnabled } from '@/services/multiAgentService'

// Disable LLM for testing
setLLMEnabled(false)

// Re-enable LLM
setLLMEnabled(true)
```

### Mock Mode

To test without using API quota:
1. Don't set any API key
2. The system will automatically use mock responses

### Debug Mode

Set `VITE_DEBUG=true` in your `.env` file to see detailed logs.

## API Reference

See `src/services/llmService.ts` for complete API documentation.

### Classes

- **LLMService**: Main service class for LLM operations
- **LLMAPIError**: Custom error class for LLM-specific errors

### Functions

- `initializeLLMFromEnv()`: Initialize from environment variables
- `isLLMAvailable()`: Check if LLM is configured
- `setLLMEnabled()`: Enable/disable LLM integration

## License

This integration is part of the Trip Agent MVP project.
