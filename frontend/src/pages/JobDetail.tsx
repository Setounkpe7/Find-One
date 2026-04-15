import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { JobForm } from '../components/JobForm'
import { DocViewer } from '../components/DocViewer'
import type { Template } from '../components/DocViewer'
import type { JobOffer } from '../lib/types'
import { STATUS_LABELS } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge, BadgeVariant } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'

function statusToVariant(status: string): BadgeVariant {
  switch (status) {
    case 'saved':
      return 'saved'
    case 'applied':
      return 'applied'
    case 'interview_scheduled':
      return 'interview'
    case 'offer_received':
      return 'offer'
    case 'rejected':
      return 'rejected'
    case 'withdrawn':
    default:
      return 'pending'
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row center" style={{ padding: '8px 0', borderBottom: '1px dashed var(--sand-l)' }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
          width: 160,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [offer, setOffer] = useState<JobOffer | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    Promise.all([
      apiFetch(`/api/jobs/${id}`).then((r) => r.json()),
      apiFetch('/api/templates').then((r) => r.json()),
    ])
      .then(([o, t]) => {
        if (cancelled) return
        setOffer(o)
        setTemplates(t)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Chargement impossible'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleDelete() {
    if (!offer || !confirm('Supprimer cette candidature ?')) return
    setDeleting(true)
    try {
      await apiFetch(`/api/jobs/${offer.id}`, { method: 'DELETE' })
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
      setDeleting(false)
    }
  }

  if (loading) return <Card>Chargement…</Card>
  if (error) return <Card><div className="field-error">{error}</div></Card>
  if (!offer) return <Card>Offre introuvable.</Card>

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <Link to="/" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          ← Retour au tableau de bord
        </Link>
      </div>

      <PageHeader
        eyebrow={offer.company}
        title={offer.title}
        subtitle={[offer.location, offer.contract_type, offer.salary].filter(Boolean).join(' · ')}
        actions={
          <>
            <Badge variant={statusToVariant(offer.status)}>
              {STATUS_LABELS[offer.status] ?? offer.status}
            </Badge>
            <Button size="sm" variant="ghost" onClick={() => setShowEdit(true)}>
              Modifier
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <Card>
          <div className="section-header">
            <div className="section-title">Informations</div>
          </div>

          <div className="stack" style={{ fontSize: 13 }}>
            {offer.url && (
              <Row label="URL">
                <a href={offer.url} target="_blank" rel="noreferrer">
                  {offer.url}
                </a>
              </Row>
            )}
            {offer.recruiter_name && <Row label="Recruteur">{offer.recruiter_name}</Row>}
            {offer.applied_at && <Row label="Candidature envoyée">{offer.applied_at}</Row>}
            {offer.followup_date && <Row label="Relance prévue">{offer.followup_date}</Row>}
            {offer.interview_date && <Row label="Entretien">{offer.interview_date}</Row>}
          </div>

          {offer.notes && (
            <>
              <div className="section-header" style={{ marginTop: 24 }}>
                <div className="section-title">Notes</div>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  background: 'var(--beige)',
                  padding: 16,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--sand-l)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {offer.notes}
              </div>
            </>
          )}
        </Card>

        <Card
          style={{
            background: 'linear-gradient(135deg, var(--beige) 0%, var(--cream) 100%)',
            borderColor: 'var(--terracotta)',
          }}
        >
          <div className="section-title" style={{ fontSize: 18, marginBottom: 10 }}>
            Atelier Claude
          </div>
          <DocViewer jobOfferId={offer.id} templates={templates} />
        </Card>
      </div>

      {showEdit && (
        <JobForm
          initialData={offer}
          onSave={(updated) => {
            setOffer(updated)
            setShowEdit(false)
          }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  )
}
