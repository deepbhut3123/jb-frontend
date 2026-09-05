import Topbar from '../components/layout/Topbar.jsx';
import { authHighlights } from '../data/authHighlights.js';
import AuthPanel from '../features/auth/AuthPanel.jsx';

function AuthPage({ mode = 'login' }) {
  return (
    <main className="app-shell">
      <Topbar />

      <section className="auth-grid">
        <div className="hero-copy">
          <p className="eyebrow">JB Corporation · Internal CRM</p>
          <h1>One workspace.<br /><em>Every relationship.</em></h1>
          <p className="summary">
            Manage customer enquiries, product information, quotations, follow-ups,
            and team activity from one secure workspace built for JB Corporation.
          </p>

          <div className="hero-proof">
            <span className="proof-dot" aria-hidden="true" />
            <span>Secure access for the JB Corporation team</span>
          </div>

          <div className="highlight-grid">
            {authHighlights.map((item) => (
              <article className="highlight-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <AuthPanel key={mode} mode={mode} />
      </section>
    </main>
  );
}

export default AuthPage;
