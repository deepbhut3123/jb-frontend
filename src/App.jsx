import { useEffect, useState } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import ExportLeadsButton from './components/ExportLeadsButton.jsx';
import CrmWorkspace from './features/crm/CrmWorkspace.jsx';
import { getSession } from './services/api.js';
import { navigate } from './utils/navigation.js';
import { canView, isAdministrator } from './utils/permissions.js';

const protectedRoutes = {
  '/dashboard': { section: 'dashboard' },
  '/leads': { section: 'leads' },
  '/users': { section: 'users' },
  '/roles': { section: 'roles', adminOnly: true },
  '/products': { section: 'products' },
  '/categories': { section: 'categories' },
  '/quotations': { section: 'quotations' },
  '/whatsapp': { section: 'whatsapp' },
  '/settings': { section: 'settings' },
  '/customers': { section: 'customers' },
  '/profile': { section: 'profile' },
};

function currentPath() { return window.location.pathname.replace(/\/$/, '') || '/'; }

function App() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => { const onPopState = () => setPath(currentPath()); window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  const route = protectedRoutes[path];
  if (route) {
    const session = getSession();
    if (!session) return <RedirectToLogin />;
    if ((route.adminOnly && !isAdministrator(session.user)) || (!route.adminOnly && !canView(session.user, route.section))) return <RedirectToAllowedPage user={session.user} />;
    return <><ExportLeadsButton section={route.section} /><CrmWorkspace section={route.section} /></>;
  }
  if (path === '/register') return <AuthPage mode="register" />;
  if (path === '/forgot-password') return <AuthPage mode="forgot" />;
  return <AuthPage mode="login" />;
}

function RedirectToLogin() { useEffect(() => navigate('/login'), []); return null; }
function RedirectToAllowedPage({ user }) {
  useEffect(() => {
    const firstAllowed = Object.values(protectedRoutes).find((item) => !item.adminOnly && canView(user, item.section));
    navigate(firstAllowed ? `/${firstAllowed.section}` : '/profile');
  }, [user]);
  return null;
}

export default App;
