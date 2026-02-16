import { UserDashboard } from "@/components/user/UserDashboard"
import { useNavigate } from "react-router-dom"

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl p-6">
        <UserDashboard
          onTripSelect={(destination, days) => {
            // Navigate to chat with trip context
            navigate("/", { state: { destination, days } })
          }}
        />
      </div>
    </div>
  )
}
