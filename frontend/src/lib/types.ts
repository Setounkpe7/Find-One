export interface JobOffer {
  id: string
  title: string
  company: string
  url?: string
  location?: string
  salary?: string
  contract_type?: string
  recruiter_name?: string
  status: string
  applied_at?: string
  followup_date?: string
  interview_date?: string
  notes?: string
}

export const STATUS_LABELS: Record<string, string> = {
  applied: 'Candidature envoyée',
  interview_scheduled: 'Entretien planifié',
  offer_received: 'Offre reçue',
  rejected: 'Refusé',
  withdrawn: 'Retiré',
  saved: 'Sauvegardé',
}

export const STATUS_COLORS: Record<string, string> = {
  applied: '#3b82f6',
  interview_scheduled: '#8b5cf6',
  offer_received: '#10b981',
  rejected: '#6b7280',
  withdrawn: '#6b7280',
  saved: '#f59e0b',
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#4b5563'
}
