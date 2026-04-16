import { Link } from 'react-router-dom'
import type { JobOffer } from '../lib/types'
import { STATUS_LABELS } from '../lib/types'
import { Badge, BadgeVariant } from './ui/Badge'
import { StatusBadge } from './StatusBadge'

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

function statusToCardClass(status: string): string {
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

export function JobCardPT({ offer }: { offer: JobOffer }) {
  const variant = statusToVariant(offer.status)
  const cardCls = statusToCardClass(offer.status)

  return (
    <Link to={`/jobs/${offer.id}`} className={`job-card ${cardCls}`}>
      <div className="company-logo">🏢</div>
      <div className="job-info">
        <div className="job-title">{offer.title}</div>
        <div className="job-company">
          {offer.company}
          {offer.location ? ` · ${offer.location}` : ''}
        </div>
        <div className="job-tags">
          {offer.contract_type && <span className="tag tag-type">{offer.contract_type}</span>}
          {offer.salary && <span className="tag tag-salary">{offer.salary}</span>}
        </div>
      </div>
      <div className="job-status-col">
        <Badge variant={variant}>{STATUS_LABELS[offer.status] ?? offer.status}</Badge>
        <StatusBadge
          status={offer.status}
          followup_date={offer.followup_date ?? null}
          interview_date={offer.interview_date ?? null}
        />
      </div>
    </Link>
  )
}
