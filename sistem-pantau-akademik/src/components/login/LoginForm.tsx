import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type Role = 'mahasiswa' | 'orang_tua' | 'admin'

const ROLES: {
  value: Role
  label: string
  note: string
  path: string
}[] = [
    {
      value: 'mahasiswa',
      label: 'Mahasiswa',
      note: 'Lihat jadwal, nilai, dan atur siapa saja yang boleh memantau Anda.',
      path: '/dashboard',
    },
    {
      value: 'orang_tua',
      label: 'Orang tua',
      note: 'Pantau perkembangan anak setelah ia menautkan akunnya dengan Anda.',
      path: '/dashboard',
    },
    {
      value: 'admin',
      label: 'Admin kampus',
      note: 'Kelola data mahasiswa, nilai, dan akun orang tua.',
      path: '/dashboard',
    },
  ]

function translateError(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return 'Email atau kata sandi tidak cocok. Periksa kembali, atau atur ulang kata sandi.'
  }
  if (m.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Buka kotak masuk Anda dan klik tautan konfirmasi.'
  }
  return 'Gagal masuk. Coba lagi beberapa saat lagi.'
}

export default function LoginForm() {
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('mahasiswa')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = ROLES.find((r) => r.value === role)!

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data.user) {
      setError(translateError(signInError?.message ?? ''))
      setLoading(false)
      return
    }

    // Peran disimpan di tabel public.profiles (kolom: id, role)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (!profile || profile.role !== role) {
      await supabase.auth.signOut()
      setError(
        `Akun ini tidak terdaftar sebagai ${active.label.toLowerCase()}. Pilih peran yang sesuai di atas.`
      )
      setLoading(false)
      return
    }

    navigate(active.path, { replace: true })
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h2>Masuk ke SIPADU</h2>

      <fieldset className="roles">
        <legend>Anda masuk sebagai</legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className={`role ${role === r.value ? 'role--on' : ''}`}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => setRole(r.value)}
            />
            <span className="role__dot" aria-hidden="true" />
            <span className="role__text">
              <span className="role__label">{r.label}</span>
              <span className="role__note">{r.note}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="field__row">
          <label htmlFor="password">Kata sandi</label>
          <Link to="/lupa-sandi" className="link">
            Lupa kata sandi?
          </Link>
        </div>
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

      <p className="error" role="alert" aria-live="polite">
        {error}
      </p>

      <div className="actions">
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
        {role === 'orang_tua' ? (
          <Link to="/daftar" className="btn btn--secondary">
            Daftar dengan kode dari anak
          </Link>
        ) : (
          <Link to="/bantuan" className="btn btn--secondary">
            Butuh bantuan akun
          </Link>
        )}
      </div>
    </form>
  )
}