import { isAuthError } from '@supabase/supabase-js'

const NETWORK_MESSAGE =
  'Service momentanément indisponible. Vérifiez votre connexion et réessayez.'

/**
 * Maps an auth failure to a French, user-facing message.
 *
 * Distinguishes real credential/validation errors from transport failures so a
 * user is never wrongly told their credentials are invalid during an outage
 * (a network failure surfaces as a `TypeError: Failed to fetch`, not an
 * `AuthError`).
 */
export function authErrorMessage(
  err: unknown,
  context: 'login' | 'register',
): string {
  // Network / server unreachable: fetch rejects with a TypeError.
  if (err instanceof TypeError) return NETWORK_MESSAGE

  if (isAuthError(err)) {
    switch (err.code) {
      case 'invalid_credentials':
        return 'Identifiants invalides'
      case 'email_not_confirmed':
        return "Votre adresse e-mail n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail avant de vous connecter."
      case 'user_already_exists':
      case 'email_exists':
        return 'Un compte existe déjà avec cette adresse e-mail.'
      case 'weak_password':
        return 'Mot de passe trop faible : utilisez au moins 8 caractères.'
      case 'over_email_send_rate_limit':
        return 'Trop de demandes. Patientez une minute avant de réessayer.'
    }
    if (err.status === 429)
      return 'Trop de tentatives. Patientez un instant avant de réessayer.'
    if (err.status != null && err.status >= 500) return NETWORK_MESSAGE
    if (context === 'login' && err.status === 400) return 'Identifiants invalides'
  }

  return context === 'login'
    ? 'Une erreur est survenue. Réessayez dans quelques instants.'
    : 'Inscription impossible. Réessayez dans quelques instants.'
}
