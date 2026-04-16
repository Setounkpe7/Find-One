import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await useAuthStore.getState().login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants invalides')
    } finally {
      setLoading(false)
    }
  }

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
            Chaque candidature est une{' '}
            <em style={{ color: 'var(--terracotta-l)' }}>page</em> du livre que
            vous êtes en train d'écrire.
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
              Find-One
            </strong>
            Le compagnon de votre recherche d'emploi
          </div>
        </div>

        <div className="brand-footer">
          <span>© 2026 Find-One</span>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-form-inner">
          <div className="auth-eyebrow">Connexion</div>
          <h1 className="auth-title">
            Reprenons là où vous vous étiez <em>arrêté</em>.
          </h1>
          <p className="auth-sub">
            Connectez-vous pour retrouver vos candidatures, vos modèles et vos
            documents générés.
          </p>

          <form onSubmit={handleSubmit}>
            <Field label="Adresse e-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
            </Field>

            <Field
              label="Mot de passe"
              htmlFor="password"
              error={error ?? undefined}
            >
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="auth-switch">
            Nouveau sur Find-One ? <Link to="/register">Créer un compte</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
