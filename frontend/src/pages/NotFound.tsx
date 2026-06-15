import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { AuthBrand, AuthBrandStatement } from '../components/ui/AuthBrand'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="auth-split">
      <AuthBrand>
        <AuthBrandStatement
          quote={
            <>
              Cette <em>page</em> ne figure pas dans votre récit.
            </>
          }
          eyebrowTitle="Erreur 404"
          eyebrowSub="Page introuvable"
        />
      </AuthBrand>

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
