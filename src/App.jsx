import { useEffect, useState } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import QuotationsPage from './pages/QuotationsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import { getSession } from './services/api.js';
import { navigate } from './utils/navigation.js';

const protectedRoutes = {
  '/dashboard': { page: DashboardPage },
  '/leads': { page: LeadsPage },
  '/users': { page: UsersPage, adminOnly: true },
  '/products': { page: ProductsPage, adminOnly: true },
  '/categories': { page: CategoriesPage, adminOnly: true },
  '/quotations': { page: QuotationsPage },
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
    const RoutePage = route.page;
    return <RoutePage />;
  }
  if (path === '/register') return <AuthPage mode="register" />;
  if (path === '/forgot-password') return <AuthPage mode="forgot" />;
  return <AuthPage mode="login" />;
}

function RedirectToLogin() { useEffect(() => navigate('/login'), []); return null; }
function RedirectToDashboard() { useEffect(() => navigate('/dashboard'), []); return null; }

export default App;
