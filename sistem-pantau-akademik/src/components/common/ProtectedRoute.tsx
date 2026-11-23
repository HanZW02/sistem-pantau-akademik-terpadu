import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession } from '../../services/authService'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = getSession()

  // Tidak ada session aktif → arahkan ke halaman login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
