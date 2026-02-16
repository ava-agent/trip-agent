import { RouterProvider } from "react-router-dom"
import { ErrorBoundary } from "@/components/common"
import { Toaster } from "sonner"
import { router } from "@/router"

function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3000,
          className: "text-sm",
        }}
      />
    </ErrorBoundary>
  )
}

export default App
