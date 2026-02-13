import { MainLayout } from "@/components/layout/MainLayout"
import { ChatWindow } from "@/components/chat/ChatWindow"
import { ErrorBoundary } from "@/components/common"

function App() {
  return (
    <ErrorBoundary>
      <MainLayout>
        <ChatWindow />
      </MainLayout>
    </ErrorBoundary>
  )
}

export default App
