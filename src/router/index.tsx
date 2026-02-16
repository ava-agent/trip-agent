import { createBrowserRouter, Outlet } from "react-router-dom"
import { MainLayout } from "@/components/layout/MainLayout"
import { ChatWindow } from "@/components/chat/ChatWindow"

// Lazy load less critical pages
import { lazy, Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

const TripDetailPage = lazy(() => import("@/pages/TripDetailPage"))
const SettingsPage = lazy(() => import("@/pages/SettingsPage"))
const DashboardPage = lazy(() => import("@/pages/DashboardPage"))

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

function SuspenseWrapper() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        element: <SuspenseWrapper />,
        children: [
          { index: true, element: <ChatWindow /> },
          { path: "trip/:id", element: <TripDetailPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "dashboard", element: <DashboardPage /> },
        ],
      },
    ],
  },
])
