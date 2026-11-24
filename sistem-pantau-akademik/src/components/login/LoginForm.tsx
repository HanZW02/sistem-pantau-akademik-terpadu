import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithPassword, loginWithToken } from '../../services/authService'

export default function LoginForm() {
  const navigate = useNavigate()

  const [identity, setIdentity] = useState('') // NIM, username, atau token
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Token orang tua berbentuk TOKEN-PARENT-... dan tidak memakai kata sandi
  const isToken = /^token-/i.test(identity.trim())

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = isToken
      ? await loginWithToken(identity)
      : await loginWithPassword(identity, password)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Dashboard membaca role dari sesi dan menampilkan tampilan yang sesuai
    navigate('/dashboard', { replace: true })
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h2>Masuk ke SIPADU</h2>

      <div className="field">
        <label htmlFor="identity">NIM, username, atau token</label>
        <input
          id="identity"
          type="text"
          autoComplete="username"
          autoFocus
          required
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
        />
        {isToken && (
          <p className="hint">Token orang tua terdeteksi. Kata sandi tidak diperlukan.</p>
        )}
      </div>

      {!isToken && (
        <div className="field">
          <label htmlFor="password">Kata sandi</label>
          <div className="field__password">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="link"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>
      )}

      <p className="error" role="alert" aria-live="polite">
        {error}
      </p>

      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
        >
          Butuh bantuan akun
        </button>
      </div>

      {showHelp && (
        <p className="help">
          Mahasiswa masuk dengan NIM, admin dengan username. Orang tua memakai
          token dari admin fakultas. Kalau lupa kata sandi atau token hilang,
          hubungi admin fakultas.
        </p>
      )}
    </form>
  )
}