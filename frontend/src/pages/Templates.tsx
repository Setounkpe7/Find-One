import { FormEvent, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { PageHeader } from '../components/ui/PageHeader'
import { IconButton } from '../components/ui/IconButton'

type Template = {
  id: string
  name: string
  job_type: string | null
  file_type: 'pdf' | 'docx'
  created_at: string
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadJobType, setUploadJobType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/templates')
      setTemplates(await r.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file || !uploadName) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('name', uploadName)
    fd.append('job_type', uploadJobType)
    fd.append('file', file)
    try {
      await apiFetch('/api/templates', { method: 'POST', body: fd })
      setUploadName('')
      setUploadJobType('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload impossible')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce modèle ?')) return
    setDeletingId(id)
    try {
      await apiFetch(`/api/templates/${id}`, { method: 'DELETE' })
      setTemplates((ts) => ts.filter((t) => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Atelier"
        title="Modèles & Documents"
        subtitle="Vos modèles réutilisables pour générer CV et lettres"
      />

      {error && (
        <Card style={{ borderColor: 'var(--terracotta)', marginBottom: 20 }}>
          <div className="field-error">{error}</div>
        </Card>
      )}

      <Card style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-title">Ajouter un modèle</div>
        </div>
        <form onSubmit={handleUpload}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Nom du modèle" htmlFor="tpl-name">
              <Input
                id="tpl-name"
                required
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="CV senior full-stack"
              />
            </Field>
            <Field label="Type de poste (optionnel)" htmlFor="tpl-job">
              <Input
                id="tpl-job"
                value={uploadJobType}
                onChange={(e) => setUploadJobType(e.target.value)}
                placeholder="Développeur"
              />
            </Field>
          </div>
          <Field label="Fichier (PDF ou DOCX)" htmlFor="tpl-file">
            <input
              id="tpl-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              required
              className="input"
              style={{ padding: 10 }}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={uploading}>
            {uploading ? 'Envoi…' : 'Téléverser'}
          </Button>
        </form>
      </Card>

      <div className="section-header">
        <div className="section-title">Vos modèles</div>
      </div>

      {loading && <Card>Chargement…</Card>}

      {!loading && templates.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: 20 }}>
            Aucun modèle pour l'instant. Téléversez votre premier CV ou lettre ci-dessus.
          </div>
        </Card>
      )}

      {!loading && templates.length > 0 && (
        <div className="stack gap-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <div className="row center gap-4">
                <div
                  className={`tag ${t.file_type === 'pdf' ? 'tag-salary' : 'tag-type'}`}
                  style={{ flexShrink: 0 }}
                >
                  {t.file_type.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {t.job_type || 'Type non spécifié'}
                  </div>
                </div>
                <IconButton
                  title="Supprimer"
                  aria-label="Supprimer le modèle"
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
