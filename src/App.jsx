import { useEffect, useState } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import ExportLeadsButton from './components/ExportLeadsButton.jsx';
import CrmWorkspace from './features/crm/CrmWorkspace.jsx';
import { getSession } from './services/api.js';
import { navigate } from './utils/navigation.js';

const protectedRoutes = {
  '/dashboard': { section: 'dashboard' },
  '/leads': { section: 'leads' },
  '/users': { section: 'users', adminOnly: true },
  '/products': { section: 'products', adminOnly: true },
  '/categories': { section: 'categories', adminOnly: true },
  '/quotations': { section: 'quotations' },
  '/whatsapp': { section: 'whatsapp', adminOnly: true },
  '/settings': { section: 'settings', adminOnly: true },
  '/customers': { section: 'customers' },
};

function currentPath() { return window.location.pathname.replace(/\/$/, '') || '/'; }

function App() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => { const onPopState = () => setPath(currentPath()); window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  const route = protectedRoutes[path];
  if (route) {
    const session = getSession();
    if (!session) return <RedirectToLogin />;
    if (route.adminOnly && ![1, 3].includes(session.user.role)) return <RedirectToDashboard />;
    return <><ExportLeadsButton section={route.section} /><CrmWorkspace section={route.section} /></>;
  }
  if (path === '/register') return <AuthPage mode="register" />;
  if (path === '/forgot-password') return <AuthPage mode="forgot" />;
  return <AuthPage mode="login" />;
}

function RedirectToLogin() { useEffect(() => navigate('/login'), []); return null; }
function RedirectToDashboard() { useEffect(() => navigate('/dashboard'), []); return null; }

export default App;
