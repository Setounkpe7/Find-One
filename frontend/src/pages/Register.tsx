import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { authErrorMessage } from '../lib/authErrors'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Field } from '../components/ui/Field'

const RESEND_COOLDOWN_SECONDS = 60

type ResendState = 'idle' | 'sending' | 'sent' | 'error'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const mismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (mismatch) return
    setError(null)
    setLoading(true)
    try {
      const { needsEmailConfirmation } = await useAuthStore
        .getState()
        .register(email, password)
      if (needsEmailConfirmation) {
        setPendingEmail(email)
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(authErrorMessage(err, 'register'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split reversed">
      <div className="auth-form-side">
        <div className="auth-form-inner">
          {pendingEmail ? (
            <ConfirmEmailPanel
              email={pendingEmail}
              onReset={() => setPendingEmail(null)}
            />
          ) : (
            <>
              <div className="auth-eyebrow">Création de compte · gratuit</div>
              <h1 className="auth-title">
                Commencez votre <em>parcours</em>.
              </h1>
              <p className="auth-sub">
                Trois minutes pour créer votre compte. Ensuite, vos candidatures
                s'organisent toutes seules.
              </p>

              <form onSubmit={handleSubmit}>
                <Field label="Adresse e-mail" htmlFor="reg-email">
                  <Input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                  />
                </Field>

                <Field
                  label="Mot de passe"
                  htmlFor="reg-password"
                  hint="Au moins 8 caractères."
                >
                  <Input
                    id="reg-password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>

                <Field
                  label="Confirmer le mot de passe"
                  htmlFor="reg-confirm"
                  error={
                    mismatch
                      ? 'Les mots de passe ne correspondent pas.'
                      : error ?? undefined
                  }
                >
                  <Input
                    id="reg-confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>

                <Button
                  type="submit"
                  variant="primary"
                  className="auth-submit"
                  disabled={loading || mismatch}
                >
                  {loading ? 'Création…' : 'Créer mon compte'}
                </Button>
              </form>

              <div className="auth-switch">
                Déjà un compte ? <Link to="/login">Se connecter</Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="auth-brand">
        <div style={{ textAlign: 'right' }}>
          <div className="brand-logo">
            Find<span>·</span>One
          </div>
          <div className="brand-logo-sub">Votre parcours, votre récit</div>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--beige)',
              marginBottom: 32,
              maxWidth: 400,
            }}
          >
            Ce qui vous attend <em style={{ color: 'var(--terracotta-l)', fontStyle: 'italic' }}>à l'intérieur</em>.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
            {[
              ['I.', 'Un tableau de bord clair', 'Chaque offre, chaque étape, chaque échange — rassemblés au même endroit.'],
              ['II.', 'Des CV & lettres sur mesure', 'Claude rédige une lettre adaptée à chaque offre à partir de votre profil.'],
              ['III.', 'Une recherche sans bruit', 'Les offres qui vous ressemblent, sans celles qui vous font perdre du temps.'],
            ].map(([num, title, body]) => (
              <div key={num} style={{ display: 'flex', gap: 16 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 28,
                    fontStyle: 'italic',
                    color: 'var(--terracotta-l)',
                    minWidth: 44,
                  }}
                >
                  {num}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 17,
                      color: 'var(--beige)',
                      marginBottom: 4,
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--sand)', lineHeight: 1.55 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="brand-footer" style={{ justifyContent: 'flex-end' }}>
          <span>© 2026</span>
        </div>
      </div>
    </div>
  )
}

function resendLabel(state: ResendState, cooldown: number): string {
  if (state === 'sending') return 'Envoi…'
  if (cooldown > 0) return `Renvoyer l'email (${cooldown}s)`
  return "Renvoyer l'email"
}

interface ConfirmEmailPanelProps {
  email: string
  onReset: () => void
}

function ConfirmEmailPanel({ email, onReset }: ConfirmEmailPanelProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
  const [state, setState] = useState<ResendState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  const canResend = cooldown === 0 && state !== 'sending'

  async function handleResend() {
    if (!canResend) return
    setState('sending')
    setErrorMsg(null)
    try {
      await useAuthStore.getState().resendConfirmation(email)
      setState('sent')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Renvoi impossible')
    }
  }

  return (
    <div className="auth-confirm fade-up fade-up-1">
      <div className="auth-eyebrow">Presque terminé</div>
      <h1 className="auth-title">
        Un email vous <em>attend</em>.
      </h1>
      <p className="auth-sub">
        Nous avons envoyé un lien de confirmation à&nbsp;:
      </p>

      <div className="auth-confirm-email">{email}</div>

      <p className="auth-confirm-body">
        Ouvrez votre boîte de réception et cliquez sur le lien pour activer
        votre compte. Pensez à vérifier vos indésirables — certaines
        messageries prennent quelques minutes à livrer.
      </p>

      <div className="auth-confirm-actions">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={!canResend}
        >
          {resendLabel(state, cooldown)}
        </Button>
        {state === 'sent' && cooldown > 0 && (
          <span className="auth-resend-hint">Email renvoyé.</span>
        )}
        {state === 'error' && (
          <span className="auth-resend-hint auth-resend-hint-error">
            {errorMsg ?? 'Renvoi impossible'}
          </span>
        )}
      </div>

      <div className="auth-switch">
        Mauvaise adresse ?{' '}
        <button type="button" className="auth-link-button" onClick={onReset}>
          Recommencer
        </button>
        {' · '}
        <Link to="/login">Retour à la connexion</Link>
      </div>
    </div>
  )
}
