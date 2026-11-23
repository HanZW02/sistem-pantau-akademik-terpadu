import TokenLoginForm from '../components/login/TokenLoginForm'

export default function TokenLoginPage() {
  return (
    <main className="login">
      <section className="login__brand">
        <p className="wordmark">SIPADU<br />SISTEM LAYANAN TERPADU</p>
        <div>
          <h1>Pantau perkembangan anak Anda kapan saja.</h1>
          <p className="login__lede">
            Dengan token akses yang diberikan, Anda dapat melihat nilai, kehadiran,
            dan status pembayaran UKT anak Anda secara langsung.
          </p>
        </div>
      </section>

      <section className="login__panel">
        <TokenLoginForm />
      </section>
    </main>
  )
}
