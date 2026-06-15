import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="auth-split">
      <div className="auth-brand">
        <div>
          <div className="brand-logo">
            Find<span>·</span>One
          </div>
          <div className="brand-logo-sub">Votre parcours, votre récit</div>
        </div>

        <div style={{ maxWidth: 440 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: 34,
              lineHeight: 1.25,
              color: 'var(--beige)',
              marginBottom: 24,
            }}
          >
            Cette <em style={{ color: 'var(--terracotta-l)' }}>page</em> ne
            figure pas dans votre récit.
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--sand)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            <strong
              style={{
                color: 'var(--beige)',
                display: 'block',
                marginBottom: 4,
                textTransform: 'none',
                fontSize: 14,
              }}
            >
              Erreur 404
            </strong>
            Page introuvable
          </div>
        </div>

        <div className="brand-footer">
          <span>© 2026 Find-One</span>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-eyebrow">Page introuvable</div>
          <h1 className="auth-title">
            On dirait que vous vous êtes <em>égaré</em>.
          </h1>
          <p className="auth-sub">
            Le lien que vous avez suivi est peut-être périmé, ou l'adresse
            comporte une faute de frappe. Revenons en terrain connu.
          </p>

          <div className="row gap-2 center" style={{ marginTop: 8 }}>
            <Link to="/">
              <Button type="button" variant="primary">
                Retour à l'accueil
              </Button>
            </Link>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Page précédente
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
