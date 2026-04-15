import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const icons = {
  grid: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  search: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  stack: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12-1a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  ),
  user: (
    <svg className="nav-icon" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
}

function initials(email?: string | null) {
  if (!email) return '?'
  const [local] = email.split('@')
  return local.slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const email = user?.email ?? ''

  return (
    <aside className="sidebar">
      <div className="logo-area">
        <NavLink to="/" className="logo-mark">
          Find<span>·</span>One
        </NavLink>
        <div className="logo-sub">Tableau de bord</div>
      </div>

      <nav className="nav">
        <div className="nav-section-label">Principal</div>

        <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.grid}
          Tableau de bord
        </NavLink>

        <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.search}
          Recherche d'offres
        </NavLink>

        <div className="nav-section-label">Documents</div>

        <NavLink to="/templates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.stack}
          Modèles & Documents
        </NavLink>

        <div className="nav-section-label">Compte</div>

        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {icons.user}
          Mon profil
        </NavLink>
      </nav>

      <NavLink to="/profile" className="sidebar-footer">
        <div className="avatar">{initials(email)}</div>
        <div className="user-info">
          <div className="name">{email || 'Non connecté'}</div>
          <div className="role">Chercheur d'emploi</div>
        </div>
      </NavLink>
    </aside>
  )
}
