import { useEffect, useState, useSyncExternalStore } from 'react';
import { getPendingRequests, subscribeToRequests } from '../services/requestLoading.js';

const moduleRequests = {
  whatsapp: ['/api/whatsapp/settings', '/api/users', '/api/lead-options'],
  dashboard: ['/api/leads'],
  leads: ['/api/leads', '/api/users', '/api/lead-options'],
  users: ['/api/users'],
  products: ['/api/products', '/api/categories'],
  categories: ['/api/categories'],
  quotations: ['/api/quotations', '/api/products'],
};

function SkeletonBlock({ className = '' }) {
  return <span className={`skeleton-block ${className}`} />;
}

function ModuleSkeleton({ section }) {
  return <div className="module-skeleton" role="status" aria-live="polite">
    <span className="loading-sr-only">Loading {section}…</span>
    <div aria-hidden="true">
      <div className="skeleton-heading"><div><SkeletonBlock className="skeleton-title" /><SkeletonBlock className="skeleton-subtitle" /></div><SkeletonBlock className="skeleton-button" /></div>
      {section === 'dashboard' ? <>
        <div className="skeleton-cards">{Array.from({ length: 4 }, (_, index) => <div className="skeleton-card" key={index}><SkeletonBlock className="skeleton-subtitle" /><SkeletonBlock className="skeleton-number" /><SkeletonBlock /></div>)}</div>
        <div className="skeleton-charts">{Array.from({ length: 2 }, (_, index) => <div className="skeleton-card" key={index}><SkeletonBlock className="skeleton-title" />{Array.from({ length: 5 }, (_, row) => <SkeletonBlock className="skeleton-chart-bar" key={row} />)}</div>)}</div>
      </> : <div className="skeleton-toolbar"><SkeletonBlock /><SkeletonBlock className="skeleton-button" /></div>}
      <div className="skeleton-table">{Array.from({ length: 6 }, (_, row) => <div className="skeleton-row" key={row}>{Array.from({ length: 4 }, (_, column) => <SkeletonBlock key={column} />)}</div>)}</div>
    </div>
  </div>;
}

export default function ModuleLoading({ section, token, children }) {
  const requests = useSyncExternalStore(subscribeToRequests, getPendingRequests);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const paths = moduleRequests[section] || [];
  const loading = !mounted || requests.some((request) =>
    request.authorization === `Bearer ${token}` &&
    (request.path === '/api/dashboard/summary' || paths.includes(request.path)),
  );

  // Keep panels mounted so their fetches, filters, and open forms survive loading.
  return <div className={`module-loading${loading ? ' is-loading' : ''}`} aria-busy={loading}>
    {loading && <ModuleSkeleton section={section} />}
    <div className="module-loading-content" inert={loading} aria-hidden={loading ? true : undefined}>{children}</div>
  </div>;
}
