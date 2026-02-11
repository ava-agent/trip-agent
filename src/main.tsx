import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { initializeLLMFromEnv } from './services/llmService'

// 初始化 LLM 服务
const llmInitialized = initializeLLMFromEnv()
if (llmInitialized) {
  console.log('[Main] LLM 服务初始化成功')
} else {
  console.warn('[Main] LLM 服务未配置，某些功能可能受限')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
