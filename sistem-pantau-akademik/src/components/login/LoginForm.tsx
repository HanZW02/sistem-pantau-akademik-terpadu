import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithPassword } from '../../services/authService'

export default function LoginForm() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await loginWithPassword(username, password)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h2>Masuk ke SIPADU</h2>

      <div className="field">
        <label htmlFor="username">Username / NIM</label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          required
          placeholder="Contoh: admin atau 1251420108"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="field__row">
          <label htmlFor="password">Kata sandi</label>
        </div>
        <div className="field__password">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
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

      {error && (
        <p className="error" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
        <Link to="/login/orang-tua" className="btn btn--secondary">
          Masuk sebagai Orang Tua (dengan token)
        </Link>
      </div>
    </form>
  )
}
