/* Injects the Find-One sidebar. Set data-active="<key>" on the
   <body> or the sidebar mount to highlight the active nav item. */
(function () {
  const activeKey =
    document.body.dataset.active ||
    (document.getElementById('sidebar') && document.getElementById('sidebar').dataset.active) ||
    'dashboard';

  const items = [
    { section: 'Principal' },
    { key: 'dashboard', label: 'Tableau de bord', href: 'dashboard.html', icon: 'grid' },
    { key: 'jobs',      label: 'Mes candidatures', href: 'dashboard.html#jobs', icon: 'briefcase', badge: 12 },
    { key: 'search',    label: "Recherche d'offres", href: 'job-search.html', icon: 'search' },
    { section: 'Documents' },
    { key: 'templates', label: 'Modèles',        href: 'templates.html', icon: 'stack' },
    { key: 'docs',      label: 'CV & Lettres',   href: 'templates.html#generated', icon: 'doc' },
    { section: 'Compte' },
    { key: 'profile',   label: 'Mon profil',     href: 'profile.html', icon: 'user' },
  ];

  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    briefcase: '<path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    doc: '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
    stack: '<path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12-1a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>',
    user: '<path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>',
  };

  function svg(name) {
    return `<svg class="nav-icon" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">${icons[name]||''}</svg>`;
  }

  const navHtml = items.map(item => {
    if (item.section) {
      return `<div class="nav-section-label">${item.section}</div>`;
    }
    const active = item.key === activeKey ? ' active' : '';
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    return `<a class="nav-item${active}" href="${item.href}">${svg(item.icon)}${item.label}${badge}</a>`;
  }).join('');

  const html = `
    <div class="logo-area">
      <a class="logo-mark" href="dashboard.html">Find<span>·</span>One</a>
      <div class="logo-sub">Tableau de bord</div>
    </div>
    <nav class="nav">${navHtml}</nav>
    <a class="sidebar-footer" href="profile.html">
      <div class="avatar">MD</div>
      <div class="user-info">
        <div class="name">Martin Doubin</div>
        <div class="role">Chercheur d'emploi</div>
      </div>
    </a>
  `;

  const mount = document.getElementById('sidebar');
  if (mount) mount.innerHTML = html;
})();
