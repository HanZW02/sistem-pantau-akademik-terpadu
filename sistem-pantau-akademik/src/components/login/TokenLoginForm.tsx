import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithToken } from '../../services/authService'

export default function TokenLoginForm() {
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await loginWithToken(token)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h2>Masuk sebagai Orang Tua</h2>
      <p style={{ margin: '0 0 28px', color: 'var(--muted)', fontSize: '0.9375rem' }}>
        Masukkan token akses yang sudah diberikan oleh pihak akademik atau mahasiswa yang bersangkutan.
      </p>

      <div className="field">
        <label htmlFor="token">Token Akses</label>
        <input
          id="token"
          type="text"
          required
          placeholder="Contoh: TOKEN-PARENT-RASYA-2026-..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={{ fontFamily: 'monospace', letterSpacing: '0.03em' }}
        />
      </div>

      {error && (
        <p className="error" role="alert" aria-live="polite">
          {error}
        </p>
      )}

      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Memverifikasi token…' : 'Akses Dashboard'}
        </button>
        <Link to="/login" className="btn btn--secondary">
          ← Kembali ke halaman login
        </Link>
      </div>
    </form>
  )
}
