import React, { useState } from 'react'
import { apiFetch } from '../lib/api'
import type { JobOffer } from '../lib/types'

interface JobFormProps {
  initialData?: Partial<JobOffer>
  onSave: (offer: JobOffer) => void
  onClose: () => void
}

const CONTRACT_TYPES = ['CDI', 'CDD', 'Freelance', 'Stage', 'Alternance']
const STATUSES = [
  { value: 'saved', label: 'Sauvegardé' },
  { value: 'applied', label: 'Candidature envoyée' },
  { value: 'interview_scheduled', label: 'Entretien planifié' },
  { value: 'offer_received', label: 'Offre reçue' },
  { value: 'rejected', label: 'Refusé' },
  { value: 'withdrawn', label: 'Retiré' },
]

export function JobForm({ initialData, onSave, onClose }: JobFormProps) {
  const isEdit = Boolean(initialData?.id)

  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    company: initialData?.company ?? '',
    url: initialData?.url ?? '',
    location: initialData?.location ?? '',
    salary: initialData?.salary ?? '',
    contract_type: initialData?.contract_type ?? '',
    recruiter_name: initialData?.recruiter_name ?? '',
    status: initialData?.status ?? 'applied',
    applied_at: initialData?.applied_at ?? '',
    followup_date: initialData?.followup_date ?? '',
    interview_date: initialData?.interview_date ?? '',
    notes: initialData?.notes ?? '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const payload: Record<string, string> = {}
      for (const [key, value] of Object.entries(form)) {
        if (value !== '') payload[key] = value
      }

      let res: Response
      if (isEdit && initialData?.id) {
        res = await apiFetch(`/api/jobs/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      } else {
        res = await apiFetch('/api/jobs', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      }
      const saved: JobOffer = await res.json()
      onSave(saved)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const s = styles
  const inputStyle = (name: string): React.CSSProperties => ({
    ...s.input,
    ...(focused === name ? s.inputFocus : {}),
  })

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div>
            <p style={s.modalEyebrow}>{isEdit ? 'Modifier l\'offre' : 'Nouvelle offre'}</p>
            <h2 style={s.modalTitle}>{isEdit ? form.title || 'Offre' : 'Ajouter une offre'}</h2>
          </div>
          <button style={s.closeBtn} onClick={onClose} aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={s.divider} />

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-title">Poste <span style={s.required}>*</span></label>
              <input
                id="jf-title"
                name="title"
                required
                value={form.title}
                onChange={handleChange}
                onFocus={() => setFocused('title')}
                onBlur={() => setFocused(null)}
                style={inputStyle('title')}
                placeholder="Développeur Full-Stack"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-company">Entreprise <span style={s.required}>*</span></label>
              <input
                id="jf-company"
                name="company"
                required
                value={form.company}
                onChange={handleChange}
                onFocus={() => setFocused('company')}
                onBlur={() => setFocused(null)}
                style={inputStyle('company')}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-url">URL de l'offre</label>
              <input
                id="jf-url"
                name="url"
                type="url"
                value={form.url}
                onChange={handleChange}
                onFocus={() => setFocused('url')}
                onBlur={() => setFocused(null)}
                style={inputStyle('url')}
                placeholder="https://..."
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-location">Lieu</label>
              <input
                id="jf-location"
                name="location"
                value={form.location}
                onChange={handleChange}
                onFocus={() => setFocused('location')}
                onBlur={() => setFocused(null)}
                style={inputStyle('location')}
                placeholder="Paris / Remote"
              />
            </div>
          </div>

          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-salary">Salaire</label>
              <input
                id="jf-salary"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                onFocus={() => setFocused('salary')}
                onBlur={() => setFocused(null)}
                style={inputStyle('salary')}
                placeholder="45 000 €"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-contract_type">Type de contrat</label>
              <select
                id="jf-contract_type"
                name="contract_type"
                value={form.contract_type}
                onChange={handleChange}
                onFocus={() => setFocused('contract_type')}
                onBlur={() => setFocused(null)}
                style={inputStyle('contract_type')}
              >
                <option value="">— Sélectionner —</option>
                {CONTRACT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-recruiter_name">Recruteur</label>
              <input
                id="jf-recruiter_name"
                name="recruiter_name"
                value={form.recruiter_name}
                onChange={handleChange}
                onFocus={() => setFocused('recruiter_name')}
                onBlur={() => setFocused(null)}
                style={inputStyle('recruiter_name')}
                placeholder="Marie Dupont"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-status">Statut</label>
              <select
                id="jf-status"
                name="status"
                value={form.status}
                onChange={handleChange}
                onFocus={() => setFocused('status')}
                onBlur={() => setFocused(null)}
                style={inputStyle('status')}
              >
                {STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>{st.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-applied_at">Date de candidature</label>
              <input
                id="jf-applied_at"
                name="applied_at"
                type="date"
                value={form.applied_at}
                onChange={handleChange}
                onFocus={() => setFocused('applied_at')}
                onBlur={() => setFocused(null)}
                style={inputStyle('applied_at')}
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-followup_date">Date de relance</label>
              <input
                id="jf-followup_date"
                name="followup_date"
                type="date"
                value={form.followup_date}
                onChange={handleChange}
                onFocus={() => setFocused('followup_date')}
                onBlur={() => setFocused(null)}
                style={inputStyle('followup_date')}
              />
            </div>
          </div>

          <div style={{ ...s.row, gridTemplateColumns: '1fr' }}>
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="jf-interview_date">Date d'entretien</label>
              <input
                id="jf-interview_date"
                name="interview_date"
                type="date"
                value={form.interview_date}
                onChange={handleChange}
                onFocus={() => setFocused('interview_date')}
                onBlur={() => setFocused(null)}
                style={inputStyle('interview_date')}
              />
            </div>
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="jf-notes">Notes</label>
            <textarea
              id="jf-notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              onFocus={() => setFocused('notes')}
              onBlur={() => setFocused(null)}
              style={{ ...inputStyle('notes'), minHeight: '80px', resize: 'vertical' }}
              placeholder="Informations complémentaires, impressions..."
            />
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.actions}>
            <button type="button" style={s.cancelBtn} onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" style={{ ...s.submitBtn, ...(loading ? s.submitDisabled : {}) }} disabled={loading}>
              {loading ? (
                <span style={s.spinnerWrap}>
                  <span style={s.spinner} />
                  Enregistrement…
                </span>
              ) : (
                isEdit ? 'Enregistrer les modifications →' : 'Ajouter l\'offre →'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: '#141412',
    border: '1px solid #2a2820',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '92vh',
    overflowY: 'auto',
    padding: '32px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,169,110,0.08)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  modalEyebrow: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '11px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#c8a96e',
    margin: '0 0 6px',
    fontWeight: 500,
  },
  modalTitle: {
    fontFamily: "'DM Serif Display', 'Georgia', serif",
    fontSize: '22px',
    fontWeight: 400,
    color: '#f0ede8',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  closeBtn: {
    background: 'none',
    border: '1px solid #2a2820',
    borderRadius: '6px',
    color: '#8a857d',
    cursor: 'pointer',
    padding: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s, border-color 0.15s',
    flexShrink: 0,
  },
  divider: {
    borderTop: '1px solid #1e1c18',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#78716c',
    fontWeight: 500,
  },
  required: {
    color: '#c8a96e',
  },
  input: {
    backgroundColor: '#0d0c0a',
    border: '1px solid #252320',
    borderRadius: '5px',
    padding: '9px 12px',
    fontSize: '14px',
    color: '#f0ede8',
    outline: 'none',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
    appearance: 'none',
  },
  inputFocus: {
    borderColor: '#c8a96e',
    boxShadow: '0 0 0 2px rgba(200,169,110,0.1)',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '5px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#ef4444',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.01em',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #2a2820',
    borderRadius: '5px',
    padding: '10px 20px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.06em',
    color: '#8a857d',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'border-color 0.15s, color 0.15s',
  },
  submitBtn: {
    backgroundColor: '#c8a96e',
    border: 'none',
    borderRadius: '5px',
    padding: '10px 22px',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    letterSpacing: '0.08em',
    color: '#0d0d0d',
    cursor: 'pointer',
    textTransform: 'uppercase',
    transition: 'opacity 0.15s',
  },
  submitDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  spinnerWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  spinner: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(13,13,13,0.3)',
    borderTop: '2px solid #0d0d0d',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
  },
}

