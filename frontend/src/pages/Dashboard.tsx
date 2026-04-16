import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { JobCardPT } from '../components/JobCardPT'
import { JobForm } from '../components/JobForm'
import type { JobOffer } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--espresso)', marginTop: 8 }}>
        {value}
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const [offers, setOffers] = useState<JobOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/jobs')
      setOffers(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const stats = {
    total: offers.length,
    interviews: offers.filter((o) => o.status === 'interview_scheduled').length,
    offers: offers.filter((o) => o.status === 'offer_received').length,
  }

  return (
    <>
      <PageHeader
        title={
          <>
            Bonjour <em>Martin</em>
          </>
        }
        subtitle={`${stats.total} candidature${stats.total > 1 ? 's' : ''} en cours`}
        actions={
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Ajouter une offre
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Entretiens" value={stats.interviews} />
        <Stat label="Offres" value={stats.offers} />
      </div>

      <div className="section-header">
        <div className="section-title">Candidatures récentes</div>
      </div>

      {loading && <Card>Chargement…</Card>}
      {error && <Card><div className="field-error">{error}</div></Card>}

      {!loading && !error && offers.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--ink-soft)' }}>
            Aucune candidature pour l'instant. Ajoutez votre première offre ou cherchez-en une via la recherche.
          </div>
        </Card>
      )}

      {!loading && !error && offers.length > 0 && (
        <div className="job-list">
          {offers.map((o) => (
            <JobCardPT key={o.id} offer={o} />
          ))}
        </div>
      )}

      {showForm && (
        <JobForm
          onSave={(newOffer) => {
            setOffers((prev) => [newOffer, ...prev])
            setShowForm(false)
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  )
}
