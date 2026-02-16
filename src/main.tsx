import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { initializeLLMFromEnv } from './services/llmService'

// Initialize LLM service
const llmInitialized = initializeLLMFromEnv()
if (import.meta.env.DEV) {
  if (llmInitialized) {
    console.log('[Main] LLM 服务初始化成功')
  } else {
    console.warn('[Main] LLM 服务未配置，某些功能可能受限')
  }
}

createRoot(document.getElementById('root')!).render(<App />)
