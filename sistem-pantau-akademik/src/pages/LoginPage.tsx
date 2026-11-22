import LoginForm from '../components/login/LoginForm'

export default function LoginPage() {
  return (
    <main className="login">
      <section className="login__brand">
        <p className="wordmark">SIPADU<br />
          SISTEM LAYANAN TERPADU
        </p>
        <div>
          <h1>Orang tua tidak perlu menunggu rapor untuk tahu.</h1>
          <p className="login__lede">
            Nilai, kehadiran, dan tagihan semester anak Anda terlihat di satu
            tempat, begitu dosen dan bagian akademik memperbaruinya.
          </p>
        </div>
      </section>

      <section className="login__panel">
        <LoginForm />
      </section>
    </main>
  )
}