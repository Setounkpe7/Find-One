import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { PageHeader } from '../components/ui/PageHeader'

type ProfileForm = {
  instructions: string
  language: 'fr' | 'en' | 'es' | 'de'
}

const EMPTY: ProfileForm = { instructions: '', language: 'fr' }

export default function Profile() {
  const [form, setForm] = useState<ProfileForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setForm({ instructions: data.instructions ?? '', language: data.language ?? 'fr' })
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Erreur de chargement'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Mon profil"
        title={
          <>
            Votre <em>identité</em>
          </>
        }
        subtitle="Le socle à partir duquel Claude rédige vos CV et lettres"
      />

      {loading && <Card>Chargement…</Card>}

      {!loading && (
        <Card>
          <Field
            label="Instructions personnelles pour Claude"
            htmlFor="instructions"
            hint="Ce texte guide chaque document généré : ton, points à mettre en avant, contraintes."
          >
            <Textarea
              id="instructions"
              rows={8}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Ex. : développeur full-stack senior, 8 ans d'expérience, passionné par les produits B2B…"
            />
          </Field>

          <Field label="Langue des documents générés" htmlFor="language">
            <Select
              id="language"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as ProfileForm['language'] })}
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </Select>
          </Field>

          {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="row gap-2 center" style={{ justifyContent: 'flex-end' }}>
            {saved && (
              <span style={{ fontSize: 13, color: 'var(--sage-d)' }}>✓ Enregistré</span>
            )}
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}
