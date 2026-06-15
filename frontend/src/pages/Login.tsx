import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authErrorMessage } from '../lib/authErrors'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'
import { AuthBrand, AuthBrandStatement } from '../components/ui/AuthBrand'

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
      setError(authErrorMessage(err, 'login'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      <AuthBrand>
        <AuthBrandStatement
          quote={
            <>
              Chaque candidature est une{' '}
              <em>page</em> du livre que vous êtes en train d'écrire.
            </>
          }
          eyebrowTitle="Find-One"
          eyebrowSub="Le compagnon de votre recherche d'emploi"
        />
      </AuthBrand>

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
