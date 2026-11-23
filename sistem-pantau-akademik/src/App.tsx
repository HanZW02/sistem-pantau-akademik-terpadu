import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import TokenLoginPage from './pages/TokenLoginPage'
import { Dashboard } from './pages/Dashboard'
import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* Halaman login mahasiswa & admin: username + password */}
      <Route path="/login" element={<LoginPage />} />

      {/* Halaman login orang tua: token-based */}
      <Route path="/login/orang-tua" element={<TokenLoginPage />} />

      {/* Dashboard (dilindungi, hanya bisa diakses jika ada session) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Redirect semua URL tidak dikenal ke login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
