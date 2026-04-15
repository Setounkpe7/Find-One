import { FormEvent, useState } from 'react'
import { apiFetch } from '../lib/api'
import { JobForm } from '../components/JobForm'
import type { JobOffer } from '../lib/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Input } from '../components/ui/Input'
import { FilterTabs } from '../components/ui/FilterTabs'
import { PageHeader } from '../components/ui/PageHeader'

interface SearchResult {
  title: string
  company: string
  location?: string
  description?: string
  url?: string
}

type Tab = 'search' | 'url'

function toJobOffer(r: SearchResult): Partial<JobOffer> {
  return {
    title: r.title,
    company: r.company,
    url: r.url,
    location: r.location,
    notes: r.description,
  }
}

export default function JobSearch() {
  const [tab, setTab] = useState<Tab>('search')

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchDone, setSearchDone] = useState(false)

  const [urlInput, setUrlInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [urlResult, setUrlResult] = useState<SearchResult | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<JobOffer> | null>(null)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    setSearchDone(false)
    try {
      const r = await apiFetch(`/api/search/jobs?query=${encodeURIComponent(query)}`)
      setResults(await r.json())
      setSearchDone(true)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Recherche impossible')
    } finally {
      setSearching(false)
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return
    setImporting(true)
    setUrlError(null)
    setUrlResult(null)
    try {
      const r = await apiFetch('/api/search/url', {
        method: 'POST',
        body: JSON.stringify({ url: urlInput }),
      })
      setUrlResult(await r.json())
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Impossible d'extraire l'offre")
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Découverte"
        title={
          <>
            Trouvez <em>votre</em> prochaine aventure.
          </>
        }
        subtitle="Recherche par mots-clés ou import direct depuis une URL"
      />

      <FilterTabs<Tab>
        tabs={[
          { value: 'search', label: 'Rechercher' },
          { value: 'url', label: 'Importer une URL' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'search' && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <form onSubmit={handleSearch}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Input
                    placeholder="Ex. : Développeur full-stack à Paris"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" disabled={searching}>
                  {searching ? 'Recherche…' : 'Rechercher'}
                </Button>
              </div>
            </form>
          </Card>

          {searchError && (
            <Card style={{ marginBottom: 16 }}>
              <div className="field-error">{searchError}</div>
            </Card>
          )}

          <div className="stack gap-2">
            {results.map((r, i) => (
              <Card key={i}>
                <div className="row center gap-4">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
                      {r.company} · {r.location ?? '—'}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setFormData(toJobOffer(r))}>
                    Ajouter
                  </Button>
                </div>
              </Card>
            ))}
            {!searching && searchDone && results.length === 0 && !searchError && (
              <Card>
                <div style={{ color: 'var(--ink-soft)' }}>Aucun résultat pour « {query} ».</div>
              </Card>
            )}
          </div>
        </>
      )}

      {tab === 'url' && (
        <>
          <Card style={{ marginBottom: 20 }}>
            <form onSubmit={handleImport}>
              <Field label="URL de l'offre" htmlFor="url-input">
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://…"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </Field>
              <Button type="submit" variant="primary" disabled={importing}>
                {importing ? 'Extraction…' : 'Extraire'}
              </Button>
            </form>
          </Card>

          {urlError && (
            <Card style={{ marginBottom: 16 }}>
              <div className="field-error">{urlError}</div>
            </Card>
          )}

          {urlResult && (
            <Card>
              <div className="section-header">
                <div className="section-title">{urlResult.title ?? '(sans titre)'}</div>
                <Button size="sm" variant="primary" onClick={() => setFormData(toJobOffer(urlResult))}>
                  Ajouter
                </Button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {urlResult.company ?? '—'} · {urlResult.location ?? '—'}
              </div>
            </Card>
          )}
        </>
      )}

      {formData && (
        <JobForm
          initialData={formData}
          onSave={() => setFormData(null)}
          onClose={() => setFormData(null)}
        />
      )}
    </>
  )
}
